import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Standalone directive `[appCnpjMask]` that formats user input in real-time
 * to the Brazilian CNPJ pattern: 00.000.000/0000-00.
 *
 * Usage: <input type="text" formControlName="cnpj" appCnpjMask />
 */
@Directive({
  selector: '[appCnpjMask]',
  standalone: true,
})
export class CnpjMaskDirective {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private readonly ngControl = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.applyMask(input.value);
    input.value = formatted;

    // Sync the reactive form control value with the raw digits
    this.ngControl?.control?.setValue(formatted, { emitEvent: true });
  }

  @HostListener('blur')
  onBlur(): void {
    const formatted = this.applyMask(this.el.nativeElement.value);
    this.el.nativeElement.value = formatted;
  }

  private applyMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    const len = digits.length;

    if (len === 0) return '';
    if (len <= 2) return digits;
    if (len <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (len <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (len <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
}
