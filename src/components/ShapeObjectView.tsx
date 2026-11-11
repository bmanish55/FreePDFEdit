import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { pdfToScreen } from '../lib/coords'
import { getBoundingBoxFromPoints, scaleShapePoints } from '../lib/shapes/shapeGeometry'
import { buildSnapTargets, computeSnapGuides, type SnapTargetSet } from '../lib/snapGuides'
import { usePdfStore, type ShapeObject, type ShapePoint } from '../store/usePdfStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useMobileStore } from '../store/useMobileStore'
import ShapeSvg from './ui/ShapeSvg'

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const BOX_HANDLES: Array<{ dir: HandleDir; className: string }> = [
  { dir: 'nw', className: '-left-[5px] -top-[5px] cursor-nwse-resize' },
  { dir: 'n', className: 'left-1/2 -top-[5px] -translate-x-1/2 cursor-ns-resize' },
  { dir: 'ne', className: '-right-[5px] -top-[5px] cursor-nesw-resize' },
  { dir: 'e', className: '-right-[5px] top-1/2 -translate-y-1/2 cursor-ew-resize' },
  { dir: 'se', className: '-bottom-[5px] -right-[5px] cursor-nwse-resize' },
  { dir: 's', className: '-bottom-[5px] left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { dir: 'sw', className: '-bottom-[5px] -left-[5px] cursor-nesw-resize' },
  { dir: 'w', className: '-left-[5px] top-1/2 -translate-y-1/2 cursor-ew-resize' },
]

export default function ShapeObjectView({ object, zoom }: { object: ShapeObject; zoom: number }) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const activeTool = usePdfStore((state) => state.activeTool)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const setActiveGuides = usePdfStore((state) => state.setActiveGuides)

  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)
  const isViewMode = isMobile && mobileMode === 'view'
  const isSelectTool = activeTool === 'select'
  const selected = selectedId === object.id
  const blockPointer = isViewMode || !isSelectTool

  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef<{ x: number; y: number; points?: ShapePoint[] }>({
    x: object.x,
    y: object.y,
  })
  const boxResizeStart = useRef<{
    x: number
    y: number
    dir: HandleDir
    box: { x: number; y: number; width: number; height: number }
    points?: ShapePoint[]
  } | null>(null)
  const endpointStart = useRef<{
    x: number
    y: number
    index: 0 | 1
    points: [ShapePoint, ShapePoint]
  } | null>(null)

  const snapTargetsRef = useRef<SnapTargetSet | null>(null)
  const hasMovedRef = useRef(false)
  const dragHistoryStartedRef = useRef(false)
  const resizeHistoryStartedRef = useRef(false)

  const pos = pdfToScreen(object, zoom)
  const isLineLike = object.shape === 'line' || object.shape === 'arrow'
  const linePoints: [ShapePoint, ShapePoint] = [
    object.points?.[0] ?? { x: object.x, y: object.y },
    object.points?.[1] ?? { x: object.x + object.width, y: object.y + object.height },
  ]

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (blockPointer) return
    event.stopPropagation()
    selectObject(object.id)
    if (isMobile && !selected) return

    hasMovedRef.current = false
    dragHistoryStartedRef.current = false
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = {
      x: object.x,
      y: object.y,
      points: object.points ? object.points.map((p) => ({ ...p })) : undefined,
    }

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

    let dxPdf = screenDx / zoom
    let dyPdf = screenDy / zoom
    const rawX = objectStart.current.x + dxPdf
    const rawY = objectStart.current.y + dyPdf

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
      dxPdf += snap.dx
      dyPdf += snap.dy
    }

    const nextPoints = objectStart.current.points?.map((p) => ({
      x: p.x + dxPdf,
      y: p.y + dyPdf,
    }))
    updateObject(
      object.id,
      {
        x: objectStart.current.x + dxPdf,
        y: objectStart.current.y + dyPdf,
        ...(nextPoints ? { points: nextPoints } : {}),
      },
      false,
    )
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
    boxResizeStart.current = null
    endpointStart.current = null
  }

  return (
    <div
      className={`absolute ${selected ? 'z-20' : 'z-[12]'} ${
        blockPointer || (!selected && !object.fillColor)
          ? 'pointer-events-none'
          : 'cursor-move'
      } ${selected && !isViewMode && !isLineLike ? 'ring-1 ring-brand-400' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: Math.max(1, object.width * zoom),
        height: Math.max(1, object.height * zoom),
        touchAction: selected && !isViewMode && isSelectTool ? 'none' : 'pan-x pan-y pinch-zoom',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endDrag(e.currentTarget, e.pointerId)}
      onPointerCancel={(e) => endDrag(e.currentTarget, e.pointerId)}
      onLostPointerCapture={(e) => endDrag(e.currentTarget, e.pointerId)}
      onClick={(e) => e.stopPropagation()}
    >
      <ShapeSvg
        shape={object.shape}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        points={object.points}
        strokeColor={object.strokeColor}
        fillColor={object.fillColor}
        opacity={object.opacity}
        strokeWidth={object.strokeWidth}
        lineStyle={object.lineStyle}
        zoom={zoom}
        interactiveHitStroke={!blockPointer}
      />

      {selected && !isViewMode && isSelectTool && isLineLike && (
        <>
          {([0, 1] as const).map((idx) => {
            const pt = linePoints[idx]
            return (
              <div
                key={idx}
                aria-label={idx === 0 ? 'Move start point' : 'Move end point'}
                className={
                  isMobile
                    ? 'absolute flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center'
                    : 'absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-brand-600 ring-2 ring-white shadow-xs'
                }
                style={{
                  left: (pt.x - object.x) * zoom,
                  top: (pt.y - object.y) * zoom,
                  touchAction: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  resizeHistoryStartedRef.current = false
                  endpointStart.current = {
                    x: event.clientX,
                    y: event.clientY,
                    index: idx,
                    points: [{ ...linePoints[0] }, { ...linePoints[1] }],
                  }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId) || !endpointStart.current) {
                    return
                  }
                  const dxPdf = (event.clientX - endpointStart.current.x) / zoom
                  const dyPdf = (event.clientY - endpointStart.current.y) / zoom
                  if (!resizeHistoryStartedRef.current) {
                    beginHistory()
                    resizeHistoryStartedRef.current = true
                  }
                  const nextPts: [ShapePoint, ShapePoint] = [
                    { ...endpointStart.current.points[0] },
                    { ...endpointStart.current.points[1] },
                  ]
                  nextPts[endpointStart.current.index] = {
                    x: endpointStart.current.points[endpointStart.current.index].x + dxPdf,
                    y: endpointStart.current.points[endpointStart.current.index].y + dyPdf,
                  }
                  const bbox = getBoundingBoxFromPoints(nextPts)
                  updateObject(object.id, { ...bbox, points: nextPts }, false)
                }}
                onPointerUp={(e) => endResize(e.currentTarget, e.pointerId)}
                onPointerCancel={(e) => endResize(e.currentTarget, e.pointerId)}
                onLostPointerCapture={(e) => endResize(e.currentTarget, e.pointerId)}
              >
                {isMobile && (
                  <span className="pointer-events-none h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow-xs" />
                )}
              </div>
            )
          })}
        </>
      )}

      {selected && !isViewMode && isSelectTool && !isLineLike && (
        <>
          {(isMobile ? [BOX_HANDLES[4]] : BOX_HANDLES).map(({ dir, className }) => (
            <div
              key={dir}
              aria-label={`Resize ${dir}`}
              className={
                isMobile
                  ? 'absolute -bottom-[22px] -right-[22px] flex h-[44px] w-[44px] items-center justify-center'
                  : `absolute z-20 h-2.5 w-2.5 rounded-full bg-brand-600 ring-2 ring-white shadow-xs ${className}`
              }
              style={{ touchAction: 'none' }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(event) => {
                event.stopPropagation()
                resizeHistoryStartedRef.current = false
                boxResizeStart.current = {
                  x: event.clientX,
                  y: event.clientY,
                  dir,
                  box: {
                    x: object.x,
                    y: object.y,
                    width: object.width,
                    height: object.height,
                  },
                  points: object.points ? object.points.map((p) => ({ ...p })) : undefined,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (
                  !event.currentTarget.hasPointerCapture(event.pointerId) ||
                  !boxResizeStart.current
                ) {
                  return
                }
                const dxPdf = (event.clientX - boxResizeStart.current.x) / zoom
                const dyPdf = (event.clientY - boxResizeStart.current.y) / zoom
                if (!resizeHistoryStartedRef.current) {
                  beginHistory()
                  resizeHistoryStartedRef.current = true
                }
                const { box, dir: handleDir, points } = boxResizeStart.current
                let nextX = box.x
                let nextY = box.y
                let nextW = box.width
                let nextH = box.height

                if (handleDir.includes('e')) {
                  nextW = Math.max(8, box.width + dxPdf)
                }
                if (handleDir.includes('s')) {
                  nextH = Math.max(8, box.height + dyPdf)
                }
                if (handleDir.includes('w')) {
                  const clampedDx = Math.min(dxPdf, box.width - 8)
                  nextX = box.x + clampedDx
                  nextW = box.width - clampedDx
                }
                if (handleDir.includes('n')) {
                  const clampedDy = Math.min(dyPdf, box.height - 8)
                  nextY = box.y + clampedDy
                  nextH = box.height - clampedDy
                }

                const nextBox = { x: nextX, y: nextY, width: nextW, height: nextH }
                const nextPoints = points ? scaleShapePoints(points, box, nextBox) : undefined
                updateObject(
                  object.id,
                  { ...nextBox, ...(nextPoints ? { points: nextPoints } : {}) },
                  false,
                )
              }}
              onPointerUp={(e) => endResize(e.currentTarget, e.pointerId)}
              onPointerCancel={(e) => endResize(e.currentTarget, e.pointerId)}
              onLostPointerCapture={(e) => endResize(e.currentTarget, e.pointerId)}
            >
              {isMobile && (
                <span className="pointer-events-none h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow-xs" />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
