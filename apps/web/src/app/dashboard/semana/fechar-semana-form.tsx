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

export function FecharSemanaForm({
  gestaoId,
  inicio,
  fim,
  entradasSemana,
  saidasCorrenteSemana,
  comprasCartaoSemana,
  reservasDisponiveis,
  contasCorrente,
  contaOrigemPadraoId,
  action,
}: FecharSemanaFormProps) {
  const [cartaoStr, setCartaoStr] = useState<string>(comprasCartaoSemana.toFixed(2));
  const [reservas, setReservas] = useState<Record<number, string>>(() =>
    Object.fromEntries(reservasDisponiveis.map((c) => [c.id, "0.00"])),
  );
  const [apenasSnapshot, setApenasSnapshot] = useState(false);
  const [contaOrigemId, setContaOrigemId] = useState<number>(() => {
    const first = contasCorrente[0]?.id ?? 0;
    return contaOrigemPadraoId ?? first;
  });

  const cartao = parseNumber(cartaoStr);
  const reservasArr = reservasDisponiveis.map((c) => ({ ...c, valor: parseNumber(reservas[c.id] ?? "0") }));
  const totalReserva = reservasArr.reduce((acc, r) => acc + r.valor, 0);
  const contasReservaPreenchidas = reservasArr.filter((r) => r.valor > 0);

  /** Sobra que precisa ser distribuída nas reservas para a semana fechar zerada. */
  const sobraSemReservas = entradasSemana - saidasCorrenteSemana - cartao;
  const restoAposReservas = sobraSemReservas - totalReserva;
  const sobraTipo =
    Math.abs(restoAposReservas) < 0.005 ? "zerada" : restoAposReservas > 0 ? "aporte" : "resgate";
  const sobraAbs = Math.round(Math.abs(restoAposReservas) * 100) / 100;

  const detalhesReserva = contasReservaPreenchidas
    .map((r) => `${r.nome}: ${moedaBR(r.valor)}`)
    .join("; ");

  const transferenciasJson = JSON.stringify(
    contasReservaPreenchidas.map((r) => ({
      contaOrigemId: contaOrigemId,
      contaDestinoId: r.id,
      valor: r.valor,
    })),
  );

  const reservasPorContaJson = JSON.stringify(
    contasReservaPreenchidas.map((r) => ({
      contaId: r.id,
      nome: r.nome,
      valor: Math.round(r.valor * 100) / 100,
    })),
  );

  function handleReservaChange(id: number, raw: string) {
    setReservas((prev) => ({ ...prev, [id]: raw }));
  }

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="gestaoId" value={gestaoId} />
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fim" value={fim} />
      <input type="hidden" name="pagamentoFatura" value={cartao.toFixed(2)} />
      <input type="hidden" name="reservarValorTotal" value={totalReserva.toFixed(2)} />
      <input type="hidden" name="apenasSnapshot" value={apenasSnapshot ? "on" : ""} />
      <input type="hidden" name="transferenciasReserva" value={transferenciasJson} />
      <input type="hidden" name="reservasPorConta" value={reservasPorContaJson} />
      <input type="hidden" name="detalhesReserva" value={detalhesReserva} />

      <article className="rounded-[1.2rem] border border-line bg-background/60 p-4">
        <div className="flex items-baseline gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
            1
          </span>
          <h3 className="font-heading text-base font-semibold">Cartão — gasto da semana</h3>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Compras no cartão com data nesta semana — mesmo valor de <strong className="text-foreground">Saídas no
          crédito</strong> na leitura rápida. Pagamento de fatura no extrato não entra aqui (é fechamento de outra
          semana).
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
        <div className="flex items-baseline gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
            2
          </span>
          <h3 className="font-heading text-base font-semibold">Reservas — quanto guardou em cada</h3>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Sobrou na corrente depois do gasto da semana (entradas − débito − cartão). Distribua nas reservas até zerar.
          Deixe em <strong>0</strong> as que não usou.
        </p>

        <div
          className={`mt-3 rounded-[1rem] border px-4 py-3 ${
            sobraTipo === "zerada"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : sobraTipo === "aporte"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {sobraTipo === "resgate" ? "Faltou para fechar" : "Falta zerar nesta semana"}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {sobraTipo === "resgate" ? `− ${moedaBR(sobraAbs)}` : moedaBR(sobraAbs)}
          </p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Começou em <strong>{moedaBR(sobraSemReservas)}</strong> (entradas {moedaBR(entradasSemana)} − débito{" "}
            {moedaBR(saidasCorrenteSemana)} − cartão {moedaBR(cartao)}) e diminui conforme você preenche cada reserva.
          </p>
        </div>

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
                  onChange={(e) => handleReservaChange(conta.id, e.target.value)}
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

      <article
        className={`rounded-[1.2rem] border p-4 ${
          sobraTipo === "zerada"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : sobraTipo === "aporte"
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-rose-500/40 bg-rose-500/5"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Conferência</p>
        <p className="mt-1 text-base leading-relaxed">
          {sobraTipo === "zerada" ? (
            <>A semana <strong className="text-emerald-700">fecha zerada</strong>. Pode prosseguir.</>
          ) : sobraTipo === "aporte" ? (
            <>
              Ainda restam <strong className="text-amber-800">{moedaBR(sobraAbs)}</strong> desta semana — distribua
              esse valor nas reservas para zerar.
            </>
          ) : (
            <>
              Está <strong className="text-rose-700">{moedaBR(sobraAbs)}</strong> negativo na corrente. Reduza valor
              em alguma reserva, ou registre um resgate de uma reserva no seu banco antes de fechar.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Cálculo: Entradas ({moedaBR(entradasSemana)}) − Débito/Pix ({moedaBR(saidasCorrenteSemana)}) − Cartão (
          {moedaBR(cartao)}) − Reservas ({moedaBR(totalReserva)}) = {moedaBR(restoAposReservas)}.
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
          <strong className="text-foreground">Já fiz tudo no banco</strong> — só registra o fechamento aqui, sem criar
          transferência. Use quando cartão, reserva e zeragem já apareceram no extrato.
        </span>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-[0.18em] text-muted">Observações (opcional)</span>
        <textarea
          name="observacoes"
          rows={2}
          placeholder="ex.: paguei a fatura em parcelas; guardei em outra reserva..."
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
          Confirma cartão, reservas e zeragem desta semana. Se não marcou “Já fiz tudo no banco”, cria{" "}
          <strong>uma transferência por reserva</strong> com valor maior que zero (corrente → reserva selecionada).
        </p>
      </div>
    </form>
  );
}
