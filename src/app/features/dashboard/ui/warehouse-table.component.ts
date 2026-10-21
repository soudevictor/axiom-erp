import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { WarehouseSummary } from '@/core/models/inventory.model';
import { warehouseLabel } from '@/core/models/warehouse.model';
import { formatBrl } from '@/shared/utils/currency-formatter';

interface WarehouseRow extends WarehouseSummary {
  readonly label: string;
  readonly share: number;
}

@Component({
  selector: 'app-warehouse-table',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="estoque-armazem" class="ui-panel scroll-mt-20 overflow-hidden" aria-labelledby="warehouse-title">
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <h2 id="warehouse-title" class="text-sm font-medium text-content-primary">Estoque por armazém</h2>
          <p class="mt-0.5 text-xs text-content-muted">Distribuição do valor imobilizado entre as cinco unidades.</p>
        </div>
        <a
          routerLink="/inventory"
          class="inline-flex items-center text-xs font-medium text-content-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Ver estoque
        </a>
      </header>

      @if (rows().length === 0) {
        <div class="px-4 py-8 text-center">
          <p class="text-sm font-medium text-content-primary">Sem dados por armazém</p>
          <p class="mt-1 text-sm text-content-muted">O resumo de estoque ainda não está disponível.</p>
        </div>
      } @else {
        <div class="hidden overflow-x-auto md:block">
          <table class="ui-table">
            <caption class="sr-only">Estoque por armazém, ordenado por valor</caption>
            <thead>
              <tr>
                <th scope="col">Armazém</th>
                <th scope="col" class="text-right">SKUs</th>
                <th scope="col" class="text-right">Unidades</th>
                <th scope="col" class="text-right">Valor</th>
                <th scope="col" class="w-[30%]">Participação</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.warehouseId) {
                <tr>
                  <th scope="row" class="px-3 text-left text-sm font-medium text-content-primary">{{ row.label }}</th>
                  <td class="text-right font-mono text-xs tabular-nums text-content-primary">{{ row.skus }}</td>
                  <td class="text-right font-mono text-xs tabular-nums text-content-primary">{{ formatNumber(row.units) }}</td>
                  <td class="text-right font-mono text-xs tabular-nums text-content-primary">{{ formatCurrency(row.value) }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-elevated" aria-hidden="true">
                        <div class="h-full rounded-full bg-brand" [style.width.%]="row.share"></div>
                      </div>
                      <span class="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-muted">{{ formatPercent(row.share) }}</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-border-strong">
                <th scope="row" class="px-3 py-2.5 text-left text-xs font-medium text-content-muted">Total</th>
                <td class="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-content-primary">{{ totalSkus() }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-content-primary">{{ formatNumber(totalUnits()) }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-content-primary">{{ formatCurrency(totalValue()) }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-content-muted">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="divide-y divide-border-subtle md:hidden">
          @for (row of rows(); track row.warehouseId) {
            <div class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-3">
                <p class="text-sm font-medium text-content-primary">{{ row.label }}</p>
                <p class="font-mono text-sm tabular-nums text-content-primary">{{ formatCurrency(row.value) }}</p>
              </div>
              <p class="mt-0.5 font-mono text-[11px] text-content-muted">{{ row.skus }} SKUs · {{ formatNumber(row.units) }} unidades</p>
              <div class="mt-2 flex items-center gap-2">
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas-elevated" aria-hidden="true">
                  <div class="h-full rounded-full bg-brand" [style.width.%]="row.share"></div>
                </div>
                <span class="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-muted">{{ formatPercent(row.share) }}</span>
              </div>
            </div>
          }
          <div class="flex items-baseline justify-between gap-3 bg-canvas-elevated px-4 py-3">
            <p class="text-xs font-medium text-content-muted">Total</p>
            <p class="font-mono text-xs tabular-nums text-content-primary">{{ formatCurrency(totalValue()) }}</p>
          </div>
        </div>
      }
    </section>
  `,
})
export class WarehouseTableComponent {
  readonly warehouses = input<readonly WarehouseSummary[]>([]);

  protected readonly formatCurrency = formatBrl;

  protected readonly rows = computed<readonly WarehouseRow[]>(() => {
    const sorted = [...this.warehouses()].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, row) => sum + row.value, 0);
    return sorted.map((row) => ({
      ...row,
      label: warehouseLabel(row.warehouseId),
      share: total > 0 ? (row.value / total) * 100 : 0,
    }));
  });

  protected readonly totalValue = computed(() =>
    this.rows().reduce((sum, row) => sum + row.value, 0)
  );
  protected readonly totalSkus = computed(() =>
    this.rows().reduce((sum, row) => sum + row.skus, 0)
  );
  protected readonly totalUnits = computed(() =>
    this.rows().reduce((sum, row) => sum + row.units, 0)
  );

  protected formatNumber(value: number): string {
    return value.toLocaleString('pt-BR');
  }

  protected formatPercent(value: number): string {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }
}
