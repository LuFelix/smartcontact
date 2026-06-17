import { Component, Inject, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { TagService } from '../../../../core/services/tag.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { Tag, TechnologyType } from '../../../shared/models/users.models';
import { toObservable } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import * as QRCode from 'qrcode';

// Dumb Components
import { MyTagsListViewComponent } from '../../components/my-tags-list-view/my-tags-list-view.component';
import { MyTagsCardListComponent } from '../../components/my-tags-card-list/my-tags-card-list.component';

export interface DisplayTag extends Tag {
  qrDataUrl?: string;
  resolvedUrl?: string;
}

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
// COMPONENTE PRINCIPAL (SMART): VITRINE DE TAGS DELEGADAS
// ============================================================================
@Component({
  selector: 'app-my-tags',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    MyTagsListViewComponent,
    MyTagsCardListComponent
  ],
  templateUrl: './my-tags.component.html',
  styleUrl: './my-tags.component.scss'
})
export class MyTagsComponent implements OnInit {
  private tagService = inject(TagService);
  private authService = inject(AuthService);
  public layoutService = inject(LayoutService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayTags: DisplayTag[] = [];
  isLoading = true;

  constructor() {
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.loadMyTags();
    });
  }

  ngOnInit(): void {}

  loadMyTags(): void {
    this.isLoading = true;
    this.tagService.getMyDelegated()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.displayTags = data.map(tag => ({
            ...tag,
            resolvedUrl: this.getResolvedUrl(tag)
          }));
          this.generateAllQrDataUrls();
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
    return window.location.origin + '/t/' + (tag.handle || tag.uuid);
  }

  generateAllQrDataUrls() {
    this.displayTags.forEach(tag => {
      if (tag.resolvedUrl) {
        QRCode.toDataURL(tag.resolvedUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        }, (err, url) => {
          if (!err) {
            tag.qrDataUrl = url;
          }
        });
      }
    });
  }

  openQrModal(tag: DisplayTag): void {
    this.dialog.open(QrViewDialogComponent, {
      data: {
        name: tag.name || 'Recurso',
        url: tag.resolvedUrl
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'large-abac-modal',
      autoFocus: false
    });
  }
}
