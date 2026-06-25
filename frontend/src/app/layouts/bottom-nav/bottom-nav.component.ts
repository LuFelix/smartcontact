import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-bottom-sheet-options',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatDividerModule, RouterLink],
  template: `
    <mat-nav-list>
      <a mat-list-item routerLink="/app/users" (click)="close()">
        <mat-icon matListItemIcon>contacts</mat-icon>
        <span matListItemTitle>Contatos</span>
      </a>
      <a mat-list-item routerLink="/app/team" (click)="close()">
        <mat-icon matListItemIcon>group_add</mat-icon>
        <span matListItemTitle>Gestão de Equipe</span>
      </a>
      <a mat-list-item routerLink="/app/roles" (click)="close()">
        <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
        <span matListItemTitle>Gestão de Roles</span>
      </a>
      <a mat-list-item routerLink="/app/leads" (click)="close()">
        <mat-icon matListItemIcon>person_search</mat-icon>
        <span matListItemTitle>Meus Leads</span>
      </a>
      <mat-divider></mat-divider>
      <a mat-list-item (click)="logout()">
        <mat-icon matListItemIcon color="warn">logout</mat-icon>
        <span matListItemTitle>Sair</span>
      </a>
    </mat-nav-list>
  `
})
export class BottomSheetOptionsComponent {
  private authService = inject(AuthService);
  private bottomSheetRef = inject(MatBottomSheet);
  private router = inject(Router);

  close(): void {
    this.bottomSheetRef.dismiss();
  }

  logout(): void {
    this.bottomSheetRef.dismiss();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
    MatBottomSheetModule
  ],
  template: `
    <nav class="bottom-nav">
      <a mat-button class="nav-item"
         routerLink="/app/profile"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>person</mat-icon>
        <span class="nav-label">Perfil</span>
      </a>
      <a mat-button class="nav-item"
         routerLink="/app/tags"
         routerLinkActive="active">
        <mat-icon>nfc</mat-icon>
        <span class="nav-label">Tags</span>
      </a>
      <a mat-button class="nav-item"
         routerLink="/app/dashboard"
         routerLinkActive="active"
         [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>bar_chart</mat-icon>
        <span class="nav-label">Analytics</span>
      </a>
      <button mat-button class="nav-item" (click)="openOptionsSheet()">
        <mat-icon>more_horiz</mat-icon>
        <span class="nav-label">Opções</span>
      </button>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 64px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: var(--mat-sys-surface-container);
      border-top: 1px solid var(--mat-sys-outline-variant);
      z-index: 1000;
      padding: 0;
      box-sizing: border-box;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      height: 100%;
      min-width: 0;
      flex: 1;
      border-radius: 0;
      padding: 8px 4px;
      color: var(--mat-sys-on-surface-variant);
      background: transparent;
      transition: color 0.2s;
    }

    .nav-item.active {
      color: var(--mat-sys-primary);
    }

    .nav-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .nav-label {
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
    }

    @media (max-width: 959.98px) {
      .bottom-nav {
        height: 64px;
      }
    }
  `]
})
export class BottomNavComponent {
  private bottomSheet = inject(MatBottomSheet);

  openOptionsSheet(): void {
    this.bottomSheet.open(BottomSheetOptionsComponent, {
      panelClass: 'bottom-sheet-options'
    });
  }
}
