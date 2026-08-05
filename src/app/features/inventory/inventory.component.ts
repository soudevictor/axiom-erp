import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, Search, Filter, RefreshCw } from 'lucide-angular';
import { InventoryStore } from './data-access/inventory.store';
import { StatCardComponent } from '@/shared/ui/stat-card/stat-card.component';
import { BadgeComponent } from '@/shared/ui/badge/badge.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';
import { ToastService } from '@/shared/ui/toast/toast.service';
import type { InventoryCategory, InventoryStatus } from '@/core/models/inventory.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    StatCardComponent,
    BadgeComponent,
    SkeletonLoaderComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Top Action Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100 tracking-tight">
            Gestão de Estoque Multi-Armazém
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Controle integrado de inventário, reposição e movimentação de SKUs
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="reloadItems()"
            class="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Atualizar dados"
          >
            <lucide-icon [img]="RefreshCwIcon" [size]="18" [ngClass]="{ 'animate-spin': inventoryStore.loading() }" />
          </button>

          <button
            type="button"
            (click)="openNewProductModal()"
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
          subtitle="Itens catalogados na base"
          iconName="Package"
        />

        <app-stat-card
          title="Itens Baixo Estoque"
          [value]="inventoryStore.lowStockCount()"
          subtitle="Exigem ordem de compra"
          iconName="AlertTriangle"
        />

        <app-stat-card
          title="Valor Total em Estoque"
          [value]="'R$ ' + (inventoryStore.totalStockValue() | number:'1.2-2':'pt-BR')"
          subtitle="Avaliação de ativos"
          iconName="Wallet"
        />
      </div>

      <!-- Filter Controls Bar -->
      <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <lucide-icon [img]="SearchIcon" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar por nome do produto ou SKU..."
            class="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <!-- Filter Selects -->
        <div class="flex flex-wrap items-center gap-3">
          <select
            [ngModel]="selectedCategory"
            (ngModelChange)="onCategoryChange($event)"
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option [ngValue]="null">Todas as Categorias</option>
            <option value="ELECTRONICS">Eletrônicos</option>
            <option value="HARDWARE">Hardware</option>
            <option value="LOGISTICS">Logística</option>
            <option value="OFFICE">Escritório</option>
          </select>

          <select
            [ngModel]="selectedStatus"
            (ngModelChange)="onStatusChange($event)"
            class="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option [ngValue]="null">Todos os Status</option>
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

      <!-- Main Data Table Container (Virtual Scroll in Phase 3) -->
      <div class="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md min-h-[320px]">
        @if (inventoryStore.loading()) {
          <app-skeleton-loader [count]="5" height="2.5rem" />
        } @else if (inventoryStore.items().length === 0) {
          <div class="py-12 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
              <lucide-icon [img]="FilterIcon" [size]="24" />
            </div>
            <h3 class="text-sm font-semibold text-slate-200">Nenhum item encontrado</h3>
            <p class="text-xs text-slate-400 mt-1 max-w-sm">
              Tente alterar os termos de busca ou remover os filtros aplicados.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider">
                  <th class="py-3 px-4">SKU</th>
                  <th class="py-3 px-4">Produto</th>
                  <th class="py-3 px-4">Categoria</th>
                  <th class="py-3 px-4">Armazém</th>
                  <th class="py-3 px-4 text-right">Qtd</th>
                  <th class="py-3 px-4 text-right">Preço Unit.</th>
                  <th class="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-slate-300">
                @for (item of inventoryStore.items(); track item.id) {
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-4 font-mono font-medium text-indigo-400">{{ item.sku }}</td>
                    <td class="py-3 px-4 font-medium text-slate-100">{{ item.name }}</td>
                    <td class="py-3 px-4 text-slate-400">{{ item.category }}</td>
                    <td class="py-3 px-4 text-slate-400">{{ item.warehouseId }}</td>
                    <td class="py-3 px-4 text-right font-medium">{{ item.quantity }}</td>
                    <td class="py-3 px-4 text-right">R$ {{ item.unitPrice | number:'1.2-2':'pt-BR' }}</td>
                    <td class="py-3 px-4 text-center">
                      @switch (item.status) {
                        @case ('IN_STOCK') {
                          <app-badge variant="SUCCESS" label="EM ESTOQUE" />
                        }
                        @case ('LOW_STOCK') {
                          <app-badge variant="WARNING" label="ESTOQUE BAIXO" />
                        }
                        @case ('OUT_OF_STOCK') {
                          <app-badge variant="DANGER" label="SEM ESTOQUE" />
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent implements OnInit {
  protected readonly inventoryStore = inject(InventoryStore);
  private readonly toastService = inject(ToastService);

  protected readonly PlusIcon = Plus;
  protected readonly SearchIcon = Search;
  protected readonly FilterIcon = Filter;
  protected readonly RefreshCwIcon = RefreshCw;

  protected searchQuery: string = '';
  protected selectedCategory: InventoryCategory | null = null;
  protected selectedStatus: InventoryStatus | null = null;

  ngOnInit(): void {
    if (this.inventoryStore.items().length === 0) {
      this.inventoryStore.loadItems();
    }
  }

  protected reloadItems(): void {
    this.inventoryStore.loadItems();
    this.toastService.info('Estoque', 'Dados atualizados do banco local Dexie.');
  }

  protected onSearchChange(search: string): void {
    this.inventoryStore.setFilters({ search, page: 1 });
  }

  protected onCategoryChange(category: InventoryCategory | null): void {
    this.selectedCategory = category;
    this.inventoryStore.setFilters({ category, page: 1 });
  }

  protected onStatusChange(status: InventoryStatus | null): void {
    this.selectedStatus = status;
    this.inventoryStore.setFilters({ status, page: 1 });
  }

  protected clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.selectedStatus = null;
    this.inventoryStore.resetFilters();
    this.inventoryStore.loadItems();
  }

  protected openNewProductModal(): void {
    this.toastService.info(
      'Cadastro de Produto',
      'O modal com formulário estrito Zod e validações será disponibilizado na próxima fase.'
    );
  }
}
