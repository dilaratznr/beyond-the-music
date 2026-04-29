import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const SYSTEM_PROMPT = `Sen "Beyond The Music" platformunun yapay zeka müzik asistanısın. Adın "Maestro".

Görevin:
- Kullanıcılara müzik türleri, sanatçılar, albümler, prodüktörler, stüdyolar ve müzik teorisi hakkında bilgi vermek
- Müzik keşfi için önerilerde bulunmak ve PLATFORMDAKİ ilgili sayfalara link vermek
- Dinleme rotaları önermek
- Müzik tarihi ve kültürel etkiler hakkında bilgi paylaşmak

Kurallar:
- Her zaman kibar, bilgili ve tutkulu ol
- Yanıtlarını kısa ve öz tut (max 3-4 paragraf)
- Platformdaki mevcut içeriklere referans ver MÜMKÜNSE markdown link kullan: [Tür adı](/tr/genre/slug)
- Hem Türkçe hem İngilizce yanıt verebilirsin, kullanıcının diline göre yanıt ver
- Müzikle ilgisi olmayan sorulara nazikçe müziğe yönlendir
- Markdown formatı kullanabilirsin (bold, italic, listeler, linkler)
- Bir tür/sanatçı/makale ÖNERİYORSAN ve listede varsa MUTLAKA link ver — kullanıcı tıklayıp keşfe başlasın
- Listede olmayan bir içeriği ASLA link olarak verme (404 olur). Bahsedebilirsin ama link kurma.
- Birden fazla seçenek sunarken liste formatında yaz, her satır link içersin

Sen bir müzik ansiklopedisisin. Cevapların derinlikli ama anlaşılır olmalı.`;

// Conservative limits for a public, cost-sensitive AI endpoint.
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_TURN_LENGTH = 2000;
const BURST_LIMIT = 3;          // 3 messages...
const BURST_WINDOW_MS = 60_000; // ...per minute
const HOURLY_LIMIT = 20;        // 20 per hour
const HOURLY_WINDOW_MS = 60 * 60 * 1000;

