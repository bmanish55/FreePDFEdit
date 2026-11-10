import { useRef, type ChangeEvent } from 'react'
import {
  Check,
  Eraser,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Pencil,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useMobileStore } from '../../store/useMobileStore'
import { usePdfStore, type ActiveTool } from '../../store/usePdfStore'
import Button from '../ui/Button'
import { createMobileImageObject } from './mobileImageHelper'

type MobileBottomBarProps = {
  onFitWidth: () => void
}

export default function MobileBottomBar({ onFitWidth }: MobileBottomBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mode = useMobileStore((state) => state.mode)
  const setMode = useMobileStore((state) => state.setMode)
  const showHint = useMobileStore((state) => state.showHint)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)
  const closeTextEditor = useMobileStore((state) => state.closeTextEditor)

  const zoom = usePdfStore((state) => state.zoom)
  const setZoom = usePdfStore((state) => state.setZoom)
  const activeTool = usePdfStore((state) => state.activeTool)
  const setActiveTool = usePdfStore((state) => state.setActiveTool)
  const visiblePage = usePdfStore((state) => state.visiblePage)
  const addObject = usePdfStore((state) => state.addObject)
  const undo = usePdfStore((state) => state.undo)
  const deleteSelected = usePdfStore((state) => state.deleteSelected)
  const selectedId = usePdfStore((state) => state.selectedId)
  const historyLength = usePdfStore((state) => state.history.length)

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || (file.type !== 'image/png' && file.type !== 'image/jpeg')) {
      setActiveTool('select')
      return
    }
    try {
      const imageObject = await createMobileImageObject(file, visiblePage)
      commitTextEditor()
      addObject(imageObject)
      showHint('Drag to move, use the corner to resize')
    } catch {
      // Ignore unreadable image files
    } finally {
      setActiveTool('select')
    }
  }

  const handleSelectTool = (tool: ActiveTool) => {
    if (tool === 'select') {
      setActiveTool('select')
      showHint('Tap any text to edit it')
    } else if (tool === 'addText') {
      setActiveTool('addText')
      showHint('Tap on the page to add text')
    } else if (tool === 'addImage') {
      setActiveTool('addImage')
      fileInputRef.current?.click()
    } else if (tool === 'whiteout') {
      setActiveTool('whiteout')
      showHint('Tap to place a box, then drag to move or resize')
    } else if (tool === 'highlight') {
      setActiveTool('highlight')
      showHint('Tap to place a highlight, then drag to move or resize')
    }
  }

  const toolItems = [
    { id: 'select', label: 'Select', icon: MousePointer2, active: activeTool === 'select' },
    { id: 'addText', label: 'Text', icon: Type, active: activeTool === 'addText' },
    { id: 'addImage', label: 'Image', icon: ImagePlus, active: activeTool === 'addImage' },
    { id: 'whiteout', label: 'Whiteout', icon: Eraser, active: activeTool === 'whiteout' },
    { id: 'highlight', label: 'Highlight', icon: Highlighter, active: activeTool === 'highlight' },
  ] as const

  return (
    <nav
      aria-label="Mobile PDF controls"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => void handleImageChange(event)}
      />

      {mode === 'view' ? (
        <div className="flex h-14 items-center justify-evenly px-2">
          <Button
            variant="primary"
            size="md"
            icon={<Pencil size={16} strokeWidth={2} />}
            onClick={() => {
              setMode('edit')
              showHint('Pick a tool below')
            }}
          >
            Edit
          </Button>

          <button
            type="button"
            onClick={() => setZoom(zoom - 0.1)}
            aria-label="Zoom out"
            title="Zoom out"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ZoomOut size={18} strokeWidth={2} />
          </button>

          <span className="w-12 text-center text-sm font-medium tabular-nums text-slate-700">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom(zoom + 0.1)}
            aria-label="Zoom in"
            title="Zoom in"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ZoomIn size={18} strokeWidth={2} />
          </button>

          <Button
            variant="secondary"
            size="md"
            onClick={onFitWidth}
            aria-label="Fit to width"
            title="Fit to width"
          >
            Fit
          </Button>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            variant="secondary"
            size="md"
            icon={<Check size={16} strokeWidth={2} />}
            onClick={() => setMode('view')}
            className="shrink-0"
          >
            Done
          </Button>

          <div className="mx-1 h-7 w-px shrink-0 bg-slate-200" />

          {toolItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTool(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  item.active
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </button>
            )
          })}

          <button
            type="button"
            disabled={historyLength === 0}
            onClick={() => {
              commitTextEditor()
              undo()
            }}
            aria-label="Undo"
            title="Undo"
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              historyLength === 0
                ? 'pointer-events-none text-slate-400 opacity-40'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Undo2 size={20} strokeWidth={2} />
            <span className="text-[11px] font-medium leading-none">Undo</span>
          </button>

          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              closeTextEditor()
              deleteSelected()
            }}
            aria-label="Delete"
            title="Delete"
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              !selectedId
                ? 'pointer-events-none text-slate-400 opacity-40'
                : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <Trash2 size={20} strokeWidth={2} />
            <span className="text-[11px] font-medium leading-none">Delete</span>
          </button>
        </div>
      )}
    </nav>
  )
}
