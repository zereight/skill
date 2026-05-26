---
name: ljg-skill-map
description: "Skill map and inventory workflow. Use for scanning installed skills, skill overview, 스킬 목록, skill map."
user_invocable: true
version: "1.0.0"
---

# ljg-skill-map: 스킬 지도

설치된 스킬을 훑고 어떤 일이 가능한지 지도로 정리한다.

## 실행

```bash
bash scripts/scan.sh
```

### Repo 스킬 추가 후 (zereight/skill)

Repo SSOT는 `.agents/skills/`. 추가·수정 후 repo 루트에서 `bash scripts/ensure-repo-skills.sh` → Pi 재시작. 실패 시 `npm run verify:pi-skills` 또는 `skill-not-showing`.

### 스킬 SSOT 및 뷰 동기화

**단일 소스(SSOT):** `~/.agents/skills` — 개인 스킬 추가·수정은 여기서만 한다.

**뷰(심링크만):**

| 경로 | 역할 |
|------|------|
| `~/.cursor/skills` | Cursor 개인 스킬 (`../../.agents/skills/<name>`) |
| `~/.pi/agent/skills` | Pi 에이전트 스킬 (`../../../.agents/skills/<name>`) |

Cursor·Pi 디렉터리에 실폴더를 두지 않는다. agents와 **동일한 스킬 이름 목록**을 심링크로 미러한다.

```bash
# Cursor + Pi 동기화 및 검증 (권장)
bash scripts/sync-skill-views.sh

# Pi에만 있던 실폴더를 agents로 흡수한 뒤 동기화
bash scripts/sync-skill-views.sh --ingest-pi
```

### Cursor Team Kit 플러그인 스킬 흡수

Cursor **Team Kit** 플러그인 스킬은 `~/.cursor/plugins/cache/cursor-public/cursor-team-kit/<hash>/skills`에만 있을 수 있다. Pi·agents SSOT에서 쓰려면 agents로 복사한 뒤 뷰를 동기화한다.

```bash
# Team Kit → agents 흡수 + Cursor/Pi 심링크 동기화·검증
bash scripts/sync-skill-views.sh --ingest-cursor-team-kit
```

플러그인 업데이트 후 agents에 이미 복사된 스킬을 플러그인 버전으로 덮어쓸 때:

```bash
bash scripts/sync-skill-views.sh --ingest-cursor-team-kit --update-cursor-team-kit
```

옵션: `--cursor-only`, `--pi-only`, `--ingest-pi`, `--ingest-cursor-team-kit`, `--update-cursor-team-kit`, `--help`

재실행 시 이미 올바른 심링크는 건너뛰고, 뷰의 실디렉터리·잘못된 링크·agents에 없는 항목은 정리한 뒤 다시 연결한다.

`sync-cursor-skills.sh`는 Cursor만 동기화하는 이전 스크립트다. 전체 맞춤은 `sync-skill-views.sh`를 쓴다.

**건드리지 않음:** `~/.cursor/skills-cursor/` (Cursor IDE 내장 스킬)

## 출력

스킬 이름, 한 줄 역할, 언제 쓰는지, 겹치는 스킬, 빠진 영역을 묶어서 보여준다.
