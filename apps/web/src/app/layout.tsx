import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { GlobalAssistant } from "@/components/assistant/global-assistant";
import { auth } from "@/lib/server/auth";
import { listCategorias, listContas, listUserGestoes } from "@/lib/server/repository";

import "./globals.css";

const heading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lt-cashflow.vercel.app"),
  title: {
    default: "LT CashFlow",
    template: "%s | LT CashFlow",
  },
  description:
    "Gestao financeira compartilhada com foco em clareza, controle de caixa e colaboracao entre membros.",
  openGraph: {
    title: "LT CashFlow",
    description:
      "Gestao financeira compartilhada com foco em clareza, controle de caixa e colaboracao entre membros.",
    type: "website",
    locale: "pt_BR",
    siteName: "LT CashFlow",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const gestoes =
    session?.user?.id ? await listUserGestoes(Number(session.user.id)) : [];
  const gestoesWithContext = await Promise.all(
    gestoes.map(async (gestao) => {
      const [contas, categorias] = await Promise.all([
        listContas(gestao.id),
        listCategorias(gestao.id),
      ]);

      return {
        id: gestao.id,
        nome: gestao.nome,
        contas: contas.map((conta) => ({
          id: conta.id,
          nome: conta.nome,
        })),
        categorias: categorias.map((categoria) => ({
          id: categoria.id,
          nome: categoria.nome,
        })),
      };
    }),
  );

  return (
    <html
      lang="pt-BR"
      className={`${heading.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        {session?.user?.id ? (
          <GlobalAssistant gestoes={gestoesWithContext} />
        ) : null}
      </body>
    </html>
  );
}
