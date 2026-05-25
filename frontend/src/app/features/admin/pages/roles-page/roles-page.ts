import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolesService } from '../../services/roles.service';
import { Role } from '../../../shared/models/role.model';
import { RoleDialogComponent } from '../../components/role-dialog/role-dialog';
import { RolesCardListComponent } from '../../components/roles-card-list/roles-card-list';
import { RolesListViewComponent } from '../../components/roles-list-view/roles-list-view';
import { LayoutService } from '../../../../core/services/layout.service';
import { finalize } from 'rxjs';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    RolesCardListComponent,
    RolesListViewComponent
  ],
  templateUrl: './roles-page.html',
  styleUrl: './roles-page.scss'
})
export class RolesPageComponent implements OnInit {
  private rolesService = inject(RolesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public layoutService = inject(LayoutService);

  roles: Role[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.rolesService.findAll()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
            this.roles = response.data || [];
        },
        error: (err) => {
          console.error('Erro ao carregar roles:', err);
          this.snackBar.open('Não foi possível carregar as funções.', 'Fechar', { duration: 3000 });
        }
      });
  }

  openRoleDialog(role?: Role): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '500px',
      data: { role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  deleteRole(role: Role): void {
    if (!confirm(`Tem certeza que deseja excluir a role "${role.name}"?`)) return;

    this.rolesService.delete(role.id).subscribe({
      next: () => {
        this.snackBar.open('Função excluída com sucesso.', 'OK', { duration: 3000 });
        this.loadRoles();
      },
      error: (err) => {
        console.error('Erro ao excluir role:', err);
        this.snackBar.open('Erro ao excluir função.', 'Fechar', { duration: 3000 });
      }
    });
  }
}
