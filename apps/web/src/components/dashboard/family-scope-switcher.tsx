"use client";

import { useMemo, useState } from "react";

type FamilyScopeMember = {
  id: number;
  name: string;
  role: string;
  status: string;
  label: string;
  weekExpense: number;
  monthExpense: number;
  movements: number;
  me?: boolean;
  owner?: boolean;
};

type FamilyScopeSwitcherProps = {
  familyName: string;
  ownerName: string;
  modeLabel: string;
  showFamilyRoot?: boolean;
  periodLabel: string;
  periodRange: string;
  familyWeekIncome: number;
  familyWeekExpense: number;
  familyCurrentSaved: number;
  memberCount: number;
  members: FamilyScopeMember[];
};

type ScopeKey = "family" | number;

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase();
}

export function FamilyScopeSwitcher({
  familyName,
  ownerName,
  modeLabel,
  showFamilyRoot = true,
  periodLabel,
  periodRange,
  familyWeekIncome,
  familyWeekExpense,
  familyCurrentSaved,
  memberCount,
  members,
}: FamilyScopeSwitcherProps) {
  const initialScope: ScopeKey = showFamilyRoot ? "family" : members[0]?.id ?? "family";
  const [selectedScope, setSelectedScope] = useState<ScopeKey>(initialScope);

  const selectedMember = useMemo(
    () => (typeof selectedScope === "number" ? members.find((member) => member.id === selectedScope) ?? null : null),
    [members, selectedScope],
  );

  const selectedTitle = selectedScope === "family" ? familyName : selectedMember?.name ?? selectedMember?.label ?? "";
  const selectedSubtitle =
    selectedScope === "family"
      ? `Responsavel principal: ${ownerName} · ${memberCount} membros · ${periodLabel}`
      : showFamilyRoot
        ? `${selectedMember?.role ?? "-"} · ${selectedMember?.status ?? "-"}`
        : `${modeLabel} · ${periodLabel}`;

  const stats =
    selectedScope === "family"
      ? [
          { label: "Gasto", value: familyWeekExpense },
          { label: "Guardado", value: familyCurrentSaved },
          { label: "Entradas", value: familyWeekIncome },
          { label: "Saldo", value: familyWeekIncome - familyWeekExpense },
        ]
      : [
          { label: "Gasto", value: selectedMember?.weekExpense ?? 0 },
          { label: "Mes", value: selectedMember?.monthExpense ?? 0 },
          { label: "Movimentos", value: selectedMember?.movements ?? 0 },
          { label: "Papel", value: 0 },
        ];

  return (
    <section className="scope-shell">
      <div className="scope-row" role="tablist" aria-label={showFamilyRoot ? "Visao da familia" : "Visao individual"}>
        {showFamilyRoot ? (
          <button
            className={`scope-chip ${selectedScope === "family" ? "active" : ""}`}
            onClick={() => setSelectedScope("family")}
            type="button"
          >
            <span className="scope-avatar family">F</span>
            <span className="scope-meta">
              <strong>{modeLabel}</strong>
              <small>{periodRange}</small>
            </span>
          </button>
        ) : null}

        {members.map((member) => (
          <button
            key={member.id}
            className={`scope-chip ${selectedScope === member.id ? "active" : ""}`}
            onClick={() => setSelectedScope(member.id)}
            type="button"
          >
            <span className={`scope-avatar ${member.owner ? "owner" : member.me ? "me" : ""}`}>
              {initials(member.name)}
            </span>
            <span className="scope-meta">
              <strong>{member.label}</strong>
              <small>{periodLabel}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="scope-panel">
        <div>
          <div className="subtle-label">Visao ativa</div>
          <h4>{selectedTitle}</h4>
          <p className="muted">{selectedSubtitle}</p>
        </div>

        <div className="scope-stats">
          {stats.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>
                {item.label === "Papel"
                  ? selectedMember?.role ?? "-"
                  : item.label === "Movimentos"
                    ? String(item.value)
                    : money(item.value)}
              </strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
