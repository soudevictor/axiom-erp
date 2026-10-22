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
  PARTNER_STATUS_LABELS,
  PARTNER_STATUS_TRANSITIONS,
  type B2BPartner,
  type PartnerStatus,
} from '@/core/models/partner.model';
import { PartnersStore } from '@/features/partners/data-access/partners.store';
import { ModalComponent } from '@/shared/ui/modal/modal.component';

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string } | null;
    return body?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

@Component({
  selector: 'app-partner-status-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      title="Alterar homologação"
      [description]="partner()?.companyName ?? null"
      maxWidth="520px"
      (closed)="closed.emit()"
    >
      @if (partner(); as current) {
        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-canvas-elevated px-3 py-2.5">
            <span class="text-sm text-content-muted">Status atual</span>
            <span class="text-sm font-medium text-content-primary">{{ statusLabels[current.status] }}</span>
          </div>

          <div>
            <label for="partner-status-target" class="ui-label">Novo status</label>
            <select
              id="partner-status-target"
              class="ui-field"
              data-autofocus
              [value]="target()"
              (change)="target.set($any($event.target).value)"
            >
              @for (status of allowedStatuses(); track status) {
                <option [value]="status">{{ statusLabels[status] }}</option>
              }
            </select>
          </div>

          <div>
            <label for="partner-status-reason" class="ui-label">
              Motivo
              @if (target() === 'BLOQUEADO') {
                <span class="text-state-danger">*</span>
              }
            </label>
            <textarea
              id="partner-status-reason"
              class="ui-field h-24 resize-none py-2"
              maxlength="240"
              placeholder="Descreva o contexto da mudança para a operação."
              [value]="reason()"
              (input)="reason.set($any($event.target).value)"
            ></textarea>
            <p class="mt-1 text-xs text-content-muted">
              @if (target() === 'BLOQUEADO') {
                O motivo é obrigatório e ficará visível no cadastro.
              } @else {
                Opcional, mas ajuda a auditoria da homologação.
              }
            </p>
          </div>

          @if (error()) {
            <div class="rounded-md border border-state-danger-border bg-state-danger-subtle px-3 py-2" role="alert">
              <p class="text-sm text-state-danger">{{ error() }}</p>
            </div>
          }
        </div>
      }

      <div modal-footer class="flex justify-end gap-2 px-4 py-3 sm:px-5">
        <button type="button" class="ui-btn" [disabled]="store.saving()" (click)="closed.emit()">
          Cancelar
        </button>
        <button
          type="button"
          class="ui-btn"
          [class.ui-btn-danger]="target() === 'BLOQUEADO'"
          [class.ui-btn-primary]="target() !== 'BLOQUEADO'"
          [disabled]="store.saving() || (target() === 'BLOQUEADO' && reason().trim().length === 0)"
          (click)="submit()"
        >
          {{ store.saving() ? 'Alterando…' : 'Confirmar status' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class PartnerStatusModalComponent {
  readonly open = input(false);
  readonly partner = input<B2BPartner | null>(null);
  readonly closed = output<void>();
  readonly changed = output<B2BPartner>();

  protected readonly store = inject(PartnersStore);
  protected readonly statusLabels = PARTNER_STATUS_LABELS;
  protected readonly target = signal<PartnerStatus>('HOMOLOGADO');
  protected readonly reason = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly allowedStatuses = computed<readonly PartnerStatus[]>(() => {
    const partner = this.partner();
    return partner ? PARTNER_STATUS_TRANSITIONS[partner.status] : [];
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const partner = this.partner();
      const allowed = partner ? PARTNER_STATUS_TRANSITIONS[partner.status] : [];
      this.target.set(allowed[0] ?? 'EM_ANALISE');
      this.reason.set('');
      this.error.set(null);
    });
  }

  protected async submit(): Promise<void> {
    const partner = this.partner();
    if (!partner) return;
    if (this.target() === 'BLOQUEADO' && !this.reason().trim()) {
      this.error.set('Informe o motivo do bloqueio.');
      return;
    }

    try {
      const updated = await this.store.changeStatus(partner.id, this.target(), this.reason().trim() || undefined);
      this.changed.emit(updated);
    } catch (error: unknown) {
      this.error.set(messageFrom(error, 'Não foi possível alterar o status.'));
    }
  }
}
