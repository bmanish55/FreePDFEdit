import { create } from 'zustand'
import type { FontFamilyKey } from '../lib/fonts/fontMatcher'

export type TextObject = {
  id: string
  type: 'text'
  page: number
  x: number
  baselineY: number
  text: string
  fontFamily: FontFamilyKey
  bold: boolean
  italic: boolean
  fontSize: number
  color: string
  originalKey?: string
  original: null | {
    text: string
    x: number
    width: number
    fontSize: number
    bgColor: string
    maxRight: number
  }
}

export type ImageObject = {
  id: string
  type: 'image'
  page: number
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  mime: 'image/png' | 'image/jpeg'
}

export type RectObject = {
  id: string
  type: 'whiteout' | 'highlight'
  page: number
  x: number
  y: number
  width: number
  height: number
}

export type EditObject = TextObject | ImageObject | RectObject
export type ActiveTool = 'select' | 'addText' | 'addImage' | 'whiteout' | 'highlight'

type PdfState = {
  pdfBytes: Uint8Array | null
  fileName: string
  numPages: number
  zoom: number
  activeTool: ActiveTool
  objects: EditObject[]
  selectedId: string | null
  visiblePage: number
  history: EditObject[][]
  textWarning: string | null
  isAiModalOpen: boolean
  setAiModalOpen: (open: boolean) => void
  setPdf: (pdfBytes: Uint8Array, fileName: string, numPages: number) => void
  setZoom: (zoom: number) => void
  setActiveTool: (activeTool: ActiveTool) => void
  setVisiblePage: (visiblePage: number) => void
  setTextWarning: (warning: string | null) => void
  addObject: (object: EditObject) => void
  updateObject: (id: string, changes: Partial<EditObject>, saveHistory?: boolean) => void
  beginHistory: () => void
  selectObject: (selectedId: string | null) => void
  deleteSelected: () => void
  undo: () => void
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfBytes: null,
  fileName: '',
  numPages: 0,
  zoom: 1,
  activeTool: 'select',
  objects: [],
  selectedId: null,
  visiblePage: 1,
  history: [],
  textWarning: null,
  isAiModalOpen: false,
  setAiModalOpen: (isAiModalOpen) => set({ isAiModalOpen }),
  setPdf: (pdfBytes, fileName, numPages) => set({ pdfBytes, fileName, numPages, zoom: 1 }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setVisiblePage: (visiblePage) => set({ visiblePage }),
  setTextWarning: (textWarning) => set({ textWarning }),
  addObject: (object) =>
    set((state) => ({
      objects: [...state.objects, object],
      selectedId: object.id,
      history: [...state.history, state.objects],
    })),
  updateObject: (id, changes, saveHistory = true) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? ({ ...object, ...changes } as EditObject) : object,
      ),
      history: saveHistory ? [...state.history, state.objects] : state.history,
    })),
  beginHistory: () => set((state) => ({ history: [...state.history, state.objects] })),
  selectObject: (selectedId) =>
    set((state) => ({
      selectedId,
      textWarning: selectedId === null ? null : state.textWarning,
    })),
  deleteSelected: () =>
    set((state) => {
      if (!state.selectedId) return state
      return {
        objects: state.objects.filter((object) => object.id !== state.selectedId),
        selectedId: null,
        textWarning: null,
        history: [...state.history, state.objects],
      }
    }),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1)
      if (!previous) return state
      return { objects: previous, history: state.history.slice(0, -1), selectedId: null, textWarning: null }
    }),
}))
