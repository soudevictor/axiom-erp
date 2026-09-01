import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'axiom-theme';

/**
 * ThemeService — manages Light / Dark mode.
 *
 * Strategy (Tailwind `darkMode: 'class'`):
 *  - Dark mode: `.dark` class on `<html>` (explicit — Tailwind dark: utilities apply).
 *  - Light mode: no `.dark` class on `<html>`.
 *  - Default (no stored preference): dark mode.
 *  - Preference persisted in `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.resolveInitialTheme());

  private resolveInitialTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      // Default: dark-first per agent.md spec
      return 'dark';
    } catch {
      // Fallback when localStorage is unavailable (JSDOM test environment)
      return 'dark';
    }
  }

  constructor() {
    this.applyTheme(this.mode());
  }

  toggle(): void {
    const next: ThemeMode = this.mode() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: ThemeMode): void {
    this.mode.set(theme);
    this.applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Silently ignore when storage is unavailable
    }
  }

  private applyTheme(theme: ThemeMode): void {
    try {
      const html = document.documentElement;
      if (theme === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
      }
    } catch {
      // Silently ignore when DOM is unavailable
    }
  }
}
