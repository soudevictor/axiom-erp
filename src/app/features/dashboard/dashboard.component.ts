import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowUpRight, LucideAngularModule, RefreshCw } from 'lucide-angular';
import type { TreasuryTransaction } from '@/core/models/treasury.model';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';
import { PartnersStore } from '@/features/partners/data-access/partners.store';
import { TreasuryStore } from '@/features/treasury/data-access/treasury.store';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { DrawerComponent } from '@/shared/ui/drawer/drawer.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { formatBrl, formatCompactBrl } from '@/shared/utils/currency-formatter';
import { AlertPanelComponent } from './ui/alert-panel.component';
import { CashflowChartComponent } from './ui/cashflow-chart.component';
import { WarehouseTableComponent } from './ui/warehouse-table.component';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const INTEGER_FORMATTER = new Intl.NumberFormat('pt-BR');

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    BadgeComponent,
    DrawerComponent,
    SkeletonLoaderComponent,
    CashflowChartComponent,
    AlertPanelComponent,
    WarehouseTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-[22px] font-semibold leading-8 tracking-tight text-content-primary">Visão geral</h1>
          <p class="mt-0.5 text-sm text-content-muted">Resumo operacional de {{ referenceDate() }}.</p>
        </div>
        <button type="button" class="ui-btn" [disabled]="refreshing()" (click)="refresh()">
          <lucide-icon [img]="RefreshCw" [size]="15" [class.animate-spin]="refreshing()" />
          {{ refreshing() ? 'Atualizando…' : 'Atualizar' }}
        </button>
      </header>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <a
          routerLink="/inventory"
          class="ui-panel group flex min-w-0 flex-col gap-1 px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="ui-overline">Valor em estoque</p>
            <lucide-icon [img]="ArrowUpRight" [size]="15" class="text-content-disabled transition-colors group-hover:text-brand" />
          </div>
          <p class="break-words font-mono text-[22px] font-medium leading-8 tracking-tight tabular-nums text-content-primary xl:text-[24px]">
            {{ inventoryValueLabel() }}
          </p>
          <p class="text-xs leading-5 text-content-muted">{{ inventoryContext() }}</p>
        </a>

        <a
          routerLink="/treasury"
          class="ui-panel group flex min-w-0 flex-col gap-1 px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="ui-overline">Resultado realizado</p>
            <lucide-icon [img]="ArrowUpRight" [size]="15" class="text-content-disabled transition-colors group-hover:text-brand" />
          </div>
          <p class="break-words font-mono text-[22px] font-medium leading-8 tracking-tight tabular-nums text-content-primary xl:text-[24px]">
            {{ realizedValueLabel() }}
          </p>
          <p class="text-xs leading-5 text-content-muted">{{ realizedContext() }}</p>
          @if (realizedDeltaLabel()) {
            <p class="text-[11px] leading-4" [class]="realizedDeltaClass()">{{ realizedDeltaLabel() }}</p>
          }
        </a>

        <a
          routerLink="/treasury"
          class="ui-panel group flex min-w-0 flex-col gap-1 px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="ui-overline">A receber (30 d)</p>
            <lucide-icon [img]="ArrowUpRight" [size]="15" class="text-content-disabled transition-colors group-hover:text-brand" />
          </div>
          <p class="break-words font-mono text-[22px] font-medium leading-8 tracking-tight tabular-nums text-content-primary xl:text-[24px]">
            {{ receivablesValueLabel() }}
          </p>
          <p class="text-xs leading-5 text-content-muted">{{ receivablesContext() }}</p>
        </a>

        <a
          routerLink="/treasury"
          class="ui-panel group flex min-w-0 flex-col gap-1 px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="ui-overline">A pagar (30 d)</p>
            <lucide-icon [img]="ArrowUpRight" [size]="15" class="text-content-disabled transition-colors group-hover:text-brand" />
          </div>
          <p class="break-words font-mono text-[22px] font-medium leading-8 tracking-tight tabular-nums text-content-primary xl:text-[24px]">
            {{ payablesValueLabel() }}
          </p>
          <p class="text-xs leading-5 text-content-muted">{{ payablesContext() }}</p>
        </a>
      </div>

      <div class="grid gap-4 lg:grid-cols-12">
        <div class="min-w-0 lg:col-span-8">
          @if (treasuryReady()) {
            <app-cashflow-chart [monthly]="monthly()" />
          } @else if (treasurySectionLoading()) {
            <section class="ui-panel p-4" aria-busy="true" aria-label="Carregando fluxo de caixa">
              <app-skeleton-loader [count]="5" height="2.25rem" />
            </section>
          } @else {
            <section class="ui-panel flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center" role="alert">
              <p class="text-sm font-medium text-content-primary">Não foi possível carregar o fluxo</p>
              <p class="mt-1 text-sm text-content-muted">O resumo da tesouraria não respondeu.</p>
              <button type="button" class="ui-btn mt-4" (click)="reloadTreasury()">Tentar novamente</button>
            </section>
          }
        </div>

        <div class="min-w-0 lg:col-span-4">
          <app-alert-panel
            [loading]="loading()"
            [stockReady]="inventoryReady()"
            [criticalItems]="criticalItems()"
            [lowStockCount]="lowStockCount()"
            [outOfStockCount]="outOfStockCount()"
            [treasuryReady]="treasuryReady()"
            [overdue]="overdueTransactions()"
            [partnersReady]="partnersReady()"
            [creditUsagePct]="creditUsagePct()"
            [blockedPartners]="blockedPartners()"
            (openOverdue)="overdueOpen.set(true)"
            (retry)="refresh()"
          />
        </div>
      </div>

      @if (inventoryReady()) {
        <app-warehouse-table [warehouses]="warehouses()" />
      } @else if (inventorySectionLoading()) {
        <section class="ui-panel p-4" aria-busy="true" aria-label="Carregando estoque por armazém">
          <app-skeleton-loader [count]="5" height="2.25rem" />
        </section>
      } @else {
        <section class="ui-panel flex flex-col items-center px-6 py-10 text-center" role="alert">
          <p class="text-sm font-medium text-content-primary">Não foi possível carregar o estoque</p>
          <p class="mt-1 text-sm text-content-muted">O resumo do inventário não respondeu.</p>
          <button type="button" class="ui-btn mt-4" (click)="reloadInventory()">Tentar novamente</button>
        </section>
      }
    </section>

    <app-drawer
      [open]="overdueOpen()"
      title="Contas vencidas"
      [description]="overdueDescription()"
      maxWidth="520px"
      (closed)="overdueOpen.set(false)"
    >
      <ul class="divide-y divide-border-subtle">
        @for (transaction of overdueTransactions(); track transaction.id) {
          <li class="px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-content-primary" [title]="transaction.description">
                  {{ transaction.description }}
                </p>
                <p class="mt-0.5 text-xs text-content-muted">
                  {{ transaction.partnerName }} · vence {{ formatDate(transaction.dueDate) }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-mono text-sm tabular-nums text-content-primary">{{ formatCurrency(transaction.amount) }}</p>
                <app-badge
                  class="mt-1 inline-block"
                  [variant]="transaction.type === 'INCOME' ? 'INFO' : 'NEUTRAL'"
                  [label]="transaction.type === 'INCOME' ? 'Receita' : 'Despesa'"
                />
              </div>
            </div>
          </li>
        }
      </ul>

      <div drawer-footer class="flex items-center justify-between gap-3 px-4 py-3">
        <a routerLink="/treasury" class="ui-btn ui-btn-primary">Abrir tesouraria</a>
        <button type="button" class="ui-btn" (click)="overdueOpen.set(false)">Fechar</button>
      </div>
    </app-drawer>
  `,
})
export class DashboardComponent implements OnInit {
  protected readonly inventoryStore = inject(InventoryStore);
  protected readonly treasuryStore = inject(TreasuryStore);
  protected readonly partnersStore = inject(PartnersStore);

  protected readonly ArrowUpRight = ArrowUpRight;
  protected readonly RefreshCw = RefreshCw;

  protected readonly overdueOpen = signal(false);

  protected readonly inventoryReady = computed(() => this.inventoryStore.summary() !== null);
  protected readonly treasuryReady = computed(() => this.treasuryStore.summary() !== null);
  protected readonly partnersReady = computed(
    () =>
      this.partnersStore.items().length > 0 ||
      (!this.partnersStore.loading() && !this.partnersStore.error())
  );

  protected readonly inventorySectionLoading = computed(
    () => this.inventoryStore.summaryLoading() && !this.inventoryReady()
  );
  protected readonly treasurySectionLoading = computed(
    () => this.treasuryStore.summaryLoading() && !this.treasuryReady()
  );
  protected readonly loading = computed(
    () =>
      this.inventorySectionLoading() ||
      this.treasurySectionLoading() ||
      (this.partnersStore.loading() && !this.partnersReady())
  );
  protected readonly refreshing = computed(
    () =>
      this.inventoryStore.summaryLoading() ||
      this.treasuryStore.summaryLoading() ||
      this.partnersStore.loading()
  );

  protected readonly referenceDate = computed(() => DATE_FORMATTER.format(new Date()));

  protected readonly warehouses = computed(() => this.inventoryStore.summary()?.byWarehouse ?? []);
  protected readonly criticalItems = computed(
    () => this.inventoryStore.summary()?.criticalItems ?? []
  );
  protected readonly lowStockCount = computed(
    () => this.inventoryStore.summary()?.lowStockCount ?? 0
  );
  protected readonly outOfStockCount = computed(
    () => this.inventoryStore.summary()?.outOfStockCount ?? 0
  );

  protected readonly monthly = computed(() => this.treasuryStore.summary()?.monthly ?? []);

  private readonly realized = computed(() => this.treasuryStore.summary()?.realized ?? null);
  private readonly lastMonth = computed(() => this.treasuryStore.summary()?.lastMonth ?? null);
  private readonly upcoming30 = computed(() => this.treasuryStore.summary()?.upcoming30 ?? null);
  private readonly aging = computed(() => this.treasuryStore.summary()?.aging ?? null);

  protected readonly overdueTransactions = computed<readonly TreasuryTransaction[]>(() =>
    [...(this.aging()?.overdue ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  );

  private readonly overdueReceivable = computed(() =>
    this.overdueTransactions()
      .filter((transaction) => transaction.type === 'INCOME')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  private readonly overduePayable = computed(() =>
    this.overdueTransactions()
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );

  protected readonly overdueDescription = computed(() => {
    const items = this.overdueTransactions();
    if (items.length === 0) return 'Nenhum título vencido';
    const total = items.reduce((sum, transaction) => sum + transaction.amount, 0);
    return `${items.length} ${items.length === 1 ? 'título' : 'títulos'} · ${formatBrl(total)}`;
  });

  protected readonly inventoryValueLabel = computed(() => {
    const summary = this.inventoryStore.summary();
    return summary ? formatBrl(summary.totalStockValue) : '—';
  });

  protected readonly inventoryContext = computed(() => {
    const summary = this.inventoryStore.summary();
    if (!summary) return this.inventorySectionLoading() ? 'Carregando resumo…' : 'Resumo indisponível';
    return `${summary.totalSkus} SKUs · ${INTEGER_FORMATTER.format(summary.totalUnits)} unidades`;
  });

  protected readonly realizedValueLabel = computed(() => {
    const realized = this.realized();
    return realized ? formatBrl(realized.balance) : '—';
  });

  protected readonly realizedContext = computed(() => {
    const realized = this.realized();
    if (!realized) return this.treasurySectionLoading() ? 'Carregando resumo…' : 'Resumo indisponível';
    return `Receitas ${formatCompactBrl(realized.income)} − despesas ${formatCompactBrl(realized.expense)}`;
  });

  protected readonly realizedDeltaLabel = computed(() => {
    const realized = this.realized();
    const lastMonth = this.lastMonth();
    if (!realized || !lastMonth) return '';
    const delta = realized.balance - lastMonth.balance;
    if (Math.abs(delta) < 0.01) return 'Sem variação vs. mês anterior';
    return `${delta > 0 ? '+' : '−'}${formatCompactBrl(Math.abs(delta))} vs. mês anterior`;
  });

  protected readonly realizedDeltaClass = computed(() => {
    const realized = this.realized();
    const lastMonth = this.lastMonth();
    if (!realized || !lastMonth) return 'text-content-muted';
    const delta = realized.balance - lastMonth.balance;
    if (Math.abs(delta) < 0.01) return 'text-content-muted';
    return delta > 0 ? 'text-state-success' : 'text-state-danger';
  });

  protected readonly receivablesValueLabel = computed(() => {
    const upcoming = this.upcoming30();
    return upcoming ? formatBrl(upcoming.receivables) : '—';
  });

  protected readonly payablesValueLabel = computed(() => {
    const upcoming = this.upcoming30();
    return upcoming ? formatBrl(upcoming.payables) : '—';
  });

  protected readonly receivablesContext = computed(() => {
    const upcoming = this.upcoming30();
    if (!upcoming) return this.treasurySectionLoading() ? 'Carregando resumo…' : 'Resumo indisponível';
    const count = `${upcoming.receivableCount} ${upcoming.receivableCount === 1 ? 'título' : 'títulos'}`;
    if (this.overdueReceivable() <= 0) return `${count} · sem vencidos`;
    return `${count} · inclui ${formatCompactBrl(this.overdueReceivable())} vencidos`;
  });

  protected readonly payablesContext = computed(() => {
    const upcoming = this.upcoming30();
    if (!upcoming) return this.treasurySectionLoading() ? 'Carregando resumo…' : 'Resumo indisponível';
    const count = `${upcoming.payableCount} ${upcoming.payableCount === 1 ? 'título' : 'títulos'}`;
    if (this.overduePayable() <= 0) return `${count} · sem vencidos`;
    return `${count} · inclui ${formatCompactBrl(this.overduePayable())} vencidos`;
  });

  protected readonly creditUsagePct = computed(() => this.partnersStore.creditUsagePct());
  protected readonly blockedPartners = computed(() => this.partnersStore.blocked());

  protected readonly formatCurrency = formatBrl;

  ngOnInit(): void {
    void this.inventoryStore.loadSummary();
    void this.treasuryStore.loadSummary();
    void this.partnersStore.load(true);
  }

  protected refresh(): void {
    void Promise.all([
      this.inventoryStore.loadSummary(),
      this.treasuryStore.loadSummary(),
      this.partnersStore.load(true),
    ]);
  }

  protected reloadInventory(): void {
    void this.inventoryStore.loadSummary();
  }

  protected reloadTreasury(): void {
    void this.treasuryStore.loadSummary();
  }

  protected formatDate(value: string): string {
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : SHORT_DATE_FORMATTER.format(date);
  }
}
