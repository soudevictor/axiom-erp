import { Injectable } from '@angular/core';

/**
 * Reference-counted body scroll lock shared by dialogs and drawers.
 * A naive per-overlay save/restore leaks when two overlays overlap or when
 * their effects run in the same change-detection pass.
 */
@Injectable({ providedIn: 'root' })
export class OverlayScrollLockService {
  private count = 0;
  private previousOverflow = '';

  lock(): void {
    if (this.count === 0) {
      this.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    this.count += 1;
  }

  unlock(): void {
    if (this.count === 0) return;
    this.count -= 1;
    if (this.count === 0) {
      document.body.style.overflow = this.previousOverflow;
      this.previousOverflow = '';
    }
  }
}
