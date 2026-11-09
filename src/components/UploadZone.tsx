import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Upload } from 'lucide-react'

type UploadZoneProps = {
  onFile: (file: File) => void
}

export default function UploadZone({ onFile }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <section
      className={`rounded-2xl border-2 border-dashed p-8 text-center shadow-sm transition-colors sm:p-12 ${
        isDragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50/40'
      }`}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => {
        setIsDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
      }}
    >
      <input
        id="pdf-upload"
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="sr-only"
      />
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"
        aria-hidden="true"
      >
        <Upload size={24} strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">Drop your PDF here</h2>
      <p className="mt-1 text-sm text-slate-500">or choose a file from your device</p>
      <div className="mt-6">
        <label
          htmlFor="pdf-upload"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              document.getElementById('pdf-upload')?.click()
            }
          }}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Choose PDF
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">PDF files only</p>
    </section>
  )
}
