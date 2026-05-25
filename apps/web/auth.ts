import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@repo/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";

// @ts-ignore - NextAuth types are complex and not portable in this monorepo setup
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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

        if (!user.emailVerified) {
          return null;
        }

        // Check if the password matches the hash
        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        // HACK: for our dummy seed data we will let the placeholder password pass if they type "password"
        // IN PRODUCTION: remove the fallback condition
        if (
          isMatch ||
          (user.passwordHash === "hashed_password_placeholder" &&
            credentials.password === "password")
        ) {
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
});
