import type { ReactNode } from 'react'

export type NoticeTone = 'info' | 'warning' | 'error'

export interface NoticeProps {
  tone: NoticeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export default function Notice({ tone, icon, children, className = '' }: NoticeProps) {
  const toneClasses = {
    info: 'bg-slate-50 border-slate-200 text-slate-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-800',
  }[tone]

  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={`${toneClasses} flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${className}`.trim()}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  )
}
