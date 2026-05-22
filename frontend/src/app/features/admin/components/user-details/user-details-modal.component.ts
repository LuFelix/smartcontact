// Caminho: src/app/features/admin/components/user-details/user-details-modal.component.ts

import { Component, Inject, OnInit, inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, FormArray} from '@angular/forms';
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
import { User, AddressTag } from '../../../shared/models/users.models';
import { Role } from '../../../shared/models/role.model';
import { finalize, Observable, Subscription, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of, tap } from 'rxjs';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';
import { RoleService } from '../../../users/services/role.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CepService } from '../../../../core/utils/cep.service';
import { NgxMaskDirective } from 'ngx-mask';

// Interface para os dados recebidos
export interface UserModalData {
    userId: string | null; 
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
        MatOptionModule,
        MatDividerModule,
        MatTooltipModule,
        NgxMaskDirective
    ],
    templateUrl: './user-details-modal.component.html',
    styleUrls: ['./user-details-modal.component.scss']
})
export class UserDetailsModalComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private userService = inject(UserService);
    private roleService = inject(RoleService);
    private cepService = inject(CepService);
    public dialogRef = inject(MatDialogRef<UserDetailsModalComponent>);

    user: User | null = null;
    userForm!: FormGroup;
    roleIdControl = new FormControl<string | null>(null, Validators.required);
    availableRoles$!: Observable<Role[]>;
    
    // Mapeamento para exibição amigável
    addressTagLabels = {
        [AddressTag.HOME]: 'Casa',
        [AddressTag.WORK]: 'Trabalho',
        [AddressTag.BILLING]: 'Cobrança',
        [AddressTag.DELIVERY]: 'Entrega',
        [AddressTag.OTHER]: 'Outro'
    };
    addressTags = Object.values(AddressTag);

    // Estados de Loading
    isLoadingDetails = false;
    isSaving = false;
    isDeleting = false;
    isFetchingCep: { [key: number]: boolean } = {};

    private cepSubscriptions: Subscription[] = [];

    constructor(@Inject(MAT_DIALOG_DATA) public data: UserModalData) {
        this.initForm();
    }

    ngOnInit(): void {
        this.availableRoles$ = this.roleService.findAllActiveRoles();
        
        if (!this.data.isCreation && this.data.userId) {
            this.loadUser(this.data.userId);
        }
    }

    ngOnDestroy(): void {
        this.cepSubscriptions.forEach(s => s.unsubscribe());
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
            roleId: this.roleIdControl,
            phones: this.fb.array([]),
            addresses: this.fb.array([])
        });
    }

    // --- Helpers para FormArray ---
    get phones(): FormArray {
        return this.userForm.get('phones') as FormArray;
    }

    get addresses(): FormArray {
        return this.userForm.get('addresses') as FormArray;
    }

    addPhone(phone?: any): void {
        const phoneGroup = this.fb.group({
            id: [phone?.id || null],
            // Renomeado para evitar colisão com 'number' do endereço no patchValue global
            phoneNumber: [phone?.number || '', Validators.required],
            isWhatsapp: [phone?.isWhatsapp ?? false],
            isMain: [phone?.isMain ?? false]
        });
        this.phones.push(phoneGroup);
    }

    removePhone(index: number): void {
        this.phones.removeAt(index);
    }

    addAddress(address?: any): void {
        const addressGroup = this.fb.group({
            id: [address?.id || null],
            street: [address?.street || '', Validators.required],
            // Renomeado para 'streetNumber' para evitar colisão
            streetNumber: [address?.number || '', Validators.required],
            complement: [address?.complement || ''],
            neighborhood: [address?.neighborhood || '', Validators.required],
            city: [address?.city || '', Validators.required],
            state: [address?.state || '', [Validators.required, Validators.maxLength(2)]],
            zipCode: [address?.zipCode || '', Validators.required],
            tag: [address?.tag || AddressTag.OTHER],
            isMain: [address?.isMain ?? false]
        });
        
        const index = this.addresses.length;
        this.addresses.push(addressGroup);
        this.setupAddressCepSubscription(index);
    }

    private setupAddressCepSubscription(index: number): void {
        const addressGroup = this.addresses.at(index) as FormGroup;
        const cepControl = addressGroup.get('zipCode');
        
        if (!cepControl) return;

        const sub = cepControl.valueChanges.pipe(
            debounceTime(500),
            distinctUntilChanged(),
            filter(val => !!val && /^\d{5}-?\d{3}$/.test(val)),
            tap(() => this.isFetchingCep[index] = true),
            switchMap(cep => this.cepService.fetchAddressFromCep(cep).pipe(
                catchError(() => of(null))
            )),
            tap(() => this.isFetchingCep[index] = false)
        ).subscribe(data => {
            if (data) {
                // Preenchimento explícito e isolado por grupo
                addressGroup.get('street')?.setValue(data.logradouro);
                addressGroup.get('neighborhood')?.setValue(data.bairro);
                addressGroup.get('city')?.setValue(data.localidade);
                addressGroup.get('state')?.setValue(data.uf);
            }
        });

        this.cepSubscriptions.push(sub);
    }

    removeAddress(index: number): void {
        this.addresses.removeAt(index);
        delete this.isFetchingCep[index];
    }

    setMainPhone(index: number): void {
        this.phones.controls.forEach((control, i) => {
            control.get('isMain')?.setValue(i === index);
        });
    }

    setMainAddress(index: number): void {
        this.addresses.controls.forEach((control, i) => {
            control.get('isMain')?.setValue(i === index);
        });
    }

    private loadUser(id: string): void {
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

                this.phones.clear();
                if (loadedUser.phones) {
                    loadedUser.phones.forEach(p => this.addPhone(p));
                }

                this.addresses.clear();
                if (loadedUser.addresses) {
                    loadedUser.addresses.forEach(a => this.addAddress(a));
                }

                this.userForm.get('password')?.clearValidators();
                this.userForm.get('password')?.updateValueAndValidity();
            });
    }

    saveUser(): void {
        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        const rawData = this.userForm.getRawValue();

        // Mapeamento de volta para os nomes esperados pelo backend
        const payload = {
            ...rawData,
            phones: rawData.phones.map((p: any) => ({
                id: p.id,
                number: p.phoneNumber,
                isWhatsapp: p.isWhatsapp,
                isMain: p.isMain
            })),
            addresses: rawData.addresses.map((a: any) => ({
                id: a.id,
                street: a.street,
                number: a.streetNumber,
                complement: a.complement,
                neighborhood: a.neighborhood,
                city: a.city,
                state: a.state,
                zipCode: a.zipCode,
                tag: a.tag,
                isMain: a.isMain
            }))
        };

        if (!this.data.isCreation && !payload.password) {
            delete payload.password;
        }

        let request$;
        if (this.data.isCreation) {
            request$ = this.userService.createUser(payload);
        } else {
            request$ = this.userService.updateUser(this.data.userId!, payload);
        }

        request$.pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: () => this.dialogRef.close(true),
                error: (err) => {
                    console.error('Erro ao salvar', err);
                    alert("Erro ao salvar usuário. Verifique se os dados já existem.");
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
