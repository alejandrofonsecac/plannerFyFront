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
import { PreferenceStore } from './preference-store.service';
import { oneOf } from './preference-values';
import type { UserPreferencesResponse } from './user-preferences.model';
import {
  PREFERENCES_OWNER_STORAGE_KEY,
  PREFERENCES_SAVE_DELAY_MS,
  UserPreferencesService,
} from './user-preferences.service';

const URL = 'http://localhost:8080/users/me/preferences';

const EMPTY: UserPreferencesResponse = { preferences: {}, updatedAt: null };

const STORED: UserPreferencesResponse = {
  preferences: {
    theme: 'dark',
    accent: 'teal',
    plannerDisplay: 'radial',
    sleep: { enabled: true, start: 22, end: 6 },
    sidebarWidth: 320,
  },
  updatedAt: '2026-10-12T12:00:00Z',
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
    const theme = TestBed.inject(ThemeService);
    const planner = TestBed.inject(PlannerViewService);
    const sidebar = TestBed.inject(SidebarState);
    const session = TestBed.inject(AuthSession);
    TestBed.tick();
    return {
      service,
      theme,
      planner,
      sidebar,
      store: TestBed.inject(PreferenceStore),
      signIn(id: string) {
        session.start(login(id));
        TestBed.tick();
      },
    };
  }

  function waitForSave() {
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

  it('applies the account document after sign-in without saving it back', () => {
    const { service, theme, planner, sidebar, signIn } = setup();
    signIn('ana');
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-ana');
    request.flush(STORED);
    TestBed.tick();
    waitForSave();

    expect(theme.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(theme.accent()).toBe('teal');
    expect(planner.display()).toBe('radial');
    expect(planner.sleep()).toEqual({ enabled: true, start: 22, end: 6 });
    expect(sidebar.width()).toBe(320);
    expect(localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY)).toBe('ana');
    expect(service.status()).toBe('idle');
  });

  it('sends one PATCH with only the keys changed in a burst', () => {
    const { service, theme, planner, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(STORED);

    theme.setTheme('system');
    planner.updateSleep({ start: 21 });
    waitForSave();

    const save = http.expectOne({ url: URL, method: 'PATCH' });
    expect(save.request.body).toEqual({
      theme: 'system',
      sleep: { enabled: true, start: 21, end: 6 },
    });
    expect(service.status()).toBe('saving');
    save.flush({ ...STORED, preferences: { ...STORED.preferences, ...save.request.body } });
    expect(service.status()).toBe('saved');
  });

  it('uploads the settings of this browser that the account does not have yet', () => {
    localStorage.setItem('plannerfy-theme', 'high-contrast');
    localStorage.setItem('agenda.sidebar-width', '300');
    const { theme, signIn } = setup();
    signIn('ana');
    http
      .expectOne(URL)
      .flush({ preferences: { accent: 'pink' }, updatedAt: '2026-10-12T12:00:00Z' });

    expect(theme.theme()).toBe('high-contrast');
    expect(theme.accent()).toBe('pink');
    const save = http.expectOne({ url: URL, method: 'PATCH' });
    expect(save.request.body).toEqual({ theme: 'high-contrast', sidebarWidth: 300 });
    save.flush(EMPTY);
  });

  it('does not hand the cached settings of another account to a new account', () => {
    localStorage.setItem('plannerfy-theme', 'dark');
    localStorage.setItem(PREFERENCES_OWNER_STORAGE_KEY, 'ana');
    const { theme, signIn } = setup();
    signIn('bruno');
    http.expectOne(URL).flush(EMPTY);
    waitForSave();

    expect(theme.theme()).toBe('light');
    expect(localStorage.getItem('plannerfy-theme')).toBe('"light"');
    expect(localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY)).toBe('bruno');
    http.expectNone({ url: URL, method: 'PATCH' });
  });

  it('uses the default for values this version does not recognize, without overwriting them', () => {
    const { theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush({
      preferences: { theme: 'sepia', futureSetting: true },
      updatedAt: '2026-10-12T12:00:00Z',
    });
    waitForSave();

    expect(theme.theme()).toBe('light');
    http.expectNone({ url: URL, method: 'PATCH' });
  });

  it('gives preferences registered later (lazy features) the value stored in the account', () => {
    const { store, signIn } = setup();
    signIn('ana');
    http
      .expectOne(URL)
      .flush({ preferences: { weekStart: 'sunday' }, updatedAt: '2026-10-12T12:00:00Z' });

    const weekStart = store.define({
      key: 'weekStart',
      defaultValue: 'monday',
      parse: oneOf(['monday', 'sunday']),
    });
    expect(weekStart.value()).toBe('sunday');

    weekStart.set('monday');
    waitForSave();
    http.expectOne({ url: URL, method: 'PATCH' }).flush(EMPTY);
  });

  it('reports a failed load, keeps changes local and retries on request', () => {
    const { service, theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(service.status()).toBe('error');

    theme.setTheme('dark');
    waitForSave();
    http.expectNone({ url: URL, method: 'PATCH' });

    service.retry();
    http.expectOne({ url: URL, method: 'GET' }).flush(STORED);
    // A escolha feita durante a falha é mais recente que a conta e segue para ela.
    expect(theme.theme()).toBe('dark');
    const save = http.expectOne({ url: URL, method: 'PATCH' });
    expect(save.request.body).toEqual({ theme: 'dark' });
    save.flush(STORED);
  });

  it('reports a failed save instead of pretending it succeeded', () => {
    const { service, theme, signIn } = setup();
    signIn('ana');
    http.expectOne(URL).flush(STORED);

    theme.setAccent('pink');
    waitForSave();
    http.expectOne({ url: URL, method: 'PATCH' }).flush(null, { status: 500, statusText: 'Error' });
    expect(service.status()).toBe('error');
    expect(theme.accent()).toBe('pink');

    service.retry();
    const retry = http.expectOne({ url: URL, method: 'PATCH' });
    expect(retry.request.body).toEqual({ accent: 'pink' });
    retry.flush(STORED);
    expect(service.status()).toBe('saved');
  });

  it('does not contact the API without a session', () => {
    const { theme } = setup();
    theme.setTheme('dark');
    waitForSave();
    http.expectNone(URL);
  });
});
