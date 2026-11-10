import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

type RefreshConfirmModalProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function RefreshConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: RefreshConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    cancelButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="refresh-confirm-title"
        aria-describedby="refresh-confirm-desc"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} strokeWidth={2} />
          </div>
          <div>
            <h2 id="refresh-confirm-title" className="text-lg font-bold text-slate-900">
              Refresh window?
            </h2>
            <p id="refresh-confirm-desc" className="mt-1 text-sm text-slate-600">
              Are you sure you want to refresh? Refreshing the window may cause deletion and data loss.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Tip: Download your edited PDF first, or restore your local browser draft after reloading.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Refresh anyway
          </button>
        </div>
      </div>
    </div>
  )
}
