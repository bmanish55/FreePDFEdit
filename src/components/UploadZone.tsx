import type { ChangeEvent } from 'react'

type UploadZoneProps = {
  onFile: (file: File) => void
}

export default function UploadZone({ onFile }: UploadZoneProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <section
      className="mx-auto flex min-h-[360px] max-w-3xl flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-white p-8 text-center shadow-sm"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
      }}
    >
      <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleChange} className="sr-only" />
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600" aria-hidden="true">
        ↑
      </div>
      <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Edit your PDF for free</h1>
      <p className="mt-3 max-w-lg text-slate-600">Drop your PDF here or tap to browse. 100% free. Files never leave your device.</p>
      <label htmlFor="pdf-upload" className="mt-6 cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm">
        Choose PDF
      </label>
      <p className="mt-4 text-xs text-slate-400">No signup · No watermark · Browser-based</p>
    </section>
  )
}
