// Test environment setup for Vitest + jsdom.
//
// jsdom provides neither `window.matchMedia` nor `navigator.clipboard`, and
// later tasks (theme toggle, copy-to-clipboard control) rely on both being
// present as callable stubs even when a test does not override them.
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: () => Promise.resolve(),
      readText: () => Promise.resolve(''),
    },
    configurable: true,
    writable: true,
  });
}
