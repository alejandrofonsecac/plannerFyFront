import { inject, InjectionToken } from '@angular/core';
import { AuthService } from '../../core/auth/data-access/auth.service';
import type { AuthCredentials } from '../../core/auth/models/auth.model';

export type AuthMode = 'login' | 'register';

export interface AuthGateway {
  submit(mode: AuthMode, credentials: AuthCredentials): Promise<void>;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY', {
  providedIn: 'root',
  factory: () => inject(AuthService),
});
