// Serverless OTP delivery function for Vercel and Netlify
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contactType, contactValue, otpCode } = req.body || {}
  if (!contactValue || !otpCode) {
    return res.status(400).json({ error: 'Missing contactValue or otpCode' })
  }

  const isEmail = contactType === 'email'
  const subject = `Your FreePDFEdit Verification Code: ${otpCode}`
  const bodyText = `Hello,

Your one-time verification code for FreePDFEdit is:

    ${otpCode}

This code will expire in 10 minutes. If you did not request this, please ignore this message.

Best regards,
FreePDFEdit Team`

  try {
    // Optional Resend or SMTP integration if configured in Netlify/Vercel env
    if (process.env.RESEND_API_KEY && isEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FreePDFEdit <onboarding@resend.dev>',
          to: [contactValue],
          subject,
          text: bodyText,
        }),
      })
    }
  } catch (err) {
    console.error('OTP email dispatch error:', err)
  }

  return res.status(200).json({ success: true, message: 'OTP dispatched' })
}
