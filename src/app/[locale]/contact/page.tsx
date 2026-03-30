'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function ContactPage() {
  const { locale } = useParams();
  const tr = locale === 'tr';

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } else {
      const data = await res.json();
      setErrorMsg(data.error || 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <section className="bg-zinc-900 pt-24 pb-14">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {tr ? 'İletişim' : 'Contact'}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-lg">
            {tr ? 'Bizimle iletişime geçin. Sorularınızı, önerilerinizi ve işbirliği tekliflerinizi bekliyoruz.' : 'Get in touch with us. We welcome your questions, suggestions, and collaboration proposals.'}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Form */}
          <div className="md:col-span-3">
            {status === 'sent' ? (
              <div className="bg-zinc-900 rounded-2xl p-10 text-center  border border-white/5">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {tr ? 'Mesajınız iletildi!' : 'Message sent!'}
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                  {tr ? 'En kısa sürede size dönüş yapacağız.' : 'We will get back to you soon.'}
                </p>
                <button onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                  {tr ? 'Yeni Mesaj' : 'New Message'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-8  border border-white/5 space-y-5">
                <h2 className="text-lg font-bold text-white mb-1">
                  {tr ? 'Mesaj Gönder' : 'Send a Message'}
                </h2>

                {status === 'error' && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{errorMsg}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">{tr ? 'Ad Soyad' : 'Full Name'} *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-900"
                      required placeholder={tr ? 'Adınız' : 'Your name'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-900"
                      required placeholder="email@example.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">{tr ? 'Konu' : 'Subject'}</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-900">
                    <option value="">{tr ? 'Bir konu seçin' : 'Select a topic'}</option>
                    <option value="general">{tr ? 'Genel Soru' : 'General Question'}</option>
                    <option value="content">{tr ? 'İçerik Önerisi' : 'Content Suggestion'}</option>
                    <option value="collaboration">{tr ? 'İşbirliği Teklifi' : 'Collaboration Proposal'}</option>
                    <option value="writer">{tr ? 'Yazar Başvurusu' : 'Writer Application'}</option>
                    <option value="sponsorship">{tr ? 'Sponsorluk' : 'Sponsorship'}</option>
                    <option value="bug">{tr ? 'Hata Bildirimi' : 'Bug Report'}</option>
                    <option value="other">{tr ? 'Diğer' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">{tr ? 'Mesaj' : 'Message'} *</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-900 resize-none"
                    rows={6} required maxLength={2000}
                    placeholder={tr ? 'Mesajınızı yazın...' : 'Write your message...'} />
                  <p className="text-right text-[10px] text-zinc-400 mt-1">{form.message.length}/2000</p>
                </div>

                <button type="submit" disabled={status === 'sending'}
                  className="w-full py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors">
                  {status === 'sending' ? (tr ? 'Gönderiliyor...' : 'Sending...') : (tr ? 'Gönder' : 'Send Message')}
                </button>
              </form>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6  border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4">{tr ? 'İletişim Bilgileri' : 'Contact Info'}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{tr ? 'E-posta' : 'Email'}</p>
                    <p className="text-sm text-white font-medium">themusicbeyondtr@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{tr ? 'Telefon' : 'Phone'}</p>
                    <p className="text-sm text-white font-medium">0 537 422 57 08</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{tr ? 'Adres' : 'Address'}</p>
                    <p className="text-sm text-white font-medium">Fade Stage</p>
                    <p className="text-xs text-zinc-500">Cinnah Cd. Farabi Sk. 39/A, Çankaya/Ankara</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 text-white">
              <h3 className="text-sm font-bold mb-2">{tr ? 'Yazar Olmak İster misin?' : 'Want to Be a Writer?'}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {tr
                  ? 'Akademisyenler, müzik yazarları, araştırmacılar, müzisyenler ve gönüllü yazarlar platformumuza katkıda bulunabilir.'
                  : 'Academics, music writers, researchers, musicians, and volunteer writers can contribute to our platform.'}
              </p>
              <p className="text-[10px] text-zinc-500">
                {tr ? 'Konu alanında "Yazar Başvurusu" seçerek bize ulaşın.' : 'Reach out by selecting "Writer Application" in the subject.'}
              </p>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6  border border-white/5">
              <h3 className="text-sm font-bold text-white mb-3">{tr ? 'Bizi Takip Edin' : 'Follow Us'}</h3>
              <div className="flex gap-3">
                {['Instagram', 'YouTube', 'Spotify'].map((platform) => (
                  <span key={platform} className="px-3 py-1.5 bg-[#0a0a0b] text-white rounded-lg text-xs font-medium text-zinc-400">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
