import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, X, Save } from 'lucide-angular';
import { applyBrlMask, parseBrl } from '@/shared/utils/currency-formatter';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';
import type { PaginatedResponse } from '@/core/models/pagination.model';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      (click)="onBackdropClick($event)"
      (keydown.escape)="close.emit()"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        class="relative w-full max-w-xl p-6 bg-canvas-elevated border border-border-strong rounded-xl shadow-2xl space-y-6 text-content-primary"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-border-subtle">
          <h2 id="modal-title" class="text-lg font-bold text-content-primary tracking-tight">
            {{ isEditing ? 'Editar Produto em Estoque' : 'Novo Produto em Estoque' }}
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            class="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors"
            aria-label="Fechar janela"
          >
            <lucide-icon [img]="XIcon" [size]="18" />
          </button>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SKU with async validation -->
            <div>
              <label for="sku" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                SKU *
              </label>
              <input
                id="sku"
                type="text"
                formControlName="sku"
                placeholder="Ex: ELE-A1B2-1001"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono transition-colors"
                [attr.aria-invalid]="form.get('sku')?.touched && form.get('sku')?.invalid ? 'true' : null"
                aria-describedby="sku-error"
              />
              @if (form.get('sku')?.touched && form.get('sku')?.invalid) {
                <span id="sku-error" class="text-[11px] text-state-danger mt-1 block" role="alert">
                  @if (form.get('sku')?.errors?.['required']) {
                    SKU é obrigatório.
                  } @else if (form.get('sku')?.errors?.['minlength']) {
                    SKU deve ter ao menos 3 caracteres.
                  } @else if (form.get('sku')?.errors?.['skuDuplicate']) {
                    Este SKU já está cadastrado no estoque.
                  }
                </span>
              }
              @if (form.get('sku')?.pending) {
                <span class="text-[11px] text-content-muted mt-1 block">Verificando disponibilidade do SKU…</span>
              }
            </div>

            <!-- Category -->
            <div>
              <label for="category" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                id="category"
                formControlName="category"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              >
                <option value="ELECTRONICS">Eletrônicos</option>
                <option value="HARDWARE">Hardware</option>
                <option value="LOGISTICS">Logística</option>
                <option value="OFFICE">Escritório</option>
              </select>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label for="name" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
              Nome do Produto *
            </label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="Ex: Cabo HDMI 2.1 Ultra High Speed 2m"
              class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              [attr.aria-invalid]="form.get('name')?.touched && form.get('name')?.invalid ? 'true' : null"
              aria-describedby="name-error"
            />
            @if (form.get('name')?.touched && form.get('name')?.invalid) {
              <span id="name-error" class="text-[11px] text-state-danger mt-1 block" role="alert">
                Nome deve ter ao menos 3 caracteres.
              </span>
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Warehouse -->
            <div>
              <label for="warehouseId" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Armazém *
              </label>
              <select
                id="warehouseId"
                formControlName="warehouseId"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              >
                <option value="WH-SP-001">WH-SP-001 (São Paulo)</option>
                <option value="WH-RJ-002">WH-RJ-002 (Rio de Janeiro)</option>
                <option value="WH-MG-003">WH-MG-003 (Belo Horizonte)</option>
                <option value="WH-PR-004">WH-PR-004 (Curitiba)</option>
                <option value="WH-RS-005">WH-RS-005 (Porto Alegre)</option>
              </select>
            </div>

            <!-- Quantity -->
            <div>
              <label for="quantity" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Quantidade *
              </label>
              <input
                id="quantity"
                type="number"
                min="0"
                formControlName="quantity"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <!-- Min Threshold -->
            <div>
              <label for="minThreshold" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Estoque Mínimo *
              </label>
              <input
                id="minThreshold"
                type="number"
                min="1"
                formControlName="minThreshold"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          <!-- Unit Price with BRL mask -->
          <div>
            <label for="unitPriceDisplay" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
              Preço Unitário *
            </label>
            <input
              id="unitPriceDisplay"
              type="text"
              inputmode="numeric"
              [value]="unitPriceDisplay()"
              (input)="onPriceInput($event)"
              placeholder="R$ 0,00"
              class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono transition-colors"
              aria-label="Preço unitário em reais"
              [attr.aria-invalid]="form.get('unitPrice')?.touched && form.get('unitPrice')?.invalid ? 'true' : null"
            />
            @if (form.get('unitPrice')?.touched && form.get('unitPrice')?.invalid) {
              <span class="text-[11px] text-state-danger mt-1 block" role="alert">
                Preço deve ser maior que R$ 0,00.
              </span>
            }
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2 rounded-lg text-xs font-medium text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              [disabled]="form.invalid || form.pending || isSaving()"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs shadow-brand-glow transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            >
              <lucide-icon [img]="SaveIcon" [size]="16" />
              <span>{{ isSaving() ? 'Salvando…' : 'Salvar Produto' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductModalComponent implements OnInit {
  @Input() itemToEdit?: InventoryItem | null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Omit<InventoryItem, 'id' | 'updatedAt' | 'status'>>();

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly XIcon = X;
  protected readonly SaveIcon = Save;

  protected form!: FormGroup;
  protected readonly isSaving = signal(false);
  protected readonly unitPriceDisplay = signal('R$ 0,00');

  get isEditing(): boolean {
    return !!this.itemToEdit;
  }

  ngOnInit(): void {
    const initialPrice = this.itemToEdit?.unitPrice ?? 49.9;
    this.unitPriceDisplay.set(
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(initialPrice)
    );

    this.form = this.fb.group({
      sku: [
        this.itemToEdit?.sku ?? '',
        [Validators.required, Validators.minLength(3)],
        [this.asyncSkuValidator(this.itemToEdit?.sku)],
      ],
      name: [this.itemToEdit?.name ?? '', [Validators.required, Validators.minLength(3)]],
      category: [this.itemToEdit?.category ?? 'ELECTRONICS', [Validators.required]],
      warehouseId: [this.itemToEdit?.warehouseId ?? 'WH-SP-001', [Validators.required]],
      quantity: [this.itemToEdit?.quantity ?? 100, [Validators.required, Validators.min(0)]],
      minThreshold: [this.itemToEdit?.minThreshold ?? 10, [Validators.required, Validators.min(1)]],
      unitPrice: [initialPrice, [Validators.required, Validators.min(0.01)]],
    });
  }

  protected onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = applyBrlMask(input.value);
    this.unitPriceDisplay.set(masked);
    input.value = masked;

    const parsed = parseBrl(masked);
    this.form.get('unitPrice')?.setValue(isNaN(parsed) ? null : parsed, { emitEvent: true });
    this.form.get('unitPrice')?.markAsTouched();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending) return;

    const value = this.form.value as {
      sku: string;
      name: string;
      category: InventoryCategory;
      warehouseId: string;
      quantity: number;
      minThreshold: number;
      unitPrice: number;
    };

    this.isSaving.set(true);

    this.save.emit({
      sku: value.sku,
      name: value.name,
      category: value.category,
      warehouseId: value.warehouseId,
      quantity: Number(value.quantity),
      minThreshold: Number(value.minThreshold),
      unitPrice: Number(value.unitPrice),
    });

    this.isSaving.set(false);
  }

  /**
   * Async validator that checks for duplicate SKUs in the mock API.
   * Skips validation if the SKU hasn't changed (edit mode).
   */
  private asyncSkuValidator(
    currentSku?: string
  ): (control: AbstractControl) => Promise<ValidationErrors | null> {
    return async (control: AbstractControl): Promise<ValidationErrors | null> => {
      const sku = (control.value as string)?.trim().toUpperCase();

      if (!sku || sku.length < 3) return null;

      // In edit mode, skip validation if the SKU is unchanged
      if (currentSku && sku === currentSku.toUpperCase()) return null;

      try {
        const { firstValueFrom } = await import('rxjs');
        const response = await firstValueFrom(
          this.http.get<PaginatedResponse<InventoryItem>>('/api/v1/inventory', {
            params: { search: sku, limit: '5', page: '1', sortBy: 'sku', sortOrder: 'asc' },
          })
        );

        const exact = response.data.some(
          (item) => item.sku.toUpperCase() === sku
        );
        return exact ? { skuDuplicate: true } : null;
      } catch {
        return null; // Don't block on API error
      }
    };
  }
}
