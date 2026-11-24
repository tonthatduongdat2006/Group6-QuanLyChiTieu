# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Quản Lý Chi Tiêu – AI Smart Expense

- **Document ID:** QLCT-PRD-001
- **Version:** 1.1 (synced after Review Plan v1.1 approval)
- **Status:** Approved business baseline; open technical decisions remain explicitly marked
- **Target platforms:** Android and iOS
- **Primary language / currency:** Vietnamese / VND

> This PRD v1.1 preserves the group-approved v1.0 requirements and synchronizes the decisions explicitly confirmed during Review Plan v1.1. It is reconstructed from the approved project decisions; a newer signed/exported PRD, if supplied by the group, supersedes this copy. Technical implementation recommendations and Open Questions are not presented as new product decisions.

## 1. Product Overview

### 1.1 Purpose

Quản Lý Chi Tiêu – AI Smart Expense is a personal-finance mobile application for recording income and expenses, managing category budgets and savings jars, and reviewing financial history and statistics. It provides AI Chat and AI Scan to accelerate data entry. AI output is always a draft; the user reviews and confirms before a financial transaction is created.

### 1.2 Goals

- Make personal income and expense recording straightforward.
- Reduce manual entry effort through natural-language AI Chat and receipt reading.
- Help users monitor category budgets and savings goals.
- Provide understandable history and financial statistics.
- Keep users in control: no AI-generated transaction is saved without explicit confirmation.

### 1.3 Main feature areas

1. Account registration, login and logout.
2. Income and expense transactions.
3. Categories.
4. Monthly category budgets.
5. Transaction history and statistics.
6. Savings jars.
7. AI Chat.
8. AI Scan and transaction confirmation.

## 2. Product Context

- Scope is personal finance for one user; no shared household or shared account in v1.
- Users may record transactions immediately or enter a batch at the end of the day.
- Users may enter manually, send natural-language text to AI Chat, or upload a receipt image to AI Scan.
- AI Chat remembers context within the current conversation/session. Users can opt to save a conversation for later continuation.
- AI Scan stores one expense transaction for an invoice, with item-level details. It does not create one financial transaction per receipt item.
- Main flow: choose manual or AI entry → create draft → review/edit → confirm → update financial views.

## 3. User Roles

| Actor | Description | Permissions |
|---|---|---|
| User | Individual account owner | Manage only their own account and financial data; review and confirm AI drafts |
| AI Assistant | Internal system actor/component, not an independent login | Analyze text/images and propose drafts; cannot approve or persist a transaction by itself |

A separate Administrator role is outside v1 scope.

## 4. Functional Requirements

### FR-01 – Account Registration

Collect full name, email, password and optional phone number, plus explicit acceptance of terms. Email must be valid and unique. Password minimum length is 8 characters. Registration is rejected unless terms are accepted.

### FR-02 – Login and Logout

Users log in with email and password and can log out. Invalid credentials return a clear error. The application supports a remember-me/session persistence experience using secure token storage and revocable sessions.

### FR-03 – Dashboard

Display current available balance, income this month, expense this month, shortcuts, budget alerts, five recent transactions, and entry points to AI Chat and AI Scan.

**Available balance formula:**

`available balance = recorded income - recorded expenses - jar deposits + jar withdrawals`

There is no opening/initial balance feature. Balance begins at zero and changes only from recorded transactions and internal jar transfers. Available balance excludes money currently held in jars. **Group-approved D-07 invariant:** available balance must never become negative. Any operation whose projected result would be below zero must be rejected without partially saving it.

### FR-04 – Manual Transactions

Create income or expense with type, amount, category, note and transaction date. Amount must be greater than zero; category is required; date must be valid. User confirms before the record is created. For an expense, the backend must validate the projected available balance; if the expense would make it negative, reject the operation with an insufficient-balance message and do not create the transaction.

### FR-05 – Categories

