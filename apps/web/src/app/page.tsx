import Link from "next/link";

import { auth } from "@/lib/server/auth";

export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const session = await auth();

  return (
    <main className="grain relative isolate overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-accent-soft/60 to-transparent" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <div>
            <p className="font-heading text-lg font-semibold tracking-[0.2em] uppercase">
              LT CashFlow
            </p>
            <p className="text-sm text-muted">Base oficial da nova plataforma financeira.</p>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#stack">Stack</a>
            <a href="#produto">Produto</a>
            <a href="#proximo-passo">Proximo passo</a>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <section className="space-y-8">
            <div className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Monolito modular, SEO nativo e design system proprio
            </div>

            <div className="space-y-6">
              <h1 className="max-w-4xl font-heading text-5xl leading-none font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                Controle financeiro compartilhado, sem planilha improvisada.
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                O LT CashFlow entra agora em execucao sobre a stack oficial: Next.js,
                TypeScript, Tailwind, Drizzle e MySQL. A base esta pronta para auth,
                gestoes, membros, lancamentos e relatorios.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                href={session?.user?.id ? "/dashboard" : "/cadastro"}
                style={{ color: "#ffffff" }}
              >
                {session?.user?.id ? "Abrir dashboard" : "Criar conta"}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-foreground"
                href={session?.user?.id ? "/entrar" : "#stack"}
              >
                {session?.user?.id ? "Trocar sessao" : "Ver stack oficial"}
              </Link>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_24px_80px_rgba(30,42,47,0.08)]">
            <div className="rounded-[1.5rem] bg-foreground p-5 text-background">
              <p className="font-mono text-xs tracking-[0.18em] uppercase text-background/70">
                Estado da base
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-end justify-between">
                  <span className="text-sm text-background/70">Frontend oficial</span>
                  <span className="font-heading text-3xl">Next.js 16</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-background/70">Banco e modelagem</span>
                  <span className="font-heading text-3xl">MySQL + Drizzle</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-background/70">UI</span>
                  <span className="font-heading text-3xl">Tailwind</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.25rem] bg-surface-strong p-4">
                <p className="text-xs tracking-[0.18em] text-muted uppercase">Modelagem</p>
                <p className="mt-3 text-2xl font-semibold">11 tabelas</p>
                <p className="mt-2 text-sm text-muted">Gestoes, membros, contas, categorias e auditoria.</p>
              </article>

              <article className="rounded-[1.25rem] bg-surface-strong p-4">
                <p className="text-xs tracking-[0.18em] text-muted uppercase">Proximo modulo</p>
                <p className="mt-3 text-2xl font-semibold">Auth + Gestoes</p>
                <p className="mt-2 text-sm text-muted">Primeira entrega funcional do dominio real.</p>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section id="stack" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 sm:px-10 lg:grid-cols-3 lg:px-12">
          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">App</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Next.js App Router</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              SEO nativo, metadata, sitemap, SSR e estrutura pronta para area publica e area autenticada.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Dados</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Drizzle + MySQL</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              SQL proximo do dominio, tipagem forte e manutencao mais racional para quem esta aprendendo.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Interface</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Tailwind + sistema proprio</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Mais controle visual, melhor reaproveitamento e menos dependencias de tema pronto.
            </p>
          </article>
        </div>
      </section>

      <section id="produto" className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[1.75rem] bg-foreground p-7 text-background">
            <p className="text-xs tracking-[0.18em] uppercase text-background/70">Gestoes</p>
            <p className="mt-4 text-2xl font-semibold">Uma pessoa, varias gestoes, varios membros.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-surface p-7">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Lancamentos</p>
            <p className="mt-4 text-2xl font-semibold">Rateio real entre participantes, sem gambiarra.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-surface p-7">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Auditoria</p>
            <p className="mt-4 text-2xl font-semibold">Rastreabilidade desde a primeira versao funcional.</p>
          </div>
        </div>
      </section>

      <section id="proximo-passo" className="mx-auto max-w-7xl px-6 pb-16 sm:px-10 lg:px-12 lg:pb-24">
        <div className="rounded-[2rem] border border-line bg-surface-strong p-8">
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Proximo passo imediato</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold">
            Implementar autenticacao e criacao de gestoes sobre a base nova.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
            Esta entrega fecha a primeira espinha dorsal do sistema: usuario autentica,
            cria a propria gestao e passa a ter uma base real para contas, categorias e lancamentos.
          </p>
        </div>
      </section>
    </main>
  );
}
