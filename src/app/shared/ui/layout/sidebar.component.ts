import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LucideAngularModule,
  Package,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-angular';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: typeof LayoutDashboard;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside
      class="relative flex flex-col h-screen bg-canvas-surface border-r border-border-subtle text-content-muted transition-all duration-300 select-none z-30"
      [ngClass]="isCollapsed() ? 'w-22' : 'w-64'"
      aria-label="Navegação Principal"
    >
      <!-- Header / Logo -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
        <a
          routerLink="/"
          class="flex items-center gap-3 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-1"
        >
          <div class="flex items-center justify-center w-10 h-10 shrink-0">
            <img src="logoIcon.svg" alt="AxiomERP logo" width="40" height="40" />
          </div>
          @if (!isCollapsed()) {
            <div class="flex flex-col">
              <svg
                width="81"
                height="29"
                viewBox="0 0 81 29"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="text-content-primary"
              >
                <path
                  d="M2.41645e-06 13.7233L5.54435 0.19663H6.6257L12.1111 13.7233H10.5579L5.78028 1.76949H6.35044L1.53355 13.7233H2.41645e-06ZM2.53625 10.204V8.92603H9.61414V10.204H2.53625ZM28.0431 13.7233L23.5604 7.35316H23.3048L17.9571 0.19663H19.6872L24.0913 6.15385H24.3468L29.7536 13.7233H28.0431ZM17.7408 13.7233L23.0689 6.58639L24.0126 7.45147L19.3727 13.7233H17.7408ZM24.4648 7.1369L23.5211 6.25216L27.9054 0.19663H29.5373L24.4648 7.1369ZM36.8491 13.7233V0.19663H38.2844V13.7233H36.8491ZM52.7552 13.9199C51.7983 13.9199 50.9071 13.7429 50.0813 13.389C49.2687 13.022 48.5543 12.524 47.9383 11.8948C47.3222 11.2526 46.8373 10.512 46.4834 9.67314C46.1426 8.82117 45.9722 7.91022 45.9722 6.94029C45.9722 5.95725 46.1426 5.0463 46.4834 4.20743C46.8242 3.36857 47.3026 2.63457 47.9186 2.00542C48.5347 1.37628 49.249 0.884758 50.0616 0.530864C50.8743 0.176969 51.759 2.19526e-05 52.7159 2.19526e-05C53.6727 2.19526e-05 54.5574 0.176969 55.3701 0.530864C56.1958 0.884758 56.9167 1.37628 57.5328 2.00542C58.1488 2.63457 58.6272 3.37513 58.968 4.2271C59.3088 5.06596 59.4792 5.97691 59.4792 6.95995C59.4792 7.92988 59.3088 8.84083 58.968 9.6928C58.6272 10.5317 58.1488 11.2657 57.5328 11.8948C56.9298 12.524 56.222 13.022 55.4094 13.389C54.5967 13.7429 53.712 13.9199 52.7552 13.9199ZM52.7159 12.524C53.7382 12.524 54.6426 12.2815 55.429 11.7965C56.2286 11.3115 56.8512 10.6496 57.2968 9.81077C57.7556 8.9719 57.9849 8.01508 57.9849 6.94029C57.9849 6.14075 57.8539 5.40674 57.5917 4.73828C57.3296 4.0567 56.9626 3.46688 56.4907 2.9688C56.0189 2.45762 55.4618 2.06441 54.8196 1.78915C54.1904 1.5139 53.4892 1.37628 52.7159 1.37628C51.7066 1.37628 50.8022 1.61876 50.0027 2.10373C49.2162 2.57559 48.5936 3.23095 48.1349 4.06981C47.6892 4.90867 47.4664 5.8655 47.4664 6.94029C47.4664 7.73983 47.5975 8.48038 47.8596 9.16196C48.1218 9.84353 48.4888 10.4399 48.9606 10.9511C49.4325 11.4492 49.9896 11.8358 50.6318 12.1111C51.2741 12.3863 51.9687 12.524 52.7159 12.524ZM67.1851 13.7233V0.19663H68.2075L74.0468 9.77144H73.3193L79.1586 0.19663H80.1809V13.7233H78.726V2.71321L79.0603 2.79186L74.1844 10.7938H73.162L68.2861 2.79186L68.6204 2.71321V13.7233H67.1851Z"
                  fill="currentColor"
                />
                <path
                  d="M1.0027 28.7233V15.1966H2.43794V28.7233H1.0027ZM1.94642 28.7233V27.406H9.90905V28.7233H1.94642ZM1.94642 22.4318V21.1539H9.2799V22.4318H1.94642ZM1.94642 16.5139V15.1966H9.79109V16.5139H1.94642ZM18.4196 22.6677V21.4488H22.3517C23.243 21.4488 23.9246 21.2259 24.3965 20.7803C24.8683 20.3215 25.1042 19.7121 25.1042 18.9518C25.1042 18.2178 24.8683 17.6215 24.3965 17.1627C23.9246 16.6909 23.243 16.4549 22.3517 16.4549H18.4196V15.1966H22.3517C23.2299 15.1966 23.9836 15.3605 24.6127 15.6881C25.2419 16.0027 25.7203 16.4418 26.048 17.0054C26.3888 17.569 26.5591 18.2113 26.5591 18.9322C26.5591 19.6793 26.3888 20.3347 26.048 20.8983C25.7203 21.4619 25.2419 21.901 24.6127 22.2155C23.9836 22.517 23.2299 22.6677 22.3517 22.6677H18.4196ZM17.4955 28.7233V15.1966H18.9308V28.7233H17.4955ZM25.6744 28.7233L20.6019 22.4711L21.9978 22.0189L27.5225 28.7233H25.6744ZM35.5076 23.2969V22.0189H39.4987C40.0492 22.0189 40.5407 21.9075 40.9733 21.6847C41.4189 21.4619 41.7663 21.1473 42.0153 20.741C42.2774 20.3215 42.4085 19.8235 42.4085 19.2468C42.4085 18.67 42.2774 18.1785 42.0153 17.7722C41.7663 17.3528 41.4189 17.0316 40.9733 16.8088C40.5407 16.5729 40.0492 16.4549 39.4987 16.4549H35.5076V15.1966H39.597C40.4097 15.1966 41.1371 15.367 41.7794 15.7078C42.4216 16.0355 42.9263 16.5008 43.2933 17.1037C43.6734 17.7067 43.8634 18.421 43.8634 19.2468C43.8634 20.0594 43.6734 20.7737 43.2933 21.3898C42.9263 21.9927 42.4216 22.4646 41.7794 22.8054C41.1371 23.133 40.4097 23.2969 39.597 23.2969H35.5076ZM34.5835 28.7233V15.1966H36.0188V28.7233H34.5835Z"
                  fill="#2563EB"
                />
              </svg>
            </div>
          }
        </a>

        <!-- Collapse Toggle Button -->
        <button
          type="button"
          (click)="toggleCollapse()"
          class="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          [attr.aria-label]="isCollapsed() ? 'Expandir barra lateral' : 'Recolher barra lateral'"
        >
          <lucide-icon [img]="isCollapsed() ? ChevronRightIcon : ChevronLeftIcon" [size]="18" />
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        @for (item of navItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="!bg-brand-subtle !text-brand border-r-2 border-brand font-semibold"
            #rla="routerLinkActive"
            [attr.aria-current]="rla.isActive ? 'page' : null"
            class="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-content-muted hover:text-content-primary hover:bg-canvas-elevated transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            [title]="isCollapsed() ? item.label : ''"
          >
            <lucide-icon
              [img]="item.icon"
              [size]="20"
              class="shrink-0 transition-colors group-hover:text-brand"
              [ngClass]="{ 'text-brand': rla.isActive }"
            />

            @if (!isCollapsed()) {
              <span class="truncate">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Footer / System Status -->
      <div class="p-3 border-t border-border-subtle">
        <div
          class="flex items-center gap-3 p-2 rounded-lg bg-canvas-elevated border border-border-subtle"
        >
          <div class="p-1 rounded-md bg-state-success-subtle text-state-success shrink-0">
            <lucide-icon [img]="ShieldCheckIcon" [size]="16" />
          </div>
          @if (!isCollapsed()) {
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-medium text-content-primary truncate">Sessão Segura</span>
              <span class="text-2xs text-content-disabled">v1.0.0 • Local First</span>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly isCollapsed = signal(false);

  protected readonly ChevronLeftIcon = ChevronLeft;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly ShieldCheckIcon = ShieldCheck;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Estoque', path: '/inventory', icon: Package },
    { label: 'Tesouraria', path: '/treasury', icon: Wallet },
    { label: 'Parceiros B2B', path: '/partners', icon: Users },
  ];

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }
}
