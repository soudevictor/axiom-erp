import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { OverlayScrollLockService } from '@/shared/ui/overlay-scroll-lock.service';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [A11yModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50">
        <button
          type="button"
          class="ui-scrim absolute inset-0"
          [attr.aria-label]="'Fechar ' + title()"
          (click)="close()"
        ></button>

        <section
          #panel
          tabindex="-1"
          class="absolute inset-y-0 right-0 flex w-full flex-col border-l border-border-subtle bg-canvas-surface shadow-overlay sm:max-w-[420px]"
          [style.max-width]="maxWidth()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          [attr.aria-describedby]="description() ? 'drawer-description' : null"
          [cdkTrapFocus]="true"
          [cdkTrapFocusAutoCapture]="true"
        >
          <header class="flex shrink-0 items-start gap-3 border-b border-border-subtle px-4 py-3.5">
            <div class="min-w-0 flex-1">
              <h2 id="drawer-title" class="text-base font-semibold leading-6 text-content-primary">{{ title() }}</h2>
              @if (description()) {
                <p id="drawer-description" class="mt-0.5 truncate text-sm text-content-muted">{{ description() }}</p>
              }
            </div>
            <button type="button" class="ui-icon-btn -mr-1 -mt-0.5" aria-label="Fechar painel" (click)="close()">
              <lucide-icon [img]="X" [size]="17" />
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <ng-content />
          </div>

          <div class="shrink-0 border-t border-border-subtle">
            <ng-content select="[drawer-footer]" />
          </div>
        </section>
      </div>
    }
  `,
})
export class DrawerComponent {
  readonly open = input(false);
  readonly title = input('Detalhes');
  readonly description = input<string | null>(null);
  readonly maxWidth = input('420px');
  readonly closed = output<void>();

  protected readonly X = X;

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollLock = inject(OverlayScrollLockService);
  private previousFocus: HTMLElement | null = null;
  private locked = false;

  constructor() {
    effect(() => {
      if (this.open()) {
        if (!this.locked) {
          this.previousFocus = document.activeElement as HTMLElement | null;
          this.scrollLock.lock();
          this.locked = true;
          window.setTimeout(() => {
            const panel = this.panel()?.nativeElement;
            const target = panel?.querySelector<HTMLElement>('[data-autofocus]');
            (target ?? panel)?.focus();
          }, 0);
        }
      } else if (this.locked) {
        this.scrollLock.unlock();
        this.locked = false;
        this.previousFocus?.focus();
        this.previousFocus = null;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.locked) this.scrollLock.unlock();
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }
}
