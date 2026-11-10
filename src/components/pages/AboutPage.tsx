import { ShieldCheck, Cpu, FileCheck2, Sparkles } from 'lucide-react'
import type { AppRoute } from '../../lib/siteConfig'
import InfoPageLayout from './InfoPageLayout'

type AboutPageProps = {
  hasPdf?: boolean
  onNavigate: (route: AppRoute) => void
}

export default function AboutPage({ hasPdf = false, onNavigate }: AboutPageProps) {
  return (
    <InfoPageLayout
      title="About FreePDFEdit"
      subtitle="A fast, privacy-first PDF editor built to run 100% inside your web browser with zero server uploads or watermarks."
      updatedLabel="100% Client-Side Tool"
      hasPdf={hasPdf}
      onNavigate={onNavigate}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Why we built FreePDFEdit</h2>
        <p>
          Everyday PDF edits — fixing a typo on a resume, updating an invoice number, adding a
          signature image, or redacting an address on a bank statement — should not force you to
          upload private documents to remote cloud servers or pay for bloated subscriptions.
        </p>
        <p>
          FreePDFEdit keeps the entire workflow on your device. From the moment you select a PDF to
          the second you click Download, every page render, text measurement, and binary PDF
          assembly happens locally inside your browser.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2.5 text-slate-900">
            <ShieldCheck size={20} strokeWidth={2} className="text-brand-600" />
            <h3 className="font-bold">Private by Architecture</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            There is no backend document upload queue. Your original PDF stays untouched in memory
            until you export a brand-new file directly to your downloads folder.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2.5 text-slate-900">
            <Cpu size={20} strokeWidth={2} className="text-brand-600" />
            <h3 className="font-bold">Precision Font Matching</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Uses PDF.js rendering alongside pdf-lib, fontkit, and metric-compatible open-source
            fonts (Arimo, Tinos, Carlito, and Cousine) so edited lines blend cleanly.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2.5 text-slate-900">
            <FileCheck2 size={20} strokeWidth={2} className="text-brand-600" />
            <h3 className="font-bold">Practical Editing Toolkit</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Edit existing selectable text, insert new text boxes with bold/italic/color controls,
            place PNG or JPG images, draw whiteout patches, and highlight passages.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2.5 text-slate-900">
            <Sparkles size={20} strokeWidth={2} className="text-brand-600" />
            <h3 className="font-bold">Smart Text Fitting</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Includes an offline semantic condenser — plus optional local Ollama integration — to
            help tightened replacement sentences fit inside narrow document margins.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Known Scope & Limitations</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Text-based PDFs vs. scanned images:</strong> Existing-text editing works on
            selectable PDF text layers. For scanned PDFs or image-only documents, use the{' '}
            <strong>Whiteout</strong> and <strong>Add Text</strong> tools together.
          </li>
          <li>
            <strong>Character coverage:</strong> Standard embedded fonts focus on Latin scripts;
            specialized or non-Latin glyphs may trigger an encoding warning during export.
          </li>
          <li>
            <strong>Password-protected PDFs:</strong> Encrypted PDFs that restrict loading cannot be
            opened without first unlocking them locally.
          </li>
        </ul>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Questions or Suggestions?</h2>
        <p>
          If you spot a rendering quirk or want to suggest an improvement, reach out anytime via our{' '}
          <a
            href="/contact"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onNavigate('/contact')
            }}
            className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
          >
            Contact page
          </a>
          .
        </p>
      </section>
    </InfoPageLayout>
  )
}