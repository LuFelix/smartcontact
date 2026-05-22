// Caminho: src/app/features/admin/components/user-details/user-details-modal.component.ts

import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../users/services/user.service';
import { User } from '../../../shared/models/users.models';
import { Role } from '../../../shared/models/role.model';
import { finalize, Observable } from 'rxjs';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';
import { RoleService } from '../../../users/services/role.service';

// Interface para os dados recebidos
export interface UserModalData {
    userId: string | null; // Mudado para string
    isCreation: boolean;
}

@Component({
    selector: 'app-user-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatIconModule,
        MatCardModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatSelectModule, 
        MatOptionModule
    ],
    templateUrl: './user-details-modal.component.html',
    styleUrls: ['./user-details-modal.component.scss']
})
export class UserDetailsModalComponent implements OnInit {
    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private roleService = inject(RoleService);
    public dialogRef = inject(MatDialogRef<UserDetailsModalComponent>);

    user: User | null = null;
    userForm!: FormGroup;
    roleIdControl = new FormControl<string | null>(null, Validators.required); // Mudado para string
    availableRoles$!: Observable<Role[]>;
    
    // Estados de Loading
    isLoadingDetails = false;
    isSaving = false;
    isDeleting = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: UserModalData) {
        this.initForm();
    }

    ngOnInit(): void {
        this.availableRoles$ = this.roleService.findAllActiveRoles();
        
        if (!this.data.isCreation && this.data.userId) {
            this.loadUser(this.data.userId);
        }
    }

    private initForm(): void {
        this.userForm = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            cpf: ['', Validators.required],
            password: [
                '', 
                this.data.isCreation ? [Validators.required, Validators.minLength(6)] : []
            ],
            isActive: [true],
            roleId: this.roleIdControl
        });
    }

    private loadUser(id: string): void { // Mudado para string
        this.isLoadingDetails = true;
        this.userService.getUserById(id)
            .pipe(finalize(() => this.isLoadingDetails = false))
            .subscribe(loadedUser => {
                this.user = loadedUser;
                this.userForm.patchValue({
                    name: loadedUser.name,
                    email: loadedUser.email,
                    cpf: loadedUser.cpf,
                    isActive: loadedUser.isActive
                });
                if (loadedUser.role && loadedUser.role.id) {
                  this.roleIdControl.setValue(loadedUser.role.id);
                }
                this.userForm.get('password')?.clearValidators();
                this.userForm.get('password')?.updateValueAndValidity();
            });
    }

    saveUser(): void {
        if (this.userForm.invalid) return;

        this.isSaving = true;
        const formData = this.userForm.getRawValue();

        let request$;
        if (this.data.isCreation) {
            request$ = this.userService.createUser(formData);
        } else {
            if (!formData.password) {
                delete formData.password;
            }
            request$ = this.userService.updateUser(this.data.userId!, formData);
        }

        request$.pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => {
                    console.error('Erro ao salvar', err);
                }
            });
    }

    deleteUser(): void {
        if (!this.data.userId) return;
        if(!confirm('Tem certeza que deseja excluir este usuário?')) return;

        this.isDeleting = true;
        this.userService.deleteUser(this.data.userId)
            .pipe(finalize(() => this.isDeleting = false))
            .subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => console.error('Erro ao excluir', err)
            });
    }
}
