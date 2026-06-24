import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface NfcReadResult {
  url: string;
  serialNumber: string;
}

@Injectable({
  providedIn: 'root',
})
export class NfcService {
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
