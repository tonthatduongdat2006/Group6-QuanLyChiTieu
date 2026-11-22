# Contract Changelog
**File:** `packages/contracts/openapi.yaml`
**Generated for task:** P0-SH-02
**Status:** Revision 3.2.1 — Implementation artifact (not a Planning revision)

---

## 1. Source baseline

| Item | Value |
|---|---|
| API source | API Documentation v1.1 (`QLCT-API-001`) |
| ERD source | Database Schema ERD v1.1 (`QLCT-DB-001`) |
| OpenAPI version | 3.1.0 |
| Base path | `/api/v1` |
| Transport | HTTPS |
| Operation count | **44** (sections 2–10 of API v1.1) |

---

## 2. Operation inventory (44 total)

### § 2 — Auth and Users (6 operations)
| # | Method | Path |
|---|---|---|
| 1 | POST | `/auth/register` |
| 2 | POST | `/auth/login` |
| 3 | POST | `/auth/refresh` |
| 4 | POST | `/auth/logout` |
| 5 | GET | `/users/me` |
| 6 | PATCH | `/users/me` |

### § 3 — Dashboard (1)
| # | Method | Path |
|---|---|---|
| 7 | GET | `/dashboard` |

### § 4 — Categories (2)
| # | Method | Path |
|---|---|---|
| 8 | GET | `/categories` |
| 9 | POST | `/categories` |

### § 5 — Transactions (5)
| # | Method | Path |
|---|---|---|
| 10 | GET | `/transactions` |
| 11 | POST | `/transactions` |
| 12 | GET | `/transactions/{transactionId}` |
| 13 | PATCH | `/transactions/{transactionId}` |
| 14 | DELETE | `/transactions/{transactionId}` |

### § 6 — Budgets (4)
| # | Method | Path |
|---|---|---|
| 15 | GET | `/budgets` |
| 16 | POST | `/budgets` |
| 17 | PATCH | `/budgets/{budgetId}` |
| 18 | DELETE | `/budgets/{budgetId}` |

### § 7 — Saving Jars (6, no PATCH/DELETE — D-11)
| # | Method | Path |
|---|---|---|
| 19 | GET | `/saving-jars` |
| 20 | POST | `/saving-jars` |
| 21 | GET | `/saving-jars/{jarId}` |
| 22 | POST | `/saving-jars/{jarId}/deposits` |
| 23 | POST | `/saving-jars/{jarId}/withdrawals` |
| 24 | GET | `/saving-jars/{jarId}/transactions` |

### § 8 — Statistics (3)
| # | Method | Path |
|---|---|---|
| 25 | GET | `/statistics/overview` |
| 26 | GET | `/statistics/categories` |
| 27 | GET | `/statistics/daily-expenses` |

### § 9 — AI Chat and Conversations (13)
| # | Method | Path |
|---|---|---|
| 28 | POST | `/ai/conversations` |
| 29 | GET | `/ai/conversations` |
| 30 | GET | `/ai/conversations/{conversationId}` |
| 31 | PATCH | `/ai/conversations/{conversationId}` |
| 32 | DELETE | `/ai/conversations/{conversationId}` |
| 33 | POST | `/ai/conversations/{conversationId}/messages` |
| 34 | GET | `/ai/conversations/{conversationId}/messages` |
| 35 | GET | `/ai/conversations/{conversationId}/draft-batches` |
| 36 | GET | `/ai/drafts/{draftId}` |
| 37 | PATCH | `/ai/drafts/{draftId}` |
| 38 | POST | `/ai/drafts/{draftId}/cancel` |
| 39 | POST | `/ai/drafts/{draftId}/confirm` |
| 40 | POST | `/ai/draft-batches/{batchId}/confirm-all` |

### § 10 — AI Scan / Receipt (4)
| # | Method | Path |
|---|---|---|
| 41 | POST | `/ai/receipts/scan` |
| 42 | POST | `/ai/drafts/{draftId}/items` |
| 43 | PATCH | `/ai/draft-items/{itemId}` |
| 44 | DELETE | `/ai/draft-items/{itemId}` |

