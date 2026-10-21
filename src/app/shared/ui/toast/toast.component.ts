import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  LucideAngularModule,
  X,
} from 'lucide-angular';
import { ToastService, type ToastType } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-[380px] flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-canvas-surface p-3 shadow-overlay"
          [class]="borderClass[toast.type]"
          role="status"
          (mouseenter)="toastService.pause(toast.id)"
          (mouseleave)="toastService.resume(toast.id)"
          (focusin)="toastService.pause(toast.id)"
          (focusout)="toastService.resume(toast.id)"
        >
          <span class="mt-0.5 shrink-0" aria-hidden="true">
            @switch (toast.type) {
              @case ('SUCCESS') {
                <lucide-icon [img]="CheckCircle" [size]="18" class="text-state-success" />
              }
              @case ('WARNING') {
                <lucide-icon [img]="AlertTriangle" [size]="18" class="text-state-warning" />
              }
              @case ('ERROR') {
                <lucide-icon [img]="AlertCircle" [size]="18" class="text-state-danger" />
              }
              @case ('INFO') {
                <lucide-icon [img]="Info" [size]="18" class="text-state-info" />
              }
            }
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium leading-5 text-content-primary">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="mt-0.5 text-xs leading-5 text-content-muted">{{ toast.message }}</p>
            }
          </div>

          @if (toast.action) {
            <button
              type="button"
              class="h-7 shrink-0 rounded px-1.5 text-xs font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:bg-brand-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              (click)="toastService.runAction(toast.id)"
            >
              {{ toast.action.label }}
            </button>
          }

          <button
            type="button"
            class="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-content-muted transition-colors hover:bg-canvas-elevated hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Fechar notificação"
            (click)="toastService.remove(toast.id)"
          >
            <lucide-icon [img]="X" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected readonly CheckCircle = CheckCircle;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly AlertCircle = AlertCircle;
  protected readonly Info = Info;
  protected readonly X = X;

  protected readonly borderClass: Record<ToastType, string> = {
    SUCCESS: 'border-l-2 border-l-state-success border-border-subtle',
    WARNING: 'border-l-2 border-l-state-warning border-border-subtle',
    ERROR: 'border-l-2 border-l-state-danger border-border-subtle',
    INFO: 'border-l-2 border-l-state-info border-border-subtle',
  };
}
