import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import {
  LucideAngularModule,
  Search,
  Bell,
  Database,
  ChevronRight,
  User,
} from 'lucide-angular';

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
      class="h-16 px-6 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-4 sticky top-0 z-20"
    >
      <!-- Left: Breadcrumbs -->
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs font-medium text-slate-400">
        <a routerLink="/" class="hover:text-slate-200 transition-colors">AxiomERP</a>
        @for (crumb of breadcrumbs(); track crumb.url; let last = $last) {
          <lucide-icon [img]="ChevronRightIcon" [size]="14" class="text-slate-600" />
          @if (!last) {
            <a [routerLink]="crumb.url" class="hover:text-slate-200 transition-colors">
              {{ crumb.label }}
            </a>
          } @else {
            <span class="text-indigo-400 font-semibold" aria-current="page">
              {{ crumb.label }}
            </span>
          }
        }
      </nav>

      <!-- Center: Quick Search Bar -->
      <div class="hidden md:flex flex-1 max-w-md mx-4">
        <div class="relative w-full">
          <lucide-icon
            [img]="SearchIcon"
            [size]="16"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            placeholder="Pesquisar registros, SKUs, CNPJs ou notas..."
            class="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      <!-- Right: IndexedDB Status + User Profile -->
      <div class="flex items-center gap-4">
        <!-- IndexedDB Sync Badge -->
        <div
          class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium"
          title="Banco IndexedDB ativo e sincronizado localmente"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <lucide-icon [img]="DatabaseIcon" [size]="14" />
          <span>Online / Sync local ok</span>
        </div>

        <!-- Notifications button -->
        <button
          type="button"
          class="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          aria-label="Notificações do sistema"
        >
          <lucide-icon [img]="BellIcon" [size]="18" />
          <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
        </button>

        <!-- User Profile Dropdown / RBAC -->
        <div class="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div
            class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm"
          >
            JS
          </div>
          <div class="hidden xl:flex flex-col">
            <span class="text-xs font-semibold text-slate-200 leading-tight">João Silva</span>
            <span class="text-[10px] font-medium text-indigo-400">Administrador RBAC</span>
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
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.updateBreadcrumbs(event.urlAfterRedirects);
      });
  }

  private updateBreadcrumbs(url: string): void {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [];

    let currentUrl = '';
    for (const seg of segments) {
      currentUrl += `/${seg}`;
      const label = ROUTE_NAME_MAP[seg] || seg;
      crumbs.push({ label, url: currentUrl });
    }

    if (crumbs.length === 0) {
      crumbs.push({ label: 'Dashboard', url: '/dashboard' });
    }

    this.breadcrumbs.set(crumbs);
  }
}
