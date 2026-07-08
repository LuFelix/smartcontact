import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RecentRead } from '../../services/dashboard.service';

@Component({
  selector: 'app-interaction-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatIconModule],
  templateUrl: './interaction-list.html',
  styleUrl: './interaction-list.scss',
})
export class InteractionListComponent {
  @Input({ required: true }) items!: RecentRead[];

  displayedColumns: string[] = ['accessedAt', 'source', 'tag'];

  sourceIcon(name: string | null): string {
    if (!name) return 'help_outline';
    const map: Record<string, string> = {
      nfc: 'near_me',
      qr: 'qr_code_scanner',
      rfid: 'radio_button_checked',
      link: 'link',
      desconhecido: 'help_outline',
    };
    return map[name.toLowerCase()] || 'help_outline';
  }

  sourceLabel(name: string | null): string {
    if (!name) return 'Desconhecido';
    const map: Record<string, string> = {
      nfc: 'NFC',
      qr: 'QR Code',
      rfid: 'RFID',
      link: 'Link Direto',
      desconhecido: 'Desconhecido',
    };
    return map[name.toLowerCase()] || name;
  }
}
