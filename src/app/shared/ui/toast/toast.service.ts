import { Injectable, signal } from '@angular/core';

export type ToastType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface ToastMessage {
  readonly id: string;
  readonly type: ToastType;
  readonly title: string;
  readonly message?: string;
  readonly duration?: number;
  readonly action?: ToastAction;
}

interface ToastTimer {
  readonly handle: ReturnType<typeof setTimeout>;
  readonly startedAt: number;
  readonly remaining: number;
}

const DEFAULT_DURATION = 4_500;
const ACTION_DURATION = 6_000;
const MAX_VISIBLE = 3;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<readonly ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly timers = new Map<string, ToastTimer>();

  show(toast: Omit<ToastMessage, 'id'>): string {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { ...toast, id };
    const duration = toast.duration ?? (toast.action ? ACTION_DURATION : DEFAULT_DURATION);

    this._toasts.update((current) => [...current.slice(-(MAX_VISIBLE - 1)), newToast]);
    if (duration > 0) this.startTimer(id, duration);
    return id;
  }

  success(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'SUCCESS', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'ERROR', title, message, duration });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'WARNING', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'INFO', title, message, duration });
  }

  showAction(
    type: ToastType,
    title: string,
    message: string,
    action: ToastAction,
    duration = ACTION_DURATION
  ): string {
    return this.show({ type, title, message, action, duration });
  }

  pause(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    clearTimeout(timer.handle);
    const elapsed = Date.now() - timer.startedAt;
    this.timers.set(id, {
      handle: timer.handle,
      startedAt: timer.startedAt,
      remaining: Math.max(0, timer.remaining - elapsed),
    });
  }

  resume(id: string): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    clearTimeout(timer.handle);
    if (timer.remaining <= 0) {
      this.remove(id);
      return;
    }
    this.startTimer(id, timer.remaining);
  }

  remove(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer.handle);
      this.timers.delete(id);
    }
    this._toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  runAction(id: string): void {
    const toast = this._toasts().find((candidate) => candidate.id === id);
    toast?.action?.run();
    this.remove(id);
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer.handle);
    this.timers.clear();
    this._toasts.set([]);
  }

  private startTimer(id: string, duration: number): void {
    const handle = setTimeout(() => this.remove(id), duration);
    this.timers.set(id, { handle, startedAt: Date.now(), remaining: duration });
  }
}
