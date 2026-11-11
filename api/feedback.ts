import { buildFeedbackEmailHtml } from '../src/lib/feedback/emailTemplates'

// Serverless function handler for Vercel / Node deployments
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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
  } = req.body || {}

  const userEmail = email || (contactType === 'email' ? contactValue : undefined)
  const userPhone = phone || (contactType === 'phone' ? contactValue : undefined)
  const contact = userEmail || contactValue || userPhone

  if (!contact || !description) {
    return res.status(400).json({ error: 'Missing required feedback fields' })
  }

  const recipient =
    process.env.FEEDBACK_RECEIVER ||
    String.fromCharCode(
      109, 97, 110, 105, 115, 104, 46, 98, 104, 97, 118, 97, 114, 48, 51, 64, 103,
      109, 97, 105, 108, 46, 99, 111, 109,
    )

  const subject = `[FreePDFEdit Feedback] [${category || 'General'}] from ${userEmail || contact}`

  if (process.env.RESEND_API_KEY) {
    try {
      const device = diagnostics
        ? `${diagnostics.screenResolution || ''} • ${diagnostics.platform || ''}`
        : undefined
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FreePDFEdit <onboarding@resend.dev>',
          to: [recipient],
          reply_to: userEmail || undefined,
          subject,
          html: buildFeedbackEmailHtml({
            email: String(userEmail || contact),
            phone: userPhone ? String(userPhone) : undefined,
            category: String(category || 'General'),
            title: String(title || category || 'General Feedback'),
            description: String(description),
            device,
          }),
        }),
      })
      if (resendRes.ok) {
        return res.status(200).json({ success: true, sent: true, provider: 'resend' })
      }
    } catch (err) {
      console.error('Resend feedback dispatch error:', err)
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
    return res.status(200).json({ success: true, sent: forwardRes.ok, data })
  } catch (err) {
    console.error('Server feedback forward error:', err)
  }

  return res.status(200).json({ success: false, sent: false })
}
