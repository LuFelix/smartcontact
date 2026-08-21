import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginForm } from './login-form';
import { AuthService } from '../../../../core/services/auth.service';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('LoginForm', () => {
  let component: LoginForm;
  let fixture: ComponentFixture<LoginForm>;

  beforeEach(async () => {
    const mockAuthService = {
      isLoggedIn: () => false,
    };
    const mockSocialAuthService = {
      authState: of(null),
      initialized: of(true),
      initState: of(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: SocialAuthService, useValue: mockSocialAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
