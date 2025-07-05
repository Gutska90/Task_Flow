/**
 * StatisticsManager - Gestor de estadísticas y métricas
 * Responsabilidades: Carga, procesamiento y visualización de estadísticas
 */
class StatisticsManager {
  constructor() {
    this.state = {
      statistics: null,
      achievements: [],
      currentView: 'overview',
      isLoading: false,
      error: null
    };

    this.selectors = {
      container: '#statisticsContainer',
      viewButtons: '[data-stats-view]',
      reloadBtn: '#reloadStatistics',
      exportBtn: '#exportStatistics'
    };

    this.viewHandlers = {
      overview: this._renderOverview.bind(this),
      categories: this._renderCategoryStats.bind(this),
      trends: this._renderTrends.bind(this),
      achievements: this._renderAchievements.bind(this)
    };

    this.statistics = null;
    this.achievements = [];
    this.currentView = 'overview';
  }

  /**
   * Inicializa el componente
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this._validateDependencies();
      await this._loadStatistics();
      this._setupEventListeners();
      this._renderStatistics();
    } catch (error) {
      console.error('Error inicializando StatisticsManager:', error);
      this._showError('Error al cargar las estadísticas');
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
   * Carga las estadísticas desde la API
   * @private
   * @returns {Promise<void>}
   */
  async _loadStatistics() {
    this._setLoadingState(true);
    
    try {
      const result = await window.apiService.getStatistics();
      
      if (!result?.statistics) {
        throw new Error('No se pudieron cargar las estadísticas');
      }

      this.statistics = result.statistics;
      this.achievements = result.statistics.achievements || [];
      this._setLoadingState(false);
      
    } catch (error) {
      this._setLoadingState(false);
      this._setError(error.message);
      throw error;
    }
  }

  /**
   * Configura los event listeners
   * @private
   */
  _setupEventListeners() {
    this._setupViewListeners();
    this._setupActionListeners();
  }

  /**
   * Configura listeners para cambio de vista
   * @private
   */
  _setupViewListeners() {
    document.querySelectorAll(this.selectors.viewButtons).forEach(button => {
      button.addEventListener('click', (e) => {
        this._handleViewChange(e.target);
      });
    });
  }

