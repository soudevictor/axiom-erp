import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
  importProvidersFrom,
  LOCALE_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import {
  LucideAngularModule,
  Package,
  AlertTriangle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  CheckCircle2,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ShieldCheck,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  XCircle,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-angular';

import { routes } from './app.routes';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';
import { DatabaseSeedService } from '@/core/database/database-seed.service';

registerLocaleData(localePt, 'pt-BR');

const icons = {
  Package,
  AlertTriangle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  CheckCircle2,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ShieldCheck,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  XCircle,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    importProvidersFrom(LucideAngularModule.pick(icons)),
    provideAppInitializer(() => {
      const seedService = inject(DatabaseSeedService);
      return seedService.initialize();
    }),
  ],
};
