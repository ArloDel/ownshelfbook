import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Radix (shadcn) needs a few browser APIs jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// `npm run test:slow`: every save takes 300 ms longer. The store shows changes before a save
// finishes, so a test that checks a save's after-effects without waiting fails here every time
// instead of once in a while.
if (import.meta.env.MODE === 'slow') {
  const repo = await import('../src/persistence/repo');
  const real = repo.transact;
  vi.spyOn(repo, 'transact').mockImplementation(async (fn) => {
    await new Promise((r) => setTimeout(r, 300));
    return real(fn);
  });
}
