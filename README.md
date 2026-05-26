# zereight skills

Personal agent skills for code review and React Native development.

## Repo layout (SSOT)

| Path | Role |
|------|------|
| [`.agents/skills/`](.agents/skills/) | **Single source of truth** — add or edit skills here only |
| [`.cursor/skills/`](.cursor/skills/) | Cursor view — symlinks to `../../.agents/skills/<name>` |
| [`.pi/agent/skills/`](.pi/agent/skills/) | Pi view — symlinks to `../../../.agents/skills/<name>` |

After adding a skill under `.agents/skills/`, run:

```bash
bash scripts/ensure-repo-skills.sh
```

This syncs repo views, links `~/.agents/skills` → repo SSOT, patches Pi `settings.json` if needed, and runs `npm run verify:pi-skills`. Restart Pi when it prints `verify OK`.

Check only (no sync): `npm run verify:pi-skills`.

### Pi skill collision warnings (repo-owned skills)

If Pi reports collisions for `roborev-guide`, `zereight-review`, or `autocontext`:

1. **SSOT wins** — keep editing only `.agents/skills/<name>/`.
2. **Disable npm duplicate** — `.pi/settings.json` (and `api/.pi/settings.json` when cwd is `api/`) sets `npm:pi-autocontext` → `"skills": []` (extension tools still load).
3. **Global + Pi registration** — `ensure-repo-skills.sh` links `~/.agents/skills` and ensures Pi `settings.json` lists that path.

Restart Pi after changing settings or symlinks.

## Peter P. skills ([peterpme/skills](https://github.com/peterpme/skills))

Vendored under `.agents/skills/`:

