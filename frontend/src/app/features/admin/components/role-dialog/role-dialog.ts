import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Role, CreateRoleDTO, UpdateRoleDTO } from '../../../shared/models/role.model';
import { RolesService } from '../../services/roles.service';
import { finalize } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface RoleDialogData {
    role?: Role;
}

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule
  ],
  templateUrl: './role-dialog.html',
  styleUrl: './role-dialog.scss'
})
export class RoleDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<RoleDialogComponent>);

  roleForm!: FormGroup;
  isSaving = false;
  isEdit = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: RoleDialogData) {
    this.isEdit = !!data.role;
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const isProtected = this.isEdit && ['administrador', 'usuario'].includes(this.data.role?.name || '');
    
    this.roleForm = this.fb.group({
      name: [
          { value: this.data.role?.name || '', disabled: isProtected }, 
          [Validators.required, Validators.minLength(3)]
      ],
      description: [this.data.role?.description || ''],
      isActive: [this.data.role?.isActive ?? true]
    });
  }

  onSubmit(): void {
    if (this.roleForm.invalid) return;

    this.isSaving = true;
    const formData = this.roleForm.getRawValue();
    
    // BACKEND LIMITATION: DTO expects only name and description
    const payload = {
        name: formData.name,
        description: formData.description
    };

    if (this.isEdit && this.data.role) {
      this.rolesService.update(this.data.role.id, payload)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.snackBar.open('Função atualizada!', 'OK', { duration: 2000 });
            this.dialogRef.close(true);
          },
          error: (err) => {
              console.error(err);
              this.snackBar.open('Erro ao atualizar função. Verifique se o nome já existe.', 'Fechar', { duration: 3000 });
          }
        });
    } else {
      this.rolesService.create(payload)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.snackBar.open('Função criada!', 'OK', { duration: 2000 });
            this.dialogRef.close(true);
          },
          error: (err) => {
              console.error(err);
              this.snackBar.open('Erro ao criar função. Verifique se o nome já existe.', 'Fechar', { duration: 3000 });
          }
        });
    }
  }
}
