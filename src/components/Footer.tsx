import type { MouseEvent } from 'react'
import { Coffee } from 'lucide-react'
import type { AppRoute } from '../lib/siteConfig'
import { usePdfStore } from '../store/usePdfStore'

type FooterProps = {
  currentRoute?: AppRoute
  onNavigate?: (route: AppRoute) => void
}

const FOOTER_LINKS: Array<{ route: AppRoute; label: string }> = [
  { route: '/', label: 'Home' },
  { route: '/about', label: 'About' },
  { route: '/privacy-policy', label: 'Privacy Policy' },
  { route: '/terms', label: 'Terms of Service' },
  { route: '/contact', label: 'Contact' },
]

export default function Footer({ currentRoute = '/', onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const openCoffeeModal = usePdfStore((state) => state.openCoffeeModal)

  const handleLinkClick = (route: AppRoute) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(route)
  }

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-slate-700">&copy; {currentYear} FreePDFEdit</p>
          <p className="mt-0.5 text-xs text-slate-400">
            100% private in-browser PDF editor. Your files never leave your device.
          </p>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
          {FOOTER_LINKS.map(({ route, label }) => {
            const isActive = currentRoute === route
            return (
              <a
                key={route}
                href={route}
                onClick={handleLinkClick(route)}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  isActive ? 'text-brand-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </a>
            )
          })}
          <button
            type="button"
            onClick={() => openCoffeeModal('footer')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Coffee size={13} strokeWidth={2} className="text-amber-600" />
            <span>Buy me a coffee</span>
          </button>
        </nav>
      </div>
    </footer>
  )
}