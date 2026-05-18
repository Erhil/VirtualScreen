import { useState } from "react";

import type { Translator } from "./lang";

type UnlockScreenProps = {
  error: string | null;
  loading: boolean;
  onUnlock: (token: string) => void;
  t: Translator;
};

export function UnlockScreen({ error, loading, onUnlock, t }: UnlockScreenProps) {
  const [token, setToken] = useState("");

  return (
    <main className="unlock-screen" aria-label={t("unlock.label")}>
      <form
        className="unlock-card"
        onSubmit={(event) => {
          event.preventDefault();
          onUnlock(token);
        }}
      >
        <h1>VirtualScreen</h1>
        <p>{t("unlock.description")}</p>
        <label>
          {t("unlock.accessCode")}
          <input
            autoFocus
            onChange={(event) => setToken(event.target.value)}
            type="password"
            value={token}
          />
        </label>
        {error && <p className="inline-error">{error}</p>}
        <button disabled={loading || !token.trim()} type="submit">
          {loading ? t("unlock.unlocking") : t("unlock.unlock")}
        </button>
      </form>
    </main>
  );
}
