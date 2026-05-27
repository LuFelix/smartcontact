// Caminho: src/app/features/admin/components/user-details/user-details-modal.component.ts

import { Component, Inject, OnInit, inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, FormArray} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { RouterModule, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../users/services/user.service';
import { User, AddressTag, RedirectMode, Tag } from '../../../shared/models/users.models';
import { Role } from '../../../shared/models/role.model';
import { finalize, Observable, Subscription, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of, tap } from 'rxjs';
import { MatSelectModule } from '@angular/material/select'; 
import { MatOptionModule } from '@angular/material/core';
import { RoleService } from '../../../users/services/role.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CepService } from '../../../../core/utils/cep.service';
import { NgxMaskDirective } from 'ngx-mask';
import * as QRCode from 'qrcode';

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
        RouterModule,
        RouterLink,
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

    @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

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

    redirectModes = [
        { value: RedirectMode.PROFILE, label: 'Perfil Inteligente' },
        { value: RedirectMode.WHATSAPP, label: 'WhatsApp Direto' },
        { value: RedirectMode.VCARD, label: 'Salvar Contato (vCard)' },
        { value: RedirectMode.CUSTOM_URL, label: 'Link Personalizado' }
    ];

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
            cpf: [''],
            password: [
                '', 
                this.data.isCreation ? [Validators.required, Validators.minLength(8)] : []
            ],
            isActive: [true],
            roleId: this.roleIdControl,
            phones: this.fb.array([]),
            addresses: this.fb.array([]),
            secondaryEmails: this.fb.array([]),
            links: this.fb.array([]),
            tagSettings: this.fb.group({
                id: [null],
                nfcRedirectMode: [RedirectMode.PROFILE],
                nfcCustomUrl: [''],
                qrRedirectMode: [RedirectMode.PROFILE],
                qrCustomUrl: ['']
            })
        });
    }

    // --- Helpers para FormArray ---
    get phones(): FormArray {
        return this.userForm.get('phones') as FormArray;
    }

    get addresses(): FormArray {
        return this.userForm.get('addresses') as FormArray;
    }

    get secondaryEmails(): FormArray {
        return this.userForm.get('secondaryEmails') as FormArray;
    }

    get links(): FormArray {
        return this.userForm.get('links') as FormArray;
    }

    addPhone(phone?: any): void {
        const phoneGroup = this.fb.group({
            id: [phone?.id || null],
            phoneNumber: [phone?.number || '', Validators.required],
            isWhatsapp: [phone?.isWhatsapp ?? false],
            isMain: [phone?.isMain ?? false]
        });
        this.phones.push(phoneGroup);
        this.focusNewItem('.focus-target-phone');
    }

    removePhone(index: number): void {
        this.phones.removeAt(index);
    }

    addSecondaryEmail(email?: any): void {
        const emailGroup = this.fb.group({
            id: [email?.id || null],
            address: [email?.address || '', [Validators.required, Validators.email]]
        });
        this.secondaryEmails.push(emailGroup);
        this.focusNewItem('.focus-target-email');
    }

    removeSecondaryEmail(index: number): void {
        this.secondaryEmails.removeAt(index);
    }

    addLink(link?: any): void {
        const linkGroup = this.fb.group({
            id: [link?.id || null],
            title: [link?.title || '', Validators.required],
            url: [link?.url || '', [Validators.required, Validators.pattern(/https?:\/\/.+/)]]
        });
        this.links.push(linkGroup);
        this.focusNewItem('.focus-target-link');
    }

    removeLink(index: number): void {
        this.links.removeAt(index);
    }

    addAddress(address?: any): void {
        const addressGroup = this.fb.group({
            id: [address?.id || null],
            street: [address?.street || '', Validators.required],
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
        this.focusNewItem('.focus-target-address');
    }

    private focusNewItem(selector: string): void {
        setTimeout(() => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                (elements[elements.length - 1] as HTMLElement).focus();
            }
        }, 100);
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
        this.sortPhones();
    }

    setMainEmail(index: number): void {
        const currentPrimary = this.userForm.get('email')?.value;
        const selectedSecondaryGroup = this.secondaryEmails.at(index) as FormGroup;
        const newPrimary = selectedSecondaryGroup.get('address')?.value;

        if (!newPrimary) return;

        if (!confirm('Atenção: Ao trocar o e-mail de login, este usuário precisará usar o novo e-mail para acessar o sistema. Se ele usava login via Google, o acesso pode ser perdido. Deseja continuar?')) {
            return;
        }

        // Swap
        this.userForm.get('email')?.setValue(newPrimary);
        selectedSecondaryGroup.get('address')?.setValue(currentPrimary);
    }

    setMainAddress(index: number): void {
        this.addresses.controls.forEach((control, i) => {
            control.get('isMain')?.setValue(i === index);
        });
    }

    private sortPhones(): void {
        const controls = [...this.phones.controls];
        controls.sort((a, b) => (b.get('isMain')?.value ? 1 : 0) - (a.get('isMain')?.value ? 1 : 0));
        this.phones.clear({ emitEvent: false });
        controls.forEach(c => this.phones.push(c, { emitEvent: false }));
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

                if (loadedUser.tags && loadedUser.tags.length > 0) {
                    const activeTag = loadedUser.tags.find((t: Tag) => t.isActive) || loadedUser.tags[0];
                    this.userForm.get('tagSettings')?.patchValue({
                        id: activeTag.id,
                        nfcRedirectMode: activeTag.nfcRedirectMode,
                        nfcCustomUrl: activeTag.nfcCustomUrl,
                        qrRedirectMode: activeTag.qrRedirectMode,
                        qrCustomUrl: activeTag.qrCustomUrl
                    });
                    this.generatePersonalQR(activeTag.uuid);
                }

                this.phones.clear();
                if (loadedUser.phones) {
                    const sortedPhones = [...loadedUser.phones].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
                    sortedPhones.forEach(p => this.addPhone(p));
                }

                this.addresses.clear();
                if (loadedUser.addresses) {
                    loadedUser.addresses.forEach(a => this.addAddress(a));
                }

                this.secondaryEmails.clear();
                if (loadedUser.secondaryEmails) {
                    loadedUser.secondaryEmails.forEach(e => this.addSecondaryEmail(e));
                }

                this.links.clear();
                if (loadedUser.links) {
                    loadedUser.links.forEach(l => this.addLink(l));
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
        const { tagSettings, name, email, cpf, isActive, roleId, password } = rawData;

        const payload: any = {
            name,
            email,
            cpf,
            isActive,
            roleId,
            password,
            phones: rawData.phones.map((p: any) => ({
                id: p.id || undefined,
                number: p.phoneNumber,
                isWhatsapp: p.isWhatsapp,
                isMain: p.isMain
            })),
            addresses: rawData.addresses.map((a: any) => ({
                id: a.id || undefined,
                street: a.street,
                number: a.streetNumber,
                complement: a.complement,
                neighborhood: a.neighborhood,
                city: a.city,
                state: a.state,
                zipCode: a.zipCode,
                tag: a.tag,
                isMain: a.isMain
            })),
            secondaryEmails: rawData.secondaryEmails.map((e: any) => ({
                id: e.id || undefined,
                address: e.address
            })),
            links: rawData.links.map((l: any) => ({
                id: l.id || undefined,
                title: l.title,
                url: l.url
            })),
            tags: tagSettings.id ? [{
                id: tagSettings.id,
                nfcRedirectMode: tagSettings.nfcRedirectMode,
                nfcCustomUrl: tagSettings.nfcCustomUrl,
                qrRedirectMode: tagSettings.qrRedirectMode,
                qrCustomUrl: tagSettings.qrCustomUrl
            }] : [],
            nfcRedirectMode: tagSettings.nfcRedirectMode,
            nfcCustomUrl: tagSettings.nfcCustomUrl,
            qrRedirectMode: tagSettings.qrRedirectMode,
            qrCustomUrl: tagSettings.qrCustomUrl
        };

        // Limpeza de IDs nulos
        const cleanId = (obj: any) => {
            if (obj.id === null) delete obj.id;
            return obj;
        };
        payload.phones.forEach(cleanId);
        payload.addresses.forEach(cleanId);
        payload.secondaryEmails.forEach(cleanId);
        payload.links.forEach(cleanId);
        if (payload.tags.length > 0) cleanId(payload.tags[0]);

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
                    const msg = err.error?.message;
                    const errorDetails = Array.isArray(msg) ? msg.join('\n') : msg || "Verifique os dados e tente novamente.";
                    alert("Erro ao salvar usuário:\n" + errorDetails);
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

    generatePersonalQR(uuid: string): void {
        const baseUrl = window.location.origin;
        const identifier = this.user?.username || uuid;
        const url = `${baseUrl}/t/${identifier}?source=qr`;
        
        setTimeout(() => {
            if (this.qrcodeCanvas) {
                QRCode.toCanvas(this.qrcodeCanvas.nativeElement, url, {
                    width: 180,
                    margin: 1
                }, (error: Error | null | undefined) => {
                    if (error) console.error(error);
                });
            }
        });
    }

    downloadPersonalQR(): void {
        if (!this.qrcodeCanvas || !this.user) return;
        const canvas = this.qrcodeCanvas.nativeElement;
        const link = document.createElement('a');
        link.download = `smartcontact-qr-${this.user.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}
