import { useCallback, useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AlertTriangle } from 'lucide-react'
import { useMobileStore } from '../../store/useMobileStore'
import { usePdfStore } from '../../store/usePdfStore'
import AdSlot from '../AdSlot'
import DesktopNotice from '../DesktopNotice'
import Header from '../Header'
import PdfPage from '../PdfPage'
import Notice from '../ui/Notice'
import MobileBottomBar from './MobileBottomBar'
import MobileHint from './MobileHint'
import TextEditSheet from './TextEditSheet'

type MobileEditorShellProps = {
  pdfDocument: PDFDocumentProxy
  onDownload: () => void
  error: string
  isLoading: boolean
}

export default function MobileEditorShell({
  pdfDocument,
  onDownload,
  error,
  isLoading,
}: MobileEditorShellProps) {
  const numPages = usePdfStore((state) => state.numPages)
  const zoom = usePdfStore((state) => state.zoom)
  const setZoom = usePdfStore((state) => state.setZoom)
  const textWarning = usePdfStore((state) => state.textWarning)
  const editingTextId = useMobileStore((state) => state.editingTextId)

  const pagesContainerRef = useRef<HTMLDivElement>(null)
  const page1BaseWidthRef = useRef<number | null>(null)
  const hasAutoFitRef = useRef<PDFDocumentProxy | null>(null)

  const fitToWidth = useCallback(async () => {
    let baseWidth = page1BaseWidthRef.current
    if (!baseWidth) {
      try {
        const page = await pdfDocument.getPage(1)
        baseWidth = page.getViewport({ scale: 1 }).width
        page1BaseWidthRef.current = baseWidth
      } catch {
        return
      }
    }
    const containerWidth = pagesContainerRef.current?.clientWidth ?? 0
    if (containerWidth > 16 && baseWidth > 0) {
      const nextZoom = Math.min(2, Math.max(0.5, (containerWidth - 16) / baseWidth))
      setZoom(nextZoom)
    }
  }, [pdfDocument, setZoom])

  useEffect(() => {
    if (hasAutoFitRef.current === pdfDocument) return
    let cancelled = false
    const initFit = async () => {
      try {
        const page = await pdfDocument.getPage(1)
        if (cancelled) return
        const baseWidth = page.getViewport({ scale: 1 }).width
        page1BaseWidthRef.current = baseWidth
        const containerWidth = pagesContainerRef.current?.clientWidth ?? 0
        if (containerWidth > 16 && baseWidth > 0) {
          const nextZoom = Math.min(2, Math.max(0.5, (containerWidth - 16) / baseWidth))
          setZoom(nextZoom)
          hasAutoFitRef.current = pdfDocument
        }
      } catch {
        // Keep current zoom if page 1 dimensions fail to load
      }
    }
    void initFit()
    return () => {
      cancelled = true
    }
  }, [pdfDocument, setZoom])

  const bottomSpace = editingTextId
    ? 'calc(240px + env(safe-area-inset-bottom))'
    : 'calc(56px + env(safe-area-inset-bottom))'

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-100"
      style={{ paddingBottom: bottomSpace }}
    >
      <DesktopNotice />
      <Header onDownload={onDownload} hasPdf />

      <main className="flex flex-1 flex-col">
        <div className="px-4 pt-4">
          <AdSlot position="top" />
        </div>

        {textWarning && !editingTextId && (
          <div className="px-4 pt-3">
            <Notice
              tone={textWarning.toLowerCase().includes('reduced') ? 'warning' : 'error'}
              icon={<AlertTriangle size={18} strokeWidth={2} />}
            >
              {textWarning}
            </Notice>
          </div>
        )}

        {error && (
          <div className="px-4 pt-3">
            <Notice tone="error" icon={<AlertTriangle size={18} strokeWidth={2} />}>
              {error}
            </Notice>
          </div>
        )}

        <div
          ref={pagesContainerRef}
          onContextMenu={(e) => e.preventDefault()}
          className="pdf-pages min-w-0 flex-1 overflow-x-auto px-2 py-4 [-webkit-overflow-scrolling:touch]"
          style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
        >
          {isLoading && (
            <p role="status" className="mb-4 text-center text-sm text-slate-600">
              Loading PDF...
            </p>
          )}
          <div className="flex flex-col gap-4" aria-label="PDF pages">
            {Array.from({ length: numPages }, (_, index) => (
              <PdfPage
                key={index + 1}
                document={pdfDocument}
                pageNumber={index + 1}
                zoom={zoom}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <AdSlot position="bottom" />
        </div>
      </main>

      <MobileHint />
      <MobileBottomBar onFitWidth={() => void fitToWidth()} />
      <TextEditSheet />
    </div>
  )
}
