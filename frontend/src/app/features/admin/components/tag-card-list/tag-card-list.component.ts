import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Tag } from '../../../shared/models/users.models';

@Component({
  selector: 'app-tag-card-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="cards-grid">
      <div class="loading-shade" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <mat-card *ngFor="let tag of tags" class="tag-card mat-elevation-z2">
        <mat-card-header>
          <div mat-card-avatar class="tag-icon-container" [ngClass]="tag.technologyType.toLowerCase()">
            <mat-icon>{{ getIcon(tag.technologyType) }}</mat-icon>
          </div>
          <mat-card-title class="tag-title">{{ tag.name || 'Sem nome' }}</mat-card-title>
          <mat-card-subtitle>
            <span *ngIf="tag.uid" class="uid-text">UID: <code>{{ tag.uid }}</code></span>
            <span *ngIf="!tag.uid" class="virtual-badge">
              <mat-icon>qr_code</mat-icon> QR / Virtual
            </span>
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="tag-details">
            <div class="detail-item" *ngIf="tag.user">
              <span class="label">Dono:</span>
              <span class="owner-badge-ui">
                <mat-icon>person</mat-icon> {{ tag.user.name }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Tecnologia:</span>
              <span class="tech-badge" [ngClass]="tag.technologyType.toLowerCase()">
                {{ getTechLabel(tag.technologyType) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Aplicação:</span>
              <span class="app-badge" [ngClass]="tag.applicationType.toLowerCase()">
                {{ getAppLabel(tag.applicationType) }}
              </span>
            </div>
          </div>
        </mat-card-content>

        <mat-divider></mat-divider>

        <mat-card-actions align="end">
          <button mat-icon-button color="accent" class="icon-align-fix" matTooltip="Gravar NFC" (click)="writeNfc.emit(tag)"
            *ngIf="tag.technologyType === 'NFC_HF' || tag.technologyType === 'RFID_UHF'">
            <mat-icon>near_me</mat-icon>
          </button>
          <button mat-icon-button color="primary" class="icon-align-fix" matTooltip="Editar" (click)="editTag.emit(tag)" *ngIf="isAdmin">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button color="warn" class="icon-align-fix" matTooltip="Excluir" (click)="deleteTag.emit(tag)" *ngIf="isAdmin">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      position: relative;
      min-height: 200px;
    }
    .loading-shade {
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: var(--mat-sys-surface-variant);
      opacity: 0.6;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      grid-column: 1 / -1;
    }
    .tag-card { 
      border-radius: 12px; 
      transition: transform 0.2s; 
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
    }
    .tag-card:hover { transform: translateY(-4px); }
    
    .tag-title { color: var(--mat-sys-on-surface); font-weight: 700; }
    .uid-text { color: var(--mat-sys-on-surface-variant); }
    
    .tag-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--mat-sys-surface-variant);
      border-radius: 50%;
      color: var(--mat-sys-on-surface-variant);
    }

    /* Cores Dinâmicas para Icon Container */
    .nfc_hf { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .rfid_uhf { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }
    .qr_code { color: var(--mat-sys-on-secondary-container); background: var(--mat-sys-secondary-container); }
    .link { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .trilha { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }

    .virtual-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--mat-sys-outline);
      font-size: 11px;
      font-style: italic;
    }
    .virtual-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    
    .tag-details { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; }
    .label { color: var(--mat-sys-on-surface-variant); font-size: 13px; font-weight: 500; }
    
    .owner-badge-ui {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: var(--mat-sys-level1);
    }
    .owner-badge-ui mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .tech-badge, .app-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    /* Tecnologias */
    .nfc_hf { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .rfid_uhf { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .qr_code { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .link { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .trilha { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }

    /* Aplicações */
    .redirect { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .asset_counting { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .access_control { background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); }

    .icon-align-fix {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      padding: 0 !important;
    }
  `]
})
export class TagCardListComponent {
  @Input() tags: Tag[] = [];
  @Input() isLoading = false;
  @Input() isAdmin = false;
  @Output() editTag = new EventEmitter<Tag>();
  @Output() deleteTag = new EventEmitter<Tag>();
  @Output() writeNfc = new EventEmitter<Tag>();

  getIcon(tech: string): string {
    const icons: any = {
      'NFC_HF': 'nfc',
      'RFID_UHF': 'settings_input_antenna',
      'QR_CODE': 'qr_code',
      'LINK': 'link',
      'TRILHA': 'auto_stories'
    };
    return icons[tech] || 'tag';
  }

  getTechLabel(tech: string): string {
    const labels: any = {
      'NFC_HF': 'NFC HF',
      'RFID_UHF': 'RFID UHF',
      'QR_CODE': 'QR Code',
      'LINK': 'Link / Drive',
      'TRILHA': 'Trilha'
    };
    return labels[tech] || tech;
  }

  getAppLabel(app: string): string {
    const labels: any = {
      'REDIRECT': 'Redirecionamento',
      'ASSET_COUNTING': 'Contagem Ativos',
      'ACCESS_CONTROL': 'Acesso'
    };
    return labels[app] || app;
  }
}
