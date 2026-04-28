import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByIdentifier } from './user-lookup';

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

        if (!user) {
          return null;
        }

        // Davet akışı bekleyen hesap — şifre hiçbir zaman set edilmedi,
        // placeholder hash'le doldurulmuş. Bcrypt compare bile doğruyu
        // söyleyemeyecek kadar güçsüz bir güvenlik olurdu (teorik olarak
        // random hash ile çakışma sıfır, ama yine de açıkça blokluyoruz).
        if (user.mustSetPassword) {
          // NextAuth Credentials provider hata mesajı kullanıcıya iletmeye
          // izin verir — login sayfası özel bir uyarı gösterebilir.
          throw new Error('INVITE_PENDING');
        }

        if (!user.isActive) {
          throw new Error('ACCOUNT_DISABLED');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
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
