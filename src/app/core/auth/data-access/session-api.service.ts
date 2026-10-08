import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../../data-access/api-client.service';
import type { AuthResponse } from '../models/auth.model';

/** Endpoints that carry the HttpOnly refresh cookie instead of a Bearer token. */
export const SESSION_PATHS: ReadonlySet<string> = new Set([
  '/users/login',
  '/users/register',
  '/users/refresh',
  '/users/logout',
]);

/** The custom header forces a CORS preflight; the backend rejects session POSTs without it. */
export const SESSION_REQUEST = {
  headers: { 'X-PlannerFy-Session': '1' },
  withCredentials: true,
} as const;

export const SESSION_TIMEOUT_MS = 15_000;

/** HTTP calls only: session state and concurrency live in AuthSession. */
@Injectable({ providedIn: 'root' })
export class SessionApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');

  /** Rotates the refresh cookie; the browser sends and stores it, JavaScript never reads it. */
  refresh(): Promise<AuthResponse> {
    return firstValueFrom(
      this.http
        .post<AuthResponse>(`${this.baseUrl}/users/refresh`, {}, SESSION_REQUEST)
        .pipe(timeout(SESSION_TIMEOUT_MS)),
    );
  }

  /** Revokes the cookie's session family on the server and clears the cookie. */
  async logout(): Promise<void> {
    await firstValueFrom(
      this.http
        .post<void>(`${this.baseUrl}/users/logout`, {}, SESSION_REQUEST)
        .pipe(timeout(SESSION_TIMEOUT_MS)),
    );
  }
}
