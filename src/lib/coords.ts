export type Point = { x: number; y: number }

export function screenToPdf(point: Point, zoom: number): Point {
  return { x: point.x / zoom, y: point.y / zoom }
}

export function pdfToScreen(point: Point, zoom: number): Point {
  return { x: point.x * zoom, y: point.y * zoom }
}

export function topLeftToPdfY(pageHeight: number, y: number, height: number): number {
  return pageHeight - y - height
}
