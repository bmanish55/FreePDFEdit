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
  cover: null | CoverRect
  fit: 'ok' | 'shrunk' | 'overflow'
  warning: string | null
}

export function layoutText(obj: TextObject, font: LoadedFont): Layout {
  let size = obj.fontSize
  let w = font.measure(obj.text, size)

  // If obj.original is null (new text): no cover, fit = 'ok'
  if (!obj.original) {
    return {
      fontSize: size,
      textX: obj.x,
      baselineY: obj.baselineY,
      width: w,
      cover: null,
      fit: 'ok',
      warning: null,
    }
  }

  const original = obj.original
  const available = original.maxRight - obj.x
  let fit: 'ok' | 'shrunk' | 'overflow' = 'ok'
  let warning: string | null = null

  if (w <= available) {
    fit = 'ok'
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

  // Cover rectangle (hides original text) with pad = 1.5
  const pad = 1.5
  const left = Math.min(obj.x, original.x) - pad
  const right = Math.max(obj.x + w, original.x + original.width) + pad
  const top = obj.baselineY - font.ascent * original.fontSize - pad
  const bottom = obj.baselineY + font.descent * original.fontSize + pad

  const cover: CoverRect = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    color: original.bgColor,
  }

  return {
    fontSize: size,
    textX: obj.x,
    baselineY: obj.baselineY,
    width: w,
    cover,
    fit,
    warning,
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
    width: 3 * 12 * 0.6, // 21.6
    fontSize: 12,
    bgColor: '#FFFFFF',
    maxRight: 150, // available = 50
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
    text: 'ABCABCABC', // 9 chars -> 64.8 pt at 12pt, needed = 9.26 >= 9 -> shrunk
  }

  const overflowObj: TextObject = {
    ...shortObj,
    id: 'test-overflow',
    text: 'ABCABCABC',
    original: {
      ...baseOriginal,
      maxRight: 135, // available = 35 -> needed = 6.48 < 9 -> overflow
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
