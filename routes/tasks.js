const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Configuración
const TASKS_FILE = path.join(__dirname, '../data/tasks.json');

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: errors.array()
    });
  }
  next();
};

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Función para cargar tareas
async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialTasks = {
        tasks: [],
        lastId: 0
      };
      await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
      await fs.writeFile(TASKS_FILE, JSON.stringify(initialTasks, null, 2));
      return initialTasks;
    }
    throw error;
  }
}

// Función para guardar tareas
async function saveTasks(tasksData) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasksData, null, 2));
}

// GET /api/tasks - Obtener tareas del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      priority = '', 
      category = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const tasksData = await loadTasks();
    
    // Filtrar tareas del usuario
    let userTasks = tasksData.tasks.filter(task => task.userId === req.user.id);

    // Filtrar por búsqueda
    if (search) {
      userTasks = userTasks.filter(task => 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtrar por estado
    if (status) {
      userTasks = userTasks.filter(task => task.status === status);
    }

    // Filtrar por prioridad
    if (priority) {
      userTasks = userTasks.filter(task => task.priority === priority);
    }

    // Filtrar por categoría
    if (category) {
      userTasks = userTasks.filter(task => task.category === category);
    }

    // Ordenar
    const validSortFields = ['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    userTasks.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Manejar fechas
      if (sortField === 'dueDate' || sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTasks = userTasks.slice(startIndex, endIndex);

    res.json({
      tasks: paginatedTasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(userTasks.length / limit),
        totalTasks: userTasks.length,
        tasksPerPage: parseInt(limit)
      },
      filters: {
        search,
        status,
        priority,
        category,
        sortBy: sortField,
        sortOrder: order
      }
    });

  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/tasks/:id - Obtener tarea específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    const tasksData = await loadTasks();
    const task = tasksData.tasks.find(t => t.id === taskId && t.userId === req.user.id);

    if (!task) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    res.json({ task });

  } catch (error) {
    console.error('Error obteniendo tarea:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/tasks - Crear nueva tarea
router.post('/', authenticateToken, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El título debe tener entre 1 y 100 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad debe ser low, medium, high o urgent'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('El estado debe ser pending, in-progress, completed o cancelled'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('La categoría no puede exceder 50 caracteres'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de vencimiento debe ser una fecha válida'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Cada tag debe tener entre 1 y 20 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority = 'medium', 
      status = 'pending',
      category = '',
      dueDate,
      tags = []
    } = req.body;

    const tasksData = await loadTasks();

    const newTask = {
      id: ++tasksData.lastId,
      userId: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority,
      status,
      category: category.trim(),
      dueDate: dueDate || null,
      tags: tags.filter(tag => tag.trim()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      checklist: [],
      notes: '',
      attachments: []
    };

    tasksData.tasks.push(newTask);
    await saveTasks(tasksData);

    res.status(201).json({
      message: 'Tarea creada exitosamente',
      task: newTask
    });

  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la tarea'
    });
  }
});

