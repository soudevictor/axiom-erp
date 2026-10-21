import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  LucideAngularModule,
  RefreshCw,
} from 'lucide-angular';
import type { CriticalInventoryItem } from '@/core/models/inventory.model';
import type { TreasuryTransaction } from '@/core/models/treasury.model';
import { formatBrl } from '@/shared/utils/currency-formatter';

type Severity = 'DANGER' | 'WARNING' | 'NEUTRAL';

type AlertAction = 'DETAIL' | 'LINK' | 'SCROLL' | 'RETRY';

interface AlertView {
  readonly kind: 'STOCK' | 'OVERDUE' | 'CREDIT' | 'CLEAR' | 'PARTIAL';
  readonly severity: Severity;
  readonly title: string;
  readonly context: string;
  readonly actionLabel: string;
  readonly action: AlertAction;
  readonly link?: string;
  readonly queryParams?: Record<string, string>;
}

const SEVERITY_CLASSES: Record<Severity, string> = {
  DANGER: 'border-state-danger/30 bg-state-danger-subtle',
  WARNING: 'border-state-warning/30 bg-state-warning-subtle',
  NEUTRAL: 'border-border-subtle bg-canvas-elevated',
};

const SEVERITY_TEXT: Record<Severity, string> = {
  DANGER: 'text-state-danger',
  WARNING: 'text-state-warning',
  NEUTRAL: 'text-content-muted',
};

