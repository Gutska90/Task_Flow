const AuthService = require('../../js/authService');

// Mock de fetch global
global.fetch = jest.fn();

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5000',
    origin: 'http://localhost:5000'
  },
  writable: true
});

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Resetear localStorage
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    
    // Crear nueva instancia
    authService = new AuthService();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(authService.baseURL).toBe('http://localhost:5000');
      expect(authService.apiURL).toBe('http://localhost:5000/api');
      expect(authService.tokenKey).toBe('taskflow_token');
      expect(authService.userKey).toBe('taskflow_user');
    });

    test('should load stored token and user', () => {
      const mockToken = 'mock-token';
      const mockUser = { id: 1, name: 'Test User' };
      
      localStorageMock.getItem
        .mockReturnValueOnce(mockToken)
        .mockReturnValueOnce(JSON.stringify(mockUser));

      const newAuthService = new AuthService();
      
      expect(newAuthService.token).toBe(mockToken);
      expect(newAuthService.user).toEqual(mockUser);
    });
  });

  describe('Token Management', () => {
    test('should store auth data correctly', () => {
      const token = 'test-token';
      const user = { id: 1, name: 'Test User' };

      authService.storeAuth(token, user);

      expect(authService.token).toBe(token);
      expect(authService.user).toEqual(user);
      expect(localStorage.setItem).toHaveBeenCalledWith('taskflow_token', token);
      expect(localStorage.setItem).toHaveBeenCalledWith('taskflow_user', JSON.stringify(user));
    });

    test('should clear auth data correctly', () => {
      authService.token = 'test-token';
      authService.user = { id: 1 };

      authService.clearAuth();

      expect(authService.token).toBeNull();
      expect(authService.user).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('taskflow_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('taskflow_user');
    });

    test('should check authentication status correctly', () => {
      // No autenticado
      expect(authService.isAuthenticated()).toBe(false);

      // Autenticado
      authService.token = 'test-token';
      authService.user = { id: 1 };
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('Registration', () => {
    test('should register user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Usuario registrado exitosamente',
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
          token: 'new-token'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Usuario registrado exitosamente');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      );
    });

    test('should handle registration error', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123'
      };

      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'El email ya está registrado'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('El email ya está registrado');
    });
  });

  describe('Login', () => {
    test('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPass123'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Inicio de sesión exitoso',
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
          token: 'new-token'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Inicio de sesión exitoso');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        })
      );
    });

    test('should handle login error', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Credenciales inválidas'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciales inválidas');
    });
  });

  describe('Logout', () => {
    test('should logout user successfully', async () => {
      authService.token = 'test-token';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Sesión cerrada exitosamente'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      await authService.logout();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should clear auth data even if logout fails', async () => {
      authService.token = 'test-token';
      authService.user = { id: 1 };

      fetch.mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(authService.token).toBeNull();
      expect(authService.user).toBeNull();
    });
  });

  describe('User Info', () => {
    test('should get current user info successfully', async () => {
      authService.token = 'test-token';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          user: { id: 1, name: 'Test User', email: 'test@example.com' }
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUserInfo();

      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: 1, name: 'Test User', email: 'test@example.com' });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/me',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  describe('Profile Update', () => {
    test('should update profile successfully', async () => {
      authService.token = 'test-token';

      const profileData = {
        name: 'Updated Name',
        bio: 'Updated bio'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Perfil actualizado exitosamente',
          user: { id: 1, name: 'Updated Name', bio: 'Updated bio' }
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Perfil actualizado exitosamente');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/users/profile',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        })
      );
    });
  });

  describe('Password Change', () => {
    test('should change password successfully', async () => {
      authService.token = 'test-token';

      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123'
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Contraseña actualizada exitosamente'
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.changePassword(passwordData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Contraseña actualizada exitosamente');
    });
  });

  describe('Validation', () => {
    test('should validate registration data correctly', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123'
      };

      const result = authService.validateRegistrationData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should detect invalid registration data', () => {
      const invalidData = {
        name: 'T', // Too short
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different'
      };

      const result = authService.validateRegistrationData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.confirmPassword).toBeDefined();
    });

    test('should validate login data correctly', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = authService.validateLoginData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should detect invalid login data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };

      const result = authService.validateLoginData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('Token Expiration', () => {
    test('should detect token expiring soon', () => {
      // Mock token that expires in 30 minutes
      const expTime = Math.floor(Date.now() / 1000) + (30 * 60);
      const mockToken = `header.${btoa(JSON.stringify({ exp: expTime }))}.signature`;
      
      authService.token = mockToken;

      expect(authService.isTokenExpiringSoon()).toBe(true);
    });

    test('should not detect token expiring soon when valid', () => {
      // Mock token that expires in 2 hours
      const expTime = Math.floor(Date.now() / 1000) + (2 * 60 * 60);
      const mockToken = `header.${btoa(JSON.stringify({ exp: expTime }))}.signature`;
      
      authService.token = mockToken;

      expect(authService.isTokenExpiringSoon()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });
  });
}); 