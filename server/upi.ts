import QRCode from 'qrcode'
import type { EnvRecord } from './mailer'

export type UpiIntentResult =
  | {
      configured: true
      orderRef: string
      amount: number
      payeeName: string
      qrDataUrl: string
      upiUri: string
    }
  | {
      configured: false
      error: string
    }

export async function createUpiPaymentIntent(
  rawAmount: number,
  env: EnvRecord = process.env,
): Promise<UpiIntentResult> {
  const vpa = (env.UPI_VPA || '').trim()
  if (!vpa || !vpa.includes('@')) {
    return {
      configured: false,
      error: 'UPI receiver is not configured on the server yet.',
    }
  }

  const parsed = Number(rawAmount)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100000) {
    return {
      configured: false,
      error: 'Please enter a valid amount (at least ₹1).',
    }
  }

  const normalizedAmount = Math.round(parsed * 100) / 100
  const amountStr = Number.isInteger(normalizedAmount)
    ? String(normalizedAmount)
    : normalizedAmount.toFixed(2)
  const payeeName = (env.UPI_PAYEE_NAME || 'Manish Bhavar').trim()
  const orderRef = `FPE${Date.now().toString(36).toUpperCase()}`
  const note = 'Buy Me a Coffee - FreePDFEdit'

  // Preserve raw '@' in payee VPA because several Indian UPI apps reject '%40' in `pa`
  const upiUri =
    `upi://pay?pa=${vpa}` +
    `&pn=${encodeURIComponent(payeeName)}` +
    `&tr=${encodeURIComponent(orderRef)}` +
    `&tn=${encodeURIComponent(note)}` +
    `&am=${amountStr}` +
    `&cu=INR`

  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })

  return {
    configured: true,
    orderRef,
    amount: normalizedAmount,
    payeeName,
    qrDataUrl,
    upiUri,
  }
}
