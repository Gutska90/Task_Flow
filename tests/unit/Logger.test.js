/**
 * Unit Tests para Logger
 * Pruebas del sistema de logging centralizado
 */

// Mock del entorno global
global.window = {
  config: {
    get: (path, defaultValue) => {
      const config = {
        'app.logLevel': 'debug',
        'app.debug': true
      };
      return config[path] || defaultValue;
    },
    isDevelopment: () => true,
    isProduction: () => false
  }
};

// Mock de console
global.console = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  groupCollapsed: jest.fn(),
  groupEnd: jest.fn()
};

// Mock de navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
};

// Mock de location
global.location = {
  href: 'http://localhost:3000/test'
};

// Importar la clase Logger
const Logger = require('../../js/logger.js');

describe('Logger', () => {
  let logger;
  let originalWindow;
  let originalConsole;

  beforeEach(() => {
    // Guardar referencias originales
    originalWindow = global.window;
    originalConsole = global.console;
    
    // Configurar window completo para los tests
    global.window = {
      location: {
        hostname: 'localhost',
        href: 'http://localhost:3000/test'
      },
      config: {
        get: (path, defaultValue) => {
          const config = {
            'app.logLevel': 'debug',
            'app.debug': true
          };
          return config[path] || defaultValue;
        },
        isDevelopment: () => true,
        isProduction: () => false
      }
    };

    // Configurar navigator
    global.navigator = {
      userAgent: 'Mozilla/5.0 (Test Browser)'
    };

    // Configurar location
    global.location = {
      href: 'http://localhost:3000/test'
    };

    logger = new Logger();
    // Limpiar mocks
    Object.values(console).forEach(mock => mock.mockClear());
  });

  afterEach(() => {
    // Restaurar referencias originales
    global.window = originalWindow;
    global.console = originalConsole;
  });

  describe('Constructor', () => {
    test('debe inicializar con configuración correcta', () => {
      expect(logger.config).toBeDefined();
      expect(logger.logLevels).toBeDefined();
      expect(logger.currentLevel).toBe(3); // debug level
      expect(logger.logHistory).toBeInstanceOf(Array);
      expect(logger.maxHistorySize).toBe(1000);
    });

    test('debe configurar niveles de log', () => {
      expect(logger.logLevels.error).toBe(0);
      expect(logger.logLevels.warn).toBe(1);
      expect(logger.logLevels.info).toBe(2);
      expect(logger.logLevels.debug).toBe(3);
    });
  });

  describe('Métodos de Logging', () => {
    test('debe registrar error', () => {
      logger.error('Test error', new Error('Test error details'));
      
      expect(console.error).toHaveBeenCalled();
      expect(logger.logHistory).toHaveLength(1);
      expect(logger.logHistory[0].level).toBe('error');
      expect(logger.logHistory[0].message).toBe('Test error');
    });

    test('debe registrar warning', () => {
      logger.warn('Test warning', { data: 'test' });
      
      expect(console.warn).toHaveBeenCalled();
      expect(logger.logHistory).toHaveLength(1);
      expect(logger.logHistory[0].level).toBe('warn');
      expect(logger.logHistory[0].message).toBe('Test warning');
    });

    test('debe registrar info', () => {
      logger.info('Test info', { data: 'test' });
      
      expect(console.info).toHaveBeenCalled();
      expect(logger.logHistory).toHaveLength(1);
      expect(logger.logHistory[0].level).toBe('info');
      expect(logger.logHistory[0].message).toBe('Test info');
    });

    test('debe registrar debug', () => {
      logger.debug('Test debug', { data: 'test' });
      
      expect(console.debug).toHaveBeenCalled();
      expect(logger.logHistory).toHaveLength(1);
      expect(logger.logHistory[0].level).toBe('debug');
      expect(logger.logHistory[0].message).toBe('Test debug');
    });
  });

  describe('Filtrado por Nivel', () => {
    test('no debe registrar debug si el nivel es info', () => {
      logger.setLevel('info');
      logger.debug('Test debug');
      
      expect(console.debug).not.toHaveBeenCalled();
      // El logger puede registrar el cambio de nivel, así que verificamos que no haya logs de debug
      const debugLogs = logger.logHistory.filter(log => log.level === 'debug');
      expect(debugLogs).toHaveLength(0);
    });

    test('debe registrar error incluso si el nivel es debug', () => {
      logger.setLevel('debug');
      logger.error('Test error');
      
      expect(console.error).toHaveBeenCalled();
      const errorLogs = logger.logHistory.filter(log => log.level === 'error');
      expect(errorLogs).toHaveLength(1);
    });
  });

  describe('Creación de Entradas de Log', () => {
    test('debe crear entrada de log con datos correctos', () => {
      const error = new Error('Test error');
      logger.error('Test message', error, 'TestContext');
      
      const entry = logger.logHistory[0];
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('error');
      expect(entry.message).toBe('Test message');
      expect(entry.context).toBe('TestContext');
      expect(entry.userAgent).toBe('Mozilla/5.0 (Test Browser)');
      expect(entry.url).toBe('http://localhost:3000/test');
      expect(entry.sessionId).toBeDefined();
    });

    test('debe sanitizar mensajes para prevenir XSS', () => {
      logger.error('<script>alert("xss")</script>');
      
      const entry = logger.logHistory[0];
      // Verificar que el script tag esté sanitizado, sin importar el formato exacto de las comillas
      expect(entry.message).toContain('&lt;script&gt;');
      expect(entry.message).toContain('&lt;/script&gt;');
      expect(entry.message).not.toContain('<script>');
    });

    test('debe sanitizar datos de Error', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Test', error);
      
      const entry = logger.logHistory[0];
      expect(entry.data.name).toBe('Error');
      expect(entry.data.message).toBe('Test error');
      expect(entry.data.stack).toBe('Error stack trace');
    });

    test('debe sanitizar objetos de datos', () => {
      const data = { test: 'value', nested: { key: 'value' } };
      logger.info('Test', data);
      
      const entry = logger.logHistory[0];
      expect(entry.data).toEqual(data);
    });
  });

  describe('Gestión del Historial', () => {
    test('debe mantener límite de historial', () => {
      // Llenar el historial
      for (let i = 0; i < logger.maxHistorySize + 10; i++) {
        logger.info(`Test ${i}`);
      }
      
      expect(logger.logHistory.length).toBe(logger.maxHistorySize);
      expect(logger.logHistory[0].message).toBe('Test 10'); // Los primeros se eliminaron
    });

    test('debe obtener historial filtrado por nivel', () => {
      logger.error('Error 1');
      logger.warn('Warning 1');
      logger.info('Info 1');
      logger.error('Error 2');
      
      const errorHistory = logger.getHistory('error');
      expect(errorHistory).toHaveLength(2);
      expect(errorHistory[0].message).toBe('Error 1');
      expect(errorHistory[1].message).toBe('Error 2');
    });

    test('debe obtener historial con límite', () => {
      logger.info('Info 1');
      logger.info('Info 2');
      logger.info('Info 3');
      
      const limitedHistory = logger.getHistory(null, 2);
      expect(limitedHistory).toHaveLength(2);
      expect(limitedHistory[0].message).toBe('Info 2');
      expect(limitedHistory[1].message).toBe('Info 3');
    });

    test('debe limpiar historial', () => {
      logger.info('Test 1');
      logger.info('Test 2');
      
      expect(logger.logHistory.length).toBe(2);
      
      logger.clearHistory();
      expect(logger.logHistory.length).toBe(0);
    });
  });

  describe('Exportación de Logs', () => {
    test('debe exportar en formato JSON', () => {
      logger.info('Test 1');
      logger.error('Test 2');
      
      const exported = logger.export('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Test 1');
      expect(parsed[1].message).toBe('Test 2');
    });

    test('debe exportar en formato texto', () => {
      logger.info('Test message');
      
      const exported = logger.export('text');
      expect(exported).toContain('Test message');
      expect(exported).toContain('[INFO]');
    });

    test('debe manejar formato inválido', () => {
      logger.info('Test');
      
      const exported = logger.export('invalid');
      expect(exported).toBe('');
    });
  });

  describe('Estadísticas de Logs', () => {
    test('debe calcular estadísticas correctamente', () => {
      logger.error('Error 1');
      logger.warn('Warning 1');
      logger.info('Info 1');
      logger.error('Error 2');
      
      const stats = logger.getStats();
      
      expect(stats.total).toBe(4);
      expect(stats.byLevel.error).toBe(2);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.info).toBe(1);
    });

    test('debe contar errores y advertencias recientes', () => {
      logger.error('Recent error');
      logger.warn('Recent warning');
      
      const stats = logger.getStats();
      expect(stats.recentErrors).toBe(1);
      expect(stats.recentWarnings).toBe(1);
    });
  });

  describe('Loggers de Contexto', () => {
    test('debe crear logger de contexto', () => {
      const contextLogger = logger.createContextLogger('TestContext');
      
      expect(contextLogger.error).toBeDefined();
      expect(contextLogger.warn).toBeDefined();
      expect(contextLogger.info).toBeDefined();
      expect(contextLogger.debug).toBeDefined();
    });

    test('debe usar contexto en logs', () => {
      const contextLogger = logger.createContextLogger('TestContext');
      contextLogger.error('Test error');
      
      const entry = logger.logHistory[0];
      expect(entry.context).toBe('TestContext');
      expect(entry.message).toBe('Test error');
    });
  });

  describe('Gestión de Niveles', () => {
    test('debe cambiar nivel de logging', () => {
      logger.setLevel('warn');
      expect(logger.currentLevel).toBe(1);
      
      logger.info('This should not be logged');
      const infoLogs = logger.logHistory.filter(log => log.level === 'info');
      expect(infoLogs).toHaveLength(0);
      
      logger.warn('This should be logged');
      const warnLogs = logger.logHistory.filter(log => log.level === 'warn');
      expect(warnLogs).toHaveLength(1);
    });

    test('debe manejar nivel inválido', () => {
      logger.setLevel('invalid');
      // Verificar que se llamó a console.warn con el mensaje de error
      const warnCalls = console.warn.mock.calls;
      const hasInvalidLevelMessage = warnCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('Nivel de logging inválido'))
      );
      expect(hasInvalidLevelMessage).toBe(true);
    });
  });

  describe('Servicios Externos', () => {
    test('debe enviar errores a servicios externos en producción', () => {
      // Simular entorno de producción
      global.window.config.isProduction = () => true;
      global.window.config.get = (path) => {
        if (path === 'app.errorTracking.enabled') return true;
        return 'debug';
      };
      
      const prodLogger = new Logger();
      prodLogger.error('Production error');
      
      // Verificar que se intentó enviar el error
      const logCalls = console.log.mock.calls;
      const hasTrackingMessage = logCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes('Error enviado a servicio de tracking'))
      );
      expect(hasTrackingMessage).toBe(true);
    });

    test('no debe enviar errores en desarrollo', () => {
      logger.error('Development error');
      
      // No debería haber llamado a servicios externos
      const trackingCalls = console.log.mock.calls.filter(call => 
        call[0] && call[0].includes('Error enviado a servicio de tracking')
      );
      expect(trackingCalls).toHaveLength(0);
    });
  });

  describe('Fallback de Consola', () => {
    test('debe crear consola de respaldo si no está disponible', () => {
      // Simular entorno sin console
      const originalConsole = global.console;
      global.console = undefined;
      
      try {
        const fallbackLogger = new Logger();
        
        // Debería crear una consola de respaldo en window.console
        expect(global.window.console).toBeDefined();
        expect(typeof global.window.console.log).toBe('function');
        expect(typeof global.window.console.error).toBe('function');
        expect(typeof global.window.console.warn).toBe('function');
        expect(typeof global.window.console.info).toBe('function');
        expect(typeof global.window.console.debug).toBe('function');
        
        // Verificar que el logger funciona
        expect(fallbackLogger.error).toBeDefined();
        expect(fallbackLogger.warn).toBeDefined();
        expect(fallbackLogger.info).toBeDefined();
        expect(fallbackLogger.debug).toBeDefined();
        
        // Verificar que los métodos de consola son funciones vacías
        expect(typeof global.window.console.log()).toBe('undefined');
        expect(typeof global.window.console.error()).toBe('undefined');
      } finally {
        // Restaurar console original
        global.console = originalConsole;
      }
    });
  });
}); 