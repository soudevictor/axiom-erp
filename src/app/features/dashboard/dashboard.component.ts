import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Database, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-angular';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';
import { TreasuryStore } from '@/features/treasury/data-access/treasury.store';
import { DatabaseSeedService } from '@/core/database/database-seed.service';
import { ToastService } from '@/shared/ui/toast/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    StatCardComponent,
    SkeletonLoaderComponent,
    BadgeComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Visão Geral Executiva
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Métricas estratégicas em tempo real da cadeia de suprimentos e tesouraria corporativa
          </p>
        </div>

        <div class="flex items-center gap-3">
          <app-badge variant="SUCCESS" label="Online / Local DB Sync" />
          <button
            type="button"
            (click)="resetLocalDatabase()"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            title="Limpar e repopular a base Dexie local com 500 registros"
          >
            <lucide-icon [img]="DatabaseIcon" [size]="14" />
            <span>Repopular Banco (Seed)</span>
          </button>
        </div>
      </div>

      <!-- KPI StatCards Grid (with Skeletons for Loading State) -->
      @if (inventoryStore.loading() || treasuryStore.loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
          <div class="p-5 rounded-xl border border-slate-800 bg-slate-900">
            <app-skeleton-loader height="5rem" />
          </div>
          <div class="p-5 rounded-xl border border-slate-800 bg-slate-900">
            <app-skeleton-loader height="5rem" />
          </div>
          <div class="p-5 rounded-xl border border-slate-800 bg-slate-900">
            <app-skeleton-loader height="5rem" />
          </div>
          <div class="p-5 rounded-xl border border-slate-800 bg-slate-900">
            <app-skeleton-loader height="5rem" />
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <app-stat-card
            title="Valor Total em Estoque"
            [value]="'R$ ' + (inventoryStore.totalStockValue() | number:'1.2-2':'pt-BR')"
            [trend]="{ value: 12.4, isPositive: true, label: 'em relação ao mês anterior' }"
            iconName="Package"
            subtitle="Ativos em 5 armazéns"
          />

          <app-stat-card
            title="Itens com Estoque Baixo"
            [value]="inventoryStore.lowStockCount()"
            [trend]="{ value: 4.2, isPositive: false, label: 'exigem reposição urgente' }"
            iconName="AlertTriangle"
            subtitle="Abaixo do limite de segurança"
          />

          <app-stat-card
            title="Saldo Consolidado de Caixa"
            [value]="'R$ ' + (treasuryStore.totalBalance() | number:'1.2-2':'pt-BR')"
            [trend]="{ value: 8.7, isPositive: true, label: 'posição financeira' }"
            iconName="Wallet"
            subtitle="Tesouraria & Bancos"
          />

          <app-stat-card
            title="Contas a Receber"
            [value]="'R$ ' + (treasuryStore.totalReceivables() | number:'1.2-2':'pt-BR')"
            [trend]="{ value: 2.1, isPositive: true, label: 'carteira adimplente' }"
            iconName="TrendingUp"
            subtitle="Previsão de entrada 30d"
          />
        </div>
      }

      <!-- Deferrable View Analytics Section -->
      @defer (on viewport) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Chart Container -->
          <div class="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-slate-200">
                  Fluxo de Caixa vs. Giro de Inventário (Últimos 6 meses)
                </h3>
                <p class="text-xs text-slate-400">Projeção unificada de faturamento e abastecimento</p>
              </div>
              <span class="text-xs text-indigo-400 font-mono">Simulação em Tempo Real</span>
            </div>

            <!-- SVG Animated Chart Representation -->
            <div class="h-64 flex flex-col justify-end p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div class="flex items-end justify-between h-48 gap-3 px-4 pt-4 border-b border-slate-800">
                <div class="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-t h-[45%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-indigo-400 font-mono">
                    R$ 420K
                  </div>
                </div>
                <div class="flex-1 bg-indigo-500/30 hover:bg-indigo-500/40 rounded-t h-[60%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-indigo-400 font-mono">
                    R$ 580K
                  </div>
                </div>
                <div class="flex-1 bg-indigo-500/40 hover:bg-indigo-500/50 rounded-t h-[75%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-indigo-400 font-mono">
                    R$ 790K
                  </div>
                </div>
                <div class="flex-1 bg-emerald-500/40 hover:bg-emerald-500/50 rounded-t h-[85%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-emerald-400 font-mono">
                    R$ 950K
                  </div>
                </div>
                <div class="flex-1 bg-emerald-500/50 hover:bg-emerald-500/60 rounded-t h-[70%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-emerald-400 font-mono">
                    R$ 820K
                  </div>
                </div>
                <div class="flex-1 bg-gradient-to-t from-indigo-600 to-emerald-500 rounded-t h-[95%] transition-all relative group">
                  <div class="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded text-emerald-400 font-mono font-bold">
                    R$ 1.25M
                  </div>
                </div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500 px-4 font-mono">
                <span>MAR</span>
                <span>ABR</span>
                <span>MAI</span>
                <span>JUN</span>
                <span>JUL</span>
                <span class="text-indigo-400 font-bold">AGO (ATUAL)</span>
              </div>
            </div>
          </div>

          <!-- System Alerts Container -->
          <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
            <h3 class="text-sm font-semibold text-slate-200">
              Alertas & Notificações Ativas
            </h3>
            <div class="space-y-3">
              <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <lucide-icon [img]="AlertTriangleIcon" [size]="18" class="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p class="text-xs font-semibold text-amber-200">Reposição Urgente</p>
                  <p class="text-[11px] text-amber-400/80 mt-0.5">
                    {{ inventoryStore.lowStockCount() }} SKUs atingiram o estoque de segurança.
                  </p>
                </div>
              </div>

              <div class="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <lucide-icon [img]="ShieldCheckIcon" [size]="18" class="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p class="text-xs font-semibold text-emerald-200">Integridade IndexedDB</p>
                  <p class="text-[11px] text-emerald-400/80 mt-0.5">
                    500 registros de produtos e 120 transações em sincronia local.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @placeholder {
        <div class="p-6 rounded-xl border border-slate-800 bg-slate-900">
          <app-skeleton-loader height="16rem" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  protected readonly inventoryStore = inject(InventoryStore);
  protected readonly treasuryStore = inject(TreasuryStore);
  private readonly seedService = inject(DatabaseSeedService);
  private readonly toastService = inject(ToastService);

  protected readonly DatabaseIcon = Database;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly ShieldCheckIcon = ShieldCheck;

  ngOnInit(): void {
    if (this.inventoryStore.items().length === 0) {
      this.inventoryStore.loadItems();
    }
    if (this.treasuryStore.transactions().length === 0) {
      this.treasuryStore.loadTransactions();
    }
  }

  protected async resetLocalDatabase(): Promise<void> {
    await this.seedService.resetDatabase();
    await this.inventoryStore.loadItems();
    await this.treasuryStore.loadTransactions();
    this.toastService.success(
      'Banco Local Reiniciado',
      'O banco IndexedDB foi repopulado com 500 produtos e 120 transações via Faker.js.'
    );
  }
}
