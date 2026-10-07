// Finalize: checks that the agent gave every candidate a disposition before the review is written.
// Candidates are Jev findings (F), review targets (T), and skipped files (S). Lines are verified
// with `zer`; this module adds the coverage rules zer does not know about.
import { readFileSync } from "node:fs";
import { lineCount, verifyLines, zerAvailable } from "../adapters/verification.ts";
import { isReviewReport, type ReviewReport } from "../domain/types.ts";

const SEVERITIES = ["🔴", "🟠", "🟡", "🔵"];
const MIN_EVIDENCE_CHARS = 20;

export type SubFinding = {
  candidate?: string;
  title: string;
  severity: string;
  file: string;
  line: number;
  evidence: string;
  // Locations outside the diff that prove the finding (importers, siblings).
  evidenceRefs?: Array<{ file: string; line: number }>;
  // True when the problem itself is in untouched code, so the line cannot be a diff line.
  outsideDiff?: boolean;
};
export type Dropped = { candidate: string; reason: string; file: string; line: number };
export type Cleared = { candidate: string; checked: string[]; note?: string };
export type Submission = { reportPath: string; findings: SubFinding[]; dropped: Dropped[]; cleared: Cleared[] };

export type FinalizeResult = { ok: boolean; errors: string[]; summary: string | null; warnings: string[] };