| Skill | Description |
|-------|-------------|
| `engineering-manager` | Coordinate multi-agent engineering work, validation gates, PRs, final audit |
| `continuity` | Learn, record, audit, and apply codebase patterns (`learn` / `check` / `fix` / `ci`) |
| `morning-recap` | Summarize merged GitHub PRs you have not touched; rank review priority |
| `study-repo` | Clone a GitHub repo and run an interactive codebase study session |
| `skill-cleaner` | Audit skill token cost, duplicates, outdated plugin cache, unused skills ([claude-skill-cleaner](https://github.com/YuzuruS/claude-skill-cleaner)) |
| `skill-not-showing` | Diagnose missing Pi `/skill` or Cursor list entries (settings vs symlinks vs extension skills) |

## autocontext (installed)

| Component | Status |
|-----------|--------|
| Pi package | `npm:pi-autocontext@0.2.5` in `~/.pi/agent/settings.json` |
| CLI | `autoctx` via `uv tool install autocontext==0.5.0` |
| Project config | `.autoctx.json` (`provider: pi`, `gens: 2`) |

```bash
# Pi (restart Pi after first install)
pi install npm:pi-autocontext

# CLI
uv tool install autocontext==0.5.0
cd /path/to/this/repo
source autocontext.env.example   # or export vars manually
autoctx list
# npm autoctx (bundled with pi-autocontext): ~/.pi/agent/npm/node_modules/.bin/autoctx capabilities
```

In Pi: use tools `autocontext_judge` / `autocontext_improve` or `/skill:autocontext`. See `.agents/skills/autocontext/SKILL.md` for routing vs `continuity` and `zereight-review`.

## Skills

| Skill | Description |
|-------|-------------|
| `harness` | Pi-native evaluate→improve→persist loop (solve, knowledge, status) |
| `autocontext` | Judge/improve loops, scenarios, playbooks (Pi + `autoctx` CLI) |
| `zereight-review` | Core review — logic correctness, edge cases, clean code, React Effect anti-patterns |
| `zereight-react-native-optimizer` | RN performance review — rendering, animation, native/bridge checks |
| `zereight-react-native-testing` | RNTL v13/v14 test writing — queries, matchers, userEvent, async patterns |
| `zereight-react-native` | RN gateway — routes tasks to the right specialist skill |
| `zereight-goal` | Strategy hardening — loopholes, fixes, verification, confidence gate |
| `growth-profile` | 1on1 growth profile — STAR cases, Stage 2-3 evidence, manager questions |
| `addy` | Addy Osmani agent-skills entrypoint — routes to locally installed `addy-*` skills |

## LJG Skills

Localized knowledge-work skills. Korean is the default working language, with English metadata kept for discovery and invocation.

| Skill | Description |
|-------|-------------|
| `ljg-card` | Content card workflow — 글, 링크, 파일을 PNG 카드, 정보그래픽, 만화 카드, 화이트보드로 정리 |
| `ljg-invest` | Investment analysis — 프로젝트, 시장, 제품의 사업 구조와 리스크 검토 |
| `ljg-learn` | Concept learning — 개념을 예시, 차이점, 사용 장면까지 풀어서 설명 |
| `ljg-paper` | Paper reader — 논문에서 바로 써먹을 아이디어를 뽑는 읽기 흐름 |
| `ljg-paper-flow` | Paper to card — 논문 요약 노트와 카드 이미지를 함께 생성 |
| `ljg-paper-river` | Paper lineage — 기준 논문의 이전 연구와 이후 연구 흐름 추적 |
| `ljg-plain` | Plain language — 어려운 글을 자연스러운 한국어로 쉽게 풀어쓰기 |
| `ljg-present` | Presentation cards — outline이나 글을 발표용 카드 구조로 변환 |
| `ljg-push` | Skill sync helper — `ljg-*` 스킬 동기화 전 repo 상태 확인 |
| `ljg-qa` | Q&A extraction — 글, 책, 논문에서 핵심 질문과 답변 체인 추출 |
| `ljg-rank` | Core drivers — 복잡한 현상에서 핵심 요인과 구조 추리기 |
| `ljg-read` | Reading companion — 책, 기사, 논문을 문단별로 함께 읽기 |
| `ljg-relationship` | Relationship analysis — 관계 문제의 반복 패턴과 다음 대화 정리 |
| `ljg-roundtable` | Roundtable — 여러 관점으로 쟁점 토론 |
| `ljg-skill-map` | Skill map — 설치된 스킬 목록과 역할을 지도처럼 정리 |
| `ljg-think` | Deep thinking — 주장이나 현상을 단계별로 파고들기 |
| `ljg-travel` | Travel research — 도시와 장소의 맥락, 동선, 체크포인트 정리 |
| `ljg-word` | Word study — 영어 단어의 핵심 감각, 뉘앙스, 예문 분석 |
| `ljg-word-flow` | Word to card — 단어 분석과 정보그래픽 카드 생성 |
| `ljg-writes` | Writing workflow — 생각을 1000~1500자 글로 정리 |

## Install

```bash
# 1. Prerequisites
npx skills add vercel-labs/agent-skills -yg
npx skills add callstackincubator/agent-skills --skill react-native-best-practices -yg
npx skills add callstackincubator/agent-device --skill agent-device -yg
npx skills add pluginagentmarketplace/custom-plugin-react-native -yg
npx skills add heroui-inc/heroui --skill heroui-react -yg
npx skills add heroui-inc/heroui --skill heroui-native -yg
npx skills add ibelick/ui-skills --skill fixing-motion-performance -yg
npx skills add storybookjs/react-native -yg

# 2. This repo
npx skills add zereight/skill --yes --global

# 3. Optional: ljg-card rendering dependency
cd ~/.agents/skills/ljg-card
npm install
npx playwright install chromium
```

## Update

```bash
npx skills add zereight/skill --yes --global
```

## Skill details

### zereight-review

Logic-first code review. Runs mandatory checks on every PR, reports in CodeRabbit format.

**Checks:** Invariant · Partial input · Fallback chain · State vs UI · Boundary · Async/race · Clean code · React Effect anti-patterns
**For RN PRs:** also runs `zereight-react-native-optimizer`
**Output:** Summary / ✅ Good / ⚠️ Findings / Case Matrix / 🎯 Verdict

### zereight-react-native-optimizer

RN performance regression detector. Run alongside `zereight-review` on React Native PRs.

**Checks:** Rendering (FlashList, memo, Context) · Animation (Reanimated, UI thread, gesture) · Native (bridge, memory leaks, image, bundle)

### zereight-react-native-testing

RNTL test writing guide. Covers v13 (sync, React 18) and v14 (async, React 19+).

**Covers:** render, screen, queries (getBy/getAllBy/queryBy/findBy), Jest matchers, userEvent, fireEvent, waitFor, async patterns, anti-patterns
**Source:** [callstack/react-native-testing-library](https://github.com/callstack/react-native-testing-library/tree/main/skills/react-native-testing)

### zereight-react-native

RN development gateway. Routes tasks to the right specialist skill (basics, animations, state, navigation, native modules, testing, deployment, Storybook, HeroUI).

### zereight-goal

Strategy hardening loop for goals and plans. Finds loopholes, separates required fixes from cleanup, verifies evidence, and only claims confidence within checked scope.

### growth-profile

1on1 preparation workflow for competency profiling. Builds evidence-backed STAR cases, Stage 2-3 calibration, manager talking points, weak-evidence checks, and follow-up questions.

### addy

Entrypoint for Addy Osmani's `agent-skills` pack installed as `addy-*`. Use `addy`
when searching for the pack, then route to the narrowest matching `addy-*` skill.
