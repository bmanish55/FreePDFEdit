import type { MouseEvent } from 'react'
import { Download, FileText, MessageSquareHeart } from 'lucide-react'
import type { AppRoute } from '../lib/siteConfig'
import Button from './ui/Button'
import { usePdfStore } from '../store/usePdfStore'

type HeaderProps = {
  onDownload: () => void
  hasPdf?: boolean
  currentRoute?: AppRoute
  onNavigate?: (route: AppRoute) => void
}

const TOP_NAV_LINKS: Array<{ route: AppRoute; label: string }> = [
  { route: '/about', label: 'About' },
  { route: '/privacy-policy', label: 'Privacy' },
  { route: '/contact', label: 'Contact' },
]

export default function Header({
  onDownload,
  hasPdf = false,
  currentRoute = '/',
  onNavigate,
}: HeaderProps) {
  const fileName = usePdfStore((state) => state.fileName)
  const setFeedbackModalOpen = usePdfStore((state) => state.setFeedbackModalOpen)

  const handleLinkClick = (route: AppRoute) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(route)
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={handleLinkClick('/')}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FileText size={18} strokeWidth={2} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">FreePDFEdit</span>
          </a>

          {hasPdf && fileName && (
            <>
              <span className="hidden h-4 w-px bg-slate-200 md:inline" />
              <span
                className="hidden max-w-[260px] truncate text-sm text-slate-500 md:inline"
                title={fileName}
              >
                {fileName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!hasPdf && (
            <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
              {TOP_NAV_LINKS.map(({ route, label }) => {
                const isActive = currentRoute === route
                return (
                  <a
                    key={route}
                    href={route}
                    onClick={handleLinkClick(route)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </a>
                )
              })}
            </nav>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedbackModalOpen(true)}
            icon={<MessageSquareHeart size={16} strokeWidth={2} className="text-brand-600" />}
            aria-label="Give Feedback"
            title="Give Feedback"
            className="text-xs font-medium text-slate-700 hover:text-brand-700"
          >
            <span className="hidden sm:inline">Feedback</span>
          </Button>

          <Button
            variant="primary"
            disabled={!hasPdf}
            onClick={onDownload}
            icon={<Download size={18} strokeWidth={2} />}
            aria-label="Download PDF"
            title="Download PDF"
          >
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
    </header>
  )
}