import Link from "next/link";

import { registerAction } from "./actions";

type CadastroPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const messages: Record<string, string> = {
  invalid: "Revise os dados informados e tente novamente.",
  email: "Ja existe um usuario com esse email.",
};

export default async function CadastroPage({ searchParams }: CadastroPageProps) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? messages[params.error] : null;

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-foreground p-8 text-background">
          <p className="text-xs tracking-[0.18em] uppercase text-background/70">Primeiro acesso</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold">Crie sua conta no LT CashFlow</h1>
          <p className="mt-4 text-base leading-7 text-background/80">
            O cadastro libera a criacao da sua primeira gestao e o uso do dashboard financeiro.
          </p>
        </section>

        <section className="rounded-[2rem] border border-line bg-surface p-8">
          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="nome">
                Nome
              </label>
              <input
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none"
                id="nome"
                name="nome"
                type="text"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none"
                id="email"
                name="email"
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Senha
              </label>
              <input
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none"
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Criar conta
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            Ja tem acesso?{" "}
            <Link className="font-semibold text-foreground" href="/entrar">
              Entrar
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
