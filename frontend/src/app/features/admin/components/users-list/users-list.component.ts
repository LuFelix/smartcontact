import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

// Importe seu modelo de User e AuthService
import { User, Phone } from '../../../shared/models/users.models'; 
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
  public authService = inject(AuthService);

  // --- Inputs (Recebe dados do Pai) ---
  @Input() dataSource = new MatTableDataSource<User>([]);
  @Input() isLoading = false;
  @Input() displayedColumns: string[] = ['name', 'email', 'actions'];

  // --- Outputs (Envia ações para o Pai) ---
  @Output() viewDetails = new EventEmitter<string>(); // Envia o ID como string (UUID)
  @Output() deleteUser = new EventEmitter<User>();
  @Output() toggleFavoriteAction = new EventEmitter<User>();

  getMainWhatsapp(user: User): string | null {
    if (!user.phones || user.phones.length === 0) return null;
    
    // Procura o telefone principal que é WhatsApp
    const mainWhatsapp = user.phones.find(p => p.isMain && p.isWhatsapp);
    if (mainWhatsapp) return mainWhatsapp.number;

    // Fallback: se não tiver principal, pega o primeiro WhatsApp
    const firstWhatsapp = user.phones.find(p => p.isWhatsapp);
    return firstWhatsapp ? firstWhatsapp.number : null;
  }

  getMainPhone(user: User): string | null {
    if (!user.phones || user.phones.length === 0) return null;
    const mainPhone = user.phones.find(p => p.isMain);
    return mainPhone ? mainPhone.number : user.phones[0].number;
  }

  getTagUuid(user: User): string | null {
    if (!user.tags || user.tags.length === 0) return null;
    const activeTag = user.tags.find((t: Tag) => t.isActive);
    return activeTag ? activeTag.uuid : user.tags[0].uuid;
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
