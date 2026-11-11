export const SITE_NAME = 'FreePDFEdit'
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://freepdfediting.netlify.app'
).replace(/\/+$/, '')

export const CREATOR_PROFILE = {
  name: 'Manish Bhavar',
  role: 'MCA Graduate & Indie Developer',
  githubUrl: 'https://github.com/bmanish55',
  linkedinUrl: 'https://www.linkedin.com/in/manishbhavar/',
  portfolioUrl: 'https://manishbhavar.in/',
} as const

export type AppRoute = '/' | '/about' | '/privacy-policy' | '/terms' | '/contact'

type RouteMeta = {
  title: string
  description: string
  canonicalPath: AppRoute
}

export const ROUTE_META: Record<AppRoute, RouteMeta> = {
  '/': {
    title: 'FreePDFEdit - Free Online PDF Editor',
    description:
      'FreePDFEdit is a free browser-based PDF editor. Edit existing text, add text, insert images, highlight, and whiteout without uploads, signups, or watermarks.',
    canonicalPath: '/',
  },
  '/about': {
    title: 'About FreePDFEdit - Private In-Browser PDF Editor',
    description:
      'Learn how FreePDFEdit edits PDFs directly inside your browser using PDF.js and pdf-lib so sensitive documents never leave your device.',
    canonicalPath: '/about',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - FreePDFEdit',
    description:
      'Read the FreePDFEdit Privacy Policy covering browser-only PDF processing, local IndexedDB draft recovery, feedback messages, and Google AdSense cookies.',
    canonicalPath: '/privacy-policy',
  },
  '/terms': {
    title: 'Terms of Service - FreePDFEdit',
    description:
      'Review the FreePDFEdit Terms of Service for using our free client-side browser PDF editing tools.',
    canonicalPath: '/terms',
  },
  '/contact': {
    title: 'Contact Us - FreePDFEdit',
    description:
      'Contact the FreePDFEdit team for bug reports, feature suggestions, privacy questions, or support inquiries.',
    canonicalPath: '/contact',
  },
}

const ROUTE_ALIASES: Record<string, AppRoute> = {
  '': '/',
  '/': '/',
  '/about': '/about',
  '/privacy': '/privacy-policy',
  '/privacy-policy': '/privacy-policy',
  '/terms': '/terms',
  '/terms-of-service': '/terms',
  '/contact': '/contact',
}

export function normalizeRoute(pathname: string): AppRoute {
  const cleaned = pathname.replace(/\/+$/, '').toLowerCase() || '/'
  return ROUTE_ALIASES[cleaned] ?? '/'
}

function setMetaTag(selector: string, content: string): void {
  const element = document.querySelector(selector)
  if (element) {
    element.setAttribute('content', content)
  }
}

export function applyRouteMetadata(route: AppRoute): void {
  const meta = ROUTE_META[route]
  document.title = meta.title

  const canonicalHref = `${SITE_URL}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`
  const canonicalEl = document.querySelector('link[rel="canonical"]')
  if (canonicalEl) {
    canonicalEl.setAttribute('href', canonicalHref)
  }

  setMetaTag('meta[name="description"]', meta.description)
  setMetaTag('meta[property="og:title"]', meta.title)
  setMetaTag('meta[property="og:description"]', meta.description)
  setMetaTag('meta[property="og:url"]', canonicalHref)
}