// PUT /api/tasks/:id - Actualizar tarea
router.put('/:id', authenticateToken, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El título debe tener entre 1 y 100 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('La prioridad debe ser low, medium, high o urgent'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('El estado debe ser pending, in-progress, completed o cancelled'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('La categoría no puede exceder 50 caracteres'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de vencimiento debe ser una fecha válida'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Cada tag debe tener entre 1 y 20 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { 
      title, 
      description, 
      priority, 
      status,
      category,
      dueDate,
      tags
    } = req.body;

    const tasksData = await loadTasks();
    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    const task = tasksData.tasks[taskIndex];

    // Actualizar campos
    if (title !== undefined) {
      task.title = title.trim();
    }
    if (description !== undefined) {
      task.description = description.trim();
    }
    if (priority !== undefined) {
      task.priority = priority;
    }
    if (status !== undefined) {
      task.status = status;
      // Actualizar completedAt si se marca como completada
      if (status === 'completed' && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      } else if (status !== 'completed') {
        task.completedAt = null;
      }
    }
    if (category !== undefined) {
      task.category = category.trim();
    }
    if (dueDate !== undefined) {
      task.dueDate = dueDate;
    }
    if (tags !== undefined) {
      task.tags = tags.filter(tag => tag.trim());
    }

    task.updatedAt = new Date().toISOString();
    await saveTasks(tasksData);

    res.json({
      message: 'Tarea actualizada exitosamente',
      task
    });

  } catch (error) {
    console.error('Error actualizando tarea:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    const tasksData = await loadTasks();
    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    tasksData.tasks.splice(taskIndex, 1);
    await saveTasks(tasksData);

    res.json({
      message: 'Tarea eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando tarea:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/tasks/:id/checklist - Agregar item al checklist
router.post('/:id/checklist', authenticateToken, [
  body('text')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('El texto del item debe tener entre 1 y 200 caracteres')
], handleValidationErrors, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { text } = req.body;

    const tasksData = await loadTasks();
    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    const task = tasksData.tasks[taskIndex];
    
    if (!task.checklist) {
      task.checklist = [];
    }

    const checklistItem = {
      id: Date.now(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    task.checklist.push(checklistItem);
    task.updatedAt = new Date().toISOString();
    
    await saveTasks(tasksData);

    res.json({
      message: 'Item agregado al checklist',
      item: checklistItem
    });

  } catch (error) {
    console.error('Error agregando item al checklist:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/tasks/:id/checklist/:itemId - Actualizar item del checklist
router.put('/:id/checklist/:itemId', authenticateToken, [
  body('text')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('El texto del item debe tener entre 1 y 200 caracteres'),
  
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed debe ser true o false')
], handleValidationErrors, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { text, completed } = req.body;

    const tasksData = await loadTasks();
    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    const task = tasksData.tasks[taskIndex];
    const itemIndex = task.checklist.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Item del checklist no encontrado'
      });
    }

    const item = task.checklist[itemIndex];

    if (text !== undefined) {
      item.text = text.trim();
    }
    if (completed !== undefined) {
      item.completed = completed;
    }

    task.updatedAt = new Date().toISOString();
    await saveTasks(tasksData);

    res.json({
      message: 'Item del checklist actualizado',
      item
    });

  } catch (error) {
    console.error('Error actualizando item del checklist:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/tasks/:id/checklist/:itemId - Eliminar item del checklist
router.delete('/:id/checklist/:itemId', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    const tasksData = await loadTasks();
    const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Tarea no encontrada'
      });
    }

    const task = tasksData.tasks[taskIndex];
    const itemIndex = task.checklist.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Item del checklist no encontrado'
      });
    }

    task.checklist.splice(itemIndex, 1);
    task.updatedAt = new Date().toISOString();
    
    await saveTasks(tasksData);

    res.json({
      message: 'Item del checklist eliminado'
    });

  } catch (error) {
    console.error('Error eliminando item del checklist:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/tasks/stats/overview - Estadísticas de tareas del usuario
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const tasksData = await loadTasks();
    const userTasks = tasksData.tasks.filter(task => task.userId === req.user.id);

    const stats = {
      total: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in-progress').length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      cancelled: userTasks.filter(t => t.status === 'cancelled').length,
      overdue: userTasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate) < new Date();
      }).length,
      highPriority: userTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      completedThisWeek: userTasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return completedDate >= weekAgo;
      }).length,
      categories: {},
      priorities: {
        low: userTasks.filter(t => t.priority === 'low').length,
        medium: userTasks.filter(t => t.priority === 'medium').length,
        high: userTasks.filter(t => t.priority === 'high').length,
        urgent: userTasks.filter(t => t.priority === 'urgent').length
      }
    };

    // Contar por categorías
    userTasks.forEach(task => {
      const category = task.category || 'Sin categoría';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/tasks/bulk-update - Actualización masiva de tareas
router.post('/bulk-update', authenticateToken, [
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('Debe seleccionar al menos una tarea'),
  
  body('taskIds.*')
    .isInt()
    .withMessage('Los IDs de tareas deben ser números enteros'),
  
  body('updates')
    .isObject()
    .withMessage('Las actualizaciones deben ser un objeto')
], handleValidationErrors, async (req, res) => {
  try {
    const { taskIds, updates } = req.body;

    const tasksData = await loadTasks();
    let updatedCount = 0;

    for (const taskId of taskIds) {
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);
      
      if (taskIndex !== -1) {
        const task = tasksData.tasks[taskIndex];
        
        // Aplicar actualizaciones permitidas
        if (updates.status !== undefined) {
          task.status = updates.status;
          if (updates.status === 'completed' && !task.completedAt) {
            task.completedAt = new Date().toISOString();
          } else if (updates.status !== 'completed') {
            task.completedAt = null;
          }
        }
        
        if (updates.priority !== undefined) {
          task.priority = updates.priority;
        }
        
        if (updates.category !== undefined) {
          task.category = updates.category;
        }

        task.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    }

    await saveTasks(tasksData);

    res.json({
      message: `${updatedCount} tareas actualizadas exitosamente`,
      updatedCount
    });

  } catch (error) {
    console.error('Error en actualización masiva:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 