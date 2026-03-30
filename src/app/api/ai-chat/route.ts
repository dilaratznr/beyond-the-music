import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

const SYSTEM_PROMPT = `Sen "Beyond The Music" platformunun yapay zeka müzik asistanısın. Adın "Maestro".

Görevin:
- Kullanıcılara müzik türleri, sanatçılar, albümler, prodüktörler, stüdyolar ve müzik teorisi hakkında bilgi vermek
- Müzik keşfi için önerilerde bulunmak
- Dinleme rotaları önermek
- Müzik tarihi ve kültürel etkiler hakkında bilgi paylaşmak

Kurallar:
- Her zaman kibar, bilgili ve tutkulu ol
- Yanıtlarını kısa ve öz tut (max 3-4 paragraf)
- Platformdaki mevcut içeriklere referans ver mümkünse
- Hem Türkçe hem İngilizce yanıt verebilirsin, kullanıcının diline göre yanıt ver
- Müzikle ilgisi olmayan sorulara nazikçe müziğe yönlendir
- Markdown formatı kullanabilirsin (bold, italic, listeler)

Sen bir müzik ansiklopedisisin. Cevapların derinlikli ama anlaşılır olmalı.`;

export async function POST(request: NextRequest) {
  try {
    const { message, locale, history } = await request.json();

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Gather context from DB
    const [genres, artists, articles] = await Promise.all([
      prisma.genre.findMany({ where: { parentId: null }, select: { nameTr: true, nameEn: true, slug: true } }),
      prisma.artist.findMany({ select: { name: true, type: true, slug: true }, take: 20 }),
      prisma.article.findMany({ where: { status: 'PUBLISHED' }, select: { titleTr: true, titleEn: true, category: true, slug: true }, take: 10 }),
    ]);

    const contextInfo = `
Platformda mevcut türler: ${genres.map(g => g.nameTr).join(', ')}
Platformda mevcut sanatçılar: ${artists.map(a => `${a.name} (${a.type})`).join(', ')}
Platformda mevcut makaleler: ${articles.map(a => a.titleTr).join(', ')}
Kullanıcı dili: ${locale || 'tr'}`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      // Fallback: smart static responses when no API key
      const fallbackResponse = getFallbackResponse(message, locale || 'tr', { genres, artists, articles });
      return NextResponse.json({ response: fallbackResponse });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const chatHistory = (history || []).map((h: { role: string; content: string }) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + contextInfo }] },
        { role: 'model', parts: [{ text: locale === 'tr' ? 'Anlaşıldı! Ben Maestro, Beyond The Music platformunun müzik asistanıyım. Size müzik dünyasında rehberlik etmeye hazırım.' : 'Understood! I\'m Maestro, Beyond The Music\'s music assistant. Ready to guide you through the world of music.' }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({
      response: 'Şu anda yanıt veremiyorum. Lütfen tekrar deneyin. / I cannot respond right now. Please try again.',
    });
  }
}

