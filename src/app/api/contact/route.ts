import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000); // 5/hour per IP
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(limit.resetInMs / 1000)),
        },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  // Honeypot: if the hidden `website` field is populated, silently drop.
  const honeypot = typeof body.website === 'string' ? body.website : '';

  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'İsim, e-posta ve mesaj zorunludur' },
      { status: 400 },
    );
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'İsim çok uzun' }, { status: 400 });
  }
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Geçerli bir e-posta adresi girin' },
      { status: 400 },
    );
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: 'Konu çok uzun' }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: 'Mesaj en az 10 karakter olmalıdır' },
      { status: 400 },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Mesaj çok uzun' }, { status: 400 });
  }

  // SMTP_PASSWORD (davet akışı standart'ı) veya SMTP_PASS (eski) — her ikisi de kabul.
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const hasSmtp =
    process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass;

  if (hasSmtp) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER!,
          pass: smtpPass!,
        },
      });

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = escapeHtml(subject || '(konu yok)');
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

      await transporter.sendMail({
        from: `"Beyond The Music" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
        replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
        subject: `[İletişim] ${subject || '(konu yok)'}`,
        text:
          `İsim: ${name}\n` +
          `E-posta: ${email}\n` +
          `Konu: ${subject || '(konu yok)'}\n` +
          `IP: ${ip}\n\n` +
          `Mesaj:\n${message}`,
        html:
          `<h3>Beyond The Music — yeni iletişim formu mesajı</h3>` +
          `<p><strong>İsim:</strong> ${safeName}</p>` +
          `<p><strong>E-posta:</strong> ${safeEmail}</p>` +
          `<p><strong>Konu:</strong> ${safeSubject}</p>` +
          `<p><strong>IP:</strong> ${escapeHtml(ip)}</p>` +
          `<hr/>` +
          `<p><strong>Mesaj:</strong><br/>${safeMessage}</p>`,
      });
    } catch (error) {
      console.error('[contact] SMTP send failed:', error);
      return NextResponse.json(
        { error: 'Mesaj gönderilemedi, lütfen daha sonra tekrar deneyin' },
        { status: 502 },
      );
    }
  } else {
    // No SMTP configured. Log so admins see it in deployment logs instead of
    // silently dropping, and still return success to the user.
    console.warn(
      '[contact] SMTP not configured — message not delivered:',
      JSON.stringify({
        name,
        email,
        subject,
        message,
        ip,
        at: new Date().toISOString(),
      }),
    );
    // In production, refuse rather than pretending: better to tell the user
    // than silently lose their message.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Mesaj sistemi şu anda kullanılamıyor' },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
