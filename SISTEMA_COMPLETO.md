# 🚀 **Sistema de Registro Completo - TaskFlow**

## 📋 **Descripción General**

TaskFlow ahora cuenta con un sistema de registro completo que incluye:

- **Backend Node.js/Express** con autenticación JWT
- **Frontend integrado** con el backend
- **Base de datos JSON** para almacenamiento persistente
- **Sistema de seguridad** con encriptación de contraseñas
- **Validaciones** tanto en frontend como backend
- **Gestión de sesiones** con tokens JWT
- **Recuperación de contraseñas**
- **Perfiles de usuario** con preferencias

## 🏗️ **Arquitectura del Sistema**

### **Backend (Node.js/Express)**
```
server.js              # Servidor principal
├── routes/
│   ├── auth.js        # Autenticación y registro
│   ├── users.js       # Gestión de usuarios
│   └── tasks.js       # Gestión de tareas
├── data/
│   ├── users.json     # Base de datos de usuarios
│   └── tasks.json     # Base de datos de tareas
└── middleware/
    ├── authentication # Verificación de tokens
    ├── validation     # Validación de datos
    └── security       # Rate limiting, CORS, etc.
```

### **Frontend (JavaScript)**
```
js/
├── authService.js     # Servicio de autenticación
├── scripts.js         # Lógica principal (actualizada)
├── config.js          # Configuración
└── logger.js          # Sistema de logs
```

## 🔐 **Sistema de Autenticación**

### **Registro de Usuarios**
- **Endpoint**: `POST /api/auth/register`
- **Validaciones**:
  - Nombre: 2-50 caracteres, solo letras y espacios
  - Email: formato válido, único en el sistema
  - Contraseña: mínimo 8 caracteres, mayúscula, minúscula, número
  - Confirmación de contraseña
- **Seguridad**:
  - Encriptación con bcrypt (12 salt rounds)
  - Validación de email único
  - Rate limiting para prevenir spam

### **Inicio de Sesión**
- **Endpoint**: `POST /api/auth/login`
- **Validaciones**:
  - Email y contraseña requeridos
  - Verificación de credenciales
  - Verificación de cuenta activa
- **Respuesta**:
  - Token JWT válido por 24 horas
  - Información del usuario (sin contraseña)

### **Gestión de Sesiones**
- **Tokens JWT** con expiración de 24 horas
- **Verificación automática** de tokens en cada request
- **Renovación automática** cuando está próximo a expirar
- **Logout seguro** con invalidación de tokens

## 👤 **Gestión de Usuarios**

### **Perfil de Usuario**
```json
{
  "id": 1,
  "name": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastLogin": "2024-01-01T12:00:00.000Z",
  "profile": {
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=juan@ejemplo.com",
    "bio": "Desarrollador web",
    "preferences": {
      "theme": "light",
      "language": "es",
      "notifications": true
    }
  }
}
```

### **Endpoints de Usuario**
- `GET /api/users/profile` - Obtener perfil actual
- `PUT /api/users/profile` - Actualizar perfil
- `POST /api/users/upload-avatar` - Subir avatar
- `POST /api/auth/change-password` - Cambiar contraseña

### **Administración (Solo Admin)**
- `GET /api/users` - Listar usuarios con paginación
- `GET /api/users/:id` - Obtener usuario específico
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Desactivar usuario
- `GET /api/users/stats/overview` - Estadísticas de usuarios

## 🔒 **Seguridad**

### **Protecciones Implementadas**
1. **Encriptación de Contraseñas**: bcrypt con 12 salt rounds
2. **Tokens JWT**: Firmados y con expiración
3. **Rate Limiting**: 
   - 100 requests por 15 minutos (general)
   - 5 intentos de auth por 15 minutos
4. **Validación de Datos**: Express-validator en backend
5. **CORS**: Configurado para desarrollo y producción
6. **Helmet**: Headers de seguridad
7. **Sanitización**: Limpieza de datos de entrada

### **Validaciones de Seguridad**
- **Contraseñas**: Mínimo 8 caracteres, mayúscula, minúscula, número
- **Emails**: Formato válido y único
- **Nombres**: Solo letras y espacios, 2-50 caracteres
- **Tokens**: Verificación de firma y expiración

## 📊 **Base de Datos JSON**

