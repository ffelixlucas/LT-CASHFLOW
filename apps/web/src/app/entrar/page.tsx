import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { auth } from "@/lib/server/auth";

type EntrarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const created = params.created === "1";

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-surface-strong p-8">
          <p className="text-xs tracking-[0.18em] uppercase text-muted">Acesso</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold">Entre para usar seu caixa compartilhado</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            A partir daqui voce pode criar gestoes, contas, categorias e lancamentos.
          </p>
        </section>

        <section className="rounded-[2rem] border border-line bg-surface p-8">
          {created ? (
            <p className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">
              Conta criada com sucesso. Agora e so entrar.
            </p>
          ) : null}

          <SignInForm />

          <p className="mt-6 text-sm text-muted">
            Ainda nao tem conta?{" "}
            <Link className="font-semibold text-foreground" href="/cadastro">
              Criar agora
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
