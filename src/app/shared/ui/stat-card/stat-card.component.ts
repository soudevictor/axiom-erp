import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown } from 'lucide-angular';

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
      class="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {{ title }}
        </span>
        @if (iconName) {
          <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <lucide-icon [name]="iconName" [size]="18" />
          </div>
        }
      </div>

      <div class="mt-2 flex items-baseline justify-between gap-2">
        <span class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {{ formattedValue }}
        </span>

        @if (trend) {
          <div
            class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            [ngClass]="
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
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
        <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
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

  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly TrendingDownIcon = TrendingDown;

  protected get formattedValue(): string {
    if (typeof this.value === 'number') {
      return this.value.toLocaleString('pt-BR');
    }
    return this.value;
  }
}
