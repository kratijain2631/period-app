// Load environment variables from .env file (similar to Deno.env.get)
// This allows tests to use process.env.OPENAI_API_KEY from .env without hardcoding
require('dotenv').config();

globalThis.crypto = globalThis.crypto ?? {};

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
