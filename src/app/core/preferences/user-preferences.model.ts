import type { AccentId, Theme } from '../../shared/theme.service';
import type { PlannerDisplay, PlannerSleepSchedule } from '../../shared/planner-view.service';

/** Corpo de `PUT /users/me/preferences`. Veja docs/USER_PREFERENCES.md. */
export interface UserPreferences {
  theme: Theme;
  accent: AccentId;
  plannerDisplay: PlannerDisplay;
  sleep: PlannerSleepSchedule;
  sidebarWidth: number;
}

/** `updatedAt` nulo: a conta ainda não salvou preferências e a API devolveu os padrões. */
export interface UserPreferencesResponse extends UserPreferences {
  updatedAt: string | null;
}

export type PreferencesSyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
