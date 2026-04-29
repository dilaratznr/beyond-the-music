import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByIdentifier } from './user-lookup';

/**
 * Sabit bir bcrypt hash — kullanıcı bulunamadığında bile compare çalıştırıp
 * yanıt süresinin "user yok" / "user var, şifre yanlış" durumlarında aynı
 * kalmasını sağlıyoruz. Aksi halde saldırgan response time farkından
 * username enumeration yapabilir. Hash boş bir string'in 12-cost bcrypt'i;
 * gerçek kullanıcı şifresiyle eşleşme olasılığı sıfır.
 */
const DUMMY_BCRYPT_HASH =
  '$2a$12$CwTycUXWue0Thq9StjUM0uJ8xkjqg.QQUZpJfMKKpCgz6Nj3KrxmS';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        // identifier: kullanıcı adı veya e-posta (email opsiyonel olduğu için
        // ikisi de kabul ediliyor). Form'da single input olarak gösterilir.
        identifier: { label: 'Kullanıcı adı veya e-posta', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const user = await findUserByIdentifier(credentials.identifier);

        // Constant-time pathing: User yoksa bile bcrypt.compare çalıştır.
        // Kullanıcı yokken hızlı return ettiğimiz eski sürümde saldırgan
        // login response time'ından "bu username DB'de var mı?" bilgisini
        // çıkarabiliyordu. Şimdi her durumda aynı bcrypt maliyetini ödetiyoruz.
        const passwordHash = user?.password ?? DUMMY_BCRYPT_HASH;
        const isValid = await bcrypt.compare(credentials.password, passwordHash);

        // mustSetPassword / isActive kontrollerini de password DOĞRU olunca
        // throw'la — yanlış şifrede de "INVITE_PENDING" / "ACCOUNT_DISABLED"
        // dönersek bu state'ler de timing/error-based enumeration vektörü
        // olur. Yanlış şifre = generic null.
        if (!user || !isValid) {
          return null;
        }

        if (user.mustSetPassword) {
          // NextAuth Credentials provider hata mesajı kullanıcıya iletmeye
          // izin verir — login sayfası özel bir uyarı gösterebilir.
          throw new Error('INVITE_PENDING');
        }

        if (!user.isActive) {
          throw new Error('ACCOUNT_DISABLED');
        }

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        // Pass partial-session marker through to the server-side helpers
        // (auth-guard.requireAuth). Login route writes a JWT with
        // `tfaPending: 'verify' | 'enroll'` when 2FA is required but not
        // yet completed; without exposing this on the session, every API
        // route would happily accept a half-authenticated request.
        (session.user as { tfaPending?: string }).tfaPending =
          (token.tfaPending as string | undefined) ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
