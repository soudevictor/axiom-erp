import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });

  it('deve renderizar o título e valor formatado corretamente', () => {
    component.title = 'Faturamento Mensal';
    component.value = 1500250;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Faturamento Mensal');
    expect(compiled.textContent).toContain('1.500.250');
  });

  it('deve exibir variação positiva com classe state-success-subtle quando isPositive é true', () => {
    component.title = 'Vendas';
    component.value = 'R$ 100,00';
    component.trend = { value: 15.5, isPositive: true, label: 'mês anterior' };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('+15.5%');

    // Semantic token class applied by ngClass for positive trend
    const badgeEl = compiled.querySelector('.bg-state-success-subtle');
    expect(badgeEl).not.toBeNull();
  });

  it('deve exibir variação negativa com classe state-danger-subtle quando isPositive é false', () => {
    component.title = 'Custos';
    component.value = 'R$ 50,00';
    component.trend = { value: 3.2, isPositive: false, label: 'aumento de despesa' };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('-3.2%');

    // Semantic token class applied by ngClass for negative trend
    const badgeEl = compiled.querySelector('.bg-state-danger-subtle');
    expect(badgeEl).not.toBeNull();
  });

  it('deve exibir o subtítulo quando fornecido', () => {
    component.title = 'Estoque';
    component.value = 500;
    component.subtitle = 'Itens armazenados em SP';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Itens armazenados em SP');
  });
});
