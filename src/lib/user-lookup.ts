import prisma from './prisma';

/**
 * Login identifier (username veya email) ile kullanıcıyı bul.
 *
 * `@` içeriyorsa email olarak ele alınır (lowercase + trim), aksi halde
 * username olarak (lowercase + trim — schema unique key sensitive).
 * Her iki branch de tek bir DB call yapar.
 */
export async function findUserByIdentifier(rawIdentifier: string) {
  const identifier = rawIdentifier.trim();
  if (!identifier) return null;

  const isEmail = identifier.includes('@');
  if (isEmail) {
    return prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  }
  return prisma.user.findUnique({
    where: { username: identifier.toLowerCase() },
  });
}

/** Username format kontrolü — `^[a-z0-9_-]{3,30}$` */
export const USERNAME_FORMAT = /^[a-z0-9_-]{3,30}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_FORMAT.test(value);
}
