import { create } from 'zustand'
import { usePdfStore } from './usePdfStore'

export type MobileMode = 'view' | 'edit'

type MobileState = {
  mode: MobileMode
  editingTextId: string | null
  hint: string | null
  setMode: (mode: MobileMode) => void
  openTextEditor: (id: string) => void
  closeTextEditor: () => void
  showHint: (text: string) => void
}

let hintTimer: ReturnType<typeof setTimeout> | null = null

export const useMobileStore = create<MobileState>((set) => ({
  mode: 'view',
  editingTextId: null,
  hint: null,
  setMode: (mode) => {
    if (mode === 'view') {
      if (hintTimer) {
        clearTimeout(hintTimer)
        hintTimer = null
      }
      usePdfStore.getState().selectObject(null)
      usePdfStore.getState().setActiveTool('select')
      set({ mode, editingTextId: null, hint: null })
      return
    }
    set({ mode })
  },
  openTextEditor: (id) => set({ editingTextId: id }),
  closeTextEditor: () => set({ editingTextId: null }),
  showHint: (text) => {
    if (hintTimer) {
      clearTimeout(hintTimer)
    }
    set({ hint: text })
    hintTimer = setTimeout(() => {
      hintTimer = null
      set({ hint: null })
    }, 4000)
  },
}))
