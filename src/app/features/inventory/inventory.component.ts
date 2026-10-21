import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Edit2,
  History,
  LucideAngularModule,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-angular';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_STATUSES,
  INVENTORY_STATUS_LABELS,
  type InventoryCategory,
  type InventoryFilter,
  type InventoryItem,
  type InventoryStatus,
} from '@/core/models/inventory.model';
import type { StockMovementResult } from '@/core/models/stock-movement.model';
import { WAREHOUSES } from '@/core/models/warehouse.model';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';
import { BadgeComponent, type BadgeVariant } from '@/shared/ui/badge/badge.component';
import { ConfirmDialogComponent } from '@/shared/ui/confirm-dialog/confirm-dialog.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import { formatBrl } from '@/shared/utils/currency-formatter';
import { exportInventoryCsv } from '@/shared/utils/inventory-csv';
import { MovementHistoryDrawerComponent } from './ui/movement-history.drawer';
import { MovementModalComponent } from './ui/movement-modal.component';
import { ProductModalComponent } from './ui/product-modal.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    LucideAngularModule,
    BadgeComponent,
    ConfirmDialogComponent,
    SkeletonLoaderComponent,
    ProductModalComponent,
    MovementModalComponent,
    MovementHistoryDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-[22px] font-semibold leading-8 tracking-tight text-content-primary">Estoque</h1>
          <p class="mt-0.5 max-w-[62ch] text-sm text-content-muted">
            Saldos por armazém, mínimo de segurança e histórico auditável de cada SKU.
          </p>
        </div>
        <button type="button" class="ui-btn ui-btn-primary" (click)="openCreate()">
          <lucide-icon [img]="Plus" [size]="16" />
          Novo produto
        </button>
      </header>

      <div class="ui-panel grid grid-cols-2 divide-y divide-border-subtle sm:grid-cols-4 sm:divide-y-0 sm:divide-x" role="region" aria-label="Indicadores de estoque">
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Valor em estoque</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-content-primary">{{ formatCompactCurrency(store.totalStockValue()) }}</p>
          <p class="mt-0.5 text-xs text-content-muted">{{ formatCompactNumber(store.totalUnits()) }} unidades</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">SKUs ativos</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-content-primary">{{ store.summary()?.totalSkus ?? '—' }}</p>
          <p class="mt-0.5 text-xs text-content-muted">5 armazéns</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Abaixo do mínimo</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums" [class]="store.lowStockCount() > 0 ? 'text-state-warning' : 'text-content-primary'">{{ store.lowStockCount() }}</p>
          <p class="mt-0.5 text-xs text-content-muted">{{ store.outOfStockCount() }} zerados</p>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-content-muted">Movimentações (30 d)</p>
          <p class="mt-1 font-mono text-2xl font-medium tabular-nums text-content-primary">{{ store.movementsLast30Days() }}</p>
          <p class="mt-0.5 text-xs text-content-muted">{{ lastMovementLabel() }}</p>
        </div>
      </div>

      <div class="ui-panel overflow-hidden">
        <div class="ui-toolbar">
          <label class="relative min-w-0 flex-1 sm:max-w-[300px]">
            <span class="sr-only">Buscar produtos</span>
            <lucide-icon [img]="Search" [size]="16" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              class="ui-field pl-8"
              placeholder="SKU ou nome do produto"
              [value]="searchInput()"
              (input)="onSearch($event)"
            />
          </label>

          <select class="ui-field w-auto min-w-[145px]" aria-label="Filtrar por categoria" (change)="onCategory($event)">
            <option value="ALL" [selected]="store.filters().category === null">Todas as categorias</option>
            @for (category of categories; track category) {
              <option [value]="category" [selected]="store.filters().category === category">{{ categoryLabels[category] }}</option>
            }
          </select>

          <select class="ui-field w-auto min-w-[130px]" aria-label="Filtrar por status" (change)="onStatus($event)">
            <option value="ALL" [selected]="store.filters().status === null">Todos os status</option>
            @for (status of statuses; track status) {
              <option [value]="status" [selected]="store.filters().status === status">{{ statusLabels[status] }}</option>
            }
          </select>

          <select class="ui-field w-auto min-w-[170px]" aria-label="Filtrar por armazém" (change)="onWarehouse($event)">
            <option value="ALL" [selected]="store.filters().warehouseId === null">Todos os armazéns</option>
            @for (warehouse of warehouses; track warehouse.id) {
              <option [value]="warehouse.id" [selected]="store.filters().warehouseId === warehouse.id">{{ warehouse.name }} · {{ warehouse.state }}</option>
            }
          </select>

          @if (store.hasActiveFilters()) {
            <button type="button" class="ui-btn h-9 border-transparent px-2 text-xs text-content-muted" (click)="clearFilters()">
              Limpar filtros
            </button>
          }

          <button type="button" class="ui-btn ml-auto" [disabled]="exporting()" (click)="exportAll()">
            <lucide-icon [img]="Download" [size]="15" />
            <span class="hidden sm:inline">{{ exporting() ? 'Exportando…' : 'Exportar' }}</span>
          </button>
        </div>

        @if (store.selectionCount() > 0) {
          <div class="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-brand-subtle px-4 py-2" role="status">
            <span class="text-sm font-medium text-content-primary">{{ store.selectionCount() }} selecionados</span>
            <button type="button" class="ui-btn h-8 px-2.5 text-xs" [disabled]="exporting()" (click)="exportSelection()">
              <lucide-icon [img]="Download" [size]="14" /> Exportar seleção
            </button>
            <button type="button" class="ui-btn h-8 border-transparent px-2.5 text-xs text-state-danger hover:bg-state-danger-subtle" (click)="bulkDeleteOpen.set(true)">
              <lucide-icon [img]="Trash2" [size]="14" /> Excluir seleção
            </button>
            <button type="button" class="ui-btn ml-auto h-8 border-transparent px-2 text-xs text-content-muted" (click)="store.clearSelection()">
              Limpar seleção
            </button>
          </div>
        }

        <div class="ui-manifest border-b border-border-subtle px-4 py-2">
          <span>{{ manifestCount() }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ store.activeFilterCount() }} {{ store.activeFilterCount() === 1 ? 'filtro ativo' : 'filtros ativos' }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ lastMovementLabel() }}</span>
        </div>

        @if (store.loading()) {
          <div class="p-4">
            <app-skeleton-loader [count]="7" height="2.75rem" />
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
        } @else if (store.isFilteredEmpty()) {
          <div class="flex flex-col items-center px-4 py-12 text-center">
            <h2 class="text-sm font-medium text-content-primary">Nenhum produto para estes filtros</h2>
            <p class="mt-1 text-sm text-content-muted">Ajuste a busca ou limpe os filtros para ver o catálogo completo.</p>
            <button type="button" class="ui-btn mt-4" (click)="clearFilters()">Limpar filtros</button>
          </div>
        } @else if (store.isEmpty()) {
          <div class="flex flex-col items-center px-4 py-12 text-center">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-canvas-elevated text-content-muted">
              <lucide-icon [img]="Package" [size]="20" />
            </span>
            <h2 class="mt-3 text-sm font-medium text-content-primary">Nenhum produto cadastrado</h2>
            <p class="mt-1 max-w-[40ch] text-sm text-content-muted">Cadastre o primeiro SKU e registre a entrada inicial para começar.</p>
            <button type="button" class="ui-btn ui-btn-primary mt-4" (click)="openCreate()">
              <lucide-icon [img]="Plus" [size]="15" /> Cadastrar produto
            </button>
          </div>
        } @else {
          <div class="hidden overflow-x-auto lg:block">
            <table class="ui-table">
              <caption class="sr-only">Produtos em estoque com saldo, mínimo, preço e status</caption>
              <thead>
                <tr>
                  <th scope="col" class="w-10">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-border-strong accent-brand"
                      aria-label="Selecionar todos os produtos exibidos"
                      [checked]="store.isAllSelected()"
                      [indeterminate]="store.selectionCount() > 0 && !store.isAllSelected()"
                      (change)="toggleAll()"
                    />
                  </th>
                  <th scope="col" [attr.aria-sort]="ariaSort('name')">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-content-primary" (click)="sortBy('name')">
                      Produto <lucide-icon [img]="sortIcon('name')" [size]="12" />
                    </button>
                  </th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Armazém</th>
                  <th scope="col" class="text-right" [attr.aria-sort]="ariaSort('quantity')">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-content-primary" (click)="sortBy('quantity')">
                      Saldo <lucide-icon [img]="sortIcon('quantity')" [size]="12" />
                    </button>
                  </th>
                  <th scope="col" class="text-right">Mínimo</th>
                  <th scope="col" class="text-right" [attr.aria-sort]="ariaSort('unitPrice')">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-content-primary" (click)="sortBy('unitPrice')">
                      Preço <lucide-icon [img]="sortIcon('unitPrice')" [size]="12" />
                    </button>
                  </th>
                  <th scope="col" [attr.aria-sort]="ariaSort('status')">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-content-primary" (click)="sortBy('status')">
                      Status <lucide-icon [img]="sortIcon('status')" [size]="12" />
                    </button>
                  </th>
                  <th scope="col" class="w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of store.items(); track item.id) {
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-border-strong accent-brand"
                        [attr.aria-label]="'Selecionar ' + item.name"
                        [checked]="isSelected(item.id)"
                        (change)="store.toggleSelection(item.id)"
                      />
                    </td>
                    <td class="max-w-[280px]">
                      <button type="button" class="block max-w-full truncate text-left text-sm font-medium text-content-primary hover:text-brand" [title]="item.name" (click)="openHistory(item)">
                        {{ item.name }}
                      </button>
                      <span class="block font-mono text-[11px] leading-4 text-content-muted">{{ item.sku }}</span>
                    </td>
                    <td class="whitespace-nowrap text-xs text-content-muted">{{ categoryLabels[item.category] }}</td>
                    <td class="text-xs text-content-muted">
                      <span class="block">{{ warehouseName(item.warehouseId) }}</span>
                      <span class="block font-mono text-[10px] text-content-disabled">{{ item.warehouseId }}</span>
                    </td>
                    <td class="text-right font-mono text-xs tabular-nums" [class]="item.quantity === 0 ? 'text-state-danger' : 'text-content-primary'">{{ item.quantity }}</td>
                    <td class="text-right font-mono text-xs tabular-nums text-content-muted">{{ item.minThreshold }}</td>
                    <td class="text-right font-mono text-xs tabular-nums text-content-primary">{{ formatCurrency(item.unitPrice) }}</td>
                    <td>
                      <app-badge [variant]="statusVariant(item.status)" [label]="statusLabels[item.status]" />
                    </td>
                    <td>
                      <div class="flex justify-end gap-0.5">
                        <button type="button" class="ui-icon-btn h-8 w-8" [attr.aria-label]="'Ver histórico de ' + item.name" title="Histórico" (click)="openHistory(item)">
                          <lucide-icon [img]="History" [size]="15" />
                        </button>
                        <button type="button" class="ui-icon-btn h-8 w-8" [attr.aria-label]="'Editar ' + item.name" title="Editar" (click)="openEdit(item)">
                          <lucide-icon [img]="Edit2" [size]="15" />
                        </button>
                        <button type="button" class="ui-icon-btn h-8 w-8 hover:text-state-danger" [attr.aria-label]="'Excluir ' + item.name" title="Excluir" (click)="deleteItem(item)">
                          <lucide-icon [img]="Trash2" [size]="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <ul class="divide-y divide-border-subtle lg:hidden" aria-label="Produtos em estoque">
            @for (item of store.items(); track item.id) {
              <li class="p-4">
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    class="mt-1 h-4 w-4 shrink-0 rounded border-border-strong accent-brand"
                    [attr.aria-label]="'Selecionar ' + item.name"
                    [checked]="isSelected(item.id)"
                    (change)="store.toggleSelection(item.id)"
                  />
                  <div class="min-w-0 flex-1">
                    <button type="button" class="block w-full truncate text-left text-sm font-medium text-content-primary hover:text-brand" [title]="item.name" (click)="openHistory(item)">
                      {{ item.name }}
                    </button>
                    <p class="mt-0.5 font-mono text-[11px] text-content-muted">{{ item.sku }} · {{ categoryLabels[item.category] }}</p>
                  </div>
                  <app-badge [variant]="statusVariant(item.status)" [label]="statusLabels[item.status]" />
                </div>

                <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <p class="text-content-muted">Saldo / mínimo</p>
                    <p class="mt-0.5 font-mono tabular-nums" [class]="item.quantity === 0 ? 'text-state-danger' : 'text-content-primary'">{{ item.quantity }} / {{ item.minThreshold }}</p>
                  </div>
                  <div>
                    <p class="text-content-muted">Preço unitário</p>
                    <p class="mt-0.5 font-mono tabular-nums text-content-primary">{{ formatCurrency(item.unitPrice) }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="text-content-muted">Armazém</p>
                    <p class="mt-0.5 text-content-primary">{{ warehouseName(item.warehouseId) }}</p>
                    <p class="font-mono text-[10px] text-content-disabled">{{ item.warehouseId }}</p>
                  </div>
                </div>

                <div class="mt-3 flex items-center gap-1 border-t border-border-subtle pt-2">
                  <button type="button" class="ui-btn h-8 border-transparent px-2 text-xs" (click)="openHistory(item)">
                    <lucide-icon [img]="History" [size]="14" /> Histórico
                  </button>
                  <button type="button" class="ui-btn h-8 border-transparent px-2 text-xs" (click)="openEdit(item)">
                    <lucide-icon [img]="Edit2" [size]="14" /> Editar
                  </button>
                  <button type="button" class="ui-btn ml-auto h-8 border-transparent px-2 text-xs text-state-danger" (click)="deleteItem(item)">
                    <lucide-icon [img]="Trash2" [size]="14" /> Excluir
                  </button>
                </div>
              </li>
            }
          </ul>

          @if (store.hasMore()) {
            <div class="flex justify-center border-t border-border-subtle px-4 py-3">
              <button type="button" class="ui-btn" [disabled]="store.loadingMore()" (click)="loadMore()">
                {{ store.loadingMore() ? 'Carregando…' : 'Carregar mais produtos' }}
              </button>
            </div>
          }
        }
      </div>
    </section>

    <app-product-modal
      [open]="productOpen()"
      [item]="productItem()"
      (closed)="closeProduct()"
      (saved)="handleProductSaved($event)"
      (movementRequested)="handleProductMovementRequested($event)"
    />

    <app-movement-modal
      [open]="movementOpen()"
      [item]="movementItem()"
      (closed)="closeMovement()"
      (saved)="handleMovementSaved($event)"
    />

    <app-movement-history-drawer
      [open]="historyOpen()"
      [item]="historyItem()"
      (closed)="closeHistory()"
      (movementRequested)="handleDrawerMovement($event)"
    />

    <app-confirm-dialog
      [open]="bulkDeleteOpen()"
      title="Excluir produtos selecionados"
      [message]="bulkMessage()"
      confirmLabel="Excluir produtos"
      tone="danger"
      [busy]="bulkBusy()"
      (cancelled)="bulkDeleteOpen.set(false)"
      (confirmed)="confirmBulkDelete()"
    />
  `,
})
export class InventoryComponent implements OnInit, OnDestroy {
  protected readonly store = inject(InventoryStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = INVENTORY_CATEGORIES;
  protected readonly categoryLabels = INVENTORY_CATEGORY_LABELS;
  protected readonly statuses = INVENTORY_STATUSES;
  protected readonly statusLabels = INVENTORY_STATUS_LABELS;
  protected readonly warehouses = WAREHOUSES;
  protected readonly formatCurrency = formatBrl;

  protected readonly Plus = Plus;
  protected readonly Search = Search;
  protected readonly Download = Download;
  protected readonly Trash2 = Trash2;
  protected readonly History = History;
  protected readonly Edit2 = Edit2;
  protected readonly Package = Package;
  protected readonly AlertCircle = AlertCircle;
  protected readonly RefreshCw = RefreshCw;
  protected readonly ArrowUp = ArrowUp;
  protected readonly ArrowDown = ArrowDown;
  protected readonly ArrowUpDown = ArrowUpDown;

  protected readonly searchInput = signal('');
  protected readonly productOpen = signal(false);
  protected readonly productItem = signal<InventoryItem | null>(null);
  protected readonly movementOpen = signal(false);
  protected readonly movementItem = signal<InventoryItem | null>(null);
  protected readonly historyOpen = signal(false);
  protected readonly historyItem = signal<InventoryItem | null>(null);
  protected readonly bulkDeleteOpen = signal(false);
  protected readonly bulkBusy = signal(false);
  protected readonly exporting = signal(false);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private returnToHistory = false;

  protected readonly lastMovementLabel = computed(() => {
    const value = this.store.lastMovementAt();
    if (!value) return 'sem movimentações';
    const diff = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diff) || diff < 0) return 'agora';
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'última agora';
    if (minutes < 60) return `última há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `última há ${hours} h`;
    const days = Math.floor(hours / 24);
    return `última há ${days} d`;
  });

  protected readonly manifestCount = computed(() => {
    const total = this.store.totalItems();
    const summaryTotal = this.store.summary()?.totalSkus;
    if (this.store.hasActiveFilters() && summaryTotal !== undefined) {
      return `${total} de ${summaryTotal} SKUs`;
    }
    return `${summaryTotal ?? total} SKUs`;
  });

  protected readonly bulkMessage = computed(
    () =>
      `${this.store.selectionCount()} ${this.store.selectionCount() === 1 ? 'produto será removido' : 'produtos serão removidos'} do catálogo. O histórico de movimentações é preservado e a exclusão pode ser desfeita pelo aviso.`
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const search = params.get('search') ?? '';
    const status = params.get('status');
    const category = params.get('category');
    const warehouseId = params.get('warehouseId');

    const validStatus =
      status && INVENTORY_STATUSES.includes(status as InventoryStatus)
        ? (status as InventoryStatus)
        : null;
    const validCategory =
      category && INVENTORY_CATEGORIES.includes(category as InventoryCategory)
        ? (category as InventoryCategory)
        : null;
    const validWarehouse =
      warehouseId && WAREHOUSES.some((warehouse) => warehouse.id === warehouseId)
        ? warehouseId
        : null;

    if (search || validStatus || validCategory || validWarehouse) {
      const partial: Partial<InventoryFilter> = {
        search,
        status: validStatus,
        category: validCategory,
        warehouseId: validWarehouse,
      };
      if (search) this.searchInput.set(search);
      void this.store.setFilters(partial);
    } else {
      void this.store.load();
    }
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.store.setFilters({ search: value });
    }, 300);
  }

  protected onCategory(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.store.setFilters({ category: value === 'ALL' ? null : (value as InventoryCategory) });
  }

  protected onStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.store.setFilters({ status: value === 'ALL' ? null : (value as InventoryStatus) });
  }

  protected onWarehouse(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.store.setFilters({ warehouseId: value === 'ALL' ? null : value });
  }

  protected clearFilters(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    this.searchInput.set('');
    void this.store.resetFilters();
  }

  protected sortBy(column: keyof InventoryItem): void {
    void this.store.setSortBy(column);
  }

  protected warehouseName(id: string): string {
    return WAREHOUSES.find((warehouse) => warehouse.id === id)?.name ?? id;
  }

  protected ariaSort(column: keyof InventoryItem): 'ascending' | 'descending' | 'none' {
    const filters = this.store.filters();
    if (filters.sortBy !== column) return 'none';
    return filters.sortOrder === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(column: keyof InventoryItem): typeof ArrowUp {
    const filters = this.store.filters();
    if (filters.sortBy !== column) return ArrowUpDown;
    return filters.sortOrder === 'asc' ? ArrowUp : ArrowDown;
  }

  protected toggleAll(): void {
    if (this.store.isAllSelected()) {
      this.store.clearSelection();
    } else {
      this.store.selectAllLoaded();
    }
  }

  protected isSelected(id: string): boolean {
    return this.store.selectedIds().includes(id);
  }

  protected loadMore(): void {
    void this.store.loadMoreItems();
  }

  protected openCreate(): void {
    this.productItem.set(null);
    this.productOpen.set(true);
  }

  protected openEdit(item: InventoryItem): void {
    this.productItem.set(item);
    this.productOpen.set(true);
  }

  protected closeProduct(): void {
    this.productOpen.set(false);
    this.productItem.set(null);
  }

  protected handleProductSaved(item: InventoryItem): void {
    const editing = this.productItem() !== null;
    this.closeProduct();
    this.toast.success(
      editing ? 'Produto atualizado' : 'Produto cadastrado',
      `${item.sku} · ${item.name}`
    );
  }

  protected handleProductMovementRequested(item: InventoryItem): void {
    this.closeProduct();
    this.openMovement(item);
  }

  protected openMovement(item: InventoryItem, returnToHistory = false): void {
    this.returnToHistory = returnToHistory;
    if (returnToHistory) this.historyOpen.set(false);
    this.movementItem.set(item);
    this.movementOpen.set(true);
  }

  protected closeMovement(): void {
    this.movementOpen.set(false);
    this.movementItem.set(null);
    if (this.returnToHistory) {
      this.returnToHistory = false;
      this.historyOpen.set(true);
    }
  }

  protected handleMovementSaved(result: StockMovementResult): void {
    const item = result.item;
    const title =
      result.movement.type === 'IN'
        ? 'Entrada registrada'
        : result.movement.type === 'OUT'
          ? 'Saída registrada'
          : 'Ajuste registrado';

    this.movementOpen.set(false);
    this.movementItem.set(null);
    this.historyItem.set(item);

    this.toast.show({
      type: result.movement.type === 'OUT' ? 'INFO' : result.movement.type === 'ADJUSTMENT' ? 'WARNING' : 'SUCCESS',
      title,
      message: `${item.sku} · saldo ${result.movement.previousQuantity} → ${result.movement.newQuantity}`,
    });

    if (this.returnToHistory) {
      this.returnToHistory = false;
      this.historyOpen.set(true);
    }
  }

  protected openHistory(item: InventoryItem): void {
    this.historyItem.set(item);
    this.historyOpen.set(true);
  }

  protected closeHistory(): void {
    this.historyOpen.set(false);
    this.historyItem.set(null);
  }

  protected handleDrawerMovement(item: InventoryItem): void {
    this.openMovement(item, true);
  }

  protected async deleteItem(item: InventoryItem): Promise<void> {
    try {
      const removed = await this.store.deleteItem(item.id);
      if (this.historyItem()?.id === item.id) this.closeHistory();
      this.toast.showAction(
        'INFO',
        'Produto excluído',
        `${item.sku} · ${item.name}`,
        {
          label: 'Desfazer',
          run: () => {
            void this.undoDelete(removed);
          },
        }
      );
    } catch {
      this.toast.error('Não foi possível excluir', this.store.error() ?? 'O produto foi restaurado.');
    }
  }

  private async undoDelete(item: InventoryItem): Promise<void> {
    try {
      await this.store.restoreItem(item);
      this.toast.success('Produto restaurado', `${item.sku} · ${item.name}`);
    } catch {
      this.toast.error('Não foi possível desfazer', 'O SKU pode ter sido recriado nesse intervalo.');
    }
  }

  protected async confirmBulkDelete(): Promise<void> {
    this.bulkBusy.set(true);
    try {
      const result = await this.store.bulkDeleteSelected();
      this.bulkDeleteOpen.set(false);
      if (result.deleted.length === 0) {
        this.toast.error('Nenhum produto excluído', 'Tente novamente.');
        return;
      }
      if (result.failed > 0) {
        this.toast.warning(
          'Exclusão parcial',
          `${result.deleted.length} excluídos, ${result.failed} não puderam ser removidos.`
        );
      }
      this.toast.showAction(
        'INFO',
        `${result.deleted.length} ${result.deleted.length === 1 ? 'produto excluído' : 'produtos excluídos'}`,
        'A exclusão pode ser desfeita pelo aviso.',
        {
          label: 'Desfazer',
          run: () => {
            void this.undoBulkDelete(result.deleted);
          },
        }
      );
    } catch {
      this.toast.error('Não foi possível excluir', 'Tente novamente.');
    } finally {
      this.bulkBusy.set(false);
    }
  }

  private async undoBulkDelete(items: readonly InventoryItem[]): Promise<void> {
    const failed = await this.store.restoreMany(items);
    if (failed > 0) {
      this.toast.warning('Restauração parcial', `${failed} produtos não puderam ser restaurados.`);
      return;
    }
    this.toast.success(
      `${items.length} ${items.length === 1 ? 'produto restaurado' : 'produtos restaurados'}`,
      'O catálogo voltou ao estado anterior.'
    );
  }

  protected async exportAll(): Promise<void> {
    this.exporting.set(true);
    try {
      const items = await this.store.fetchAllFiltered();
      if (items.length === 0) {
        this.toast.warning('Nada para exportar', 'Nenhum produto corresponde aos filtros atuais.');
        return;
      }
      exportInventoryCsv(items);
      this.toast.success('Exportação gerada', `${items.length} ${items.length === 1 ? 'produto' : 'produtos'} no CSV.`);
    } catch {
      this.toast.error('Não foi possível exportar', 'Tente novamente.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected exportSelection(): void {
    const items = this.store.selectedItems();
    if (items.length === 0) return;
    exportInventoryCsv(items);
    this.toast.success('Exportação gerada', `${items.length} ${items.length === 1 ? 'produto' : 'produtos'} no CSV.`);
  }

  protected statusVariant(status: InventoryStatus): BadgeVariant {
    if (status === 'IN_STOCK') return 'SUCCESS';
    if (status === 'LOW_STOCK') return 'WARNING';
    return 'DANGER';
  }

  protected formatCompactCurrency(value: number): string {
    if (value >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    }
    if (value >= 1_000) {
      return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    }
    return formatBrl(value);
  }

  protected formatCompactNumber(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    }
    return value.toLocaleString('pt-BR');
  }
}
