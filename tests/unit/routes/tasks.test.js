const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;

// Mock de fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock de jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

// Mock de express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isBoolean: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

const app = express();
app.use(express.json());

// Importar las rutas después de los mocks
const taskRoutes = require('../../../routes/tasks');
app.use('/api/tasks', taskRoutes);

describe('Task Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Resetear mocks específicos
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('GET /api/tasks', () => {
    test('should get all tasks for user successfully', async () => {
      // Mock de fs.readFile para simular tareas existentes
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Task 1', status: 'pending', priority: 'high' },
          { id: 2, userId: 1, title: 'Task 2', status: 'completed', priority: 'medium' },
          { id: 3, userId: 2, title: 'Task 3', status: 'pending', priority: 'low' }
        ],
        lastId: 3
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(2); // Solo las tareas del usuario 1
      expect(response.body.tasks[0]).toHaveProperty('title', 'Task 1');
      expect(response.body.tasks[1]).toHaveProperty('title', 'Task 2');
    });

    test('should return empty array for user with no tasks', async () => {
      // Mock de fs.readFile para simular archivo de tareas vacío
      const existingTasks = {
        tasks: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(0);
    });

    test('should filter tasks by status', async () => {
      // Mock de fs.readFile para simular tareas existentes
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Task 1', status: 'pending', priority: 'high' },
          { id: 2, userId: 1, title: 'Task 2', status: 'completed', priority: 'medium' },
          { id: 3, userId: 1, title: 'Task 3', status: 'pending', priority: 'low' }
        ],
        lastId: 3
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks.every(task => task.status === 'pending')).toBe(true);
    });
  });

  describe('GET /api/tasks/:id', () => {
    test('should get task by id successfully', async () => {
      // Mock de fs.readFile para simular tarea existente
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Task 1', description: 'Test description', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('id', 1);
      expect(response.body.task).toHaveProperty('title', 'Task 1');
      expect(response.body.task).toHaveProperty('description', 'Test description');
    });

    test('should return error for non-existent task', async () => {
      // Mock de fs.readFile para simular archivo de tareas vacío
      const existingTasks = {
        tasks: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Tarea no encontrada');
    });

    test('should return error for unauthorized access', async () => {
      // Mock de fs.readFile para simular tarea de otro usuario
      const existingTasks = {
        tasks: [
          { id: 1, userId: 2, title: 'Task 1', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'No tienes permisos para acceder a esta tarea');
    });
  });

  describe('POST /api/tasks', () => {
    test('should create task successfully', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        dueDate: '2024-12-31',
        category: 'work'
      };

      // Mock de fs.readFile para simular archivo de tareas vacío
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Tarea creada exitosamente');
      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('title', 'New Task');
      expect(response.body.task).toHaveProperty('userId', 1);
      expect(response.body.task).toHaveProperty('status', 'pending');
    });

    test('should return validation errors', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'El título es requerido', param: 'title' }
        ]
      });

      const taskData = {
        description: 'Task description',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send(taskData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Datos inválidos');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    test('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        status: 'completed',
        priority: 'medium'
      };

      // Mock de fs.readFile para simular tarea existente
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Original Task', description: 'Original description', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .put('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Tarea actualizada exitosamente');
      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('title', 'Updated Task');
      expect(response.body.task).toHaveProperty('status', 'completed');
    });

    test('should return error for non-existent task', async () => {
      // Mock de fs.readFile para simular archivo de tareas vacío
      const existingTasks = {
        tasks: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const updateData = {
        title: 'Updated Task',
        status: 'completed'
      };

      const response = await request(app)
        .put('/api/tasks/999')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Tarea no encontrada');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    test('should delete task successfully', async () => {
      // Mock de fs.readFile para simular tarea existente
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Task to delete', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .delete('/api/tasks/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Tarea eliminada exitosamente');
    });

    test('should return error for non-existent task', async () => {
      // Mock de fs.readFile para simular archivo de tareas vacío
      const existingTasks = {
        tasks: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .delete('/api/tasks/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Tarea no encontrada');
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    test('should update task status successfully', async () => {
      const statusData = {
        status: 'completed'
      };

      // Mock de fs.readFile para simular tarea existente
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Task 1', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .patch('/api/tasks/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send(statusData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Estado de tarea actualizado exitosamente');
      expect(response.body).toHaveProperty('task');
      expect(response.body.task).toHaveProperty('status', 'completed');
    });

    test('should return error for invalid status', async () => {
      const statusData = {
        status: 'invalid-status'
      };

      const response = await request(app)
        .patch('/api/tasks/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send(statusData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Estado inválido');
    });
  });

  describe('GET /api/tasks/search', () => {
    test('should search tasks successfully', async () => {
      // Mock de fs.readFile para simular tareas existentes
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Work Task', description: 'Important work task', status: 'pending', priority: 'high' },
          { id: 2, userId: 1, title: 'Personal Task', description: 'Personal todo', status: 'completed', priority: 'medium' },
          { id: 3, userId: 2, title: 'Other Task', description: 'Another task', status: 'pending', priority: 'low' }
        ],
        lastId: 3
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks/search?q=work')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0]).toHaveProperty('title', 'Work Task');
    });

    test('should return empty results for no matches', async () => {
      // Mock de fs.readFile para simular tareas existentes
      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, title: 'Work Task', description: 'Important work task', status: 'pending', priority: 'high' }
        ],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/tasks/search?q=nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(0);
    });
  });

  describe('POST /api/tasks/bulk', () => {
    test('should create multiple tasks successfully', async () => {
      const tasksData = [
        { title: 'Task 1', description: 'First task', priority: 'high' },
        { title: 'Task 2', description: 'Second task', priority: 'medium' }
      ];

      // Mock de fs.readFile para simular archivo de tareas vacío
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/api/tasks/bulk')
        .set('Authorization', 'Bearer valid-token')
        .send({ tasks: tasksData })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Tareas creadas exitosamente');
      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks[0]).toHaveProperty('title', 'Task 1');
      expect(response.body.tasks[1]).toHaveProperty('title', 'Task 2');
    });

    test('should return error for invalid tasks array', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Se requiere un array de tareas', param: 'tasks' }
        ]
      });

      const response = await request(app)
        .post('/api/tasks/bulk')
        .set('Authorization', 'Bearer valid-token')
        .send({ tasks: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Datos inválidos');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token de acceso requerido');
    });

    test('should handle invalid token', async () => {
      // Mock de fs.readFile para simular error del sistema de archivos
      fs.readFile.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Token inválido o expirado');
    });

    test('should handle file system errors', async () => {
      // Mock de fs.readFile para simular error del sistema de archivos
      fs.readFile.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });
}); 