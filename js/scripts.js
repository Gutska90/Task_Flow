// Función para manejar el almacenamiento de usuarios
const userManager = {
  users: JSON.parse(localStorage.getItem('users')) || [],
  
  saveUsers() {
    try {
      localStorage.setItem('users', JSON.stringify(this.users));
      return true;
    } catch (error) {
      console.error('Error al guardar usuarios:', error);
      return false;
    }
  },
  
  addUser(userData) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Validar que el usuario no exista
    if (users.some(user => user.username === userData.username)) {
      return { success: false, message: 'El nombre de usuario ya está en uso' };
    }
    
    // Validar que el email no esté en uso
    if (users.some(user => user.email === userData.email)) {
      return { success: false, message: 'El correo electrónico ya está registrado' };
    }

    // Validar contraseña
    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    // Validar email
    if (!this.validateEmail(userData.email)) {
      return { success: false, message: 'El correo electrónico no es válido' };
    }

    // Validar username
    if (!this.validateUsername(userData.username)) {
      return { success: false, message: 'El nombre de usuario no es válido' };
    }

    // Validar nombre completo
    if (!this.validateFullName(userData.fullName)) {
      return { success: false, message: 'El nombre completo no es válido' };
    }

    // Agregar usuario con datos adicionales
    const newUser = {
      username: userData.username,
      password: userData.password, // En producción, esto debería estar hasheado
      email: userData.email,
      fullName: userData.fullName,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { success: true, message: 'Usuario registrado exitosamente' };
  },
  
  getUser(username) {
    return this.users.find(user => user.username === username && user.isActive);
  },
  
  validateUser(username, password) {
    const user = this.getUser(username);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' };
    }
    if (user.password !== password) {
      return { success: false, message: 'Contraseña incorrecta.' };
    }
    return { success: true, user };
  },

  login(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      // Guardar sesión
      localStorage.setItem('currentUser', username);
      
      // Guardar preferencia de "Recordarme"
      const rememberMe = document.getElementById('rememberMe')?.checked;
      if (rememberMe) {
        localStorage.setItem('rememberedUser', username);
      } else {
        localStorage.removeItem('rememberedUser');
      }

      // Registrar inicio de sesión
      this.showSystemNotification('Inicio de sesión exitoso', 'Bienvenido de nuevo');
      
      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
      
      return true;
    }
    return false;
  },

  logout() {
    // Limpiar sesión actual
    localStorage.removeItem('currentUser');
    
    // No limpiar rememberedUser para mantener la preferencia
    // localStorage.removeItem('rememberedUser');
    
    // Redirigir al login
    window.location.href = 'index.html';
  },

  checkSession() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      // Actualizar mensaje de bienvenida si existe
      const welcomeMessage = document.getElementById('welcomeMessage');
      const welcomeUser = document.getElementById('welcomeUser');
      
      if (welcomeMessage || welcomeUser) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === currentUser);
        if (user) {
          const welcomeText = `Bienvenido, ${user.fullName}`;
          if (welcomeMessage) welcomeMessage.textContent = welcomeText;
          if (welcomeUser) welcomeUser.textContent = welcomeText;
        }
      }
      return true;
    }
    return false;
  },

  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    
    if (password.length < minLength) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!hasUpperCase) {
      return { valid: false, message: 'La contraseña debe incluir al menos una mayúscula' };
    }
    if (!hasLowerCase) {
      return { valid: false, message: 'La contraseña debe incluir al menos una minúscula' };
    }
    if (!hasNumbers) {
      return { valid: false, message: 'La contraseña debe incluir al menos un número' };
    }
    if (!hasSpecialChar) {
      return { valid: false, message: 'La contraseña debe incluir al menos un carácter especial (@$!%*?&)' };
    }
    
    return { valid: true };
  },

  validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  },

  validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    return usernameRegex.test(username);
  },

  validateFullName(fullName) {
    const nameRegex = /^[A-Za-zÀ-ÿ\s]{3,50}$/;
    return nameRegex.test(fullName);
  },

  showSystemNotification(title, message) {
    if (window.notificationManager) {
      window.notificationManager.showSystemNotification(title, message);
    }
  }
};

// Función para mostrar mensajes de error
function showError(elementId, message, type = 'error') {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
    errorDiv.className = `text-${type === 'success' ? 'success' : 'danger'}`;
  }
}

// Función para limpiar mensajes de error
function clearError(elementId) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.classList.add('d-none');
  }
}