export function finalizeReview(submission: Submission): FinalizeResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const report = loadReport(submission.reportPath);
  if (!report) return { ok: false, errors: ["reportPath is not a jev_review report: " + submission.reportPath], summary: null, warnings };
  const repoRoot = report.repoRoot ?? ".";
  const findings = submission.findings ?? [];
  const dropped = submission.dropped ?? [];
  const cleared = submission.cleared ?? [];

  const targets = new Map((report.reviewTargets ?? []).map((target) => [target.id ?? "", target]));
  const candidates = new Set<string>([
    ...report.findings.map((finding) => finding.id ?? ""),
    ...targets.keys(),
    ...(report.skipped ?? []).map((entry) => entry.id ?? ""),
  ]);
  candidates.delete("");

  // Dispositions per candidate.
  const raised = count(findings.map((finding) => finding.candidate));
  const droppedBy = count(dropped.map((entry) => entry.candidate));
  const clearedBy = count(cleared.map((entry) => entry.candidate));
  for (const id of [...raised.keys(), ...droppedBy.keys(), ...clearedBy.keys()]) {
    if (!candidates.has(id)) errors.push("candidate " + id + " is not in this report");
  }
  for (const id of candidates) {
    const kind = id[0];
    const total = (raised.get(id) ?? 0) + (droppedBy.get(id) ?? 0) + (clearedBy.get(id) ?? 0);
    if (total === 0) errors.push("candidate " + id + " has no disposition: raise it in findings, or drop/clear it with a reason");
    else if (kind === "F" && total > 1) errors.push("candidate " + id + " has " + total + " dispositions: use exactly one");
    else if (kind === "F" && clearedBy.has(id)) errors.push("candidate " + id + " is a Jev finding: raise or drop it, not clear it");
    else if (kind === "T" && (droppedBy.has(id) || (raised.has(id) && clearedBy.has(id)))) errors.push("review target " + id + ": raise findings, or clear it with checked files, not both and not drop");
    else if (kind === "S" && droppedBy.has(id)) errors.push("skipped " + id + ": clear it with the files you checked, or raise a finding");
  }

  // Findings.
  const toVerify: Array<{ id: string; file: string; line: number }> = [];
  findings.forEach((finding, index) => {
    const at = "findings[" + index + "] (" + (finding.title || "untitled") + ")";
    if (!finding.title) errors.push(at + ": title is empty");
    if (!SEVERITIES.includes(finding.severity)) errors.push(at + ": severity must be one of " + SEVERITIES.join(" "));
    if ((finding.evidence ?? "").trim().length < MIN_EVIDENCE_CHARS) errors.push(at + ": evidence must quote the code (at least " + MIN_EVIDENCE_CHARS + " chars)");
    checkCitation(repoRoot, at, finding.file, finding.line, errors);
    (finding.evidenceRefs ?? []).forEach((ref, refIndex) => checkCitation(repoRoot, at + ".evidenceRefs[" + refIndex + "]", ref.file, ref.line, errors));
    if (finding.outsideDiff === true && (finding.evidenceRefs ?? []).length === 0 && finding.candidate?.[0] !== "F") {
      errors.push(at + ": outsideDiff needs at least one evidenceRef");
    }
    if (finding.outsideDiff !== true) toVerify.push({ id: String(index), file: finding.file, line: finding.line });
  });
  dropped.forEach((entry, index) => {
    const at = "dropped[" + index + "] (" + entry.candidate + ")";
    if (!(entry.reason ?? "").trim()) errors.push(at + ": reason is empty");
    checkCitation(repoRoot, at, entry.file, entry.line, errors);
  });

  // Line checks against the diff.
  if (toVerify.length > 0) {
    if (report.base && zerAvailable()) {
      try {
        for (const result of verifyLines(repoRoot, report.base, toVerify)) {
          if (result.verdict === "ok") continue;
          const finding = findings[Number(result.id)];
          errors.push("findings[" + result.id + "] (" + finding?.title + "): " + result.verdict + (result.reason ? " - " + result.reason : "") + "; cite a changed line or set outsideDiff with evidenceRefs");
        }
      } catch (error) {
        warnings.push("zer verify failed, lines checked for existence only: " + String(error).slice(0, 160));
      }
    } else {
      warnings.push("diff line check skipped (" + (report.base ? "zer CLI not found" : "no base ref") + "); lines checked for existence only");
    }
  }

  // Cleared candidates must name files that exist; a cleared target must include one of its neighbors.
  cleared.forEach((entry, index) => {
    const at = "cleared[" + index + "] (" + entry.candidate + ")";
    const checked = entry.checked ?? [];
    if (checked.length === 0) errors.push(at + ": checked is empty; list the files you read");
    for (const path of checked) if (lineCount(repoRoot, path) === null) errors.push(at + ": " + path + " is not a file in the repository");
    const target = targets.get(entry.candidate);
    if (target) {
      const neighbors = new Set([...target.importers, ...target.transitiveImporters, ...target.imports, ...target.siblings]);
      if (neighbors.size > 0 && !checked.some((path) => neighbors.has(path))) {
        errors.push(at + ": checked has none of the target's importers, imports, or siblings");
      }
    }
  });

  if (errors.length > 0) return { ok: false, errors, summary: null, warnings };

  const passed = report.findings.filter((finding) => raised.has(finding.id ?? "")).length;
  const droppedJev = report.findings.filter((finding) => droppedBy.has(finding.id ?? "")).length;
  const generative = findings.filter((finding) => finding.candidate?.[0] !== "F").length;
  const summary = [
    "검증 결과: jev " + report.screenedFiles + " files, " + report.workflow.thresholdSignals + " signals, " + report.findings.length + " findings",
    "→ 검증 통과 " + passed + "개 / 폐기 " + droppedJev + "개;",
    "생성형 리뷰 " + targets.size + " targets → 지적 " + generative + "개, 이상 없음 " + cleared.filter((entry) => entry.candidate[0] === "T").length + "개;",
    "건너뜀 " + (report.skipped ?? []).length + "개 (확인 " + cleared.filter((entry) => entry.candidate[0] === "S").length + "개)",
  ].join(" ");
  return { ok: true, errors: [], summary, warnings };
}

function loadReport(path: string): ReviewReport | null {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isReviewReport(value) ? value : null;
  } catch {
    return null;
  }
}

function count(ids: Array<string | undefined>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

function checkCitation(repoRoot: string, at: string, file: string, line: number, errors: string[]): void {
  const lines = lineCount(repoRoot, file);
  if (lines === null) errors.push(at + ": " + file + " is not a file in the repository");
  else if (!Number.isInteger(line) || line < 1 || line > lines) errors.push(at + ": cites line " + line + " of " + file + ", which has " + lines + " lines");
}
