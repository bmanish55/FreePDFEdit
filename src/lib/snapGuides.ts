import { getCachedLoadedFont } from './fonts/fontLoader'
import { hasDevanagari } from './fonts/fontMatcher'
import { layoutText } from './text/layoutText'
import { estimateTextObjectWidth, getCoveredRunKeys } from './text/mergeText'
import type { AlignmentGuide, EditObject, PageSize } from '../store/usePdfStore'
import type { TextRun } from './text/extractText'

export type SnapRect = {
  left: number
  centerX: number
  right: number
  top: number
  centerY: number
  bottom: number
  baselineY?: number
}

type VerticalTarget = {
  pos: number
  spanStart: number
  spanEnd: number
  kind: 'page' | 'object'
}

type HorizontalTarget = {
  pos: number
  spanStart: number
  spanEnd: number
  kind: 'page' | 'object' | 'baseline'
}

export type SnapTargetSet = {
  page: number
  pageWidth: number
  pageHeight: number
  vertical: VerticalTarget[]
  horizontal: HorizontalTarget[]
}

export function buildSnapTargets(
  page: number,
  excludeId: string,
  objects: EditObject[],
  pageRuns: TextRun[],
  pageSize?: PageSize,
): SnapTargetSet {
  const vertical: VerticalTarget[] = []
  const horizontal: HorizontalTarget[] = []
  const pageWidth = pageSize?.width ?? 612
  const pageHeight = pageSize?.height ?? 792

  if (pageSize) {
    vertical.push({ pos: pageWidth / 2, spanStart: 0, spanEnd: pageHeight, kind: 'page' })
    horizontal.push({ pos: pageHeight / 2, spanStart: 0, spanEnd: pageWidth, kind: 'page' })
  }

  const coveredKeys = getCoveredRunKeys(objects)

  for (const obj of objects) {
    if (obj.page !== page || obj.id === excludeId) continue

    if (obj.type === 'text') {
      const activeFamily =
        hasDevanagari(obj.text) || obj.fontFamily === 'devanagari' ? 'devanagari' : obj.fontFamily
      const cached = getCachedLoadedFont({
        family: activeFamily,
        bold: obj.bold,
        italic: obj.italic,
      })

      let left = obj.x
      let width = estimateTextObjectWidth(obj)
      let top = obj.baselineY - obj.fontSize * 0.95
      let bottom = obj.baselineY + obj.fontSize * 0.25

      if (cached) {
        const l = layoutText(obj, cached)
        left = l.textX
        const lineCount = Math.max(l.lines.length, 1)
        const glyphH = (cached.ascent + cached.descent) * l.fontSize
        const totalH =
          lineCount === 1 ? glyphH : (lineCount - 1) * l.lineHeight + glyphH
        top = l.baselineY - cached.ascent * l.fontSize
        bottom = top + totalH
        width = Math.max(obj.boxWidth ?? l.width, 12)
      }

      const right = left + width
      const centerX = left + width / 2
      const centerY = (top + bottom) / 2

      vertical.push(
        { pos: left, spanStart: top, spanEnd: bottom, kind: 'object' },
        { pos: centerX, spanStart: top, spanEnd: bottom, kind: 'object' },
        { pos: right, spanStart: top, spanEnd: bottom, kind: 'object' },
      )
      horizontal.push(
        { pos: obj.baselineY, spanStart: left, spanEnd: right, kind: 'baseline' },
        { pos: top, spanStart: left, spanEnd: right, kind: 'object' },
        { pos: centerY, spanStart: left, spanEnd: right, kind: 'object' },
        { pos: bottom, spanStart: left, spanEnd: right, kind: 'object' },
      )
      continue
    }

    const left = obj.x
    const right = obj.x + obj.width
    const centerX = obj.x + obj.width / 2
    const top = obj.y
    const bottom = obj.y + obj.height
    const centerY = obj.y + obj.height / 2

    vertical.push(
      { pos: left, spanStart: top, spanEnd: bottom, kind: 'object' },
      { pos: centerX, spanStart: top, spanEnd: bottom, kind: 'object' },
      { pos: right, spanStart: top, spanEnd: bottom, kind: 'object' },
    )
    horizontal.push(
      { pos: top, spanStart: left, spanEnd: right, kind: 'object' },
      { pos: centerY, spanStart: left, spanEnd: right, kind: 'object' },
      { pos: bottom, spanStart: left, spanEnd: right, kind: 'object' },
    )
  }

  for (const run of pageRuns) {
    if (coveredKeys.has(run.key)) continue
    const left = run.x
    const right = run.x + run.width
    const centerX = run.x + run.width / 2
    const top = run.baselineY - run.fontSize * 0.9
    const bottom = run.baselineY + run.fontSize * 0.25
    const centerY = (top + bottom) / 2

    vertical.push(
      { pos: left, spanStart: top, spanEnd: bottom, kind: 'object' },
      { pos: centerX, spanStart: top, spanEnd: bottom, kind: 'object' },
      { pos: right, spanStart: top, spanEnd: bottom, kind: 'object' },
    )
    horizontal.push(
      { pos: run.baselineY, spanStart: left, spanEnd: right, kind: 'baseline' },
      { pos: top, spanStart: left, spanEnd: right, kind: 'object' },
      { pos: centerY, spanStart: left, spanEnd: right, kind: 'object' },
      { pos: bottom, spanStart: left, spanEnd: right, kind: 'object' },
    )
  }

  return { page, pageWidth, pageHeight, vertical, horizontal }
}

