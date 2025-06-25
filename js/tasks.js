// Clase para manejar las tareas
class TaskManager {
  constructor() {
    this.currentUser = localStorage.getItem('currentUser');
    this.tasks = JSON.parse(localStorage.getItem(`tasks_${this.currentUser}`)) || [];
    this.currentFilter = 'all';
    this.currentCategory = 'all';
    this.currentSort = 'date';
    this.searchTerm = '';
    
    this.initializeEventListeners();
    this.updateUI();
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

  addTask() {
    const text = document.getElementById('newTask').value.trim();
    const category = document.getElementById('taskCategory').value;
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;

    if (!text || !category || !priority || !dueDate) return;

    const task = {
      id: Date.now(),
      text,
      category,
      priority,
      dueDate,
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
    document.getElementById('editTaskText').value = task.text;
    document.getElementById('editTaskCategory').value = task.category;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskDueDate').value = task.dueDate;

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
  }

  saveEditedTask() {
    const taskId = parseInt(document.getElementById('editTaskId').value);
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;

    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      text: document.getElementById('editTaskText').value.trim(),
      category: document.getElementById('editTaskCategory').value,
      priority: document.getElementById('editTaskPriority').value,
      dueDate: document.getElementById('editTaskDueDate').value
    };

    this.saveTasks();
    bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
    this.updateUI();
  }

  deleteTask(taskId) {
    if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
      this.tasks = this.tasks.filter(task => task.id !== taskId);
      this.saveTasks();
      this.updateUI();
    }
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.updateUI();
    }
  }

  saveTasks() {
    localStorage.setItem(`tasks_${this.currentUser}`, JSON.stringify(this.tasks));
  }

  getFilteredTasks() {
    let filteredTasks = [...this.tasks];

    // Aplicar búsqueda
    if (this.searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.text.toLowerCase().includes(this.searchTerm)
      );
    }

    // Aplicar filtros
    if (this.currentFilter === 'pending') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (this.currentFilter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed);
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

  updateTaskList() {
    const taskList = document.getElementById('taskList');
    const filteredTasks = this.getFilteredTasks();
    
    taskList.innerHTML = filteredTasks.map(task => {
      const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
      const dueDateClass = isOverdue ? 'overdue' : '';
      
      return `
        <div class="list-group-item task-item priority-${task.priority}">
          <div class="d-flex justify-content-between align-items-center">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="taskManager.toggleTask(${task.id})">
              <label class="form-check-label ${task.completed ? 'text-decoration-line-through' : ''}">
                ${task.text}
              </label>
            </div>
            <div class="task-actions">
              <span class="badge bg-secondary category-badge me-2">${task.category}</span>
              <span class="due-date ${dueDateClass} me-2">
                <i class="bi bi-calendar"></i> ${new Date(task.dueDate).toLocaleDateString()}
              </span>
              <button class="btn btn-sm btn-outline-primary me-1" onclick="taskManager.editTask(${task.id})">
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

  updateStats() {
    const stats = {
      pending: 0,
      completed: 0,
      overdue: 0,
      byCategory: {}
    };

    this.tasks.forEach(task => {
      if (task.completed) {
        stats.completed++;
      } else {
        stats.pending++;
        if (new Date(task.dueDate) < new Date()) {
          stats.overdue++;
        }
      }

      stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1;
    });

    // Actualizar contadores
    document.getElementById('pendingTasks').textContent = stats.pending;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('overdueTasks').textContent = stats.overdue;

    // Actualizar estadísticas por categoría
    const categoryStats = document.getElementById('categoryStats');
    categoryStats.innerHTML = Object.entries(stats.byCategory)
      .map(([category, count]) => `
        <div class="d-flex justify-content-between mb-2">
          <span>${category.charAt(0).toUpperCase() + category.slice(1)}:</span>
          <span class="badge bg-secondary">${count}</span>
        </div>
      `).join('');
  }

  updateUI() {
    this.updateTaskList();
    this.updateStats();
  }
}

// Inicializar el administrador de tareas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Mostrar el nombre del usuario actual
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    document.getElementById('welcomeUser').textContent = `Bienvenido, ${currentUser}`;
  }

  // Inicializar el administrador de tareas
  window.taskManager = new TaskManager();

  // Manejar el cierre de sesión
  document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  });
}); 