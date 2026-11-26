# API DOCUMENTATION
## Quản Lý Chi Tiêu – AI Smart Expense

- **Document ID:** QLCT-API-001
- **Version:** 1.1 (synchronized with approved Review Plan v1.1; 44 v1 endpoints)
- **Style:** REST API
- **Base path:** `/api/v1`
- **Transport:** HTTPS
- **Payload:** JSON except multipart receipt upload
- **Authentication:** Bearer access token

> This is a contract baseline, not generated OpenAPI output. During Planning, validate naming, schemas, status codes and DTOs against the approved PRD/ERD. Do not silently change user-visible business semantics.

## 1. Conventions

### 1.1 Headers

Authenticated endpoints:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

For retryable mutations, send:

```http
Idempotency-Key: <unique-client-generated-key>
```

Key scope is `(authenticated user, operation, key)`. Replaying the same key with the same normalized request payload returns the original result. Reusing the same key with a different payload returns `409 IDEMPOTENCY_KEY_REUSED`. The client must reuse a key only for retrying the same user intent and generate a new key when the payload/intent changes. Backend stores an operation-namespaced key and request fingerprint with the affected resource (for example, `transactions.create:<client-key>`); the exact resource columns/unique indexes are specified in ERD v1.1.

Receipt upload uses `multipart/form-data`.

### 1.2 Types and formats

- UUID strings for identifiers.
- Money is a positive integer VND amount. JSON responses encode money as decimal strings (e.g. `"45000"`) because PostgreSQL `BIGINT` can exceed JavaScript safe integer range.
- Date-only values: `YYYY-MM-DD`.
- Timestamps: ISO 8601 UTC.
- Enums are uppercase strings as defined in ERD.

### 1.3 Success envelope

```json
{ "data": { "id": "uuid" } }
```

### 1.4 Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [{ "field": "amount", "message": "Số tiền phải lớn hơn 0" }],
    "request_id": "uuid"
  }
}
```

### 1.5 Pagination

List endpoints may accept `page` (default 1) and `page_size` (bounded server-side; default 20). Response:

```json
{ "data": [], "meta": { "page": 1, "page_size": 20, "total": 45, "total_pages": 3 } }
```

### 1.6 Authorization rule

Backend derives user identity from the access token. Never trust `user_id` supplied by the client. Every read/write must verify that the target resource belongs to the authenticated user. Return 404 for inaccessible resources where appropriate to avoid leaking their existence.

## 2. Authentication and Users

### POST `/auth/register`

Request:

```json
{
  "full_name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Example123",
  "phone": null,
  "terms_accepted": true
}
```

Validation: valid unique email, password length at least 8, terms accepted. Create user and that user's default categories. Response `201` with public user profile; never return password hash.

### POST `/auth/login`

Request: `{ "email": "user@example.com", "password": "...", "remember_me": true }`

`remember_me` is optional and defaults to `false`. Recommended client behavior: when true, persist the refresh token in platform secure storage; when false, keep the session token only for the current app session and do not persist it across app restarts. Backend still hashes stored refresh tokens and supports rotation/revocation. Final token TTL values are configuration decisions, not fixed product requirements.

Response `200`:

```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

The 900-second example is a proposed access-token lifetime, configurable by environment/security policy.

### POST `/auth/refresh`

Request: `{ "refresh_token": "..." }`. Validate session, rotate refresh token and return new access/refresh tokens. Store only refresh-token hash.

### POST `/auth/logout`

Request: `{ "refresh_token": "..." }`. Revoke corresponding session and return `200`.

### GET `/users/me`

Return current user's public profile: `id`, `full_name`, `email`, `phone`.

### PATCH `/users/me`

Request may update `full_name` and/or `phone`. Email/password changes use separate secured flows if added later.

## 3. Dashboard

### GET `/dashboard?month=YYYY-MM`

Return:

```json
{
  "data": {
    "available_balance": "5000000",
    "monthly_income": "10000000",
    "monthly_expense": "4000000",
    "recent_transactions": [],
    "budget_alerts": []
  }
}
```

Available balance includes internal jar deposits/withdrawals using the PRD formula. Monthly income/expense exclude jar transfers. Recent transactions default to five records.

