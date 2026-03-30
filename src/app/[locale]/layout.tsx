import { getDictionary } from '@/i18n';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import AiChat from '@/components/public/AiChat';
import TopLoader from '@/components/public/TopLoader';
import SmoothScroll from '@/components/public/SmoothScroll';

export async function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Beyond The Music - Küratöryel Müzik Platformu' : 'Beyond The Music - Curated Music Platform',
    description: locale === 'tr' ? 'Müziğin ötesindeki kültürü keşfeden küratöryel platform' : 'A curatorial platform exploring the culture beyond music',
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className="min-h-screen flex flex-col">
      <TopLoader />
      <SmoothScroll>
        <Navbar locale={locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} />
      </SmoothScroll>
      <AiChat locale={locale} />
    </div>
  );
}
