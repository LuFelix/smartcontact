import { TestBed } from '@angular/core/testing';
import { CepService, ViaCepResponse } from './cep.service';
import { firstValueFrom } from 'rxjs';

describe('CepService', () => {
  let service: CepService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CepService]
    });
    service = TestBed.inject(CepService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchAddressFromCep', () => {
    it('should return null for invalid CEP length', async () => {
      const result = await firstValueFrom(service.fetchAddressFromCep('123'));
      expect(result).toBeNull();
    });

    it('should return address data on successful fetch', async () => {
      const mockResponse: ViaCepResponse = {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        complemento: 'lado ímpar',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP'
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any);

      const result = await firstValueFrom(service.fetchAddressFromCep('01001-000'));

      expect(fetchSpy).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/');
      expect(result).toEqual(mockResponse);
    });

    it('should return null if ViaCEP returns error flag', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ erro: true })
      } as any);

      const result = await firstValueFrom(service.fetchAddressFromCep('99999-999'));

      expect(fetchSpy).toHaveBeenCalledWith('https://viacep.com.br/ws/99999999/json/');
      expect(result).toBeNull();
    });

    it('should return null if fetch response is not ok', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404
      } as any);

      const result = await firstValueFrom(service.fetchAddressFromCep('01001-000'));

      expect(result).toBeNull();
    });

    it('should return null if fetch throws network error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await firstValueFrom(service.fetchAddressFromCep('01001-000'));

      expect(result).toBeNull();
    });
  });
});
