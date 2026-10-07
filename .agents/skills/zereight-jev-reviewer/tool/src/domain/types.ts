// Shapes shared by both review modes and the saved dashboard report.
import type { Dimension } from "./config.ts";

export type ReviewMode = "changes" | "codebase";

export type ChangedFile = {
  path: string;
  patch: string;
};

export type SourceFile = {
  path: string;
  content: string;
};

export type Hunk = {
  id: string;
  startLine: number;
  patch: string;
};

// A bug pattern from tool/lenses. `ref` names the zereight-review reference holding the judging rules.
export type Lens = {
  name: string;
  files: string[];
  hunkRegex: RegExp | null;
  description: string;
  trueWhen: string;
  falseWhen: string;
  ref: string;
};

export type LensHit = { name: string; description: string; ref: string; probability: number };

export type Screening<File extends { path: string }> = {
  file: File;
  probabilities: Record<Dimension, number>;
  lenses?: LensHit[];
};

export type Signal<File extends { path: string }> = {
  file: File;
  dimension: Dimension;
  probability: number;
  lens?: string;
  lensDescription?: string;
  lensRef?: string;
};

// A file or check the review did not cover; finalize requires an explicit disposition for each.
export type Skipped = { id?: string; file: string; reason: string };

export type Finding<File extends { path: string }> = Signal<File> & {
  line: number;
  locationConfidence: number;
  mechanism: string;
  mechanismConfidence: number;
  severity: number;
  severityConfidence: number;
  owner: string | null;
  ownerConfidence: number | null;
  action: "comment" | "request_changes";
};

export type FileProfile = {
  file: string;
  category: string;
  categoryConfidence: number;
  reviewPriority: number;
  reviewPriorityConfidence: number;
};

// Code around a changed file that its patch does not show.
export type Neighbors = {
  importers: string[];
  transitiveImporters: string[];
  imports: string[];
  siblings: string[];
};

export type ReviewTarget = {
  id?: string;
  file: string;
  maxProbability: number;
  topDimension: Dimension;
} & Neighbors;

export type ReviewReport = {
  mode: ReviewMode;
  scope: string;
  dimensions: Array<{ key: Dimension; label: string; short: string }>;
  config: {
    screenThreshold: number;
    severityMax: number;
    maxFollowUps: number;
    maxProfiles: number;
  };
  screenedFiles: number;
  contextFiles: string[];
  matrix: Array<{ file: string } & Record<Dimension, number>>;
  followedSignals: number;
  profiles: FileProfile[];
  workflow: {
    screenedCells: number;
    thresholdSignals: number;
    profiledFiles: number;
    followedSignals: number;
    locatedFindings: number;
    routedFindings: number;
  };
  findings: Array<Omit<Finding<{ path: string }>, "file"> & { file: string; id?: string }>;
  skipped?: Skipped[];
  notes?: string[];
  // Set by the change review so jev_finalize can verify lines with `zer`.
  base?: string | null;
  repoRoot?: string;
  scopes?: Record<string, boolean>;
  // Absent in reports saved before the generative review step existed.
  reviewTargets?: ReviewTarget[];
};

// Deliberately loose so a report saved by an older version remains viewable.
export function isReviewReport(value: unknown): value is ReviewReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.scope === "string" &&
    typeof report.screenedFiles === "number" &&
    Array.isArray(report.matrix) &&
    typeof report.followedSignals === "number" &&
    Array.isArray(report.findings)
  );
}
