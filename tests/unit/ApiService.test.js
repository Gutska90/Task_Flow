/**
 * Unit Tests para ApiService
 * Pruebas de funcionalidad del servicio de APIs optimizado
 */

// Mock del entorno global
global.window = {
  config: {
    get: (path, defaultValue) => {
      const config = {
        'api.baseUrl': './data/',
        'api.timeout': 30000,
        'api.retryAttempts': 3,
        'api.retryDelay': 1000,
        'api.cacheTimeout': 300000
      };
      return config[path] || defaultValue;
    }
  }
};

// Mock de fetch
global.fetch = jest.fn();

// Mock de console
global.console = {
  error: jest.fn(),
  log: jest.fn()
};

// Importar la clase ApiService
const ApiService = require('../../js/apiService.js');

describe('ApiService', () => {
  let apiService;

  beforeEach(() => {
    apiService = new ApiService();
    fetch.mockClear();
    console.error.mockClear();
  });

  describe('Constructor', () => {
    test('debe inicializar con configuración correcta', () => {
      expect(apiService.config).toBeDefined();
      expect(apiService.config.baseUrl).toBe('./data/');
      expect(apiService.config.cacheTimeout).toBe(300000);
      expect(apiService.config.retryAttempts).toBe(3);
      expect(apiService.cache).toBeInstanceOf(Map);
      expect(apiService.requestQueue).toBeInstanceOf(Map);
    });
  });

  describe('fetchData', () => {
    test('debe hacer una petición HTTP exitosa', async () => {
      const mockResponse = { success: true, data: { test: 'data' } };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse.data)
      });

      const result = await apiService.fetchData('test-url');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith('test-url', {
        headers: { 'Content-Type': 'application/json' }
      });
    });


    test('debe evitar requests duplicados', async () => {
      const mockResponse = { success: true, data: { test: 'data' } };
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse.data)
      });

      const promise1 = apiService.fetchData('test-url');
      const promise2 = apiService.fetchData('test-url');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(result2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gestión de Caché', () => {
    test('debe almacenar datos en caché', () => {
      const testData = { test: 'data' };
      apiService.setCachedData('test-key', testData);

      const cached = apiService.getCachedData('test-key');
      expect(cached).toEqual(testData);
    });

    test('debe retornar null para datos expirados', () => {
      const testData = { test: 'data' };
      apiService.setCachedData('test-key', testData);

      // Simular expiración
      const cacheEntry = apiService.cache.get('test-key');
      cacheEntry.timestamp = Date.now() - (apiService.config.cacheTimeout + 1000);

      const cached = apiService.getCachedData('test-key');
      expect(cached).toBeNull();
    });

    test('debe limpiar caché específico', () => {
      apiService.setCachedData('test-key', { data: 'test' });
      apiService.clearCacheKey('test-key');

      const cached = apiService.getCachedData('test-key');
      expect(cached).toBeNull();
    });

    test('debe limpiar todo el caché', () => {
      apiService.setCachedData('key1', { data: 'test1' });
      apiService.setCachedData('key2', { data: 'test2' });
      apiService.clearCache();

      expect(apiService.cache.size).toBe(0);
    });

    test('debe obtener estadísticas del caché', () => {
      apiService.setCachedData('key1', { data: 'test1' });
      apiService.setCachedData('key2', { data: 'test2' });

      const stats = apiService.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });
  });

  describe('Utilidades', () => {
    test('debe verificar conectividad', async () => {
      fetch.mockResolvedValueOnce({ ok: true });
      
      const result = await apiService.checkConnectivity();
      expect(result).toBe(true);
    });

    test('debe obtener información del servicio', () => {
      const info = apiService.getServiceInfo();
      
      expect(info.version).toBe('2.0.0');
      expect(info.config).toBeDefined();
      expect(info.timestamp).toBeDefined();
    });
  });
}); 