import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { pdfToScreen } from '../../lib/coords'
import { useMobileStore } from '../../store/useMobileStore'
import { usePdfStore, type ImageObject, type RectObject } from '../../store/usePdfStore'

type MobileObjectBoxProps = {
  object: ImageObject | RectObject
  zoom: number
  isViewMode: boolean
  selected: boolean
}

export default function MobileObjectBox({
  object,
  zoom,
  isViewMode,
  selected,
}: MobileObjectBoxProps) {
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const activeTool = usePdfStore((state) => state.activeTool)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)

  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const hasMoved = useRef(false)
  const dragHistoryStarted = useRef(false)
  const resizeHistoryStarted = useRef(false)

  const position = pdfToScreen(object, zoom)
  const isSelectTool = activeTool === 'select'
  const canManipulate = !isViewMode && isSelectTool && selected
  const blockPointer = isViewMode || !isSelectTool

  const endDrag = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    dragHistoryStarted.current = false
  }

  const endResize = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    resizeHistoryStarted.current = false
  }

  const bodyClass =
    object.type === 'whiteout'
      ? 'bg-white'
      : object.type === 'highlight'
        ? 'bg-yellow-300/40'
        : ''

  return (
    <div
      className={`absolute ${bodyClass} ${blockPointer ? 'pointer-events-none' : ''} ${
        !isViewMode && selected ? 'ring-2 ring-brand-500' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: object.width * zoom,
        height: object.height * zoom,
        touchAction: canManipulate ? 'none' : 'pan-x pan-y pinch-zoom',
      }}
      onPointerDown={
        canManipulate
          ? (event: PointerEvent<HTMLDivElement>) => {
              event.stopPropagation()
              hasMoved.current = false
              dragHistoryStarted.current = false
              dragStart.current = { x: event.clientX, y: event.clientY }
              objectStart.current = { x: object.x, y: object.y }
              event.currentTarget.setPointerCapture(event.pointerId)
            }
          : undefined
      }
      onPointerMove={
        canManipulate
          ? (event: PointerEvent<HTMLDivElement>) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
              const screenDx = event.clientX - dragStart.current.x
              const screenDy = event.clientY - dragStart.current.y
              if (!hasMoved.current && Math.hypot(screenDx, screenDy) < 8) return
              if (!dragHistoryStarted.current) {
                beginHistory()
                dragHistoryStarted.current = true
              }
              hasMoved.current = true
              updateObject(
                object.id,
                {
                  x: objectStart.current.x + screenDx / zoom,
                  y: objectStart.current.y + screenDy / zoom,
                },
                false,
              )
            }
          : undefined
      }
      onPointerUp={canManipulate ? (e) => endDrag(e.currentTarget, e.pointerId) : undefined}
      onPointerCancel={canManipulate ? (e) => endDrag(e.currentTarget, e.pointerId) : undefined}
      onLostPointerCapture={canManipulate ? (e) => endDrag(e.currentTarget, e.pointerId) : undefined}
      onClick={
        blockPointer
          ? undefined
          : (event) => {
              event.stopPropagation()
              if (hasMoved.current) {
                hasMoved.current = false
                return
              }
              commitTextEditor()
              selectObject(object.id)
            }
      }
    >
      {object.type === 'image' && (
        <img
          src={object.dataUrl}
          alt="Added PDF"
          className="pointer-events-none h-full w-full object-contain"
          draggable={false}
        />
      )}

      {canManipulate && (
        <div
          aria-label="Resize handle"
          className="absolute -bottom-[22px] -right-[22px] flex h-[44px] w-[44px] items-center justify-center"
          style={{ touchAction: 'none' }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
            event.stopPropagation()
            resizeHistoryStarted.current = false
            resizeStart.current = {
              x: event.clientX,
              y: event.clientY,
              width: object.width,
              height: object.height,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            const dxPdf = (event.clientX - resizeStart.current.x) / zoom
            const dyPdf = (event.clientY - resizeStart.current.y) / zoom
            if (!resizeHistoryStarted.current) {
              beginHistory()
              resizeHistoryStarted.current = true
            }
            if (object.type === 'image') {
              const nextWidth = Math.max(20, resizeStart.current.width + dxPdf)
              updateObject(
                object.id,
                {
                  width: nextWidth,
                  height: (resizeStart.current.height * nextWidth) / resizeStart.current.width,
                },
                false,
              )
              return
            }
            updateObject(
              object.id,
              {
                width: Math.max(8, resizeStart.current.width + dxPdf),
                height: Math.max(8, resizeStart.current.height + dyPdf),
              },
              false,
            )
          }}
          onPointerUp={(e) => endResize(e.currentTarget, e.pointerId)}
          onPointerCancel={(e) => endResize(e.currentTarget, e.pointerId)}
          onLostPointerCapture={(e) => endResize(e.currentTarget, e.pointerId)}
        >
          <span className="pointer-events-none h-4 w-4 rounded-sm border-2 border-white bg-brand-600 shadow-sm" />
        </div>
      )}
    </div>
  )
}
