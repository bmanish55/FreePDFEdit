import { useMobileStore } from '../../store/useMobileStore'

export default function MobileHint() {
  const hint = useMobileStore((state) => state.hint)
  const editingTextId = useMobileStore((state) => state.editingTextId)

  if (!hint || editingTextId) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 truncate rounded-full bg-slate-900/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-md"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)' }}
    >
      {hint}
    </div>
  )
}
