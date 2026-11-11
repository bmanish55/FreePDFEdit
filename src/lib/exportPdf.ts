import fontkit from '@pdf-lib/fontkit'
import {
  LineCapStyle,
  PDFDocument,
  PDFHexString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib'
import { getAnnotationIcon } from './annotations/annotationIcons'
import { topLeftToPdfY } from './coords'
import { LATIN_FONT_FEATURES, loadFont, type LoadedFont } from './fonts/fontLoader'
import { hasDevanagari } from './fonts/fontMatcher'
import {
  buildArrowGeometry,
  buildCloudSvgPath,
  buildPointsSvgPath,
  getDashArray,
} from './shapes/shapeGeometry'
import { layoutText } from './text/layoutText'
import {
  sortObjectsByLayer,
  type AnnotationObject,
  type EditObject,
  type ShapeObject,
} from '../store/usePdfStore'

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const normalized =
    value.length === 3 ? value.split('').map((part) => `${part}${part}`).join('') : value
  const number = Number.parseInt(normalized, 16) || 0
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255)
}

function drawShapeToPdfPage(page: PDFPage, object: ShapeObject, pageHeight: number): void {
  const dashArray = getDashArray(object.lineStyle, object.strokeWidth)
  const strokeRgb = hexToRgb(object.strokeColor)
  const fillRgb = object.fillColor ? hexToRgb(object.fillColor) : undefined
  const opacity = object.opacity

  if (object.shape === 'rectangle') {
    page.drawRectangle({
      x: object.x,
      y: topLeftToPdfY(pageHeight, object.y, object.height),
      width: Math.max(1, object.width),
      height: Math.max(1, object.height),
      borderColor: strokeRgb,
      borderWidth: object.strokeWidth,
      borderOpacity: opacity,
      ...(dashArray.length > 0 ? { borderDashArray: dashArray } : {}),
      ...(fillRgb ? { color: fillRgb, opacity } : {}),
    })
    return
  }

  if (object.shape === 'ellipse') {
    page.drawEllipse({
      x: object.x + object.width / 2,
      y: pageHeight - (object.y + object.height / 2),
      xScale: Math.max(1, object.width / 2),
      yScale: Math.max(1, object.height / 2),
      borderColor: strokeRgb,
      borderWidth: object.strokeWidth,
      borderOpacity: opacity,
      ...(dashArray.length > 0 ? { borderDashArray: dashArray } : {}),
      ...(fillRgb ? { color: fillRgb, opacity } : {}),
    })
    return
  }

  if (object.shape === 'line' || object.shape === 'arrow') {
    const p0 = object.points?.[0] ?? { x: object.x, y: object.y }
    const p1 = object.points?.[1] ?? {
      x: object.x + object.width,
      y: object.y + object.height,
    }
    if (object.shape === 'line') {
      page.drawLine({
        start: { x: p0.x, y: pageHeight - p0.y },
        end: { x: p1.x, y: pageHeight - p1.y },
        thickness: object.strokeWidth,
        color: strokeRgb,
        opacity,
        lineCap: LineCapStyle.Round,
        ...(dashArray.length > 0 ? { dashArray } : {}),
      })
      return
    }
    const arrow = buildArrowGeometry(p0, p1, object.strokeWidth)
    page.drawLine({
      start: { x: arrow.shaftStart.x, y: pageHeight - arrow.shaftStart.y },
      end: { x: arrow.shaftEnd.x, y: pageHeight - arrow.shaftEnd.y },
      thickness: object.strokeWidth,
      color: strokeRgb,
      opacity,
      lineCap: LineCapStyle.Round,
      ...(dashArray.length > 0 ? { dashArray } : {}),
    })
    if (arrow.headPath) {
      page.drawSvgPath(arrow.headPath, {
        x: 0,
        y: pageHeight,
        scale: 1,
        color: strokeRgb,
        opacity,
      })
    }
    return
  }

  const defaultBoxPoints = [
    { x: object.x, y: object.y },
    { x: object.x + object.width, y: object.y },
    { x: object.x + object.width, y: object.y + object.height },
    { x: object.x, y: object.y + object.height },
  ]
  const pts =
    object.points && object.points.length >= 2 ? object.points : defaultBoxPoints

  if (object.shape === 'cloud') {
    const d = buildCloudSvgPath(pts.length >= 3 ? pts : defaultBoxPoints)
    if (!d) return
    page.drawSvgPath(d, {
      x: 0,
      y: pageHeight,
      scale: 1,
      borderColor: strokeRgb,
      borderWidth: object.strokeWidth,
      borderOpacity: opacity,
      borderLineCap: LineCapStyle.Round,
      ...(dashArray.length > 0 ? { borderDashArray: dashArray } : {}),
      ...(fillRgb ? { color: fillRgb, opacity } : {}),
    })
    return
  }

  const isClosed = object.shape === 'polygon'
  const d = buildPointsSvgPath(pts, isClosed)
  if (!d) return
  page.drawSvgPath(d, {
    x: 0,
    y: pageHeight,
    scale: 1,
    borderColor: strokeRgb,
    borderWidth: object.strokeWidth,
    borderOpacity: opacity,
    borderLineCap: LineCapStyle.Round,
    ...(dashArray.length > 0 ? { borderDashArray: dashArray } : {}),
    ...(isClosed && fillRgb ? { color: fillRgb, opacity } : {}),
  })
}

