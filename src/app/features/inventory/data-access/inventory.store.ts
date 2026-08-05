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
  error: string | null;
  filters: InventoryFilter;
}

const initialState: InventoryState = {
  items: [],
  totalItems: 0,
  loading: false,
  error: null,
  filters: DEFAULT_INVENTORY_FILTER,
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
    lowStockCount: computed(() =>
      store.items().filter(
        (item) =>
          item.status === 'LOW_STOCK' || item.quantity <= item.minThreshold
      ).length
    ),

    totalStockValue: computed(() =>
      store.items().reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )
    ),

    hasActiveFilters: computed(() => {
      const filters = store.filters();
      return (
        filters.search !== '' ||
        filters.category !== null ||
        filters.status !== null
      );
    }),
  })),

  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      async loadItems(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const params = buildHttpParams(store.filters());
          const response = await firstValueFrom(
            http.get<PaginatedResponse<InventoryItem>>(API_URL, { params })
          );

          patchState(store, {
            items: response.data,
            totalItems: response.totalItems,
            loading: false,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao carregar itens do estoque.';
          patchState(store, { error: message, loading: false });
        }
      },

      async setFilters(partialFilters: Partial<InventoryFilter>): Promise<void> {
        patchState(store, {
          filters: { ...store.filters(), ...partialFilters, page: partialFilters.page ?? 1 },
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

      resetFilters(): void {
        patchState(store, { filters: DEFAULT_INVENTORY_FILTER });
      },
    };
  }),

  withHooks({
    onInit(store) {
      store.loadItems();
    },
  })
);
