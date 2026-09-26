import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
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

  it('validates registration name, minimum password and the backend UTF-8 byte limit', () => {
    const component = TestBed.createComponent(Login).componentInstance;
    component.setMode('register');
    component.form.setValue({ name: 'Ana', email: 'ana@example.com', password: '123' });
    expect(component.form.valid).toBe(false);
    component.form.controls.password.setValue('12345678');
    expect(component.form.valid).toBe(true);
    component.form.controls.password.setValue('é'.repeat(37));
    expect(component.form.valid).toBe(false);
    component.form.controls.password.setValue('é'.repeat(36));
    expect(component.form.valid).toBe(true);
    component.form.controls.name.setValue(' ');
    expect(component.form.valid).toBe(false);
    component.setMode('login');
    expect(component.form.controls.password.value).toBe('');
  });

  it('toggles password visibility and hides unsupported sign-in methods', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.eye-button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password').type).toBe('text');
    expect(fixture.nativeElement.querySelector('.eye-button').getAttribute('aria-label')).toBe(
      'Ocultar senha',
    );
    expect(fixture.nativeElement.querySelector('.google-button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Esqueceu sua senha');
  });

  it('prevents duplicate submissions and reports invalid credentials without navigating', async () => {
    let reject!: (reason: unknown) => void;
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
    reject(new HttpErrorResponse({ status: 401 }));
    await pending;
    expect(component.loading()).toBe(false);
    expect(component.feedback()).toBe('Email ou senha incorretos.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the password and always navigates home after success', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/notes' }) },
      },
    });
    const component = TestBed.createComponent(Login).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    submit.mockResolvedValue(undefined);
    component.form.setValue({ name: '', email: 'ana@example.com', password: 'password' });
    await component.submit();
    expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
    expect(component.form.controls.password.value).toBe('');
  });

  it('shows the session expiration explanation', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { queryParamMap: convertToParamMap({ reason: 'expired' }) },
      },
    });
    expect(TestBed.createComponent(Login).componentInstance.feedback()).toContain(
      'Sua sessão expirou',
    );
  });
});
