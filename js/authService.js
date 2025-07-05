/**
 * Servicio de Autenticación para TaskFlow
 * Maneja la comunicación con el backend para autenticación y gestión de usuarios
 */
class AuthService {
  constructor() {
    this.baseURL = window.location.origin;
    this.apiURL = `${this.baseURL}/api`;
    this.tokenKey = 'taskflow_token';
    this.userKey = 'taskflow_user';
    this.token = this.getStoredToken();
    this.user = this.getStoredUser();
    
    // Configurar interceptores para requests
    this.setupInterceptors();
  }

  /**
   * Configurar interceptores para manejar tokens automáticamente
   */
  setupInterceptors() {
    // Interceptor para agregar token a requests
    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
      if (url.startsWith(this.apiURL) && this.token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        };
      }
      
      try {
        const response = await originalFetch(url, options);
        
        // Si el token expiró, limpiar y redirigir
        if (response.status === 401 || response.status === 403) {
          this.logout();
          window.location.href = '/login';
        }
        
        return response;
      } catch (error) {
        console.error('Error en fetch:', error);
        throw error;
      }
    };
  }

  /**
   * Obtener token almacenado
   */
  getStoredToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Obtener usuario almacenado
   */
  getStoredUser() {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Almacenar token y usuario
   */
  storeAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Limpiar datos de autenticación
   */
  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Obtener token actual
   */
  getCurrentToken() {
    return this.token;
  }

  /**
   * Registrar nuevo usuario
   */
  async register(userData) {
    try {
      const response = await fetch(`${this.apiURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      // Almacenar datos de autenticación
      this.storeAuth(data.token, data.user);

      return {
        success: true,
        message: data.message,
        user: data.user
      };

    } catch (error) {
      console.error('Error en registro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Iniciar sesión
   */
  async login(credentials) {
    try {
      const response = await fetch(`${this.apiURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el inicio de sesión');
      }

      // Almacenar datos de autenticación
      this.storeAuth(data.token, data.user);

      return {
        success: true,
        message: data.message,
        user: data.user
      };

    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      if (this.token) {
        await fetch(`${this.apiURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      this.clearAuth();
    }
  }

  /**
   * Obtener información del usuario actual
   */
  async getCurrentUserInfo() {
    try {
      const response = await fetch(`${this.apiURL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo información del usuario');
      }

      // Actualizar usuario almacenado
      this.user = data.user;
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      return {
        success: true,
        user: data.user
      };

    } catch (error) {
      console.error('Error obteniendo información del usuario:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(profileData) {
    try {
      const response = await fetch(`${this.apiURL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando perfil');
      }

      // Actualizar usuario almacenado
      this.user = data.user;
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      return {
        success: true,
        message: data.message,
        user: data.user
      };

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(passwordData) {
    try {
      const response = await fetch(`${this.apiURL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando contraseña');
      }

      return {
        success: true,
        message: data.message
      };

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${this.apiURL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error solicitando recuperación');
      }

      return {
        success: true,
        message: data.message
      };

    } catch (error) {
      console.error('Error solicitando recuperación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(token, password) {
    try {
      const response = await fetch(`${this.apiURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, password, confirmPassword: password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error restableciendo contraseña');
      }

      return {
        success: true,
        message: data.message
      };

    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Subir avatar (simulado)
   */
  async uploadAvatar() {
    try {
      const response = await fetch(`${this.apiURL}/users/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error subiendo avatar');
      }

      // Actualizar usuario almacenado
      this.user = data.user;
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      return {
        success: true,
        message: data.message,
        user: data.user
      };

    } catch (error) {
      console.error('Error subiendo avatar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verificar si el token está próximo a expirar
   */
  isTokenExpiringSoon() {
    if (!this.token) return false;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convertir a milisegundos
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      
      // Considerar que expira pronto si faltan menos de 1 hora
      return timeUntilExpiration < 60 * 60 * 1000;
    } catch (error) {
      console.error('Error verificando expiración del token:', error);
      return false;
    }
  }

  /**
   * Renovar token (si es necesario)
   */
  async refreshTokenIfNeeded() {
    if (this.isTokenExpiringSoon()) {
      // En una implementación real, aquí renovarías el token
      // Por ahora, solo verificamos el estado actual
      const result = await this.getCurrentUserInfo();
      if (!result.success) {
        this.logout();
        return false;
      }
    }
    return true;
  }

  /**
   * Validar datos de registro
   */
  validateRegistrationData(data) {
    const errors = {};

    // Validar nombre
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (data.name.trim().length > 50) {
      errors.name = 'El nombre no puede exceder 50 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(data.name)) {
      errors.name = 'El nombre solo puede contener letras y espacios';
    }

    // Validar email
    if (!data.email) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'El email no es válido';
    }

    // Validar contraseña
    if (!data.password) {
      errors.password = 'La contraseña es requerida';
    } else if (data.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.password = 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
    }

    // Validar confirmación de contraseña
    if (!data.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validar datos de login
   */
  validateLoginData(data) {
    const errors = {};

    if (!data.email) {
      errors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'El email no es válido';
    }

    if (!data.password) {
      errors.password = 'La contraseña es requerida';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Mostrar notificación de error
   */
  showError(message) {
    // Usar el sistema de notificaciones existente si está disponible
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      alert(message);
    }
  }

  /**
   * Mostrar notificación de éxito
   */
  showSuccess(message) {
    if (window.showNotification) {
      window.showNotification(message, 'success');
    } else {
      alert(message);
    }
  }
}

// Crear instancia global
window.authService = new AuthService();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
} 