import {
  buildArrowGeometry,
  buildCloudSvgPath,
  buildPointsSvgPath,
  getDashArray,
} from '../../lib/shapes/shapeGeometry'
import type { LineStyle, ShapeKind, ShapePoint } from '../../store/usePdfStore'

type ShapeSvgProps = {
  shape: ShapeKind
  x: number
  y: number
  width: number
  height: number
  points?: ShapePoint[]
  strokeColor: string
  fillColor: string | null
  opacity: number
  strokeWidth: number
  lineStyle: LineStyle
  zoom: number
  interactiveHitStroke?: boolean
}

export default function ShapeSvg({
  shape,
  x,
  y,
  width,
  height,
  points,
  strokeColor,
  fillColor,
  opacity,
  strokeWidth,
  lineStyle,
  zoom,
  interactiveHitStroke = false,
}: ShapeSvgProps) {
  const sw = Math.max(0.5, strokeWidth * zoom)
  const hitSw = Math.max(sw, 14)
  const dash = getDashArray(lineStyle, strokeWidth)
    .map((n) => (n * zoom).toFixed(2))
    .join(' ')
  const dashAttr = dash || undefined
  const wPx = Math.max(1, width * zoom)
  const hPx = Math.max(1, height * zoom)
  const fill = fillColor ?? 'none'
  const fillPointer = interactiveHitStroke ? (fillColor ? 'auto' : 'none') : 'none'
  const strokePointer = interactiveHitStroke ? 'stroke' : 'none'

  if (shape === 'rectangle') {
    return (
      <svg
        width={wPx}
        height={hPx}
        className="overflow-visible"
        style={{ opacity, pointerEvents: 'none' }}
      >
        <rect
          x={0}
          y={0}
          width={wPx}
          height={hPx}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={sw}
          strokeDasharray={dashAttr}
          style={{ pointerEvents: fillPointer }}
        />
        {interactiveHitStroke && (
          <rect
            x={0}
            y={0}
            width={wPx}
            height={hPx}
            fill="none"
            stroke="transparent"
            strokeWidth={hitSw}
            style={{ pointerEvents: strokePointer }}
          />
        )}
      </svg>
    )
  }

  if (shape === 'ellipse') {
    return (
      <svg
        width={wPx}
        height={hPx}
        className="overflow-visible"
        style={{ opacity, pointerEvents: 'none' }}
      >
        <ellipse
          cx={wPx / 2}
          cy={hPx / 2}
          rx={wPx / 2}
          ry={hPx / 2}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={sw}
          strokeDasharray={dashAttr}
          style={{ pointerEvents: fillPointer }}
        />
        {interactiveHitStroke && (
          <ellipse
            cx={wPx / 2}
            cy={hPx / 2}
            rx={wPx / 2}
            ry={hPx / 2}
            fill="none"
            stroke="transparent"
            strokeWidth={hitSw}
            style={{ pointerEvents: strokePointer }}
          />
        )}
      </svg>
    )
  }

  if (shape === 'line' || shape === 'arrow') {
    const p0 = points?.[0] ?? { x, y }
    const p1 = points?.[1] ?? { x: x + width, y: y + height }
    if (shape === 'line') {
      const x1 = (p0.x - x) * zoom
      const y1 = (p0.y - y) * zoom
      const x2 = (p1.x - x) * zoom
      const y2 = (p1.y - y) * zoom
      return (
        <svg
          width={wPx}
          height={hPx}
          className="overflow-visible"
          style={{ opacity, pointerEvents: 'none' }}
        >
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={dashAttr}
            style={{ pointerEvents: strokePointer }}
          />
          {interactiveHitStroke && (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={hitSw}
              strokeLinecap="round"
              style={{ pointerEvents: strokePointer }}
            />
          )}
        </svg>
      )
    }

    const arrow = buildArrowGeometry(p0, p1, strokeWidth, x, y, zoom)
    return (
      <svg
        width={wPx}
        height={hPx}
        className="overflow-visible"
        style={{ opacity, pointerEvents: 'none' }}
      >
        <line
          x1={arrow.shaftStart.x}
          y1={arrow.shaftStart.y}
          x2={arrow.shaftEnd.x}
          y2={arrow.shaftEnd.y}
          stroke={strokeColor}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={dashAttr}
          style={{ pointerEvents: strokePointer }}
        />
        {arrow.headPath && (
          <path
            d={arrow.headPath}
            fill={strokeColor}
            style={{ pointerEvents: interactiveHitStroke ? 'auto' : 'none' }}
          />
        )}
        {interactiveHitStroke && (
          <line
            x1={(p0.x - x) * zoom}
            y1={(p0.y - y) * zoom}
            x2={(p1.x - x) * zoom}
            y2={(p1.y - y) * zoom}
            stroke="transparent"
            strokeWidth={hitSw}
            strokeLinecap="round"
            style={{ pointerEvents: strokePointer }}
          />
        )}
      </svg>
    )
  }

  const defaultBoxPoints: ShapePoint[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
  const pts = points && points.length >= 2 ? points : defaultBoxPoints

  let pathD = ''
  const isClosed = shape === 'polygon' || shape === 'cloud'
  if (shape === 'cloud') {
    pathD = buildCloudSvgPath(pts.length >= 3 ? pts : defaultBoxPoints, x, y, zoom)
  } else {
    pathD = buildPointsSvgPath(pts, shape === 'polygon', x, y, zoom)
  }

  return (
    <svg
      width={wPx}
      height={hPx}
      className="overflow-visible"
      style={{ opacity, pointerEvents: 'none' }}
    >
      <path
        d={pathD}
        fill={isClosed ? fill : 'none'}
        stroke={strokeColor}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashAttr}
        style={{ pointerEvents: isClosed ? fillPointer : strokePointer }}
      />
      {interactiveHitStroke && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={hitSw}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: strokePointer }}
        />
      )}
    </svg>
  )
}
