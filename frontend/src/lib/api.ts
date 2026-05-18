export type HealthResponse = {
  status: string;
  service: string;
};

export type UiLanguage = string;

export type AppConfig = {
  language: UiLanguage;
  available_languages: Array<{
    code: UiLanguage;
    label: string;
    native_label: string;
  }>;
};

export type TranslationCatalog = Record<string, string>;

export type PrepHealthStatus = "ok" | "warning" | "error";

export type PrepHealthIssueKind =
  | "broken_link"
  | "missing_embed"
  | "missing_dms_reference"
  | "dms_parse_error";

export type PrepHealthIssue = {
  id: string;
  severity: "error" | "warning";
  kind: PrepHealthIssueKind;
  source_path: string;
  source_title: string | null;
  source_kind: WorldMediaKind;
  raw_target: string;
  label: string | null;
  command: string | null;
  message: string;
};

export type PrepHealthReport = {
  checked_at: string;
  status: PrepHealthStatus;
  issue_count: number;
  errors: number;
  warnings: number;
  issues: PrepHealthIssue[];
};

export type PrepHealthResponse = PrepHealthReport;

export type WorldInfo = {
  root: string;
  exists: boolean;
};

export type WorldLibraryEntry = {
  id: string;
  name: string;
  path: string;
  modified_at: string;
};

export type WorldLibraryState = {
  worlds_root: string;
  current: WorldLibraryEntry | null;
  worlds: WorldLibraryEntry[];
  recent: WorldLibraryEntry[];
};

export type CreateWorldRequest = {
  name: string;
};

export type WorldEntry = {
  name: string;
  path: string;
  kind: "directory" | "file";
  extension: string | null;
  children: WorldEntry[];
  title?: string | null;
  page_type?: string | null;
  tags?: string[];
  aliases?: string[];
};

import type { MapState } from "./map";
import type { CardTemplateCatalog } from "./cards";

export type WorldMediaKind =
  | "markdown"
  | "card"
  | "csv"
  | "text"
  | "script"
  | "image"
  | "pdf"
  | "video"
  | "unsupported";

export type AudioBus = "ambient" | "music" | "effect";

export type CaptureCategory =
  | "idea"
  | "todo"
  | "npc"
  | "player_wish"
  | "ruling"
  | "loot"
  | "question"
  | "other";

export type CaptureTodayResponse = {
  path: string;
  exists: boolean;
};

export type CreateCaptureRequest = {
  category: CaptureCategory;
  text: string;
};

export type CreateCaptureResponse = {
  path: string;
  category: CaptureCategory;
  heading: string;
  entry: string;
  created: boolean;
  modified_at: string;
  hash: string;
};

export type AudioTrack = {
  path: string;
  name: string;
  title: string;
  bus: AudioBus;
  playlist: string | null;
  extension: string;
  content_type: string;
  size: number;
  modified_at: string;
};

export type WorldFile = {
  path: string;
  name: string;
  extension: string | null;
  media_kind: WorldMediaKind;
  content_type: string;
  size: number;
  modified_at: string;
  hash: string;
  content: string;
};

export type SaveWorldFileRequest = {
  content: string;
  expected_modified_at: string;
  expected_hash: string;
};

export type SaveWorldFileResponse = WorldFile & {
  backup_path: string;
};

export type CreateWorldFileRequest = {
  path: string;
  file_type: "markdown" | "card" | "csv" | "script";
  content?: string;
};

export type CreateWorldFolderRequest = {
  path: string;
};

export type RenameWorldFileRequest = {
  path: string;
  new_path: string;
  expected_modified_at: string;
  expected_hash: string;
};

export type TrashWorldFileRequest = {
  path: string;
  expected_modified_at: string;
  expected_hash: string;
};

export type TrashWorldFileResponse = {
  path: string;
  trashed_path: string;
};

export type MoveWorldPathRequest = {
  path: string;
  new_path: string;
};

export type DuplicateWorldPathRequest = {
  path: string;
  new_path?: string;
};

export type TrashWorldPathRequest = {
  path: string;
};

export type WorldPathOperationResponse = {
  path: string;
  affected_paths: string[];
  deleted_paths: string[];
};

export type TrashWorldPathResponse = WorldPathOperationResponse & {
  trashed_path: string;
};

export type TrashEntry = {
  original_path: string;
  trashed_path: string;
  name: string;
  kind: "file" | "directory";
  size: number;
  trashed_at: string;
};

