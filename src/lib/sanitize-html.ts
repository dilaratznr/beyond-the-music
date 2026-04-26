/**
 * Server-side rich-text sanitizer.
 *
 * TipTap ürettiği HTML'i DB'ye yazmadan ÖNCE buradan geçiriyoruz —
 * defence-in-depth. Render anında da (article slug page) DOMPurify
 * çalışıyor; ama bir editör hesabı ele geçirilirse stored XSS'in
 * Admin önizlemelerine bile sızmaması için yazma katmanında da
 * kesiyoruz. isomorphic-dompurify hem Node hem edge runtime'ında
 * çalışır.
 *
 * Whitelist'i TipTap'in StarterKit + custom extension setine göre
 * tutuyoruz — eklenen yeni bir node (örn. embed) varsa burayı da
 * güncelle, aksi halde editörde göründüğü gibi DB'ye gitmez.
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
    // TipTap output'u hiçbir zaman <script>/<style>/<iframe>/eventattr
    // üretmiyor — buradaki kapatma sadece bypass denemelerine karşı.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  });
}
