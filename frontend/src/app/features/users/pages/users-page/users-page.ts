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
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { User } from '../../../shared/models/users.models';
import { UsersListComponent } from '../../../admin/components/users-list/users-list.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { GoogleContactsService } from '../../../../core/services/google-contacts.service';

// Shared UI Components
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

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
      MatTooltipModule,
      PageHeaderComponent
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
  private googleContactsService = inject(GoogleContactsService);
  private socialAuthService = inject(SocialAuthService);

  displayedColumns: string[] = ['name', 'email', 'actions'];
  dataSource = new MatTableDataSource<User>([]);
  totalUsers = 0;
  isLoading = true;
  isSyncing = false;

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

    // Escutar mudanças nos filtros com debounce
    this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.paginator) this.paginator.pageIndex = 0; 
      this.loadUsers();
    });

    this.loadUsers();
  }

  openAddUserModal(): void {
      const data: UserModalData = {
        userId: null, 
        isCreation: true 
    };

    const dialogRef = this.dialog.open(UserDetailsModalComponent, {
      width: '850px',
      maxWidth: '95vw',
      data: data,
      autoFocus: false,
      restoreFocus: false
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
      ...this.filterForm.getRawValue() 
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
    // O reset vai disparar o valueChanges automaticamente
  }

  export(): void {
      if (!this.authService.hasPermission('EXPORT_USERS')) return;
      // TODO: Implement export logic
  }

  openUserDetails(userId: string): void { 
    const dialogRef = this.dialog.open(UserDetailsModalComponent, {
      width: '850px',
      maxWidth: '95vw',
      data: { 
        userId: userId, 
        isCreation: false 
      },
      autoFocus: false,
      restoreFocus: false
    });


    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadUsers(); 
        this.snackBar.open('Usuário atualizado com sucesso!', 'OK', { duration: 3000 });
      }
    });
  }

  onPromoteUser(user: User): void {
      // Para adicionar à equipe, abrimos a modal de detalhes
      // A modal agora tem lógica para exigir e-mail se mudar para cargo de sistema.
      this.openUserDetails(user.id);
  }

  onDemoteUser(user: User): void {
      if (!confirm(`Tem certeza que deseja remover "${user.name}" da equipe?\nEsta pessoa continuará existindo como seu contato.`)) {
          return;
      }

      this.isLoading = true;
      // Chamamos o endpoint de atualização de cargo para 'usuario' e o backend lidará com a saída da equipe (limpeza de profile)
      this.userService.updateUserRole(user.id, 'usuario')
          .pipe(finalize(() => this.isLoading = false))
          .subscribe({
              next: () => {
                  this.snackBar.open(`${user.name} removido da equipe com sucesso.`, 'OK', { duration: 3000 });
                  this.loadUsers();
              },
              error: (err: any) => {
                  console.error(err);
                  this.snackBar.open('Erro ao remover da equipe.', 'Fechar');
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

  syncWithGoogle(): void {
    this.isSyncing = true;
    this.snackBar.open('Solicitando autorização do Google...', 'Fechar', { duration: 3000 });

    this.socialAuthService.getAccessToken(GoogleLoginProvider.PROVIDER_ID)
      .then(accessToken => {
        this.snackBar.open('Sincronizando contatos. Isso pode levar alguns segundos...', 'OK');
        
        this.googleContactsService.syncContacts(accessToken)
          .pipe(finalize(() => this.isSyncing = false))
          .subscribe({
            next: (res) => {
              this.snackBar.open(`${res.imported} contatos importados de um total de ${res.total}.`, 'Sucesso', { duration: 5000 });
              this.loadUsers();
            },
            error: (err) => {
              console.error('Erro na sincronização:', err);
              this.snackBar.open('Falha ao sincronizar contatos. Verifique sua permissão.', 'Fechar', { duration: 5000 });
            }
          });
      })
      .catch(err => {
        this.isSyncing = false;
        console.error('Erro ao obter token de acesso:', err);
        this.snackBar.open('Autorização cancelada ou falhou.', 'Fechar', { duration: 3000 });
      });
  }
}
