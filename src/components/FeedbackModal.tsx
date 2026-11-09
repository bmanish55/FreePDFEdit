import { useEffect, useRef, useState } from 'react'
import {
  MessageSquareHeart,
  X,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Send,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import Button from './ui/Button'
import {
  validateContact,
  generateOtp,
  sendOtpToUser,
  submitFeedback,
  type ContactType,
} from '../lib/feedback/feedbackService'

type FeedbackModalProps = {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = [
  { value: 'Bug Report', label: '🐛 Bug Report' },
  { value: 'Feature Request', label: '💡 Feature Request' },
  { value: 'Text Editing Issue', label: '✍️ Text Editing Issue' },
  { value: 'UI / Design', label: '🎨 UI / Design Feedback' },
  { value: 'Performance', label: '🚀 Speed & Performance' },
  { value: 'General', label: '💬 General Feedback' },
]

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  // Wizard state: 1 = Contact & OTP, 2 = Feedback form, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Contact & OTP
  const [contactType, setContactType] = useState<ContactType>('email')
  const [contactValue, setContactValue] = useState('')
  const [contactError, setContactError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  // Step 2: Feedback Details
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsActivation, setNeedsActivation] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Countdown timer effect
  useEffect(() => {
    if (otpSent && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [otpSent, countdown])

  // Reset modal when reopened
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setContactValue('')
      setContactError('')
      setOtpSent(false)
      setEnteredOtp('')
      setOtpError('')
      setCountdown(60)
      setTitle('')
      setDescription('')
      setDetailsError('')
      setNeedsActivation(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSendOtp = async () => {
    const validation = validateContact(contactType, contactValue)
    if (!validation.isValid) {
      setContactError(validation.error || 'Invalid contact value')
      return
    }
    setContactError('')
    setIsSendingOtp(true)

    const code = generateOtp()
    setGeneratedOtp(code)

    await sendOtpToUser(contactType, contactValue.trim(), code)
    setIsSendingOtp(false)
    setOtpSent(true)
    setCountdown(60)
    setOtpError('')
  }

  const handleVerifyOtp = () => {
    if (!enteredOtp || enteredOtp.trim().length < 6) {
      setOtpError('Please enter the 6-digit OTP code.')
      return
    }
    setIsVerifyingOtp(true)

    setTimeout(() => {
      if (enteredOtp.trim() === generatedOtp) {
        setIsVerifyingOtp(false)
        setStep(2)
      } else {
        setIsVerifyingOtp(false)
        setOtpError('Invalid OTP code. Please verify and try again.')
      }
    }, 400)
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setDetailsError('Please enter a description for your feedback.')
      return
    }
    setDetailsError('')
    setIsSubmitting(true)

    const res = await submitFeedback({
      contactType,
      contactValue: contactValue.trim(),
      category,
      title: title.trim() || category,
      description: description.trim(),
    })

    setIsSubmitting(false)
    if (res.success) {
      setNeedsActivation(!!res.needsActivation)
      setStep(3)
    } else {
      setDetailsError(res.message || 'Could not send feedback. Please try again.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <MessageSquareHeart size={22} strokeWidth={2} />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-base font-semibold text-slate-900">
                Share Your Feedback
              </h2>
              <p className="text-xs text-slate-500">
                Help us improve FreePDFEdit. Verified submissions get prioritized.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Contact & OTP Verification */}
        {step === 1 && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 mb-1">
                <ShieldCheck size={16} className="text-brand-600" />
                <span>Verification Required</span>
              </div>
              <p>
                To prevent spam and allow us to follow up, please provide a valid email or mobile number with one-time verification.
              </p>
            </div>

            {/* Contact Type Toggle */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setContactType('email')
                  setContactError('')
                  setOtpSent(false)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  contactType === 'email'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail size={14} />
                <span>Email Address</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setContactType('phone')
                  setContactError('')
                  setOtpSent(false)
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                  contactType === 'phone'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone size={14} />
                <span>Mobile Number</span>
              </button>
            </div>

            {/* Contact Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {contactType === 'email' ? 'Your Email Address' : 'Your Mobile Number'}
              </label>
              <div className="flex gap-2">
                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  value={contactValue}
                  disabled={otpSent}
                  onChange={(e) => {
                    setContactValue(e.target.value)
                    setContactError('')
                  }}
                  placeholder={
                    contactType === 'email' ? 'e.g. name@company.com' : 'e.g. +91 9876543210'
                  }
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                {!otpSent ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleSendOtp()}
                    disabled={isSendingOtp || !contactValue.trim()}
                  >
                    {isSendingOtp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      'Send OTP'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setOtpSent(false)
                      setEnteredOtp('')
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
              {contactError && <p className="mt-1.5 text-xs text-red-600">{contactError}</p>}
            </div>

            {/* OTP Input Block */}
            {otpSent && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Enter 6-Digit OTP</span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock size={12} />
                    {countdown > 0 ? (
                      <span>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSendOtp()}
                        className="text-brand-600 font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </span>
                </div>

                {/* Development helper tip */}
                <div className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800 border border-amber-200/60 flex items-center justify-between">
                  <span>Verification code sent to {contactValue}</span>
                  <span className="font-mono font-bold tracking-wider bg-white px-1.5 py-0.5 rounded border border-amber-300">
                    {generatedOtp}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''))
                      setOtpError('')
                    }}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 tracking-widest text-center font-mono text-base font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || enteredOtp.length < 6}
                  >
                    {isVerifyingOtp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Verify</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </Button>
                </div>
                {otpError && <p className="text-xs text-red-600">{otpError}</p>}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Feedback Details */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            {/* Verified Contact Pill */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Verified: {contactValue}
              </span>
              <span className="text-[11px] text-emerald-600 uppercase font-semibold">Verified</span>
            </div>

            {/* Category / Selective Title */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title / Subject */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Text spacing issue on academic PDF"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{description.length} chars</span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDetailsError('')
                }}
                placeholder="Please describe your experience, the issue you noticed, or features you'd like us to build..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 resize-none"
              />
              {detailsError && <p className="mt-1 text-xs text-red-600">{detailsError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !description.trim()}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Feedback</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {needsActivation ? 'Feedback Submitted!' : 'Thank You for Your Feedback!'}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
                {needsActivation
                  ? "An activation email was sent by FormSubmit to the admin email. Please check your Gmail (including Spam/Updates) and click 'Activate Form' once. Subsequent feedbacks will land directly in your inbox!"
                  : 'Your feedback has been successfully submitted and delivered directly to the engineering team. We appreciate your contribution!'}
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Modal Footer Note */}
        {step !== 3 && (
          <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles size={12} className="text-brand-500" />
              We respect your privacy. Contact is only used for feedback follow-ups.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
