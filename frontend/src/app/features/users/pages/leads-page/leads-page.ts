import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionLogsService } from '../../../../core/services/interaction-logs.service';
import { GoogleContactsService } from '../../../../core/services/google-contacts.service';
import { Lead } from '../../../shared/models/users.models';
import { finalize } from 'rxjs';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { MatSnackBar } from '@angular/material/snack-bar';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './leads-page.html',
  styleUrl: './leads-page.scss'
})
export class LeadsPage implements OnInit {
  private logsService = inject(InteractionLogsService);
  private googleService = inject(GoogleContactsService);
  private socialAuth = inject(SocialAuthService);
  private snackBar = inject(MatSnackBar);

  leads: Lead[] = [];
  isLoading = true;
  isSavingToGoogle = false;
  displayedColumns = ['leadName', 'leadEmail', 'leadPhone', 'accessedAt', 'actions'];

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.isLoading = true;
    this.logsService.listMyLeads()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => this.leads = data,
        error: (err) => {
          console.error('Erro ao buscar leads:', err);
          this.snackBar.open('Não foi possível carregar seus leads.', 'Fechar', { duration: 3000 });
        }
      });
  }

  saveToGoogle(lead: Lead): void {
    this.isSavingToGoogle = true;
    this.snackBar.open('Solicitando autorização do Google...', 'Fechar', { duration: 2000 });

    this.socialAuth.getAccessToken(GoogleLoginProvider.PROVIDER_ID)
      .then(accessToken => {
        this.googleService.saveLead(accessToken, {
          name: lead.leadName,
          email: lead.leadEmail,
          phone: lead.leadPhone
        }).subscribe({
          next: () => {
            this.isSavingToGoogle = false;
            this.snackBar.open('Contato salvo com sucesso no seu Google!', 'Sucesso', { duration: 3000 });
          },
          error: (err) => {
            this.isSavingToGoogle = false;
            console.error('Erro ao salvar no Google:', err);
            this.snackBar.open('Falha ao salvar no Google Contacts.', 'Fechar', { duration: 5000 });
          }
        });
      })
      .catch(err => {
        this.isSavingToGoogle = false;
        console.error(err);
        this.snackBar.open('Autorização do Google cancelada.', 'Fechar', { duration: 3000 });
      });
  }
}
