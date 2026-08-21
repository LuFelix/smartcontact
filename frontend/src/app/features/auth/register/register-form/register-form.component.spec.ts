import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterFormComponent } from './register-form.component';
import { AuthService } from '../../../../core/services/auth.service';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('RegisterFormComponent', () => {
  let component: RegisterFormComponent;
  let fixture: ComponentFixture<RegisterFormComponent>;

  beforeEach(async () => {
    const mockAuthService = {
      isLoggedIn: () => false,
    };
    const mockSocialAuthService = {
      authState: of(null),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: SocialAuthService, useValue: mockSocialAuthService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
