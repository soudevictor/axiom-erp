import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors"
      [ngClass]="variantClasses[variant]"
    >
      <span
        class="w-1.5 h-1.5 rounded-full animate-pulse"
        [ngClass]="dotClasses[variant]"
        aria-hidden="true"
      ></span>
      <ng-content>{{ label }}</ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input({ required: true }) variant: BadgeVariant = 'INFO';
  @Input() label?: string;

  protected readonly variantClasses: Record<BadgeVariant, string> = {
    SUCCESS:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    WARNING:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    DANGER:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    INFO:
      'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  };

  protected readonly dotClasses: Record<BadgeVariant, string> = {
    SUCCESS: 'bg-emerald-500',
    WARNING: 'bg-amber-500',
    DANGER: 'bg-rose-500',
    INFO: 'bg-sky-500',
  };
}
