import { Component, inject, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu'; 
import { MatBadgeModule } from '@angular/material/badge'; 
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  darkMode = this.themeService.darkMode;

  // Public Signals
  userName = this.authService.userName;
  userPicture = this.authService.userPicture;
  activeTenantId = this.authService.activeTenantId;

  workspaces = signal<any[]>([]);

  currentWorkspace = computed(() => {
    const activeId = this.activeTenantId();
    return this.workspaces().find(w => w.tenantId === activeId)?.tenant;
  });

  @Input() sidenavOpen: boolean = true;
  @Output() toggleSidenav = new EventEmitter<void>();

  notificationCount = 5;

  ngOnInit() {
    this.loadWorkspaces();
  }

  loadWorkspaces() {
    this.authService.getMyWorkspaces().subscribe({
      next: (data) => {
        this.workspaces.set(data);
        // Se houver workspaces mas nenhum ativo, define o primeiro
        if (data.length > 0 && !this.activeTenantId()) {
            this.authService.switchTenant(data[0].tenantId);
        }
      },
      error: (err) => console.error('Erro ao carregar workspaces:', err)
    });
  }

  switchWorkspace(tenantId: string) {
    this.authService.switchTenant(tenantId);
    // Recarrega a página ou notifica para resetar o estado dos componentes
    window.location.reload(); 
  }

  get profileImage(): string | null {
    const url = this.userPicture();
    if (url && typeof url === 'string' && url.length > 5) {
        if (url.startsWith('http')) return url;
        const baseUrl = environment.apiUrl.replace('/api', '');
        return `${baseUrl}/${url}`;
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
