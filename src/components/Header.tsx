import { Download, FileText } from 'lucide-react'
import Button from './ui/Button'
import { usePdfStore } from '../store/usePdfStore'

type HeaderProps = {
  onDownload: () => void
  hasPdf?: boolean
}

export default function Header({ onDownload, hasPdf = false }: HeaderProps) {
  const fileName = usePdfStore((state) => state.fileName)

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FileText size={18} strokeWidth={2} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">FreePDFEdit</span>
          </div>

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
    </header>
  )
}
