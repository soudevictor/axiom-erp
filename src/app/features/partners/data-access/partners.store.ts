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
import { PartnersApi } from '@/core/api/partners.api';
import type {
  B2BPartner,
  PartnerCategory,
  PartnerInput,
  PartnerStatus,
} from '@/core/models/partner.model';
import { normalizeCnpj } from '@/shared/utils/cnpj-validator';

export interface PartnersFilter {
  readonly search: string;
  readonly category: PartnerCategory | 'ALL';
  readonly status: PartnerStatus | 'ALL';
  readonly state: string | 'ALL';
}

interface PartnersState {
  items: readonly B2BPartner[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  filters: PartnersFilter;
  visibleCount: number;
}

export const DEFAULT_PARTNERS_FILTER: PartnersFilter = {
  search: '',
  category: 'ALL',
  status: 'ALL',
  state: 'ALL',
};

export const PARTNERS_PAGE_SIZE = 20;

const initialState: PartnersState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
  filters: DEFAULT_PARTNERS_FILTER,
  visibleCount: PARTNERS_PAGE_SIZE,
};

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function filterPartners(
  items: readonly B2BPartner[],
  filters: PartnersFilter
): B2BPartner[] {
  const search = filters.search.trim().toLowerCase();
  const digits = normalizeCnpj(search);
  return items
    .filter((partner) => {
      const matchesSearch =
        !search ||
        partner.companyName.toLowerCase().includes(search) ||
        (partner.tradeName ?? '').toLowerCase().includes(search) ||
        (partner.email ?? '').toLowerCase().includes(search) ||
        (digits.length > 0 && normalizeCnpj(partner.cnpj).includes(digits));
      const matchesCategory =
        filters.category === 'ALL' || partner.category === filters.category;
      const matchesStatus = filters.status === 'ALL' || partner.status === filters.status;
      const matchesState = filters.state === 'ALL' || partner.state === filters.state;
      return matchesSearch && matchesCategory && matchesStatus && matchesState;
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR'));
}

export const PartnersStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => {
    const filteredItems = computed(() => filterPartners(store.items(), store.filters()));

    return {
      filteredItems,

      filteredTotal: computed(() => filteredItems().length),
      visibleItems: computed(() => filteredItems().slice(0, store.visibleCount())),
      hasMoreItems: computed(() => store.visibleCount() < filteredItems().length),
      total: computed(() => store.items().length),
      homologated: computed(
        () => store.items().filter((partner) => partner.status === 'HOMOLOGADO').length
      ),
      blocked: computed(
        () => store.items().filter((partner) => partner.status === 'BLOQUEADO').length
      ),
      inAnalysis: computed(
        () => store.items().filter((partner) => partner.status === 'EM_ANALISE').length
      ),
      creditLimitTotal: computed(() =>
        store.items().reduce((sum, partner) => sum + partner.creditLimit, 0)
      ),
      creditUsedTotal: computed(() =>
        store.items().reduce((sum, partner) => sum + partner.creditUsed, 0)
      ),
      creditUsagePct: computed(() => {
        const limit = store.items().reduce((sum, partner) => sum + partner.creditLimit, 0);
        const used = store.items().reduce((sum, partner) => sum + partner.creditUsed, 0);
        return limit > 0 ? (used / limit) * 100 : 0;
      }),
      hasActiveFilters: computed(() => {
        const filters = store.filters();
        return (
          filters.search !== '' ||
          filters.category !== 'ALL' ||
          filters.status !== 'ALL' ||
          filters.state !== 'ALL'
        );
      }),
      activeFilterCount: computed(() => {
        const filters = store.filters();
        return [
          filters.search !== '',
          filters.category !== 'ALL',
          filters.status !== 'ALL',
          filters.state !== 'ALL',
        ].filter(Boolean).length;
      }),
      isEmpty: computed(() => !store.loading() && store.items().length === 0),
      isFilteredEmpty: computed(
        () => !store.loading() && store.items().length > 0 && filteredItems().length === 0
      ),
      states: computed(() =>
        [...new Set(store.items().map((partner) => partner.state))].sort((a, b) =>
          a.localeCompare(b, 'pt-BR')
        )
      ),
    };
  }),

  withMethods((store) => {
    const api = inject(PartnersApi);

    return {
      async load(force = false): Promise<void> {
        if (!force && store.items().length > 0) return;
        patchState(store, {
          loading: true,
          error: null,
          visibleCount: PARTNERS_PAGE_SIZE,
        });
        try {
          const items = await api.list();
          patchState(store, { items, loading: false });
        } catch (error: unknown) {
          patchState(store, {
            error: messageFrom(error, 'Erro ao carregar parceiros.'),
            loading: false,
          });
        }
      },

      async refresh(): Promise<void> {
        await this.load(true);
      },

      loadMoreItems(): void {
        if (!store.hasMoreItems()) return;
        patchState(store, {
          visibleCount: Math.min(
            store.visibleCount() + PARTNERS_PAGE_SIZE,
            store.filteredTotal()
          ),
        });
      },

      setFilters(partial: Partial<PartnersFilter>): void {
        patchState(store, {
          filters: { ...store.filters(), ...partial },
          visibleCount: PARTNERS_PAGE_SIZE,
        });
      },

      clearFilters(): void {
        patchState(store, {
          filters: DEFAULT_PARTNERS_FILTER,
          visibleCount: PARTNERS_PAGE_SIZE,
        });
      },

      clearError(): void {
        patchState(store, { error: null });
      },

      async create(input: PartnerInput): Promise<B2BPartner> {
        patchState(store, { saving: true, error: null });
        try {
          const partner = await api.create(input);
          patchState(store, {
            saving: false,
            items: [...store.items(), partner].sort((a, b) =>
              a.companyName.localeCompare(b.companyName, 'pt-BR')
            ),
          });
          return partner;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao cadastrar parceiro.'),
          });
          throw error;
        }
      },

      async update(id: string, input: PartnerInput): Promise<B2BPartner> {
        patchState(store, { saving: true, error: null });
        try {
          const partner = await api.update(id, input);
          patchState(store, {
            saving: false,
            items: store
              .items()
              .map((candidate) => (candidate.id === id ? partner : candidate))
              .sort((a, b) => a.companyName.localeCompare(b.companyName, 'pt-BR')),
          });
          return partner;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao atualizar parceiro.'),
          });
          throw error;
        }
      },

      async changeStatus(
        id: string,
        status: PartnerStatus,
        reason?: string
      ): Promise<B2BPartner> {
        patchState(store, { saving: true, error: null });
        try {
          const partner = await api.changeStatus(id, status, reason);
          patchState(store, {
            saving: false,
            items: store
              .items()
              .map((candidate) => (candidate.id === id ? partner : candidate)),
          });
          return partner;
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao alterar status do parceiro.'),
          });
          throw error;
        }
      },

      async remove(id: string): Promise<void> {
        patchState(store, { saving: true, error: null });
        try {
          await api.remove(id);
          patchState(store, {
            saving: false,
            items: store.items().filter((partner) => partner.id !== id),
          });
        } catch (error: unknown) {
          patchState(store, {
            saving: false,
            error: messageFrom(error, 'Erro ao excluir parceiro.'),
          });
          throw error;
        }
      },
    };
  }),

  withHooks({
    onInit(store) {
      void store.load();
    },
  })
);
