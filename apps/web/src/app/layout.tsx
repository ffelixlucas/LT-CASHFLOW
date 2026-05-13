import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import { GlobalAssistant } from "@/components/assistant/global-assistant";
import type { GestaoOption } from "@/components/assistant/global-assistant";
import { ScrollPreserver } from "@/components/ui/scroll-preserver";
import { auth } from "@/lib/server/auth";
import { listCategorias, listContas, listUserGestoes } from "@/lib/server/repository";

import "./globals.css";

async function gestoesForAssistant(userId: number): Promise<GestaoOption[]> {
  const gestoes = await listUserGestoes(userId);

  return Promise.all(
    gestoes.map(async (g) => {
      const [contas, categorias] = await Promise.all([listContas(g.id), listCategorias(g.id)]);

      return {
        id: g.id,
        nome: g.nome,
        contas: contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })),
        categorias: categorias.map((c) => ({ id: c.id, nome: c.nome, natureza: c.natureza })),
      };
    }),
  );
}

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
  const assistantGestoes =
    session?.user?.id ? await gestoesForAssistant(Number(session.user.id)) : [];

  return (
    <html
      lang="pt-BR"
      className={`${heading.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ScrollPreserver />
        {children}
        {session?.user?.id ? <GlobalAssistant gestoes={assistantGestoes} /> : null}
      </body>
    </html>
  );
}
