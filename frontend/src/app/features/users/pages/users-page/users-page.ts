// Caminho: src/app/features/users/pages/users-page/users-page.ts

import { Component, inject, ViewChild, OnInit } from '@angular/core'; 
import { FormControl, FormGroup, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserDetailsModalComponent,UserModalData } from '../../../admin/components/user-details/user-details-modal.component';
import { CommonModule } from '@angular/common'; 
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { User } from '../../../shared/models/users.models';
import { UsersListComponent } from '../../../admin/components/users-list/users-list.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      MatCardModule,
      MatFormFieldModule,
      MatInputModule,
      MatProgressSpinnerModule,
      MatTableModule,
      MatPaginatorModule,
      MatButtonModule,
      MatIconModule,
      UsersListComponent,
      MatTooltipModule
    ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss'
})
export class UsersPage implements OnInit { 

  private userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public readonly authService = inject(AuthService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['name', 'email', 'actions'];
  dataSource = new MatTableDataSource<User>([]);
  totalUsers = 0;
  isLoading = true;

  filterForm = new FormGroup({
    name: new FormControl(''),
    email: new FormControl(''),
    cpf: new FormControl('')
  });

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      name: [''],
      email: [''],
      cpf: ['']
    });

    this.loadUsers();
  }

  openAddUserModal(): void {
      const data: UserModalData = {
        userId: null, 
        isCreation: true 
    };

    const dialogRef = this.dialog.open(UserDetailsModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: data,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadUsers(); 
        this.snackBar.open('Usuário criado com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  loadUsers(): void {
    this.isLoading = true;

    const filters = {
      page: this.paginator ? this.paginator.pageIndex + 1 : 1,
      limit: this.paginator ? this.paginator.pageSize : 10,
      ...this.filterForm.value 
    };

    this.userService.findAllUsers(filters)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data || []; 
          this.totalUsers = response.total || 0; 
        },
        error: (err) => {
          console.error('Erro ao listar usuários:', err);
          this.snackBar.open('Não foi possível carregar a lista de usuários.', 'Fechar', { duration: 3000 });
        }
      });
  }


  updateDisplayedColumns() {
      const columns = ['name', 'email'];
      if (this.authService.hasPermission('EDIT_USER_PROFILE') ||
          this.authService.hasPermission('ASSIGN_USER_ROLES') ||
          this.authService.hasPermission('DELETE_USER')) {
          columns.push('actions');
      }
      this.displayedColumns = columns;
  }

  resetFilters() {
    this.filterForm.reset({ name: '', email: '', cpf: '' });
  }

  export(): void {
      if (!this.authService.hasPermission('EXPORT_USERS')) return;
      // TODO: Implement export logic
  }

  openUserDetails(userId: string): void { 
    const dialogRef = this.dialog.open(UserDetailsModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { 
        userId: userId, 
        isCreation: false 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadUsers(); 
        this.snackBar.open('Usuário atualizado com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
      return;
    }

    this.isLoading = true; 

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Usuário excluído com sucesso.', 'OK', { duration: 3000 });
        this.loadUsers(); 
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.snackBar.open('Não foi possível excluir o usuário.', 'Fechar', { duration: 3000 });
      }
    });
  }

  openInviteModal(): void {
      if (!this.authService.hasPermission('INVITE_USER')) return;
      alert("TODO: Implementar modal de convite.");
  }

  openEditRolesModal(user: User): void {
      if (!this.authService.hasPermission('ASSIGN_USER_ROLES')) return;
       alert("TODO: Implementar modal de edição de roles.");
  }

  onPageChange(event: PageEvent): void {
      this.loadUsers();
  }
}
