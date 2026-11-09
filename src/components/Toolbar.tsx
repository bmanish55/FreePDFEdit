import { useRef, type ChangeEvent } from 'react'
import {
  Bold,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  MousePointer2,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { FontFamilyKey } from '../lib/fonts/fontMatcher'
import { usePdfStore, type TextObject } from '../store/usePdfStore'
import ToolButton from './ui/ToolButton'

export default function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zoom = usePdfStore((state) => state.zoom)
  const setZoom = usePdfStore((state) => state.setZoom)
  const activeTool = usePdfStore((state) => state.activeTool)
  const setActiveTool = usePdfStore((state) => state.setActiveTool)
  const undo = usePdfStore((state) => state.undo)
  const deleteSelected = usePdfStore((state) => state.deleteSelected)
  const setVisiblePage = usePdfStore((state) => state.setVisiblePage)
  const visiblePage = usePdfStore((state) => state.visiblePage)
  const addObject = usePdfStore((state) => state.addObject)
  const selectedId = usePdfStore((state) => state.selectedId)
  const objects = usePdfStore((state) => state.objects)
  const updateObject = usePdfStore((state) => state.updateObject)

  const selectedTextObject = objects.find(
    (obj): obj is TextObject => obj.id === selectedId && obj.type === 'text',
  )

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || (file.type !== 'image/png' && file.type !== 'image/jpeg')) return
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read image'))
      reader.readAsDataURL(file)
    })
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const width = 200
    addObject({
      id: crypto.randomUUID(),
      type: 'image',
      page: visiblePage,
      x: 50,
      y: 50,
      width,
      height: (width * image.height) / image.width,
      dataUrl,
      mime: file.type,
    })
    setVisiblePage(visiblePage)
  }

  return (
    <div className="sticky top-14 z-20 border-b border-slate-200 bg-white">
      {/* 1. Main toolbar row */}
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {/* Tools */}
        <ToolButton
          icon={<MousePointer2 size={18} strokeWidth={2} />}
          label="Select"
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          className="shrink-0"
        />
        <ToolButton
          icon={<Type size={18} strokeWidth={2} />}
          label="Add Text"
          active={activeTool === 'addText'}
          onClick={() => setActiveTool('addText')}
          className="shrink-0"
        />
        <ToolButton
          icon={<ImagePlus size={18} strokeWidth={2} />}
          label="Add Image"
          active={activeTool === 'addImage'}
          onClick={() => {
            setActiveTool('addImage')
            fileInputRef.current?.click()
          }}
          className="shrink-0"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(event) => void handleImageChange(event)}
        />
        <ToolButton
          icon={<Eraser size={18} strokeWidth={2} />}
          label="Whiteout"
          active={activeTool === 'whiteout'}
          onClick={() => setActiveTool('whiteout')}
          className="shrink-0"
        />
        <ToolButton
          icon={<Highlighter size={18} strokeWidth={2} />}
          label="Highlight"
          active={activeTool === 'highlight'}
          onClick={() => setActiveTool('highlight')}
          className="shrink-0"
        />

        {/* Divider */}
        <div className="mx-2 h-6 w-px shrink-0 bg-slate-200" />

        {/* Edit */}
        <ToolButton
          icon={<Undo2 size={18} strokeWidth={2} />}
          label="Undo"
          onClick={undo}
          className="shrink-0"
        />
        <ToolButton
          icon={<Trash2 size={18} strokeWidth={2} />}
          label="Delete"
          danger
          onClick={deleteSelected}
          className="shrink-0"
        />

        {/* Divider */}
        <div className="mx-2 h-6 w-px shrink-0 bg-slate-200" />

        {/* Zoom */}
        <ToolButton
          icon={<ZoomOut size={18} strokeWidth={2} />}
          label="Zoom out"
          hideLabel
          onClick={() => setZoom(zoom - 0.1)}
          className="shrink-0"
        />
        <span className="w-12 shrink-0 text-center text-sm tabular-nums text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton
          icon={<ZoomIn size={18} strokeWidth={2} />}
          label="Zoom in"
          hideLabel
          onClick={() => setZoom(zoom + 0.1)}
          className="shrink-0"
        />

        {/* Hint */}
        <span className="ml-auto hidden shrink-0 text-xs text-slate-500 lg:inline">
          Edited text matches original font.
        </span>
      </div>

      {/* 2. Text properties bar */}
      {selectedTextObject && (
        <div className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
            <select
              value={selectedTextObject.fontFamily}
              onChange={(e) =>
                updateObject(selectedTextObject.id, {
                  fontFamily: e.target.value as FontFamilyKey,
                })
              }
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Font family"
            >
              <option value="arimo">Arimo (Arial/Helvetica)</option>
              <option value="carlito">Carlito (Calibri)</option>
              <option value="tinos">Tinos (Times New Roman)</option>
              <option value="cousine">Cousine (Courier New)</option>
              <option value="devanagari">Noto Sans Devanagari (Hindi / Marathi)</option>
            </select>

            <ToolButton
              icon={<Bold size={18} strokeWidth={2} />}
              label="Bold"
              hideLabel
              active={selectedTextObject.bold}
              onClick={() =>
                updateObject(selectedTextObject.id, { bold: !selectedTextObject.bold })
              }
            />

            <ToolButton
              icon={<Italic size={18} strokeWidth={2} />}
              label="Italic"
              hideLabel
              active={selectedTextObject.italic}
              onClick={() =>
                updateObject(selectedTextObject.id, {
                  italic: !selectedTextObject.italic,
                })
              }
            />

            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <span>Size:</span>
              <input
                type="number"
                min={6}
                max={96}
                step={1}
                value={Math.round(selectedTextObject.fontSize)}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value)
                  if (!Number.isNaN(val) && val >= 4 && val <= 120) {
                    updateObject(selectedTextObject.id, { fontSize: val })
                  }
                }}
                className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Font size"
              />
            </label>

            <label className="flex items-center gap-1.5 text-sm text-slate-600" title="Text Color">
              <span>Color:</span>
              <input
                type="color"
                value={
                  selectedTextObject.color.startsWith('#')
                    ? selectedTextObject.color
                    : '#000000'
                }
                onChange={(e) =>
                  updateObject(selectedTextObject.id, { color: e.target.value })
                }
                className="h-9 w-9 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Text color"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
