import { create } from 'zustand'
import { usePdfStore, type TextObject } from './usePdfStore'

export type MobileMode = 'view' | 'edit'

type MobileState = {
  mode: MobileMode
  editingTextId: string | null
  editingIsNew: boolean
  editingHasHistory: boolean
  editingInitialSnapshot: TextObject | null
  hint: string | null
  setMode: (mode: MobileMode) => void
  openTextEditor: (id: string, isNew?: boolean) => void
  markEditingHistorySaved: () => void
  commitTextEditor: () => void
  cancelTextEditor: () => void
  closeTextEditor: () => void
  showHint: (text: string) => void
}

let hintTimer: ReturnType<typeof setTimeout> | null = null

function isSameTextObject(a: TextObject, b: TextObject): boolean {
  return (
    a.text === b.text &&
    a.fontFamily === b.fontFamily &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.fontSize === b.fontSize &&
    a.color === b.color
  )
}

export const useMobileStore = create<MobileState>((set, get) => ({
  mode: 'view',
  editingTextId: null,
  editingIsNew: false,
  editingHasHistory: false,
  editingInitialSnapshot: null,
  hint: null,
  setMode: (mode) => {
    if (mode === 'view') {
      if (get().editingTextId !== null) {
        get().commitTextEditor()
      }
      if (hintTimer) {
        clearTimeout(hintTimer)
        hintTimer = null
      }
      usePdfStore.getState().selectObject(null)
      usePdfStore.getState().setActiveTool('select')
      set({ mode, hint: null })
      return
    }
    set({ mode })
  },
  openTextEditor: (id, isNew = false) => {
    const currentEditingId = get().editingTextId
    if (currentEditingId !== null && currentEditingId !== id) {
      get().commitTextEditor()
    }
    const obj = usePdfStore
      .getState()
      .objects.find((item): item is TextObject => item.id === id && item.type === 'text')
    set({
      editingTextId: id,
      editingIsNew: isNew,
      editingHasHistory: isNew,
      editingInitialSnapshot: obj ? { ...obj } : null,
    })
  },
  markEditingHistorySaved: () => set({ editingHasHistory: true }),
  commitTextEditor: () => {
    const { editingTextId, editingIsNew, editingHasHistory, editingInitialSnapshot } = get()
    if (!editingTextId) return

    const current = usePdfStore
      .getState()
      .objects.find((item): item is TextObject => item.id === editingTextId && item.type === 'text')

    set({
      editingTextId: null,
      editingIsNew: false,
      editingHasHistory: false,
      editingInitialSnapshot: null,
    })

    if (editingIsNew) {
      if (!current || current.text === '') {
        usePdfStore.getState().undo()
      }
      return
    }

    if (editingHasHistory && current && editingInitialSnapshot && isSameTextObject(current, editingInitialSnapshot)) {
      usePdfStore.getState().undo()
    }
  },
  cancelTextEditor: () => {
    const { editingTextId, editingHasHistory } = get()
    set({
      editingTextId: null,
      editingIsNew: false,
      editingHasHistory: false,
      editingInitialSnapshot: null,
    })
    if (editingTextId && editingHasHistory) {
      usePdfStore.getState().undo()
    }
  },
  closeTextEditor: () =>
    set({
      editingTextId: null,
      editingIsNew: false,
      editingHasHistory: false,
      editingInitialSnapshot: null,
    }),
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
