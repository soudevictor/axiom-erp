import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown } from 'lucide-angular';

export type LucideIconData = readonly (readonly [string, Record<string, string>])[];

export interface StatTrend {
  readonly value: number;
  readonly isPositive: boolean;
  readonly label?: string;
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="p-4 rounded-xl border border-border-subtle bg-canvas-surface shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200"
    >
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs font-semibold uppercase tracking-wider text-content-muted">
          {{ title }}
        </span>
        @if (icon) {
          <div class="p-2 rounded-lg bg-brand-subtle text-brand">
            <lucide-icon [img]="icon" [size]="18" />
          </div>
        } @else if (iconName) {
          <div class="p-2 rounded-lg bg-brand-subtle text-brand">
            <lucide-icon [name]="iconName" [size]="18" />
          </div>
        }
      </div>

      <div class="mt-2 flex items-baseline justify-between gap-2">
        <span class="text-2xl font-bold tracking-tight text-content-primary font-mono">
          {{ formattedValue }}
        </span>

        @if (trend) {
          <div
            class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            [ngClass]="
              trend.isPositive
                ? 'bg-state-success-subtle text-state-success'
                : 'bg-state-danger-subtle text-state-danger'
            "
          >
            @if (trend.isPositive) {
              <lucide-icon [img]="TrendingUpIcon" [size]="14" />
              <span>+{{ trend.value }}%</span>
            } @else {
              <lucide-icon [img]="TrendingDownIcon" [size]="14" />
              <span>-{{ trend.value }}%</span>
            }
          </div>
        }
      </div>

      @if (subtitle || (trend && trend.label)) {
        <p class="mt-2 text-xs text-content-muted">
          {{ subtitle || trend?.label }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input() trend?: StatTrend;
  @Input() subtitle?: string;
  @Input() iconName?: string;
  @Input() icon?: LucideIconData;

  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly TrendingDownIcon = TrendingDown;

  protected get formattedValue(): string {
    if (typeof this.value === 'number') {
      return this.value.toLocaleString('pt-BR');
    }
    return this.value;
  }
}
