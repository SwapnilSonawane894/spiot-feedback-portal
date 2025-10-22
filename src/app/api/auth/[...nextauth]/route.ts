/* eslint-disable @typescript-eslint/no-explicit-any */
import "../../../../lib/env-config";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { userService } from "../../../../lib/mongodb-services";
import { rateLimit, clearRateLimit, sanitizeString, validatePassword } from "../../../../lib/security-utils";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = sanitizeString(credentials.email).toLowerCase();
        
        if (!rateLimit(email, 5, 15 * 60 * 1000)) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        try {
          validatePassword(credentials.password);
        } catch {
          throw new Error("Invalid credentials");
        }

        const user = await userService.findUnique({ 
          email: email
        });
        
        if (!user || !user.hashedPassword) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        clearRateLimit(email);

        return user as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = (user as any).id ?? token.id;
        token.role = (user as any).role ?? token.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  session: { 
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60,
  },
  cookies: process.env.NODE_ENV === 'production' ? {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  } : {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

const handler = (NextAuth as any)(authOptions);
export { handler as GET, handler as POST };
