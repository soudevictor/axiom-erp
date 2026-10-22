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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { LucideAngularModule, PackagePlus } from 'lucide-angular';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  type CreateInventoryItem,
  type InventoryCategory,
  type InventoryItem,
  type UpdateInventoryItem,
} from '@/core/models/inventory.model';
import { WAREHOUSES } from '@/core/models/warehouse.model';
import { InventoryStore } from '@/features/inventory/data-access/inventory.store';
import { ModalComponent } from '@/shared/ui/modal/modal.component';

function integerValidator(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (!Number.isInteger(value) || value < min) return { integer: true };
    return null;
  };
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function errorCode(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { code?: string } | null;
    return body?.code ?? null;
  }
  return null;
}

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      [title]="item() ? 'Editar produto' : 'Novo produto'"
      [description]="item()?.sku ?? 'Cadastre um SKU e defina o saldo inicial.'"
      maxWidth="680px"
      (closed)="closed.emit()"
    >
      <form id="product-form" [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        @if (serverError()) {
          <div class="rounded-md border border-state-danger-border bg-state-danger-subtle px-3 py-2" role="alert">
            <p class="text-sm text-state-danger">{{ serverError() }}</p>
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="product-sku" class="ui-label">SKU <span class="text-state-danger">*</span></label>
            <input
              id="product-sku"
              type="text"
              formControlName="sku"
              class="ui-field font-mono uppercase"
              maxlength="24"
              autocomplete="off"
              placeholder="ELE-A001-0501"
              data-autofocus
              (input)="normalizeSku($event)"
              [attr.aria-invalid]="skuInvalid()"
              [attr.aria-describedby]="skuInvalid() ? 'product-sku-error' : null"
            />
            @if (skuInvalid()) {
              <p id="product-sku-error" class="mt-1 text-xs text-state-danger">
                {{ skuServerError() ?? 'Use o formato ABC-1234-0000.' }}
              </p>
            } @else {
              <p class="mt-1 text-xs text-content-muted">Identificador único do produto no catálogo.</p>
            }
          </div>

          <div>
            <label for="product-category" class="ui-label">Categoria <span class="text-state-danger">*</span></label>
            <select id="product-category" formControlName="category" class="ui-field">
              @for (category of categories; track category) {
                <option [value]="category">{{ categoryLabels[category] }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2">
            <label for="product-name" class="ui-label">Nome do produto <span class="text-state-danger">*</span></label>
            <input
              id="product-name"
              type="text"
              formControlName="name"
              class="ui-field"
              maxlength="120"
              autocomplete="off"
              [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid"
            />
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <p class="mt-1 text-xs text-state-danger">Informe um nome com pelo menos 3 caracteres.</p>
            }
          </div>

          <div>
            <label for="product-warehouse" class="ui-label">Armazém <span class="text-state-danger">*</span></label>
            <select id="product-warehouse" formControlName="warehouseId" class="ui-field">
              @for (warehouse of warehouses; track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }} · {{ warehouse.state }}</option>
              }
            </select>
          </div>

          <div>
            <label for="product-min" class="ui-label">Estoque mínimo <span class="text-state-danger">*</span></label>
            <input
              id="product-min"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              formControlName="minThreshold"
              class="ui-field font-mono tabular-nums"
            />
          </div>

          <div>
            <label for="product-price" class="ui-label">Preço unitário (R$) <span class="text-state-danger">*</span></label>
            <input
              id="product-price"
              type="number"
              min="0.01"
              step="0.01"
              formControlName="unitPrice"
              class="ui-field font-mono tabular-nums"
              [attr.aria-invalid]="form.controls.unitPrice.touched && form.controls.unitPrice.invalid"
            />
            @if (form.controls.unitPrice.touched && form.controls.unitPrice.invalid) {
              <p class="mt-1 text-xs text-state-danger">O preço deve ser maior que zero.</p>
            }
          </div>

          @if (!item()) {
            <div>
              <label for="product-quantity" class="ui-label">Saldo inicial <span class="text-state-danger">*</span></label>
              <input
                id="product-quantity"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                formControlName="quantity"
                class="ui-field font-mono tabular-nums"
              />
              <p class="mt-1 text-xs text-content-muted">Depois, o saldo só muda por movimentação.</p>
            </div>
          } @else {
            <div>
              <p class="ui-label">Saldo atual</p>
              <div class="flex h-9 items-center justify-between gap-2 rounded-md border border-border-subtle bg-canvas-elevated px-3">
                <span class="font-mono text-sm font-medium tabular-nums text-content-primary">{{ item()?.quantity }}</span>
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded px-1.5 text-xs font-medium text-brand hover:bg-brand-subtle disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="form.dirty"
                  [title]="form.dirty ? 'Salve as alterações antes de movimentar' : 'Abrir movimentação'"
                  (click)="requestMovement()"
                >
                  <lucide-icon [img]="PackagePlus" [size]="14" />
                  Movimentar
                </button>
              </div>
              <p class="mt-1 text-xs text-content-muted">O saldo é alterado apenas pelo ledger de movimentações.</p>
            </div>
          }
        </div>

        @if (!item()) {
          <div class="rounded-md bg-canvas-elevated px-3 py-2.5">
            <p class="text-xs text-content-muted">
              O saldo inicial gera uma movimentação de entrada no histórico do produto.
            </p>
          </div>
        }
      </form>

      <div modal-footer class="flex justify-end gap-2 px-4 py-3 sm:px-5">
        <button type="button" class="ui-btn" [disabled]="store.saving()" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="product-form" class="ui-btn ui-btn-primary" [disabled]="store.saving()">
          {{ store.saving() ? 'Salvando…' : item() ? 'Salvar alterações' : 'Cadastrar produto' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ProductModalComponent {
  readonly open = input(false);
  readonly item = input<InventoryItem | null>(null);
  readonly closed = output<void>();
  readonly saved = output<InventoryItem>();
  readonly movementRequested = output<InventoryItem>();

  protected readonly store = inject(InventoryStore);
  private readonly fb = inject(FormBuilder);

  protected readonly categories = INVENTORY_CATEGORIES;
  protected readonly categoryLabels = INVENTORY_CATEGORY_LABELS;
  protected readonly warehouses = WAREHOUSES;
  protected readonly PackagePlus = PackagePlus;

  protected readonly serverError = signal<string | null>(null);
  protected readonly skuServerError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    sku: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(24),
        Validators.pattern(/^[A-Z]{3}-[A-Z0-9]{4}-\d{4}$/),
      ],
    ],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    category: this.fb.nonNullable.control<InventoryCategory>('ELECTRONICS', Validators.required),
    warehouseId: ['WH-SP-001', Validators.required],
    quantity: [0, [Validators.required, integerValidator(0)]],
    minThreshold: [0, [Validators.required, integerValidator(0)]],
    unitPrice: [0, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly skuInvalid = computed(
    () =>
      this.skuServerError() !== null ||
      (this.form.controls.sku.touched && this.form.controls.sku.invalid)
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const item = this.item();
      this.serverError.set(null);
      this.skuServerError.set(null);
      this.form.reset({
        sku: item?.sku ?? '',
        name: item?.name ?? '',
        category: item?.category ?? 'ELECTRONICS',
        warehouseId: item?.warehouseId ?? 'WH-SP-001',
        quantity: item?.quantity ?? 0,
        minThreshold: item?.minThreshold ?? 0,
        unitPrice: item?.unitPrice ?? 0,
      });
    });
  }

  protected normalizeSku(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (input.value !== normalized) input.value = normalized;
    this.form.controls.sku.setValue(normalized);
    this.skuServerError.set(null);
  }

  protected requestMovement(): void {
    const item = this.item();
    if (!item || this.form.dirty) return;
    this.movementRequested.emit(item);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.skuServerError.set(null);
    this.serverError.set(null);
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const base = {
      sku: value.sku.trim(),
      name: value.name.trim(),
      category: value.category,
      warehouseId: value.warehouseId,
      minThreshold: Number(value.minThreshold),
      unitPrice: Number(value.unitPrice),
    };

    try {
      const editing = this.item();
      const saved = editing
        ? await this.store.updateItem(editing.id, base satisfies UpdateInventoryItem)
        : await this.store.addItem({
            ...base,
            quantity: Number(value.quantity),
          } satisfies CreateInventoryItem);
      this.saved.emit(saved);
    } catch (error: unknown) {
      const code = errorCode(error);
      if (code === 'SKU_DUPLICADO') {
        this.skuServerError.set('Já existe um produto com este SKU.');
        this.form.controls.sku.setErrors({ duplicate: true });
        return;
      }
      if (code === 'SKU_FORMATO') {
        this.skuServerError.set('Formato de SKU inválido.');
        this.form.controls.sku.setErrors({ format: true });
        return;
      }
      this.serverError.set(messageFrom(error, 'Não foi possível salvar o produto.'));
    }
  }
}
