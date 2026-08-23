---
name: bankx-deeplink-request
description: Create and maintain BankX deep link request tickets from PRDs, specs, notification requirements, or screen requests. Use when the user asks to request BankX deeplinks, create MAR Jira tickets, extract deeplink needs from PRDs/docx files, follow the "How to request deep link" Confluence workflow, or update deep link request issues on bankx.atlassian.net.
---

# BankX Deep Link Request

IRON LAW: Do not create one Jira ticket per notification. Deduplicate by final target screen and route pattern; create clarification items only for ambiguous targets.

## Workflow

Track progress explicitly:

```
BankX Deep Link Request Progress:
- [ ] 1. Read source requirements ⚠️ REQUIRED
- [ ] 2. Extract distinct deep link needs ⚠️ REQUIRED
- [ ] 3. Validate against BankX request process
- [ ] 4. Draft ticket summaries/descriptions
- [ ] 5. Confirm before Jira writes ⛔ BLOCKING
- [ ] 6. Create/update MAR Jira issues
- [ ] 7. Verify and report links
```

## 1. Read source requirements ⚠️ REQUIRED

Accept sources such as:
- PRD `.docx`, PDF, markdown, pasted text
- Jira/Confluence URLs
- User-provided target screens or notification IDs

For `.docx`, extract readable text from `word/document.xml`; do not rely on binary `read` output.

Questions to answer while reading:
- Which notification/use case needs navigation after inbox/push tap?
- What exact target screen should open?
- Is login required?
- What entry conditions exist, such as account ownership or product eligibility?
- Which parameters are required to render the screen?
- Is the target ambiguous enough to ask for clarification instead of requesting implementation?

## 2. Extract distinct deep link needs ⚠️ REQUIRED

Group requirements by **same target screen + same route shape**.

For each group, capture:
- Target screen name
- Usage contexts / source IDs
- Required parameters
- Suggested path
- Example URL using non-sensitive sample values
- Open questions

BankX notification PRD pattern examples (align with **mobile repo**, not legacy PRD screen names):

| Need | Target screen (actual) | Suggested path (Jira) | Notes |
|---|---|---|---|
| E-slip | `ESlipScreen` (`ESlipNavigator`) | `/e-slip/{orderId}` | Separate from deposit transaction history detail |
| Everyday account main (transaction list) | `EverydayAccountScreen` | `/everyday-account` | **Registered today** — query `accountNumber` |
| Everyday account transaction detail (all types) | `EverydayAccountTransactionDetailScreen` | `/everyday-account/detail` (segment name TBD with backend) | **Not registered yet** — one screen for transfer in/out, ATM, bill pay, lending, default |

**Deposit vs withdrawal:** PRDs may say “deposit detail” / “withdrawal detail”, but the app has **one** navigable screen (`EverydayAccountTransactionDetailScreen`). API `GetTransactionDetail` returns `oneofKind`; UI shape (deposit / withdrawal / edit) is chosen in-app. Request **one MAR ticket + one route** unless product explicitly needs marketing-only URL aliases to the same target.

**Required parameters for transaction detail** (same as in-app list tap — see `TransactionDetailParams` in `navigation-type.ts`):

| Parameter | Meaning |
|---|---|
| `accountNumber` | Everyday account number (navigator / `EverydayAccountContext`) |
| `referenceNo` | System reference number (transaction group key) |
| `detailId` | Transaction detail serial (unique key) |
| `systemTransactionDate` | Accounting date `yyyyMMdd` (e.g. `20250115`) |

Example URL for MAR description (scheme varies by env; path/query shape for mobile implementation):

```text
bankxappdevelop://everyday-account/detail?accountNumber=1234567890&referenceNo=TXN001&detailId=42&systemTransactionDate=20250115
```

**Not in scope for this screen:** Term Deposit / Piggy Bank / Closed Account transaction lists have **no** `*TransactionDetailScreen` or `GetTransactionDetail` navigation today.

If an item says "go to detail" but the screen/state is unclear, mark it as clarification; do not invent a path.

## 3. Validate against BankX request process

Use the Confluence process when Jira work is requested:
- Page: `https://bankx.atlassian.net/wiki/spaces/SD/pages/212336660/How+to+request+deep+link`
- Project: `MAR` / Mobile App Requests
- Parent epic: `MAR-1` / Deep Link
- Issue type: `Request`
- Summary format: `[Target screen name] deep link request`
- Description must start with `**Requester / Status: Request**`

Use Atlassian through mcporter:

