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
      className={`items-center justify-center border border-dashed border-slate-300 bg-white text-sm text-slate-400 ${positionStyles[position]}`}
    >
      Ad space
    </aside>
  )
}
