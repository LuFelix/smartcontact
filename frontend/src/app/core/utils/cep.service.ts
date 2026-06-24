import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CepService {
  private viaCepUrl = 'https://viacep.com.br/ws';

  fetchAddressFromCep(cep: string): Observable<ViaCepResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      console.warn('[CepService] CEP inválido (formato):', cep);
      return of(null);
    }

    const url = `${this.viaCepUrl}/${cleanCep}/json/`;

    return new Observable<ViaCepResponse | null>(observer => {
      fetch(url)
        .then(response => {
          if (!response.ok) {
            console.warn('[CepService] ViaCEP retornou status:', response.status);
            observer.next(null);
            observer.complete();
            return;
          }
          return response.json();
        })
        .then(data => {
          if (data && data.erro) {
            console.warn('[CepService] CEP não encontrado:', cep);
            observer.next(null);
          } else {
            observer.next(data);
          }
          observer.complete();
        })
        .catch(error => {
          console.error('[CepService] Erro na requisição ViaCEP:', error);
          observer.next(null);
          observer.complete();
        });
    });
  }
}