/**
 * jev_review: runs the zereight-jev-reviewer pipeline (tool/) as one tool call.
 * The script owns staging and thresholds; the agent verifies the returned
 * candidates against real code (see ../SKILL.md).
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const TOOL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "tool");
const CLI = join(TOOL_DIR, "src", "cli", "review-changes.ts");
const TIMEOUT_MS = 10 * 60 * 1000;
const MAX_PROGRESS_LINES = 6;
const MAX_STDERR_CHARS = 2000;
const MATRIX_ROWS = 8;

interface Finding {
	file: string;
	dimension: string;
	probability: number;
	line?: number;
	mechanism: string;
	severity: number;
	owner: string | null;
	action: string;
}

interface Report {
	screenedFiles: number;
	workflow: { thresholdSignals: number; locatedFindings: number };
	matrix: Array<Record<string, number | string>>;
	findings: Finding[];
}

interface RunResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

function runCliAsync(
	scope: string,
	base: string | undefined,
	signal: AbortSignal | undefined,
	onLine: (line: string) => void,
): Promise<RunResult> {
	return new Promise((resolvePromise, reject) => {
		const env = { ...process.env };
		if (base) env.JEV_BASE = base;
		else delete env.JEV_BASE;
		const child = spawn(process.execPath, [CLI, scope], {
			cwd: TOOL_DIR,
			env,
			signal,
			timeout: TIMEOUT_MS,
		});
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
	const lines = [
		`jev_review: ${report.screenedFiles} files, ${report.workflow.thresholdSignals} signals, ${report.findings.length} findings (unverified candidates)`,
		`routed models: ${routed}`,
		`full report: ${reportPath}`,
		"",
		"findings (severity desc):",
	];
	for (const f of report.findings) {
		lines.push(
			`- sev ${f.severity.toFixed(2)} [${f.dimension}/${f.mechanism}] ${f.file}:${f.line ?? "?"} p=${f.probability.toFixed(2)} owner=${f.owner ?? "-"} ${f.action}`,
		);
	}
	if (report.findings.length === 0) lines.push("- none");

	const dims = report.matrix[0] ? Object.keys(report.matrix[0]).filter((k) => k !== "file") : [];
	const ranked = [...report.matrix]
		.map((row) => ({ row, max: Math.max(...dims.map((d) => Number(row[d]) || 0)) }))
		.sort((a, b) => b.max - a.max)
		.slice(0, MATRIX_ROWS);
	lines.push("", `matrix top ${ranked.length} (${dims.join("/")}):`);
	for (const { row } of ranked) {
		lines.push(`- ${row.file}: ${dims.map((d) => Number(row[d]).toFixed(2)).join(" ")}`);
	}
	lines.push("", "Next: open each finding at file:line, confirm callers, drop what you cannot reproduce.");
	return lines.join("\n");
}

export default function jevReviewExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "jev_review",
		label: "Jev Review",
		description:
			"Run the zereight-jev-reviewer pipeline (TypeSafe Jev via OpenRouter) on a git diff of JS/TS files and return unverified finding candidates.",
		promptSnippet:
			"jev_review: staged risk screen of a JS/TS diff; returns candidates you must verify in code.",
		promptGuidelines: [
			"Use jev_review for PR or diff review requests (zereight-jev-reviewer). Do not run the CLI through bash.",
			"Set `base` to the PR target (e.g. origin/develop) for a three-dot diff; omit it for working-tree changes.",
			"Scope `path` to the changed package to limit cost; expect roughly 1-2 minutes.",
			"Results are candidates only: open each file:line, check production callers, and drop anything you cannot reproduce.",
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
			const { stdout, stderr, code } = await runCliAsync(scope, params.base, signal, (line) => {
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
}
