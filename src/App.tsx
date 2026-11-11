import { useCallback, useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AlertTriangle, Sparkles } from 'lucide-react'
import AdSlot from './components/AdSlot'
import BuyMeCoffeeModal from './components/BuyMeCoffeeModal'
import CoffeeBanner from './components/CoffeeBanner'
import DesktopNotice from './components/DesktopNotice'
import FeedbackModal from './components/FeedbackModal'
import Footer from './components/Footer'
import Header from './components/Header'
import LandingView from './components/LandingView'
import MobileEditorShell from './components/mobile/MobileEditorShell'
import PdfPage from './components/PdfPage'
import RefreshConfirmModal from './components/RefreshConfirmModal'
import Toolbar from './components/Toolbar'
import AboutPage from './components/pages/AboutPage'
import ContactPage from './components/pages/ContactPage'
import PrivacyPolicyPage from './components/pages/PrivacyPolicyPage'
import TermsPage from './components/pages/TermsPage'
import Notice from './components/ui/Notice'
import { useIsMobile } from './hooks/useIsMobile'
import { useUnsavedGuard } from './hooks/useUnsavedGuard'
import { exportPdf } from './lib/exportPdf'
import { applyRouteMetadata, normalizeRoute, type AppRoute } from './lib/siteConfig'
import { usePdfStore } from './store/usePdfStore'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRoute(window.location.pathname))
  const pdfBytes = usePdfStore((state) => state.pdfBytes)
  const numPages = usePdfStore((state) => state.numPages)
  const zoom = usePdfStore((state) => state.zoom)
  const setPdf = usePdfStore((state) => state.setPdf)
  const restoreSession = usePdfStore((state) => state.restoreSession)
  const objects = usePdfStore((state) => state.objects)
  const fileName = usePdfStore((state) => state.fileName)
  const textWarning = usePdfStore((state) => state.textWarning)
  const setAiModalOpen = usePdfStore((state) => state.setAiModalOpen)
  const isFeedbackModalOpen = usePdfStore((state) => state.isFeedbackModalOpen)
  const setFeedbackModalOpen = usePdfStore((state) => state.setFeedbackModalOpen)
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isMobile = useIsMobile()
  const {
    pendingDraft,
    isRefreshModalOpen,
    closeRefreshModal,
    confirmRefresh,
    markPdfOpened,
    markRestored,
    markDownloaded,
    discardDraft,
  } = useUnsavedGuard({ pdfBytes, fileName, objects })

  const navigate = useCallback((nextRoute: AppRoute) => {
    const target = normalizeRoute(nextRoute)
    if (target !== normalizeRoute(window.location.pathname)) {
      window.history.pushState(null, '', target)
    }
    setRoute(target)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(normalizeRoute(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    applyRouteMetadata(route)
  }, [route])

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('mobile-mode')
    } else {
      document.body.classList.remove('mobile-mode')
    }
    return () => {
      document.body.classList.remove('mobile-mode')
    }
  }, [isMobile])

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
      markPdfOpened(bytes, file.name)
    } catch {
      setError('This PDF could not be opened. It may be corrupt or password-protected.')
    } finally {
      setIsLoading(false)
    }
  }

  const performDownload = async () => {
    if (!pdfBytes) return
    try {
      setError('')
      await exportPdf(pdfBytes, objects, fileName)
      markDownloaded()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Some characters could not be encoded. Please remove unsupported symbols.'
      setError(msg)
    }
  }

  const handleDownload = async () => {
    if (!pdfBytes) return
    if (!usePdfStore.getState().hasSeenCoffeePrompt) {
      usePdfStore.getState().openCoffeeModal('download')
      return
    }
    await performDownload()
  }

  const handleRestoreDraft = async () => {
    if (!pendingDraft) return
    setError('')
    setIsLoading(true)
    try {
      const loadedDocument = await pdfjsLib.getDocument({ data: pendingDraft.pdfBytes.slice() }).promise
      restoreSession(pendingDraft.pdfBytes, pendingDraft.fileName, loadedDocument.numPages, pendingDraft.objects)
      setPdfDocument(loadedDocument)
      markRestored(pendingDraft.pdfBytes, pendingDraft.fileName, pendingDraft.objects)
    } catch {
      await discardDraft()
      setError('Saved draft could not be restored.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => () => {
    pdfDocument?.destroy()
  }, [pdfDocument])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const isEditingControl =
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.tagName === 'SELECT' ||
        Boolean(el?.isContentEditable)
      if (isEditingControl) return

      const store = usePdfStore.getState()
      if (event.key === 'Delete') {
        store.deleteSelected()
      } else if (event.key === 'Escape') {
        if (store.mergeSourceId !== null) {
          store.setMergeSourceId(null)
        } else if (store.activeTool !== 'select') {
          store.setActiveTool('select')
        } else if (store.selectedId !== null) {
          store.selectObject(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (route === '/' && isMobile && pdfBytes && pdfDocument) {
    return (
      <>
        <MobileEditorShell
          pdfDocument={pdfDocument}
          onDownload={() => void handleDownload()}
          error={error}
          isLoading={isLoading}
        />
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
        />
        <BuyMeCoffeeModal onProceedDownload={performDownload} />
        <RefreshConfirmModal
          isOpen={isRefreshModalOpen}
          onCancel={closeRefreshModal}
          onConfirm={confirmRefresh}
        />
      </>
    )
  }

  const renderPageContent = () => {
    if (route === '/about') {
      return <AboutPage hasPdf={Boolean(pdfBytes)} onNavigate={navigate} />
    }
    if (route === '/privacy-policy') {
      return <PrivacyPolicyPage hasPdf={Boolean(pdfBytes)} onNavigate={navigate} />
    }
    if (route === '/terms') {
      return <TermsPage hasPdf={Boolean(pdfBytes)} onNavigate={navigate} />
    }
    if (route === '/contact') {
      return (
        <ContactPage
          hasPdf={Boolean(pdfBytes)}
          onNavigate={navigate}
          onOpenFeedbackModal={() => setFeedbackModalOpen(true)}
        />
      )
    }

    if (!pdfBytes || !pdfDocument) {
      return (
        <LandingView
          onFile={(file) => void handleFile(file)}
          error={error}
          isLoading={isLoading}
          pendingDraft={pendingDraft}
          onRestoreDraft={() => void handleRestoreDraft()}
          onDiscardDraft={() => void discardDraft()}
          onNavigate={navigate}
        />
      )
    }

    return (
      <div className="min-h-full bg-slate-100">
        <Toolbar />

        {/* Notices below toolbar */}
        {textWarning && (
          <div className="mx-auto max-w-7xl px-4 pt-3">
            <Notice
              tone={textWarning.toLowerCase().includes('reduced') ? 'warning' : 'error'}
              icon={<AlertTriangle size={18} strokeWidth={2} />}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span>{textWarning}</span>
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200"
                >
                  <Sparkles size={13} className="text-amber-700" />
                  <span>Fit with AI</span>
                </button>
              </div>
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

        {/* Workspace */}
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
          {/* Left (main) column */}
          <div className="min-w-0 flex-1 overflow-x-auto [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch]">
            {isLoading && (
              <p role="status" className="mb-4 text-center text-sm text-slate-600">
                Loading PDF...
              </p>
            )}
            <div className="flex flex-col gap-6" aria-label="PDF pages">
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

          {/* Right column (ad) */}
          <div className="hidden w-[300px] shrink-0 xl:block">
            <div className="sticky top-32">
              <AdSlot position="side" />
            </div>
          </div>
        </div>

        {/* Bottom ad slot */}
        <div className="mx-auto max-w-7xl px-4 pb-8">
          <AdSlot position="bottom" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {route === '/' && <DesktopNotice />}
      <Header
        onDownload={() => void handleDownload()}
        hasPdf={Boolean(pdfBytes)}
        currentRoute={route}
        onNavigate={navigate}
      />
      <CoffeeBanner />
      <main className="flex-1">{renderPageContent()}</main>
      <Footer currentRoute={route} onNavigate={navigate} />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
      <BuyMeCoffeeModal onProceedDownload={performDownload} />
      <RefreshConfirmModal
        isOpen={isRefreshModalOpen}
        onCancel={closeRefreshModal}
        onConfirm={confirmRefresh}
      />
    </div>
  )
}