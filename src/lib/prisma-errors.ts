import { NextResponse } from 'next/server';

/**
 * Prisma'nın "known request error" objesini insan-okunur bir JSON
 * yanıta çevirir. POST/PUT handler'larındaki try/catch'lerin son
 * adımı — kullanıcı isteğinin tutarsız olduğu hallerde (unique
 * constraint, foreign key, vs.) 500 HTML yerine 4xx JSON döndürür.
 *
 * Önceden bu olmuyordu — Next.js default error handler HTML error
 * page'i basıyordu, client `await res.json()`'da SyntaxError alıyor,
 * setSubmitting(false) hiç çalışmıyor, form sonsuza kadar
 * "Kaydediliyor..." takılıyordu.
 *
 * Kullanım:
 *   try {
 *     const created = await prisma.X.create({ data: ... });
 *     ...
 *   } catch (err) {
 *     return prismaErrorResponse(err, 'X oluşturulamadı');
 *   }
 */
export function prismaErrorResponse(
  err: unknown,
  fallbackMessage: string,
): NextResponse {
  console.error('[prisma]', err);
  const e = err as { code?: string; meta?: { target?: string[]; field_name?: string } };

  // P2002: unique constraint violation. meta.target genelde kolon adı
  // array'i (örn. ['slug']).
  if (e?.code === 'P2002') {
    const target = e.meta?.target?.join(', ') || 'alan';
    return NextResponse.json(
      { error: `Bu ${target} zaten kullanılıyor. Farklı bir değer deneyin.` },
      { status: 409 },
    );
  }

  // P2003: foreign key constraint — genelde silinen bir parent'a
  // ref vermeye çalışılıyor (örn. parentId hâlâ DB'de yok).
  if (e?.code === 'P2003') {
    const field = e.meta?.field_name || 'ilişkili alan';
    return NextResponse.json(
      { error: `Geçersiz ${field}: referans bulunamadı.` },
      { status: 400 },
    );
  }

  // P2025: record not found — update/delete'de hedef yok.
  if (e?.code === 'P2025') {
    return NextResponse.json(
      { error: 'Kayıt bulunamadı. Sayfayı yenileyip tekrar deneyin.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
