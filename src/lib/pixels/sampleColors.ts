export type RunBox = {
  x: number
  y: number
  width: number
  height: number
}

export type SampledColors = {
  color: string
  bgColor: string
}

function toHex(r: number, g: number, b: number): string {
  const toHexPart = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`
}

export function sampleColors(
  canvas: HTMLCanvasElement,
  scale: number,
  box: RunBox,
): SampledColors {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      return { color: '#000000', bgColor: '#FFFFFF' }
    }

    const bx = Math.round(box.x * scale)
    const by = Math.round(box.y * scale)
    const bw = Math.max(1, Math.round(box.width * scale))
    const bh = Math.max(1, Math.round(box.height * scale))

    const ringPad = 2
    const minX = Math.max(0, bx - ringPad)
    const minY = Math.max(0, by - ringPad)
    const maxX = Math.min(canvas.width, bx + bw + ringPad)
    const maxY = Math.min(canvas.height, by + bh + ringPad)

    const regionW = maxX - minX
    const regionH = maxY - minY

    if (regionW <= 0 || regionH <= 0) {
      return { color: '#000000', bgColor: '#FFFFFF' }
    }

    const imageData = ctx.getImageData(minX, minY, regionW, regionH)
    const data = imageData.data

    const bgCounts = new Map<string, { count: number; sumR: number; sumG: number; sumB: number }>()

    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        const isInsideBox = px >= bx && px < bx + bw && py >= by && py < by + bh
        if (!isInsideBox) {
          const idx = ((py - minY) * regionW + (px - minX)) * 4
          const a = data[idx + 3]
          if (a >= 128) {
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const key = `${Math.floor(r / 8)},${Math.floor(g / 8)},${Math.floor(b / 8)}`
            const existing = bgCounts.get(key)
            if (existing) {
              existing.count++
              existing.sumR += r
              existing.sumG += g
              existing.sumB += b
            } else {
              bgCounts.set(key, { count: 1, sumR: r, sumG: g, sumB: b })
            }
          }
        }
      }
    }

    let bgColor = '#FFFFFF'
    let maxBgCount = 0
    let bgR = 255
    let bgG = 255
    let bgB = 255

    for (const entry of bgCounts.values()) {
      if (entry.count > maxBgCount) {
        maxBgCount = entry.count
        bgR = Math.round(entry.sumR / entry.count)
        bgG = Math.round(entry.sumG / entry.count)
        bgB = Math.round(entry.sumB / entry.count)
      }
    }

    if (bgR >= 248 && bgG >= 248 && bgB >= 248) {
      bgR = 255
      bgG = 255
      bgB = 255
    } else if (bgR <= 12 && bgG <= 12 && bgB <= 12) {
      bgR = 0
      bgG = 0
      bgB = 0
    }
    bgColor = toHex(bgR, bgG, bgB)

    let bestDist = 0
    let bestColor = '#000000'

    const innerMinX = Math.max(0, bx)
    const innerMinY = Math.max(0, by)
    const innerMaxX = Math.min(canvas.width, bx + bw)
    const innerMaxY = Math.min(canvas.height, by + bh)

    for (let py = innerMinY; py < innerMaxY; py++) {
      for (let px = innerMinX; px < innerMaxX; px++) {
        const idx = ((py - minY) * regionW + (px - minX)) * 4
        const a = data[idx + 3]
        if (a >= 128) {
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)
          if (dist > bestDist) {
            bestDist = dist
            bestColor = toHex(r, g, b)
          }
        }
      }
    }

    const color = bestDist > 60 ? bestColor : '#000000'

    return { color, bgColor }
  } catch {
    return { color: '#000000', bgColor: '#FFFFFF' }
  }
}
