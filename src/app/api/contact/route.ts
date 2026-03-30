import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // In production, send email via nodemailer/resend/etc.
  // For now, log and return success
  console.log('Contact form submission:', { name, email, subject, message, date: new Date().toISOString() });

  return NextResponse.json({ success: true });
}
