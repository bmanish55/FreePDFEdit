import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { pdfToScreen } from '../lib/coords'
import { usePdfStore, type EditObject } from '../store/usePdfStore'

type ObjectViewProps = {
  object: EditObject
  zoom: number
}

export default function ObjectView({ object, zoom }: ObjectViewProps) {
  const selectedId = usePdfStore((state) => state.selectedId)
  const selectObject = usePdfStore((state) => state.selectObject)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const [editing, setEditing] = useState(object.type === 'text' && (object.text.length === 0 || object.coverOriginal))
  const dragStart = useRef({ x: 0, y: 0 })
  const objectStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, width: 0, height: 0 })
  const selected = selectedId === object.id
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
    updateObject(object.id, {
      x: objectStart.current.x + (event.clientX - dragStart.current.x) / zoom,
      y: objectStart.current.y + (event.clientY - dragStart.current.y) / zoom,
    }, false)
  }

  if (object.type === 'image') {
    return (
      <div
        className={`absolute ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{ left: position.x, top: position.y, width: object.width * zoom, height: object.height * zoom }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      >
        <img src={object.dataUrl} alt="Added PDF image" className="h-full w-full object-contain" draggable={false} />
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
              updateObject(object.id, {
                width: nextWidth,
                height: resizeStart.current.height * nextWidth / resizeStart.current.width,
              }, false)
            }}
            onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={`absolute ${object.type === 'text' && object.coverOriginal ? 'bg-white' : ''} ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ left: position.x, top: position.y, width: object.width * zoom, minHeight: object.height * zoom }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          autoFocus
          value={object.text}
          onChange={(event) => updateObject(object.id, { text: event.target.value })}
          onBlur={() => setEditing(false)}
          onPointerDown={(event) => event.stopPropagation()}
          className="h-full w-full border border-blue-400 bg-white/90 px-1 outline-none"
          style={{ fontSize: object.fontSize * zoom, color: object.color }}
        />
      ) : (
        <span className="block whitespace-pre-wrap px-1" style={{ fontSize: object.fontSize * zoom, color: object.color }}>
          {object.text}
        </span>
      )}
    </div>
  )
}