**Total: 44 operations** — matches API Documentation v1.1 §14 target count.

---

## 3. Saving Jar scope restriction (D-11)

The following operations are **intentionally absent** from the contract per Group Decision D-11:

- `PATCH /saving-jars/{jarId}` — no jar rename or target edit in v1
- `DELETE /saving-jars/{jarId}` — no jar delete in v1

API Documentation v1.1 §7 confirms: *"D-11: v1 does not provide PATCH or DELETE for savings jars."*

This matches the baseline count: API v1.0 had 45 endpoints; `PATCH /saving-jars/{jarId}` was removed under D-11, giving 44.

---

## 4. Idempotency behavior

**Key semantics** (API Documentation v1.1 §1.1, ERD v1.1 §2):

- Same `Idempotency-Key` + same normalized request payload → returns original result.
- Same `Idempotency-Key` + different payload → `409 IDEMPOTENCY_KEY_REUSED`.
- Key scope is `(authenticated user, operation, key)`.

**`Idempotent-Replayed` response header is NOT included** in this contract. It was explicitly removed from Planning Revision 3.1 and is not part of the API v1.1 baseline. No operation documents this header.

**Operations with `Idempotency-Key` required (documented as `required: true`):**

| Operation | ERD storage | Unique scope |
|---|---|---|
| `POST /transactions` | `transactions.idempotency_key` + `idempotency_request_hash` | `(user_id, idempotency_key)` |
| `POST /saving-jars` | `saving_jars.create_idempotency_key` + `create_request_hash` | `(user_id, create_idempotency_key)` |
| `POST /ai/conversations/{conversationId}/messages` | `ai_messages.idempotency_key` + `idempotency_request_hash` | `(conversation_id, idempotency_key)` |
| `POST /ai/receipts/scan` | `ai_draft_batches.idempotency_key` + `idempotency_request_hash` | `(user_id, source_type, idempotency_key)` |
| `POST /ai/drafts/{draftId}/confirm` | `ai_drafts.confirm_idempotency_key` + `confirm_request_hash` | `(user_id, confirm_idempotency_key)` |
| `POST /ai/draft-batches/{batchId}/confirm-all` | `ai_draft_batches.confirm_all_idempotency_key` + `confirm_all_request_hash` | `(user_id, confirm_all_idempotency_key)` |

**Operations with `Idempotency-Key` supported (documented as `required: false`):**

| Operation | ERD storage | Unique scope |
|---|---|---|
| `POST /saving-jars/{jarId}/deposits` | `jar_transactions.idempotency_key` + `idempotency_request_hash` | `(user_id, idempotency_key)` |
| `POST /saving-jars/{jarId}/withdrawals` | `jar_transactions.idempotency_key` + `idempotency_request_hash` | `(user_id, idempotency_key)` |

The mapping covers all **14 idempotency columns across 6 tables** per D-05 (GROUP APPROVED) and ERD v1.1. `create_idempotency_key` / `create_request_hash` appear only in `saving_jars`, not in `ai_messages` or `ai_draft_batches`.

---

## 5. Receipt transaction editing (D-06)

Receipt editing uses the existing **`PATCH /transactions/{transactionId}`** endpoint with a nested `receipt` object:

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

Item fields documented: `item_name`, `amount`, `sort_order` — consistent with API v1.1 §5 and ERD v1.1 §3.14.

**No separate receipt transaction update endpoint is introduced.** D-06 is not reopened; this is the existing contract from API v1.1.

Business rules applied:
- `receipt.items` present → full replacement of current item list (atomic).
- `amount` changes on a receipt transaction → `receipt.items` required in same request.
- `SUM(items.amount)` must equal resulting `transaction.amount`; mismatch → `422 RECEIPT_TOTAL_MISMATCH`.
- Balance guard applies (D-07); mismatch or insufficient balance → full rollback.

