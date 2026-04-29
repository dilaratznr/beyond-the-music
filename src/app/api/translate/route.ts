import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth-guard';

/**
 * TR → EN (or EN → TR) translation endpoint for admin forms.
 *
 * Invoked automatically on save when the translated-side field is empty but
 * the source side has content. Guarded to any authenticated admin (editors
 * need this too — they save entity forms). Rate-limited per IP: Gemini calls
 * are cheap but not free, and a rogue client could hammer this.
 */

// One payload per field — a longform article body is the worst case, so we
// leave headroom beyond the ai-chat 500-char cap.
const MAX_TEXT_LENGTH = 40_000;
const BURST_LIMIT = 20;           // 20 translations...
const BURST_WINDOW_MS = 60_000;   // ...per minute (allows a full settings page save)
const HOURLY_LIMIT = 300;         // 300 per hour per IP
const HOURLY_WINDOW_MS = 60 * 60 * 1000;

type Target = 'en' | 'tr';

export async function POST(request: NextRequest) {
  const { error: authError, user } = await requireAuth('EDITOR');
  if (authError) return authError;

  const ip = getClientIp(request);
  const rlKey = user?.id ?? ip;

  const burst = await rateLimit(`translate:burst:${rlKey}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.success) {
    return NextResponse.json(
      { error: 'Çok hızlı çeviri isteği. Bir dakika bekleyin. / Too many translation requests.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(burst.resetInMs / 1000)) },
      },
    );
  }
  const hourly = await rateLimit(`translate:hourly:${rlKey}`, HOURLY_LIMIT, HOURLY_WINDOW_MS);
  if (!hourly.success) {
    return NextResponse.json(
      { error: 'Saatlik çeviri sınırı aşıldı. / Hourly translation limit reached.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(hourly.resetInMs / 1000)) },
      },
    );
  }

  let body: { text?: unknown; html?: unknown; target?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  const html = body.html === true;
  const target: Target = body.target === 'tr' ? 'tr' : 'en';

  if (!text.trim()) {
    return NextResponse.json({ translated: '' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return NextResponse.json(
      { error: 'Translation service not configured (GEMINI_API_KEY missing)' },
      { status: 503 },
    );
  }

  const sourceLang = target === 'en' ? 'Turkish' : 'English';
  const targetLang = target === 'en' ? 'English' : 'Turkish';

  // A narrow prompt: translate only, no commentary, preserve HTML if present.
  // The model is instructed to return ONLY the translated text so the caller
  // can use it verbatim as a field value.
  const instruction = html
    ? `You are a professional ${sourceLang}-to-${targetLang} translator specializing in music journalism, cultural criticism, and editorial writing.

Translate the following ${sourceLang} HTML fragment into natural, editorial-quality ${targetLang}. Strict rules:
- Preserve ALL HTML tags, attributes, and structure exactly as-is — only translate the visible text content.
- Do NOT add, remove, or reorder tags.
- Keep proper nouns (artist names, album titles, song titles, place names) unchanged unless they have an established ${targetLang} form.
- Keep the register and tone (literary, journalistic, critical) consistent.
- Output ONLY the translated HTML. No preface, no markdown fences, no commentary.

HTML to translate:
${text}`
    : `You are a professional ${sourceLang}-to-${targetLang} translator specializing in music journalism, cultural criticism, and editorial writing.

Translate the following ${sourceLang} text into natural, editorial-quality ${targetLang}. Strict rules:
- Keep proper nouns (artist names, album titles, song titles, place names) unchanged unless they have an established ${targetLang} form.
- Keep the register and tone (literary, journalistic, critical) consistent.
- Preserve line breaks and paragraph structure.
- Output ONLY the translated text. No preface, no quotes around the output, no markdown fences, no commentary.

Text to translate:
${text}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(instruction);
    let translated = result.response.text();

    // Defensive: some models sometimes wrap output in ```...``` fences or
    // lead with "Here is the translation:" — strip the common shapes.
    translated = stripWrappers(translated);

    return NextResponse.json({ translated });
  } catch (err) {
    console.error('[translate] error:', err);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 502 },
    );
  }
}

function stripWrappers(s: string): string {
  let out = s.trim();
  // ```lang\n...\n```  or  ```\n...\n```
  const fence = /^```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```$/;
  const m = out.match(fence);
  if (m) out = m[1].trim();
  // Leading "Translation:" / "Here is the translation:" lines
  out = out.replace(/^(?:Translation|Here is the translation|İşte çevirisi)\s*:\s*/i, '');
  return out.trim();
}
