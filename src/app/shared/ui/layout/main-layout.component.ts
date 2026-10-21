import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LayoutService } from './layout.service';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { ToastComponent } from '@/shared/ui/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-fill focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Pular para o conteúdo
    </a>

    <div class="flex min-h-dvh bg-canvas-base">
      <app-sidebar />

      <div
        class="flex min-w-0 flex-1 flex-col"
        [attr.inert]="layout.mobileOpen() ? '' : null"
        [attr.aria-hidden]="layout.mobileOpen() ? 'true' : null"
      >
        <app-header />

        <main id="main-content" tabindex="-1" class="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div class="mx-auto w-full max-w-[1440px]">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>

    <app-toast />
  `,
})
export class MainLayoutComponent {
  protected readonly layout = inject(LayoutService);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.layout.closeMobile());
  }
}