// Función para redirigir
function redirect(url) {
  console.log('Redirigiendo a:', url);
  window.location.href = url;
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado');
  
  // Verificar si estamos en una página protegida
  const currentPage = window.location.pathname.split('/').pop();
  console.log('Página actual:', currentPage);
  
  if (currentPage === 'dashboard.html') {
    console.log('Verificando sesión en dashboard');
    if (!userManager.checkSession()) {
      console.log('No hay sesión activa, redirigiendo a login');
      redirect('index.html');
      return;
    }
  }

  // Verificar si hay un usuario recordado
  const rememberedUser = localStorage.getItem('rememberedUser');
  if (rememberedUser) {
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const usernameInput = document.getElementById('username');
    if (rememberMeCheckbox && usernameInput) {
      rememberMeCheckbox.checked = true;
      usernameInput.value = rememberedUser;
    }
  }

  // Manejo del formulario de login
  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginButton');
  
  if (loginForm && loginButton) {
    console.log('Formulario de login encontrado');
    
    // Función de login optimizada
    const handleLogin = (e) => {
      e.preventDefault();
      
      // Deshabilitar el botón para evitar múltiples envíos
      loginButton.disabled = true;
      
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      
      if (!username || !password) {
        showError('loginError', 'Todos los campos son obligatorios.');
        loginButton.disabled = false;
        return;
      }
      
      // Usar setTimeout para evitar bloqueo de la UI
      setTimeout(() => {
        try {
          const result = userManager.login(username, password);
          if (result) {
            // Mostrar mensaje de éxito
            showError('loginError', 'Inicio de sesión exitoso', 'success');
          } else {
            showError('loginError', 'Usuario o contraseña incorrectos.');
            loginButton.disabled = false;
          }
        } catch (error) {
          console.error('Error en login:', error);
          showError('loginError', 'Error al iniciar sesión. Por favor, intente nuevamente.');
          loginButton.disabled = false;
        }
      }, 0);
    };

    // Agregar el manejador de eventos al botón en lugar del formulario
    loginButton.addEventListener('click', handleLogin);
    
    // También manejar el envío del formulario con Enter
    loginForm.addEventListener('submit', handleLogin);
  }

  // Manejo del formulario de registro
  const registerForm = document.getElementById('registerForm');
  const registerButton = document.getElementById('registerButton');
  
  if (registerForm && registerButton) {
    console.log('Formulario de registro encontrado');
    
    const handleRegister = (e) => {
      e.preventDefault();
      
      // Deshabilitar el botón para evitar múltiples envíos
      registerButton.disabled = true;
      
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const termsAccepted = document.getElementById('termsCheck').checked;
      
      // Validar que todos los campos estén completos
      if (!fullName || !email || !username || !password || !confirmPassword) {
        showError('registerError', 'Todos los campos son obligatorios.');
        registerButton.disabled = false;
        return;
      }

      // Validar términos y condiciones
      if (!termsAccepted) {
        showError('registerError', 'Debe aceptar los términos y condiciones.');
        registerButton.disabled = false;
        return;
      }

      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        showError('registerError', 'Las contraseñas no coinciden.');
        registerButton.disabled = false;
        return;
      }

      // Intentar registrar el usuario
      try {
        const result = userManager.addUser({
          fullName,
          email,
          username,
          password
        });

        if (result.success) {
          // Mostrar mensaje de éxito
          showError('registerError', result.message, 'success');
          
          // Redirigir al login después de 2 segundos
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        } else {
          showError('registerError', result.message);
          registerButton.disabled = false;
        }
      } catch (error) {
        console.error('Error en registro:', error);
        showError('registerError', 'Error al registrar usuario. Por favor, intente nuevamente.');
        registerButton.disabled = false;
      }
    };

    // Agregar el manejador de eventos al formulario
    registerForm.addEventListener('submit', handleRegister);
    
    // Validación en tiempo real de la contraseña
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (passwordInput && confirmPasswordInput) {
      const validatePasswords = () => {
        if (passwordInput.value && confirmPasswordInput.value) {
          if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Las contraseñas no coinciden');
          } else {
            confirmPasswordInput.setCustomValidity('');
          }
        }
      };

      passwordInput.addEventListener('input', validatePasswords);
      confirmPasswordInput.addEventListener('input', validatePasswords);
    }
  }

  // Manejo del botón de logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    console.log('Botón de logout encontrado');
    
    logoutButton.onclick = function(e) {
      e.preventDefault();
      console.log('Cerrando sesión');
      userManager.logout();
    };
  }
});
