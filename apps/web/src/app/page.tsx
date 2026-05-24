import Link from "next/link";

import { auth } from "@/lib/server/auth";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const session = await auth();

  return (
    <main className="grain relative isolate overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-b from-accent-soft/60 to-transparent" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <Link className="inline-block" href="/" aria-label="LT CashFlow — início">
              <BrandLogo priority variant="hero" />
            </Link>
            <p className="mt-3 max-w-md text-sm text-muted">Controle financeiro familiar em uso.</p>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#fluxo">Fluxo</a>
            <a href="#produto">Produto</a>
            <a href="#acesso">Acesso</a>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <section className="space-y-8">
            <div className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium tracking-[0.18em] text-muted uppercase">
              Dashboard, extrato, cartão e lançamentos manuais
            </div>

            <div className="space-y-6">
              <h1 className="max-w-4xl font-heading text-5xl leading-none font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                LT CashFlow para operar o caixa familiar.
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                A versão atual já tem área autenticada, gestões, contas, categorias,
                lançamentos manuais, conciliação, cartão, reservas e assistente.
                Para adicionar uma entrada ou saída, abra o dashboard e use o botão +.
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
                href={session?.user?.id ? "/entrar" : "/entrar"}
              >
                {session?.user?.id ? "Trocar sessao" : "Entrar"}
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
                  <span className="text-sm text-background/70">Lançamento manual</span>
                  <span className="font-heading text-3xl">Ativo</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-background/70">Assistente e quick-add</span>
                  <span className="font-heading text-3xl">Ativo</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm text-background/70">Conciliação</span>
                  <span className="font-heading text-3xl">Manual</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.25rem] bg-surface-strong p-4">
                <p className="text-xs tracking-[0.18em] text-muted uppercase">Entrada e saída</p>
                <p className="mt-3 text-2xl font-semibold">Botão +</p>
                <p className="mt-2 text-sm text-muted">Novo lançamento fica no menu rápido do dashboard.</p>
              </article>

              <article className="rounded-[1.25rem] bg-surface-strong p-4">
                <p className="text-xs tracking-[0.18em] text-muted uppercase">Área certa</p>
                <p className="mt-3 text-2xl font-semibold">/dashboard</p>
                <p className="mt-2 text-sm text-muted">A página inicial é só entrada pública.</p>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section id="fluxo" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 sm:px-10 lg:grid-cols-3 lg:px-12">
          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Dashboard</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Visão do caixa</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Resumo de entradas, saídas, liquidez, reservas, cartão e últimas movimentações.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Lançamentos</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Entrada e saída manual</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Use o botão + no dashboard para registrar despesa, receita, ajuste ou transferência.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-line bg-background p-6">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Extrato</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold">Conferência e edição</h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Revise movimentações por mês, edite linhas e concilie lançamentos importados.
            </p>
          </article>
        </div>
      </section>

      <section id="produto" className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[1.75rem] bg-foreground p-7 text-background">
            <p className="text-xs tracking-[0.18em] uppercase text-background/70">Gestoes</p>
            <p className="mt-4 text-2xl font-semibold">Uma gestão familiar com membros e permissões.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-surface p-7">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Lancamentos</p>
            <p className="mt-4 text-2xl font-semibold">Criação manual, assistida por IA ou via conciliação.</p>
          </div>
          <div className="rounded-[1.75rem] border border-line bg-surface p-7">
            <p className="text-xs tracking-[0.18em] text-muted uppercase">Auditoria</p>
            <p className="mt-4 text-2xl font-semibold">Histórico financeiro organizado por conta e categoria.</p>
          </div>
        </div>
      </section>

      <section id="acesso" className="mx-auto max-w-7xl px-6 pb-16 sm:px-10 lg:px-12 lg:pb-24">
        <div className="rounded-[2rem] border border-line bg-surface-strong p-8">
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Como abrir a versão atual</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold">
            Rode pela raiz do projeto e acesse o dashboard autenticado.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
            Use pnpm dev em /home/lucas/Documentos/Projetos/LT-CashFlow.
            Se abrir a pasta frontend separada, você verá o template Vite antigo.
          </p>
        </div>
      </section>
    </main>
  );
}
