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

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-team-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MembersCardListComponent,
    MembersListViewComponent
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
  isLoadingMembers = true;

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.isLoadingMembers = true;
    this.teamService.listMembers()
      .pipe(finalize(() => this.isLoadingMembers = false))
      .subscribe({
        next: (res) => this.members = res.data,
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
          width: '850px',
          data: { member }
      });
      // ABAC logic handles assignment
  }

  removeMember(member: FullUserResponse): void {
      alert('Funcionalidade de remover membro em desenvolvimento.');
  }
}
