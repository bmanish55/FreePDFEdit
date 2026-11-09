import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: '600px 0px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isNearViewport) return
    let cancelled = false
    const renderPage = async () => {
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
    }
    void renderPage()
    return () => {
      cancelled = true
    }
  }, [document, isNearViewport, pageNumber, zoom])

  return (
    <div ref={containerRef} className="relative mx-auto mb-8 w-fit max-w-full overflow-auto bg-white shadow-md">
      <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} className={dimensions.width ? 'block' : 'hidden'} />
      {!dimensions.width && <div className="h-32 w-64 animate-pulse bg-slate-100" aria-label="Loading page" />}
    </div>
  )
}
