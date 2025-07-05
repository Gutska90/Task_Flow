/**
 * TaskTemplatesManager - Gestor de plantillas de tareas
 * Responsabilidades: Carga, filtrado, renderizado y gestión de plantillas
 */
class TaskTemplatesManager {
  constructor() {
    this.state = {
      templates: [],
      filteredTemplates: [],
      filters: {
        priority: 'all',
        category: 'all',
        searchTerm: ''
      },
      isLoading: false,
      error: null
    };

    this.selectors = {
      container: '#templatesContainer',
      searchInput: '#templateSearch',
      clearSearchBtn: '#clearTemplateSearch',
      reloadBtn: '#reloadTemplates',
      priorityFilters: '[data-template-filter]',
      categoryFilters: '[data-template-category]'
    };

    this.templates = [];
    this.filteredTemplates = [];
    this.currentFilter = 'all';
    this.currentCategory = 'all';
    this.searchTerm = '';
  }

  /**
   * Inicializa el componente
   * @returns {Promise<void>}
   */
  async init() {
    try {
      this._validateDependencies();
      await this._loadTemplates();
      this._setupEventListeners();
      this._renderTemplates();
      this._updateCategoryOptions();
    } catch (error) {
      console.error('Error inicializando TaskTemplatesManager:', error);
      this._showError('Error al cargar las plantillas de tareas');
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
   * Carga las plantillas desde la API
   * @private
   * @returns {Promise<void>}
   */
  async _loadTemplates() {
    this._setLoadingState(true);
    
    try {
      const result = await window.apiService.getTaskTemplates();
      
      if (!result?.templates) {
        throw new Error('No se pudieron cargar las plantillas');
      }

      this.templates = result.templates;
      this.filteredTemplates = [...this.templates];
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
    this._setupFilterListeners();
    this._setupSearchListeners();
    this._setupActionListeners();
  }

  /**
   * Configura listeners para filtros
   * @private
   */
  _setupFilterListeners() {
    // Filtros de prioridad
    document.querySelectorAll(this.selectors.priorityFilters).forEach(button => {
      button.addEventListener('click', (e) => {
        this._handlePriorityFilter(e.target);
      });
    });

    // Filtros de categoría
    document.querySelectorAll(this.selectors.categoryFilters).forEach(button => {
      button.addEventListener('click', (e) => {
        this._handleCategoryFilter(e.target);
      });
    });
  }

  /**
   * Configura listeners para búsqueda
   * @private
   */
  _setupSearchListeners() {
    const searchInput = document.querySelector(this.selectors.searchInput);
    const clearSearchBtn = document.querySelector(this.selectors.clearSearchBtn);

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._handleSearchInput(e.target.value);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this._handleClearSearch();
      });
    }
  }

