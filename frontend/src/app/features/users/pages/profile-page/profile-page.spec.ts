import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile-page';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CepService } from '../../../../core/utils/cep.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideNgxMask } from 'ngx-mask';
import { of, throwError } from 'rxjs';
import { FullUserResponse, Tag, RedirectMode } from '../../../shared/models/users.models';

vi.mock('qrcode', () => ({
  toCanvas: vi.fn().mockResolvedValue(undefined)
}));

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockUserService: any;
  let mockAuthService: any;
  let mockCepService: any;
  let mockSnackBar: any;
  let mockDialog: any;
  let mockBreakpointObserver: any;

  const mockUser: FullUserResponse = {
    id: 'user-123',
    email: 'john@email.com',
    name: 'John Doe',
    username: 'johndoe',
    role: 'administrador',
    phones: [
      { id: 'phone-1', number: '11999999999', isWhatsapp: true, isMain: true }
    ],
    addresses: [
      { id: 'addr-1', street: 'Street A', number: '123', zipCode: '12345678', neighborhood: 'Bairro A', complement: '', city: 'City A', state: 'SP', tag: 'HOME', isMain: true }
    ],
    secondaryEmails: [
      { id: 'sec-1', address: 'secondary@email.com' }
    ],
    links: [
      { id: 'link-1', title: 'My Site', url: 'https://mysite.com' }
    ],
    tags: [
      {
        id: 'tag-1',
        uid: 'uid-1',
        uuid: 'uuid-1',
        name: 'My NFC Tag',
        isActive: true,
        isResource: false,
        nfcRedirectMode: RedirectMode.PROFILE,
        nfcCustomUrl: '',
        qrRedirectMode: RedirectMode.PROFILE,
        qrCustomUrl: ''
      } as Tag
    ]
  } as FullUserResponse;

  beforeEach(async () => {
    mockUserService = {
      findById: vi.fn().mockReturnValue(of(mockUser)),
      update: vi.fn().mockReturnValue(of(mockUser)),
    };

    mockAuthService = {
      userId: vi.fn().mockReturnValue('user-123'),
      userUsername: vi.fn().mockReturnValue('johndoe'),
      activeTenantId: vi.fn().mockReturnValue('tenant-1'),
    };

    mockCepService = {
      fetchAddressFromCep: vi.fn().mockReturnValue(of({
        logradouro: 'Street A',
        bairro: 'Bairro A',
        localidade: 'City A',
        uf: 'SP',
        erro: false
      })),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    mockDialog = {
      open: vi.fn(),
    };

    mockBreakpointObserver = {
      observe: vi.fn().mockReturnValue(of({ matches: false } as BreakpointState)),
    };

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNgxMask(),
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CepService, useValue: mockCepService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: MatDialog, useValue: mockDialog },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
      ]
    });

    TestBed.overrideProvider(MatDialog, { useValue: mockDialog });

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadInitialProfile', () => {
    it('should fetch user data and patch form fields', () => {
      expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
      expect(component.currentUserData).toEqual(mockUser);
      expect(component.profileForm.get('firstName')?.value).toBe('John');
      expect(component.profileForm.get('lastName')?.value).toBe('Doe');
      expect(component.activeTag?.id).toBe('tag-1');
    });

    it('should show snackbar message on load error', () => {
      mockUserService.findById.mockReturnValueOnce(throwError(() => new Error('Load error')));
      
      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(mockSnackBar.open).toHaveBeenCalledWith('Erro ao carregar seu perfil.', 'Fechar', { duration: 5000 });
    });
  });

  describe('NFC link operations', () => {
    it('should return correct NFC redirect URL', () => {
      expect(component.nfcUrl).toContain('/t/uuid-1?source=nfc');
    });

    it('should copy NFC URL to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy
        }
      });

      component.copyNfcLink();

      expect(writeTextSpy).toHaveBeenCalledWith(component.nfcUrl);
    });

    it('should open NFC chip writer dialog', () => {
      component.writeNfcChip();
      expect(mockDialog.open).toHaveBeenCalled();
    });
  });

  describe('form arrays operations', () => {
    it('should add phone, secondary email, link and address to form array', () => {
      const initialPhones = component.phones.length;
      component.addPhone();
      expect(component.phones.length).toBe(initialPhones + 1);

      const initialEmails = component.secondaryEmails.length;
      component.addSecondaryEmail();
      expect(component.secondaryEmails.length).toBe(initialEmails + 1);

      const initialLinks = component.links.length;
      component.addLink();
      expect(component.links.length).toBe(initialLinks + 1);

      const initialAddresses = component.addresses.length;
      component.addAddress();
      expect(component.addresses.length).toBe(initialAddresses + 1);
    });

    it('should remove items from form arrays', () => {
      const initialPhones = component.phones.length;
      component.addPhone();
      component.removePhone(initialPhones);
      expect(component.phones.length).toBe(initialPhones);

      const initialEmails = component.secondaryEmails.length;
      component.addSecondaryEmail();
      component.removeSecondaryEmail(initialEmails);
      expect(component.secondaryEmails.length).toBe(initialEmails);

      const initialLinks = component.links.length;
      component.addLink();
      component.removeLink(initialLinks);
      expect(component.links.length).toBe(initialLinks);

      const initialAddresses = component.addresses.length;
      component.addAddress();
      component.removeAddress(initialAddresses);
      expect(component.addresses.length).toBe(initialAddresses);
    });
  });

  describe('CEP integration', () => {
    it('should query address details on zipCode change', async () => {
      component.isEditing = true;
      component.addAddress({ zipCode: '' });
      const addressGroup = component.addresses.at(component.addresses.length - 1);
      addressGroup.get('zipCode')?.setValue('01001000');

      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockCepService.fetchAddressFromCep).toHaveBeenCalledWith('01001000');
    });
  });
});
