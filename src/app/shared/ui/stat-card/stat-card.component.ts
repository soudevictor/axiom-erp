import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LucideAngularModule, TrendingDown, TrendingUp } from 'lucide-angular';

export type LucideIconData = readonly (readonly [string, Record<string, string>])[];

export interface StatTrend {
  readonly value: number;
  readonly isPositive: boolean;
  readonly label?: string;
  readonly tone?: 'positive' | 'negative' | 'neutral';
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-w-0 px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="truncate text-xs font-medium text-content-muted">{{ title }}</span>
        @if (icon) {
          <lucide-icon [img]="icon" [size]="15" class="ml-auto shrink-0 text-content-disabled" />
        } @else if (iconName) {
          <lucide-icon [name]="iconName" [size]="15" class="ml-auto shrink-0 text-content-disabled" />
        }
      </div>

      <div class="mt-1 flex min-w-0 items-baseline gap-2">
        <span
          class="min-w-0 truncate font-mono text-[26px] font-medium leading-8 tracking-tight text-content-primary tabular-nums"
          [ngClass]="valueClass"
          [title]="tooltipText || formattedValue"
        >
          {{ formattedValue }}
        </span>

        @if (trend) {
          <span
            class="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium"
            [class]="trendClass"
          >
            @if (trend.tone === 'neutral') {
              <span>{{ trend.value }}%</span>
            } @else if (trend.isPositive) {
              <lucide-icon [img]="TrendingUpIcon" [size]="13" />
              <span>+{{ trend.value }}%</span>
            } @else {
              <lucide-icon [img]="TrendingDownIcon" [size]="13" />
              <span>-{{ trend.value }}%</span>
            }
          </span>
        }
      </div>

      @if (subtitle || (trend && trend.label)) {
        <p class="mt-0.5 truncate text-xs text-content-muted">{{ subtitle || trend?.label }}</p>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input() trend?: StatTrend;
  @Input() subtitle?: string;
  @Input() iconName?: string;
  @Input() icon?: LucideIconData;
  @Input() tooltipText?: string;
  @Input() valueClass?: string | string[] | Record<string, boolean>;

  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly TrendingDownIcon = TrendingDown;

  protected get formattedValue(): string {
    return typeof this.value === 'number' ? this.value.toLocaleString('pt-BR') : this.value;
  }

  protected get trendClass(): string {
    if (!this.trend) return '';
    const tone = this.trend.tone ?? (this.trend.isPositive ? 'positive' : 'negative');
    if (tone === 'positive') return 'text-state-success';
    if (tone === 'negative') return 'text-state-danger';
    return 'text-content-muted';
  }
}
