// Test data factories (P0-TD-02: "factory user/category/tx/jar/draft";
// docs/test-strategy.md §3 Fixtures: user A/B, categories, transactions,
// saving jars, batches/drafts in every status).
//
// Records use the ERD v1.1 column names (docs/sources/04_Database_Schema_
// ERD_v1.1.md §3) plus `transactions.deleted_at` from the GROUP APPROVED
// D-12a soft-delete decision. Money is `bigint` (BIGINT columns); dates are
// 'YYYY-MM-DD' strings in Asia/Ho_Chi_Minh.
//
// These builders only create in-memory records. Inserting them into
// PostgreSQL needs the Prisma models from P1-BE-01 and an isolated test
// database, so persistence is intentionally not implemented here.

import { createHash } from 'node:crypto';
import type { Clock } from '../helpers/clock';
import { toVnDate } from '../helpers/clock';

export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionSource = 'MANUAL' | 'AI_CHAT' | 'AI_SCAN';
export type DraftStatus =
  'NEEDS_INPUT' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type BatchSourceType = 'AI_CHAT' | 'AI_SCAN';

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  terms_accepted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryRecord {
  id: string;
  user_id: string;
  name: string;
  name_normalized: string;
  type: TransactionType;
  is_default: boolean;
  created_at: Date;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  category_id: string;
  type: TransactionType;
  amount: bigint;
  transaction_date: string;
  note: string | null;
  source: TransactionSource;
  idempotency_key: string | null;
  idempotency_request_hash: string | null;
  /** D-12a: soft delete marker; null = active. */
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SavingJarRecord {
  id: string;
  user_id: string;
  name: string;
  target_amount: bigint;
  create_idempotency_key: string | null;
  create_request_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AiDraftBatchRecord {
  id: string;
  user_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  source_type: BatchSourceType;
  idempotency_key: string | null;
  idempotency_request_hash: string | null;
  confirm_all_idempotency_key: string | null;
  confirm_all_request_hash: string | null;
  created_at: Date;
}

export interface AiDraftRecord {
  id: string;
  user_id: string;
  batch_id: string;
  transaction_type: TransactionType | null;
  amount: bigint | null;
  category_id: string | null;
  transaction_date: string | null;
  note: string | null;
  merchant_name: string | null;
  status: DraftStatus;
  validation_errors: Array<{ field: string; message: string }> | null;
  transaction_id: string | null;
  confirm_idempotency_key: string | null;
  confirm_request_hash: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AiDraftItemRecord {
  id: string;
  draft_id: string;
  item_name: string | null;
  amount: bigint | null;
  sort_order: number;
}

/** Fixed non-secret placeholder; never a real password hash. */
export const TEST_PASSWORD_HASH = 'test-only-placeholder-not-a-real-hash';

/**
 * Harness approximation of category name normalisation, used only to fill
 * the NOT NULL column. The real rule is decision D-14 (pending, P1-BE-06).
 */
export function approximateNormalizedName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Deterministic UUID (version-4 layout) from a namespace and a counter. */
export function deterministicUuid(namespace: string, counter: number): string {
  const hex = createHash('sha256')
    .update(`${namespace}:${counter}`)
    .digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

export interface TestDataFactory {
  readonly clock: Clock;
  nextId(): string;
  user(overrides?: Partial<UserRecord>): UserRecord;
  /** Two independent users for ownership tests (user A / user B). */
  userPair(): { userA: UserRecord; userB: UserRecord };
  category(
    user: UserRecord,
    overrides?: Partial<CategoryRecord>,
  ): CategoryRecord;
  transaction(
    user: UserRecord,
    category: CategoryRecord,
    overrides?: Partial<TransactionRecord>,
  ): TransactionRecord;
  savingJar(
    user: UserRecord,
    overrides?: Partial<SavingJarRecord>,
  ): SavingJarRecord;
  draftBatch(
    user: UserRecord,
    overrides?: Partial<AiDraftBatchRecord>,
  ): AiDraftBatchRecord;
  draft(
    batch: AiDraftBatchRecord,
    overrides?: Partial<AiDraftRecord>,
  ): AiDraftRecord;
  draftItem(
    draft: AiDraftRecord,
    overrides?: Partial<AiDraftItemRecord>,
  ): AiDraftItemRecord;
}

export function createTestDataFactory(options: {
  clock: Clock;
  /** Same seed => same ids, so failures are reproducible. */
  seed?: string;
}): TestDataFactory {
  const { clock } = options;
  const seed = options.seed ?? 'test';
  let counter = 0;
  let userCounter = 0;
  const nextId = () => deterministicUuid(seed, ++counter);

  const factory: TestDataFactory = {
    clock,
    nextId,

    user(overrides = {}) {
      const n = ++userCounter;
      const now = clock.now();
      return {
        id: nextId(),
        full_name: `Test User ${n}`,
        email: `user-${n}@example.test`,
        password_hash: TEST_PASSWORD_HASH,
        phone: null,
        terms_accepted_at: now,
        created_at: now,
        updated_at: now,
        ...overrides,
      };
    },

    userPair() {
      return {
        userA: factory.user({ full_name: 'User A' }),
        userB: factory.user({ full_name: 'User B' }),
      };
    },

    category(user, overrides = {}) {
      const name = overrides.name ?? 'Ăn uống';
      return {
        id: nextId(),
        user_id: user.id,
        name,
        name_normalized: approximateNormalizedName(name),
        type: 'EXPENSE',
        is_default: false,
        created_at: clock.now(),
        ...overrides,
      };
    },

    transaction(user, category, overrides = {}) {
      const now = clock.now();
      return {
        id: nextId(),
        user_id: user.id,
        category_id: category.id,
        type: category.type,
        amount: 45000n,
        transaction_date: toVnDate(now),
        note: null,
        source: 'MANUAL',
        idempotency_key: null,
        idempotency_request_hash: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
        ...overrides,
      };
    },

    savingJar(user, overrides = {}) {
      const now = clock.now();
      return {
        id: nextId(),
        user_id: user.id,
        name: 'Hũ tiết kiệm',
        target_amount: 1000000n,
        create_idempotency_key: null,
        create_request_hash: null,
        created_at: now,
        updated_at: now,
        ...overrides,
      };
    },

    draftBatch(user, overrides = {}) {
      return {
        id: nextId(),
        user_id: user.id,
        conversation_id: null,
        source_message_id: null,
        source_type: 'AI_CHAT',
        idempotency_key: null,
        idempotency_request_hash: null,
        confirm_all_idempotency_key: null,
        confirm_all_request_hash: null,
        created_at: clock.now(),
        ...overrides,
      };
    },

    draft(batch, overrides = {}) {
      const now = clock.now();
      return {
        id: nextId(),
        user_id: batch.user_id,
        batch_id: batch.id,
        transaction_type: 'EXPENSE',
        amount: 45000n,
        category_id: null,
        transaction_date: toVnDate(now),
        note: null,
        merchant_name: null,
        status: 'NEEDS_INPUT',
        validation_errors: null,
        transaction_id: null,
        confirm_idempotency_key: null,
        confirm_request_hash: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
        ...overrides,
      };
    },

    draftItem(draft, overrides = {}) {
      return {
        id: nextId(),
        draft_id: draft.id,
        item_name: 'Phở bò',
        amount: 50000n,
        sort_order: 1,
        ...overrides,
      };
    },
  };
  return factory;
}

/** Every DraftStatus value, for "drafts in every status" fixtures. */
export const ALL_DRAFT_STATUSES: readonly DraftStatus[] = [
  'NEEDS_INPUT',
  'READY',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
];
