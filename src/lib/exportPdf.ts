import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { topLeftToPdfY } from './coords'
import { loadFont, type LoadedFont } from './fonts/fontLoader'
import { hasDevanagari } from './fonts/fontMatcher'
import { layoutText } from './text/layoutText'
import type { EditObject } from '../store/usePdfStore'

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const normalized =
    value.length === 3 ? value.split('').map((part) => `${part}${part}`).join('') : value
  const number = Number.parseInt(normalized, 16) || 0
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255)
}

export async function exportPdf(
  pdfBytes: Uint8Array,
  objects: EditObject[],
  fileName: string,
): Promise<void> {
  const pdf = await PDFDocument.load(pdfBytes)
  pdf.registerFontkit(fontkit)

  const embeddedFonts = new Map<string, PDFFont>()

  for (const object of objects) {
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()

    if (object.type === 'image') {
      const image =
        object.mime === 'image/png'
          ? await pdf.embedPng(object.dataUrl)
          : await pdf.embedJpg(object.dataUrl)
      page.drawImage(image, {
        x: object.x,
        y: topLeftToPdfY(height, object.y, object.height),
        width: object.width,
        height: object.height,
      })
      continue
    }

    if (object.type === 'whiteout' || object.type === 'highlight') {
      page.drawRectangle({
        x: object.x,
        y: topLeftToPdfY(height, object.y, object.height),
        width: object.width,
        height: object.height,
        color: object.type === 'whiteout' ? rgb(1, 1, 1) : rgb(1, 1, 0),
        opacity: object.type === 'highlight' ? 0.4 : 1,
      })
      continue
    }

    if (object.type !== 'text') continue

    try {
      let loadedFont: LoadedFont | null = null
      let fontToUse: PDFFont

      const isDevanagari = hasDevanagari(object.text) || object.fontFamily === 'devanagari'
      const activeFamily = isDevanagari ? 'devanagari' : object.fontFamily

      try {
        loadedFont = await loadFont({
          family: activeFamily,
          bold: object.bold,
          italic: object.italic,
        })

        if (!embeddedFonts.has(loadedFont.key)) {
          const embedded = await pdf.embedFont(loadedFont.bytes, { subset: true })
          embeddedFonts.set(loadedFont.key, embedded)
        }
        fontToUse = embeddedFonts.get(loadedFont.key)!
      } catch (fontErr) {
        console.warn(
          `Font loading failed for ${activeFamily}, using emergency Helvetica fallback:`,
          fontErr,
        )
        if (!embeddedFonts.has('helvetica-fallback')) {
          const fallbackFont = await pdf.embedFont(StandardFonts.Helvetica)
          embeddedFonts.set('helvetica-fallback', fallbackFont)
        }
        fontToUse = embeddedFonts.get('helvetica-fallback')!
      }

      const effectiveFont: LoadedFont = loadedFont || {
        key: 'fallback',
        bytes: new ArrayBuffer(0),
        cssFamily: 'sans-serif',
        unitsPerEm: 1000,
        ascent: 0.95,
        descent: 0.25,
        measure: (text: string, fontSize: number) => fontToUse.widthOfTextAtSize(text, fontSize),
      }

      const layout = layoutText(object, effectiveFont)

      if (layout.cover) {
        page.drawRectangle({
          x: layout.cover.x,
          y: topLeftToPdfY(height, layout.cover.y, layout.cover.height),
          width: layout.cover.width,
          height: layout.cover.height,
          color: hexToRgb(layout.cover.color),
        })
      }

      if (object.text) {
        page.drawText(object.text, {
          x: layout.textX,
          y: height - layout.baselineY,
          size: layout.fontSize,
          font: fontToUse,
          color: hexToRgb(object.color),
        })
      }
    } catch (textErr) {
      console.error('Error drawing text in exportPdf:', textErr)
      throw new Error(
        'Some characters could not be encoded. Please remove unsupported symbols.',
      )
    }
  }

  const editedBytes = await pdf.save()
  const blob = new Blob([editedBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `edited-${fileName}`
  link.click()
  URL.revokeObjectURL(url)
}
