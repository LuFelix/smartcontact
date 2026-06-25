import { Component, Inject, inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Tag, TechnologyType, ApplicationType, RedirectMode } from '../../../shared/models/users.models';
import { NfcWriterDialogComponent, NfcWriterDialogData } from '../../../shared/components/nfc-writer-dialog/nfc-writer-dialog';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-fullscreen-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="qr-fullscreen-container">
      <div class="header">
        <h2>{{ data.name }}</h2>
        <button mat-icon-button mat-dialog-close type="button"><mat-icon>close</mat-icon></button>
      </div>
      <div class="img-wrapper">
        <img [src]="data.qrDataUrl" alt="QR Code Ampliado">
      </div>
    </div>
  `,
  styles: [`
    .qr-fullscreen-container { padding: 24px; display: flex; flex-direction: column; align-items: center; background: var(--mat-sys-surface); border-radius: 16px; }
    .header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; color: var(--mat-sys-on-surface); }
    h2 { margin: 0; font-size: 18px; font-weight: 500; }
    .img-wrapper { background: white; padding: 24px; border-radius: 12px; box-shadow: var(--mat-sys-level1); display: flex; justify-content: center; align-items: center; }
    img { width: 400px; height: 400px; object-fit: contain; image-rendering: pixelated; }
    @media (max-width: 600px) { img { width: 100%; height: auto; } }
  `]
})
export class QrFullscreenDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { qrDataUrl: string, name: string }) {}
}

@Component({
  selector: 'app-tag-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.tag ? 'Editar Recurso' : 'Cadastrar Novo Recurso' }}</h2>
    <mat-dialog-content>
      <div class="dialog-layout">
        <div class="form-section">
          <form [formGroup]="tagForm" class="tag-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nome do Recurso</mat-label>
                <input matInput formControlName="name" placeholder="Ex: Drive Apto Luxo ou Trilha de Matemática">
                <mat-error *ngIf="tagForm.get('name')?.hasError('required')">O nome é obrigatório</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row split">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de Recurso</mat-label>
                <mat-select formControlName="technologyType" (selectionChange)="onTechChange()">
                  <mat-option [value]="techTypes.LINK">🔗 Link / Drive</mat-option>
                  <mat-option [value]="techTypes.TRILHA">📚 Trilha de Conteúdo</mat-option>
                  <mat-option [value]="techTypes.QR_CODE">📱 QR Code Virtual</mat-option>
                  <mat-option [value]="techTypes.NFC_HF">📟 Tag NFC (Física)</mat-option>
                  <mat-option [value]="techTypes.RFID_UHF">📡 Chip RFID (Estoque)</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Aplicação</mat-label>
                <mat-select formControlName="applicationType">
                  <mat-option [value]="appTypes.REDIRECT">Redirecionamento Direto</mat-option>
                  <mat-option [value]="appTypes.ASSET_COUNTING">Contagem e Inventário</mat-option>
                  <mat-option [value]="appTypes.ACCESS_CONTROL">Controle de Acesso</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Destino / Valor</mat-label>
                <input matInput formControlName="value" placeholder="URL do Drive ou Identificador do MAS">
                <mat-hint>Para LINKS, insira a URL completa (https://...)</mat-hint>
              </mat-form-field>
            </div>

            <div class="form-row" *ngIf="showUidField">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>UID Físico (Opcional)</mat-label>
                <input matInput formControlName="uid" placeholder="ID gravado no hardware (se houver)">
                <mat-hint>Use apenas se quiser vincular este recurso a um chip físico específico</mat-hint>
              </mat-form-field>
            </div>
          </form>
        </div>

        <div class="qr-section" *ngIf="showQrPreview">
          <div class="qr-header">
            <h3>{{ isQrCodeType ? 'QR Code do Recurso' : 'Link da Etiqueta' }}</h3>
            <mat-icon color="primary">{{ isQrCodeType ? 'qr_code_2' : 'contactless' }}</mat-icon>
          </div>
          
          @if (isQrCodeType) {
            <div class="qr-canvas-container">
              <canvas #qrcodeCanvas></canvas>
            </div>
          } @else {
            <div class="nfc-preview-container">
              <mat-icon color="primary">contactless</mat-icon>
              <span class="nfc-preview-label">Link gravado na etiqueta:</span>
              <div class="url-value">{{ previewUrl }}</div>
            </div>
          }

          <div class="url-display">
            @if (isLinkType) {
              <span class="url-label">Link de Destino:</span>
              <div class="url-value">{{ previewUrl }}</div>
            } @else {
              <span class="url-label">Redirecionará para:</span>
              <div class="url-value">{{ previewValue || '(perfil padrão)' }}</div>
            }
          </div>
          
          @if (isQrCodeType) {
            <div class="qr-actions">
              <button mat-stroked-button color="primary" class="download-btn" (click)="downloadQR()" type="button">
                <mat-icon>download</mat-icon> Baixar (PNG)
              </button>
              <button mat-icon-button color="primary" matTooltip="Ampliar QR Code" (click)="openLargeQR()" type="button">
                <mat-icon>zoom_in</mat-icon>
              </button>
            </div>
          }

          @if (showNfcActions) {
            <div class="nfc-actions-divider"></div>
            <div class="nfc-actions">
              <span class="nfc-actions-label">Gravação NFC</span>
              <div class="nfc-btn-row">
                <button mat-stroked-button color="accent" (click)="openNfcWriter('write')" type="button">
                  <mat-icon>near_me</mat-icon> Gravar
                </button>
                <button mat-stroked-button (click)="openNfcWriter('read')" type="button">
                  <mat-icon>contactless</mat-icon> Ler
                </button>
                <button mat-stroked-button color="warn" (click)="openNfcWriter('erase')" type="button">
                  <mat-icon>delete_forever</mat-icon> Apagar
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" type="button">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="tagForm.invalid" (click)="onSave()" type="button">
        {{ data.tag ? 'Atualizar Recurso' : 'Salvar Recurso' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    .form-section {
      flex: 1;
      min-width: 320px;
    }
    .qr-section {
      width: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 20px 16px;
      background: var(--mat-sys-surface-container-lowest);
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .qr-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      justify-content: center;
    }
    .qr-header h3 {
      margin: 0;
      font-size: 16px;
      color: var(--mat-sys-on-surface);
      font-weight: 500;
    }
    .qr-canvas-container {
      background: var(--mat-sys-surface);
      padding: 12px;
      border-radius: 8px;
      box-shadow: var(--mat-sys-level1);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .url-display {
      width: 100%;
      text-align: center;
    }
    .url-label {
      display: block;
      font-size: 12px;
      color: var(--mat-sys-outline);
      margin-bottom: 4px;
      font-weight: 500;
    }
    .url-value {
      font-size: 11px;
      word-break: break-all;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-variant);
      padding: 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .qr-actions {
      display: flex;
      width: 100%;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }
    .download-btn {
      flex: 1;
    }
    .nfc-preview-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 12px;
      background: var(--mat-sys-surface);
      border-radius: 8px;
      box-shadow: var(--mat-sys-level1);
      width: 100%;
    }
    .nfc-preview-container mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .nfc-preview-label {
      font-size: 11px;
      color: var(--mat-sys-outline);
      font-weight: 500;
    }
    .nfc-actions-divider {
      width: 100%;
      height: 1px;
      background: var(--mat-sys-outline-variant);
    }
    .nfc-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .nfc-actions-label {
      font-size: 11px;
      color: var(--mat-sys-outline);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nfc-btn-row {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .nfc-btn-row button {
      flex: 1;
      min-width: 0;
      font-size: 11px;
    }
    .nfc-btn-row button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .tag-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }
    .split > mat-form-field {
      flex: 1;
    }
    
    @media (max-width: 600px) {
      .dialog-layout {
        flex-direction: column;
      }
      .qr-section {
        width: 100%;
        box-sizing: border-box;
      }
    }
  `]
})
export class TagDialogComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TagDialogComponent>);
  private dialog = inject(MatDialog);
  
  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  tagForm: FormGroup;
  techTypes = TechnologyType;
  appTypes = ApplicationType;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { tag?: Tag }) {
    this.tagForm = this.fb.group({
      uid: [data.tag?.uid || ''],
      name: [data.tag?.name || '', [Validators.required]],
      technologyType: [data.tag?.technologyType || TechnologyType.LINK, [Validators.required]],
      applicationType: [data.tag?.applicationType || ApplicationType.REDIRECT, [Validators.required]],
      value: [data.tag?.value || '', [Validators.required]],
    });
  }

  get showUidField(): boolean {
    const type = this.tagForm.get('technologyType')?.value;
    return type === TechnologyType.NFC_HF || type === TechnologyType.RFID_UHF;
  }

  get showQrPreview(): boolean {
    if (!this.data.tag || !this.data.tag.uuid) return false;
    const type = this.tagForm.get('technologyType')?.value;
    return type === TechnologyType.LINK || type === TechnologyType.TRILHA
        || type === TechnologyType.QR_CODE || type === TechnologyType.NFC_HF
        || type === TechnologyType.RFID_UHF;
  }

  get isQrCodeType(): boolean {
    const type = this.tagForm.get('technologyType')?.value;
    return type === TechnologyType.LINK || type === TechnologyType.TRILHA
        || type === TechnologyType.QR_CODE;
  }

  get isLinkType(): boolean {
    return this.tagForm.get('technologyType')?.value === TechnologyType.LINK;
  }

  get previewValue(): string | null {
    return this.tagForm.get('value')?.value || null;
  }

  get showNfcActions(): boolean {
    if (!this.data.tag) return false;
    const type = this.tagForm.get('technologyType')?.value;
    return type === TechnologyType.NFC_HF || type === TechnologyType.RFID_UHF;
  }

  get previewUrl(): string {
    if (!this.data.tag) return '';
    
    const type = this.tagForm.get('technologyType')?.value;
    const value = this.tagForm.get('value')?.value;
    const ident = this.data.tag.handle || this.data.tag.uuid;

    // LINK: QR codifica URL direta (sem analytics)
    if (type === TechnologyType.LINK && value) {
      return value.startsWith('http') ? value : 'https://' + value;
    }

    // TRILHA/QR_CODE: QR codifica /t/{handle}?source=qr (analytics)
    if (type === TechnologyType.TRILHA || type === TechnologyType.QR_CODE) {
      return window.location.origin + '/t/' + ident + '?source=qr';
    }

    // NFC_HF: etiqueta grava /t/{handle}?source=nfc (analytics)
    if (type === TechnologyType.NFC_HF) {
      return window.location.origin + '/t/' + ident + '?source=nfc';
    }

    // RFID_UHF: etiqueta grava /t/{handle}?source=rfid (analytics)
    return window.location.origin + '/t/' + ident + '?source=rfid';
  }

  ngAfterViewInit() {
    if (this.showQrPreview && this.isQrCodeType) {
      this.generateQRCode();
    }
  }

  onTechChange() {
    if (this.showQrPreview && this.isQrCodeType) {
      setTimeout(() => this.generateQRCode(), 100);
    }
  }

  generateQRCode() {
    if (this.qrcodeCanvas && this.previewUrl) {
      QRCode.toCanvas(this.qrcodeCanvas.nativeElement, this.previewUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
      }, (error: Error | null | undefined) => {
          if (error) console.error('Erro ao gerar QR Code', error);
      });
    }
  }

  openLargeQR() {
    if (!this.qrcodeCanvas) return;
    const url = this.qrcodeCanvas.nativeElement.toDataURL('image/png');
    this.dialog.open(QrFullscreenDialogComponent, {
      data: {
        qrDataUrl: url,
        name: this.tagForm.get('name')?.value || 'Recurso'
      },
      autoFocus: false,
      panelClass: 'large-abac-modal'
    });
  }

  downloadQR() {
    if (!this.qrcodeCanvas) return;
    const canvas = this.qrcodeCanvas.nativeElement;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    
    const resourceName = (this.data.tag?.name || 'recurso').toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = 'qr-' + resourceName + '.png';
    link.href = url;
    link.click();
  }

  openNfcWriter(action: 'write' | 'read' | 'erase'): void {
    if (!this.data.tag?.uuid) return;
    const isNfc = this.tagForm.get('technologyType')?.value === TechnologyType.NFC_HF;
    const nfcUrl = `${window.location.origin}/t/${this.data.tag.uuid}?source=${isNfc ? 'nfc' : 'rfid'}`;
    this.dialog.open(NfcWriterDialogComponent, {
      data: { nfcUrl } as NfcWriterDialogData,
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.tagForm.valid) {
      const payload: any = { ...this.tagForm.value };
      const type = payload.technologyType;
      const value = payload.value;

      if (value) {
        if (type === TechnologyType.LINK) {
          // LINK: QR direto, sem redirect mode
        } else if (type === TechnologyType.TRILHA || type === TechnologyType.QR_CODE) {
          payload.qrRedirectMode = RedirectMode.CUSTOM_URL;
          payload.qrCustomUrl = value;
        } else if (type === TechnologyType.NFC_HF || type === TechnologyType.RFID_UHF) {
          payload.nfcRedirectMode = RedirectMode.CUSTOM_URL;
          payload.nfcCustomUrl = value;
        }
      }

      this.dialogRef.close(payload);
    }
  }
}
