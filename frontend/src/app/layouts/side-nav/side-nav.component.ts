// Caminho: src/app/layouts/side-nav/side-nav.component.ts

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

interface NavItem {
  link: string;
  label: string;
  icon: string;
  requiredPermission?: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
  public authService = inject(AuthService);
  public layoutService = inject(LayoutService);

  navItems: NavItem[] = [
    // Início (Dashboard de Métricas)
    { link: '/app/dashboard', label: 'Início', icon: 'home', requiredPermission: 'VIEW_DASHBOARD' },

    // Usuários (Gerencial)
    { link: '/app/users', label: 'Usuários', icon: 'group', requiredPermission: 'READ_USERS' }, 

    // Gestão de Roles (Configurações)
    { link: '/app/roles', label: 'Gestão de Roles', icon: 'admin_panel_settings', requiredPermission: 'ASSIGN_USER_ROLES' },

    // Gestão de Equipe (Workspace)
    { link: '/app/team', label: 'Gestão de Equipe', icon: 'group_add', requiredPermission: 'VIEW_DASHBOARD' },

    // Meus Leads (CRM)
    { link: '/app/leads', label: 'Meus Leads', icon: 'contacts', requiredPermission: 'VIEW_DASHBOARD' },
  ];

  // Função auxiliar para verificar permissão
  canView(item: NavItem): boolean {
    if (!item.requiredPermission) {
      return true; // Se não exigir permissão, mostra para todos
    }
    return this.authService.hasPermission(item.requiredPermission);
  }
}