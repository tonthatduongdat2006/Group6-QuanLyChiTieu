// Kiểu sinh tự động từ openapi.yaml — chạy `pnpm --filter @ase/contracts gen` sau mỗi lần sửa spec.
// FE/BE import từ đây, KHÔNG tự viết lại DTO.
export type { paths, components, operations } from './generated/schema';
import type { components } from './generated/schema';
export type Schemas = components['schemas'];
export type ErrorCode = Schemas['ErrorCode'];
