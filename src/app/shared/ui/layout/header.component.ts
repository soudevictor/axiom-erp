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
import { filter } from 'rxjs/operators';
import {
  AlertTriangle,
  ChevronRight,
  Database,
  Ellipsis,
  LucideAngularModule,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Sun,
  Zap,
} from 'lucide-angular';
import { APP_VERSION } from '@/core/config/app-version';
import { DatabaseSeedService } from '@/core/database/database-seed.service';
import { DevResilienceService } from '@/core/interceptors/dev-resilience.service';
import { ThemeService } from '@/core/services/theme.service';
import { CommandPaletteComponent } from '@/shared/ui/command-palette/command-palette.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import { LayoutService } from './layout.service';

const ROUTE_NAME_MAP: Record<string, string> = {
  '/dashboard': 'Painel',
  '/inventory': 'Estoque',
  '/treasury': 'Tesouraria',
  '/partners': 'Parceiros',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-30 block' },
  template: `
    <header
      class="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-canvas-base px-3 sm:px-4 lg:px-6"
    >
      <button
        type="button"
        class="ui-icon-btn lg:hidden"
        aria-label="Abrir menu de navegação"
        (click)="openMobileMenu($event)"
      >
        <lucide-icon [img]="Menu" [size]="19" />
      </button>

      <div class="hidden min-w-0 items-center gap-1.5 text-sm md:flex" aria-label="Você está em">
        <a
          routerLink="/dashboard"
          class="rounded-sm text-content-muted transition-colors hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          AxiomERP
        </a>
        <lucide-icon [img]="ChevronRight" [size]="14" class="shrink-0 text-content-disabled" />
        <span class="truncate font-medium text-content-primary">{{ currentTitle() }}</span>
      </div>

      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="ui-btn h-8 gap-2 px-2.5 text-content-muted hover:text-content-primary sm:min-w-[220px] sm:justify-start"
          aria-label="Abrir busca de comandos"
          (click)="openPalette()"
        >
          <lucide-icon [img]="Search" [size]="16" class="shrink-0" />
          <span class="hidden sm:inline">Buscar comandos e páginas…</span>
          <kbd
            class="ml-auto hidden rounded border border-border-subtle bg-canvas-elevated px-1.5 py-0.5 font-mono text-[10px] text-content-muted sm:inline"
          >
            {{ shortcutLabel }}
          </kbd>
        </button>

        <button
          type="button"
          class="ui-icon-btn"
          [attr.aria-label]="theme.mode() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'"
          [title]="theme.mode() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'"
          (click)="theme.toggle()"
        >
          <lucide-icon [img]="theme.mode() === 'dark' ? Sun : Moon" [size]="18" />
        </button>

        <div class="relative">
          <button
            type="button"
            class="ui-icon-btn"
            aria-label="Ferramentas de demonstração"
            aria-haspopup="menu"
            [attr.aria-expanded]="toolsOpen()"
            (click)="toggleTools($event)"
          >
            <lucide-icon [img]="Ellipsis" [size]="19" />
          </button>

          @if (toolsOpen()) {
            <div
              #toolsMenu
              class="absolute right-0 top-11 z-50 w-[300px] rounded-lg border border-border-subtle bg-canvas-surface p-1.5 shadow-overlay"
              role="menu"
              aria-label="Ferramentas de demonstração"
            >
              <div class="px-2.5 pb-2 pt-1.5">
                <p class="text-sm font-medium text-content-primary">Ferramentas de demonstração</p>
                <p class="mt-0.5 text-xs text-content-muted">Afetam apenas este navegador.</p>
              </div>

              <button
                type="button"
                role="menuitemcheckbox"
                class="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-canvas-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                [attr.aria-checked]="devTools.slowLatency()"
                (click)="devTools.toggleSlowLatency()"
              >
                <lucide-icon [img]="Zap" [size]="16" class="mt-0.5 shrink-0 text-state-warning" />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-content-primary">Latência +2 s</span>
                  <span class="block text-xs text-content-muted">Simula rede lenta em todas as chamadas.</span>
                </span>
                <span
                  class="mt-1.5 h-3.5 w-6 rounded-full border transition-colors"
                  [class]="devTools.slowLatency() ? 'border-brand-fill bg-brand-fill' : 'border-border-strong bg-canvas-elevated'"
                  aria-hidden="true"
                ></span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                class="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-canvas-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                [attr.aria-checked]="devTools.simulateError()"
                (click)="devTools.toggleSimulateError()"
              >
                <lucide-icon [img]="AlertTriangle" [size]="16" class="mt-0.5 shrink-0 text-state-danger" />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-content-primary">Forçar erro 500</span>
                  <span class="block text-xs text-content-muted">Testa os estados de erro da interface.</span>
                </span>
                <span
                  class="mt-1.5 h-3.5 w-6 rounded-full border transition-colors"
                  [class]="devTools.simulateError() ? 'border-state-danger bg-state-danger' : 'border-border-strong bg-canvas-elevated'"
                  aria-hidden="true"
                ></span>
              </button>

              <div class="my-1 border-t border-border-subtle"></div>

              @if (!confirmReset()) {
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-content-primary transition-colors hover:bg-canvas-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  (click)="confirmReset.set(true)"
                >
                  <lucide-icon [img]="RotateCcw" [size]="16" class="shrink-0 text-content-muted" />
                  Repopular dados de demonstração
                </button>
              } @else {
                <div class="rounded-md bg-state-danger-subtle p-2.5" role="alert">
                  <p class="text-xs font-medium text-state-danger">Substituir todos os dados locais?</p>
                  <p class="mt-1 text-xs text-content-muted">
                    Estoque, parceiros, transações e movimentos serão recriados. Esta ação não pode ser desfeita.
                  </p>
                  <div class="mt-2 flex justify-end gap-2">
                    <button type="button" class="ui-btn h-8 px-2.5 text-xs" (click)="confirmReset.set(false)">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      class="ui-btn ui-btn-danger h-8 px-2.5 text-xs"
                      [disabled]="resetting()"
                      (click)="resetDemoData()"
                    >
                      {{ resetting() ? 'Repovoando…' : 'Repopular' }}
                    </button>
                  </div>
                </div>
              }

              <div class="mt-1 flex items-center gap-1.5 border-t border-border-subtle px-2.5 pb-1 pt-2 font-mono text-[10px] text-content-disabled">
                <lucide-icon [img]="Database" [size]="12" />
                v{{ version }} · IndexedDB local
              </div>
            </div>
          }
        </div>
      </div>
    </header>

    <app-command-palette [open]="paletteOpen()" (closed)="paletteOpen.set(false)" />
  `,
})
export class HeaderComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly theme = inject(ThemeService);
  protected readonly devTools = inject(DevResilienceService);

  protected readonly version = APP_VERSION;
  protected readonly currentTitle = signal('Painel');
  protected readonly paletteOpen = signal(false);
  protected readonly toolsOpen = signal(false);
  protected readonly confirmReset = signal(false);
  protected readonly resetting = signal(false);

  protected readonly Menu = Menu;
  protected readonly Search = Search;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
  protected readonly Ellipsis = Ellipsis;
  protected readonly ChevronRight = ChevronRight;
  protected readonly Zap = Zap;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Database = Database;

  protected readonly shortcutLabel =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
      ? '⌘K'
      : 'Ctrl K';

  private readonly toolsMenu = viewChild<ElementRef<HTMLElement>>('toolsMenu');
  private readonly router = inject(Router);
  private readonly seedService = inject(DatabaseSeedService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.updateTitle(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }

  protected openMobileMenu(event: Event): void {
    this.layout.openMobile(event.currentTarget as HTMLElement);
  }

  protected openPalette(): void {
    this.toolsOpen.set(false);
    this.paletteOpen.set(true);
  }

  protected toggleTools(event: Event): void {
    event.stopPropagation();
    this.toolsOpen.update((open) => !open);
    this.confirmReset.set(false);
  }

  protected async resetDemoData(): Promise<void> {
    this.resetting.set(true);
    try {
      await this.seedService.resetDatabase();
      this.toast.success('Dados repovoados', 'A demonstração foi restaurada com novos dados.');
      this.toolsOpen.set(false);
      this.confirmReset.set(false);
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      this.toast.error('Falha ao repopular', 'Não foi possível recriar os dados locais.');
    } finally {
      this.resetting.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteOpen.update((open) => !open);
      this.toolsOpen.set(false);
      return;
    }
    if (event.key === 'Escape' && this.toolsOpen()) {
      this.toolsOpen.set(false);
      this.confirmReset.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.toolsOpen()) return;
    const menu = this.toolsMenu()?.nativeElement;
    const target = event.target as Node | null;
    if (menu && target && !menu.contains(target)) {
      this.toolsOpen.set(false);
      this.confirmReset.set(false);
    }
  }

  private updateTitle(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.currentTitle.set(ROUTE_NAME_MAP[path] ?? 'Painel');
  }
}
