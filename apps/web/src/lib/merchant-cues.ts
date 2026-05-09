/** Normalização alinhada a `normalizeText` em ai.ts / statement-reconciliation. */
export function normalizeMerchantCue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Marketplace Mercado Livre na fatura/cartão — não é mercado (supermercado).
 * Ex.: MERCADO*MERCADOLIVRE, MERCADOLIVRE*MERCADOL, parcelas no cartão.
 */
export function isMercadoLivreMarketplaceCharge(description: string): boolean {
  const n = normalizeMerchantCue(description).replace(/\*/g, " ");
  if (n.includes("mercadolivre")) return true;
  if (n.includes("mercado livre")) return true;
  /* Fatura às vezes trunca em MERCADOL */
  if (/\bmercadol\b/.test(n)) return true;
  return false;
}

/** Palavras-chave de alimentação, excluindo cobranças do Mercado Livre. */
export function matchesGroceryAlimentacaoCue(normalizedText: string): boolean {
  if (isMercadoLivreMarketplaceCharge(normalizedText)) return false;
  return /(mercado|supermercado|feira|ifood|restaurante|padaria|lanche)/.test(normalizedText);
}
