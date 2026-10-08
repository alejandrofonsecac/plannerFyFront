import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import type { AuthResponse } from '../models/auth.model';
import { SessionApi } from '../data-access/session-api.service';

/** A full navigation destroys feature caches before another account can sign in. */
export const AUTH_REDIRECT = new InjectionToken<(url: string) => void>('AUTH_REDIRECT', {
  providedIn: 'root',
  factory: () => {
    const window = inject(DOCUMENT).defaultView;
    return (url) => window?.location.replace(url);
  },
});

export type SessionLock = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Serializes refresh and logout across tabs of the same origin. Two tabs rotating the
 * same cookie at once would look like token reuse and revoke the whole session family.
 */
export const AUTH_SESSION_LOCK = new InjectionToken<SessionLock>('AUTH_SESSION_LOCK', {
  providedIn: 'root',
  factory: () => {
    const locks = inject(DOCUMENT).defaultView?.navigator.locks;
    return <T>(task: () => Promise<T>) =>
      locks ? (locks.request('plannerfy-auth-session', task) as Promise<T>) : task();
  },
});

/** A token is bound to the account that received it, so retries never cross accounts. */
export interface SessionCredential {
  token: string;
  userId: string;
}

type SessionState = AuthResponse & { renewAt: number };

/** Renew slightly early so a token does not expire while a request is in flight. */
const RENEWAL_MARGIN_MS = 30_000;

export function unauthorized(): HttpErrorResponse {
  return new HttpErrorResponse({ status: 401, statusText: 'Authentication required' });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly redirect = inject(AUTH_REDIRECT);
  private readonly lock = inject(AUTH_SESSION_LOCK);
  private readonly api = inject(SessionApi);
  private readonly state = signal<SessionState | null>(null);
  private readonly logoutState = signal<'idle' | 'pending' | 'failed'>('idle');

  private renewal?: Promise<SessionCredential>;
  private leaving = false;

  readonly user = computed(() => this.state()?.user ?? null);
  readonly logoutPending = computed(() => this.logoutState() === 'pending');
  readonly logoutFailed = computed(() => this.logoutState() === 'failed');

  readonly initials = computed(
    () =>
      this.user()
        ?.name.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() ?? '',
  );

  /** Tokens remain in memory, never in localStorage, sessionStorage or URLs. */
  start(response: AuthResponse): void {
    if (this.leaving) {
      throw new Error('A sessão está sendo encerrada.');
    }

    if (
      !response ||
      response.tokenType !== 'Bearer' ||
      !response.accessToken?.trim() ||
      !Number.isFinite(response.expiresIn) ||
      response.expiresIn <= 0 ||
      !response.user?.id ||
      !response.user.name ||
      !['USER', 'USER_PLUS', 'ADMIN'].includes(response.user.role)
    ) {
      throw new Error('Resposta de autenticação inválida.');
    }

    const lifetime = response.expiresIn * 1000;
    this.state.set({
      ...response,
      renewAt: Date.now() + Math.max(lifetime - RENEWAL_MARGIN_MS, lifetime / 2),
    });
  }

  /** The current token while it is fresh; an expired token keeps the identity for renewal. */
  accessToken(): string | null {
    return this.credential()?.token ?? null;
  }

  credential(): SessionCredential | null {
    const session = this.state();
    if (!session || this.leaving || Date.now() >= session.renewAt) return null;
    return { token: session.accessToken, userId: session.user.id };
  }

  /** Returns a fresh token, renewing through the refresh cookie when needed. */
  ensureCredential(): Promise<SessionCredential> {
    if (!this.state() || this.leaving) return Promise.reject(unauthorized());
    const current = this.credential();
    return current ? Promise.resolve(current) : this.renew();
  }

  /**
   * Called after the server rejected `stale`. A newer token of the same account is reused;
   * otherwise one shared renewal is performed. Requests of another account are not retried.
   */
  recover(stale: SessionCredential): Promise<SessionCredential> {
    const session = this.state();
    if (!session || this.leaving || session.user.id !== stale.userId) {
      return Promise.reject(unauthorized());
    }
    const current = this.credential();
    return current && current.token !== stale.token ? Promise.resolve(current) : this.renew();
  }

  /** Startup restoration: a missing or rejected cookie keeps the visitor anonymous. */
  async restore(): Promise<void> {
    if (this.state() || this.leaving) return;
    try {
      const response = await this.lock(() => this.api.refresh());
      if (!this.state() && !this.leaving) this.start(response);
    } catch {
      // Anonymous visitor: the login page handles the next step without a redirect loop.
    }
  }

  reject(token: string): void {
    // An old request must not clear a newer session.
    if (this.state()?.accessToken === token) this.end('expired');
  }

  /** Revokes the refresh cookie first; a failure keeps the session and can be retried. */
  async logout(): Promise<void> {
    if (this.leaving || this.logoutPending()) return;
    this.logoutState.set('pending');
    try {
      // Wait for a pending rotation so the newest cookie is the one revoked.
      await this.renewal?.catch(() => undefined);
      await this.lock(() => this.api.logout());
    } catch {
      this.logoutState.set('failed');
      return;
    }
    this.logoutState.set('idle');
    this.end('logout');
  }

  /** Concurrent callers in this tab share one refresh request. */
  private renew(): Promise<SessionCredential> {
    this.renewal ??= this.lock(() => this.api.refresh())
      .then(
        (response) => {
          const previous = this.state();
          if (!previous || this.leaving) throw unauthorized();
          if (previous.user.id !== response.user?.id) {
            // Another account signed in through the shared cookie: never replay old requests.
            this.end('expired');
            throw unauthorized();
          }
          this.start(response);
          return { token: response.accessToken, userId: response.user.id };
        },
        (error: unknown) => {
          if (isUnauthorized(error)) this.end('expired');
          throw error;
        },
      )
      .finally(() => (this.renewal = undefined));
    return this.renewal;
  }

  private end(reason: 'logout' | 'expired'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.state.set(null);
    this.redirect(reason === 'expired' ? '/login?reason=expired' : '/login');
  }
}
