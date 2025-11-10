// Test setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  const originalConsole = console;
  global.console = {
    ...originalConsole,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}
