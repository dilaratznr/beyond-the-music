import { describe, it, expect } from 'vitest';
import { sanitizeRichText } from '@/lib/sanitize-html';

/**
 * sanitizeRichText DB'ye yazma yolundaki son savunma — bir editör
 * hesabı kompromize olsa bile <script>/onerror payload'ı DB'ye
 * sızmamalı. Aşağıdaki test'ler bunu pin'liyor.
 *
 * Whitelist'in TipTap'in ürettiği gerçek tag'leri (h2, p, blockquote,
 * a, img) korumasını da garantiliyoruz — aksi halde editör çıktısı
 * sanitize'da kaybolur.
 */
describe('sanitizeRichText', () => {
  it('<script> tag\'ini siler', () => {
    const out = sanitizeRichText('<p>Hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>Hi</p>');
  });

  it('img onerror handler\'ini siler', () => {
    const out = sanitizeRichText('<img src=x onerror="alert(1)">');
    // src=x kalabilir, onerror kalmamalı
    expect(out).not.toContain('onerror');
  });

  it('<iframe> ve <object>\'i siler', () => {
    const out = sanitizeRichText(
      '<p>x</p><iframe src="evil"></iframe><object data="x"></object>',
    );
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('object');
    expect(out).toContain('<p>x</p>');
  });

  it('TipTap\'in ürettiği yapıyı korur', () => {
    const tiptapHtml =
      '<h2>Başlık</h2><p>Düz yazı <strong>kalın</strong>, <em>italik</em></p><ul><li>madde</li></ul><blockquote>alıntı</blockquote>';
    const out = sanitizeRichText(tiptapHtml);
    expect(out).toContain('<h2>Başlık</h2>');
    expect(out).toContain('<strong>kalın</strong>');
    expect(out).toContain('<em>italik</em>');
    expect(out).toContain('<li>madde</li>');
    expect(out).toContain('<blockquote>alıntı</blockquote>');
  });

  it('a href\'i korur ama javascript: protokolünü siler', () => {
    const okLink = sanitizeRichText('<a href="https://example.com">x</a>');
    expect(okLink).toContain('href="https://example.com"');

    const badLink = sanitizeRichText('<a href="javascript:alert(1)">x</a>');
    expect(badLink).not.toContain('javascript:');
  });

  it('null/undefined/boş string için null döner', () => {
    expect(sanitizeRichText(null)).toBe(null);
    expect(sanitizeRichText(undefined)).toBe(null);
    expect(sanitizeRichText('')).toBe(null);
    expect(sanitizeRichText('   ')).toBe(null);
  });
});
