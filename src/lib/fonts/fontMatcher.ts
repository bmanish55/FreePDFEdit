export type FontFamilyKey = 'arimo' | 'carlito' | 'tinos' | 'cousine' | 'devanagari'

export type MatchedFont = {
  family: FontFamilyKey
  bold: boolean
  italic: boolean
}

export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F\uA8E0-\uA8FF]/.test(text)
}

export function matchFont(
  pdfFontName: string,
  pdfJsFontObj?: { bold?: boolean; italic?: boolean },
): MatchedFont {
  try {
    const raw = pdfFontName ?? ''
    const cleaned = raw
      .replace(/^[A-Z]{6}\+/, '')
      .toLowerCase()
      .replace(/[\s\-_]+/g, '')

    const bold =
      /bold|black|heavy|semibold|demi/.test(cleaned) || Boolean(pdfJsFontObj?.bold)
    const italic =
      /italic|oblique/.test(cleaned) || Boolean(pdfJsFontObj?.italic)

    let family: FontFamilyKey = 'arimo'
    if (/devanagari|hindi|marathi|mangal|aparajita|kokila|utsah|shree|kruti|gargi/.test(cleaned)) {
      family = 'devanagari'
    } else if (/courier|consolas|mono|menlo|lucidaconsole/.test(cleaned)) {
      family = 'cousine'
    } else if (
      /times|georgia|garamond|cambria|palatino|bookman|serif(?!.*sans)|minion|baskerville/.test(
        cleaned,
      )
    ) {
      family = 'tinos'
    } else if (/calibri|candara|corbel|segoe|myriad|gill|carlito/.test(cleaned)) {
      family = 'carlito'
    } else {
      family = 'arimo'
    }

    return { family, bold, italic }
  } catch {
    return { family: 'arimo', bold: false, italic: false }
  }
}

export function debugMatchFont(): void {
  const testCases = [
    'ABCDEF+Calibri-Bold',
    'Arial-BoldMT',
    'TimesNewRomanPS-ItalicMT',
    'CourierNewPSMT',
    'Helvetica',
    'XYZABC+SomethingUnknown',
    'Mangal-Regular',
  ]

  console.group('fontMatcher debug results:')
  for (const name of testCases) {
    const res = matchFont(name)
    const traits = [res.bold ? 'bold' : '', res.italic ? 'italic' : '']
      .filter(Boolean)
      .join(' ')
    console.log(`"${name}" -> ${res.family}${traits ? ` (${traits})` : ''}`)
  }
  console.groupEnd()
}
