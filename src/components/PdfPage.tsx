import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { screenToPdf } from '../lib/coords'
import { extractText, type PdfTextItem } from '../lib/extractText'
import ObjectView from './ObjectView'
import { usePdfStore } from '../store/usePdfStore'

type PdfPageProps = {
  document: PDFDocumentProxy
  pageNumber: number
  zoom: number
}

export default function PdfPage({ document, pageNumber, zoom }: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [textItems, setTextItems] = useState<PdfTextItem[]>([])
  const activeTool = usePdfStore((state) => state.activeTool)
  const allObjects = usePdfStore((state) => state.objects)
  const objects = allObjects.filter((object) => object.page === pageNumber)
  const addObject = usePdfStore((state) => state.addObject)
  const selectObject = usePdfStore((state) => state.selectObject)
  const setVisiblePage = usePdfStore((state) => state.setVisiblePage)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting)
        if (entry.isIntersecting) setVisiblePage(pageNumber)
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [pageNumber, setVisiblePage])

  useEffect(() => {
    if (!isNearViewport) return
    let cancelled = false
    const renderPage = async () => {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: zoom })
      const extractedText = await extractText(page, pageNumber)
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.ceil(viewport.width * pixelRatio)
      canvas.height = Math.ceil(viewport.height * pixelRatio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      setDimensions({ width: viewport.width, height: viewport.height })
      setTextItems(extractedText)
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      await page.render({ canvasContext: context, viewport }).promise
    }
    void renderPage()
    return () => {
      cancelled = true
    }
  }, [document, isNearViewport, pageNumber, zoom])

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'addText') {
      selectObject(null)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
    addObject({
      id: crypto.randomUUID(),
      type: 'text',
      page: pageNumber,
      x: point.x,
      y: point.y,
      width: 160,
      height: 24,
      text: '',
      fontSize: 14,
      color: '#000000',
      coverOriginal: false,
    })
  }

  const handleExistingText = (event: PointerEvent<HTMLDivElement>, item: PdfTextItem) => {
    event.stopPropagation()
    if (activeTool !== 'select') return
    const existing = objects.find((object) => object.type === 'text' && object.originalKey === item.key)
    if (existing) {
      selectObject(existing.id)
      return
    }
    addObject({
      id: crypto.randomUUID(),
      type: 'text',
      page: pageNumber,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      text: item.text,
      fontSize: item.fontSize,
      color: '#000000',
      coverOriginal: true,
      originalKey: item.key,
    })
  }

  return (
    <div ref={containerRef} className="relative mx-auto mb-8 w-fit max-w-full overflow-auto bg-white shadow-md">
      <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} className={dimensions.width ? 'block' : 'hidden'} />
      {dimensions.width > 0 && (
        <div className="absolute inset-0" style={{ touchAction: activeTool === 'select' ? 'auto' : 'none' }} onPointerDown={handleOverlayPointerDown}>
          {activeTool === 'select' && textItems.map((item) => (
            <div
              key={item.key}
              className="absolute cursor-text"
              style={{ left: item.x * zoom, top: item.y * zoom, width: item.width * zoom, height: item.height * zoom }}
              aria-label={`Edit text: ${item.text}`}
              onPointerDown={(event) => handleExistingText(event, item)}
            />
          ))}
          {objects.map((object) => <ObjectView key={object.id} object={object} zoom={zoom} />)}
        </div>
      )}
      {!dimensions.width && <div className="h-32 w-64 animate-pulse bg-slate-100" aria-label="Loading page" />}
    </div>
  )
}
