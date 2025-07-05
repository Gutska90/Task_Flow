const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

// Mock de fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock de bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn()
}));

// Mock de jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn()
}));

// Mock de express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isBoolean: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn(),
  // Mock de middleware de validación
  middleware: jest.fn((req, res, next) => next())
}));

const app = express();
app.use(express.json());

// Importar las rutas después de los mocks
const authRoutes = require('../../../routes/auth');
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Resetear mocks específicos
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123'
      };

      // Mock de fs.readFile para simular archivo de usuarios vacío
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Usuario registrado exitosamente');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('name', 'Test User');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123'
      };

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{ email: 'test@example.com' }],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'El email ya está registrado');
    });

    test('should return validation errors', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'El nombre debe tener entre 2 y 50 caracteres', param: 'name' }
        ]
      });

      const userData = {
        name: 'T',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Datos inválidos');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPass123'
      };

      // Mock de bcrypt.compare para simular contraseña correcta
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-password',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Inicio de sesión exitoso');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      // Mock de bcrypt.compare para simular contraseña incorrecta
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-password',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    test('should return error for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'TestPass123'
      };

      // Mock de fs.readFile para simular archivo de usuarios vacío
      const existingUsers = {
        users: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sesión cerrada exitosamente');
    });

    test('should return error for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token de acceso requerido');
    });

    test('should return error for invalid token', async () => {
      // Mock de JWT verify para simular token inválido
      const jwt = require('jsonwebtoken');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Token inválido o expirado');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should get current user info successfully', async () => {
      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isActive: true,
          profile: {
            avatar: null,
            bio: '',
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
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 1);
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('name', 'Test User');
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
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('should handle forgot password request', async () => {
      const emailData = {
        email: 'test@example.com'
      };

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Si el email existe, recibirás instrucciones de recuperación');
    });

    test('should handle non-existent email gracefully', async () => {
      const emailData = {
        email: 'nonexistent@example.com'
      };

      // Mock de fs.readFile para simular archivo de usuarios vacío
      const existingUsers = {
        users: [],
        lastId: 0
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(emailData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Si el email existe, recibirás instrucciones de recuperación');
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'old-password',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123'
      };

      // Mock de JWT verify para simular token válido
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ id: 1, email: 'test@example.com' });

      // Mock de bcrypt.compare para simular contraseña actual correcta
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-old-password',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));
      fs.writeFile.mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Contraseña actualizada exitosamente');
    });

    test('should return error for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrong-password',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123'
      };

      // Mock de JWT verify para simular token válido
      const jwt = require('jsonwebtoken');
      jwt.verify.mockReturnValue({ id: 1, email: 'test@example.com' });

      // Mock de bcrypt.compare para simular contraseña actual incorrecta
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      // Mock de fs.readFile para simular usuario existente
      const existingUsers = {
        users: [{
          id: 1,
          email: 'test@example.com',
          password: 'hashed-old-password',
          name: 'Test User',
          isActive: true
        }],
        lastId: 1
      };
      fs.readFile.mockResolvedValue(JSON.stringify(existingUsers));

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(passwordData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Contraseña actual incorrecta');
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors', async () => {
      // Mock de fs.readFile para simular error del sistema de archivos
      fs.readFile.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPass123',
          confirmPassword: 'TestPass123'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error interno del servidor');
    });

    test('should handle validation errors', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Campo requerido', param: 'email' }
        ]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Datos inválidos');
      expect(response.body).toHaveProperty('details');
    });
  });
}); 