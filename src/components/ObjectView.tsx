import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, PointerEvent } from 'react'
import { pdfToScreen } from '../lib/coords'
import { loadFont, type LoadedFont } from '../lib/fonts/fontLoader'
import { hasDevanagari } from '../lib/fonts/fontMatcher'
import { layoutText } from '../lib/text/layoutText'
import { usePdfStore, type EditObject, type TextObject } from '../store/usePdfStore'

type ObjectViewProps = {
  object: EditObject
  zoom: number
}

function TextView({ object, zoom }: { object: TextObject; zoom: number }) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const setTextWarning = usePdfStore((state) => state.setTextWarning)
  const selected = selectedId === object.id

  const [font, setFont] = useState<LoadedFont | null>(null)
  const [editing, setEditing] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const initialText = useRef(object.text)
  const hasMoved = useRef(false)

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
            ? 'serif'
            : 'sans-serif',
    unitsPerEm: 1000,
    ascent: 0.95,
    descent: 0.25,
    measure: (text: string, fontSize: number) => text.length * fontSize * 0.55,
  }

  const layout = layoutText(object, effectiveFont)

  useEffect(() => {
    if (selected) {
      setTextWarning(layout.warning)
    }
  }, [selected, layout.warning, setTextWarning])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus({ preventScroll: true })
    }
  }, [editing])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    selectObject(object.id)
    if (editing) return
    hasMoved.current = false
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = { x: object.x, y: object.baselineY }
    beginHistory()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const dx = (event.clientX - dragStart.current.x) / zoom
    const dy = (event.clientY - dragStart.current.y) / zoom
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      hasMoved.current = true
    }
    updateObject(
      object.id,
      {
        x: objectStart.current.x + dx,
        baselineY: objectStart.current.y + dy,
      },
      false,
    )
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!hasMoved.current && !editing) {
      initialText.current = object.text
      setEditing(true)
    }
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateObject(object.id, { text: event.target.value })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      setEditing(false)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      updateObject(object.id, { text: initialText.current })
      setEditing(false)
    }
  }

  const handleBlur = () => {
    setEditing(false)
    initialText.current = object.text
  }

  const elementHeight = (effectiveFont.ascent + effectiveFont.descent) * layout.fontSize * zoom
  const elementTop = (layout.baselineY - effectiveFont.ascent * layout.fontSize) * zoom
  const elementLeft = layout.textX * zoom
  const inputWidth = Math.max(layout.width * zoom + 16, 32)

  const fontCss =
    activeFamily === 'devanagari'
      ? `${effectiveFont.cssFamily}, 'Noto Sans Devanagari', sans-serif`
      : effectiveFont.cssFamily

  return (
    <>
      {layout.cover && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: layout.cover.x * zoom,
            top: layout.cover.y * zoom,
            width: layout.cover.width * zoom,
            height: layout.cover.height * zoom,
            backgroundColor: layout.cover.color,
          }}
        />
      )}
      <div
        className={`absolute ${selected ? 'ring-2 ring-blue-500' : ''} ${
          layout.fit !== 'ok' ? 'outline-2 outline-dashed outline-orange-500' : ''
        }`}
        style={{
          left: elementLeft,
          top: elementTop,
          height: `${elementHeight}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={object.text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPointerDown={(event) => event.stopPropagation()}
            className="block border-none bg-transparent p-0 m-0 outline-none"
            style={{
              fontFamily: fontCss,
              fontSize: `${layout.fontSize * zoom}px`,
              color: object.color,
              fontWeight: object.bold ? 'bold' : 'normal',
              fontStyle: object.italic ? 'italic' : 'normal',
              height: `${elementHeight}px`,
              lineHeight: `${elementHeight}px`,
              width: `${inputWidth}px`,
            }}
          />
        ) : (
          <span
            className="block cursor-text p-0 m-0 outline-none"
            style={{
              fontFamily: fontCss,
              fontSize: `${layout.fontSize * zoom}px`,
              color: object.color,
              fontWeight: object.bold ? 'bold' : 'normal',
              fontStyle: object.italic ? 'italic' : 'normal',
              whiteSpace: 'pre',
              overflow: 'visible',
              height: `${elementHeight}px`,
              lineHeight: `${elementHeight}px`,
            }}
          >
            {object.text || '\u00A0'}
          </span>
        )}
      </div>
    </>
  )
}

export default function ObjectView({ object, zoom }: ObjectViewProps) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)

  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, width: 0, height: 0 })
  const selected = selectedId === object.id

  if (object.type === 'text') {
    return <TextView object={object} zoom={zoom} />
  }

  const position = pdfToScreen(object, zoom)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    selectObject(object.id)
    dragStart.current = { x: event.clientX, y: event.clientY }
    objectStart.current = { x: object.x, y: object.y }
    beginHistory()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const dx = (event.clientX - dragStart.current.x) / zoom
    const dy = (event.clientY - dragStart.current.y) / zoom
    updateObject(
      object.id,
      {
        x: objectStart.current.x + dx,
        y: objectStart.current.y + dy,
      },
      false,
    )
  }

  if (object.type === 'whiteout' || object.type === 'highlight') {
    return (
      <div
        className={`absolute ${object.type === 'whiteout' ? 'bg-white' : 'bg-yellow-300/40'} ${
          selected ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{ left: position.x, top: position.y, width: object.width * zoom, height: object.height * zoom }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      />
    )
  }

  if (object.type !== 'image') return null

  return (
    <div
      className={`absolute ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ left: position.x, top: position.y, width: object.width * zoom, height: object.height * zoom }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
    >
      <img src={object.dataUrl} alt="Added PDF" className="h-full w-full object-contain" draggable={false} />
      {selected && (
        <div
          className="absolute bottom-[-5px] right-[-5px] h-3 w-3 cursor-se-resize rounded-sm bg-blue-600"
          onPointerDown={(event) => {
            event.stopPropagation()
            selectObject(object.id)
            resizeStart.current = {
              x: event.clientX,
              width: object.width,
              height: object.height,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            beginHistory()
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            const nextWidth = Math.max(20, resizeStart.current.width + (event.clientX - resizeStart.current.x) / zoom)
            updateObject(
              object.id,
              {
                width: nextWidth,
                height: (resizeStart.current.height * nextWidth) / resizeStart.current.width,
              },
              false,
            )
          }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
        />
      )}
    </div>
  )
}
