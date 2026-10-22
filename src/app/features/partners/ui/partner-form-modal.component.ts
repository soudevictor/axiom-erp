import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABELS,
  BRAZILIAN_STATES,
  type B2BPartner,
  type PartnerCategory,
  type PartnerInput,
} from '@/core/models/partner.model';
import { PartnersStore } from '@/features/partners/data-access/partners.store';
import { CnpjMaskDirective } from '@/shared/directives/cnpj-mask.directive';
import { ModalComponent } from '@/shared/ui/modal/modal.component';
import { isValidCnpj } from '@/shared/utils/cnpj-validator';

function cnpjValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value) return null;
  return isValidCnpj(value) ? null : { cnpj: true };
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const digits = String(control.value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.length === 10 || digits.length === 11 ? null : { phone: true };
}

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

@Component({
  selector: 'app-partner-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, CnpjMaskDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      [title]="partner() ? 'Editar parceiro' : 'Novo parceiro'"
      [description]="partner() ? 'Atualize os dados cadastrais e o limite de crédito.' : 'Cadastre um fornecedor, cliente ou distribuidor.'"
      maxWidth="680px"
      (closed)="closed.emit()"
    >
      <form id="partner-form" [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        @if (formError()) {
          <div class="rounded-md border border-state-danger-border bg-state-danger-subtle px-3 py-2" role="alert">
            <p class="text-sm text-state-danger">{{ formError() }}</p>
          </div>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="partner-cnpj" class="ui-label">CNPJ <span class="text-state-danger">*</span></label>
            <input
              id="partner-cnpj"
              type="text"
              formControlName="cnpj"
              appCnpjMask
              data-autofocus
              class="ui-field font-mono"
              placeholder="00.000.000/0000-00"
              autocomplete="off"
              [attr.aria-invalid]="form.controls.cnpj.touched && form.controls.cnpj.invalid"
              [attr.aria-describedby]="form.controls.cnpj.touched && form.controls.cnpj.invalid ? 'partner-cnpj-error' : null"
            />
            @if (form.controls.cnpj.touched && form.controls.cnpj.invalid) {
              <p id="partner-cnpj-error" class="mt-1 text-xs text-state-danger">
                Informe um CNPJ válido com 14 dígitos.
              </p>
            }
          </div>

          <div>
            <label for="partner-category" class="ui-label">Categoria <span class="text-state-danger">*</span></label>
            <select id="partner-category" formControlName="category" class="ui-field">
              @for (category of categories; track category) {
                <option [value]="category">{{ categoryLabels[category] }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2">
            <label for="partner-name" class="ui-label">Razão social <span class="text-state-danger">*</span></label>
            <input
              id="partner-name"
              type="text"
              formControlName="companyName"
              class="ui-field"
              maxlength="120"
              autocomplete="organization"
              [attr.aria-invalid]="form.controls.companyName.touched && form.controls.companyName.invalid"
            />
            @if (form.controls.companyName.touched && form.controls.companyName.invalid) {
              <p class="mt-1 text-xs text-state-danger">Informe uma razão social com pelo menos 3 caracteres.</p>
            }
          </div>

          <div>
            <label for="partner-trade-name" class="ui-label">Nome fantasia</label>
            <input id="partner-trade-name" type="text" formControlName="tradeName" class="ui-field" maxlength="120" />
          </div>

          <div>
            <label for="partner-state" class="ui-label">UF <span class="text-state-danger">*</span></label>
            <select id="partner-state" formControlName="state" class="ui-field">
              @for (state of states; track state) {
                <option [value]="state">{{ state }}</option>
              }
            </select>
          </div>

          <div>
            <label for="partner-limit" class="ui-label">Limite de crédito (R$) <span class="text-state-danger">*</span></label>
            <input
              id="partner-limit"
              type="number"
              formControlName="creditLimit"
              class="ui-field font-mono tabular-nums"
              min="0"
              step="0.01"
              [attr.aria-invalid]="form.controls.creditLimit.touched && form.controls.creditLimit.invalid"
            />
          </div>

          <div>
            <label for="partner-contact" class="ui-label">Contato</label>
            <input id="partner-contact" type="text" formControlName="contactName" class="ui-field" maxlength="80" autocomplete="name" />
          </div>

          <div>
            <label for="partner-email" class="ui-label">E-mail</label>
            <input id="partner-email" type="email" formControlName="email" class="ui-field" autocomplete="email" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-1 text-xs text-state-danger">Informe um e-mail válido.</p>
            }
          </div>

          <div>
            <label for="partner-phone" class="ui-label">Telefone</label>
            <input
              id="partner-phone"
              type="tel"
              formControlName="phone"
              class="ui-field font-mono"
              placeholder="(11) 98765-4321"
              autocomplete="tel"
            />
            @if (form.controls.phone.touched && form.controls.phone.invalid) {
              <p class="mt-1 text-xs text-state-danger">Informe DDD + telefone, com 10 ou 11 dígitos.</p>
            }
          </div>
        </div>

        <p class="text-xs text-content-muted">
          Novos parceiros entram como <strong class="font-medium text-content-primary">Em análise</strong> e precisam de homologação antes de operar.
        </p>
      </form>

      <div modal-footer class="flex justify-end gap-2 px-4 py-3 sm:px-5">
        <button type="button" class="ui-btn" [disabled]="store.saving()" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="partner-form" class="ui-btn ui-btn-primary" [disabled]="store.saving()">
          {{ store.saving() ? 'Salvando…' : partner() ? 'Salvar alterações' : 'Cadastrar parceiro' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class PartnerFormModalComponent {
  readonly open = input(false);
  readonly partner = input<B2BPartner | null>(null);
  readonly closed = output<void>();
  readonly saved = output<B2BPartner>();

  protected readonly store = inject(PartnersStore);
  private readonly fb = inject(FormBuilder);

  protected readonly categories = PARTNER_CATEGORIES;
  protected readonly categoryLabels = PARTNER_CATEGORY_LABELS;
  protected readonly states = BRAZILIAN_STATES;
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    cnpj: ['', [Validators.required, cnpjValidator]],
    companyName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    tradeName: ['', [Validators.maxLength(120)]],
    category: this.fb.nonNullable.control<PartnerCategory>('FORNECEDOR', Validators.required),
    state: ['SP', Validators.required],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
    contactName: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.email]],
    phone: ['', [phoneValidator]],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const partner = this.partner();
      this.formError.set(null);
      this.form.reset({
        cnpj: partner?.cnpj ?? '',
        companyName: partner?.companyName ?? '',
        tradeName: partner?.tradeName ?? '',
        category: partner?.category ?? 'FORNECEDOR',
        state: partner?.state ?? 'SP',
        creditLimit: partner?.creditLimit ?? 0,
        contactName: partner?.contactName ?? '',
        email: partner?.email ?? '',
        phone: partner?.phone ?? '',
      });
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const input: PartnerInput = {
      cnpj: value.cnpj,
      companyName: value.companyName.trim(),
      tradeName: value.tradeName.trim() || undefined,
      category: value.category,
      state: value.state,
      creditLimit: Number(value.creditLimit) || 0,
      contactName: value.contactName.trim() || undefined,
      email: value.email.trim() || undefined,
      phone: value.phone.trim() || undefined,
    };

    const editing = this.partner();
    try {
      const partner = editing
        ? await this.store.update(editing.id, input)
        : await this.store.create(input);
      this.saved.emit(partner);
    } catch (error: unknown) {
      this.formError.set(messageFrom(error, 'Não foi possível salvar o parceiro.'));
    }
  }
}
