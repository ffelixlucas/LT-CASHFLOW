import "server-only";

import { canMutateGestao, getUserGestaoRole } from "@/lib/server/gestao-access";

export {
  assertCanMutateGestao,
  assertCanReadGestao,
  assertCategoriaInGestao,
  assertContaIdsInGestao,
  assertContaInGestao,
  assertFinancialRefsInGestao,
  assertGastoFixoInGestao,
  assertLancamentoIdsInGestao,
  assertLancamentoInGestao,
  GestaoAccessDeniedError,
  type GestaoMemberRole,
} from "@/lib/server/gestao-access";

export { canMutateGestao, getUserGestaoRole };

export async function userCanMutateGestao(userId: number, gestaoId: number) {
  const role = await getUserGestaoRole(userId, gestaoId);
  return canMutateGestao(role);
}
