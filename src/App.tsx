import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import AdSlot from './components/AdSlot'
import DesktopNotice from './components/DesktopNotice'
import Header from './components/Header'
import PdfPage from './components/PdfPage'
import Toolbar from './components/Toolbar'
import UploadZone from './components/UploadZone'
import { usePdfStore } from './store/usePdfStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function App() {
  const pdfBytes = usePdfStore((state) => state.pdfBytes)
  const numPages = usePdfStore((state) => state.numPages)
  const zoom = usePdfStore((state) => state.zoom)
  const setPdf = usePdfStore((state) => state.setPdf)
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.')
      return
    }
    setError('')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const loadedDocument = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
    setPdf(bytes, file.name, loadedDocument.numPages)
    setPdfDocument(loadedDocument)
  }

  useEffect(() => () => {
    pdfDocument?.destroy()
  }, [pdfDocument])

  return (
    <div className="min-h-screen bg-slate-50">
      <DesktopNotice />
      <Header onDownload={() => undefined} hasPdf={Boolean(pdfBytes)} />
      <main>
        <div className="px-4 py-4 sm:px-6">
          <AdSlot position="top" />
        </div>
        <div className="sticky top-0 z-10 border-y border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <nav aria-label="PDF editing tools" className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">PDF tools</span>
            <Toolbar />
            <span className="text-sm text-slate-500">Upload a PDF to get started</span>
          </nav>
        </div>
        <div className="mx-auto flex max-w-[1540px] gap-8 px-4 py-8 sm:px-6 lg:py-10">
          <section aria-label="PDF workspace" className="min-w-0 flex-1">
            {error && <p role="alert" className="mb-4 text-center text-sm text-red-600">{error}</p>}
            {!pdfBytes || !pdfDocument ? (
              <UploadZone onFile={(file) => void handleFile(file)} />
            ) : (
              <div aria-label="PDF pages">
                {Array.from({ length: numPages }, (_, index) => (
                  <PdfPage key={index + 1} document={pdfDocument} pageNumber={index + 1} zoom={zoom} />
                ))}
              </div>
            )}
          </section>
          <AdSlot position="side" />
        </div>
        <div className="px-4 pb-8 sm:px-6">
          <AdSlot position="bottom" />
        </div>
      </main>
    </div>
  )
}
