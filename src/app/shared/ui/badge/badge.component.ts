import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors"
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
    SUCCESS: 'bg-state-success-subtle text-state-success border-state-success/20',
    WARNING: 'bg-state-warning-subtle text-state-warning border-state-warning/20',
    DANGER:  'bg-state-danger-subtle  text-state-danger  border-state-danger/20',
    INFO:    'bg-state-info-subtle    text-state-info    border-state-info/20',
  };

  protected readonly dotClasses: Record<BadgeVariant, string> = {
    SUCCESS: 'bg-state-success',
    WARNING: 'bg-state-warning',
    DANGER:  'bg-state-danger',
    INFO:    'bg-state-info',
  };
}
