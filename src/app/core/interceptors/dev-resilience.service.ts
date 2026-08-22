import { Injectable, signal } from '@angular/core';

/**
 * DevResilienceService — manages toggles for the Dev Resilience Playground.
 * These signals are consumed by the mock API interceptor and the UI toolbar.
 */
@Injectable({ providedIn: 'root' })
export class DevResilienceService {
  /** When true, the mock interceptor injects 2s extra latency */
  readonly slowLatency = signal(false);

  /** When true, the mock interceptor returns HTTP 500 errors */
  readonly simulateError = signal(false);

  toggleSlowLatency(): void {
    this.slowLatency.update((v) => !v);
  }

  toggleSimulateError(): void {
    this.simulateError.update((v) => !v);
  }
}
