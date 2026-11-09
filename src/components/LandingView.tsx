import { AlertTriangle, Loader2, MousePointerClick, ShieldCheck, Zap } from 'lucide-react'
import AdSlot from './AdSlot'
import Button from './ui/Button'
import Notice from './ui/Notice'
import UploadZone from './UploadZone'

type LandingViewProps = {
  onFile: (file: File) => void
  error?: string
  isLoading?: boolean
}

export default function LandingView({ onFile, error, isLoading }: LandingViewProps) {
  return (
    <div className="flex flex-col">
      {/* A. Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12 text-center sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
            100% free · No signup
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Edit PDFs for free, right in your browser
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Change text, add images, highlight and whiteout. Your files never leave your device.
          </p>

          <div className="mx-auto mt-8 max-w-2xl text-left">
            {error && (
              <div className="mb-6 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
                <Notice tone="error" icon={<AlertTriangle size={18} strokeWidth={2} />}>
                  {error}
                </Notice>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    Choose another PDF
                  </Button>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-600" role="status">
                <Loader2 size={18} strokeWidth={2} className="animate-spin text-brand-600" />
                <span>Loading PDF...</span>
              </div>
            )}
            <UploadZone onFile={onFile} />
          </div>
        </div>
      </section>

      {/* B. Ad slot top */}
      <div className="my-6 px-4">
        <AdSlot position="top" />
      </div>

      {/* C. Trust row */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Zap size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Free forever</h3>
            <p className="text-sm text-slate-500">No limits, no watermark.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <ShieldCheck size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Private by design</h3>
            <p className="text-sm text-slate-500">Files are processed on your device.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <MousePointerClick size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">No signup</h3>
            <p className="text-sm text-slate-500">Open the site and start editing.</p>
          </div>
        </div>
      </section>

      {/* D. How it works */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              1
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Upload</h3>
            <p className="mt-1 text-sm text-slate-500">Choose a PDF from your device.</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              2
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Edit</h3>
            <p className="mt-1 text-sm text-slate-500">
              Click any text to change it, or add text, images and highlights.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              3
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Download</h3>
            <p className="mt-1 text-sm text-slate-500">Save your edited PDF instantly.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