function getFallbackResponse(
  message: string,
  locale: string,
  context: { genres: { nameTr: string; nameEn: string }[]; artists: { name: string; type: string }[]; articles: { titleTr: string; titleEn: string; category: string }[] }
): string {
  const msg = message.toLowerCase();
  const tr = locale === 'tr';

  if (msg.includes('merhaba') || msg.includes('hello') || msg.includes('selam') || msg.includes('hi')) {
    return tr
      ? `Merhaba! Ben **Maestro**, Beyond The Music platformunun müzik asistanıyım. 🎵\n\nSana şu konularda yardımcı olabilirim:\n- **Müzik türleri** hakkında bilgi\n- **Sanatçı** önerileri ve biyografileri\n- **Dinleme rotaları** ve keşif\n- **Müzik teorisi** ve prodüksiyon\n- **Kültürel etki** analizleri\n\nNe hakkında konuşmak istersin?`
      : `Hello! I'm **Maestro**, Beyond The Music's music assistant. 🎵\n\nI can help you with:\n- **Music genres** information\n- **Artist** recommendations and biographies\n- **Listening paths** and discovery\n- **Music theory** and production\n- **Cultural impact** analysis\n\nWhat would you like to talk about?`;
  }

  if (msg.includes('rock') || msg.includes('grunge') || msg.includes('punk')) {
    return tr
      ? `**Rock**, müzik tarihinin en etkili türlerinden biridir! 🎸\n\n1940'ların sonunda blues ve country'nin birleşiminden doğan rock, sürekli evrilmiştir:\n\n- **Grunge** - Seattle'ın karanlık sesi (Nirvana, Pearl Jam)\n- **Punk Rock** - DIY ve isyan (Ramones, Sex Pistols)\n- **Progressive Rock** - Deneysel ve karmaşık (Pink Floyd, Yes)\n- **Alternative Rock** - Ana akım dışı (Radiohead, Pixies)\n\nPlatformumuzda Rock hakkında detaylı makaleler bulabilirsin. Hangi alt tür ilgini çekiyor?`
      : `**Rock** is one of the most influential genres in music history! 🎸\n\nBorn from the fusion of blues and country in the late 1940s, rock has continuously evolved:\n\n- **Grunge** - Seattle's dark sound (Nirvana, Pearl Jam)\n- **Punk Rock** - DIY and rebellion (Ramones, Sex Pistols)\n- **Progressive Rock** - Experimental and complex (Pink Floyd, Yes)\n- **Alternative Rock** - Outside the mainstream (Radiohead, Pixies)\n\nYou can find detailed articles about Rock on our platform. Which subgenre interests you?`;
  }

  if (msg.includes('jazz') || msg.includes('blues') || msg.includes('miles')) {
    return tr
      ? `**Jazz**, doğaçlamanın ve özgürlüğün müziğidir! 🎺\n\nNew Orleans'ta doğan jazz, birçok alt türe evrilmiştir:\n\n- **Bebop** - Hızlı ve karmaşık (Charlie Parker, Dizzy Gillespie)\n- **Cool Jazz** - Yumuşak ve minimal (Miles Davis, Chet Baker)\n- **Modal Jazz** - Harmonik özgürleşme (Kind of Blue)\n- **Free Jazz** - Sınırsız deneysellik (Ornette Coleman, John Coltrane)\n\n**Miles Davis**'in Kind of Blue albümü, jazz tarihinin en etkili eseridir. Platformumuzda Modal Jazz hakkında detaylı bir makale var!`
      : `**Jazz** is the music of improvisation and freedom! 🎺\n\nBorn in New Orleans, jazz has evolved into many subgenres:\n\n- **Bebop** - Fast and complex (Charlie Parker, Dizzy Gillespie)\n- **Cool Jazz** - Soft and minimal (Miles Davis, Chet Baker)\n- **Modal Jazz** - Harmonic liberation (Kind of Blue)\n- **Free Jazz** - Unlimited experimentation (Ornette Coleman, John Coltrane)\n\n**Miles Davis**'s Kind of Blue is the most influential work in jazz history. We have a detailed article about Modal Jazz on our platform!`;
  }

  if (msg.includes('öner') || msg.includes('recommend') || msg.includes('dinle') || msg.includes('listen')) {
    return tr
      ? `İşte sana bazı öneriler! 🎧\n\n**Yeni başlayanlar için:**\n- Rock keşfine "Nevermind" (Nirvana) ile başla\n- Jazz'a "Kind of Blue" (Miles Davis) ile adım at\n- Elektronik müziğe "Autobahn" (Kraftwerk) ile gir\n\n**Derin dalış isteyenler için:**\n- Radiohead'in "OK Computer" albümü\n- Pink Floyd'un "The Dark Side of the Moon" albümü\n\nPlatformumuzda **Dinleme Rotaları** bölümünde küratöryel yolculuklar var. "Melankolik Yolculuk" veya "Seattle Sesi: 1991" rotalarına göz at!`
      : `Here are some recommendations! 🎧\n\n**For beginners:**\n- Start rock discovery with "Nevermind" (Nirvana)\n- Step into jazz with "Kind of Blue" (Miles Davis)\n- Enter electronic music with "Autobahn" (Kraftwerk)\n\n**For deep divers:**\n- Radiohead's "OK Computer"\n- Pink Floyd's "The Dark Side of the Moon"\n\nCheck out our **Listening Paths** section for curated journeys. Try "Melancholy Journey" or "The Seattle Sound: 1991"!`;
  }

  if (msg.includes('tür') || msg.includes('genre') || msg.includes('kategori')) {
    const genreList = context.genres.map(g => tr ? g.nameTr : g.nameEn).join(', ');
    return tr
      ? `Platformumuzda şu ana türler mevcut:\n\n**${genreList}**\n\nHer tür altında alt türler, kültürel etki analizleri, alt kültür incelemeleri ve küratöryel hareketler bulabilirsin.\n\nHangi tür hakkında daha fazla bilgi almak istersin?`
      : `Our platform currently features these genres:\n\n**${genreList}**\n\nUnder each genre you can find subgenres, cultural impact analyses, subculture studies, and curated movements.\n\nWhich genre would you like to learn more about?`;
  }

  if (msg.includes('sanatçı') || msg.includes('artist') || msg.includes('kimler')) {
    const artistList = context.artists.map(a => `${a.name} (${a.type})`).join(', ');
    return tr
      ? `Platformumuzda şu sanatçılar var:\n\n${artistList}\n\nHer sanatçının biyografisi, albümleri, deep cut'ları ve görsel arşivi mevcut. Kimi merak ediyorsun?`
      : `Our platform features these artists:\n\n${artistList}\n\nEach artist has a biography, albums, deep cuts, and visual archive. Who are you curious about?`;
  }

  // Default response
  return tr
    ? `İlginç bir soru! 🎵\n\nBen **Maestro**, müzik dünyasında rehberinim. Şu konularda yardımcı olabilirim:\n\n- 🎸 **Müzik türleri** ve alt türler\n- 🎤 **Sanatçılar** ve biyografileri\n- 💿 **Albümler** ve deep cut'lar\n- 🎛️ **Prodüktörler** ve stüdyolar\n- 📖 **Müzik teorisi**\n- 🎧 **Dinleme önerileri**\n\nBana bir tür, sanatçı ya da konu söyle, seni aydınlatayım!`
    : `Interesting question! 🎵\n\nI'm **Maestro**, your guide to the music world. I can help with:\n\n- 🎸 **Music genres** and subgenres\n- 🎤 **Artists** and biographies\n- 💿 **Albums** and deep cuts\n- 🎛️ **Producers** and studios\n- 📖 **Music theory**\n- 🎧 **Listening recommendations**\n\nTell me a genre, artist, or topic, and I'll enlighten you!`;
}