Show preset income and expense categories and allow users to create custom categories. Renaming and deleting categories are not supported in v1. Categories are scoped to their owner; default categories are provisioned for each user.

### FR-06 – Budgets

Create, edit and delete monthly budgets by expense category. Show limit, amount spent and remaining amount. Alert when usage reaches 80% and when the limit is exceeded. Jar deposits and withdrawals are internal transfers and do not count toward spending or budgets.

### FR-07 – Transaction History

List and filter transactions by month and type; view details; edit amount, category, note and date; delete after confirmation. After edit/delete, relevant balance, statistics and budget values must reflect the resulting transaction set. For every edit or deletion, the backend validates the projected available balance; reject and roll back any operation that would make it negative. For a receipt transaction, amount and receipt-item changes must be applied together so the transaction amount continues to equal the sum of receipt-item amounts; never commit a mismatched state. The physical deletion strategy (hard delete versus soft delete) and dependent-row retention are technical decisions still recorded in OQ-01; whichever strategy is selected must avoid orphaned receipt details/items and preserve the approved user-visible behavior.

### FR-08 – Statistics

Show monthly income, monthly expense, monthly net change, category statistics and a seven-day expense chart. Provide Income and Expense tabs. The Overview chart remains focused on expenses as decided by the group. Internal transfers to/from savings jars do not count as income or expense and do not affect budget statistics.

`monthly net change = monthly income - monthly expense`

### FR-09 – Savings Jars

Users can create jars with a name and target amount, deposit from available balance, withdraw back to available balance, see current balance/progress and review deposit/withdrawal history.

Approved rules:
- Deposits reduce available balance and increase the jar balance.
- Withdrawals increase available balance and reduce the jar balance.
- Both are internal transfers, not income or expense; they do not affect spending budgets.
- Amount must be greater than zero.
- Deposit cannot exceed available balance; withdrawal cannot exceed jar balance.
- An initial deposit during jar creation follows the same available-balance rule.
- No opening balance exists. A user with no recorded income cannot deposit into a jar.
- The group chose internal-transfer treatment (Option A). **D-11:** v1 does not add jar rename, target-edit or jar-delete functions; the approved FR-09 scope remains create, deposit, withdraw, balance/progress and transfer history.

### FR-10 – AI Chat

AI Chat accepts Vietnamese natural-language messages and may recognize multiple transactions in one message. It maintains context during the current conversation/session and distinguishes a new transaction from a revision to an existing pending draft. If the target draft is ambiguous, AI asks for clarification rather than guessing.

Each recognized transaction is a separate draft. Users can edit or cancel each draft, confirm one draft independently, or confirm all eligible pending drafts in the same batch. Before confirming an expense draft, the backend validates the projected available balance. A single-draft confirmation that would make the balance negative is rejected without creating a transaction. Confirm-all evaluates the combined net effect of all pending drafts in the batch; if the projected available balance would be negative, none of those pending drafts is saved in that attempt. Previously confirmed drafts remain unchanged.

**Confirm-all rule:** validate all pending drafts before saving. If any pending draft is incomplete or invalid, the confirm-all action saves none of the pending drafts in that attempt, identifies the invalid drafts and asks the user to complete them. Valid drafts can still be confirmed individually. Previously confirmed drafts are not recreated when the remaining drafts are confirmed later.

**Conversation persistence:** Users may choose to save conversation history. Reopening a saved conversation restores its messages and unconfirmed drafts. Restored drafts remain pending and are never auto-saved as financial transactions.

**Conversation deletion:** deleting a conversation removes its messages and unconfirmed drafts, but never deletes transactions already confirmed and saved. It does not alter balance, budgets, transaction history or statistics.

### FR-11 – AI Scan Receipt

Users upload a receipt image from their device; camera capture is not required for v1. AI attempts to identify merchant/date when readable, each item name, each item price and the invoice total.

