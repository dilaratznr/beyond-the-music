/**
 * Server-side rich-text sanitizer (defence-in-depth). Client-side DOMPurify
 * on render; server sanitize on write (prevent stored XSS). Whitelist matches
 * TipTap StarterKit extensions.
 *
 * Switched from `isomorphic-dompurify` (which pulls in `jsdom` →
 * `html-encoding-sniffer` → `@exodus/bytes` ESM-only) to the pure-JS
 * `sanitize-html` package — no DOM emulation, no ESM/CJS interop crashes
 * on Vercel serverless. API differs but the threat model is identical.
 */
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'sub', 'sup', 'mark',
  'blockquote', 'code', 'pre',
  'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption',
  'span', 'div',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id', 'title'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
};

const BASE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // TipTap never produces these; strip outright at write time.
  disallowedTagsMode: 'discard',
};

export function sanitizeRichText(input: string | null | undefined): string | null {
  if (input == null) return null;
  if (typeof input !== 'string') return null;
  if (input.trim() === '') return null;

  return sanitizeHtml(input, BASE_OPTIONS);
}

/**
 * Render-time sanitizer for the article body. Extends the write-time
 * policy with iframe support for YouTube / Spotify embeds (allowlisted
 * hostnames only — sanitize-html drops anything else).
 */
export function sanitizeArticleHtml(input: string): string {
  return sanitizeHtml(input, {
    ...BASE_OPTIONS,
    allowedTags: [...ALLOWED_TAGS, 'iframe'],
    allowedAttributes: {
      '*': ['class', 'id', 'title', 'target'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      iframe: [
        'src',
        'allow',
        'allowfullscreen',
        'frameborder',
        'width',
        'height',
        'title',
      ],
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
      'open.spotify.com',
    ],
  });
}
