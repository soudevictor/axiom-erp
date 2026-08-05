import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MainLayoutComponent } from '@/shared/ui/layout/main-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent],
  template: `<app-main-layout />`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = 'AxiomERP';
}
