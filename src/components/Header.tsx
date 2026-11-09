type HeaderProps = {
  onDownload: () => void
  hasPdf?: boolean
}

export default function Header({ onDownload, hasPdf = false }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <a href="/" className="text-xl font-bold tracking-tight text-slate-950">
        FreePDFEdit
      </a>
      <button
        type="button"
        disabled={!hasPdf}
        onClick={onDownload}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white opacity-50"
      >
        Download
      </button>
    </header>
  )
}
