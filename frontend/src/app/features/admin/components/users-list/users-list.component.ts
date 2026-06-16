import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

// Importe seu modelo de User e AuthService
import { User, Phone, Tag } from '../../../shared/models/users.models'; 
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent {
  @Input() dataSource = new MatTableDataSource<User>([]);
  @Input() isLoading = false;
  @Input() displayedColumns: string[] = []; // Adicionado para compatibilidade com o componente pai
  
  @Output() viewDetails = new EventEmitter<string>();
  @Output() editUser = new EventEmitter<User>();
  @Output() deleteUser = new EventEmitter<User>();
  @Output() toggleFavoriteAction = new EventEmitter<User>();
  @Output() promoteUser = new EventEmitter<User>();
  @Output() demoteUser = new EventEmitter<User>();

  public authService = inject(AuthService);

  getMainWhatsapp(user: User): string | null {
    if (!user.phones || user.phones.length === 0) return null;
    
    // Procura o telefone principal que é WhatsApp
    const mainWhatsapp = user.phones.find((p: Phone) => p.isMain && p.isWhatsapp);
    if (mainWhatsapp) return mainWhatsapp.number;

    // Fallback: se não tiver principal, pega o primeiro WhatsApp
    const firstWhatsapp = user.phones.find((p: Phone) => p.isWhatsapp);
    return firstWhatsapp ? firstWhatsapp.number : null;
  }

  getMainPhone(user: User): string | null {
    if (!user.phones || user.phones.length === 0) return null;
    const mainPhone = user.phones.find((p: Phone) => p.isMain);
    return mainPhone ? mainPhone.number : user.phones[0].number;
  }

  getTagUuid(user: User): string | null {
    if (!user.tags || user.tags.length === 0) return null;
    const activeTag = user.tags.find((t: Tag) => t.isActive);
    return activeTag ? activeTag.uuid : user.tags[0].uuid;
  }

  getPublicLinkIdentifier(user: User): string | null {
    if (user.username) return user.username;
    return this.getTagUuid(user);
  }

  getAvatar(user: User): string | null {
    // Busca a foto em todas as propriedades possíveis, validando se o valor é preenchido
    const url = (user.profile?.profilePictureUrl && user.profile.profilePictureUrl.length > 5) ? user.profile.profilePictureUrl :
                (user.profilePictureUrl && user.profilePictureUrl.length > 5) ? user.profilePictureUrl :
                ((user as any).picture && (user as any).picture.length > 5) ? (user as any).picture : null;
    
    if (url) {
      if (url.startsWith('http')) return url;
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}/${url}`;
    }
    return null;
  }

  handleImageError(event: any): void {
      // Oculta a imagem se falhar o carregamento para revelar a letra no fundo
      event.target.classList.add('img-hidden');
  }

  getInitial(name: string): string {
      return name ? name.trim().charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(name: string): string {
    if (!name) return '#757575';
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

  isContact(user: User): boolean {
    return user.role?.name?.toLowerCase() === 'contato';
  }

  isUserRole(user: User): boolean {
    return user.role?.name?.toLowerCase() === 'usuario';
  }

  isTeamMember(user: User): boolean {
    return user.role?.name?.toLowerCase() !== 'contato';
  }

  /**
   * 3. VISIBILIDADE DO PERFIL
   * Só mostramos o link se for um usuário real (com profile) e possuir tags.
   */
  canViewPublicProfile(user: User): boolean {
    // Se não tem profile, não tem o que ver publicamente.
    if (!user.profile) return false;
    
    // Além do profile, precisa ter Tags vinculadas.
    return !!(user.tags && user.tags.length > 0) || !!user.username;
  }

  getMainAddressInfo(user: User): { neighborhood: string, cityState: string } | null {
    if (!user.addresses || user.addresses.length === 0) return null;
    const addr = user.addresses.find(a => a.isMain) || user.addresses[0];
    return {
      neighborhood: addr.neighborhood || '',
      cityState: addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city || addr.state || ''
    };
  }

  openWhatsapp(phoneNumber: string): void {
    // Remove caracteres não numéricos
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}`;
    window.open(url, '_blank');
  }

  toggleFavorite(user: User): void {
      this.toggleFavoriteAction.emit(user);
  }
}
