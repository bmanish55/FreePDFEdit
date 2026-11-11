import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Merge } from 'lucide-react'
import type { FontFamilyKey } from '../../lib/fonts/fontMatcher'
import { getSameLineCandidates } from '../../lib/text/mergeText'
import { useMobileStore } from '../../store/useMobileStore'
import { usePdfStore, type TextObject } from '../../store/usePdfStore'
import Button from '../ui/Button'
import FontSizeInput from '../ui/FontSizeInput'

export default function TextEditSheet() {
  const editingTextId = useMobileStore((state) => state.editingTextId)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)
  const cancelTextEditor = useMobileStore((state) => state.cancelTextEditor)

  const objects = usePdfStore((state) => state.objects)
  const pageTextRuns = usePdfStore((state) => state.pageTextRuns)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const mergeLineForSelected = usePdfStore((state) => state.mergeLineForSelected)
  const textWarning = usePdfStore((state) => state.textWarning)

  const [bottomOffset, setBottomOffset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const textObject = objects.find(
    (obj): obj is TextObject => obj.id === editingTextId && obj.type === 'text',
  )
  const canMergeLine = textObject
    ? getSameLineCandidates(textObject, objects, pageTextRuns[textObject.page] ?? []).length >= 2
    : false

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) {
      setBottomOffset(0)
      return
    }
    const updateOffset = () => {
      const offset = window.innerHeight - (vv.height + vv.offsetTop)
      setBottomOffset(Math.max(0, offset))
    }
    updateOffset()
    vv.addEventListener('resize', updateOffset)
    vv.addEventListener('scroll', updateOffset)
    return () => {
      vv.removeEventListener('resize', updateOffset)
      vv.removeEventListener('scroll', updateOffset)
    }
  }, [])

  useEffect(() => {
    if (!editingTextId) return
    inputRef.current?.focus({ preventScroll: true })
    const raf = requestAnimationFrame(() => {
      const target = document.querySelector(`[data-mobile-text-id="${editingTextId}"]`)
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [editingTextId])

  if (!editingTextId || !textObject) return null

  const applyEdit = (changes: Partial<TextObject>) => {
    const state = useMobileStore.getState()
    if (!state.editingHasHistory) {
      beginHistory()
      state.markEditingHistorySaved()
    }
    updateObject(textObject.id, changes, false)
  }

  return (
    <div
      role="dialog"
      aria-label="Edit text"
      className="fixed left-0 right-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white px-4 pt-3 shadow-lg"
      style={{
        bottom: `${bottomOffset}px`,
        paddingBottom: bottomOffset === 0 ? 'calc(12px + env(safe-area-inset-bottom))' : '12px',
      }}
    >
      {textWarning && (
        <p
          role="status"
          className={`mb-2 text-xs font-medium ${
            textWarning.toLowerCase().includes('reduced') ? 'text-amber-700' : 'text-red-600'
          }`}
        >
          {textWarning}
        </p>
      )}

      <input
        ref={inputRef}
        type="text"
        value={textObject.text}
        onChange={(e) => applyEdit({ text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitTextEditor()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancelTextEditor()
          }
        }}
        placeholder="Type text..."
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[16px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Edit PDF text"
      />

      {/* Compact formatting controls matching desktop toolbar */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <select
          value={textObject.fontFamily}
          onChange={(e) => applyEdit({ fontFamily: e.target.value as FontFamilyKey })}
          aria-label="Font family"
          className="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-[16px] text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <option value="arimo">Arimo</option>
          <option value="carlito">Carlito</option>
          <option value="tinos">Tinos</option>
          <option value="cousine">Cousine</option>
          <option value="devanagari">Devanagari</option>
        </select>

        <button
          type="button"
          onClick={() => applyEdit({ bold: !textObject.bold })}
          aria-label="Bold"
          title="Bold"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            textObject.bold
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-600'
          }`}
        >
          <Bold size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => applyEdit({ italic: !textObject.italic })}
          aria-label="Italic"
          title="Italic"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            textObject.italic
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-slate-300 bg-white text-slate-600'
          }`}
        >
          <Italic size={16} strokeWidth={2} />
        </button>

        <FontSizeInput
          value={textObject.fontSize}
          onChange={(fontSize) => applyEdit({ fontSize })}
          className="h-9 w-16 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-[16px] text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />

        <input
          type="color"
          value={textObject.color.startsWith('#') ? textObject.color : '#000000'}
          onChange={(e) => applyEdit({ color: e.target.value })}
          aria-label="Text color"
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
        />

        {canMergeLine && (
          <button
            type="button"
            onClick={() => {
              const targetId = textObject.id
              commitTextEditor()
              mergeLineForSelected(targetId)
              useMobileStore.getState().openTextEditor(targetId, false)
            }}
            aria-label="Merge Line"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700"
          >
            <Merge size={14} strokeWidth={2} />
            <span>Merge Line</span>
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="secondary" size="md" onClick={cancelTextEditor}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={commitTextEditor}>
          Done
        </Button>
      </div>
    </div>
  )
}
