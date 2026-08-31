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
  DEFAULT_TREASURY_FILTER,
  type TransactionStatus,
  type TreasuryFilter,
  type TreasuryTransaction,
} from '@/core/models/treasury.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

const API_URL = '/api/v1/treasury';
const SUMMARY_URL = '/api/v1/treasury/summary';

interface TreasuryState {
  transactions: readonly TreasuryTransaction[];
  totalItems: number;
  loading: boolean;
  /** True while loadMoreItems() fetches next page */
  loadingMore: boolean;
  error: string | null;
  filters: TreasuryFilter;
  summaryStats: {
    totalReceivables: number;
    totalPayables: number;
    totalBalance: number;
  } | null;
  aging: {
    overdue: TreasuryTransaction[];
    today: TreasuryTransaction[];
    next7: TreasuryTransaction[];
    next30: TreasuryTransaction[];
  } | null;
  /** Whether more pages are available for infinite scroll */
  hasMoreItems: boolean;
  /** Current infinite-scroll page cursor */
  infinitePage: number;
}

const initialState: TreasuryState = {
  transactions: [],
  totalItems: 0,
  loading: false,
  loadingMore: false,
  error: null,
  filters: DEFAULT_TREASURY_FILTER,
  summaryStats: null,
  aging: null,
  hasMoreItems: true,
  infinitePage: 1,
};

function buildHttpParams(filters: TreasuryFilter): HttpParams {
  let params = new HttpParams()
    .set('page', filters.page.toString())
    .set('limit', filters.limit.toString())
    .set('sortBy', filters.sortBy)
    .set('sortOrder', filters.sortOrder);

  if (filters.search) {
    params = params.set('search', filters.search);
  }
  if (filters.type && filters.type !== 'ALL') {
    params = params.set('type', filters.type);
  }
  if (filters.status && filters.status !== 'ALL') {
    params = params.set('status', filters.status);
  }
  if (filters.category && filters.category !== 'ALL') {
    params = params.set('category', filters.category);
  }

  return params;
}

export const TreasuryStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    totalReceivables: computed(() => {
      const summary = store.summaryStats();
      if (summary !== null) {
        return summary.totalReceivables;
      }
      return store
        .transactions()
        .filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED')
        .reduce((sum, t) => sum + t.amount, 0);
    }),

    totalPayables: computed(() => {
      const summary = store.summaryStats();
      if (summary !== null) {
        return summary.totalPayables;
      }
      return store
        .transactions()
        .filter((t) => t.type === 'EXPENSE' && t.status !== 'CANCELLED')
        .reduce((sum, t) => sum + t.amount, 0);
    }),

    totalBalance: computed(() => {
      const summary = store.summaryStats();
      if (summary !== null) {
        return summary.totalBalance;
      }
      const income = store
        .transactions()
        .filter((t) => t.type === 'INCOME' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = store
        .transactions()
        .filter((t) => t.type === 'EXPENSE' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0);

      return income - expense;
    }),

    pendingCount: computed(() =>
      store.transactions().filter((t) => t.status === 'PENDING').length
    ),

    hasActiveFilters: computed(() => {
      const f = store.filters();
      return (
        f.search !== '' ||
        f.type !== 'ALL' ||
        f.status !== 'ALL' ||
        f.category !== 'ALL'
      );
    }),
  })),

  withMethods((store) => {
    const http = inject(HttpClient);

    return {
      /**
       * Loads global KPI summary from ALL transactions (unpaginated).
       * Decoupled from the paginated transaction list so KPIs are always accurate.
       */
      async loadSummary(): Promise<void> {
        try {
          const summary = await firstValueFrom(
            http.get<{
              totalReceivables: number;
              totalPayables: number;
              totalBalance: number;
              totalItems: number;
              aging: {
                overdue: TreasuryTransaction[];
                today: TreasuryTransaction[];
                next7: TreasuryTransaction[];
                next30: TreasuryTransaction[];
              };
            }>(SUMMARY_URL)
          );

          patchState(store, {
            summaryStats: {
              totalReceivables: summary.totalReceivables,
              totalPayables: summary.totalPayables,
              totalBalance: summary.totalBalance,
            },
            aging: summary.aging,
            totalItems: summary.totalItems,
          });
        } catch {
          // Summary fetch failure is non-blocking; computed signals will fallback
        }
      },

      async loadTransactions(): Promise<void> {
        patchState(store, { loading: true, error: null, infinitePage: 1 });

        try {
          const params = buildHttpParams(store.filters());
          const response = await firstValueFrom(
            http.get<PaginatedResponse<TreasuryTransaction>>(API_URL, { params })
          );

          const summaryStats = response.summary
            ? {
                totalReceivables: response.summary['totalReceivables'] ?? 0,
                totalPayables: response.summary['totalPayables'] ?? 0,
                totalBalance: response.summary['totalBalance'] ?? 0,
              }
            : null;

          patchState(store, {
            transactions: response.data,
            totalItems: response.totalItems,
            loading: false,
            summaryStats,
            hasMoreItems: response.hasNextPage,
            infinitePage: 1,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'Erro ao carregar transações financeiras.';
          patchState(store, { error: message, loading: false });
        }
      },

      /** Appends the next page to existing transactions (infinite scroll). */
      async loadMoreItems(): Promise<void> {
        if (store.loadingMore() || !store.hasMoreItems()) return;

        const nextPage = store.infinitePage() + 1;
        patchState(store, { loadingMore: true });

        try {
          const params = buildHttpParams({ ...store.filters(), page: nextPage });
          const response = await firstValueFrom(
            http.get<PaginatedResponse<TreasuryTransaction>>(API_URL, { params })
          );

          patchState(store, {
            transactions: [...store.transactions(), ...response.data],
            totalItems: response.totalItems,
            loadingMore: false,
            hasMoreItems: response.hasNextPage,
            infinitePage: nextPage,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao carregar mais transações.';
          patchState(store, { error: message, loadingMore: false });
        }
      },

      async setFilters(partialFilters: Partial<TreasuryFilter>): Promise<void> {
        const safeFilters = partialFilters || {};
        patchState(store, {
          filters: {
            ...store.filters(),
            ...safeFilters,
            page: safeFilters.page ?? 1,
          },
          hasMoreItems: true,
          infinitePage: 1,
        });
        await this.loadTransactions();
      },

      async addTransaction(
        tx: Omit<TreasuryTransaction, 'id'>
      ): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          await firstValueFrom(
            http.post<TreasuryTransaction>(API_URL, tx)
          );
          // Reload to get the full updated list with server-assigned ID, ordered correctly
          await this.loadTransactions();
          await this.loadSummary();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Erro ao cadastrar transação.';
          patchState(store, { error: message, loading: false });
        }
      },

      async updateTransactionStatus(
        id: string,
        status: TransactionStatus
      ): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const paymentDate =
            status === 'COMPLETED' ? new Date().toISOString() : undefined;

          await firstValueFrom(
            http.put<TreasuryTransaction>(`${API_URL}/${id}`, {
              status,
              paymentDate,
            })
          );
          await this.loadTransactions();
          await this.loadSummary();
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'Erro ao atualizar status da transação.';
          patchState(store, { error: message, loading: false });
        }
      },

      resetFilters(): void {
        patchState(store, {
          filters: DEFAULT_TREASURY_FILTER,
          hasMoreItems: true,
          infinitePage: 1,
        });
      },
    };
  }),

  withHooks({
    onInit(store) {
      store.loadSummary();
      store.loadTransactions();
    },
  })
);