export type RestoreTrashRequest = {
  trashed_path: string;
  restore_path?: string;
};

export type RestoreTrashResponse = {
  path: string;
  trashed_path: string;
};

export type DeleteTrashRequest = {
  trashed_path: string;
};

export type DeleteTrashResponse = {
  trashed_path: string;
};

export type PageSummary = {
  path: string;
  name: string;
  extension: string | null;
  title: string;
  page_type: string | null;
  tags: string[];
  aliases: string[];
  size: number;
  modified_at: string;
  hash: string;
};

export type PageDetail = PageSummary & {
  metadata: Record<string, unknown>;
  fields: Record<string, unknown>;
};

export type ManagedPageMetadata = {
  title: string;
  type: string | null;
  tags: string[];
  aliases: string[];
  fields: Record<string, string>;
};

export type UpdatePageMetadataRequest = {
  metadata: ManagedPageMetadata;
  expected_modified_at: string;
  expected_hash: string;
};

export type UpdatePageMetadataResponse = {
  page: PageDetail;
  file: WorldFile;
  backup_path: string;
};

export type PageLink = {
  source_path: string;
  raw_target: string;
  label: string;
  link_type: "wiki" | "markdown" | "embed";
  target_path: string | null;
  target_title: string | null;
  target_kind:
    | "markdown"
    | "card"
    | "csv"
    | "image"
    | "pdf"
    | "video"
    | "text"
    | "unsupported"
    | null;
  heading: string | null;
  resolved: boolean;
};

export type DisplayItem = {
  path: string;
  title: string | null;
  name: string;
  media_kind: WorldMediaKind;
};

export type DisplayPopupPreset = "plain" | "note" | "letter" | "portrait" | "clue";

export type DisplayPopup = DisplayItem & {
  id: string;
  created_at: string;
  preset?: DisplayPopupPreset | null;
  visible?: boolean;
};

export type DisplayState = {
  fullscreen: DisplayItem | null;
  popups: DisplayPopup[];
  updated_at: string;
};

export type RebuildIndexResponse = {
  pages_indexed: number;
  links_indexed: number;
  rebuilt_at: string;
};

export type SearchResult = {
  path: string;
  name: string;
  extension: string | null;
  media_kind: WorldMediaKind;
  title: string;
  page_type: string | null;
  tags: string[];
  aliases: string[];
  snippet: string | null;
  match_reason: "title" | "alias" | "tag" | "metadata" | "path" | "body";
  score: number;
};

export type WorkspaceTab = {
  path: string;
  name: string;
  title: string | null;
  mediaKind: WorldMediaKind;
};

export type WorkspacePaneId = "main" | "secondary";

export type WorkspacePane = {
  id: WorkspacePaneId;
  activePath: string | null;
};

export type WorkspaceLayout = {
  mode: "single" | "vertical_split";
  activePaneId: WorkspacePaneId;
  panes: WorkspacePane[];
  splitRatio: number;
};

export type NamedWorkspaceSummary = {
  id: string;
  name: string;
  is_active: boolean;
  updated_at: string;
};

export type WorkspaceState = {
  workspaceId: string;
  workspaceName: string;
  tabs: WorkspaceTab[];
  activePath: string | null;
  layout: WorkspaceLayout;
  favorites: WorkspaceTab[];
  recentFiles: WorkspaceTab[];
};

export type HpTrackerRow = {
  id: string;
  name: string;
  current_hp: number;
  max_hp: number | null;
  status: string;
  notes: string;
};

export type HpTrackerState = {
  workspace_id: string;
  rows: HpTrackerRow[];
  updated_at: string;
};

export type TableSnapshotAudioBus = {
  track: AudioTrack | null;
  volume: number;
  loop: boolean;
  playing: boolean;
};

export type TableSnapshotAudioState = Record<AudioBus, TableSnapshotAudioBus>;

export type TableSnapshotWorkspace = {
  workspace_id: string;
  workspace_name: string;
  tabs: WorkspaceTab[];
  activePath: string | null;
  layout: WorkspaceLayout;
};

export type TableSnapshotState = {
  display: DisplayState;
  map: MapState;
  workspace: TableSnapshotWorkspace;
  audio: TableSnapshotAudioState;
};

export type TableSnapshotSummary = {
  id: string;
  name: string;
  updated_at: string;
};

export type TableSnapshotDetail = TableSnapshotSummary & {
  state: TableSnapshotState;
};

export type SaveTableSnapshotRequest = {
  name: string;
  state: TableSnapshotState;
};

