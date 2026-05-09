import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { requireUser } from "@/lib/server/auth";

type EntrarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EntrarPage({ searchParams }: EntrarPageProps) {
  const user = await requireUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const created = params.created === "1";

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
              Entre para criar gestões, contas, categorias e lançamentos.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-line bg-surface p-5 sm:p-8">
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
