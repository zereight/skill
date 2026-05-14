---
name: ljg-qa
description: "Q&A extraction workflow. Use for turning articles, books, papers into question-answer chains, 질문 뽑기, Q&A 정리."
user_invocable: true
version: "1.0.0"
---

# ljg-qa: 질문 답변 추출

글에서 핵심 질문과 답을 뽑는다. 요약보다 질문을 잘 잡는 데 집중한다.

## 흐름

1. 글이 답하려는 큰 질문을 찾는다.
2. 그 질문을 이해하는 데 필요한 작은 질문을 순서대로 만든다.
3. 각 질문에 답을 붙인다.
4. 답에는 결론, 근거, 한계가 들어가야 한다.

원문에 없는 답을 만들지 않는다.
