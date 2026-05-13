"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full border border-line px-4 py-2 text-sm font-medium"
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.assign("/entrar");
      }}
      type="button"
    >
      Sair
    </button>
  );
}