### **Estructura de Usuarios**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Usuario Ejemplo",
      "email": "usuario@ejemplo.com",
      "password": "$2b$12$...",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "profile": { ... }
    }
  ],
  "lastId": 1
}
```

### **Estructura de Tareas**
```json
{
  "tasks": [
    {
      "id": 1,
      "userId": 1,
      "title": "Tarea ejemplo",
      "description": "Descripción de la tarea",
      "priority": "medium",
      "status": "pending",
      "category": "Trabajo",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "lastId": 1
}
```

## 🎯 **Funcionalidades del Frontend**

### **Servicio de Autenticación (`authService.js`)**
- **Comunicación automática** con el backend
- **Gestión de tokens** JWT
- **Validaciones** en tiempo real
- **Manejo de errores** centralizado
- **Interceptores** para requests automáticos
- **Fallback** al sistema local si el backend no está disponible

### **Integración con Formularios**
- **Registro**: Validación y envío al backend
- **Login**: Autenticación con email/contraseña
- **Logout**: Limpieza de sesión
- **Perfil**: Actualización de datos personales

### **Características del Frontend**
- **Responsive**: Funciona en móviles y desktop
- **Validación en tiempo real**: Feedback inmediato
- **Loading states**: Indicadores de carga
- **Manejo de errores**: Mensajes claros al usuario
- **Persistencia**: Recuerda preferencias del usuario

## 🚀 **Cómo Usar el Sistema**

### **1. Iniciar el Servidor**
```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# O iniciar solo el servidor
npm start
```

### **2. Acceder a la Aplicación**
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **Documentación**: http://localhost:5000/api-documentation.html

### **3. Registrar un Usuario**
1. Ir a http://localhost:5000/register
2. Completar el formulario con datos válidos
3. Aceptar términos y condiciones
4. Hacer clic en "Registrarse"
5. Ser redirigido al dashboard automáticamente

### **4. Iniciar Sesión**
1. Ir a http://localhost:5000
2. Ingresar email y contraseña
3. Hacer clic en "Iniciar Sesión"
4. Acceder al dashboard

### **5. Gestionar Perfil**
1. Ir a http://localhost:5000/profile
2. Actualizar información personal
3. Cambiar contraseña si es necesario
4. Subir avatar (simulado)

## 🔧 **Configuración**

### **Variables de Entorno**
```bash
# Servidor
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion

# Seguridad
BCRYPT_SALT_ROUNDS=12
TOKEN_EXPIRATION=24h
```

### **Scripts Disponibles**
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con nodemon
npm run client     # Solo frontend
npm run full-dev   # Backend + frontend
npm test           # Ejecutar tests
```

## 📈 **Monitoreo y Logs**

### **Logs del Sistema**
- **Errores**: Console.error para debugging
- **Acciones**: Log de registros, logins, cambios
- **Seguridad**: Intentos fallidos de autenticación
- **Performance**: Tiempo de respuesta de APIs

### **Métricas Disponibles**
- Usuarios registrados
- Sesiones activas
- Tareas por usuario
- Errores de autenticación

## 🛡️ **Consideraciones de Seguridad**

### **En Producción**
1. **Cambiar JWT_SECRET** por uno seguro
2. **Configurar HTTPS**
3. **Implementar rate limiting** más estricto
4. **Usar base de datos real** (PostgreSQL, MongoDB)
5. **Configurar CORS** para dominio específico
6. **Implementar logging** de seguridad
7. **Backup automático** de datos

### **Buenas Prácticas**
- **Nunca almacenar** contraseñas en texto plano
- **Validar siempre** datos de entrada
- **Usar HTTPS** en producción
- **Implementar 2FA** para mayor seguridad
- **Monitorear** intentos de acceso sospechosos

## 🔄 **Migración desde Sistema Anterior**

### **Compatibilidad**
- El sistema mantiene **compatibilidad** con localStorage
- **Fallback automático** si el backend no está disponible
- **Migración gradual** de usuarios existentes

### **Proceso de Migración**
1. **Backup** de datos existentes
2. **Instalación** del nuevo sistema
3. **Migración** de usuarios a la nueva estructura
4. **Pruebas** de funcionalidad
5. **Despliegue** en producción

## 📞 **Soporte y Mantenimiento**

### **Debugging**
- **Logs detallados** en consola
- **Validación de datos** paso a paso
- **Verificación de tokens** JWT
- **Monitoreo de errores** de red

### **Mantenimiento**
- **Backup regular** de archivos JSON
- **Rotación de logs**
- **Actualización de dependencias**
- **Monitoreo de seguridad**

---

## 🎉 **¡Sistema Completo Implementado!**

El sistema de registro de TaskFlow ahora cuenta con:

✅ **Backend robusto** con Node.js/Express  
✅ **Autenticación segura** con JWT  
✅ **Base de datos persistente** en JSON  
✅ **Frontend integrado** con validaciones  
✅ **Sistema de seguridad** completo  
✅ **Gestión de usuarios** avanzada  
✅ **Recuperación de contraseñas**  
✅ **Perfiles personalizables**  
✅ **Documentación completa**  

**¡Listo para usar en desarrollo y preparado para producción!** 