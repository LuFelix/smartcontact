import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-join-page',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="join-container">
      <mat-spinner *ngIf="isLoading"></mat-spinner>
      <div *ngIf="!isLoading" class="message">
        <h2>{{ message }}</h2>
        <p>Redirecionando...</p>
      </div>
    </div>
  `,
  styles: [`
    .join-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .message {
      margin-top: 20px;
    }
  `]
})
export class JoinPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = true;
  message = 'Validando convite...';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.handleError('Token de convite inválido.');
      return;
    }

    this.processInvitation(token);
  }

  private processInvitation(token: string): void {
    this.teamService.resolveInvitation(token).subscribe({
      next: (invitation) => {
        if (this.authService.isLoggedIn()) {
          this.accept(token);
        } else {
          this.storeAndRedirect(token);
        }
      },
      error: (err) => {
        this.handleError(err.error?.message || 'Erro ao validar convite.');
      }
    });
  }

  private accept(token: string): void {
    this.message = 'Processando sua entrada na equipe...';
    this.teamService.acceptInvitation(token).subscribe({
      next: () => {
        this.snackBar.open('Bem-vindo à equipe!', 'Sucesso', { duration: 3000 });
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.handleError(err.error?.message || 'Erro ao aceitar convite.');
      }
    });
  }

  private storeAndRedirect(token: string): void {
    sessionStorage.setItem('pending_invitation_token', token);
    this.snackBar.open('Convite validado! Por favor, crie sua conta ou faça login para entrar na equipe.', 'OK', { duration: 5000 });
    this.router.navigate(['/register']);
  }

  private handleError(msg: string): void {
    this.isLoading = false;
    this.message = msg;
    this.snackBar.open(msg, 'Fechar', { duration: 5000 });
    setTimeout(() => this.router.navigate(['/']), 3000);
  }
}
