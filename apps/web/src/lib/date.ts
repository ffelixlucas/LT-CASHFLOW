export function formatDateForDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatTimeForDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const hourMinute = value.match(/^(\d{2}):(\d{2})/);

  if (!hourMinute) {
    return value;
  }

  return `${hourMinute[1]}:${hourMinute[2]}`;
}

export function applyDateMask(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeDateInput(value: FormDataEntryValue | string | null | undefined) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return undefined;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return raw;
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!brMatch) {
    return undefined;
  }

  const [, day, month, year] = brMatch;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return undefined;
  }

  return iso;
}

export function normalizeTimeInput(value: FormDataEntryValue | string | null | undefined) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return undefined;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return undefined;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` avançado em `deltaMonths`, mantendo o dia quando existir no mês alvo (ex.: 31 → fev). */
export function addCalendarMonths(isoDate: string, deltaMonths: number): string {
  if (!Number.isFinite(deltaMonths) || deltaMonths === 0) {
    return isoDate;
  }

  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return isoDate;
  }

  const y = Number(m[1]);
  const mo0 = Number(m[2]) - 1;
  const day = Number(m[3]);
  const targetFirst = new Date(Date.UTC(y, mo0 + deltaMonths, 1));
  const yOut = targetFirst.getUTCFullYear();
  const moOut = targetFirst.getUTCMonth();
  const lastDay = new Date(Date.UTC(yOut, moOut + 1, 0)).getUTCDate();
  const dayClamped = Math.min(day, lastDay);
  const out = new Date(Date.UTC(yOut, moOut, dayClamped));

  return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, "0")}-${String(out.getUTCDate()).padStart(2, "0")}`;
}

/** `anoMes` = `AAAA-MM`, `day` = dia do mês (1–31). Alinhado ao cálculo de competência de gastos fixos. */
export function buildMonthCalendarDate(anoMes: string, day: number): string {
  const [yearRaw, monthRaw] = anoMes.split("-").map(Number);
  const year = yearRaw ?? new Date().getFullYear();
  const month = monthRaw ?? new Date().getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
