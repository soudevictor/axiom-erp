import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Search,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-angular';

import { TreasuryStore } from './data-access/treasury.store';
import { TransactionModalComponent } from './ui/transaction-modal.component';
import type { TransactionFormValue } from './ui/transaction-modal.component';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import type {
  TransactionStatus,
  TransactionType,
  TreasuryTransaction,
} from '@/core/models/treasury.model';

interface AgingBucket {
  readonly label: string;
  readonly description: string;
  readonly colorClass: string;
  readonly bgClass: string;
  readonly borderClass: string;
  readonly transactions: readonly TreasuryTransaction[];
  readonly total: number;
}

@Component({
  selector: 'app-treasury',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    LucideAngularModule,
    StatCardComponent,
    BadgeComponent,
    SkeletonLoaderComponent,
    TransactionModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-content-primary tracking-tight">
            Tesouraria &amp; Gestão de Fluxo de Caixa
          </h1>
          <p class="text-xs text-content-muted mt-1">
            Controle integrado de lançamentos, contas a pagar, recebimentos e extrato bancário reativo
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="reloadTransactions()"
            class="p-2 rounded-lg border border-border-subtle bg-canvas-surface text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            title="Atualizar dados financeiros"
            aria-label="Recarregar tesouraria"
          >
            <lucide-icon
              [img]="RefreshCwIcon"
              [size]="18"
              [ngClass]="{ 'animate-spin': treasuryStore.loading() }"
            />
          </button>

          <button
            type="button"
            (click)="openModal()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium text-xs shadow-brand-glow transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-base"
          >
            <lucide-icon [img]="PlusIcon" [size]="16" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      <!-- Financial StatCards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <app-stat-card
          title="Saldo Consolidado (Realizado)"
          [value]="'R$ ' + (treasuryStore.totalBalance() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 5.4, isPositive: true, label: 'posição de caixa' }"
          subtitle="Conta Principal Itaú BBA"
          iconName="Wallet"
          valueClass="font-mono tabular-nums tracking-tight whitespace-nowrap"
        />

        <app-stat-card
          title="Contas a Receber (Ativas)"
          [value]="'R$ ' + (treasuryStore.totalReceivables() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 12.1, isPositive: true, label: 'faturamento previsto' }"
          subtitle="Duplicatas de Clientes"
          iconName="ArrowUpRight"
          valueClass="font-mono tabular-nums tracking-tight whitespace-nowrap"
        />

        <app-stat-card
          title="Contas a Pagar (Programado)"
          [value]="'R$ ' + (treasuryStore.totalPayables() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 1.8, isPositive: false, label: 'compromissos' }"
          subtitle="Fornecedores e Fretes"
          iconName="ArrowDownRight"
          valueClass="font-mono tabular-nums tracking-tight whitespace-nowrap"
        />
      </div>

      <!-- ═══════════════ AGING LIST PANEL ═══════════════ -->
      @defer (on viewport) {
        <section aria-labelledby="aging-title">
          <div class="flex items-center gap-3 mb-4">
            <lucide-icon [img]="CalendarClockIcon" [size]="18" class="text-brand" />
            <h2 id="aging-title" class="text-sm font-bold text-content-primary tracking-tight uppercase">
              Aging List — Análise de Vencimento de Contas Pendentes
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            @for (bucket of agingBuckets(); track bucket.label) {
              <div
                class="p-4 rounded-xl border backdrop-blur-md space-y-3"
                [ngClass]="[bucket.bgClass, bucket.borderClass]"
              >
                <!-- Bucket Header -->
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-widest" [ngClass]="bucket.colorClass">
                    {{ bucket.label }}
                  </span>
                  <span
                    class="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    [ngClass]="[bucket.colorClass, bucket.borderClass]"
                  >
                    {{ bucket.transactions.length }} item(s)
                  </span>
                </div>

                <!-- Description -->
                <p class="text-[11px] text-content-muted">{{ bucket.description }}</p>

                <!-- Total Amount -->
                <div class="text-lg font-bold font-mono tabular-nums" [ngClass]="bucket.colorClass">
                  R$ {{ bucket.total | number:'1.2-2':'pt-BR' }}
                </div>

                <!-- Transaction Pills (top 3) -->
                @if (bucket.transactions.length > 0) {
                  <div class="space-y-1.5 pt-2 border-t" [ngClass]="bucket.borderClass">
                    @for (tx of bucket.transactions.slice(0, 3); track tx.id) {
                      <div class="flex items-center justify-between gap-2 text-[11px]">
                        <span class="truncate text-content-muted" [title]="tx.description">
                          {{ tx.description }}
                        </span>
                        <span class="font-mono shrink-0" [ngClass]="bucket.colorClass">
                          R$ {{ tx.amount | number:'1.0-0':'pt-BR' }}
                        </span>
                      </div>
                    }
                    @if (bucket.transactions.length > 3) {
                      <p class="text-[10px] text-content-disabled text-right">
                        +{{ bucket.transactions.length - 3 }} mais…
                      </p>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </section>
      } @placeholder {
        <div class="h-32 rounded-xl border border-border-subtle bg-canvas-surface animate-pulse" aria-hidden="true"></div>
      }

      <!-- Filter Controls Bar -->
      <div class="p-4 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-60">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled" />
          <input
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar por descrição ou parceiro B2B..."
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary placeholder-content-disabled focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            aria-label="Buscar transações financeiras"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-3">
          <select
            [ngModel]="selectedType()"
            (ngModelChange)="onTypeChange($event)"
            class="px-3 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
            aria-label="Filtrar por tipo de transação"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="INCOME">Recebimentos (Entrada)</option>
            <option value="EXPENSE">Pagamentos (Saída)</option>
          </select>

          <select
            [ngModel]="selectedStatus()"
            (ngModelChange)="onStatusChange($event)"
            class="px-3 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
            aria-label="Filtrar por status"
          >
            <option value="ALL">Todos os Status</option>
            <option value="COMPLETED">Baixado / Liquidado</option>
            <option value="PENDING">Pendente</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          @if (treasuryStore.hasActiveFilters()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="px-3 py-2 rounded-lg text-xs font-medium text-state-danger hover:bg-state-danger-subtle border border-state-danger/20 transition-colors"
            >
              Limpar Filtros
            </button>
          }
        </div>
      </div>

      <!-- 4 STATES PATTERN CONTAINER -->
      <div class="p-6 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md">
        <!-- 1. ERROR STATE -->
        @if (treasuryStore.error()) {
          <div
            class="p-4 rounded-lg bg-state-danger-subtle border border-state-danger/30 flex items-center justify-between gap-4 text-state-danger"
            role="alert"
            aria-live="assertive"
          >
            <div class="flex items-center gap-3">
              <lucide-icon [img]="AlertCircleIcon" [size]="20" class="shrink-0" />
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider">Erro na Tesouraria</h4>
                <p class="text-xs mt-0.5 text-state-danger/80">{{ treasuryStore.error() }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="reloadTransactions()"
              class="px-3 py-1.5 rounded-lg bg-state-danger text-white font-medium text-xs hover:opacity-90 transition-opacity"
            >
              Tentar Novamente
            </button>
          </div>
        }

        <!-- 2. LOADING STATE (Skeleton) -->
        @else if (treasuryStore.loading()) {
          <div class="space-y-3" aria-live="polite">
            <div class="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span class="text-xs font-semibold text-content-muted">Carregando fluxo financeiro...</span>
            </div>
            <app-skeleton-loader [count]="5" height="2.5rem" />
          </div>
        }

        <!-- 3. EMPTY STATE -->
        @else if (treasuryStore.transactions().length === 0) {
          <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-canvas-elevated border border-border-strong flex items-center justify-center text-content-muted shadow-elevation-1">
              <lucide-icon [img]="FileSpreadsheetIcon" [size]="32" />
            </div>
            <div>
              <h3 class="text-base font-bold text-content-primary">Nenhuma transação encontrada</h3>
              <p class="text-xs text-content-muted mt-1 max-w-sm">
                Não existem lançamentos financeiros que coincidam com os filtros aplicados.
              </p>
            </div>
            <button
              type="button"
              (click)="clearFilters()"
              class="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium transition-colors"
            >
              Restaurar Filtros
            </button>
          </div>
        }

        <!-- 4. SUCCESS STATE (Virtual Scroll Viewport) -->
        @else {
          <div class="flex flex-col space-y-2">
            <div class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-subtle text-content-muted uppercase font-semibold tracking-wider text-[11px]">
              <div class="col-span-4">Descrição / Parceiro</div>
              <div class="col-span-2">Categoria</div>
              <div class="col-span-2">Vencimento</div>
              <div class="col-span-2 text-right">Valor</div>
              <div class="col-span-1 text-center">Status</div>
              <div class="col-span-1 text-center">Ações</div>
            </div>

            <cdk-virtual-scroll-viewport
              itemSize="56"
              class="h-[440px] w-full custom-scrollbar"
              (scrolledIndexChange)="onScrolledIndexChange($event)"
            >
              <div
                *cdkVirtualFor="let tx of treasuryStore.transactions(); trackBy: trackByTxId"
                class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-subtle/60 hover:bg-canvas-elevated text-xs items-center transition-colors"
              >
                <!-- Description & Partner -->
                <div class="col-span-4 min-w-0">
                  <p class="font-medium text-content-primary truncate" [title]="tx.description">
                    {{ tx.description }}
                  </p>
                  <p class="text-[11px] text-brand-secondary truncate">
                    {{ tx.partnerName }}
                  </p>
                </div>

                <!-- Category -->
                <div class="col-span-2 text-content-muted truncate">
                  {{ tx.category }}
                </div>

                <!-- Due Date -->
                <div class="col-span-2 text-content-primary font-mono text-[11px]">
                  {{ tx.dueDate | date:'dd/MM/yyyy' }}
                </div>

                <!-- Amount -->
                <div
                  class="col-span-2 text-right font-mono font-semibold tabular-nums"
                  [ngClass]="tx.type === 'INCOME' ? 'text-state-success' : 'text-state-danger'"
                >
                  {{ tx.type === 'INCOME' ? '+' : '-' }} R$ {{ tx.amount | number:'1.2-2':'pt-BR' }}
                </div>

                <!-- Status -->
                <div class="col-span-1 text-center">
                  @switch (tx.status) {
                    @case ('COMPLETED') {
                      <app-badge variant="SUCCESS" label="LIQUIDADO" />
                    }
                    @case ('PENDING') {
                      <app-badge variant="WARNING" label="PENDENTE" />
                    }
                    @case ('CANCELLED') {
                      <app-badge variant="DANGER" label="CANCELADO" />
                    }
                  }
                </div>

                <!-- Actions -->
                <div class="col-span-1 flex items-center justify-center gap-1">
                  @if (tx.status === 'PENDING') {
                    <button
                      type="button"
                      (click)="toggleStatus(tx)"
                      class="p-1 rounded text-state-success hover:bg-state-success-subtle transition-colors focus-visible:ring-2 focus-visible:ring-state-success"
                      title="Dar baixa / Confirmar liquidação"
                    >
                      <lucide-icon [img]="CheckCircleIcon" [size]="16" />
                    </button>
                  }
                </div>
              </div>
            </cdk-virtual-scroll-viewport>

            <!-- Table Footer -->
            <div class="flex items-center justify-between pt-3 text-xs text-content-muted border-t border-border-subtle px-2">
              <span>Exibindo {{ treasuryStore.transactions().length }} de {{ treasuryStore.totalItems() }} lançamentos</span>
              <span class="font-mono text-[11px] text-content-disabled">Conciliação Automática Dexie.js</span>
            </div>

            <!-- Loading More Indicator -->
            @if (treasuryStore.loadingMore()) {
              <div class="flex items-center justify-center gap-2 py-3 text-xs text-content-muted" aria-live="polite">
                <span class="inline-block w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" aria-hidden="true"></span>
                Carregando mais transações…
              </div>
            } @else if (!treasuryStore.hasMoreItems() && treasuryStore.transactions().length > 0) {
              <div class="flex items-center justify-center py-3 text-[11px] text-content-disabled">
                Todos os {{ treasuryStore.totalItems() }} lançamentos exibidos.
              </div>
            }
          </div>
        }
      </div>

      <!-- Transaction Modal -->
      @if (isModalOpen()) {
        <app-transaction-modal
          (close)="closeModal()"
          (save)="onSaveTransaction($event)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryComponent implements OnInit {
  protected readonly treasuryStore = inject(TreasuryStore);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly SearchIcon = Search;
  protected readonly WalletIcon = Wallet;
  protected readonly ArrowUpRightIcon = ArrowUpRight;
  protected readonly ArrowDownRightIcon = ArrowDownRight;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly ClockIcon = Clock;
  protected readonly XCircleIcon = XCircle;
  protected readonly FilterIcon = Filter;
  protected readonly PlusIcon = Plus;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly FileSpreadsheetIcon = FileSpreadsheet;
  protected readonly CalendarClockIcon = CalendarClock;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly TrendingUpIcon = TrendingUp;

  protected readonly searchQuery = signal('');
  protected readonly selectedType = signal<TransactionType | 'ALL'>('ALL');
  protected readonly selectedStatus = signal<TransactionStatus | 'ALL'>('ALL');
  protected readonly isModalOpen = signal(false);

  /**
   * Computed Aging List buckets based on ALL transactions (not just filtered view).
   * Relies on the globally decoupled store.aging() response.
   */
  protected readonly agingBuckets = computed<readonly AgingBucket[]>(() => {
    const sum = (arr: TreasuryTransaction[] | undefined): number =>
      arr ? arr.reduce((acc, t) => acc + t.amount, 0) : 0;

    const aging = this.treasuryStore.aging();
    const overdue = aging?.overdue || [];
    const today = aging?.today || [];
    const next7 = aging?.next7 || [];
    const next30 = aging?.next30 || [];

    return [
      {
        label: 'Vencidas',
        description: 'Contas com vencimento já ultrapassado',
        colorClass: 'text-state-danger',
        bgClass: 'bg-state-danger-subtle',
        borderClass: 'border-state-danger/25',
        transactions: overdue,
        total: sum(overdue),
      },
      {
        label: 'Hoje',
        description: 'Vencimento no dia de hoje',
        colorClass: 'text-state-warning',
        bgClass: 'bg-state-warning-subtle',
        borderClass: 'border-state-warning/25',
        transactions: today,
        total: sum(today),
      },
      {
        label: 'Próximos 7 dias',
        description: 'Vencimento nos próximos 7 dias',
        colorClass: 'text-state-info',
        bgClass: 'bg-state-info-subtle',
        borderClass: 'border-state-info/25',
        transactions: next7,
        total: sum(next7),
      },
      {
        label: 'Próximos 30 dias',
        description: 'Vencimento nos próximos 8 a 30 dias',
        colorClass: 'text-state-success',
        bgClass: 'bg-state-success-subtle',
        borderClass: 'border-state-success/25',
        transactions: next30,
        total: sum(next30),
      },
    ] as const;
  });

  ngOnInit(): void {
    if (this.treasuryStore.transactions().length === 0) {
      this.treasuryStore.loadTransactions();
    }

    // Open modal automatically if ?action=new query param is present
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['action'] === 'new') {
          this.openModal();
        }
      });
  }

  protected trackByTxId(_index: number, tx: TreasuryTransaction): string {
    return tx.id;
  }

  /** CDK Virtual Scroll — triggers loadMoreItems() when near end */
  protected onScrolledIndexChange(index: number): void {
    const txs = this.treasuryStore.transactions();
    if (txs.length === 0) return;
    if (index + 15 >= txs.length) {
      this.treasuryStore.loadMoreItems();
    }
  }

  protected openModal(): void {
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected async onSaveTransaction(payload: TransactionFormValue): Promise<void> {
    await this.treasuryStore.addTransaction(payload);
    this.closeModal();
    this.toastService.success(
      'Lançamento Adicionado',
      'Novo lançamento financeiro inserido no fluxo de caixa.'
    );
  }

  protected onSearchChange(search: string): void {
    this.searchQuery.set(search);
    this.treasuryStore.setFilters({ search, page: 1 });
  }

  protected onTypeChange(type: TransactionType | 'ALL'): void {
    this.selectedType.set(type);
    this.treasuryStore.setFilters({ type, page: 1 });
  }

  protected onStatusChange(status: TransactionStatus | 'ALL'): void {
    this.selectedStatus.set(status);
    this.treasuryStore.setFilters({ status, page: 1 });
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedType.set('ALL');
    this.selectedStatus.set('ALL');
    this.treasuryStore.resetFilters();
    this.treasuryStore.loadTransactions();
  }

  protected reloadTransactions(): void {
    this.treasuryStore.loadTransactions();
    this.toastService.info('Tesouraria', 'Transações re-sincronizadas da base local.');
  }

  protected async toggleStatus(tx: TreasuryTransaction): Promise<void> {
    await this.treasuryStore.updateTransactionStatus(tx.id, 'COMPLETED');
    this.toastService.success(
      'Baixa efetuada',
      `O lançamento "${tx.description}" foi liquidado com sucesso.`
    );
  }
}
