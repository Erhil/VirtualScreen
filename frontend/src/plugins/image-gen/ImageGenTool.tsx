import { useEffect, useState, type CSSProperties } from "react";

import {
  errorMessage,
  fetchConfig,
  fetchModels,
  fetchTaskState,
  MAX_PROGRESS,
  previewUrl,
  saveImage,
  startGenerate,
  TERMINAL_TASK_STATUSES,
  type ImageGenConfig,
  type TaskState
} from "./api";
import type { PluginToolContext } from "../../lib/pluginTypes";

const DEFAULT_NEG_PROMPT =
  "photorealistic, photo, 3d render, CGI, HDR, high contrast, overexposed, harsh rim light, glossy skin, " +
  "plastic skin, oversaturated colors, neon colors, bloom, lens flare, heavy shadows, busy background, text, " +
  "watermark, logo, frame, extra fingers, deformed hands, distorted face, duplicate face, bad eyes";

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_STEPS = 30;
const DEFAULT_GUIDANCE_SCALE = 4;
const DEFAULT_SEED = -1;
const DEFAULT_SAVE_PATH = "Media/generated-portrait.jpg";
const POLL_INTERVAL_MS = 1500;

// The panel is unmounted whenever the DM closes the dialog, and a generation takes tens of
// seconds - closing it while waiting is the normal thing to do. Remembering the task id for
// the browser session means reopening reattaches to the running job instead of abandoning
// an image that is already being painted.
const STORED_TASK_KEY = "image-gen:task-id";

function readStoredTaskId(): string | null {
  try {
    return window.sessionStorage.getItem(STORED_TASK_KEY);
  } catch {
    return null;
  }
}

function storeTaskId(taskId: string): void {
  try {
    window.sessionStorage.setItem(STORED_TASK_KEY, taskId);
  } catch {
    // Private-mode storage refusals must not stop a generation.
  }
}

type ConfigLoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; config: ImageGenConfig };

type ModelsLoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; models: string[] };

const fieldStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "0.25rem" };
const numberFieldStyle: CSSProperties = { ...fieldStyle, width: "6.5rem" };
const errorStyle: CSSProperties = { color: "#c0392b" };

