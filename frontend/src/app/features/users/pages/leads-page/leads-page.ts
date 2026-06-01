import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionLogsService } from '../../../../core/services/interaction-logs.service';
import { GoogleContactsService } from '../../../../core/services/google-contacts.service';
import { Lead } from '../../../shared/models/users.models';
import { finalize } from 'rxjs';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutService } from '../../../../core/services/layout.service';

// Components
import { LeadsCardListComponent } from '../../components/leads-card-list/leads-card-list';
import { LeadsListViewComponent } from '../../components/leads-list-view/leads-list-view';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    LeadsCardListComponent,
    LeadsListViewComponent
  ],
  templateUrl: './leads-page.html',
  styleUrl: './leads-page.scss'
})
export class LeadsPage implements OnInit {
  private logsService = inject(InteractionLogsService);
  private googleService = inject(GoogleContactsService);
  private socialAuth = inject(SocialAuthService);
  private snackBar = inject(MatSnackBar);
  public layoutService = inject(LayoutService);

  leads: Lead[] = [];
  searchTerm: string = '';
  isLoading = true;
  isSavingToGoogle = false;

  ngOnInit(): void {
    this.loadLeads();
  }

  get filteredLeads(): Lead[] {
    if (!this.searchTerm) return this.leads;
    const term = this.searchTerm.toLowerCase();
    return this.leads.filter(l => 
      l.leadName?.toLowerCase().includes(term) || 
      l.leadEmail?.toLowerCase().includes(term) ||
      l.leadPhone?.toLowerCase().includes(term)
    );
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
            this.snackBar.open('Contato salvo com sucesso no seu Google e no coffer local!', 'Sucesso', { duration: 4000 });
            this.loadLeads(); // Recarrega para atualizar estado se necessário
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
