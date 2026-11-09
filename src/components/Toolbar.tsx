import { usePdfStore } from '../store/usePdfStore'

export default function Toolbar() {
  const zoom = usePdfStore((state) => state.zoom)
  const setZoom = usePdfStore((state) => state.setZoom)

  return (
    <div className="flex items-center gap-2">
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
