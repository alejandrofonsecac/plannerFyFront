import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './login';
import { AUTH_GATEWAY } from './auth-gateway';
import { ThemeService } from '../../shared/theme.service';

describe('Login', () => {
  const submit = vi.fn<(...args: unknown[]) => Promise<void>>();
  beforeEach(() => {
    submit.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AUTH_GATEWAY, useValue: { submit } },
        {
          provide: ThemeService,
          useValue: { accentOptions: [{ id: 'orange', color: '#EA580C', hoverColor: '#C2410C' }] },
        },
      ],
    });
  });

  it('validates fields before requesting authentication', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(submit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#email').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#password-error').textContent).toContain(
      'Informe sua senha',
    );
  });

  it('switches registration and recovery validation without reloading', () => {
    const component = TestBed.createComponent(Login).componentInstance;
    component.setMode('register');
    component.form.setValue({ name: 'Ana', email: 'ana@example.com', password: '123' });
    expect(component.form.valid).toBe(false);
    component.form.controls.password.setValue('12345678');
    expect(component.form.valid).toBe(true);
    component.setMode('reset');
    expect(component.form.controls.password.value).toBe('');
    expect(component.form.valid).toBe(true);
  });

  it('toggles password visibility with an accessible button', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.eye-button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password').type).toBe('text');
    expect(fixture.nativeElement.querySelector('.eye-button').getAttribute('aria-label')).toBe(
      'Ocultar senha',
    );
  });

  it('prevents duplicate submissions and reports provider failure without navigating', async () => {
    let reject!: (reason: Error) => void;
    submit.mockImplementation(
      () =>
        new Promise<void>((_, onReject) => {
          reject = onReject;
        }),
    );
    const component = TestBed.createComponent(Login).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.form.setValue({ name: '', email: 'ana@example.com', password: 'password' });
    const pending = component.submit();
    expect(component.loading()).toBe(true);
    await component.submit();
    expect(submit).toHaveBeenCalledTimes(1);
    reject(new Error('Unavailable'));
    await pending;
    expect(component.loading()).toBe(false);
    expect(component.feedback()).toContain('Não foi possível continuar');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('passes no password to Google authentication', async () => {
    submit.mockRejectedValue(new Error('Unavailable'));
    const component = TestBed.createComponent(Login).componentInstance;
    component.form.controls.password.setValue('private-password');
    await component.submit('google');
    expect(submit).toHaveBeenCalledWith('google', { name: '', email: '', password: '' });
  });
});