## 4. Categories

### GET `/categories?type=INCOME|EXPENSE`

Return current user's categories with `id`, `name`, `type`, `is_default`.

### POST `/categories`

Request: `{ "name": "Mua sắm", "type": "EXPENSE" }`. Validate non-empty normalized unique name per user/type. Response `201`.

No rename/delete endpoints in v1.

## 5. Transactions

### GET `/transactions`

Optional query parameters: `month=YYYY-MM`, `type=INCOME|EXPENSE`, `category_id`, `page`, `page_size`. Return paginated current-user transactions.

### POST `/transactions`

Request:

```json
{
  "type": "EXPENSE",
  "amount": "45000",
  "category_id": "category-uuid",
  "note": "Ăn phở",
  "transaction_date": "2026-11-10"
}
```

Validate amount > 0, category ownership/type and valid date. `source` is set by backend to `MANUAL`, not trusted from client. For an EXPENSE, check the projected available balance under the shared per-user balance lock; reject with `422 INSUFFICIENT_BALANCE` if the result would be negative. Require/support `Idempotency-Key`; same key + same payload replays the original result, while same key + different payload returns `409 IDEMPOTENCY_KEY_REUSED`. Response `201` with created transaction.

### GET `/transactions/{transactionId}`

Return transaction fields and category. Include receipt merchant/items only for receipt transactions.

### PATCH `/transactions/{transactionId}`

Allowed editable fields: `amount`, `category_id`, `note`, `transaction_date`. For a receipt transaction, the request may also include a `receipt` object containing `merchant_name` and a replacement `items` array. Example:

```json
{
  "amount": "75000",
  "note": "Ăn sáng",
  "receipt": {
    "merchant_name": "Quán A",
    "items": [
      { "item_name": "Phở", "amount": "45000", "sort_order": 1 },
      { "item_name": "Cà phê", "amount": "30000", "sort_order": 2 }
    ]
  }
}
```

If a receipt transaction's `amount` changes, `receipt.items` must be supplied in the same request. When `receipt.items` is present, it is a full replacement of the current item list (the backend replaces the child rows atomically). If receipt items change, calculate their sum and require it to equal the resulting transaction amount. Update parent and child rows atomically; mismatch returns `422 RECEIPT_TOTAL_MISMATCH` and leaves existing data unchanged. For any transaction update, lock the user's balance mutation path, calculate projected available balance and reject/rollback with `422 INSUFFICIENT_BALANCE` if it would be negative. Recomputed views derive from persisted transactions.

### DELETE `/transactions/{transactionId}`

Delete after client confirmation. Preserve FR-07 behavior: recalculate available balance, statistics and budgets. Hard delete versus soft delete is an unresolved technical choice (OQ-01), not a group-approved business decision. Whichever strategy is selected must not orphan receipt details/items or include deleted transactions in active aggregates. If deleting an income transaction would make projected available balance negative, reject with `422 INSUFFICIENT_BALANCE` and leave data unchanged. Never delete a confirmed transaction merely because its AI conversation was deleted.

## 6. Budgets

### GET `/budgets?month=YYYY-MM`

Return each budget with `id`, `category_id`, `category_name`, `limit_amount`, derived `spent_amount`, `remaining_amount`, and `usage_percent`. Jar transfers are excluded.

### POST `/budgets`

Request: `{ "category_id": "...", "month_start": "2026-11-01", "limit_amount": "3000000" }`. Validate first day of month, expense category owned by user, amount > 0 and uniqueness by user/category/month. Response `201`.

### PATCH `/budgets/{budgetId}`

Request: `{ "limit_amount": "3500000" }`.

### DELETE `/budgets/{budgetId}`

Delete current user's budget.

## 7. Savings Jars

### GET `/saving-jars`

Return jars with `id`, `name`, `target_amount`, derived `current_balance`, `progress_percent`.

### POST `/saving-jars`

Request: `{ "name": "Du lịch", "target_amount": "10000000", "initial_deposit": "1000000" }`. `initial_deposit` may be omitted or zero. If positive, jar creation and deposit must be atomic and must pass available-balance validation. Require/support `Idempotency-Key` for safe retry. No update or delete endpoint exists for jars in v1 (D-11).

