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
import {
  Bell,
  ChevronRight,
  Database,
  LucideAngularModule,
  Search,
  Zap,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  Command,
  Sun,
  Moon,
} from 'lucide-angular';
import { filter } from 'rxjs/operators';
import { DevResilienceService } from '@/core/interceptors/dev-resilience.service';
import { DatabaseSeedService } from '@/core/database/database-seed.service';
import { ToastService } from '@/shared/ui/toast/toast.service';
import { CommandPaletteComponent } from '@/shared/ui/command-palette/command-palette.component';
import { ThemeService } from '@/core/services/theme.service';

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
  imports: [CommonModule, RouterLink, LucideAngularModule, CommandPaletteComponent],
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

      <!-- Center: Ctrl+K Search Trigger -->
      <div class="hidden md:flex flex-1 max-w-md mx-4">
        <button
          type="button"
          (click)="openCommandPalette()"
          class="relative w-full flex items-center gap-3 px-3 py-1.5 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-disabled hover:border-brand hover:text-content-muted transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Abrir paleta de comandos (Ctrl+K)"
        >
          <lucide-icon [img]="SearchIcon" [size]="16" />
          <span class="flex-1 text-left">Pesquisar registros, SKUs, CNPJs… (Ctrl+K)</span>
          <kbd class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border-strong font-mono text-[10px]">
            <lucide-icon [img]="CommandIcon" [size]="10" />K
          </kbd>
        </button>
      </div>

      <!-- Right: Status + Dev Tools + Profile -->
      <div class="flex items-center gap-3">
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
          <span>IndexedDB sync</span>
        </div>

        <!-- ═══ DEV RESILIENCE PLAYGROUND ═══ -->
        <div class="relative" id="dev-playground">
          <button
            type="button"
            (click)="toggleDevMenu()"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            [class.border-state-warning]="devService.slowLatency() || devService.simulateError()"
            [class.text-state-warning]="devService.slowLatency() || devService.simulateError()"
            [class.bg-state-warning-subtle]="devService.slowLatency() || devService.simulateError()"
            [class.border-border-subtle]="!devService.slowLatency() && !devService.simulateError()"
            [class.text-content-muted]="!devService.slowLatency() && !devService.simulateError()"
            [class.bg-canvas-surface]="!devService.slowLatency() && !devService.simulateError()"
            aria-haspopup="true"
            [attr.aria-expanded]="devMenuOpen()"
            aria-label="Dev Resilience Playground"
            title="Dev Resilience Playground — toggles de teste de engenharia"
          >
            <lucide-icon [img]="ZapIcon" [size]="14" />
            <span class="hidden lg:inline">Dev Tools</span>
            <lucide-icon [img]="ChevronDownIcon" [size]="12" />
          </button>

          @if (devMenuOpen()) {
            <!-- Popover Menu -->
            <div
              class="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl border border-border-strong bg-canvas-elevated shadow-2xl space-y-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              role="menu"
              aria-label="Dev Resilience Playground"
            >
              <div class="flex items-center gap-2 pb-3 border-b border-border-subtle">
                <lucide-icon [img]="ZapIcon" [size]="14" class="text-state-warning" />
                <span class="text-xs font-bold text-content-primary uppercase tracking-widest">
                  Dev Resilience Playground
                </span>
              </div>

              <!-- Toggle: Slow Latency -->
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-content-primary">Simular Latência Lenta</p>
                  <p class="text-[11px] text-content-muted mt-0.5">
                    Adiciona +2s de delay nas chamadas HTTP para validar Skeleton Loaders.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="devService.toggleSlowLatency()"
                  class="relative shrink-0 w-10 h-5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand"
                  [class.bg-brand]="devService.slowLatency()"
                  [class.bg-border-strong]="!devService.slowLatency()"
                  [attr.aria-pressed]="devService.slowLatency()"
                  [attr.aria-label]="devService.slowLatency() ? 'Desativar latência lenta' : 'Ativar latência lenta'"
                  role="switch"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    [class.translate-x-5]="devService.slowLatency()"
                  ></span>
                </button>
              </div>

              <!-- Toggle: Simulate Error -->
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold text-content-primary">Simular Erro HTTP 500</p>
                  <p class="text-[11px] text-content-muted mt-0.5">
                    Injeta cabeçalho X-Simulate-Error para validar Toast de erro e botão Retry.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="devService.toggleSimulateError()"
                  class="relative shrink-0 w-10 h-5 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand"
                  [class.bg-state-danger]="devService.simulateError()"
                  [class.bg-border-strong]="!devService.simulateError()"
                  [attr.aria-pressed]="devService.simulateError()"
                  [attr.aria-label]="devService.simulateError() ? 'Desativar simulação de erro' : 'Ativar simulação de erro'"
                  role="switch"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    [class.translate-x-5]="devService.simulateError()"
                  ></span>
                </button>
              </div>

              <!-- Divider -->
              <hr class="border-border-subtle" />

              <!-- Reset Database -->
              <div>
                <p class="text-xs font-semibold text-content-primary mb-1">Resetar Base de Dados</p>
                <p class="text-[11px] text-content-muted mb-3">
                  Limpa o IndexedDB e re-executa o Seed com Faker.js (500 produtos, 120 transações).
                </p>
                <button
                  type="button"
                  (click)="resetDatabase()"
                  [disabled]="resetting()"
                  class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-state-danger/30 text-state-danger text-xs font-medium hover:bg-state-danger-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-state-danger"
                >
                  <lucide-icon [img]="RotateCcwIcon" [size]="14" [class.animate-spin]="resetting()" />
                  {{ resetting() ? 'Resetando…' : 'Resetar Base Local (Faker.js)' }}
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Theme Toggle (Sun / Moon) -->
        <button
          type="button"
          (click)="themeService.toggle()"
          class="relative p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          [attr.aria-label]="themeService.mode() === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
          [title]="themeService.mode() === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
        >
          @if (themeService.mode() === 'dark') {
            <lucide-icon [img]="SunIcon" [size]="18" />
          } @else {
            <lucide-icon [img]="MoonIcon" [size]="18" />
          }
        </button>

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
            width="32"
            height="32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="#fff"
            aria-hidden="true"
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

    <!-- Command Palette (renders in DOM, opens via signal) -->
    <app-command-palette #commandPalette />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly themeService = inject(ThemeService);
  protected readonly devService = inject(DevResilienceService);
  private readonly seedService = inject(DatabaseSeedService);
  private readonly toastService = inject(ToastService);

  private readonly commandPaletteRef =
    viewChild<CommandPaletteComponent>('commandPalette');

  protected readonly breadcrumbs = signal<readonly BreadcrumbItem[]>([]);
  protected readonly devMenuOpen = signal(false);
  protected readonly resetting = signal(false);

  protected readonly SearchIcon = Search;
  protected readonly BellIcon = Bell;
  protected readonly DatabaseIcon = Database;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly ZapIcon = Zap;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly RotateCcwIcon = RotateCcw;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly CommandIcon = Command;
  protected readonly SunIcon = Sun;
  protected readonly MoonIcon = Moon;

  constructor() {
    this.updateBreadcrumbs(this.router.url);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.updateBreadcrumbs(event.urlAfterRedirects);
        this.devMenuOpen.set(false);
      });
  }

  /** Global keyboard shortcut: Ctrl+K or Cmd+K opens the command palette */
  @HostListener('document:keydown', ['$event'])
  handleShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openCommandPalette();
    }

    // Close dev menu on Escape
    if (event.key === 'Escape' && this.devMenuOpen()) {
      this.devMenuOpen.set(false);
    }
  }

  /** Close dev menu when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const devPlayground = document.getElementById('dev-playground');
    if (devPlayground && !devPlayground.contains(target)) {
      this.devMenuOpen.set(false);
    }
  }

  protected openCommandPalette(): void {
    this.commandPaletteRef()?.open();
  }

  protected toggleDevMenu(): void {
    this.devMenuOpen.update((v) => !v);
  }

  protected async resetDatabase(): Promise<void> {
    if (this.resetting()) return;
    this.resetting.set(true);
    try {
      await this.seedService.resetDatabase();
      this.toastService.success(
        'Base Resetada',
        'IndexedDB limpo e re-populado com dados Faker.js (500 produtos, 120 transações).'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao resetar base.';
      this.toastService.error('Erro no Reset', msg);
    } finally {
      this.resetting.set(false);
      this.devMenuOpen.set(false);
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
