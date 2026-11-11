import { ANNOTATION_COLORS, ANNOTATION_ICONS } from '../lib/annotations/annotationIcons'
import { usePdfStore, type AnnotationObject } from '../store/usePdfStore'
import AnnotationIconSvg from './ui/AnnotationIconSvg'

interface AnnotateStyleBarProps {
  compact?: boolean
}

export default function AnnotateStyleBar({ compact = false }: AnnotateStyleBarProps) {
  const activeAnnotationIcon = usePdfStore((state) => state.activeAnnotationIcon)
  const activeAnnotationColor = usePdfStore((state) => state.activeAnnotationColor)
  const setActiveAnnotationIcon = usePdfStore((state) => state.setActiveAnnotationIcon)
  const setActiveAnnotationColor = usePdfStore((state) => state.setActiveAnnotationColor)
  const selectedId = usePdfStore((state) => state.selectedId)
  const objects = usePdfStore((state) => state.objects)
  const updateObject = usePdfStore((state) => state.updateObject)

  const selectedAnnotation = objects.find(
    (obj): obj is AnnotationObject => obj.id === selectedId && obj.type === 'annotation',
  )

  const currentIcon = selectedAnnotation ? selectedAnnotation.icon : activeAnnotationIcon
  const currentColor = selectedAnnotation ? selectedAnnotation.color : activeAnnotationColor

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none]'
          : 'mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2'
      }
    >
      {/* Custom color picker + 6 quick swatches */}
      <div className="flex shrink-0 items-center gap-1.5">
        <label
          title="Custom annotation color"
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white shadow-sm hover:bg-slate-50"
        >
          <span
            className="h-4 w-4 rounded-sm border border-black/15"
            style={{ backgroundColor: currentColor }}
          />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setActiveAnnotationColor(e.target.value)}
            aria-label="Custom annotation color"
            className="sr-only"
          />
        </label>

        {ANNOTATION_COLORS.map((swatch) => {
          const isActive = currentColor.toLowerCase() === swatch.toLowerCase()
          return (
            <button
              key={swatch}
              type="button"
              onClick={() => setActiveAnnotationColor(swatch)}
              aria-label={`Color ${swatch}`}
              title={`Color ${swatch}`}
              className={`h-6 w-6 shrink-0 rounded-full border border-black/10 transition-transform ${
                isActive ? 'scale-110 ring-2 ring-brand-600 ring-offset-2' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: swatch }}
            />
          )
        })}
      </div>

      <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />

      {/* 14 annotation icon options */}
      <div className="flex shrink-0 items-center gap-1">
        {ANNOTATION_ICONS.map((def) => {
          const isActive = currentIcon === def.key
          return (
            <button
              key={def.key}
              type="button"
              onClick={() => setActiveAnnotationIcon(def.key)}
              aria-label={def.label}
              title={def.label}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? 'bg-slate-200/90 text-slate-900 ring-1 ring-slate-400'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <AnnotationIconSvg icon={def.key} size={20} color="#334155" />
            </button>
          )
        })}
      </div>

      {selectedAnnotation ? (
        <label className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
          <span>Size:</span>
          <select
            value={Math.round(selectedAnnotation.size)}
            onChange={(e) =>
              updateObject(selectedAnnotation.id, { size: Number(e.target.value) })
            }
            aria-label="Annotation size"
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {[18, 24, 28, 36, 48, 60].map((size) => (
              <option key={size} value={size}>
                {size} pt
              </option>
            ))}
          </select>
        </label>
      ) : (
        !compact && (
          <span className="ml-auto hidden text-xs text-slate-500 md:inline">
            Click anywhere on the page to place an annotation
          </span>
        )
      )}
    </div>
  )
}
