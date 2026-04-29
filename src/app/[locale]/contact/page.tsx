import { getSiteContact } from '@/lib/site-contact';
import ContactForm from './ContactForm';

/**
 * Contact sayfası — server component. Form interaktif kısmı
 * `ContactForm` (client) içinde; iletişim bilgileri ve sosyal linkler
 * SiteSetting tablosundan Super Admin tarafından yönetiliyor (telefon
 * dahil — boş bırakılırsa hiç render edilmez).
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tr = locale === 'tr';
  const { contact, social } = await getSiteContact();

  return (
    <div className="bg-[#0a0a0b] text-white min-h-screen">
      <section className="bg-zinc-900 pt-24 pb-14">
        <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {tr ? 'İletişim' : 'Contact'}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm max-w-lg">
            {tr
              ? 'Bizimle iletişime geçin. Sorularınızı, önerilerinizi ve işbirliği tekliflerinizi bekliyoruz.'
              : 'Get in touch with us. We welcome your questions, suggestions, and collaboration proposals.'}
          </p>
        </div>
      </section>

      <div className="max-w-[1480px] mx-auto px-6 lg:px-10 xl:px-14 py-14">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Form */}
          <div className="md:col-span-3">
            <ContactForm tr={tr} />
          </div>

          {/* Info Sidebar */}
          <aside
            className="md:col-span-2 space-y-6"
            aria-label={tr ? 'İletişim bilgileri' : 'Contact information'}
          >
            <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5">
              <h3 className="text-sm font-bold text-white mb-4">
                {tr ? 'İletişim Bilgileri' : 'Contact Info'}
              </h3>
              <div className="space-y-4">
                {contact.email && (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">{tr ? 'E-posta' : 'Email'}</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm text-white font-medium hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">{tr ? 'Telefon' : 'Phone'}</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm text-white font-medium hover:underline"
                      >
                        {contact.phoneDisplay || contact.phone}
                      </a>
                    </div>
                  </div>
                )}
                {contact.addressLine && (
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg bg-[#0a0a0b] text-white flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">{tr ? 'Adres' : 'Address'}</p>
                      {contact.addressName && (
                        <p className="text-sm text-white font-medium">{contact.addressName}</p>
                      )}
                      <p className="text-xs text-zinc-500">{contact.addressLine}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 text-white">
              <h3 className="text-sm font-bold mb-2">
                {tr ? 'Yazar Olmak İster misin?' : 'Want to Be a Writer?'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {tr
                  ? 'Akademisyenler, müzik yazarları, araştırmacılar, müzisyenler ve gönüllü yazarlar platformumuza katkıda bulunabilir.'
                  : 'Academics, music writers, researchers, musicians, and volunteer writers can contribute to our platform.'}
              </p>
              <p className="text-[10px] text-zinc-500">
                {tr
                  ? 'Konu alanında "Yazar Başvurusu" seçerek bize ulaşın.'
                  : 'Reach out by selecting "Writer Application" in the subject.'}
              </p>
            </div>

            {social.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5">
                <h3 className="text-sm font-bold text-white mb-3">
                  {tr ? 'Bizi Takip Edin' : 'Follow Us'}
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {social.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0a0a0b] rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-black transition-colors"
                    >
                      {platform.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
