import { TestBed } from '@angular/core/testing';
import { TagManagerComponent } from './tag-manager.component';
import { AuthService } from '../../../../core/services/auth.service';
import { TagService } from '../../../../core/services/tag.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('TagManagerComponent', () => {
  let component: TagManagerComponent;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      hasRole: vi.fn((role: string) => role === 'usuario') // Default to usuario for testing
    };

    TestBed.configureTestingModule({
      providers: [
        TagManagerComponent,
        { provide: AuthService, useValue: mockAuthService },
        { provide: TagService, useValue: { findAll: () => of([]) } },
        { provide: LayoutService, useValue: { layout: signal('moderno') } },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} }
      ]
    });

    component = TestBed.inject(TagManagerComponent);
  });

  it('should evaluate isAdmin as false for common users/members', () => {
    mockAuthService.hasRole = vi.fn((role: string) => role === 'usuario' || role === 'membro');
    expect(component.isAdmin).toBe(false);
  });

  it('should evaluate isAdmin as true for administrators', () => {
    mockAuthService.hasRole = vi.fn((role: string) => role === 'administrador');
    expect(component.isAdmin).toBe(true);
  });

  it('should evaluate isAdmin as true for owners', () => {
    mockAuthService.hasRole = vi.fn((role: string) => role === 'owner');
    expect(component.isAdmin).toBe(true);
  });
});
