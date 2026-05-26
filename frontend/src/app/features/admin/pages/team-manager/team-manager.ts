import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../../core/services/team.service';
import { RolesService } from '../../services/roles.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { FullUserResponse } from '../../../shared/models/users.models';
import { Role } from '../../../shared/models/role.model';
import { finalize } from 'rxjs';

// Components
import { MembersCardListComponent } from '../../components/members-card-list/members-card-list';
import { MembersListViewComponent } from '../../components/members-list-view/members-list-view';
import { RolesCardListComponent } from '../../components/roles-card-list/roles-card-list';
import { RolesListViewComponent } from '../../components/roles-list-view/roles-list-view';
import { MemberInvitationDialogComponent } from '../../components/member-invitation-dialog/member-invitation-dialog';
import { RoleDialogComponent } from '../../components/role-dialog/role-dialog';
import { ResourceDelegationDialogComponent } from '../../components/resource-delegation-dialog/resource-delegation-dialog';

// Material
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-team-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MembersCardListComponent,
    MembersListViewComponent,
    RolesCardListComponent,
    RolesListViewComponent
  ],
  templateUrl: './team-manager.html',
  styleUrl: './team-manager.scss'
})
export class TeamManagerComponent implements OnInit {
  private teamService = inject(TeamService);
  private rolesService = inject(RolesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public layoutService = inject(LayoutService);

  members: FullUserResponse[] = [];
  roles: Role[] = [];
  isLoadingMembers = true;
  isLoadingRoles = true;

  ngOnInit(): void {
    this.loadMembers();
    this.loadRoles();
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

  loadRoles(): void {
    this.isLoadingRoles = true;
    this.rolesService.findAll()
      .pipe(finalize(() => this.isLoadingRoles = false))
      .subscribe({
        next: (res) => this.roles = res.data,
        error: () => this.snackBar.open('Erro ao carregar funções.', 'Fechar')
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

  openRoleDialog(role?: Role): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '500px',
      data: { role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRoles();
    });
  }

  openDelegationDialog(member: FullUserResponse): void {
      const dialogRef = this.dialog.open(ResourceDelegationDialogComponent, {
          width: '600px',
          data: { member }
      });
      // ABAC logic handles assignment
  }

  deleteRole(role: Role): void {
    if (!confirm(`Excluir a role "${role.name}"?`)) return;
    this.rolesService.delete(role.id).subscribe({
      next: () => {
        this.snackBar.open('Excluída!', 'OK', { duration: 2000 });
        this.loadRoles();
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Erro ao excluir', 'Fechar')
    });
  }

  removeMember(member: FullUserResponse): void {
      alert('Funcionalidade de remover membro em desenvolvimento.');
  }
}