export type RestoreTableSnapshotResponse = {
  snapshot: TableSnapshotDetail;
  display: DisplayState;
  map: MapState;
  workspace: WorkspaceState;
  audio: TableSnapshotAudioState;
};

export type DeleteTableSnapshotResponse = {
  deleted: boolean;
};

export type SearchParams = {
  q: string;
  type?: string;
  tag?: string;
  folder?: string;
  limit?: number;
};

export type AudioLibraryParams = {
  q?: string;
  bus?: AudioBus;
};

export type AuthStatus = {
  enabled: boolean;
  authenticated: boolean;
};

export type FastSlotAction =
  | { kind: "open_file"; path: string }
  | { kind: "screen_fullscreen"; path?: string | null }
  | { kind: "screen_popup"; path?: string | null; preset?: DisplayPopupPreset | null }
  | { kind: "audio_track"; path: string; bus: AudioBus; play: boolean }
  | { kind: "script_run"; path: string }
  | { kind: "map_preset"; preset_id: string; present: boolean }
  | { kind: "scenario"; scenario_id: string; inputs: Record<string, string | number | boolean> };

export type FastSlot = {
  id: string;
  position: number;
  label: string;
  icon: string | null;
  action: FastSlotAction;
};

export type ScenarioInput = {
  name: string;
  label: string;
  input_type: "text" | "number" | "boolean" | "select";
  required: boolean;
  default: string | number | boolean | null;
  options: string[];
};

export type ScenarioSummary = {
  id: string;
  name: string;
  description: string | null;
  inputs: ScenarioInput[];
};

export type ScenarioRunResult = {
  run_id: string;
  scenario_id: string;
  status: "success" | "error" | "timeout";
  output_kind: "markdown" | "json" | "text";
  output: string;
  stderr: string;
  created_at: string;
};

export type DmsScriptSummary = {
  path: string;
  name: string;
  title: string;
  size: number;
  modified_at: string;
};

export type DmsOutput = {
  id: string;
  media_kind: "markdown" | "csv";
  virtual_path: string;
  name: string;
  content: string;
};

export type DmsEffect =
  | { id: string; kind: "screen_fullscreen"; path: string }
  | { id: string; kind: "screen_popup"; path: string }
  | { id: string; kind: "map_load"; path: string; present: boolean }
  | { id: string; kind: "map_preset"; preset_id: string; present: boolean }
  | { id: string; kind: "map_present" }
  | { id: string; kind: "map_stop" }
  | { id: string; kind: "map_fog"; enabled: boolean }
  | {
      id: string;
      kind: "audio_play";
      path: string;
      bus: AudioBus;
      volume: number;
    };

export type DmsRunStatus =
  | "running"
  | "waiting_for_form"
  | "success"
  | "error"
  | "timeout"
  | "cancelled";

export type DmsRunState = {
  run_id: string;
  path: string;
  status: DmsRunStatus;
  form_request: null | {
    request_id: string;
    schema: Record<string, unknown>;
  };
  outputs: DmsOutput[];
  effects: DmsEffect[];
  stdout: string;
  stderr: string;
  created_at: string;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(
  path: string,
  method: "DELETE" | "POST" | "PUT",
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${path}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return getJson<HealthResponse>("/api/health");
}

export function fetchAppConfig(): Promise<AppConfig> {
  return getJson<AppConfig>("/api/app/config");
}

export function fetchLanguageCatalog(language: UiLanguage): Promise<TranslationCatalog> {
  return getJson<TranslationCatalog>(`/api/app/language/${encodeURIComponent(language)}`);
}

export function fetchPrepHealth(): Promise<PrepHealthResponse> {
  return getJson<PrepHealthResponse>("/api/prep-health");
}

export function fetchAuthStatus(): Promise<AuthStatus> {
  return getJson<AuthStatus>("/api/auth/status");
}

export function loginAuth(token: string): Promise<AuthStatus> {
  return sendJson<AuthStatus>("/api/auth/login", "POST", { token });
}

export function logoutAuth(): Promise<AuthStatus> {
  return sendJson<AuthStatus>("/api/auth/logout", "POST");
}

export function fetchWorldInfo(): Promise<WorldInfo> {
  return getJson<WorldInfo>("/api/world/info");
}

export function fetchWorlds(): Promise<WorldLibraryState> {
  return getJson<WorldLibraryState>("/api/worlds");
}

export function fetchCurrentWorld(): Promise<WorldLibraryState> {
  return getJson<WorldLibraryState>("/api/worlds/current");
}

export function openWorld(id: string): Promise<WorldLibraryState> {
  return sendJson<WorldLibraryState>("/api/worlds/open", "POST", { id });
}

export function createWorld(name: string): Promise<WorldLibraryState> {
  return sendJson<WorldLibraryState>("/api/worlds", "POST", { name });
}

export function saveRecentWorlds(recent: string[]): Promise<WorldLibraryState> {
  return sendJson<WorldLibraryState>("/api/worlds/recent", "PUT", { recent });
}

export function fetchWorldTree(): Promise<WorldEntry> {
  return getJson<WorldEntry>("/api/world/tree");
}

export function fetchCardTemplates(): Promise<CardTemplateCatalog> {
  return getJson<CardTemplateCatalog>("/api/card-templates");
}

export function fetchAudioLibrary(params: AudioLibraryParams = {}): Promise<AudioTrack[]> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.bus) {
    searchParams.set("bus", params.bus);
  }
  const suffix = searchParams.toString();
  return getJson<AudioTrack[]>(`/api/audio/library${suffix ? `?${suffix}` : ""}`);
}