function drawAnnotationToPdfPage(
  pdf: PDFDocument,
  page: PDFPage,
  object: AnnotationObject,
  pageHeight: number,
  emptyApRef: { current: PDFRef | null },
): void {
  const def = getAnnotationIcon(object.icon)
  const iconScale = object.size / 24
  const annotColor = hexToRgb(object.color)

  for (const prim of def.primitives) {
    if (prim.mode === 'fill') {
      page.drawSvgPath(prim.d, {
        x: object.x,
        y: pageHeight - object.y,
        scale: iconScale,
        color: annotColor,
      })
    } else if (prim.mode === 'knockout') {
      page.drawSvgPath(prim.d, {
        x: object.x,
        y: pageHeight - object.y,
        scale: iconScale,
        color: rgb(1, 1, 1),
      })
    } else {
      page.drawSvgPath(prim.d, {
        x: object.x,
        y: pageHeight - object.y,
        scale: iconScale,
        borderColor: annotColor,
        borderWidth: prim.strokeWidth ?? 2,
        borderLineCap: LineCapStyle.Round,
      })
    }
  }

  const note = object.note.trim()
  if (note) {
    if (!emptyApRef.current) {
      const emptyForm = pdf.context.flateStream('', {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 24, 24],
        Resources: {},
      })
      emptyApRef.current = pdf.context.register(emptyForm)
    }
    const bottomY = topLeftToPdfY(pageHeight, object.y, object.size)
    const annotDict = pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [object.x, bottomY, object.x + object.size, bottomY + object.size],
      Contents: PDFHexString.fromText(note),
      T: PDFHexString.fromText('FreePDFEdit'),
      F: 4,
      AP: { N: emptyApRef.current },
    })
    page.node.addAnnot(pdf.context.register(annotDict))
  }
}

