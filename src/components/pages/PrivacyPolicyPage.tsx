import type { AppRoute } from '../../lib/siteConfig'
import InfoPageLayout from './InfoPageLayout'

type PrivacyPolicyPageProps = {
  hasPdf?: boolean
  onNavigate: (route: AppRoute) => void
}

export default function PrivacyPolicyPage({ hasPdf = false, onNavigate }: PrivacyPolicyPageProps) {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      subtitle="How FreePDFEdit handles your documents, local browser storage, contact submissions, and advertising cookies."
      updatedLabel="Last updated: November 10, 2026"
      hasPdf={hasPdf}
      onNavigate={onNavigate}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">1. Browser-Only PDF Processing</h2>
        <p>
          FreePDFEdit is engineered as a client-side application. When you open a PDF file, insert
          PNG or JPEG images, draw whiteouts or highlights, or export an edited document, all
          rendering and PDF generation happens strictly inside your web browser memory.
        </p>
        <p>
          <strong>Your PDF documents are never uploaded to our servers</strong>, and we do not
          inspect, store, or maintain copies of the documents you edit.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">2. Local Browser Storage (IndexedDB &amp; Session Storage)</h2>
        <p>
          To protect you from losing work after an accidental page refresh or browser crash,
          FreePDFEdit temporarily saves your active PDF draft and edit objects locally in your
          browser&apos;s <strong>IndexedDB</strong> storage. This local draft never leaves your
          device and is automatically cleared when you export/download your PDF or click Discard.
        </p>
        <p>
          We may also use <strong>sessionStorage</strong> or <strong>localStorage</strong> on your
          device to remember simple UI preferences (such as dismissing the mobile notice) or queue
          offline feedback entries if a submission request fails. You can erase all stored site data
          at any time through your browser settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">3. Advertising, Google AdSense &amp; Cookies</h2>
        <p>
          To keep FreePDFEdit free without subscriptions or paywalls, we may display advertisements
          served by third-party advertising networks, including <strong>Google AdSense</strong>.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Third-party vendors, including Google, use cookies or similar device identifiers to
            serve ads based on a user&apos;s prior visits to this website or other websites on the
            internet.
          </li>
          <li>
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to
            visitors based on their visit to FreePDFEdit and/or other sites across the web.
          </li>
          <li>
            You may opt out of personalized advertising at any time by visiting{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
            >
              Google Ads Settings
            </a>{' '}
            or by visiting{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
            >
              www.aboutads.info/choices
            </a>
            .
          </li>
          <li>
            You can also disable or clear cookies directly through your browser&apos;s privacy
            controls. Disabling third-party cookies will not prevent you from editing or
            downloading PDFs in FreePDFEdit.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">4. Contact &amp; Feedback Submissions</h2>
        <p>
          If you voluntarily contact us or submit feedback through our Contact page or Feedback
          dialog, we collect only the details you provide — such as your email address, optional
          phone number, topic category, and message — along with basic technical diagnostics (browser
          platform, language, screen resolution, user agent, and timestamp) to help us troubleshoot
          your report and reply to you.
        </p>
        <p>
          Feedback submissions are forwarded through our serverless relay and/or FormSubmit delivery
          service solely for support communication and are never sold or shared for marketing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">5. Optional AI Smart Fit Feature</h2>
        <p>
          The built-in Smart Fit mode runs completely offline inside your browser using deterministic
          phrasing rules. If you choose to connect a local Ollama instance
          (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">http://localhost:11434</code>)
          or enter a custom AI API endpoint, only the specific text snippet you ask to rewrite is
          sent to that endpoint you configured.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">6. Hosting &amp; Standard Server Logs</h2>
        <p>
          FreePDFEdit is hosted on Netlify. Like most web hosts, Netlify automatically processes
          standard HTTP request metadata (such as IP address, browser type, referring URL, and
          timestamp) for security, DDoS protection, and delivery reliability.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">7. Children&apos;s Privacy &amp; Policy Updates</h2>
        <p>
          FreePDFEdit is a general-purpose productivity utility and does not knowingly collect
          personal information from children under 13. We may update this Privacy Policy from time
          to time as features or advertising integrations change; any updates will be reflected on
          this page with a revised date.
        </p>
        <p>
          If you have any privacy questions, please reach out via our{' '}
          <a
            href="/contact"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onNavigate('/contact')
            }}
            className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-4 hover:text-brand-700"
          >
            Contact page
          </a>
          .
        </p>
      </section>
    </InfoPageLayout>
  )
}