/**
 * Logger - Sistema de logging centralizado
 * Responsabilidades: Gestión de logs con diferentes niveles y destinos
 */
class Logger {
  constructor() {
    this.config = window.config || {
      get: (path, defaultValue) => defaultValue,
      isDevelopment: () => true
    };
    
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = this.logLevels[this.config.get('app.logLevel', 'info')];
    this.logHistory = [];
    this.maxHistorySize = 1000;
    
    this._setupConsoleMethods();
  }

  /**
   * Configura los métodos de consola
   * @private
   */
  _setupConsoleMethods() {
    // Verificar si console está disponible
    if (typeof console === 'undefined') {
      this._createFallbackConsole();
    }
  }

  /**
   * Crea una consola de respaldo si no está disponible
   * @private
   */
  _createFallbackConsole() {
    window.console = {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {}
    };
  }

  /**
   * Registra un mensaje de error
   * @param {string} message - Mensaje de error
   * @param {Error|Object} error - Error o datos adicionales
   * @param {string} context - Contexto del error
   */
  error(message, error = null, context = null) {
    this._log('error', message, error, context);
  }

  /**
   * Registra un mensaje de advertencia
   * @param {string} message - Mensaje de advertencia
   * @param {Object} data - Datos adicionales
   * @param {string} context - Contexto de la advertencia
   */
  warn(message, data = null, context = null) {
    this._log('warn', message, data, context);
  }

  /**
   * Registra un mensaje informativo
   * @param {string} message - Mensaje informativo
   * @param {Object} data - Datos adicionales
   * @param {string} context - Contexto de la información
   */
  info(message, data = null, context = null) {
    this._log('info', message, data, context);
  }

  /**
   * Registra un mensaje de debug
   * @param {string} message - Mensaje de debug
   * @param {Object} data - Datos adicionales
   * @param {string} context - Contexto del debug
   */
  debug(message, data = null, context = null) {
    this._log('debug', message, data, context);
  }

  /**
   * Registra un mensaje con el nivel especificado
   * @private
   * @param {string} level - Nivel del log
   * @param {string} message - Mensaje
   * @param {*} data - Datos adicionales
   * @param {string} context - Contexto
   */
  _log(level, message, data = null, context = null) {
    // Verificar si el nivel está habilitado
    if (this.logLevels[level] > this.currentLevel) {
      return;
    }

    const logEntry = this._createLogEntry(level, message, data, context);
    
    // Agregar al historial
    this._addToHistory(logEntry);
    
    // Mostrar en consola
    this._outputToConsole(level, logEntry);
    
    // Enviar a servicios externos si es necesario
    this._sendToExternalServices(logEntry);
  }

