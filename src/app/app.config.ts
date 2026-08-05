import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';
import { DatabaseSeedService } from '@/core/database/database-seed.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    provideAppInitializer(() => {
      const seedService = inject(DatabaseSeedService);
      return seedService.initialize();
    }),
  ],
};