---

## 6. Transaction soft-delete alignment (D-12a / D-12b — GROUP APPROVED)

**Source ambiguity:** API Documentation v1.1 §5 (`DELETE /transactions/{transactionId}`) states *"Hard delete versus soft delete is an unresolved technical choice (OQ-01)"*. However, **D-12a and D-12b are GROUP APPROVED decisions** recorded in the Planning package (Revision 3.2.1) that supersede this unresolved wording.

**Contract behavior documented for `DELETE /transactions/{transactionId}`:**

- Deletion is a **soft delete** via `transactions.deleted_at`.
- `receipt_details` and `receipt_items` child rows are **retained** and are NOT cascade-deleted.
- Soft-deleted transactions are **excluded from all active lists and financial aggregates** (available balance, budget spent, statistics).
- The DELETE operation is **idempotent**: repeated calls return 204.
- If deleting an INCOME transaction would make projected available balance negative → `422 INSUFFICIENT_BALANCE`, data unchanged.

**No new endpoint or response header is introduced** to represent soft-delete behavior. The semantics are documented in the operation description as implementation notes.

This alignment is recorded here because the source document text still contains the older unresolved OQ-01 wording. The source document is not modified.

---

## 7. Endpoints intentionally excluded from v1 scope

The following endpoints do NOT appear in this contract because they were removed from scope (Planning Revision 3.1/3.2.1) and are not in API v1.1:

| Excluded | Reason |
|---|---|
| Category rename/delete endpoints | Not in PRD v1.1; not in API v1.1 §4 |
| `PATCH /saving-jars/{jarId}` | D-11 (GROUP APPROVED) |
| `DELETE /saving-jars/{jarId}` | D-11 (GROUP APPROVED) |
| Social OAuth endpoints | Not in PRD v1.1 |
| Income 7-day chart or week/month selector | D-10 — spending chart only |
| Forgot-password / account-deletion flows | OQ-02, OQ-03 — deferred |

---

## 8. Source ambiguities intentionally left unspecified

| Topic | Source status | Contract treatment |
|---|---|---|
| Future-date cutoff (OQ-10) | Not group-approved | `transaction_date` accepts any `YYYY-MM-DD`; validation rules TBD by business decision |
| Monthly budget rollover (OQ-08) | Not group-approved | Not documented; `month_start` is first day of month per API v1.1 |
| AI request/draft limits (OQ-04) | Open | `429 RATE_LIMITED` documented; limit values are configuration |
| Draft expiry period (OQ-07) | Open | `expires_at` field present on AIDraft; retention policy TBD |
| Unsaved conversation retention (OQ-09) | Open | No endpoint added; policy TBD |
| Receipt image size/format limits (OQ-08) | Open | Documented as "configurable server-side" |
| Token TTL values | Recommendation, not fixed | `expires_in: 900` marked as example |
| Hosting/deployment region (D-04b) | Deferred to release | Server `host` variable is a placeholder |

---

## 9. Security decisions

- All endpoints except `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` and `POST /auth/logout` require `Authorization: Bearer <access_token>`.
- Backend derives user identity from the token; client-supplied `user_id` values are never trusted for authorization.
- Resources not belonging to the authenticated user return 404 (not 403) to avoid leaking existence.
- AI API keys are kept exclusively on the backend; they do not appear in any response.
- Stack traces, internal paths and raw provider payloads are never returned to the client.

---

## 10. New decisions made in this task

**None.** All behavioral decisions in this contract derive from:
- API Documentation v1.1 (baseline)
- ERD v1.1 (baseline)
- GROUP APPROVED decisions: D-05, D-06, D-07, D-10, D-11, D-12a, D-12b

No new group-approved decisions are claimed. Any behavioral gap not covered by the above sources is marked as "configurable" or "TBD" with the corresponding OQ reference.
