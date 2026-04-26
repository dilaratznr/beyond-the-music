/**
 * Server-side rich-text sanitizer (defence-in-depth). Client-side DOMPurify
 * on render; server sanitize on write (prevent stored XSS). Whitelist matches
 * TipTap StarterKit extensions.
 */
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
  'blockquote', 'code', 'pre',
  'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption',
  'span', 'div',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'id',
];

export function sanitizeRichText(input: string | null | undefined): string | null {
  if (input == null) return null;
  if (typeof input !== 'string') return null;
  if (input.trim() === '') return null;

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // TipTap never produces these; forbid as defense-in-depth vs bypass attempts.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  });
}