**Temporary image handling:**
- Do not store original receipt images permanently or in the financial database.
- Process in temporary storage or memory only; clean up after processing, cancellation or failure.
- Image resizing/compression may be used to reduce upload and inference costs.
- Never include receipt images in logs or diagnostics.

**Unclear receipt handling:**
- Mark item names/prices that cannot be read.
- User can add, edit or delete item rows and correct item names/prices.
- Required data must be complete before confirmation.

**Reconciliation:**
- Compare the sum of item prices with the invoice total.
- If they differ, show a warning; AI must not silently change an item price or total.
- User may correct item values or the total manually.
- Confirmation is blocked until all required data is complete and the item sum equals the invoice total. Confirmation is also blocked if the expense would make available balance negative; the draft remains pending and no financial record is created.

**Deliberate v1 limitations:** no separate identification/storage of VAT, service fees, delivery fees or discounts; no automatic category suggestion. User chooses the category. Therefore receipts where the printed total differs from the sum of visible item prices may require manual correction and remain blocked until reconciled.

One receipt produces one expense transaction with child receipt-item details, not one transaction per item.

### FR-12 – Confirm AI Scan Transaction

After scanning, show one editable draft containing transaction details and item rows. User can edit transaction fields and items, cancel the draft, or confirm save. On successful confirmation, create one expense transaction plus its receipt details and item rows. Before commit, verify that available balance after this expense remains non-negative. If funds are insufficient, reject confirmation and preserve the draft for the user to retry after the balance changes. Only after successful persistence may the system update available balance, history, budgets and statistics. Parent and child records must commit atomically; on failure, roll back all of them.

## 5. Acceptance Criteria

| ID | Acceptance criterion |
|---|---|
| AC-01 | Registration succeeds with valid data and a unique email. |
| AC-02 | Registration rejects malformed/duplicate email, password shorter than 8 characters, or missing terms acceptance. |
| AC-03 | Login/logout work; invalid credentials return an error. |
| AC-04 | Dashboard shows correct available balance, monthly income/expense, budget alerts and five recent transactions. |
| AC-05 | A user can create a valid manual income or expense; an expense is created only when projected available balance remains non-negative. |
| AC-06 | Invalid/non-positive amount, missing category, invalid date or insufficient available balance is rejected without partial persistence. |
| AC-07 | User can view default categories and create custom categories. |
| AC-08 | User can create, edit and delete monthly category budgets. |
| AC-09 | Budget alerts occur at 80% and over-limit; jar transfers are excluded. |
| AC-10 | User can list, filter, view, edit and delete their own transactions. |
| AC-11 | Editing/deleting a transaction refreshes related balances, statistics and budgets correctly; an operation that would make available balance negative is rejected and leaves prior data unchanged. Receipt transaction amount/item edits remain reconciled atomically. |
| AC-12 | Monthly statistics, category statistics and seven-day expense chart match recorded transactions. |
| AC-13 | Jar deposits/withdrawals update available and jar balances but do not count as income/expense. |
| AC-14 | Overdrawn deposits, overdrawn withdrawals and non-positive amounts are rejected. |
| AC-15 | AI Chat creates separate drafts for multiple transactions in one message. |
| AC-16 | AI Chat distinguishes new transactions from draft revisions and asks clarification when target is ambiguous. |
| AC-17 | Confirming one draft does not confirm other drafts; an expense draft is rejected if its confirmation would make available balance negative. |
| AC-18 | Confirm-all saves none if any pending draft is invalid or the combined projected available balance would be negative; valid drafts remain individually confirmable when their own confirmation passes balance validation. |
| AC-19 | Saved conversations restore messages and pending drafts without auto-saving transactions. |
| AC-20 | Deleting a conversation removes messages/pending drafts but preserves confirmed transactions. |
| AC-21 | AI Scan identifies item names, item prices and invoice total when readable. |
| AC-22 | User can edit/add/delete items; unreadable or missing fields are marked. |
| AC-23 | A mismatch between item sum and invoice total blocks confirmation until resolved. |
| AC-24 | Receipt images are temporary and cleaned up; no original receipt image is retained permanently. |
| AC-25 | AI Scan does not auto-classify category or separately identify taxes/fees/discounts. |
| AC-26 | Confirming a receipt creates one expense transaction with item details only when item sum equals invoice total and projected available balance remains non-negative; financial views update only after successful persistence. |

