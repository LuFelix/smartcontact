import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterPageComponent } from './register-page.component';
import { AuthService } from '../../../../core/services/auth.service';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('RegisterPage', () => {
  let component: RegisterPageComponent;
  let fixture: ComponentFixture<RegisterPageComponent>;

  beforeEach(async () => {
    const mockAuthService = {
      isLoggedIn: () => false,
    };
    const mockSocialAuthService = {
      authState: of(null),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: SocialAuthService, useValue: mockSocialAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
