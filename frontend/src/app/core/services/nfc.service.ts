import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface NfcReadResult {
  url: string;
  serialNumber: string;
}

export interface NfcSupportInfo {
  supported: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NfcService {
  getSupportInfo(): NfcSupportInfo {
    if ('NDEFReader' in window) {
      return { supported: true, message: '' };
    }

    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') || ua.includes('chromium');
    const isAndroid = ua.includes('android');
    const isDesktop = !(ua.includes('mobile') || ua.includes('tablet'));

    if (isChrome && isDesktop && !isAndroid) {
      return {
        supported: false,
        message:
          'O Web NFC é suportado apenas no <strong>Google Chrome para Android</strong>. Você está usando o Chrome no Desktop, que não possui suporte a NFC.',
      };
    }

    if (isChrome && isAndroid) {
      const match = ua.match(/chrome\/(\d+)/);
      const version = match ? parseInt(match[1], 10) : 0;
      if (version < 89) {
        return {
          supported: false,
          message:
            'Sua versão do Chrome para Android é muito antiga. Atualize para a versão <strong>89 ou superior</strong> para usar NFC.',
        };
      }
    }

    return {
      supported: false,
      message:
        'Seu navegador não suporta Web NFC. Utilize o <strong>Google Chrome para Android (versão 89+)</strong>.',
    };
  }

  isSupported(): boolean {
    return 'NDEFReader' in window;
  }

  write(url: string): Observable<void> {
    return new Observable<void>(observer => {
      if (!this.isSupported()) {
        observer.error(new Error('Web NFC não suportado.'));
        return;
      }

      try {
        const writer = new (window as any).NDEFReader();
        writer.write({ records: [{ recordType: 'url', data: url }] })
          .then(() => {
            observer.next();
            observer.complete();
          })
          .catch((err: Error) => {
            observer.error(err);
          });
      } catch (err) {
        observer.error(err);
      }
    });
  }

  read(): Observable<NfcReadResult> {
    return new Observable<NfcReadResult>(observer => {
      if (!this.isSupported()) {
        observer.error(new Error('Web NFC não suportado.'));
        return;
      }

      try {
        const reader = new (window as any).NDEFReader();
        reader.scan()
          .then(() => {
            reader.addEventListener('reading', ({ message, serialNumber }: any) => {
              let url = '';
              for (const record of message.records) {
                if (record.recordType === 'url') {
                  const decoder = new TextDecoder();
                  url = decoder.decode(record.data);
                  break;
                }
              }
              observer.next({ url, serialNumber });
              observer.complete();
            });
          })
          .catch((err: Error) => {
            observer.error(err);
          });
      } catch (err) {
        observer.error(err);
      }
    });
  }

  erase(): Observable<void> {
    return new Observable<void>(observer => {
      if (!this.isSupported()) {
        observer.error(new Error('Web NFC não suportado.'));
        return;
      }

      try {
        const writer = new (window as any).NDEFReader();
        writer.write({ records: [] })
          .then(() => {
            observer.next();
            observer.complete();
          })
          .catch((err: Error) => {
            observer.error(err);
          });
      } catch (err) {
        observer.error(err);
      }
    });
  }
}
