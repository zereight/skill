use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io;
use std::process::Command;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Hunk {
    pub start: u32,
    pub count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedFile {
    pub path: String,
    pub hunks: Vec<Hunk>,
    pub old_hunks: Vec<Hunk>,
    pub added: Vec<String>,
    pub removed: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManifestFile {
    pub path: String,
    pub status: char,
    pub hunks: Vec<Hunk>,
    #[serde(default)]
    pub old_hunks: Vec<Hunk>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Scope {
    pub in_scope: bool,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Scopes {
    pub react_rn: Scope,
    pub tests: Scope,
    pub motion: Scope,
    pub navigation: Scope,
    pub sonar: Scope,
    pub rn_security: Scope,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bundle {
    pub key: String,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Manifest {
    pub version: u32,
    pub base: String,
    pub head: String,
    pub files: Vec<ManifestFile>,
    pub scopes: Scopes,
    pub bundles: Vec<Bundle>,
}

// Parse NUL-separated `git diff --name-status -z` output.
// Returns map of new-path -> status letter. Renames resolve to the new path.
pub fn parse_name_status(text: &str) -> BTreeMap<String, char> {
    let parts: Vec<&str> = text.split('\0').collect();
    let mut status = BTreeMap::new();
    let mut i = 0;
    while i < parts.len() {
        let code = parts[i];
        i += 1;
        if code.is_empty() {
            continue;
        }
        let kind = code.trim().chars().next().unwrap_or('?');
        if kind == 'R' || kind == 'C' {
            i += 1; // skip old path
            if let Some(to) = parts.get(i) {
                i += 1;
                if !to.is_empty() {
                    status.insert(to.to_string(), kind);
                }
            }
        } else if let Some(p) = parts.get(i) {
            i += 1;
            if !p.is_empty() {
                status.insert(p.to_string(), kind);
            }
        }
    }
    status
}

fn parse_range(nums: &str) -> Option<Hunk> {
    let (start_s, count_s) = match nums.split_once(',') {
        Some((s, c)) => (s, Some(c)),
        None => (nums, None),
    };
    let start = start_s.parse::<u32>().ok()?;
    let count = match count_s {
        Some(c) => c.parse::<u32>().ok()?,
        None => 1,
    };
    Some(Hunk { start, count })
}

struct HunkPair {
    old: Hunk,
    new: Hunk,
}

// "@@ -a[,b] +c[,d] @@" -> old and new hunks. None when not a hunk header.
fn parse_hunk_header(raw: &str) -> Option<HunkPair> {
    let rest = raw.strip_prefix("@@ ")?;
    let end = rest.find(" @@")?;
    let ranges = &rest[..end];
    let mut parts = ranges.split_whitespace();
    let old_range = parts.next()?;
    let new_range = parts.next()?;
    Some(HunkPair {
        old: parse_range(old_range.strip_prefix('-')?)?,
        new: parse_range(new_range.strip_prefix('+')?)?,
    })
}

// Parse unified diff text (`git diff -U0`).
// Deleted files are kept with old_hunks only. Binary files keep zero hunks.
// Paths with spaces/quotes are not unquoted (see README Known limits).
pub fn parse_diff(diff_text: &str) -> Vec<ParsedFile> {
    let mut files: Vec<ParsedFile> = Vec::new();
    let mut current: Option<ParsedFile> = None;
    for raw in diff_text.split('\n') {
        if let Some(rest) = raw.strip_prefix("diff --git ") {
            if let Some(f) = current.take() {
                if !f.path.is_empty() && f.path != "/dev/null" {
                    files.push(f);
                }
            }
            let path = rest.rsplit(" b/").next().unwrap_or("");
            if path.is_empty() {
                current = None;
            } else {
                current = Some(ParsedFile {
                    path: path.to_string(),
                    hunks: Vec::new(),
                    old_hunks: Vec::new(),
                    added: Vec::new(),
                    removed: Vec::new(),
                });
            }
            continue;
        }
        let Some(f) = current.as_mut() else { continue };
        if let Some(plus) = raw.strip_prefix("+++ ") {
            let p = plus.trim().strip_prefix("b/").unwrap_or(plus.trim());
            if p == "/dev/null" {
                continue;
            }
            continue;
        }
        if let Some(minus) = raw.strip_prefix("--- ") {
            let p = minus.trim().strip_prefix("a/").unwrap_or(minus.trim());
            if p != "/dev/null" && (f.path.is_empty() || f.path == "/dev/null") {
                f.path = p.to_string();
            }
            continue;
        }
        if let Some(pair) = parse_hunk_header(raw) {
            if pair.new.count > 0 {
                f.hunks.push(pair.new);
            }
            if pair.old.count > 0 {
                f.old_hunks.push(pair.old);
            }
            continue;
        }
        if let Some(added) = raw.strip_prefix('+') {
            f.added.push(added.to_string());
            continue;
        }
        if let Some(removed) = raw.strip_prefix('-') {
            f.removed.push(removed.to_string());
        }
    }
    if let Some(f) = current.take() {
        if !f.path.is_empty() && f.path != "/dev/null" {
            files.push(f);
        }
    }
    files
}

pub const MOTION_TRIGGERS: &[&str] = &[
    "react-native-reanimated",
    "useAnimatedStyle",
    "useAnimatedReaction",
    "useSharedValue",
    "withSpring",
    "withTiming",
    "withDecay",
    "useDerivedValue",
    "useAnimatedScrollHandler",
    "scheduleOnUI",
    "scheduleOnRN",
    "@gorhom/bottom-sheet",
    "footerComponent",
    "@keyframes",
    "animation:",
    "transition:",
    "framer-motion",
    "gsap",
];

fn is_test(p: &str) -> bool {
    p.contains(".test.") || p.contains("__tests__") || p.contains("__snapshots__")
}
fn is_locales(p: &str) -> bool {
    p.contains("/locales/")
}
fn is_ts(p: &str) -> bool {
    p.ends_with(".ts") || p.ends_with(".tsx")
}
fn is_motion_file(p: &str) -> bool {
    p.ends_with(".ts")
        || p.ends_with(".tsx")
        || p.ends_with(".js")
        || p.ends_with(".jsx")
        || p.ends_with(".css")
        || p.ends_with(".scss")
}
fn is_nav(p: &str) -> bool {
    p.ends_with("Screen.tsx")
        || p.ends_with("-screen.tsx")
        || p.contains("navigator")
        || p.ends_with("navigation-type.ts")
}
fn is_sonar(p: &str) -> bool {
    [".ts", ".tsx", ".js", ".jsx", ".py", ".java"]
        .iter()
        .any(|e| p.ends_with(e))
}
fn file_name(p: &str) -> &str {
    p.rsplit('/').next().unwrap_or(p)
}
fn is_sec_config(p: &str) -> bool {
    let n = file_name(p);
    matches!(
        n,
        "package.json" | "package-lock.json" | "app.json" | "Podfile" | "AndroidManifest.xml"
    ) || n.starts_with("app.config.")
        || n.ends_with(".plist")
        || n.ends_with(".gradle")
}
fn is_sec_dir(p: &str) -> bool {
    p.starts_with("android/") || p.starts_with("ios/")
}

fn wrap(list: Vec<String>) -> Scope {
    Scope {
        in_scope: !list.is_empty(),
        files: list,
    }
}

fn line_has_motion(l: &str) -> bool {
    MOTION_TRIGGERS.iter().any(|t| l.contains(t))
}

fn file_has_motion(f: &ParsedFile) -> bool {
    is_motion_file(&f.path)
        && !is_test(&f.path)
        && !is_locales(&f.path)
        && (f.added.iter().any(|l| line_has_motion(l))
            || f.removed.iter().any(|l| line_has_motion(l)))
}

// Classify scope flags mirroring the skill pass rules.
// Over-triggering is the safe direction: a wrongly spawned pass costs
// tokens, a missed pass loses coverage. Bare `transition` (no colon) is
// excluded because it matches identifiers like transitionTo.
pub fn classify_scopes(files: &[ParsedFile]) -> Scopes {
    let collect = |f: &dyn Fn(&ParsedFile) -> bool| -> Vec<String> {
        files
            .iter()
            .filter(|x| f(x))
            .map(|x| x.path.clone())
            .collect()
    };
    Scopes {
        react_rn: wrap(collect(&|f| {
            is_ts(&f.path) && !is_test(&f.path) && !is_locales(&f.path)
        })),
        tests: wrap(collect(&|f| is_test(&f.path))),
        motion: wrap(collect(&file_has_motion)),
        navigation: wrap(collect(&|f| is_nav(&f.path))),
        sonar: wrap(collect(&|f| {
            is_sonar(&f.path) && !is_test(&f.path) && !is_locales(&f.path)
        })),
        rn_security: wrap(collect(&|f| {
            (!is_test(&f.path) && !is_locales(&f.path) && is_ts(&f.path))
                || is_sec_config(&f.path)
                || is_sec_dir(&f.path)
        })),
    }
}

// Group changed files for per-pass scoping. BTreeMap keeps keys sorted.
pub fn bundle_files(paths: &[String]) -> Vec<Bundle> {
    let mut groups: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for p in paths {
        let segs: Vec<&str> = p.split('/').collect();
        let key = if segs.len() == 1 {
            "(root)".to_string()
        } else if segs.len() == 2 {
            segs[0].to_string()
        } else {
            format!("{}/{}", segs[0], segs[1])
        };
        groups.entry(key).or_default().push(p.clone());
    }
    groups
        .into_iter()
        .map(|(key, mut list)| {
            list.sort();
            Bundle { key, files: list }
        })
        .collect()
}

// Build the full manifest by shelling out to git. Only impure part;
// covered by CLI smoke below, not by unit tests.
pub fn build_manifest(repo: &str, base: &str, head: &str) -> io::Result<Manifest> {
    let range = format!("{base}...{head}");
    let status_out = Command::new("git")
        .args(["diff", &range, "--name-status", "-z"])
        .current_dir(repo)
        .output()?;
    if !status_out.status.success() {
        return Err(io::Error::other(format!(
            "git diff --name-status failed for {range}"
        )));
    }
    let status = parse_name_status(&String::from_utf8_lossy(&status_out.stdout));
    let diff_out = Command::new("git")
        .args(["diff", &range, "-U0", "--no-color"])
        .current_dir(repo)
        .output()?;
    if !diff_out.status.success() {
        return Err(io::Error::other(format!("git diff failed for {range}")));
    }
    let parsed = parse_diff(&String::from_utf8_lossy(&diff_out.stdout));
    let files: Vec<ManifestFile> = parsed
        .iter()
        .map(|f| ManifestFile {
            path: f.path.clone(),
            status: status.get(&f.path).copied().unwrap_or('M'),
            hunks: f.hunks.clone(),
            old_hunks: f.old_hunks.clone(),
        })
        .collect();
    let scopes = classify_scopes(&parsed);
    let paths: Vec<String> = files.iter().map(|f| f.path.clone()).collect();
    let bundles = bundle_files(&paths);
    Ok(Manifest {
        version: 2,
        base: base.to_string(),
        head: head.to_string(),
        files,
        scopes,
        bundles,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_DIFF: &str = r#"diff --git a/src/PlayerScreen.tsx b/src/PlayerScreen.tsx
index 1111111..2222222 100644
--- a/src/PlayerScreen.tsx
+++ b/src/PlayerScreen.tsx
@@ -10,3 +12,6 @@ export function Player() {
   const x = 1;
+import { useAnimatedStyle } from 'react-native-reanimated';
+const style = useAnimatedStyle(() => ({}));
   return null;
diff --git a/src/format.test.ts b/src/format.test.ts
index 3333333..4444444 100644
--- a/src/format.test.ts
+++ b/src/format.test.ts
@@ -1,2 +1,3 @@
 import { format } from './format';
+it('pads', () => {});
"#;

    fn parsed(
        path: &str,
        hunks: Vec<Hunk>,
        old_hunks: Vec<Hunk>,
        added: &[&str],
        removed: &[&str],
    ) -> ParsedFile {
        ParsedFile {
            path: path.into(),
            hunks,
            old_hunks,
            added: added.iter().map(|s| (*s).to_string()).collect(),
            removed: removed.iter().map(|s| (*s).to_string()).collect(),
        }
    }

    #[test]
    fn parses_files_hunks_and_added_lines() {
        let files = parse_diff(SAMPLE_DIFF);
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].path, "src/PlayerScreen.tsx");
        assert_eq!(files[0].hunks, vec![Hunk { start: 12, count: 6 }]);
        assert_eq!(files[0].old_hunks, vec![Hunk { start: 10, count: 3 }]);
        assert!(files[0]
            .added
            .iter()
            .any(|l| l.contains("useAnimatedStyle")));
        assert_eq!(files[1].path, "src/format.test.ts");
        assert_eq!(files[1].hunks, vec![Hunk { start: 1, count: 3 }]);
    }

    #[test]
    fn keeps_deleted_files_with_old_hunks() {
        let diff = "diff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\nindex aaaaaaa..0000000\n--- a/src/old.ts\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-const a = 1;\n-const b = 2;\n";
        let files = parse_diff(diff);
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/old.ts");
        assert!(files[0].hunks.is_empty());
        assert_eq!(files[0].old_hunks, vec![Hunk { start: 1, count: 2 }]);
        assert_eq!(files[0].removed.len(), 2);
    }

    #[test]
    fn parses_name_status_with_renames() {
        let status = parse_name_status("M\0src/a.ts\0R100\0src/old.ts\0src/new.ts\0");
        assert_eq!(status.get("src/a.ts"), Some(&'M'));
        assert_eq!(status.get("src/new.ts"), Some(&'R'));
        assert!(!status.contains_key("src/old.ts"));
    }

    fn scope_fixture() -> Vec<ParsedFile> {
        vec![
            parsed(
                "src/PlayerScreen.tsx",
                vec![],
                vec![],
                &["import { useAnimatedStyle } from \"x\""],
                &[],
            ),
            parsed(
                "src/format.test.ts",
                vec![],
                vec![],
                &["it(\"pads\", () => {})"],
                &[],
            ),
            parsed(
                "android/app/build.gradle",
                vec![],
                vec![],
                &["compileSdk 35"],
                &[],
            ),
        ]
    }

    fn scope(files: &[&str]) -> Scope {
        Scope {
            in_scope: !files.is_empty(),
            files: files.iter().map(|s| s.to_string()).collect(),
        }
    }

    #[test]
    fn classifies_react_tests_motion_navigation() {
        let s = classify_scopes(&scope_fixture());
        assert_eq!(s.react_rn, scope(&["src/PlayerScreen.tsx"]));
        assert_eq!(s.tests, scope(&["src/format.test.ts"]));
        assert_eq!(s.motion, scope(&["src/PlayerScreen.tsx"]));
        assert_eq!(s.navigation, scope(&["src/PlayerScreen.tsx"]));
    }

    #[test]
    fn classifies_sonar_and_security() {
        let s = classify_scopes(&scope_fixture());
        assert_eq!(s.sonar, scope(&["src/PlayerScreen.tsx"]));
        assert_eq!(
            s.rn_security,
            scope(&["src/PlayerScreen.tsx", "android/app/build.gradle"])
        );
    }

    #[test]
    fn motion_ignores_bare_transition_and_non_style_files() {
        let files = vec![
            parsed(
                "src/nav.ts",
                vec![],
                vec![],
                &["function transitionTo(route: string) {}"],
                &[],
            ),
            parsed(
                "README.md",
                vec![],
                vec![],
                &["transition: documented here"],
                &[],
            ),
            parsed(
                "src/fade.css",
                vec![],
                vec![],
                &[".x { transition: opacity 200ms; }"],
                &[],
            ),
        ];
        let s = classify_scopes(&files);
        assert_eq!(s.motion, scope(&["src/fade.css"]));
    }

    #[test]
    fn motion_sees_removed_triggers() {
        let files = vec![parsed(
            "src/sheet.tsx",
            vec![],
            vec![],
            &[],
            &["const style = useAnimatedStyle(() => ({}));"],
        )];
        let s = classify_scopes(&files);
        assert_eq!(s.motion, scope(&["src/sheet.tsx"]));
    }

    #[test]
    fn bundles_group_by_directory() {
        let paths = ["src/a.ts", "src/b.ts", "docs/x/y.md", "README.md"]
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>();
        assert_eq!(
            bundle_files(&paths),
            vec![
                Bundle {
                    key: "(root)".into(),
                    files: vec!["README.md".into()]
                },
                Bundle {
                    key: "docs/x".into(),
                    files: vec!["docs/x/y.md".into()]
                },
                Bundle {
                    key: "src".into(),
                    files: vec!["src/a.ts".into(), "src/b.ts".into()]
                },
            ]
        );
    }
}
