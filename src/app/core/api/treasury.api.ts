import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PaginatedResponse } from '@/core/models/pagination.model';
import type {
  TransactionInput,
  TransactionStatus,
  TreasuryFilter,
  TreasurySummary,
  TreasuryTransaction,
} from '@/core/models/treasury.model';

const API_URL = '/api/v1/treasury';

@Injectable({ providedIn: 'root' })
export class TreasuryApi {
  private readonly http = inject(HttpClient);

  list(filters: TreasuryFilter): Promise<PaginatedResponse<TreasuryTransaction>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<TreasuryTransaction>>(API_URL, {
        params: this.toParams(filters),
      })
    );
  }

  summary(): Promise<TreasurySummary> {
    return firstValueFrom(this.http.get<TreasurySummary>(`${API_URL}/summary`));
  }

  create(input: TransactionInput): Promise<TreasuryTransaction> {
    return firstValueFrom(this.http.post<TreasuryTransaction>(API_URL, input));
  }

  updateStatus(id: string, status: TransactionStatus): Promise<TreasuryTransaction> {
    return firstValueFrom(
      this.http.patch<TreasuryTransaction>(`${API_URL}/${id}/status`, { status })
    );
  }

  private toParams(filters: TreasuryFilter): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit))
      .set('sortBy', String(filters.sortBy))
      .set('sortOrder', filters.sortOrder);

    if (filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.type !== 'ALL') params = params.set('type', filters.type);
    if (filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters.category !== 'ALL') params = params.set('category', filters.category);
    return params;
  }
}
