---
name: ljg-card
description: "Content card and visual export workflow. Use for PNG cards, infographics, comic cards, whiteboard visuals, 카드로 만들어줘, 이미지로 정리, 정보그래픽, 만화 카드, 화이트보드."
user_invocable: true
version: "2.3.0"
---

# ljg-card: 콘텐츠 카드

입력한 글, 링크, 파일을 카드나 이미지로 정리한다. 결과물은 PNG로 만들고 기본 위치는 `~/Downloads/`다.

## 옵션

| 옵션 | 출력 | 용도 |
|---|---|---|
| `-l` | 긴 카드 | 긴 글을 한 장으로 정리 |
| `-i` | 정보그래픽 | 구조, 비교, 숫자가 있는 내용 |
| `-m` | 다중 카드 | 긴 내용을 여러 장으로 나눔 |
| `-v` | 비주얼 노트 | 문제, 전개, 핵심 아이디어를 한 흐름으로 정리 |
| `-c` | 만화 카드 | 설명을 장면 단위로 나눠 보여줌 |
| `-w` | 화이트보드 | 개념 관계와 흐름을 보드처럼 정리 |
| `-b` | 큰 글자 카드 | 짧은 문장을 강하게 보여줌 |

## 실행

1. 입력을 읽는다. URL은 웹에서 확인하고, 파일 경로는 파일을 읽고, 붙여넣은 텍스트는 그대로 쓴다.
2. `references/taste.md`를 먼저 읽어 디자인 기준을 맞춘다.
3. 선택한 옵션에 맞는 `references/mode-*.md`를 읽는다.
4. HTML을 만들고 아래 명령으로 PNG를 캡처한다.

```bash
node assets/capture.js <html> <png> <width> <height> [fullpage]
```

Playwright가 없으면 skill 폴더에서 설치한다.

```bash
npm install && npx playwright install chromium
```

완료 후 생성된 PNG 경로만 짧게 알려준다.
