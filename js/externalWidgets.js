/**
 * ExternalWidgetsManager - Gestor de widgets externos
 * Responsabilidades: Gestión de widgets de clima y noticias con auto-refresh
 */
class ExternalWidgetsManager {
  constructor() {
    this.state = {
      weather: {
        data: null,
        isLoading: false,
        error: null,
        lastUpdate: null
      },
      news: {
        data: null,
        isLoading: false,
        error: null,
        lastUpdate: null
      }
    };

    this.config = {
      refreshInterval: 10 * 60 * 1000, // 10 minutos
      retryDelay: 30 * 1000, // 30 segundos
      maxRetries: 3
    };

    this.selectors = {
      weatherContainer: '#weatherWidget',
      newsContainer: '#newsWidget',
      refreshButtons: '[data-widget-refresh]',
      settingsButtons: '[data-widget-settings]'
    };

    this.refreshTimers = {
      weather: null,
      news: null
    };

    this.retryCounters = {
      weather: 0,
      news: 0
    };
  }

  /**
   * Inicializa el componente
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this._validateDependencies();
      this._setupEventListeners();
      await this._loadAllWidgets();
      this._startAutoRefresh();
    } catch (error) {
      console.error('Error inicializando ExternalWidgetsManager:', error);
      this._showError('Error al cargar los widgets externos');
    }
  }

  /**
   * Valida que las dependencias estén disponibles
   * @private
   */
  _validateDependencies() {
    if (!window.apiService) {
      throw new Error('ApiService no está disponible');
    }
  }

  /**
   * Configura los event listeners
   * @private
   */
  _setupEventListeners() {
    this._setupRefreshListeners();
    this._setupSettingsListeners();
    this._setupVisibilityListeners();
  }

  /**
   * Configura listeners para botones de refresh
   * @private
   */
  _setupRefreshListeners() {
    document.querySelectorAll(this.selectors.refreshButtons).forEach(button => {
      button.addEventListener('click', (e) => {
        const widgetType = e.target.dataset.widgetRefresh;
        this._handleManualRefresh(widgetType);
      });
    });
  }

  /**
   * Configura listeners para configuraciones
   * @private
   */
  _setupSettingsListeners() {
    document.querySelectorAll(this.selectors.settingsButtons).forEach(button => {
      button.addEventListener('click', (e) => {
        const widgetType = e.target.dataset.widgetSettings;
        this._handleSettings(widgetType);
      });
    });
  }

