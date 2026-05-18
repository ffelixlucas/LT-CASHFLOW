"use client";

import { useState } from "react";

import type { fecharSemanaAction } from "./actions";

type ContaSelecionavel = { id: number; nome: string };

type FecharSemanaFormProps = {
  gestaoId: number;
  inicio: string;
  fim: string;
  entradasSemana: number;
  saidasCorrenteSemana: number;
  comprasCartaoSemana: number;
  pagamentoFaturaSugerido: number;
  reservasDisponiveis: ContaSelecionavel[];
  contasCorrente: ContaSelecionavel[];
  contaOrigemPadraoId: number | null;
  action: typeof fecharSemanaAction;
};

function moedaBR(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseNumber(raw: string) {
  if (raw === "") return 0;
  const normalized = raw.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
        {n}
      </span>
      <h3 className="font-heading text-base font-semibold">{title}</h3>
    </div>
  );
}

export function FecharSemanaForm({
  gestaoId,
  inicio,
  fim,
  entradasSemana,
  saidasCorrenteSemana,
  comprasCartaoSemana,
  pagamentoFaturaSugerido,
  reservasDisponiveis,
  contasCorrente,
  contaOrigemPadraoId,
  action,
}: FecharSemanaFormProps) {
  const [cartaoStr, setCartaoStr] = useState(comprasCartaoSemana.toFixed(2));
  const [faturaStr, setFaturaStr] = useState(
    pagamentoFaturaSugerido > 0 ? pagamentoFaturaSugerido.toFixed(2) : "",
  );
  const [reservas, setReservas] = useState<Record<number, string>>(() =>
    Object.fromEntries(reservasDisponiveis.map((c) => [c.id, "0.00"])),
  );
  const [apenasSnapshot, setApenasSnapshot] = useState(false);
  const [contaOrigemId, setContaOrigemId] = useState(() => contaOrigemPadraoId ?? contasCorrente[0]?.id ?? 0);

  const cartao = parseNumber(cartaoStr);
  const pagamentoFatura = parseNumber(faturaStr);
  const reservasArr = reservasDisponiveis.map((c) => ({ ...c, valor: parseNumber(reservas[c.id] ?? "0") }));
  const totalReserva = reservasArr.reduce((acc, r) => acc + r.valor, 0);
  const contasReservaPreenchidas = reservasArr.filter((r) => r.valor > 0);

  const sobraOperacional = entradasSemana - saidasCorrenteSemana - cartao;
  const sobraEmCaixa = sobraOperacional - pagamentoFatura - totalReserva;
  const sobraTipo =
    Math.abs(sobraEmCaixa) < 0.005 ? "zerada" : sobraEmCaixa > 0 ? "aporte" : "resgate";
  const sobraAbs = Math.round(Math.abs(sobraEmCaixa) * 100) / 100;

  const detalhesReserva = contasReservaPreenchidas
    .map((r) => `${r.nome}: ${moedaBR(r.valor)}`)
    .join("; ");

  const sobraBoxClass =
    sobraTipo === "zerada"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : sobraTipo === "aporte"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-rose-500/40 bg-rose-500/10";

  const conferenciaClass =
    sobraTipo === "zerada"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : sobraTipo === "aporte"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-rose-500/40 bg-rose-500/5";

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="gestaoId" value={gestaoId} />
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fim" value={fim} />
      <input type="hidden" name="comprasCartaoRegistro" value={cartao.toFixed(2)} />
      <input type="hidden" name="contaCorrenteId" value={contaOrigemId || ""} />
      <input type="hidden" name="reservarValorTotal" value={totalReserva.toFixed(2)} />
      <input type="hidden" name="apenasSnapshot" value={apenasSnapshot ? "on" : ""} />
      <input
        type="hidden"
        name="transferenciasReserva"
        value={JSON.stringify(
          contasReservaPreenchidas.map((r) => ({
            contaOrigemId,
            contaDestinoId: r.id,
            valor: r.valor,
          })),
        )}
      />
      <input
        type="hidden"
        name="reservasPorConta"
        value={JSON.stringify(
          contasReservaPreenchidas.map((r) => ({
            contaId: r.id,
            nome: r.nome,
            valor: Math.round(r.valor * 100) / 100,
          })),
        )}
      />
      <input type="hidden" name="detalhesReserva" value={detalhesReserva} />

      <article className="rounded-[1.2rem] border border-line bg-background/60 p-4">
        <StepHeader n={1} title="Cartão — gasto da semana" />
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Compras no cartão com data nesta semana (registro no snapshot). Não é o pagamento da fatura na
          corrente.
        </p>
        <label className="mt-3 block max-w-xs">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted">Gasto no cartão (registro)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            autoComplete="off"
            value={cartaoStr}
            onChange={(e) => setCartaoStr(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
          />
        </label>
      </article>

      <article className="rounded-[1.2rem] border border-line bg-background/60 p-4">
        <StepHeader n={2} title="Fatura — pagamento na corrente" />
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Quanto <strong className="text-foreground">saiu da corrente</strong> para pagar a fatura neste
          fechamento. O LT cria o lançamento no extrato (atualiza a{" "}
          <strong className="text-foreground">Liquidez</strong>).
        </p>
        <label className="mt-3 block max-w-xs">
          <span className="block text-xs uppercase tracking-[0.18em] text-muted">Pagamento de fatura</span>
          <input
            type="number"
            step="0.01"
            min="0"
            name="pagamentoFatura"
            autoComplete="off"
            value={faturaStr}
            onChange={(e) => setFaturaStr(e.target.value)}
            placeholder="0,00"
            className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
          />
        </label>
        {pagamentoFaturaSugerido > 0 ? (
          <p className="mt-2 text-xs text-muted">
            Sugestão do extrato nesta semana: {moedaBR(pagamentoFaturaSugerido)} (ajuste se pagou outro valor).
          </p>
        ) : null}
      </article>

      <article className="rounded-[1.2rem] border border-line bg-background/60 p-4">
        <StepHeader n={3} title="Reservas — quanto guardou em cada" />
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Aplicações da corrente para poupança neste fechamento. O LT registra uma transferência por reserva
          com valor maior que zero.
        </p>

        <SobraEmCaixaBox
          sobraTipo={sobraTipo}
          sobraAbs={sobraAbs}
          sobraOperacional={sobraOperacional}
          pagamentoFatura={pagamentoFatura}
          totalReserva={totalReserva}
          className={sobraBoxClass}
        />

        {reservasDisponiveis.length === 0 ? (
          <p className="mt-3 text-sm text-rose-700">
            Você não tem contas de reserva cadastradas (poupança ou investimento). Cadastre antes de fechar.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {reservasDisponiveis.map((conta) => (
              <label key={conta.id} className="flex flex-wrap items-center gap-3">
                <span className="min-w-[180px] flex-1 text-sm">{conta.nome}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoComplete="off"
                  value={reservas[conta.id] ?? "0"}
                  onChange={(e) =>
                    setReservas((prev) => ({ ...prev, [conta.id]: e.target.value }))
                  }
                  className="w-32 rounded-2xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </label>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
              <span className="text-muted">Total guardado</span>
              <strong>{moedaBR(totalReserva)}</strong>
            </div>
          </div>
        )}

        {contasCorrente.length > 1 ? (
          <label className="mt-3 block max-w-xs">
            <span className="block text-xs uppercase tracking-[0.18em] text-muted">Sai da conta</span>
            <select
              value={contaOrigemId || ""}
              onChange={(e) => setContaOrigemId(Number(e.target.value))}
              className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
            >
              {contasCorrente.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </article>

      <article className={`rounded-[1.2rem] border p-4 ${conferenciaClass}`}>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Conferência em caixa</p>
        <p className="mt-1 text-base leading-relaxed">
          {sobraTipo === "zerada" ? (
            <>
              Corrente <strong className="text-emerald-700">fecha zerada</strong> com fatura + reservas
              informadas. Pode prosseguir.
            </>
          ) : sobraTipo === "aporte" ? (
            <>
              Ainda sobrariam <strong className="text-amber-800">{moedaBR(sobraAbs)}</strong> na corrente —
              ajuste fatura ou reservas, ou prossiga se for intencional.
            </>
          ) : (
            <>
              Faltam <strong className="text-rose-700">{moedaBR(sobraAbs)}</strong> na corrente para bater com
              o que você moveu no banco. Revise fatura e reservas.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Resultado da semana {moedaBR(sobraOperacional)} − fatura {moedaBR(pagamentoFatura)} − reservas{" "}
          {moedaBR(totalReserva)} = {moedaBR(sobraEmCaixa)} na corrente.
        </p>
      </article>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-line bg-background px-4 py-3">
        <input
          type="checkbox"
          checked={apenasSnapshot}
          onChange={(e) => setApenasSnapshot(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-line"
        />
        <span className="text-sm leading-snug">
          <strong className="text-foreground">Já fiz tudo no banco antes</strong> — marca que o Pix já saiu no
          Inter; o LT ainda registra fatura e reservas aqui para o extrato e a Liquidez ficarem corretos.
        </span>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-[0.18em] text-muted">Observações (opcional)</span>
        <textarea
          name="observacoes"
          rows={2}
          placeholder="ex.: paguei a fatura em um único Pix; guardei 10% na objetivo..."
          className="mt-2 w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
        >
          Fechar semana
        </button>
        <p className="text-xs text-muted max-w-md">
          Grava o snapshot e registra no extrato: pagamento de fatura (se informado) e uma transferência por
          reserva preenchida.
        </p>
      </div>
    </form>
  );
}

function SobraEmCaixaBox({
  sobraTipo,
  sobraAbs,
  sobraOperacional,
  pagamentoFatura,
  totalReserva,
  className,
}: {
  sobraTipo: "zerada" | "aporte" | "resgate";
  sobraAbs: number;
  sobraOperacional: number;
  pagamentoFatura: number;
  totalReserva: number;
  className: string;
}) {
  return (
    <div className={`mt-3 rounded-[1rem] border px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        {sobraTipo === "resgate" ? "Faltou na corrente" : "Sobra em caixa (modelo caderno)"}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {sobraTipo === "resgate" ? `− ${moedaBR(sobraAbs)}` : moedaBR(sobraAbs)}
      </p>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Resultado da semana {moedaBR(sobraOperacional)} − fatura {moedaBR(pagamentoFatura)} − reservas{" "}
        {moedaBR(totalReserva)}.
      </p>
    </div>
  );
}
