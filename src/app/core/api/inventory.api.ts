import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  CreateInventoryItem,
  InventoryFilter,
  InventoryItem,
  InventorySummary,
  UpdateInventoryItem,
} from '@/core/models/inventory.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';
import type {
  StockMovement,
  StockMovementInput,
  StockMovementResult,
} from '@/core/models/stock-movement.model';

const API_URL = '/api/v1/inventory';

@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(HttpClient);

  list(filters: InventoryFilter): Promise<PaginatedResponse<InventoryItem>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<InventoryItem>>(API_URL, {
        params: this.toParams(filters),
      })
    );
  }

  summary(): Promise<InventorySummary> {
    return firstValueFrom(this.http.get<InventorySummary>(`${API_URL}/summary`));
  }

  create(input: CreateInventoryItem): Promise<InventoryItem> {
    return firstValueFrom(this.http.post<InventoryItem>(API_URL, input));
  }

  update(id: string, input: UpdateInventoryItem): Promise<InventoryItem> {
    return firstValueFrom(this.http.put<InventoryItem>(`${API_URL}/${id}`, input));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_URL}/${id}`));
  }

  restore(item: InventoryItem): Promise<InventoryItem> {
    return firstValueFrom(this.http.post<InventoryItem>(`${API_URL}/restore`, item));
  }

  movements(id: string, limit = 20): Promise<StockMovement[]> {
    return firstValueFrom(
      this.http.get<StockMovement[]>(`${API_URL}/${id}/movements`, {
        params: new HttpParams().set('limit', String(limit)),
      })
    );
  }

  addMovement(id: string, input: StockMovementInput): Promise<StockMovementResult> {
    return firstValueFrom(
      this.http.post<StockMovementResult>(`${API_URL}/${id}/movements`, input)
    );
  }

  private toParams(filters: InventoryFilter): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('limit', String(filters.limit))
      .set('sortBy', String(filters.sortBy))
      .set('sortOrder', filters.sortOrder);

    if (filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.category) params = params.set('category', filters.category);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.warehouseId) params = params.set('warehouseId', filters.warehouseId);
    return params;
  }
}
