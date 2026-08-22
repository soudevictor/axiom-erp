import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  LucideAngularModule,
  Users,
  Search,
  Plus,
  Building2,
  CheckCircle2,
  X,
  Save,
  ShieldCheck,
  CreditCard,
} from 'lucide-angular';

import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { CnpjMaskDirective } from '@/shared/directives/cnpj-mask.directive';
import { isValidCnpj } from '@/shared/utils/cnpj-validator';
import { ToastService } from '@/shared/ui/toast/toast.service';

export interface B2BPartner {
  readonly id: string;
  readonly cnpj: string;
  readonly companyName: string;
  readonly category: 'FORNECEDOR' | 'CLIENTE_DIRETO' | 'DISTRIBUIDOR';
  readonly status: 'HOMOLOGADO' | 'EM_ANALISE' | 'BLOQUEADO';
  readonly creditLimit: number;
  /** Credit used so far (0–creditLimit) */
  readonly creditUsed: number;
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
    creditUsed: 385000,
    state: 'SP',
  },
  {
    id: 'PART-002',
    cnpj: '98.765.432/0001-10',
    companyName: 'MegaLogística Soluções de Transporte S.A.',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 300000,
    creditUsed: 75000,
    state: 'RJ',
  },
  {
    id: 'PART-003',
    cnpj: '45.111.222/0001-33',
    companyName: 'Escritório Central de Eletrônicos Eireli',
    category: 'CLIENTE_DIRETO',
    status: 'HOMOLOGADO',
    creditLimit: 120000,
    creditUsed: 108000,
    state: 'MG',
  },
  {
    id: 'PART-004',
    cnpj: '77.888.999/0001-44',
    companyName: 'Hardware & Cia Suprimentos Industriais',
    category: 'FORNECEDOR',
    status: 'EM_ANALISE',
    creditLimit: 450000,
    creditUsed: 0,
    state: 'PR',
  },
  {
    id: 'PART-005',
    cnpj: '33.444.555/0001-55',
    companyName: 'Global Logistics & Freight Corp',
    category: 'DISTRIBUIDOR',
    status: 'HOMOLOGADO',
    creditLimit: 800000,
    creditUsed: 240000,
    state: 'RS',
  },
];

