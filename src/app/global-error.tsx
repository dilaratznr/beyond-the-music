'use client';

/**
 * Root error boundary — sadece RootLayout'un kendisi crash ettiğinde çalışır
 * (locale layout'u, providers'ı, tüm tree'yi etkileyen kritik bir hata).
 * Locale altındaki normal hatalar `[locale]/error.tsx` ile yakalanır.
 *
 * Bu sayfa kendi `<html>` ve `<body>` tag'lerini yazmak zorunda — root
 * layout yüklenmemiş olabilir. Stiller external CSS'e bağlı olamaz; inline
 * minimum.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0a0a0b',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.3em',
              color: '#71717a',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            Critical error
          </p>
          <h1
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              lineHeight: 1,
              fontWeight: 700,
              marginBottom: '20px',
              letterSpacing: '-0.02em',
            }}
          >
            Something went very wrong
          </h1>
          <p
            style={{
              color: '#a1a1aa',
              fontSize: '15px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            The site failed to load. Please try again, or come back in a moment.
          </p>
          {error?.digest && (
            <p
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '10px',
                color: '#52525b',
                marginBottom: '28px',
                wordBreak: 'break-all',
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
