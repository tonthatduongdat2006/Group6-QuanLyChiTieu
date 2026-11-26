// P1-FE-01 — ESLint ranh giới ECC (frontend-plan §2). Vi phạm = lỗi lint, CI fail.
const expoConfig = require('eslint-config-expo/flat');

const NO_BUSINESS_IN_VIEW = {
  patterns: [
    { group: ['@/api', '@/api/*', '**/api/*'], message: 'Presentational không gọi API — nhận dữ liệu qua props' },
    { group: ['@/stores', '@/stores/*', '**/stores/*'], message: 'Presentational không đọc store — nhận qua props' },
    { group: ['@/rules', '@/rules/*', '**/rules/*'], message: 'Presentational không chứa rule/validate nghiệp vụ — Container làm' },
  ],
};

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', '.expo/*'] },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/features/*/components/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', NO_BUSINESS_IN_VIEW] },
  },
  {
    files: ['src/rules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-native', 'react-native/*', 'expo*', '@expo/*'], message: 'Rule là TS thuần' },
            { group: ['@/api*', '@/stores*', '@/ui*', '@/features*', '**/api/*', '**/stores/*'], message: 'Rule không phụ thuộc tầng khác' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/stores/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['@/ui*', '@/features*'], message: 'Store không biết UI' }] }] },
  },
];
