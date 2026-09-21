import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationError, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app.routes';
import { Login } from '../../../pages/login/login';
import { authInterceptor } from '../http/auth.interceptor';
import { AuthSession } from '../session/auth-session.service';

describe('authentication navigation with real routes', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(['login', 'register'] as const)(
    'renders Home after %s without losing the session',
    async (mode) => {
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          provideHttpClient(withInterceptors([authInterceptor])),
          provideHttpClientTesting(),
        ],
      });
      const harness = await RouterTestingHarness.create();
      const errors: unknown[] = [];
      TestBed.inject(Router).events.subscribe((event) => {
        if (event instanceof NavigationError) errors.push(String(event.error));
      });
      const login = await harness.navigateByUrl('/login', Login);
      login.setMode(mode);
      login.form.setValue({ name: 'Teste', email: 'test@example.com', password: 'test-password' });
      const pending = login.submit();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('http://localhost:8080/users/' + mode).flush({
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { id: 'test-user', name: 'Teste', email: 'test@example.com', role: 'USER' },
      });
      await pending;
      harness.detectChanges();
      expect(errors).toEqual([]);
      expect(TestBed.inject(Router).url).toBe('/home');
      expect(TestBed.inject(AuthSession).accessToken()).toBe('test-token');
      expect(harness.routeNativeElement?.querySelector('#home-title')).not.toBeNull();
      http
        .match(() => true)
        .forEach((request) => request.flush({}, { status: 503, statusText: 'Unavailable' }));
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('#home-title')).not.toBeNull();
      http.verify();
    },
  );
});
