/**
 * Unit Tests para Config
 * Pruebas del sistema de configuración centralizada
 */

// Mock del entorno global
global.window = {
  location: {
    hostname: 'localhost'
  }
};

// Importar la clase Config
const Config = require('../../js/config.js');

describe('Config', () => {
  let config;
  let originalHostname;

  beforeEach(() => {
    // Guardar el hostname original y forzar desarrollo
    originalHostname = global.window.location.hostname;
    global.window.location.hostname = 'localhost';
    config = new Config();
  });

  afterEach(() => {
    // Restaurar el hostname original
    global.window.location.hostname = originalHostname;
  });

  describe('Constructor', () => {
    test('debe detectar entorno de desarrollo', () => {
      expect(config.environment).toBe('development');
    });

    test('debe cargar configuración base', () => {
      expect(config.config).toBeDefined();
      expect(config.config.app).toBeDefined();
      expect(config.config.api).toBeDefined();
      expect(config.config.cache).toBeDefined();
    });

    test('debe tener configuración de aplicación', () => {
      expect(config.config.app.name).toBe('TaskFlow');
      expect(config.config.app.version).toBe('2.0.0');
      expect(typeof config.config.app.debug).toBe('boolean');
      expect(config.config.app.logLevel).toBe('debug'); // En desarrollo
    });
  });

  describe('Detección de Entorno', () => {
    test('debe detectar desarrollo en localhost', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.environment).toBe('development');
    });

    test('debe detectar desarrollo en 127.0.0.1', () => {
      global.window.location.hostname = '127.0.0.1';
      const devConfig = new Config();
      expect(devConfig.environment).toBe('development');
    });

    test('debe detectar staging', () => {
      global.window.location.hostname = 'test.example.com';
      const stagingConfig = new Config();
      expect(stagingConfig.environment).toBe('staging');
    });

    test('debe detectar producción', () => {
      global.window.location.hostname = 'example.com';
      const prodConfig = new Config();
      expect(prodConfig.environment).toBe('production');
    });
  });

  describe('Métodos de Configuración', () => {
    test('debe obtener configuración por path', () => {
      const value = config.get('app.name');
      expect(value).toBe('TaskFlow');
    });

    test('debe retornar valor por defecto si no existe', () => {
      const value = config.get('nonexistent.path', 'default');
      expect(value).toBe('default');
    });

    test('debe establecer configuración', () => {
      config.set('test.value', 'test-data');
      const value = config.get('test.value');
      expect(value).toBe('test-data');
    });

    test('debe obtener toda la configuración', () => {
      const allConfig = config.getAll();
      expect(allConfig).toBeDefined();
      expect(allConfig.app).toBeDefined();
      expect(allConfig.api).toBeDefined();
    });
  });

  describe('Métodos de Entorno', () => {
    test('debe verificar si es desarrollo', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.isDevelopment()).toBe(true);
    });

    test('debe verificar si es producción', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.isProduction()).toBe(false);
    });

    test('debe obtener el entorno actual', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.getEnvironment()).toBe('development');
    });
  });

  describe('Configuraciones Específicas por Entorno', () => {
    test('debe tener debug habilitado en desarrollo', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.isDebugEnabled()).toBe(true);
    });

    test('debe tener nivel de log correcto', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.getLogLevel()).toBe('debug');
    });

    test('debe tener timeouts apropiados para desarrollo', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      const timeout = devConfig.get('api.timeout');
      expect(timeout).toBe(10000); // 10 segundos en desarrollo
    });
  });

  describe('Validación de Configuración', () => {
    test('debe validar configuración correcta', () => {
      const validation = config.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('debe detectar configuraciones faltantes', () => {
      // Simular configuración inválida
      config.config.api.baseUrl = '';
      config.config.api.timeout = 0;

      const validation = config.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('debe generar advertencias para configuraciones subóptimas', () => {
      // Simular configuración subóptima
      config.config.cache.defaultTTL = 0;

      const validation = config.validate();
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Gestión de Configuración', () => {
    test('debe actualizar configuración', () => {
      const newConfig = {
        app: {
          name: 'NewApp'
        }
      };

      config.update(newConfig);
      expect(config.get('app.name')).toBe('NewApp');
    });

    test('debe resetear configuración', () => {
      config.set('test.value', 'test-data');
      config.reset();
      
      const value = config.get('test.value');
      expect(value).toBeNull();
    });

    test('debe exportar configuración', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      const exported = devConfig.export();
      expect(exported.environment).toBe('development');
      expect(exported.config).toBeDefined();
      expect(exported.timestamp).toBeDefined();
    });
  });

  describe('Configuraciones Específicas', () => {
    test('debe tener configuración de API', () => {
      expect(config.get('api.baseUrl')).toBe('./data/');
      expect(config.get('api.retryAttempts')).toBe(3);
      expect(config.get('api.cacheTimeout')).toBe(300000);
    });

    test('debe tener configuración de caché', () => {
      expect(config.get('cache.enabled')).toBe(true);
      expect(config.get('cache.defaultTTL')).toBe(300000);
      expect(config.get('cache.maxSize')).toBe(100);
    });

    test('debe tener configuración de widgets', () => {
      expect(config.get('widgets.weather.enabled')).toBe(true);
      expect(config.get('widgets.weather.refreshInterval')).toBe(600000);
      expect(config.get('widgets.news.enabled')).toBe(true);
    });

    test('debe tener configuración de notificaciones', () => {
      expect(config.get('notifications.enabled')).toBe(true);
      expect(config.get('notifications.position')).toBe('top-right');
      expect(config.get('notifications.duration')).toBe(5000);
    });

    test('debe tener configuración de UI', () => {
      expect(config.get('ui.theme')).toBe('light');
      expect(config.get('ui.language')).toBe('es');
      expect(config.get('ui.animations')).toBe(true);
    });

    test('debe tener configuración de seguridad', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.get('security.xssProtection')).toBe(true);
      expect(devConfig.get('security.csrfProtection')).toBe(false);
      expect(devConfig.get('security.contentSecurityPolicy')).toBe(true);
    });

    test('debe tener configuración de rendimiento', () => {
      global.window.location.hostname = 'localhost';
      const devConfig = new Config();
      expect(devConfig.get('performance.lazyLoading')).toBe(true);
      expect(devConfig.get('performance.imageOptimization')).toBe(true);
      expect(devConfig.get('performance.minifyAssets')).toBe(false);
    });
  });

  describe('Merge Profundo', () => {
    test('debe combinar configuraciones correctamente', () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: { d: 3 }, e: 4 };
      
      const result = config._deepMerge(target, source);
      
      expect(result.a).toBe(1);
      expect(result.b.c).toBe(2);
      expect(result.b.d).toBe(3);
      expect(result.e).toBe(4);
    });

    test('debe manejar objetos anidados', () => {
      const target = { level1: { level2: { value: 'original' } } };
      const source = { level1: { level2: { newValue: 'updated' } } };
      
      const result = config._deepMerge(target, source);
      
      expect(result.level1.level2.value).toBe('original');
      expect(result.level1.level2.newValue).toBe('updated');
    });
  });
}); 