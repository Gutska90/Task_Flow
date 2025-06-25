// Clase para manejar el perfil de usuario
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.toast = new bootstrap.Toast(document.getElementById('statusToast'));
        this.initializeEventListeners();
        this.loadUserData();
    }

    initializeEventListeners() {
        // Formulario de información personal
        document.getElementById('personalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePersonalInfo();
        });

        // Formulario de cambio de contraseña
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePassword();
        });

        // Formulario de preferencias
        document.getElementById('preferencesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePreferences();
        });

        // Validación en tiempo real de contraseñas
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

        // Cambio de tema
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        });
    }

    showToast(message, title = 'Notificación', type = 'success') {
        const toast = document.getElementById('statusToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        toast.className = `toast ${type === 'error' ? 'bg-danger text-white' : ''}`;
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        this.toast.show();
    }

    loadUserData() {
        // Verificar sesión
        if (!userManager.checkSession()) {
            window.location.href = 'index.html';
            return;
        }

        // Cargar datos del usuario
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.currentUser = users.find(u => u.username === localStorage.getItem('currentUser'));
        
        if (!this.currentUser) {
            this.showToast('Error al cargar los datos del usuario', 'Error', 'error');
            return;
        }

        // Mostrar nombre de usuario en la barra de navegación
        document.getElementById('welcomeMessage').textContent = `Bienvenido, ${this.currentUser.fullName}`;

        // Llenar formulario de información personal
        document.getElementById('profileFullName').value = this.currentUser.fullName;
        document.getElementById('profileEmail').value = this.currentUser.email;
        document.getElementById('profileUsername').value = this.currentUser.username;

        // Cargar preferencias
        this.loadPreferences();
    }

    loadPreferences() {
        const preferences = JSON.parse(localStorage.getItem(`preferences_${this.currentUser.username}`) || '{}');
        
        // Tema
        const theme = preferences.theme || 'light';
        document.querySelector(`input[name="theme"][value="${theme}"]`).checked = true;
        this.applyTheme(theme);

        // Notificaciones
        document.getElementById('notifyTasks').checked = preferences.notifyTasks !== false;
        document.getElementById('notifyDue').checked = preferences.notifyDue !== false;

        // Idioma
        document.getElementById('language').value = preferences.language || 'es';
    }

    applyTheme(theme) {
        document.body.classList.remove('bg-light', 'bg-dark', 'text-light');
        if (theme === 'dark') {
            document.body.classList.add('bg-dark', 'text-light');
            document.querySelectorAll('.card').forEach(card => {
                card.classList.add('bg-dark', 'text-light');
            });
        } else {
            document.body.classList.add('bg-light');
        }
    }

    async updatePersonalInfo() {
        const fullName = document.getElementById('profileFullName').value.trim();
        const username = document.getElementById('profileUsername').value.trim();

        // Validar que el nuevo nombre de usuario no esté en uso
        if (username !== this.currentUser.username) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.some(u => u.username === username)) {
                this.showToast('El nombre de usuario ya está en uso', 'Error', 'error');
                return;
            }
        }

        // Actualizar datos
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);
        
        if (userIndex === -1) {
            this.showToast('Error al actualizar los datos', 'Error', 'error');
            return;
        }

        users[userIndex].fullName = fullName;
        users[userIndex].username = username;
        
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', username);
        
        this.currentUser = users[userIndex];
        document.getElementById('welcomeMessage').textContent = `Bienvenido, ${fullName}`;
        
        this.showToast('Información personal actualizada correctamente');
    }

    async updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        // Validar contraseña actual
        if (currentPassword !== this.currentUser.password) {
            this.showToast('La contraseña actual es incorrecta', 'Error', 'error');
            return;
        }

        // Validar nueva contraseña
        if (newPassword !== confirmPassword) {
            this.showToast('Las contraseñas no coinciden', 'Error', 'error');
            return;
        }

        if (!this.validatePassword(newPassword)) {
            this.showToast('La nueva contraseña no cumple con los requisitos de seguridad', 'Error', 'error');
            return;
        }

        // Actualizar contraseña
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);
        
        if (userIndex === -1) {
            this.showToast('Error al actualizar la contraseña', 'Error', 'error');
            return;
        }

        // En un entorno real, aquí se debería hashear la contraseña
        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Limpiar formulario
        document.getElementById('passwordForm').reset();
        
        this.showToast('Contraseña actualizada correctamente');
    }

    async updatePreferences() {
        const preferences = {
            theme: document.querySelector('input[name="theme"]:checked').value,
            notifyTasks: document.getElementById('notifyTasks').checked,
            notifyDue: document.getElementById('notifyDue').checked,
            language: document.getElementById('language').value
        };

        localStorage.setItem(`preferences_${this.currentUser.username}`, JSON.stringify(preferences));
        
        // Aplicar cambios inmediatos
        this.applyTheme(preferences.theme);
        
        this.showToast('Preferencias actualizadas correctamente');
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

// Inicializar el gestor de perfil cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
}); 