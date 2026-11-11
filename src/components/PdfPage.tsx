import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { screenToPdf } from '../lib/coords'
import { extractText, type TextRun } from '../lib/text/extractText'
import { getBoundingBoxFromPoints } from '../lib/shapes/shapeGeometry'
import { getCoveredRunKeys, isSameHorizontalLine } from '../lib/text/mergeText'
import ObjectView from './ObjectView'
import ShapeSvg from './ui/ShapeSvg'
import {
  sortObjectsByLayer,
  usePdfStore,
  type ShapePoint,
  type TextObject,
} from '../store/usePdfStore'
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
  const [shapeDragPreview, setShapeDragPreview] = useState<{ start: ShapePoint; end: ShapePoint } | null>(null)
  const [polyPoints, setPolyPoints] = useState<ShapePoint[]>([])
  const [polyHover, setPolyHover] = useState<ShapePoint | null>(null)
  const [renderError, setRenderError] = useState('')
  const drawStart = useRef({ x: 0, y: 0 })
  const activeTool = usePdfStore((state) => state.activeTool)
  const allObjects = usePdfStore((state) => state.objects)
  const objects = sortObjectsByLayer(allObjects.filter((object) => object.page === pageNumber))
  const addObject = usePdfStore((state) => state.addObject)
  const selectObject = usePdfStore((state) => state.selectObject)
  const setVisiblePage = usePdfStore((state) => state.setVisiblePage)
  const numPages = usePdfStore((state) => state.numPages)
  const setActiveTool = usePdfStore((state) => state.setActiveTool)
  const setPageTextRuns = usePdfStore((state) => state.setPageTextRuns)
  const setPageSize = usePdfStore((state) => state.setPageSize)
  const activeGuides = usePdfStore((state) => state.activeGuides)
  const mergeSourceId = usePdfStore((state) => state.mergeSourceId)
  const setMergeSourceId = usePdfStore((state) => state.setMergeSourceId)
  const mergeWithTarget = usePdfStore((state) => state.mergeWithTarget)
  const activeAnnotationIcon = usePdfStore((state) => state.activeAnnotationIcon)
  const activeAnnotationColor = usePdfStore((state) => state.activeAnnotationColor)
  const activeShapeKind = usePdfStore((state) => state.activeShapeKind)
  const activeShapeStyle = usePdfStore((state) => state.activeShapeStyle)
  const isMobile = useIsMobile()
  const mobileMode = useMobileStore((state) => state.mode)
  const openTextEditor = useMobileStore((state) => state.openTextEditor)
  const commitTextEditor = useMobileStore((state) => state.commitTextEditor)
  const [isFarFromViewport, setIsFarFromViewport] = useState(false)

  const coveredKeys = getCoveredRunKeys(objects)
  const uncoveredRuns = textRuns.filter((run) => !coveredKeys.has(run.key))
  const mergeSourceObj =
    mergeSourceId !== null
      ? allObjects.find(
          (obj): obj is TextObject =>
            obj.id === mergeSourceId && obj.type === 'text' && obj.page === pageNumber,
        ) ?? null
      : null
  const pageGuides = activeGuides.filter((guide) => guide.page === pageNumber)

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
    if (!isMobile) {
      setIsFarFromViewport(false)
      return
    }
    const container = containerRef.current
    if (!container) return
    const farObserver = new IntersectionObserver(
      ([entry]) => {
        const far = !entry.isIntersecting
        setIsFarFromViewport(far)
        if (far && canvasRef.current) {
          canvasRef.current.width = 0
          canvasRef.current.height = 0
        }
      },
      { rootMargin: '200% 0px' },
    )
    farObserver.observe(container)
    return () => farObserver.disconnect()
  }, [isMobile])

  useEffect(() => {
    if (isMobile) {
      if (!isNearViewport || isFarFromViewport) return
      let cancelled = false
      let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
      const renderMobilePage = async () => {
        try {
          const page = await document.getPage(pageNumber)
          const viewport = page.getViewport({ scale: zoom })
          if (cancelled) return
          const canvas = canvasRef.current
          if (!canvas) return

          const MAX_CANVAS_PIXELS = 12_000_000
          let pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
          let canvasWidth = Math.ceil(viewport.width * pixelRatio)
          let canvasHeight = Math.ceil(viewport.height * pixelRatio)
          if (canvasWidth * canvasHeight > MAX_CANVAS_PIXELS) {
            pixelRatio = Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height))
            canvasWidth = Math.max(1, Math.floor(viewport.width * pixelRatio))
            canvasHeight = Math.max(1, Math.floor(viewport.height * pixelRatio))
          }

          canvas.width = canvasWidth
          canvas.height = canvasHeight
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          setDimensions({ width: viewport.width, height: viewport.height })

          const context = canvas.getContext('2d')
          if (!context) return
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
          renderTask = page.render({ canvasContext: context, viewport })
          await renderTask.promise

          const extractedRuns = await extractText(page, pageNumber, canvas)
          if (!cancelled) {
            const baseViewport = page.getViewport({ scale: 1 })
            setPageSize(pageNumber, { width: baseViewport.width, height: baseViewport.height })
            setTextRuns(extractedRuns)
            setPageTextRuns(pageNumber, extractedRuns)
          }
        } catch {
          if (!cancelled) setRenderError('This page could not be rendered.')
        }
      }
      void renderMobilePage()
      return () => {
        cancelled = true
        renderTask?.cancel()
      }
    }

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
          const baseViewport = page.getViewport({ scale: 1 })
          setPageSize(pageNumber, { width: baseViewport.width, height: baseViewport.height })
          setTextRuns(extractedRuns)
          setPageTextRuns(pageNumber, extractedRuns)
        }
      } catch {
        if (!cancelled) setRenderError('This page could not be rendered.')
      }
    }
    void renderPage()
    return () => {
      cancelled = true
    }
  }, [document, isFarFromViewport, isMobile, isNearViewport, pageNumber, zoom])

  const textTouchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const overlayTouchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const isMultiPointShape =
    activeShapeKind === 'polygon' ||
    activeShapeKind === 'cloud' ||
    activeShapeKind === 'polyline'

  const finishMultiPointShape = (pointsToCommit = polyPoints) => {
    const minPoints = activeShapeKind === 'polyline' ? 2 : 3
    if (pointsToCommit.length < minPoints) {
      setPolyPoints([])
      setPolyHover(null)
      return
    }
    const bbox = getBoundingBoxFromPoints(pointsToCommit)
    addObject({
      id: crypto.randomUUID(),
      type: 'shape',
      page: pageNumber,
      shape: activeShapeKind,
      ...bbox,
      points: pointsToCommit,
      ...activeShapeStyle,
    })
    setPolyPoints([])
    setPolyHover(null)
    setActiveTool('select')
  }

  useEffect(() => {
    if (activeTool !== 'shape' || !isMultiPointShape) {
      setPolyPoints([])
      setPolyHover(null)
    }
  }, [activeTool, activeShapeKind, isMultiPointShape])

  useEffect(() => {
    if (polyPoints.length === 0) return
    const handlePolyKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        finishMultiPointShape()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setPolyPoints([])
        setPolyHover(null)
      }
    }
    window.addEventListener('keydown', handlePolyKey, true)
    return () => window.removeEventListener('keydown', handlePolyKey, true)
  })

  const handleOverlayPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mergeSourceId !== null) {
      setMergeSourceId(null)
      return
    }
    if (activeTool === 'whiteout' || activeTool === 'highlight') {
      const bounds = event.currentTarget.getBoundingClientRect()
      drawStart.current = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      setDrawPreview({ x: drawStart.current.x, y: drawStart.current.y, width: 0, height: 0 })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (activeTool === 'shape') {
      const bounds = event.currentTarget.getBoundingClientRect()
      const pt = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      drawStart.current = pt
      if (isMultiPointShape) {
        if (activeShapeKind === 'cloud' && polyPoints.length === 0) {
          setShapeDragPreview({ start: pt, end: pt })
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        return
      }
      setShapeDragPreview({ start: pt, end: pt })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (activeTool === 'addText' || activeTool === 'annotate') {
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
    if (activeTool === 'shape' && isMultiPointShape && polyPoints.length > 0) {
      const bounds = event.currentTarget.getBoundingClientRect()
      setPolyHover(
        screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom),
      )
    }

    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)

    if (activeTool === 'shape') {
      setShapeDragPreview({ start: drawStart.current, end: point })
      return
    }

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
      const bounds = event.currentTarget.getBoundingClientRect()
      const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      const rect = {
        x: Math.min(drawStart.current.x, point.x),
        y: Math.min(drawStart.current.y, point.y),
        width: Math.abs(point.x - drawStart.current.x),
        height: Math.abs(point.y - drawStart.current.y),
      }
      const minDimension = event.pointerType === 'touch' ? 12 : 5
      setDrawPreview(null)
      if (rect.width < minDimension || rect.height < minDimension) {
        return
      }
      addObject({ id: crypto.randomUUID(), type: activeTool, page: pageNumber, ...rect })
      return
    }

    if (activeTool === 'shape') {
      const bounds = event.currentTarget.getBoundingClientRect()
      const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
      const dragDist = Math.hypot(point.x - drawStart.current.x, point.y - drawStart.current.y)

      if (isMultiPointShape) {
        if (activeShapeKind === 'cloud' && polyPoints.length === 0 && dragDist >= 14) {
          setShapeDragPreview(null)
          const x = Math.min(drawStart.current.x, point.x)
          const y = Math.min(drawStart.current.y, point.y)
          const width = Math.abs(point.x - drawStart.current.x)
          const height = Math.abs(point.y - drawStart.current.y)
          addObject({
            id: crypto.randomUUID(),
            type: 'shape',
            page: pageNumber,
            shape: 'cloud',
            x,
            y,
            width,
            height,
            points: [
              { x, y },
              { x: x + width, y },
              { x: x + width, y: y + height },
              { x, y: y + height },
            ],
            ...activeShapeStyle,
          })
          setActiveTool('select')
          return
        }
        setShapeDragPreview(null)
        if (polyPoints.length >= 3 && activeShapeKind !== 'polyline') {
          const first = polyPoints[0]
          if (Math.hypot(point.x - first.x, point.y - first.y) <= 9) {
            finishMultiPointShape(polyPoints)
            return
          }
        }
        setPolyPoints((prev) => [...prev, point])
        return
      }

      setShapeDragPreview(null)
      if (activeShapeKind === 'line' || activeShapeKind === 'arrow') {
        if (dragDist < 6) return
        const pts = [drawStart.current, point]
        const bbox = getBoundingBoxFromPoints(pts)
        addObject({
          id: crypto.randomUUID(),
          type: 'shape',
          page: pageNumber,
          shape: activeShapeKind,
          ...bbox,
          points: pts,
          ...activeShapeStyle,
        })
        setActiveTool('select')
        return
      }

      const rect = {
        x: Math.min(drawStart.current.x, point.x),
        y: Math.min(drawStart.current.y, point.y),
        width: Math.abs(point.x - drawStart.current.x),
        height: Math.abs(point.y - drawStart.current.y),
      }
      if (rect.width < 6 || rect.height < 6) return
      addObject({
        id: crypto.randomUUID(),
        type: 'shape',
        page: pageNumber,
        shape: activeShapeKind,
        ...rect,
        ...activeShapeStyle,
      })
      setActiveTool('select')
      return
    }

    if ((activeTool === 'addText' || activeTool === 'annotate') && overlayTouchStart.current) {
      const dx = event.clientX - overlayTouchStart.current.x
      const dy = event.clientY - overlayTouchStart.current.y
      const distance = Math.hypot(dx, dy)
      const duration = Date.now() - overlayTouchStart.current.time
      overlayTouchStart.current = null

      if (distance < 14 && duration < 500) {
        const bounds = event.currentTarget.getBoundingClientRect()
        const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
        if (activeTool === 'annotate') {
          const size = 24
          const pageW = dimensions.width / zoom
          const pageH = dimensions.height / zoom
          addObject({
            id: crypto.randomUUID(),
            type: 'annotation',
            page: pageNumber,
            x: Math.min(Math.max(0, point.x - size / 2), Math.max(0, pageW - size)),
            y: Math.min(Math.max(0, point.y - size / 2), Math.max(0, pageH - size)),
            size,
            icon: activeAnnotationIcon,
            color: activeAnnotationColor,
            note: '',
          })
          setActiveTool('select')
          return
        }

        addObject({
          id: crypto.randomUUID(),
          type: 'text',
          page: pageNumber,
          x: point.x,
          baselineY: point.y + 5,
          text: '',
          fontFamily: 'arimo',
          bold: false,
          italic: false,
          fontSize: 14,
          color: '#000000',
          original: null,
        })
        setActiveTool('select')
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
    if (mergeSourceObj) {
      if (isSameHorizontalLine(mergeSourceObj, run)) {
        mergeWithTarget(mergeSourceObj.id, { kind: 'run', run })
      } else {
        setMergeSourceId(null)
      }
      return
    }
    handleExistingText(run)
  }

  const handleExistingText = (run: TextRun) => {
    if (activeTool !== 'select') return
    const existing = objects.find(
      (object) =>
        object.type === 'text' &&
        (object.originalKey === run.key || Boolean(object.coveredKeys?.includes(run.key))),
    )
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
        baselineY: run.baselineY,
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
      if (mergeSourceObj) {
        if (isSameHorizontalLine(mergeSourceObj, run)) {
          mergeWithTarget(mergeSourceObj.id, { kind: 'run', run })
        } else {
          setMergeSourceId(null)
        }
        return
      }
      const existing = objects.find(
        (object) =>
          object.type === 'text' &&
          (object.originalKey === run.key || Boolean(object.coveredKeys?.includes(run.key))),
      )
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
          baselineY: run.baselineY,
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
          baselineY: point.y + 5,
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
      if (activeTool === 'annotate') {
        commitTextEditor()
        const bounds = event.currentTarget.getBoundingClientRect()
        const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
        const pageWidth = dimensions.width / zoom
        const pageHeight = dimensions.height / zoom
        const size = 24
        addObject({
          id: crypto.randomUUID(),
          type: 'annotation',
          page: pageNumber,
          x: Math.min(Math.max(0, point.x - size / 2), Math.max(0, pageWidth - size)),
          y: Math.min(Math.max(0, point.y - size / 2), Math.max(0, pageHeight - size)),
          size,
          icon: activeAnnotationIcon,
          color: activeAnnotationColor,
          note: '',
        })
        setActiveTool('select')
        return
      }
      if (activeTool === 'shape') {
        commitTextEditor()
        const bounds = event.currentTarget.getBoundingClientRect()
        const point = screenToPdf({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, zoom)
        const pageWidth = dimensions.width / zoom
        const pageHeight = dimensions.height / zoom
        const w = activeShapeKind === 'line' || activeShapeKind === 'arrow' ? 100 : 96
        const h = activeShapeKind === 'line' || activeShapeKind === 'arrow' ? 0 : 60
        const x = Math.min(Math.max(0, point.x - w / 2), Math.max(0, pageWidth - w))
        const y = Math.min(Math.max(0, point.y - h / 2), Math.max(0, pageHeight - Math.max(h, 12)))

        let points: ShapePoint[] | undefined
        if (activeShapeKind === 'line' || activeShapeKind === 'arrow') {
          points = [
            { x, y },
            { x: x + w, y },
          ]
        } else if (activeShapeKind === 'polygon') {
          points = [
            { x: x + w / 2, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ]
        } else if (activeShapeKind === 'cloud') {
          points = [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ]
        } else if (activeShapeKind === 'polyline') {
          points = [
            { x, y: y + h },
            { x: x + w * 0.35, y },
            { x: x + w * 0.65, y: y + h },
            { x: x + w, y },
          ]
        }

        addObject({
          id: crypto.randomUUID(),
          type: 'shape',
          page: pageNumber,
          shape: activeShapeKind,
          x,
          y,
          width: w,
          height: h,
          ...(points ? { points } : {}),
          ...activeShapeStyle,
        })
        setActiveTool('select')
        return
      }
      commitTextEditor()
      selectObject(null)
    }

    return (
      <div ref={containerRef} className="mx-auto shrink-0">
        <div
          className="relative bg-white shadow-md ring-1 ring-slate-200"
          style={dimensions.width > 0 ? { width: dimensions.width, height: dimensions.height } : undefined}
        >
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
                uncoveredRuns.map((run) => {
                  const isMergeTarget =
                    Boolean(mergeSourceObj) && isSameHorizontalLine(mergeSourceObj!, run)
                  return (
                    <div
                      key={run.key}
                      className={`absolute ${
                        isMergeTarget
                          ? 'cursor-pointer bg-emerald-500/15 outline-2 outline-dashed outline-emerald-500'
                          : ''
                      }`}
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
                  )
                })}
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
            className={`absolute inset-0 ${
              activeTool === 'addText'
                ? 'cursor-text'
                : activeTool === 'whiteout' ||
                    activeTool === 'highlight' ||
                    activeTool === 'shape' ||
                    activeTool === 'annotate'
                  ? 'cursor-crosshair'
                  : ''
            }`}
            style={{ touchAction: activeTool === 'select' ? 'pan-x pan-y' : 'none' }}
            onPointerDown={handleOverlayPointerDown}
            onPointerMove={handleOverlayPointerMove}
            onPointerUp={handleOverlayPointerUp}
            onDoubleClick={(event) => {
              if (activeTool === 'shape' && isMultiPointShape && polyPoints.length > 0) {
                event.stopPropagation()
                finishMultiPointShape()
              }
            }}
          >
            {activeTool === 'select' &&
              uncoveredRuns.map((run) => {
                const isMergeTarget =
                  Boolean(mergeSourceObj) && isSameHorizontalLine(mergeSourceObj!, run)
                return (
                  <div
                    key={run.key}
                    className={`absolute ${
                      isMergeTarget
                        ? 'cursor-pointer bg-emerald-500/15 outline-2 outline-dashed outline-emerald-500'
                        : 'cursor-text hover:bg-brand-500/10 hover:outline-1 hover:outline-dashed hover:outline-brand-400'
                    }`}
                    style={{
                      left: run.x * zoom,
                      top: (run.baselineY - run.fontSize * 0.9) * zoom,
                      width: run.width * zoom,
                      height: (run.fontSize * 1.15) * zoom,
                    }}
                    aria-label={
                      isMergeTarget ? `Merge with: ${run.text}` : `Edit text: ${run.text}`
                    }
                    onPointerDown={handleTextPointerDown}
                    onPointerUp={(event) => handleTextPointerUp(event, run)}
                  />
                )
              })}
            {objects.map((object) => (
              <ObjectView key={object.id} object={object} zoom={zoom} />
            ))}
            {pageGuides.map((guide, idx) => (
              <div
                key={`${guide.orientation}-${guide.kind}-${idx}`}
                className="pointer-events-none absolute z-30"
                style={
                  guide.orientation === 'v'
                    ? {
                        left: guide.pos * zoom,
                        top: guide.start * zoom,
                        height: Math.max(1, (guide.end - guide.start) * zoom),
                        width: 0,
                        borderLeft:
                          guide.kind === 'page' ? '1px dashed #e11d48' : '1px solid #e11d48',
                      }
                    : {
                        top: guide.pos * zoom,
                        left: guide.start * zoom,
                        width: Math.max(1, (guide.end - guide.start) * zoom),
                        height: 0,
                        borderTop:
                          guide.kind === 'page' ? '1px dashed #e11d48' : '1px solid #e11d48',
                      }
                }
              />
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
            {shapeDragPreview && (() => {
              const isLineLike = activeShapeKind === 'line' || activeShapeKind === 'arrow'
              const previewPts = isLineLike
                ? [shapeDragPreview.start, shapeDragPreview.end]
                : undefined
              const bbox = isLineLike
                ? getBoundingBoxFromPoints(previewPts!)
                : {
                    x: Math.min(shapeDragPreview.start.x, shapeDragPreview.end.x),
                    y: Math.min(shapeDragPreview.start.y, shapeDragPreview.end.y),
                    width: Math.abs(shapeDragPreview.end.x - shapeDragPreview.start.x),
                    height: Math.abs(shapeDragPreview.end.y - shapeDragPreview.start.y),
                  }
              return (
                <div
                  className="pointer-events-none absolute z-30"
                  style={{
                    left: bbox.x * zoom,
                    top: bbox.y * zoom,
                    width: Math.max(1, bbox.width * zoom),
                    height: Math.max(1, bbox.height * zoom),
                  }}
                >
                  <ShapeSvg
                    shape={activeShapeKind === 'cloud' ? 'rectangle' : activeShapeKind}
                    x={bbox.x}
                    y={bbox.y}
                    width={bbox.width}
                    height={bbox.height}
                    points={previewPts}
                    strokeColor={activeShapeStyle.strokeColor}
                    fillColor={activeShapeStyle.fillColor}
                    opacity={activeShapeStyle.opacity}
                    strokeWidth={activeShapeStyle.strokeWidth}
                    lineStyle={activeShapeStyle.lineStyle}
                    zoom={zoom}
                  />
                </div>
              )
            })()}
            {polyPoints.length > 0 && (() => {
              const previewPts = polyHover ? [...polyPoints, polyHover] : polyPoints
              const bbox = getBoundingBoxFromPoints(previewPts)
              return (
                <>
                  <div
                    className="pointer-events-none absolute z-30"
                    style={{
                      left: bbox.x * zoom,
                      top: bbox.y * zoom,
                      width: Math.max(1, bbox.width * zoom),
                      height: Math.max(1, bbox.height * zoom),
                    }}
                  >
                    <ShapeSvg
                      shape={activeShapeKind}
                      x={bbox.x}
                      y={bbox.y}
                      width={bbox.width}
                      height={bbox.height}
                      points={previewPts}
                      strokeColor={activeShapeStyle.strokeColor}
                      fillColor={activeShapeStyle.fillColor}
                      opacity={activeShapeStyle.opacity}
                      strokeWidth={activeShapeStyle.strokeWidth}
                      lineStyle={activeShapeStyle.lineStyle}
                      zoom={zoom}
                    />
                  </div>
                  {polyPoints.map((pt, i) => (
                    <span
                      key={i}
                      className="pointer-events-none absolute z-30 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-2 ring-white"
                      style={{ left: pt.x * zoom, top: pt.y * zoom }}
                    />
                  ))}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-xs text-white shadow-md"
                  >
                    <span>Click points · Double-click or Enter to finish</span>
                    {polyPoints.length >= (activeShapeKind === 'polyline' ? 2 : 3) && (
                      <button
                        type="button"
                        onClick={() => finishMultiPointShape()}
                        className="rounded bg-brand-500 px-2 py-0.5 font-medium text-white hover:bg-brand-600"
                      >
                        Finish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPolyPoints([])
                        setPolyHover(null)
                      }}
                      className="text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )
            })()}
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
