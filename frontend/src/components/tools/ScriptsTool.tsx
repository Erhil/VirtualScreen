import { type Translator } from "../../lang";
import { type DmsRunState, type DmsScriptSummary } from "../../lib/api";
import { DMS_COMMAND_REFERENCE } from "../../lib/scripts";

export type ScriptLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; scripts: DmsScriptSummary[] }
  | { status: "error"; message: string };

export type ScriptRunState =
  | { status: "idle" }
  | { status: "running"; path: string; runId: string | null; run?: DmsRunState }
  | { status: "ready"; run: DmsRunState }
  | { status: "error"; message: string };

export function ScriptsTool({
  onCancel,
  onRun,
  runState,
  state,
  t
}: {
  onCancel: (runId: string) => void;
  onRun: (path: string) => void;
  runState: ScriptRunState;
  state: ScriptLoadState;
  t: Translator;
}) {
  const runningRunId = runState.status === "running" ? runState.runId : null;
  return (
    <section className="scenarios-tool" aria-label={t("scripts.title")} data-help-context="scripts">
      {state.status === "idle" && <p>{t("scripts.openToScan")}</p>}
      {state.status === "loading" && <p>{t("scripts.scanning")}</p>}
      {state.status === "error" && <p className="inline-error">{state.message}</p>}
      <details className="script-reference">
        <summary>{t("scripts.commandReference")}</summary>
        <div className="script-command-list">
          {DMS_COMMAND_REFERENCE.map((entry) => (
            <article className="script-command-entry" key={entry.name}>
              <small>{t(entry.groupKey)}</small>
              <code>{entry.signature}</code>
              <p>{t(entry.descriptionKey)}</p>
              <p>
                <strong>{t("scripts.command.effectLabel")}</strong> {t(entry.effectKey)}
              </p>
              <p>
                <strong>{t("scripts.command.exampleLabel")}</strong> <code>{entry.example}</code>
              </p>
            </article>
          ))}
        </div>
      </details>
      {state.status === "ready" && state.scripts.length === 0 && <p>{t("scripts.none")}</p>}
      {state.status === "ready" &&
        state.scripts.map((script) => (
          <section className="scenario-card script-row" key={script.path}>
            <div className="scenario-heading script-row-main">
              <strong>{script.title}</strong>
              <small>{script.path}</small>
            </div>
            <button
              disabled={runState.status === "running" && runState.path === script.path}
              onClick={() => onRun(script.path)}
              type="button"
            >
              {runState.status === "running" && runState.path === script.path
                ? t("scripts.running")
                : t("scripts.run")}
            </button>
          </section>
        ))}
      {runState.status === "running" && (
        <section className="scenario-output" aria-label={t("scripts.latestRun")}>
          <strong>{t("scripts.running")}</strong>
          <small>{runState.path}</small>
          {runningRunId && (
            <button onClick={() => onCancel(runningRunId)} type="button">
              {t("scripts.cancel")}
            </button>
          )}
        </section>
      )}
      {runState.status === "ready" && (
        <section className="scenario-output" aria-label={t("scripts.latestRun")}>
          <strong>{runState.run.status}</strong>
          {runState.run.stderr && <pre>{runState.run.stderr}</pre>}
          {runState.run.stdout && <pre>{runState.run.stdout}</pre>}
          {runState.run.outputs.length > 0 && (
            <small>{runState.run.outputs.length} output tab opened</small>
          )}
          {runState.run.status === "cancelled" && <small>{t("scripts.cancelled")}</small>}
        </section>
      )}
      {runState.status === "error" && <p className="inline-error">{runState.message}</p>}
    </section>
  );
}
