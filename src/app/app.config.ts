import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/http/auth.interceptor';
import { AuthSession } from './core/auth/session/auth-session.service';
import { API_BASE_URL } from './core/data-access/api-client.service';
import { UserPreferencesService } from './core/preferences/user-preferences.service';
import { environment } from '../environments/environment';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    // Restores the session from the refresh cookie before the first route guard runs.
    provideAppInitializer(() => inject(AuthSession).restore()),
    // Loads the account's preferences whenever a session starts (restore, login or register).
    provideAppInitializer(() => {
      inject(UserPreferencesService);
    }),
    provideRouter(routes),
  ],
};
