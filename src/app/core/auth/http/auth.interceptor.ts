import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../../data-access/api-client.service';
import { AuthSession } from '../session/auth-session.service';

/** Match the exact API origin and path boundary, never a string prefix host. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const document = inject(DOCUMENT);
  const base = new URL(inject(API_BASE_URL).replace(/\/+$/, '') + '/', document.baseURI);
  const target = new URL(request.url, document.baseURI);
  const basePath = base.pathname.replace(/\/$/, '');

  const isApi =
    target.origin === base.origin &&
    (target.pathname === basePath || target.pathname.startsWith(basePath + '/'));

  if (!isApi){
    return next(request);
  } 

  const relativePath = target.pathname.slice(basePath.length).replace(/\/$/, '');

  if (relativePath === '/users/login' || relativePath === '/users/register'){
    return next(request);
  } 

  const session = inject(AuthSession);
  const token = session.accessToken();

  if (!token) {
    return throwError(
      () => new HttpErrorResponse({ status: 401, statusText: 'Authentication required' }),
    );
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401){
        session.reject(token);
      }
        
      return throwError(() => error);
    }),
  );
};
