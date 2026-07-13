import { useState } from "react";

const SAMPLE_ENTRIES = [
  "A hooded stranger offers a cryptic warning",
  "Distant thunder rolls despite the clear sky",
  "A merchant's cart has lost a wheel",
  "Rats scatter from an overturned barrel",
  "A street performer draws a curious crowd"
].join("\n");

const HISTORY_LIMIT = 10;

interface RollResponse {
  result: string;
}

function isRollResponse(value: unknown): value is RollResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { result?: unknown }).result === "string"
  );
}

export function RandomTablesTool() {
  const [text, setText] = useState(SAMPLE_ENTRIES);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  async function handleRoll() {
    setRolling(true);
    setError(null);
    try {
      const response = await fetch("/api/plugins/random-tables/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: text.split("\n") })
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const detail =
          body !== null && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
            ? (body as { detail: string }).detail
            : `Request failed with status ${response.status}`;
        setError(detail);
        return;
      }
      const body: unknown = await response.json();
      if (!isRollResponse(body)) {
        setError("Unexpected response from server");
        return;
      }
      setResult(body.result);
      setHistory((previous) => [body.result, ...previous].slice(0, HISTORY_LIMIT));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setRolling(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: "20rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span>Entries (one per line)</span>
        <textarea
          onChange={(event) => setText(event.target.value)}
          rows={8}
          style={{ fontFamily: "inherit", resize: "vertical" }}
          value={text}
        />
      </label>
      <button disabled={rolling} onClick={() => void handleRoll()} type="button">
        {rolling ? "Rolling…" : "Roll"}
      </button>
      {error ? <p role="alert" style={{ color: "#c0392b" }}>{error}</p> : null}
      {result !== null ? (
        <p>
          <strong>Result: </strong>
          {result}
        </p>
      ) : null}
      {history.length > 0 ? (
        <div>
          <span>History</span>
          <ol>
            {history.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
