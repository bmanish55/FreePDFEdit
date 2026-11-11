import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { pdfToScreen } from '../lib/coords'
import { buildSnapTargets, computeSnapGuides, type SnapTargetSet } from '../lib/snapGuides'
import { usePdfStore, type EditObject } from '../store/usePdfStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useMobileStore } from '../store/useMobileStore'
import AnnotationObjectView from './AnnotationObjectView'
import MobileObjectBox from './mobile/MobileObjectBox'
import ShapeObjectView from './ShapeObjectView'
import TextObjectView from './TextObjectView'

type ObjectViewProps = {
  object: EditObject
  zoom: number
}

export default function ObjectView({ object, zoom }: ObjectViewProps) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const activeTool = usePdfStore((state) => state.activeTool)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const setActiveGuides = usePdfStore((state) => state.setActiveGuides)

  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const snapTargetsRef = useRef<SnapTargetSet | null>(null)
  const hasMovedShape = useRef(false)
  const dragHistoryStarted = useRef(false)
  const resizeHistoryStarted = useRef(false)

  const selected = selectedId === object.id
  const isSelectTool = activeTool === 'select'
  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)

  if (object.type === 'text') {
    return <TextObjectView object={object} zoom={zoom} />
  }

  if (object.type === 'annotation') {
    return <AnnotationObjectView object={object} zoom={zoom} />
  }

  if (object.type === 'shape') {
    return <ShapeObjectView object={object} zoom={zoom} />
  }

  if (isMobile) {
    return (
      <MobileObjectBox
        object={object}
        zoom={zoom}
        isViewMode={mobileMode === 'view'}
        selected={selected}
      />
    )
  }

  const position = pdfToScreen(object, zoom)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSelectTool) return
    event.stopPropagation()
    selectObject(object.id)
    hasMovedShape.current = false
    dragHistoryStarted.current = false
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = { x: object.x, y: object.y }
    const state = usePdfStore.getState()
    snapTargetsRef.current = buildSnapTargets(
      object.page,
      object.id,
      state.objects,
      state.pageTextRuns[object.page] ?? [],
      state.pageSizes[object.page],
    )
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const screenDx = event.clientX - dragStart.current.x
    const screenDy = event.clientY - dragStart.current.y
    const threshold = event.pointerType === 'touch' ? 16 : 3
    if (Math.hypot(screenDx, screenDy) < threshold && !hasMovedShape.current) {
      return
    }
    if (!dragHistoryStarted.current) {
      beginHistory()
      dragHistoryStarted.current = true
    }
    hasMovedShape.current = true
    const rawX = objectStart.current.x + screenDx / zoom
    const rawY = objectStart.current.y + screenDy / zoom

    if (snapTargetsRef.current) {
      const snap = computeSnapGuides(
        {
          left: rawX,
          centerX: rawX + object.width / 2,
          right: rawX + object.width,
          top: rawY,
          centerY: rawY + object.height / 2,
          bottom: rawY + object.height,
        },
        snapTargetsRef.current,
        4 / zoom,
        event.altKey,
      )
      setActiveGuides(snap.guides)
      updateObject(
        object.id,
        {
          x: rawX + snap.dx,
          y: rawY + snap.dy,
        },
        false,
      )
      return
    }

    updateObject(
      object.id,
      {
        x: rawX,
        y: rawY,
      },
      false,
    )
  }

  const endDrag = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    dragHistoryStarted.current = false
    snapTargetsRef.current = null
    setActiveGuides([])
  }

  const endResize = (target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    resizeHistoryStarted.current = false
  }

  const resizeHandle = selected && isSelectTool && (
    <div
      aria-label="Resize"
      title="Drag to resize"
      className="absolute -bottom-[5px] -right-[5px] h-3 w-3 cursor-se-resize rounded-sm bg-brand-600 ring-1 ring-white"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation()
        selectObject(object.id)
        resizeHistoryStarted.current = false
        resizeStart.current = {
          x: event.clientX,
          y: event.clientY,
          width: object.width,
          height: object.height,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
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
      onPointerUp={(event) => endResize(event.currentTarget, event.pointerId)}
      onPointerCancel={(event) => endResize(event.currentTarget, event.pointerId)}
      onLostPointerCapture={(event) => endResize(event.currentTarget, event.pointerId)}
    />
  )

  if (object.type === 'whiteout' || object.type === 'highlight') {
    const hoverRing =
      isSelectTool && !selected && object.type === 'whiteout'
        ? 'hover:ring-1 hover:ring-slate-400'
        : ''
    const zClass = selected ? 'z-20' : object.type === 'whiteout' ? 'z-0' : 'z-[1]'
    return (
      <div
        className={`absolute ${zClass} ${!isSelectTool ? 'pointer-events-none' : ''} ${
          object.type === 'whiteout' ? 'bg-white' : 'bg-yellow-300/40'
        } ${selected ? 'cursor-move ring-2 ring-brand-500' : hoverRing}`}
        style={{
          left: position.x,
          top: position.y,
          width: object.width * zoom,
          height: object.height * zoom,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => endDrag(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) => endDrag(event.currentTarget, event.pointerId)}
        onLostPointerCapture={(event) => endDrag(event.currentTarget, event.pointerId)}
      >
        {resizeHandle}
      </div>
    )
  }

  if (object.type !== 'image') return null

  return (
    <div
      className={`absolute ${selected ? 'z-20' : 'z-[2]'} ${!isSelectTool ? 'pointer-events-none' : ''} ${
        selected ? 'cursor-move ring-2 ring-brand-500' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: object.width * zoom,
        height: object.height * zoom,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => endDrag(event.currentTarget, event.pointerId)}
      onPointerCancel={(event) => endDrag(event.currentTarget, event.pointerId)}
      onLostPointerCapture={(event) => endDrag(event.currentTarget, event.pointerId)}
    >
      <img
        src={object.dataUrl}
        alt="Added PDF"
        className="h-full w-full object-contain"
        draggable={false}
      />
      {resizeHandle}
    </div>
  )
}
