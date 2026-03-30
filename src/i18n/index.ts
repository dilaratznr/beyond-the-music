import tr from './tr.json';
import en from './en.json';

const dictionaries: Record<string, typeof tr> = { tr, en };

export function getDictionary(locale: string) {
  return dictionaries[locale] || dictionaries.tr;
}

export type Dictionary = typeof tr;