  /**
   * Configura listeners para cambios de visibilidad
   * @private
   */
  _setupVisibilityListeners() {
    // Observer para detectar cuando los widgets se vuelven visibles
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const widgetType = this._getWidgetTypeFromElement(entry.target);
          if (widgetType) {
            this._handleWidgetVisible(widgetType);
          }
        }
      });
    });

    // Observar contenedores de widgets
    const weatherContainer = document.querySelector(this.selectors.weatherContainer);
    const newsContainer = document.querySelector(this.selectors.newsContainer);

    if (weatherContainer) observer.observe(weatherContainer);
    if (newsContainer) observer.observe(newsContainer);
  }

  /**
   * Obtiene el tipo de widget desde un elemento
   * @private
   * @param {HTMLElement} element - Elemento del widget
   * @returns {string|null} Tipo de widget
   */
  _getWidgetTypeFromElement(element) {
    if (element.id === 'weatherWidget') return 'weather';
    if (element.id === 'newsWidget') return 'news';
    return null;
  }

  /**
   * Carga todos los widgets
   * @private
   * @returns {Promise<void>}
   */
  async _loadAllWidgets() {
    await Promise.allSettled([
      this._loadWeatherWidget(),
      this._loadNewsWidget()
    ]);
  }

  /**
   * Carga el widget del clima
   * @private
   * @returns {Promise<void>}
   */
  async _loadWeatherWidget() {
    this._setWidgetLoadingState('weather', true);
    
    try {
      const result = await window.apiService.getWeatherData();
      
      if (result.success) {
        this._setWidgetData('weather', result.data);
        this._renderWeatherWidget(result.data);
        this._resetRetryCounter('weather');
      } else {
        throw new Error(result.error || 'Error al cargar datos del clima');
      }
      
    } catch (error) {
      this._handleWidgetError('weather', error);
    } finally {
      this._setWidgetLoadingState('weather', false);
    }
  }

  /**
   * Carga el widget de noticias
   * @private
   * @returns {Promise<void>}
   */
  async _loadNewsWidget() {
    this._setWidgetLoadingState('news', true);
    
    try {
      const result = await window.apiService.getNewsData();
      
      if (result.success) {
        this._setWidgetData('news', result.data);
        this._renderNewsWidget(result.data);
        this._resetRetryCounter('news');
      } else {
        throw new Error(result.error || 'Error al cargar noticias');
      }
      
    } catch (error) {
      this._handleWidgetError('news', error);
    } finally {
      this._setWidgetLoadingState('news', false);
    }
  }

  /**
   * Renderiza el widget del clima
   * @private
   * @param {Object} data - Datos del clima
   */
  _renderWeatherWidget(data) {
    const container = document.querySelector(this.selectors.weatherContainer);
    if (!container) return;

    const weatherIcon = this._getWeatherIcon(data.condition);
    const lastUpdate = this._formatLastUpdate(data.timestamp);

    container.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-geo-alt me-1"></i>Clima en ${this._escapeHtml(data.city)}
          </h6>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary btn-sm" data-widget-refresh="weather" title="Actualizar">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button class="btn btn-outline-secondary btn-sm" data-widget-settings="weather" title="Configurar">
              <i class="bi bi-gear"></i>
            </button>
          </div>
        </div>
        <div class="card-body text-center">
          <div class="mb-3">
            <i class="bi ${weatherIcon} display-4 text-primary"></i>
            <h3 class="mt-2">${data.temperature}°C</h3>
            <p class="text-muted mb-0">${this._escapeHtml(data.condition)}</p>
          </div>
          <div class="row text-center">
            <div class="col-6">
              <small class="text-muted">Humedad</small>
              <p class="mb-0">${data.humidity}%</p>
            </div>
            <div class="col-6">
              <small class="text-muted">Última actualización</small>
              <p class="mb-0 small">${lastUpdate}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this._setupWidgetEventListeners(container, 'weather');
  }

  /**
   * Renderiza el widget de noticias
   * @private
   * @param {Object} data - Datos de noticias
   */
  _renderNewsWidget(data) {
    const container = document.querySelector(this.selectors.newsContainer);
    if (!container) return;

    const lastUpdate = this._formatLastUpdate(data.timestamp);
    const articles = data.articles.slice(0, 3); // Mostrar solo 3 artículos

    container.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="bi bi-newspaper me-1"></i>Noticias de ${this._escapeHtml(data.category)}
          </h6>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary btn-sm" data-widget-refresh="news" title="Actualizar">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <button class="btn btn-outline-secondary btn-sm" data-widget-settings="news" title="Configurar">
              <i class="bi bi-gear"></i>
            </button>
          </div>
        </div>
        <div class="card-body">
          ${articles.map(article => this._renderNewsArticle(article)).join('')}
          <div class="text-center mt-3">
            <small class="text-muted">Última actualización: ${lastUpdate}</small>
          </div>
        </div>
      </div>
    `;

    this._setupWidgetEventListeners(container, 'news');
  }

  /**
   * Renderiza un artículo de noticias
   * @private
   * @param {Object} article - Datos del artículo
   * @returns {string} HTML del artículo
   */
  _renderNewsArticle(article) {
    const publishedDate = new Date(article.publishedAt).toLocaleDateString();
    
    return `
      <div class="mb-3 pb-3 border-bottom">
        <h6 class="mb-1">
          <a href="${article.url}" target="_blank" class="text-decoration-none">
            ${this._escapeHtml(article.title)}
          </a>
        </h6>
        <p class="small text-muted mb-1">${this._escapeHtml(article.description)}</p>
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">${this._escapeHtml(article.source)}</small>
          <small class="text-muted">${publishedDate}</small>
        </div>
      </div>
    `;
  }

  /**
   * Configura los event listeners de un widget específico
   * @private
   * @param {HTMLElement} container - Contenedor del widget
   * @param {string} widgetType - Tipo de widget
   */
  _setupWidgetEventListeners(container, widgetType) {
    const refreshBtn = container.querySelector(`[data-widget-refresh="${widgetType}"]`);
    const settingsBtn = container.querySelector(`[data-widget-settings="${widgetType}"]`);

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this._handleManualRefresh(widgetType);
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this._handleSettings(widgetType);
      });
    }
  }

  /**
   * Obtiene el icono del clima según la condición
   * @private
   * @param {string} condition - Condición climática
   * @returns {string} Clase del icono
   */
  _getWeatherIcon(condition) {
    const icons = {
      'Soleado': 'bi-sun',
      'Nublado': 'bi-cloud',
      'Lluvioso': 'bi-cloud-rain'
    };
    return icons[condition] || 'bi-cloud';
  }

  /**
   * Formatea la última actualización
   * @private
   * @param {string} timestamp - Timestamp ISO
   * @returns {string} Fecha formateada
   */
  _formatLastUpdate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString();
  }

  /**
   * Escapa HTML para prevenir XSS
   * @private
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Maneja el refresh manual de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  async _handleManualRefresh(widgetType) {
    try {
      if (widgetType === 'weather') {
        await this._loadWeatherWidget();
      } else if (widgetType === 'news') {
        await this._loadNewsWidget();
      }
      
      this._showRefreshSuccessNotification(widgetType);
    } catch (error) {
      console.error(`Error en refresh manual de ${widgetType}:`, error);
    }
  }

  /**
   * Maneja la configuración de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _handleSettings(widgetType) {
    this._showSettingsModal(widgetType);
  }

  /**
   * Maneja cuando un widget se vuelve visible
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _handleWidgetVisible(widgetType) {
    // Cargar datos si no están disponibles o están desactualizados
    const widgetState = this.state[widgetType];
    const isStale = !widgetState.lastUpdate || 
                   (Date.now() - new Date(widgetState.lastUpdate).getTime()) > this.config.refreshInterval;

    if (!widgetState.data || isStale) {
      this._loadWidgetData(widgetType);
    }
  }

  /**
   * Carga datos de un widget específico
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  async _loadWidgetData(widgetType) {
    if (widgetType === 'weather') {
      await this._loadWeatherWidget();
    } else if (widgetType === 'news') {
      await this._loadNewsWidget();
    }
  }

  /**
   * Maneja errores de widgets
   * @private
   * @param {string} widgetType - Tipo de widget
   * @param {Error} error - Error ocurrido
   */
  _handleWidgetError(widgetType, error) {
    this._setWidgetError(widgetType, error.message);
    this._renderWidgetError(widgetType, error.message);
    
    // Reintentar si no se ha excedido el límite
    if (this.retryCounters[widgetType] < this.config.maxRetries) {
      this._scheduleRetry(widgetType);
    }
  }

  /**
   * Programa un reintento para un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _scheduleRetry(widgetType) {
    this.retryCounters[widgetType]++;
    
    setTimeout(() => {
      this._loadWidgetData(widgetType);
    }, this.config.retryDelay);
  }

  /**
   * Renderiza el error de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   * @param {string} errorMessage - Mensaje de error
   */
  _renderWidgetError(widgetType, errorMessage) {
    const container = document.querySelector(this.selectors[`${widgetType}Container`]);
    if (!container) return;

    const widgetName = widgetType === 'weather' ? 'Clima' : 'Noticias';
    
    container.innerHTML = `
      <div class="card border-danger">
        <div class="card-header bg-danger text-white">
          <h6 class="mb-0">
            <i class="bi bi-exclamation-triangle me-1"></i>Error en ${widgetName}
          </h6>
        </div>
        <div class="card-body text-center">
          <i class="bi bi-wifi-off display-4 text-muted"></i>
          <p class="text-muted mt-2">${this._escapeHtml(errorMessage)}</p>
          <button class="btn btn-outline-primary btn-sm" data-widget-refresh="${widgetType}">
            <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
          </button>
        </div>
      </div>
    `;

    this._setupWidgetEventListeners(container, widgetType);
  }

  /**
   * Inicia el auto-refresh de los widgets
   * @private
   */
  _startAutoRefresh() {
    // Auto-refresh para clima
    this.refreshTimers.weather = setInterval(() => {
      this._loadWeatherWidget();
    }, this.config.refreshInterval);

    // Auto-refresh para noticias
    this.refreshTimers.news = setInterval(() => {
      this._loadNewsWidget();
    }, this.config.refreshInterval);
  }

  /**
   * Detiene el auto-refresh
   * @private
   */
  _stopAutoRefresh() {
    if (this.refreshTimers.weather) {
      clearInterval(this.refreshTimers.weather);
      this.refreshTimers.weather = null;
    }
    
    if (this.refreshTimers.news) {
      clearInterval(this.refreshTimers.news);
      this.refreshTimers.news = null;
    }
  }

  /**
   * Muestra modal de configuración
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _showSettingsModal(widgetType) {
    const widgetName = widgetType === 'weather' ? 'Clima' : 'Noticias';
    
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(
        'Configuración',
        `Configuración de ${widgetName} no disponible en esta versión`
      );
    }
  }

  /**
   * Muestra notificación de refresh exitoso
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _showRefreshSuccessNotification(widgetType) {
    const widgetName = widgetType === 'weather' ? 'Clima' : 'Noticias';
    
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(
        'Widget actualizado',
        `Se ha actualizado el widget de ${widgetName}`
      );
    }
  }

  /**
   * Establece el estado de carga de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   * @param {boolean} isLoading - Estado de carga
   */
  _setWidgetLoadingState(widgetType, isLoading) {
    this.state[widgetType].isLoading = isLoading;
  }

  /**
   * Establece los datos de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   * @param {Object} data - Datos del widget
   */
  _setWidgetData(widgetType, data) {
    this.state[widgetType].data = data;
    this.state[widgetType].lastUpdate = new Date().toISOString();
    this.state[widgetType].error = null;
  }

  /**
   * Establece el error de un widget
   * @private
   * @param {string} widgetType - Tipo de widget
   * @param {string} error - Mensaje de error
   */
  _setWidgetError(widgetType, error) {
    this.state[widgetType].error = error;
  }

  /**
   * Resetea el contador de reintentos
   * @private
   * @param {string} widgetType - Tipo de widget
   */
  _resetRetryCounter(widgetType) {
    this.retryCounters[widgetType] = 0;
  }

  /**
   * Muestra un error general
   * @private
   * @param {string} message - Mensaje de error
   */
  _showError(message) {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification('Error', message, 'error');
    } else {
      console.error(message);
    }
  }

  /**
   * Obtiene el estado de un widget
   * @param {string} widgetType - Tipo de widget
   * @returns {Object} Estado del widget
   */
  getWidgetState(widgetType) {
    return { ...this.state[widgetType] };
  }

  /**
   * Obtiene el estado general del componente
   * @returns {Object} Estado del componente
   */
  getState() {
    return {
      state: { ...this.state },
      config: { ...this.config },
      retryCounters: { ...this.retryCounters }
    };
  }

  /**
   * Actualiza la configuración del componente
   * @param {Object} newConfig - Nueva configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reiniciar auto-refresh con nueva configuración
    this._stopAutoRefresh();
    this._startAutoRefresh();
  }

  /**
   * Destruye el componente y limpia recursos
   */
  destroy() {
    this._stopAutoRefresh();
    
    // Limpiar event listeners
    document.querySelectorAll(this.selectors.refreshButtons).forEach(button => {
      button.replaceWith(button.cloneNode(true));
    });
    
    document.querySelectorAll(this.selectors.settingsButtons).forEach(button => {
      button.replaceWith(button.cloneNode(true));
    });
  }
}

// Crear instancia global
window.externalWidgetsManager = new ExternalWidgetsManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (window.externalWidgetsManager) {
    window.externalWidgetsManager.init();
  }
}); 