/** Custom CNPJ validator for reactive forms */
function cnpjValidator(control: { value: string }): { cnpjInvalid: boolean } | null {
  const raw = control.value ?? '';
  if (!raw) return null;
  return isValidCnpj(raw) ? null : { cnpjInvalid: true };
}

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    StatCardComponent,
    BadgeComponent,
    CnpjMaskDirective,
  ],
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
          (click)="openModal()"
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
          [value]="partners().length"
          subtitle="Rede de contatos B2B ativa"
          iconName="Users"
        />

        <app-stat-card
          title="Limite de Crédito Global"
          [value]="'R$ ' + (totalCreditLimit() | number:'1.2-2':'pt-BR')"
          subtitle="Política de crédito ativa"
          iconName="Building2"
        />

        <app-stat-card
          title="Parceiros Homologados"
          [value]="homologadosPercentage() + '%'"
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
          {{ filteredPartners().length }} parceiros filtrados
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
                <th class="py-3 px-4">Crédito Utilizado / Limite</th>
                <th class="py-3 px-4 text-center">Homologação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle/60 text-content-primary">
              @for (partner of filteredPartners(); track partner.id) {
                <tr class="hover:bg-canvas-elevated transition-colors">
                  <td class="py-3 px-4 font-mono text-brand-secondary font-medium">{{ partner.cnpj }}</td>
                  <td class="py-3 px-4 font-medium text-content-primary">{{ partner.companyName }}</td>
                  <td class="py-3 px-4 text-content-muted font-mono">{{ partner.state }}</td>
                  <td class="py-3 px-4 text-content-muted">{{ partner.category }}</td>

                  <!-- Credit Limit Progress Bar -->
                  <td class="py-3 px-4">
                    <div class="space-y-1.5 min-w-40">
                      <div class="flex items-center justify-between text-[10px] font-mono">
                        <span class="text-content-muted">
                          R$ {{ partner.creditUsed | number:'1.0-0':'pt-BR' }}
                        </span>
                        <span
                          class="font-semibold"
                          [class.text-state-danger]="creditPercent(partner) >= 90"
                          [class.text-state-warning]="creditPercent(partner) >= 70 && creditPercent(partner) < 90"
                          [class.text-state-success]="creditPercent(partner) < 70"
                        >
                          {{ creditPercent(partner) }}%
                        </span>
                      </div>
                      <div
                        class="w-full h-1.5 rounded-full bg-canvas-base overflow-hidden"
                        role="progressbar"
                        [attr.aria-valuenow]="creditPercent(partner)"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        [attr.aria-label]="'Crédito utilizado: ' + creditPercent(partner) + '% do limite de R$ ' + partner.creditLimit"
                      >
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          [style.width]="creditPercent(partner) + '%'"
                          [class.bg-state-success]="creditPercent(partner) < 70"
                          [class.bg-state-warning]="creditPercent(partner) >= 70 && creditPercent(partner) < 90"
                          [class.bg-state-danger]="creditPercent(partner) >= 90"
                        ></div>
                      </div>
                      <div class="text-[10px] text-content-disabled font-mono">
                        Limite: R$ {{ partner.creditLimit | number:'1.0-0':'pt-BR' }}
                      </div>
                    </div>
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

      <!-- Partner Registration Modal -->
      @if (isModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          (click)="onBackdropClick($event)"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-modal-title"
        >
          <div
            class="relative w-full max-w-lg p-6 bg-canvas-elevated border border-border-strong rounded-xl shadow-2xl space-y-5 text-content-primary"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-4 border-b border-border-subtle">
              <h2 id="partner-modal-title" class="text-base font-bold text-content-primary tracking-tight">
                Cadastrar Novo Parceiro B2B
              </h2>
              <button
                type="button"
                (click)="closeModal()"
                class="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors"
                aria-label="Fechar janela"
              >
                <lucide-icon [img]="XIcon" [size]="18" />
              </button>
            </div>

            <!-- Form -->
            <form [formGroup]="partnerForm" (ngSubmit)="onPartnerSubmit()" class="space-y-4">
              <!-- CNPJ with mask + validation -->
              <div>
                <label for="cnpj" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                  CNPJ *
                </label>
                <input
                  id="cnpj"
                  type="text"
                  formControlName="cnpj"
                  appCnpjMask
                  placeholder="00.000.000/0000-00"
                  maxlength="18"
                  class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono transition-colors"
                  [attr.aria-invalid]="partnerForm.get('cnpj')?.touched && partnerForm.get('cnpj')?.invalid ? 'true' : null"
                  aria-describedby="cnpj-error"
                />
                @if (partnerForm.get('cnpj')?.touched && partnerForm.get('cnpj')?.invalid) {
                  <span id="cnpj-error" class="text-[11px] text-state-danger mt-1 block" role="alert">
                    @if (partnerForm.get('cnpj')?.errors?.['required']) {
                      CNPJ é obrigatório.
                    } @else if (partnerForm.get('cnpj')?.errors?.['cnpjInvalid']) {
                      CNPJ inválido — verifique os dígitos verificadores.
                    }
                  </span>
                }
                @if (partnerForm.get('cnpj')?.valid && partnerForm.get('cnpj')?.dirty) {
                  <span class="text-[11px] text-state-success mt-1 flex items-center gap-1">
                    <lucide-icon [img]="ShieldCheckIcon" [size]="12" />
                    CNPJ válido (Módulo 11 verificado)
                  </span>
                }
              </div>

              <!-- Company Name -->
              <div>
                <label for="companyName" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                  Razão Social *
                </label>
                <input
                  id="companyName"
                  type="text"
                  formControlName="companyName"
                  placeholder="Ex: Distribuidora ABC Ltda"
                  class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Category -->
                <div>
                  <label for="category" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    id="category"
                    formControlName="category"
                    class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
                  >
                    <option value="FORNECEDOR">Fornecedor</option>
                    <option value="CLIENTE_DIRETO">Cliente Direto</option>
                    <option value="DISTRIBUIDOR">Distribuidor</option>
                  </select>
                </div>

                <!-- State -->
                <div>
                  <label for="state" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                    UF *
                  </label>
                  <input
                    id="state"
                    type="text"
                    formControlName="state"
                    placeholder="SP"
                    maxlength="2"
                    class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors font-mono uppercase"
                  />
                </div>
              </div>

              <!-- Credit Limit -->
              <div>
                <label for="creditLimit" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                  Limite de Crédito (R$) *
                </label>
                <input
                  id="creditLimit"
                  type="number"
                  min="0"
                  formControlName="creditLimit"
                  placeholder="Ex: 100000"
                  class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors font-mono"
                />
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 rounded-lg text-xs font-medium text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="partnerForm.invalid"
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs shadow-brand-glow transition-colors"
                >
                  <lucide-icon [img]="SaveIcon" [size]="16" />
                  Cadastrar Parceiro
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  protected readonly PlusIcon = Plus;
  protected readonly UsersIcon = Users;
  protected readonly Building2Icon = Building2;
  protected readonly CheckCircle2Icon = CheckCircle2;
  protected readonly SearchIcon = Search;
  protected readonly XIcon = X;
  protected readonly SaveIcon = Save;
  protected readonly ShieldCheckIcon = ShieldCheck;
  protected readonly CreditCardIcon = CreditCard;

  protected readonly searchQuery = signal('');
  protected readonly partners = signal<readonly B2BPartner[]>(MOCK_PARTNERS);
  protected readonly isModalOpen = signal(false);

  protected readonly filteredPartners = computed<readonly B2BPartner[]>(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.partners();
    return this.partners().filter(
      (p) =>
        p.companyName.toLowerCase().includes(q) ||
        p.cnpj.toLowerCase().includes(q)
    );
  });

  protected readonly totalCreditLimit = computed<number>(() =>
    this.partners().reduce((sum, p) => sum + p.creditLimit, 0)
  );

  protected readonly homologadosPercentage = computed<number>(() => {
    const total = this.partners().length;
    if (total === 0) return 0;
    const homologados = this.partners().filter((p) => p.status === 'HOMOLOGADO').length;
    return Math.round((homologados / total) * 100);
  });

  protected partnerForm: FormGroup = this.fb.group({
    cnpj: ['', [Validators.required, cnpjValidator]],
    companyName: ['', [Validators.required, Validators.minLength(3)]],
    category: ['FORNECEDOR', [Validators.required]],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
  });

  /** Returns the credit utilization percentage capped at 100 */
  protected creditPercent(partner: B2BPartner): number {
    if (partner.creditLimit === 0) return 0;
    return Math.min(100, Math.round((partner.creditUsed / partner.creditLimit) * 100));
  }

  protected openModal(): void {
    this.partnerForm.reset({
      cnpj: '',
      companyName: '',
      category: 'FORNECEDOR',
      state: '',
      creditLimit: 0,
    });
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  protected onPartnerSubmit(): void {
    if (this.partnerForm.invalid) return;

    const value = this.partnerForm.value as {
      cnpj: string;
      companyName: string;
      category: 'FORNECEDOR' | 'CLIENTE_DIRETO' | 'DISTRIBUIDOR';
      state: string;
      creditLimit: number;
    };

    const newPartner: B2BPartner = {
      id: `PART-${String(this.partners().length + 1).padStart(3, '0')}`,
      cnpj: value.cnpj,
      companyName: value.companyName,
      category: value.category,
      status: 'EM_ANALISE',
      creditLimit: Number(value.creditLimit),
      creditUsed: 0,
      state: value.state.toUpperCase(),
    };

    this.partners.update((current) => [...current, newPartner]);
    this.closeModal();
    this.toastService.success(
      'Parceiro Cadastrado',
      `${value.companyName} foi adicionado em análise de homologação.`
    );
  }
}
