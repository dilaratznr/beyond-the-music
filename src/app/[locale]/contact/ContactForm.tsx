'use client';

import { useState } from 'react';

/**
 * İletişim formu — yalnız client davranışı (state + fetch). İletişim
 * bilgileri ve sosyal linkler artık server tarafından page.tsx'te
 * SiteSetting'ten yükleniyor; bu bileşen onları umursamıyor.
 */
export default function ContactForm({ tr }: { tr: boolean }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  });
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
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(
        data.error || (tr ? 'Bir şeyler ters gitti' : 'Something went wrong'),
      );
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div
        className="bg-zinc-900 rounded-2xl p-10 text-center border border-white/5"
        role="status"
        aria-live="polite"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          {tr ? 'Mesajınız iletildi!' : 'Message sent!'}
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          {tr ? 'En kısa sürede size dönüş yapacağız.' : 'We will get back to you soon.'}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors border border-white/10"
        >
          {tr ? 'Yeni Mesaj' : 'New Message'}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={status === 'error' ? 'contact-form-error' : undefined}
      className="bg-zinc-900 rounded-2xl p-8 border border-white/5 space-y-5"
    >
      <h2 className="text-lg font-bold text-white mb-1">
        {tr ? 'Mesaj Gönder' : 'Send a Message'}
      </h2>

      {status === 'error' && (
        <div
          id="contact-form-error"
          role="alert"
          aria-live="assertive"
          className="p-3 bg-red-50 text-red-600 text-xs rounded-lg"
        >
          {errorMsg}
        </div>
      )}

      {/* Honeypot — hidden from users, bots fill it in */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] opacity-0 pointer-events-none"
        style={{ position: 'absolute', left: '-9999px' }}
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
            {tr ? 'Ad Soyad' : 'Full Name'} <span aria-hidden="true">*</span>
            <span className="sr-only">{tr ? '(zorunlu)' : '(required)'}</span>
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-zinc-900"
            required
            maxLength={120}
            placeholder={tr ? 'Adınız' : 'Your name'}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-400 mb-1.5">
            Email <span aria-hidden="true">*</span>
            <span className="sr-only">{tr ? '(zorunlu)' : '(required)'}</span>
          </label>
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-zinc-900"
            required
            maxLength={180}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-xs font-medium text-zinc-400 mb-1.5">
          {tr ? 'Konu' : 'Subject'}
        </label>
        <select
          id="contact-subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-4 py-2.5 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-zinc-900"
        >
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
        <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-400 mb-1.5">
          {tr ? 'Mesaj' : 'Message'} <span aria-hidden="true">*</span>
          <span className="sr-only">{tr ? '(zorunlu)' : '(required)'}</span>
        </label>
        <textarea
          id="contact-message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-3 text-sm border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-zinc-900 resize-none"
          rows={6}
          required
          maxLength={2000}
          aria-describedby="contact-message-count"
          placeholder={tr ? 'Mesajınızı yazın...' : 'Write your message...'}
        />
        <p id="contact-message-count" className="text-right text-[10px] text-zinc-400 mt-1" aria-live="polite">
          {form.message.length}/2000
        </p>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full py-3 bg-emerald-500 text-black rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'sending'
          ? (tr ? 'Gönderiliyor...' : 'Sending...')
          : (tr ? 'Gönder' : 'Send Message')}
      </button>
    </form>
  );
}
