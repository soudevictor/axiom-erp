import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-angular';
import { ToastService, type ToastType } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevation-2 backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-2"
          [ngClass]="containerClasses[toast.type]"
          role="alert"
        >
          <div class="mt-0.5 shrink-0" aria-hidden="true">
            @switch (toast.type) {
              @case ('SUCCESS') {
                <lucide-icon [img]="CheckCircleIcon" class="text-state-success" [size]="20" />
              }
              @case ('WARNING') {
                <lucide-icon [img]="AlertTriangleIcon" class="text-state-warning" [size]="20" />
              }
              @case ('ERROR') {
                <lucide-icon [img]="AlertCircleIcon" class="text-state-danger" [size]="20" />
              }
              @case ('INFO') {
                <lucide-icon [img]="InfoIcon" class="text-state-info" [size]="20" />
              }
            }
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-content-primary leading-tight">
              {{ toast.title }}
            </h4>
            @if (toast.message) {
              <p class="mt-1 text-xs text-content-muted leading-relaxed">
                {{ toast.message }}
              </p>
            }
          </div>

          <button
            type="button"
            class="shrink-0 p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
            (click)="toastService.remove(toast.id)"
            aria-label="Fechar notificação"
          >
            <lucide-icon [img]="XIcon" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly InfoIcon = Info;
  protected readonly XIcon = X;

  protected readonly containerClasses: Record<ToastType, string> = {
    SUCCESS: 'bg-canvas-elevated border-state-success/30 text-content-primary',
    WARNING: 'bg-canvas-elevated border-state-warning/30 text-content-primary',
    ERROR:   'bg-canvas-elevated border-state-danger/30  text-content-primary',
    INFO:    'bg-canvas-elevated border-state-info/30    text-content-primary',
  };
}
