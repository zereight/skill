---
name: ljg-push
description: "Skill sync helper. Use for syncing local ljg skills, skill publishing, 스킬 동기화, skill push."
user_invocable: true
version: "1.0.0"
---

# ljg-push: 스킬 동기화

로컬의 `ljg-*` 스킬을 repo와 맞추는 보조 스킬이다. 자동 push는 위험하므로 실행 전에 현재 repo, 브랜치, 변경 파일을 확인한다.

## 실행 전 확인

1. `git status --short`로 변경 파일을 본다.
2. `git remote -v`로 원격을 확인한다.
3. `skills/ljg-*` 외 변경이 있으면 사용자에게 먼저 말한다.
4. push는 사용자가 명시했을 때만 한다.
