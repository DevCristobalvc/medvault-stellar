import { describe, it, expect } from 'vitest'
import { detectMedia, extensionForMime, assembleBlobUrl } from '../lib/media'

function bufFrom(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe('detectMedia', () => {
  it('detects JPEG', () => {
    expect(detectMedia(bufFrom([0xff, 0xd8, 0xff, 0xe0])).mime).toBe('image/jpeg')
  })
  it('detects PNG', () => {
    expect(detectMedia(bufFrom([0x89, 0x50, 0x4e, 0x47])).mime).toBe('image/png')
  })
  it('detects GIF', () => {
    expect(detectMedia(bufFrom([0x47, 0x49, 0x46, 0x38])).mime).toBe('image/gif')
  })
  it('detects WEBP', () => {
    const webp = bufFrom([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    expect(detectMedia(webp).mime).toBe('image/webp')
  })
  it('detects PDF', () => {
    expect(detectMedia(bufFrom([0x25, 0x50, 0x44, 0x46])).kind).toBe('pdf')
  })
  it('detects SVG as image, not text', () => {
    const svg = new TextEncoder().encode('<?xml version="1.0"?><svg></svg>').buffer as ArrayBuffer
    const m = detectMedia(svg)
    expect(m.kind).toBe('image')
    expect(m.mime).toBe('image/svg+xml')
  })
  it('detects plain text', () => {
    const txt = new TextEncoder().encode('hello world').buffer as ArrayBuffer
    const m = detectMedia(txt)
    expect(m.kind).toBe('text')
    expect(m.text).toBe('hello world')
  })
  it('detects unknown binary', () => {
    expect(detectMedia(bufFrom([0x00, 0x01, 0x02, 0x00, 0xff])).kind).toBe('binary')
  })
})

describe('extensionForMime', () => {
  it('maps image and pdf mimes', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg')
    expect(extensionForMime('image/png')).toBe('png')
    expect(extensionForMime('image/svg+xml')).toBe('svg')
    expect(extensionForMime('application/pdf')).toBe('pdf')
    expect(extensionForMime('text/plain')).toBe('txt')
  })
  it('falls back to bin for unknown mimes', () => {
    expect(extensionForMime('application/octet-stream')).toBe('bin')
  })
})

describe('assembleBlobUrl', () => {
  it('returns a blob url and reports full progress', async () => {
    const data = new Uint8Array(1024).fill(7).buffer
    let last = 0
    const url = await assembleBlobUrl(data, 'image/png', (loaded, total) => {
      last = total === 0 ? 100 : Math.round((loaded / total) * 100)
    })
    expect(url).toMatch(/^blob:/)
    expect(last).toBe(100)
  })

  it('reports progress across multiple chunks for large data', async () => {
    const data = new Uint8Array(0x8000 * 3 + 10).buffer
    const samples: number[] = []
    await assembleBlobUrl(data, 'application/pdf', (loaded, total) => {
      samples.push(Math.round((loaded / total) * 100))
    })
    expect(samples.length).toBeGreaterThan(1)
    expect(samples[samples.length - 1]).toBe(100)
  })

  it('handles empty data', async () => {
    let called = false
    const url = await assembleBlobUrl(new ArrayBuffer(0), 'application/octet-stream', () => { called = true })
    expect(url).toMatch(/^blob:/)
    expect(called).toBe(true)
  })
})
