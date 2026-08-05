import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
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
            Métricas de desempenho em tempo real da cadeia de suprimentos e tesouraria
          </p>
        </div>
        <div class="flex items-center gap-2">
          <app-badge variant="SUCCESS" label="Atualizado em tempo real" />
        </div>
      </div>

      <!-- KPI StatCards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-stat-card
          title="Valor Total em Estoque"
          [value]="'R$ ' + (inventoryStore.totalStockValue() | number:'1.2-2':'pt-BR')"
          [trend]="{ value: 12.4, isPositive: true, label: 'em relação ao mês anterior' }"
          iconName="Package"
          subtitle="Total de ativos armazenados"
        />

        <app-stat-card
          title="Itens com Estoque Baixo"
          [value]="inventoryStore.lowStockCount()"
          [trend]="{ value: 4.2, isPositive: false, label: 'exigem reposição urgente' }"
          iconName="AlertTriangle"
          subtitle="Abaixo do limite de segurança"
        />

        <app-stat-card
          title="Receita Mensal Prevista"
          value="R$ 1.485.200,00"
          [trend]="{ value: 8.7, isPositive: true, label: 'projeção financeira' }"
          iconName="TrendingUp"
          subtitle="Módulo de Tesouraria"
        />

        <app-stat-card
          title="Parceiros B2B Ativos"
          value="142"
          [trend]="{ value: 2.1, isPositive: true, label: 'novas parcerias este mês' }"
          iconName="Users"
          subtitle="Fornecedores e Compradores"
        />
      </div>

      <!-- Deferrable View Analytics Section -->
      @defer (on viewport) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-semibold text-slate-200">
                Movimentação do Estoque vs. Faturamento
              </h3>
              <span class="text-xs text-slate-400">Últimos 30 dias</span>
            </div>
            <div class="h-64 flex items-center justify-center rounded-lg bg-slate-950/40 border border-slate-800/80 border-dashed text-slate-500 text-xs">
              [ Painel de Gráficos Reativos — Carregado via &#64;defer na Fase 3 ]
            </div>
          </div>

          <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <h3 class="text-sm font-semibold text-slate-200 mb-4">
              Alertas Recentes do Sistema
            </h3>
            <div class="space-y-3">
              <div class="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0"></div>
                <div>
                  <p class="text-xs font-semibold text-slate-200">Reposição Necessária</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    {{ inventoryStore.lowStockCount() }} produtos atingiram o limite mínimo de reposição.
                  </p>
                </div>
              </div>
              <div class="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <p class="text-xs font-semibold text-slate-200">Seed de Dados Local</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    Banco Dexie populado com 500 registros realistas via Faker.js.
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

  ngOnInit(): void {
    if (this.inventoryStore.items().length === 0) {
      this.inventoryStore.loadItems();
    }
  }
}
