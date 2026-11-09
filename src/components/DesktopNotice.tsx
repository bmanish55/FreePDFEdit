import { useState } from 'react'

export default function DesktopNotice() {
  const [visible, setVisible] = useState(() => sessionStorage.getItem('freepdfedit-notice-dismissed') !== 'true')

  if (!visible) return null

  const dismiss = () => {
    sessionStorage.setItem('freepdfedit-notice-dismissed', 'true')
    setVisible(false)
  }

  return (
    <div className="flex items-start justify-between gap-4 bg-blue-50 px-4 py-3 text-sm text-blue-900 md:hidden">
      <p>For the best experience, use a desktop or laptop. Editing on mobile can be difficult and may cause errors.</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss mobile notice" className="shrink-0 text-lg leading-5">
        ×
      </button>
    </div>
  )
}
