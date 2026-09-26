import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../../shared/theme.service';
import { AUTH_GATEWAY, AuthMode } from './auth-gateway';
import { authErrorMessage } from '../../core/auth/data-access/auth.service';

function passwordBytes(control: AbstractControl) {
  return new TextEncoder().encode(String(control.value ?? '')).length > 72
    ? { passwordBytes: true }
    : null;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AUTH_GATEWAY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly accent = inject(ThemeService).accentOptions.find((option) => option.id === 'orange')!;
  readonly mode = signal<AuthMode>('login');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly feedback = signal(
    this.route.snapshot.queryParamMap.get('reason') === 'expired'
      ? 'Sua sessão expirou. Entre novamente para continuar.'
      : '',
  );
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordBytes],
    }),
  });
  readonly particles = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 37 + 7) % 100,
    y: (i * 23 + 11) % 100,
    delay: -(i % 13),
    duration: 12 + (i % 7) * 2,
    size: 2 + (i % 3),
  }));

  setMode(mode: AuthMode): void {
    if (this.loading()) return;
    this.mode.set(mode);
    this.feedback.set('');
    this.showPassword.set(false);
    this.form.controls.password.reset();
    this.form.controls.name.setValidators(
      mode === 'register'
        ? [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]
        : [],
    );
    this.form.controls.password.setValidators(
      mode === 'register'
        ? [Validators.required, Validators.minLength(8), passwordBytes]
        : [Validators.required, passwordBytes],
    );
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.password.updateValueAndValidity();
    this.form.markAsUntouched();
  }

  hasError(field: 'name' | 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  passwordError(): string {
    if (!this.hasError('password')) return '';
    if (this.form.controls.password.hasError('passwordBytes'))
      return 'Senha muito longa. Reduza a quantidade de caracteres.';
    return this.mode() === 'register' ? 'Use pelo menos 8 caracteres.' : 'Informe sua senha.';
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.feedback.set('');
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.submit(this.mode(), this.form.getRawValue());
      this.form.controls.password.reset();
      this.showPassword.set(false);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error: unknown) {
      this.feedback.set(authErrorMessage(error, this.mode()));
    } finally {
      this.loading.set(false);
    }
  }
}
