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
