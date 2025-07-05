// Clase para manejar las tareas con integración backend
class TaskManager {
  constructor() {
    this.currentUser = localStorage.getItem('currentUser');
    this.tasks = [];
    this.currentFilter = 'all';
    this.currentCategory = 'all';
    this.currentSort = 'date';
    this.searchTerm = '';
    this.isLoading = false;
    
    this.initializeEventListeners();
    this.loadTasks();
  }

  async loadTasks() {
    this.isLoading = true;
    this.updateUI();
    
    try {
      if (window.authService && window.authService.isAuthenticated()) {
        // Usar backend
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': `Bearer ${window.authService.getCurrentToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.tasks = data.tasks || [];
        } else {
          console.error('Error cargando tareas del backend:', response.status);
          // Fallback a localStorage
          this.loadFromLocalStorage();
        }
      } else {
        // Usar localStorage
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error cargando tareas:', error);
      this.loadFromLocalStorage();
    } finally {
      this.isLoading = false;
      this.updateUI();
    }
  }

  loadFromLocalStorage() {
    this.tasks = JSON.parse(localStorage.getItem(`tasks_${this.currentUser}`)) || [];
  }

  async saveTasks() {
    try {
      if (window.authService && window.authService.isAuthenticated()) {
        // Los cambios se guardan automáticamente en el backend
        // No necesitamos hacer nada aquí
      } else {
        // Guardar en localStorage
        localStorage.setItem(`tasks_${this.currentUser}`, JSON.stringify(this.tasks));
      }
    } catch (error) {
      console.error('Error guardando tareas:', error);
      // Fallback a localStorage
      localStorage.setItem(`tasks_${this.currentUser}`, JSON.stringify(this.tasks));
    }
  }

  initializeEventListeners() {
    // Formulario de nueva tarea
    document.getElementById('newTaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTask();
    });

