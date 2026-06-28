import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (!('createObjectURL' in URL)) {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', writable: true })
}
if (!('revokeObjectURL' in URL)) {
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true })
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
