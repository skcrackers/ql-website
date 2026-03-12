import '@testing-library/jest-dom';

// navigator.clipboard mock
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
  configurable: true,
});

// window.alert / confirm mock
window.alert = vi.fn();
window.confirm = vi.fn(() => true);
