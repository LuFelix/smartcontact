import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Tag, TechnologyType, ApplicationType } from '../../../shared/models/users.models';

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
            <mat-select formControlName="technologyType">
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="tagForm.invalid" (click)="onSave()">
        {{ data.tag ? 'Atualizar Recurso' : 'Salvar Recurso' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .tag-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px 0;
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
  `]
})
export class TagDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TagDialogComponent>);
  
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

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.tagForm.valid) {
      this.dialogRef.close(this.tagForm.value);
    }
  }
}