  /**
   * Configura listeners para acciones
   * @private
   */
  _setupActionListeners() {
    const reloadBtn = document.querySelector(this.selectors.reloadBtn);
    const exportBtn = document.querySelector(this.selectors.exportBtn);

    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        this._handleReload();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this._handleExport();
      });
    }
  }

  /**
   * Maneja el cambio de vista
   * @private
   * @param {HTMLElement} button - Botón clickeado
   */
  _handleViewChange(button) {
    this.currentView = button.dataset.statsView;
    this._updateActiveView(button);
    this._renderStatistics();
  }

  /**
   * Maneja la recarga de estadísticas
   * @private
   */
  async _handleReload() {
    try {
      await this._reloadStatistics();
    } catch (error) {
      console.error('Error recargando estadísticas:', error);
      this._showError('Error al recargar las estadísticas');
    }
  }

  /**
   * Maneja la exportación de estadísticas
   * @private
   */
  _handleExport() {
    this._exportStatistics();
  }

  /**
   * Actualiza la vista activa visualmente
   * @private
   * @param {HTMLElement} activeButton - Botón activo
   */
  _updateActiveView(activeButton) {
    document.querySelectorAll(this.selectors.viewButtons).forEach(btn => {
      btn.classList.remove('active');
    });
    activeButton.classList.add('active');
  }

  /**
   * Renderiza las estadísticas según la vista actual
   * @private
   */
  _renderStatistics() {
    if (!this.statistics) return;

    const handler = this.viewHandlers[this.currentView];
    if (handler) {
      handler();
    }
  }

  /**
   * Renderiza la vista general
   * @private
   */
  _renderOverview() {
    const container = document.querySelector(this.selectors.container);
    if (!container || !this.statistics.global) return;

    const global = this.statistics.global;
    
    container.innerHTML = `
      <div class="row">
        ${this._renderOverviewCards(global)}
      </div>
      <div class="row mt-4">
        <div class="col-md-6">
          ${this._renderProductivityMetrics(global)}
        </div>
        <div class="col-md-6">
          ${this._renderPrioritySummary()}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza las tarjetas de resumen general
   * @private
   * @param {Object} global - Datos globales
   * @returns {string} HTML de las tarjetas
   */
  _renderOverviewCards(global) {
    const cards = [
      {
        icon: 'bi-list-task',
        value: global.totalTasks,
        label: 'Total Tareas',
        color: 'primary'
      },
      {
        icon: 'bi-check-circle',
        value: global.completedTasks,
        label: 'Completadas',
        color: 'success'
      },
      {
        icon: 'bi-clock',
        value: global.pendingTasks,
        label: 'Pendientes',
        color: 'warning'
      },
      {
        icon: 'bi-exclamation-triangle',
        value: global.overdueTasks,
        label: 'Vencidas',
        color: 'danger'
      }
    ];

    return cards.map(card => `
      <div class="col-md-3 mb-3">
        <div class="card text-center">
          <div class="card-body">
            <i class="bi ${card.icon} display-4 text-${card.color}"></i>
            <h4 class="mt-2">${card.value}</h4>
            <p class="text-muted mb-0">${card.label}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Renderiza las métricas de productividad
   * @private
   * @param {Object} global - Datos globales
   * @returns {string} HTML de las métricas
   */
  _renderProductivityMetrics(global) {
    return `
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Métricas de Productividad</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Tasa de Completación</label>
            <div class="progress">
              <div class="progress-bar bg-success" style="width: ${global.completionRate}%">
                ${global.completionRate}%
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Tiempo Promedio de Completación</label>
            <p class="h5 text-primary">${global.averageCompletionTime} días</p>
          </div>
          <div class="row">
            <div class="col-6">
              <small class="text-muted">Día más productivo</small>
              <p class="mb-0"><i class="bi bi-calendar-event me-1"></i>${global.mostProductiveDay}</p>
            </div>
            <div class="col-6">
              <small class="text-muted">Hora más productiva</small>
              <p class="mb-0"><i class="bi bi-clock me-1"></i>${global.mostProductiveHour}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el resumen por prioridad
   * @private
   * @returns {string} HTML del resumen
   */
  _renderPrioritySummary() {
    if (!this.statistics.byPriority) return '';

    return `
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Resumen por Prioridad</h5>
        </div>
        <div class="card-body">
          ${this.statistics.byPriority.map(priority => this._renderPriorityItem(priority)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza un elemento de prioridad
   * @private
   * @param {Object} priority - Datos de prioridad
   * @returns {string} HTML del elemento
   */
  _renderPriorityItem(priority) {
    const config = this._getPriorityConfig(priority.priority);
    
    return `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span>${config.text}</span>
          <span class="badge bg-${config.color}">${priority.completionRate}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-${config.color}" style="width: ${priority.completionRate}%"></div>
        </div>
        <small class="text-muted">${priority.completed}/${priority.total} tareas</small>
      </div>
    `;
  }

  /**
   * Obtiene la configuración de prioridad
   * @private
   * @param {string} priority - Prioridad
   * @returns {Object} Configuración
   */
  _getPriorityConfig(priority) {
    const configs = {
      high: { color: 'danger', text: 'Alta' },
      medium: { color: 'warning', text: 'Media' },
      low: { color: 'success', text: 'Baja' }
    };
    return configs[priority] || configs.medium;
  }

  /**
   * Renderiza estadísticas por categoría
   * @private
   */
  _renderCategoryStats() {
    const container = document.querySelector(this.selectors.container);
    if (!container || !this.statistics.byCategory) return;

    container.innerHTML = `
      <div class="row">
        ${this.statistics.byCategory.map(category => this._renderCategoryCard(category)).join('')}
      </div>
    `;
  }

  /**
   * Renderiza una tarjeta de categoría
   * @private
   * @param {Object} category - Datos de categoría
   * @returns {string} HTML de la tarjeta
   */
  _renderCategoryCard(category) {
    return `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="card-title mb-0">${this._capitalizeFirst(category.category)}</h6>
              <span class="badge bg-primary">${category.completionRate}%</span>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar bg-primary" style="width: ${category.completionRate}%"></div>
            </div>
            <div class="row text-center">
              <div class="col-4">
                <small class="text-muted">Total</small>
                <p class="mb-0 h6">${category.total}</p>
              </div>
              <div class="col-4">
                <small class="text-muted">Completadas</small>
                <p class="mb-0 h6 text-success">${category.completed}</p>
              </div>
              <div class="col-4">
                <small class="text-muted">Pendientes</small>
                <p class="mb-0 h6 text-warning">${category.pending}</p>
              </div>
            </div>
            <div class="mt-2">
              <small class="text-muted">
                <i class="bi bi-clock me-1"></i>Tiempo promedio: ${category.averageTime} días
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza las tendencias
   * @private
   */
  _renderTrends() {
    const container = document.querySelector(this.selectors.container);
    if (!container || !this.statistics.trends) return;

    const { weekly, monthly } = this.statistics.trends;

    container.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          ${this._renderWeeklyTrends(weekly)}
        </div>
        <div class="col-md-6">
          ${this._renderMonthlyTrends(monthly)}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza tendencias semanales
   * @private
   * @param {Array} weekly - Datos semanales
   * @returns {string} HTML de las tendencias
   */
  _renderWeeklyTrends(weekly) {
    return `
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Tendencia Semanal</h5>
        </div>
        <div class="card-body">
          ${weekly.map(week => this._renderTrendItem(week, 'week')).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza tendencias mensuales
   * @private
   * @param {Array} monthly - Datos mensuales
   * @returns {string} HTML de las tendencias
   */
  _renderMonthlyTrends(monthly) {
    return `
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Tendencia Mensual</h5>
        </div>
        <div class="card-body">
          ${monthly.map(month => this._renderTrendItem(month, 'month')).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderiza un elemento de tendencia
   * @private
   * @param {Object} item - Datos del elemento
   * @param {string} type - Tipo de tendencia
   * @returns {string} HTML del elemento
   */
  _renderTrendItem(item, type) {
    const label = type === 'week' 
      ? `Semana ${new Date(item.week).toLocaleDateString()}`
      : item.month;

    return `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span>${label}</span>
        <div>
          <span class="badge bg-success me-1">${item.tasksCompleted} completadas</span>
          <span class="badge bg-primary">${item.completionRate}%</span>
        </div>
      </div>
      <div class="progress mb-3" style="height: 6px;">
        <div class="progress-bar bg-success" style="width: ${item.completionRate}%"></div>
      </div>
    `;
  }

  /**
   * Renderiza los logros
   * @private
   */
  _renderAchievements() {
    const container = document.querySelector(this.selectors.container);
    if (!container) return;

    container.innerHTML = `
      <div class="row">
        ${this.achievements.map(achievement => this._renderAchievementCard(achievement)).join('')}
      </div>
    `;
  }

  /**
   * Renderiza una tarjeta de logro
   * @private
   * @param {Object} achievement - Datos del logro
   * @returns {string} HTML de la tarjeta
   */
  _renderAchievementCard(achievement) {
    const isUnlocked = achievement.unlocked;
    const borderClass = isUnlocked ? 'border-success' : 'border-secondary';
    const iconClass = isUnlocked ? 'text-success' : 'text-muted';

    return `
      <div class="col-md-6 col-lg-3 mb-3">
        <div class="card text-center ${borderClass}">
          <div class="card-body">
            <i class="bi ${achievement.icon} display-4 ${iconClass}"></i>
            <h6 class="mt-2">${this._escapeHtml(achievement.name)}</h6>
            <p class="small text-muted">${this._escapeHtml(achievement.description)}</p>
            ${isUnlocked ? this._renderUnlockedAchievement(achievement) : this._renderLockedAchievement(achievement)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza logro desbloqueado
   * @private
   * @param {Object} achievement - Datos del logro
   * @returns {string} HTML del logro desbloqueado
   */
  _renderUnlockedAchievement(achievement) {
    return `
      <span class="badge bg-success">Desbloqueado</span>
      <small class="d-block text-muted mt-1">${new Date(achievement.date).toLocaleDateString()}</small>
    `;
  }

  /**
   * Renderiza logro bloqueado
   * @private
   * @param {Object} achievement - Datos del logro
   * @returns {string} HTML del logro bloqueado
   */
  _renderLockedAchievement(achievement) {
    return `
      <div class="progress mb-2" style="height: 6px;">
        <div class="progress-bar bg-secondary" style="width: ${achievement.progress}%"></div>
      </div>
      <small class="text-muted">${achievement.progress}% completado</small>
    `;
  }

  /**
   * Capitaliza la primera letra
   * @private
   * @param {string} string - String a capitalizar
   * @returns {string} String capitalizado
   */
  _capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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
   * Recarga las estadísticas
   * @private
   * @returns {Promise<void>}
   */
  async _reloadStatistics() {
    // Limpiar caché
    if (window.apiService) {
      window.apiService.clearCacheKey('statistics');
    }

    // Mostrar loading
    this._showLoadingState();

    // Recargar datos
    await this._loadStatistics();
    this._renderStatistics();

    // Mostrar notificación de éxito
    this._showReloadSuccessNotification();
  }

  /**
   * Muestra estado de carga
   * @private
   */
  _showLoadingState() {
    const container = document.querySelector(this.selectors.container);
    if (container) {
      container.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando estadísticas...</p>
        </div>
      `;
    }
  }

  /**
   * Muestra notificación de recarga exitosa
   * @private
   */
  _showReloadSuccessNotification() {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(
        'Estadísticas actualizadas',
        'Se han recargado las estadísticas'
      );
    }
  }

  /**
   * Exporta las estadísticas
   * @private
   */
  _exportStatistics() {
    if (!this.statistics) return;

    const dataStr = JSON.stringify(this.statistics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `taskflow-statistics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    this._showExportSuccessNotification();
  }

  /**
   * Muestra notificación de exportación exitosa
   * @private
   */
  _showExportSuccessNotification() {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(
        'Estadísticas exportadas',
        'Se ha descargado el archivo de estadísticas'
      );
    }
  }

  /**
   * Establece el estado de carga
   * @private
   * @param {boolean} isLoading - Estado de carga
   */
  _setLoadingState(isLoading) {
    this.state.isLoading = isLoading;
  }

  /**
   * Establece el error
   * @private
   * @param {string} error - Mensaje de error
   */
  _setError(error) {
    this.state.error = error;
  }

  /**
   * Muestra un error
   * @private
   * @param {string} message - Mensaje de error
   */
  _showError(message) {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification('Error', message, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * Obtiene las estadísticas para otros componentes
   * @returns {Object|null} Estadísticas
   */
  getStatistics() {
    return this.statistics;
  }

  /**
   * Obtiene los logros
   * @returns {Array} Lista de logros
   */
  getAchievements() {
    return this.achievements;
  }

  /**
   * Obtiene el estado actual del componente
   * @returns {Object} Estado del componente
   */
  getState() {
    return { ...this.state };
  }
}

// Crear instancia global
window.statisticsManager = new StatisticsManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (window.statisticsManager) {
    window.statisticsManager.init();
  }
}); 