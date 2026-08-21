import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from 'lucide-angular';

import { InventoryStore } from './data-access/inventory.store';
import { ProductModalComponent } from './ui/product-modal.component';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';

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
              class="px-3 py-2 rounded-lg text-xs font-medium text-state-danger hover:bg-state-danger-subtle border border-state-danger/20 transition-colors"
            >
              Limpar Filtros
            </button>
          }
        </div>
      </div>

      <!-- 4 STATES PATTERN CONTAINER -->
      <div class="p-6 rounded-xl border border-border-subtle bg-canvas-surface backdrop-blur-md">

        <!-- 1. ERROR STATE -->
        @if (inventoryStore.error()) {
          <div
            class="p-4 rounded-lg bg-state-danger-subtle border border-state-danger/30 flex items-center justify-between gap-4 text-state-danger"
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
            <!-- Table Header -->
            <div class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-subtle text-content-muted uppercase font-semibold tracking-wider text-[11px]">
              <div class="col-span-2">SKU</div>
              <div class="col-span-3">Produto</div>
              <div class="col-span-2">Categoria</div>
              <div class="col-span-1 text-right">Qtd</div>
              <div class="col-span-2 text-right">Preço Unit.</div>
              <div class="col-span-1 text-center">Status</div>
              <div class="col-span-1 text-center">Ações</div>
            </div>

            <!-- Virtual Scroll Viewport — itemSize=48 matches h-12 (3rem) row height -->
            <cdk-virtual-scroll-viewport
              itemSize="48"
              class="h-[600px] w-full overflow-y-auto"
              style="contain: strict;"
            >
              <div
                *cdkVirtualFor="let item of inventoryStore.items(); trackBy: trackByItemId"
                class="grid grid-cols-12 gap-4 px-4 py-2 h-12 border-b border-border-subtle/60 hover:bg-canvas-elevated text-xs items-center transition-colors"
              >
                <!-- SKU — monospaced per spec -->
                <div class="col-span-2 font-mono font-medium text-brand truncate" [title]="item.sku">
                  {{ item.sku }}
                </div>

                <!-- Product Name -->
                <div class="col-span-3 font-medium text-content-primary truncate" [title]="item.name">
                  {{ item.name }}
                </div>

                <!-- Category -->
                <div class="col-span-2 text-content-muted truncate">
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

  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly FilterIcon = Filter;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly Edit2Icon = Edit2;
  protected readonly Trash2Icon = Trash2;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly PackageXIcon = PackageX;
  protected readonly AlertCircleIcon = AlertCircle;

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
  }

  protected trackByItemId(_index: number, item: InventoryItem): string {
    return item.id;
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

  protected async deleteItem(item: InventoryItem): Promise<void> {
    if (confirm(`Tem certeza de que deseja remover "${item.name}"?`)) {
      await this.inventoryStore.deleteItem(item.id);
      this.toastService.warning(
        'Produto Removido',
        `O item "${item.name}" foi excluído da base.`
      );
    }
  }
}
