import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalClockService {
  readonly now = signal(new Date());

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const refresh = () => this.now.set(new Date());
    const timer = view?.setInterval(refresh, 30_000);
    view?.addEventListener('focus', refresh);
    inject(DestroyRef).onDestroy(() => {
      view?.clearInterval(timer);
      view?.removeEventListener('focus', refresh);
    });
  }
}
