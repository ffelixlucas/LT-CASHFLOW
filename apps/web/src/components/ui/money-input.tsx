"use client";

import { useEffect, useMemo, useState } from "react";

type MoneyInputProps = {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowNegative?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

function parseDefaultMoneyValue(value: string | number | null | undefined, allowNegative: boolean) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  const simpleNumber = Number(raw.replace(",", "."));
  if (Number.isFinite(simpleNumber)) {
    return simpleNumber;
  }

  return parseTypedMoneyValue(raw, allowNegative);
}

function parseTypedMoneyValue(value: string, allowNegative: boolean) {
  const raw = value.trim();

  if (!raw) {
    return null;
  }

  const negative = allowNegative && raw.trim().startsWith("-");
  const digits = raw.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const cents = Number(digits);

  if (!Number.isFinite(cents)) {
    return null;
  }

  const amount = cents / 100;
  return negative ? -amount : amount;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function MoneyInput({
  name,
  defaultValue,
  placeholder = "R$ 0,00",
  required = false,
  disabled = false,
  allowNegative = false,
  className,
  onValueChange,
}: MoneyInputProps) {
  const initialAmount = useMemo(
    () => parseDefaultMoneyValue(defaultValue, allowNegative),
    [allowNegative, defaultValue],
  );
  const [amount, setAmount] = useState<number | null>(initialAmount);

  useEffect(() => {
    setAmount(initialAmount);
  }, [initialAmount]);

  const displayValue = amount == null ? "" : formatMoney(amount);
  const hiddenValue = amount == null ? "" : amount.toFixed(2);

  return (
    <>
      <input name={name} type="hidden" value={hiddenValue} />
      <input
        className={className}
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => {
          const nextAmount = parseTypedMoneyValue(event.target.value, allowNegative);
          setAmount(nextAmount);
          onValueChange?.(nextAmount == null ? "" : nextAmount.toFixed(2));
        }}
        placeholder={placeholder}
        required={required}
        type="text"
        value={displayValue}
      />
    </>
  );
}
