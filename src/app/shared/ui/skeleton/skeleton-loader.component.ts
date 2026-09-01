import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonShape = 'rectangle' | 'circle' | 'text';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-2 w-full" aria-busy="true" aria-label="Carregando conteúdo">
      @for (item of items; track $index) {
        <div
          class="animate-pulse bg-canvas-elevated border border-border-subtle transition-all"
          [ngClass]="shapeClasses"
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
  @Input() width: string = '100%';
  @Input() height: string = '3rem';
  @Input() shape: SkeletonShape = 'rectangle';
  @Input() count: number = 1;

  protected get items(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }

  protected get shapeClasses(): string {
    switch (this.shape) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      case 'rectangle':
      default:
        return 'rounded-lg';
    }
  }
}
