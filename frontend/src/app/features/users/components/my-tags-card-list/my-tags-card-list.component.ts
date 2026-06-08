import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-my-tags-card-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <div class="cards-grid">
      <div class="loading-shade" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      <mat-card *ngFor="let tag of tags" class="resource-card mat-elevation-z2">
        <mat-card-header>
          <div mat-card-avatar class="icon-avatar" [ngClass]="tag.technologyType.toLowerCase()">
            <mat-icon>{{ getIcon(tag.technologyType) }}</mat-icon>
          </div>
          <mat-card-title class="tag-title">{{ tag.name || 'Recurso sem nome' }}</mat-card-title>
          <mat-card-subtitle>{{ getTechLabel(tag.technologyType) }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="mini-qr-container" (click)="viewQr.emit(tag)">
            <img *ngIf="tag.qrDataUrl" [src]="tag.qrDataUrl" alt="QR Code" class="mini-qr-img">
            <mat-spinner *ngIf="!tag.qrDataUrl" diameter="40"></mat-spinner>
            <div class="overlay-hint">
              <mat-icon>zoom_in</mat-icon>
              <span>Ampliar</span>
            </div>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-stroked-button color="primary" (click)="viewQr.emit(tag)" type="button" class="action-btn">
            <mat-icon>visibility</mat-icon> Visualizar / Baixar
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; position: relative; min-height: 200px; }
    .loading-shade { position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: var(--mat-sys-surface-variant); opacity: 0.6; z-index: 1; display: flex; align-items: center; justify-content: center; grid-column: 1 / -1; }
    .resource-card { border-radius: 12px; background: var(--mat-sys-surface-container-low); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s; }
    .resource-card:hover { transform: translateY(-4px); }
    .tag-title { color: var(--mat-sys-on-surface); font-weight: 700; }
    .icon-avatar { display: flex; align-items: center; justify-content: center; border-radius: 50%; }
    .nfc_hf { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .rfid_uhf { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }
    .qr_code { color: var(--mat-sys-on-secondary-container); background: var(--mat-sys-secondary-container); }
    .link { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .trilha { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }
    .mini-qr-container { position: relative; margin: 16px auto; width: 140px; height: 140px; background: white; padding: 8px; border-radius: 8px; box-shadow: var(--mat-sys-level1); cursor: pointer; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .mini-qr-img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
    .overlay-hint { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; border-radius: 8px; }
    .mini-qr-container:hover .overlay-hint { opacity: 1; }
    .overlay-hint mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 4px; }
    mat-card-actions { margin-top: auto; padding: 12px 16px; border-top: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface-container-lowest); }
    .action-btn { width: 100%; }
  `]
})
export class MyTagsCardListComponent {
  @Input() tags: any[] = [];
  @Input() isLoading = false;
  @Output() viewQr = new EventEmitter<any>();

  getIcon(tech: string): string {
    const icons: any = { 'NFC_HF': 'nfc', 'RFID_UHF': 'settings_input_antenna', 'QR_CODE': 'qr_code', 'LINK': 'link', 'TRILHA': 'auto_stories' };
    return icons[tech] || 'tag';
  }

  getTechLabel(tech: string): string {
    const labels: any = { 'NFC_HF': 'Tag NFC', 'RFID_UHF': 'RFID UHF', 'QR_CODE': 'QR Code', 'LINK': 'Link Seguro', 'TRILHA': 'Trilha de Conhecimento' };
    return labels[tech] || tech;
  }
}
