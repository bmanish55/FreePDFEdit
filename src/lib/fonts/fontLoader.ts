import fontkit from '@pdf-lib/fontkit'
import type { FontFamilyKey, MatchedFont } from './fontMatcher'

export const LATIN_FONT_FEATURES = {
  liga: false,
  dlig: false,
  clig: false,
  calt: false,
} as const

export type LoadedFont = {
  key: string
  bytes: ArrayBuffer
  cssFamily: string
  unitsPerEm: number
  ascent: number
  descent: number
  measure: (text: string, fontSize: number) => number
}

const FAMILY_FILE_NAMES: Record<FontFamilyKey, string> = {
  arimo: 'Arimo',
  carlito: 'Carlito',
  tinos: 'Tinos',
  cousine: 'Cousine',
  devanagari: 'NotoSansDevanagari',
}

function getStyleName(
  family: FontFamilyKey,
  bold: boolean,
  italic: boolean,
): 'Regular' | 'Bold' | 'Italic' | 'BoldItalic' {
  if (family === 'devanagari') {
    return bold ? 'Bold' : 'Regular'
  }
  if (bold && italic) return 'BoldItalic'
  if (bold) return 'Bold'
  if (italic) return 'Italic'
  return 'Regular'
}

export function getFontKey(m: MatchedFont): string {
  const stylePart =
    m.family === 'devanagari'
      ? m.bold
        ? 'bold'
        : 'regular'
      : m.bold && m.italic
        ? 'bolditalic'
        : m.bold
          ? 'bold'
          : m.italic
            ? 'italic'
            : 'regular'
  return `${m.family}-${stylePart}`
}

const fontCache = new Map<string, Promise<LoadedFont>>()
const syncFontCache = new Map<string, LoadedFont>()

export function getCachedLoadedFont(m: MatchedFont): LoadedFont | null {
  return syncFontCache.get(getFontKey(m)) ?? null
}

async function fetchFontBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url} (status ${response.status})`)
  }
  return response.arrayBuffer()
}

async function doLoadFont(m: MatchedFont): Promise<LoadedFont> {
  const familyName = FAMILY_FILE_NAMES[m.family]
  const styleName = getStyleName(m.family, m.bold, m.italic)
  const fontKey = getFontKey(m)
  const primaryUrl = `/fonts/${familyName}-${styleName}.ttf`

  let bytes: ArrayBuffer
  let resolvedKey = fontKey

  try {
    bytes = await fetchFontBytes(primaryUrl)
  } catch (primaryError) {
    console.warn(`Font file not found: ${primaryUrl}, attempting fallback`, primaryError)
    try {
      if (m.family === 'devanagari') {
        bytes = await fetchFontBytes('/fonts/NotoSansDevanagari-Regular.ttf')
        resolvedKey = 'devanagari-regular'
      } else {
        bytes = await fetchFontBytes('/fonts/Arimo-Regular.ttf')
        resolvedKey = 'arimo-regular'
      }
    } catch {
      try {
        bytes = await fetchFontBytes('/fonts/Arimo-Regular.ttf')
        resolvedKey = 'arimo-regular'
      } catch {
        throw new Error(
          `Font file missing: ${primaryUrl}. Fallback /fonts/Arimo-Regular.ttf also missing. Please check public/fonts/.`,
        )
      }
    }
  }

  const cssFamily = `FPE-${resolvedKey}`

  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      let registered = false
      document.fonts.forEach((face) => {
        if (face.family === cssFamily) registered = true
      })
      if (!registered) {
        const face = new FontFace(cssFamily, bytes.slice(0))
        await face.load()
        document.fonts.add(face)
      }
    } catch (faceErr) {
      console.warn(`Could not register FontFace for ${cssFamily}:`, faceErr)
    }
  }

  const font = fontkit.create(new Uint8Array(bytes))
  const unitsPerEm = font.unitsPerEm || 1000
  const ascent = font.ascent / unitsPerEm
  const descent = Math.abs(font.descent) / unitsPerEm
  const layoutFeatures = resolvedKey.startsWith('devanagari') ? undefined : { ...LATIN_FONT_FEATURES }

  const measure = (text: string, fontSize: number): number => {
    if (!text) return 0
    const glyphRun = font.layout(text, layoutFeatures)
    const advanceWidthSum = glyphRun.glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth, 0)
    return (advanceWidthSum / unitsPerEm) * fontSize
  }

  const loaded: LoadedFont = {
    key: resolvedKey,
    bytes,
    cssFamily,
    unitsPerEm,
    ascent,
    descent,
    measure,
  }
  syncFontCache.set(fontKey, loaded)
  syncFontCache.set(resolvedKey, loaded)
  return loaded
}

export function loadFont(m: MatchedFont): Promise<LoadedFont> {
  const fontKey = getFontKey(m)
  const cached = fontCache.get(fontKey)
  if (cached) return cached

  const promise = doLoadFont(m).catch((err) => {
    fontCache.delete(fontKey)
    throw err
  })

  fontCache.set(fontKey, promise)
  return promise
}
