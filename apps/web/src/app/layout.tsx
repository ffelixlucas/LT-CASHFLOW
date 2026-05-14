import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";

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

const SITE_DESCRIPTION =
  "Gestao financeira compartilhada com foco em clareza, controle de caixa e colaboracao entre membros.";

function resolveMetadataBase(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return new URL(fromEnv);
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return new URL(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("https://lt-cashflow.vercel.app");
}

export async function generateMetadata(): Promise<Metadata> {
  let metadataBase: URL;
  try {
    const h = await headers();
    const hostRaw = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const host = (hostRaw.split(",")[0] ?? "").trim();
    const protoRaw = h.get("x-forwarded-proto") ?? "https";
    const proto = (protoRaw.split(",")[0] ?? "https").trim() || "https";
    metadataBase = host ? new URL(`${proto}://${host}`) : resolveMetadataBase();
  } catch {
    metadataBase = resolveMetadataBase();
  }

  return {
    metadataBase,
    title: {
      default: "LT CashFlow",
      template: "%s | LT CashFlow",
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      title: "LT CashFlow",
      description: SITE_DESCRIPTION,
      type: "website",
      locale: "pt_BR",
      siteName: "LT CashFlow",
      images: [{ url: "/brand/ltcashflow-logo-horizontal-1-tight.png", width: 1198, height: 319, alt: "LT CashFlow" }],
    },
  };
}

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
      data-scroll-behavior="smooth"
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
