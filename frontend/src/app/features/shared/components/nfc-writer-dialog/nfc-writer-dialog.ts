import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NfcService, NfcReadResult, NfcSupportInfo } from '../../../../core/services/nfc.service';

export interface NfcWriterDialogData {
  nfcUrl: string;
}

type NfcAction = 'idle' | 'waiting_tag' | 'success' | 'error';

@Component({
  selector: 'app-nfc-writer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './nfc-writer-dialog.html',
  styleUrls: ['./nfc-writer-dialog.scss'],
})
export class NfcWriterDialogComponent {
  private dialogRef = inject(MatDialogRef<NfcWriterDialogComponent>);
  private nfcService = inject(NfcService);
  private snackBar = inject(MatSnackBar);

  supportInfo: NfcSupportInfo = this.nfcService.getSupportInfo();
  actionState: NfcAction = 'idle';
  actionLabel = '';
  readResult: NfcReadResult | null = null;
  errorMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: NfcWriterDialogData
  ) {}

  read(): void {
    this.startAction('Lendo chip NFC...');
    this.nfcService.read().subscribe({
      next: (result) => {
        this.readResult = result;
        this.actionState = 'success';
        this.actionLabel = 'Chip lido com sucesso!';
      },
      error: (err) => this.handleError(err),
    });
  }

  write(): void {
    this.startAction('Aproxime o chip NFC para gravar...');
    this.nfcService.write(this.data.nfcUrl).subscribe({
      next: () => {
        this.actionState = 'success';
        this.actionLabel = 'Link gravado no chip com sucesso!';
      },
      error: (err) => this.handleError(err),
    });
  }

  erase(): void {
    const confirmed = confirm(
      'Tem certeza que deseja apagar todos os dados deste chip NFC? Esta ação não pode ser desfeita.'
    );
    if (!confirmed) return;

    this.startAction('Aproxime o chip NFC para apagar...');
    this.nfcService.erase().subscribe({
      next: () => {
        this.actionState = 'success';
        this.actionLabel = 'Chip apagado com sucesso!';
      },
      error: (err) => this.handleError(err),
    });
  }

  private startAction(label: string): void {
    this.actionState = 'waiting_tag';
    this.actionLabel = label;
    this.readResult = null;
    this.errorMessage = '';
  }

  private handleError(err: Error): void {
    this.actionState = 'error';
    this.errorMessage = err.message || 'Erro ao comunicar com o chip NFC.';
    this.actionLabel = '';
  }

  close(): void {
    this.dialogRef.close(this.actionState === 'success');
  }
}
