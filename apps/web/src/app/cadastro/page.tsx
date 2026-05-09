import Link from "next/link";
import Image from "next/image";

import { PasswordField } from "@/components/auth/password-field";
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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden rounded-[2rem] bg-surface-strong p-8 lg:block">
          <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
            <Image
              alt="LT CashFlow"
              className="h-auto w-[180px] max-w-full sm:w-[300px]"
              height={319}
              priority
              sizes="(max-width: 640px) 180px, 300px"
              src="/brand/ltcashflow-logo-horizontal-1-tight.png"
              width={1198}
            />
            <p className="max-w-sm text-sm leading-6 text-muted">
              Crie sua conta para abrir sua primeira gestão.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-surface p-5 sm:p-8">
          <form action={registerAction} className="space-y-3 sm:space-y-4">
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

            <PasswordField
              id="password"
              name="password"
              label="Senha"
              minLength={8}
              placeholder="Crie uma senha"
              required
            />

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Criar conta
            </button>
          </form>

          <p className="mt-4 text-sm text-muted sm:mt-6">
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
