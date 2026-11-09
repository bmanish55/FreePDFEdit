import type { ChangeEvent } from 'react'
import type { FontFamilyKey } from '../lib/fonts/fontMatcher'
import { usePdfStore, type TextObject } from '../store/usePdfStore'

export default function Toolbar() {
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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setActiveTool('select')}
        className={`rounded border px-3 py-1 text-sm ${
          activeTool === 'select'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300'
        }`}
      >
        Select
      </button>
      <button
        type="button"
        onClick={() => setActiveTool('addText')}
        className={`rounded border px-3 py-1 text-sm ${
          activeTool === 'addText'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300'
        }`}
      >
        Add Text
      </button>
      <label
        className={`cursor-pointer rounded border px-3 py-1 text-sm ${
          activeTool === 'addImage'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300'
        }`}
      >
        Add Image
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(event) => void handleImageChange(event)}
          onClick={() => setActiveTool('addImage')}
        />
      </label>
      <button
        type="button"
        onClick={() => setActiveTool('whiteout')}
        className={`rounded border px-3 py-1 text-sm ${
          activeTool === 'whiteout'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300'
        }`}
      >
        Whiteout
      </button>
      <button
        type="button"
        onClick={() => setActiveTool('highlight')}
        className={`rounded border px-3 py-1 text-sm ${
          activeTool === 'highlight'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-slate-300'
        }`}
      >
        Highlight
      </button>
      <button
        type="button"
        onClick={undo}
        className="rounded border border-slate-300 px-3 py-1 text-sm"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={deleteSelected}
        className="rounded border border-slate-300 px-3 py-1 text-sm"
      >
        Delete
      </button>
      <button
        type="button"
        onClick={() => setZoom(zoom - 0.1)}
        className="rounded border border-slate-300 px-3 py-1 text-sm"
      >
        −
      </button>
      <span className="min-w-14 text-center text-sm text-slate-600">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => setZoom(zoom + 0.1)}
        className="rounded border border-slate-300 px-3 py-1 text-sm"
      >
        +
      </button>

      {selectedTextObject && (
        <div className="flex flex-wrap items-center gap-1.5 border-l border-slate-300 pl-2">
          <select
            value={selectedTextObject.fontFamily}
            onChange={(e) =>
              updateObject(selectedTextObject.id, {
                fontFamily: e.target.value as FontFamilyKey,
              })
            }
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            aria-label="Font family"
          >
            <option value="arimo">Arimo (Arial/Helvetica)</option>
            <option value="carlito">Carlito (Calibri)</option>
            <option value="tinos">Tinos (Times New Roman)</option>
            <option value="cousine">Cousine (Courier New)</option>
            <option value="devanagari">Noto Sans Devanagari (Hindi / Marathi)</option>
          </select>

          <button
            type="button"
            onClick={() =>
              updateObject(selectedTextObject.id, { bold: !selectedTextObject.bold })
            }
            className={`rounded border px-2 py-1 text-xs font-bold ${
              selectedTextObject.bold
                ? 'border-blue-600 bg-blue-100 text-blue-800'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
            aria-label="Toggle bold"
            title="Bold"
          >
            B
          </button>

          <button
            type="button"
            onClick={() =>
              updateObject(selectedTextObject.id, {
                italic: !selectedTextObject.italic,
              })
            }
            className={`rounded border px-2 py-1 text-xs italic ${
              selectedTextObject.italic
                ? 'border-blue-600 bg-blue-100 text-blue-800'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
            aria-label="Toggle italic"
            title="Italic"
          >
            I
          </button>

          <label className="flex items-center gap-1 text-xs text-slate-600">
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
              className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-800"
              aria-label="Font size"
            />
          </label>

          <label
            className="flex items-center gap-1 text-xs text-slate-600"
            title="Text Color"
          >
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
              className="h-6 w-7 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              aria-label="Text color"
            />
          </label>
        </div>
      )}
    </div>
  )
}
