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

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(AuthSession);
  return session.accessToken()
    ? true
    : inject(Router).createUrlTree(['/login'], {
        queryParams: { returnUrl: safeReturnUrl(state.url) },
      });
};

export const authChildGuard: CanActivateChildFn = authGuard;

export const guestGuard: CanActivateFn = () =>
  inject(AuthSession).accessToken() ? inject(Router).createUrlTree(['/home']) : true;
