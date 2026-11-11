import { getAnnotationIcon } from '../../lib/annotations/annotationIcons'
import type { AnnotationIconKey } from '../../store/usePdfStore'

type AnnotationIconSvgProps = {
  icon: AnnotationIconKey
  color?: string
  size?: number
  className?: string
}

export default function AnnotationIconSvg({
  icon,
  color = 'currentColor',
  size = 18,
  className = '',
}: AnnotationIconSvgProps) {
  const def = getAnnotationIcon(icon)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {def.primitives.map((prim, idx) => {
        if (prim.mode === 'fill') {
          return <path key={idx} d={prim.d} fill={color} />
        }
        if (prim.mode === 'knockout') {
          return <path key={idx} d={prim.d} fill="#ffffff" />
        }
        return (
          <path
            key={idx}
            d={prim.d}
            stroke={color}
            strokeWidth={prim.strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
}
