import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LucideAngularModule, X, Save } from 'lucide-angular';
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStatus,
} from '@/core/models/inventory.model';

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
        class="relative w-full max-w-xl p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl space-y-6 text-slate-100"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 id="modal-title" class="text-lg font-bold text-slate-100 tracking-tight">
            {{ isEditing ? 'Editar Produto em Estoque' : 'Novo Produto em Estoque' }}
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Fechar janela"
          >
            <lucide-icon [img]="XIcon" [size]="18" />
          </button>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SKU -->
            <div>
              <label for="sku" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                SKU *
              </label>
              <input
                id="sku"
                type="text"
                formControlName="sku"
                placeholder="Ex: ELE-A1B2-1001"
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
              @if (form.get('sku')?.touched && form.get('sku')?.invalid) {
                <span class="text-[11px] text-rose-400 mt-1 block">SKU é obrigatório.</span>
              }
            </div>

            <!-- Category -->
            <div>
              <label for="category" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                id="category"
                formControlName="category"
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
            <label for="name" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nome do Produto *
            </label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="Ex: Cabo HDMI 2.1 Ultra High Speed 2m"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            @if (form.get('name')?.touched && form.get('name')?.invalid) {
              <span class="text-[11px] text-rose-400 mt-1 block">Nome deve ter ao menos 3 caracteres.</span>
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Warehouse -->
            <div>
              <label for="warehouseId" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Armazém *
              </label>
              <select
                id="warehouseId"
                formControlName="warehouseId"
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
              <label for="quantity" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Quantidade *
              </label>
              <input
                id="quantity"
                type="number"
                min="0"
                formControlName="quantity"
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <!-- Min Threshold -->
            <div>
              <label for="minThreshold" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Estoque Mínimo *
              </label>
              <input
                id="minThreshold"
                type="number"
                min="1"
                formControlName="minThreshold"
                class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <!-- Unit Price -->
          <div>
            <label for="unitPrice" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Preço Unitário (R$) *
            </label>
            <input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0.01"
              formControlName="unitPrice"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              [disabled]="form.invalid"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition-colors"
            >
              <lucide-icon [img]="SaveIcon" [size]="16" />
              <span>Salvar Produto</span>
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

  protected readonly XIcon = X;
  protected readonly SaveIcon = Save;

  protected form!: FormGroup;

  get isEditing(): boolean {
    return !!this.itemToEdit;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      sku: [this.itemToEdit?.sku ?? '', [Validators.required, Validators.minLength(3)]],
      name: [this.itemToEdit?.name ?? '', [Validators.required, Validators.minLength(3)]],
      category: [this.itemToEdit?.category ?? 'ELECTRONICS', [Validators.required]],
      warehouseId: [this.itemToEdit?.warehouseId ?? 'WH-SP-001', [Validators.required]],
      quantity: [this.itemToEdit?.quantity ?? 100, [Validators.required, Validators.min(0)]],
      minThreshold: [this.itemToEdit?.minThreshold ?? 10, [Validators.required, Validators.min(1)]],
      unitPrice: [this.itemToEdit?.unitPrice ?? 49.9, [Validators.required, Validators.min(0.01)]],
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    const value = this.form.value;
    this.save.emit({
      sku: value.sku,
      name: value.name,
      category: value.category as InventoryCategory,
      warehouseId: value.warehouseId,
      quantity: Number(value.quantity),
      minThreshold: Number(value.minThreshold),
      unitPrice: Number(value.unitPrice),
    });
  }
}
