/**
 * Config - Configuración centralizada de la aplicación
 * Responsabilidades: Gestión de configuraciones globales y por entorno
 */
class Config {
  constructor() {
    this.environment = this._detectEnvironment();
    this.config = this._loadConfiguration();
  }

  /**
   * Detecta el entorno de ejecución
   * @private
   * @returns {string} Entorno detectado
   */
  _detectEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('test') || hostname.includes('staging')) {
      return 'staging';
    }
    
    return 'production';
  }

  /**
   * Carga la configuración según el entorno
   * @private
   * @returns {Object} Configuración cargada
   */
  _loadConfiguration() {
    const baseConfig = {
      // Configuración de la aplicación
      app: {
        name: 'TaskFlow',
        version: '2.0.0',
        debug: false,
        logLevel: 'info'
      },

      // Configuración de APIs
      api: {
        baseUrl: './data/',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        cacheTimeout: 5 * 60 * 1000 // 5 minutos
      },

      // Configuración de caché
      cache: {
        enabled: true,
        defaultTTL: 5 * 60 * 1000, // 5 minutos
        maxSize: 100,
        cleanupInterval: 10 * 60 * 1000 // 10 minutos
      },

      // Configuración de widgets externos
      widgets: {
        weather: {
          enabled: true,
          refreshInterval: 10 * 60 * 1000, // 10 minutos
          retryDelay: 30 * 1000, // 30 segundos
          maxRetries: 3
        },
        news: {
          enabled: true,
          refreshInterval: 15 * 60 * 1000, // 15 minutos
          retryDelay: 30 * 1000, // 30 segundos
          maxRetries: 3,
          maxArticles: 3
        }
      },

      // Configuración de notificaciones
      notifications: {
        enabled: true,
        position: 'top-right',
        duration: 5000,
        maxVisible: 5
      },

      // Configuración de UI
      ui: {
        theme: 'light',
        language: 'es',
        animations: true,
        autoSave: true,
        autoSaveInterval: 30 * 1000 // 30 segundos
      },

      // Configuración de seguridad
      security: {
        xssProtection: true,
        csrfProtection: false,
        contentSecurityPolicy: true
      },

      // Configuración de rendimiento
      performance: {
        lazyLoading: true,
        imageOptimization: true,
        minifyAssets: false,
        enableServiceWorker: false
      }
    };

    // Configuraciones específicas por entorno
    const environmentConfigs = {
      development: {
        app: {
          debug: true,
          logLevel: 'debug'
        },
        api: {
          timeout: 10000
        },
        performance: {
          minifyAssets: false,
          enableServiceWorker: false
        }
      },
      
      staging: {
        app: {
          debug: true,
          logLevel: 'warn'
        },
        api: {
          timeout: 20000
        },
        performance: {
          minifyAssets: true,
          enableServiceWorker: true
        }
      },
      
      production: {
        app: {
          debug: false,
          logLevel: 'error'
        },
        api: {
          timeout: 30000
        },
        performance: {
          minifyAssets: true,
          enableServiceWorker: true
        },
        security: {
          xssProtection: true,
          csrfProtection: true,
          contentSecurityPolicy: true
        }
      }
    };

    // Combinar configuración base con configuración del entorno
    return this._deepMerge(baseConfig, environmentConfigs[this.environment] || {});
  }

  /**
   * Combina dos objetos de configuración de forma profunda
   * @private
   * @param {Object} target - Objeto destino
   * @param {Object} source - Objeto fuente
   * @returns {Object} Objeto combinado
   */
  _deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Obtiene una configuración específica
   * @param {string} path - Ruta de la configuración (ej: 'api.timeout')
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {*} Valor de la configuración
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Establece una configuración específica
   * @param {string} path - Ruta de la configuración
   * @param {*} value - Valor a establecer
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Obtiene toda la configuración
   * @returns {Object} Configuración completa
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Obtiene la configuración del entorno actual
   * @returns {string} Entorno actual
   */
  getEnvironment() {
    return this.environment;
  }

  /**
   * Verifica si está en modo desarrollo
   * @returns {boolean} True si es desarrollo
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  /**
   * Verifica si está en modo producción
   * @returns {boolean} True si es producción
   */
  isProduction() {
    return this.environment === 'production';
  }

  /**
   * Verifica si el debug está habilitado
   * @returns {boolean} True si debug está habilitado
   */
  isDebugEnabled() {
    return this.get('app.debug', false);
  }

  /**
   * Obtiene el nivel de logging
   * @returns {string} Nivel de logging
   */
  getLogLevel() {
    return this.get('app.logLevel', 'info');
  }

  /**
   * Actualiza la configuración
   * @param {Object} newConfig - Nueva configuración
   */
  update(newConfig) {
    this.config = this._deepMerge(this.config, newConfig);
  }

  /**
   * Resetea la configuración a los valores por defecto
   */
  reset() {
    this.config = this._loadConfiguration();
  }

  /**
   * Exporta la configuración actual
   * @returns {Object} Configuración exportada
   */
  export() {
    return {
      environment: this.environment,
      config: this.getAll(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Valida la configuración actual
   * @returns {Object} Resultado de la validación
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Validar configuraciones críticas
    if (!this.get('api.baseUrl')) {
      errors.push('api.baseUrl es requerido');
    }

    if (this.get('api.timeout', 0) <= 0) {
      errors.push('api.timeout debe ser mayor a 0');
    }

    if (this.get('cache.defaultTTL', 0) <= 0) {
      warnings.push('cache.defaultTTL debería ser mayor a 0');
    }

    // Validar configuraciones de widgets
    if (this.get('widgets.weather.enabled') && this.get('widgets.weather.refreshInterval', 0) <= 0) {
      warnings.push('widgets.weather.refreshInterval debería ser mayor a 0');
    }

    if (this.get('widgets.news.enabled') && this.get('widgets.news.refreshInterval', 0) <= 0) {
      warnings.push('widgets.news.refreshInterval debería ser mayor a 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Crear instancia global
window.config = new Config();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
} 