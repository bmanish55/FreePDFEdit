import { useEffect, useRef } from 'react'

type AdPosition = 'top' | 'side' | 'bottom'

type AdSlotProps = {
  position: AdPosition
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const positionStyles: Record<AdPosition, string> = {
  top: 'h-[90px] max-w-[728px] mx-auto',
  side: 'hidden lg:flex h-[250px] w-[300px] shrink-0',
  bottom: 'h-[100px] max-w-[728px] mx-auto',
}

function getSlotId(position: AdPosition): string {
  if (position === 'top') return import.meta.env.VITE_ADSENSE_SLOT_TOP || ''
  if (position === 'side') return import.meta.env.VITE_ADSENSE_SLOT_SIDE || ''
  return import.meta.env.VITE_ADSENSE_SLOT_BOTTOM || ''
}

function ensureAdSenseScript(client: string): void {
  const existing = document.querySelector(`script[data-adsense-client="${client}"]`)
  if (existing) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  script.crossOrigin = 'anonymous'
  script.dataset.adsenseClient = client
  document.head.appendChild(script)
}

export default function AdSlot({ position }: AdSlotProps) {
  const isDevelopment = import.meta.env.DEV
  const showAds = import.meta.env.VITE_SHOW_ADS === 'true'
  const adClient = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim()
  const adSlot = getSlotId(position).trim()
  const pushedRef = useRef(false)

  useEffect(() => {
    if (isDevelopment || !showAds || !adClient || !adSlot || pushedRef.current) return
    ensureAdSenseScript(adClient)
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch {
      // Ignore ad blocker or duplicate slot initialization errors
    }
  }, [isDevelopment, showAds, adClient, adSlot])

  if (!isDevelopment) {
    if (!showAds || !adClient || !adSlot) return null
    return (
      <aside aria-label={`${position} advertisement`} className={positionStyles[position]}>
        <ins
          className="adsbygoogle block h-full w-full"
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </aside>
    )
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