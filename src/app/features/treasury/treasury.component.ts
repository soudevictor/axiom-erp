import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
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
} from 'lucide-angular';

import { TreasuryStore } from './data-access/treasury.store';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import type {
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  TreasuryTransaction,
} from '@/core/models/treasury.model';

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
  ],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Tesouraria & Gestão de Fluxo de Caixa
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Controle integrado de lançamentos, contas a pagar, recebimentos e extrato bancário reativo
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="reloadTransactions()"
            class="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Atualizar dados financeiro"
          >
            <lucide-icon
              [img]="RefreshCwIcon"
              [size]="18"
              [ngClass]="{ 'animate-spin': treasuryStore.loading() }"
            />
          </button>

          <button
            type="button"
            (click)="simulateNewTransaction()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-colors"
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
        />

        <app-stat-card
          title="Contas a Receber (Ativas)"
          [value]="'R$ ' + (treasuryStore.totalReceivables() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 12.1, isPositive: true, label: 'faturamento previsto' }"
          subtitle="Duplicatas de Clientes"
          iconName="ArrowUpRight"
        />

        <app-stat-card
          title="Contas a Pagar (Programado)"
          [value]="'R$ ' + (treasuryStore.totalPayables() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 1.8, isPositive: false, label: 'compromissos' }"
          subtitle="Fornecedores e Fretes"
          iconName="ArrowDownRight"
        />
      </div>

      <!-- Filter Controls Bar -->
      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar por descrição ou parceiro B2B..."
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-3">
          <select
            [ngModel]="selectedType()"
            (ngModelChange)="onTypeChange($event)"
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="INCOME">Recebimentos (Entrada)</option>
            <option value="EXPENSE">Pagamentos (Saída)</option>
          </select>

          <select
            [ngModel]="selectedStatus()"
            (ngModelChange)="onStatusChange($event)"
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
              class="px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              Limpar Filtros
            </button>
          }
        </div>
      </div>

      <!-- 4 STATES PATTERN CONTAINER -->
      <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <!-- 1. ERROR STATE -->
        @if (treasuryStore.error()) {
          <div class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-rose-300">
            <div class="flex items-center gap-3">
              <lucide-icon [img]="AlertCircleIcon" [size]="20" class="text-rose-400 shrink-0" />
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider">Erro na Tesouraria</h4>
                <p class="text-xs text-rose-400 mt-0.5">{{ treasuryStore.error() }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="reloadTransactions()"
              class="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium text-xs hover:bg-rose-600 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        }

        <!-- 2. LOADING STATE (Skeleton) -->
        @else if (treasuryStore.loading()) {
          <div class="space-y-3" aria-live="polite">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800">
              <span class="text-xs font-semibold text-slate-400">Carregando fluxo financeiro...</span>
            </div>
            <app-skeleton-loader [count]="5" height="2.5rem" />
          </div>
        }

        <!-- 3. EMPTY STATE -->
        @else if (treasuryStore.transactions().length === 0) {
          <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
              <lucide-icon [img]="FileSpreadsheetIcon" [size]="32" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100">Nenhuma transação encontrada</h3>
              <p class="text-xs text-slate-400 mt-1 max-w-sm">
                Não existem lançamentos financeiros que coincidam com os filtros aplicados.
              </p>
            </div>
            <button
              type="button"
              (click)="clearFilters()"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Restaurar Filtros
            </button>
          </div>
        }

        <!-- 4. SUCCESS STATE (Virtual Scroll Viewport) -->
        @else {
          <div class="flex flex-col space-y-2">
            <div class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider text-[11px]">
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
            >
              <div
                *cdkVirtualFor="let tx of treasuryStore.transactions(); trackBy: trackByTxId"
                class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 text-xs items-center transition-colors"
              >
                <!-- Description & Partner -->
                <div class="col-span-4 min-w-0">
                  <p class="font-medium text-slate-100 truncate" [title]="tx.description">
                    {{ tx.description }}
                  </p>
                  <p class="text-[11px] text-indigo-400 truncate">
                    {{ tx.partnerName }}
                  </p>
                </div>

                <!-- Category -->
                <div class="col-span-2 text-slate-400 truncate">
                  {{ tx.category }}
                </div>

                <!-- Due Date -->
                <div class="col-span-2 text-slate-300 font-mono text-[11px]">
                  {{ tx.dueDate | date:'dd/MM/yyyy' }}
                </div>

                <!-- Amount -->
                <div
                  class="col-span-2 text-right font-mono font-semibold"
                  [ngClass]="tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'"
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
                      class="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Dar baixa / Confirmar liquidação"
                    >
                      <lucide-icon [img]="CheckCircleIcon" [size]="16" />
                    </button>
                  }
                </div>
              </div>
            </cdk-virtual-scroll-viewport>

            <!-- Table Footer -->
            <div class="flex items-center justify-between pt-3 text-xs text-slate-400 border-t border-slate-800/80 px-2">
              <span>Exibindo {{ treasuryStore.transactions().length }} de {{ treasuryStore.totalItems() }} lançamentos</span>
              <span class="font-mono text-[11px] text-slate-500">Conciliação Automática Dexie.js</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryComponent implements OnInit {
  protected readonly treasuryStore = inject(TreasuryStore);
  private readonly toastService = inject(ToastService);

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

  protected readonly searchQuery = signal('');
  protected readonly selectedType = signal<TransactionType | 'ALL'>('ALL');
  protected readonly selectedStatus = signal<TransactionStatus | 'ALL'>('ALL');

  ngOnInit(): void {
    if (this.treasuryStore.transactions().length === 0) {
      this.treasuryStore.loadTransactions();
    }
  }

  protected trackByTxId(_index: number, tx: TreasuryTransaction): string {
    return tx.id;
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

  protected async simulateNewTransaction(): Promise<void> {
    await this.treasuryStore.addTransaction({
      description: 'Lançamento Manual de Exemplo B2B',
      type: 'INCOME',
      amount: 15500.0,
      category: 'CLIENT_RECEIPT',
      partnerId: 'PART-001',
      partnerName: 'TechSupply Brasil Distribuidora Ltda',
      status: 'PENDING',
      dueDate: new Date().toISOString(),
    });
    this.toastService.success(
      'Lançamento Adicionado',
      'Novo lançamento financeiro inserido no fluxo de caixa.'
    );
  }
}