export function fetchFastSlots(): Promise<FastSlot[]> {
  return getJson<FastSlot[]>("/api/fast-slots");
}

export function saveFastSlots(slots: FastSlot[]): Promise<FastSlot[]> {
  return sendJson<FastSlot[]>("/api/fast-slots", "PUT", { slots });
}

export function fetchCaptureToday(): Promise<CaptureTodayResponse> {
  return getJson<CaptureTodayResponse>("/api/capture/today");
}

export function createCapture(
  payload: CreateCaptureRequest
): Promise<CreateCaptureResponse> {
  return sendJson<CreateCaptureResponse>("/api/capture", "POST", payload);
}

export function fetchWorldFile(path: string): Promise<WorldFile> {
  return getJson<WorldFile>(`/api/world/file?path=${encodeURIComponent(path)}`);
}

export function fetchScreenWorldFile(path: string): Promise<WorldFile> {
  return getJson<WorldFile>(`/api/screen/world/file?path=${encodeURIComponent(path)}`);
}

export function saveWorldFile(
  path: string,
  payload: SaveWorldFileRequest
): Promise<SaveWorldFileResponse> {
  return sendJson<SaveWorldFileResponse>(
    `/api/world/file?path=${encodeURIComponent(path)}`,
    "PUT",
    payload
  );
}

export function createWorldFile(payload: CreateWorldFileRequest): Promise<WorldFile> {
  return sendJson<WorldFile>("/api/world/file", "POST", payload);
}

export function createWorldFolder(payload: CreateWorldFolderRequest): Promise<WorldEntry> {
  return sendJson<WorldEntry>("/api/world/folder", "POST", payload);
}

export function renameWorldFile(payload: RenameWorldFileRequest): Promise<WorldFile> {
  return sendJson<WorldFile>("/api/world/file/rename", "POST", payload);
}

export function trashWorldFile(
  payload: TrashWorldFileRequest
): Promise<TrashWorldFileResponse> {
  return sendJson<TrashWorldFileResponse>("/api/world/file/trash", "POST", payload);
}

export function moveWorldPath(
  payload: MoveWorldPathRequest
): Promise<WorldPathOperationResponse> {
  return sendJson<WorldPathOperationResponse>("/api/world/path/move", "POST", payload);
}

export function duplicateWorldPath(
  payload: DuplicateWorldPathRequest
): Promise<WorldPathOperationResponse> {
  return sendJson<WorldPathOperationResponse>(
    "/api/world/path/duplicate",
    "POST",
    payload
  );
}

export function trashWorldPath(
  payload: TrashWorldPathRequest
): Promise<TrashWorldPathResponse> {
  return sendJson<TrashWorldPathResponse>("/api/world/path/trash", "POST", payload);
}

export function fetchTrash(): Promise<TrashEntry[]> {
  return getJson<TrashEntry[]>("/api/world/trash");
}

export function restoreTrash(payload: RestoreTrashRequest): Promise<RestoreTrashResponse> {
  return sendJson<RestoreTrashResponse>("/api/world/trash/restore", "POST", payload);
}

export function deleteTrash(payload: DeleteTrashRequest): Promise<DeleteTrashResponse> {
  return sendJson<DeleteTrashResponse>("/api/world/trash", "DELETE", payload);
}

