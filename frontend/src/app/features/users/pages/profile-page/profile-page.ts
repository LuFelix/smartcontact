// Caminho: src/app/features/users/pages/profile-page/profile-page.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, EMPTY, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, filter, finalize } from 'rxjs/operators';

// Imports do Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMaskDirective } from 'ngx-mask';

// Models e Serviços
import { UserData, FullUserResponse, Phone, Address, AddressTag } from '../../../shared/models/users.models';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CepService } from '../../../../core/utils/cep.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSpinner,
    MatDividerModule,
    MatTooltipModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgxMaskDirective
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cepService = inject(CepService);

  profileForm: FormGroup;
  currentUserData: FullUserResponse | null = null;
  isLoading = true;
  isSaving = false;
  isEditing = false;
  isFetchingCep: { [key: number]: boolean } = {};
  profilePicturePreview: string | ArrayBuffer | null = null;
  
  addressTagLabels = {
    [AddressTag.HOME]: 'Casa',
    [AddressTag.WORK]: 'Trabalho',
    [AddressTag.BILLING]: 'Cobrança',
    [AddressTag.DELIVERY]: 'Entrega',
    [AddressTag.OTHER]: 'Outro'
  };
  addressTags = Object.values(AddressTag);

  private cepSubscriptions: Subscription[] = [];
  private profileSubscription!: Subscription;

  constructor() {
    this.profileForm = this.fb.group({
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      cpf: [{ value: '', disabled: true }],
      phones: this.fb.array([]),
      addresses: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadInitialProfile();
  }

  ngOnDestroy(): void {
    this.profileSubscription?.unsubscribe();
    this.cepSubscriptions.forEach(s => s.unsubscribe());
  }

  get phones(): FormArray {
    return this.profileForm.get('phones') as FormArray;
  }

  get addresses(): FormArray {
    return this.profileForm.get('addresses') as FormArray;
  }

  addPhone(phone?: any): void {
    const phoneGroup = this.fb.group({
        id: [phone?.id || null],
        phoneNumber: [phone?.number || '', Validators.required],
        isWhatsapp: [phone?.isWhatsapp ?? false],
        isMain: [phone?.isMain ?? false]
    });
    this.phones.push(phoneGroup);
    if (!this.isEditing) phoneGroup.disable();
  }

  removePhone(index: number): void {
    this.phones.removeAt(index);
  }

  addAddress(address?: any): void {
    const addressGroup = this.fb.group({
        id: [address?.id || null],
        street: [address?.street || '', Validators.required],
        streetNumber: [address?.number || '', Validators.required],
        zipCode: [address?.zipCode || '', Validators.required],
        neighborhood: [address?.neighborhood || '', Validators.required],
        complement: [address?.complement || ''],
        city: [address?.city || '', Validators.required],
        state: [address?.state || '', [Validators.required, Validators.maxLength(2)]],
        tag: [address?.tag || AddressTag.OTHER],
        isMain: [address?.isMain ?? false]
    });
    const index = this.addresses.length;
    this.addresses.push(addressGroup);
    if (!this.isEditing) addressGroup.disable();
    this.setupAddressCepSubscription(index);
  }

  private setupAddressCepSubscription(index: number): void {
    const addressGroup = this.addresses.at(index) as FormGroup;
    const cepControl = addressGroup.get('zipCode');
    
    if (!cepControl) return;

    const sub = cepControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => this.isEditing && !!val && /^\d{5}-?\d{3}$/.test(val)),
        tap(() => {
            this.isFetchingCep[index] = true;
            addressGroup.patchValue({ street: '', neighborhood: '', city: '', state: '' }, { emitEvent: false });
        }),
        switchMap(cep => this.cepService.fetchAddressFromCep(cep).pipe(
            catchError(() => of(null))
        )),
        tap(() => this.isFetchingCep[index] = false)
    ).subscribe(data => {
        if (data) {
            addressGroup.patchValue({
                street: data.logradouro || '',
                neighborhood: data.bairro || '',
                city: data.localidade || '',
                state: data.uf || ''
            });
        }
    });

    this.cepSubscriptions.push(sub);
  }

  removeAddress(index: number): void {
    this.addresses.removeAt(index);
    delete this.isFetchingCep[index];
  }

  setMainPhone(index: number): void {
    if (!this.isEditing) return;
    this.phones.controls.forEach((control, i) => {
        control.get('isMain')?.setValue(i === index);
    });
  }

  setMainAddress(index: number): void {
    if (!this.isEditing) return;
    this.addresses.controls.forEach((control, i) => {
        control.get('isMain')?.setValue(i === index);
    });
  }

  loadInitialProfile(): void {
    this.isLoading = true;
    const currentUserId = this.authService.userId();

    if (!currentUserId) {
      this.snackBar.open('Erro ao identificar usuário.', 'Fechar', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    this.profileSubscription = this.userService.findById(currentUserId).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (userProfile: FullUserResponse) => {
        this.currentUserData = userProfile;
        
        this.profileForm.patchValue({
          email: userProfile.email,
          firstName: userProfile.name?.split(' ')[0] || '',
          lastName: userProfile.name?.split(' ').slice(1).join(' ') || '',
          cpf: userProfile.cpf || ''
        });

        this.phones.clear();
        if (userProfile.phones) userProfile.phones.forEach(p => this.addPhone(p));

        this.addresses.clear();
        if (userProfile.addresses) userProfile.addresses.forEach(a => this.addAddress(a));

        this.profilePicturePreview = userProfile.profilePictureUrl 
          ? 'http://localhost:3000/' + userProfile.profilePictureUrl
          : null;

        this.profileForm.disable();
      },
      error: () => {
        this.snackBar.open('Erro ao carregar seu perfil.', 'Fechar', { duration: 5000 });
      }
    });
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.profileForm.enable();
      this.profileForm.get('email')?.disable();
      this.phones.controls.forEach(c => c.enable());
      this.addresses.controls.forEach(c => c.enable());
    } else {
      this.onCancel();
    }
  }

  triggerImageUpload(): void {
    if (!this.isEditing) return;
    alert("Funcionalidade de upload de imagem não implementada.");
  }

  onSave(): void {
    if (this.profileForm.invalid) return;
    this.isLoading = true;

    const formData = this.profileForm.getRawValue();
    const payload = {
        name: `${formData.firstName} ${formData.lastName}`,
        cpf: formData.cpf,
        phones: formData.phones.map((p: any) => ({
            id: p.id,
            number: p.phoneNumber,
            isWhatsapp: p.isWhatsapp,
            isMain: p.isMain
        })),
        addresses: formData.addresses.map((a: any) => ({
            id: a.id,
            street: a.street,
            number: a.streetNumber,
            zipCode: a.zipCode,
            neighborhood: a.neighborhood,
            complement: a.complement,
            city: a.city,
            state: a.state,
            tag: a.tag,
            isMain: a.isMain
        }))
    };

    this.userService.updateUser(this.currentUserData!.id, payload).pipe(
        finalize(() => this.isLoading = false)
    ).subscribe({
        next: () => {
            this.isEditing = false;
            this.profileForm.disable();
            this.snackBar.open('Perfil atualizado com sucesso!', 'OK', { duration: 3000 });
            this.loadInitialProfile();
        },
        error: (err) => {
            console.error(err);
            this.snackBar.open('Erro ao atualizar perfil.', 'Fechar', { duration: 3000 });
        }
    });
  }

  onCancel(): void {
    this.isEditing = false;
    this.loadInitialProfile();
    this.snackBar.open('Edição cancelada.', 'Fechar', { duration: 1500 });
  }

  navigateToDashboard(): void {
    this.router.navigate(['/app/dashboard']);
  }
}
