import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    ToastComponent,
  ],
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 antialiased">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Content Area -->
      <div class="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <!-- Header -->
        <app-header />

        <!-- Main Viewport -->
        <main
          class="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-b from-slate-950 to-slate-900"
          id="main-content"
        >
          <div class="max-w-7xl mx-auto space-y-6">
            <router-outlet />
          </div>
        </main>
      </div>

      <!-- Global Toast Container -->
      <app-toast />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {}
