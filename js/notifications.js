// Clase para manejar las notificaciones del sistema
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.checkInterval = null;
        this.notificationPermission = 'default';
        this.initializeNotifications();
    }

    async initializeNotifications() {
        // Cargar notificaciones guardadas
        this.loadNotifications();
        
        // Solicitar permiso para notificaciones del navegador
        if ('Notification' in window) {
            this.notificationPermission = Notification.permission;
            if (this.notificationPermission === 'default') {
                await this.requestPermission();
            }
        }

        // Iniciar verificación periódica de tareas
        this.startTaskCheck();
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            if (permission === 'granted') {
                this.showSystemNotification('Notificaciones activadas', 'Recibirás notificaciones sobre tus tareas importantes.');
            }
        } catch (error) {
            console.error('Error al solicitar permiso de notificaciones:', error);
        }
    }

    loadNotifications() {
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
            this.notifications = JSON.parse(savedNotifications);
            this.updateNotificationPanel();
        }
    }

    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    addNotification(title, message, type = 'info', link = null) {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            link,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);
        this.saveNotifications();
        this.updateNotificationPanel();

        // Mostrar notificación del navegador si está permitido
        if (this.notificationPermission === 'granted') {
            this.showBrowserNotification(title, message);
        }

        // Actualizar el contador de notificaciones
        this.updateNotificationBadge();
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationPanel();
            this.updateNotificationBadge();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateNotificationPanel();
        this.updateNotificationBadge();
    }

    deleteNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationPanel();
        this.updateNotificationBadge();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateNotificationPanel();
        this.updateNotificationBadge();
    }

    updateNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        const content = document.getElementById('notificationContent');
        if (!content) return;

        content.innerHTML = this.notifications.length ? '' : '<div class="text-center text-muted p-3">No hay notificaciones</div>';

        this.notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            content.appendChild(notificationElement);
        });

        // Actualizar contador de no leídas
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline' : 'none';
        }
    }

    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `notification-item p-3 border-bottom ${notification.read ? 'bg-light' : 'bg-white'}`;
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1 ${notification.read ? 'text-muted' : ''}">${notification.title}</h6>
                    <p class="mb-1 small">${notification.message}</p>
                    <small class="text-muted">${this.formatTimestamp(notification.timestamp)}</small>
                </div>
                <div class="ms-2">
                    ${!notification.read ? `
                        <button class="btn btn-sm btn-link text-primary mark-read" data-id="${notification.id}">
                            <i class="bi bi-check2"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-link text-danger delete-notification" data-id="${notification.id}">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
        `;

        // Agregar eventos
        const markReadBtn = div.querySelector('.mark-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', () => this.markAsRead(notification.id));
        }

        const deleteBtn = div.querySelector('.delete-notification');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteNotification(notification.id));
        }

        // Hacer clicable si tiene enlace
        if (notification.link) {
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                window.location.href = notification.link;
                this.markAsRead(notification.id);
            });
        }

        return div;
    }

    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badges = document.querySelectorAll('.notification-badge');
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline' : 'none';
        });
    }

    showBrowserNotification(title, message) {
        if ('Notification' in window && this.notificationPermission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: '/favicon.ico'
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    showSystemNotification(title, message) {
        // Mostrar notificación en el panel
        this.addNotification(title, message, 'system');
    }

    startTaskCheck() {
        // Verificar tareas cada minuto
        this.checkInterval = setInterval(() => this.checkTasks(), 60000);
        // Verificar inmediatamente al iniciar
        this.checkTasks();
    }

    stopTaskCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }

    checkTasks() {
        const tasks = JSON.parse(localStorage.getItem(`tasks_${localStorage.getItem('currentUser')}`) || '[]');
        const now = new Date();
        
        tasks.forEach(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate - now;
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                // Notificar tareas que vencen en las próximas 24 horas
                if (hoursDiff > 0 && hoursDiff <= 24) {
                    this.addNotification(
                        'Tarea próxima a vencer',
                        `La tarea "${task.name}" vence en ${Math.round(hoursDiff)} horas`,
                        'warning',
                        'dashboard.html'
                    );
                }
                // Notificar tareas vencidas
                else if (hoursDiff < 0 && hoursDiff > -24) {
                    this.addNotification(
                        'Tarea vencida',
                        `La tarea "${task.name}" ha vencido`,
                        'danger',
                        'dashboard.html'
                    );
                }
            }
        });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Menos de 1 minuto
        if (diff < 60000) {
            return 'Ahora mismo';
        }
        // Menos de 1 hora
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        }
        // Menos de 24 horas
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
        // Más de 24 horas
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}

// Inicializar el gestor de notificaciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
}); 