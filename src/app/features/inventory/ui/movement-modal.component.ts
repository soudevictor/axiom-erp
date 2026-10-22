import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import type { InventoryItem } from '@/core/models/inventory.model';
import { warehouseLabel } from '@/core/models/warehouse.model';
import {
  STOCK_MOVEMENT_REASON_LABELS,
  STOCK_MOVEMENT_REASONS,
  STOCK_MOVEMENT_TYPE_LABELS,
  type StockMovementInput,
  type StockMovementResult,
  type StockMovementType,
} from '@/core/models/stock-movement.model';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';
import { ModalComponent } from '@/shared/ui/modal/modal.component';

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

const TYPES: readonly StockMovementType[] = ['IN', 'OUT', 'ADJUSTMENT'];

@Component({
  selector: 'app-movement-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      title="Movimentar estoque"
      [description]="item()?.name ?? null"
      maxWidth="540px"
      (closed)="closed.emit()"
    >
      @if (item(); as current) {
        <form id="movement-form" [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="grid gap-3 rounded-md border border-border-subtle bg-canvas-elevated p-3 sm:grid-cols-3">
            <div>
              <p class="text-[11px] text-content-muted">SKU</p>
              <p class="mt-0.5 font-mono text-xs text-content-primary">{{ current.sku }}</p>
            </div>
            <div>
              <p class="text-[11px] text-content-muted">Saldo atual</p>
              <p class="mt-0.5 font-mono text-sm font-medium tabular-nums text-content-primary">{{ current.quantity }}</p>
            </div>
            <div>
              <p class="text-[11px] text-content-muted">Armazém</p>
              <p class="mt-0.5 truncate text-xs text-content-secondary" [title]="warehouseLabel(current.warehouseId)">{{ warehouseLabel(current.warehouseId) }}</p>
            </div>
          </div>

          <fieldset>
            <legend class="ui-label">Tipo de movimentação</legend>
            <div class="grid grid-cols-3 gap-1 rounded-md border border-border-subtle p-1" role="radiogroup" aria-label="Tipo de movimentação">
              @for (option of types; track option) {
                <label
                  class="cursor-pointer rounded px-2 py-1.5 text-center text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                  [class]="type() === option ? 'bg-brand-fill text-white' : 'text-content-muted hover:bg-canvas-elevated hover:text-content-primary'"
                >
                  <input
                    class="sr-only"
                    type="radio"
                    name="movementType"
                    [value]="option"
                    [checked]="type() === option"
                    (change)="setType(option)"
                  />
                  {{ typeLabels[option] }}
                </label>
              }
            </div>
          </fieldset>

          <div>
            <label for="movement-quantity" class="ui-label">
              {{ type() === 'ADJUSTMENT' ? 'Saldo contado' : 'Quantidade' }}
              <span class="text-state-danger">*</span>
            </label>
            <input
              id="movement-quantity"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="ui-field font-mono tabular-nums"
              formControlName="quantity"
              data-autofocus
              (input)="onQuantity($event)"
            />
            @if (quantityError()) {
              <p class="mt-1 text-xs text-state-danger" role="alert">{{ quantityError() }}</p>
            }
            <div class="mt-2 flex items-center gap-1.5 font-mono text-xs text-content-muted">
              <span>Saldo atual {{ current.quantity }}</span>
              <lucide-icon [img]="ArrowRight" [size]="12" class="text-content-disabled" />
              <span [class]="preview() < 0 ? 'text-state-danger' : 'text-content-primary'">{{ preview() }}</span>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="movement-reason" class="ui-label">Motivo <span class="text-state-danger">*</span></label>
              <select id="movement-reason" formControlName="reason" class="ui-field">
                @for (reason of allowedReasons(); track reason) {
                  <option [value]="reason">{{ reasonLabels[reason] }}</option>
                }
              </select>
            </div>
            <div>
              <label for="movement-note" class="ui-label">Observação</label>
              <input
                id="movement-note"
                type="text"
                formControlName="note"
                class="ui-field"
                maxlength="200"
                placeholder="Opcional"
              />
            </div>
          </div>

          @if (serverError()) {
            <div class="rounded-md border border-state-danger-border bg-state-danger-subtle px-3 py-2" role="alert">
              <p class="text-sm text-state-danger">{{ serverError() }}</p>
            </div>
          }
        </form>
      }

      <div modal-footer class="flex justify-end gap-2 px-4 py-3 sm:px-5">
        <button type="button" class="ui-btn" [disabled]="store.saving()" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="movement-form" class="ui-btn ui-btn-primary" [disabled]="!canSubmit()">
          {{ store.saving() ? 'Registrando…' : submitLabel() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class MovementModalComponent {
  readonly open = input(false);
  readonly item = input<InventoryItem | null>(null);
  readonly closed = output<void>();
  readonly saved = output<StockMovementResult>();

  protected readonly store = inject(InventoryStore);
  private readonly fb = inject(FormBuilder);

  protected readonly types = TYPES;
  protected readonly typeLabels = STOCK_MOVEMENT_TYPE_LABELS;
  protected readonly reasonLabels = STOCK_MOVEMENT_REASON_LABELS;
  protected readonly warehouseLabel = warehouseLabel;
  protected readonly ArrowRight = ArrowRight;

  protected readonly type = signal<StockMovementType>('IN');
  protected readonly quantity = signal(0);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    quantity: [0, [Validators.required, Validators.min(0)]],
    reason: this.fb.nonNullable.control(STOCK_MOVEMENT_REASONS.IN[0], Validators.required),
    note: ['', [Validators.maxLength(200)]],
  });

  protected readonly allowedReasons = computed(() => STOCK_MOVEMENT_REASONS[this.type()]);

  protected readonly preview = computed(() => {
    const current = this.item()?.quantity ?? 0;
    const quantity = this.quantity();
    if (this.type() === 'IN') return current + quantity;
    if (this.type() === 'OUT') return current - quantity;
    return quantity;
  });

  protected readonly quantityError = computed(() => {
    const current = this.item()?.quantity ?? 0;
    const quantity = this.quantity();
    if (!Number.isInteger(quantity)) return 'Informe uma quantidade inteira.';
    if (this.type() === 'ADJUSTMENT') {
      if (quantity < 0) return 'O saldo contado não pode ser negativo.';
      if (quantity === current) return 'O saldo informado é igual ao atual.';
      return null;
    }
    if (quantity <= 0) return 'A quantidade deve ser maior que zero.';
    if (this.type() === 'OUT' && quantity > current) {
      return `Saldo insuficiente. Disponível: ${current}.`;
    }
    return null;
  });

  protected readonly canSubmit = computed(
    () => !this.store.saving() && this.quantityError() === null
  );

  protected readonly submitLabel = computed(() => {
    if (this.type() === 'IN') return 'Registrar entrada';
    if (this.type() === 'OUT') return 'Registrar saída';
    return 'Registrar ajuste';
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.type.set('IN');
      this.quantity.set(0);
      this.serverError.set(null);
      this.form.reset({
        quantity: 0,
        reason: STOCK_MOVEMENT_REASONS.IN[0],
        note: '',
      });
    });
  }

  protected setType(type: StockMovementType): void {
    if (this.type() === type) return;
    this.type.set(type);
    this.form.controls.reason.setValue(STOCK_MOVEMENT_REASONS[type][0]);
    this.quantity.set(0);
    this.form.controls.quantity.setValue(0);
    this.serverError.set(null);
  }

  protected onQuantity(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const quantity = Number.isFinite(value) ? Math.trunc(value) : 0;
    this.quantity.set(quantity);
    this.form.controls.quantity.setValue(quantity, { emitEvent: false });
    this.serverError.set(null);
  }

  protected async submit(): Promise<void> {
    const item = this.item();
    if (!item || !this.canSubmit()) return;

    const input: StockMovementInput = {
      type: this.type(),
      quantity: this.quantity(),
      reason: this.form.controls.reason.value,
      note: this.form.controls.note.value.trim() || undefined,
    };

    try {
      const result = await this.store.recordMovement(item.id, input);
      this.saved.emit(result);
    } catch (error: unknown) {
      this.serverError.set(messageFrom(error, 'Não foi possível registrar a movimentação.'));
    }
  }
}
