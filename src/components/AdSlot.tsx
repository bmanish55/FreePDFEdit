type AdPosition = 'top' | 'side' | 'bottom'

type AdSlotProps = {
  position: AdPosition
}

const positionStyles: Record<AdPosition, string> = {
  top: 'h-[90px] max-w-[728px] mx-auto',
  side: 'hidden lg:flex h-[250px] w-[300px] shrink-0',
  bottom: 'h-[100px] max-w-[728px] mx-auto',
}

export default function AdSlot({ position }: AdSlotProps) {
  const isDevelopment = import.meta.env.DEV
  const showAds = import.meta.env.VITE_SHOW_ADS === 'true'

  if (!isDevelopment && !showAds) return null

  if (!isDevelopment) {
    // real ad code goes here
    return <aside aria-label={`${position} advertisement`} className={positionStyles[position]} />
  }

  return (
    <aside
      aria-label={`${position} advertisement placeholder`}
      className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400 ${positionStyles[position]}`}
    >
      Advertisement
    </aside>
  )
}
