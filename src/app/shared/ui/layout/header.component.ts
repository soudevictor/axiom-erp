import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Bell, ChevronRight, Database, LucideAngularModule, Search, User } from 'lucide-angular';
import { filter } from 'rxjs/operators';

export interface BreadcrumbItem {
  readonly label: string;
  readonly url: string;
}

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Gestão de Estoque',
  treasury: 'Tesouraria & Carteira',
  partners: 'Parceiros B2B',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    <header
      class="h-16 px-6 bg-canvas-surface/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between gap-4 sticky top-0 z-20"
    >
      <!-- Left: Breadcrumbs -->
      <nav
        aria-label="Breadcrumb"
        class="flex items-center gap-2 text-xs font-medium text-content-muted"
      >
        <a routerLink="/" class="hover:text-content-primary transition-colors">AxiomERP</a>
        @for (crumb of breadcrumbs(); track crumb.url; let last = $last) {
          <lucide-icon [img]="ChevronRightIcon" [size]="14" class="text-border-strong" />
          @if (!last) {
            <a [routerLink]="crumb.url" class="hover:text-content-primary transition-colors">
              {{ crumb.label }}
            </a>
          } @else {
            <span class="text-brand font-semibold" aria-current="page">
              {{ crumb.label }}
            </span>
          }
        }
      </nav>

      <!-- Center: Quick Search Bar (focusable via Ctrl+K or /) -->
      <div class="hidden md:flex flex-1 max-w-md mx-4">
        <div class="relative w-full">
          <lucide-icon
            [img]="SearchIcon"
            [size]="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled"
          />
          <input
            #searchInput
            id="global-search"
            type="search"
            placeholder="Pesquisar registros, SKUs, CNPJs ou notas… (Ctrl+K)"
            class="w-full pl-9 pr-4 py-1 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary placeholder-content-disabled focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            aria-label="Busca global (Ctrl+K ou /)"
          />
        </div>
      </div>

      <!-- Right: IndexedDB Status + Notifications + User Profile -->
      <div class="flex items-center gap-4">
        <!-- IndexedDB Sync Badge -->
        <div
          class="hidden sm:flex items-center gap-2 px-2 py-1 rounded-full bg-state-success-subtle border border-state-success/20 text-state-success text-xs font-medium"
          title="Banco IndexedDB ativo e sincronizado localmente"
        >
          <span class="relative flex h-2 w-2" aria-hidden="true">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-success opacity-75"
            ></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-state-success"></span>
          </span>
          <lucide-icon [img]="DatabaseIcon" [size]="14" />
          <span>Online / Sync local ok</span>
        </div>

        <!-- Notifications button -->
        <button
          type="button"
          class="relative p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Notificações do sistema"
        >
          <lucide-icon [img]="BellIcon" [size]="18" />
          <span
            class="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand"
            aria-hidden="true"
          ></span>
        </button>

        <!-- User Profile -->
        <div class="flex items-center gap-3 pl-3 border-l border-border-subtle">
          <svg
            viewBox="-8 -8 32.00 32.00"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="#fff"
          >
            <g id="SVGRepo_bgCarrier" stroke-width="0" transform="translate(0,0), scale(1)">
              <rect
                x="-8"
                y="-8"
                width="32.00"
                height="32.00"
                rx="16"
                fill="#2563EB"
                strokewidth="0"
              ></rect>
            </g>
            <g
              id="SVGRepo_tracerCarrier"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke="#CCCCCC"
              stroke-width="0.032"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                d="M8 7C9.65685 7 11 5.65685 11 4C11 2.34315 9.65685 1 8 1C6.34315 1 5 2.34315 5 4C5 5.65685 6.34315 7 8 7Z"
                fill="#fff"
              ></path>
              <path
                d="M14 12C14 10.3431 12.6569 9 11 9H5C3.34315 9 2 10.3431 2 12V15H14V12Z"
                fill="#fff"
              ></path>
            </g>
          </svg>
          <div class="hidden xl:flex flex-col">
            <span class="text-xs font-semibold text-content-primary leading-tight">João Silva</span>
            <span class="text-2xs font-medium text-brand">Administrador RBAC</span>
          </div>
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly breadcrumbs = signal<readonly BreadcrumbItem[]>([]);

  protected readonly SearchIcon = Search;
  protected readonly BellIcon = Bell;
  protected readonly DatabaseIcon = Database;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly UserIcon = User;

  constructor() {
    this.updateBreadcrumbs(this.router.url);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.updateBreadcrumbs(event.urlAfterRedirects);
      });
  }

  /** Global keyboard shortcut: Ctrl+K or / focuses the search input */
  @HostListener('document:keydown', ['$event'])
  handleSearchShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isEditable =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if ((event.ctrlKey && event.key === 'k') || (event.key === '/' && !isEditable)) {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }

  private updateBreadcrumbs(url: string): void {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [];

    let currentUrl = '';
    for (const seg of segments) {
      currentUrl += `/${seg}`;
      const label = ROUTE_NAME_MAP[seg] ?? seg;
      crumbs.push({ label, url: currentUrl });
    }

    if (crumbs.length === 0) {
      crumbs.push({ label: 'Dashboard', url: '/dashboard' });
    }

    this.breadcrumbs.set(crumbs);
  }
}
