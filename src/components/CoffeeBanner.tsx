import { Coffee, Heart, X } from 'lucide-react'
import { usePdfStore } from '../store/usePdfStore'

type CoffeeBannerProps = {
  compact?: boolean
}

export default function CoffeeBanner({ compact = false }: CoffeeBannerProps) {
  const coffeeBanner = usePdfStore((state) => state.coffeeBanner)
  const setCoffeeBanner = usePdfStore((state) => state.setCoffeeBanner)

  if (!coffeeBanner) return null

  const isSupported = coffeeBanner.kind === 'supported'

  return (
    <div
      role="status"
      className={compact ? 'px-4 pt-3' : 'mx-auto w-full max-w-7xl px-4 pt-3'}
    >
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm shadow-xs ${
          isSupported
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-indigo-200 bg-indigo-50 text-indigo-900'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {isSupported ? (
            <Heart size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <Coffee size={18} className="shrink-0 text-indigo-600" />
          )}
          <p className="text-xs sm:text-sm">
            {isSupported ? (
              <>
                <strong className="font-semibold">Thank you for your help!</strong>{' '}
                <span>
                  {coffeeBanner.supporterName
                    ? `Your ₹${coffeeBanner.amount ?? ''} coffee means a lot, ${coffeeBanner.supporterName}.`
                    : 'Your support genuinely helps keep FreePDFEdit free.'}
                  {coffeeBanner.emailSent
                    ? ' A thank-you email has been sent to your inbox.'
                    : ''}
                </span>
              </>
            ) : (
              <>
                <strong className="font-semibold">Anyway, thanks for using this app!</strong>{' '}
                <span className="text-indigo-700">
                  Your PDF download has started. Feel free to use FreePDFEdit anytime.
                </span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCoffeeBanner(null)}
          aria-label="Dismiss thank you banner"
          className={`shrink-0 rounded-lg p-1 transition-colors ${
            isSupported
              ? 'text-emerald-700 hover:bg-emerald-100'
              : 'text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
