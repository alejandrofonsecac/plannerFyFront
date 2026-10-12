import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal, type WritableSignal } from '@angular/core';
import type { PreferenceDefinition, UserPreference } from './user-preferences.model';

interface Entry {
  definition: PreferenceDefinition<unknown>;
  value: WritableSignal<unknown>;
}

type Listener = (key: string) => void;

/**
 * Registro das preferências de interface. Cada funcionalidade define as suas com
 * `define()`; o store guarda o valor atual e o cache em localStorage. A sincronização
 * com a conta fica em UserPreferencesService, que observa as alterações daqui.
 */
@Injectable({ providedIn: 'root' })
export class PreferenceStore {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly entries = new Map<string, Entry>();
  private readonly changeListeners = new Set<Listener>();
  private readonly defineListeners = new Set<Listener>();

  define<T>(definition: PreferenceDefinition<T>): UserPreference<T> {
    const { key } = definition;
    if (!this.entries.has(key)) {
      const cached = definition.parse(this.readCache(definition));
      this.entries.set(key, {
        definition: definition as PreferenceDefinition<unknown>,
        value: signal<unknown>(cached ?? definition.defaultValue),
      });
      this.defineListeners.forEach((listener) => listener(key));
    }
    const value = this.entry(key).value as WritableSignal<T>;
    return { key, value: value.asReadonly(), set: (next) => this.change(key, next) };
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }

  value(key: string): unknown {
    return this.entry(key).value();
  }

  isDefault(key: string): boolean {
    const { definition, value } = this.entry(key);
    return same(value(), definition.defaultValue);
  }

  /** Aplica um valor vindo da conta, sem tratá-lo como alteração do usuário. */
  applyRemote(key: string, value: unknown): boolean {
    const parsed = this.entry(key).definition.parse(value);
    if (parsed === undefined) return false;
    this.write(key, parsed);
    return true;
  }

  reset(key: string): void {
    this.write(key, this.entry(key).definition.defaultValue);
  }

  /** Alterações do usuário (não as aplicadas a partir da conta). */
  onChange(listener: Listener): void {
    this.changeListeners.add(listener);
  }

  /** Preferências registradas depois que a conta já foi carregada. */
  onDefine(listener: Listener): void {
    this.defineListeners.add(listener);
  }

  private change(key: string, next: unknown): void {
    const parsed = this.entry(key).definition.parse(next);
    if (parsed === undefined || same(parsed, this.value(key))) return;
    this.write(key, parsed);
    this.changeListeners.forEach((listener) => listener(key));
  }

  private write(key: string, value: unknown): void {
    const { definition, value: current } = this.entry(key);
    current.set(value);
    try {
      this.window?.localStorage.setItem(storageKey(definition), JSON.stringify(value));
    } catch {
      // A interface continua funcional quando o armazenamento não está disponível.
    }
  }

  private readCache(definition: PreferenceDefinition<unknown>): unknown {
    let raw: string | null | undefined;
    try {
      raw = this.window?.localStorage.getItem(storageKey(definition));
    } catch {
      return undefined;
    }
    if (raw === null || raw === undefined) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      // Caches antigos guardavam textos sem aspas, como `dark`.
      return raw;
    }
  }

  private entry(key: string): Entry {
    const entry = this.entries.get(key);
    if (!entry) throw new Error(`Preferência não registrada: ${key}`);
    return entry;
  }
}

function storageKey(definition: PreferenceDefinition<unknown>): string {
  return definition.storageKey ?? `plannerfy-preference-${definition.key}`;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
