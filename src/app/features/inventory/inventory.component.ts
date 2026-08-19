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
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Gestão de Estoque Multi-Armazém
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Controle integrado de inventário reativo em tempo real via Dexie.js (Virtual Scroll @angular/cdk)
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="reloadItems()"
            class="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Atualizar dados localmente"
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
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-colors"
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
      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <!-- Debounced Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchInputChange($event)"
            placeholder="Buscar por nome do produto ou SKU (com debounce 300ms)..."
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            aria-label="Buscar produtos em estoque"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-3">
          <select
            [ngModel]="selectedCategory()"
            (ngModelChange)="onCategoryChange($event)"
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
              class="px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              Limpar Filtros
            </button>
          }
        </div>
      </div>

      <!-- 4 STATES PATTERN CONTAINER -->
      <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <!-- 1. ERROR STATE -->
        @if (inventoryStore.error()) {
          <div class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-rose-300">
            <div class="flex items-center gap-3">
              <lucide-icon [img]="AlertCircleIcon" [size]="20" class="text-rose-400 shrink-0" />
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider">Falha no Carregamento</h4>
                <p class="text-xs text-rose-400 mt-0.5">{{ inventoryStore.error() }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="reloadItems()"
              class="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium text-xs hover:bg-rose-600 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        }

        <!-- 2. LOADING STATE (Skeleton) -->
        @else if (inventoryStore.loading()) {
          <div class="space-y-3" aria-live="polite">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800">
              <span class="text-xs font-semibold text-slate-400">Carregando inventário...</span>
            </div>
            <app-skeleton-loader [count]="6" height="2.5rem" />
          </div>
        }

        <!-- 3. EMPTY STATE -->
        @else if (inventoryStore.items().length === 0) {
          <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
              <lucide-icon [img]="PackageXIcon" [size]="32" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100">Nenhum produto encontrado</h3>
              <p class="text-xs text-slate-400 mt-1 max-w-sm">
                Não existem itens que coincidam com os filtros aplicados ou a base de estoque está vazia.
              </p>
            </div>
            <button
              type="button"
              (click)="clearFilters()"
              class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Restaurar Filtros de Busca
            </button>
          </div>
        }

        <!-- 4. SUCCESS / DATA STATE (Virtual Scroll Viewport @angular/cdk) -->
        @else {
          <div class="flex flex-col space-y-2">
            <!-- Table Header -->
            <div class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider text-[11px]">
              <div class="col-span-2">SKU</div>
              <div class="col-span-3">Produto</div>
              <div class="col-span-2">Categoria</div>
              <div class="col-span-1 text-right">Qtd</div>
              <div class="col-span-2 text-right">Preço Unit.</div>
              <div class="col-span-1 text-center">Status</div>
              <div class="col-span-1 text-center">Ações</div>
            </div>

            <!-- Virtual Scroll Viewport for high-density rendering -->
            <cdk-virtual-scroll-viewport
              itemSize="52"
              class="h-[440px] w-full custom-scrollbar"
            >
              <div
                *cdkVirtualFor="let item of inventoryStore.items(); trackBy: trackByItemId"
                class="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/40 text-xs items-center transition-colors"
              >
                <!-- SKU -->
                <div class="col-span-2 font-mono font-medium text-indigo-400 truncate">
                  {{ item.sku }}
                </div>

                <!-- Product Name -->
                <div class="col-span-3 font-medium text-slate-100 truncate" [title]="item.name">
                  {{ item.name }}
                </div>

                <!-- Category -->
                <div class="col-span-2 text-slate-400 truncate">
                  {{ item.category }}
                </div>

                <!-- Quantity -->
                <div class="col-span-1 text-right font-medium text-slate-200">
                  {{ item.quantity }}
                </div>

                <!-- Price -->
                <div class="col-span-2 text-right text-slate-300 font-mono">
                  R$ {{ item.unitPrice | number:'1.2-2':'pt-BR' }}
                </div>

                <!-- Status -->
                <div class="col-span-1 text-center">
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
                    class="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    title="Editar item"
                  >
                    <lucide-icon [img]="Edit2Icon" [size]="15" />
                  </button>

                  <button
                    type="button"
                    (click)="deleteItem(item)"
                    class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remover item"
                  >
                    <lucide-icon [img]="Trash2Icon" [size]="15" />
                  </button>
                </div>
              </div>
            </cdk-virtual-scroll-viewport>

            <!-- Table Footer Stats -->
            <div class="flex items-center justify-between pt-3 text-xs text-slate-400 border-t border-slate-800/80 px-2">
              <span>Exibindo {{ inventoryStore.items().length }} de {{ inventoryStore.totalItems() }} produtos</span>
              <span class="font-mono text-[11px] text-slate-500">Virtual Scroll CDK Activo • 60 FPS</span>
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
