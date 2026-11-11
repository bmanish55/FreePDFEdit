import { getCachedLoadedFont } from '../fonts/fontLoader'
import { hasDevanagari } from '../fonts/fontMatcher'
import type { EditObject, OriginalSpan, TextObject } from '../../store/usePdfStore'
import type { TextRun } from './extractText'

export type LineCandidate = {
  kind: 'object' | 'run'
  id: string
  x: number
  baselineY: number
  width: number
  fontSize: number
  text: string
  maxRight: number
  spans: OriginalSpan[]
  coveredKeys: string[]
  originalText: string
}

export function isSameHorizontalLine(
  a: { baselineY: number; fontSize: number },
  b: { baselineY: number; fontSize: number },
): boolean {
  return Math.abs(a.baselineY - b.baselineY) <= Math.max(a.fontSize, b.fontSize) * 0.45
}

export function getCoveredRunKeys(objects: EditObject[]): Set<string> {
  const keys = new Set<string>()
  for (const obj of objects) {
    if (obj.type !== 'text') continue
    if (obj.originalKey) keys.add(obj.originalKey)
    if (obj.coveredKeys) {
      for (const key of obj.coveredKeys) keys.add(key)
    }
  }
  return keys
}

export function estimateTextObjectWidth(obj: TextObject): number {
  if (typeof obj.boxWidth === 'number' && obj.boxWidth > 0) {
    return obj.boxWidth
  }
  const activeFamily =
    hasDevanagari(obj.text) || obj.fontFamily === 'devanagari' ? 'devanagari' : obj.fontFamily
  const cached = getCachedLoadedFont({
    family: activeFamily,
    bold: obj.bold,
    italic: obj.italic,
  })
  if (cached) {
    const lines = obj.text ? obj.text.split('\n') : ['']
    return lines.reduce((max, line) => Math.max(max, cached.measure(line, obj.fontSize)), 0)
  }
  return obj.original?.width ?? Math.max(obj.text.length * obj.fontSize * 0.52, 24)
}

function toObjectCandidate(obj: TextObject): LineCandidate {
  const spans: OriginalSpan[] = obj.original
    ? obj.original.spans && obj.original.spans.length > 0
      ? obj.original.spans
      : [
          {
            x: obj.original.x,
            baselineY: obj.original.baselineY ?? obj.baselineY,
            width: obj.original.width,
            fontSize: obj.original.fontSize,
            bgColor: obj.original.bgColor,
          },
        ]
    : []

  const coveredKeys: string[] = []
  if (obj.originalKey) coveredKeys.push(obj.originalKey)
  if (obj.coveredKeys) coveredKeys.push(...obj.coveredKeys)

  const width = estimateTextObjectWidth(obj)
  return {
    kind: 'object',
    id: obj.id,
    x: obj.x,
    baselineY: obj.baselineY,
    width,
    fontSize: obj.fontSize,
    text: obj.text,
    maxRight: obj.original?.maxRight ?? obj.x + width,
    spans,
    coveredKeys,
    originalText: obj.original?.text ?? '',
  }
}

function toRunCandidate(run: TextRun): LineCandidate {
  return {
    kind: 'run',
    id: run.key,
    x: run.x,
    baselineY: run.baselineY,
    width: run.width,
    fontSize: run.fontSize,
    text: run.text,
    maxRight: run.maxRight,
    spans: [
      {
        x: run.x,
        baselineY: run.baselineY,
        width: run.width,
        fontSize: run.fontSize,
        bgColor: run.bgColor,
      },
    ],
    coveredKeys: [run.key],
    originalText: run.text,
  }
}

export function getSameLineCandidates(
  source: TextObject,
  objects: EditObject[],
  pageRuns: TextRun[],
): LineCandidate[] {
  const coveredKeys = getCoveredRunKeys(objects)
  const candidates: LineCandidate[] = []

  for (const obj of objects) {
    if (obj.type !== 'text' || obj.page !== source.page) continue
    if (obj.id !== source.id && !isSameHorizontalLine(source, obj)) continue
    candidates.push(toObjectCandidate(obj))
  }

  for (const run of pageRuns) {
    if (coveredKeys.has(run.key)) continue
    if (!isSameHorizontalLine(source, run)) continue
    candidates.push(toRunCandidate(run))
  }

  return candidates.sort((a, b) => a.x - b.x)
}

export function buildMergedTextObject(
  primary: TextObject,
  participants: LineCandidate[],
): { merged: TextObject; removedObjectIds: string[] } {
  const sorted = [...participants].sort((a, b) => a.x - b.x)
  const joinedText = sorted
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(' ')

  const leftmost = sorted[0] ?? toObjectCandidate(primary)
  const allSpans = sorted.flatMap((item) => item.spans)
  const allKeys = Array.from(new Set(sorted.flatMap((item) => item.coveredKeys)))
  const removedObjectIds = sorted
    .filter((item) => item.kind === 'object' && item.id !== primary.id)
    .map((item) => item.id)

  let original: TextObject['original'] = null
  if (allSpans.length > 0) {
    const minX = Math.min(...allSpans.map((span) => span.x))
    const maxSpanRight = Math.max(...allSpans.map((span) => span.x + span.width))
    const maxFontSize = Math.max(...allSpans.map((span) => span.fontSize))
    const maxRight = Math.max(...sorted.map((item) => item.maxRight))
    const bgColor = primary.original?.bgColor ?? allSpans[0].bgColor
    const origText = sorted
      .map((item) => item.originalText.trim())
      .filter(Boolean)
      .join(' ')

    original = {
      text: origText,
      x: minX,
      baselineY: primary.baselineY,
      width: maxSpanRight - minX,
      fontSize: maxFontSize,
      bgColor,
      maxRight,
      spans: allSpans,
      merged: true,
    }
  }

  return {
    merged: {
      ...primary,
      x: leftmost.x,
      baselineY: primary.baselineY,
      text: joinedText,
      boxWidth: undefined,
      originalKey: allKeys[0],
      coveredKeys: allKeys.length > 0 ? allKeys : undefined,
      original,
    },
    removedObjectIds,
  }
}

export function buildRunCandidate(run: TextRun): LineCandidate {
  return toRunCandidate(run)
}

export function buildObjectCandidate(obj: TextObject): LineCandidate {
  return toObjectCandidate(obj)
}
