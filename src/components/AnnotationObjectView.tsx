import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { MessageSquare } from 'lucide-react'
import { pdfToScreen } from '../lib/coords'
import { buildSnapTargets, computeSnapGuides, type SnapTargetSet } from '../lib/snapGuides'
import { usePdfStore, type AnnotationObject } from '../store/usePdfStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useMobileStore } from '../store/useMobileStore'
import AnnotationIconSvg from './ui/AnnotationIconSvg'

type AnnotationObjectViewProps = {
  object: AnnotationObject
  zoom: number
}

export default function AnnotationObjectView({ object, zoom }: AnnotationObjectViewProps) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const activeTool = usePdfStore((state) => state.activeTool)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const setActiveGuides = usePdfStore((state) => state.setActiveGuides)
  const pageSizes = usePdfStore((state) => state.pageSizes)

  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)
  const isViewMode = isMobile && mobileMode === 'view'
  const isSelectTool = activeTool === 'select'
  const selected = selectedId === object.id
  const blockPointer = isViewMode || !isSelectTool

  const [noteOpen, setNoteOpen] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, size: object.size })
  const snapTargetsRef = useRef<SnapTargetSet | null>(null)
  const hasMovedRef = useRef(false)
  const dragHistoryStartedRef = useRef(false)
  const resizeHistoryStartedRef = useRef(false)
  const noteHistoryStartedRef = useRef(false)

  const pos = pdfToScreen(object, zoom)
  const screenSize = object.size * zoom
  const pageHeight = pageSizes[object.page]?.height ?? 792
  const showNoteAbove = object.y + object.size + 115 > pageHeight

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (blockPointer) return
    event.stopPropagation()
    selectObject(object.id)
    if (isMobile && !selected) return

    hasMovedRef.current = false
    dragHistoryStartedRef.current = false
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = { x: object.x, y: object.y }

    if (!isMobile) {
      const state = usePdfStore.getState()
      snapTargetsRef.current = buildSnapTargets(
        object.page,
        object.id,
        state.objects,
        state.pageTextRuns[object.page] ?? [],
        state.pageSizes[object.page],
      )
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const screenDx = event.clientX - dragStart.current.x
    const screenDy = event.clientY - dragStart.current.y
    const threshold = event.pointerType === 'touch' ? 8 : 3
    if (Math.hypot(screenDx, screenDy) < threshold && !hasMovedRef.current) return

    if (!dragHistoryStartedRef.current) {
      beginHistory()
      dragHistoryStartedRef.current = true
    }
    hasMovedRef.current = true
    const rawX = objectStart.current.x + screenDx / zoom
    const rawY = objectStart.current.y + screenDy / zoom

    if (snapTargetsRef.current) {
      const snap = computeSnapGuides(
        {
          left: rawX,
          centerX: rawX + object.size / 2,
          right: rawX + object.size,
          top: rawY,
          centerY: rawY + object.size / 2,
          bottom: rawY + object.size,
        },
        snapTargetsRef.current,
        4 / zoom,
        event.altKey,
      )
      setActiveGuides(snap.guides)
      updateObject(object.id, { x: rawX + snap.dx, y: rawY + snap.dy }, false)
      return
    }
    updateObject(object.id, { x: rawX, y: rawY }, false)
  }

  const endDrag = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    dragHistoryStartedRef.current = false
    snapTargetsRef.current = null
    setActiveGuides([])
  }

  const endResize = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    resizeHistoryStartedRef.current = false
  }

  return (
    <div
      className={`absolute ${selected ? 'z-20' : 'z-[15]'} ${
        blockPointer ? 'pointer-events-none' : ''
      } ${selected && !isViewMode ? 'ring-2 ring-brand-500 rounded-sm' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: screenSize,
        height: screenSize,
        touchAction: selected && !isViewMode && isSelectTool ? 'none' : 'pan-x pan-y pinch-zoom',
      }}
      title={object.note || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        endDrag(event.currentTarget, event.pointerId)
        if (!hasMovedRef.current && !isViewMode && isSelectTool) {
          setNoteOpen(true)
        }
      }}
      onPointerCancel={(e) => endDrag(e.currentTarget, e.pointerId)}
      onLostPointerCapture={(e) => endDrag(e.currentTarget, e.pointerId)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex h-full w-full cursor-move items-center justify-center">
        <AnnotationIconSvg icon={object.icon} color={object.color} size={screenSize} />
      </div>

      {!selected && object.note.trim() && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 text-white shadow-xs ring-1 ring-white"
        >
          <MessageSquare size={8} strokeWidth={2.5} />
        </span>
      )}

      {selected && !isViewMode && isSelectTool && (
        <>
          {/* Resize corner handle */}
          <div
            aria-label="Resize annotation"
            title="Drag to resize"
            className={
              isMobile
                ? 'absolute -bottom-[22px] -right-[22px] flex h-[44px] w-[44px] items-center justify-center'
                : 'absolute -bottom-[5px] -right-[5px] z-20 h-3 w-3 cursor-se-resize rounded-full bg-brand-600 ring-2 ring-white shadow-xs'
            }
            style={{ touchAction: 'none' }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation()
              resizeHistoryStartedRef.current = false
              resizeStart.current = { x: event.clientX, y: event.clientY, size: object.size }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              const delta = Math.max(
                (event.clientX - resizeStart.current.x) / zoom,
                (event.clientY - resizeStart.current.y) / zoom,
              )
              if (!resizeHistoryStartedRef.current) {
                beginHistory()
                resizeHistoryStartedRef.current = true
              }
              const nextSize = Math.round(Math.min(72, Math.max(14, resizeStart.current.size + delta)))
              updateObject(object.id, { size: nextSize }, false)
            }}
            onPointerUp={(e) => endResize(e.currentTarget, e.pointerId)}
            onPointerCancel={(e) => endResize(e.currentTarget, e.pointerId)}
            onLostPointerCapture={(e) => endResize(e.currentTarget, e.pointerId)}
          >
            {isMobile && (
              <span className="pointer-events-none h-3 w-3 rounded-full border border-white bg-brand-600 shadow-xs" />
            )}
          </div>

          {/* Optional Note popover */}
          {(noteOpen || Boolean(object.note.trim())) && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className={`absolute left-0 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg ${
                showNoteAbove ? 'bottom-full mb-2' : 'top-full mt-2'
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span>Annotation Note</span>
                <button
                  type="button"
                  onClick={() => setNoteOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Hide
                </button>
              </div>
              <textarea
                rows={2}
                value={object.note}
                placeholder="Add optional comment..."
                onFocus={() => {
                  noteHistoryStartedRef.current = false
                }}
                onChange={(e) => {
                  if (!noteHistoryStartedRef.current) {
                    beginHistory()
                    noteHistoryStartedRef.current = true
                  }
                  updateObject(object.id, { note: e.target.value }, false)
                }}
                onBlur={() => {
                  noteHistoryStartedRef.current = false
                }}
                className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-800 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
