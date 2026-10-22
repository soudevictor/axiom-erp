import { Injectable, signal } from '@angular/core';

/**
 * Owns the shell's transient layout state. Keeping it in a service lets the
 * header, sidebar and content area agree on focus and inert states without
 * passing events through multiple components.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);

  private mobileTrigger: HTMLElement | null = null;

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  openMobile(trigger?: HTMLElement): void {
    this.mobileTrigger = trigger ?? null;
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    if (!this.mobileOpen()) return;
    this.mobileOpen.set(false);
    this.mobileTrigger?.focus();
    this.mobileTrigger = null;
  }

  toggleMobile(trigger?: HTMLElement): void {
    if (this.mobileOpen()) {
      this.closeMobile();
    } else {
      this.openMobile(trigger);
    }
  }
}