### GET `/saving-jars/{jarId}`

Return jar details and recent transfer history.

### POST `/saving-jars/{jarId}/deposits`

Request: `{ "amount": "500000", "note": "Tiết kiệm tháng 11" }`. Require positive amount and sufficient available balance. Insert `DEPOSIT` jar transaction atomically under the shared per-user balance lock. Support `Idempotency-Key` and request-fingerprint replay validation.

### POST `/saving-jars/{jarId}/withdrawals`

Request: `{ "amount": "200000", "note": "Rút tiền sử dụng" }`. Require positive amount and sufficient jar balance. Insert `WITHDRAW` jar transaction atomically under the shared per-user balance lock. Support `Idempotency-Key` and request-fingerprint replay validation.

### GET `/saving-jars/{jarId}/transactions`

Paginated transfer history; optional `type=DEPOSIT|WITHDRAW`.

D-11: v1 does not provide PATCH or DELETE for savings jars. The only supported jar operations are list, create, details, deposit, withdrawal and transfer history.

## 8. Statistics

### GET `/statistics/overview?month=YYYY-MM`

Returns `month`, `total_income`, `total_expense`, `net_change`. `net_change = income - expense`; jar transfers are excluded.

### GET `/statistics/categories?month=YYYY-MM&type=EXPENSE|INCOME`

Returns per-category amount and percentage share.

### GET `/statistics/daily-expenses?from=YYYY-MM-DD&to=YYYY-MM-DD`

Returns `{ date, amount }` points for the requested range; mobile uses this for the seven-day expense chart.

## 9. AI Chat and Conversations

### POST `/ai/conversations`

Create a conversation. Request optional `{ "title": "Chi tiêu tháng 11" }`. Response includes `id`, `title`, `is_saved: false`.

### POST `/ai/conversations/{conversationId}/messages`

Request: `{ "content": "Hôm nay tôi ăn phở 45 nghìn, uống cà phê 30 nghìn" }`. Require `Idempotency-Key`; the key is stored with the user message / resulting draft batch so a network retry does not create duplicate messages, AI calls or draft batches.

Backend validates ownership, adds context, calls AI, validates structured output, saves the user/assistant messages and creates a draft batch plus individual drafts. It must not create transactions. Response includes user message, assistant message and `draft_batch` with draft IDs and statuses. Each recognized transaction is a separate draft.

### GET `/ai/conversations`

List only saved conversations (`is_saved=true`) for current user.

### GET `/ai/conversations/{conversationId}`

Get conversation metadata owned by current user.

### GET `/ai/conversations/{conversationId}/messages`

Return messages ordered by `created_at`.

### GET `/ai/conversations/{conversationId}/draft-batches`

Return batches/drafts required to restore saved conversation, including pending draft state.

### PATCH `/ai/conversations/{conversationId}`

Request: `{ "is_saved": true }`. Set save state and timestamp. Saving a conversation retains messages and pending drafts for later restoration.

### DELETE `/ai/conversations/{conversationId}`

Delete conversation messages and unconfirmed drafts/batches. Confirmed financial transactions must remain intact and financial aggregates must not change. Implement deletion atomically and carefully configure FK actions.

### GET `/ai/drafts/{draftId}`

Return a draft and validation state, only if owned by user.

### PATCH `/ai/drafts/{draftId}`

Update allowed draft fields such as `transaction_type`, `amount`, `category_id`, `transaction_date`, `note`, and `merchant_name`. Revalidate after every edit; update `NEEDS_INPUT` or `READY` accordingly. Draft edits do not alter financial aggregates.

### POST `/ai/drafts/{draftId}/cancel`

Set pending draft to `CANCELLED`; cannot cancel a confirmed transaction through this endpoint.

### POST `/ai/drafts/{draftId}/confirm`

Confirm one ready draft. Re-check ownership, status and business invariants; acquire the shared per-user balance lock; compute projected available balance; create the transaction only if the result is non-negative; update draft to `CONFIRMED` with `transaction_id` atomically. For receipt drafts, also create receipt details/items atomically and require item sum = transaction amount. If balance is insufficient, return `422 INSUFFICIENT_BALANCE`, retain the pending draft and create no financial record. Must be idempotent using `Idempotency-Key` plus the draft's unique transaction link/status transition.

