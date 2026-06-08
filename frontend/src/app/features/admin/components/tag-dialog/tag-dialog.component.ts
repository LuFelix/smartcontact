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
    <h2 mat-dialog-title>{{ data.tag ? 'Editar Tag' : 'Cadastrar Nova Tag' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="tagForm" class="tag-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>UID Físico (NFC/RFID)</mat-label>
            <input matInput formControlName="uid" placeholder="Ex: 04:A1:B2:C3:D4:E5:F6">
            <mat-error *ngIf="tagForm.get('uid')?.hasError('required')">UID é obrigatório</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nome da Tag</mat-label>
            <input matInput formControlName="name" placeholder="Ex: Tag Portaria Norte">
            <mat-error *ngIf="tagForm.get('name')?.hasError('required')">Nome é obrigatório</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row split">
          <mat-form-field appearance="outline">
            <mat-label>Tecnologia</mat-label>
            <mat-select formControlName="technologyType">
              <mat-option [value]="techTypes.QR_CODE">QR Code / Link Virtual</mat-option>
              <mat-option [value]="techTypes.NFC_HF">NFC HF (13.56 MHz)</mat-option>
              <mat-option [value]="techTypes.RFID_UHF">RFID UHF (Long Alcance)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Aplicação</mat-label>
            <mat-select formControlName="applicationType">
              <mat-option [value]="appTypes.REDIRECT">Redirecionamento (NFC)</mat-option>
              <mat-option [value]="appTypes.ASSET_COUNTING">Contagem de Ativos</mat-option>
              <mat-option [value]="appTypes.ACCESS_CONTROL">Controle de Acesso</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor / Destino</mat-label>
            <input matInput formControlName="value" placeholder="URL ou Identificador customizado">
            <mat-hint>Ex: https://meulink.com ou ID de Agrupamento MAS</mat-hint>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="tagForm.invalid" (click)="onSave()">
        {{ data.tag ? 'Atualizar' : 'Salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .tag-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 16px;
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
      uid: [data.tag?.uid || '', [Validators.required]],
      name: [data.tag?.name || '', [Validators.required]],
      technologyType: [data.tag?.technologyType || TechnologyType.NFC_HF, [Validators.required]],
      applicationType: [data.tag?.applicationType || ApplicationType.REDIRECT, [Validators.required]],
      value: [data.tag?.value || ''],
    });
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
