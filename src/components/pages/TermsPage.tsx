import type { AppRoute } from '../../lib/siteConfig'
import InfoPageLayout from './InfoPageLayout'

type TermsPageProps = {
  hasPdf?: boolean
  onNavigate: (route: AppRoute) => void
}

export default function TermsPage({ hasPdf = false, onNavigate }: TermsPageProps) {
  return (
    <InfoPageLayout
      title="Terms of Service"
      subtitle="Terms and guidelines for using the FreePDFEdit browser-based PDF editing tool."
      updatedLabel="Last updated: November 10, 2026"
      hasPdf={hasPdf}
      onNavigate={onNavigate}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">1. Acceptance of Terms</h2>
        <p>
          By accessing or using FreePDFEdit, you agree to be bound by these Terms of Service. If you
          do not agree with these terms, please discontinue use of the website.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">2. Description of Service</h2>
        <p>
          FreePDFEdit provides free client-side tools to view, annotate, edit text, insert images,
          whiteout, highlight, and export PDF files directly inside your web browser without
          requiring account registration or adding watermarks.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">3. User Responsibility &amp; Lawful Use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You retain full ownership and responsibility for all PDFs, images, and content you open
            or modify using FreePDFEdit.
          </li>
          <li>
            You agree not to use the service for unlawful document forgery, fraud, misrepresentation,
            copyright infringement, or any illegal activity.
          </li>
          <li>
            Because whiteout rectangles visually cover content in the exported PDF layer, always
            verify sensitive redactions thoroughly before sharing confidential files.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">4. Local Storage &amp; File Verification</h2>
        <p>
          FreePDFEdit does not store your documents on remote servers. Always download and inspect
          your exported PDF in a separate PDF viewer to confirm layout, text encoding, and visual
          formatting before deleting your original file or submitting the document to third parties.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">5. Third-Party Advertising &amp; Links</h2>
        <p>
          FreePDFEdit may display advertisements from Google AdSense or other advertising partners,
          as well as links to external websites. We do not endorse and are not responsible for the
          content, accuracy, or privacy practices of third-party advertisers or external websites.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">6. Disclaimer &amp; Limitation of Liability</h2>
        <p>
          FreePDFEdit is provided on an <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{' '}
          basis without warranties of any kind, whether express or implied. To the fullest extent
          permitted by applicable law, FreePDFEdit and its contributors shall not be liable for any
          indirect, incidental, special, or consequential damages, including loss of data or
          formatting errors resulting from the use of this tool.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">7. Changes &amp; Contact</h2>
        <p>
          We may update or discontinue features and revise these Terms of Service at any time. If
          you have questions about these terms, please contact us through the{' '}
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