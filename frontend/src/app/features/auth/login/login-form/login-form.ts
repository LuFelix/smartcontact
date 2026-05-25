import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { OnInit } from '@angular/core';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; // MUDANÇA: Importe o Módulo
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Outros Imports
import { AuthService } from '../../../../core/services/auth.service';
import { SocialAuthService, GoogleSigninButtonModule, SocialUser } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    GoogleSigninButtonModule
  ],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss'
})
export class LoginForm implements OnInit{
  
  private readonly socialAuthService = inject(SocialAuthService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

 readonly form = this.fb.group({
    identifier: ['', [Validators.required]], 
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#@$!%*?&])[A-Za-z\d#@$!%*?&]{8,}$/)
    ]]
  });

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.update(value => !value);
    event.stopPropagation();
  }

  ngOnInit() {
    // Usamos o SOCIAL para capturar o login do Google
    this.socialAuthService.authState.subscribe((googleUser) => {
      if (googleUser && googleUser.idToken && !this.authService.isLoggedIn()) {
        console.log('Google ID Token:', googleUser.idToken);
        console.log('Google Access Token:', googleUser.authToken);
        
        // Agora usamos o SEU serviço para mandar os tokens pro NestJS
        this.authService.loginWithGoogle(googleUser.idToken, googleUser.authToken).subscribe({
          next: (res: any) => {
            this.router.navigate(['app/dashboard']);
        },
          error: (err: any) => {
            this.snackBar.open('Erro na autenticação social', 'Fechar', { duration: 5000 });
        }
        
        });
        }else if (googleUser && !googleUser.idToken) {
        // Caso raro: o Google logou mas não mandou o Token de Identidade
        console.error('Usuário autenticado, mas o idToken não foi gerado.');
        this.snackBar.open('Erro técnico com o Google. Tente novamente.', 'Fechar');
    }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    const raw = this.form.getRawValue();
    const credentials = {
      identifier: raw.identifier ?? '',
      password: raw.password ?? ''
    };

    this.authService.login(credentials)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['app/dashboard']);
          this.snackBar.open('Login realizado com sucesso!', 'Fechar', { duration: 3000 });
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open(
            err.error?.message || 'CPF ou senha inválidos.',
            'Fechar',
            { duration: 5000 }
          );
          this.form.reset();
        }
      });
  }
}