export function fetchPages(): Promise<PageSummary[]> {
  return getJson<PageSummary[]>("/api/pages");
}

export function fetchPage(path: string): Promise<PageDetail> {
  return getJson<PageDetail>(`/api/page?path=${encodeURIComponent(path)}`);
}

export function updatePageMetadata(
  path: string,
  payload: UpdatePageMetadataRequest
): Promise<UpdatePageMetadataResponse> {
  return sendJson<UpdatePageMetadataResponse>(
    `/api/page/metadata?path=${encodeURIComponent(path)}`,
    "PUT",
    payload
  );
}

export function fetchPageLinks(path: string): Promise<PageLink[]> {
  return getJson<PageLink[]>(`/api/page/links?path=${encodeURIComponent(path)}`);
}

export function fetchScreenPageLinks(path: string): Promise<PageLink[]> {
  return getJson<PageLink[]>(`/api/screen/page/links?path=${encodeURIComponent(path)}`);
}

export function fetchPageBacklinks(path: string): Promise<PageLink[]> {
  return getJson<PageLink[]>(`/api/page/backlinks?path=${encodeURIComponent(path)}`);
}

export function fetchScenarios(): Promise<ScenarioSummary[]> {
  return getJson<ScenarioSummary[]>("/api/scenarios");
}

export function runScenario(
  scenarioId: string,
  inputs: Record<string, string | number | boolean>
): Promise<ScenarioRunResult> {
  return sendJson<ScenarioRunResult>(
    `/api/scenarios/${encodeURIComponent(scenarioId)}/run`,
    "POST",
    { inputs }
  );
}

export function fetchScenarioRuns(): Promise<ScenarioRunResult[]> {
  return getJson<ScenarioRunResult[]>("/api/scenarios/runs");
}

export function fetchScripts(): Promise<DmsScriptSummary[]> {
  return getJson<DmsScriptSummary[]>("/api/scripts");
}

export function runDmsScript(path: string): Promise<DmsRunState> {
  return sendJson<DmsRunState>("/api/scripts/run", "POST", { path });
}

export function submitDmsForm(
  runId: string,
  values: Record<string, string | number | boolean>
): Promise<DmsRunState> {
  return sendJson<DmsRunState>(
    `/api/scripts/runs/${encodeURIComponent(runId)}/form`,
    "POST",
    { values }
  );
}

export function fetchDmsRun(runId: string): Promise<DmsRunState> {
  return getJson<DmsRunState>(`/api/scripts/runs/${encodeURIComponent(runId)}`);
}

export function cancelDmsRun(runId: string): Promise<DmsRunState> {
  return sendJson<DmsRunState>(
    `/api/scripts/runs/${encodeURIComponent(runId)}/cancel`,
    "POST"
  );
}

export function rebuildIndex(): Promise<RebuildIndexResponse> {
  return sendJson<RebuildIndexResponse>("/api/index/rebuild", "POST");
}

export function fetchDisplayState(): Promise<DisplayState> {
  return getJson<DisplayState>("/api/display/state");
}

export function fetchScreenDisplayState(): Promise<DisplayState> {
  return getJson<DisplayState>("/api/screen/display/state");
}

export function setDisplayFullscreen(path: string): Promise<DisplayState> {
  return sendJson<DisplayState>("/api/display/fullscreen", "PUT", { path });
}

export function openDisplayPopup(
  path: string,
  preset?: DisplayPopupPreset,
  visible = true
): Promise<DisplayState> {
  return sendJson<DisplayState>(
    "/api/display/popup",
    "POST",
    { path, ...(preset ? { preset } : {}), visible }
  );
}

export function setDisplayPopupVisible(
  popupId: string,
  visible: boolean
): Promise<DisplayState> {
  return sendJson<DisplayState>(
    `/api/display/popup/${encodeURIComponent(popupId)}`,
    "PUT",
    { visible }
  );
}

export function showActiveOnDisplay(payload: {
  path: string;
  mode: "fullscreen" | "popup";
  preset?: DisplayPopupPreset;
  clear_existing?: boolean;
}): Promise<DisplayState> {
  return sendJson<DisplayState>("/api/display/show-active", "POST", payload);
}

export function closeDisplayPopup(popupId: string): Promise<DisplayState> {
  return sendJson<DisplayState>(`/api/display/popup/${encodeURIComponent(popupId)}`, "DELETE");
}

export function clearDisplayPopups(): Promise<DisplayState> {
  return sendJson<DisplayState>("/api/display/popups", "DELETE");
}