export function computeSnapGuides(
  moving: SnapRect,
  targets: SnapTargetSet,
  threshold: number,
  disabled = false,
): { dx: number; dy: number; guides: AlignmentGuide[] } {
  if (disabled) {
    return { dx: 0, dy: 0, guides: [] }
  }

  let bestDx = 0
  let minAbsDx = threshold + 0.001
  const movingXEdges = [moving.left, moving.centerX, moving.right]

  for (const target of targets.vertical) {
    for (const edge of movingXEdges) {
      const diff = target.pos - edge
      const absDiff = Math.abs(diff)
      if (absDiff < minAbsDx) {
        minAbsDx = absDiff
        bestDx = diff
      }
    }
  }
  const snappedX = minAbsDx <= threshold
  const dx = snappedX ? bestDx : 0

  let bestDy = 0
  let minScoreDy = threshold + 0.001
  let minAbsDy = threshold + 0.001

  for (const target of targets.horizontal) {
    if (target.kind === 'baseline') {
      if (moving.baselineY === undefined) continue
      const diff = target.pos - moving.baselineY
      const absDiff = Math.abs(diff)
      const score = absDiff - 0.5
      if (absDiff <= threshold && score < minScoreDy) {
        minScoreDy = score
        minAbsDy = absDiff
        bestDy = diff
      }
      continue
    }

    const movingYEdges = [moving.top, moving.centerY, moving.bottom]
    for (const edge of movingYEdges) {
      const diff = target.pos - edge
      const absDiff = Math.abs(diff)
      if (absDiff <= threshold && absDiff < minScoreDy) {
        minScoreDy = absDiff
        minAbsDy = absDiff
        bestDy = diff
      }
    }
  }
  const snappedY = minAbsDy <= threshold
  const dy = snappedY ? bestDy : 0

  const guides: AlignmentGuide[] = []
  const snappedRect: SnapRect = {
    left: moving.left + dx,
    centerX: moving.centerX + dx,
    right: moving.right + dx,
    top: moving.top + dy,
    centerY: moving.centerY + dy,
    bottom: moving.bottom + dy,
    baselineY: moving.baselineY !== undefined ? moving.baselineY + dy : undefined,
  }

  if (snappedX) {
    const vMap = new Map<string, AlignmentGuide>()
    const xCheck = [snappedRect.left, snappedRect.centerX, snappedRect.right]
    for (const target of targets.vertical) {
      if (xCheck.some((val) => Math.abs(val - target.pos) <= 0.6)) {
        const key = `${Math.round(target.pos * 10)}:${target.kind}`
        const start =
          target.kind === 'page'
            ? 0
            : Math.max(0, Math.min(target.spanStart, snappedRect.top) - 14)
        const end =
          target.kind === 'page'
            ? targets.pageHeight
            : Math.min(targets.pageHeight, Math.max(target.spanEnd, snappedRect.bottom) + 14)
        const existing = vMap.get(key)
        if (existing) {
          existing.start = Math.min(existing.start, start)
          existing.end = Math.max(existing.end, end)
        } else {
          vMap.set(key, {
            page: targets.page,
            orientation: 'v',
            pos: target.pos,
            start,
            end,
            kind: target.kind,
          })
        }
      }
    }
    guides.push(...vMap.values())
  }

  if (snappedY) {
    const hMap = new Map<string, AlignmentGuide>()
    for (const target of targets.horizontal) {
      const matches =
        target.kind === 'baseline'
          ? snappedRect.baselineY !== undefined &&
            Math.abs(snappedRect.baselineY - target.pos) <= 0.6
          : [snappedRect.top, snappedRect.centerY, snappedRect.bottom].some(
              (val) => Math.abs(val - target.pos) <= 0.6,
            )
      if (matches) {
        const key = `${Math.round(target.pos * 10)}:${target.kind}`
        const start =
          target.kind === 'page'
            ? 0
            : Math.max(0, Math.min(target.spanStart, snappedRect.left) - 14)
        const end =
          target.kind === 'page'
            ? targets.pageWidth
            : Math.min(targets.pageWidth, Math.max(target.spanEnd, snappedRect.right) + 14)
        const existing = hMap.get(key)
        if (existing) {
          existing.start = Math.min(existing.start, start)
          existing.end = Math.max(existing.end, end)
        } else {
          hMap.set(key, {
            page: targets.page,
            orientation: 'h',
            pos: target.pos,
            start,
            end,
            kind: target.kind,
          })
        }
      }
    }
    guides.push(...hMap.values())
  }

  return { dx, dy, guides }
}
