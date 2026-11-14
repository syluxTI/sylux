import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('cria o shell com router-outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });

  it('registra as seis páginas e o fallback', () => {
    expect(routes.map((r) => r.path)).toEqual(['', 'orbit', 'paper', 'flux', 'grid', 'echo', '**']);
    expect(routes.filter((r) => r.loadComponent).length).toBe(6);
  });
});
