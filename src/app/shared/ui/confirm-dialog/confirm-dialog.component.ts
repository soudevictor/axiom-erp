import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from '@/shared/ui/modal/modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      [title]="title()"
      [description]="description()"
      maxWidth="480px"
      [closeOnBackdrop]="!busy()"
      (closed)="cancelled.emit()"
    >
      <div class="flex items-start gap-2.5 rounded-md bg-canvas-elevated px-3 py-2.5">
        <span
          class="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          [class]="tone() === 'danger' ? 'bg-state-danger' : 'bg-state-warning'"
          aria-hidden="true"
        ></span>
        <p class="text-sm leading-5 text-content-muted">{{ message() }}</p>
      </div>

      <div modal-footer class="flex justify-end gap-2 px-4 py-3 sm:px-5">
        <button type="button" class="ui-btn" [disabled]="busy()" (click)="cancelled.emit()">
          Cancelar
        </button>
        <button
          type="button"
          class="ui-btn"
          [class.ui-btn-danger]="tone() === 'danger'"
          [class.ui-btn-primary]="tone() !== 'danger'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          {{ busy() ? 'Processando…' : confirmLabel() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar ação');
  readonly description = input<string | null>(null);
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly tone = input<'default' | 'danger'>('danger');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
