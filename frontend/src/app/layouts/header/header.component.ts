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

  get profileImage(): string | null {
    const url = this.userPicture();
    if (url && typeof url === 'string' && url.length > 5) {
        return url.startsWith('http') ? url : `http://localhost:3000/${url}`;
    }
    return null;
  }

  getInitial(): string {
    const name = this.userName();
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(): string {
    const name = this.userName() || '';
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  handleImageError(event: any): void {
      event.target.classList.add('img-hidden');
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
