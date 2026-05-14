---
name: growth-profile
description: Prepare evidence-backed competency and growth profiles for 1on1, self-review, performance review, promotion prep, or stage calibration. Use when the user wants STAR examples, competency category mapping, Stage 2-3 evidence, manager talking points, weak-evidence checks, or questions to ask in a growth/performance conversation.
---

# Growth Profile

## Core Rule

Build a grounded 1on1 preparation profile from primary evidence. Do not inflate the user's impact. Separate what the user did from what changed because of it.

Default target: Stage 2-3 unless the user explicitly asks for another level or the evidence strongly supports it.

## Evidence First

Before asking about facts, inspect available evidence:

- User-provided images, PDFs, docs, spreadsheets, pasted references
- Existing self-review notes or prior generated Markdown files
- Relevant code, diffs, commits, PRs, tickets, logs, or project documents if the user points to them

If a fact is not in evidence, mark it as a candidate or ask for confirmation. Never invent metrics, dates, stakeholder names, impact size, or stage levels.

## Interview Loop

Ask one question at a time, like `grill-with-docs`.

For every candidate case, resolve these in order:

1. What happened?
2. What was the user's responsibility?
3. What did the user personally do?
4. What changed after that action?
5. Who benefited or used the result?
6. Which competency category does it support?
7. Is it Stage 2 evidence, Stage 3 evidence, or too weak?
8. What would a manager challenge?
9. What evidence would strengthen the case?

Provide a recommended answer with each question.

If the answer can be found from evidence, do not ask. Read or search first.

## Competency Categories

Use the user's provided competency framework as the source of truth. If no framework is available, use this neutral default:

- Expertise: technical knowledge, domain knowledge, system understanding, implementation quality
- Problem Solving: problem definition, diagnosis, trade-off handling, root-cause analysis, improvement proposal
- Communication: alignment, clarification, stakeholder explanation, review quality, decision framing
- Performance Impact: delivery, quality, reliability, release risk reduction, team/product outcome
- People Impact: peer support, onboarding, review feedback, reusable guidance, knowledge sharing

Do not hardcode company-specific definitions when the user provided a different rubric. Quote or paraphrase the provided rubric only after checking it in the current turn.

## Stage Calibration

Use conservative calibration.

- Stage 2 signals:
  - Finds needed information independently
  - Solves problems inside assigned work
  - Applies feedback from leaders or peers
  - Explains implementation decisions clearly

- Stage 3 signals:
  - Handles non-routine or exception cases
  - Narrows root causes instead of applying generic fixes
  - Proposes a better path, guardrail, or reusable check
  - Gives actionable feedback that helps peers or future work

Avoid Stage 4+ language unless the evidence clearly shows broad influence beyond the user's assigned scope. Flag phrases like "led organization-wide", "owned strategy", "drove company impact", "created vision", or "transformed process" when evidence only supports Stage 2-3.

## STAR Output

Write each case in this format:

```markdown
### 사례 N. <short title>

- S: <Situation>
- T: <Task>
- A: <Action>
- R: <Result>
- Stage 근거: <Stage 2/3 calibration and why>
- 말하기 문장: "<1on1-ready spoken sentence>"
- 보강할 증거: <missing proof, if any>
```

Keep wording usable in a real 1on1. Prefer plain, specific Korean when the conversation is Korean.

## Challenge Rules

Challenge weak cases immediately:

- If Action is vague: ask what the user personally did.
- If Result is vague: ask what changed and how it was observed.
- If it sounds like team output: separate user contribution from team outcome.
- If stage claim is too high: lower the claim or ask for broader-impact evidence.
- If there is no evidence: label it "후보 사례" instead of confirmed evidence.

Use this pattern:

```text
약한 지점: ...
추천 보정: ...
다음 질문: ...
```

## Final Deliverable

When the profile is ready, produce or update a Markdown artifact with:

- 1on1 opening statement
- Competency-by-competency STAR cards
- Strong cases and weak cases
- Manager questions
- Evidence gaps
- Final stage calibration summary

Default file naming when the user asks for a file:

- `growth-profile-1on1.md`
- or a more specific name if a repo/project/person context exists

## Validation Checklist

Before finalizing:

- Each active competency has at least 2 cases when enough evidence exists
- Every case has S/T/A/R
- User action and result are separate
- Stage 2/3 rationale is explicit
- Stage 4+ phrasing is removed unless supported
- Evidence gaps are visible instead of hidden
- Manager-facing questions are included
