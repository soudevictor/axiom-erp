import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { InventoryApi } from '@/core/api/inventory.api';
import type { StockMovement } from '@/core/models/stock-movement.model';

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

@Injectable({ providedIn: 'root' })
export class InventoryMovementsService {
  private readonly api = inject(InventoryApi);

  readonly items = signal<readonly StockMovement[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private currentItemId: string | null = null;
  private requestSequence = 0;

  async load(itemId: string, limit = 20): Promise<void> {
    this.currentItemId = itemId;
    const request = ++this.requestSequence;
    this.loading.set(true);
    this.error.set(null);
    try {
      const movements = await this.api.movements(itemId, limit);
      if (request !== this.requestSequence) return;
      this.items.set(movements);
    } catch (error: unknown) {
      if (request !== this.requestSequence) return;
      this.error.set(messageFrom(error, 'Não foi possível carregar o histórico.'));
    } finally {
      if (request === this.requestSequence) this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    if (this.currentItemId) await this.load(this.currentItemId);
  }

  clear(): void {
    this.requestSequence += 1;
    this.currentItemId = null;
    this.items.set([]);
    this.loading.set(false);
    this.error.set(null);
  }
}
