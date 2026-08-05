import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { MainLayoutComponent } from './main-layout.component';
import { mockApiInterceptor } from '@/core/interceptors/mock-api.interceptor';

@Component({ standalone: true, template: '<div>Dummy</div>' })
class DummyComponent {}

const testRoutes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' as const },
  { path: 'dashboard', component: DummyComponent },
  { path: 'inventory', component: DummyComponent },
  { path: 'treasury', component: DummyComponent },
  { path: 'partners', component: DummyComponent },
  { path: '**', redirectTo: 'dashboard' },
];

describe('MainLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MainLayoutComponent, DummyComponent],
      providers: [
        provideRouter(testRoutes),
        provideHttpClient(withInterceptors([mockApiInterceptor])),
      ],
    });
  });

  it('deve criar o layout principal', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve conter os elementos da barra lateral (Sidebar) e cabeçalho (Header)', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).not.toBeNull();
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('deve navegar corretamente entre as rotas principais', async () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    await router.navigate(['/inventory']);
    fixture.detectChanges();
    expect(router.url).toBe('/inventory');

    await router.navigate(['/treasury']);
    fixture.detectChanges();
    expect(router.url).toBe('/treasury');

    await router.navigate(['/partners']);
    fixture.detectChanges();
    expect(router.url).toBe('/partners');

    await router.navigate(['/dashboard']);
    fixture.detectChanges();
    expect(router.url).toBe('/dashboard');
  });
});
