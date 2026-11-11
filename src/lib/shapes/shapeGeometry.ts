import type { LineStyle, ShapePoint } from '../../store/usePdfStore'

export function getDashArray(style: LineStyle, strokeWidth: number): number[] {
  if (style === 'dashed') {
    return [Math.max(5, strokeWidth * 2.5), Math.max(3.5, strokeWidth * 1.5)]
  }
  if (style === 'dotted') {
    return [Math.max(1.5, strokeWidth * 0.9), Math.max(3, strokeWidth * 1.8)]
  }
  return []
}

export function getBoundingBoxFromPoints(points: ShapePoint[]): {
  x: number
  y: number
  width: number
  height: number
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.x > maxX) maxX = pt.x
    if (pt.y > maxY) maxY = pt.y
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function scaleShapePoints(
  points: ShapePoint[],
  oldBox: { x: number; y: number; width: number; height: number },
  newBox: { x: number; y: number; width: number; height: number },
): ShapePoint[] {
  return points.map((pt) => {
    const nx =
      oldBox.width > 0.5
        ? newBox.x + ((pt.x - oldBox.x) / oldBox.width) * newBox.width
        : newBox.x
    const ny =
      oldBox.height > 0.5
        ? newBox.y + ((pt.y - oldBox.y) / oldBox.height) * newBox.height
        : newBox.y
    return { x: nx, y: ny }
  })
}

export function buildPointsSvgPath(
  points: ShapePoint[],
  closed: boolean,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
): string {
  if (points.length === 0) return ''
  const parts = points.map((pt, idx) => {
    const cmd = idx === 0 ? 'M' : 'L'
    return `${cmd} ${((pt.x - offsetX) * scale).toFixed(2)} ${((pt.y - offsetY) * scale).toFixed(2)}`
  })
  if (closed && points.length >= 2) {
    parts.push('Z')
  }
  return parts.join(' ')
}

export function buildCloudSvgPath(
  rawPoints: ShapePoint[],
  offsetX = 0,
  offsetY = 0,
  scale = 1,
): string {
  if (rawPoints.length < 2) return ''

  // Compute signed area (shoelace) so scallop arcs always bulge outward
  let signedArea = 0
  for (let i = 0; i < rawPoints.length; i++) {
    const a = rawPoints[i]
    const b = rawPoints[(i + 1) % rawPoints.length]
    signedArea += (b.x - a.x) * (b.y + a.y)
  }
  // In Y-down screen coordinates, signedArea < 0 means clockwise (right-hand normal points outward)
  const pts = signedArea > 0 ? [...rawPoints].reverse() : rawPoints

  const commands: string[] = [
    `M ${((pts[0].x - offsetX) * scale).toFixed(2)} ${((pts[0].y - offsetY) * scale).toFixed(2)}`,
  ]

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const edgeLen = Math.hypot(dx, dy)
    if (edgeLen < 0.5) continue

    // Right-hand perpendicular in Y-down coordinates points outward for clockwise polygon
    const nx = dy / edgeLen
    const ny = -dx / edgeLen
    const arcCount = Math.max(2, Math.round(edgeLen / 16))
    const segLen = edgeLen / arcCount
    const bulge = Math.min(11, Math.max(4, segLen * 0.55))

    for (let s = 0; s < arcCount; s++) {
      const t0 = s / arcCount
      const t1 = (s + 1) / arcCount
      const p0x = a.x + dx * t0
      const p0y = a.y + dy * t0
      const p1x = a.x + dx * t1
      const p1y = a.y + dy * t1

      const c1x = p0x + (p1x - p0x) * 0.25 + nx * bulge
      const c1y = p0y + (p1y - p0y) * 0.25 + ny * bulge
      const c2x = p0x + (p1x - p0x) * 0.75 + nx * bulge
      const c2y = p0y + (p1y - p0y) * 0.75 + ny * bulge

      commands.push(
        `C ${((c1x - offsetX) * scale).toFixed(2)} ${((c1y - offsetY) * scale).toFixed(2)}, ${((c2x - offsetX) * scale).toFixed(2)} ${((c2y - offsetY) * scale).toFixed(2)}, ${((p1x - offsetX) * scale).toFixed(2)} ${((p1y - offsetY) * scale).toFixed(2)}`,
      )
    }
  }

  commands.push('Z')
  return commands.join(' ')
}

export function buildArrowGeometry(
  start: ShapePoint,
  end: ShapePoint,
  strokeWidth: number,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
): { shaftStart: ShapePoint; shaftEnd: ShapePoint; headPath: string } {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy)
  if (len < 0.5) {
    return {
      shaftStart: { x: (start.x - offsetX) * scale, y: (start.y - offsetY) * scale },
      shaftEnd: { x: (end.x - offsetX) * scale, y: (end.y - offsetY) * scale },
      headPath: '',
    }
  }

  const ux = dx / len
  const uy = dy / len
  const headLen = Math.min(len * 0.65, Math.max(9, strokeWidth * 3.2))
  const headHalfW = Math.max(4.5, strokeWidth * 1.8)

  const baseCenter = {
    x: end.x - ux * headLen,
    y: end.y - uy * headLen,
  }
  const wing1 = {
    x: baseCenter.x - uy * headHalfW,
    y: baseCenter.y + ux * headHalfW,
  }
  const wing2 = {
    x: baseCenter.x + uy * headHalfW,
    y: baseCenter.y - ux * headHalfW,
  }

  const tipScaled = { x: (end.x - offsetX) * scale, y: (end.y - offsetY) * scale }
  const w1Scaled = { x: (wing1.x - offsetX) * scale, y: (wing1.y - offsetY) * scale }
  const w2Scaled = { x: (wing2.x - offsetX) * scale, y: (wing2.y - offsetY) * scale }
  const shaftStop = {
    x: (end.x - ux * (headLen * 0.72) - offsetX) * scale,
    y: (end.y - uy * (headLen * 0.72) - offsetY) * scale,
  }

  return {
    shaftStart: { x: (start.x - offsetX) * scale, y: (start.y - offsetY) * scale },
    shaftEnd: shaftStop,
    headPath: `M ${tipScaled.x.toFixed(2)} ${tipScaled.y.toFixed(2)} L ${w1Scaled.x.toFixed(2)} ${w1Scaled.y.toFixed(2)} L ${w2Scaled.x.toFixed(2)} ${w2Scaled.y.toFixed(2)} Z`,
  }
}
