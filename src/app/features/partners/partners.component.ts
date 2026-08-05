import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Users, Search, Plus, Building2, CheckCircle2 } from 'lucide-angular';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';

export interface B2BPartner {
  readonly id: string;
  readonly cnpj: string;
  readonly companyName: string;
  readonly category: 'FORNECEDOR' | 'CLIENTE_DIRETO' | 'DISTRIBUIDOR';
  readonly status: 'ATIVO' | 'BLOQUEADO';
  readonly creditLimit: number;
}

const MOCK_PARTNERS: readonly B2BPartner[] = [
  {
    id: '1',
    cnpj: '12.345.678/0001-90',
    companyName: 'TechSupply Brasil Distribuidora Ltda',
    category: 'FORNECEDOR',
    status: 'ATIVO',
    creditLimit: 550000,
  },
  {
    id: '2',
    cnpj: '98.765.432/0001-10',
    companyName: 'MegaLogística Soluções de Transporte S.A.',
    category: 'DISTRIBUIDOR',
    status: 'ATIVO',
    creditLimit: 300000,
  },
  {
    id: '3',
    cnpj: '45.111.222/0001-33',
    companyName: 'Escritório Central de Eletrônicos Eireli',
    category: 'CLIENTE_DIRETO',
    status: 'ATIVO',
    creditLimit: 120000,
  },
];

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, StatCardComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Gestão de Parceiros B2B
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Cadastro unificado de fornecedores, distribuidores e grandes contas
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-colors self-start sm:self-auto"
        >
          <lucide-icon [img]="PlusIcon" [size]="16" />
          <span>Cadastrar Parceiro</span>
        </button>
      </div>

      <!-- KPI Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <app-stat-card
          title="Total de Parceiros Cadastrados"
          value="142"
          subtitle="Rede de contatos B2B"
          iconName="Users"
        />

        <app-stat-card
          title="Limite de Crédito Concedido"
          value="R$ 14.500.000,00"
          subtitle="Política de crédito ativa"
          iconName="Building2"
        />

        <app-stat-card
          title="Parceiros Homologados"
          value="98.5%"
          subtitle="Compliance ok"
          iconName="CheckCircle2"
        />
      </div>

      <!-- Partners Table / Grid Stub -->
      <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h3 class="text-sm font-semibold text-slate-200">Parceiros em Destaque</h3>
          <span class="text-xs text-slate-400">Exibindo registros recentes</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider">
                <th class="py-3 px-4">CNPJ</th>
                <th class="py-3 px-4">Razão Social</th>
                <th class="py-3 px-4">Categoria</th>
                <th class="py-3 px-4 text-right">Limite de Crédito</th>
                <th class="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              @for (partner of partners; track partner.id) {
                <tr class="hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-4 font-mono text-indigo-400 font-medium">{{ partner.cnpj }}</td>
                  <td class="py-3 px-4 font-medium text-slate-100">{{ partner.companyName }}</td>
                  <td class="py-3 px-4 text-slate-400">{{ partner.category }}</td>
                  <td class="py-3 px-4 text-right font-medium">
                    R$ {{ partner.creditLimit | number:'1.2-2':'pt-BR' }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <app-badge variant="SUCCESS" label="HOMOLOGADO" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersComponent {
  protected readonly PlusIcon = Plus;
  protected readonly UsersIcon = Users;
  protected readonly Building2Icon = Building2;
  protected readonly CheckCircle2Icon = CheckCircle2;

  protected readonly partners: readonly B2BPartner[] = MOCK_PARTNERS;
}
