import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabase.js';

interface ResendResponse {
  id?: string;
  error?: { message: string };
  statusCode?: number;
  message?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { email, origin } = req.body as { email?: string; origin?: string };

  if (!email?.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ error: 'Email service not configured.' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Auth service not configured.' });
    return;
  }

  // Prefer the env var (set in Vercel dashboard), then the origin sent by the browser, then localhost
  const siteUrl = process.env.SITE_URL ?? origin ?? 'http://localhost:5173';

  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim(),
    options: {
      redirectTo: `${siteUrl}?type=recovery`,
    },
  });

  if (linkError) {
    console.error('[forgot-password] generateLink error:', linkError.message);
    res.json({ ok: true });
    return;
  }

  const resetUrl = data.properties?.action_link;
  if (!resetUrl) {
    console.error('[forgot-password] No action_link returned from Supabase');
    res.json({ ok: true });
    return;
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'TeachMeNew <lahacks@clyde.at>',
      to: [email.trim()],
      subject: 'Reset your TeachMeNew password',
      html: buildEmailHtml(resetUrl, siteUrl),
    }),
  });

  const emailData = (await emailRes.json()) as ResendResponse;

  if (!emailRes.ok) {
    const msg = emailData.message ?? emailData.error?.message ?? `Resend error ${emailRes.status}`;
    console.error('[forgot-password] Resend error:', msg);
  }

  res.json({ ok: true });
}

function buildEmailHtml(resetUrl: string, siteUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
  <style>
    body { margin: 0; padding: 0; background: #0d0d14; font-family: Inter, system-ui, sans-serif; color: #f0f0f8; }
    .container { max-width: 520px; margin: 40px auto; background: #13131f; border-radius: 16px; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 1.4rem; font-weight: 700; color: #f0f0f8; margin-bottom: 1.75rem; }
    .logo-icon { color: #7c6ff7; margin-right: 0.4rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.75rem; }
    p  { font-size: 0.95rem; color: rgba(240,240,248,0.65); line-height: 1.6; margin: 0 0 1.25rem; }
    .btn { display: inline-block; background: #7c6ff7; color: #fff; text-decoration: none; padding: 0.75rem 1.75rem; border-radius: 10px; font-size: 0.95rem; font-weight: 600; margin: 0.5rem 0 1.5rem; }
    .link { color: #a99ffa; font-size: 0.8rem; word-break: break-all; }
    .footer { margin-top: 2rem; font-size: 0.78rem; color: rgba(240,240,248,0.35); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-icon">✦</span>TeachMeNew</div>
    <h1>Reset your password</h1>
    <p>We received a request to reset the password for your TeachMeNew account. Click the button below to choose a new password.</p>
    <a href="${resetUrl}" class="btn">Reset password →</a>
    <p>This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.</p>
    <p class="link">Or copy this link: ${resetUrl}</p>
    <div class="footer">
      TeachMeNew · <a href="${siteUrl}" style="color:inherit">${siteUrl}</a>
    </div>
  </div>
</body>
</html>`;
}
