import type { PDFPageProxy } from 'pdfjs-dist'
import { matchFont, type FontFamilyKey } from '../fonts/fontMatcher'
import { sampleColors } from '../pixels/sampleColors'

export type TextRun = {
  key: string
  page: number
  text: string
  x: number
  width: number
  baselineY: number
  fontSize: number
  pdfFontName: string
  family: FontFamilyKey
  bold: boolean
  italic: boolean
  color: string
  bgColor: string
  maxRight: number
}

type IntermediateItem = {
  text: string
  x: number
  baselineY: number
  fontSize: number
  width: number
  fontName: string
}

export async function extractText(
  page: PDFPageProxy,
  pageNumber: number,
  canvas?: HTMLCanvasElement | null,
): Promise<TextRun[]> {
  const content = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1 })
  const pageHeight = viewport.height
  const pageWidth = viewport.width

  const items: IntermediateItem[] = []

  for (const raw of content.items) {
    if (!('str' in raw) || !raw.str) continue
    if (!raw.str.trim()) continue

    const transform = raw.transform
    if (!transform || transform.length < 6) continue

    // Skip rotated text
    if (Math.abs(transform[1]) >= 0.01 || Math.abs(transform[2]) >= 0.01) continue

    const fontSize = Math.hypot(transform[2], transform[3])
    const x = transform[4]
    const baselineY = pageHeight - transform[5]
    const width = raw.width || 0

    items.push({
      text: raw.str,
      x,
      baselineY,
      fontSize,
      width,
      fontName: raw.fontName || '',
    })
  }

  if (items.length === 0) return []

  // 1. Group items into visual lines
  items.sort((a, b) => a.baselineY - b.baselineY)

  type LineGroup = {
    baselineY: number
    items: IntermediateItem[]
  }

  const lines: LineGroup[] = []
  for (const item of items) {
    const existingLine = lines.find(
      (line) => Math.abs(line.baselineY - item.baselineY) < item.fontSize * 0.2,
    )
    if (existingLine) {
      existingLine.items.push(item)
    } else {
      lines.push({ baselineY: item.baselineY, items: [item] })
    }
  }

  type CandidateRun = {
    text: string
    x: number
    width: number
    baselineY: number
    fontSize: number
    fontName: string
  }

  const candidateRuns: CandidateRun[] = []

  // 2. Merge items on each line into runs
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)

    let currentRun: CandidateRun | null = null

    for (const item of line.items) {
      if (!currentRun) {
        currentRun = { ...item }
        continue
      }

      const baselineDiff = Math.abs(currentRun.baselineY - item.baselineY)
      const fontSizeDiff = Math.abs(currentRun.fontSize - item.fontSize)
      const gap = item.x - (currentRun.x + currentRun.width)

      const sameBaseline = baselineDiff < currentRun.fontSize * 0.2
      const sameFontSize = fontSizeDiff < 0.5
      const acceptableGap = gap < currentRun.fontSize * 0.6 && gap >= -currentRun.fontSize * 0.3

      if (sameBaseline && sameFontSize && acceptableGap) {
        const needsSpace =
          gap > currentRun.fontSize * 0.15 &&
          !currentRun.text.endsWith(' ') &&
          !item.text.startsWith(' ')
        currentRun.text = currentRun.text + (needsSpace ? ' ' : '') + item.text
        currentRun.width = item.x + item.width - currentRun.x
      } else {
        candidateRuns.push(currentRun)
        currentRun = { ...item }
      }
    }

    if (currentRun) {
      candidateRuns.push(currentRun)
    }
  }

  // 3. Resolve font for each run
  const runsWithoutColorsAndBounds = candidateRuns.map((run, index) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let real: any = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      real = (page as any).commonObjs?.get(run.fontName)
    } catch {
      // commonObjs lookup is best-effort
    }

    const styles = content.styles as Record<string, { fontFamily?: string } | undefined>
    const pdfFontName = real?.name ?? styles[run.fontName]?.fontFamily ?? ''
    const matched = matchFont(pdfFontName, real)

    return {
      key: `${pageNumber}:${index}`,
      page: pageNumber,
      text: run.text,
      x: run.x,
      width: run.width,
      baselineY: run.baselineY,
      fontSize: run.fontSize,
      pdfFontName,
      family: matched.family,
      bold: matched.bold,
      italic: matched.italic,
    }
  })

  // 4. Calculate maxRight for each run
  const scale = canvas ? canvas.width / pageWidth : 1

  const finalRuns: TextRun[] = runsWithoutColorsAndBounds.map((run) => {
    let nearestRightX: number | null = null

    for (const other of runsWithoutColorsAndBounds) {
      if (other.key === run.key) continue
      const sameLine = Math.abs(other.baselineY - run.baselineY) < run.fontSize * 0.5
      if (sameLine && other.x >= run.x + run.width - 1) {
        if (nearestRightX === null || other.x < nearestRightX) {
          nearestRightX = other.x
        }
      }
    }

    const maxRight =
      nearestRightX !== null ? nearestRightX - 2 : Math.max(run.x + run.width, pageWidth - 20)

    const box = {
      x: run.x,
      y: run.baselineY - run.fontSize * 0.9,
      width: run.width,
      height: run.fontSize * 1.15,
    }

    const { color, bgColor } = canvas
      ? sampleColors(canvas, scale, box)
      : { color: '#000000', bgColor: '#FFFFFF' }

    return {
      ...run,
      maxRight,
      color,
      bgColor,
    }
  })

  if (import.meta.env.DEV && finalRuns.length > 0) {
    const sample = finalRuns[0]
    console.log(`Sample extracted TextRun (page ${pageNumber}):`, {
      text: sample.text,
      fontSize: sample.fontSize,
      baselineY: sample.baselineY,
      family: sample.family,
      bold: sample.bold,
      color: sample.color,
      bgColor: sample.bgColor,
    })
  }

  return finalRuns
}
