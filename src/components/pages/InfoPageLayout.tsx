import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AppRoute } from '../../lib/siteConfig'

type InfoPageLayoutProps = {
  title: string
  subtitle: string
  updatedLabel?: string
  hasPdf?: boolean
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}

export default function InfoPageLayout({
  title,
  subtitle,
  updatedLabel,
  hasPdf = false,
  onNavigate,
  children,
}: InfoPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href="/"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onNavigate('/')
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          <span>{hasPdf ? 'Back to PDF Editor' : 'Back to PDF Upload'}</span>
        </a>

        {updatedLabel && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
            {updatedLabel}
          </span>
        )}
      </div>

      <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">{subtitle}</p>
        </header>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600 sm:text-base">
          {children}
        </div>
      </article>
    </div>
  )
}