export async function exportPdf(
  pdfBytes: Uint8Array,
  objects: EditObject[],
  fileName: string,
): Promise<void> {
  const pdf = await PDFDocument.load(pdfBytes)
  pdf.registerFontkit(fontkit)

  const embeddedFonts = new Map<string, PDFFont>()
  const orderedObjects = sortObjectsByLayer(objects)

  type PreparedText = {
    object: Extract<EditObject, { type: 'text' }>
    fontToUse: PDFFont
    layout: ReturnType<typeof layoutText>
  }
  const preparedTexts: PreparedText[] = []

  for (const object of orderedObjects) {
    if (object.type !== 'text') continue
    if (object.original === null && object.text === '') continue

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
          // Embed full font without subsetting because @pdf-lib/fontkit TTFSubset corrupts Carlito glyphs;
          // disable Latin ligatures so pdf-lib's /W widths and /ToUnicode stay aligned for every glyph.
          const features = loadedFont.key.startsWith('devanagari')
            ? undefined
            : { ...LATIN_FONT_FEATURES }
          const embedded = await pdf.embedFont(new Uint8Array(loadedFont.bytes), {
            subset: false,
            features,
          })
          embeddedFonts.set(loadedFont.key, embedded)
        }
        fontToUse = embeddedFonts.get(loadedFont.key)!
      } catch (fontErr) {
        console.warn(
          `Font loading failed for ${activeFamily}, using emergency fallback:`,
          fontErr,
        )
        const standardFontName =
          activeFamily === 'tinos'
            ? object.bold && object.italic
              ? StandardFonts.TimesRomanBoldItalic
              : object.bold
                ? StandardFonts.TimesRomanBold
                : object.italic
                  ? StandardFonts.TimesRomanItalic
                  : StandardFonts.TimesRoman
            : activeFamily === 'cousine'
              ? object.bold && object.italic
                ? StandardFonts.CourierBoldOblique
                : object.bold
                  ? StandardFonts.CourierBold
                  : object.italic
                    ? StandardFonts.CourierOblique
                    : StandardFonts.Courier
              : object.bold && object.italic
                ? StandardFonts.HelveticaBoldOblique
                : object.bold
                  ? StandardFonts.HelveticaBold
                  : object.italic
                    ? StandardFonts.HelveticaOblique
                    : StandardFonts.Helvetica

        if (!embeddedFonts.has(standardFontName)) {
          const fallbackFont = await pdf.embedFont(standardFontName)
          embeddedFonts.set(standardFontName, fallbackFont)
        }
        fontToUse = embeddedFonts.get(standardFontName)!
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

      preparedTexts.push({
        object,
        fontToUse,
        layout: layoutText(object, effectiveFont),
      })
    } catch (textErr) {
      console.error('Error preparing text in exportPdf:', textErr)
      throw new Error(
        'Some characters could not be encoded. Please remove unsupported symbols.',
      )
    }
  }

  for (const object of orderedObjects) {
    if (object.type !== 'whiteout') continue
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()
    page.drawRectangle({
      x: object.x,
      y: topLeftToPdfY(height, object.y, object.height),
      width: object.width,
      height: object.height,
      color: rgb(1, 1, 1),
      opacity: 1,
    })
  }

  for (const { object, layout } of preparedTexts) {
    if (layout.covers.length === 0) continue
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()
    for (const cover of layout.covers) {
      page.drawRectangle({
        x: cover.x,
        y: topLeftToPdfY(height, cover.y, cover.height),
        width: cover.width,
        height: cover.height,
        color: hexToRgb(cover.color),
      })
    }
  }

  for (const object of orderedObjects) {
    if (object.type !== 'highlight' && object.type !== 'image' && object.type !== 'shape') {
      continue
    }
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()

    if (object.type === 'highlight') {
      page.drawRectangle({
        x: object.x,
        y: topLeftToPdfY(height, object.y, object.height),
        width: object.width,
        height: object.height,
        color: rgb(1, 1, 0),
        opacity: 0.4,
      })
    } else if (object.type === 'image') {
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
    } else if (object.type === 'shape') {
      drawShapeToPdfPage(page, object, height)
    }
  }

  for (const { object, fontToUse, layout } of preparedTexts) {
    if (!object.text) continue
    try {
      const page = pdf.getPage(object.page - 1)
      const { height } = page.getSize()
      const lines = layout.lines
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx]
        if (!lineText) continue
        const textY = height - (layout.baselineY + lineIdx * layout.lineHeight)
        if (
          lineIdx === 0 &&
          lines.length === 1 &&
          layout.wordSpacing &&
          layout.wordSpacing > 0.01 &&
          lineText.includes(' ')
        ) {
          const parts = lineText.split(' ')
          let currentX = layout.textX
          const spaceWidth = fontToUse.widthOfTextAtSize(' ', layout.fontSize) + layout.wordSpacing
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (part.length > 0) {
              page.drawText(part, {
                x: currentX,
                y: textY,
                size: layout.fontSize,
                font: fontToUse,
                color: hexToRgb(object.color),
              })
              currentX += fontToUse.widthOfTextAtSize(part, layout.fontSize)
            }
            if (i < parts.length - 1) {
              currentX += spaceWidth
            }
          }
        } else {
          page.drawText(lineText, {
            x: layout.textX,
            y: textY,
            size: layout.fontSize,
            font: fontToUse,
            color: hexToRgb(object.color),
          })
        }
      }
    } catch (textErr) {
      console.error('Error drawing text in exportPdf:', textErr)
      throw new Error(
        'Some characters could not be encoded. Please remove unsupported symbols.',
      )
    }
  }

  const emptyApRef: { current: PDFRef | null } = { current: null }
  for (const object of orderedObjects) {
    if (object.type !== 'annotation') continue
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()
    drawAnnotationToPdfPage(pdf, page, object, height, emptyApRef)
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
