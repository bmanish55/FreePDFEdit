import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  hideLabel?: boolean
  onClick?: () => void
}

export default function ToolButton({
  icon,
  label,
  active = false,
  danger = false,
  disabled = false,
  hideLabel = false,
  onClick,
  className = '',
  ...props
}: ToolButtonProps) {
  const baseClasses =
    'h-10 px-3 inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'

  let stateClasses = ''
  if (disabled) {
    stateClasses = 'opacity-40 cursor-not-allowed pointer-events-none'
  } else if (active) {
    stateClasses = 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 cursor-pointer'
  } else if (danger) {
    stateClasses = 'text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer'
  } else {
    stateClasses = 'text-slate-600 hover:bg-slate-100 cursor-pointer'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${baseClasses} ${stateClasses} ${className}`.trim()}
      {...props}
    >
      {icon}
      {!hideLabel && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}
