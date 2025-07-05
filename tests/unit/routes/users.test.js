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
const userRoutes = require('../../../routes/users');
app.use('/api/users', userRoutes);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Resetear mocks específicos
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('GET /api/users/profile', () => {
    test('should get user profile successfully', async () => {
      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
          profile: {
            avatar: null,
            bio: 'Test bio',
            preferences: {
              theme: 'light',
              language: 'es',
              notifications: true
            }
          }
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('name', 'Test User');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('profile');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return error for non-existent user', async () => {
      // Mock de fs.readFile para simular archivo de usuarios vacío
      const existingUsers = {
        users: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('should update user profile successfully', async () => {
      const profileData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: false
        }
      };

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
          profile: {
            avatar: null,
            bio: 'Old bio',
            preferences: {
              theme: 'light',
              language: 'es',
              notifications: true
            }
          }
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(profileData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Perfil actualizado exitosamente');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('name', 'Updated Name');
      expect(response.body.user).toHaveProperty('profile.bio', 'Updated bio');
      expect(response.body.user).toHaveProperty('profile.preferences.theme', 'dark');
    });

    test('should return validation errors', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'El nombre debe tener entre 2 y 50 caracteres', param: 'name' }
        ]
      });

      const profileData = {
        name: 'T',
        bio: 'Valid bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(profileData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Datos inválidos');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('DELETE /api/users/profile', () => {
    test('should delete user account successfully', async () => {
      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Cuenta eliminada exitosamente');
    });
  });

  describe('GET /api/users/stats', () => {
    test('should get user statistics successfully', async () => {
      // Mock de fs.readFile para simular usuario y tareas existentes
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };

      const existingTasks = {
        tasks: [
          { id: 1, userId: 1, status: 'completed', priority: 'high', createdAt: '2024-01-01' },
          { id: 2, userId: 1, status: 'pending', priority: 'medium', createdAt: '2024-01-02' },
          { id: 3, userId: 1, status: 'in-progress', priority: 'low', createdAt: '2024-01-03' }
        ],
        lastId: 3
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(existingUsers))
        .mockResolvedValueOnce(JSON.stringify(existingTasks));

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalTasks', 3);
      expect(response.body.stats).toHaveProperty('completedTasks', 1);
      expect(response.body.stats).toHaveProperty('pendingTasks', 1);
      expect(response.body.stats).toHaveProperty('inProgressTasks', 1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token de acceso requerido');
    });

    test('should handle file system errors', async () => {
      // Mock de fs.readFile para simular error del sistema de archivos
      fs.readFile.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });
}); 