const COFFEE_SESSION_KEY = 'fpe_coffee_prompted'

export function hasHandledCoffeeSession(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(COFFEE_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function markCoffeeSessionHandled(): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(COFFEE_SESSION_KEY, '1')
    }
  } catch {
    // Ignore storage restrictions in private browsing
  }
}

function resolveApiEndpoint(routeName: 'upi-intent' | 'thank-you'): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) {
    return `/.netlify/functions/${routeName}`
  }
  return `/api/${routeName}`
}

export type UpiIntentResponse = {
  orderRef: string
  amount: number
  payeeName: string
  qrDataUrl: string
  upiUri: string
}

export async function createUpiIntent(amount: number): Promise<UpiIntentResponse> {
  const res = await fetch(resolveApiEndpoint('upi-intent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })

  const data = (await res.json().catch(() => null)) as
    | (UpiIntentResponse & { configured?: boolean; error?: string })
    | null

  if (!res.ok || !data?.qrDataUrl || !data?.upiUri) {
    throw new Error(
      data?.error || 'Could not generate UPI payment QR right now. Please try again.',
    )
  }

  return {
    orderRef: data.orderRef,
    amount: data.amount,
    payeeName: data.payeeName,
    qrDataUrl: data.qrDataUrl,
    upiUri: data.upiUri,
  }
}

export async function sendCoffeeThankYou(payload: {
  name: string
  email: string
  amount: number
  utr: string
  orderRef?: string
}): Promise<{ success: boolean; emailSent: boolean }> {
  try {
    const res = await fetch(resolveApiEndpoint('thank-you'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; emailSent?: boolean }
      | null

    return {
      success: Boolean(res.ok && data?.success),
      emailSent: Boolean(data?.emailSent),
    }
  } catch {
    return { success: false, emailSent: false }
  }
}