```bash
/Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call atlassian.getAccessibleAtlassianResources
```

Known BankX cloud ID at time of writing:

```text
d9c298b6-66ce-4dc7-bd45-cee18ebf05c9
```

Verify access if calls fail; do not assume missing permission from one failed wrapper call.

## 4. Draft ticket summaries/descriptions

Use this description template exactly, adding fields as needed:

```md
**Requester / Status: Request**

I need a deep link that directs to the '[target screen name]' screen for use in [usage context].

Target screen: [target screen name]
Usage context:
- [source notification/use case]
Platform: iOS and Android
Login required: Yes/No
Entry conditions: [conditions or n/a]

Required parameters:
- [param]: [meaning]

Suggested deep link path:
- /path/{param}

Example:
- bankxappdevelop://path/sample

Reference:
- [PRD/Jira/Confluence name]
- [section or notification IDs]

Open questions:
- [only if applicable]
```

Summary examples:
- `Cardless withdrawal e-slip screen deep link request`
- `Everyday account screen deep link request` (list only — if extending existing route)
- `Everyday account transaction detail deep link request` (single ticket for inbound/outbound/refund notifications)

## 5. Confirm before Jira writes ⛔ BLOCKING

Before creating or editing Jira issues, show the user:
- Number of implementation tickets
- Number of clarification tickets, if any
- Summary + path for each implementation ticket
- Any assumptions

Ask for explicit approval unless the user already said to proceed after seeing the exact plan.

## 6. Create/update MAR Jira issues

Create issues with parent `MAR-1`:

```bash
/Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call "atlassian.createJiraIssue(cloudId: 'd9c298b6-66ce-4dc7-bd45-cee18ebf05c9', projectKey: 'MAR', issueTypeName: 'Request', summary: '[summary]', description: '[description]', parent: 'MAR-1')"
```

Update an issue description:

```bash
/Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call "atlassian.editJiraIssue(cloudId: 'd9c298b6-66ce-4dc7-bd45-cee18ebf05c9', issueIdOrKey: 'MAR-123', fields: { description: '[description]' })"
```

Search existing requests first when duplication is likely:

```bash
/Users/tao.exe/.nvm/versions/node/v22.22.2/bin/mcporter call atlassian.searchJiraIssuesUsingJql \
  cloudId='d9c298b6-66ce-4dc7-bd45-cee18ebf05c9' \
  jql='project = MAR AND parent = MAR-1 ORDER BY created DESC' \
  maxResults=50 \
  fields='["summary","description","status","parent","assignee","reporter"]' \
  responseContentFormat=markdown
```

## 7. Verify and report links

After Jira writes:
- Fetch or inspect created keys to verify parent, issue type, and description.
- Report issue keys, summaries, statuses, and board link.
- Mention if any issue is a clarification rather than implementation.

Board link:

```text
https://bankx.atlassian.net/jira/software/projects/MAR/boards/1233
```

## Guardrails

- Do not expose real account numbers, customer names, or production transaction IDs; use sample values.
- Prefer path form (`/path/{param}`) in Jira; include environment-specific scheme only as an example.
- Do not treat `bankxappdevelop://` as the universal final scheme.
- Do not skip the `**Requester / Status: Request**` header.
- Do not move statuses unless the user asks or the workflow explicitly requires it.
- If target screen is ambiguous, ask or create a clarification ticket; do not guess.
- **Do not file separate MAR tickets** for “deposit transaction detail” and “withdrawal transaction detail” when both target `EverydayAccountTransactionDetailScreen` with the same four parameters.
- If working in the mobile repo, inspect before claiming a route exists:
  - `packages/foundation/src/navigation/deep-link-path-config.ts` — `DEEP_LINK_PATH_CONFIG`, `DEEP_LINK_PARAM_MAP`
  - `packages/foundation/src/navigation/navigation-type.ts` — screen param types
  - `@features/everyday-account/src/everyday-account-navigator.tsx` — registered stack screens

### Mobile SSOT snapshot (verify on each use; may drift)

| Path (after scheme) | Screen | Query params in `DEEP_LINK_PARAM_MAP` |
|---|---|---|
| `everyday-account` | `EverydayAccountScreen` | `accountNumber` → `EverydayAccountNavigator` |
| `everyday-account/detail` (planned) | `EverydayAccountTransactionDetailScreen` | `accountNumber` (navigator) + `referenceNo`, `detailId`, `systemTransactionDate` (detail) |

Login: deep links defer until session exists (`packages/foundation/src/navigation/deep-link-config.ts`).
