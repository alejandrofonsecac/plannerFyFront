import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferenceStore } from '../../../core/preferences/preference-store.service';

const DESKTOP_BREAKPOINT = 768;
export const MIN_SIDEBAR_WIDTH = 240;
export const MAX_SIDEBAR_WIDTH = 340;
export const DEFAULT_SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_STORAGE_KEY = 'agenda.sidebar-width';

@Injectable({ providedIn: 'root' })
export class SidebarState {
  readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1280);
  readonly isOpen = signal(true);
  /** Largura escolhida no desktop; preferência da conta (docs/USER_PREFERENCES.md). */
  private readonly widthPreference = inject(PreferenceStore).define<number>({
    key: 'sidebarWidth',
    defaultValue: DEFAULT_SIDEBAR_WIDTH,
    parse: (value) =>
      typeof value === 'number' && Number.isFinite(value) ? clampSidebarWidth(value) : undefined,
    storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
  });
  readonly width = this.widthPreference.value;

  readonly isDesktop = computed(() => this.viewportWidth() >= DESKTOP_BREAKPOINT);
  /** Whether the sidebar is currently taking up horizontal space in the layout. */
  readonly occupiesLayout = computed(() => this.isDesktop() && this.isOpen());

  setWidth(width: number): void {
    this.widthPreference.set(clampSidebarWidth(width));
  }
}

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.round(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)));
}
