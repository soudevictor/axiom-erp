import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { inject } from '@angular/core';
import {
  LucideAngularModule,
  X,
  Save,
} from 'lucide-angular';
import type {
  TransactionCategory,
  TransactionType,
  TreasuryTransaction,
} from '@/core/models/treasury.model';

export type TransactionFormValue = Omit<TreasuryTransaction, 'id'>;

@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      (click)="onBackdropClick($event)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div
        class="relative w-full max-w-lg p-6 bg-canvas-elevated border border-border-strong rounded-xl shadow-2xl space-y-5 text-content-primary"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-border-subtle">
          <h2 id="tx-modal-title" class="text-base font-bold text-content-primary tracking-tight">
            Novo Lançamento Financeiro
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            class="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Fechar modal"
          >
            <lucide-icon [img]="XIcon" [size]="18" />
          </button>
        </div>

        <!-- Reactive Form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4" novalidate>

          <!-- Description -->
          <div>
            <label for="tx-description" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
              Descrição *
            </label>
            <input
              id="tx-description"
              type="text"
              formControlName="description"
              placeholder="Ex: Recebimento Nota Fiscal 4521"
              class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              [attr.aria-invalid]="isInvalid('description') ? 'true' : null"
              aria-describedby="tx-description-error"
            />
            @if (isInvalid('description')) {
              <span id="tx-description-error" class="text-[11px] text-state-danger mt-1 block" role="alert">
                Descrição é obrigatória (mínimo 3 caracteres).
              </span>
            }
          </div>

          <!-- Parceiro -->
          <div>
            <label for="tx-partner" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
              Parceiro B2B *
            </label>
            <input
              id="tx-partner"
              type="text"
              formControlName="partnerName"
              placeholder="Ex: TechSupply Brasil Distribuidora Ltda"
              class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            />
          </div>

          <!-- Amount + Type -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Amount -->
            <div>
              <label for="tx-amount" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Valor (R$) *
              </label>
              <input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                formControlName="amount"
                placeholder="0,00"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors font-mono"
                [attr.aria-invalid]="isInvalid('amount') ? 'true' : null"
              />
              @if (isInvalid('amount')) {
                <span class="text-[11px] text-state-danger mt-1 block" role="alert">
                  Valor deve ser maior que zero.
                </span>
              }
            </div>

            <!-- Type -->
            <div>
              <label for="tx-type" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Tipo *
              </label>
              <select
                id="tx-type"
                formControlName="type"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              >
                <option value="INCOME">Entrada (Recebimento)</option>
                <option value="EXPENSE">Saída (Pagamento)</option>
              </select>
            </div>
          </div>

          <!-- Category + Due Date -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Category -->
            <div>
              <label for="tx-category" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                id="tx-category"
                formControlName="category"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand transition-colors"
              >
                <option value="CLIENT_RECEIPT">Recebimento de Cliente</option>
                <option value="SUPPLIER_PAYMENT">Pagamento a Fornecedor</option>
                <option value="LOGISTICS">Logística / Frete</option>
                <option value="TAXES">Impostos / Taxas</option>
              </select>
            </div>

            <!-- Due Date -->
            <div>
              <label for="tx-due-date" class="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
                Vencimento *
              </label>
              <input
                id="tx-due-date"
                type="date"
                formControlName="dueDate"
                class="w-full px-3 py-2 rounded-lg bg-canvas-base border border-border-strong text-xs text-content-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors font-mono"
                [attr.aria-invalid]="isInvalid('dueDate') ? 'true' : null"
              />
              @if (isInvalid('dueDate')) {
                <span class="text-[11px] text-state-danger mt-1 block" role="alert">
                  Data de vencimento é obrigatória.
                </span>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              (click)="close.emit()"
              class="px-4 py-2 rounded-lg text-xs font-medium text-content-muted hover:text-content-primary hover:bg-canvas-surface transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || submitting"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs shadow-brand-glow transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            >
              <lucide-icon [img]="SaveIcon" [size]="16" />
              {{ submitting ? 'Salvando…' : 'Salvar Lançamento' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionModalComponent {
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<TransactionFormValue>();

  protected readonly XIcon = X;
  protected readonly SaveIcon = Save;

  private readonly fb = inject(FormBuilder);

  protected submitting = false;

  protected readonly form: FormGroup = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(3)]],
    partnerName: ['', [Validators.required]],
    type: ['INCOME' as TransactionType, [Validators.required]],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    category: ['CLIENT_RECEIPT' as TransactionCategory, [Validators.required]],
    dueDate: ['', [Validators.required]],
    status: ['PENDING'],
    partnerId: ['MANUAL'],
  });

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.touched && ctrl.invalid);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value as {
      description: string;
      partnerName: string;
      type: TransactionType;
      amount: number;
      category: TransactionCategory;
      dueDate: string;
      status: 'PENDING';
      partnerId: string;
    };

    const payload: TransactionFormValue = {
      description: raw.description,
      partnerName: raw.partnerName,
      type: raw.type,
      amount: Number(raw.amount),
      category: raw.category,
      dueDate: new Date(raw.dueDate).toISOString(),
      status: 'PENDING',
      partnerId: raw.partnerId || 'MANUAL',
    };

    this.submitting = true;
    this.save.emit(payload);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