  /**
   * Configura listeners para acciones
   * @private
   */
  _setupActionListeners() {
    const reloadBtn = document.querySelector(this.selectors.reloadBtn);
    
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        this._handleReload();
      });
    }
  }

  /**
   * Maneja el filtro de prioridad
   * @private
   * @param {HTMLElement} button - Botón clickeado
   */
  _handlePriorityFilter(button) {
    this.currentFilter = button.dataset.templateFilter;
    this._updateActiveFilter(button);
    this._filterTemplates();
  }

  /**
   * Maneja el filtro de categoría
   * @private
   * @param {HTMLElement} button - Botón clickeado
   */
  _handleCategoryFilter(button) {
    this.currentCategory = button.dataset.templateCategory;
    this._updateActiveCategory(button);
    this._filterTemplates();
  }

  /**
   * Maneja la entrada de búsqueda
   * @private
   * @param {string} value - Valor de búsqueda
   */
  _handleSearchInput(value) {
    this.searchTerm = value;
    this._filterTemplates();
  }

  /**
   * Maneja la limpieza de búsqueda
   * @private
   */
  _handleClearSearch() {
    this.searchTerm = '';
    const searchInput = document.querySelector(this.selectors.searchInput);
    if (searchInput) {
      searchInput.value = '';
    }
    this._filterTemplates();
  }

  /**
   * Maneja la recarga de plantillas
   * @private
   */
  async _handleReload() {
    try {
      await this._reloadTemplates();
    } catch (error) {
      console.error('Error recargando plantillas:', error);
      this._showError('Error al recargar las plantillas');
    }
  }

  /**
   * Actualiza el filtro activo visualmente
   * @private
   * @param {HTMLElement} activeButton - Botón activo
   */
  _updateActiveFilter(activeButton) {
    document.querySelectorAll(this.selectors.priorityFilters).forEach(btn => {
      btn.classList.remove('active');
    });
    activeButton.classList.add('active');
  }

  /**
   * Actualiza la categoría activa visualmente
   * @private
   * @param {HTMLElement} activeButton - Botón activo
   */
  _updateActiveCategory(activeButton) {
    document.querySelectorAll(this.selectors.categoryFilters).forEach(btn => {
      btn.classList.remove('active');
    });
    activeButton.classList.add('active');
  }

  /**
   * Filtra las plantillas según los criterios actuales
   * @private
   */
  _filterTemplates() {
    this.filteredTemplates = this.templates.filter(template => {
      return this._matchesFilters(template);
    });

    this._renderTemplates();
  }

  /**
   * Verifica si una plantilla coincide con los filtros actuales
   * @private
   * @param {Object} template - Plantilla a verificar
   * @returns {boolean} True si coincide
   */
  _matchesFilters(template) {
    // Filtro por prioridad
    if (this.currentFilter !== 'all' && template.priority !== this.currentFilter) {
      return false;
    }

    // Filtro por categoría
    if (this.currentCategory !== 'all' && template.category !== this.currentCategory) {
      return false;
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(term);
      const matchesDescription = template.description.toLowerCase().includes(term);
      const matchesTags = template.tags.some(tag => tag.toLowerCase().includes(term));
      
      if (!matchesName && !matchesDescription && !matchesTags) {
        return false;
      }
    }

    return true;
  }

  /**
   * Renderiza las plantillas en el contenedor
   * @private
   */
  _renderTemplates() {
    const container = document.querySelector(this.selectors.container);
    if (!container) return;

    if (this.filteredTemplates.length === 0) {
      container.innerHTML = this._renderEmptyState();
      return;
    }

    container.innerHTML = this.filteredTemplates
      .map(template => this._renderTemplateCard(template))
      .join('');
    
    this._setupTemplateCardListeners();
  }

  /**
   * Renderiza el estado vacío
   * @private
   * @returns {string} HTML del estado vacío
   */
  _renderEmptyState() {
    return `
      <div class="text-center py-4">
        <i class="bi bi-search display-4 text-muted"></i>
        <p class="text-muted mt-2">No se encontraron plantillas que coincidan con los filtros</p>
      </div>
    `;
  }

  /**
   * Configura los listeners de las tarjetas de plantillas
   * @private
   */
  _setupTemplateCardListeners() {
    const container = document.querySelector(this.selectors.container);
    if (!container) return;

    container.querySelectorAll('.use-template-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const templateId = parseInt(e.target.dataset.templateId);
        this._useTemplate(templateId);
      });
    });
  }

  /**
   * Renderiza una tarjeta de plantilla
   * @private
   * @param {Object} template - Datos de la plantilla
   * @returns {string} HTML de la tarjeta
   */
  _renderTemplateCard(template) {
    const priorityConfig = this._getPriorityConfig(template.priority);
    const categoryIcon = this._getCategoryIcon(template.category);
    const checklist = this._renderChecklist(template.checklist);
    const tags = this._renderTags(template.tags);

    return `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card h-100 template-card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">${this._escapeHtml(template.name)}</h6>
              <span class="badge bg-${priorityConfig.color}">${priorityConfig.text}</span>
            </div>
            
            <p class="card-text small text-muted">${this._escapeHtml(template.description)}</p>
            
            <div class="mb-2">
              <i class="bi ${categoryIcon} me-1"></i>
              <span class="small">${this._escapeHtml(template.category)}</span>
            </div>

            ${template.estimatedDuration ? `
              <div class="mb-2">
                <i class="bi bi-clock me-1"></i>
                <span class="small">${template.estimatedDuration} min</span>
              </div>
            ` : ''}

            ${tags}

            ${checklist}
          </div>
          
          <div class="card-footer bg-transparent">
            <button class="btn btn-primary btn-sm w-100 use-template-btn" 
                    data-template-id="${template.id}">
              <i class="bi bi-plus-circle me-1"></i>Usar Plantilla
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Obtiene la configuración de prioridad
   * @private
   * @param {string} priority - Prioridad de la plantilla
   * @returns {Object} Configuración de prioridad
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
   * Obtiene el icono de categoría
   * @private
   * @param {string} category - Categoría de la plantilla
   * @returns {string} Clase del icono
   */
  _getCategoryIcon(category) {
    const icons = {
      trabajo: 'bi-briefcase',
      personal: 'bi-person',
      estudio: 'bi-book',
      salud: 'bi-heart',
      finanzas: 'bi-cash-coin',
      hogar: 'bi-house',
      proyectos: 'bi-lightbulb',
      otros: 'bi-three-dots'
    };
    return icons[category] || 'bi-tag';
  }

  /**
   * Renderiza la checklist
   * @private
   * @param {Array} checklist - Lista de tareas
   * @returns {string} HTML de la checklist
   */
  _renderChecklist(checklist) {
    if (!checklist || checklist.length === 0) return '';

    const items = checklist
      .map(item => `<li class="small text-muted">${this._escapeHtml(item)}</li>`)
      .join('');

    return `
      <div class="mb-3">
        <small class="text-muted">Checklist:</small>
        <ul class="list-unstyled mt-1">
          ${items}
        </ul>
      </div>
    `;
  }

  /**
   * Renderiza las etiquetas
   * @private
   * @param {Array} tags - Lista de etiquetas
   * @returns {string} HTML de las etiquetas
   */
  _renderTags(tags) {
    if (!tags || tags.length === 0) return '';

    const tagElements = tags
      .map(tag => `<span class="badge bg-secondary me-1">${this._escapeHtml(tag)}</span>`)
      .join('');

    return `<div class="mb-2">${tagElements}</div>`;
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
   * Usa una plantilla para crear una tarea
   * @private
   * @param {number} templateId - ID de la plantilla
   */
  _useTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    this._fillTaskForm(template);
    this._showSuccessNotification(template);
    this._closeModal();
    this._scrollToForm();
  }

  /**
   * Llena el formulario de tarea con datos de la plantilla
   * @private
   * @param {Object} template - Datos de la plantilla
   */
  _fillTaskForm(template) {
    const formElements = {
      taskInput: document.getElementById('newTask'),
      categorySelect: document.getElementById('taskCategory'),
      prioritySelect: document.getElementById('taskPriority'),
      dueDateInput: document.getElementById('taskDueDate')
    };

    if (formElements.taskInput) {
      formElements.taskInput.value = template.name;
    }
    
    if (formElements.categorySelect) {
      formElements.categorySelect.value = template.category;
    }
    
    if (formElements.prioritySelect) {
      formElements.prioritySelect.value = template.priority;
    }
    
    if (formElements.dueDateInput) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      formElements.dueDateInput.value = dueDate.toISOString().split('T')[0];
    }
  }

  /**
   * Muestra notificación de éxito
   * @private
   * @param {Object} template - Plantilla utilizada
   */
  _showSuccessNotification(template) {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(
        'Plantilla aplicada',
        `Se ha cargado la plantilla "${template.name}" en el formulario`
      );
    }
  }

  /**
   * Cierra el modal de plantillas
   * @private
   */
  _closeModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('templatesModal'));
    if (modal) {
      modal.hide();
    }
  }

  /**
   * Hace scroll al formulario
   * @private
   */
  _scrollToForm() {
    const form = document.getElementById('newTaskForm');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Actualiza las opciones de categoría en el formulario principal
   * @private
   */
  _updateCategoryOptions() {
    const categorySelect = document.getElementById('taskCategory');
    if (!categorySelect) return;

    const existingOptions = Array.from(categorySelect.options).map(opt => opt.value);
    
    this.templates.forEach(template => {
      if (!existingOptions.includes(template.category)) {
        const option = document.createElement('option');
        option.value = template.category;
        option.textContent = this._capitalizeFirst(template.category);
        categorySelect.appendChild(option);
      }
    });
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
   * Recarga las plantillas
   * @private
   * @returns {Promise<void>}
   */
  async _reloadTemplates() {
    // Limpiar caché
    if (window.apiService) {
      window.apiService.clearCacheKey('taskTemplates');
    }

    // Mostrar loading
    this._showLoadingState();

    // Recargar datos
    await this._loadTemplates();
    this._filterTemplates();
    this._updateCategoryOptions();

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
          <p class="mt-2">Cargando plantillas...</p>
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
        'Plantillas actualizadas',
        'Se han recargado las plantillas de tareas'
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
   * Obtiene estadísticas de las plantillas
   * @returns {Object} Estadísticas de plantillas
   */
  getTemplatesStats() {
    const stats = {
      total: this.templates.length,
      byCategory: {},
      byPriority: {}
    };

    this.templates.forEach(template => {
      // Por categoría
      if (!stats.byCategory[template.category]) {
        stats.byCategory[template.category] = 0;
      }
      stats.byCategory[template.category]++;

      // Por prioridad
      if (!stats.byPriority[template.priority]) {
        stats.byPriority[template.priority] = 0;
      }
      stats.byPriority[template.priority]++;
    });

    return stats;
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
window.taskTemplatesManager = new TaskTemplatesManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (window.taskTemplatesManager) {
    window.taskTemplatesManager.init();
  }
}); 