### POST `/ai/draft-batches/{batchId}/confirm-all`

Request body may be empty. Require `Idempotency-Key`. Acquire the shared per-user balance lock and lock the batch's pending drafts. Validate all pending drafts before writing. If any pending draft is invalid/incomplete, create no transactions in that attempt and return `422 BATCH_INVALID` with per-draft reasons. Calculate the combined projected available balance for all pending drafts (income and expense together); if it would be negative, create none and return `422 INSUFFICIENT_BALANCE`. User may still confirm valid drafts individually, subject to the balance invariant. Previously confirmed or cancelled drafts are not recreated. If all remaining pending drafts are valid and the projected balance is non-negative, create all corresponding transactions and update draft statuses in one DB transaction. The precise treatment of expired drafts is determined by status/retention policy; expired drafts are not confirmable.

## 10. AI Scan / Receipt

### POST `/ai/receipts/scan`

Content type: `multipart/form-data`; required field: `image`. Require `Idempotency-Key` so a retry of the same upload does not create duplicate batches/drafts. Same key + same image fingerprint returns the original scan result; same key + different image returns `409 IDEMPOTENCY_KEY_REUSED`.

Backend must enforce accepted image formats and a configurable size bound (OQ-08), verify actual file signature/decodeability, optionally resize/compress, call Claude Vision through AI Provider, normalize results, create one AI_SCAN draft batch and one draft with child `ai_draft_items`, then discard temporary image data on success/failure/cancellation. Do not save image bytes or permanent image URL.

The result may contain merchant/date null if unreadable, item names/prices null if unclear, transaction total, draft status and validation errors. AI does not choose category; user selects it. Example:

```json
{
  "data": {
    "draft_batch": { "id": "batch-uuid", "source_type": "AI_SCAN" },
    "draft": {
      "id": "draft-uuid",
      "merchant_name": "Cửa hàng A",
      "transaction_type": "EXPENSE",
      "amount": "100000",
      "transaction_date": "2026-11-10",
      "category_id": null,
      "status": "NEEDS_INPUT",
      "items": [
        { "id": "item-1", "item_name": "Phở", "amount": "45000" },
        { "id": "item-2", "item_name": "Cà phê", "amount": "55000" }
      ],
      "validation_errors": [{ "field": "category_id", "message": "Vui lòng chọn danh mục" }]
    }
  }
}
```

### POST `/ai/drafts/{draftId}/items`

Add a draft item: `{ "item_name": "Bánh mì", "amount": "25000" }`.

### PATCH `/ai/draft-items/{itemId}`

Edit `item_name` and/or `amount`. Item must belong to a draft owned by current user.

### DELETE `/ai/draft-items/{itemId}`

Delete an item from a pending receipt draft. Recompute validation after changes.

### Receipt reconciliation and confirmation

On any edit, backend recalculates item sum. Confirmation requires:
- all required transaction fields, category and item names/prices are present and valid;
- all prices are positive;
- sum of item amounts equals draft invoice total;
- no unresolved validation errors.

Taxes, service fees, delivery charges and discounts are not separately identified in v1. Consequently, receipts whose invoice total does not equal visible item sum remain blocked until user corrects the item/total data to match. Do not silently adjust values.

Confirm using `POST /ai/drafts/{draftId}/confirm`; on success one EXPENSE transaction, one receipt_details row and all receipt_items are saved in the same DB transaction. Confirmation also validates that projected available balance remains non-negative; otherwise return `422 INSUFFICIENT_BALANCE` and retain the draft without persisting any financial record.

## 11. Status and enums

- Transaction type: `INCOME`, `EXPENSE`.
- Transaction source: `MANUAL`, `AI_CHAT`, `AI_SCAN`.
- Jar type: `DEPOSIT`, `WITHDRAW`.
- Draft status: `NEEDS_INPUT`, `READY`, `CONFIRMED`, `CANCELLED`, `EXPIRED`.
- Message role: `USER`, `ASSISTANT`.
- Batch source type: `AI_CHAT`, `AI_SCAN`.

