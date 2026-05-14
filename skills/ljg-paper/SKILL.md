---
name: ljg-paper
description: "Paper reader and idea extraction workflow. Use for research papers, arXiv links, PDFs, 논문 분석, 논문 읽기, paper review."
user_invocable: true
version: "4.9.0"
---

# ljg-paper: 논문 읽기

논문을 학술 평가용으로 읽는 스킬이 아니다. 핵심은 이 논문에서 내가 가져갈 아이디어가 뭔가를 뽑는 것이다.

## 목표

읽는 사람이 해당 분야를 잘 몰라도 논문이 푸는 문제, 저자가 쓴 방법, 중요한 발견, 내 일에 가져갈 아이디어를 말할 수 있어야 한다.

## 입력

arXiv 링크, PDF, 논문 URL, 논문 제목, 사용자가 붙여넣은 본문을 받는다.

## 출력

Org 파일을 `~/Documents/notes/`에 쓴다. 파일명은 `{timestamp}--paper-{short-title}__paper.org` 형식이다.

## 읽는 순서

1. 제목, 저자, 초록, 결론을 먼저 확인한다.
2. 문제를 쉬운 예시 하나로 바꾼다.
3. 방법을 데이터 흐름이나 단계로 풀어 쓴다.
4. 결과를 숫자만 나열하지 말고 의미로 바꾼다.
5. 약점과 애매한 부분도 적는다.

논문 말투를 그대로 옮기지 않는다. 처음 보는 사람에게 설명하듯 쓴다.
