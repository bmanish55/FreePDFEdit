import { create } from 'zustand'

export type TextObject = {
  id: string
  type: 'text'
  page: number
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  color: string
  coverOriginal: boolean
  originalKey?: string
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

export type EditObject = TextObject | ImageObject
export type ActiveTool = 'select' | 'addText' | 'addImage'

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
  setPdf: (pdfBytes: Uint8Array, fileName: string, numPages: number) => void
  setZoom: (zoom: number) => void
  setActiveTool: (activeTool: ActiveTool) => void
  setVisiblePage: (visiblePage: number) => void
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
  setPdf: (pdfBytes, fileName, numPages) => set({ pdfBytes, fileName, numPages, zoom: 1 }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setVisiblePage: (visiblePage) => set({ visiblePage }),
  addObject: (object) => set((state) => ({
    objects: [...state.objects, object],
    selectedId: object.id,
    history: [...state.history, state.objects],
  })),
  updateObject: (id, changes, saveHistory = true) => set((state) => ({
    objects: state.objects.map((object) => object.id === id ? { ...object, ...changes } : object) as EditObject[],
    history: saveHistory ? [...state.history, state.objects] : state.history,
  })),
  beginHistory: () => set((state) => ({ history: [...state.history, state.objects] })),
  selectObject: (selectedId) => set({ selectedId }),
  deleteSelected: () => set((state) => {
    if (!state.selectedId) return state
    return {
      objects: state.objects.filter((object) => object.id !== state.selectedId),
      selectedId: null,
      history: [...state.history, state.objects],
    }
  }),
  undo: () => set((state) => {
    const previous = state.history.at(-1)
    if (!previous) return state
    return { objects: previous, history: state.history.slice(0, -1), selectedId: null }
  }),
}))
