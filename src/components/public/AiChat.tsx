'use client';

import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function AiChat({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Inflight request — önceki yanıt henüz gelmeden kullanıcı yenisini
  // gönderirse / sayfa kapanırsa abort edebilelim diye. Race condition
  // önler ve mobil Safari'de askıda kalan request'leri keser.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Component unmount → pending request iptal.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const errorMsg =
      locale === 'tr'
        ? 'Şu anda yanıt veremedim, lütfen tekrar dene.'
        : "Couldn't respond just now, please try again.";

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, locale, history: messages.slice(-6) }),
        signal: controller.signal,
      });
      // Server bazen 502 / 504'te HTML dönüyor (Vercel function timeout).
      // res.json() crash etmesin diye try/catch + tip kontrolü; fail-soft
      // mesajla devam et — sayfayı çökertme.
      let response: string | undefined;
      try {
        const data = await res.json();
        if (typeof data?.response === 'string' && data.response.trim()) {
          response = data.response;
        }
      } catch {
        /* JSON parse fail — errorMsg gösterilecek */
      }
      setMessages((p) => [
        ...p,
        { role: 'assistant', content: response ?? errorMsg },
      ]);
    } catch (err) {
      // AbortError sessizce yut — yeni mesaj zaten loading'i tetikleyecek.
      if ((err as { name?: string })?.name === 'AbortError') return;
      setMessages((p) => [...p, { role: 'assistant', content: errorMsg }]);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  // LLM çıktısı `dangerouslySetInnerHTML` ile render ediliyor → prompt-
  // injection ile saldırgan modele `<script>` veya `<img onerror>`
  // ürettirebilir. Önce tüm HTML escape, sonra whitelist edilmiş markdown
  // işaretlemeyi (bold/italic/list/link/break) güvenli tag'lere çeviriyoruz.
  function escapeHtml(s: unknown): string {
    // Defensive: caller bazen undefined/null verebiliyor (data.response
    // yoksa). String'e zorlamak yerine boş string dön — render crash'i
    // yerine sessiz boş çıktı. Bu, sayfayı koruyan KRİTİK bir güvenlik
    // ağı: Safari iOS'da escape(undefined).replace patladığında tüm
    // sayfa "page couldn't load" ile çöküyordu.
    if (typeof s !== 'string') return '';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Sadece uygulama içi (relative) path'lere veya beyaz listede
   * tutulan harici hostname'lere link kurulmasına izin verir. AI bir
   * başkasının URL'sine yönlendirip phishing zemini oluşturmasın diye.
   */
  function isSafeLinkHref(href: string): boolean {
    if (!href) return false;
    if (href.startsWith('/')) return true; // internal path — safe
    try {
      const u = new URL(href);
      const allowed = new Set([
        'open.spotify.com',
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
      ]);
      return (u.protocol === 'https:' || u.protocol === 'http:') && allowed.has(u.host);
    } catch {
      return false;
    }
  }

  function fmt(t: unknown): string {
    let html = escapeHtml(t);
    // Markdown linkleri [text](url) — `[`, `(`, `)` escape'lenmiyor,
    // pattern hâlâ matchleniyor. Yalnızca güvenli href'i <a>'ya çevir,
    // gerisini düz metin bırak (label görünür kalır, link kurulmaz).
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_full, label, rawHref) => {
      const href = String(rawHref).trim();
      if (!isSafeLinkHref(href)) return label;
      const isExternal = !href.startsWith('/');
      const attrs = isExternal
        ? ' target="_blank" rel="noopener noreferrer nofollow"'
        : '';
      return `<a href="${href}" class="underline decoration-zinc-500 hover:decoration-white"${attrs}>${label}</a>`;
    });
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n- /g, '<br/>• ')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return html;
  }

  const chips = locale === 'tr'
    ? ['Bana müzik öner 🎵', 'Rock nedir?', 'Jazz tarihi', 'Sanatçı öner']
    : ['Recommend music 🎵', 'What is Rock?', 'Jazz history', 'Suggest an artist'];

  return (
    <>
      {/* ── TOGGLE BUTTON ── */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 group"
        aria-label="Music AI Assistant">
        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
          open ? 'bg-zinc-800 rotate-0 rounded-xl' : 'bg-zinc-900 hover:scale-105'
        }`}>
          {open ? (
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            /* Headphone icon */
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
              <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
            </svg>
          )}
          {!open && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900" />
          )}
        </div>
      </button>

      {/* ── CHAT PANEL ── */}
      {open && (
        <div className="fixed bottom-[5.5rem] right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] rounded-2xl overflow-hidden flex flex-col animate-scale-in shadow-2xl"
          style={{ height: '520px', background: '#0c0c0e' }}>

          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white tracking-tight">Maestro</h3>
              <p className="text-[10px] text-zinc-500 tracking-wide">{locale === 'tr' ? 'müzik asistanın' : 'your music assistant'}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400 font-medium">LIVE</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                  </svg>
                </div>
                <p className="text-white/80 text-sm font-medium mb-1">
                  {locale === 'tr' ? 'Hey, ben Maestro' : 'Hey, I\'m Maestro'}
                </p>
                <p className="text-zinc-600 text-xs mb-5 max-w-[240px] leading-relaxed">
                  {locale === 'tr' ? 'Müzik hakkında ne istersen sor — tür, sanatçı, albüm, tarih...' : 'Ask me anything about music — genre, artist, album, history...'}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {chips.map((c) => (
                    <button key={c} onClick={() => send(c)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-[11px] hover:bg-white/[0.08] hover:text-zinc-200 transition-all">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-[1.6] ${
                  msg.role === 'user'
                    ? 'bg-white text-zinc-900 rounded-2xl rounded-tr-md'
                    : 'bg-white/[0.04] text-zinc-300 rounded-2xl rounded-tl-md border border-white/[0.05]'
                }`}>
                  {msg.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} /> : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 animate-slide-up">
                <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-zinc-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
                  </svg>
                </div>
                <div className="bg-white/[0.04] px-4 py-3 rounded-2xl rounded-tl-md border border-white/[0.05]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.04]">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={locale === 'tr' ? 'Bir şey sor...' : 'Ask something...'}
                className="flex-1 bg-white/[0.04] text-white text-sm px-4 py-2.5 rounded-xl border border-white/[0.06] focus:border-white/[0.12] outline-none placeholder-zinc-600"
                maxLength={500} />
              <button type="submit" disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0">
                <svg className="w-4 h-4 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg>
              </button>
            </form>
            <p className="text-center text-[9px] text-zinc-700 mt-2 tracking-wider">MAESTRO · BEYOND THE MUSIC</p>
          </div>
        </div>
      )}
    </>
  );
}
