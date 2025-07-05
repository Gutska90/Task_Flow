# TaskFlow Web

TaskFlow es una aplicación web de gestión de tareas que permite a los usuarios organizar y dar seguimiento a sus actividades diarias de manera eficiente.

## Características

- 🔐 Sistema de autenticación seguro
- 👤 Gestión de perfiles de usuario
- ✅ Creación y gestión de tareas
- 📅 Fechas de vencimiento para tareas
- 🏷️ Categorización de tareas
- ⭐ Sistema de prioridades
- 🔍 Búsqueda y filtrado de tareas
- 📊 Estadísticas de tareas
- 📱 Diseño responsive
- 🔔 Sistema de notificaciones
- 🚀 **Código optimizado con principios de Clean Code**
- 🏗️ **Arquitectura escalable y mantenible**
- 📝 **Sistema de logging avanzado**
- ⚙️ **Configuración centralizada por entorno**
- 🛡️ **Manejo robusto de errores y reintentos**
- 💾 **Sistema de caché inteligente**
- 🔒 **Prevención de vulnerabilidades de seguridad**

## 🌐 Nuevas Funcionalidades - Integración de APIs Externas

### 📊 Archivos JSON Locales
- **Categorías Dinámicas**: Categorías cargadas desde `data/categories.json`
- **Plantillas de Tareas**: Plantillas predefinidas desde `data/taskTemplates.json`
- **Estadísticas Avanzadas**: Métricas detalladas desde `data/statistics.json`

### 🔧 APIs Simuladas
- **API del Clima**: Widget de clima con datos simulados
- **API de Noticias**: Widget de noticias de productividad
- **Caché Inteligente**: Optimización de rendimiento con caché de 5 minutos

### 📱 Componentes Integrados
- **TaskTemplatesManager**: Gestión de plantillas con filtros avanzados
- **StatisticsManager**: Visualización de estadísticas y logros
- **ExternalWidgetsManager**: Widgets de clima y noticias
- **ApiService**: Servicio centralizado para todas las APIs

## Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap 5
- LocalStorage para persistencia de datos

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Gutska90/taskflowweb.git
```

2. Navega al directorio del proyecto:
```bash
cd taskflowweb
```

3. Abre el archivo `index.html` en tu navegador o utiliza un servidor local:
```bash
# Usando Python
python -m http.server 8000

# Usando Node.js
npx serve
```

## Uso

1. Accede a la aplicación a través de tu navegador
2. Regístrate con un nuevo usuario o inicia sesión
3. Comienza a crear y gestionar tus tareas

## Estructura del Proyecto

```
taskflowweb/
├── index.html              # Página de inicio/login
├── register.html           # Página de registro
├── dashboard.html          # Panel principal de tareas
├── recuperar.html          # Recuperación de contraseña
├── perfil.html             # Gestión de perfil
├── api-documentation.html  # Documentación de APIs
├── css/
│   └── styles.css          # Estilos personalizados
├── data/
│   ├── categories.json     # Categorías de tareas
│   ├── taskTemplates.json  # Plantillas predefinidas
│   └── statistics.json     # Datos estadísticos
├── js/
│   ├── scripts.js          # Funcionalidad principal
│   ├── tasks.js            # Gestión de tareas
│   ├── recovery.js         # Recuperación de contraseña
│   ├── notifications.js    # Sistema de notificaciones
│   ├── taskExport.js       # Exportación de tareas
│   ├── config.js           # Configuración centralizada
│   ├── logger.js           # Sistema de logging
│   ├── apiService.js       # Servicio de APIs optimizado
│   ├── taskTemplates.js    # Gestor de plantillas mejorado
│   ├── statistics.js       # Gestor de estadísticas avanzado
│   └── externalWidgets.js  # Widgets externos con auto-refresh
└── README.md              # Documentación
```

## 🚀 Optimizaciones Aplicadas

### Principios de Clean Code Implementados
- **Separación de Responsabilidades**: Cada clase tiene una responsabilidad específica
- **Métodos Privados**: Uso de `_` para encapsular lógica interna
- **Documentación JSDoc**: Comentarios detallados para todos los métodos públicos
- **Nombres Descriptivos**: Variables y funciones con nombres claros y significativos
- **Funciones Pequeñas**: Métodos con una sola responsabilidad

### Arquitectura Mejorada
- **Patrón Singleton**: Para servicios globales (ApiService, Config, Logger)
- **Patrón Observer**: Para notificaciones y eventos
- **Patrón Factory**: Para creación de loggers específicos por contexto
- **Patrón Strategy**: Para diferentes tipos de renderizado

### Seguridad y Robustez
- **Prevención XSS**: Escape HTML en todos los renderizados
- **Validación de Datos**: Verificación de tipos y esquemas
- **Manejo de Errores**: Captura y logging de errores con reintentos
- **Sanitización**: Limpieza de inputs de usuario

### Rendimiento Optimizado
- **Caché Inteligente**: TTL configurable y estadísticas
- **Lazy Loading**: Carga de widgets bajo demanda
- **Debouncing**: Optimización de búsquedas
- **Gestión de Memoria**: Limpieza automática de recursos

Para más detalles, consulta [OPTIMIZACIONES.md](OPTIMIZACIONES.md)

## Contribuir

1. Haz un Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

Gustavo - [@Gutska90](https://github.com/Gutska90)

Link del Proyecto: [https://github.com/Gutska90/taskflowweb](https://github.com/Gutska90/taskflowweb) 