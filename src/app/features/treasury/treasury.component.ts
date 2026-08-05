import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Wallet, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-angular';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';

export type TreasuryTab = 'RECEIVABLES' | 'PAYABLES' | 'STATEMENT';

@Component({
  selector: 'app-treasury',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, StatCardComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <!-- Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Tesouraria & Controle de Carteira
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Gestão de fluxo de caixa, conciliação bancária e previsões financeiras
          </p>
        </div>
        <div class="flex items-center gap-2">
          <app-badge variant="INFO" label="Conciliação Diária Ativa" />
        </div>
      </div>

      <!-- Financial StatCards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <app-stat-card
          title="Saldo Consolidado"
          value="R$ 3.842.150,00"
          [trend]="{ value: 5.4, isPositive: true, label: 'vs. mês anterior' }"
          subtitle="Conta Principal Itaú BBA"
          iconName="Wallet"
        />

        <app-stat-card
          title="Contas a Receber (30d)"
          value="R$ 1.250.000,00"
          [trend]="{ value: 12.1, isPositive: true, label: 'carteira adimplente' }"
          subtitle="98% em dia"
          iconName="ArrowUpRight"
        />

        <app-stat-card
          title="Contas a Pagar (30d)"
          value="R$ 680.400,00"
          [trend]="{ value: 1.8, isPositive: false, label: 'programação semanal' }"
          subtitle="Fornecedores e Folha"
          iconName="ArrowDownRight"
        />
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-slate-800 flex items-center gap-6 text-sm font-medium">
        <button
          type="button"
          (click)="setTab('RECEIVABLES')"
          class="pb-3 border-b-2 transition-colors"
          [ngClass]="
            activeTab() === 'RECEIVABLES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          "
        >
          Contas a Receber
        </button>

        <button
          type="button"
          (click)="setTab('PAYABLES')"
          class="pb-3 border-b-2 transition-colors"
          [ngClass]="
            activeTab() === 'PAYABLES'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          "
        >
          Contas a Pagar
        </button>

        <button
          type="button"
          (click)="setTab('STATEMENT')"
          class="pb-3 border-b-2 transition-colors"
          [ngClass]="
            activeTab() === 'STATEMENT'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          "
        >
          Extrato Conciliado
        </button>
      </div>

      <!-- Tab Content Area Stub -->
      <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        @switch (activeTab()) {
          @case ('RECEIVABLES') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-200">Títulos a Receber</h3>
                <span class="text-xs text-slate-400">Total: 48 duplicatas ativas</span>
              </div>
              <div class="h-48 flex items-center justify-center rounded-lg bg-slate-950/40 border border-slate-800 border-dashed text-slate-500 text-xs">
                [ Tabela de Contas a Receber com filtros por vencimento — Fase 3 ]
              </div>
            </div>
          }
          @case ('PAYABLES') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-200">Compromissos Financeiros</h3>
                <span class="text-xs text-slate-400">Total: 22 ordens pendentes</span>
              </div>
              <div class="h-48 flex items-center justify-center rounded-lg bg-slate-950/40 border border-slate-800 border-dashed text-slate-500 text-xs">
                [ Tabela de Contas a Pagar com autorizações RBAC — Fase 3 ]
              </div>
            </div>
          }
          @case ('STATEMENT') {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-200">Extrato Bancário Unificado</h3>
                <span class="text-xs text-slate-400">Atualizado via Open Finance Mock</span>
              </div>
              <div class="h-48 flex items-center justify-center rounded-lg bg-slate-950/40 border border-slate-800 border-dashed text-slate-500 text-xs">
                [ Fluxo de caixa diário e conciliação em tempo real — Fase 3 ]
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreasuryComponent {
  readonly activeTab = signal<TreasuryTab>('RECEIVABLES');

  setTab(tab: TreasuryTab): void {
    this.activeTab.set(tab);
  }
}
