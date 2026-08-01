// Thin fetch wrappers for the image-gen plugin's backend API.
//
// Every response is narrowed from `unknown` with an explicit type-guard function (never a cast to the
// response type), matching the idiom in ../random-tables/RandomTablesTool.tsx. Errors from the backend
// arrive as {"detail": "<sentence>"} and that sentence is surfaced verbatim to the caller.

// The upstream service reports pending | queued | processing | completed | failed | cancelled, but the
// status is carried as a plain string rather than validated against that set. Accepting any string means
// an upstream that gains a status shows it instead of breaking the panel mid-generation.
export type TaskStatus = string;

export const TERMINAL_TASK_STATUSES: readonly TaskStatus[] = ["completed", "failed", "cancelled"];

// Progress is reported on a 0-100 scale.
export const MAX_PROGRESS = 100;

export interface ImageGenConfig {
  base_url: string;
  model: string;
  has_token: boolean;
}

export interface GenerateRequest {
  prompt: string;
  neg_prompt: string;
  model_name: string;
  width: number;
  height: number;
  n_steps: number;
  guidance_scale: number;
  seed: number;
  batch_size: number;
}

export interface TaskState {
  status: TaskStatus;
  progress: number;
  message: string | null;
  images: string[];
  error: string | null;
}

export class ApiError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isImageGenConfig(value: unknown): value is ImageGenConfig {
  return (
    isRecord(value) &&
    typeof value.base_url === "string" &&
    typeof value.model === "string" &&
    typeof value.has_token === "boolean"
  );
}

export function isModelsResponse(value: unknown): value is { models: string[] } {
  return isRecord(value) && isStringArray(value.models);
}

export function isGenerateResponse(value: unknown): value is { task_id: string } {
  return isRecord(value) && typeof value.task_id === "string";
}

export function isTaskState(value: unknown): value is TaskState {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    typeof value.progress === "number" &&
    (value.message === null || typeof value.message === "string") &&
    isStringArray(value.images) &&
    (value.error === null || typeof value.error === "string")
  );
}

export function isSaveResponse(value: unknown): value is { path: string } {
  return isRecord(value) && typeof value.path === "string";
}

function errorDetail(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const { detail } = value;
  if (typeof detail === "string") {
    return detail;
  }
  // FastAPI reports request-validation failures as a list of per-field objects rather than a sentence,
  // so a value outside one of the numeric ranges would otherwise surface as a bare status code.
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => (isRecord(entry) && typeof entry.msg === "string" ? entry.msg : null))
      .filter((message): message is string => message !== null);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  return null;
}

async function extractErrorDetail(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return errorDetail(body) ?? `Request failed with status ${response.status}`;
}

async function requestJson<T>(
  input: string,
  init: RequestInit | undefined,
  isValid: (value: unknown) => value is T
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new ApiError(await extractErrorDetail(response));
  }
  const body: unknown = await response.json();
  if (!isValid(body)) {
    throw new ApiError("Unexpected response from server.");
  }
  return body;
}

export function fetchConfig(): Promise<ImageGenConfig> {
  return requestJson("/api/plugins/image-gen/config", undefined, isImageGenConfig);
}

export async function fetchModels(): Promise<string[]> {
  const body = await requestJson("/api/plugins/image-gen/models", undefined, isModelsResponse);
  return body.models;
}

export async function startGenerate(request: GenerateRequest): Promise<string> {
  const body = await requestJson(
    "/api/plugins/image-gen/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    },
    isGenerateResponse
  );
  return body.task_id;
}

export function fetchTaskState(taskId: string): Promise<TaskState> {
  return requestJson(`/api/plugins/image-gen/tasks/${encodeURIComponent(taskId)}`, undefined, isTaskState);
}

export function previewUrl(filename: string): string {
  return `/api/plugins/image-gen/preview/${encodeURIComponent(filename)}`;
}

export async function saveImage(filename: string, path: string): Promise<string> {
  const body = await requestJson(
    "/api/plugins/image-gen/save",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, path })
    },
    isSaveResponse
  );
  return body.path;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error.";
}
