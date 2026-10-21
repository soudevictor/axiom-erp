import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type SkeletonShape = 'rectangle' | 'circle' | 'text';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    <div class="flex w-full flex-col gap-2" aria-busy="true" aria-label="Carregando conteúdo">
      <span class="sr-only">Carregando conteúdo</span>
      @for (item of items; track $index) {
        <div
          class="ui-skeleton"
          [class.rounded-full]="shape === 'circle'"
          [class.rounded]="shape === 'text'"
          [class.rounded-lg]="shape === 'rectangle'"
          [style.width]="width"
          [style.height]="height"
          aria-hidden="true"
        ></div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoaderComponent {
  @Input() width = '100%';
  @Input() height = '3rem';
  @Input() shape: SkeletonShape = 'rectangle';
  @Input() count = 1;

  protected get items(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, index) => index);
  }
}