const SEVERITY_RANK: Record<Severity, number> = {
  DANGER: 0,
  WARNING: 1,
  NEUTRAL: 2,
};

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-panel flex h-full flex-col" aria-labelledby="alerts-title">
      <header class="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <h2 id="alerts-title" class="text-sm font-medium text-content-primary">Alertas</h2>
        <span class="font-mono text-xs text-content-muted">
          @if (loading()) {
            Carregando…
          } @else {
            {{ alerts().length }} {{ alerts().length === 1 ? 'exceção' : 'exceções' }}
          }
        </span>
      </header>

      <div class="flex-1 space-y-3 p-4">
        @if (loading()) {
          <div class="space-y-3" aria-busy="true" aria-label="Carregando alertas">
            <div class="ui-skeleton h-24"></div>
            <div class="ui-skeleton h-24"></div>
          </div>
        } @else {
          @for (alert of alerts(); track alert.kind) {
          <article class="rounded-md border px-3 py-3" [class]="severityClasses[alert.severity]">
            <div class="flex items-start gap-2">
              <lucide-icon
                [img]="iconFor(alert.kind)"
                [size]="16"
                class="mt-0.5 shrink-0"
                [class]="severityText[alert.severity]"
              />
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-medium leading-5" [class]="severityText[alert.severity]">
                  {{ alert.title }}
                </h3>
                <p class="mt-1 text-xs leading-5 text-content-muted">{{ alert.context }}</p>

                @if (alert.kind === 'STOCK') {
                  @if (criticalItems().length > 0) {
                    <ul class="mt-2 space-y-1">
                      @for (item of visibleCriticalItems(); track item.id) {
                        <li>
                          <a
                            [routerLink]="['/inventory']"
                            [queryParams]="{ search: item.sku }"
                            class="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 font-mono text-[11px] text-content-primary hover:bg-canvas-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            <span class="truncate">{{ item.sku }} · {{ item.name }}</span>
                            <span class="shrink-0 tabular-nums text-content-muted">{{ item.quantity }}/{{ item.minThreshold }}</span>
                          </a>
                        </li>
                      }
                    </ul>
                  }
                }

                @if (alert.kind === 'CREDIT') {
                  <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-surface" aria-hidden="true">
                    <div class="h-full rounded-full bg-state-warning" [style.width.%]="creditBarWidth()"></div>
                  </div>
                }

                <div class="mt-2">
                  @switch (alert.action) {
                    @case ('DETAIL') {
                      <button
                        type="button"
                        class="text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        (click)="openOverdue.emit()"
                      >
                        {{ alert.actionLabel }}
                      </button>
                    }
                    @case ('RETRY') {
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        (click)="retry.emit()"
                      >
                        <lucide-icon [img]="RefreshCw" [size]="12" /> {{ alert.actionLabel }}
                      </button>
                    }
                    @case ('SCROLL') {
                      <a
                        href="#estoque-armazem"
                        class="text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {{ alert.actionLabel }}
                      </a>
                    }
                    @default {
                      <a
                        [routerLink]="alert.link"
                        [queryParams]="alert.queryParams ?? {}"
                        class="text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        {{ alert.actionLabel }}
                      </a>
                    }
                  }
                </div>
              </div>
            </div>
          </article>
        } @empty {
          <div class="rounded-md border border-border-subtle bg-canvas-elevated px-3 py-4" role="status">
            <p class="text-sm font-medium text-content-primary">Tudo em ordem</p>
            <p class="mt-1 text-xs leading-5 text-content-muted">
              Nenhuma exceção nas últimas 24 h. Revise os painéis para acompanhar a operação.
            </p>
            <a
              href="#estoque-armazem"
              class="mt-2 inline-block text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Revisar painéis
            </a>
          </div>
          }
        }
      </div>
    </section>
  `,
})
export class AlertPanelComponent {
  readonly loading = input(false);
  readonly stockReady = input(false);
  readonly criticalItems = input<readonly CriticalInventoryItem[]>([]);
  readonly lowStockCount = input(0);
  readonly outOfStockCount = input(0);

  readonly treasuryReady = input(false);
  readonly overdue = input<readonly TreasuryTransaction[]>([]);

  readonly partnersReady = input(false);
  readonly creditUsagePct = input(0);
  readonly blockedPartners = input(0);

  readonly openOverdue = output<void>();
  readonly retry = output<void>();

  protected readonly severityClasses = SEVERITY_CLASSES;
  protected readonly severityText = SEVERITY_TEXT;
  protected readonly RefreshCw = RefreshCw;

  protected readonly visibleCriticalItems = computed(() => this.criticalItems().slice(0, 3));
  protected readonly creditBarWidth = computed(() =>
    Math.min(100, Math.max(0, this.creditUsagePct()))
  );

  protected readonly alerts = computed<readonly AlertView[]>(() => {
    const alerts: AlertView[] = [];
    const overdue = this.overdue();

    if (this.treasuryReady() && overdue.length > 0) {
      const total = overdue.reduce((sum, transaction) => sum + transaction.amount, 0);
      alerts.push({
        kind: 'OVERDUE',
        severity: 'DANGER',
        title: 'Contas vencidas',
        context: `${overdue.length} ${overdue.length === 1 ? 'título' : 'títulos'} · ${formatBrl(total)}`,
        actionLabel: 'Ver detalhes',
        action: 'DETAIL',
      });
    }

    if (this.stockReady() && this.lowStockCount() > 0) {
      alerts.push({
        kind: 'STOCK',
        severity: this.outOfStockCount() > 0 ? 'DANGER' : 'WARNING',
        title: 'Estoque crítico',
        context: `${this.lowStockCount()} abaixo do mínimo · ${this.outOfStockCount()} zerados`,
        actionLabel: 'Ver estoque',
        action: 'LINK',
        link: '/inventory',
        queryParams: { status: 'LOW_STOCK' },
      });
    }

    if (
      this.partnersReady() &&
      (this.blockedPartners() > 0 || this.creditUsagePct() >= 80)
    ) {
      alerts.push({
        kind: 'CREDIT',
        severity: 'WARNING',
        title: 'Crédito de parceiros',
        context: `${this.creditUsagePct().toFixed(1)}% do limite · ${this.blockedPartners()} ${this.blockedPartners() === 1 ? 'bloqueado' : 'bloqueados'}`,
        actionLabel: 'Ver parceiros',
        action: 'LINK',
        link: '/partners',
        queryParams: this.blockedPartners() > 0 ? { status: 'BLOQUEADO' } : {},
      });
    }

    const failures = this.loading()
      ? 0
      : [!this.stockReady(), !this.treasuryReady(), !this.partnersReady()].filter(Boolean).length;

    if (failures > 0) {
      alerts.push({
        kind: 'PARTIAL',
        severity: 'WARNING',
        title: 'Indicadores parciais',
        context: `${failures} ${failures === 1 ? 'resumo não carregou' : 'resumos não carregaram'}. Os demais painéis continuam disponíveis.`,
        actionLabel: 'Tentar novamente',
        action: 'RETRY',
      });
    }

    return alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  });

  protected iconFor(kind: AlertView['kind']): typeof AlertTriangle {
    if (kind === 'OVERDUE') return Clock;
    if (kind === 'CREDIT') return CreditCard;
    if (kind === 'CLEAR') return CheckCircle2;
    if (kind === 'PARTIAL') return RefreshCw;
    return AlertTriangle;
  }
}
