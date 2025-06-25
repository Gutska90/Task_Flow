// Clase para manejar la exportación e importación de tareas
class TaskExportManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Botones de exportación
        const exportJsonBtn = document.getElementById('exportJson');
        const exportCsvBtn = document.getElementById('exportCsv');
        const importFileInput = document.getElementById('importFile');
        const importBtn = document.getElementById('importBtn');

        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportTasks('json'));
        }
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportTasks('csv'));
        }
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importTasks());
        }
    }

    async exportTasks(format) {
        try {
            const username = localStorage.getItem('currentUser');
            if (!username) {
                throw new Error('No hay usuario activo');
            }

            const tasks = JSON.parse(localStorage.getItem(`tasks_${username}`) || '[]');
            if (!tasks.length) {
                this.showMessage('No hay tareas para exportar', 'warning');
                return;
            }

            let content, filename, mimeType;

            if (format === 'json') {
                content = JSON.stringify(tasks, null, 2);
                filename = `taskflow_tasks_${username}_${this.getFormattedDate()}.json`;
                mimeType = 'application/json';
            } else if (format === 'csv') {
                content = this.convertToCSV(tasks);
                filename = `taskflow_tasks_${username}_${this.getFormattedDate()}.csv`;
                mimeType = 'text/csv';
            }

            // Crear y descargar archivo
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showMessage('Tareas exportadas correctamente', 'success');
        } catch (error) {
            console.error('Error al exportar tareas:', error);
            this.showMessage('Error al exportar las tareas', 'danger');
        }
    }

    convertToCSV(tasks) {
        // Definir encabezados
        const headers = ['Nombre', 'Categoría', 'Prioridad', 'Fecha de Vencimiento', 'Estado', 'Fecha de Creación'];
        
        // Convertir tareas a filas CSV
        const rows = tasks.map(task => [
            this.escapeCSV(task.name),
            this.escapeCSV(task.category),
            this.escapeCSV(task.priority),
            task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
            task.completed ? 'Completada' : 'Pendiente',
            new Date(task.createdAt).toLocaleDateString()
        ]);

        // Unir todo
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    escapeCSV(field) {
        if (field === null || field === undefined) return '';
        const string = String(field);
        if (string.includes(',') || string.includes('"') || string.includes('\n')) {
            return `"${string.replace(/"/g, '""')}"`;
        }
        return string;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const fileType = file.name.endsWith('.json') ? 'json' : 'csv';
                
                if (fileType === 'json') {
                    this.validateJsonTasks(JSON.parse(content));
                } else {
                    this.validateCsvTasks(content);
                }

                // Guardar el archivo temporalmente
                localStorage.setItem('tempImportFile', content);
                localStorage.setItem('tempImportType', fileType);
                
                this.showMessage('Archivo cargado correctamente. Haz clic en Importar para continuar.', 'success');
            } catch (error) {
                console.error('Error al procesar el archivo:', error);
                this.showMessage('Error al procesar el archivo. Verifica el formato.', 'danger');
            }
        };

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            this.showMessage('Formato de archivo no soportado. Usa JSON o CSV.', 'warning');
        }
    }

    validateJsonTasks(tasks) {
        if (!Array.isArray(tasks)) {
            throw new Error('El archivo JSON debe contener un array de tareas');
        }

        const requiredFields = ['name', 'category', 'priority'];
        tasks.forEach((task, index) => {
            requiredFields.forEach(field => {
                if (!task[field]) {
                    throw new Error(`La tarea ${index + 1} no tiene el campo requerido: ${field}`);
                }
            });
        });
    }

    validateCsvTasks(content) {
        const lines = content.split('\n');
        if (lines.length < 2) {
            throw new Error('El archivo CSV debe tener al menos una tarea');
        }

        const headers = lines[0].split(',');
        const requiredHeaders = ['Nombre', 'Categoría', 'Prioridad'];
        requiredHeaders.forEach(header => {
            if (!headers.includes(header)) {
                throw new Error(`Falta el encabezado requerido: ${header}`);
            }
        });
    }

    async importTasks() {
        try {
            const content = localStorage.getItem('tempImportFile');
            const fileType = localStorage.getItem('tempImportType');
            
            if (!content || !fileType) {
                this.showMessage('No hay archivo para importar', 'warning');
                return;
            }

            const username = localStorage.getItem('currentUser');
            if (!username) {
                throw new Error('No hay usuario activo');
            }

            let tasks;
            if (fileType === 'json') {
                tasks = JSON.parse(content);
            } else {
                tasks = this.parseCSV(content);
            }

            // Validar y procesar tareas
            const existingTasks = JSON.parse(localStorage.getItem(`tasks_${username}`) || '[]');
            const newTasks = this.processImportedTasks(tasks, existingTasks);

            // Guardar tareas actualizadas
            localStorage.setItem(`tasks_${username}`, JSON.stringify([...existingTasks, ...newTasks]));

            // Limpiar archivo temporal
            localStorage.removeItem('tempImportFile');
            localStorage.removeItem('tempImportType');

            // Actualizar la interfaz
            if (window.taskManager) {
                window.taskManager.loadTasks();
            }

            this.showMessage(`${newTasks.length} tareas importadas correctamente`, 'success');
        } catch (error) {
            console.error('Error al importar tareas:', error);
            this.showMessage('Error al importar las tareas: ' + error.message, 'danger');
        }
    }

    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).filter(line => line.trim()).map(line => {
            const values = this.parseCSVLine(line);
            const task = {
                name: values[headers.indexOf('Nombre')],
                category: values[headers.indexOf('Categoría')],
                priority: values[headers.indexOf('Prioridad')],
                completed: values[headers.indexOf('Estado')] === 'Completada',
                createdAt: new Date().toISOString()
            };

            const dueDateIndex = headers.indexOf('Fecha de Vencimiento');
            if (dueDateIndex !== -1 && values[dueDateIndex]) {
                const [day, month, year] = values[dueDateIndex].split('/');
                task.dueDate = new Date(year, month - 1, day).toISOString();
            }

            return task;
        });
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }

    processImportedTasks(newTasks, existingTasks) {
        // Filtrar tareas duplicadas basándose en el nombre
        const existingNames = new Set(existingTasks.map(t => t.name.toLowerCase()));
        return newTasks.filter(task => !existingNames.has(task.name.toLowerCase()));
    }

    getFormattedDate() {
        const now = new Date();
        return now.toISOString().split('T')[0].replace(/-/g, '');
    }

    showMessage(message, type = 'info') {
        // Buscar el contenedor de mensajes
        let messageContainer = document.getElementById('exportMessage');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'exportMessage';
            messageContainer.className = 'position-fixed bottom-0 end-0 p-3';
            messageContainer.style.zIndex = '11';
            document.body.appendChild(messageContainer);
        }

        // Crear y mostrar el mensaje
        const toast = document.createElement('div');
        toast.className = `toast show bg-${type} text-white`;
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
            </div>
        `;
        messageContainer.innerHTML = '';
        messageContainer.appendChild(toast);

        // Auto-cerrar después de 3 segundos
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Inicializar el gestor de exportación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.taskExportManager = new TaskExportManager();
}); 