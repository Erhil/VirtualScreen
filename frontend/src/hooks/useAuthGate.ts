import { useEffect, useState } from "react";

import { fetchAuthStatus, loginAuth, type AuthStatus } from "../lib/api";

export type AuthGateState =
  | { status: "checking" }
  | { status: "unlocked"; auth: AuthStatus }
  | { status: "locked"; auth: AuthStatus; error: string | null }
  | { status: "unlocking"; auth: AuthStatus; error: string | null };

// Whether the console is unlocked. Checked once on start; a failed check counts as "no
// auth configured", matching a server without an access token.
export function useAuthGate() {
  const [authState, setAuthState] = useState<AuthGateState>({ status: "checking" });

  useEffect(() => {
    let mounted = true;
    fetchAuthStatus()
      .then((status) => {
        if (!mounted) {
          return;
        }
        setAuthState(
          !status.enabled || status.authenticated
            ? { status: "unlocked", auth: status }
            : { status: "locked", auth: status, error: null }
        );
      })
      .catch(() => {
        if (mounted) {
          setAuthState({
            status: "unlocked",
            auth: { enabled: false, authenticated: true }
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleAuthUnlock(token: string) {
    if (authState.status !== "locked" && authState.status !== "unlocking") {
      return;
    }
    setAuthState({ status: "unlocking", auth: authState.auth, error: null });
    try {
      const nextStatus = await loginAuth(token);
      if (nextStatus.authenticated) {
        setAuthState({ status: "unlocked", auth: nextStatus });
      } else {
        setAuthState({ status: "locked", auth: nextStatus, error: "Invalid access code." });
      }
    } catch {
      setAuthState({ status: "locked", auth: authState.auth, error: "Invalid access code." });
    }
  }

  return { authState, handleAuthUnlock };
}
