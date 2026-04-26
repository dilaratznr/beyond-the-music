import { describe, it, expect } from 'vitest';
import { detectImageMime } from '@/lib/file-validation';

/**
 * Magic-byte detection — saldırgan `Content-Type: image/png` header'ı
 * gönderse bile, içerik gerçekten PNG değilse reject ediliyor mu?
 *
 * detectImageMime PURE — `validateImageBuffer` sharp'a bağımlı (test
 * environment'ında sharp native binary'si optimize edilmemiş olabilir
 * → flake), o yüzden burada sadece magic-byte tarafını test ediyoruz.
 */
describe('detectImageMime', () => {
  it('JPEG signature\'i tanır', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageMime(buf)).toBe('image/jpeg');
  });

  it('PNG signature\'i tanır', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    expect(detectImageMime(buf)).toBe('image/png');
  });

  it('GIF signature\'i tanır', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectImageMime(buf)).toBe('image/gif');
  });

  it('WebP signature\'i tanır (RIFF...WEBP)', () => {
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // size
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('SVG (XML) reddedilir — null döner', () => {
    const buf = Buffer.from('<?xml version="1.0"?><svg></svg>', 'utf-8');
    expect(detectImageMime(buf)).toBe(null);
  });

  it('PHP shell payload\'i (tek başına) reddedilir', () => {
    const buf = Buffer.from('<?php system($_GET["cmd"]); ?>', 'utf-8');
    expect(detectImageMime(buf)).toBe(null);
  });

  it('PHP gizli .png — header PNG ama içerik değil → tanınır ama biz validation hattında reject ediyoruz', () => {
    // GERÇEK PNG header'ı + payload
    const fakePng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('<?php evil(); ?>', 'utf-8'),
    ]);
    // detectImageMime "PNG" der ama validateImageBuffer sharp metadata'da
    // bozuk image diye reject eder. Bu test sadece detection katmanını
    // pin'liyor — full pipeline e2e'de test ediliyor.
    expect(detectImageMime(fakePng)).toBe('image/png');
  });

  it('rastgele binary reddedilir', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    expect(detectImageMime(buf)).toBe(null);
  });

  it('boş buffer için null', () => {
    expect(detectImageMime(Buffer.alloc(0))).toBe(null);
  });
});
