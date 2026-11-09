import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { topLeftToPdfY } from './coords'
import type { EditObject } from '../store/usePdfStore'

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((part) => `${part}${part}`).join('') : value
  const number = Number.parseInt(normalized, 16)
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255)
}

export async function exportPdf(pdfBytes: Uint8Array, objects: EditObject[], fileName: string): Promise<void> {
  const pdf = await PDFDocument.load(pdfBytes)
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  for (const object of objects) {
    const page = pdf.getPage(object.page - 1)
    const { height } = page.getSize()
    if (object.type === 'image') {
      const image = object.mime === 'image/png'
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
    if (object.coverOriginal) {
      page.drawRectangle({
        x: object.x - 2,
        y: topLeftToPdfY(height, object.y - 2, object.height + 4),
        width: object.width + 4,
        height: object.height + 4,
        color: rgb(1, 1, 1),
      })
    }
    page.drawText(object.text, {
      x: object.x,
      y: topLeftToPdfY(height, object.y, object.height),
      size: object.fontSize,
      font,
      color: hexToRgb(object.color),
    })
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
