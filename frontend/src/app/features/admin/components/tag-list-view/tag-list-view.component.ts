import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Tag } from '../../../shared/models/users.models';

@Component({
  selector: 'app-tag-list-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="table-container mat-elevation-z2">
      <div class="loading-shade" *ngIf="isLoading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <table mat-table [dataSource]="tags">
        <!-- UID Column -->
        <ng-container matColumnDef="uid">
          <th mat-header-cell *matHeaderCellDef> UID Físico </th>
          <td mat-cell *matCellDef="let tag"> 
            <code *ngIf="tag.uid" class="uid-code">{{ tag.uid }}</code>
            <span *ngIf="!tag.uid" class="virtual-label">
              <mat-icon>qr_code</mat-icon> Virtual / QR
            </span>
          </td>
        </ng-container>

        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nome / Dono </th>
          <td mat-cell *matCellDef="let tag"> 
            <div class="name-container">
              <span class="tag-name">{{ tag.name || 'Sem nome' }}</span>
              <span class="owner-badge" *ngIf="tag.user">
                <mat-icon>person</mat-icon> {{ tag.user.name }}
              </span>
            </div>
          </td>
        </ng-container>

        <!-- Technology Column -->
        <ng-container matColumnDef="technology">
          <th mat-header-cell *matHeaderCellDef> Tecnologia </th>
          <td mat-cell *matCellDef="let tag">
            <span class="tech-badge" [ngClass]="tag.technologyType.toLowerCase()">
              {{ getTechLabel(tag.technologyType) }}
            </span>
          </td>
        </ng-container>

        <!-- Application Column -->
        <ng-container matColumnDef="application">
          <th mat-header-cell *matHeaderCellDef> Aplicação </th>
          <td mat-cell *matCellDef="let tag"> 
            <span class="app-badge" [ngClass]="tag.applicationType.toLowerCase()">
              {{ getAppLabel(tag.applicationType) }}
            </span>
          </td>
        </ng-container>

        <!-- Actions Column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef> Ações </th>
          <td mat-cell *matCellDef="let tag">
            <div class="actions-buttons">
              <button mat-icon-button color="accent" matTooltip="Gravar NFC" (click)="writeNfc.emit(tag)"
                *ngIf="tag.technologyType === 'NFC_HF' || tag.technologyType === 'RFID_UHF'">
                <mat-icon>near_me</mat-icon>
              </button>
              <button mat-icon-button color="primary" matTooltip="Editar" (click)="editTag.emit(tag)" *ngIf="isAdmin">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Excluir" (click)="deleteTag.emit(tag)" *ngIf="isAdmin">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <span *ngIf="!isAdmin" class="text-muted">Somente Leitura</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .table-container { 
      background: var(--mat-sys-surface-container-lowest); 
      border-radius: 8px; 
      overflow: hidden; 
      position: relative; 
      min-height: 200px; 
    }
    table { width: 100%; background: transparent; }
    
    .uid-code {
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .virtual-label {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--mat-sys-outline);
      font-size: 12px;
      font-style: italic;
    }
    .virtual-label mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .name-container { display: flex; flex-direction: column; gap: 4px; padding: 8px 0; }
    .tag-name { font-weight: 500; font-size: 14px; color: var(--mat-sys-on-surface); }
    
    .owner-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
    }
    .owner-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .loading-shade {
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: var(--mat-sys-surface-variant);
      opacity: 0.6;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tech-badge, .app-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
    }

    /* Tecnologias */
    .nfc_hf { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .rfid_uhf { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .qr_code { background: var(--mat-sys-surface-variant); color: var(--mat-sys-on-surface-variant); }
    .link { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .trilha { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }

    /* Aplicações */
    .redirect { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .asset_counting { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .access_control { background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); }

    .actions-buttons { display: flex; gap: 4px; }
    .text-muted { color: var(--mat-sys-outline); font-size: 12px; font-style: italic; }
    
    th.mat-header-cell { color: var(--mat-sys-on-surface-variant); font-weight: 700; }
    td.mat-cell { color: var(--mat-sys-on-surface); }
  `]
})
export class TagListViewComponent {
  @Input() tags: Tag[] = [];
  @Input() isLoading = false;
  @Input() isAdmin = false;
  @Output() editTag = new EventEmitter<Tag>();
  @Output() deleteTag = new EventEmitter<Tag>();
  @Output() writeNfc = new EventEmitter<Tag>();

  displayedColumns: string[] = ['uid', 'name', 'technology', 'application', 'actions'];

  getTechLabel(tech: string): string {
    const labels: any = {
      'NFC_HF': 'NFC HF',
      'RFID_UHF': 'RFID UHF',
      'QR_CODE': 'QR Code'
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
