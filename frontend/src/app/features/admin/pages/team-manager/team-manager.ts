import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../../core/services/team.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { FullUserResponse } from '../../../shared/models/users.models';
import { finalize } from 'rxjs';

// Components
import { MembersCardListComponent } from '../../components/members-card-list/members-card-list';
import { MembersListViewComponent } from '../../components/members-list-view/members-list-view';
import { MemberInvitationDialogComponent } from '../../components/member-invitation-dialog/member-invitation-dialog';
import { ResourceDelegationDialogComponent } from '../../components/resource-delegation-dialog/resource-delegation-dialog';

// Shared UI Components
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-team-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatCardModule,
    MembersCardListComponent,
    MembersListViewComponent,
    PageHeaderComponent,
    SearchBarComponent,
    EmptyStateComponent
  ],
  templateUrl: './team-manager.html',
  styleUrl: './team-manager.scss'
})
export class TeamManagerComponent implements OnInit {
  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public layoutService = inject(LayoutService);

  members: FullUserResponse[] = [];
  searchTerm: string = '';
  isLoadingMembers = true;

  // Mock para Seletor de Workspace (Futuro Premium)
  workspaces = [
    { id: '1', name: 'Meu Workspace (Padrão)', isMain: true },
    { id: '2', name: 'Filial São Paulo', isMain: false },
    { id: '3', name: 'Time de Vendas External', isMain: false }
  ];
  selectedWorkspaceId = '1';

  ngOnInit(): void {
    this.loadMembers();
  }

  get filteredMembers(): FullUserResponse[] {
    if (!this.searchTerm) return this.members;
    const term = this.searchTerm.toLowerCase();
    return this.members.filter(m => 
      m.name?.toLowerCase().includes(term) || 
      m.email?.toLowerCase().includes(term) ||
      m.role?.name?.toLowerCase().includes(term)
    );
  }

  loadMembers(): void {
    this.isLoadingMembers = true;
    this.teamService.listMembers()
      .pipe(finalize(() => this.isLoadingMembers = false))
      .subscribe({
        next: (res) => {
            // Filtro rigoroso: Apenas usuários reais (que possuem Profile na plataforma)
            // Isso exclui automaticamente os contatos/leads importados do Google.
            this.members = res.data.filter((u: FullUserResponse) => !!u.profile);
        },
        error: () => this.snackBar.open('Erro ao carregar membros.', 'Fechar')
      });
  }

  openInvitationDialog(): void {
    const dialogRef = this.dialog.open(MemberInvitationDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadMembers();
    });
  }

  openDelegationDialog(member: FullUserResponse): void {
      const dialogRef = this.dialog.open(ResourceDelegationDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          data: { member },
          panelClass: 'large-abac-modal'
      });
      // ABAC logic handles assignment
  }

  removeMember(member: FullUserResponse): void {
      if (!confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) return;

      this.teamService.removeMember(member.id).subscribe({
          next: () => {
              this.snackBar.open('Membro removido com sucesso.', 'OK', { duration: 3000 });
              this.loadMembers();
          },
          error: (err) => {
              console.error(err);
              this.snackBar.open('Erro ao remover membro.', 'Fechar');
          }
      });
  }
}
