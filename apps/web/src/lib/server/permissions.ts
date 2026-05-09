import "server-only";

import { getUserGestaoRole, type GestaoMemberRole } from "@/lib/server/repository";

export function canMutateGestao(role: GestaoMemberRole | null) {
  return role === "proprietario" || role === "administrador" || role === "editor";
}

export async function userCanMutateGestao(userId: number, gestaoId: number) {
  const role = await getUserGestaoRole(userId, gestaoId);
  return canMutateGestao(role);
}
