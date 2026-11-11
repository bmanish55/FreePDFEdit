import { Ban, Contrast, Minus, MoreHorizontal } from 'lucide-react'
import {
  usePdfStore,
  type LineStyle,
  type ShapeObject,
  type ShapeStyle,
} from '../store/usePdfStore'
import ShapeIconSvg, { SHAPE_OPTIONS } from './ui/ShapeIconSvg'

interface ShapeStyleBarProps {
  compact?: boolean
  showShapePicker?: boolean
}

const OPACITY_OPTIONS = [0.25, 0.5, 0.75, 1]
const STROKE_WIDTH_OPTIONS = [1, 2, 3, 5, 8, 12]

export default function ShapeStyleBar({
  compact = false,
  showShapePicker = false,
}: ShapeStyleBarProps) {
  const activeShapeKind = usePdfStore((state) => state.activeShapeKind)
  const activeShapeStyle = usePdfStore((state) => state.activeShapeStyle)
  const setActiveShapeKind = usePdfStore((state) => state.setActiveShapeKind)
  const updateActiveShapeStyle = usePdfStore((state) => state.updateActiveShapeStyle)
  const selectedId = usePdfStore((state) => state.selectedId)
  const objects = usePdfStore((state) => state.objects)

  const selectedShape = objects.find(
    (obj): obj is ShapeObject => obj.id === selectedId && obj.type === 'shape',
  )

  const currentStyle: ShapeStyle = selectedShape
    ? {
        strokeColor: selectedShape.strokeColor,
        fillColor: selectedShape.fillColor,
        opacity: selectedShape.opacity,
        strokeWidth: selectedShape.strokeWidth,
        lineStyle: selectedShape.lineStyle,
      }
    : activeShapeStyle
  const currentKind = selectedShape ? selectedShape.shape : activeShapeKind
  const isLinearShape =
    currentKind === 'line' || currentKind === 'arrow' || currentKind === 'polyline'
  const isMultiPoint =
    currentKind === 'polygon' || currentKind === 'cloud' || currentKind === 'polyline'

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none]'
          : 'mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2'
      }
    >
      {/* Mobile-friendly inline shape selector when no dropdown is shown */}
      {showShapePicker && !selectedShape && (
        <>
          <div className="flex shrink-0 items-center gap-1">
            {SHAPE_OPTIONS.map((opt) => {
              const isActive = activeShapeKind === opt.kind
              return (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => setActiveShapeKind(opt.kind)}
                  title={opt.label}
                  aria-label={opt.label}
                  className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <ShapeIconSvg kind={opt.kind} size={15} />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
          <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />
        </>
      )}

      {/* Stroke Color */}
      <label
        title="Stroke color"
        className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <span className="font-medium text-slate-600">Stroke</span>
        <span
          className="h-4 w-4 rounded border border-black/15"
          style={{ backgroundColor: currentStyle.strokeColor }}
        />
        <input
          type="color"
          value={currentStyle.strokeColor}
          onChange={(e) => updateActiveShapeStyle({ strokeColor: e.target.value })}
          aria-label="Stroke color"
          className="sr-only"
        />
      </label>

      {/* Fill Color (toggle None + Color Picker) */}
      {!isLinearShape && (
        <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <button
            type="button"
            onClick={() =>
              updateActiveShapeStyle({
                fillColor: currentStyle.fillColor ? null : '#bfdbfe',
              })
            }
            title={currentStyle.fillColor ? 'Remove fill (transparent)' : 'Add fill color'}
            aria-label={currentStyle.fillColor ? 'Remove fill' : 'Enable fill'}
            className={`flex h-full items-center gap-1 border-r border-slate-200 px-2 text-xs font-medium transition-colors ${
              currentStyle.fillColor === null
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Ban size={13} className={currentStyle.fillColor === null ? 'text-rose-500' : 'text-slate-400'} />
            <span>{currentStyle.fillColor === null ? 'No fill' : 'Clear'}</span>
          </button>

          <label
            title="Fill color"
            className="flex h-full cursor-pointer items-center gap-1.5 px-2 text-xs text-slate-700 hover:bg-slate-50"
          >
            <span className="font-medium text-slate-600">Fill</span>
            <span
              className="h-4 w-4 rounded border border-black/15"
              style={{
                backgroundColor: currentStyle.fillColor ?? 'transparent',
                backgroundImage:
                  currentStyle.fillColor === null
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%), linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%)'
                    : undefined,
                backgroundSize: currentStyle.fillColor === null ? '6px 6px' : undefined,
                backgroundPosition: currentStyle.fillColor === null ? '0 0, 3px 3px' : undefined,
              }}
            />
            <input
              type="color"
              value={currentStyle.fillColor ?? '#bfdbfe'}
              onChange={(e) => updateActiveShapeStyle({ fillColor: e.target.value })}
              aria-label="Fill color"
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Opacity */}
      <label
        title="Opacity"
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm"
      >
        <Contrast size={14} className="text-slate-500" />
        <select
          value={String(currentStyle.opacity)}
          onChange={(e) => updateActiveShapeStyle({ opacity: Number(e.target.value) })}
          aria-label="Shape opacity"
          className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
        >
          {OPACITY_OPTIONS.map((op) => (
            <option key={op} value={String(op)}>
              {Math.round(op * 100)}%
            </option>
          ))}
        </select>
      </label>

      {/* Stroke Width */}
      <label
        title="Border thickness"
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm"
      >
        <Minus size={14} strokeWidth={3} className="text-slate-500" />
        <select
          value={String(currentStyle.strokeWidth)}
          onChange={(e) =>
            updateActiveShapeStyle({ strokeWidth: Number(e.target.value) })
          }
          aria-label="Stroke width"
          className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
        >
          {STROKE_WIDTH_OPTIONS.map((w) => (
            <option key={w} value={String(w)}>
              {w} pt
            </option>
          ))}
        </select>
      </label>

      {/* Line Style */}
      <label
        title="Line style"
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm"
      >
        <MoreHorizontal size={14} className="text-slate-500" />
        <select
          value={currentStyle.lineStyle}
          onChange={(e) =>
            updateActiveShapeStyle({ lineStyle: e.target.value as LineStyle })
          }
          aria-label="Line style"
          className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </label>

      {!compact && !selectedShape && (
        <span className="ml-auto hidden text-xs text-slate-500 lg:inline">
          {isMultiPoint
            ? 'Click points on page · Double-click or press Enter to finish'
            : 'Click and drag on page to draw'}
        </span>
      )}
    </div>
  )
}
