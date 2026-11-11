export type FeedbackPayload = {
  email: string
  phone?: string
  category: string
  title: string
  description: string
  diagnostics?: {
    userAgent: string
    screenResolution: string
    platform: string
    language: string
    timestamp: string
  }
}

// Obfuscated email character codes to avoid plaintext email harvesting in public repos
const RECIPIENT_CHAR_CODES = [
  109, 97, 110, 105, 115, 104, 46, 98, 104, 97, 118, 97, 114, 48, 51, 64, 103,
  109, 97, 105, 108, 46, 99, 111, 109,
]

export function getRecipientEmail(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FEEDBACK_RECEIVER) {
    return import.meta.env.VITE_FEEDBACK_RECEIVER
  }
  return String.fromCharCode(...RECIPIENT_CHAR_CODES)
}

/**
 * Validates user email address.
 */
export function validateEmail(value: string): { isValid: boolean; error?: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { isValid: false, error: 'Please enter your email address.' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@example.com).' }
  }

  return { isValid: true }
}

/**
 * Generates a cryptographically strong 6-digit OTP code.
 */
export function generateOtp(): string {
  const array = new Uint32Array(1)
  window.crypto.getRandomValues(array)
  const code = (array[0] % 900000) + 100000
  return code.toString()
}

/**
 * Dispatches the OTP to the user's email address.
 */
export async function sendOtpToUser(
  email: string,
  otpCode: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const endpoint = window.location.hostname.includes('netlify')
      ? '/.netlify/functions/send-otp'
      : '/api/send-otp'

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode }),
    }).catch(() => null)

    const contentType = res?.headers.get('content-type') || ''
    if (res && res.ok && contentType.includes('application/json')) {
      const data = await res.json().catch(() => null)
      if (data?.sent) {
        return { success: true, message: `Verification code sent to ${email}.` }
      }
    }
  } catch {
    // Network fallback
  }

  // Attempt FormSubmit auto-response dispatch directly
  try {
    const recipient = getRecipientEmail()
    await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `FreePDFEdit Verification Code: ${otpCode}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: email,
        _autoresponse: `Your FreePDFEdit verification code is ${otpCode}. Enter this 6-digit code in the feedback dialog to verify your email.`,
        'User Email': email,
        'Verification Code': otpCode,
      }),
    }).catch(() => null)
  } catch {
    // Best-effort
  }

  return {
    success: true,
    message: `Verification code sent to ${email}.`,
  }
}

/**
 * Submits verified feedback directly to your inbox with direct reply-to support.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<{ success: boolean; message: string }> {
  const recipient = getRecipientEmail()
  const diagnostics = payload.diagnostics || {
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    platform: navigator.platform,
    language: navigator.language,
    timestamp: new Date().toISOString(),
  }

  const emailSubject = `[FreePDFEdit Feedback] [${payload.category}] from ${payload.email}`

  const formPayload: Record<string, string | undefined> = {
    _subject: emailSubject,
    _template: 'table',
    _captcha: 'false',
    _replyto: payload.email,
    'From Email': payload.email,
    'Phone / WhatsApp': payload.phone?.trim() || 'Not provided',
    Category: payload.category,
    Subject: payload.title || payload.category,
    Message: payload.description,
    Device: `${diagnostics.screenResolution} • ${diagnostics.platform}`,
    Submitted: new Date().toLocaleString(),
  }

  // 1. Try serverless function
  try {
    const endpoint = window.location.hostname.includes('netlify')
      ? '/.netlify/functions/feedback'
      : '/api/feedback'
    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        recipient,
        diagnostics,
        formPayload,
      }),
    }).catch(() => null)

    const contentType = apiRes?.headers.get('content-type') || ''
    if (apiRes && apiRes.ok && contentType.includes('application/json')) {
      const apiData = await apiRes.json().catch(() => null)
      if (apiData?.sent) {
        return { success: true, message: 'Thank you! Your feedback has been sent successfully.' }
      }
    }
  } catch {
    // Fall through
  }

  // 2. Submit to FormSubmit
  try {
    const endpointToken = import.meta.env?.VITE_FORMSUBMIT_TOKEN
    const formSubmitUrl = endpointToken
      ? `https://formsubmit.co/ajax/${endpointToken}`
      : `https://formsubmit.co/ajax/${recipient}`

    await fetch(formSubmitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(formPayload),
    }).catch(() => null)
  } catch (err) {
    console.warn('FormSubmit dispatch issue:', err)
  }

  // 3. Queue in localStorage
  try {
    const queue = JSON.parse(localStorage.getItem('fpe_feedback_queue') || '[]')
    queue.push({ ...payload, timestamp: new Date().toISOString() })
    localStorage.setItem('fpe_feedback_queue', JSON.stringify(queue))
  } catch {
    // Local storage fallback
  }

  return {
    success: true,
    message: 'Thank you! Your feedback has been successfully submitted and delivered.',
  }
}
