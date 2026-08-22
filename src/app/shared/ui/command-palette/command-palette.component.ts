import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  LucideAngularModule,
  Search,
  Package,
  Wallet,
  Users,
  LayoutDashboard,
  Plus,
  ArrowRight,
  Command,
} from 'lucide-angular';
import { ToastService } from '../toast/toast.service';

export interface PaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: 'navigation' | 'action';
  readonly icon: string;
  readonly action: () => void;
  readonly shortcut?: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <!-- Panel -->
        <div
          class="w-full max-w-2xl bg-canvas-elevated border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
          (click)="$event.stopPropagation()"
        >
          <!-- Search Input -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
            <lucide-icon [img]="SearchIcon" [size]="18" class="text-content-disabled shrink-0" />
            <input
              #searchInput
              id="command-palette-input"
              type="text"
              [ngModel]="query()"
              (ngModelChange)="onQueryChange($event)"
              placeholder="Buscar rotas, ações, SKUs ou parceiros..."
              class="flex-1 bg-transparent text-sm text-content-primary placeholder-content-disabled outline-none"
              aria-label="Busca de comandos e navegação"
              autocomplete="off"
            />
            <kbd
              class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-content-disabled border border-border-strong"
            >
              Esc
            </kbd>
          </div>

          <!-- Commands List -->
          <div
            class="max-h-[400px] overflow-y-auto overscroll-contain py-2"
            role="listbox"
            aria-label="Comandos disponíveis"
          >
            @if (filteredCommands().length === 0) {
              <div class="py-10 text-center text-sm text-content-disabled">
                Nenhum resultado para "{{ query() }}"
              </div>
            } @else {
              <!-- Group by category -->
              @for (group of groupedCommands(); track group.category) {
                <div class="px-3 py-1.5">
                  <p class="text-[10px] font-semibold uppercase tracking-widest text-content-disabled mb-1">
                    {{ group.label }}
                  </p>
                  @for (cmd of group.commands; track cmd.id; let i = $index) {
                    <button
                      type="button"
                      (click)="executeCommand(cmd)"
                      (mouseenter)="activeIndex.set(getGlobalIndex(group.category, i))"
                      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand text-xs"
                      [class.bg-brand-subtle]="activeIndex() === getGlobalIndex(group.category, i)"
                      [class.text-content-primary]="activeIndex() === getGlobalIndex(group.category, i)"
                      [class.text-content-muted]="activeIndex() !== getGlobalIndex(group.category, i)"
                      role="option"
                      [attr.aria-selected]="activeIndex() === getGlobalIndex(group.category, i)"
                    >
                      <!-- Icon -->
                      <span
                        class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors"
                        [class.bg-brand]="activeIndex() === getGlobalIndex(group.category, i)"
                        [class.bg-canvas-surface]="activeIndex() !== getGlobalIndex(group.category, i)"
                      >
                        <lucide-icon [name]="cmd.icon" [size]="16" class="text-content-primary" />
                      </span>

                      <!-- Text -->
                      <span class="flex-1 min-w-0">
                        <span class="block font-medium text-content-primary">{{ cmd.label }}</span>
                        <span class="block text-[11px] text-content-disabled truncate">{{ cmd.description }}</span>
                      </span>

                      <!-- Shortcut or arrow -->
                      @if (cmd.shortcut) {
                        <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-content-disabled border border-border-subtle">
                          {{ cmd.shortcut }}
                        </kbd>
                      } @else {
                        <lucide-icon [img]="ArrowRightIcon" [size]="14" class="text-content-disabled opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>
                  }
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[11px] text-content-disabled">
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded border border-border-strong font-mono">↑↓</kbd>
              <span>Navegar</span>
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded border border-border-strong font-mono">Enter</kbd>
              <span>Executar</span>
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 rounded border border-border-strong font-mono">Esc</kbd>
              <span>Fechar</span>
            </span>
            <span class="ml-auto flex items-center gap-1.5">
              <lucide-icon [img]="CommandIcon" [size]="12" />
              <span>Axiom Command Palette</span>
            </span>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly SearchIcon = Search;
  protected readonly ArrowRightIcon = ArrowRight;
  protected readonly CommandIcon = Command;

  readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly ALL_COMMANDS: readonly PaletteCommand[] = [
    {
      id: 'nav-dashboard',
      label: 'Ir para Dashboard',
      description: 'Painel principal com KPIs e visão geral',
      category: 'navigation',
      icon: 'LayoutDashboard',
      action: () => this.navigate('/dashboard'),
    },
    {
      id: 'nav-inventory',
      label: 'Ir para Estoque',
      description: 'Gestão de inventário multi-armazém',
      category: 'navigation',
      icon: 'Package',
      action: () => this.navigate('/inventory'),
      shortcut: 'Alt+I',
    },
    {
      id: 'nav-treasury',
      label: 'Ir para Tesouraria',
      description: 'Fluxo de caixa e contas a pagar/receber',
      category: 'navigation',
      icon: 'Wallet',
      action: () => this.navigate('/treasury'),
      shortcut: 'Alt+T',
    },
    {
      id: 'nav-partners',
      label: 'Ir para Parceiros B2B',
      description: 'Cadastro de fornecedores e clientes',
      category: 'navigation',
      icon: 'Users',
      action: () => this.navigate('/partners'),
      shortcut: 'Alt+P',
    },
    {
      id: 'action-new-product',
      label: 'Cadastrar Novo Produto',
      description: 'Abre o modal de criação de produto no estoque',
      category: 'action',
      icon: 'Plus',
      action: () => {
        this.navigate('/inventory');
        this.toastService.info('Ação', 'Navegue para o Estoque e clique em "Novo Produto".');
      },
    },
    {
      id: 'action-new-transaction',
      label: 'Nova Transação Financeira',
      description: 'Adiciona um novo lançamento no fluxo de caixa',
      category: 'action',
      icon: 'Plus',
      action: () => {
        this.navigate('/treasury');
        this.toastService.info('Ação', 'Navegue para a Tesouraria e clique em "Novo Lançamento".');
      },
    },
  ];

  protected readonly filteredCommands = signal<readonly PaletteCommand[]>(this.ALL_COMMANDS);
  protected readonly groupedCommands = signal<
    readonly { category: string; label: string; commands: readonly PaletteCommand[] }[]
  >([]);

  ngOnInit(): void {
    // Listen for Ctrl+K / Cmd+K globally
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((e) => (e.ctrlKey || e.metaKey) && e.key === 'k'),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        e.preventDefault();
        this.open();
      });

    this.updateFilteredCommands('');
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    const cmds = this.filteredCommands();

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() + 1) % Math.max(1, cmds.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set(
          (this.activeIndex() - 1 + Math.max(1, cmds.length)) % Math.max(1, cmds.length)
        );
        break;
      case 'Enter': {
        const active = cmds[this.activeIndex()];
        if (active) this.executeCommand(active);
        break;
      }
    }
  }

  open(): void {
    this.query.set('');
    this.activeIndex.set(0);
    this.updateFilteredCommands('');
    this.isOpen.set(true);
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 50);
  }

  close(): void {
    this.isOpen.set(false);
    this.query.set('');
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    this.updateFilteredCommands(value);
  }

  protected executeCommand(cmd: PaletteCommand): void {
    this.close();
    cmd.action();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  /** Returns the global flat index for keyboard navigation, across all groups. */
  protected getGlobalIndex(category: string, indexInGroup: number): number {
    const groups = this.groupedCommands();
    let offset = 0;
    for (const g of groups) {
      if (g.category === category) return offset + indexInGroup;
      offset += g.commands.length;
    }
    return indexInGroup;
  }

  private navigate(path: string): void {
    this.router.navigate([path]);
  }

  private updateFilteredCommands(q: string): void {
    const lower = q.toLowerCase().trim();
    const filtered = lower
      ? this.ALL_COMMANDS.filter(
          (c) =>
            c.label.toLowerCase().includes(lower) ||
            c.description.toLowerCase().includes(lower)
        )
      : this.ALL_COMMANDS;

    this.filteredCommands.set(filtered);

    const navCommands = filtered.filter((c) => c.category === 'navigation');
    const actionCommands = filtered.filter((c) => c.category === 'action');

    const groups: { category: string; label: string; commands: readonly PaletteCommand[] }[] = [];
    if (navCommands.length > 0) groups.push({ category: 'navigation', label: 'Navegação', commands: navCommands });
    if (actionCommands.length > 0) groups.push({ category: 'action', label: 'Ações Rápidas', commands: actionCommands });

    this.groupedCommands.set(groups);
  }
}
