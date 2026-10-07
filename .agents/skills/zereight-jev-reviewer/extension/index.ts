/**
 * jev_review runs the zereight-jev-reviewer pipeline (tool/) as one tool call; jev_finalize checks
 * that the agent gave every candidate a disposition before the review is written.
 * The script owns staging and thresholds; the agent verifies candidates against real code (see ../SKILL.md).
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const TOOL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "tool");
const REVIEW_CLI = join(TOOL_DIR, "src", "cli", "review-changes.ts");
const FINALIZE_CLI = join(TOOL_DIR, "src", "cli", "finalize.ts");
const TIMEOUT_MS = 10 * 60 * 1000;
const MAX_PROGRESS_LINES = 6;
const MAX_STDERR_CHARS = 2000;
const MATRIX_ROWS = 8;
const NEIGHBOR_ROWS = 6;
const SKIPPED_ROWS = 10;

interface Finding {
	id?: string;
	file: string;
	dimension: string;
	probability: number;
	line?: number;
	mechanism: string;
	severity: number;
	owner: string | null;
	action: string;
	lens?: string;
	lensRef?: string;
}

interface ReviewTarget {
	id?: string;
	file: string;
	maxProbability: number;
	topDimension: string;
	importers: string[];
	transitiveImporters: string[];
	imports: string[];
	siblings: string[];
}

interface Report {
	screenedFiles: number;
	workflow: { thresholdSignals: number; locatedFindings: number };
	matrix: Array<Record<string, number | string>>;
	findings: Finding[];
	reviewTargets?: ReviewTarget[];
	skipped?: Array<{ id?: string; file: string; reason: string }>;
	notes?: string[];
	scopes?: Record<string, boolean>;
}

interface RunResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

function runCliAsync(
	cli: string,
	arg: string,
	base: string | undefined,
	signal: AbortSignal | undefined,
	onLine: (line: string) => void,
): Promise<RunResult> {
	return new Promise((resolvePromise, reject) => {
		const env = { ...process.env };
		if (base) env.JEV_BASE = base;
		else delete env.JEV_BASE;
		const child = spawn(process.execPath, [cli, arg], { cwd: TOOL_DIR, env, signal, timeout: TIMEOUT_MS });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			const text = String(chunk);
			stderr += text;
			for (const line of text.split("\n")) if (line.trim()) onLine(line.trim());
		});
		child.on("error", reject);
		child.on("close", (code) => resolvePromise({ stdout, stderr, code }));
	});
}

function summarize(report: Report, reportPath: string, routed: string): string {
	const skipped = report.skipped ?? [];
	const lines = [
		`jev_review: ${report.screenedFiles} files screened, ${skipped.length} skipped, ${report.workflow.thresholdSignals} signals, ${report.findings.length} findings (unverified candidates)`,
		`routed models: ${routed}`,
		`full report: ${reportPath}`,
	];
	for (const note of report.notes ?? []) lines.push(`note: ${note}`);
	const scopes = Object.entries(report.scopes ?? {}).filter(([, on]) => on).map(([name]) => name);
	if (report.scopes) lines.push(`scopes in play: ${scopes.join(", ") || "none"}`);

	lines.push("", "findings (severity desc):");
	for (const f of report.findings) {
		const lens = f.lens ? ` lens=${f.lens}` : "";
		lines.push(
			`- ${f.id} sev ${f.severity.toFixed(2)} [${f.dimension}/${f.mechanism}] ${f.file}:${f.line ?? "?"} p=${f.probability.toFixed(2)} owner=${f.owner ?? "-"} ${f.action}${lens}`,
		);
	}
	if (report.findings.length === 0) lines.push("- none");

	if (skipped.length > 0) {
		lines.push("", `NOT SCREENED (${skipped.length}), each needs a disposition in jev_finalize:`);
		for (const s of skipped.slice(0, SKIPPED_ROWS)) lines.push(`- ${s.id} ${s.file}: ${s.reason}`);
		if (skipped.length > SKIPPED_ROWS) lines.push(`- (+${skipped.length - SKIPPED_ROWS} more in report)`);
	}

	const dims = report.matrix[0] ? Object.keys(report.matrix[0]).filter((k) => k !== "file") : [];
	const ranked = [...report.matrix]
		.map((row) => ({ row, max: Math.max(...dims.map((d) => Number(row[d]) || 0)) }))
		.sort((a, b) => b.max - a.max)
		.slice(0, MATRIX_ROWS);
	lines.push("", `matrix top ${ranked.length} (${dims.join("/")}):`);
	for (const { row } of ranked) {
		lines.push(`- ${row.file}: ${dims.map((d) => Number(row[d]).toFixed(2)).join(" ")}`);
	}

	const targets = report.reviewTargets ?? [];
	lines.push("", `review targets ${targets.length} (generative review with neighbors; full lists in report):`);
	for (const t of targets) {
		lines.push(`- ${t.id} ${t.file} max=${t.maxProbability.toFixed(2)} [${t.topDimension}]`);
		lines.push(`  importers: ${listOrNone(t.importers)}`);
		lines.push(`  transitive: ${listOrNone(t.transitiveImporters)}`);
		lines.push(`  siblings: ${t.siblings.length}, imports: ${t.imports.length}`);
	}
	lines.push(
		"",
		"Next: (a) verify each finding; (b) review every target with its neighbors per SKILL.md step 4; (c) submit every F/T/S id to jev_finalize before writing the review.",
	);
	return lines.join("\n");
}

function listOrNone(paths: string[]): string {
	if (paths.length === 0) return "none";
	const shown = paths.slice(0, NEIGHBOR_ROWS).join(", ");
	return paths.length > NEIGHBOR_ROWS ? `${shown} (+${paths.length - NEIGHBOR_ROWS})` : shown;
}

export default function jevReviewExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "jev_review",
		label: "Jev Review",
		description:
			"Run the zereight-jev-reviewer pipeline (TypeSafe Jev via OpenRouter) on a git diff of JS/TS files and return unverified finding candidates, review targets with neighbors, and skipped files.",
		promptSnippet:
			"jev_review: staged risk screen of a JS/TS diff; returns candidates (F), review targets (T), and skipped files (S) you must dispose of via jev_finalize.",
		promptGuidelines: [
			"Use jev_review for PR or diff review requests (zereight-jev-reviewer). Do not run the CLI through bash.",
			"Set `base` to the PR target (e.g. origin/develop) for a three-dot diff; omit it for working-tree changes.",
			"Scope `path` to the changed package to limit cost.",
			"Results are candidates only: open each file:line, check production callers, and drop anything you cannot reproduce.",
			"Zero findings is not a clean bill: always run the generative review on reviewTargets with their importers and siblings (SKILL.md step 4).",
			"Never write the final review before jev_finalize returns ok.",
		],
		parameters: Type.Object({
			path: Type.Optional(
				Type.String({ description: "Repository or package directory to review (default: current directory)" }),
			),
			base: Type.Optional(
				Type.String({ description: "Base ref for <base>...HEAD, e.g. origin/develop. Omit to review the working tree." }),
			),
		}),

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			if ((process.env.JEV_PROVIDER ?? "jev") === "jev" && !process.env.OPENROUTER_API_KEY) {
				throw new Error("OPENROUTER_API_KEY is not set (JEV_PROVIDER=jev)");
			}
			if (!existsSync(join(TOOL_DIR, "node_modules"))) {
				throw new Error(`Run once: cd ${TOOL_DIR} && npm install`);
			}
			const scope = resolve(ctx.cwd, params.path ?? ".");
			if (!existsSync(scope)) throw new Error(`path not found: ${scope}`);

			const recent: string[] = [];
			const { stdout, stderr, code } = await runCliAsync(REVIEW_CLI, scope, params.base, signal, (line) => {
				recent.push(line);
				if (recent.length > MAX_PROGRESS_LINES) recent.shift();
				onUpdate?.({ content: [{ type: "text", text: recent.join("\n") }], details: {} });
			});
			if (code !== 0) {
				throw new Error(`jev review failed (exit ${code}): ${stderr.slice(-MAX_STDERR_CHARS)}`);
			}

			const report = JSON.parse(stdout) as Report;
			const dir = join(tmpdir(), "jev-review");
			mkdirSync(dir, { recursive: true });
			const reportPath = join(dir, `report-${Date.now()}.json`);
			writeFileSync(reportPath, stdout);
			const routed = /routed models: (.*)/.exec(stderr)?.[1] ?? "unknown";

			return {
				content: [{ type: "text", text: summarize(report, reportPath, routed) }],
				details: { reportPath, routed, scope, base: params.base ?? null, findings: report.findings.length },
			};
		},
	});

	pi.registerTool({
		name: "jev_finalize",
		label: "Jev Finalize",
		description:
			"Validate that every jev_review candidate (F findings, T review targets, S skipped files) has a disposition with real citations. Returns errors to fix, or the verification line for the final review.",
		promptSnippet:
			"jev_finalize: submit findings/dropped/cleared for a jev_review report; the final review is allowed only after ok.",
		promptGuidelines: [
			"Each F id: one finding (candidate=F#) or one dropped entry with a reason and the file:line that shows why.",
			"Each T id: findings with candidate=T# (or none for new ones), or one cleared entry whose `checked` lists neighbor files you read.",
			"Each S id: a cleared entry with the files you checked, or a finding.",
			"Finding lines must be changed diff lines; for a problem in untouched code set outsideDiff=true and add evidenceRefs.",
			"Severity marks: 🔴 🟠 🟡 🔵. Paste the returned verification line into the final review.",
		],
		parameters: Type.Object({
			reportPath: Type.String({ description: "reportPath returned by jev_review" }),
			findings: Type.Array(Type.Any(), {
				description: "{candidate?, title, severity, file, line, evidence, evidenceRefs?:[{file,line}], outsideDiff?}",
			}),
			dropped: Type.Array(Type.Any(), { description: "{candidate, reason, file, line}" }),
			cleared: Type.Array(Type.Any(), { description: "{candidate, checked:[paths], note?}" }),
		}),

		async execute(_toolCallId, params, signal) {
			const dir = join(tmpdir(), "jev-review");
			mkdirSync(dir, { recursive: true });
			const submissionPath = join(dir, `submission-${Date.now()}.json`);
			writeFileSync(submissionPath, JSON.stringify(params));
			const { stdout, stderr, code } = await runCliAsync(FINALIZE_CLI, submissionPath, undefined, signal, () => {});
			if (code !== 0) throw new Error(`jev finalize failed (exit ${code}): ${stderr.slice(-MAX_STDERR_CHARS)}`);
			const result = JSON.parse(stdout) as { ok: boolean; errors: string[]; summary: string | null; warnings: string[] };
			const warnings = result.warnings.map((w) => `warning: ${w}`);
			const text = result.ok
				? ["jev_finalize ok. Put this line in the final review:", result.summary, ...warnings].join("\n")
				: [`jev_finalize FAILED (${result.errors.length}). Fix these and submit again:`, ...result.errors.map((e) => `- ${e}`), ...warnings].join("\n");
			return { content: [{ type: "text", text }], details: { ok: result.ok, errors: result.errors.length } };
		},
	});
}
