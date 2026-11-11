import type { LoadedFont } from '../fonts/fontLoader'
import type { TextObject } from '../../store/usePdfStore'

export type CoverRect = {
  x: number
  y: number
  width: number
  height: number
  color: string
}

export type Layout = {
  fontSize: number
  textX: number
  baselineY: number
  width: number
  lines: string[]
  lineHeight: number
  cover: null | CoverRect
  covers: CoverRect[]
  fit: 'ok' | 'shrunk' | 'overflow'
  warning: string | null
  wordSpacing?: number
}

function buildCoverRects(
  obj: TextObject,
  font: LoadedFont,
  effectiveTextWidth: number,
  hasMoved: boolean,
): CoverRect[] {
  const original = obj.original
  if (!original) return []
  const pad = 1.5

  if (original.spans && original.spans.length > 0) {
    return original.spans.map((span) => ({
      x: span.x - pad,
      y: span.baselineY - font.ascent * span.fontSize - pad,
      width: span.width + pad * 2,
      height: (font.ascent + font.descent) * span.fontSize + pad * 2,
      color: span.bgColor,
    }))
  }

  const origBaselineY = original.baselineY ?? obj.baselineY
  const left = (hasMoved ? original.x : Math.min(obj.x, original.x)) - pad
  const right =
    (hasMoved
      ? original.x + original.width
      : Math.max(obj.x + effectiveTextWidth, original.x + original.width)) + pad
  const top = origBaselineY - font.ascent * original.fontSize - pad
  const bottom = origBaselineY + font.descent * original.fontSize + pad

  return [
    {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      color: original.bgColor,
    },
  ]
}

