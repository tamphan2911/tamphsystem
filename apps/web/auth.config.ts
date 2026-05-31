import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is only called on sign-in, which happens in server-side API routes
      // where the full auth.ts is used. This stub satisfies the type system for Edge.
      authorize: async () => null,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      try {
        const target = new URL(url);
        const allowedHost =
          target.hostname === "tamph.com" ||
          target.hostname.endsWith(".tamph.com") ||
          target.hostname === "localhost" ||
          target.hostname.endsWith(".localhost") ||
          target.hostname === "127.0.0.1";

        return allowedHost ? target.toString() : baseUrl;
      } catch {
        return baseUrl;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as any).roles;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).roles = token.roles;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
};
