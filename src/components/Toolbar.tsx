import type { ChangeEvent } from 'react'
import { usePdfStore } from '../store/usePdfStore'

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
      height: width * image.height / image.width,
      dataUrl,
      mime: file.type,
    })
    setVisiblePage(visiblePage)
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setActiveTool('select')} className={`rounded border px-3 py-1 text-sm ${activeTool === 'select' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300'}`}>
        Select
      </button>
      <button type="button" onClick={() => setActiveTool('addText')} className={`rounded border px-3 py-1 text-sm ${activeTool === 'addText' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300'}`}>
        Add Text
      </button>
      <label className={`cursor-pointer rounded border px-3 py-1 text-sm ${activeTool === 'addImage' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300'}`}>
        Add Image
        <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => void handleImageChange(event)} onClick={() => setActiveTool('addImage')} />
      </label>
      <button type="button" onClick={() => setActiveTool('whiteout')} className={`rounded border px-3 py-1 text-sm ${activeTool === 'whiteout' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300'}`}>
        Whiteout
      </button>
      <button type="button" onClick={() => setActiveTool('highlight')} className={`rounded border px-3 py-1 text-sm ${activeTool === 'highlight' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300'}`}>
        Highlight
      </button>
      <button type="button" onClick={undo} className="rounded border border-slate-300 px-3 py-1 text-sm">
        Undo
      </button>
      <button type="button" onClick={deleteSelected} className="rounded border border-slate-300 px-3 py-1 text-sm">
        Delete
      </button>
      <button type="button" onClick={() => setZoom(zoom - 0.1)} className="rounded border border-slate-300 px-3 py-1 text-sm">
        −
      </button>
      <span className="min-w-14 text-center text-sm text-slate-600">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => setZoom(zoom + 0.1)} className="rounded border border-slate-300 px-3 py-1 text-sm">
        +
      </button>
    </div>
  )
}