export function blankDisplay(): Promise<DisplayState> {
  return sendJson<DisplayState>("/api/display/blank", "POST");
}

export function searchWorld(params: SearchParams): Promise<SearchResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.q);
  if (params.type) {
    searchParams.set("type", params.type);
  }
  if (params.tag) {
    searchParams.set("tag", params.tag);
  }
  if (params.folder) {
    searchParams.set("folder", params.folder);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  return getJson<SearchResult[]>(`/api/search?${searchParams.toString()}`);
}

export function fetchWorkspace(): Promise<WorkspaceState> {
  return getJson<WorkspaceState>("/api/workspace");
}

export function fetchHpTracker(): Promise<HpTrackerState> {
  return getJson<HpTrackerState>("/api/workspace/hp");
}

export function saveHpTracker(rows: HpTrackerRow[]): Promise<HpTrackerState> {
  return sendJson<HpTrackerState>("/api/workspace/hp", "PUT", { rows });
}

export function fetchTableSnapshots(): Promise<TableSnapshotSummary[]> {
  return getJson<TableSnapshotSummary[]>("/api/table-snapshots");
}

export function saveTableSnapshot(
  payload: SaveTableSnapshotRequest
): Promise<TableSnapshotDetail> {
  return sendJson<TableSnapshotDetail>("/api/table-snapshots", "POST", payload);
}

export function fetchTableSnapshot(snapshotId: string): Promise<TableSnapshotDetail> {
  return getJson<TableSnapshotDetail>(`/api/table-snapshots/${encodeURIComponent(snapshotId)}`);
}

export function restoreTableSnapshot(
  snapshotId: string
): Promise<RestoreTableSnapshotResponse> {
  return sendJson<RestoreTableSnapshotResponse>(
    `/api/table-snapshots/${encodeURIComponent(snapshotId)}/restore`,
    "POST"
  );
}

export function deleteTableSnapshot(
  snapshotId: string
): Promise<DeleteTableSnapshotResponse> {
  return sendJson<DeleteTableSnapshotResponse>(
    `/api/table-snapshots/${encodeURIComponent(snapshotId)}`,
    "DELETE"
  );
}

export function fetchWorkspaces(): Promise<NamedWorkspaceSummary[]> {
  return getJson<NamedWorkspaceSummary[]>("/api/workspaces");
}

export function createWorkspace(name: string): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspaces", "POST", { name });
}

export function renameWorkspace(
  workspaceId: string,
  name: string
): Promise<NamedWorkspaceSummary> {
  return sendJson<NamedWorkspaceSummary>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    "PUT",
    { name }
  );
}

export function activateWorkspace(workspaceId: string): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/activate`,
    "POST"
  );
}

export function deleteWorkspace(workspaceId: string): Promise<NamedWorkspaceSummary[]> {
  return sendJson<NamedWorkspaceSummary[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    "DELETE"
  );
}

export function saveWorkspaceTabs(
  tabs: WorkspaceTab[],
  activePath: string | null
): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspace/tabs", "PUT", { tabs, activePath });
}

export function saveWorkspaceLayout(layout: WorkspaceLayout): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspace/layout", "PUT", { layout });
}

export function saveFavorites(favorites: WorkspaceTab[]): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspace/favorites", "PUT", { favorites });
}

export function recordRecent(tab: WorkspaceTab): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspace/recent", "POST", { tab });
}

export function saveRecentFiles(recentFiles: WorkspaceTab[]): Promise<WorkspaceState> {
  return sendJson<WorkspaceState>("/api/workspace/recent", "PUT", { recentFiles });
}


export function buildMediaUrl(path: string): string {
  return `/api/world/media?path=${encodeURIComponent(path)}`;
}

export function buildScreenMediaUrl(path: string): string {
  return `/api/screen/world/media?path=${encodeURIComponent(path)}`;
}

export function buildDisplayBackgroundUrl(cacheKey?: string | null): string {
  if (!cacheKey) {
    return "/api/display/background";
  }
  return `/api/display/background?v=${encodeURIComponent(cacheKey)}`;
}

export function buildScreenDisplayBackgroundUrl(cacheKey?: string | null): string {
  if (!cacheKey) {
    return "/api/screen/display/background";
  }
  return `/api/screen/display/background?v=${encodeURIComponent(cacheKey)}`;
}

export function describeHealth(response: HealthResponse): string {
  return `${response.service}:${response.status}`;
}
