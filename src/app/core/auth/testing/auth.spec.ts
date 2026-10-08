import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, authErrorMessage } from '../data-access/auth.service';
import { AuthSession, AUTH_REDIRECT, AUTH_SESSION_LOCK } from '../session/auth-session.service';
import { authInterceptor } from '../http/auth.interceptor';
import { authGuard, authChildGuard, guestGuard, safeReturnUrl } from '../routing/auth.guard';
import type { AuthResponse } from '../models/auth.model';
import { API_BASE_URL } from '../../data-access/api-client.service';

const API = 'http://localhost:8080';
const unauthorized = { status: 401, statusText: 'Unauthorized' };
const noContent = { status: 204, statusText: 'No Content' };
const unavailable = { status: 503, statusText: 'Unavailable' };

/** Lets promise-based renewal steps run with real timers. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

function response(token = 'token-a', name = 'Ana'): AuthResponse {
  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: name, name, email: name.toLowerCase() + '@example.com', role: 'USER' },
  };
}

describe('authentication boundary', () => {
  let http: HttpTestingController;
  let session: AuthSession;
  let client: HttpClient;
  let service: AuthService;
  const redirect = vi.fn();
  const lock = vi.fn(<T>(task: () => Promise<T>) => task());

  beforeEach(() => {
    redirect.mockReset();
    lock.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AUTH_REDIRECT, useValue: redirect },
        { provide: AUTH_SESSION_LOCK, useValue: lock },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    client = TestBed.inject(HttpClient);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  /** Moves the clock past the access token deadline without faking timers. */
  function expireToken() {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 3_600_000);
  }

  function expectSessionRequest(path: 'refresh' | 'logout') {
    const request = http.expectOne(`${API}/users/${path}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.headers.get('X-PlannerFy-Session')).toBe('1');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({});
    return request;
  }

  function collectErrors(...paths: string[]): number[] {
    const statuses: number[] = [];
    for (const path of paths) {
      client
        .get(`${API}/${path}`)
        .subscribe({ error: (error: HttpErrorResponse) => statuses.push(error.status) });
    }
    return statuses;
  }

  it.each(['login', 'register'] as const)(
    'connects %s and sends only credentials',
    async (mode) => {
      const pending = service.submit(mode, {
        name: ' Ana ',
        email: ' ANA@example.com ',
        password: ' secret-password ',
      });
      const request = http.expectOne(`${API}/users/${mode}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(request.request.headers.get('X-PlannerFy-Session')).toBe('1');
      expect(request.request.withCredentials).toBe(true);
      expect(request.request.body).toEqual(
        mode === 'register'
          ? { name: 'Ana', email: 'ana@example.com', password: ' secret-password ' }
          : { email: 'ana@example.com', password: ' secret-password ' },
      );
      request.flush(response());
      await pending;
      expect(session.accessToken()).toBe('token-a');
      expect(session.user()?.name).toBe('Ana');
    },
  );

  it('never persists credentials or tokens in browser storage', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    session.start(response());
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it('uses Bearer for private API calls, including the current profile', () => {
    session.start(response());
    service.me().subscribe();
    const request = http.expectOne(`${API}/users/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-a');
    request.flush(response().user);
  });

  it.each([
    'https://external.example/notes',
    'http://localhost:8081/notes',
    'http://localhost:8080@evil.example/notes',
  ])('does not leak the token to %s', (url) => {
    session.start(response());
    client.get(url).subscribe();
    const request = http.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('blocks private API calls before they are sent when no session exists', () => {
    const statuses = collectErrors('notes');
    http.expectNone(`${API}/notes`);
    expect(statuses).toEqual([401]);
  });

  it('renews once on 401, shares the refresh and repeats each request once', async () => {
    session.start(response());
    const results: unknown[] = [];
    client.get(`${API}/notes`).subscribe((body) => results.push(body));
    client.get(`${API}/goals`).subscribe((body) => results.push(body));
    http.match(() => true).forEach((request) => request.flush({}, unauthorized));
    await settle();
    expectSessionRequest('refresh').flush(response('token-b'));
    await settle();
    const retries = http.match(() => true);
    expect(retries.map((request) => request.request.headers.get('Authorization'))).toEqual([
      'Bearer token-b',
      'Bearer token-b',
    ]);
    retries.forEach((request) => request.flush(['ok']));
    expect(results).toEqual([['ok'], ['ok']]);
    expect(session.accessToken()).toBe('token-b');
    expect(lock).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('renews an expired token before sending the request', async () => {
    session.start(response());
    expireToken();
    expect(session.accessToken()).toBeNull();
    expect(session.user()?.name).toBe('Ana');
    client.get(`${API}/notes`).subscribe();
    http.expectNone(`${API}/notes`);
    await settle();
    expectSessionRequest('refresh').flush(response('token-b'));
    await settle();
    const request = http.expectOne(`${API}/notes`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-b');
    request.flush([]);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('ends the session with one full navigation when the refresh is rejected', async () => {
    session.start(response());
    const statuses = collectErrors('notes', 'goals');
    http.match(() => true).forEach((request) => request.flush({}, unauthorized));
    await settle();
    expectSessionRequest('refresh').flush({ code: 'REFRESH_UNAVAILABLE' }, unauthorized);
    await settle();
    expect(statuses).toEqual([401, 401]);
    expect(session.user()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login?reason=expired');
  });

  it('ends the session when the repeated request is still unauthorized', async () => {
    session.start(response());
    collectErrors('notes');
    http.expectOne(`${API}/notes`).flush({}, unauthorized);
    await settle();
    expectSessionRequest('refresh').flush(response('token-b'));
    await settle();
    http.expectOne(`${API}/notes`).flush({}, unauthorized);
    expect(session.user()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login?reason=expired');
  });

  it('keeps the session when the refresh fails temporarily', async () => {
    session.start(response());
    expireToken();
    const statuses = collectErrors('notes');
    await settle();
    expectSessionRequest('refresh').flush({}, unavailable);
    await settle();
    expect(statuses).toEqual([503]);
    expect(session.user()?.name).toBe('Ana');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('does not replay requests when the renewal returns another account', async () => {
    session.start(response());
    expireToken();
    const statuses = collectErrors('notes');
    await settle();
    expectSessionRequest('refresh').flush(response('token-b', 'Bia'));
    await settle();
    http.expectNone(`${API}/notes`);
    expect(statuses).toEqual([401]);
    expect(session.user()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login?reason=expired');
  });

  it('does not end a session on forbidden or temporary server errors', () => {
    session.start(response());
    for (const status of [403, 500]) {
      client.get(`${API}/notes`).subscribe({ error: () => undefined });
      http.expectOne(`${API}/notes`).flush({}, { status, statusText: 'Error' });
    }
    expect(session.accessToken()).toBe('token-a');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('repeats a late 401 with the newer token of the same account without refreshing', async () => {
    session.start(response());
    client.get(`${API}/notes`).subscribe();
    session.start(response('token-b'));
    http.expectOne(`${API}/notes`).flush({}, unauthorized);
    await settle();
    const retry = http.expectOne(`${API}/notes`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-b');
    retry.flush([]);
    http.expectNone(`${API}/users/refresh`);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('ignores an old 401 from another account without clearing the new session', async () => {
    session.start(response());
    const statuses = collectErrors('notes');
    session.start(response('token-b', 'Bia'));
    http.expectOne(`${API}/notes`).flush({}, unauthorized);
    await settle();
    http.expectNone(`${API}/notes`);
    http.expectNone(`${API}/users/refresh`);
    expect(statuses).toEqual([401]);
    expect(session.accessToken()).toBe('token-b');
    expect(session.user()?.name).toBe('Bia');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('restores the session from the refresh cookie at startup', async () => {
    const pending = session.restore();
    await settle();
    expectSessionRequest('refresh').flush(response());
    await pending;
    expect(session.user()?.name).toBe('Ana');
    expect(session.accessToken()).toBe('token-a');
    expect(lock).toHaveBeenCalledOnce();
  });

  it('keeps the visitor anonymous without redirecting when there is no session to restore', async () => {
    const pending = session.restore();
    await settle();
    expectSessionRequest('refresh').flush({ code: 'REFRESH_UNAVAILABLE' }, unauthorized);
    await pending;
    expect(session.user()).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('logout revokes the refresh cookie before clearing the session', async () => {
    session.start(response());
    const pending = session.logout();
    expect(session.logoutPending()).toBe(true);
    await settle();
    expectSessionRequest('logout').flush(null, noContent);
    await pending;
    expect(session.user()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(() => session.start(response())).toThrow();
  });

  it('keeps the session and allows a new attempt when logout fails', async () => {
    session.start(response());
    let pending = session.logout();
    await settle();
    expectSessionRequest('logout').flush({}, unavailable);
    await pending;
    expect(session.logoutFailed()).toBe(true);
    expect(session.user()?.name).toBe('Ana');
    expect(redirect).not.toHaveBeenCalled();

    pending = session.logout();
    expect(session.logoutFailed()).toBe(false);
    await settle();
    expectSessionRequest('logout').flush(null, noContent);
    await pending;
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('logout waits for a pending rotation before revoking the newest cookie', async () => {
    session.start(response());
    expireToken();
    client.get(`${API}/notes`).subscribe();
    await settle();
    const pending = session.logout();
    await settle();
    http.expectNone(`${API}/users/logout`);
    expectSessionRequest('refresh').flush(response('token-b'));
    await settle();
    http.expectOne(`${API}/notes`).flush([]);
    expectSessionRequest('logout').flush(null, noContent);
    await pending;
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(lock).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid authentication responses without creating a session', () => {
    expect(() => session.start({ ...response(), expiresIn: 0 })).toThrow();
    expect(() => session.start({ ...response(), accessToken: '' })).toThrow();
    expect(session.user()).toBeNull();
  });

  it('guards private routes and their children, and redirects an authenticated visitor away from login', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/notes' } as RouterStateSnapshot;
    for (const guard of [authGuard, authChildGuard]) {
      const result = TestBed.runInInjectionContext(() => guard(route, state));
      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
        '/login?returnUrl=%2Fnotes',
      );
    }
    session.start(response());
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('waits for the renewal before activating a private route with an expired token', async () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/notes' } as RouterStateSnapshot;
    session.start(response());
    expireToken();
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeInstanceOf(Promise);
    await settle();
    expectSessionRequest('refresh').flush(response('token-b'));
    expect(await result).toBe(true);
    expect(session.accessToken()).toBe('token-b');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/login',
    '/notes/../login',
    '/notes(aux:evil)',
    '/\\evil.example',
  ])('rejects unsafe or unknown return destination %s', (url) =>
    expect(safeReturnUrl(url)).toBe('/home'),
  );

  it('keeps an allowed return path and its query', () => {
    expect(safeReturnUrl('/schedule?view=week')).toBe('/schedule?view=week');
  });

  it('shows controlled errors without exposing server messages', () => {
    expect(authErrorMessage(new HttpErrorResponse({ status: 426 }), 'login')).toContain('HTTPS');
    expect(authErrorMessage(new HttpErrorResponse({ status: 403 }), 'login')).toContain('recusou');
    const error = new HttpErrorResponse({
      status: 401,
      error: { message: 'database password secret' },
    });
    expect(authErrorMessage(error, 'login')).toBe('Email ou senha incorretos.');
    expect(authErrorMessage(new HttpErrorResponse({ status: 409 }), 'register')).toContain(
      'já está cadastrado',
    );
  });
});

describe('API path boundary', () => {
  it('does not authenticate a sibling path with the same prefix', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://example.test/api' },
        { provide: AUTH_REDIRECT, useValue: vi.fn() },
      ],
    });
    TestBed.inject(AuthSession).start(response());
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).get('https://example.test/api-other/notes').subscribe();
    const external = http.expectOne('https://example.test/api-other/notes');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
    TestBed.inject(HttpClient).get('https://example.test/api/notes').subscribe();
    const own = http.expectOne('https://example.test/api/notes');
    expect(own.request.headers.get('Authorization')).toBe('Bearer token-a');
    own.flush([]);
    http.verify();
  });
});
