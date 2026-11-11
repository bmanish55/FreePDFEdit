import {
  buildCoffeeOwnerNotifyEmailHtml,
  buildCoffeeThankYouEmailHtml,
  buildFeedbackEmailHtml,
  buildOtpEmailHtml,
} from '../src/lib/feedback/emailTemplates'
import {
  getDefaultFeedbackRecipient,
  sendServerEmail,
  type EnvRecord,
} from './mailer'
import { createUpiPaymentIntent } from './upi'

export type ServerHttpResult = {
  status: number
  payload: Record<string, unknown>
}

export async function handleSendOtpRequest(
  method: string | undefined,
  body: Record<string, any> | undefined,
  env: EnvRecord = process.env,
): Promise<ServerHttpResult> {
  if (method !== 'POST') {
    return { status: 405, payload: { error: 'Method not allowed' } }
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const otpCode = body?.otpCode !== undefined ? String(body.otpCode).trim() : ''
  if (!email || !otpCode) {
    return { status: 400, payload: { error: 'Missing email or otpCode' } }
  }

  const subject = `Your FreePDFEdit Verification Code: ${otpCode}`
  const text = `Hello,\n\nYour one-time verification code for FreePDFEdit is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this message.`

  const result = await sendServerEmail(
    {
      to: email,
      subject,
      text,
      html: buildOtpEmailHtml(otpCode),
    },
    env,
  )

  return {
    status: 200,
    payload: result.sent
      ? { success: true, sent: true, provider: result.provider }
      : { success: false, sent: false },
  }
}

export async function handleFeedbackRequest(
  method: string | undefined,
  body: Record<string, any> | undefined,
  env: EnvRecord = process.env,
): Promise<ServerHttpResult> {
  if (method !== 'POST') {
    return { status: 405, payload: { error: 'Method not allowed' } }
  }

  const {
    email,
    phone,
    contactType,
    contactValue,
    category,
    title,
    description,
    diagnostics,
    formPayload,
  } = body || {}

  const userEmail = email || (contactType === 'email' ? contactValue : undefined)
  const userPhone = phone || (contactType === 'phone' ? contactValue : undefined)
  const contact = userEmail || contactValue || userPhone

  if (!contact || !description) {
    return { status: 400, payload: { error: 'Missing required feedback fields' } }
  }

  const recipient = getDefaultFeedbackRecipient(env)
  const subject = `[FreePDFEdit Feedback] [${category || 'General'}] from ${userEmail || contact}`
  const device = diagnostics
    ? `${diagnostics.screenResolution || ''} • ${diagnostics.platform || ''}`
    : undefined

  const emailResult = await sendServerEmail(
    {
      to: recipient,
      replyTo: userEmail ? String(userEmail) : undefined,
      subject,
      html: buildFeedbackEmailHtml({
        email: String(userEmail || contact),
        phone: userPhone ? String(userPhone) : undefined,
        category: String(category || 'General'),
        title: String(title || category || 'General Feedback'),
        description: String(description),
        device,
      }),
    },
    env,
  )

  if (emailResult.sent) {
    return {
      status: 200,
      payload: { success: true, sent: true, provider: emailResult.provider },
    }
  }

  const payloadToSend = formPayload || {
    _subject: subject,
    _template: 'table',
    _captcha: 'false',
    _replyto: userEmail || undefined,
    'From Email': userEmail || 'Not provided',
    'Phone / WhatsApp': userPhone || 'Not provided',
    Category: category || 'General',
    Subject: title || category || 'General Feedback',
    Message: description,
    Diagnostics: diagnostics,
  }

  try {
    const forwardRes = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    })

    const data = await forwardRes.json().catch(() => null)
    return {
      status: 200,
      payload: { success: true, sent: forwardRes.ok, data },
    }
  } catch (err) {
    console.error('Server feedback forward error:', err)
  }

  return { status: 200, payload: { success: false, sent: false } }
}

