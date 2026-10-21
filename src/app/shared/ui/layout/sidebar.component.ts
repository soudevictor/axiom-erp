import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LayoutDashboard,
  LucideAngularModule,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Wallet,
  X,
} from 'lucide-angular';
import { APP_VERSION } from '@/core/config/app-version';
import { LayoutService } from './layout.service';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: typeof LayoutDashboard;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [A11yModule, RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (layout.mobileOpen()) {
      <button
        type="button"
        class="ui-scrim fixed inset-0 z-40 lg:hidden"
        aria-label="Fechar menu de navegação"
        (click)="layout.closeMobile()"
      ></button>
    }

    <aside
      class="app-sidebar fixed inset-y-0 left-0 z-50 flex -translate-x-full flex-col border-r border-border-subtle bg-canvas-surface text-content-muted transition-transform duration-200 ease-out lg:static lg:z-30 lg:translate-x-0"
      [class.translate-x-0]="layout.mobileOpen()"
      [class.sidebar-collapsed]="layout.collapsed() && !layout.mobileOpen()"
      [cdkTrapFocus]="layout.mobileOpen()"
      [cdkTrapFocusAutoCapture]="layout.mobileOpen()"
      aria-label="Navegação principal"
    >
      <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <a
          routerLink="/dashboard"
          class="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="AxiomERP — ir para o painel"
        >
          <img src="logoIcon.svg" alt="" class="h-6 w-6 shrink-0" />
          <span class="sidebar-label truncate text-[15px] font-semibold tracking-tight text-content-primary">
            AxiomERP
          </span>
        </a>

        <button
          type="button"
          class="ui-icon-btn ml-auto lg:hidden"
          aria-label="Fechar menu"
          (click)="layout.closeMobile()"
        >
          <lucide-icon [img]="X" [size]="18" />
        </button>

        <button
          type="button"
          class="ui-icon-btn ml-auto hidden lg:inline-flex"
          [attr.aria-label]="layout.collapsed() ? 'Expandir menu' : 'Recolher menu'"
          [title]="layout.collapsed() ? 'Expandir menu' : 'Recolher menu'"
          (click)="layout.toggleCollapsed()"
        >
          <lucide-icon [img]="layout.collapsed() ? PanelLeftOpen : PanelLeftClose" [size]="17" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto p-2" aria-label="Seções do produto">
        <p class="sidebar-label px-2.5 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-content-disabled">
          Operações
        </p>
        <ul class="flex flex-col gap-1">
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-brand-subtle text-brand"
                #link="routerLinkActive"
                class="relative flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-content-muted transition-colors hover:bg-canvas-elevated hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                [attr.title]="layout.collapsed() ? item.label : null"
                [attr.aria-current]="link.isActive ? 'page' : null"
                (click)="layout.closeMobile()"
              >
                @if (link.isActive) {
                  <span class="absolute left-0 top-2 h-6 w-0.5 rounded-full bg-brand"></span>
                }
                <lucide-icon [img]="item.icon" [size]="18" class="shrink-0" />
                <span class="sidebar-label truncate">{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      <div class="shrink-0 border-t border-border-subtle p-3">
        <div class="flex items-center gap-2 lg:justify-center">
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-state-success"></span>
          <span class="sidebar-label font-mono text-[10px] text-content-muted">
            Dados locais · v{{ version }}
          </span>
          <span class="sidebar-version-compact hidden font-mono text-[10px] text-content-muted">
            v{{ version }}
          </span>
        </div>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly version = APP_VERSION;
  protected readonly X = X;
  protected readonly PanelLeftClose = PanelLeftClose;
  protected readonly PanelLeftOpen = PanelLeftOpen;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Painel', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Estoque', path: '/inventory', icon: Package },
    { label: 'Tesouraria', path: '/treasury', icon: Wallet },
    { label: 'Parceiros', path: '/partners', icon: Users },
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      document.body.style.overflow = this.layout.mobileOpen() ? 'hidden' : '';
    });
    destroyRef.onDestroy(() => {
      document.body.style.overflow = '';
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.layout.closeMobile();
  }
}
