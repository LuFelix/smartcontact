import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const NFC_TECH_TYPES = ['NFC_HF', 'RFID_UHF'];

@Component({
  selector: 'app-my-tags-list-view',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <div class="table-container mat-elevation-z2">
      <div class="loading-shade" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      <table mat-table [dataSource]="tags">
        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nome do Recurso </th>
          <td mat-cell *matCellDef="let tag"> 
            <span class="tag-name">{{ tag.name || 'Recurso sem nome' }}</span>
          </td>
        </ng-container>

        <!-- Technology Column -->
        <ng-container matColumnDef="technology">
          <th mat-header-cell *matHeaderCellDef> Tipo </th>
          <td mat-cell *matCellDef="let tag">
            <span class="tech-badge" [ngClass]="tag.technologyType.toLowerCase()">
              <mat-icon class="inline-icon">{{ getIcon(tag.technologyType) }}</mat-icon>
              {{ getTechLabel(tag.technologyType) }}
            </span>
          </td>
        </ng-container>

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Ações </th>
          <td mat-cell *matCellDef="let tag">
            @if (isNfcTag(tag)) {
              <button mat-stroked-button color="primary" (click)="writeNfc.emit(tag)" type="button">
                <mat-icon>nfc</mat-icon> Ler / Gravar NFC
              </button>
            } @else {
              <button mat-stroked-button color="primary" (click)="viewQr.emit(tag)" type="button">
                <mat-icon>visibility</mat-icon> Visualizar / Baixar
              </button>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .table-container { background: var(--mat-sys-surface-container-lowest); border-radius: 8px; overflow: hidden; position: relative; min-height: 200px; }
    table { width: 100%; background: transparent; }
    .loading-shade { position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: var(--mat-sys-surface-variant); opacity: 0.6; z-index: 1; display: flex; align-items: center; justify-content: center; }
    .tag-name { font-weight: 500; font-size: 14px; color: var(--mat-sys-on-surface); }
    .tech-badge { padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; }
    .inline-icon { font-size: 14px; width: 14px; height: 14px; }
    .nfc_hf { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .rfid_uhf { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .qr_code { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .link { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .trilha { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    th.mat-header-cell { color: var(--mat-sys-on-surface-variant); font-weight: 700; }
    td.mat-cell { color: var(--mat-sys-on-surface); }
  `]
})
export class MyTagsListViewComponent {
  @Input() tags: any[] = [];
  @Input() isLoading = false;
  @Output() viewQr = new EventEmitter<any>();
  @Output() writeNfc = new EventEmitter<any>();

  displayedColumns: string[] = ['name', 'technology', 'actions'];

  isNfcTag(tag: any): boolean {
    return NFC_TECH_TYPES.includes(tag.technologyType);
  }

  getIcon(tech: string): string {
    const icons: Record<string, string> = { 'NFC_HF': 'nfc', 'RFID_UHF': 'settings_input_antenna', 'QR_CODE': 'qr_code', 'LINK': 'link', 'TRILHA': 'auto_stories' };
    return icons[tech] || 'tag';
  }

  getTechLabel(tech: string): string {
    const labels: Record<string, string> = { 'NFC_HF': 'Tag NFC', 'RFID_UHF': 'RFID UHF', 'QR_CODE': 'QR Code', 'LINK': 'Link Seguro', 'TRILHA': 'Trilha de Conhecimento' };
    return labels[tech] || tech;
  }
}
