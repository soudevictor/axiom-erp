import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { MonthlyCashflow } from '@/core/models/treasury.model';
import { formatBrl, formatCompactBrl } from '@/shared/utils/currency-formatter';

interface ChartMetrics {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly font: number;
}

interface BarGeometry {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly value: number;
}

interface GroupGeometry {
  readonly month: string;
  readonly label: string;
  readonly fullLabel: string;
  readonly income: BarGeometry;
  readonly expense: BarGeometry;
  readonly balance: { readonly cx: number; readonly cy: number; readonly value: number };
}

@Component({
  selector: 'app-cashflow-chart',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="ui-panel flex h-full flex-col overflow-hidden">
      <figcaption class="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <h2 class="text-sm font-medium text-content-primary">Fluxo realizado — últimos 6 meses</h2>
          <p class="mt-0.5 text-xs text-content-muted">Receitas e despesas concluídas, por mês de pagamento.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="hidden items-center gap-3 text-[11px] text-content-muted sm:flex" aria-hidden="true">
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-brand-fill"></span>Receitas</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-content-muted"></span>Despesas</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-0.5 w-4 bg-content-primary"></span>Saldo</span>
          </div>
          @if (hasData()) {
            <button
              type="button"
              class="ui-btn h-8 px-2.5 text-xs"
              [attr.aria-expanded]="showTable()"
              aria-controls="cashflow-data"
              (click)="showTable.set(!showTable())"
            >
              {{ showTable() ? 'Ver gráfico' : 'Ver dados' }}
            </button>
          }
        </div>
      </figcaption>

      @if (!hasData()) {
        <div class="flex flex-col items-center px-4 py-16 text-center">
          <p class="text-sm font-medium text-content-primary">Ainda não há fluxo realizado</p>
          <p class="mt-1 max-w-[42ch] text-sm text-content-muted">
            Conclua receitas e despesas na tesouraria para acompanhar o fluxo mensal.
          </p>
          <a routerLink="/treasury" class="ui-btn mt-4">Ir para a tesouraria</a>
        </div>
      } @else if (showTable()) {
        <div id="cashflow-data" class="overflow-x-auto p-4">
          <table class="ui-table">
            <caption class="sr-only">Fluxo realizado dos últimos seis meses</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col" class="text-right">Receitas</th>
                <th scope="col" class="text-right">Despesas</th>
                <th scope="col" class="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              @for (row of monthly(); track row.month) {
                <tr>
                  <th scope="row" class="px-3 text-left text-xs font-medium text-content-primary">{{ fullMonth(row.month) }}</th>
                  <td class="text-right font-mono text-xs tabular-nums text-content-primary">{{ formatCurrency(row.income) }}</td>
                  <td class="text-right font-mono text-xs tabular-nums text-content-muted">{{ formatCurrency(row.expense) }}</td>
                  <td class="text-right font-mono text-xs tabular-nums" [class]="row.balance < 0 ? 'text-state-danger' : 'text-content-primary'">{{ formatCurrency(row.balance) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="flex flex-1 items-center p-4">
          <svg
            [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
            class="h-auto w-full"
            role="img"
            aria-labelledby="cashflow-svg-title cashflow-svg-desc"
          >
            <title id="cashflow-svg-title">Fluxo de caixa realizado dos últimos seis meses</title>
            <desc id="cashflow-svg-desc">Receitas e despesas concluídas por mês, com linha de saldo.</desc>

            @for (tick of ticks(); track tick.value) {
              <line
                [attr.x1]="left()"
                [attr.x2]="width() - right()"
                [attr.y1]="tick.y"
                [attr.y2]="tick.y"
                class="stroke-border-subtle"
                stroke-width="1"
              />
              <text [attr.x]="left() - 8" [attr.y]="tick.y + 3" text-anchor="end" class="fill-content-muted" [attr.font-size]="chartFont()">
                {{ tick.label }}
              </text>
            }

            <line
              [attr.x1]="left()"
              [attr.x2]="width() - right()"
              [attr.y1]="zeroY()"
              [attr.y2]="zeroY()"
              class="stroke-border-strong"
              stroke-width="1"
            />

            @for (group of groups(); track group.month) {
              <rect
                [attr.x]="group.income.x"
                [attr.y]="group.income.y"
                [attr.width]="barWidth()"
                [attr.height]="group.income.height"
                rx="2"
                class="fill-brand-fill transition-opacity hover:opacity-80"
              >
                <title>{{ group.fullLabel }} · Receitas {{ formatCurrency(group.income.value) }}</title>
              </rect>
              <rect
                [attr.x]="group.expense.x"
                [attr.y]="group.expense.y"
                [attr.width]="barWidth()"
                [attr.height]="group.expense.height"
                rx="2"
                class="fill-content-muted transition-opacity hover:opacity-70"
              >
                <title>{{ group.fullLabel }} · Despesas {{ formatCurrency(group.expense.value) }}</title>
              </rect>

              <text
                [attr.x]="group.balance.cx"
                [attr.y]="height() - 16"
                text-anchor="middle"
                class="fill-content-muted"
                [attr.font-size]="chartFont()"
              >
                {{ group.label }}
              </text>
            }

            <path [attr.d]="linePath()" class="stroke-content-primary" fill="none" stroke-width="1.5" />

            @for (group of groups(); track group.month) {
              <circle
                [attr.cx]="group.balance.cx"
                [attr.cy]="group.balance.cy"
                r="3"
                class="fill-canvas-surface stroke-content-primary"
                stroke-width="1.5"
              >
                <title>{{ group.fullLabel }} · Saldo {{ formatCurrency(group.balance.value) }}</title>
              </circle>
            }
          </svg>
        </div>
      }
    </figure>
  `,
})
export class CashflowChartComponent {
  readonly monthly = input<readonly MonthlyCashflow[]>([]);

  protected readonly showTable = signal(false);
  protected readonly formatCurrency = formatBrl;

  private readonly breakpoint = inject(BreakpointObserver);
  private readonly isNarrow = toSignal(
    this.breakpoint.observe('(max-width: 639px)').pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  private readonly metrics = computed<ChartMetrics>(() =>
    this.isNarrow()
      ? { width: 360, height: 300, left: 48, right: 8, top: 16, bottom: 52, font: 9 }
      : { width: 720, height: 300, left: 64, right: 16, top: 20, bottom: 52, font: 11 }
  );

  protected readonly width = computed(() => this.metrics().width);
  protected readonly height = computed(() => this.metrics().height);
  protected readonly left = computed(() => this.metrics().left);
  protected readonly right = computed(() => this.metrics().right);
  protected readonly chartFont = computed(() => this.metrics().font);

  protected readonly hasData = computed(() =>
    this.monthly().some((month) => month.income > 0 || month.expense > 0)
  );

  private readonly scale = computed(() => {
    const months = this.monthly();
    const values = months.flatMap((month) => [month.income, month.expense, month.balance]);
    const maximum = Math.max(1, ...values);
    const minimum = Math.min(0, ...values);
    return {
      maximum,
      minimum,
      range: Math.max(1, maximum - minimum),
    };
  });

  private readonly yFor = computed(() => {
    const { maximum, range } = this.scale();
    const { top, height, bottom } = this.metrics();
    const plotHeight = height - top - bottom;
    return (value: number): number => top + ((maximum - value) / range) * plotHeight;
  });

  protected readonly zeroY = computed(() => this.yFor()(0));

  protected readonly ticks = computed(() => {
    const { maximum, minimum } = this.scale();
    const yFor = this.yFor();
    return Array.from({ length: 4 }, (_, index) => {
      const value = maximum - ((maximum - minimum) / 3) * index;
      return { value, y: yFor(value), label: formatCompactBrl(value) };
    });
  });

  protected readonly groups = computed<readonly GroupGeometry[]>(() => {
    const months = this.monthly();
    const yFor = this.yFor();
    const zero = this.zeroY();
    const { width, left, right } = this.metrics();
    const plotWidth = width - left - right;
    const groupWidth = plotWidth / Math.max(1, months.length);
    const bar = Math.min(18, groupWidth * 0.24);
    const gap = 4;

    return months.map((month, index) => {
      const center = left + groupWidth * (index + 0.5);
      const incomeY = yFor(month.income);
      const expenseY = yFor(month.expense);
      const balanceY = yFor(month.balance);
      return {
        month: month.month,
        label: this.shortMonth(month.month),
        fullLabel: this.fullMonth(month.month),
        income: {
          x: center - bar - gap / 2,
          y: Math.min(incomeY, zero),
          height: Math.abs(zero - incomeY),
          value: month.income,
        },
        expense: {
          x: center + gap / 2,
          y: Math.min(expenseY, zero),
          height: Math.abs(zero - expenseY),
          value: month.expense,
        },
        balance: { cx: center, cy: balanceY, value: month.balance },
      };
    });
  });

  protected readonly barWidth = computed(() => {
    const { width, left, right } = this.metrics();
    const plotWidth = width - left - right;
    const groupWidth = plotWidth / Math.max(1, this.monthly().length);
    return Math.min(18, groupWidth * 0.24);
  });

  protected readonly linePath = computed(() => {
    return this.groups()
      .map((group, index) => `${index === 0 ? 'M' : 'L'} ${group.balance.cx} ${group.balance.cy}`)
      .join(' ');
  });

  protected shortMonth(month: string): string {
    const date = this.parseMonth(month);
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(date)
      .replace('.', '');
    return `${name}/${String(date.getFullYear()).slice(-2)}`;
  }

  protected fullMonth(month: string): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      this.parseMonth(month)
    );
  }

  private parseMonth(month: string): Date {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, (monthNumber ?? 1) - 1, 1, 12, 0, 0);
  }
}
