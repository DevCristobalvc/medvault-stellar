import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { RecordContent } from '../components/RecordContent'

function bufFrom(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

const JPEG = bufFrom([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = bufFrom([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
const PDF = bufFrom([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>').buffer as ArrayBuffer
const BIN = bufFrom([0x00, 0x01, 0x02, 0x03, 0x00, 0xff])

async function flush() {
  await act(async () => { await Promise.resolve() })
}

afterEach(() => cleanup())

describe('RecordContent', () => {
  it('renders plain clinical text with a persistent download link and no load button', () => {
    const data = new TextEncoder().encode('Patient is stable.').buffer as ArrayBuffer
    render(<RecordContent data={data} docType="clinical_history" />)
    expect(screen.getByText('Patient is stable.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Download/i })
    expect(link.getAttribute('href')).toMatch(/^blob:/)
    expect(link.getAttribute('download')).toBe('record.txt')
  })

  it('offers a download link before the image is loaded', () => {
    render(<RecordContent data={JPEG} docType="scan" />)
    expect(screen.getByRole('button', { name: /Load image/i })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Download/i })
    expect(link.getAttribute('href')).toMatch(/^blob:/)
    expect(link.getAttribute('download')).toBe('record.jpg')
  })

  it('shows a Load button for images and renders the image after loading', async () => {
    render(<RecordContent data={JPEG} docType="scan" />)
    fireEvent.click(screen.getByRole('button', { name: /Load image/i }))
    const img = await screen.findByRole('img')
    expect(img.getAttribute('src')).toMatch(/^blob:/)
    fireEvent.load(img)
    expect(screen.getByText('Download image')).toBeInTheDocument()
  })

  it('treats SVG as an image, not text', async () => {
    render(<RecordContent data={SVG} docType="scan" />)
    fireEvent.click(screen.getByRole('button', { name: /Load image/i }))
    expect(await screen.findByRole('img')).toBeInTheDocument()
  })

  it('renders a PNG image', async () => {
    render(<RecordContent data={PNG} docType="scan" />)
    fireEvent.click(screen.getByRole('button', { name: /Load image/i }))
    expect(await screen.findByRole('img')).toBeInTheDocument()
  })

  it('falls back to download when the image fails to render', async () => {
    render(<RecordContent data={JPEG} docType="scan" />)
    fireEvent.click(screen.getByRole('button', { name: /Load image/i }))
    const img = await screen.findByRole('img')
    fireEvent.error(img)
    expect(screen.getByText(/Couldn't display/i)).toBeInTheDocument()
    expect(screen.getByText('Download image')).toBeInTheDocument()
  })

  it('falls back to download when the image render times out', async () => {
    vi.useFakeTimers()
    try {
      render(<RecordContent data={JPEG} docType="scan" />)
      fireEvent.click(screen.getByRole('button', { name: /Load image/i }))
      await flush()
      expect(screen.getByRole('img')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(10_000) })
      expect(screen.getByText('Download image')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders a PDF in an iframe with a download link', async () => {
    render(<RecordContent data={PDF} docType="lab" />)
    fireEvent.click(screen.getByRole('button', { name: /Load PDF/i }))
    expect(await screen.findByTitle('lab')).toBeInTheDocument()
    expect(screen.getByText('Download PDF')).toBeInTheDocument()
  })

  it('offers a download for unknown binary content', async () => {
    render(<RecordContent data={BIN} docType="blob" />)
    fireEvent.click(screen.getByRole('button', { name: /Load file/i }))
    expect(await screen.findByText('Download file')).toBeInTheDocument()
  })
})
