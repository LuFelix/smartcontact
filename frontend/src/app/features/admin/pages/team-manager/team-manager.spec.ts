import { TestBed } from '@angular/core/testing';
import { TeamManagerComponent } from './team-manager';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamService } from '../../../../core/services/team.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('TeamManagerComponent', () => {
  let component: TeamManagerComponent;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      activeRole: signal('usuario')
    };

    TestBed.configureTestingModule({
      providers: [
        TeamManagerComponent,
        { provide: AuthService, useValue: mockAuthService },
        { provide: TeamService, useValue: { listMembers: () => of({ data: [] }) } },
        { provide: LayoutService, useValue: { layout: signal('moderno') } },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} }
      ]
    });

    component = TestBed.inject(TeamManagerComponent);
  });

  it('should evaluate isAdmin as false for common users/members', () => {
    mockAuthService.activeRole.set('usuario');
    expect(component.isAdmin()).toBe(false);

    mockAuthService.activeRole.set('membro');
    expect(component.isAdmin()).toBe(false);
  });

  it('should evaluate isAdmin as true for administrators or owners', () => {
    mockAuthService.activeRole.set('administrador');
    expect(component.isAdmin()).toBe(true);

    mockAuthService.activeRole.set('owner');
    expect(component.isAdmin()).toBe(true);
  });
});
