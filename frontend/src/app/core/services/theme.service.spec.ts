import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  it('should be created', () => {
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const service = TestBed.inject(ThemeService);
    expect(service).toBeTruthy();
  });

  describe('theme initialization', () => {
    it('should initialize dark theme from localStorage if saved preference exists', () => {
      localStorage.setItem('darkMode', 'true');
      
      TestBed.configureTestingModule({ providers: [ThemeService] });
      const service = TestBed.inject(ThemeService);

      expect(service.darkMode()).toBe(true);
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });

    it('should initialize light theme from localStorage if saved preference exists', () => {
      localStorage.setItem('darkMode', 'false');
      
      TestBed.configureTestingModule({ providers: [ThemeService] });
      const service = TestBed.inject(ThemeService);

      expect(service.darkMode()).toBe(false);
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
    });

    it('should fall back to system prefers-color-scheme if no saved preference exists', () => {
      // Mock system prefers dark
      const spy = vi.spyOn(window, 'matchMedia').mockReturnValueOnce({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as any);

      TestBed.configureTestingModule({ providers: [ThemeService] });
      const service = TestBed.inject(ThemeService);

      expect(service.darkMode()).toBe(true);
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
      expect(spy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('toggleTheme', () => {
    it('should alternate dark and light modes and update localStorage', () => {
      TestBed.configureTestingModule({ providers: [ThemeService] });
      const service = TestBed.inject(ThemeService);

      // Default light (matches: false from test-setup)
      expect(service.darkMode()).toBe(false);

      // Toggle to dark
      service.toggleTheme();
      expect(service.darkMode()).toBe(true);
      expect(localStorage.getItem('darkMode')).toBe('true');
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);

      // Toggle to light
      service.toggleTheme();
      expect(service.darkMode()).toBe(false);
      expect(localStorage.getItem('darkMode')).toBe('false');
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
    });
  });
});
