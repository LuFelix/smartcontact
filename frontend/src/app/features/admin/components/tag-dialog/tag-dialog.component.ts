import { Component, Inject, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Tag, TechnologyType, ApplicationType } from '../../../shared/models/users.models';
import * as QRCode from 'qrcode';

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
    MatIconModule
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
            <h3>QR Code do Recurso</h3>
            <mat-icon color="primary">qr_code_2</mat-icon>
          </div>
          
          <div class="qr-canvas-container">
            <canvas #qrcodeCanvas></canvas>
          </div>

          <div class="url-display">
            <span class="url-label">Link de Destino:</span>
            <div class="url-value">{{ previewUrl }}</div>
          </div>
          
          <button mat-stroked-button color="primary" class="download-btn" (click)="downloadQR()">
            <mat-icon>download</mat-icon> Baixar Imagem (PNG)
          </button>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="tagForm.invalid" (click)="onSave()">
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
      background: white;
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
    .download-btn {
      width: 100%;
      margin-top: 8px;
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
    return type === TechnologyType.QR_CODE || type === TechnologyType.LINK || type === TechnologyType.TRILHA;
  }

  get previewUrl(): string {
    if (!this.data.tag) return '';
    
    const type = this.tagForm.get('technologyType')?.value;
    const value = this.tagForm.get('value')?.value;

    if ((type === TechnologyType.LINK || type === TechnologyType.TRILHA) && value) {
      return value.startsWith('http') ? value : 'https://' + value;
    }

    return window.location.origin + '/t/' + this.data.tag.uuid;
  }

  ngAfterViewInit() {
    if (this.showQrPreview) {
      this.generateQRCode();
    }
  }

  onTechChange() {
    if (this.showQrPreview) {
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

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.tagForm.valid) {
      this.dialogRef.close(this.tagForm.value);
    }
  }
}
