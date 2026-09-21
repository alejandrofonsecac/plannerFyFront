import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import type { AuthResponse } from '../models/auth.model';

/** A full navigation destroys feature caches before another account can sign in. */
export const AUTH_REDIRECT = new InjectionToken<(url: string) => void>('AUTH_REDIRECT', {
  providedIn: 'root',
  factory: () => {
    const window = inject(DOCUMENT).defaultView;
    return (url) => window?.location.replace(url);
  },
});

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly redirect = inject(AUTH_REDIRECT);
  private readonly state = signal<(AuthResponse & { expiresAt: number }) | null>(null);

  private timer?: ReturnType<typeof setTimeout>;
  private leaving = false;
  readonly user = computed(() => this.state()?.user ?? null);

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

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    const check = () => {
      if (this.state()) {
        this.accessToken();
      }
    };

    window?.addEventListener('focus', check);
    window?.addEventListener('pageshow', check);

    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      window?.removeEventListener('focus', check);
      window?.removeEventListener('pageshow', check);
    });
  }

  /** Tokens remain in memory, never in localStorage, sessionStorage or URLs. */
  start(response: AuthResponse): void {
    if (this.leaving){
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

    clearTimeout(this.timer);
    this.state.set({ ...response, expiresAt: Date.now() + response.expiresIn * 1000 });
    this.scheduleExpiration();
  }

  accessToken(): string | null {
    const session = this.state();
    if (!session) return null;

    if (Date.now() >= session.expiresAt) {
      this.end('expired');
      return null;
    }
    
    return session.accessToken;
  }

  reject(token: string): void {
    // An old request must not clear a newer session.
    if (this.state()?.accessToken === token) this.end('expired');
  }

  logout(): void {
    this.end('logout');
  }

  private end(reason: 'logout' | 'expired'): void {
    if (this.leaving) return;
    this.leaving = true;
    clearTimeout(this.timer);
    this.state.set(null);
    this.redirect(reason === 'expired' ? '/login?reason=expired' : '/login');
  }

  private scheduleExpiration(): void {
    const session = this.state();
    if (!session) return;
    this.timer = setTimeout(
      () => {
        if (this.accessToken()) this.scheduleExpiration();
      },
      Math.min(session.expiresAt - Date.now(), 2_147_483_647),
    );
  }
}