## 6. Non-functional Requirements

### Security
- Passwords are stored only as secure password hashes.
- All user-owned data is access-controlled by authenticated user identity.
- AI provider credentials are stored only on the backend, never in the mobile bundle.
- APIs authenticate and authorize every data access.

### Performance and resilience
- Normal interactions should respond quickly under stable network conditions.
- AI operations expose loading/error states and appropriate retry behavior.
- Receipt images are bounded and optimized before inference.

### Data integrity
- Invoice parent and child records save atomically.
- Duplicate submissions must not create duplicate financial entries.
- Financial calculations must remain consistent after edits/deletes and concurrent jar transfers. All balance-affecting mutations must be serialized or otherwise concurrency-controlled; the projected available balance after each committed mutation must be non-negative. A rejected mutation must leave all affected records unchanged.

### Privacy
- No permanent receipt image storage.
- Temporary images must be cleaned up.
- Do not include secrets, receipt images or unnecessary personal data in logs.

### Usability and maintainability
- Vietnamese UI; VND default currency; Android/iOS target.
- Separate mobile app, backend, database and AI-provider adapter.
- Architecture should permit replacing the AI provider without redesigning the entire application.

## 7. Out of Scope for v1

- Shared household/family finance.
- Bank integrations, automatic bank transaction sync or payment processing.
- Stocks, investments or loans.
- Multiple currencies and FX conversion.
- Separate admin portal.
- AI auto-saving without user confirmation.
- AI category suggestion in AI Scan.
- Long-term original receipt image storage.
- Separate VAT/fee/delivery/discount extraction.
- Opening balance entry.
- Shared savings jars.
- Renaming/editing savings jar target or deleting a savings jar in v1 (D-11).

## 8. Open Questions (not approved decisions)

| ID | Topic | Proposed handling / note |
|---|---|---|
| OQ-01 | Transaction deletion storage strategy | User-visible deletion and recalculation are approved by FR-07. Decide hard delete vs soft delete and the dependent receipt-detail/item handling before migration; never leave orphan rows or include deleted records in aggregates. |
| OQ-02 | Forgot password | Define secure reset flow; not specified in approved FRs. |
| OQ-03 | Delete account | Define account/data deletion, retention and re-authentication policy. |
| OQ-04 | AI Chat transaction/message limits | Set configurable request and draft limits; disclose errors to user. |
| OQ-05 | Edit/delete savings jar | **Closed for v1:** out of scope per group decision D-11. No rename, target-edit or delete API. Revisit only through a future change request. |
| OQ-06 | Backups | Define backup, retention and restore testing policy. |
| OQ-07 | Draft retention | Set retention period and cleanup policy for abandoned drafts. |
| OQ-08 | Receipt upload limit | Set max image size, accepted formats and compression settings. |
| OQ-09 | Unsaved conversation retention | Define how long unsaved, session-only conversations remain before cleanup. |
| OQ-10 | Future transaction dates | The approved FR requires a valid date but does not explicitly approve a future-date cutoff. Confirm whether future dates should be rejected before implementing a hard limit. |
| OQ-11 | Budget month rollover | Monthly budgets are tracked by month; confirm whether a future version should carry unused limits forward. v1 planning assumes separate monthly records and no automatic carry-forward, subject to change request. |

## 9. Product Principles

1. The user controls their financial data.
2. AI analyzes and proposes; it never approves or saves a transaction by itself.
3. Only explicit user confirmation creates a transaction.
4. Balances, budgets, history and statistics must remain consistent.
5. Minimize retained data and storage usage.
6. v1 focuses on personal finance and AI-assisted entry.
