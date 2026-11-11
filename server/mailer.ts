import nodemailer from 'nodemailer'

export type EnvRecord = Record<string, string | undefined>

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export type SendEmailResult =
  | { sent: true; provider: 'gmail-smtp' | 'resend' }
  | { sent: false; reason: string }

export async function sendServerEmail(
  input: SendEmailInput,
  env: EnvRecord = process.env,
): Promise<SendEmailResult> {
  const gmailUser = (env.GMAIL_USER || env.SMTP_USER || '').trim()
  const gmailPass = (env.GMAIL_APP_PASSWORD || env.SMTP_PASS || '').replace(/\s+/g, '')
  const fromName = (env.GMAIL_FROM_NAME || 'FreePDFEdit').trim()

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      })

      await transporter.sendMail({
        from: `"${fromName.replace(/"/g, '')}" <${gmailUser}>`,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      })

      return { sent: true, provider: 'gmail-smtp' }
    } catch (err) {
      console.error('Gmail SMTP dispatch error:', err)
    }
  }

  const resendApiKey = (env.RESEND_API_KEY || '').trim()
  if (resendApiKey) {
    try {
      const toList = Array.isArray(input.to) ? input.to : [input.to]
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'FreePDFEdit <onboarding@resend.dev>',
          to: toList,
          reply_to: input.replyTo,
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      })
      if (resendRes.ok) {
        return { sent: true, provider: 'resend' }
      }
    } catch (err) {
      console.error('Resend dispatch error:', err)
    }
  }

  return {
    sent: false,
    reason: 'No working email transport configured on server.',
  }
}

export function getDefaultFeedbackRecipient(env: EnvRecord = process.env): string {
  const configured = (env.FEEDBACK_RECEIVER || env.GMAIL_USER || '').trim()
  if (configured) return configured
  return String.fromCharCode(
    109, 97, 110, 105, 115, 104, 46, 98, 104, 97, 118, 97, 114, 48, 51, 64, 103,
    109, 97, 105, 108, 46, 99, 111, 109,
  )
}
