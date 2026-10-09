import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthSession } from '../auth/session/auth-session.service';
import { API_BASE_URL } from '../data-access/api-client.service';
import { ThemeService } from '../../shared/theme.service';
import { PlannerViewService } from '../../shared/planner-view.service';
import { SidebarState } from '../../shared/components/sidebar/sidebar-state';
import type {
  PreferencesSyncStatus,
  UserPreferences,
  UserPreferencesResponse,
} from './user-preferences.model';

/** Conta cujas preferências estão no cache local deste navegador. */
export const PREFERENCES_OWNER_STORAGE_KEY = 'plannerfy-preferences-owner';
/** Agrupa alterações seguidas (cliques no tema, ajustes de horário) em uma única gravação. */
export const PREFERENCES_SAVE_DELAY_MS = 600;

/**
 * Sincroniza as preferências de interface com a conta autenticada.
 *
 * A API é a fonte de verdade; ThemeService, PlannerViewService e SidebarState continuam
 * guardando uma cópia em localStorage para aplicar a interface antes do login e sem rede.
 * Ao entrar, as preferências da conta substituem as locais. Na primeira vez em que uma
 * conta sem preferências salvas entra, as preferências locais deste navegador são enviadas,
 * exceto quando o cache pertence a outra conta. Falhas ficam visíveis em `status`.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/users/me/preferences`;
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private readonly auth = inject(AuthSession);
  private readonly theme = inject(ThemeService);
  private readonly plannerView = inject(PlannerViewService);
  private readonly sidebar = inject(SidebarState);

  readonly status = signal<PreferencesSyncStatus>('idle');

  /** Preferências aplicadas na interface neste momento. */
  readonly current = computed<UserPreferences>(() => ({
    theme: this.theme.theme(),
    accent: this.theme.accent(),
    plannerDisplay: this.plannerView.display(),
    sleep: { ...this.plannerView.sleep() },
    sidebarWidth: this.sidebar.width(),
  }));

  private userId: string | null = null;
  /** Último estado confirmado pela API para `userId`; nulo enquanto não foi carregado. */
  private synced: string | null = null;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private saving = false;
  private savePending = false;

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      untracked(() => this.switchAccount(userId));
    });
    effect(() => {
      const preferences = this.current();
      untracked(() => this.scheduleSave(preferences));
    });
  }

  /** Repete a operação que falhou: carregar a conta ou gravar a última alteração. */
  retry(): void {
    if (!this.userId) return;
    if (this.synced === null) this.load(this.userId);
    else this.save();
  }

  private switchAccount(userId: string | null): void {
    if (userId === this.userId) return;
    clearTimeout(this.saveTimer);
    this.userId = userId;
    this.synced = null;
    this.savePending = false;
    this.status.set('idle');
    if (userId) this.load(userId);
  }

  private load(userId: string): void {
    this.status.set('loading');
    this.http.get<UserPreferencesResponse>(this.url).subscribe({
      next: (stored) => {
        if (userId !== this.userId) return;
        const owner = this.readOwner();
        if (stored.updatedAt === null && (owner === null || owner === userId)) {
          // Primeiro acesso da conta: leva para a conta o que já estava configurado aqui.
          this.synced = key(stored);
          this.status.set('idle');
          this.save();
          return;
        }
        this.synced = key(stored);
        this.writeOwner(userId);
        this.apply(stored);
        this.status.set('idle');
      },
      error: () => {
        if (userId === this.userId) this.status.set('error');
      },
    });
  }

  private apply(preferences: UserPreferences): void {
    this.theme.setTheme(preferences.theme);
    this.theme.setAccent(preferences.accent);
    this.plannerView.setDisplay(preferences.plannerDisplay);
    this.plannerView.updateSleep(preferences.sleep);
    this.sidebar.setWidth(preferences.sidebarWidth);
  }

  private scheduleSave(preferences: UserPreferences): void {
    if (!this.userId || this.synced === null || key(preferences) === this.synced) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), PREFERENCES_SAVE_DELAY_MS);
  }

  /** Uma gravação por vez, sempre com o estado completo mais recente. */
  private save(): void {
    clearTimeout(this.saveTimer);
    if (this.saving) {
      this.savePending = true;
      return;
    }
    const userId = this.userId;
    const preferences = this.current();
    if (!userId || key(preferences) === this.synced) return;

    this.saving = true;
    this.status.set('saving');
    this.http
      .put<UserPreferencesResponse>(this.url, preferences)
      .subscribe({
        next: (saved) => {
          if (userId !== this.userId) return;
          this.synced = key(saved);
          this.writeOwner(userId);
          this.status.set('saved');
        },
        error: () => {
          if (userId === this.userId) this.status.set('error');
        },
      })
      .add(() => {
        this.saving = false;
        if (this.savePending && userId === this.userId) {
          this.savePending = false;
          this.save();
        }
      });
  }

  private readOwner(): string | null {
    try {
      return this.storage?.getItem(PREFERENCES_OWNER_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeOwner(userId: string): void {
    try {
      this.storage?.setItem(PREFERENCES_OWNER_STORAGE_KEY, userId);
    } catch {
      // Sem armazenamento local a conta continua sendo a fonte das preferências.
    }
  }
}

/** Compara preferências pelo conteúdo, ignorando `updatedAt` e a ordem das chaves. */
function key(preferences: UserPreferences): string {
  const { theme, accent, plannerDisplay, sleep, sidebarWidth } = preferences;
  return JSON.stringify([
    theme,
    accent,
    plannerDisplay,
    sleep.enabled,
    sleep.start,
    sleep.end,
    sidebarWidth,
  ]);
}
