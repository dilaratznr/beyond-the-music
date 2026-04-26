/**
 * Client-side auto-translate helper (TR ↔ EN). Called on submit if target
 * field empty. Failures swallowed (convenience only). Parallel fetches.
 */

export interface TranslateOptions {
  /** Default: 'en'. Source language is inferred as the other of the pair. */
  target?: 'en' | 'tr';
  /** When true, the endpoint is told to preserve HTML tags. */
  html?: boolean;
}

export async function translate(
  text: string,
  opts: TranslateOptions = {},
): Promise<string> {
  const input = text?.trim();
  if (!input) return '';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target: opts.target ?? 'en',
        html: opts.html === true,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { translated?: string };
    return typeof data.translated === 'string' ? data.translated : '';
  } catch {
    return '';
  }
}

/**
 * A bilingual field pair. `sourceText` and `targetText` are the current values
 * on the form; `html` marks rich-text fields (articles), `target` indicates
 * which side is the empty one we're filling.
 */
export interface TranslatePair {
  key: string;
  sourceText: string;
  targetText: string;
  html?: boolean;
  /** Which language we're translating *to*. Default 'en' (TR → EN). */
  target?: 'en' | 'tr';
}

/**
 * Filters the pairs down to those that actually need a translation (source has
 * content, target is empty), then translates them in parallel. Returns a map
 * keyed by `pair.key` with the newly-filled target values. Pairs that didn't
 * need translation (or that failed) are omitted from the result.
 */
export async function translatePairs(
  pairs: TranslatePair[],
): Promise<Record<string, string>> {
  const todo = pairs.filter(
    (p) => p.sourceText?.trim() && !p.targetText?.trim(),
  );
  if (todo.length === 0) return {};

  const results = await Promise.all(
    todo.map(async (p) => {
      const translated = await translate(p.sourceText, {
        target: p.target ?? 'en',
        html: p.html,
      });
      return [p.key, translated] as const;
    }),
  );

  const out: Record<string, string> = {};
  for (const [key, value] of results) {
    if (value) out[key] = value;
  }
  return out;
}
