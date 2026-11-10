import { useState, type FormEvent } from 'react'
import { CheckCircle2, Mail, MessageSquareHeart, Send, ShieldCheck } from 'lucide-react'
import { submitFeedback, validateEmail } from '../../lib/feedback/feedbackService'
import type { AppRoute } from '../../lib/siteConfig'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import InfoPageLayout from './InfoPageLayout'

type ContactPageProps = {
  hasPdf?: boolean
  onNavigate: (route: AppRoute) => void
  onOpenFeedbackModal: () => void
}

const TOPICS = [
  'General Question',
  'Bug Report',
  'Feature Request',
  'Privacy or Legal Inquiry',
  'Advertising & Domain Inquiry',
]

export default function ContactPage({
  hasPdf = false,
  onNavigate,
  onOpenFeedbackModal,
}: ContactPageProps) {
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sentMessage, setSentMessage] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const emailCheck = validateEmail(email)
    if (!emailCheck.isValid) {
      setError(emailCheck.error || 'Please enter a valid email address.')
      return
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please enter a message of at least 10 characters so we can help you.')
      return
    }

    setError('')
    setIsSending(true)
    try {
      const result = await submitFeedback({
        email: email.trim(),
        category: topic,
        title: subject.trim() || topic,
        description: message.trim(),
      })
      if (result.success) {
        setSentMessage(result.message)
        setSubject('')
        setMessage('')
      } else {
        setError('Unable to send your message right now. Please try again shortly.')
      }
    } catch {
      setError('Unable to send your message right now. Please try again shortly.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <InfoPageLayout
      title="Contact Us"
      subtitle="Have a question, bug report, privacy inquiry, or suggestion for FreePDFEdit? Send a message directly to our team."
      updatedLabel="Support & Feedback"
      hasPdf={hasPdf}
      onNavigate={onNavigate}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        <div className="space-y-5 md:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Mail size={18} strokeWidth={2} className="text-brand-600" />
              <h2 className="font-bold">How we can help</h2>
            </div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Report PDF rendering or text export bugs</li>
              <li>Suggest new browser-based editing features</li>
              <li>Privacy policy, cookie, or legal inquiries</li>
              <li>Advertising or custom partnership questions</li>
            </ul>
          </div>

          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck size={18} strokeWidth={2} className="text-brand-600" />
              <h2 className="font-bold">Privacy Reminder</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Please do not paste sensitive banking details, passwords, or private document
              contents into support messages.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Prefer OTP-verified feedback?</h2>
            <p className="mt-1 text-xs text-slate-500">
              You can also use our quick verification-backed feedback modal from anywhere in the app.
            </p>
            <div className="mt-3">
              <Button
                variant="secondary"
                size="md"
                icon={<MessageSquareHeart size={16} strokeWidth={2} className="text-brand-600" />}
                onClick={onOpenFeedbackModal}
              >
                Open Feedback Modal
              </Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          {sentMessage ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={24} strokeWidth={2} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Message Sent</h2>
              <p className="mt-2 text-sm text-slate-600">{sentMessage}</p>
              <div className="mt-5">
                <Button variant="secondary" onClick={() => setSentMessage('')}>
                  Send another message
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              {error && <Notice tone="error">{error}</Notice>}

              <div>
                <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-800">
                  Your Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label htmlFor="contact-topic" className="block text-sm font-semibold text-slate-800">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {TOPICS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-sm font-semibold text-slate-800">
                  Subject (Optional)
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Brief summary of your question"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-800">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us how we can help..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSending}
                  icon={<Send size={16} strokeWidth={2} />}
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </InfoPageLayout>
  )
}