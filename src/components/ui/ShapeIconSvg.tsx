import type { ShapeKind } from '../../store/usePdfStore'

export const SHAPE_OPTIONS: Array<{ kind: ShapeKind; label: string }> = [
  { kind: 'ellipse', label: 'Ellipse' },
  { kind: 'line', label: 'Line' },
  { kind: 'arrow', label: 'Arrow' },
  { kind: 'rectangle', label: 'Rectangle' },
  { kind: 'polygon', label: 'Polygon' },
  { kind: 'cloud', label: 'Cloud / Wavy' },
  { kind: 'polyline', label: 'Polyline' },
]

export default function ShapeIconSvg({
  kind,
  size = 18,
}: {
  kind: ShapeKind
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'ellipse' && <circle cx="12" cy="12" r="8" />}
      {kind === 'line' && <line x1="5" y1="19" x2="19" y2="5" />}
      {kind === 'arrow' && (
        <>
          <line x1="5" y1="19" x2="18" y2="6" />
          <polyline points="10 6 18 6 18 14" />
        </>
      )}
      {kind === 'rectangle' && <rect x="4" y="5" width="16" height="14" rx="1" />}
      {kind === 'polygon' && <polygon points="12 4 20 10 17 19 7 19 4 10" />}
      {kind === 'cloud' && (
        <path d="M 6.5 18 H 17.5 C 19.7 18 21 16.5 21 14.5 C 21 12.7 19.7 11.3 18 11 C 17.5 7.9 15 6 12 6 C 9.4 6 7.3 7.5 6.4 9.8 C 4.4 10.2 3 11.9 3 14 C 3 16.2 4.6 18 6.5 18 Z" />
      )}
      {kind === 'polyline' && <polyline points="4 17 9 8 15 15 20 6" />}
    </svg>
  )
}
