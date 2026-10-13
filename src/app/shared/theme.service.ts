import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { PreferenceStore } from '../core/preferences/preference-store.service';
import { oneOf } from '../core/preferences/model/preference-values';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'system';
export type AccentId = 'indigo' | 'teal' | 'orange' | 'pink' | 'blue';

export interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
}

export interface AccentOption {
  id: AccentId;
  label: string;
  color: string;
  hoverColor: string;
}

const THEME_STORAGE_KEY = 'plannerfy-theme';
const ACCENT_STORAGE_KEY = 'plannerfy-accent';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemColorScheme = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');

  readonly themeOptions: readonly ThemeOption[] = [
    { id: 'light', label: 'Claro', description: 'Interface clara e neutra.' },
    { id: 'dark', label: 'Escuro', description: 'Interface escura com contraste confortável.' },
    { id: 'high-contrast', label: 'Escuro alto contraste', description: 'Contraste reforçado para leitura.' },
    { id: 'system', label: 'Sistema', description: 'Acompanha a preferência do dispositivo.' },
  ];

  readonly accentOptions: readonly AccentOption[] = [
    { id: 'indigo', label: 'Índigo', color: '#4F46E5', hoverColor: '#4338CA' },
    { id: 'teal', label: 'Verde-água', color: '#0F9E8D', hoverColor: '#0B7F72' },
    { id: 'orange', label: 'Laranja', color: '#EA580C', hoverColor: '#C2410C' },
    { id: 'pink', label: 'Rosa', color: '#DB2777', hoverColor: '#BE185D' },
    { id: 'blue', label: 'Azul', color: '#2563EB', hoverColor: '#1D4ED8' },
  ];

  // Preferências da conta: veja docs/USER_PREFERENCES.md.
  private readonly preferences = inject(PreferenceStore);
  private readonly themePreference = this.preferences.define<Theme>({
    key: 'theme',
    defaultValue: 'light',
    parse: oneOf(this.themeOptions.map((option) => option.id)),
    storageKey: THEME_STORAGE_KEY,
  });
  private readonly accentPreference = this.preferences.define<AccentId>({
    key: 'accent',
    defaultValue: 'blue',
    parse: oneOf(this.accentOptions.map((option) => option.id)),
    storageKey: ACCENT_STORAGE_KEY,
  });

  readonly theme = this.themePreference.value;
  readonly accent = this.accentPreference.value;

  constructor() {
    this.applyTheme(this.theme());
    this.applyAccent(this.accent());
    // Também aplica os valores que chegam da conta após o login.
    effect(() => this.applyTheme(this.theme()));
    effect(() => this.applyAccent(this.accent()));
    this.systemColorScheme?.addEventListener('change', () => {
      if (this.theme() === 'system') this.applyTheme('system');
    });
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.themePreference.set(theme);
    this.applyTheme(this.theme());
  }

  setAccent(accent: AccentId): void {
    this.accentPreference.set(accent);
    this.applyAccent(this.accent());
  }

  private applyTheme(theme: Theme): void {
    const resolvedTheme = theme === 'system' ? (this.systemColorScheme?.matches ? 'dark' : 'light') : theme;
    const root = this.document.documentElement;

    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('high-contrast', resolvedTheme === 'high-contrast');
  }

  private applyAccent(accentId: AccentId): void {
    const accent = this.accentOptions.find((option) => option.id === accentId);
    if (!accent) return;

    const rootStyle = this.document.documentElement.style;
    rootStyle.setProperty('--accent-color', accent.color);
    rootStyle.setProperty('--color-brand-primary', accent.color);
    rootStyle.setProperty('--color-brand-hover', accent.hoverColor);
  }
}
