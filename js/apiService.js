/**
 * ApiService - Servicio centralizado para consumir APIs externas
 * Responsabilidades: Gestión de requests HTTP, caché y manejo de errores
 */
class ApiService {
  constructor() {
    this.config = {
      baseUrl: './data/',
      cacheTimeout: 5 * 60 * 1000, // 5 minutos
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.cache = new Map();
    this.requestQueue = new Map();
  }

  /**
   * Realiza una petición HTTP con manejo de errores y reintentos
   * @param {string} url - URL de la petición
   * @param {Object} options - Opciones de fetch
   * @returns {Promise<Object>} Resultado de la petición
   */
  async fetchData(url, options = {}) {
    const requestKey = this._generateRequestKey(url, options);
    
    // Evitar requests duplicados
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }

    const requestPromise = this._executeRequest(url, options);
    this.requestQueue.set(requestKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.requestQueue.delete(requestKey);
    }
  }

  /**
   * Ejecuta la petición HTTP con reintentos
   * @private
   */
  async _executeRequest(url, options, attempt = 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      console.error(`Request failed (attempt ${attempt}):`, error);
      
      if (attempt < this.config.retryAttempts) {
        await this._delay(this.config.retryDelay * attempt);
        return this._executeRequest(url, options, attempt + 1);
      }
      
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera una clave única para la petición
   * @private
   */
  _generateRequestKey(url, options) {
    return `${url}-${JSON.stringify(options)}`;
  }

  /**
   * Delay para reintentos
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== MÉTODOS PÚBLICOS PARA DATOS LOCALES =====

  /**
   * Obtiene categorías desde JSON local
   * @returns {Promise<Object|null>} Datos de categorías
   */
  async getCategories() {
    return this._getCachedData('categories', () => 
      this.fetchData(`${this.config.baseUrl}categories.json`)
    );
  }

  /**
   * Obtiene plantillas de tareas desde JSON local
   * @returns {Promise<Object|null>} Datos de plantillas
   */
  async getTaskTemplates() {
    return this._getCachedData('taskTemplates', () => 
      this.fetchData(`${this.config.baseUrl}taskTemplates.json`)
    );
  }

  /**
   * Obtiene estadísticas desde JSON local
   * @returns {Promise<Object|null>} Datos de estadísticas
   */
  async getStatistics() {
    return this._getCachedData('statistics', () => 
      this.fetchData(`${this.config.baseUrl}statistics.json`)
    );
  }

  // ===== MÉTODOS DE FILTRADO Y BÚSQUEDA =====

  /**
   * Obtiene plantillas filtradas por categoría
   * @param {string} category - Categoría a filtrar
   * @returns {Promise<Array>} Plantillas filtradas
   */
  async getTemplatesByCategory(category) {
    const templates = await this.getTaskTemplates();
    if (!templates?.templates) return [];

    return templates.templates.filter(template => 
      template.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Obtiene plantillas filtradas por prioridad
   * @param {string} priority - Prioridad a filtrar
   * @returns {Promise<Array>} Plantillas filtradas
   */
  async getTemplatesByPriority(priority) {
    const templates = await this.getTaskTemplates();
    if (!templates?.templates) return [];

    return templates.templates.filter(template => 
      template.priority.toLowerCase() === priority.toLowerCase()
    );
  }

  /**
   * Busca plantillas por término de búsqueda
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} Plantillas que coinciden
   */
  async searchTemplates(searchTerm) {
    const templates = await this.getTaskTemplates();
    if (!templates?.templates) return [];

    const term = searchTerm.toLowerCase();
    return templates.templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  /**
   * Obtiene estadísticas por categoría
   * @param {string} category - Categoría específica
   * @returns {Promise<Object|null>} Estadísticas de la categoría
   */
  async getCategoryStatistics(category) {
    const stats = await this.getStatistics();
    if (!stats?.statistics?.byCategory) return null;

    return stats.statistics.byCategory.find(stat => 
      stat.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Obtiene logros del usuario
   * @returns {Promise<Array>} Lista de logros
   */
  async getAchievements() {
    const stats = await this.getStatistics();
    return stats?.statistics?.achievements || [];
  }

  // ===== MÉTODOS PARA APIs EXTERNAS SIMULADAS =====

  /**
   * Simula API de clima (equivalente a OpenWeatherMap)
   * @param {string} city - Ciudad para obtener clima
   * @returns {Promise<Object>} Datos del clima
   */
  async getWeatherData(city = 'Madrid') {
    // Simulación de delay de red
    await this._delay(500);
    
    const conditions = ['Soleado', 'Nublado', 'Lluvioso'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      success: true,
      data: {
        city,
        temperature: Math.floor(Math.random() * 30) + 10,
        condition: randomCondition,
        humidity: Math.floor(Math.random() * 40) + 40,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Simula API de noticias (equivalente a NewsAPI)
   * @param {string} category - Categoría de noticias
   * @returns {Promise<Object>} Datos de noticias
   */
  async getNewsData(category = 'technology') {
    // Simulación de delay de red
    await this._delay(300);
    
    const mockNews = [
      {
        title: 'Nuevas tendencias en productividad personal',
        description: 'Descubre las últimas herramientas y técnicas para mejorar tu productividad',
        url: '#',
        publishedAt: new Date().toISOString(),
        source: 'Productivity Weekly'
      },
      {
        title: 'Cómo organizar mejor tu tiempo de trabajo',
        description: 'Estrategias efectivas para gestionar tu agenda y tareas diarias',
        url: '#',
        publishedAt: new Date().toISOString(),
        source: 'Work Life Balance'
      },
      {
        title: 'Apps de gestión de tareas más populares en 2024',
        description: 'Revisión de las aplicaciones más utilizadas para organizar proyectos',
        url: '#',
        publishedAt: new Date().toISOString(),
        source: 'Tech Review'
      }
    ];

    return {
      success: true,
      data: {
        articles: mockNews,
        totalResults: mockNews.length,
        category
      }
    };
  }

  // ===== GESTIÓN DE CACHÉ =====

  /**
   * Obtiene datos del caché o los carga si no existen
   * @private
   */
  async _getCachedData(key, fetchFunction) {
    const cached = this.getCachedData(key);
    if (cached) return cached;

    const result = await fetchFunction();
    if (result.success) {
      this.setCachedData(key, result.data);
      return result.data;
    }
    
    return null;
  }

  /**
   * Obtiene datos del caché si no han expirado
   * @param {string} key - Clave del caché
   * @returns {*} Datos cacheados o null
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Almacena datos en el caché
   * @param {string} key - Clave del caché
   * @param {*} data - Datos a almacenar
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Limpia todo el caché
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Limpia una clave específica del caché
   * @param {string} key - Clave a limpiar
   */
  clearCacheKey(key) {
    this.cache.delete(key);
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas del caché
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((value, key) => {
      if (now - value.timestamp < this.config.cacheTimeout) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.config.cacheTimeout
    };
  }

  // ===== UTILIDADES =====

  /**
   * Verifica la conectividad con los archivos JSON
   * @returns {Promise<boolean>} Estado de conectividad
   */
  async checkConnectivity() {
    try {
      const response = await fetch(`${this.config.baseUrl}categories.json`, {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Simula delay de red (útil para testing)
   * @param {number} delay - Delay en milisegundos
   * @returns {Promise} Promise que se resuelve después del delay
   */
  async simulateNetworkDelay(delay = 1000) {
    return this._delay(delay);
  }

  /**
   * Obtiene información del servicio
   * @returns {Object} Información del servicio
   */
  getServiceInfo() {
    return {
      version: '2.0.0',
      cacheStats: this.getCacheStats(),
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
}

// Crear instancia global del servicio
window.apiService = new ApiService();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
} 