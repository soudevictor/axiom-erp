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
      class="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0"
          [ngClass]="containerClasses[toast.type]"
          role="alert"
        >
          <div class="mt-0.5 shrink-0">
            @switch (toast.type) {
              @case ('SUCCESS') {
                <lucide-icon [img]="CheckCircleIcon" class="text-emerald-500" [size]="20" />
              }
              @case ('WARNING') {
                <lucide-icon [img]="AlertTriangleIcon" class="text-amber-500" [size]="20" />
              }
              @case ('ERROR') {
                <lucide-icon [img]="AlertCircleIcon" class="text-rose-500" [size]="20" />
              }
              @case ('INFO') {
                <lucide-icon [img]="InfoIcon" class="text-sky-500" [size]="20" />
              }
            }
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {{ toast.title }}
            </h4>
            @if (toast.message) {
              <p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {{ toast.message }}
              </p>
            }
          </div>

          <button
            type="button"
            class="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
    SUCCESS:
      'bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-slate-900 dark:text-slate-100',
    WARNING:
      'bg-white/95 dark:bg-slate-900/95 border-amber-500/30 text-slate-900 dark:text-slate-100',
    ERROR:
      'bg-white/95 dark:bg-slate-900/95 border-rose-500/30 text-slate-900 dark:text-slate-100',
    INFO:
      'bg-white/95 dark:bg-slate-900/95 border-sky-500/30 text-slate-900 dark:text-slate-100',
  };
}
