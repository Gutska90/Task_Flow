// Script para crear usuarios de prueba
const testUsers = [
    {
        username: "admin",
        password: "Admin123!",
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
    },
    {
        username: "usuario1",
        password: "Usuario123!",
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
    },
    {
        username: "test",
        password: "Test123!",
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
    }
];

// Obtener usuarios existentes o crear array vacío
let users = JSON.parse(localStorage.getItem('users')) || [];

// Agregar usuarios de prueba si no existen
testUsers.forEach(testUser => {
    if (!users.some(user => user.username === testUser.username)) {
        users.push(testUser);
    }
});

// Guardar en localStorage
localStorage.setItem('users', JSON.stringify(users));

console.log('Usuarios de prueba creados exitosamente:');
console.log('1. Usuario: admin, Contraseña: Admin123!');
console.log('2. Usuario: usuario1, Contraseña: Usuario123!');
console.log('3. Usuario: test, Contraseña: Test123!'); 