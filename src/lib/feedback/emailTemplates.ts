function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildOtpEmailHtml(otpCode: string): string {
  const safeCode = escapeHtml(otpCode)
  return `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#4f46e5;">FreePDFEdit</p>
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Email Verification Code</h1>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#475569;">
      Enter this 6-digit code in the feedback form to verify your email address:
    </p>
    <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:14px;text-align:center;font-size:28px;font-weight:700;letter-spacing:6px;color:#3730a3;">
      ${safeCode}
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#64748b;">
      This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
    </p>
  </div>
</div>`.trim()
}

export function buildFeedbackEmailHtml(params: {
  email: string
  phone?: string
  category: string
  title: string
  description: string
  device?: string
}): string {
  const safeEmail = escapeHtml(params.email)
  const safePhone = escapeHtml(params.phone || 'Not provided')
  const safeCategory = escapeHtml(params.category)
  const safeTitle = escapeHtml(params.title)
  const safeDesc = escapeHtml(params.description).replace(/\n/g, '<br />')
  const safeDevice = escapeHtml(params.device || 'Unknown')

  return `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#4f46e5;">FreePDFEdit Feedback</p>
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">${safeTitle}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <tr>
        <td style="padding:6px 0;color:#64748b;width:120px;">From</td>
        <td style="padding:6px 0;color:#0f172a;font-weight:500;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Category</td>
        <td style="padding:6px 0;color:#0f172a;">${safeCategory}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Phone</td>
        <td style="padding:6px 0;color:#0f172a;">${safePhone}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Device</td>
        <td style="padding:6px 0;color:#0f172a;">${safeDevice}</td>
      </tr>
    </table>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:14px;line-height:1.6;color:#1e293b;">
      ${safeDesc}
    </div>
  </div>
</div>`.trim()
}

export function buildCoffeeThankYouEmailHtml(params: {
  supporterName: string
  amount: number
  utr: string
  orderRef?: string
}): string {
  const safeName = escapeHtml(params.supporterName || 'Friend')
  const safeAmount = escapeHtml(Number(params.amount).toFixed(2).replace(/\.00$/, ''))
  const safeUtr = escapeHtml(params.utr)
  const safeRef = params.orderRef ? escapeHtml(params.orderRef) : ''

  return `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;padding:28px 16px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06);">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 24px;text-align:center;color:#ffffff;">
      <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;letter-spacing:0.4px;margin-bottom:10px;">
        ☕ BUY ME A COFFEE · FREEPDFEDIT
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.3;">
        Thank You So Much, ${safeName}!
      </h1>
      <p style="margin:8px 0 0;font-size:14px;color:#e0e7ff;">
        Your kindness genuinely helps me keep building free, privacy-first tools.
      </p>
    </div>

    <div style="padding:24px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#1e293b;">
        Hi <strong>${safeName}</strong>,
      </p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#475569;">
        I&rsquo;m <strong>Manish Bhavar</strong>, an MCA graduate building free web apps like
        <strong>FreePDFEdit</strong> for everyday survival and learning while keeping them 100% free,
        browser-private, and watermark-free.
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#475569;">
        Receiving your support of <strong>&#8377;${safeAmount}</strong> truly means the world to me &mdash; it covers
        basic expenses and motivates me to keep shipping tools anyone can rely on without paywalls.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;">
          Support Receipt
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#64748b;width:130px;">Supporter</td>
            <td style="padding:4px 0;color:#0f172a;font-weight:600;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#64748b;">Contribution</td>
            <td style="padding:4px 0;color:#059669;font-weight:700;">&#8377;${safeAmount} INR</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#64748b;">UPI Ref / UTR</td>
            <td style="padding:4px 0;color:#0f172a;font-family:monospace;">${safeUtr}</td>
          </tr>
          ${
            safeRef
              ? `<tr>
            <td style="padding:4px 0;color:#64748b;">Order Ref</td>
            <td style="padding:4px 0;color:#64748b;font-family:monospace;">${safeRef}</td>
          </tr>`
              : ''
          }
        </table>
      </div>

      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#312e81;">
          Let&rsquo;s stay connected! Check out more of my work:
        </p>
        <div>
          <a href="https://manishbhavar.in/" style="display:inline-block;margin:4px;padding:8px 14px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
            Portfolio
          </a>
          <a href="https://github.com/bmanish55" style="display:inline-block;margin:4px;padding:8px 14px;border-radius:8px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/manishbhavar/" style="display:inline-block;margin:4px;padding:8px 14px;border-radius:8px;background:#0a66c2;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
            LinkedIn
          </a>
        </div>
      </div>

      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#475569;">
        With heartfelt gratitude,<br />
        <strong style="color:#0f172a;">Manish Bhavar</strong><br />
        <span style="font-size:12px;color:#64748b;">MCA Graduate &middot; Creator of FreePDFEdit</span>
      </p>
    </div>
  </div>
</div>`.trim()
}

export function buildCoffeeOwnerNotifyEmailHtml(params: {
  supporterName: string
  supporterEmail: string
  amount: number
  utr: string
  orderRef?: string
}): string {
  const safeName = escapeHtml(params.supporterName || 'Friend')
  const safeEmail = escapeHtml(params.supporterEmail)
  const safeAmount = escapeHtml(Number(params.amount).toFixed(2).replace(/\.00$/, ''))
  const safeUtr = escapeHtml(params.utr)
  const safeRef = params.orderRef ? escapeHtml(params.orderRef) : 'N/A'

  return `
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:22px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#059669;">☕ NEW COFFEE SUPPORT</p>
    <h1 style="margin:0 0 14px;font-size:18px;font-weight:700;color:#0f172a;">&#8377;${safeAmount} from ${safeName}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:5px 0;color:#64748b;width:120px;">Name</td><td style="padding:5px 0;color:#0f172a;font-weight:600;">${safeName}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;">Email</td><td style="padding:5px 0;color:#0f172a;">${safeEmail}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;">Amount</td><td style="padding:5px 0;color:#059669;font-weight:700;">&#8377;${safeAmount} INR</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;">UTR / Ref</td><td style="padding:5px 0;color:#0f172a;font-family:monospace;">${safeUtr}</td></tr>
      <tr><td style="padding:5px 0;color:#64748b;">Order Ref</td><td style="padding:5px 0;color:#64748b;font-family:monospace;">${safeRef}</td></tr>
    </table>
  </div>
</div>`.trim()
}
