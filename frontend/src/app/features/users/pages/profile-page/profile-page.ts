// Caminho: src/app/features/users/pages/profile-page/profile-page.ts

import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, EMPTY, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, filter, finalize } from 'rxjs/operators';
import * as QRCode from 'qrcode';

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
import { UserData, FullUserResponse, Phone, Address, AddressTag, SecondaryEmail, UserLink, RedirectMode, Tag } from '../../../shared/models/users.models';
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
    RouterModule,
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

  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  // Signals
  userUsername = this.authService.userUsername;

  get currentHost(): string {
    return window.location.host;
  }

  profileForm: FormGroup;
  currentUserData: FullUserResponse | null = null;
  activeTag: Tag | null = null;
  
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
  
  redirectModes = [
      { value: RedirectMode.PROFILE, label: 'Perfil Inteligente' },
      { value: RedirectMode.WHATSAPP, label: 'WhatsApp Direto' },
      { value: RedirectMode.VCARD, label: 'Salvar Contato (vCard)' },
      { value: RedirectMode.CUSTOM_URL, label: 'Link Personalizado' }
  ];

  private cepSubscriptions: Subscription[] = [];
  private profileSubscription!: Subscription;

  constructor() {
    this.profileForm = this.fb.group({
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      cpf: [{ value: '', disabled: true }],
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

  get secondaryEmails(): FormArray {
    return this.profileForm.get('secondaryEmails') as FormArray;
  }

  get links(): FormArray {
    return this.profileForm.get('links') as FormArray;
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
    if (!this.isEditing) emailGroup.disable();
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
    if (!this.isEditing) linkGroup.disable();
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
    this.sortPhones();
  }

  setMainEmail(index: number): void {
    if (!this.isEditing) return;
    
    const currentPrimary = this.profileForm.get('email')?.value;
    const selectedSecondaryGroup = this.secondaryEmails.at(index) as FormGroup;
    const newPrimary = selectedSecondaryGroup.get('address')?.value;

    if (!newPrimary) return;

    if (!confirm('Atenção: Ao trocar o e-mail de login, o acesso via Google (se ativo) pode ser desativado para este e-mail. Você precisará usar sua senha local. Deseja continuar?')) {
        return;
    }

    // Swap
    this.profileForm.get('email')?.setValue(newPrimary);
    selectedSecondaryGroup.get('address')?.setValue(currentPrimary);
    
    this.snackBar.open('E-mail de login alterado. Salve para confirmar.', 'OK', { duration: 5000 });
  }

  setMainAddress(index: number): void {
    if (!this.isEditing) return;
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

        if (userProfile.tags && userProfile.tags.length > 0) {
            this.activeTag = userProfile.tags.find((t: Tag) => t.isActive) || userProfile.tags[0];
            this.profileForm.get('tagSettings')?.patchValue({
                id: this.activeTag.id,
                nfcRedirectMode: this.activeTag.nfcRedirectMode,
                nfcCustomUrl: this.activeTag.nfcCustomUrl,
                qrRedirectMode: this.activeTag.qrRedirectMode,
                qrCustomUrl: this.activeTag.qrCustomUrl
            });
            this.generatePersonalQR();
        }

        this.phones.clear();
        if (userProfile.phones) {
            const sortedPhones = [...userProfile.phones].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
            sortedPhones.forEach(p => this.addPhone(p));
        }

        this.addresses.clear();
        if (userProfile.addresses) userProfile.addresses.forEach(a => this.addAddress(a));

        this.secondaryEmails.clear();
        if (userProfile.secondaryEmails) userProfile.secondaryEmails.forEach(e => this.addSecondaryEmail(e));

        this.links.clear();
        if (userProfile.links) userProfile.links.forEach(l => this.addLink(l));

        const avatarUrl = userProfile.profile?.profilePictureUrl;
        if (avatarUrl) {
            this.profilePicturePreview = avatarUrl.startsWith('http') 
                ? avatarUrl 
                : 'http://localhost:3000/' + avatarUrl;
        } else {
            this.profilePicturePreview = null;
        }

        this.profileForm.disable();
        this.phones.controls.forEach(c => c.disable());
        this.addresses.controls.forEach(c => c.disable());
        this.secondaryEmails.controls.forEach(c => c.disable());
        this.links.controls.forEach(c => c.disable());
        this.profileForm.get('tagSettings')?.disable();
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
      this.secondaryEmails.controls.forEach(c => c.enable());
      this.links.controls.forEach(c => c.enable());
      this.profileForm.get('tagSettings')?.enable();
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

    const rawValue = this.profileForm.getRawValue();
    const { tagSettings, firstName, lastName, email, cpf } = rawValue;

    const payload: any = {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        cpf: cpf,
        phones: rawValue.phones.map((p: any) => ({
            id: p.id || undefined,
            number: p.phoneNumber,
            isWhatsapp: p.isWhatsapp,
            isMain: p.isMain
        })),
        addresses: rawValue.addresses.map((a: any) => ({
            id: a.id || undefined,
            street: a.street,
            number: a.streetNumber,
            zipCode: a.zipCode,
            neighborhood: a.neighborhood,
            complement: a.complement,
            city: a.city,
            state: a.state,
            tag: a.tag,
            isMain: a.isMain
        })),
        secondaryEmails: rawValue.secondaryEmails.map((e: any) => ({
            id: e.id || undefined,
            address: e.address
        })),
        links: rawValue.links.map((l: any) => ({
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

    // Remover IDs nulos para evitar erro de validação UUID no backend
    const cleanId = (obj: any) => {
        if (obj.id === null) delete obj.id;
        return obj;
    };
    payload.phones.forEach(cleanId);
    payload.addresses.forEach(cleanId);
    payload.secondaryEmails.forEach(cleanId);
    payload.links.forEach(cleanId);
    if (payload.tags.length > 0) cleanId(payload.tags[0]);

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

  generatePersonalQR(): void {
      if (!this.activeTag) return;
      const baseUrl = window.location.origin;
      const identifier = this.userUsername() || this.activeTag.uuid;
      const url = `${baseUrl}/t/${identifier}?source=qr`;
      
      setTimeout(() => {
          if (this.qrcodeCanvas) {
              QRCode.toCanvas(this.qrcodeCanvas.nativeElement, url, {
                  width: 250,
                  margin: 1,
                  color: {
                      dark: '#000000',
                      light: '#ffffff'
                  }
              }, (error: Error | null | undefined) => {
                  if (error) console.error(error);
              });
          }
      });
  }

  downloadPersonalQR(): void {
    if (!this.qrcodeCanvas) return;
    const canvas = this.qrcodeCanvas.nativeElement;
    const link = document.createElement('a');
    link.download = `smartcontact-qr-${this.userUsername() || 'me'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}
