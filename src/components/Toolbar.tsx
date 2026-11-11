import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Bold,
  ChevronDown,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Merge,
  MessageSquarePlus,
  MousePointer2,
  MousePointerClick,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react'
import type { FontFamilyKey } from '../lib/fonts/fontMatcher'
import { getSameLineCandidates } from '../lib/text/mergeText'
import {
  usePdfStore,
  type AnnotationObject,
  type ShapeObject,
  type TextObject,
} from '../store/usePdfStore'
import ToolButton from './ui/ToolButton'
import Button from './ui/Button'
import FontSizeInput from './ui/FontSizeInput'
import AiOptimizeModal from './AiOptimizeModal'
import AnnotateStyleBar from './AnnotateStyleBar'
import ShapeStyleBar from './ShapeStyleBar'
import ShapeIconSvg, { SHAPE_OPTIONS } from './ui/ShapeIconSvg'

export default function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shapeBtnRef = useRef<HTMLButtonElement>(null)
  const shapeMenuRef = useRef<HTMLDivElement>(null)
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false)
  const [shapeMenuPos, setShapeMenuPos] = useState<{ top: number; left: number }>({
    top: 100,
    left: 200,
  })

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
  const selectObject = usePdfStore((state) => state.selectObject)
  const objects = usePdfStore((state) => state.objects)
  const updateObject = usePdfStore((state) => state.updateObject)
  const beginHistory = usePdfStore((state) => state.beginHistory)
  const pageTextRuns = usePdfStore((state) => state.pageTextRuns)
  const mergeSourceId = usePdfStore((state) => state.mergeSourceId)
  const setMergeSourceId = usePdfStore((state) => state.setMergeSourceId)
  const mergeLineForSelected = usePdfStore((state) => state.mergeLineForSelected)
  const isAiModalOpen = usePdfStore((state) => state.isAiModalOpen)
  const setAiModalOpen = usePdfStore((state) => state.setAiModalOpen)
  const activeShapeKind = usePdfStore((state) => state.activeShapeKind)
  const setActiveShapeKind = usePdfStore((state) => state.setActiveShapeKind)

  const selectedTextObject = objects.find(
    (obj): obj is TextObject => obj.id === selectedId && obj.type === 'text',
  )
  const selectedAnnotationObject = objects.find(
    (obj): obj is AnnotationObject =>
      obj.id === selectedId && obj.type === 'annotation',
  )
  const selectedShapeObject = objects.find(
    (obj): obj is ShapeObject => obj.id === selectedId && obj.type === 'shape',
  )

  const showAnnotateBar =
    Boolean(selectedAnnotationObject) ||
    (activeTool === 'annotate' && !selectedTextObject && !selectedShapeObject)
  const showShapeBar =
    Boolean(selectedShapeObject) ||
    (activeTool === 'shape' && !selectedTextObject && !selectedAnnotationObject)

  useEffect(() => {
    if (!isShapeMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        shapeMenuRef.current?.contains(target) ||
        shapeBtnRef.current?.contains(target)
      ) {
        return
      }
      setIsShapeMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setIsShapeMenuOpen(false)
      }
    }
    const handleViewportChange = () => setIsShapeMenuOpen(false)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [isShapeMenuOpen])

  const openShapeMenu = () => {
    setActiveTool('shape')
    if (!selectedShapeObject) {
      selectObject(null)
    }
    if (!isShapeMenuOpen && shapeBtnRef.current) {
      const rect = shapeBtnRef.current.getBoundingClientRect()
      setShapeMenuPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 190)),
      })
    }
    setIsShapeMenuOpen((open) => !open)
  }
  const sameLineCount = selectedTextObject
    ? getSameLineCandidates(
        selectedTextObject,
        objects,
        pageTextRuns[selectedTextObject.page] ?? [],
      ).length
    : 0
  const canMergeLine = sameLineCount >= 2
  const isMergePicking =
    selectedTextObject !== undefined && mergeSourceId === selectedTextObject.id

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
    setActiveTool('select')
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
            setActiveTool('select')
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
        <ToolButton
          icon={<MessageSquarePlus size={18} strokeWidth={2} />}
          label="Annotate"
          active={activeTool === 'annotate'}
          onClick={() => {
            setIsShapeMenuOpen(false)
            setActiveTool('annotate')
            if (!selectedAnnotationObject) {
              selectObject(null)
            }
          }}
          className="shrink-0"
        />
        <button
          ref={shapeBtnRef}
          type="button"
          onClick={openShapeMenu}
          title="Shapes"
          aria-expanded={isShapeMenuOpen}
          aria-haspopup="menu"
          className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            activeTool === 'shape'
              ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShapeIconSvg kind={activeShapeKind} size={18} />
          <span className="hidden sm:inline">Shapes</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${
              isShapeMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

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
              <FontSizeInput
                value={selectedTextObject.fontSize}
                onStartEdit={beginHistory}
                onChange={(fontSize) =>
                  updateObject(selectedTextObject.id, { fontSize }, false)
                }
                className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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

            <div className="mx-1 h-6 w-px bg-slate-200" />

            <Button
              variant="secondary"
              size="sm"
              disabled={!canMergeLine}
              onClick={() => mergeLineForSelected(selectedTextObject.id)}
              title={
                canMergeLine
                  ? 'Merge all split blocks on this horizontal line into one sentence'
                  : 'No other text blocks on this line to merge'
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <Merge size={14} />
              <span>Merge Line</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={!canMergeLine}
              onClick={() =>
                setMergeSourceId(isMergePicking ? null : selectedTextObject.id)
              }
              title={
                canMergeLine
                  ? 'Click another text block on this line to merge with it'
                  : 'No other text blocks on this line to merge'
              }
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                isMergePicking
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : ''
              }`}
            >
              <MousePointerClick size={14} />
              <span>{isMergePicking ? 'Cancel Merge' : 'Merge With...'}</span>
            </Button>

            {isMergePicking && (
              <span className="text-xs font-medium text-emerald-700">
                Click another block on this line
              </span>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAiModalOpen(true)}
              className="ml-auto inline-flex items-center gap-1.5 border-brand-200 bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              <Sparkles size={14} className="text-brand-600" />
              <span>AI Fit & Polish</span>
            </Button>
          </div>
        </div>
      )}

      {isShapeMenuOpen && (
        <div
          ref={shapeMenuRef}
          role="menu"
          aria-label="Shape tools"
          style={{ top: `${shapeMenuPos.top}px`, left: `${shapeMenuPos.left}px` }}
          className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {SHAPE_OPTIONS.map((opt) => {
            const isActive = activeShapeKind === opt.kind && activeTool === 'shape'
            return (
              <button
                key={opt.kind}
                type="button"
                role="menuitem"
                onClick={() => {
                  setActiveShapeKind(opt.kind)
                  setActiveTool('shape')
                  if (!selectedShapeObject) {
                    selectObject(null)
                  }
                  setIsShapeMenuOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShapeIconSvg kind={opt.kind} size={18} />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 2. Annotate properties bar */}
      {showAnnotateBar && (
        <div className="border-t border-slate-200 bg-slate-50">
          <AnnotateStyleBar />
        </div>
      )}

      {/* 3. Shape properties bar */}
      {showShapeBar && (
        <div className="border-t border-slate-200 bg-slate-50">
          <ShapeStyleBar />
        </div>
      )}

      {selectedTextObject && (
        <AiOptimizeModal
          isOpen={isAiModalOpen}
          onClose={() => setAiModalOpen(false)}
          textObject={selectedTextObject}
        />
      )}
    </div>
  )
}
