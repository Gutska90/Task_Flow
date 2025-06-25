// Clase para manejar la recuperación de contraseña
class PasswordRecovery {
  constructor() {
    this.currentStep = 1;
    this.recoveryEmail = '';
    this.verificationCode = '';
    this.recoveryTimeout = null;
    this.maxAttempts = 3;
    this.attempts = 0;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Formulario de solicitud de recuperación
    document.getElementById('recoveryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRecoveryRequest();
    });

    // Formulario de verificación de código
    document.getElementById('verificationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleVerificationCode();
    });

    // Botón de reenvío de código
    document.getElementById('resendCodeButton').addEventListener('click', () => {
      this.handleResendCode();
    });

    // Formulario de nueva contraseña
    document.getElementById('newPasswordForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePasswordChange();
    });

    // Validación en tiempo real de la contraseña
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmNewPassword');
    
    if (newPassword && confirmPassword) {
      const validatePasswords = () => {
        if (newPassword.value && confirmPassword.value) {
          if (newPassword.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Las contraseñas no coinciden');
          } else {
            confirmPassword.setCustomValidity('');
          }
        }
      };

      newPassword.addEventListener('input', validatePasswords);
      confirmPassword.addEventListener('input', validatePasswords);
    }
  }

  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('recoveryStatus');
    statusDiv.textContent = message;
    statusDiv.className = `alert alert-${type} mt-3`;
    statusDiv.classList.remove('d-none');
  }

  hideStatus() {
    const statusDiv = document.getElementById('recoveryStatus');
    statusDiv.classList.add('d-none');
  }

  showStep(step) {
    // Ocultar todos los formularios
    document.getElementById('recoveryForm').classList.add('d-none');
    document.getElementById('verificationForm').classList.add('d-none');
    document.getElementById('newPasswordForm').classList.add('d-none');

    // Mostrar el formulario correspondiente al paso actual
    switch (step) {
      case 1:
        document.getElementById('recoveryForm').classList.remove('d-none');
        break;
      case 2:
        document.getElementById('verificationForm').classList.remove('d-none');
        break;
      case 3:
        document.getElementById('newPasswordForm').classList.remove('d-none');
        break;
    }

    this.currentStep = step;
    this.hideStatus();
  }

  generateVerificationCode() {
    // Generar un código de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async handleRecoveryRequest() {
    const email = document.getElementById('email').value.trim();
    
    if (!this.validateEmail(email)) {
      this.showStatus('Por favor, ingresa un correo electrónico válido', 'danger');
      return;
    }

    // Verificar si el correo existe en la base de datos
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email);

    if (!user) {
      this.showStatus('No existe una cuenta asociada a este correo electrónico', 'danger');
      return;
    }

    // Generar y almacenar código de verificación
    this.recoveryEmail = email;
    this.verificationCode = this.generateVerificationCode();
    
    // En un entorno real, aquí se enviaría el código por correo
    // Por ahora, lo mostraremos en la consola para pruebas
    console.log('Código de verificación:', this.verificationCode);
    
    // Establecer tiempo de expiración (15 minutos)
    this.recoveryTimeout = setTimeout(() => {
      this.verificationCode = '';
      this.showStatus('El código de verificación ha expirado', 'warning');
      this.showStep(1);
    }, 15 * 60 * 1000);

    this.showStatus('Se ha enviado un código de verificación a tu correo electrónico', 'success');
    this.showStep(2);
  }

  handleVerificationCode() {
    const code = document.getElementById('verificationCode').value.trim();
    
    if (this.attempts >= this.maxAttempts) {
      this.showStatus('Has excedido el número máximo de intentos. Por favor, solicita un nuevo código.', 'danger');
      this.showStep(1);
      return;
    }

    if (code !== this.verificationCode) {
      this.attempts++;
      const remainingAttempts = this.maxAttempts - this.attempts;
      this.showStatus(`Código incorrecto. Te quedan ${remainingAttempts} intentos.`, 'danger');
      return;
    }

    // Código correcto
    clearTimeout(this.recoveryTimeout);
    this.showStatus('Código verificado correctamente', 'success');
    this.showStep(3);
  }

  handleResendCode() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
    
    this.verificationCode = this.generateVerificationCode();
    this.attempts = 0;
    
    // En un entorno real, aquí se enviaría el nuevo código por correo
    console.log('Nuevo código de verificación:', this.verificationCode);
    
    // Establecer nuevo tiempo de expiración
    this.recoveryTimeout = setTimeout(() => {
      this.verificationCode = '';
      this.showStatus('El código de verificación ha expirado', 'warning');
      this.showStep(1);
    }, 15 * 60 * 1000);

    this.showStatus('Se ha enviado un nuevo código de verificación', 'success');
  }

  async handlePasswordChange() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmPassword) {
      this.showStatus('Las contraseñas no coinciden', 'danger');
      return;
    }

    if (!this.validatePassword(newPassword)) {
      this.showStatus('La contraseña no cumple con los requisitos de seguridad', 'danger');
      return;
    }

    // Actualizar la contraseña en la base de datos
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === this.recoveryEmail);

    if (userIndex === -1) {
      this.showStatus('Error al actualizar la contraseña', 'danger');
      return;
    }

    // En un entorno real, aquí se debería hashear la contraseña
    users[userIndex].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));

    this.showStatus('Contraseña actualizada correctamente. Serás redirigido al login.', 'success');
    
    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }

  validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }
}

// Inicializar el sistema de recuperación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.passwordRecovery = new PasswordRecovery();
}); 