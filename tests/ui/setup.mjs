import { afterEach } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLDialogElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'Node',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'CustomEvent',
  'MutationObserver',
  'Storage',
  'localStorage',
]) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: dom.window[key],
  });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value() {
      this.open = true;
    },
  },
  close: {
    configurable: true,
    value() {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  },
});
const { cleanup } = await import('@testing-library/react');
afterEach(() => {
  cleanup();
  localStorage.clear();
});
