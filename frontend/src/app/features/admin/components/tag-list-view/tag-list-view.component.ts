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
          <td mat-cell *matCellDef="let tag"> <code>{{ tag.uid || '---' }}</code> </td>
        </ng-container>

        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Nome </th>
          <td mat-cell *matCellDef="let tag"> {{ tag.name || 'Sem nome' }} </td>
        </ng-container>

        <!-- Technology Column -->
        <ng-container matColumnDef="technology">
          <th mat-header-cell *matHeaderCellDef> Tecnologia </th>
          <td mat-cell *matCellDef="let tag">
            <mat-chip-set>
              <mat-chip [color]="tag.technologyType === 'NFC_HF' ? 'primary' : 'accent'">
                {{ tag.technologyType === 'NFC_HF' ? 'NFC' : 'RFID UHF' }}
              </mat-chip>
            </mat-chip-set>
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
            <div class="actions-buttons" *ngIf="isAdmin">
              <button mat-icon-button color="primary" matTooltip="Editar" (click)="editTag.emit(tag)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="Excluir" (click)="deleteTag.emit(tag)">
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
    .table-container { background: white; border-radius: 8px; overflow: hidden; position: relative; min-height: 200px; }
    table { width: 100%; }
    .virtual-label {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #757575;
      font-size: 12px;
      font-style: italic;
    }
    .virtual-label mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .name-container { display: flex; flex-direction: column; }
    .tag-name { font-weight: 500; }
    .owner-email { color: #757575; font-size: 11px; }
    .loading-shade {
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: rgba(255, 255, 255, 0.7);
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .app-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .nfc_hf { background: #E3F2FD; color: #1976D2; }
    .rfid_uhf { background: #F3E5F5; color: #7B1FA2; }
    .qr_code { background: #ECEFF1; color: #455A64; }
    .redirect { background: #E3F2FD; color: #1976D2; }
    .asset_counting { background: #F3E5F5; color: #7B1FA2; }
    .access_control { background: #E8F5E9; color: #388E3C; }
    .actions-buttons { display: flex; gap: 4px; }
    .text-muted { color: #757575; font-size: 12px; font-style: italic; }
  `]
})
export class TagListViewComponent {
  @Input() tags: Tag[] = [];
  @Input() isLoading = false;
  @Input() isAdmin = false;
  @Output() editTag = new EventEmitter<Tag>();
  @Output() deleteTag = new EventEmitter<Tag>();

  displayedColumns: string[] = ['uid', 'name', 'technology', 'application', 'actions'];

  getAppLabel(app: string): string {
    const labels: any = {
      'REDIRECT': 'Redirecionamento',
      'ASSET_COUNTING': 'Contagem Ativos',
      'ACCESS_CONTROL': 'Acesso'
    };
    return labels[app] || app;
  }
}
