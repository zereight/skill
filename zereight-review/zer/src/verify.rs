use serde::Serialize;

use crate::manifest::Manifest;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Verdict {
    Ok,
    OutOfHunk,
    UnknownFile,
    InvalidRecord,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Side {
    New,
    Old,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CheckResult {
    pub id: Option<String>,
    pub verdict: Verdict,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Summary {
    pub ok: usize,
    #[serde(rename = "out-of-hunk")]
    pub out_of_hunk: usize,
    #[serde(rename = "unknown-file")]
    pub unknown_file: usize,
    #[serde(rename = "invalid-record")]
    pub invalid_record: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct VerdictReport {
    pub results: Vec<CheckResult>,
    pub summary: Summary,
}

const VALID_SEVERITY: &[&str] = &["critical", "major", "minor", "trivial", "info", "refactor"];

fn parse_side(raw: &str) -> Option<Side> {
    match raw {
        "new" => Some(Side::New),
        "old" => Some(Side::Old),
        _ => None,
    }
}

// "src/a.ts:14" or "src/a.ts:14:old"
fn parse_line_ref(raw: &str) -> Option<(String, u32, Side)> {
    let trimmed = raw.trim();
    let (body, side) = if let Some(rest) = trimmed.strip_suffix(":old") {
        (rest, Side::Old)
    } else if let Some(rest) = trimmed.strip_suffix(":new") {
        (rest, Side::New)
    } else {
        (trimmed, Side::New)
    };
    let (file, line_s) = body.rsplit_once(':')?;
    let line = line_s.parse::<u32>().ok()?;
    if file.is_empty() || line < 1 {
        return None;
    }
    Some((file.to_string(), line, side))
}

fn line_in_hunks(hunks: &[crate::manifest::Hunk], line: u32) -> bool {
    hunks
        .iter()
        .any(|h| line >= h.start && line < h.start.saturating_add(h.count))
}

// Minimum shape is file + line. Strings "file:line[:old]" are accepted.
// Severity, if present, must be in the skill list. Other fields are optional.
fn as_finding(v: &serde_json::Value) -> Option<(Option<String>, String, u32, Side)> {
    if let Some(s) = v.as_str() {
        let (file, line, side) = parse_line_ref(s)?;
        return Some((None, file, line, side));
    }
    let file = v.get("file")?.as_str()?.to_string();
    let line = u32::try_from(v.get("line")?.as_u64()?).ok()?;
    if file.is_empty() || line < 1 {
        return None;
    }
    let side = match v.get("side") {
        None => Side::New,
        Some(raw) => parse_side(raw.as_str()?)?,
    };
    if let Some(sev) = v.get("severity") {
        let s = sev.as_str()?;
        if !VALID_SEVERITY.contains(&s) {
            return None;
        }
    }
    let id = v
        .get("id")
        .and_then(|x| x.as_str())
        .filter(|s| !s.is_empty())
        .map(String::from);
    Some((id, file, line, side))
}

// One finding against one manifest. Pure.
pub fn check_finding(manifest: &Manifest, finding: &serde_json::Value) -> CheckResult {
    let id_hint = finding
        .get("id")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| finding.as_str().map(String::from));
    let Some((id, file, line, side)) = as_finding(finding) else {
        return CheckResult {
            id: id_hint,
            verdict: Verdict::InvalidRecord,
            reason: Some("record needs file + line (or \"file:line[:old]\")".to_string()),
        };
    };
    let Some(entry) = manifest.files.iter().find(|f| f.path == file) else {
        return CheckResult {
            id: id.clone(),
            verdict: Verdict::UnknownFile,
            reason: Some(format!("file not in manifest: {file}")),
        };
    };
    let hunks = match side {
        Side::New => &entry.hunks,
        Side::Old => &entry.old_hunks,
    };
    if line_in_hunks(hunks, line) {
        return CheckResult {
            id,
            verdict: Verdict::Ok,
            reason: None,
        };
    }
    // Deleted files and pure-deletion hunks have no new lines. Accept old
    // hunks when the agent omitted side=old.
    if matches!(side, Side::New)
        && (entry.status == 'D' || entry.hunks.is_empty())
        && line_in_hunks(&entry.old_hunks, line)
    {
        return CheckResult {
            id,
            verdict: Verdict::Ok,
            reason: Some("old-side (deleted or no new hunks)".to_string()),
        };
    }
    CheckResult {
        id,
        verdict: Verdict::OutOfHunk,
        reason: Some(format!("line {line} outside changed hunks of {file}")),
    }
}

pub fn verify_all(manifest: &Manifest, findings: &[serde_json::Value]) -> VerdictReport {
    let results: Vec<CheckResult> = findings.iter().map(|f| check_finding(manifest, f)).collect();
    let mut summary = Summary {
        ok: 0,
        out_of_hunk: 0,
        unknown_file: 0,
        invalid_record: 0,
    };
    for r in &results {
        match r.verdict {
            Verdict::Ok => summary.ok += 1,
            Verdict::OutOfHunk => summary.out_of_hunk += 1,
            Verdict::UnknownFile => summary.unknown_file += 1,
            Verdict::InvalidRecord => summary.invalid_record += 1,
        }
    }
    VerdictReport { results, summary }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::manifest::{Bundle, Hunk, Manifest, ManifestFile, Scope, Scopes};

    fn fixture_manifest() -> Manifest {
        let empty = || Scope {
            in_scope: false,
            files: vec![],
        };
        Manifest {
            version: 2,
            base: "main".into(),
            head: "HEAD".into(),
            files: vec![
                ManifestFile {
                    path: "src/a.ts".into(),
                    status: 'M',
                    hunks: vec![Hunk { start: 12, count: 6 }],
                    old_hunks: vec![Hunk { start: 10, count: 3 }],
                },
                ManifestFile {
                    path: "src/gone.ts".into(),
                    status: 'D',
                    hunks: vec![],
                    old_hunks: vec![Hunk { start: 1, count: 8 }],
                },
            ],
            scopes: Scopes {
                react_rn: empty(),
                tests: empty(),
                motion: empty(),
                navigation: empty(),
                sonar: empty(),
                rn_security: empty(),
            },
            bundles: vec![Bundle {
                key: "src".into(),
                files: vec!["src/a.ts".into(), "src/gone.ts".into()],
            }],
        }
    }

    fn good() -> serde_json::Value {
        serde_json::json!({
            "id": "F1", "file": "src/a.ts", "line": 14,
            "severity": "major", "title": "t", "evidence": "e",
        })
    }

    #[test]
    fn accepts_line_inside_hunk() {
        let r = check_finding(&fixture_manifest(), &good());
        assert_eq!(
            r,
            CheckResult {
                id: Some("F1".into()),
                verdict: Verdict::Ok,
                reason: None
            }
        );
    }

    #[test]
    fn accepts_file_line_only() {
        let f = serde_json::json!({"file": "src/a.ts", "line": 14});
        assert_eq!(check_finding(&fixture_manifest(), &f).verdict, Verdict::Ok);
    }

    #[test]
    fn accepts_string_line_ref() {
        let f = serde_json::json!("src/a.ts:14");
        assert_eq!(check_finding(&fixture_manifest(), &f).verdict, Verdict::Ok);
    }

    #[test]
    fn accepts_old_side_on_modified_file() {
        let f = serde_json::json!({"file": "src/a.ts", "line": 11, "side": "old"});
        assert_eq!(check_finding(&fixture_manifest(), &f).verdict, Verdict::Ok);
        let s = serde_json::json!("src/a.ts:11:old");
        assert_eq!(check_finding(&fixture_manifest(), &s).verdict, Verdict::Ok);
    }

    #[test]
    fn accepts_deleted_file_without_side() {
        let f = serde_json::json!({"file": "src/gone.ts", "line": 4});
        let r = check_finding(&fixture_manifest(), &f);
        assert_eq!(r.verdict, Verdict::Ok);
        assert_eq!(
            r.reason.as_deref(),
            Some("old-side (deleted or no new hunks)")
        );
    }

    #[test]
    fn rejects_line_outside_hunks() {
        let mut f = good();
        f["line"] = serde_json::json!(5);
        assert_eq!(
            check_finding(&fixture_manifest(), &f).verdict,
            Verdict::OutOfHunk
        );
    }

    #[test]
    fn rejects_unknown_file() {
        let mut f = good();
        f["file"] = serde_json::json!("src/other.ts");
        assert_eq!(
            check_finding(&fixture_manifest(), &f).verdict,
            Verdict::UnknownFile
        );
    }

    #[test]
    fn rejects_malformed_records() {
        let mut zero = good();
        zero["line"] = serde_json::json!(0);
        assert_eq!(
            check_finding(&fixture_manifest(), &zero).verdict,
            Verdict::InvalidRecord
        );
        let mut sev = good();
        sev["severity"] = serde_json::json!("orange");
        assert_eq!(
            check_finding(&fixture_manifest(), &sev).verdict,
            Verdict::InvalidRecord
        );
        let bare = serde_json::json!({ "id": "F6" });
        assert_eq!(
            check_finding(&fixture_manifest(), &bare).verdict,
            Verdict::InvalidRecord
        );
    }

    #[test]
    fn summarizes_verdict_counts() {
        let mut bad_line = good();
        bad_line["line"] = serde_json::json!(5);
        let mut bad_file = good();
        bad_file["file"] = serde_json::json!("nope.ts");
        let bare = serde_json::json!({ "id": "D" });
        let out = verify_all(
            &fixture_manifest(),
            &[good(), bad_line, bad_file, bare],
        );
        assert_eq!(
            out.summary,
            Summary {
                ok: 1,
                out_of_hunk: 1,
                unknown_file: 1,
                invalid_record: 1
            }
        );
        assert_eq!(out.results.len(), 4);
    }
}
