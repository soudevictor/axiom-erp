import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { X, LucideAngularModule } from 'lucide-angular';
import { OverlayScrollLockService } from '@/shared/ui/overlay-scroll-lock.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [A11yModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[55] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <button
          type="button"
          class="ui-scrim absolute inset-0"
          [attr.aria-label]="'Fechar ' + title()"
          (click)="onBackdrop()"
        ></button>

        <section
          #dialog
          tabindex="-1"
          class="relative flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-xl border border-border-subtle bg-canvas-surface shadow-overlay sm:max-h-[calc(100dvh-4rem)] sm:rounded-lg"
          [style.max-width]="maxWidth()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          [attr.aria-describedby]="description() ? 'modal-description' : null"
          [cdkTrapFocus]="true"
          [cdkTrapFocusAutoCapture]="true"
        >
          <header class="flex shrink-0 items-start gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">
            <div class="min-w-0 flex-1">
              <h2 id="modal-title" class="text-base font-semibold leading-6 text-content-primary">
                {{ title() }}
              </h2>
              @if (description()) {
                <p id="modal-description" class="mt-0.5 text-sm text-content-muted">{{ description() }}</p>
              }
            </div>
            <button type="button" class="ui-icon-btn -mr-1 -mt-0.5" aria-label="Fechar" (click)="close()">
              <lucide-icon [img]="X" [size]="17" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <ng-content />
          </div>

          <div class="shrink-0 border-t border-border-subtle bg-canvas-surface">
            <ng-content select="[modal-footer]" />
          </div>
        </section>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('Detalhes');
  readonly description = input<string | null>(null);
  readonly maxWidth = input('560px');
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  protected readonly X = X;

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollLock = inject(OverlayScrollLockService);
  private previousFocus: HTMLElement | null = null;
  private bodyLocked = false;

  constructor() {
    effect(() => {
      if (this.open()) {
        if (!this.bodyLocked) {
          this.previousFocus = document.activeElement as HTMLElement | null;
          this.scrollLock.lock();
          this.bodyLocked = true;
          window.setTimeout(() => {
            const dialog = this.dialog()?.nativeElement;
            const target = dialog?.querySelector<HTMLElement>('[data-autofocus]');
            (target ?? dialog)?.focus();
          }, 0);
        }
      } else if (this.bodyLocked) {
        this.scrollLock.unlock();
        this.bodyLocked = false;
        this.previousFocus?.focus();
        this.previousFocus = null;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.bodyLocked) this.scrollLock.unlock();
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdrop(): void {
    if (this.closeOnBackdrop()) this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }
}
