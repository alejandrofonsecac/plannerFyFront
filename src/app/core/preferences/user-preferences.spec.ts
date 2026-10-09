import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from '../auth/http/auth.interceptor';
import type { AuthResponse } from '../auth/models/auth.model';
import {
  AuthSession,
  AUTH_REDIRECT,
  AUTH_SESSION_LOCK,
} from '../auth/session/auth-session.service';
import { API_BASE_URL } from '../data-access/api-client.service';
import { ThemeService } from '../../shared/theme.service';
import { PlannerViewService } from '../../shared/planner-view.service';
import { SidebarState } from '../../shared/components/sidebar/sidebar-state';
import type { UserPreferencesResponse } from './user-preferences.model';
import {
  PREFERENCES_OWNER_STORAGE_KEY,
  PREFERENCES_SAVE_DELAY_MS,
  UserPreferencesService,
} from './user-preferences.service';

const URL = 'http://localhost:8080/users/me/preferences';

const DEFAULTS: UserPreferencesResponse = {
  theme: 'light',
  accent: 'blue',
  plannerDisplay: 'compact',
  sleep: { enabled: false, start: 23, end: 7 },
  sidebarWidth: 280,
  updatedAt: null,
};

const STORED: UserPreferencesResponse = {
  theme: 'dark',
  accent: 'teal',
  plannerDisplay: 'radial',
  sleep: { enabled: true, start: 22, end: 6 },
  sidebarWidth: 320,
  updatedAt: '2026-10-09T12:00:00Z',
};

function login(id: string): AuthResponse {
  return {
    accessToken: 'token-' + id,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id, name: id, email: id + '@example.com', role: 'USER' },
  };
}

describe('UserPreferencesService', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:8080' },
        { provide: AUTH_REDIRECT, useValue: vi.fn() },
        { provide: AUTH_SESSION_LOCK, useValue: <T>(task: () => Promise<T>) => task() },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(UserPreferencesService);
    const session = TestBed.inject(AuthSession);
    TestBed.tick();
    return {
      service,
      theme: TestBed.inject(ThemeService),
      planner: TestBed.inject(PlannerViewService),
      sidebar: TestBed.inject(SidebarState),
      signIn(id: string) {
        session.start(login(id));
        TestBed.tick();
      },
    };
  }

  /** Runs effects, then the save debounce. */
  function settle() {
    TestBed.tick();
    vi.advanceTimersByTime(PREFERENCES_SAVE_DELAY_MS);
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('applies the preferences stored in the account after sign-in without saving them back', () => {
    const { service, theme, planner, sidebar, signIn } = setup();
    expect(service.current().theme).toBe('light');

    signIn('ana');
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-ana');
    request.flush(STORED);
    settle();

    expect(theme.theme()).toBe('dark');
    expect(theme.accent()).toBe('teal');
    expect(planner.display()).toBe('radial');
    expect(planner.sleep()).toEqual({ enabled: true, start: 22, end: 6 });
    expect(sidebar.width()).toBe(320);
    expect(localStorage.getItem('plannerfy-theme')).toBe('dark');
    expect(localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY)).toBe('ana');
    expect(service.status()).toBe('idle');
    http.expectNone(URL);
  });

  it('sends one PUT with the complete state after a burst of changes', () => {
    const { service, theme, planner, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(STORED);
    settle();

    theme.setTheme('system');
    TestBed.tick();
    planner.updateSleep({ start: 21 });
    settle();

    const save = http.expectOne({ url: URL, method: 'PUT' });
    expect(save.request.body).toEqual({
      theme: 'system',
      accent: 'teal',
      plannerDisplay: 'radial',
      sleep: { enabled: true, start: 21, end: 6 },
      sidebarWidth: 320,
    });
    expect(service.status()).toBe('saving');
    save.flush({ ...save.request.body, updatedAt: '2026-10-09T12:01:00Z' });
    expect(service.status()).toBe('saved');
  });

  it('uploads the settings of this browser the first time an account signs in', () => {
    localStorage.setItem('plannerfy-theme', 'high-contrast');
    localStorage.setItem('agenda.sidebar-width', '300');
    const { theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(DEFAULTS);
    settle();

    expect(theme.theme()).toBe('high-contrast');
    const save = http.expectOne({ url: URL, method: 'PUT' });
    expect(save.request.body).toMatchObject({ theme: 'high-contrast', sidebarWidth: 300 });
    save.flush({ ...save.request.body, updatedAt: '2026-10-09T12:01:00Z' });
    expect(localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY)).toBe('ana');
  });

  it('does not hand the cached settings of another account to a new account', () => {
    localStorage.setItem('plannerfy-theme', 'dark');
    localStorage.setItem(PREFERENCES_OWNER_STORAGE_KEY, 'ana');
    const { theme, signIn } = setup();
    signIn('bruno');
    http.expectOne(URL).flush(DEFAULTS);
    settle();

    expect(theme.theme()).toBe('light');
    expect(localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY)).toBe('bruno');
    http.expectNone({ url: URL, method: 'PUT' });
  });

  it('reports a failed load, keeps changes local and retries on request', () => {
    const { service, theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(service.status()).toBe('error');

    theme.setTheme('dark');
    settle();
    http.expectNone({ url: URL, method: 'PUT' });

    service.retry();
    http.expectOne(URL).flush(STORED);
    expect(service.status()).toBe('idle');
  });

  it('reports a failed save instead of pretending it succeeded', () => {
    const { service, theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(STORED);
    settle();

    theme.setAccent('pink');
    settle();
    http.expectOne({ url: URL, method: 'PUT' }).flush(null, { status: 500, statusText: 'Error' });
    expect(service.status()).toBe('error');
    expect(theme.accent()).toBe('pink');

    service.retry();
    const retry = http.expectOne({ url: URL, method: 'PUT' });
    expect(retry.request.body).toMatchObject({ accent: 'pink' });
    retry.flush({ ...retry.request.body, updatedAt: '2026-10-09T12:02:00Z' });
    expect(service.status()).toBe('saved');
  });

  it('does not contact the API without a session', () => {
    const { theme } = setup();
    theme.setTheme('dark');
    settle();
    http.expectNone(URL);
  });
});
