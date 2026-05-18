"use client";

type OpcaoMes = {
  valor: string;
  rotulo: string;
};

type Props = {
  gestaoId: number;
  contaId: number;
  valorAtual: string;
  opcoes: OpcaoMes[];
};

export function FaturaMesSelectForm({ gestaoId, contaId, valorAtual, opcoes }: Props) {
  return (
    <form action="/dashboard/cartao" className="min-w-[12rem]" method="get">
      <input name="gestao" type="hidden" value={gestaoId} />
      <input name="conta" type="hidden" value={contaId} />
      <label className="sr-only" htmlFor="fatura-mes-select">
        Mês da fatura
      </label>
      <select
        className="fatura-month-select h-[42px] w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-white"
        defaultValue={valorAtual}
        id="fatura-mes-select"
        name="fatura"
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {opcoes.map(({ valor, rotulo }) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </select>
    </form>
  );
}
