import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { Move } from 'lucide-react'
import { loadFont, type LoadedFont } from '../lib/fonts/fontLoader'
import { hasDevanagari } from '../lib/fonts/fontMatcher'
import { buildSnapTargets, computeSnapGuides, type SnapTargetSet } from '../lib/snapGuides'
import { layoutText } from '../lib/text/layoutText'
import { isSameHorizontalLine } from '../lib/text/mergeText'
import { usePdfStore, type TextObject } from '../store/usePdfStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useMobileStore } from '../store/useMobileStore'

type HorizontalSide = 'left' | 'right'

type WidthResizeStartState = {
  x: number
  startX: number
  startWidth: number
  side: HorizontalSide
}

export default function TextObjectView({ object, zoom }: { object: TextObject; zoom: number }) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const activeTool = usePdfStore((state) => state.activeTool)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const setTextWarning = usePdfStore((state) => state.setTextWarning)
  const setActiveGuides = usePdfStore((state) => state.setActiveGuides)
  const mergeSourceId = usePdfStore((state) => state.mergeSourceId)
  const setMergeSourceId = usePdfStore((state) => state.setMergeSourceId)
  const mergeWithTarget = usePdfStore((state) => state.mergeWithTarget)
  const allObjects = usePdfStore((state) => state.objects)
  const selected = selectedId === object.id
  const isSelectTool = activeTool === 'select'
  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)
  const openTextEditor = useMobileStore((state) => state.openTextEditor)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)

  const mergeSourceObj =
    mergeSourceId !== null && mergeSourceId !== object.id
      ? allObjects.find(
          (item): item is TextObject =>
            item.id === mergeSourceId && item.type === 'text' && item.page === object.page,
        ) ?? null
      : null
  const isMergeTarget =
    Boolean(mergeSourceObj) && isSameHorizontalLine(mergeSourceObj!, object)

  const [font, setFont] = useState<LoadedFont | null>(null)
  const [editing, setEditing] = useState(() => selectedId === object.id)

  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const snapTargetsRef = useRef<SnapTargetSet | null>(null)
  const initialText = useRef(object.text)
  const hasMoved = useRef(false)
  const wasSelectedRef = useRef(false)
  const dragHistoryStarted = useRef(false)
  const resizeHistoryStarted = useRef(false)
  const editHistoryStarted = useRef(
    selectedId === object.id && object.original === null && object.text === '',
  )
  const widthResizeStart = useRef<WidthResizeStartState>({
    x: 0,
    startX: object.x,
    startWidth: 120,
    side: 'right',
  })

  const isDevanagari = hasDevanagari(object.text) || object.fontFamily === 'devanagari'
  const activeFamily = isDevanagari ? 'devanagari' : object.fontFamily

  useEffect(() => {
    let cancelled = false
    loadFont({ family: activeFamily, bold: object.bold, italic: object.italic })
      .then((loaded) => {
        if (!cancelled) setFont(loaded)
      })
      .catch((err) => {
        console.warn('Could not load font, using fallback:', err)
      })
    return () => {
      cancelled = true
    }
  }, [activeFamily, object.bold, object.italic])

  const effectiveFont: LoadedFont = font || {
    key: `${activeFamily}-${object.bold ? 'bold' : 'regular'}`,
    bytes: new ArrayBuffer(0),
    cssFamily:
      activeFamily === 'devanagari'
        ? "'Noto Sans Devanagari', sans-serif"
        : activeFamily === 'cousine'
          ? 'monospace'
          : activeFamily === 'tinos'
            ? "'Tinos', 'Times New Roman', Times, serif"
            : 'sans-serif',
    unitsPerEm: 1000,
    ascent: 0.95,
    descent: 0.25,
    measure: (text: string, fontSize: number) => {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const fontStyle = object.italic ? 'italic ' : ''
          const fontWeight = object.bold ? 'bold ' : ''
          const family = activeFamily === 'tinos' ? '"Times New Roman", Times, serif' : 'sans-serif'
          ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${family}`
          return ctx.measureText(text).width
        }
      }
      return text.length * fontSize * (activeFamily === 'tinos' ? 0.44 : 0.52)
    },
  }

  const layout = layoutText(object, effectiveFont)
  const hasCustomBox = typeof object.boxWidth === 'number' && object.boxWidth > 0
  const isMultilineEditor =
    hasCustomBox || layout.lines.length > 1 || object.text.includes('\n')

  useEffect(() => {
    if (selected) {
      setTextWarning(layout.warning)
    }
  }, [selected, layout.warning, setTextWarning])

  useEffect(() => {
    if (!selected) {
      setEditing(false)
    }
  }, [selected])

  useEffect(() => {
    if (isMobile || !editing) return
    if (isMultilineEditor) {
      textareaRef.current?.focus({ preventScroll: true })
    } else {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [editing, isMobile, isMultilineEditor])

  const isOriginalPdfText = object.original !== null

  const glyphHeightPdf = (effectiveFont.ascent + effectiveFont.descent) * layout.fontSize
  const lineHeightPdf = layout.lineHeight
  const lineCount = Math.max(layout.lines.length, 1)
  const glyphHeightPx = glyphHeightPdf * zoom
  const boxHeightPx =
    (lineCount === 1 ? glyphHeightPdf : (lineCount - 1) * lineHeightPdf + glyphHeightPdf) * zoom
  const elementTop = (layout.baselineY - effectiveFont.ascent * layout.fontSize) * zoom
  const elementLeft = layout.textX * zoom
  const spaceCount = (object.text.match(/\s/g) || []).length
  const totalTextWidth = layout.width + (layout.wordSpacing || 0) * spaceCount
  const minEmptyScreenWidth = Math.max(64, 48 * zoom)
  const inputWidth = Math.max(totalTextWidth * zoom + 20, minEmptyScreenWidth)
  const boxWidthPx = hasCustomBox ? object.boxWidth! * zoom : undefined

  const fontCss =
    activeFamily === 'devanagari'
      ? `${effectiveFont.cssFamily}, 'Noto Sans Devanagari', sans-serif`
      : effectiveFont.cssFamily

  const baseTextStyle: CSSProperties = {
    fontFamily: fontCss,
    fontSize: `${layout.fontSize * zoom}px`,
    color: object.color,
    fontWeight: object.bold ? 'bold' : 'normal',
    fontStyle: object.italic ? 'italic' : 'normal',
    wordSpacing: layout.wordSpacing ? `${layout.wordSpacing * zoom}px` : undefined,
    fontVariantLigatures: activeFamily === 'devanagari' ? 'normal' : 'none',
    height: `${glyphHeightPx}px`,
    lineHeight: `${glyphHeightPx}px`,
  }

  const enterEditing = () => {
    initialText.current = object.text
    editHistoryStarted.current = false
    setEditing(true)
  }

  const beginMoveDrag = (event: PointerEvent<HTMLElement>) => {
    hasMoved.current = false
    dragHistoryStarted.current = false
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = { x: object.x, y: object.baselineY }
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

  const handleMoveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const screenDx = event.clientX - dragStart.current.x
    const screenDy = event.clientY - dragStart.current.y
    const threshold = event.pointerType === 'touch' ? 8 : 3
    if (Math.hypot(screenDx, screenDy) < threshold && !hasMoved.current) {
      return
    }
    if (!dragHistoryStarted.current) {
      beginHistory()
      dragHistoryStarted.current = true
    }
    hasMoved.current = true
    const rawX = objectStart.current.x + screenDx / zoom
    const rawBaselineY = objectStart.current.y + screenDy / zoom

    if (snapTargetsRef.current) {
      const widthPdf = Math.max(object.boxWidth ?? totalTextWidth, 12)
      const heightPdf = boxHeightPx / zoom
      const topPdf = rawBaselineY - effectiveFont.ascent * layout.fontSize
      const snap = computeSnapGuides(
        {
          left: rawX,
          centerX: rawX + widthPdf / 2,
          right: rawX + widthPdf,
          top: topPdf,
          centerY: topPdf + heightPdf / 2,
          bottom: topPdf + heightPdf,
          baselineY: rawBaselineY,
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
          baselineY: rawBaselineY + snap.dy,
        },
        false,
      )
      return
    }

    updateObject(
      object.id,
      {
        x: rawX,
        baselineY: rawBaselineY,
      },
      false,
    )
  }

  const endMoveDrag = (target: HTMLElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    dragHistoryStarted.current = false
    snapTargetsRef.current = null
    setActiveGuides([])
  }

  const beginWidthResizeDrag = (side: HorizontalSide) => (event: PointerEvent<HTMLElement>) => {
    event.stopPropagation()
    resizeHistoryStarted.current = false
    const currentWidth = Math.max(
      object.boxWidth ?? 0,
      totalTextWidth,
      object.original?.width ?? 0,
      48,
    )
    widthResizeStart.current = {
      x: event.clientX,
      startX: object.x,
      startWidth: currentWidth,
      side,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleWidthResizeDrag = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const dxPdf = (event.clientX - widthResizeStart.current.x) / zoom
    if (!resizeHistoryStarted.current) {
      beginHistory()
      resizeHistoryStarted.current = true
    }
    const { startX, startWidth, side } = widthResizeStart.current
    if (side === 'right') {
      const nextWidth = Math.max(40, startWidth + dxPdf)
      updateObject(object.id, { boxWidth: Math.round(nextWidth * 10) / 10 }, false)
      return
    }
    const clampedDx = Math.min(dxPdf, startWidth - 40)
    const nextWidth = Math.max(40, startWidth - clampedDx)
    updateObject(
      object.id,
      {
        x: startX + clampedDx,
        boxWidth: Math.round(nextWidth * 10) / 10,
      },
      false,
    )
  }

  const endWidthResizeDrag = (target: HTMLElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    resizeHistoryStarted.current = false
  }

  const showPlaceholder = !isOriginalPdfText && object.text === ''

  const renderStaticLines = (cursorClass: string) => {
    if (layout.lines.length <= 1 && !hasCustomBox) {
      return (
        <span
          className={`block ${cursorClass} p-0 m-0 outline-none ${showPlaceholder ? 'italic' : ''}`}
          style={{
            ...baseTextStyle,
            color: showPlaceholder ? '#94a3b8' : object.color,
            whiteSpace: 'pre',
            overflow: 'visible',
          }}
        >
          {object.text || (isOriginalPdfText ? '\u00A0' : 'Type text')}
        </span>
      )
    }

    return (
      <div className={`relative h-full w-full ${cursorClass}`}>
        {layout.lines.map((line, index) => (
          <span
            key={index}
            className={`block p-0 m-0 outline-none ${showPlaceholder && index === 0 ? 'italic' : ''}`}
            style={{
              ...baseTextStyle,
              position: 'absolute',
              left: 0,
              top: `${index * lineHeightPdf * zoom}px`,
              color: showPlaceholder && index === 0 ? '#94a3b8' : object.color,
              whiteSpace: 'pre',
              overflow: 'visible',
            }}
          >
            {index === 0 && !line
              ? isOriginalPdfText
                ? '\u00A0'
                : 'Type text'
              : line || '\u00A0'}
          </span>
        ))}
      </div>
    )
  }

  if (isMobile) {
    const isViewMode = mobileMode === 'view'
    const canDragOnMobile = !isViewMode && isSelectTool && selected
    const blockPointer = isViewMode || !isSelectTool

    return (
      <>
        {layout.covers.map((cover, idx) => (
          <div
            key={idx}
            className="pointer-events-none absolute z-0"
            style={{
              left: cover.x * zoom,
              top: cover.y * zoom,
              width: cover.width * zoom,
              height: cover.height * zoom,
              backgroundColor: cover.color,
            }}
          />
        ))}
        <div
          data-mobile-text-id={object.id}
          className={`absolute ${selected ? 'z-20' : 'z-10'} ${blockPointer ? 'pointer-events-none' : ''} ${
            isMergeTarget
              ? 'bg-emerald-500/15 ring-2 ring-emerald-500'
              : !isViewMode && selected
                ? 'ring-2 ring-brand-500'
                : ''
          } ${!isViewMode && layout.fit !== 'ok' ? 'outline-2 outline-dashed outline-orange-500' : ''}`}
          style={{
            left: elementLeft,
            top: elementTop,
            width: boxWidthPx,
            height: `${boxHeightPx}px`,
            minWidth: showPlaceholder && !boxWidthPx ? `${minEmptyScreenWidth}px` : undefined,
            touchAction: canDragOnMobile ? 'none' : 'pan-x pan-y pinch-zoom',
          }}
          onPointerDown={
            canDragOnMobile
              ? (event) => {
                  event.stopPropagation()
                  beginMoveDrag(event)
                }
              : undefined
          }
          onPointerMove={canDragOnMobile ? handleMoveDrag : undefined}
          onPointerUp={
            canDragOnMobile ? (e) => endMoveDrag(e.currentTarget, e.pointerId) : undefined
          }
          onPointerCancel={
            canDragOnMobile ? (e) => endMoveDrag(e.currentTarget, e.pointerId) : undefined
          }
          onLostPointerCapture={
            canDragOnMobile ? (e) => endMoveDrag(e.currentTarget, e.pointerId) : undefined
          }
          onClick={
            blockPointer
              ? undefined
              : (event) => {
                  event.stopPropagation()
                  if (hasMoved.current) {
                    hasMoved.current = false
                    return
                  }
                  if (mergeSourceId !== null && mergeSourceId !== object.id) {
                    if (isMergeTarget && mergeSourceObj) {
                      mergeWithTarget(mergeSourceObj.id, { kind: 'object', id: object.id })
                    } else {
                      setMergeSourceId(null)
                    }
                    return
                  }
                  const activeEditId = useMobileStore.getState().editingTextId
                  if (activeEditId && activeEditId !== object.id) {
                    commitTextEditor()
                  }
                  if (selected) {
                    openTextEditor(object.id, false)
                  } else {
                    selectObject(object.id)
                  }
                }
          }
        >
          {renderStaticLines('')}

          {canDragOnMobile && (
            <div
              aria-label="Adjust width horizontally"
              className="absolute -right-[26px] top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center"
              style={{ touchAction: 'none' }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={beginWidthResizeDrag('right')}
              onPointerMove={handleWidthResizeDrag}
              onPointerUp={(e) => endWidthResizeDrag(e.currentTarget, e.pointerId)}
              onPointerCancel={(e) => endWidthResizeDrag(e.currentTarget, e.pointerId)}
              onLostPointerCapture={(e) => endWidthResizeDrag(e.currentTarget, e.pointerId)}
            >
              <span className="pointer-events-none h-2.5 w-2.5 rounded-full border border-white/85 bg-brand-600/70 shadow-xs" />
            </div>
          )}
        </div>
      </>
    )
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isSelectTool) return
    event.stopPropagation()
    if (mergeSourceId !== null && mergeSourceId !== object.id) {
      if (isMergeTarget && mergeSourceObj) {
        mergeWithTarget(mergeSourceObj.id, { kind: 'object', id: object.id })
      } else {
        setMergeSourceId(null)
      }
      return
    }
    wasSelectedRef.current = selected
    selectObject(object.id)
    if (editing) return
    beginMoveDrag(event)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    endMoveDrag(event.currentTarget, event.pointerId)
    if (!hasMoved.current && !editing && wasSelectedRef.current) {
      enterEditing()
    }
  }

  const handleTextChange = (value: string) => {
    if (!editHistoryStarted.current) {
      beginHistory()
      editHistoryStarted.current = true
    }
    updateObject(object.id, { text: value }, false)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleTextChange(event.target.value)
  }

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    handleTextChange(event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      setEditing(false)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      updateObject(object.id, { text: initialText.current }, false)
      setEditing(false)
    }
  }

  const handleBlur = () => {
    setEditing(false)
    initialText.current = object.text
  }

  const showManipulationHandles = selected && isSelectTool && mergeSourceId === null
  const placeMoveBelow = elementTop < 28
  const halfLeadingPx = ((lineHeightPdf - glyphHeightPdf) / 2) * zoom

  return (
    <>
      {layout.covers.map((cover, idx) => (
        <div
          key={idx}
          className="pointer-events-none absolute z-0"
          style={{
            left: cover.x * zoom,
            top: cover.y * zoom,
            width: cover.width * zoom,
            height: cover.height * zoom,
            backgroundColor: cover.color,
          }}
        />
      ))}
      <div
        className={`absolute ${selected ? 'z-20' : 'z-10'} ${!isSelectTool ? 'pointer-events-none' : ''} ${
          isMergeTarget
            ? 'cursor-pointer bg-emerald-500/15 outline-2 outline-dashed outline-emerald-500'
            : selected
              ? 'ring-2 ring-brand-500'
              : isSelectTool
                ? 'hover:ring-1 hover:ring-brand-400/70'
                : ''
        } ${layout.fit !== 'ok' ? 'outline-2 outline-dashed outline-orange-500' : ''}`}
        style={{
          left: elementLeft,
          top: elementTop,
          width: boxWidthPx,
          height: `${boxHeightPx}px`,
          minWidth: !editing && showPlaceholder && !boxWidthPx ? `${minEmptyScreenWidth}px` : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handleMoveDrag}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => endMoveDrag(e.currentTarget, e.pointerId)}
        onLostPointerCapture={(e) => endMoveDrag(e.currentTarget, e.pointerId)}
        onDoubleClick={(event) => {
          if (!isSelectTool || editing) return
          event.stopPropagation()
          enterEditing()
        }}
      >
        {showManipulationHandles && (
          <div
            role="button"
            aria-label="Move text"
            title="Drag to move"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation()
              selectObject(object.id)
              beginMoveDrag(event)
            }}
            onPointerMove={handleMoveDrag}
            onPointerUp={(event) => {
              event.stopPropagation()
              endMoveDrag(event.currentTarget, event.pointerId)
            }}
            onPointerCancel={(event) => endMoveDrag(event.currentTarget, event.pointerId)}
            onLostPointerCapture={(event) => endMoveDrag(event.currentTarget, event.pointerId)}
            className={`absolute ${
              placeMoveBelow ? '-bottom-6 rounded-b' : '-top-6 rounded-t'
            } left-0 z-20 flex h-5 cursor-move select-none items-center gap-1 bg-brand-600 px-2 text-[11px] font-medium text-white shadow-xs`}
          >
            <Move size={11} strokeWidth={2.2} />
            <span>Move</span>
          </div>
        )}

        {editing ? (
          isMultilineEditor ? (
            <textarea
              ref={textareaRef}
              value={object.text}
              placeholder={isOriginalPdfText ? '' : 'Type text'}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onPointerDown={(event) => event.stopPropagation()}
              className="block resize-none overflow-hidden border-none bg-transparent p-0 m-0 outline-none placeholder:text-slate-400"
              style={{
                ...baseTextStyle,
                width: `${boxWidthPx ?? inputWidth}px`,
                height: `${Math.max(boxHeightPx + halfLeadingPx * 2, lineCount * lineHeightPdf * zoom)}px`,
                lineHeight: `${lineHeightPdf * zoom}px`,
                marginTop: `${-halfLeadingPx}px`,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
              }}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={object.text}
              placeholder={isOriginalPdfText ? '' : 'Type text'}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onPointerDown={(event) => event.stopPropagation()}
              className="block border-none bg-transparent p-0 m-0 outline-none placeholder:text-slate-400"
              style={{
                ...baseTextStyle,
                width: `${inputWidth}px`,
              }}
            />
          )
        ) : (
          renderStaticLines(isMergeTarget ? 'cursor-pointer' : 'cursor-move')
        )}

        {showManipulationHandles &&
          (['left', 'right'] as const).map((side) => (
            <div
              key={side}
              aria-label={`Adjust text ${side} edge`}
              title="Drag horizontally to adjust width"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={beginWidthResizeDrag(side)}
              onPointerMove={handleWidthResizeDrag}
              onPointerUp={(event) => {
                event.stopPropagation()
                endWidthResizeDrag(event.currentTarget, event.pointerId)
              }}
              onPointerCancel={(event) => endWidthResizeDrag(event.currentTarget, event.pointerId)}
              onLostPointerCapture={(event) =>
                endWidthResizeDrag(event.currentTarget, event.pointerId)
              }
              className={`absolute top-1/2 z-20 flex h-5 w-4 -translate-y-1/2 cursor-ew-resize items-center justify-center ${
                side === 'left' ? '-left-[11px]' : '-right-[11px]'
              }`}
            >
              <span className="pointer-events-none h-2 w-2 rounded-full bg-brand-600/70 ring-1 ring-white/85 shadow-xs" />
            </div>
          ))}
      </div>
    </>
  )
}