## 12. Error codes

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired authentication |
| 403 | `FORBIDDEN` | Authenticated but action not permitted |
| 404 | `NOT_FOUND` | Resource not found or not accessible |
| 409 | `CONFLICT` | Unique constraint or state conflict |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Same idempotency key was reused with a different normalized request payload |
| 422 | `VALIDATION_ERROR` | Field/business validation failed |
| 422 | `BATCH_INVALID` | One or more pending drafts invalid; no pending transaction saved in confirm-all attempt |
| 422 | `INSUFFICIENT_BALANCE` | A financial mutation, expense or confirmation would make available balance negative / funds are insufficient |
| 422 | `INSUFFICIENT_JAR_BALANCE` | Jar balance too low for withdrawal |
| 422 | `RECEIPT_TOTAL_MISMATCH` | Item sum differs from invoice total |
| 429 | `RATE_LIMITED` | Request or AI rate limit reached |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected backend error |
| 502 | `AI_PROVIDER_ERROR` | AI provider failed or returned unusable response |
| 503 | `SERVICE_UNAVAILABLE` | Temporary service outage |

Do not return API keys, secrets, stack traces, raw provider payloads containing sensitive data or internal filesystem paths to the client.

## 13. Security and integrity requirements

- Authenticate protected endpoints and authorize by record owner.
- Validate request DTOs and enforce server-side limits.
- Store tokens securely; hash refresh tokens and revoke session on logout.
- Keep AI API key exclusively on backend.
- Validate AI JSON schema, enum values, dates, amounts and category ownership.
- AI must never invoke confirm endpoints or cause automatic confirmation.
- Use DB transactions for receipt parent/child creation, confirm-all, draft confirmation, jar create+initial deposit, deposit and withdrawal.
- Use one shared per-user concurrency guard for every balance-affecting mutation (transaction create/update/delete, jar create+initial deposit, deposit, withdrawal, individual draft confirmation, confirm-all and receipt confirmation). Under the guard, calculate the projected balance and reject/rollback if it is negative.
- Support idempotency on transaction creation, jar creation/transfers, AI message submission, AI receipt scan and draft confirmation. Same key/same payload returns the previous result; same key/different payload returns `409 IDEMPOTENCY_KEY_REUSED`.
- Redact credentials and never log receipt image bytes.

## 14. Synchronized v1 scope and endpoint inventory

- Target v1 endpoint count: **44** (API baseline v1.0 had 45; `PATCH /saving-jars/{jarId}` is removed under group decision D-11).
- No `PATCH` or `DELETE` endpoint for saving jars in v1.
- Receipt transactions are edited through the existing `PATCH /transactions/{transactionId}` endpoint with nested receipt item replacement; no additional endpoint is introduced.
- Every balance-affecting operation applies D-07 and the shared per-user concurrency protocol.
- Future-date cutoff (D-09) and month rollover semantics (D-08) remain configurable assumptions/Open Questions unless explicitly approved; do not hardcode an unapproved product rule.
- OpenAPI is the recommended source-of-truth contract for FE/BE generation. The exact OpenAPI minor/spec version and code generator versions are finalized in P0 after compatibility verification.

## 15. Traceability

| PRD requirement | API group |
|---|---|
| FR-01, FR-02 | Auth |
| FR-03 | Dashboard |
| FR-04, FR-07 | Transactions |
| FR-05 | Categories |
| FR-06 | Budgets |
| FR-08 | Statistics |
| FR-09 | Saving Jars |
| FR-10 | AI Conversations, Messages, Drafts, Confirm/Confirm-all |
| FR-11 | AI Receipt Scan and draft item APIs |
| FR-12 | Draft confirmation and receipt persistence |

## 16. API implementation open questions

- Forgot-password flow (OQ-02).
- Account deletion and data retention (OQ-03).
- AI request/draft limits (OQ-04).
- OQ-05 is closed for v1: jar rename, target editing and deletion are out of scope under D-11.
- Draft expiry and cleanup (OQ-07).
- Receipt image size/formats/temp storage constraints (OQ-08).
- Unsaved conversation retention (OQ-09).
- Whether transaction deletion is hard delete or soft delete (related to OQ-01/OQ-03).
