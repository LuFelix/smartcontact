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
            <mat-icon>{{ tag.technologyType === 'NFC_HF' ? 'nfc' : 'settings_input_antenna' }}</mat-icon>
          </div>
          <mat-card-title>{{ tag.name || 'Sem nome' }}</mat-card-title>
          <mat-card-subtitle>UID: <code>{{ tag.uid || '---' }}</code></mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div class="tag-details">
            <div class="detail-item">
              <span class="label">Tecnologia:</span>
              <mat-chip-set>
                <mat-chip>{{ tag.technologyType === 'NFC_HF' ? 'NFC HF' : 'RFID UHF' }}</mat-chip>
              </mat-chip-set>
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

        <mat-card-actions align="end" *ngIf="isAdmin">
          <button mat-icon-button color="primary" matTooltip="Editar" (click)="editTag.emit(tag)">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button color="warn" matTooltip="Excluir" (click)="deleteTag.emit(tag)">
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
      background: rgba(255, 255, 255, 0.7);
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      grid-column: 1 / -1;
    }
    .tag-card { border-radius: 12px; transition: transform 0.2s; }
    .tag-card:hover { transform: translateY(-4px); }
    .tag-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 50%;
      color: #757575;
    }
    .nfc_hf { color: #1976D2; background: #E3F2FD; }
    .rfid_uhf { color: #7B1FA2; background: #F3E5F5; }
    .tag-details { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; }
    .detail-item { display: flex; justify-content: space-between; align-items: center; }
    .label { color: #757575; font-size: 13px; font-weight: 500; }
    .app-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .redirect { background: #E3F2FD; color: #1976D2; }
    .asset_counting { background: #F3E5F5; color: #7B1FA2; }
    .access_control { background: #E8F5E9; color: #388E3C; }
  `]
})
export class TagCardListComponent {
  @Input() tags: Tag[] = [];
  @Input() isLoading = false;
  @Input() isAdmin = false;
  @Output() editTag = new EventEmitter<Tag>();
  @Output() deleteTag = new EventEmitter<Tag>();

  getAppLabel(app: string): string {
    const labels: any = {
      'REDIRECT': 'Redirecionamento',
      'ASSET_COUNTING': 'Contagem Ativos',
      'ACCESS_CONTROL': 'Acesso'
    };
    return labels[app] || app;
  }
}
