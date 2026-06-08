import { Component, Inject, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { TagService } from '../../../../core/services/tag.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tag, TechnologyType } from '../../../shared/models/users.models';
import { toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import * as QRCode from 'qrcode';

// ============================================================================
// MODAL DE VISUALIZAÇÃO AMPLIADA DO QR CODE
// ============================================================================
@Component({
  selector: 'app-qr-view-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="qr-dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>{{ data.name }}</h2>
        <button mat-icon-button mat-dialog-close type="button"><mat-icon>close</mat-icon></button>
      </div>
      <mat-dialog-content>
        <div class="qr-wrapper">
          <canvas #qrcodeCanvas></canvas>
        </div>
        <div class="url-display">
          <span class="url-label">Destino do Recurso:</span>
          <div class="url-value">{{ data.url }}</div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-stroked-button (click)="copyLink()" type="button">
          <mat-icon>content_copy</mat-icon> Copiar Link
        </button>
        <button mat-flat-button color="primary" (click)="downloadQR()" type="button">
          <mat-icon>download</mat-icon> Baixar QR Code
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .qr-dialog-container { padding: 16px; background: var(--mat-sys-surface); border-radius: 16px; }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 16px; }
    .dialog-header h2 { margin: 0; font-size: 18px; font-weight: 500; color: var(--mat-sys-on-surface); }
    mat-dialog-content { display: flex; flex-direction: column; align-items: center; overflow: hidden; padding-bottom: 16px; }
    .qr-wrapper { background: white; padding: 24px; border-radius: 12px; box-shadow: var(--mat-sys-level1); display: flex; justify-content: center; align-items: center; margin-bottom: 16px; }
    .url-display { width: 100%; text-align: center; }
    .url-label { display: block; font-size: 12px; color: var(--mat-sys-outline); margin-bottom: 4px; }
    .url-value { font-family: monospace; font-size: 11px; color: var(--mat-sys-on-surface-variant); background: var(--mat-sys-surface-variant); padding: 8px; border-radius: 6px; word-break: break-all; }
    mat-dialog-actions { display: flex; gap: 16px; padding: 0 16px; }
  `]
})
export class QrViewDialogComponent implements AfterViewInit {
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);
  
  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { url: string, name: string }) {}

  ngAfterViewInit() {
    this.generateQR();
  }

  generateQR() {
    if (this.qrcodeCanvas && this.data.url) {
      QRCode.toCanvas(this.qrcodeCanvas.nativeElement, this.data.url, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
      }, (error: Error | null | undefined) => {
          if (error) console.error('Erro ao gerar QR Code ampliado', error);
      });
    }
  }

  copyLink() {
    this.clipboard.copy(this.data.url);
    this.snackBar.open('Link copiado para a área de transferência', 'OK', { duration: 2000 });
  }

  downloadQR() {
    if (!this.qrcodeCanvas) return;
    const canvas = this.qrcodeCanvas.nativeElement;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const resourceName = this.data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `qr-${resourceName}.png`;
    link.href = url;
    link.click();
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL: VITRINE DE TAGS DELEGADAS
// ============================================================================
@Component({
  selector: 'app-my-tags',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="my-tags-container">
      <app-page-header title="Meus Recursos (Tags)">
      </app-page-header>

      <div class="content-container">
        @if (isLoading) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Carregando seus recursos...</p>
          </div>
        } @else if (tags.length === 0) {
          <app-empty-state
            icon="auto_stories"
            title="Nenhum recurso delegado"
            message="Você ainda não possui recursos ou tags delegados neste Workspace.">
          </app-empty-state>
        } @else {
          <div class="cards-grid">
            <mat-card *ngFor="let tag of tags" class="resource-card mat-elevation-z2">
              <mat-card-header>
                <div mat-card-avatar class="icon-avatar" [ngClass]="tag.technologyType.toLowerCase()">
                  <mat-icon>{{ getIcon(tag.technologyType) }}</mat-icon>
                </div>
                <mat-card-title>{{ tag.name || 'Recurso sem nome' }}</mat-card-title>
                <mat-card-subtitle>{{ getTechLabel(tag.technologyType) }}</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div class="mini-qr-container" (click)="openQrModal(tag)">
                   <!-- Renderização de Mini QR gerada programaticamente no canvas -->
                   <canvas [id]="'qr-' + tag.id" class="mini-qr-canvas"></canvas>
                   <div class="overlay-hint">
                     <mat-icon>zoom_in</mat-icon>
                     <span>Ampliar</span>
                   </div>
                </div>
              </mat-card-content>

              <mat-card-actions align="end">
                <button mat-button color="primary" (click)="openQrModal(tag)" type="button">
                  <mat-icon>visibility</mat-icon> Visualizar / Baixar
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .my-tags-container { padding: 24px; }
    .content-container { margin-top: 24px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--mat-sys-outline); gap: 16px; }
    
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .resource-card {
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .icon-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    /* Cores das Tecnologias */
    .nfc_hf { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .rfid_uhf { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }
    .qr_code { color: var(--mat-sys-on-secondary-container); background: var(--mat-sys-secondary-container); }
    .link { color: var(--mat-sys-on-primary-container); background: var(--mat-sys-primary-container); }
    .trilha { color: var(--mat-sys-on-tertiary-container); background: var(--mat-sys-tertiary-container); }

    .mini-qr-container {
      position: relative;
      margin: 16px auto;
      width: 140px;
      height: 140px;
      background: white;
      padding: 8px;
      border-radius: 8px;
      box-shadow: var(--mat-sys-level1);
      cursor: pointer;
      overflow: hidden;
    }
    .mini-qr-canvas {
      width: 100% !important;
      height: 100% !important;
    }
    .overlay-hint {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      border-radius: 8px;
    }
    .mini-qr-container:hover .overlay-hint {
      opacity: 1;
    }
    .overlay-hint mat-icon { font-size: 32px; width: 32px; height: 32px; margin-bottom: 4px; }
    
    mat-card-actions {
      margin-top: auto;
      padding: 8px 16px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-lowest);
    }
  `]
})
export class MyTagsComponent implements OnInit {
  private tagService = inject(TagService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  tags: Tag[] = [];
  isLoading = true;

  constructor() {
    // Reage à mudança de workspace no cabeçalho
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.loadMyTags();
    });
  }

  ngOnInit(): void {
    // A chamada inicial já é coberta pelo toObservable do constructor
  }

  loadMyTags(): void {
    this.isLoading = true;
    this.tagService.getMyDelegated()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.tags = data;
          // Agendar a renderização dos QRs para o próximo ciclo (após o DOM do ngFor existir)
          setTimeout(() => this.renderMiniQRs(), 100);
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao carregar seus recursos.', 'Fechar');
        }
      });
  }

  getResolvedUrl(tag: Tag): string {
    if ((tag.technologyType === TechnologyType.LINK || tag.technologyType === TechnologyType.TRILHA) && tag.value) {
      return tag.value.startsWith('http') ? tag.value : 'https://' + tag.value;
    }
    return window.location.origin + '/t/' + tag.uuid;
  }

  renderMiniQRs() {
    this.tags.forEach(tag => {
      const canvasId = 'qr-' + tag.id;
      const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
      if (canvasEl) {
        QRCode.toCanvas(canvasEl, this.getResolvedUrl(tag), {
          width: 140,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        }, (err) => {
          if (err) console.error('Erro no Mini QR', err);
        });
      }
    });
  }

  openQrModal(tag: Tag): void {
    this.dialog.open(QrViewDialogComponent, {
      data: {
        name: tag.name || 'Recurso',
        url: this.getResolvedUrl(tag)
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'large-abac-modal',
      autoFocus: false
    });
  }

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
      'NFC_HF': 'Tag NFC',
      'RFID_UHF': 'RFID UHF',
      'QR_CODE': 'QR Code',
      'LINK': 'Link Seguro',
      'TRILHA': 'Trilha de Conhecimento'
    };
    return labels[tech] || tech;
  }
}
