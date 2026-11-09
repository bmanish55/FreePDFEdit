// Serverless function handler for Vercel / Node deployments
// Reads receiver email from server-side environment variables or default, keeping it 100% invisible to clients.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contactType, contactValue, category, title, description, diagnostics, formPayload } = req.body || {}

  if (!contactValue || !description) {
    return res.status(400).json({ error: 'Missing required feedback fields' })
  }

  const recipient =
    process.env.FEEDBACK_RECEIVER ||
    String.fromCharCode(
      109, 97, 110, 105, 115, 104, 46, 98, 104, 97, 118, 97, 114, 48, 51, 64, 103,
      109, 97, 105, 108, 46, 99, 111, 109,
    )

  const isEmail = contactType === 'email'
  const subject = `[FreePDFEdit Feedback] [${category || 'General'}] from ${contactValue}`

  const payloadToSend = formPayload || {
    _subject: subject,
    _template: 'table',
    _captcha: 'false',
    _replyto: isEmail ? contactValue : undefined,
    'User Contact (Reply To)': contactValue,
    'Contact Method': isEmail ? 'Email Address' : 'Mobile Number',
    'How To Revert': isEmail
      ? `Click "Reply" to respond directly to ${contactValue}`
      : `Call or message via WhatsApp/SMS at ${contactValue}`,
    'Feedback Category': category,
    'Feedback Title': title,
    'Feedback Description': description,
    Diagnostics: diagnostics,
  }

  try {
    const forwardRes = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    })

    const data = await forwardRes.json().catch(() => null)
    return res.status(200).json({ success: true, data })
  } catch (err) {
    console.error('Server feedback forward error:', err)
  }

  return res.status(200).json({ success: true, message: 'Feedback recorded' })
}
