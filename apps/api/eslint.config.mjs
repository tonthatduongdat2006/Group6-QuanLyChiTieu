import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Ranh giới lớp backend (backend-plan §1): controller không gọi Prisma trực tiếp ở module nghiệp vụ tài chính
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/modules/*/repository*'], message: 'Không import repository của module khác' }] }],
    },
  },
  {
    files: ['src/**/*.controller.ts'],
    ignores: ['src/modules/user/**', 'src/modules/health/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: '@prisma/client', message: 'Controller không truy cập DB; dùng service' }] }],
    },
  },
);
