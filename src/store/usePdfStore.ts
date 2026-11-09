import { create } from 'zustand'

type PdfState = {
  pdfBytes: Uint8Array | null
  fileName: string
  numPages: number
  zoom: number
  setPdf: (pdfBytes: Uint8Array, fileName: string, numPages: number) => void
  setZoom: (zoom: number) => void
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfBytes: null,
  fileName: '',
  numPages: 0,
  zoom: 1,
  setPdf: (pdfBytes, fileName, numPages) => set({ pdfBytes, fileName, numPages, zoom: 1 }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
}))