export function wrapTextLines(
  text: string,
  maxWidth: number,
  measure: (segment: string) => number,
): string[] {
  if (!text) return ['']
  const paragraphs = text.split('\n')
  const result: string[] = []

  for (const para of paragraphs) {
    if (para === '') {
      result.push('')
      continue
    }
    const tokens = para.split(/( +)/)
    let current = ''

    for (const token of tokens) {
      if (token === '') continue
      const candidate = current + token
      if (current === '' || measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      if (/^ +$/.test(token)) {
        result.push(current)
        current = ''
        continue
      }
      result.push(current.replace(/ +$/, ''))
      if (measure(token) > maxWidth) {
        let chunk = ''
        for (const ch of token) {
          if (chunk && measure(chunk + ch) > maxWidth) {
            result.push(chunk)
            chunk = ch
          } else {
            chunk += ch
          }
        }
        current = chunk
      } else {
        current = token
      }
    }
    result.push(current)
  }

  return result
}

export function layoutText(obj: TextObject, font: LoadedFont): Layout {
  let size = obj.fontSize
  const hasCustomBox = typeof obj.boxWidth === 'number' && obj.boxWidth > 0

  if (hasCustomBox) {
    const lineHeight = Math.max((font.ascent + font.descent) * size, size * 1.22)
    const lines = wrapTextLines(obj.text, obj.boxWidth!, (seg) => font.measure(seg, size))
    const maxLineW = lines.reduce((max, line) => Math.max(max, font.measure(line, size)), 0)
    const origBaselineY = obj.original?.baselineY ?? obj.baselineY
    const hasMoved = obj.original
      ? Math.abs(obj.x - obj.original.x) > 1.5 || Math.abs(obj.baselineY - origBaselineY) > 1.5
      : false
    const covers = buildCoverRects(obj, font, maxLineW, hasMoved)

    return {
      fontSize: size,
      textX: obj.x,
      baselineY: obj.baselineY,
      width: Math.max(maxLineW, obj.boxWidth!),
      lines,
      lineHeight,
      cover: covers[0] ?? null,
      covers,
      fit: 'ok',
      warning: null,
      wordSpacing: 0,
    }
  }

  const rawLines = obj.text ? obj.text.split('\n') : ['']
  let w = rawLines.reduce((max, line) => Math.max(max, font.measure(line, size)), 0)

  // If obj.original is null (new text): no cover, fit = 'ok'
  if (!obj.original) {
    const lineHeight = Math.max((font.ascent + font.descent) * size, size * 1.22)
    return {
      fontSize: size,
      textX: obj.x,
      baselineY: obj.baselineY,
      width: w,
      lines: rawLines,
      lineHeight,
      cover: null,
      covers: [],
      fit: 'ok',
      warning: null,
      wordSpacing: 0,
    }
  }

  const original = obj.original
  const origBaselineY = original.baselineY ?? obj.baselineY
  const hasMoved =
    Math.abs(obj.x - original.x) > 1.5 || Math.abs(obj.baselineY - origBaselineY) > 1.5
  const hasCustomSize = Math.abs(obj.fontSize - original.fontSize) > 0.1
  const isMerged = Boolean(original.merged)
  const available = original.maxRight - obj.x
  let fit: 'ok' | 'shrunk' | 'overflow' = 'ok'
  let warning: string | null = null
  let wordSpacing = 0

  const isExactOriginal = obj.text === original.text
  const spaceCount = (obj.text.match(/\s/g) || []).length

  if (isExactOriginal && !hasCustomSize) {
    fit = 'ok'
    warning = null
    size = original.fontSize
    w = font.measure(obj.text, size)
    if (!isMerged && original.width > w && spaceCount > 0) {
      wordSpacing = Math.min(Math.max(0, (original.width - w) / spaceCount), size * 0.8)
    }
  } else if (hasMoved || hasCustomSize || rawLines.length > 1 || w <= available) {
    fit = 'ok'
    if (
      !isMerged &&
      !hasMoved &&
      !hasCustomSize &&
      rawLines.length === 1 &&
      original.width > w &&
      spaceCount > 0 &&
      Math.abs(original.width - w) < size * 3
    ) {
      wordSpacing = Math.min(Math.max(0, (original.width - w) / spaceCount), size * 0.5)
    }
  } else {
    const minSize = original.fontSize * 0.75
    const needed = (size * available) / w

    if (needed >= minSize) {
      size = needed
      w = font.measure(obj.text, size)
      fit = 'shrunk'
      warning = 'Text was reduced to fit the space.'
    } else {
      size = minSize
      w = font.measure(obj.text, size)
      fit = 'overflow'
      warning = 'Text is too long for this space and may overlap nearby text.'
    }
  }

  const lineHeight = Math.max((font.ascent + font.descent) * size, size * 1.22)
  const effectiveTextWidth = w + wordSpacing * spaceCount
  const covers = buildCoverRects(obj, font, effectiveTextWidth, hasMoved)

  return {
    fontSize: size,
    textX: obj.x,
    baselineY: obj.baselineY,
    width: w,
    lines: rawLines,
    lineHeight,
    cover: covers[0] ?? null,
    covers,
    fit,
    warning,
    wordSpacing,
  }
}

export function debugLayoutText(): void {
  const mockFont: LoadedFont = {
    key: 'mock-font',
    bytes: new ArrayBuffer(0),
    cssFamily: 'mock-font',
    unitsPerEm: 1000,
    ascent: 0.9,
    descent: 0.25,
    measure: (text: string, fontSize: number) => text.length * fontSize * 0.6,
  }

  const baseOriginal = {
    text: 'ABC',
    x: 100,
    width: 3 * 12 * 0.6,
    fontSize: 12,
    bgColor: '#FFFFFF',
    maxRight: 150,
  }

  const shortObj: TextObject = {
    id: 'test-short',
    type: 'text',
    page: 1,
    x: 100,
    baselineY: 200,
    text: 'AB',
    fontFamily: 'arimo',
    bold: false,
    italic: false,
    fontSize: 12,
    color: '#000000',
    original: baseOriginal,
  }

  const shrunkObj: TextObject = {
    ...shortObj,
    id: 'test-shrunk',
    text: 'ABCABCABC',
  }

  const overflowObj: TextObject = {
    ...shortObj,
    id: 'test-overflow',
    text: 'ABCABCABC',
    original: {
      ...baseOriginal,
      maxRight: 135,
    },
  }

  const resShort = layoutText(shortObj, mockFont)
  const resShrunk = layoutText(shrunkObj, mockFont)
  const resOverflow = layoutText(overflowObj, mockFont)

  console.group('layoutText debug results:')
  console.log('Short text ("AB") -> fit:', resShort.fit, 'size:', resShort.fontSize)
  console.log('3x text with close maxRight ("ABCABCABC", maxRight: 150) -> fit:', resShrunk.fit, 'size:', resShrunk.fontSize.toFixed(2), 'warning:', resShrunk.warning)
  console.log('3x text with very close maxRight ("ABCABCABC", maxRight: 135) -> fit:', resOverflow.fit, 'size:', resOverflow.fontSize, 'warning:', resOverflow.warning)
  console.groupEnd()
}
