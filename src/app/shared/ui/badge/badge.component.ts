import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BadgeVariant = 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span class="ui-status" [class]="variantClasses[variant]">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="dotClasses[variant]" aria-hidden="true"></span>
      <ng-content>{{ label }}</ng-content>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input({ required: true }) variant: BadgeVariant = 'INFO';
  @Input() label?: string;

  protected readonly variantClasses: Record<BadgeVariant, string> = {
    SUCCESS: 'border-state-success/30 bg-state-success-subtle text-state-success',
    WARNING: 'border-state-warning/30 bg-state-warning-subtle text-state-warning',
    DANGER: 'border-state-danger/30 bg-state-danger-subtle text-state-danger',
    INFO: 'border-state-info/30 bg-state-info-subtle text-state-info',
    NEUTRAL: 'border-border-strong bg-canvas-elevated text-content-muted',
  };

  protected readonly dotClasses: Record<BadgeVariant, string> = {
    SUCCESS: 'bg-state-success',
    WARNING: 'bg-state-warning',
    DANGER: 'bg-state-danger',
    INFO: 'bg-state-info',
    NEUTRAL: 'bg-content-disabled',
  };
}
