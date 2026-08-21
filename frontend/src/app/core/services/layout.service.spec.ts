import { TestBed } from '@angular/core/testing';
import { LayoutService, CertificationLayout } from './layout.service';

describe('LayoutService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    TestBed.configureTestingModule({ providers: [LayoutService] });
    const service = TestBed.inject(LayoutService);
    expect(service).toBeTruthy();
  });

  describe('layout initialization', () => {
    it('should initialize with "moderno" if no preference is saved in localStorage', () => {
      TestBed.configureTestingModule({ providers: [LayoutService] });
      const service = TestBed.inject(LayoutService);

      expect(service.layout()).toBe('moderno');
    });

    it('should initialize with layout from localStorage if preference exists', () => {
      localStorage.setItem('app_cert_layout', 'classico');

      TestBed.configureTestingModule({ providers: [LayoutService] });
      const service = TestBed.inject(LayoutService);

      expect(service.layout()).toBe('classico');
    });
  });

  describe('setLayout', () => {
    it('should update layout signal and localStorage value', () => {
      TestBed.configureTestingModule({ providers: [LayoutService] });
      const service = TestBed.inject(LayoutService);

      service.setLayout('classico');
      expect(service.layout()).toBe('classico');
      expect(localStorage.getItem('app_cert_layout')).toBe('classico');
    });
  });

  describe('toggleLayout', () => {
    it('should alternate layout value', () => {
      TestBed.configureTestingModule({ providers: [LayoutService] });
      const service = TestBed.inject(LayoutService);

      expect(service.layout()).toBe('moderno');

      // Toggle to classico
      service.toggleLayout();
      expect(service.layout()).toBe('classico');
      expect(localStorage.getItem('app_cert_layout')).toBe('classico');

      // Toggle to moderno
      service.toggleLayout();
      expect(service.layout()).toBe('moderno');
      expect(localStorage.getItem('app_cert_layout')).toBe('moderno');
    });
  });
});
