import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { LucideAngularModule, MoveRight, PackagePlus, RefreshCw, AlertCircle } from 'lucide-angular';
import type { InventoryItem } from '@/core/models/inventory.model';
import { INVENTORY_STATUS_LABELS } from '@/core/models/inventory.model';
import {
  STOCK_MOVEMENT_REASON_LABELS,
  STOCK_MOVEMENT_TYPE_LABELS,
  type StockMovementType,
} from '@/core/models/stock-movement.model';
import { warehouseLabel } from '@/core/models/warehouse.model';
import { InventoryMovementsService } from '@/features/inventory/data-access/inventory.movements.service';
import { BadgeComponent, type BadgeVariant } from '@/shared/ui/badge/badge.component';
import { DrawerComponent } from '@/shared/ui/drawer/drawer.component';
import { SkeletonLoaderComponent } from '@/shared/ui/skeleton/skeleton-loader.component';

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-movement-history-drawer',
  standalone: true,
  imports: [LucideAngularModule, DrawerComponent, BadgeComponent, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-drawer
      [open]="open()"
      title="Histórico de movimentações"
      [description]="item()?.name ?? null"
      (closed)="closed.emit()"
    >
      @if (item(); as current) {
        <div class="space-y-4 p-4">
          <div class="rounded-md border border-border-subtle bg-canvas-elevated p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-mono text-xs text-content-muted">{{ current.sku }}</p>
                <p class="mt-1 text-sm text-content-muted">{{ warehouseLabel(current.warehouseId) }}</p>
              </div>
              <app-badge [variant]="statusVariant(current.status)" [label]="statusLabels[current.status]" />
            </div>
            <div class="mt-3 flex items-end justify-between gap-3">
              <div>
                <p class="text-xs text-content-muted">Saldo atual</p>
                <p class="font-mono text-2xl font-medium tabular-nums text-content-primary">{{ current.quantity }}</p>
              </div>
              <button type="button" class="ui-btn ui-btn-primary h-8 px-2.5 text-xs" data-autofocus (click)="movementRequested.emit(current)">
                <lucide-icon [img]="PackagePlus" [size]="14" />
                Movimentar
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <h3 class="text-xs font-medium text-content-muted">Últimas 20 movimentações</h3>
            <span class="font-mono text-[10px] text-content-disabled">ledger imutável</span>
          </div>

          @if (movements.loading()) {
            <app-skeleton-loader [count]="5" height="4rem" />
          } @else if (movements.error()) {
            <div class="rounded-md border border-state-danger/30 bg-state-danger-subtle p-3" role="alert">
              <div class="flex items-center gap-2 text-sm text-state-danger">
                <lucide-icon [img]="AlertCircle" [size]="16" />
                <span>{{ movements.error() }}</span>
              </div>
              <button type="button" class="ui-btn mt-2 h-8 px-2.5 text-xs" (click)="movements.refresh()">
                <lucide-icon [img]="RefreshCw" [size]="13" /> Tentar novamente
              </button>
            </div>
          } @else if (movements.items().length === 0) {
            <div class="flex flex-col items-center rounded-md border border-dashed border-border-strong px-4 py-8 text-center">
              <lucide-icon [img]="MoveRight" [size]="22" class="text-content-disabled" />
              <p class="mt-2 text-sm font-medium text-content-primary">Nenhuma movimentação registrada</p>
              <p class="mt-1 text-xs text-content-muted">Registre a primeira entrada para iniciar o histórico.</p>
            </div>
          } @else {
            <ol class="space-y-0">
              @for (movement of movements.items(); track movement.id) {
                <li class="border-b border-border-subtle py-3 first:pt-0 last:border-b-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <app-badge [variant]="typeVariant(movement.type)" [label]="typeLabels[movement.type]" />
                      <span class="font-mono text-xs text-content-muted">{{ formatDate(movement.createdAt) }}</span>
                    </div>
                    <span class="shrink-0 font-mono text-sm font-medium tabular-nums" [class]="deltaClass(movement.delta)">
                      {{ signedDelta(movement.delta) }}
                    </span>
                  </div>
                  <div class="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-content-muted">
                    <span>{{ movement.previousQuantity }}</span>
                    <lucide-icon [img]="MoveRight" [size]="12" class="text-content-disabled" />
                    <span class="text-content-primary">{{ movement.newQuantity }}</span>
                    <span class="ml-1 font-sans text-content-muted">· {{ reasonLabels[movement.reason] }}</span>
                  </div>
                  @if (movement.note) {
                    <p class="mt-1 text-xs text-content-muted">{{ movement.note }}</p>
                  }
                </li>
              }
            </ol>
          }
        </div>
      } @else {
        <div class="p-4 text-sm text-content-muted">Nenhum produto selecionado.</div>
      }

      <div drawer-footer class="flex items-center justify-between px-4 py-2 font-mono text-[10px] text-content-disabled">
        <span>Movimentos não podem ser editados</span>
        <span>AxiomERP</span>
      </div>
    </app-drawer>
  `,
})
export class MovementHistoryDrawerComponent {
  readonly open = input(false);
  readonly item = input<InventoryItem | null>(null);
  readonly closed = output<void>();
  readonly movementRequested = output<InventoryItem>();

  protected readonly movements = inject(InventoryMovementsService);
  protected readonly statusLabels = INVENTORY_STATUS_LABELS;
  protected readonly warehouseLabel = warehouseLabel;
  protected readonly typeLabels = STOCK_MOVEMENT_TYPE_LABELS;
  protected readonly reasonLabels = STOCK_MOVEMENT_REASON_LABELS;
  protected readonly MoveRight = MoveRight;
  protected readonly PackagePlus = PackagePlus;
  protected readonly RefreshCw = RefreshCw;
  protected readonly AlertCircle = AlertCircle;

  protected readonly currentQuantity = computed(() => this.item()?.quantity ?? 0);

  constructor() {
    effect(() => {
      const open = this.open();
      const item = this.item();
      if (open && item) {
        void this.movements.load(item.id);
      } else if (!open) {
        this.movements.clear();
      }
    });
  }

  async refresh(): Promise<void> {
    await this.movements.refresh();
  }

  protected statusVariant(status: InventoryItem['status']): BadgeVariant {
    if (status === 'IN_STOCK') return 'SUCCESS';
    if (status === 'LOW_STOCK') return 'WARNING';
    return 'DANGER';
  }

  protected typeVariant(type: StockMovementType): BadgeVariant {
    if (type === 'IN') return 'SUCCESS';
    if (type === 'OUT') return 'NEUTRAL';
    return 'WARNING';
  }

  protected signedDelta(delta: number): string {
    if (delta === 0) return '0';
    return `${delta > 0 ? '+' : ''}${delta}`;
  }

  protected deltaClass(delta: number): string {
    if (delta > 0) return 'text-state-success';
    if (delta < 0) return 'text-state-danger';
    return 'text-content-muted';
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date);
  }
}
