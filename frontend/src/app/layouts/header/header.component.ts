import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu'; 
import { MatBadgeModule } from '@angular/material/badge'; 
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  
  darkMode = this.themeService.darkMode;
  
  // Public Signals
  userName = this.authService.userName;
  userPicture = this.authService.userPicture;

  @Input() sidenavOpen: boolean = true;
  @Output() toggleSidenav = new EventEmitter<void>();

  notificationCount = 5;

  get profileImage(): string {
    const url = this.userPicture();
    if (!url) return '';
    return url.startsWith('http') ? url : `http://localhost:3000/${url}`;
  }

  emitToggleSidenav() {
    this.toggleSidenav.emit();
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  navigateToProfile() {
    this.router.navigate(['app/profile']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
