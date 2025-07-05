const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Configuración
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';
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

// Función para cargar usuarios
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si el archivo no existe, crear estructura inicial
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

// Función para generar token JWT
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Función para verificar token JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  req.user = decoded;
  next();
};

// POST /api/auth/register - Registro de usuario
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
], handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Cargar usuarios existentes
    const usersData = await loadUsers();

    // Verificar si el email ya existe
    const existingUser = usersData.users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'El email ya está registrado',
        field: 'email'
      });
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear nuevo usuario
    const newUser = {
      id: ++usersData.lastId,
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    };

    // Guardar usuario
    usersData.users.push(newUser);
    await saveUsers(usersData);

    // Generar token
    const token = generateToken(newUser);

    // Respuesta exitosa (sin contraseña)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo completar el registro'
    });
  }
});

// POST /api/auth/login - Inicio de sesión
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cargar usuarios
    const usersData = await loadUsers();

    // Buscar usuario
    const user = usersData.users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        field: 'email'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Cuenta deshabilitada',
        field: 'email'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        field: 'password'
      });
    }

    // Actualizar última conexión
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    await saveUsers(usersData);

    // Generar token
    const token = generateToken(user);

    // Respuesta exitosa (sin contraseña)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Inicio de sesión exitoso',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo completar el inicio de sesión'
    });
  }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, (req, res) => {
  // En una implementación real, aquí invalidarías el token
  // Por ahora, solo respondemos exitosamente
  res.json({
    message: 'Sesión cerrada exitosamente'
  });
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
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
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const usersData = await loadUsers();
    const user = usersData.users.find(u => u.email === email.toLowerCase());

    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        message: 'Si el email existe, recibirás instrucciones de recuperación'
      });
    }

    // Generar token de recuperación (expira en 1 hora)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email, type: 'reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // En una implementación real, aquí enviarías un email
    // Por ahora, solo simulamos el proceso
    console.log(`Token de recuperación para ${email}: ${resetToken}`);

    res.json({
      message: 'Si el email existe, recibirás instrucciones de recuperación'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/reset-password - Cambiar contraseña con token
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Token requerido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
], handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'reset') {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    const usersData = await loadUsers();
    const user = usersData.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Actualizar contraseña
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await saveUsers(usersData);

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    console.error('Error en reset-password:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/change-password - Cambiar contraseña (usuario autenticado)
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    })
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const usersData = await loadUsers();
    const user = usersData.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Contraseña actual incorrecta',
        field: 'currentPassword'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();
    await saveUsers(usersData);

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en change-password:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 