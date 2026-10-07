// Shared staged orchestration. Each review mode owns discovery and judgments;
// this module owns concurrency, thresholds, ranking, and report assembly.
import {
  CONCURRENCY,
  type Dimension,
  dimensionMetadata,
  dimensions,
  MAX_FOLLOW_UPS,
  MAX_PROFILES,
  MAX_REVIEW_TARGETS,
  SCREEN_THRESHOLD,
  SEVERITY_MAX,
} from "../domain/config.ts";
import type {
  FileProfile,
  Finding,
  Neighbors,
  ReviewMode,
  ReviewReport,
  ReviewTarget,
  Screening,
  Signal,
  Skipped,
} from "../domain/types.ts";

export type Log = (message: string) => void;

type Strategy<File extends { path: string }, Context extends { path: string }> = {
  mode: ReviewMode;
  subject: string;
  context: string;
  discover: (scope: string) => { files: File[]; contextFiles: Context[]; skipped?: Skipped[] };
  screen: (file: File, contextFiles: Context[]) => Promise<Screening<File>>;
  profile: (
    file: File,
    probabilities: Record<Dimension, number>,
  ) => Promise<FileProfile>;
  locate: (signal: Signal<File>) => Promise<Finding<File> | null>;
  // Optional: deterministic context for the generative review step.
  neighbors?: (file: File) => Neighbors;
};

export async function runReview<File extends { path: string }, Context extends { path: string }>(
  scope: string,
  log: Log,
  strategy: Strategy<File, Context>,
): Promise<ReviewReport> {
  const { files, contextFiles, skipped: discoverSkipped = [] } = strategy.discover(scope);
  const skipped: Skipped[] = [...discoverSkipped];
  if (files.length === 0 && skipped.length === 0) {
    throw new Error("No " + strategy.subject + " JavaScript or TypeScript files found under " + scope);
  }

  log("Screening " + files.length + " " + strategy.subject + " files with " + contextFiles.length + " " + strategy.context + " files as context...");
  const screened = await mapLimit(files, CONCURRENCY, async (file) => {
    log("  screen " + file.path);
    try {
      return await strategy.screen(file, contextFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      skipped.push({ file: file.path, reason: "screen call failed: " + message.slice(0, 160) });
      return null;
    }
  });
  const matrix = screened.filter((entry): entry is Screening<File> => entry !== null);

  const signals = matrix
    .flatMap(({ file, probabilities, lenses = [] }) => [
      ...(Object.entries(probabilities) as [Dimension, number][])
        .filter(([dimension]) => dimension !== "pattern")
        .map(([dimension, probability]): Signal<File> => ({ file, dimension, probability })),
      ...lenses.map(
        (hit): Signal<File> => ({
          file,
          dimension: "pattern",
          probability: hit.probability,
          lens: hit.name,
          lensDescription: hit.description,
          lensRef: hit.ref,
        }),
      ),
    ])
    .filter((signal) => signal.probability >= SCREEN_THRESHOLD)
    .sort((a, b) => b.probability - a.probability);

  const profileCandidates = [...matrix]
    .sort((a, b) => maxProbability(b) - maxProbability(a))
    .slice(0, MAX_PROFILES);
  log("Profiling " + profileCandidates.length + " files...");
  const profiles = await mapLimit(profileCandidates, CONCURRENCY, ({ file, probabilities }) => {
    log("  profile " + file.path);
    return strategy.profile(file, probabilities);
  });

  const followUps = signals.slice(0, MAX_FOLLOW_UPS);
  log("Following " + followUps.length + " of " + signals.length + " signals at or above " + SCREEN_THRESHOLD + "...");
  const located = await mapLimit(followUps, CONCURRENCY, (signal) => {
    log("  inspect " + signal.file.path + " [" + signal.dimension + "=" + signal.probability.toFixed(2) + "]");
    return strategy.locate(signal).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      skipped.push({ file: signal.file.path, reason: "locate failed for " + (signal.lens ?? signal.dimension) + ": " + message.slice(0, 160) });
      return null;
    });
  });

  const findings = located
    .filter((finding): finding is Finding<File> => finding !== null)
    .sort((a, b) => b.severity - a.severity);

  const reviewTargets = strategy.neighbors
    ? rankedForReview(matrix).map(({ file, probabilities }): ReviewTarget => {
        const [topDimension, top] = topCell(probabilities);
        log("  neighbors " + file.path);
        try {
          return { file: file.path, maxProbability: top, topDimension, ...strategy.neighbors!(file) };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          skipped.push({ file: file.path, reason: "neighbor collection failed: " + message.slice(0, 160) });
          return { file: file.path, maxProbability: top, topDimension, importers: [], transitiveImporters: [], imports: [], siblings: [] };
        }
      }).map((target, index) => ({ ...target, id: "T" + (index + 1) }))
    : undefined;

  return {
    mode: strategy.mode,
    scope,
    dimensions: dimensionMetadata,
    config: {
      screenThreshold: SCREEN_THRESHOLD,
      severityMax: SEVERITY_MAX,
      maxFollowUps: MAX_FOLLOW_UPS,
      maxProfiles: MAX_PROFILES,
    },
    screenedFiles: files.length,
    contextFiles: contextFiles.map((file) => file.path),
    matrix: matrix.map(({ file, probabilities }) => ({ file: file.path, ...probabilities })),
    followedSignals: followUps.length,
    profiles,
    workflow: {
      screenedCells: files.length * Object.keys(dimensions).length,
      thresholdSignals: signals.length,
      profiledFiles: profiles.length,
      followedSignals: followUps.length,
      locatedFindings: findings.length,
      routedFindings: findings.filter((finding) => finding.owner !== null).length,
    },
    findings: findings.map(({ file, ...finding }, index) => ({ id: "F" + (index + 1), file: file.path, ...finding })),
    skipped: skipped.map((entry, index) => ({ id: "S" + (index + 1), ...entry })),
    reviewTargets,
  };
}

function rankedForReview<File extends { path: string }>(matrix: Screening<File>[]): Screening<File>[] {
  return [...matrix]
    .sort((a, b) => maxProbability(b) - maxProbability(a))
    .slice(0, MAX_REVIEW_TARGETS);
}

function topCell(probabilities: Record<Dimension, number>): [Dimension, number] {
  return (Object.entries(probabilities) as [Dimension, number][]).reduce((best, cell) =>
    cell[1] > best[1] ? cell : best,
  );
}

function maxProbability<File extends { path: string }>(screening: Screening<File>): number {
  return Math.max(...Object.values(screening.probabilities));
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await callback(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
