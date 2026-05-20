import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }
        
        // Check if the password matches the hash
        const isMatch = await bcrypt.compare(credentials.password as string, user.passwordHash);
        
        // HACK: for our dummy seed data we will let the placeholder password pass if they type "password"
        // IN PRODUCTION: remove the fallback condition
        if (isMatch || (user.passwordHash === 'hashed_password_placeholder' && credentials.password === 'password')) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add custom claims to the JWT token
      if (user) {
        token.roles = (user as any).roles;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Make custom claims available on the client session object
      if (token && session.user) {
        (session.user as any).roles = token.roles;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // Custom login page
  },
  trustHost: true,
});
