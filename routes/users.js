const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Configuración
const USERS_FILE = path.join(__dirname, '../data/users.json');

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

// Middleware de autenticación (importado desde auth.js)
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

// Middleware para verificar si es admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
};

// Función para cargar usuarios
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialUsers = {
        users: [],
        lastId: 0
      };
      await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
      await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2));
      return initialUsers;
    }
    throw error;
  }
}

// Función para guardar usuarios
async function saveUsers(usersData) {
  await fs.writeFile(USERS_FILE, JSON.stringify(usersData, null, 2));
}

// GET /api/users/profile - Obtener perfil del usuario actual
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const usersData = await loadUsers();
    const user = usersData.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Cuenta deshabilitada'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/profile - Actualizar perfil del usuario
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La biografía no puede exceder 500 caracteres'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('El tema debe ser light, dark o auto'),
  
  body('preferences.language')
    .optional()
    .isIn(['es', 'en'])
    .withMessage('El idioma debe ser es o en'),
  
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Las notificaciones deben ser true o false')
], handleValidationErrors, async (req, res) => {
  try {
    const { name, bio, preferences } = req.body;

    const usersData = await loadUsers();
    const userIndex = usersData.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const user = usersData.users[userIndex];

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Cuenta deshabilitada'
      });
    }

    // Actualizar campos permitidos
    if (name !== undefined) {
      user.name = name.trim();
    }

    if (bio !== undefined) {
      user.profile.bio = bio.trim();
    }

    if (preferences) {
      if (preferences.theme !== undefined) {
        user.profile.preferences.theme = preferences.theme;
      }
      if (preferences.language !== undefined) {
        user.profile.preferences.language = preferences.language;
      }
      if (preferences.notifications !== undefined) {
        user.profile.preferences.notifications = preferences.notifications;
      }
    }

    user.updatedAt = new Date().toISOString();
    await saveUsers(usersData);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Perfil actualizado exitosamente',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/users/upload-avatar - Subir avatar (simulado)
router.post('/upload-avatar', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí procesarías la imagen
    // Por ahora, simulamos la subida
    
    const usersData = await loadUsers();
    const userIndex = usersData.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const user = usersData.users[userIndex];
    
    // Simular URL de avatar
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    user.profile.avatar = avatarUrl;
    user.updatedAt = new Date().toISOString();
    
    await saveUsers(usersData);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Avatar actualizado exitosamente',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error subiendo avatar:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users - Obtener lista de usuarios (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    
    const usersData = await loadUsers();
    let filteredUsers = usersData.users;

    // Filtrar por búsqueda
    if (search) {
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtrar por rol
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    // Filtrar por estado
    if (status) {
      const isActive = status === 'active';
      filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
    }

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Remover contraseñas
    const usersWithoutPasswords = paginatedUsers.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      users: usersWithoutPasswords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredUsers.length / limit),
        totalUsers: filteredUsers.length,
        usersPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users/:id - Obtener usuario específico (solo admin)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const usersData = await loadUsers();
    const user = usersData.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// PUT /api/users/:id - Actualizar usuario (solo admin)
router.put('/:id', authenticateToken, requireAdmin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('El rol debe ser user o admin'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, role, isActive } = req.body;

    const usersData = await loadUsers();
    const userIndex = usersData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const user = usersData.users[userIndex];

    // Verificar email único si se está cambiando
    if (email && email !== user.email) {
      const existingUser = usersData.users.find(u => u.email === email && u.id !== userId);
      if (existingUser) {
        return res.status(409).json({
          error: 'El email ya está en uso',
          field: 'email'
        });
      }
      user.email = email.toLowerCase();
    }

    // Actualizar campos
    if (name !== undefined) {
      user.name = name.trim();
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    user.updatedAt = new Date().toISOString();
    await saveUsers(usersData);

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Usuario actualizado exitosamente',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// DELETE /api/users/:id - Eliminar usuario (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // No permitir eliminar el propio usuario
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    const usersData = await loadUsers();
    const userIndex = usersData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // En lugar de eliminar, desactivar la cuenta
    usersData.users[userIndex].isActive = false;
    usersData.users[userIndex].updatedAt = new Date().toISOString();
    
    await saveUsers(usersData);

    res.json({
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/users/stats - Estadísticas de usuarios (solo admin)
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersData = await loadUsers();
    const users = usersData.users;

    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      admins: users.filter(u => u.role === 'admin').length,
      regular: users.filter(u => u.role === 'user').length,
      registeredThisMonth: users.filter(u => {
        const createdAt = new Date(u.createdAt);
        const now = new Date();
        return createdAt.getMonth() === now.getMonth() && 
               createdAt.getFullYear() === now.getFullYear();
      }).length,
      lastRegistrations: users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt
        }))
    };

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 