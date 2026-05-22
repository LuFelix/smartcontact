// Caminho: src/app/pages/profile-page/profile.component.ts (Reconstruído com ID UUID)
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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

// Models e Serviços
import { UserData, FullUserResponse, Phone, Address } from '../../../shared/models/users.models';
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
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  // --- Injeções ---
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cepService = inject(CepService);

  // --- Estado do Componente ---
  profileForm: FormGroup;
  currentUserData: UserData | null = null;
  isLoading = true;
  isSaving = false;
  isEditing = false;
  isFetchingCep = false;
  profilePicturePreview: string | ArrayBuffer | null = null;

  // --- Subscriptions ---
  private profileSubscription!: Subscription;
  private cepSubscription!: Subscription;

  constructor() {
    this.profileForm = this.fb.group({
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      phone: [{ value: '', disabled: true }, [Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
      cep: [{ value: '', disabled: true }, [Validators.pattern(/^\d{5}-?\d{3}$/)]],
      street: [{ value: '', disabled: true }],
      neighborhood: [{ value: '', disabled: true }],
      city: [{ value: '', disabled: true }],
      uf: [{ value: '', disabled: true }],
    });
  }

  ngOnInit(): void {
    this.loadInitialProfile();
    this.setupCepAutofill();
  }

  ngOnDestroy(): void {
    this.profileSubscription?.unsubscribe();
    this.cepSubscription?.unsubscribe();
  }

  loadInitialProfile(): void {
    this.isLoading = true;
    const currentUserId = this.authService.userId();

    if (!currentUserId) {
      console.error("ID do usuário logado (UUID) não encontrado no AuthService.");
      this.snackBar.open('Erro ao identificar usuário.', 'Fechar', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    this.profileSubscription = this.userService.findById(currentUserId).pipe(
      catchError(err => {
        console.error('Erro ao carregar perfil:', err);
        this.snackBar.open('Erro ao carregar seu perfil.', 'Fechar', { duration: 5000 });
        return EMPTY;
      }),
      finalize(() => this.isLoading = false)
    ).subscribe((userProfile: FullUserResponse) => {
      this.currentUserData = userProfile as any; // Cast temporário para UserData

      const mainPhone = this.getMainPhone(userProfile.phones);
      const mainAddress = this.getMainAddress(userProfile.addresses);

      this.profileForm.patchValue({
        email: userProfile.email,
        firstName: userProfile.name?.split(' ')[0] || '',
        lastName: userProfile.name?.split(' ').slice(1).join(' ') || '',
        phone: mainPhone?.number || '',
        cep: mainAddress?.zipCode || '',
        street: mainAddress?.street || '',
        neighborhood: mainAddress?.neighborhood || '',
        city: mainAddress?.city || '',
        uf: mainAddress?.state || '',
      });

      this.profilePicturePreview = userProfile.profilePictureUrl 
        ? 'http://localhost:3000/' + userProfile.profilePictureUrl
        : null;

      this.profileForm.disable();
    });
  }

  private getMainPhone(phones?: Phone[]): Phone | null {
    if (!phones || phones.length === 0) return null;
    return phones.find(p => p.isMain) || phones[0];
  }

  private getMainAddress(addresses?: Address[]): Address | null {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find(a => a.isMain) || addresses[0];
  }

  setupCepAutofill(): void {
     const cepControl = this.profileForm.get('cep');
    if (!cepControl) return;

    this.cepSubscription = cepControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      filter((cep): cep is string => this.isEditing && !!cep && /^\d{5}-?\d{3}$/.test(cep)),
      tap(() => {
          this.isFetchingCep = true;
          this.profileForm.patchValue({ street: '', neighborhood: '', city: '', uf: '' }, { emitEvent: false });
      }),
      switchMap(cep => this.cepService.fetchAddressFromCep(cep)),
      finalize(() => this.isFetchingCep = false),
      catchError(err => {
          console.error("Erro no fluxo de busca de CEP:", err);
          return of(null);
      })
    ).subscribe(address => {
      if (address) {
        this.profileForm.patchValue({
          street: address.logradouro,
          neighborhood: address.bairro,
          city: address.localidade,
          uf: address.uf,
        });
      } else if (cepControl.value) {
        this.snackBar.open('CEP não encontrado ou inválido.', 'Fechar', { duration: 2500 });
      }
    });
  }

  toggleEditMode(): void {
     this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.profileForm.enable();
      this.profileForm.get('email')?.disable();
    } else {
      this.onCancel();
    }
  }

  triggerImageUpload(): void {
    if (!this.isEditing) return;
    alert("Funcionalidade de upload de imagem não implementada.");
  }

  onSave(): void {
    if (this.profileForm.invalid) { return; }
    this.isLoading = true;

    const formData = this.profileForm.getRawValue();
    
    console.log("--- SALVAR PERFIL (SIMULADO) ---");
    alert("Funcionalidade de salvar perfil ainda não conectada ao backend para nova estrutura.");

    setTimeout(() => {
        this.isLoading = false;
        this.isEditing = false;
        this.profileForm.disable();
        this.snackBar.open('Perfil atualizado (Simulado)!', 'Fechar', { duration: 3000 });
    }, 1500);
  }

  onCancel(): void {
     this.isEditing = false;
    this.profileForm.disable();
    if (this.currentUserData) {
      const mainPhone = this.getMainPhone(this.currentUserData.phones);
      const mainAddress = this.getMainAddress(this.currentUserData.addresses);

      this.profileForm.reset({
        email: this.currentUserData.email,
        firstName: this.currentUserData.firstName || this.currentUserData.name?.split(' ')[0],
        lastName: this.currentUserData.lastName || this.currentUserData.name?.split(' ').slice(1).join(' '),
        phone: mainPhone?.number || '',
        cep: mainAddress?.zipCode || '',
        street: mainAddress?.street || '',
        neighborhood: mainAddress?.neighborhood || '',
        city: mainAddress?.city || '',
        uf: mainAddress?.state || '',
      });
       this.profilePicturePreview = this.currentUserData.profilePictureUrl
          ? 'http://localhost:3000/' + this.currentUserData.profilePictureUrl
          : null;
    }
    this.profileForm.get('email')?.disable();
    this.snackBar.open('Edição cancelada.', 'Fechar', { duration: 1500 });
  }

   navigateToDashboard(): void {
     this.router.navigate(['/app/dashboard']);
   }
}
