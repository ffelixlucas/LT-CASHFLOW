import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import { requireUser } from "@/lib/server/auth";

import { createOnboardingAction } from "./actions";
import { OnboardingContasBuilder } from "@/components/onboarding/onboarding-contas-builder";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: {
    index: false,
    follow: false,
  },
};

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  const params = await searchParams;

  const error = typeof params.error === "string" ? params.error : null;
  const startDate = todayIso();

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-[2rem] border border-line bg-surface p-4 sm:p-6">
          <form action={createOnboardingAction} className="space-y-2.5 sm:space-y-4">
            <div className="flex justify-center">
              <Link aria-label="LT CashFlow" className="inline-block" href="/">
                <BrandLogo priority variant="onboarding" />
              </Link>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="nome">
                Nome da gestão
              </label>
              <input
                className="w-full rounded-2xl border border-line bg-background px-3 py-2.5 text-sm outline-none sm:px-4 sm:py-3 sm:text-base"
                id="nome"
                name="nome"
                placeholder="Gestão pessoal, família ou empresa"
                required
                type="text"
              />
            </div>

            <input name="tipo" type="hidden" value="pessoal" />
            <input name="inicioEm" type="hidden" value={startDate} />
            <input name="descricao" type="hidden" value="" />

            <OnboardingContasBuilder />

            {error ? <p className="text-sm text-red-700">Revise os dados e tente novamente.</p> : null}

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Criar gestão
            </button>
          </form>

          <p className="mt-3 text-sm text-muted sm:mt-4">
            Depois disso você vai direto para o dashboard. O resto pode ser adicionado depois.
          </p>
        </section>
      </div>

      <div className="mx-auto mt-4 max-w-6xl px-0 sm:mt-6 sm:px-0">
        <Link className="text-sm font-semibold text-foreground" href="/dashboard">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
