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
  validateEmail,
  generateOtp,
  sendOtpToUser,
  submitFeedback,
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
  // Wizard state: 1 = Email & OTP, 2 = Feedback form, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Email & OTP Verification
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  // Step 2: Feedback Details & Optional Mobile
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setEmail('')
      setEmailError('')
      setOtpSent(false)
      setEnteredOtp('')
      setOtpError('')
      setCountdown(60)
      setPhone('')
      setTitle('')
      setDescription('')
      setDetailsError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSendOtp = async () => {
    const validation = validateEmail(email)
    if (!validation.isValid) {
      setEmailError(validation.error || 'Please enter a valid email address')
      return
    }
    setEmailError('')
    setIsSendingOtp(true)

    const code = generateOtp()
    setGeneratedOtp(code)

    await sendOtpToUser(email.trim(), code)
    setIsSendingOtp(false)
    setOtpSent(true)
    setCountdown(60)
    setOtpError('')
  }

  const handleVerifyOtp = () => {
    if (!enteredOtp || enteredOtp.trim().length < 6) {
      setOtpError('Please enter the 6-digit code received on your email.')
      return
    }
    setIsVerifyingOtp(true)

    setTimeout(() => {
      if (enteredOtp.trim() === generatedOtp) {
        setIsVerifyingOtp(false)
        setStep(2)
      } else {
        setIsVerifyingOtp(false)
        setOtpError('Invalid OTP code. Please check your inbox and try again.')
      }
    }, 400)
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setDetailsError('Please describe your feedback or suggestions.')
      return
    }
    setDetailsError('')
    setIsSubmitting(true)

    const res = await submitFeedback({
      email: email.trim(),
      phone: phone.trim() || undefined,
      category,
      title: title.trim() || category,
      description: description.trim(),
    })

    setIsSubmitting(false)
    if (res.success) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl transition-all my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shrink-0">
              <MessageSquareHeart size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 id="feedback-modal-title" className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                Share Your Feedback
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Help us improve FreePDFEdit. Verified submissions get prioritized.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Email & OTP Verification */}
        {step === 1 && (
          <div className="mt-4 sm:mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 mb-1">
                <ShieldCheck size={16} className="text-brand-600 shrink-0" />
                <span>Email Verification Required</span>
              </div>
              <p className="leading-relaxed">
                Please enter your email address. We will send you a 6-digit one-time code to verify your contact so we can follow up on your feedback.
              </p>
            </div>

            {/* Email Input with Responsive Button */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Email Address <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    disabled={otpSent}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                {!otpSent ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleSendOtp()}
                    disabled={isSendingOtp || !email.trim()}
                    className="w-full sm:w-auto shrink-0 justify-center whitespace-nowrap"
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
                    className="w-full sm:w-auto shrink-0 justify-center"
                  >
                    Change
                  </Button>
                )}
              </div>
              {emailError && <p className="mt-1.5 text-xs text-red-600">{emailError}</p>}
            </div>

            {/* OTP Input Block - Fully Responsive on Mobile */}
            {otpSent && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Enter 6-Digit Code</span>
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
                        Resend Code
                      </button>
                    )}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  We have dispatched a 6-digit verification code to{' '}
                  <strong className="text-slate-800 break-all">{email}</strong>. Please check your inbox (including spam folder) and enter it below.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''))
                      setOtpError('')
                    }}
                    placeholder="Enter 6-digit code"
                    className="w-full sm:flex-1 tracking-widest text-center font-mono text-base sm:text-lg font-bold rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || enteredOtp.length < 6}
                    className="w-full sm:w-auto shrink-0 justify-center whitespace-nowrap"
                  >
                    {isVerifyingOtp ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>Verify OTP</span>
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

        {/* STEP 2: Feedback Details & Optional Mobile */}
        {step === 2 && (
          <div className="mt-4 sm:mt-5 space-y-4">
            {/* Verified Email Banner */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800 truncate">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="truncate">Verified: {email}</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-emerald-600 uppercase font-semibold shrink-0">Verified</span>
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

            {/* Optional Mobile / WhatsApp Number */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Phone size={13} className="text-slate-500" />
                  <span>Mobile / WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span></span>
                </label>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210 (if you prefer a call or WhatsApp follow-up)"
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

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !description.trim()}
                className="w-full sm:w-auto"
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

        {/* STEP 3: Professional Success Screen */}
        {step === 3 && (
          <div className="py-6 sm:py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Thank You for Your Feedback!
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your feedback has been successfully submitted and delivered directly to the team. We appreciate your contribution!
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={onClose} className="w-full sm:w-auto px-6">
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Modal Footer Note */}
        {step !== 3 && (
          <div className="mt-4 sm:mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles size={12} className="text-brand-500 shrink-0" />
              <span>We respect your privacy. Contact is only used for feedback follow-ups.</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
