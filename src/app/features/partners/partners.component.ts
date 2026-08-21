import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Users,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-angular';

import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';

export interface B2BPartner {
  readonly id: string;
  readonly cnpj: string;
  readonly companyName: string;
  readonly category: 'FORNECEDOR' | 'CLIENTE_DIRETO' | 'DISTRIBUIDOR';
  readonly status: 'HOMOLOGADO' | 'EM_ANALISE' | 'BLOQUEADO';
  readonly creditLimit: number;
  readonly state: string;
}

const MOCK_PARTNERS: readonly B2BPartner[] = [
  {
    id: 'PART-001',
    cnpj: '12.345.678/0001-90',
    companyName: 'TechSupply Brasil Distribuidora Ltda',
    category: 'FORNECEDOR',
    status: 'HOMOLOGADO',
    creditLimit: 550000,
    state: 'SP',
  },
  {
    id: 'PART-002',
    cnpj: '98.765.432/0001-10',
    companyName: 'MegaLogística Soluções de Transporte S.A.',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 300000,
    state: 'RJ',
  },
  {
    id: 'PART-003',
    cnpj: '45.111.222/0001-33',
    companyName: 'Escritório Central de Eletrônicos Eireli',
    category: 'CLIENTE_DIRETO',
    status: 'HOMOLOGADO',
    creditLimit: 120000,
    state: 'MG',
  },
  {
    id: 'PART-004',
    cnpj: '77.888.999/0001-44',
    companyName: 'Hardware & Cia Suprimentos Industriais',
    category: 'FORNECEDOR',
    status: 'EM_ANALISE',
    creditLimit: 450000,
    state: 'PR',
  },
  {
    id: 'PART-005',
    cnpj: '33.444.555/0001-55',
    companyName: 'Global Logistics & Freight Corp',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 800000,
    state: 'RS',
  },
];

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, StatCardComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-content-primary tracking-tight">
            Gestão de Parceiros B2B & Homologação
          </h1>
          <p class="text-xs text-content-muted mt-1">
            Cadastro unificado de fornecedores, distribuidores, compliance e limites de crédito
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium text-xs shadow-brand-glow transition-colors self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-base"
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
          title="Limite de Crédito Global"
          value="R$ 14.500.000,00"
          subtitle="Política de crédito ativa"
          iconName="Building2"
        />

        <app-stat-card
          title="Parceiros Homologados"
          value="98.5%"
          subtitle="Compliance & A11y ok"
          iconName="CheckCircle2"
        />
      </div>

      <!-- Filter Bar -->
      <div class="p-4 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md flex items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled" />
          <input
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar por CNPJ ou Razão Social..."
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary placeholder-content-disabled focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            aria-label="Buscar parceiros por CNPJ ou razão social"
          />
        </div>

        <div class="text-xs text-content-muted font-mono">
          {{ filteredPartners.length }} parceiros filtrados
        </div>
      </div>

      <!-- Partners Table -->
      <div class="p-6 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-border-subtle text-content-muted uppercase font-semibold tracking-wider">
                <th class="py-3 px-4">CNPJ</th>
                <th class="py-3 px-4">Razão Social</th>
                <th class="py-3 px-4">UF</th>
                <th class="py-3 px-4">Categoria</th>
                <th class="py-3 px-4 text-right">Limite de Crédito</th>
                <th class="py-3 px-4 text-center">Homologação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle/60 text-content-primary">
              @for (partner of filteredPartners; track partner.id) {
                <tr class="hover:bg-canvas-elevated transition-colors">
                  <td class="py-3 px-4 font-mono text-brand-secondary font-medium">{{ partner.cnpj }}</td>
                  <td class="py-3 px-4 font-medium text-content-primary">{{ partner.companyName }}</td>
                  <td class="py-3 px-4 text-content-muted font-mono">{{ partner.state }}</td>
                  <td class="py-3 px-4 text-content-muted">{{ partner.category }}</td>
                  <td class="py-3 px-4 text-right font-mono font-medium text-content-primary">
                    R$ {{ partner.creditLimit | number:'1.2-2':'pt-BR' }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    @switch (partner.status) {
                      @case ('HOMOLOGADO') {
                        <app-badge variant="SUCCESS" label="HOMOLOGADO" />
                      }
                      @case ('EM_ANALISE') {
                        <app-badge variant="WARNING" label="EM ANÁLISE" />
                      }
                      @case ('BLOQUEADO') {
                        <app-badge variant="DANGER" label="BLOQUEADO" />
                      }
                    }
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
  protected readonly SearchIcon = Search;

  protected readonly searchQuery = signal('');
  protected readonly partners = signal<readonly B2BPartner[]>(MOCK_PARTNERS);

  get filteredPartners(): readonly B2BPartner[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.partners();
    return this.partners().filter(
      (p) =>
        p.companyName.toLowerCase().includes(q) ||
        p.cnpj.toLowerCase().includes(q)
    );
  }
}