  /**
   * Crea una entrada de log
   * @private
   * @param {string} level - Nivel del log
   * @param {string} message - Mensaje
   * @param {*} data - Datos adicionales
   * @param {string} context - Contexto
   * @returns {Object} Entrada de log
   */
  _createLogEntry(level, message, data, context) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: this._sanitizeMessage(message),
      data: this._sanitizeData(data),
      context: context || this._getDefaultContext(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this._getSessionId()
    };
  }

  /**
   * Sanitiza el mensaje para evitar XSS
   * @private
   * @param {string} message - Mensaje a sanitizar
   * @returns {string} Mensaje sanitizado
   */
  _sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return String(message);
    }
    
    // Escapar caracteres especiales
    return message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Sanitiza los datos para el log
   * @private
   * @param {*} data - Datos a sanitizar
   * @returns {*} Datos sanitizados
   */
  _sanitizeData(data) {
    if (data === null || data === undefined) {
      return null;
    }

    // Si es un Error, extraer información relevante
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
        cause: data.cause
      };
    }

    // Si es un objeto, intentar serializarlo de forma segura
    if (typeof data === 'object') {
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (error) {
        return { error: 'No se pudo serializar el objeto' };
      }
    }

    return data;
  }

  /**
   * Obtiene el contexto por defecto
   * @private
   * @returns {string} Contexto por defecto
   */
  _getDefaultContext() {
    // Intentar obtener el contexto desde el stack trace
    try {
      const stack = new Error().stack;
      const caller = stack.split('\n')[3]; // Saltar las primeras líneas
      return caller ? caller.trim() : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Obtiene el ID de sesión
   * @private
   * @returns {string} ID de sesión
   */
  _getSessionId() {
    if (!this.sessionId) {
      this.sessionId = this._generateSessionId();
    }
    return this.sessionId;
  }

  /**
   * Genera un ID de sesión único
   * @private
   * @returns {string} ID de sesión
   */
  _generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Agrega una entrada al historial
   * @private
   * @param {Object} logEntry - Entrada de log
   */
  _addToHistory(logEntry) {
    this.logHistory.push(logEntry);
    
    // Mantener el tamaño del historial
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Muestra el log en la consola
   * @private
   * @param {string} level - Nivel del log
   * @param {Object} logEntry - Entrada de log
   */
  _outputToConsole(level, logEntry) {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(prefix, logEntry.message, logEntry.data || '');
    } else if (level === 'warn') {
      console.warn(prefix, logEntry.message, logEntry.data || '');
    } else if (level === 'info') {
      console.info(prefix, logEntry.message, logEntry.data || '');
    } else if (level === 'debug') {
      console.debug(prefix, logEntry.message, logEntry.data || '');
    }
    
    // En desarrollo, mostrar información adicional
    if (this.config.isDevelopment()) {
      console.groupCollapsed(`${prefix} ${logEntry.message}`);
      console.log('Context:', logEntry.context);
      console.log('URL:', logEntry.url);
      console.log('Session ID:', logEntry.sessionId);
      if (logEntry.data) {
        console.log('Data:', logEntry.data);
      }
      console.groupEnd();
    }
  }

  /**
   * Envía logs a servicios externos
   * @private
   * @param {Object} logEntry - Entrada de log
   */
  _sendToExternalServices(logEntry) {
    // Solo enviar errores en producción
    if (logEntry.level === 'error' && this.config.isProduction()) {
      this._sendToErrorTracking(logEntry);
    }
  }

  /**
   * Envía errores a servicios de tracking
   * @private
   * @param {Object} logEntry - Entrada de log
   */
  _sendToErrorTracking(logEntry) {
    // Aquí se podría integrar con servicios como Sentry, LogRocket, etc.
    // Por ahora, solo simulamos el envío
    if (window.config && window.config.get('app.errorTracking.enabled', false)) {
      // Simular envío asíncrono
      setTimeout(() => {
        console.log('Error enviado a servicio de tracking:', logEntry);
      }, 0);
    }
  }

  /**
   * Obtiene el historial de logs
   * @param {string} level - Filtrar por nivel (opcional)
   * @param {number} limit - Límite de entradas
   * @returns {Array} Historial de logs
   */
  getHistory(level = null, limit = null) {
    let history = [...this.logHistory];
    
    // Filtrar por nivel si se especifica
    if (level) {
      history = history.filter(entry => entry.level === level);
    }
    
    // Limitar el número de entradas
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Limpia el historial de logs
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Exporta los logs
   * @param {string} format - Formato de exportación ('json' o 'text')
   * @returns {string} Logs exportados
   */
  export(format = 'json') {
    const history = this.getHistory();
    
    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    } else if (format === 'text') {
      return history.map(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
      }).join('\n');
    }
    
    return '';
  }

  /**
   * Establece el nivel de logging
   * @param {string} level - Nuevo nivel
   */
  setLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.currentLevel = this.logLevels[level];
      this.info(`Nivel de logging cambiado a: ${level}`);
    } else {
      this.warn(`Nivel de logging inválido: ${level}`);
    }
  }

  /**
   * Obtiene estadísticas de los logs
   * @returns {Object} Estadísticas de logs
   */
  getStats() {
    const stats = {
      total: this.logHistory.length,
      byLevel: {},
      recentErrors: 0,
      recentWarnings: 0
    };

    // Contar por nivel
    this.logHistory.forEach(entry => {
      if (!stats.byLevel[entry.level]) {
        stats.byLevel[entry.level] = 0;
      }
      stats.byLevel[entry.level]++;
    });

    // Contar errores y advertencias recientes (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.logHistory.forEach(entry => {
      if (new Date(entry.timestamp) > oneDayAgo) {
        if (entry.level === 'error') stats.recentErrors++;
        if (entry.level === 'warn') stats.recentWarnings++;
      }
    });

    return stats;
  }

  /**
   * Crea un logger específico para un contexto
   * @param {string} context - Contexto del logger
   * @returns {Object} Logger específico
   */
  createContextLogger(context) {
    return {
      error: (message, error) => this.error(message, error, context),
      warn: (message, data) => this.warn(message, data, context),
      info: (message, data) => this.info(message, data, context),
      debug: (message, data) => this.debug(message, data, context)
    };
  }
}

// Crear instancia global
window.logger = new Logger();

// Crear loggers específicos para diferentes componentes
window.loggers = {
  api: window.logger.createContextLogger('ApiService'),
  templates: window.logger.createContextLogger('TaskTemplatesManager'),
  statistics: window.logger.createContextLogger('StatisticsManager'),
  widgets: window.logger.createContextLogger('ExternalWidgetsManager')
};

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
} 