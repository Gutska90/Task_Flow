module.exports = {
  // Directorio de tests
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js"
  ],

  // Directorio de cobertura
  collectCoverageFrom: [
    "js/**/*.js",
    "routes/**/*.js",
    "server.js",
    "!js/scripts.js",
    "!js/tasks.js",
    "!js/recovery.js",
    "!js/notifications.js",
    "!js/taskExport.js",
    "!js/createTestUsers.js"
  ],

  // Configuración de cobertura
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],

  // Configuración de entorno
  testEnvironment: "node",
  
  // Setup de mocks globales
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Configuración de transformaciones
  transform: {},

  // Configuración de módulos
  moduleFileExtensions: ["js", "json"],

  // Configuración de timeouts
  testTimeout: 10000,

  // Configuración de verbose
  verbose: true,

  // Configuración de watch
  watchPathIgnorePatterns: [
    "node_modules",
    "coverage"
  ],

  // Configuración de bail
  bail: false,

  // Configuración de maxWorkers
  maxWorkers: "50%",

  // Configuración de path ignore
  testPathIgnorePatterns: [
    "/node_modules/",
    "/coverage/"
  ]
}; 