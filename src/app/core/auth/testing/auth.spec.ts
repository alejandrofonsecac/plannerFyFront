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
import { AuthSession, AUTH_REDIRECT } from '../session/auth-session.service';
import { authInterceptor } from '../http/auth.interceptor';
import { authGuard, authChildGuard, guestGuard, safeReturnUrl } from '../routing/auth.guard';
import type { AuthResponse } from '../models/auth.model';
import { API_BASE_URL } from '../../data-access/api-client.service';

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

  beforeEach(() => {
    redirect.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AUTH_REDIRECT, useValue: redirect },
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

  it.each(['login', 'register'] as const)(
    'connects %s and sends only credentials',
    async (mode) => {
      const pending = service.submit(mode, {
        name: ' Ana ',
        email: ' ANA@example.com ',
        password: ' secret-password ',
      });
      const request = http.expectOne('http://localhost:8080/users/' + mode);
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
    const request = http.expectOne('http://localhost:8080/users/me');
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
    let status = 0;
    client
      .get('http://localhost:8080/notes')
      .subscribe({ error: (error: HttpErrorResponse) => (status = error.status) });
    http.expectNone('http://localhost:8080/notes');
    expect(status).toBe(401);
  });

  it('clears identity on 401 and performs one full navigation to discard feature caches', () => {
    session.start(response());
    client.get('http://localhost:8080/notes').subscribe({ error: () => undefined });
    client.get('http://localhost:8080/goals').subscribe({ error: () => undefined });
    http
      .match(() => true)
      .forEach((request) => request.flush({}, { status: 401, statusText: 'Unauthorized' }));
    expect(session.user()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login?reason=expired');
  });

  it('does not end a session on forbidden or temporary server errors', () => {
    session.start(response());
    for (const status of [403, 500]) {
      client.get('http://localhost:8080/notes').subscribe({ error: () => undefined });
      http.expectOne('http://localhost:8080/notes').flush({}, { status, statusText: 'Error' });
    }
    expect(session.accessToken()).toBe('token-a');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('ignores an old 401 after a new session is established', () => {
    session.start(response());
    client.get('http://localhost:8080/notes').subscribe({ error: () => undefined });
    session.start(response('token-b', 'Bia'));
    http
      .expectOne('http://localhost:8080/notes')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.accessToken()).toBe('token-b');
    expect(session.user()?.name).toBe('Bia');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('expires automatically and also rechecks the deadline before using the token', () => {
    vi.useFakeTimers();
    session.start({ ...response(), expiresIn: 2 });
    vi.advanceTimersByTime(2000);
    expect(session.accessToken()).toBeNull();
    expect(session.user()).toBeNull();
    expect(redirect).toHaveBeenCalledWith('/login?reason=expired');
  });

  it('detects expiration after a suspended tab wakes without running its timer', () => {
    vi.useFakeTimers();
    session.start({ ...response(), expiresIn: 1 });
    vi.setSystemTime(Date.now() + 2000);
    expect(session.accessToken()).toBeNull();
    expect(redirect).toHaveBeenCalledWith('/login?reason=expired');
  });

  it('logout clears the session and a late authentication response cannot restore it', () => {
    session.start(response());
    session.logout();
    expect(session.user()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(() => session.start(response())).toThrow();
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
