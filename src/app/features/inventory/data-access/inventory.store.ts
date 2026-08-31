import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
  patchState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_INVENTORY_FILTER,
  type InventoryFilter,
  type InventoryItem,
} from '@/core/models/inventory.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

const API_URL = '/api/v1/inventory';

interface InventoryState {
  items: readonly InventoryItem[];
  totalItems: number;
  loading: boolean;
  /** True while loadMoreItems() is fetching the next page */
  loadingMore: boolean;
  error: string | null;
  filters: InventoryFilter;
  summaryStats: {
    lowStockCount: number;
    totalStockValue: number;
  } | null;
  /** IDs currently selected for bulk actions */
  selectedIds: readonly string[];
  /** Whether more pages are available for infinite scroll */
  hasMoreItems: boolean;
  /** Current infinite-scroll page cursor (separate from filters.page) */
  infinitePage: number;
}

const initialState: InventoryState = {
  items: [],
  totalItems: 0,
  loading: false,
  loadingMore: false,
  error: null,
  filters: DEFAULT_INVENTORY_FILTER,
  summaryStats: null,
  selectedIds: [],
  hasMoreItems: true,
  infinitePage: 1,
};

function buildHttpParams(filters: InventoryFilter): HttpParams {
  let params = new HttpParams()
    .set('page', filters.page.toString())
    .set('limit', filters.limit.toString())
    .set('sortBy', filters.sortBy)
    .set('sortOrder', filters.sortOrder);

  if (filters.search) {
    params = params.set('search', filters.search);
  }
  if (filters.category) {
    params = params.set('category', filters.category);
  }
  if (filters.status) {
    params = params.set('status', filters.status);
  }

  return params;
}