function parseIntOrDefault(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatOrDefault(raw: string, fallback: number): number {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ImageGenTool({ worldId }: PluginToolContext) {
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState(DEFAULT_NEG_PROMPT);

  const [configState, setConfigState] = useState<ConfigLoadState>({ kind: "loading" });
  const [modelsState, setModelsState] = useState<ModelsLoadState>({ kind: "loading" });
  const [modelName, setModelName] = useState("");

  const [widthInput, setWidthInput] = useState(String(DEFAULT_WIDTH));
  const [heightInput, setHeightInput] = useState(String(DEFAULT_HEIGHT));
  const [stepsInput, setStepsInput] = useState(String(DEFAULT_STEPS));
  const [guidanceInput, setGuidanceInput] = useState(String(DEFAULT_GUIDANCE_SCALE));
  const [seedInput, setSeedInput] = useState(String(DEFAULT_SEED));

  const [taskId, setTaskId] = useState<string | null>(readStoredTaskId);
  const [generating, setGenerating] = useState(() => readStoredTaskId() !== null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskState | null>(null);

  const [savePath, setSavePath] = useState(DEFAULT_SAVE_PATH);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // Load config once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchConfig()
      .then((config) => {
        if (cancelled) {
          return;
        }
        setConfigState({ kind: "ready", config });
        if (config.model !== "") {
          setModelName((previous) => (previous === "" ? config.model : previous));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setConfigState({ kind: "error", message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the model list once on mount.
  useEffect(() => {
    let cancelled = false;
    fetchModels()
      .then((models) => {
        if (cancelled) {
          return;
        }
        setModelsState({ kind: "ready", models });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setModelsState({ kind: "error", message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the running task until it reaches a terminal status. Stops on unmount.
  //
  // Deliberately a self-rescheduling timeout rather than an interval: the next request is
  // only queued once the previous reply has landed, so exactly one is ever in flight. On a
  // slow link an interval overlaps its own requests, and a late "processing" arriving after
  // "completed" would overwrite the terminal state - leaving the finished image on disk but
  // unreachable from the panel, with nothing left polling to correct it.
  useEffect(() => {
    if (taskId === null) {
      return;
    }
    let cancelled = false;
    let timer: number | undefined;

    async function poll(id: string) {
      try {
        const state = await fetchTaskState(id);
        if (cancelled) {
          return;
        }
        setTask(state);
        if (TERMINAL_TASK_STATUSES.includes(state.status)) {
          setGenerating(false);
          return;
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setGenerateError(errorMessage(err));
        setGenerating(false);
        return;
      }
      timer = window.setTimeout(() => void poll(id), POLL_INTERVAL_MS);
    }

    void poll(taskId);

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [taskId]);

  async function handleGenerate() {
    setGenerateError(null);
    setTask(null);
    setTaskId(null);
    setSaveError(null);
    setSavedPath(null);
    setGenerating(true);
    try {
      const newTaskId = await startGenerate({
        prompt,
        neg_prompt: negPrompt,
        model_name: modelName,
        width: parseIntOrDefault(widthInput, DEFAULT_WIDTH),
        height: parseIntOrDefault(heightInput, DEFAULT_HEIGHT),
        n_steps: parseIntOrDefault(stepsInput, DEFAULT_STEPS),
        guidance_scale: parseFloatOrDefault(guidanceInput, DEFAULT_GUIDANCE_SCALE),
        seed: parseIntOrDefault(seedInput, DEFAULT_SEED),
        batch_size: 1
      });
      storeTaskId(newTaskId);
      setTaskId(newTaskId);
    } catch (err) {
      setGenerateError(errorMessage(err));
      setGenerating(false);
    }
  }

  async function handleSave(filename: string) {
    setSaving(true);
    setSaveError(null);
    setSavedPath(null);
    try {
      const savedTo = await saveImage(filename, savePath);
      setSavedPath(savedTo);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const models = modelsState.kind === "ready" ? modelsState.models : [];
  const modelOptions = modelName !== "" && !models.includes(modelName) ? [modelName, ...models] : models;
  const useModelSelect = modelsState.kind === "ready" && models.length > 0;

  const selectedImage = task !== null && task.status === "completed" && task.images.length > 0 ? task.images[0] : null;

  const canGenerate = !generating && prompt.trim() !== "" && modelName.trim() !== "";
  const canSave = selectedImage !== null && !saving;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: "26rem", maxWidth: "34rem" }}>
      {configState.kind === "error" ? <p role="alert" style={errorStyle}>{configState.message}</p> : null}
      {configState.kind === "ready" ? (
        <small style={{ color: "#666" }}>
          Service: {configState.config.base_url}
          {configState.config.has_token ? " (token set)" : ""}
        </small>
      ) : null}

      <label style={fieldStyle}>
        <span>Prompt</span>
        <textarea
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          style={{ fontFamily: "inherit", resize: "vertical" }}
          value={prompt}
        />
      </label>

      <label style={fieldStyle}>
        <span>Negative prompt</span>
        <textarea
          onChange={(event) => setNegPrompt(event.target.value)}
          rows={3}
          style={{ fontFamily: "inherit", resize: "vertical" }}
          value={negPrompt}
        />
      </label>

      <label style={fieldStyle}>
        <span>Model</span>
        {useModelSelect ? (
          <select onChange={(event) => setModelName(event.target.value)} value={modelName}>
            {modelOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input
            onChange={(event) => setModelName(event.target.value)}
            placeholder="Model name"
            type="text"
            value={modelName}
          />
        )}
        {modelsState.kind === "loading" ? <span>Loading models…</span> : null}
        {modelsState.kind === "error" ? <span style={errorStyle}>{modelsState.message}</span> : null}
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <label style={numberFieldStyle}>
          <span>Width</span>
          <input onChange={(event) => setWidthInput(event.target.value)} type="number" value={widthInput} />
        </label>
        <label style={numberFieldStyle}>
          <span>Height</span>
          <input onChange={(event) => setHeightInput(event.target.value)} type="number" value={heightInput} />
        </label>
        <label style={numberFieldStyle}>
          <span>Steps</span>
          <input onChange={(event) => setStepsInput(event.target.value)} type="number" value={stepsInput} />
        </label>
        <label style={numberFieldStyle}>
          <span>Guidance scale</span>
          <input onChange={(event) => setGuidanceInput(event.target.value)} type="number" value={guidanceInput} />
        </label>
        <label style={numberFieldStyle}>
          <span>Seed</span>
          <input onChange={(event) => setSeedInput(event.target.value)} type="number" value={seedInput} />
          <span style={{ fontSize: "0.75rem", color: "#666" }}>-1 = random</span>
        </label>
      </div>

      <button disabled={!canGenerate} onClick={() => void handleGenerate()} type="button">
        {generating ? "Generating…" : "Generate"}
      </button>

      {generateError !== null ? <p role="alert" style={errorStyle}>{generateError}</p> : null}

      {task !== null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Status: {task.status}</span>
          {!TERMINAL_TASK_STATUSES.includes(task.status) ? (
            <progress max={MAX_PROGRESS} value={task.progress} />
          ) : null}
          {task.message !== null ? <span>{task.message}</span> : null}
          {task.status === "failed" ? <p role="alert" style={errorStyle}>{task.error ?? "Generation failed."}</p> : null}
          {task.status === "cancelled" ? <p>Generation was cancelled.</p> : null}
        </div>
      ) : null}

      {selectedImage !== null ? (
        <img
          alt="Generated portrait"
          src={previewUrl(selectedImage)}
          style={{ maxWidth: "100%", maxHeight: "24rem", objectFit: "contain", border: "1px solid #ccc" }}
        />
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid #ddd", paddingTop: "0.75rem" }}>
        <label style={fieldStyle}>
          <span>Save to world (path)</span>
          <input onChange={(event) => setSavePath(event.target.value)} type="text" value={savePath} />
        </label>
        {worldId === null ? (
          <p role="alert" style={errorStyle}>No world is open. Open a world to save generated images.</p>
        ) : null}
        <button
          disabled={!canSave || worldId === null}
          onClick={() => (selectedImage !== null ? void handleSave(selectedImage) : undefined)}
          type="button"
        >
          {saving ? "Saving…" : "Save to world"}
        </button>
        {saveError !== null ? <p role="alert" style={errorStyle}>{saveError}</p> : null}
        {savedPath !== null ? (
          <p>
            Saved to <strong>{savedPath}</strong>
          </p>
        ) : null}
      </div>
    </div>
  );
}