    // Búsqueda
    document.getElementById('searchTask').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.updateUI();
    });

    document.getElementById('clearSearch').addEventListener('click', () => {
      document.getElementById('searchTask').value = '';
      this.searchTerm = '';
      this.updateUI();
    });

    // Filtros
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.addEventListener('click', (e) => {
        document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.updateUI();
      });
    });

    // Categorías
    document.querySelectorAll('[data-category]').forEach(button => {
      button.addEventListener('click', (e) => {
        document.querySelectorAll('[data-category]').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.updateUI();
      });
    });

    // Ordenamiento
    document.querySelectorAll('[data-sort]').forEach(item => {
      item.addEventListener('click', (e) => {
        this.currentSort = e.target.dataset.sort;
        this.updateUI();
      });
    });

    // Vistas (Todas, Pendientes, Completadas)
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('[data-view]').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.view;
        this.updateUI();
      });
    });

    // Modal de edición
    document.getElementById('saveEditTask').addEventListener('click', () => {
      this.saveEditedTask();
    });
  }

  async addTask() {
    const text = document.getElementById('newTask').value.trim();
    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;

    if (!text || !category || !priority || !dueDate) return;

    const taskData = {
      title: text,
      description: '',
      category: category,
      priority: priority,
      dueDate: dueDate,
      status: 'pending'
    };

    try {
      if (window.authService && window.authService.isAuthenticated()) {
        // Crear tarea en el backend
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.authService.getCurrentToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskData)
        });

        if (response.ok) {
          const result = await response.json();
          this.tasks.push(result.task);
          document.getElementById('newTaskForm').reset();
          this.updateUI();
        } else {
          console.error('Error creando tarea:', response.status);
          // Fallback a localStorage
          this.addTaskToLocalStorage(taskData);
        }
      } else {
        // Usar localStorage
        this.addTaskToLocalStorage(taskData);
      }
    } catch (error) {
      console.error('Error creando tarea:', error);
      this.addTaskToLocalStorage(taskData);
    }
  }

  addTaskToLocalStorage(taskData) {
    const task = {
      id: Date.now(),
      text: taskData.title,
      category: taskData.category,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };

    this.tasks.push(task);
    this.saveTasks();
    document.getElementById('newTaskForm').reset();
    this.updateUI();
  }

  editTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskText').value = task.text || task.title;
    document.getElementById('editTaskCategory').value = task.category;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDueDate').value = task.dueDate;

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
  }

  async saveEditedTask() {
    const taskId = parseInt(document.getElementById('editTaskId').value);
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;

    const updatedTask = {
      title: document.getElementById('editTaskText').value.trim(),
      category: document.getElementById('editTaskCategory').value,
      priority: document.getElementById('editTaskPriority').value,
      dueDate: document.getElementById('editTaskDueDate').value
    };

    try {
      if (window.authService && window.authService.isAuthenticated()) {
        // Actualizar tarea en el backend
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${window.authService.getCurrentToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedTask)
        });

        if (response.ok) {
          const result = await response.json();
          this.tasks[taskIndex] = result.task;
          bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
          this.updateUI();
        } else {
          console.error('Error actualizando tarea:', response.status);
          // Fallback a localStorage
          this.updateTaskInLocalStorage(taskIndex, updatedTask);
        }
      } else {
        // Usar localStorage
        this.updateTaskInLocalStorage(taskIndex, updatedTask);
      }
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      this.updateTaskInLocalStorage(taskIndex, updatedTask);
    }
  }

  updateTaskInLocalStorage(taskIndex, updatedTask) {
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      text: updatedTask.title,
      category: updatedTask.category,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate
    };

    this.saveTasks();
    bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
    this.updateUI();
  }

  async deleteTask(taskId) {
    if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
      try {
        if (window.authService && window.authService.isAuthenticated()) {
          // Eliminar tarea del backend
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${window.authService.getCurrentToken()}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.updateUI();
          } else {
            console.error('Error eliminando tarea:', response.status);
            // Fallback a localStorage
            this.deleteTaskFromLocalStorage(taskId);
          }
        } else {
          // Usar localStorage
          this.deleteTaskFromLocalStorage(taskId);
        }
      } catch (error) {
        console.error('Error eliminando tarea:', error);
        this.deleteTaskFromLocalStorage(taskId);
      }
    }
  }

  deleteTaskFromLocalStorage(taskId) {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    this.saveTasks();
    this.updateUI();
  }

  async toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.completed ? 'pending' : 'completed';
    const updateData = { status: newStatus };

    try {
      if (window.authService && window.authService.isAuthenticated()) {
        // Actualizar estado en el backend
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${window.authService.getCurrentToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const result = await response.json();
          const taskIndex = this.tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            this.tasks[taskIndex] = result.task;
          }
          this.updateUI();
        } else {
          console.error('Error actualizando estado:', response.status);
          // Fallback a localStorage
          this.toggleTaskInLocalStorage(taskId);
        }
      } else {
        // Usar localStorage
        this.toggleTaskInLocalStorage(taskId);
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      this.toggleTaskInLocalStorage(taskId);
    }
  }

  toggleTaskInLocalStorage(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.updateUI();
    }
  }

  getFilteredTasks() {
    let filteredTasks = [...this.tasks];

    // Aplicar búsqueda
    if (this.searchTerm) {
      filteredTasks = filteredTasks.filter(task => {
        const text = task.text || task.title || '';
        return text.toLowerCase().includes(this.searchTerm);
      });
    }

    // Aplicar filtros
    if (this.currentFilter === 'pending') {
      filteredTasks = filteredTasks.filter(task => !task.completed && task.status !== 'completed');
    } else if (this.currentFilter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed || task.status === 'completed');
    }

    // Aplicar filtro de prioridad
    if (this.currentFilter !== 'all' && ['high', 'medium', 'low'].includes(this.currentFilter)) {
      filteredTasks = filteredTasks.filter(task => task.priority === this.currentFilter);
    }

    // Aplicar filtro de categoría
    if (this.currentCategory !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.category === this.currentCategory);
    }

    // Aplicar ordenamiento
    switch (this.currentSort) {
      case 'date':
        filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'category':
        filteredTasks.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return filteredTasks;
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(task => task.completed || task.status === 'completed').length;
    const pending = total - completed;
    const overdue = this.tasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      return (task.completed === false && task.status !== 'completed') && dueDate < today;
    }).length;

    // Actualizar estadísticas en la UI
    const statsElements = document.querySelectorAll('.task-stats');
    statsElements.forEach(element => {
      element.innerHTML = `
        <div class="row text-center">
          <div class="col-3">
            <div class="text-primary fw-bold">${total}</div>
            <small>Total</small>
          </div>
          <div class="col-3">
            <div class="text-warning fw-bold">${pending}</div>
            <small>Pendientes</small>
          </div>
          <div class="col-3">
            <div class="text-success fw-bold">${completed}</div>
            <small>Completadas</small>
          </div>
          <div class="col-3">
            <div class="text-danger fw-bold">${overdue}</div>
            <small>Vencidas</small>
          </div>
        </div>
      `;
    });
  }

  updateUI() {
    if (this.isLoading) {
      document.getElementById('taskList').innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">Cargando tareas...</p>
        </div>
      `;
      return;
    }

    const filteredTasks = this.getFilteredTasks();
    const taskList = document.getElementById('taskList');
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-inbox display-1 text-muted"></i>
          <p class="mt-2 text-muted">No hay tareas para mostrar</p>
        </div>
      `;
    } else {
      taskList.innerHTML = filteredTasks.map(task => {
        const isCompleted = task.completed || task.status === 'completed';
        const isOverdue = !isCompleted && new Date(task.dueDate) < new Date();
        const priorityClass = `priority-${task.priority}`;
        const completedClass = isCompleted ? 'text-decoration-line-through text-muted' : '';
        const overdueClass = isOverdue ? 'overdue' : '';
        
        return `
          <div class="task-item card mb-2 ${priorityClass}">
            <div class="card-body d-flex justify-content-between align-items-center">
              <div class="flex-grow-1">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" 
                         ${isCompleted ? 'checked' : ''} 
                         onchange="taskManager.toggleTask(${task.id})">
                  <label class="form-check-label ${completedClass}">
                    ${task.text || task.title}
                  </label>
                </div>
                <div class="mt-1">
                  <span class="badge bg-secondary category-badge">${task.category}</span>
                  <span class="badge bg-${task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}">${task.priority}</span>
                  <span class="due-date ${overdueClass}">Vence: ${new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="task-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="taskManager.editTask(${task.id})">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="taskManager.deleteTask(${task.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    this.updateStats();
  }
}

// Inicializar el gestor de tareas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.taskManager = new TaskManager();
}); 