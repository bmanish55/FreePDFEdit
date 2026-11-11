import { buildOtpEmailHtml } from '../src/lib/feedback/emailTemplates'

// Serverless OTP delivery function for Vercel
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, otpCode } = req.body || {}
  if (!email || !otpCode) {
    return res.status(400).json({ error: 'Missing email or otpCode' })
  }

  const subject = `Your FreePDFEdit Verification Code: ${otpCode}`
  const bodyText = `Hello,\n\nYour one-time verification code for FreePDFEdit is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this message.`

  try {
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FreePDFEdit <onboarding@resend.dev>',
          to: [email],
          subject,
          text: bodyText,
          html: buildOtpEmailHtml(String(otpCode)),
        }),
      })
      if (resendRes.ok) {
        return res.status(200).json({ success: true, sent: true, provider: 'resend' })
      }
    }
  } catch (err) {
    console.error('OTP email dispatch error:', err)
  }

  return res.status(200).json({ success: false, sent: false })
}
