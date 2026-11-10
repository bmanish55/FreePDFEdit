import type { EditObject } from '../../store/usePdfStore'

const DB_NAME = 'freepdfedit-local'
const DB_VERSION = 1
const STORE_NAME = 'drafts'
const PDF_KEY = 'pdf'
const EDITS_KEY = 'edits'

type StoredPdfRecord = {
  pdfBytes: ArrayBuffer
  fileName: string
  updatedAt: number
}

type StoredEditsRecord = {
  objects: EditObject[]
  updatedAt: number
}

export type SavedDraft = {
  pdfBytes: Uint8Array
  fileName: string
  objects: EditObject[]
  updatedAt: number
}

function openDraftDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'))
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'))
  })
}

export async function saveDraftPdf(pdfBytes: Uint8Array, fileName: string): Promise<void> {
  try {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const record: StoredPdfRecord = {
        pdfBytes: pdfBytes.slice().buffer,
        fileName,
        updatedAt: Date.now(),
      }
      store.put(record, PDF_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('Failed to save PDF draft'))
      }
    })
  } catch {
    // Best-effort local storage; never disrupt editing
  }
}

export async function saveDraftEdits(objects: EditObject[]): Promise<void> {
  try {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const record: StoredEditsRecord = {
        objects,
        updatedAt: Date.now(),
      }
      store.put(record, EDITS_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('Failed to save draft edits'))
      }
    })
  } catch {
    // Best-effort local storage; never disrupt editing
  }
}

export async function loadDraft(): Promise<SavedDraft | null> {
  try {
    const db = await openDraftDb()
    return await new Promise<SavedDraft | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const pdfReq = store.get(PDF_KEY)
      const editsReq = store.get(EDITS_KEY)
      tx.oncomplete = () => {
        db.close()
        const pdfRec = pdfReq.result as StoredPdfRecord | undefined
        const editsRec = editsReq.result as StoredEditsRecord | undefined
        if (!pdfRec?.pdfBytes || pdfRec.pdfBytes.byteLength === 0) {
          resolve(null)
          return
        }
        resolve({
          pdfBytes: new Uint8Array(pdfRec.pdfBytes),
          fileName: pdfRec.fileName,
          objects: Array.isArray(editsRec?.objects) ? editsRec.objects : [],
          updatedAt: Math.max(pdfRec.updatedAt || 0, editsRec?.updatedAt || 0),
        })
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('Failed to load draft'))
      }
    })
  } catch {
    return null
  }
}

export async function clearDraft(): Promise<void> {
  try {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(PDF_KEY)
      store.delete(EDITS_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error ?? new Error('Failed to clear draft'))
      }
    })
  } catch {
    // Ignore storage cleanup failures
  }
}
