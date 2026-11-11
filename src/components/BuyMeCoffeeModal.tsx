import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Coffee,
  ExternalLink,
  Heart,
  Loader2,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import {
  createUpiIntent,
  sendCoffeeThankYou,
  type UpiIntentResponse,
} from '../lib/coffee/coffeeService'
import { validateEmail } from '../lib/feedback/feedbackService'
import { CREATOR_PROFILE } from '../lib/siteConfig'
import { usePdfStore } from '../store/usePdfStore'
import Button from './ui/Button'

type BuyMeCoffeeModalProps = {
  onProceedDownload: () => Promise<void>
}

const PRESET_AMOUNTS = [19, 29, 49, 99, 199]

export default function BuyMeCoffeeModal({ onProceedDownload }: BuyMeCoffeeModalProps) {
  const isOpen = usePdfStore((state) => state.isCoffeeModalOpen)
  const coffeeSource = usePdfStore((state) => state.coffeeSource)
  const closeCoffeeModal = usePdfStore((state) => state.closeCoffeeModal)
  const markCoffeePromptHandled = usePdfStore((state) => state.markCoffeePromptHandled)
  const setCoffeeBanner = usePdfStore((state) => state.setCoffeeBanner)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amountInput, setAmountInput] = useState('49')
  const [detailsError, setDetailsError] = useState('')
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)

  const [intent, setIntent] = useState<UpiIntentResponse | null>(null)
  const [utr, setUtr] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setDetailsError('')
      setPaymentError('')
      setUtr('')
      setIntent(null)
      setIsCreatingIntent(false)
      setIsConfirming(false)
      setIsDeclining(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const numericAmount = Number(amountInput)
  const displayAmount =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? Number(numericAmount.toFixed(2))
      : 49

  const handleDecline = async () => {
    setIsDeclining(true)
    markCoffeePromptHandled()
    closeCoffeeModal()
    setCoffeeBanner({ kind: 'declined' })
    if (coffeeSource === 'download') {
      await onProceedDownload()
    }
    setIsDeclining(false)
  }

  const handleProceedToPayment = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (trimmedName.length < 2) {
      setDetailsError('Please enter your name so we can personalize your thank-you email.')
      return
    }
    const emailValidation = validateEmail(trimmedEmail)
    if (!emailValidation.isValid) {
      setDetailsError(emailValidation.error || 'Please enter a valid email address.')
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      setDetailsError('Please enter any amount of ₹1 or more.')
      return
    }

    setDetailsError('')
    setIsCreatingIntent(true)
    try {
      const created = await createUpiIntent(numericAmount)
      setIntent(created)
      setStep(3)
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : 'Unable to prepare UPI payment right now. Please try again.',
      )
    } finally {
      setIsCreatingIntent(false)
    }
  }

  const handleConfirmPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!intent) return

    const cleanedUtr = utr.trim()
    if (cleanedUtr.length < 6) {
      setPaymentError(
        'Please enter the UTR / UPI Transaction Reference ID from your payment app (e.g. 12 digits).',
      )
      return
    }

    setPaymentError('')
    setIsConfirming(true)

    const result = await sendCoffeeThankYou({
      name: name.trim(),
      email: email.trim(),
      amount: intent.amount,
      utr: cleanedUtr,
      orderRef: intent.orderRef,
    })

    markCoffeePromptHandled()
    setCoffeeBanner({
      kind: 'supported',
      supporterName: name.trim(),
      amount: intent.amount,
      emailSent: result.emailSent,
    })
    closeCoffeeModal()

    if (coffeeSource === 'download') {
      await onProceedDownload()
    }
    setIsConfirming(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coffee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4"
    >
      {/* Backdrop intentionally does not close modal so users switching UPI/email apps don't lose state */}
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs transition-opacity" />

      <div className="relative z-10 my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80">
              <Coffee size={20} />
            </div>
            <div className="min-w-0">
              <h2
                id="coffee-modal-title"
                className="text-base font-bold text-slate-900 sm:text-lg"
              >
                {step === 1 && 'Buy Me a Coffee'}
                {step === 2 && 'Your Details & Amount'}
                {step === 3 && 'Complete Free UPI Payment'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 1 && `Built independently by ${CREATOR_PROFILE.name}`}
                {step === 2 && 'Used only to send your thank-you email'}
                {step === 3 && '0% gateway fee · Goes directly via UPI'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCoffeeModal}
            aria-label="Close Buy Me a Coffee dialog"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Story & Choice */}
        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-orange-50/50 p-4 text-sm leading-relaxed text-slate-700">
              <p className="font-semibold text-slate-900">
                Hi there! I&apos;m {CREATOR_PROFILE.name}, an MCA graduate building free web tools
                like FreePDFEdit.
              </p>
              <p className="mt-2">
                I build privacy-first apps while working hard to support myself and survive
                independently as an early-career developer — keeping FreePDFEdit 100% free with{' '}
                <strong>zero subscriptions</strong>, <strong>zero watermarks</strong>, and{' '}
                <strong>no file uploads</strong>.
              </p>
              <p className="mt-2">
                If this editor saved you time today, buying me a small coffee helps me keep
                building free tools for everyone.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Sparkles size={14} className="text-brand-600" />
              <span>Pay any amount via UPI</span>
              <span className="text-slate-300">·</span>
              <span>Receive a personal thank-you note with my portfolio &amp; links</span>
            </div>

            <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="secondary"
                disabled={isDeclining}
                onClick={() => void handleDecline()}
                className="w-full sm:w-auto"
              >
                {coffeeSource === 'download' ? "I don't want to" : 'Maybe later'}
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={<Heart size={16} />}
                onClick={() => setStep(2)}
                className="w-full bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 sm:w-auto"
              >
                Yes, I will
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Name, Email & Amount */}
        {step === 2 && (
          <form onSubmit={(e) => void handleProceedToPayment(e)} className="mt-4 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Choose Any Coffee Amount (₹)
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_AMOUNTS.map((preset) => {
                  const selected = Number(amountInput) === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmountInput(String(preset))
                        setDetailsError('')
                      }}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  )
                })}
              </div>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value)
                    setDetailsError('')
                  }}
                  placeholder="Enter any amount (min ₹1)"
                  aria-label="Custom coffee amount in rupees"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="coffee-name" className="mb-1 block text-xs font-semibold text-slate-700">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="coffee-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setDetailsError('')
                  }}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="coffee-email" className="mb-1 block text-xs font-semibold text-slate-700">
                Your Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="coffee-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setDetailsError('')
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                We&apos;ll send a warm thank-you email with Manish&apos;s GitHub, LinkedIn &amp;
                portfolio.
              </p>
            </div>

            {detailsError && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {detailsError}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <Button
                type="submit"
                variant="primary"
                disabled={isCreatingIntent}
                icon={isCreatingIntent ? <Loader2 size={16} className="animate-spin" /> : undefined}
              >
                {isCreatingIntent
                  ? 'Preparing QR...'
                  : `Continue to Pay ₹${displayAmount}`}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Free UPI QR + Deep Link + UTR Confirmation */}
        {step === 3 && intent && (
          <form onSubmit={(e) => void handleConfirmPayment(e)} className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <div>
                <span className="text-slate-500">Supporting</span>{' '}
                <strong className="text-slate-900">{intent.payeeName}</strong>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                ₹{intent.amount} INR
              </span>
            </div>

            {/* QR Code & Mobile UPI App Launch */}
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center">
              <img
                src={intent.qrDataUrl}
                alt="Scan QR code with GPay, PhonePe, Paytm, or BHIM to complete UPI payment"
                className="h-48 w-48 rounded-lg border border-slate-100 bg-white p-1 shadow-xs"
              />
              <p className="mt-2.5 text-xs font-medium text-slate-700">
                Scan QR with GPay, PhonePe, Paytm, BHIM, or any UPI app
              </p>

              <button
                type="button"
                onClick={() => {
                  window.location.href = intent.upiUri
                }}
                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 sm:w-auto"
              >
                <Smartphone size={16} />
                <span>Pay ₹{intent.amount} via UPI App</span>
                <ExternalLink size={14} />
              </button>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Direct peer-to-bank UPI · Ref: {intent.orderRef}</span>
              </div>
            </div>

            {/* UTR Confirmation */}
            <div>
              <label htmlFor="coffee-utr" className="mb-1 block text-xs font-semibold text-slate-700">
                UPI Transaction Ref / UTR Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="coffee-utr"
                type="text"
                required
                value={utr}
                onChange={(e) => {
                  setUtr(e.target.value)
                  setPaymentError('')
                }}
                placeholder="Enter 12-digit UTR / Ref No. after paying"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                You&apos;ll find the 12-digit UPI Ref / UTR on your payment receipt screen.
              </p>
            </div>

            {paymentError && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {paymentError}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft size={14} />
                <span>Change amount</span>
              </button>
              <Button
                type="submit"
                variant="primary"
                disabled={isConfirming}
                icon={
                  isConfirming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )
                }
              >
                {isConfirming
                  ? 'Sending Thank-You...'
                  : coffeeSource === 'download'
                    ? 'Confirm & Download PDF'
                    : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
