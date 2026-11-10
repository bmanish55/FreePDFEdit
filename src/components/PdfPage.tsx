import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { screenToPdf } from '../lib/coords'
import { extractText, type TextRun } from '../lib/text/extractText'
import ObjectView from './ObjectView'
import { usePdfStore } from '../store/usePdfStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { useMobileStore } from '../store/useMobileStore'

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
  const numPages = usePdfStore((state) => state.numPages)
  const setActiveTool = usePdfStore((state) => state.setActiveTool)
  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)
  const openTextEditor = useMobileStore((state) => state.openTextEditor)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)

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

  const textTouchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const overlayTouchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'whiteout' || activeTool === 'highlight') {
      const bounds = event.currentTarget.getBoundingClientRect()
      drawStart.current = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      setDrawPreview({ x: drawStart.current.x, y: drawStart.current.y, width: 0, height: 0 })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (activeTool === 'addText') {
      overlayTouchStart.current = {
        x: event.clientX,
        y: event.clientY,
        time: Date.now(),
      }
      return
    }

    selectObject(null)
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (activeTool === 'whiteout' || activeTool === 'highlight') {
      const minDimension = event.pointerType === 'touch' ? 12 : 5
      if (!drawPreview || drawPreview.width < minDimension || drawPreview.height < minDimension) {
        setDrawPreview(null)
        return
      }
      addObject({ id: crypto.randomUUID(), type: activeTool, page: pageNumber, ...drawPreview })
      setDrawPreview(null)
      return
    }

    if (activeTool === 'addText' && overlayTouchStart.current) {
      const dx = event.clientX - overlayTouchStart.current.x
      const dy = event.clientY - overlayTouchStart.current.y
      const distance = Math.hypot(dx, dy)
      const duration = Date.now() - overlayTouchStart.current.time
      overlayTouchStart.current = null

      // Only add text on clean tap, not on swipe/scroll
      if (distance < 14 && duration < 500) {
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
    }
  }

  const handleTextPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    textTouchStart.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    }
  }

  const handleTextPointerUp = (event: PointerEvent<HTMLDivElement>, run: TextRun) => {
    if (activeTool !== 'select') return
    if (!textTouchStart.current) return
    const dx = event.clientX - textTouchStart.current.x
    const dy = event.clientY - textTouchStart.current.y
    const distance = Math.hypot(dx, dy)
    const duration = Date.now() - textTouchStart.current.time
    textTouchStart.current = null

    // Distinguish clean tap from finger scroll/swipe gesture on mobile touch screens
    const maxDistance = event.pointerType === 'touch' ? 14 : 6
    if (distance > maxDistance || duration > 500) {
      return // Finger was scrolling the page, ignore text selection!
    }

    event.stopPropagation()
    handleExistingText(run)
  }

  const handleExistingText = (run: TextRun) => {
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

  if (isMobile) {
    const isViewMode = mobileMode === 'view'

    const handleMobileExistingText = (run: TextRun) => {
      if (isViewMode || activeTool !== 'select') return
      const existing = objects.find((object) => object.type === 'text' && object.originalKey === run.key)
      if (existing) {
        if (useMobileStore.getState().editingTextId !== existing.id) {
          commitTextEditor()
        }
        selectObject(existing.id)
        openTextEditor(existing.id, false)
        return
      }
      commitTextEditor()
      const newId = crypto.randomUUID()
      addObject({
        id: newId,
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
      openTextEditor(newId, true)
    }

    const handleMobileOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
      if (isViewMode) return
      if (activeTool === 'addText') {
        commitTextEditor()
        const bounds = event.currentTarget.getBoundingClientRect()
        const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
        const newId = crypto.randomUUID()
        addObject({
          id: newId,
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
        setActiveTool('select')
        openTextEditor(newId, true)
        return
      }
      if (activeTool === 'whiteout' || activeTool === 'highlight') {
        commitTextEditor()
        const bounds = event.currentTarget.getBoundingClientRect()
        const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
        const pageWidth = dimensions.width / zoom
        const pageHeight = dimensions.height / zoom
        const defaultWidth = activeTool === 'highlight' ? 140 : 120
        const defaultHeight = activeTool === 'highlight' ? 18 : 24
        const width = Math.min(defaultWidth, pageWidth)
        const height = Math.min(defaultHeight, pageHeight)
        const x = Math.min(Math.max(0, point.x - width / 2), Math.max(0, pageWidth - width))
        const y = Math.min(Math.max(0, point.y - height / 2), Math.max(0, pageHeight - height))
        addObject({
          id: crypto.randomUUID(),
          type: activeTool,
          page: pageNumber,
          x,
          y,
          width,
          height,
        })
        setActiveTool('select')
        return
      }
      commitTextEditor()
      selectObject(null)
    }

    return (
      <div ref={containerRef} className="mx-auto shrink-0">
        <div className="relative bg-white shadow-md ring-1 ring-slate-200">
          <canvas
            ref={canvasRef}
            aria-label={`PDF page ${pageNumber}`}
            className={dimensions.width ? 'block' : 'hidden'}
          />
          {dimensions.width > 0 && (
            <div
              className={`absolute inset-0 ${isViewMode ? 'pointer-events-none' : ''}`}
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
              onClick={handleMobileOverlayClick}
            >
              {!isViewMode &&
                activeTool === 'select' &&
                textRuns
                  .filter((run) => !objects.some((obj) => obj.type === 'text' && obj.originalKey === run.key))
                  .map((run) => (
                    <div
                      key={run.key}
                      className="absolute"
                      style={{
                        left: run.x * zoom,
                        top: (run.baselineY - run.fontSize * 0.9) * zoom,
                        width: run.width * zoom,
                        height: (run.fontSize * 1.15) * zoom,
                        touchAction: 'pan-x pan-y pinch-zoom',
                      }}
                      aria-label={`Edit text: ${run.text}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleMobileExistingText(run)
                      }}
                    />
                  ))}
              {objects.map((object) => (
                <ObjectView key={object.id} object={object} zoom={zoom} />
              ))}
            </div>
          )}
          {!dimensions.width && !renderError && (
            <div className="h-[600px] w-[450px] max-w-full animate-pulse rounded bg-slate-200" aria-label="Loading page" />
          )}
          {renderError && <p role="alert" className="p-6 text-sm text-red-600">{renderError}</p>}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          Page {pageNumber} of {numPages}
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="mx-auto shrink-0">
      <div className="relative bg-white shadow-md ring-1 ring-slate-200">
        <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} className={dimensions.width ? 'block' : 'hidden'} />
        {dimensions.width > 0 && (
          <div
            className="absolute inset-0"
            style={{ touchAction: activeTool === 'select' ? 'pan-x pan-y' : 'none' }}
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
                    className="absolute cursor-text hover:bg-brand-500/10"
                    style={{
                      left: run.x * zoom,
                      top: (run.baselineY - run.fontSize * 0.9) * zoom,
                      width: run.width * zoom,
                      height: (run.fontSize * 1.15) * zoom,
                    }}
                    aria-label={`Edit text: ${run.text}`}
                    onPointerDown={handleTextPointerDown}
                    onPointerUp={(event) => handleTextPointerUp(event, run)}
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
        {!dimensions.width && !renderError && (
          <div className="h-[600px] w-[450px] max-w-full animate-pulse rounded bg-slate-200" aria-label="Loading page" />
        )}
        {renderError && <p role="alert" className="p-6 text-sm text-red-600">{renderError}</p>}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Page {pageNumber} of {numPages}
      </p>
    </div>
  )
}
