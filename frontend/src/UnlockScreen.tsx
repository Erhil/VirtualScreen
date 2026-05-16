import { useState } from "react";

type UnlockScreenProps = {
  error: string | null;
  loading: boolean;
  onUnlock: (token: string) => void;
};

export function UnlockScreen({ error, loading, onUnlock }: UnlockScreenProps) {
  const [token, setToken] = useState("");

  return (
    <main className="unlock-screen" aria-label="VirtualScreen Unlock">
      <form
        className="unlock-card"
        onSubmit={(event) => {
          event.preventDefault();
          onUnlock(token);
        }}
      >
        <h1>VirtualScreen</h1>
        <p>Enter the local table access code to unlock this session.</p>
        <label>
          Access code
          <input
            autoFocus
            onChange={(event) => setToken(event.target.value)}
            type="password"
            value={token}
          />
        </label>
        {error && <p className="inline-error">{error}</p>}
        <button disabled={loading || !token.trim()} type="submit">
          {loading ? "Unlocking..." : "Unlock"}
        </button>
      </form>
    </main>
  );
}
