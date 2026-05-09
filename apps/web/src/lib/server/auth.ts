import "server-only";

import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { signInSchema } from "@ltcashflow/validation";

import { findUserByEmail, findUserById } from "./repository";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/entrar",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email);

        if (!user) {
          return null;
        }

        const isValid = await compare(parsed.data.password, user.senha_hash);

        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.nome,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }

      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await findUserById(Number(session.user.id));

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
  };
}
