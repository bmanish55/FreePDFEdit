import { MessageSquareHeart } from 'lucide-react'
import { usePdfStore } from '../store/usePdfStore'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const setFeedbackModalOpen = usePdfStore((state) => state.setFeedbackModalOpen)

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p>&copy; {currentYear} FreePDFEdit</p>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setFeedbackModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
          >
            <MessageSquareHeart size={14} />
            <span>Share Feedback</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">100% private in-browser PDF editor. Your files never leave your device.</p>
      </div>
    </footer>
  )
}
