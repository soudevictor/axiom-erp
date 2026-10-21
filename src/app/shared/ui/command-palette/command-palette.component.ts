import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LayoutDashboard,
  LucideAngularModule,
  Moon,
  Package,
  Search,
  Sun,
  Users,
  Wallet,
} from 'lucide-angular';
import { ThemeService } from '@/core/services/theme.service';

interface Command {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly group: 'Navegação' | 'Ação';
  readonly icon: typeof LayoutDashboard;
  readonly run: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [A11yModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
        <button
          type="button"
          class="ui-scrim absolute inset-0"
          aria-label="Fechar busca de comandos"
          (click)="close()"
        ></button>

        <div
          class="relative w-full max-w-[560px] overflow-hidden rounded-lg border border-border-subtle bg-canvas-surface shadow-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="palette-title"
          [cdkTrapFocus]="true"
          [cdkTrapFocusAutoCapture]="true"
        >
          <h2 id="palette-title" class="sr-only">Buscar comandos e páginas</h2>

          <div class="flex items-center gap-2 border-b border-border-subtle px-3">
            <lucide-icon [img]="Search" [size]="18" class="shrink-0 text-content-muted" />
            <input
              #paletteInput
              type="text"
              class="h-12 min-w-0 flex-1 bg-transparent text-sm text-content-primary outline-none placeholder:text-content-disabled"
              placeholder="Buscar comandos e páginas…"
              aria-label="Buscar comandos e páginas"
              aria-controls="palette-results"
              [attr.aria-activedescendant]="'palette-command-' + selectedIndex()"
              (input)="onSearch($event)"
              (keydown)="onKeydown($event)"
            />
            <kbd class="rounded border border-border-subtle bg-canvas-elevated px-1.5 py-0.5 font-mono text-[10px] text-content-muted">
              Esc
            </kbd>
          </div>

          <div id="palette-results" class="max-h-[360px] overflow-y-auto p-1.5" role="listbox" aria-label="Comandos">
            @if (filtered().length === 0) {
              <p class="px-3 py-8 text-center text-sm text-content-muted">
                Nenhum comando encontrado para “{{ search() }}”.
              </p>
            } @else {
              @for (command of filtered(); track command.id; let index = $index) {
                <button
                  type="button"
                  role="option"
                  [id]="'palette-command-' + index"
                  [attr.aria-selected]="index === selectedIndex()"
                  class="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors"
                  [class]="index === selectedIndex() ? 'bg-brand-subtle text-content-primary' : 'text-content-primary hover:bg-canvas-elevated'"
                  (mouseenter)="selectedIndex.set(index)"
                  (click)="execute(command)"
                >
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-canvas-elevated text-content-muted">
                    <lucide-icon [img]="command.icon" [size]="16" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium">{{ command.label }}</span>
                    <span class="block truncate text-xs text-content-muted">{{ command.description }}</span>
                  </span>
                  <span class="font-mono text-[10px] uppercase tracking-wide text-content-disabled">{{ command.group }}</span>
                </button>
              }
            }
          </div>

          <div class="flex items-center gap-3 border-t border-border-subtle px-3 py-2 font-mono text-[10px] text-content-disabled">
            <span>↑↓ navegar</span>
            <span>Enter abrir</span>
            <span class="ml-auto">AxiomERP</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly search = signal('');
  protected readonly selectedIndex = signal(0);

  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly paletteInput = viewChild<ElementRef<HTMLInputElement>>('paletteInput');
  private lastFocused: HTMLElement | null = null;

  protected readonly Search = Search;

  private readonly commands: readonly Command[] = [
    {
      id: 'dashboard',
      label: 'Ir para o painel',
      description: 'Visão geral de estoque, caixa e alertas.',
      group: 'Navegação',
      icon: LayoutDashboard,
      run: () => this.navigate('/dashboard'),
    },
    {
      id: 'inventory',
      label: 'Ir para o estoque',
      description: 'Produtos, saldos e movimentações.',
      group: 'Navegação',
      icon: Package,
      run: () => this.navigate('/inventory'),
    },
    {
      id: 'treasury',
      label: 'Ir para a tesouraria',
      description: 'Contas a pagar, receber e fluxo de caixa.',
      group: 'Navegação',
      icon: Wallet,
      run: () => this.navigate('/treasury'),
    },
    {
      id: 'partners',
      label: 'Ir para parceiros',
      description: 'Fornecedores, clientes e homologação.',
      group: 'Navegação',
      icon: Users,
      run: () => this.navigate('/partners'),
    },
    {
      id: 'theme',
      label: 'Alternar tema claro e escuro',
      description: 'Muda a aparência desta sessão.',
      group: 'Ação',
      icon: this.theme.mode() === 'dark' ? Sun : Moon,
      run: () => {
        this.theme.toggle();
        this.close();
      },
    },
  ];

  protected readonly filtered = signal<readonly Command[]>(this.commands);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.lastFocused = document.activeElement as HTMLElement | null;
        this.search.set('');
        this.selectedIndex.set(0);
        this.filtered.set(this.commands);
        window.setTimeout(() => this.paletteInput()?.nativeElement.focus(), 0);
      } else if (this.lastFocused) {
        this.lastFocused.focus();
        this.lastFocused = null;
      }
    });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    const normalized = value.trim().toLowerCase();
    const matches = this.commands.filter(
      (command) =>
        command.label.toLowerCase().includes(normalized) ||
        command.description.toLowerCase().includes(normalized)
    );
    this.filtered.set(matches);
    this.selectedIndex.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const length = this.filtered().length;
      if (length > 0) this.selectedIndex.update((index) => (index + 1) % length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const length = this.filtered().length;
      if (length > 0) this.selectedIndex.update((index) => (index - 1 + length) % length);
      return;
    }
    if (event.key === 'Enter') {
      const command = this.filtered()[this.selectedIndex()];
      if (command) {
        event.preventDefault();
        this.execute(command);
      }
    }
  }

  protected execute(command: Command): void {
    command.run();
  }

  protected close(): void {
    this.closed.emit();
  }

  private navigate(path: string): void {
    void this.router.navigateByUrl(path);
    this.close();
  }
}
