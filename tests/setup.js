/**
 * Setup global para Jest
 * Configuración de mocks y entorno de testing
 */

// Mock de fetch global
global.fetch = jest.fn();

// Mock de console
global.console = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  groupCollapsed: jest.fn(),
  groupEnd: jest.fn()
};

// Mock de window
global.window = {
  location: {
    hostname: 'localhost',
    href: 'http://localhost:3000/test'
  },
  config: {
    get: (path, defaultValue) => {
      const config = {
        'api.baseUrl': './data/',
        'api.timeout': 30000,
        'api.retryAttempts': 3,
        'api.retryDelay': 1000,
        'api.cacheTimeout': 300000,
        'app.logLevel': 'debug',
        'app.debug': true
      };
      return config[path] || defaultValue;
    },
    isDevelopment: () => true,
    isProduction: () => false
  }
};

// Mock de navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)'
};

// Mock de location
global.location = {
  href: 'http://localhost:3000/test'
};

// Mock de document
global.document = {
  createElement: jest.fn(() => ({
    textContent: '',
    innerHTML: ''
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock de localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock de sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock de IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock de URL.createObjectURL
global.URL = {
  createObjectURL: jest.fn(() => 'blob:test-url')
};

// Mock de setTimeout y setInterval
global.setTimeout = jest.fn((callback, delay) => {
  if (delay === 0) {
    callback();
  }
  return 1;
});

global.setInterval = jest.fn(() => 1);

global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Mock de Date
const originalDate = global.Date;
global.Date = class extends originalDate {
  constructor(...args) {
    if (args.length === 0) {
      return new originalDate('2024-01-01T00:00:00.000Z');
    }
    return new originalDate(...args);
  }
  
  static now() {
    return new originalDate('2024-01-01T00:00:00.000Z').getTime();
  }
};

// Mock de Math.random para tests determinísticos
const originalRandom = Math.random;
Math.random = jest.fn(() => 0.5);

// Función helper para limpiar mocks
global.clearAllMocks = () => {
  fetch.mockClear();
  Object.values(console).forEach(mock => mock.mockClear());
  document.querySelector.mockClear();
  document.querySelectorAll.mockClear();
  document.getElementById.mockClear();
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  sessionStorage.getItem.mockClear();
  sessionStorage.setItem.mockClear();
  setTimeout.mockClear();
  setInterval.mockClear();
  clearTimeout.mockClear();
  clearInterval.mockClear();
  Math.random.mockClear();
};

// Configuración global de Jest
beforeEach(() => {
  global.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

// Configuración de timeouts
jest.setTimeout(10000);

// Mock de express-validator más completo
jest.mock('express-validator', () => {
  function makeChain() {
    const chain = function(req, res, next) { if (next) next(); };
    Object.setPrototypeOf(chain, Function.prototype);
    const methods = [
      'trim', 'isLength', 'matches', 'isEmail', 'normalizeEmail', 'notEmpty', 'isIn', 'isBoolean', 'custom',
      'withMessage', 'optional', 'exists', 'isArray', 'isObject', 'toInt', 'toFloat', 'isNumeric', 'isAlphanumeric',
      'isAlpha', 'isEmpty', 'isMongoId', 'isUUID', 'isDate', 'isAfter', 'isBefore', 'isISO8601', 'isURL', 'isString',
      'isInt', 'isFloat', 'isStrongPassword', 'customSanitizer', 'escape', 'blacklist', 'whitelist', 'equals', 'not',
      'if', 'bail'
    ];
    methods.forEach(m => { chain[m] = jest.fn().mockReturnValue(chain); });
    chain.run = jest.fn().mockResolvedValue([]);
    return chain;
  }
  return {
    body: jest.fn(() => makeChain()),
    param: jest.fn(() => makeChain()),
    query: jest.fn(() => makeChain()),
    check: jest.fn(() => makeChain()),
    validationResult: jest.fn(() => ({
      isEmpty: () => true,
      array: () => []
    })),
    matchedData: jest.fn(() => ({})),
    oneOf: jest.fn(() => (req, res, next) => next()),
    // Middleware que simula la validación
    middleware: jest.fn((req, res, next) => next())
  };
});

// Mock de bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock de jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 1, email: 'test@example.com' })
}));

// Mock de fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock de path
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
    basename: jest.fn((path) => path.split('/').pop())
  };
});

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock de window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:5000',
      origin: 'http://localhost:5000'
    }
  },
  writable: true
});

// Configuración de timeout para tests
jest.setTimeout(10000);

// Limpiar todos los mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
}); 