import { InjectionToken } from '@angular/core';

export type AuthMode = 'login' | 'register' | 'reset';

/** Provide an implementation when the backend authentication contract is available. */
export interface AuthGateway {
  submit(
    mode: AuthMode | 'google',
    credentials: { name: string; email: string; password: string },
  ): Promise<void>;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY', {
  providedIn: 'root',
  factory: () => ({
    async submit() {
      throw new Error('A autenticação ainda não está disponível. Tente novamente mais tarde.');
    },
  }),
});
