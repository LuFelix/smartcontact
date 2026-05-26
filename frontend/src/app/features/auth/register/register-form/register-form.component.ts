import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxMaskDirective } from 'ngx-mask';

// Substitua pelo caminho real do seu AuthService
import { AuthService } from '../../../../core/services/auth.service';
import { TeamService } from '../../../../core/services/team.service';
import { RegistrationData } from '../../../shared/models/auth.model';
@Component({
  selector: 'app-register-form',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss'
})
export class RegisterFormComponent {
  private readonly authService = inject(AuthService);
  private readonly teamService = inject(TeamService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private router = inject(Router);
  
  // Estados da interface
  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly isSubmitting = signal(false);
  readonly isRegistered = signal(false);
  readonly registeredEmail = signal('');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#@$!%*?&])[A-Za-z\d#@$!%*?&]{8,}$/)
    ]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: (group) => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      return password === confirmPassword ? null : { mismatch: true };
    }
  });

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update(value => !value);
    event.stopPropagation();
  }

  toggleConfirmPasswordVisibility(event: MouseEvent): void {
    this.hideConfirmPassword.update(value => !value);
    event.stopPropagation();
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const rawData = this.form.getRawValue();

    const registrationData: RegistrationData = {
      name: `${rawData.firstName} ${rawData.lastName}`.trim(),
      email: rawData.email,
      password: rawData.password
    };

    this.authService.register(registrationData)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.registeredEmail.set(registrationData.email);
          this.isRegistered.set(true);
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open(err.error?.message || 'Erro ao realizar cadastro.', 'Fechar', { duration: 5000 });
        }
      });
  }

  resendConfirmationCode(): void {
    this.isSubmitting.set(true);
    
    // Método para acionar o envio via SMTP do HostGator novamente
    this.authService.resendConfirmationCode(this.registeredEmail())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Código reenviado com sucesso! Verifique sua caixa de entrada.', 'OK', { duration: 5000 });
        },
        error: () => {
          this.snackBar.open('Erro ao reenviar o código. Tente novamente mais tarde.', 'Fechar', { duration: 3000 });
        }
      });
  }

  verifyCode(code: string): void {
  // 1. Ativa o spinner
  this.isSubmitting.set(true);

  // 2. Chama o serviço (IMPORTANTE: precisa do .subscribe)
  this.authService.verifyEmailCode({ email: this.registeredEmail(), code }).subscribe({
    next: (response) => {
      // Sucesso na verificação!
      this.snackBar.open('Conta verificada com sucesso! Autenticando...', 'OK', { duration: 3000 });
      
      // Realizar login automático para poder aceitar o convite
      const rawData = this.form.getRawValue();
      this.authService.login({ identifier: rawData.email, password: rawData.password }).subscribe({
        next: () => {
          const pendingToken = sessionStorage.getItem('pending_invitation_token');
          if (pendingToken) {
            this.teamService.acceptInvitation(pendingToken).subscribe({
              next: () => {
                sessionStorage.removeItem('pending_invitation_token');
                this.snackBar.open('Bem-vindo à sua nova equipe!', 'Sucesso', { duration: 3000 });
                this.isSubmitting.set(false);
                this.router.navigate(['/app/dashboard']);
              },
              error: (err) => {
                console.error('Erro ao aceitar convite pós-cadastro:', err);
                this.isSubmitting.set(false);
                this.router.navigate(['/app/dashboard']); // Vai pro dashboard mesmo se o convite falhar
              }
            });
          } else {
            this.isSubmitting.set(false);
            this.router.navigate(['/app/dashboard']);
          }
        },
        error: (err) => {
          console.error('Erro no login automático:', err);
          this.isSubmitting.set(false);
          this.router.navigate(['/login']);
        }
      });
    },
    error: (err) => {
      // Erro (Código inválido, expirado, etc)
      this.isSubmitting.set(false);
      const message = err.error?.message || 'Erro ao validar código.';
      this.snackBar.open(message, 'Fechar', { duration: 5000 });
      console.error('Erro na validação:', err);
    }
  });
}
}