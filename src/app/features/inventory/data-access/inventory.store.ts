import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { InventoryApi } from '@/core/api/inventory.api';
import {
  DEFAULT_INVENTORY_FILTER,
  deriveInventoryStatus,
  type CreateInventoryItem,
  type InventoryFilter,
  type InventoryItem,
  type InventorySummary,
  type UpdateInventoryItem,
} from '@/core/models/inventory.model';
import type {
  StockMovementInput,
  StockMovementResult,
} from '@/core/models/stock-movement.model';

interface InventoryState {
  items: readonly InventoryItem[];
  totalItems: number;
  loading: boolean;
  loadingMore: boolean;
  saving: boolean;
  error: string | null;
  filters: InventoryFilter;
  summary: InventorySummary | null;
  summaryLoading: boolean;
  selectedIds: readonly string[];
  hasMore: boolean;
}

const initialState: InventoryState = {
  items: [],
  totalItems: 0,
  loading: false,
  loadingMore: false,
  saving: false,
  error: null,
  filters: DEFAULT_INVENTORY_FILTER,
  summary: null,
  summaryLoading: false,
  selectedIds: [],
  hasMore: true,
};

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function sortItems(
  items: readonly InventoryItem[],
  sortBy: keyof InventoryItem,
  sortOrder: 'asc' | 'desc'
): InventoryItem[] {
  return [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const comparison =
      aValue instanceof Date && bValue instanceof Date
        ? aValue.getTime() - bValue.getTime()
        : typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue ?? '').localeCompare(String(bValue ?? ''), 'pt-BR');
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

export const InventoryStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    hasActiveFilters: computed(() => {
      const filters = store.filters();
      return (
        filters.search !== '' ||
        filters.category !== null ||
        filters.status !== null ||
        filters.warehouseId !== null
      );
    }),

    activeFilterCount: computed(() => {
      const filters = store.filters();
      return [filters.search !== '', filters.category !== null, filters.status !== null, filters.warehouseId !== null].filter(
        Boolean
      ).length;
    }),

    isEmpty: computed(() => !store.loading() && store.totalItems() === 0),
    isFilteredEmpty: computed(
      () => {
        const filters = store.filters();
        const hasFilters =
          filters.search !== '' ||
          filters.category !== null ||
          filters.status !== null ||
          filters.warehouseId !== null;
        return !store.loading() && store.totalItems() === 0 && hasFilters;
      }
    ),

    lowStockCount: computed(() => store.summary()?.lowStockCount ?? 0),
    totalStockValue: computed(() => store.summary()?.totalStockValue ?? 0),
    totalUnits: computed(() => store.summary()?.totalUnits ?? 0),
    outOfStockCount: computed(() => store.summary()?.outOfStockCount ?? 0),
    movementsLast30Days: computed(() => store.summary()?.movementsLast30Days ?? 0),
    lastMovementAt: computed(() => store.summary()?.lastMovementAt ?? null),

    isAllSelected: computed(() => {
      const items = store.items();
      const selected = store.selectedIds();
      return items.length > 0 && items.every((item) => selected.includes(item.id));
    }),

    selectionCount: computed(() => store.selectedIds().length),
    hasMoreItems: computed(() => store.hasMore()),
    selectedItems: computed(() => {
      const selected = new Set(store.selectedIds());
      return store.items().filter((item) => selected.has(item.id));
    }),
  })),

  withMethods((store) => {
    const api = inject(InventoryApi);
    let listRequestId = 0;
    let summaryRequestId = 0;

    const upsertSummaryItem = (item: InventoryItem): void => {
      patchState(store, {
        items: store.items().map((candidate) => (candidate.id === item.id ? item : candidate)),
      });
    };

    return {
      async loadItems(): Promise<void> {
        const requestId = ++listRequestId;
        patchState(store, { loading: true, loadingMore: false, error: null });
        try {
          const response = await api.list({ ...store.filters(), page: 1 });
          if (requestId !== listRequestId) return;
          patchState(store, {
            items: response.data,
            totalItems: response.totalItems,
            loading: false,
            selectedIds: [],
            hasMore: response.hasNextPage,
            filters: { ...store.filters(), page: 1 },
          });
        } catch (error: unknown) {
          if (requestId !== listRequestId) return;
          patchState(store, {
            error: messageFrom(error, 'Erro ao carregar itens do estoque.'),
            loading: false,
          });
        }
      },

      async loadMoreItems(): Promise<void> {
        if (store.loadingMore() || !store.hasMore()) return;
        const requestId = ++listRequestId;
        const nextPage = store.filters().page + 1;
        patchState(store, { loadingMore: true, error: null });
        try {
          const response = await api.list({ ...store.filters(), page: nextPage });
          if (requestId !== listRequestId) return;
          patchState(store, {
            items: [...store.items(), ...response.data],
            totalItems: response.totalItems,
            filters: { ...store.filters(), page: nextPage },
            loadingMore: false,
            hasMore: response.hasNextPage,
          });
        } catch (error: unknown) {
          if (requestId !== listRequestId) return;
          patchState(store, {
            error: messageFrom(error, 'Erro ao carregar mais itens.'),
            loadingMore: false,
          });
        }
      },

      async loadSummary(): Promise<void> {
        const requestId = ++summaryRequestId;
        patchState(store, { summaryLoading: true });
        try {
          const summary = await api.summary();
          if (requestId !== summaryRequestId) return;
          patchState(store, { summary, summaryLoading: false });
        } catch {
          if (requestId !== summaryRequestId) return;
          patchState(store, { summaryLoading: false });
        }
      },

      async load(): Promise<void> {
        await Promise.all([this.loadItems(), this.loadSummary()]);
      },

      async refresh(): Promise<void> {
        await this.load();
      },

      async fetchAllFiltered(): Promise<InventoryItem[]> {
        const response = await api.list({ ...store.filters(), page: 1, limit: 1000 });
        return [...response.data];
      },

      async setFilters(partial: Partial<InventoryFilter>): Promise<void> {
        patchState(store, {
          filters: { ...store.filters(), ...partial, page: 1 },
          selectedIds: [],
          hasMore: true,
        });
        await this.loadItems();
      },

      async resetFilters(): Promise<void> {
        patchState(store, {
          filters: DEFAULT_INVENTORY_FILTER,
          selectedIds: [],
          hasMore: true,
        });
        await this.loadItems();
      },

      async setSortBy(column: keyof InventoryItem): Promise<void> {
        const current = store.filters();
        const sortOrder =
          current.sortBy === column && current.sortOrder === 'asc' ? 'desc' : 'asc';
        patchState(store, {
          filters: { ...current, sortBy: column, sortOrder, page: 1 },
        });
        await this.loadItems();
      },

      async addItem(input: CreateInventoryItem): Promise<InventoryItem> {
        patchState(store, { saving: true, error: null });
        try {
          const item = await api.create(input);
          patchState(store, { saving: false });
          await this.load();
          return item;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao criar produto.'),
          });
          throw error;
        }
      },

      async updateItem(id: string, input: UpdateInventoryItem): Promise<InventoryItem> {
        patchState(store, { saving: true, error: null });
        try {
          const item = await api.update(id, input);
          patchState(store, { saving: false });
          upsertSummaryItem(item);
          await this.loadSummary();
          return item;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao atualizar produto.'),
          });
          throw error;
        }
      },

      /**
       * Compatibility shim for the legacy component: removes immediately and
       * delegates rollback to deleteItem(). New code should call deleteItem().
       */
      optimisticDeleteItem(id: string): InventoryItem | undefined {
        const item = store.items().find((candidate) => candidate.id === id);
        if (!item) return undefined;
        void this.deleteItem(id).catch(() => undefined);
        return item;
      },

      async deleteItem(id: string): Promise<InventoryItem> {
        const item = store.items().find((candidate) => candidate.id === id);
        if (!item) throw new Error('Produto não encontrado na lista.');

        patchState(store, {
          items: store.items().filter((candidate) => candidate.id !== id),
          totalItems: Math.max(0, store.totalItems() - 1),
          selectedIds: store.selectedIds().filter((selectedId) => selectedId !== id),
        });

        try {
          await api.remove(id);
          await this.loadSummary();
          return item;
        } catch (error: unknown) {
          patchState(store, {
            items: sortItems(
              [...store.items(), item],
              store.filters().sortBy,
              store.filters().sortOrder
            ),
            totalItems: store.totalItems() + 1,
            error: messageFrom(error, 'Não foi possível excluir o produto.'),
          });
          throw error;
        }
      },

      async restoreItem(item: InventoryItem): Promise<void> {
        if (!store.items().some((candidate) => candidate.id === item.id)) {
          patchState(store, {
            items: sortItems(
              [...store.items(), item],
              store.filters().sortBy,
              store.filters().sortOrder
            ),
            totalItems: store.totalItems() + 1,
          });
        }

        try {
          await api.restore(item);
          await this.loadSummary();
        } catch (error: unknown) {
          patchState(store, {
            items: store.items().filter((candidate) => candidate.id !== item.id),
            totalItems: Math.max(0, store.totalItems() - 1),
            error: messageFrom(error, 'Não foi possível desfazer a exclusão.'),
          });
          throw error;
        }
      },

      async bulkDeleteSelected(): Promise<{ deleted: InventoryItem[]; failed: number }> {
        const selected = new Set(store.selectedIds());
        const candidates = store.items().filter((item) => selected.has(item.id));
        if (candidates.length === 0) return { deleted: [], failed: 0 };

        patchState(store, {
          items: store.items().filter((item) => !selected.has(item.id)),
          totalItems: Math.max(0, store.totalItems() - candidates.length),
          selectedIds: [],
        });

        const results = await Promise.allSettled(
          candidates.map((item) => api.remove(item.id))
        );
        const deleted = candidates.filter((_, index) => results[index].status === 'fulfilled');
        const failed = candidates.length - deleted.length;

        if (failed > 0) {
          await this.load();
          return { deleted, failed };
        }

        await this.loadSummary();
        return { deleted, failed: 0 };
      },

      async restoreMany(items: readonly InventoryItem[]): Promise<number> {
        const results = await Promise.allSettled(items.map((item) => api.restore(item)));
        const failed = results.filter((result) => result.status === 'rejected').length;
        await this.load();
        return failed;
      },

      async recordMovement(
        itemId: string,
        input: StockMovementInput
      ): Promise<StockMovementResult> {
        patchState(store, { saving: true, error: null });
        try {
          const result = await api.addMovement(itemId, input);
          patchState(store, { saving: false });
          upsertSummaryItem(result.item);
          await this.loadSummary();
          return result;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao registrar movimentação.'),
          });
          throw error;
        }
      },

      toggleSelection(id: string): void {
        const selected = store.selectedIds();
        patchState(store, {
          selectedIds: selected.includes(id)
            ? selected.filter((candidate) => candidate !== id)
            : [...selected, id],
        });
      },

      selectAllLoaded(): void {
        patchState(store, { selectedIds: store.items().map((item) => item.id) });
      },

      selectAll(): void {
        this.selectAllLoaded();
      },

      toggleSelect(id: string): void {
        this.toggleSelection(id);
      },

      clearSelection(): void {
        patchState(store, { selectedIds: [] });
      },

      derivedStatus(item: Pick<InventoryItem, 'quantity' | 'minThreshold'>): InventoryItem['status'] {
        return deriveInventoryStatus(item.quantity, item.minThreshold);
      },
    };
  }),

  withHooks({
    onInit(store) {
      void store.load();
    },
  })
);
