import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LucideAngularModule,
  Package,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-angular';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: typeof LayoutDashboard;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside
      class="relative flex flex-col h-screen bg-slate-950 border-r border-slate-800/80 text-slate-300 transition-all duration-300 select-none z-30"
      [ngClass]="isCollapsed() ? 'w-22' : 'w-64'"
      aria-label="Navegação Principal"
    >
      <!-- Header / Logo -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-slate-800/80">
        <a
          routerLink="/"
          class="flex items-center gap-3 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
        >
          <div class="flex items-center justify-center w-10 h-10 shrink-0">
            <img src="logoIcon.svg" alt="logo" />
          </div>
          @if (!isCollapsed()) {
            <div class="flex flex-col">
              <img src="logoWordMark.svg" alt="logo" />
            </div>
          }
        </a>

        <!-- Collapse Toggle Button -->
        <button
          type="button"
          (click)="toggleCollapse()"
          class="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          [attr.aria-label]="isCollapsed() ? 'Expandir barra lateral' : 'Recolher barra lateral'"
        >
          <lucide-icon [img]="isCollapsed() ? ChevronRightIcon : ChevronLeftIcon" [size]="18" />
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-500 font-semibold"
            #rla="routerLinkActive"
            [attr.aria-current]="rla.isActive ? 'page' : null"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all duration-150"
            [title]="isCollapsed() ? item.label : ''"
          >
            <lucide-icon
              [img]="item.icon"
              [size]="20"
              class="shrink-0 transition-colors group-hover:text-indigo-400"
              [ngClass]="{ 'text-indigo-400': rla.isActive }"
            />

            @if (!isCollapsed()) {
              <span class="truncate">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer / System Status -->
      <div class="p-3 border-t border-slate-800/80">
        <div
          class="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60"
        >
          <div class="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
            <lucide-icon [img]="ShieldCheckIcon" [size]="16" />
          </div>
          @if (!isCollapsed()) {
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-medium text-slate-300 truncate">Sessão Segura</span>
              <span class="text-[10px] text-slate-500">v1.0.0 • Local First</span>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly isCollapsed = signal(false);

  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly ShieldCheckIcon = ShieldCheck;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Estoque', path: '/inventory', icon: Package },
    { label: 'Tesouraria', path: '/treasury', icon: Wallet },
    { label: 'Parceiros B2B', path: '/partners', icon: Users },
  ];

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }
}
