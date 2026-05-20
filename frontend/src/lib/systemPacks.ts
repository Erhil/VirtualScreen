export type SystemPackPreviewStatus = "ready" | "conflict" | "skipped" | "invalid";

export type SystemPackPreviewRow = {
  id: string;
  source_path: string;
  target_path: string;
  status: SystemPackPreviewStatus;
  message?: string | null;
};

export type SystemPackPreviewGroups = Record<
  SystemPackPreviewStatus,
  SystemPackPreviewRow[]
>;

export type SystemPackConflictDecisionKind = "overwrite" | "skip" | "rename";

export type SystemPackConflictDecision = {
  target_path: string;
  decision: SystemPackConflictDecisionKind;
  rename_target_path?: string;
};

export type SystemPackConflictDecisionValidation = {
  valid: boolean;
  errors: Record<string, string>;
};

export type SystemPackImportCounts = {
  imported: number;
  overwritten: number;
  renamed: number;
  skipped: number;
  failed: number;
};

export type SystemPackImportSummary = SystemPackImportCounts & {
  changed: number;
  total: number;
};

export function groupSystemPackPreviewRows(
  rows: SystemPackPreviewRow[]
): SystemPackPreviewGroups {
  return {
    ready: rows.filter((row) => row.status === "ready"),
    conflict: rows.filter((row) => row.status === "conflict"),
    skipped: rows.filter((row) => row.status === "skipped"),
    invalid: rows.filter((row) => row.status === "invalid")
  };
}

export function validateSystemPackConflictDecisions(
  rows: SystemPackPreviewRow[],
  decisions: SystemPackConflictDecision[]
): SystemPackConflictDecisionValidation {
  const conflicts = rows.filter((row) => row.status === "conflict");
  const decisionsByPath = new Map(decisions.map((decision) => [decision.target_path, decision]));
  const readyTargets = new Set(
    rows
      .filter((row) => row.status === "ready")
      .map((row) => normalizeWorldPath(row.target_path))
  );
  const renameTargetCounts = new Map<string, number>();

  for (const decision of decisions) {
    if (decision.decision === "rename") {
      const normalizedTarget = normalizeWorldPath(decision.rename_target_path ?? "");
      renameTargetCounts.set(normalizedTarget, (renameTargetCounts.get(normalizedTarget) ?? 0) + 1);
    }
  }

  const errors: Record<string, string> = {};

  for (const conflict of conflicts) {
    const decision = decisionsByPath.get(conflict.target_path);
    if (!decision) {
      errors[conflict.target_path] = "Choose how to resolve this conflict.";
      continue;
    }

    if (decision.decision !== "rename") {
      continue;
    }

    const renameTargetPath = decision.rename_target_path ?? "";
    const normalizedTarget = normalizeWorldPath(renameTargetPath);
    const pathError = validateWorldRelativePath(renameTargetPath);
    if (pathError) {
      errors[conflict.target_path] = pathError;
      continue;
    }

    if (
      readyTargets.has(normalizedTarget) ||
      (renameTargetCounts.get(normalizedTarget) ?? 0) > 1
    ) {
      errors[conflict.target_path] = "Rename target conflicts with another import.";
      continue;
    }

    if (normalizedTarget === normalizeWorldPath(conflict.target_path)) {
      errors[conflict.target_path] = "Rename target must be different from the existing path.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function mapSystemPackImportResultSummary(
  counts: SystemPackImportCounts
): SystemPackImportSummary {
  const changed = counts.imported + counts.overwritten + counts.renamed;
  return {
    ...counts,
    changed,
    total: changed + counts.skipped + counts.failed
  };
}

function validateWorldRelativePath(path: string): string | null {
  const normalized = normalizeWorldPath(path);
  if (!normalized) {
    return "Rename target path is required.";
  }
  if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith("/")) {
    return "Rename target must stay inside the world.";
  }
  if (normalized.split("/").some((part) => part === "..")) {
    return "Rename target must stay inside the world.";
  }
  return null;
}

function normalizeWorldPath(path: string): string {
  return path.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}
