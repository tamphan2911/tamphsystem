"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  function signOutToCurrentLogin() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void signOut({ callbackUrl: `${origin}/login` });
  }

  return (
    <button
      onClick={signOutToCurrentLogin}
      className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
    >
      Sign Out
    </button>
  );
}
