import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearDraft,
  loadDraft,
  saveDraftEdits,
  saveDraftPdf,
  type SavedDraft,
} from '../lib/storage/draftStorage'
import type { EditObject } from '../store/usePdfStore'

type UseUnsavedGuardArgs = {
  pdfBytes: Uint8Array | null
  fileName: string
  objects: EditObject[]
}

export function useUnsavedGuard({ pdfBytes, fileName, objects }: UseUnsavedGuardArgs) {
  const [pendingDraft, setPendingDraft] = useState<SavedDraft | null>(null)
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false)

  const pdfBytesRef = useRef<Uint8Array | null>(pdfBytes)
  const fileNameRef = useRef<string>(fileName)
  const hasUnsavedRef = useRef(false)
  const allowUnloadRef = useRef(false)
  const isRefreshModalOpenRef = useRef(false)
  const draftSavedInIdbRef = useRef(false)
  const lastSyncedObjectsRef = useRef<EditObject[]>(objects)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  pdfBytesRef.current = pdfBytes
  fileNameRef.current = fileName
  isRefreshModalOpenRef.current = isRefreshModalOpen

  // Load any local draft on landing screen mount
  useEffect(() => {
    if (pdfBytes) return
    let cancelled = false
    loadDraft().then((draft) => {
      if (!cancelled && draft) {
        setPendingDraft(draft)
      }
    })
    return () => {
      cancelled = true
    }
  }, [pdfBytes])

  // Prevent mobile pull-to-refresh while editing a PDF
  useEffect(() => {
    const active = Boolean(pdfBytes)
    document.documentElement.classList.toggle('pdf-session-active', active)
    document.body.classList.toggle('pdf-session-active', active)
    return () => {
      document.documentElement.classList.remove('pdf-session-active')
      document.body.classList.remove('pdf-session-active')
    }
  }, [pdfBytes])

  // Native beforeunload prompt + keyboard refresh shortcut guard
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnloadRef.current || !pdfBytesRef.current || !hasUnsavedRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!pdfBytesRef.current || !hasUnsavedRef.current) return
      const isF5 = event.key === 'F5'
      const isModR = !event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r'
      if (!isF5 && !isModR) return
      event.preventDefault()
      if (!isRefreshModalOpenRef.current) {
        setIsRefreshModalOpen(true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Auto-save edits to IndexedDB (debounced) whenever objects change
  useEffect(() => {
    if (!pdfBytesRef.current || objects === lastSyncedObjectsRef.current) return
    lastSyncedObjectsRef.current = objects
    hasUnsavedRef.current = true

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    const bytesSnapshot = pdfBytesRef.current
    const nameSnapshot = fileNameRef.current
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      if (!draftSavedInIdbRef.current) {
        draftSavedInIdbRef.current = true
        void saveDraftPdf(bytesSnapshot, nameSnapshot).then(() => saveDraftEdits(objects))
      } else {
        void saveDraftEdits(objects)
      }
    }, 300)
  }, [objects])

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
  }, [])

  const markPdfOpened = useCallback((bytes: Uint8Array, name: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    hasUnsavedRef.current = true
    draftSavedInIdbRef.current = true
    lastSyncedObjectsRef.current = []
    setPendingDraft(null)
    void saveDraftPdf(bytes, name).then(() => saveDraftEdits([]))
  }, [])

  const markRestored = useCallback((bytes: Uint8Array, name: string, restoredObjects: EditObject[]) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    pdfBytesRef.current = bytes
    fileNameRef.current = name
    hasUnsavedRef.current = true
    draftSavedInIdbRef.current = true
    lastSyncedObjectsRef.current = restoredObjects
    setPendingDraft(null)
  }, [])

  const markDownloaded = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    hasUnsavedRef.current = false
    draftSavedInIdbRef.current = false
    void clearDraft()
  }, [])

  const discardDraft = useCallback(async () => {
    setPendingDraft(null)
    await clearDraft()
  }, [])

  const closeRefreshModal = useCallback(() => {
    setIsRefreshModalOpen(false)
  }, [])

  const confirmRefresh = useCallback(() => {
    allowUnloadRef.current = true
    setIsRefreshModalOpen(false)
    window.location.reload()
  }, [])

  return {
    pendingDraft,
    isRefreshModalOpen,
    closeRefreshModal,
    confirmRefresh,
    markPdfOpened,
    markRestored,
    markDownloaded,
    discardDraft,
  }
}
