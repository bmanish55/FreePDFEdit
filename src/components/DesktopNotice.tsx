import { useState } from 'react'
import { Monitor, X } from 'lucide-react'

export default function DesktopNotice() {
  const [visible, setVisible] = useState(() => sessionStorage.getItem('freepdfedit-notice-dismissed') !== 'true')

  if (!visible) return null

  const dismiss = () => {
    sessionStorage.setItem('freepdfedit-notice-dismissed', 'true')
    setVisible(false)
  }

  return (
    <aside
      aria-label="Desktop recommendation"
      className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 md:hidden"
    >
      <div className="flex items-center gap-2">
        <Monitor size={16} strokeWidth={2} className="shrink-0 text-amber-700" />
        <p>For the best experience, use a desktop or laptop. Editing on mobile can be difficult and may cause errors.</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        title="Dismiss"
        className="shrink-0 rounded p-1 text-amber-800 transition-colors duration-150 hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </aside>
  )
}
