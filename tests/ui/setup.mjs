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
  'Element',
  'HTMLElement',
  'HTMLDialogElement',
  'HTMLFormElement',
  'DocumentFragment',
  'Document',
  'DOMRect',
  'DOMException',
  'FocusEvent',
  'Range',
  'ShadowRoot',
  'CSS',
  'Touch',
  'TouchEvent',
  'KeyboardEvent',
  'MouseEvent',
  'PointerEvent',
  'HTMLAnchorElement',
  'HTMLButtonElement',
  'HTMLDivElement',
  'HTMLUListElement',
  'HTMLLIElement',
  'HTMLSpanElement',
  'HTMLParagraphElement',
  'HTMLHeadingElement',
  'HTMLLegendElement',
  'HTMLFieldSetElement',
  'HTMLOptionElement',
  'HTMLOptGroupElement',
  'HTMLCollection',
  'FileList',
  'File',
  'Blob',
  'FormData',
  'URLSearchParams',
  'HTMLInputElement',
  'HTMLSelectElement',
  'Node',
  'NodeFilter',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'PointerEvent',
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
globalThis.requestAnimationFrame =
  dom.window.requestAnimationFrame?.bind(dom.window) ??
  ((cb) => setTimeout(cb, 0));
globalThis.cancelAnimationFrame =
  dom.window.cancelAnimationFrame?.bind(dom.window) ??
  ((id) => clearTimeout(id));
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
// Radix UI primitives need APIs jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;
dom.window.ResizeObserver = dom.window.ResizeObserver ?? ResizeObserverStub;
// embla-carousel (ProductCard/ImageCarousel, ProductGallery) observes slides.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ?? IntersectionObserverStub;
dom.window.IntersectionObserver =
  dom.window.IntersectionObserver ?? IntersectionObserverStub;
if (!dom.window.PointerEvent) {
  globalThis.PointerEvent = dom.window.MouseEvent;
  dom.window.PointerEvent = dom.window.MouseEvent;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
for (const [name, stub] of [
  ['hasPointerCapture', () => false],
  ['setPointerCapture', () => {}],
  ['releasePointerCapture', () => {}],
]) {
  if (!HTMLElement.prototype[name]) {
    HTMLElement.prototype[name] = stub;
  }
}
if (!dom.window.matchMedia) {
  dom.window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}
const { cleanup } = await import('@testing-library/react');
afterEach(() => {
  cleanup();
  localStorage.clear();
});
