import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { screenToPdf } from '../lib/coords'
import { extractText, type TextRun } from '../lib/text/extractText'
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
  const [textRuns, setTextRuns] = useState<TextRun[]>([])
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [renderError, setRenderError] = useState('')
  const drawStart = useRef({ x: 0, y: 0 })
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
      try {
        const page = await document.getPage(pageNumber)
        const viewport = page.getViewport({ scale: zoom })
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        const pixelRatio = window.devicePixelRatio || 1
        canvas.width = Math.ceil(viewport.width * pixelRatio)
        canvas.height = Math.ceil(viewport.height * pixelRatio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        setDimensions({ width: viewport.width, height: viewport.height })
        const context = canvas.getContext('2d')
        if (!context) return
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        await page.render({ canvasContext: context, viewport }).promise

        // Run extraction AFTER canvas finished rendering
        const extractedRuns = await extractText(page, pageNumber, canvas)
        if (!cancelled) {
          setTextRuns(extractedRuns)
        }
      } catch {
        if (!cancelled) setRenderError('This page could not be rendered.')
      }
    }
    void renderPage()
    return () => {
      cancelled = true
    }
  }, [document, isNearViewport, pageNumber, zoom])

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'whiteout' || activeTool === 'highlight') {
      const bounds = event.currentTarget.getBoundingClientRect()
      drawStart.current = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      setDrawPreview({ x: drawStart.current.x, y: drawStart.current.y, width: 0, height: 0 })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
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
      baselineY: point.y + 14,
      text: '',
      fontFamily: 'arimo',
      bold: false,
      italic: false,
      fontSize: 14,
      color: '#000000',
      original: null,
    })
  }

  const handleOverlayPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
    setDrawPreview({
      x: Math.min(drawStart.current.x, point.x),
      y: Math.min(drawStart.current.y, point.y),
      width: Math.abs(point.x - drawStart.current.x),
      height: Math.abs(point.y - drawStart.current.y),
    })
  }

  const handleOverlayPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!drawPreview || drawPreview.width < 5 || drawPreview.height < 5) {
      setDrawPreview(null)
      return
    }
    if (activeTool === 'whiteout' || activeTool === 'highlight') {
      addObject({ id: crypto.randomUUID(), type: activeTool, page: pageNumber, ...drawPreview })
    }
    setDrawPreview(null)
  }

  const handleExistingText = (event: PointerEvent<HTMLDivElement>, run: TextRun) => {
    event.stopPropagation()
    if (activeTool !== 'select') return
    const existing = objects.find((object) => object.type === 'text' && object.originalKey === run.key)
    if (existing) {
      selectObject(existing.id)
      return
    }
    addObject({
      id: crypto.randomUUID(),
      type: 'text',
      page: pageNumber,
      x: run.x,
      baselineY: run.baselineY,
      text: run.text,
      fontFamily: run.family,
      bold: run.bold,
      italic: run.italic,
      fontSize: run.fontSize,
      color: run.color,
      originalKey: run.key,
      original: {
        text: run.text,
        x: run.x,
        width: run.width,
        fontSize: run.fontSize,
        bgColor: run.bgColor,
        maxRight: run.maxRight,
      },
    })
  }

  return (
    <div ref={containerRef} className="relative mx-auto mb-8 w-fit max-w-full overflow-auto bg-white shadow-md">
      <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} className={dimensions.width ? 'block' : 'hidden'} />
      {dimensions.width > 0 && (
        <div
          className="absolute inset-0"
          style={{ touchAction: activeTool === 'select' ? 'auto' : 'none' }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
        >
          {activeTool === 'select' &&
            textRuns
              .filter((run) => !objects.some((obj) => obj.type === 'text' && obj.originalKey === run.key))
              .map((run) => (
                <div
                  key={run.key}
                  className="absolute cursor-text hover:bg-blue-400/10"
                  style={{
                    left: run.x * zoom,
                    top: (run.baselineY - run.fontSize * 0.9) * zoom,
                    width: run.width * zoom,
                    height: (run.fontSize * 1.15) * zoom,
                  }}
                  aria-label={`Edit text: ${run.text}`}
                  onPointerDown={(event) => handleExistingText(event, run)}
                />
              ))}
          {objects.map((object) => (
            <ObjectView key={object.id} object={object} zoom={zoom} />
          ))}
          {drawPreview && (
            <div
              className={`absolute ${activeTool === 'whiteout' ? 'bg-white' : 'bg-yellow-300/40'} border border-slate-400`}
              style={{
                left: drawPreview.x * zoom,
                top: drawPreview.y * zoom,
                width: drawPreview.width * zoom,
                height: drawPreview.height * zoom,
              }}
            />
          )}
        </div>
      )}
      {!dimensions.width && !renderError && <div className="h-32 w-64 animate-pulse bg-slate-100" aria-label="Loading page" />}
      {renderError && <p role="alert" className="p-6 text-sm text-red-600">{renderError}</p>}
    </div>
  )
}
