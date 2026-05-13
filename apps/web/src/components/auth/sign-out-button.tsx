"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full border border-line px-4 py-2 text-sm font-medium"
      onClick={() => signOut({ callbackUrl: "/entrar" })}
      type="button"
    >
      Sair
    </button>
  );
}
