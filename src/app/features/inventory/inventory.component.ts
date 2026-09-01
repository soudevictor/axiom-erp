import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  LucideAngularModule,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  PackageX,
  AlertCircle,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Undo2,
} from 'lucide-angular';

import { InventoryStore } from './data-access/inventory.store';
import { ProductModalComponent } from './ui/product-modal.component';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import { exportToCsv } from '@/shared/utils/csv-exporter';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';

type SortableColumn = 'sku' | 'name' | 'quantity' | 'unitPrice' | 'status' | 'updatedAt';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    LucideAngularModule,
    StatCardComponent,
    BadgeComponent,
    SkeletonLoaderComponent,
    ProductModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-content-primary tracking-tight">
            Gestão de Estoque Multi-Armazém
          </h1>
          <p class="text-xs text-content-muted mt-1">
            Controle integrado de inventário reativo em tempo real via Dexie.js (Virtual Scroll @angular/cdk)
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Export CSV Button -->
          <button
            type="button"
            (click)="exportCsv()"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-subtle bg-canvas-surface text-content-muted hover:text-content-primary hover:bg-canvas-elevated text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            title="Exportar dados filtrados para CSV"
            aria-label="Exportar inventário para CSV"
          >
            <lucide-icon [img]="DownloadIcon" [size]="16" />
            <span class="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            type="button"
            (click)="reloadItems()"
            class="p-2 rounded-lg border border-border-subtle bg-canvas-surface text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            title="Atualizar dados localmente"
            aria-label="Recarregar inventário"
          >
            <lucide-icon
              [img]="RefreshCwIcon"
              [size]="18"
              [ngClass]="{ 'animate-spin': inventoryStore.loading() }"
            />
          </button>

          <button
            type="button"
            (click)="openModalForCreate()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium text-xs shadow-brand-glow transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-base"
          >
            <lucide-icon [img]="PlusIcon" [size]="16" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <app-stat-card
          title="Total de SKUs Cadastrados"
          [value]="inventoryStore.totalItems()"
          subtitle="Itens catalogados na base IndexedDB"
          iconName="Package"
        />

        <app-stat-card
          title="Itens Baixo Estoque"
          [value]="inventoryStore.lowStockCount()"
          subtitle="Abaixo do limite mínimo de segurança"
          iconName="AlertTriangle"
        />

        <app-stat-card
          title="Valor Total em Estoque"
          [value]="'R$ ' + (inventoryStore.totalStockValue() | number:'1.2-2':'pt-BR')"
          subtitle="Avaliação acumulada do ativo"
          iconName="Wallet"
        />
      </div>

      <!-- Filter Controls Bar -->
      <div class="p-4 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <!-- Debounced Search Input -->
        <div class="relative flex-1 min-w-60">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-content-disabled" />
          <input
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchInputChange($event)"
            placeholder="Buscar por nome do produto ou SKU (debounce 300ms)…"
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary placeholder-content-disabled focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            aria-label="Buscar produtos em estoque"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-3">
          <select
            [ngModel]="selectedCategory()"
            (ngModelChange)="onCategoryChange($event)"
            class="px-3 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
            aria-label="Filtrar por categoria"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="ELECTRONICS">Eletrônicos</option>
            <option value="HARDWARE">Hardware</option>
            <option value="LOGISTICS">Logística</option>
            <option value="OFFICE">Escritório</option>
          </select>

          <select
            [ngModel]="selectedStatus()"
            (ngModelChange)="onStatusChange($event)"
            class="px-3 py-2 rounded-lg bg-canvas-elevated border border-border-subtle text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
            aria-label="Filtrar por status"
          >
            <option value="ALL">Todos os Status</option>
            <option value="IN_STOCK">Em Estoque</option>
            <option value="LOW_STOCK">Estoque Baixo</option>
            <option value="OUT_OF_STOCK">Sem Estoque</option>
          </select>

          @if (inventoryStore.hasActiveFilters()) {
            <button
              type="button"
              (click)="clearFilters()"
              class="px-3 py-2 rounded-lg text-xs font-medium text-state-danger hover:bg-state-danger-subtle border border-state-danger transition-colors"
            >
              Limpar Filtros
            </button>
          }
        </div>
      </div>

      <!-- Bulk Action Bar -->
      @if (inventoryStore.selectionCount() > 0) {
        <div
          class="flex items-center justify-between px-4 py-3 rounded-xl border border-brand/30 bg-brand-subtle text-xs font-medium animate-in slide-in-from-top-2 duration-200"
          role="status"
          aria-live="polite"
        >
          <span class="text-brand">
            {{ inventoryStore.selectionCount() }} item(s) selecionado(s)
          </span>
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="inventoryStore.clearSelection()"
              class="text-content-muted hover:text-content-primary transition-colors"
            >
              Cancelar seleção
            </button>
            <button
              type="button"
              (click)="bulkDelete()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-state-danger text-white hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-state-danger"
            >
              <lucide-icon [img]="Trash2Icon" [size]="14" />
              Excluir Selecionados
            </button>
          </div>
        </div>
      }

      <!-- 4 STATES PATTERN CONTAINER -->
      <div class="p-6 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md">

        <!-- 1. ERROR STATE -->
        @if (inventoryStore.error()) {
          <div
            class="p-4 rounded-lg bg-state-danger-subtle border border-state-danger flex items-center justify-between gap-4 text-state-danger"
            role="alert"
            aria-live="assertive"
          >
            <div class="flex items-center gap-3">
              <lucide-icon [img]="AlertCircleIcon" [size]="20" class="shrink-0" />
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider">Falha no Carregamento</h4>
                <p class="text-xs mt-0.5 text-state-danger/80">{{ inventoryStore.error() }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="reloadItems()"
              class="px-3 py-1 rounded-lg bg-state-danger text-white font-medium text-xs hover:opacity-90 transition-opacity"
            >
              Tentar Novamente
            </button>
          </div>
        }

        <!-- 2. LOADING STATE (Skeleton) -->
        @else if (inventoryStore.loading()) {
          <div class="space-y-3" aria-live="polite">
            <div class="flex items-center justify-between pb-2 border-b border-border-subtle">
              <span class="text-xs font-semibold text-content-muted">Carregando inventário…</span>
            </div>
            <app-skeleton-loader [count]="8" height="3rem" />
          </div>
        }

        <!-- 3. EMPTY STATE -->
        @else if (inventoryStore.items().length === 0) {
          <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-canvas-elevated border border-border-strong flex items-center justify-center text-content-muted shadow-elevation-1">
              <lucide-icon [img]="PackageXIcon" [size]="32" />
            </div>
            <div>
              <h3 class="text-base font-bold text-content-primary">Nenhum produto encontrado</h3>
              <p class="text-xs text-content-muted mt-1 max-w-sm">
                Não existem itens que coincidam com os filtros aplicados ou a base de estoque está vazia.
              </p>
            </div>
            <button
              type="button"
              (click)="clearFilters()"
              class="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium transition-colors"
            >
              Restaurar Filtros de Busca
            </button>
          </div>
        }

        <!-- 4. SUCCESS / DATA STATE — CDK Virtual Scroll Viewport -->
        @else {
          <div class="flex flex-col space-y-2">
            <!-- Table Header with sortable columns -->
            <div class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-subtle text-content-muted uppercase font-semibold tracking-wider text-[11px]">
              <!-- Checkbox All -->
              <div class="col-span-1 flex items-center">
                <button
                  type="button"
                  (click)="inventoryStore.selectAll()"
                  class="p-0.5 rounded text-content-muted hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand"
                  [attr.aria-label]="inventoryStore.isAllSelected() ? 'Desmarcar todos' : 'Selecionar todos'"
                  [title]="inventoryStore.isAllSelected() ? 'Desmarcar todos' : 'Selecionar todos'"
                >
                  <lucide-icon
                    [img]="inventoryStore.isAllSelected() ? CheckSquareIcon : SquareIcon"
                    [size]="16"
                    [class.text-brand]="inventoryStore.isAllSelected()"
                  />
                </button>
              </div>

              <!-- SKU sortable -->
              <div class="col-span-2">
                <button
                  type="button"
                  (click)="sortBy('sku')"
                  class="flex items-center gap-1 hover:text-content-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded"
                  [attr.aria-sort]="getSortAriaSort('sku')"
                >
                  SKU
                  <lucide-icon [img]="getSortIcon('sku')" [size]="11" />
                </button>
              </div>

              <!-- Name sortable -->
              <div class="col-span-3">
                <button
                  type="button"
                  (click)="sortBy('name')"
                  class="flex items-center gap-1 hover:text-content-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded"
                  [attr.aria-sort]="getSortAriaSort('name')"
                >
                  Produto
                  <lucide-icon [img]="getSortIcon('name')" [size]="11" />
                </button>
              </div>

              <!-- Category -->
              <div class="col-span-1">Categoria</div>

              <!-- Quantity sortable -->
              <div class="col-span-1 text-right">
                <button
                  type="button"
                  (click)="sortBy('quantity')"
                  class="flex items-center justify-end gap-1 w-full hover:text-content-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded"
                  [attr.aria-sort]="getSortAriaSort('quantity')"
                >
                  Qtd
                  <lucide-icon [img]="getSortIcon('quantity')" [size]="11" />
                </button>
              </div>

              <!-- Unit Price sortable -->
              <div class="col-span-2 text-right">
                <button
                  type="button"
                  (click)="sortBy('unitPrice')"
                  class="flex items-center justify-end gap-1 w-full hover:text-content-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded"
                  [attr.aria-sort]="getSortAriaSort('unitPrice')"
                >
                  Preço Unit.
                  <lucide-icon [img]="getSortIcon('unitPrice')" [size]="11" />
                </button>
              </div>

              <!-- Status sortable -->
              <div class="col-span-1 text-center">
                <button
                  type="button"
                  (click)="sortBy('status')"
                  class="flex items-center justify-center gap-1 w-full hover:text-content-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand rounded"
                  [attr.aria-sort]="getSortAriaSort('status')"
                >
                  Status
                  <lucide-icon [img]="getSortIcon('status')" [size]="11" />
                </button>
              </div>

              <!-- Actions -->
              <div class="col-span-1 text-center">Ações</div>
            </div>

            <!-- Virtual Scroll Viewport — itemSize=48 matches h-12 (3rem) row height -->
            <cdk-virtual-scroll-viewport
              itemSize="48"
              class="h-[600px] w-full overflow-y-auto"
              style="contain: strict;"
              (scrolledIndexChange)="onScrolledIndexChange($event)"
            >
              <div
                *cdkVirtualFor="let item of inventoryStore.items(); trackBy: trackByItemId"
                class="grid grid-cols-12 gap-4 px-4 py-2 h-12 border-b border-border-subtle hover:bg-canvas-elevated text-xs items-center transition-colors"
                [class.bg-brand-subtle]="isSelected(item.id)"
                [class.border-brand]="isSelected(item.id)"
              >
                <!-- Checkbox -->
                <div class="col-span-1 flex items-center">
                  <button
                    type="button"
                    (click)="inventoryStore.toggleSelect(item.id)"
                    class="p-0.5 rounded text-content-disabled hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand"
                    [attr.aria-label]="'Selecionar ' + item.name"
                    [attr.aria-checked]="isSelected(item.id)"
                    role="checkbox"
                  >
                    <lucide-icon
                      [img]="isSelected(item.id) ? CheckSquareIcon : SquareIcon"
                      [size]="15"
                      [class.text-brand]="isSelected(item.id)"
                    />
                  </button>
                </div>

                <!-- SKU — monospaced per spec -->
                <div class="col-span-2 font-mono font-medium text-brand truncate" [title]="item.sku">
                  {{ item.sku }}
                </div>

                <!-- Product Name -->
                <div class="col-span-3 font-medium text-content-primary truncate" [title]="item.name">
                  {{ item.name }}
                </div>

                <!-- Category -->
                <div class="col-span-1 text-content-muted truncate">
                  {{ item.category }}
                </div>

                <!-- Quantity — monospaced per spec -->
                <div class="col-span-1 text-right font-mono font-medium text-content-primary">
                  {{ item.quantity }}
                </div>

                <!-- Unit Price — monospaced per spec -->
                <div class="col-span-2 text-right font-mono text-content-muted">
                  R$ {{ item.unitPrice | number:'1.2-2':'pt-BR' }}
                </div>

                <!-- Status Badge -->
                <div class="col-span-1 flex justify-center">
                  @switch (item.status) {
                    @case ('IN_STOCK') {
                      <app-badge variant="SUCCESS" label="EM ESTOQUE" />
                    }
                    @case ('LOW_STOCK') {
                      <app-badge variant="WARNING" label="BAIXO" />
                    }
                    @case ('OUT_OF_STOCK') {
                      <app-badge variant="DANGER" label="ZERADO" />
                    }
                  }
                </div>

                <!-- Actions -->
                <div class="col-span-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    (click)="openModalForEdit(item)"
                    class="p-1 rounded text-content-muted hover:text-brand hover:bg-brand-subtle transition-colors focus-visible:ring-2 focus-visible:ring-brand"
                    [title]="'Editar ' + item.name"
                  >
                    <lucide-icon [img]="Edit2Icon" [size]="15" />
                  </button>

                  <button
                    type="button"
                    (click)="deleteItem(item)"
                    class="p-1 rounded text-content-muted hover:text-state-danger hover:bg-state-danger-subtle transition-colors focus-visible:ring-2 focus-visible:ring-state-danger"
                    [title]="'Remover ' + item.name"
                  >
                    <lucide-icon [img]="Trash2Icon" [size]="15" />
                  </button>
                </div>
              </div>
            </cdk-virtual-scroll-viewport>

            <!-- Table Footer -->
            <div class="flex items-center justify-between pt-3 text-xs text-content-muted border-t border-border-subtle px-2">
              <span>Exibindo {{ inventoryStore.items().length }} de {{ inventoryStore.totalItems() }} produtos</span>
              <span class="font-mono text-[11px] text-content-disabled">Virtual Scroll CDK • 60 FPS</span>
            </div>

            <!-- Loading More Indicator -->
            @if (inventoryStore.loadingMore()) {
              <div
                class="flex items-center justify-center gap-2 py-3 text-xs text-content-muted"
                aria-live="polite"
              >
                <span class="inline-block w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" aria-hidden="true"></span>
                Carregando mais itens…
              </div>
            } @else if (!inventoryStore.hasMoreItems() && inventoryStore.items().length > 0) {
              <div class="flex items-center justify-center py-3 text-[11px] text-content-disabled">
                Todos os {{ inventoryStore.totalItems() }} registros exibidos.
              </div>
            }
          </div>
        }
      </div>

      <!-- Modal Component for Create / Edit -->
      @if (isModalOpen()) {
        <app-product-modal
          [itemToEdit]="selectedItemForEdit()"
          (close)="closeModal()"
          (save)="onSaveProduct($event)"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent implements OnInit {
  protected readonly inventoryStore = inject(InventoryStore);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly FilterIcon = Filter;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly Edit2Icon = Edit2;
  protected readonly Trash2Icon = Trash2;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly PackageXIcon = PackageX;
  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly DownloadIcon = Download;
  protected readonly ArrowUpDownIcon = ArrowUpDown;
  protected readonly ArrowUpIcon = ArrowUp;
  protected readonly ArrowDownIcon = ArrowDown;
  protected readonly CheckSquareIcon = CheckSquare;
  protected readonly SquareIcon = Square;
  protected readonly Undo2Icon = Undo2;

  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<InventoryCategory | 'ALL'>('ALL');
  protected readonly selectedStatus = signal<InventoryStatus | 'ALL'>('ALL');

  protected readonly isModalOpen = signal(false);
  protected readonly selectedItemForEdit = signal<InventoryItem | null>(null);

  /** Debounce pipeline — dispatches search only after 300ms idle, skipping duplicates */
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    if (this.inventoryStore.items().length === 0) {
      this.inventoryStore.loadItems();
    }

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((query) => {
        this.inventoryStore.setFilters({ search: query, page: 1 });
      });

    // Open modal automatically if ?action=new query param is present
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['action'] === 'new') {
          this.isModalOpen.set(true);
          this.selectedItemForEdit.set(null);
        }
      });
  }

  protected trackByItemId(_index: number, item: InventoryItem): string {
    return item.id;
  }

  protected isSelected(id: string): boolean {
    return this.inventoryStore.selectedIds().includes(id);
  }

  protected onSearchInputChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  protected onCategoryChange(category: InventoryCategory | 'ALL'): void {
    this.selectedCategory.set(category);
    this.inventoryStore.setFilters({
      category: category === 'ALL' ? null : category,
      page: 1,
    });
  }

  protected onStatusChange(status: InventoryStatus | 'ALL'): void {
    this.selectedStatus.set(status);
    this.inventoryStore.setFilters({
      status: status === 'ALL' ? null : status,
      page: 1,
    });
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('ALL');
    this.selectedStatus.set('ALL');
    this.inventoryStore.resetFilters();
    this.inventoryStore.loadItems();
  }

  protected reloadItems(): void {
    this.inventoryStore.loadItems();
    this.toastService.info('Estoque', 'Dados recarregados da base Dexie.js.');
  }

  protected openModalForCreate(): void {
    this.selectedItemForEdit.set(null);
    this.isModalOpen.set(true);
  }

  protected openModalForEdit(item: InventoryItem): void {
    this.selectedItemForEdit.set(item);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedItemForEdit.set(null);
  }

  protected async onSaveProduct(
    productData: Omit<InventoryItem, 'id' | 'updatedAt' | 'status'>
  ): Promise<void> {
    const editItem = this.selectedItemForEdit();

    function deriveStatus(quantity: number, minThreshold: number): InventoryStatus {
      if (quantity === 0) return 'OUT_OF_STOCK';
      if (quantity <= minThreshold) return 'LOW_STOCK';
      return 'IN_STOCK';
    }

    const status = deriveStatus(productData.quantity, productData.minThreshold);

    if (editItem) {
      await this.inventoryStore.updateItem(editItem.id, {
        ...productData,
        status,
      });
      this.toastService.success(
        'Produto Atualizado',
        `O item "${productData.name}" foi atualizado com sucesso.`
      );
    } else {
      await this.inventoryStore.addItem({
        ...productData,
        status,
        updatedAt: new Date(),
      });
      this.toastService.success(
        'Produto Criado',
        `O item "${productData.name}" foi adicionado ao estoque.`
      );
    }

    this.closeModal();
  }

  /** Optimistic delete with 5-second undo toast */
  protected deleteItem(item: InventoryItem): void {
    const removed = this.inventoryStore.optimisticDeleteItem(item.id);
    if (!removed) return;

    const toastId = this.toastService.warning(
      'Produto Removido',
      `"${item.name}" foi excluído.`,
      5000
    );

    // Show undo option using a second toast-like approach via console (simplified)
    // The undo is exposed via a button action attached to the toast
    this.showUndoToast(removed, toastId);
  }

  private showUndoToast(item: InventoryItem, _originalToastId: string): void {
    // We remove the previous warning toast and replace with one that has undo action
    this.toastService.remove(_originalToastId);

    // Show a persistent action toast with Undo — leverages the extended show method
    const undoId = this.toastService.show({
      type: 'WARNING',
      title: 'Produto Removido',
      message: `"${item.name}" foi excluído. Clique em Desfazer para restaurar.`,
      duration: 0, // manual dismiss
    });

    // Auto-dismiss after 5s and clean up
    const timer = setTimeout(() => {
      this.toastService.remove(undoId);
    }, 5000);

    // Expose undo globally for the toast action (callback pattern)
    const undoKey = `undo-${undoId}`;
    (window as unknown as Record<string, unknown>)[undoKey] = () => {
      clearTimeout(timer);
      this.toastService.remove(undoId);
      this.inventoryStore.restoreItem(item);
      this.toastService.success('Ação Desfeita', `"${item.name}" foi restaurado.`);
      delete (window as unknown as Record<string, unknown>)[undoKey];
    };
  }

  protected async bulkDelete(): Promise<void> {
    const count = this.inventoryStore.selectionCount();
    await this.inventoryStore.bulkDeleteSelected();
    this.toastService.warning(
      'Exclusão em Lote',
      `${count} item(s) removido(s) do estoque.`
    );
  }

  /** Sorts the table by the given column, toggling ASC/DESC. */
  protected sortBy(column: SortableColumn): void {
    this.inventoryStore.setSortBy(column);
    this.inventoryStore.loadItems();
  }

  /** Returns the Lucide sort icon for the given column */
  protected getSortIcon(column: SortableColumn): typeof ArrowUpDown {
    const filters = this.inventoryStore.filters();
    if (filters.sortBy !== column) return this.ArrowUpDownIcon;
    return filters.sortOrder === 'asc' ? this.ArrowUpIcon : this.ArrowDownIcon;
  }

  /** Returns the ARIA sort attribute value for the given column */
  protected getSortAriaSort(column: SortableColumn): 'ascending' | 'descending' | 'none' {
    const filters = this.inventoryStore.filters();
    if (filters.sortBy !== column) return 'none';
    return filters.sortOrder === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * CDK Virtual Scroll event — fires when the first visible index changes.
   * Triggers `loadMoreItems()` when the user is within 10 rows of the last loaded item.
   */
  protected onScrolledIndexChange(index: number): void {
    const items = this.inventoryStore.items();
    if (items.length === 0) return;
    if (index + 15 >= items.length) {
      this.inventoryStore.loadMoreItems();
    }
  }

  /** Exports visible (filtered) inventory items to CSV */
  protected exportCsv(): void {
    const items = this.inventoryStore.items();
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    exportToCsv(
      items as unknown as Record<string, unknown>[],
      `estoque-${date}`,
      {
        sku: 'SKU',
        name: 'Produto',
        category: 'Categoria',
        warehouseId: 'Armazém',
        quantity: 'Quantidade',
        minThreshold: 'Estoque Mínimo',
        unitPrice: 'Preço Unit. (R$)',
        status: 'Status',
        updatedAt: 'Atualizado Em',
      }
    );

    this.toastService.success(
      'CSV Exportado',
      `Arquivo "estoque-${date}.csv" com ${items.length} linhas gerado.`
    );
  }
}
