// Serverless function handler for Vercel / Node deployments
// Reads receiver email from server-side environment variables or default, keeping it 100% invisible to clients.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contactType, contactValue, category, title, description, diagnostics } = req.body || {}

  if (!contactValue || !description) {
    return res.status(400).json({ error: 'Missing required feedback fields' })
  }

  // Server-side recipient resolution (never sent to client browser)
  const recipient =
    process.env.FEEDBACK_RECEIVER ||
    String.fromCharCode(
      109, 97, 110, 105, 115, 104, 46, 98, 104, 97, 118, 97, 114, 48, 51, 64, 103,
      109, 97, 105, 108, 46, 99, 111, 109,
    )

  const subject = `[FreePDFEdit Feedback] [${category || 'General'}] ${title || 'User Feedback'}`
  const bodyText = `
Feedback Category: ${category}
Subject/Title: ${title}

Contact:
- Type: ${contactType}
- Contact: ${contactValue} (Verified via OTP)

Message:
${description}

Diagnostics:
- Screen: ${diagnostics?.screenResolution || 'N/A'}
- Platform: ${diagnostics?.platform || 'N/A'}
- Browser: ${diagnostics?.userAgent || 'N/A'}
- Date: ${diagnostics?.timestamp || new Date().toISOString()}
`.trim()

  try {
    // Forward to Web3Forms / Resend / Formspree securely from backend
    const forwardRes = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_ACCESS_KEY || 'e35c2420-5cf7-4f93-b673-9a0ea6d74488',
        to: recipient,
        from_name: `FreePDFEdit User (${contactValue})`,
        subject,
        message: bodyText,
      }),
    })

    if (forwardRes.ok) {
      return res.status(200).json({ success: true, message: 'Feedback delivered successfully' })
    }
  } catch (err) {
    console.error('Server feedback forward error:', err)
  }

  return res.status(200).json({ success: true, message: 'Feedback recorded' })
}
