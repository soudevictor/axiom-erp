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
import { TreasuryApi } from '@/core/api/treasury.api';
import {
  DEFAULT_TREASURY_FILTER,
  type TransactionInput,
  type TransactionStatus,
  type TreasuryFilter,
  type TreasurySummary,
  type TreasuryTransaction,
} from '@/core/models/treasury.model';

interface TreasuryState {
  transactions: readonly TreasuryTransaction[];
  totalItems: number;
  loading: boolean;
  loadingMore: boolean;
  saving: boolean;
  error: string | null;
  filters: TreasuryFilter;
  summary: TreasurySummary | null;
  summaryLoading: boolean;
  hasMore: boolean;
}

const initialState: TreasuryState = {
  transactions: [],
  totalItems: 0,
  loading: false,
  loadingMore: false,
  saving: false,
  error: null,
  filters: DEFAULT_TREASURY_FILTER,
  summary: null,
  summaryLoading: false,
  hasMore: true,
};

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function fallbackTotals(transactions: readonly TreasuryTransaction[]): {
  totalReceivables: number;
  totalPayables: number;
  totalBalance: number;
} {
  return {
    totalReceivables: transactions
      .filter((transaction) => transaction.type === 'INCOME' && transaction.status !== 'CANCELLED')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalPayables: transactions
      .filter((transaction) => transaction.type === 'EXPENSE' && transaction.status !== 'CANCELLED')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalBalance: transactions
      .filter((transaction) => transaction.status === 'COMPLETED')
      .reduce(
        (sum, transaction) =>
          sum + (transaction.type === 'INCOME' ? transaction.amount : -transaction.amount),
        0
      ),
  };
}

export const TreasuryStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    summaryStats: computed(() => {
      const summary = store.summary();
      return summary
        ? {
            totalReceivables: summary.totalReceivables,
            totalPayables: summary.totalPayables,
            totalBalance: summary.totalBalance,
          }
        : null;
    }),

    summaryStatsFallback: computed(() => fallbackTotals(store.transactions())),

    totalReceivables: computed(
      () => store.summary()?.totalReceivables ?? fallbackTotals(store.transactions()).totalReceivables
    ),
    totalPayables: computed(
      () => store.summary()?.totalPayables ?? fallbackTotals(store.transactions()).totalPayables
    ),
    totalBalance: computed(
      () => store.summary()?.totalBalance ?? fallbackTotals(store.transactions()).totalBalance
    ),
    pendingCount: computed(
      () => store.transactions().filter((transaction) => transaction.status === 'PENDING').length
    ),
    aging: computed(() => store.summary()?.aging ?? null),
    realized: computed(() => store.summary()?.realized ?? null),
    monthly: computed(() => store.summary()?.monthly ?? []),
    upcoming30: computed(() => store.summary()?.upcoming30 ?? null),
    lastMonth: computed(() => store.summary()?.lastMonth ?? null),

    hasActiveFilters: computed(() => {
      const filters = store.filters();
      return (
        filters.search !== '' ||
        filters.type !== 'ALL' ||
        filters.status !== 'ALL' ||
        filters.category !== 'ALL'
      );
    }),
    activeFilterCount: computed(() => {
      const filters = store.filters();
      return [
        filters.search !== '',
        filters.type !== 'ALL',
        filters.status !== 'ALL',
        filters.category !== 'ALL',
      ].filter(Boolean).length;
    }),
    isEmpty: computed(() => !store.loading() && store.totalItems() === 0),
    hasMoreItems: computed(() => store.hasMore()),
    isFilteredEmpty: computed(() => {
      const filters = store.filters();
      const hasFilters =
        filters.search !== '' ||
        filters.type !== 'ALL' ||
        filters.status !== 'ALL' ||
        filters.category !== 'ALL';
      return !store.loading() && store.totalItems() === 0 && hasFilters;
    }),
  })),

  withMethods((store) => {
    const api = inject(TreasuryApi);

    return {
      async loadSummary(): Promise<void> {
        patchState(store, { summaryLoading: true });
        try {
          const summary = await api.summary();
          patchState(store, {
            summary,
            totalItems: store.totalItems() || summary.totalItems,
            summaryLoading: false,
          });
        } catch {
          patchState(store, { summaryLoading: false });
        }
      },

      async loadTransactions(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const response = await api.list({ ...store.filters(), page: 1 });
          patchState(store, {
            transactions: response.data,
            totalItems: response.totalItems,
            loading: false,
            hasMore: response.hasNextPage,
          });
        } catch (error: unknown) {
          patchState(store, {
            error: messageFrom(error, 'Erro ao carregar transações financeiras.'),
            loading: false,
          });
        }
      },

      async load(): Promise<void> {
        await Promise.all([this.loadTransactions(), this.loadSummary()]);
      },

      async loadMoreItems(): Promise<void> {
        if (store.loadingMore() || !store.hasMore()) return;
        const nextPage = store.filters().page + 1;
        patchState(store, { loadingMore: true, error: null });
        try {
          const response = await api.list({ ...store.filters(), page: nextPage });
          patchState(store, {
            transactions: [...store.transactions(), ...response.data],
            totalItems: response.totalItems,
            filters: { ...store.filters(), page: nextPage },
            loadingMore: false,
            hasMore: response.hasNextPage,
          });
        } catch (error: unknown) {
          patchState(store, {
            error: messageFrom(error, 'Erro ao carregar mais transações.'),
            loadingMore: false,
          });
        }
      },

      async setFilters(partial: Partial<TreasuryFilter>): Promise<void> {
        patchState(store, {
          filters: { ...store.filters(), ...partial, page: 1 },
          hasMore: true,
        });
        await this.loadTransactions();
      },

      async setSortBy(column: keyof TreasuryTransaction): Promise<void> {
        const current = store.filters();
        const sortOrder =
          current.sortBy === column && current.sortOrder === 'asc' ? 'desc' : 'asc';
        patchState(store, {
          filters: { ...current, sortBy: column, sortOrder, page: 1 },
        });
        await this.loadTransactions();
      },

      async addTransaction(input: TransactionInput): Promise<TreasuryTransaction> {
        patchState(store, { saving: true, error: null });
        try {
          const transaction = await api.create(input);
          patchState(store, { saving: false });
          await this.load();
          return transaction;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao cadastrar transação.'),
          });
          throw error;
        }
      },

      async updateTransactionStatus(
        id: string,
        status: TransactionStatus
      ): Promise<TreasuryTransaction> {
        patchState(store, { saving: true, error: null });
        try {
          const transaction = await api.updateStatus(id, status);
          patchState(store, {
            saving: false,
            transactions: store
              .transactions()
              .map((candidate) => (candidate.id === id ? transaction : candidate)),
          });
          await this.loadSummary();
          return transaction;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao atualizar status da transação.'),
          });
          throw error;
        }
      },

      async resetFilters(): Promise<void> {
        patchState(store, {
          filters: DEFAULT_TREASURY_FILTER,
          hasMore: true,
        });
        await this.loadTransactions();
      },
    };
  }),

  withHooks({
    onInit(store) {
      void store.load();
    },
  })
);
