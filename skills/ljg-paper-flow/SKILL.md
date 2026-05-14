---
name: ljg-paper-flow
description: "Paper workflow combining reading and card creation. Use for paper summary plus visual card, 논문 읽고 카드, paper to card."
user_invocable: true
version: "1.0.0"
---

# ljg-paper-flow: 논문 카드 플로우

논문을 읽고 핵심 내용을 카드 이미지까지 만든다.

## 흐름

1. `ljg-paper`로 논문을 읽고 요약 노트를 만든다.
2. 노트에서 카드로 만들 핵심 메시지 하나를 고른다.
3. `ljg-card -c` 또는 상황에 맞는 카드 모드로 PNG를 만든다.
4. 노트 경로와 이미지 경로를 함께 보고한다.

논문 여러 개가 들어오면 하나씩 처리한다.
