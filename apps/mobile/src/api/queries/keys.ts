// Khóa query chuẩn + nhóm cần làm mới sau mutation (frontend-plan §6).
export const qk = {
  me: ['me'] as const,
  dashboard: (month: string) => ['dashboard', month] as const,
  dashboardAll: ['dashboard'] as const,
  categories: (type?: string) => ['categories', type ?? 'all'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  transactionsAll: ['transactions'] as const,
  transaction: (id: string) => ['transaction', id] as const,
};