export const InventoryStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    lowStockCount: computed(() => {
      const summary = store.summaryStats();
      if (summary !== null) {
        return summary.lowStockCount;
      }
      return store
        .items()
        .filter(
          (item) =>
            item.status === 'LOW_STOCK' || item.quantity <= item.minThreshold
        ).length;
    }),

    totalStockValue: computed(() => {
      const summary = store.summaryStats();
      if (summary !== null) {
        return summary.totalStockValue;
      }
      return store
        .items()
        .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }),

    hasActiveFilters: computed(() => {
      const filters = store.filters();
      return (
        filters.search !== '' ||
        filters.category !== null ||
        filters.status !== null
      );
    }),

    /** Whether ALL visible items are selected */
    isAllSelected: computed(() => {
      const items = store.items();
      const selected = store.selectedIds();
      return items.length > 0 && items.every((i) => selected.includes(i.id));
    }),

    /** Number of currently selected items */
    selectionCount: computed(() => store.selectedIds().length),
  })),

  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      async loadItems(): Promise<void> {
        patchState(store, { loading: true, error: null, infinitePage: 1 });

        try {
          const params = buildHttpParams(store.filters());
          const response = await firstValueFrom(
            http.get<PaginatedResponse<InventoryItem>>(API_URL, { params })
          );

          const summaryStats = response.summary
            ? {
                lowStockCount: response.summary['lowStockCount'] ?? 0,
                totalStockValue: response.summary['totalStockValue'] ?? 0,
              }
            : null;

          patchState(store, {
            items: response.data,
            totalItems: response.totalItems,
            loading: false,
            summaryStats,
            selectedIds: [],
            hasMoreItems: response.hasNextPage,
            infinitePage: 1,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao carregar itens do estoque.';
          patchState(store, { error: message, loading: false });
        }
      },

      /** Appends the next page of items to the existing list (infinite scroll). */
      async loadMoreItems(): Promise<void> {
        if (store.loadingMore() || !store.hasMoreItems()) return;

        const nextPage = store.infinitePage() + 1;
        patchState(store, { loadingMore: true });

        try {
          const params = buildHttpParams({ ...store.filters(), page: nextPage });
          const response = await firstValueFrom(
            http.get<PaginatedResponse<InventoryItem>>(API_URL, { params })
          );

          patchState(store, {
            items: [...store.items(), ...response.data],
            totalItems: response.totalItems,
            loadingMore: false,
            hasMoreItems: response.hasNextPage,
            infinitePage: nextPage,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao carregar mais itens.';
          patchState(store, { error: message, loadingMore: false });
        }
      },

      async setFilters(partialFilters: Partial<InventoryFilter>): Promise<void> {
        const safeFilters = partialFilters || {};
        patchState(store, {
          filters: { ...store.filters(), ...safeFilters, page: safeFilters.page ?? 1 },
          hasMoreItems: true,
          infinitePage: 1,
        });
        await this.loadItems();
      },

      async addItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          await firstValueFrom(
            http.post<InventoryItem>(API_URL, item)
          );
          await this.loadItems();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao adicionar item.';
          patchState(store, { error: message, loading: false });
        }
      },

      async updateItem(
        id: string,
        changes: Partial<InventoryItem>
      ): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          await firstValueFrom(
            http.put<InventoryItem>(`${API_URL}/${id}`, changes)
          );
          await this.loadItems();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao atualizar item.';
          patchState(store, { error: message, loading: false });
        }
      },

      /**
       * Optimistic delete: removes the item from UI immediately,
       * then performs the actual HTTP request.
       * Returns the removed item so the caller can restore it on undo.
       */
      optimisticDeleteItem(id: string): InventoryItem | undefined {
        const item = store.items().find((i) => i.id === id);
        if (!item) return undefined;

        // Immediately remove from the UI
        patchState(store, {
          items: store.items().filter((i) => i.id !== id),
          totalItems: store.totalItems() - 1,
          selectedIds: store.selectedIds().filter((sid) => sid !== id),
        });

        // Fire-and-forget the HTTP call; errors are logged to console
        firstValueFrom(http.delete(`${API_URL}/${id}`)).catch((err: unknown) => {
          console.error('Falha ao remover item na API:', err);
        });

        return item;
      },

      /** Restores a previously deleted item (undo operation). */
      restoreItem(item: InventoryItem): void {
        patchState(store, {
          items: [item, ...store.items()],
          totalItems: store.totalItems() + 1,
        });
        // Re-add to the database via POST
        firstValueFrom(http.post<InventoryItem>(API_URL, item)).catch((err: unknown) => {
          console.error('Falha ao restaurar item na API:', err);
        });
      },

      async deleteItem(id: string): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          await firstValueFrom(
            http.delete(`${API_URL}/${id}`)
          );
          await this.loadItems();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao remover item.';
          patchState(store, { error: message, loading: false });
        }
      },

      /** Deletes all currently selected items (bulk delete). */
      async bulkDeleteSelected(): Promise<void> {
        const ids = [...store.selectedIds()];
        if (ids.length === 0) return;

        patchState(store, {
          items: store.items().filter((i) => !ids.includes(i.id)),
          totalItems: store.totalItems() - ids.length,
          selectedIds: [],
        });

        await Promise.all(
          ids.map((id) =>
            firstValueFrom(http.delete(`${API_URL}/${id}`)).catch((err: unknown) => {
              console.error(`Falha ao remover item ${id}:`, err);
            })
          )
        );
      },

      resetFilters(): void {
        patchState(store, { filters: DEFAULT_INVENTORY_FILTER });
      },

      // ─── Sorting ──────────────────────────────────────────────

      setSortBy(column: keyof InventoryItem): void {
        const current = store.filters();
        const newOrder =
          current.sortBy === column && current.sortOrder === 'asc' ? 'desc' : 'asc';
        patchState(store, {
          filters: { ...current, sortBy: column, sortOrder: newOrder, page: 1 },
        });
      },

      // ─── Bulk Selection ────────────────────────────────────────

      toggleSelect(id: string): void {
        const current = store.selectedIds();
        const updated = current.includes(id)
          ? current.filter((sid) => sid !== id)
          : [...current, id];
        patchState(store, { selectedIds: updated });
      },

      selectAll(): void {
        const allIds = store.items().map((i) => i.id);
        const isAllSelected = allIds.every((id) => store.selectedIds().includes(id));
        patchState(store, { selectedIds: isAllSelected ? [] : allIds });
      },

      clearSelection(): void {
        patchState(store, { selectedIds: [] });
      },
    };
  }),

  withHooks({
    onInit(store) {
      store.loadItems();
    },
  })
);
