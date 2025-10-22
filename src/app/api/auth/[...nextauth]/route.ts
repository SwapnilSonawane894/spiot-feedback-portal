/* eslint-disable @typescript-eslint/no-explicit-any */
import "../../../../lib/env-config";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { userService } from "../../../../lib/mongodb-services";
import { rateLimit, clearRateLimit, sanitizeString } from "../../../../lib/security-utils";

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

        // Remove sensitive data before returning
        const { hashedPassword, ...userWithoutPassword } = user;
        console.log('[Authorize] Returning user:', { id: userWithoutPassword.id, role: userWithoutPassword.role, email: userWithoutPassword.email });
        
        return userWithoutPassword as any;
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
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.email = token.email;
      }
      return session;
    },
  },
  session: { 
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

const handler = (NextAuth as any)(authOptions);
export { handler as GET, handler as POST };
