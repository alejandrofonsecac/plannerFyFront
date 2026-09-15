import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../shared/theme.service';
import { AUTH_GATEWAY, AuthMode } from './auth-gateway';

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
  readonly accent = inject(ThemeService).accentOptions.find((option) => option.id === 'orange')!;
  readonly mode = signal<AuthMode>('login');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly feedback = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
      mode === 'register' ? [Validators.required, Validators.pattern(/\S/)] : [],
    );
    this.form.controls.password.setValidators(
      mode === 'reset'
        ? []
        : mode === 'register'
          ? [Validators.required, Validators.minLength(8)]
          : [Validators.required],
    );
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.password.updateValueAndValidity();
    this.form.markAsUntouched();
  }

  hasError(field: 'name' | 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  async submit(provider?: 'google'): Promise<void> {
    if (this.loading()) return;
    this.feedback.set('');
    if (!provider && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.submit(
        provider ?? this.mode(),
        provider ? { name: '', email: '', password: '' } : this.form.getRawValue(),
      );
      if (this.mode() === 'reset' && !provider) {
        this.feedback.set(
          'Se este email estiver cadastrado, você receberá as instruções para redefinir sua senha.',
        );
      } else {
        await this.router.navigateByUrl('/home');
      }
    } catch {
      this.feedback.set(
        'Não foi possível continuar. A autenticação ainda não está disponível. Tente novamente mais tarde.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
