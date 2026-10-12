import type { Signal } from '@angular/core';

/**
 * Uma preferência de interface registrada por uma funcionalidade. O frontend define a
 * chave, o padrão e os valores aceitos; a API apenas guarda o documento da conta.
 * Veja docs/USER_PREFERENCES.md.
 */
export interface PreferenceDefinition<T> {
  /** Chave no documento da conta: camelCase e estável depois de publicada. */
  key: string;
  defaultValue: T;
  /** Converte um valor desconhecido (cache local ou conta); `undefined` quando inválido. */
  parse(value: unknown): T | undefined;
  /** Chave já usada no localStorage, preservada para não perder o cache existente. */
  storageKey?: string;
}

export interface UserPreference<T> {
  readonly key: string;
  readonly value: Signal<T>;
  /** Alteração feita pelo usuário: atualiza a interface, o cache e a conta. */
  set(value: T): void;
}

/** Resposta de `GET` e `PATCH /users/me/preferences`. */
export interface UserPreferencesResponse {
  preferences: Record<string, unknown>;
  /** Nulo quando a conta ainda não salvou nenhuma preferência. */
  updatedAt: string | null;
}

export type PreferencesSyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
