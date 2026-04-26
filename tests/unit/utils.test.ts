import { describe, it, expect } from 'vitest';
import { slugify, cn } from '@/lib/utils';

/**
 * slugify rota üretiminde kullanılıyor — TR karakter dönüşümünün ve
 * `--` collision normalize'ının bozulmaması kritik. URL'lerde bu
 * fonksiyonun çıktısı `unique slug` olarak DB'ye yazıldığı için
 * regression bug'ı broken-link production'a sızabilir.
 */
describe('slugify', () => {
  it('basit ASCII string\'i lowercase + tire yapar', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('TR karakterleri ASCII karşılıklarına çevirir', () => {
    expect(slugify('Üç şişe gümüş')).toBe('uc-sise-gumus');
    expect(slugify('İlk Çağ')).toBe('ilk-cag');
  });

  it('art arda gelen tireleri tek tireye indirger', () => {
    expect(slugify('foo--bar')).toBe('foo-bar');
    expect(slugify('a   b')).toBe('a-b');
  });

  it('baş/son tireleri kırpar', () => {
    expect(slugify(' foo ')).toBe('foo');
    expect(slugify('--foo--')).toBe('foo');
  });

  it('alfanumerik olmayan karakterleri siler', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('AC/DC')).toBe('acdc');
  });
});

describe('cn', () => {
  it('truthy class\'leri birleştirir, falsy\'leri atar', () => {
    expect(cn('a', 'b')).toBe('a b');
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });

  it('hiçbir class yoksa boş string döner', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});