interface HistoryTurn {
  role: string;
  content: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const burst = await rateLimit(`aichat:burst:${ip}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.success) {
    return NextResponse.json(
      { error: 'Çok hızlı. Lütfen bir dakika bekleyin. / Slow down, try again in a minute.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(burst.resetInMs / 1000)) },
      },
    );
  }
  const hourly = await rateLimit(`aichat:hourly:${ip}`, HOURLY_LIMIT, HOURLY_WINDOW_MS);
  if (!hourly.success) {
    return NextResponse.json(
      { error: 'Saatlik kullanım sınırına ulaştınız. / Hourly usage limit reached.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(hourly.resetInMs / 1000)) },
      },
    );
  }

  let body: { message?: unknown; locale?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const message =
    typeof body.message === 'string' ? body.message.trim() : '';
  const locale = body.locale === 'en' ? 'en' : 'tr';

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` },
      { status: 400 },
    );
  }

  const historyRaw = Array.isArray(body.history) ? body.history : [];
  const history: HistoryTurn[] = historyRaw
    .filter(
      (h): h is HistoryTurn =>
        !!h &&
        typeof h === 'object' &&
        typeof (h as HistoryTurn).role === 'string' &&
        typeof (h as HistoryTurn).content === 'string',
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      content: h.content.slice(0, MAX_HISTORY_TURN_LENGTH),
    }));

  try {
    const [genres, artists, articles] = await Promise.all([
      prisma.genre.findMany({
        where: { parentId: null, status: 'PUBLISHED' },
        select: { nameTr: true, nameEn: true, slug: true },
      }),
      prisma.artist.findMany({
        where: { status: 'PUBLISHED' },
        select: { name: true, type: true, slug: true },
        take: 20,
      }),
      prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { titleTr: true, titleEn: true, category: true, slug: true },
        take: 10,
      }),
    ]);

    // AI'a gerçek slug'ları + URL pattern'ı veriyoruz ki cevabında
    // markdown link'leri ([Rock](/tr/genre/rock)) doğru üretebilsin.
    // Platform dışı / olmayan içerik için link uydurmasın diye system
    // prompt'ta da kısıt var (aşağıda).
    const genreLines = genres
      .map((g) => `  - ${locale === 'tr' ? g.nameTr : g.nameEn} → /${locale}/genre/${g.slug}`)
      .join('\n');
    const artistLines = artists
      .map((a) => `  - ${a.name} (${a.type}) → /${locale}/artist/${a.slug}`)
      .join('\n');
    const articleLines = articles
      .map(
        (a) =>
          `  - "${locale === 'tr' ? a.titleTr : a.titleEn}" (${a.category}) → /${locale}/article/${a.slug}`,
      )
      .join('\n');

    const contextInfo = `
Platformdaki mevcut içerikler — bunların DIŞINA referans verme, sadece
listedekilere link ver. Markdown link formatı: [Görünen ad](/tr/...)

Türler:
${genreLines}

Sanatçılar:
${artistLines}

Makaleler:
${articleLines}

Kullanıcı dili: ${locale}
Tüm link'leri "/${locale}/..." prefix'i ile ver. Listede olmayan bir tür/sanatçı/makale için ASLA link uydurma.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      const fallbackResponse = getFallbackResponse(message, locale, {
        genres,
        artists,
        articles,
      });
      return NextResponse.json({ response: fallbackResponse, fallback: true });
    }

    // Locale'e göre URL prefix — fallback ve AI ikisi de aynı pattern üretiyor.
    // (Şu an sadece SYSTEM_PROMPT'a injekte ediyoruz; client tarafı güvenlik
    // beyaz listesi de aynı pattern'a güveniyor.)

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + contextInfo }],
        },
        {
          role: 'model',
          parts: [
            {
              text:
                locale === 'tr'
                  ? 'Anlaşıldı! Ben Maestro, Beyond The Music platformunun müzik asistanıyım. Size müzik dünyasında rehberlik etmeye hazırım.'
                  : "Understood! I'm Maestro, Beyond The Music's music assistant. Ready to guide you through the world of music.",
            },
          ],
        },
        ...history.map((h) => ({
          role: h.role,
          parts: [{ text: h.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('[ai-chat] error:', error);
    return NextResponse.json(
      {
        response:
          locale === 'tr'
            ? 'Şu anda yanıt veremiyorum. Lütfen tekrar deneyin.'
            : 'I cannot respond right now. Please try again.',
        error: true,
      },
      { status: 502 },
    );
  }
}

function getFallbackResponse(
  message: string,
  locale: string,
  context: {
    genres: { nameTr: string; nameEn: string; slug: string }[];
    artists: { name: string; type: string; slug: string }[];
    articles: { titleTr: string; titleEn: string; category: string; slug: string }[];
  },
): string {
  const msg = message.toLowerCase();
  const tr = locale === 'tr';
  const localePrefix = `/${locale}`;

  // Helper'lar — gerçek DB slug'larından markdown link üret. AI yoksa
  // fallback yine de tıklanabilir öneriler verir, kullanıcı kaybolmaz.
  const findGenreLink = (...keywords: string[]): string | null => {
    const found = context.genres.find((g) =>
      keywords.some(
        (k) =>
          g.nameTr.toLowerCase().includes(k) ||
          g.nameEn.toLowerCase().includes(k) ||
          g.slug.includes(k),
      ),
    );
    if (!found) return null;
    const name = tr ? found.nameTr : found.nameEn;
    return `[${name}](${localePrefix}/genre/${found.slug})`;
  };
  const findArticleLink = (...keywords: string[]): string | null => {
    const found = context.articles.find((a) =>
      keywords.some(
        (k) =>
          a.titleTr.toLowerCase().includes(k) ||
          a.titleEn.toLowerCase().includes(k) ||
          a.slug.includes(k),
      ),
    );
    if (!found) return null;
    const title = tr ? found.titleTr : found.titleEn;
    return `[${title}](${localePrefix}/article/${found.slug})`;
  };

  if (msg.includes('merhaba') || msg.includes('hello') || msg.includes('selam') || msg.includes('hi')) {
    return tr
      ? `Merhaba! Ben **Maestro**, Beyond The Music platformunun müzik asistanıyım. 🎵\n\nSana şu konularda yardımcı olabilirim:\n- **Müzik türleri** hakkında bilgi\n- **Sanatçı** önerileri ve biyografileri\n- **Dinleme rotaları** ve keşif\n- **Müzik teorisi** ve prodüksiyon\n- **Kültürel etki** analizleri\n\nNe hakkında konuşmak istersin?`
      : `Hello! I'm **Maestro**, Beyond The Music's music assistant. 🎵\n\nI can help you with:\n- **Music genres** information\n- **Artist** recommendations and biographies\n- **Listening paths** and discovery\n- **Music theory** and production\n- **Cultural impact** analysis\n\nWhat would you like to talk about?`;
  }

  if (msg.includes('rock') || msg.includes('grunge') || msg.includes('punk')) {
    const rockLink = findGenreLink('rock');
    const grungeLink = findGenreLink('grunge');
    const punkLink = findGenreLink('punk');
    const ctaTr = rockLink
      ? `Detaylar için ${rockLink} sayfasına göz at.`
      : 'Hangi alt tür ilgini çekiyor?';
    const ctaEn = rockLink
      ? `Check the ${rockLink} page for details.`
      : 'Which subgenre interests you?';
    return tr
      ? `**Rock**, müzik tarihinin en etkili türlerinden biridir! 🎸\n\n1940'ların sonunda blues ve country'nin birleşiminden doğan rock, sürekli evrilmiştir:\n\n- ${grungeLink ?? '**Grunge**'} — Seattle'ın karanlık sesi\n- ${punkLink ?? '**Punk Rock**'} — DIY ve isyan\n- **Progressive Rock** — Deneysel ve karmaşık\n- **Alternative Rock** — Ana akım dışı\n\n${ctaTr}`
      : `**Rock** is one of the most influential genres in music history! 🎸\n\nBorn from the fusion of blues and country in the late 1940s:\n\n- ${grungeLink ?? '**Grunge**'} — Seattle's dark sound\n- ${punkLink ?? '**Punk Rock**'} — DIY and rebellion\n- **Progressive Rock** — Experimental and complex\n- **Alternative Rock** — Outside the mainstream\n\n${ctaEn}`;
  }

  if (msg.includes('jazz') || msg.includes('blues') || msg.includes('miles')) {
    const jazzLink = findGenreLink('jazz');
    const modalArticleLink = findArticleLink('modal', 'jazz');
    const tail = modalArticleLink
      ? tr
        ? `Modal Jazz hakkında detaylı bir makale var: ${modalArticleLink}.`
        : `We have a detailed article on Modal Jazz: ${modalArticleLink}.`
      : '';
    return tr
      ? `**Jazz**, doğaçlamanın ve özgürlüğün müziğidir! 🎺\n\nNew Orleans'ta doğan jazz, birçok alt türe evrilmiştir:\n\n- **Bebop** — Hızlı ve karmaşık\n- **Cool Jazz** — Yumuşak ve minimal\n- **Modal Jazz** — Harmonik özgürleşme\n- **Free Jazz** — Sınırsız deneysellik\n\n${jazzLink ? `Tür sayfası: ${jazzLink}. ` : ''}${tail}`
      : `**Jazz** is the music of improvisation and freedom! 🎺\n\nBorn in New Orleans:\n\n- **Bebop** — Fast and complex\n- **Cool Jazz** — Soft and minimal\n- **Modal Jazz** — Harmonic liberation\n- **Free Jazz** — Unlimited experimentation\n\n${jazzLink ? `Genre page: ${jazzLink}. ` : ''}${tail}`;
  }

  if (msg.includes('öner') || msg.includes('recommend') || msg.includes('dinle') || msg.includes('listen')) {
    return tr
      ? `İşte sana bazı öneriler! 🎧\n\n**Yeni başlayanlar için:**\n- Rock keşfine "Nevermind" (Nirvana) ile başla\n- Jazz'a "Kind of Blue" (Miles Davis) ile adım at\n- Elektronik müziğe "Autobahn" (Kraftwerk) ile gir\n\n**Derin dalış isteyenler için:**\n- Radiohead'in "OK Computer" albümü\n- Pink Floyd'un "The Dark Side of the Moon" albümü\n\nPlatformumuzda **Dinleme Rotaları** bölümünde küratöryel yolculuklar var. "Melankolik Yolculuk" veya "Seattle Sesi: 1991" rotalarına göz at!`
      : `Here are some recommendations! 🎧\n\n**For beginners:**\n- Start rock discovery with "Nevermind" (Nirvana)\n- Step into jazz with "Kind of Blue" (Miles Davis)\n- Enter electronic music with "Autobahn" (Kraftwerk)\n\n**For deep divers:**\n- Radiohead's "OK Computer"\n- Pink Floyd's "The Dark Side of the Moon"\n\nCheck out our **Listening Paths** section for curated journeys. Try "Melancholy Journey" or "The Seattle Sound: 1991"!`;
  }

  if (msg.includes('tür') || msg.includes('genre') || msg.includes('kategori')) {
    // Linklerle dolu liste — kullanıcı tıklayıp anında tür sayfasına gitsin.
    const genreList = context.genres
      .map(
        (g) =>
          `- [${tr ? g.nameTr : g.nameEn}](${localePrefix}/genre/${g.slug})`,
      )
      .join('\n');
    return tr
      ? `Platformumuzda şu ana türler mevcut:\n\n${genreList}\n\nHer tür altında alt türler, kültürel etki analizleri, alt kültür incelemeleri ve küratöryel hareketler bulabilirsin. Üstündeki bir adı tıkla, sayfa açılsın.`
      : `Our platform currently features these genres:\n\n${genreList}\n\nUnder each genre you can find subgenres, cultural impact analyses, subculture studies, and curated movements. Click any name above to open the page.`;
  }

  if (msg.includes('sanatçı') || msg.includes('artist') || msg.includes('kimler')) {
    const artistList = context.artists
      .map(
        (a) =>
          `- [${a.name}](${localePrefix}/artist/${a.slug}) (${a.type})`,
      )
      .join('\n');
    return tr
      ? `Platformumuzda şu sanatçılar var:\n\n${artistList}\n\nHer sanatçının biyografisi, albümleri, deep cut'ları ve görsel arşivi mevcut. Adına tıkla, profil sayfasına gidesin.`
      : `Our platform features these artists:\n\n${artistList}\n\nEach artist has a biography, albums, deep cuts, and visual archive. Click any name to open their profile.`;
  }

  return tr
    ? `İlginç bir soru! 🎵\n\nBen **Maestro**, müzik dünyasında rehberinim. Şu konularda yardımcı olabilirim:\n\n- 🎸 **Müzik türleri** ve alt türler\n- 🎤 **Sanatçılar** ve biyografileri\n- 💿 **Albümler** ve deep cut'lar\n- 🎛️ **Prodüktörler** ve stüdyolar\n- 📖 **Müzik teorisi**\n- 🎧 **Dinleme önerileri**\n\nBana bir tür, sanatçı ya da konu söyle, seni aydınlatayım!`
    : `Interesting question! 🎵\n\nI'm **Maestro**, your guide to the music world. I can help with:\n\n- 🎸 **Music genres** and subgenres\n- 🎤 **Artists** and biographies\n- 💿 **Albums** and deep cuts\n- 🎛️ **Producers** and studios\n- 📖 **Music theory**\n- 🎧 **Listening recommendations**\n\nTell me a genre, artist, or topic, and I'll enlighten you!`;
}
