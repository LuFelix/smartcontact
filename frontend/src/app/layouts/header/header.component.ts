import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu'; // Para o menu do usuário
import { MatBadgeModule } from '@angular/material/badge'; // Para o sino de notificações
import { CommonModule } from '@angular/common'; // Para *ngIf
import { AuthService, } from '../../core/services/auth.service'; // Import AuthService e UserData
import { UserData } from '../../features/shared/models/users.models';
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

  // Recebe o estado do Sidenav do componente pai
  @Input() sidenavOpen: boolean = true;
  // Emite um evento quando o botão de toggle é clicado
  @Output() toggleSidenav = new EventEmitter<void>();

  userData: UserData | null = null;
  notificationCount = 5; // Exemplo de contagem de notificações

  ngOnInit() {
    this.userData = this.authService.getUserData();
  }

  get profileImage(): string {
    const url = this.userData?.profilePictureUrl;
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
    this.router.navigate(['app/profile']); // Ajuste a rota se necessário
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
