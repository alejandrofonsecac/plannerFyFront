import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthSession } from '../session/auth-session.service';

const privatePaths = new Set([
  '/home',
  '/habits',
  '/goals',
  '/notes',
  '/calendar',
  '/files',
  '/projects',
  '/schedule',
]);

/** Only known local routes are accepted; no external redirect or auxiliary outlet. */
export function safeReturnUrl(value: string | null): string {
  if (!value || /[\\\\\r\n]/.test(value)) return '/home';
  const path = value.split(/[?#]/, 1)[0];
  return privatePaths.has(path) ? value : '/home';
}

/** Navigation UX only: the backend still authorizes every request. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const login = () =>
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: safeReturnUrl(state.url) },
    });

  if (!session.user()) return login();
  if (session.accessToken()) return true;

  // Identity exists but the access token expired: wait for the shared renewal.
  // A rejected renewal ends the session; a temporary failure keeps it for the next request.
  return session.ensureCredential().then(
    () => true,
    () => (session.user() ? true : login()),
  );
};

export const authChildGuard: CanActivateChildFn = authGuard;

export const guestGuard: CanActivateFn = () =>
  inject(AuthSession).user() ? inject(Router).createUrlTree(['/home']) : true;
