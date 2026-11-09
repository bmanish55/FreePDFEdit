import type { PDFPageProxy } from 'pdfjs-dist'

export type PdfTextItem = {
  key: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

type TextContentItem = {
  str?: string
  transform?: number[]
  width?: number
  height?: number
}

export async function extractText(page: PDFPageProxy, pageNumber: number): Promise<PdfTextItem[]> {
  const content = await page.getTextContent()
  const pageHeight = page.getViewport({ scale: 1 }).height

  return content.items.flatMap((rawItem, index) => {
    const item = rawItem as TextContentItem
    if (!item.str || !item.transform) return []
    const [, , , transformHeight, x, baselineY] = item.transform
    const height = item.height || Math.abs(transformHeight) || 12
    return [{
      key: `${pageNumber}:${index}`,
      text: item.str,
      x,
      y: pageHeight - baselineY - height,
      width: item.width || 1,
      height,
      fontSize: height,
    }]
  })
}
