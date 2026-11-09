import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AlertTriangle } from 'lucide-react'
import AdSlot from './components/AdSlot'
import DesktopNotice from './components/DesktopNotice'
import Footer from './components/Footer'
import Header from './components/Header'
import LandingView from './components/LandingView'
import PdfPage from './components/PdfPage'
import Toolbar from './components/Toolbar'
import Notice from './components/ui/Notice'
import { exportPdf } from './lib/exportPdf'
import { usePdfStore } from './store/usePdfStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function App() {
  const pdfBytes = usePdfStore((state) => state.pdfBytes)
  const numPages = usePdfStore((state) => state.numPages)
  const zoom = usePdfStore((state) => state.zoom)
  const setPdf = usePdfStore((state) => state.setPdf)
  const objects = usePdfStore((state) => state.objects)
  const fileName = usePdfStore((state) => state.fileName)
  const textWarning = usePdfStore((state) => state.textWarning)
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.')
      return
    }

    setError('')
    setIsLoading(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const loadedDocument = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
      setPdf(bytes, file.name, loadedDocument.numPages)
      setPdfDocument(loadedDocument)
    } catch {
      setError('This PDF could not be opened. It may be corrupt or password-protected.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!pdfBytes) return
    try {
      setError('')
      await exportPdf(pdfBytes, objects, fileName)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Some characters could not be encoded. Please remove unsupported symbols.'
      setError(msg)
    }
  }

  useEffect(() => () => {
    pdfDocument?.destroy()
  }, [pdfDocument])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (event.key === 'Delete' && el?.tagName !== 'INPUT' && !el?.isContentEditable) {
        usePdfStore.getState().deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DesktopNotice />
      <Header onDownload={() => void handleDownload()} hasPdf={Boolean(pdfBytes)} />
      <main className="flex-1">
        {!pdfBytes || !pdfDocument ? (
          <LandingView
            onFile={(file) => void handleFile(file)}
            error={error}
            isLoading={isLoading}
          />
        ) : (
          <div className="min-h-full bg-slate-100 pb-8">
            <Toolbar />

            {/* Notices below toolbar */}
            {textWarning && (
              <div className="mx-auto max-w-7xl px-4 pt-3">
                <Notice
                  tone={textWarning.toLowerCase().includes('reduced') ? 'warning' : 'error'}
                  icon={<AlertTriangle size={18} strokeWidth={2} />}
                >
                  {textWarning}
                </Notice>
              </div>
            )}
            {error && (
              <div className="mx-auto max-w-7xl px-4 pt-3">
                <Notice tone="error" icon={<AlertTriangle size={18} strokeWidth={2} />}>
                  {error}
                </Notice>
              </div>
            )}

            <div className="mx-auto flex max-w-[1540px] gap-8 px-4 py-8 sm:px-6 lg:py-10">
              <section aria-label="PDF workspace" className="min-w-0 flex-1">
                {isLoading && <p role="status" className="mb-4 text-center text-sm text-slate-600">Loading PDF...</p>}
                <div aria-label="PDF pages">
                  {Array.from({ length: numPages }, (_, index) => (
                    <PdfPage key={index + 1} document={pdfDocument} pageNumber={index + 1} zoom={zoom} />
                  ))}
                </div>
              </section>
              <AdSlot position="side" />
            </div>

            <div className="px-4 pb-8 sm:px-6">
              <AdSlot position="bottom" />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
