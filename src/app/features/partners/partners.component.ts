import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Edit2,
  LucideAngularModule,
} from 'lucide-angular';
import {
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABELS,
  PARTNER_STATUS_LABELS,
  type B2BPartner,
  type PartnerCategory,
  type PartnerStatus,
} from '@/core/models/partner.model';
import { PartnersStore } from '@/features/partners/data-access/partners.store';
import { BadgeComponent, type BadgeVariant } from '@/shared/ui/badge/badge.component';
import { ConfirmDialogComponent } from '@/shared/ui/confirm-dialog/confirm-dialog.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import { formatBrl } from '@/shared/utils/currency-formatter';
import { PartnerFormModalComponent } from './ui/partner-form-modal.component';
import { PartnerStatusModalComponent } from './ui/partner-status-modal.component';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [
    LucideAngularModule,
    BadgeComponent,
    ConfirmDialogComponent,
    SkeletonLoaderComponent,
    PartnerFormModalComponent,
    PartnerStatusModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-[22px] font-semibold leading-8 tracking-tight text-content-primary">Parceiros</h1>
          <p class="mt-0.5 max-w-[62ch] text-sm text-content-muted">
            Fornecedores, clientes e distribuidores com homologação e limite de crédito.
          </p>
        </div>
        <button type="button" class="ui-btn ui-btn-primary" (click)="openCreate()">
          <lucide-icon [img]="Plus" [size]="16" />
          Novo parceiro
        </button>
      </header>

      <div class="ui-panel grid grid-cols-2 divide-y divide-border-subtle sm:grid-cols-4 sm:divide-y-0 sm:divide-x" role="region" aria-label="Indicadores de parceiros">
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Parceiros</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-content-primary">{{ store.total() }}</p>
          <p class="mt-0.5 text-xs text-content-muted">{{ store.homologated() }} homologados</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Crédito utilizado</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-content-primary">{{ formatCompact(store.creditUsedTotal()) }}</p>
          <p class="mt-0.5 text-xs text-content-muted">{{ formatPct(store.creditUsagePct()) }} de {{ formatCompact(store.creditLimitTotal()) }}</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Em análise</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-state-warning">{{ store.inAnalysis() }}</p>
          <p class="mt-0.5 text-xs text-content-muted">Aguardando homologação</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Bloqueados</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums" [class]="store.blocked() > 0 ? 'text-state-danger' : 'text-content-primary'">{{ store.blocked() }}</p>
          <p class="mt-0.5 text-xs text-content-muted">Crédito suspenso</p>
        </div>
      </div>

      <div class="ui-panel overflow-hidden">
        <div class="ui-toolbar">
          <label class="relative min-w-0 flex-1 sm:max-w-[320px]">
            <span class="sr-only">Buscar parceiros</span>
            <lucide-icon [img]="Search" [size]="16" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              class="ui-field pl-8"
              placeholder="Nome, CNPJ ou e-mail"
              [value]="store.filters().search"
              (input)="onSearch($event)"
            />
          </label>

          <select class="ui-field w-auto min-w-[145px]" aria-label="Filtrar por categoria" (change)="onCategory($event)">
            <option value="ALL" [selected]="store.filters().category === 'ALL'">Todas as categorias</option>
            @for (category of categories; track category) {
              <option [value]="category" [selected]="store.filters().category === category">{{ categoryLabels[category] }}</option>
            }
          </select>

          <select class="ui-field w-auto min-w-[135px]" aria-label="Filtrar por status" (change)="onStatus($event)">
            <option value="ALL" [selected]="store.filters().status === 'ALL'">Todos os status</option>
            @for (status of statuses; track status) {
              <option [value]="status" [selected]="store.filters().status === status">{{ statusLabels[status] }}</option>
            }
          </select>

          <select class="ui-field w-auto min-w-[90px]" aria-label="Filtrar por UF" (change)="onState($event)">
            <option value="ALL" [selected]="store.filters().state === 'ALL'">UF</option>
            @for (state of store.states(); track state) {
              <option [value]="state" [selected]="store.filters().state === state">{{ state }}</option>
            }
          </select>

          @if (store.hasActiveFilters()) {
            <button type="button" class="ui-btn h-9 border-transparent px-2 text-xs text-content-muted" (click)="store.clearFilters()">
              Limpar filtros
            </button>
          }
        </div>

        <div class="ui-manifest border-b border-border-subtle px-4 py-2">
          <span>{{ store.filteredTotal() }} {{ store.filteredTotal() === 1 ? 'parceiro exibido' : 'parceiros exibidos' }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ store.total() }} no total</span>
          <span aria-hidden="true">·</span>
          <span>atualizado {{ lastUpdatedLabel() }}</span>
        </div>

        @if (store.loading()) {
          <div class="p-4">
            <app-skeleton-loader [count]="6" height="3rem" />
          </div>
        } @else if (store.error()) {
          <div class="flex flex-col items-start gap-3 px-4 py-8" role="alert">
            <div class="flex items-center gap-2 text-sm text-state-danger">
              <lucide-icon [img]="AlertCircle" [size]="18" />
              <span>{{ store.error() }}</span>
            </div>
            <button type="button" class="ui-btn" (click)="store.refresh()">
              <lucide-icon [img]="RefreshCw" [size]="15" />
              Tentar novamente
            </button>
          </div>
        } @else if (store.isEmpty()) {
          <div class="flex flex-col items-center px-4 py-12 text-center">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-canvas-elevated text-content-muted">
              <lucide-icon [img]="Users" [size]="20" />
            </span>
            <h2 class="mt-3 text-sm font-medium text-content-primary">Nenhum parceiro cadastrado</h2>
            <p class="mt-1 max-w-[38ch] text-sm text-content-muted">Comece cadastrando o primeiro fornecedor ou cliente da operação.</p>
            <button type="button" class="ui-btn ui-btn-primary mt-4" (click)="openCreate()">
              <lucide-icon [img]="Plus" [size]="15" />
              Cadastrar parceiro
            </button>
          </div>
        } @else if (store.isFilteredEmpty()) {
          <div class="flex flex-col items-center px-4 py-12 text-center">
            <h2 class="text-sm font-medium text-content-primary">Nenhum resultado para estes filtros</h2>
            <p class="mt-1 text-sm text-content-muted">Ajuste a busca ou limpe os filtros para ver todos os parceiros.</p>
            <button type="button" class="ui-btn mt-4" (click)="store.clearFilters()">Limpar filtros</button>
          </div>
        } @else {
          <div class="hidden overflow-x-auto lg:block">
            <table class="ui-table">
              <caption class="sr-only">Lista de parceiros com categoria, UF, status, crédito e ações</caption>
              <thead>
                <tr>
                  <th scope="col">Parceiro</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">UF</th>
                  <th scope="col">Status</th>
                  <th scope="col" class="text-right">Limite</th>
                  <th scope="col" class="text-right">Utilizado</th>
                  <th scope="col" class="hidden xl:table-cell">Atualizado</th>
                  <th scope="col" class="w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (partner of store.filteredItems(); track partner.id) {
                  <tr>
                    <td class="max-w-[260px]">
                      <span class="block truncate text-sm font-medium text-content-primary" [title]="partner.companyName">{{ partner.companyName }}</span>
                      <span class="block font-mono text-[11px] text-content-muted">{{ partner.cnpj }}</span>
                    </td>
                    <td class="whitespace-nowrap text-sm text-content-muted">{{ categoryLabels[partner.category] }}</td>
                    <td class="font-mono text-xs text-content-muted">{{ partner.state }}</td>
                    <td>
                      <app-badge [variant]="statusVariant(partner.status)" [label]="statusLabels[partner.status]" />
                    </td>
                    <td class="whitespace-nowrap text-right font-mono text-xs tabular-nums text-content-primary">{{ formatBrl(partner.creditLimit) }}</td>
                    <td class="min-w-[150px]">
                      <div class="flex items-center gap-2">
                        <div class="h-1 w-14 overflow-hidden rounded-full bg-canvas-elevated" aria-hidden="true">
                          <span class="block h-full rounded-full" [class]="creditBarClass(partner)" [style.width.%]="creditPct(partner)"></span>
                        </div>
                        <span class="font-mono text-[11px] tabular-nums text-content-muted">{{ formatBrl(partner.creditUsed) }}</span>
                      </div>
                    </td>
                    <td class="hidden whitespace-nowrap font-mono text-[11px] text-content-muted xl:table-cell">{{ formatDate(partner.updatedAt) }}</td>
                    <td>
                      <div class="flex justify-end gap-0.5">
                        <button type="button" class="ui-icon-btn h-8 w-8" [attr.aria-label]="'Editar ' + partner.companyName" title="Editar" (click)="openEdit(partner)">
                          <lucide-icon [img]="Edit2" [size]="15" />
                        </button>
                        <button type="button" class="ui-icon-btn h-8 w-8" [attr.aria-label]="'Alterar homologação de ' + partner.companyName" title="Alterar homologação" (click)="openStatus(partner)">
                          <lucide-icon [img]="ShieldCheck" [size]="15" />
                        </button>
                        <button type="button" class="ui-icon-btn h-8 w-8 hover:text-state-danger" [attr.aria-label]="'Excluir ' + partner.companyName" title="Excluir" (click)="deleteTarget.set(partner)">
                          <lucide-icon [img]="Trash2" [size]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <ul class="divide-y divide-border-subtle lg:hidden" aria-label="Lista de parceiros">
            @for (partner of store.filteredItems(); track partner.id) {
              <li class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-content-primary" [title]="partner.companyName">{{ partner.companyName }}</p>
                    <p class="mt-0.5 font-mono text-[11px] text-content-muted">{{ partner.cnpj }}</p>
                  </div>
                  <app-badge [variant]="statusVariant(partner.status)" [label]="statusLabels[partner.status]" />
                </div>

                <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <p class="text-content-muted">Categoria</p>
                    <p class="mt-0.5 text-content-primary">{{ categoryLabels[partner.category] }} · {{ partner.state }}</p>
                  </div>
                  <div>
                    <p class="text-content-muted">Crédito utilizado</p>
                    <p class="mt-0.5 font-mono tabular-nums text-content-primary">{{ formatBrl(partner.creditUsed) }}</p>
                  </div>
                  <div>
                    <p class="text-content-muted">Limite</p>
                    <p class="mt-0.5 font-mono tabular-nums text-content-primary">{{ formatBrl(partner.creditLimit) }}</p>
                  </div>
                  <div>
                    <p class="text-content-muted">Atualizado</p>
                    <p class="mt-0.5 font-mono text-content-primary">{{ formatDate(partner.updatedAt) }}</p>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-1 border-t border-border-subtle pt-2">
                  <button type="button" class="ui-btn h-8 border-transparent px-2 text-xs" (click)="openEdit(partner)">
                    <lucide-icon [img]="Edit2" [size]="14" /> Editar
                  </button>
                  <button type="button" class="ui-btn h-8 border-transparent px-2 text-xs" (click)="openStatus(partner)">
                    <lucide-icon [img]="ShieldCheck" [size]="14" /> Homologação
                  </button>
                  <button type="button" class="ui-btn ml-auto h-8 border-transparent px-2 text-xs text-state-danger" (click)="deleteTarget.set(partner)">
                    <lucide-icon [img]="Trash2" [size]="14" /> Excluir
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    <app-partner-form-modal
      [open]="formOpen()"
      [partner]="formPartner()"
      (closed)="closeForm()"
      (saved)="handleSaved($event)"
    />

    <app-partner-status-modal
      [open]="statusOpen()"
      [partner]="statusPartner()"
      (closed)="closeStatus()"
      (changed)="handleStatusChanged($event)"
    />

    <app-confirm-dialog
      [open]="deleteTarget() !== null"
      title="Excluir parceiro"
      [message]="deleteTarget() ? 'Excluir ' + deleteTarget()?.companyName + '? O cadastro será removido. Parceiros com crédito utilizado ou transações vinculadas não podem ser excluídos.' : ''"
      confirmLabel="Excluir parceiro"
      tone="danger"
      [busy]="deleteBusy()"
      (cancelled)="deleteTarget.set(null)"
      (confirmed)="confirmDelete()"
    />
  `,
})
export class PartnersComponent implements OnInit {
  protected readonly store = inject(PartnersStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly categories = PARTNER_CATEGORIES;
  protected readonly categoryLabels = PARTNER_CATEGORY_LABELS;
  protected readonly statusLabels = PARTNER_STATUS_LABELS;
  protected readonly statuses: readonly PartnerStatus[] = ['EM_ANALISE', 'HOMOLOGADO', 'BLOQUEADO'];
  protected readonly formatBrl = formatBrl;

  protected readonly Search = Search;
  protected readonly AlertCircle = AlertCircle;
  protected readonly RefreshCw = RefreshCw;
  protected readonly Users = Users;
  protected readonly Plus = Plus;
  protected readonly Edit2 = Edit2;
  protected readonly ShieldCheck = ShieldCheck;
  protected readonly Trash2 = Trash2;

  protected readonly formOpen = signal(false);
  protected readonly formPartner = signal<B2BPartner | null>(null);
  protected readonly statusOpen = signal(false);
  protected readonly statusPartner = signal<B2BPartner | null>(null);
  protected readonly deleteTarget = signal<B2BPartner | null>(null);
  protected readonly deleteBusy = signal(false);

  protected readonly lastUpdatedLabel = computed(() => {
    const dates = this.store
      .items()
      .map((partner) => new Date(partner.updatedAt ?? partner.createdAt ?? 0).getTime())
      .filter((value) => Number.isFinite(value) && value > 0);
    if (dates.length === 0) return 'agora';
    return DATE_FORMATTER.format(new Date(Math.max(...dates)));
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'EM_ANALISE' || status === 'HOMOLOGADO' || status === 'BLOQUEADO') {
      this.store.setFilters({ status });
    }
    void this.store.load();
  }

  protected onSearch(event: Event): void {
    this.store.setFilters({ search: (event.target as HTMLInputElement).value });
  }

  protected onCategory(event: Event): void {
    this.store.setFilters({ category: (event.target as HTMLSelectElement).value as PartnerCategory | 'ALL' });
  }

  protected onStatus(event: Event): void {
    this.store.setFilters({ status: (event.target as HTMLSelectElement).value as PartnerStatus | 'ALL' });
  }

  protected onState(event: Event): void {
    this.store.setFilters({ state: (event.target as HTMLSelectElement).value });
  }

  protected openCreate(): void {
    this.formPartner.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(partner: B2BPartner): void {
    this.formPartner.set(partner);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formPartner.set(null);
  }

  protected handleSaved(partner: B2BPartner): void {
    const editing = this.formPartner() !== null;
    this.closeForm();
    this.toast.success(
      editing ? 'Parceiro atualizado' : 'Parceiro cadastrado',
      partner.companyName
    );
  }

  protected openStatus(partner: B2BPartner): void {
    this.statusPartner.set(partner);
    this.statusOpen.set(true);
  }

  protected closeStatus(): void {
    this.statusOpen.set(false);
    this.statusPartner.set(null);
  }

  protected handleStatusChanged(partner: B2BPartner): void {
    this.closeStatus();
    this.toast.success('Homologação atualizada', `${partner.companyName} · ${this.statusLabels[partner.status]}`);
  }

  protected async confirmDelete(): Promise<void> {
    const partner = this.deleteTarget();
    if (!partner) return;
    this.deleteBusy.set(true);
    try {
      await this.store.remove(partner.id);
      this.deleteTarget.set(null);
      this.toast.success('Parceiro excluído', partner.companyName);
    } catch {
      this.toast.error('Não foi possível excluir', this.store.error() ?? 'Tente novamente.');
      this.deleteTarget.set(null);
    } finally {
      this.deleteBusy.set(false);
    }
  }

  protected statusVariant(status: PartnerStatus): BadgeVariant {
    if (status === 'HOMOLOGADO') return 'SUCCESS';
    if (status === 'BLOQUEADO') return 'DANGER';
    return 'WARNING';
  }

  protected creditPct(partner: B2BPartner): number {
    if (partner.creditLimit <= 0) return 0;
    return Math.min(100, Math.round((partner.creditUsed / partner.creditLimit) * 100));
  }

  protected creditBarClass(partner: B2BPartner): string {
    const pct = this.creditPct(partner);
    if (pct >= 80) return 'bg-state-danger';
    if (pct >= 60) return 'bg-state-warning';
    return 'bg-brand';
  }

  protected formatPct(value: number): string {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  }

  protected formatCompact(value: number): string {
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    }
    if (value >= 1_000) {
      return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
    }
    return formatBrl(value);
  }

  protected formatDate(value: string | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date);
  }
}
