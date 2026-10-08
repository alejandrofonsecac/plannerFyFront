import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../../data-access/api-client.service';
import type { AuthGateway, AuthMode } from '../../../pages/login/auth-gateway';
import type { AuthCredentials, AuthResponse, AuthUser } from '../models/auth.model';
import { AuthSession } from '../session/auth-session.service';
import { SESSION_REQUEST, SESSION_TIMEOUT_MS } from './session-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService implements AuthGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');
  private readonly session = inject(AuthSession);

  async submit(mode: AuthMode, credentials: AuthCredentials): Promise<void> {
    const email = credentials.email.trim().toLowerCase();
    // Explicit fields: the client never requests a role or selects a userId.
    const body =
      mode === 'register'
        ? { name: credentials.name.trim(), email, password: credentials.password }
        : { email, password: credentials.password };
    const response = await firstValueFrom(
      this.http
        .post<AuthResponse>(`${this.baseUrl}/users/${mode}`, body, SESSION_REQUEST)
        .pipe(timeout(SESSION_TIMEOUT_MS)),
    );
    this.session.start(response);
  }

  me() {
    return this.http.get<AuthUser>(`${this.baseUrl}/users/me`);
  }
}

/** Do not display server exceptions or echo request bodies containing passwords. */
export function authErrorMessage(error: unknown, mode: AuthMode): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 426)
      return 'O servidor exige HTTPS. Acesse o PlannerFy pela conexão segura configurada.';
    if (error.status === 403)
      return 'O servidor recusou a solicitação. Verifique a configuração de acesso da aplicação.';
    if (error.status === 401) return 'Email ou senha incorretos.';
    if (error.status === 409 && mode === 'register')
      return 'Este email já está cadastrado. Entre na sua conta.';
    if (error.status === 400 || error.status === 422)
      return 'Confira os dados informados e tente novamente.';
    if (error.status === 429)
      return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    if (error.status === 0)
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível continuar. Tente novamente em instantes.';
}
