import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthSession } from '../auth/session/auth-session.service';
import { API_BASE_URL } from '../data-access/api-client.service';
import { PreferenceStore } from './preference-store.service';
import type { PreferencesSyncStatus, UserPreferencesResponse } from './user-preferences.model';

/** Conta cujas preferências estão no cache local deste navegador. */
export const PREFERENCES_OWNER_STORAGE_KEY = 'plannerfy-preferences-owner';
/** Agrupa alterações seguidas (cliques no tema, ajustes de horário) em uma única gravação. */
export const PREFERENCES_SAVE_DELAY_MS = 600;

/**
 * Sincroniza as preferências registradas no PreferenceStore com a conta autenticada.
 *
 * A API guarda um documento JSON por conta sem interpretar as chaves. Ao entrar, cada
 * preferência recebe o valor da conta; se a conta ainda não tem a chave, o valor deste
 * navegador é enviado (exceto quando o cache pertence a outra conta, caso em que vale o
 * padrão). Alterações enviam com `PATCH` apenas as chaves alteradas, então versões
 * diferentes do frontend não apagam preferências umas das outras. Falhas ficam em `status`.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/users/me/preferences`;
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly auth = inject(AuthSession);
  private readonly store = inject(PreferenceStore);

  readonly status = signal<PreferencesSyncStatus>('idle');

  private userId: string | null = null;
  /** Documento da conta; nulo enquanto não foi carregado. */
  private remote: Record<string, unknown> | null = null;
  /** Se valores locais ausentes na conta podem ser enviados a ela. */
  private adoptLocal = false;
  /** Chaves alteradas pelo usuário e ainda não confirmadas pela API. */
  private readonly dirty = new Set<string>();
  private saveTimer?: ReturnType<typeof setTimeout>;
  private saving = false;
  private savePending = false;

  constructor() {
    this.store.onChange((key) => {
      this.dirty.add(key);
      this.scheduleSave();
    });
    this.store.onDefine((key) => {
      if (this.remote === null) return;
      this.reconcile(key);
      this.scheduleSave();
    });
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      untracked(() => this.switchAccount(userId));
    });
  }

  /** Repete a operação que falhou: carregar a conta ou gravar as alterações pendentes. */
  retry(): void {
    if (!this.userId) return;
    if (this.remote === null) this.load(this.userId);
    else this.save();
  }

  private switchAccount(userId: string | null): void {
    if (userId === this.userId) return;
    clearTimeout(this.saveTimer);
    // Alterações feitas sem sessão (ex.: tema na tela de login) seguem para a conta que entrar.
    if (this.userId) this.dirty.clear();
    this.userId = userId;
    this.remote = null;
    this.savePending = false;
    this.status.set('idle');
    if (userId) this.load(userId);
  }

  private load(userId: string): void {
    this.status.set('loading');
    this.http.get<UserPreferencesResponse>(this.url).subscribe({
      next: (response) => {
        if (userId !== this.userId) return;
        const owner = this.readOwner();
        this.remote = { ...(response.preferences ?? {}) };
        this.adoptLocal = owner === null || owner === userId;
        this.store.keys().forEach((key) => this.reconcile(key));
        this.writeOwner(userId);
        this.status.set('idle');
        this.save();
      },
      error: () => {
        if (userId === this.userId) this.status.set('error');
      },
    });
  }

  private reconcile(key: string): void {
    const remote = this.remote;
    if (!remote || this.dirty.has(key)) return; // Alteração local mais recente que a consulta.
    if (Object.hasOwn(remote, key)) {
      // Valor que esta versão não reconhece: usa o padrão sem sobrescrever a conta.
      if (!this.store.applyRemote(key, remote[key])) this.store.reset(key);
      return;
    }
    if (this.adoptLocal && !this.store.isDefault(key)) this.dirty.add(key);
    else this.store.reset(key);
  }

  private scheduleSave(): void {
    if (!this.userId || this.remote === null || this.dirty.size === 0) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), PREFERENCES_SAVE_DELAY_MS);
  }

  /** Uma gravação por vez, sempre com os valores mais recentes das chaves alteradas. */
  private save(): void {
    clearTimeout(this.saveTimer);
    const userId = this.userId;
    if (!userId || this.remote === null || this.dirty.size === 0) return;
    if (this.saving) {
      this.savePending = true;
      return;
    }

    const keys = [...this.dirty];
    this.dirty.clear();
    const changes = Object.fromEntries(keys.map((key) => [key, this.store.value(key)]));
    this.saving = true;
    this.status.set('saving');
    this.http
      .patch<UserPreferencesResponse>(this.url, changes)
      .subscribe({
        next: (response) => {
          if (userId !== this.userId) return;
          this.remote = { ...(response.preferences ?? {}) };
          this.writeOwner(userId);
          this.status.set('saved');
        },
        error: () => {
          if (userId !== this.userId) return;
          keys.forEach((key) => this.dirty.add(key));
          this.status.set('error');
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
      return this.window?.localStorage.getItem(PREFERENCES_OWNER_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeOwner(userId: string): void {
    try {
      this.window?.localStorage.setItem(PREFERENCES_OWNER_STORAGE_KEY, userId);
    } catch {
      // Sem armazenamento local a conta continua sendo a fonte das preferências.
    }
  }
}
