import { describe, it, expect } from 'vitest';
import {
  validateImageUrl,
  validateInternalRedirect,
} from '@/lib/url-validation';

/**
 * URL kabul/red davranışı — bunlar render katmanına ulaşmadan önce
 * ÇALIŞTIĞI için tek savunma. Test'ler bilinen XSS/açık-redirect
 * payload'larını pin'liyor.
 */

describe('validateImageUrl', () => {
  it('relative path kabul eder', () => {
    expect(validateImageUrl('/uploads/foo.png').ok).toBe(true);
  });

  it('https:// URL kabul eder', () => {
    expect(validateImageUrl('https://r2.example.com/x.png').ok).toBe(true);
  });

  it('http:// URL kabul eder', () => {
    expect(validateImageUrl('http://localhost:3000/x.png').ok).toBe(true);
  });

  it('javascript: protocol reddeder', () => {
    expect(validateImageUrl('javascript:alert(1)').ok).toBe(false);
  });

  it('data: protocol reddeder', () => {
    expect(validateImageUrl('data:text/html,<script>alert(1)</script>').ok).toBe(
      false,
    );
  });

  it('vbscript: protocol reddeder', () => {
    expect(validateImageUrl('vbscript:msgbox').ok).toBe(false);
  });

  it('file: protocol reddeder', () => {
    expect(validateImageUrl('file:///etc/passwd').ok).toBe(false);
  });

  it('protocol-relative URL reddeder', () => {
    expect(validateImageUrl('//evil.com/x.png').ok).toBe(false);
  });

  it('path traversal reddeder', () => {
    expect(validateImageUrl('/uploads/../../../etc/passwd').ok).toBe(false);
  });

  it('boş string kabul eder (alan boş bırakılabilir)', () => {
    expect(validateImageUrl('').ok).toBe(true);
    expect(validateImageUrl(null).ok).toBe(true);
    expect(validateImageUrl(undefined).ok).toBe(true);
  });

  it('non-string reddeder', () => {
    expect(validateImageUrl(123).ok).toBe(false);
    expect(validateImageUrl({}).ok).toBe(false);
  });
});

describe('validateInternalRedirect', () => {
  it('kendi path\'imize redirect izni verir', () => {
    expect(validateInternalRedirect('/admin/articles')).toBe('/admin/articles');
    expect(validateInternalRedirect('/tr/about')).toBe('/tr/about');
  });

  it('absolute URL\'i fallback\'e atar', () => {
    expect(validateInternalRedirect('https://evil.com')).toBe('/admin/dashboard');
  });

  it('protocol-relative\'i fallback\'e atar', () => {
    expect(validateInternalRedirect('//evil.com/x')).toBe('/admin/dashboard');
  });

  it('backslash injection\'i fallback\'e atar', () => {
    expect(validateInternalRedirect('/\\evil.com')).toBe('/admin/dashboard');
  });

  it('control char injection\'i fallback\'e atar', () => {
    expect(validateInternalRedirect('/admin\nLocation: https://evil.com')).toBe(
      '/admin/dashboard',
    );
  });

  it('path traversal\'i fallback\'e atar', () => {
    expect(validateInternalRedirect('/../etc/passwd')).toBe('/admin/dashboard');
  });

  it('boş input fallback\'e gider', () => {
    expect(validateInternalRedirect('')).toBe('/admin/dashboard');
  });
});
