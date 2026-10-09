import { Injectable, computed, signal } from '@angular/core';

const DESKTOP_BREAKPOINT = 768;
export const MIN_SIDEBAR_WIDTH = 240;
export const MAX_SIDEBAR_WIDTH = 340;
export const DEFAULT_SIDEBAR_WIDTH = 280;
const SIDEBAR_WIDTH_STORAGE_KEY = 'agenda.sidebar-width';

@Injectable({ providedIn: 'root' })
export class SidebarState {
  readonly viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1280);
  readonly isOpen = signal(true);
  /** Largura escolhida no desktop; faz parte das preferências da conta. */
  readonly width = signal(readStoredWidth());

  readonly isDesktop = computed(() => this.viewportWidth() >= DESKTOP_BREAKPOINT);
  /** Whether the sidebar is currently taking up horizontal space in the layout. */
  readonly occupiesLayout = computed(() => this.isDesktop() && this.isOpen());

  setWidth(width: number): void {
    const next = clampSidebarWidth(width);
    this.width.set(next);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(next));
    } catch {
      // A interface continua funcional caso o armazenamento esteja indisponível.
    }
  }
}

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.round(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)));
}

function readStoredWidth(): number {
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    return stored === null ? DEFAULT_SIDEBAR_WIDTH : clampSidebarWidth(Number(stored));
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}
