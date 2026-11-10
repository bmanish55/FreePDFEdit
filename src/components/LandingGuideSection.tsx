import {
  ChevronDown,
  Eraser,
  Highlighter,
  ImagePlus,
  Lock,
  PenLine,
  PlusCircle,
  Sparkles,
} from 'lucide-react'
import type { AppRoute } from '../lib/siteConfig'

type LandingGuideSectionProps = {
  onNavigate?: (route: AppRoute) => void
}

const TOOL_GUIDES = [
  {
    icon: PenLine,
    title: 'Edit Existing PDF Text',
    body: 'Click directly on selectable text lines to fix typos, update dates, or rewrite entries while preserving aligned font metrics and spacing.',
  },
  {
    icon: PlusCircle,
    title: 'Add New Text Anywhere',
    body: 'Place fresh text boxes anywhere on any page with adjustable font size, bold or italic styling, and custom hex colors.',
  },
  {
    icon: ImagePlus,
    title: 'Insert Images & Signatures',
    body: 'Drop in PNG or JPEG graphics — such as handwritten signatures, company stamps, or diagrams — then drag and resize proportionally.',
  },
  {
    icon: Eraser,
    title: 'Clean Whiteout Patches',
    body: 'Draw crisp whiteout rectangles over outdated fields, old addresses, or unwanted labels before placing replacement text on top.',
  },
  {
    icon: Highlighter,
    title: 'Highlight Key Sections',
    body: 'Mark clauses, headings, or study notes with semi-transparent yellow highlights that export cleanly into standard PDF readers.',
  },
  {
    icon: Sparkles,
    title: 'Smart Text Fitting',
    body: 'Need to squeeze a longer phrase into a tight margin? Use the built-in offline condenser or your local Ollama model to tighten copy.',
  },
]

const FAQS = [
  {
    q: 'Are my PDF files uploaded to a server?',
    a: 'No. FreePDFEdit renders pages with PDF.js and generates your final file with pdf-lib entirely inside your browser memory. Your documents never leave your device.',
  },
  {
    q: 'Is FreePDFEdit completely free without watermarks?',
    a: 'Yes. You can open PDFs, make edits across multiple pages, and download clean edited files without signups, daily page caps, or added watermarks.',
  },
  {
    q: 'Can I edit scanned PDFs or photos of documents?',
    a: 'Direct inline text replacement works on PDFs that contain selectable digital text. For scanned image PDFs, you can cover areas with the Whiteout tool and place new text or signatures on top.',
  },
  {
    q: 'How does FreePDFEdit match original document fonts?',
    a: 'When you edit existing text, FreePDFEdit measures the original text bounding box and selects a close metric-compatible open-source font (Arimo, Tinos, Carlito, or Cousine) so lines stay aligned.',
  },
  {
    q: 'What happens if I accidentally refresh or close the tab?',
    a: 'Your active PDF and edit history are temporarily backed up locally inside your browser IndexedDB storage so you can restore your draft upon returning, then cleared once you download or discard.',
  },
  {
    q: 'Does FreePDFEdit work on phones and tablets?',
    a: 'Yes. On mobile screens FreePDFEdit automatically switches to a touch-friendly editor layout with fit-to-width zoom and bottom editing controls, though a desktop or laptop offers the largest workspace for detailed edits.',
  },
]

export default function LandingGuideSection({ onNavigate }: LandingGuideSectionProps) {
  const handleLink = (route: AppRoute) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(route)
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Tools & Capabilities */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Everything you need for quick PDF edits
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Designed for everyday fixes on resumes, forms, invoices, and study notes without
            installing heavy desktop software.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_GUIDES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon size={20} strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Privacy & Browser Architecture */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                <Lock size={14} strokeWidth={2} />
                <span>Local-First Architecture</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                Why client-side PDF editing keeps sensitive files safer
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                Many online PDF editors upload your bank statements, ID documents, tax forms, and
                contracts to cloud servers before showing a preview. FreePDFEdit processes every
                page directly on your CPU inside the browser tab.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <a
                  href="/about"
                  onClick={handleLink('/about')}
                  className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
                >
                  Read how it works
                </a>
                <a
                  href="/privacy-policy"
                  onClick={handleLink('/privacy-policy')}
                  className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
                >
                  View Privacy Policy
                </a>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <div>
                <h3 className="font-bold text-slate-900">1. Non-destructive editing</h3>
                <p className="mt-1">
                  Your original PDF bytes stay untouched while you move text, resize images, or
                  undo changes with Ctrl+Z.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-bold text-slate-900">2. Local refresh protection</h3>
                <p className="mt-1">
                  Active edits auto-save only to your own browser IndexedDB so an accidental reload
                  never wipes your progress.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-bold text-slate-900">3. Instant clean export</h3>
                <p className="mt-1">
                  Click Download to generate a standard PDF in memory and save it straight to your
                  device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Common answers about privacy, supported files, and editing features.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-bold text-slate-900 sm:text-base [&::-webkit-details-marker]:hidden">
                <span>{q}</span>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className="shrink-0 text-slate-400 transition-transform duration-150 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}