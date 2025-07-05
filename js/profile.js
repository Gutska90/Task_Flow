// Clase para manejar el perfil de usuario con integración backend
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

    async loadUserData() {
        try {
            if (window.authService && window.authService.isAuthenticated()) {
                // Cargar datos del backend
                const result = await window.authService.getCurrentUserInfo();
                if (result.success) {
                    this.currentUser = result.user;
                    this.displayUserData();
                } else {
                    console.error('Error cargando datos del usuario:', result.error);
                    this.loadFromLocalStorage();
                }
            } else {
                // Verificar sesión local
                if (!userManager.checkSession()) {
                    window.location.href = 'index.html';
                    return;
                }
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        // Cargar datos del usuario desde localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        this.currentUser = users.find(u => u.username === localStorage.getItem('currentUser'));
        
        if (!this.currentUser) {
            this.showToast('Error al cargar los datos del usuario', 'Error', 'error');
            return;
        }

        this.displayUserData();
    }

    displayUserData() {
        // Mostrar nombre de usuario en la barra de navegación
        const welcomeElement = document.getElementById('welcomeMessage') || document.getElementById('welcomeUser');
        if (welcomeElement) {
            welcomeElement.textContent = `Bienvenido, ${this.currentUser.name || this.currentUser.fullName}`;
        }

        // Llenar formulario de información personal
        const fullNameElement = document.getElementById('profileFullName');
        const emailElement = document.getElementById('profileEmail');
        const usernameElement = document.getElementById('profileUsername');

        if (fullNameElement) {
            fullNameElement.value = this.currentUser.name || this.currentUser.fullName;
        }
        if (emailElement) {
            emailElement.value = this.currentUser.email;
        }
        if (usernameElement) {
            usernameElement.value = this.currentUser.username || this.currentUser.email.split('@')[0];
        }

        // Cargar preferencias
        this.loadPreferences();
    }

    loadPreferences() {
        let preferences = {};
        
        if (this.currentUser.profile && this.currentUser.profile.preferences) {
            // Usar preferencias del backend
            preferences = this.currentUser.profile.preferences;
        } else {
            // Usar preferencias de localStorage
            const username = this.currentUser.username || this.currentUser.email;
            preferences = JSON.parse(localStorage.getItem(`preferences_${username}`) || '{}');
        }
        
        // Tema
        const theme = preferences.theme || 'light';
        const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (themeRadio) {
            themeRadio.checked = true;
            this.applyTheme(theme);
        }

        // Notificaciones
        const notifyTasksElement = document.getElementById('notifyTasks');
        const notifyDueElement = document.getElementById('notifyDue');
        if (notifyTasksElement) {
            notifyTasksElement.checked = preferences.notifications !== false;
        }
        if (notifyDueElement) {
            notifyDueElement.checked = preferences.notifyDue !== false;
        }

        // Idioma
        const languageElement = document.getElementById('language');
        if (languageElement) {
            languageElement.value = preferences.language || 'es';
        }
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
        const bio = document.getElementById('profileBio')?.value.trim() || '';

        try {
            if (window.authService && window.authService.isAuthenticated()) {
                // Actualizar en el backend
                const result = await window.authService.updateProfile({
                    name: fullName,
                    bio: bio
                });

                if (result.success) {
                    this.currentUser = result.user;
                    this.showToast('Información personal actualizada correctamente');
                    
                    // Actualizar mensaje de bienvenida
                    const welcomeElement = document.getElementById('welcomeMessage') || document.getElementById('welcomeUser');
                    if (welcomeElement) {
                        welcomeElement.textContent = `Bienvenido, ${fullName}`;
                    }
                } else {
                    this.showToast(result.error, 'Error', 'error');
                }
            } else {
                // Actualizar en localStorage
                this.updatePersonalInfoInLocalStorage(fullName);
            }
        } catch (error) {
            console.error('Error actualizando información personal:', error);
            this.updatePersonalInfoInLocalStorage(fullName);
        }
    }

    updatePersonalInfoInLocalStorage(fullName) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);
        
        if (userIndex === -1) {
            this.showToast('Error al actualizar los datos', 'Error', 'error');
            return;
        }

        users[userIndex].fullName = fullName;
        localStorage.setItem('users', JSON.stringify(users));
        
        this.currentUser = users[userIndex];
        document.getElementById('welcomeMessage').textContent = `Bienvenido, ${fullName}`;
        
        this.showToast('Información personal actualizada correctamente');
    }

    async updatePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            this.showToast('Las contraseñas no coinciden', 'Error', 'error');
            return;
        }

        if (!this.validatePassword(newPassword)) {
            this.showToast('La nueva contraseña no cumple con los requisitos de seguridad', 'Error', 'error');
            return;
        }

        try {
            if (window.authService && window.authService.isAuthenticated()) {
                // Actualizar contraseña en el backend
                const result = await window.authService.changePassword({
                    currentPassword: currentPassword,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                });

                if (result.success) {
                    // Limpiar formulario
                    document.getElementById('passwordForm').reset();
                    this.showToast('Contraseña actualizada correctamente');
                } else {
                    this.showToast(result.error, 'Error', 'error');
                }
            } else {
                // Actualizar contraseña en localStorage
                this.updatePasswordInLocalStorage(currentPassword, newPassword);
            }
        } catch (error) {
            console.error('Error actualizando contraseña:', error);
            this.updatePasswordInLocalStorage(currentPassword, newPassword);
        }
    }

    updatePasswordInLocalStorage(currentPassword, newPassword) {
        // Validar contraseña actual
        if (currentPassword !== this.currentUser.password) {
            this.showToast('La contraseña actual es incorrecta', 'Error', 'error');
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
            language: document.getElementById('language').value,
            notifications: document.getElementById('notifyTasks').checked,
            notifyDue: document.getElementById('notifyDue').checked
        };

        try {
            if (window.authService && window.authService.isAuthenticated()) {
                // Actualizar preferencias en el backend
                const result = await window.authService.updateProfile({
                    preferences: preferences
                });

                if (result.success) {
                    this.currentUser = result.user;
                    this.applyTheme(preferences.theme);
                    this.showToast('Preferencias actualizadas correctamente');
                } else {
                    this.showToast(result.error, 'Error', 'error');
                }
            } else {
                // Actualizar preferencias en localStorage
                this.updatePreferencesInLocalStorage(preferences);
            }
        } catch (error) {
            console.error('Error actualizando preferencias:', error);
            this.updatePreferencesInLocalStorage(preferences);
        }
    }

    updatePreferencesInLocalStorage(preferences) {
        const username = this.currentUser.username || this.currentUser.email;
        localStorage.setItem(`preferences_${username}`, JSON.stringify(preferences));
        
        this.applyTheme(preferences.theme);
        this.showToast('Preferencias actualizadas correctamente');
    }

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[@$!%*?&]/.test(password);
        
        if (password.length < minLength) {
            return false;
        }
        if (!hasUpperCase) {
            return false;
        }
        if (!hasLowerCase) {
            return false;
        }
        if (!hasNumbers) {
            return false;
        }
        if (!hasSpecialChar) {
            return false;
        }
        
        return true;
    }
}

// Inicializar el gestor de perfil cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.profileManager = new ProfileManager();
}); 