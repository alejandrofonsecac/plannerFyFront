import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../../data-access/api-client.service';
import { SESSION_PATHS } from '../data-access/session-api.service';
import {
  AuthSession,
  isUnauthorized,
  unauthorized,
  type SessionCredential,
} from '../session/auth-session.service';

/** Match the exact API origin and path boundary, never a string prefix host. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const document = inject(DOCUMENT);
  const base = new URL(inject(API_BASE_URL).replace(/\/+$/, '') + '/', document.baseURI);
  const target = new URL(request.url, document.baseURI);
  const basePath = base.pathname.replace(/\/$/, '');

  const isApi =
    target.origin === base.origin &&
    (target.pathname === basePath || target.pathname.startsWith(basePath + '/'));

  if (!isApi) {
    return next(request);
  }

  const relativePath = target.pathname.slice(basePath.length).replace(/\/$/, '');

  // Session endpoints use the HttpOnly cookie; their 401 must not trigger another refresh.
  if (SESSION_PATHS.has(relativePath)) {
    return next(request);
  }

  const session = inject(AuthSession);

  if (!session.user()) {
    return throwError(unauthorized);
  }

  const send = (credential: SessionCredential) => next(withBearer(request, credential.token));
  // The original request is repeated at most once; a second 401 ends the session.
  const retryOnce = (credential: SessionCredential) =>
    send(credential).pipe(
      catchError((error: unknown) => {
        if (isUnauthorized(error)) session.reject(credential.token);
        return throwError(() => error);
      }),
    );

  // A fresh token is sent synchronously; only an expired one waits for the shared renewal.
  const ready = session.credential();

  return (ready ? of(ready) : from(session.ensureCredential())).pipe(
    switchMap((credential) =>
      send(credential).pipe(
        catchError((error: unknown) =>
          isUnauthorized(error)
            ? from(session.recover(credential)).pipe(switchMap(retryOnce))
            : throwError(() => error),
        ),
      ),
    ),
  );
};

function withBearer<T>(request: HttpRequest<T>, token: string): HttpRequest<T> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