export async function handleUpiIntentRequest(
  method: string | undefined,
  body: Record<string, any> | undefined,
  env: EnvRecord = process.env,
): Promise<ServerHttpResult> {
  if (method !== 'POST') {
    return { status: 405, payload: { error: 'Method not allowed' } }
  }

  const result = await createUpiPaymentIntent(Number(body?.amount), env)
  if (!result.configured) {
    const isMissingConfig = result.error.includes('not configured')
    return {
      status: isMissingConfig ? 503 : 400,
      payload: { configured: false, error: result.error },
    }
  }

  return {
    status: 200,
    payload: result,
  }
}

export async function handleThankYouRequest(
  method: string | undefined,
  body: Record<string, any> | undefined,
  env: EnvRecord = process.env,
): Promise<ServerHttpResult> {
  if (method !== 'POST') {
    return { status: 405, payload: { error: 'Method not allowed' } }
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const utr = typeof body?.utr === 'string' ? body.utr.trim() : ''
  const orderRef = typeof body?.orderRef === 'string' ? body.orderRef.trim() : undefined
  const amount = Number(body?.amount)

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, payload: { error: 'Valid name and email are required.' } }
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return { status: 400, payload: { error: 'Amount must be at least ₹1.' } }
  }
  if (!utr || utr.length < 6) {
    return {
      status: 400,
      payload: { error: 'Please enter a valid UPI transaction reference (UTR).' },
    }
  }

  const amountStr = Number(amount).toFixed(2).replace(/\.00$/, '')
  const donorResult = await sendServerEmail(
    {
      to: email,
      subject: `Thank you for your ₹${amountStr} coffee, ${name}! ☕ — Manish Bhavar`,
      text:
        `Hi ${name},\n\n` +
        `Thank you so much for buying me a coffee (₹${amountStr}, Ref/UTR: ${utr}) and supporting FreePDFEdit!\n\n` +
        `Your support genuinely helps me keep building free, private tools.\n\n` +
        `Connect with me:\n` +
        `Portfolio: https://manishbhavar.in/\n` +
        `GitHub: https://github.com/bmanish55\n` +
        `LinkedIn: https://www.linkedin.com/in/manishbhavar/\n\n` +
        `With gratitude,\nManish Bhavar (MCA Graduate)`,
      html: buildCoffeeThankYouEmailHtml({
        supporterName: name,
        amount,
        utr,
        orderRef,
      }),
    },
    env,
  )

  const ownerRecipient = getDefaultFeedbackRecipient(env)
  const ownerResult = await sendServerEmail(
    {
      to: ownerRecipient,
      replyTo: email,
      subject: `[FreePDFEdit Coffee ☕] ₹${amountStr} from ${name} (UTR: ${utr})`,
      html: buildCoffeeOwnerNotifyEmailHtml({
        supporterName: name,
        supporterEmail: email,
        amount,
        utr,
        orderRef,
      }),
    },
    env,
  )

  return {
    status: 200,
    payload: {
      success: true,
      emailSent: donorResult.sent,
      ownerNotified: ownerResult.sent,
      provider: donorResult.sent ? donorResult.provider : undefined,
    },
  }
}

type RequestHandlerFn = (
  method: string | undefined,
  body: Record<string, any> | undefined,
  env?: EnvRecord,
) => Promise<ServerHttpResult>

/**
 * Supports both Netlify Functions v2 (Web Request -> Response) and
 * Express/Vercel-style (req, res) invocations.
 */
export async function dispatchNetlifyHandler(
  handlerFn: RequestHandlerFn,
  req: any,
  res?: any,
) {
  if (typeof res?.status === 'function') {
    const result = await handlerFn(req.method, req.body)
    return res.status(result.status).json(result.payload)
  }

  let body: Record<string, any> | undefined
  if (typeof req?.json === 'function') {
    body = await req.json().catch(() => undefined)
  } else if (typeof req?.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch {
      body = undefined
    }
  } else {
    body = req?.body
  }

  const result = await handlerFn(req?.method || req?.httpMethod, body)
  if (typeof Response !== 'undefined') {
    return new Response(JSON.stringify(result.payload), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.payload),
  }
}
