/**
 * @jest-environment node
 */
// P1-FE-01 — ESLint ranh giới ECC phải BẮT được file mẫu vi phạm.
import { ESLint } from 'eslint';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
// Truyền config trực tiếp: Jest không hỗ trợ dynamic import mà ESLint dùng để nạp eslint.config.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: require(path.join(root, 'eslint.config.js')) });

async function errorsFor(file: string, code: string) {
  const [res] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return res!.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
}

describe('ESLint ECC boundaries', () => {
  it('Presentational (ui/) không được import api/stores/rules', async () => {
    expect(await errorsFor('src/ui/Bad.tsx', "import { http } from '@/api/client';\nexport const x = http;")).toHaveLength(1);
    expect(await errorsFor('src/ui/Bad.tsx', "import { useSessionStore } from '@/stores/session.store';\nexport const x = useSessionStore;")).toHaveLength(1);
    expect(await errorsFor('src/features/auth/components/Bad.tsx', "import { validateEmail } from '@/rules/validation';\nexport const x = validateEmail;")).toHaveLength(1);
  });
  it('Rule không được import React/RN/api', async () => {
    expect(await errorsFor('src/rules/bad.ts', "import { View } from 'react-native';\nexport const x = View;")).toHaveLength(1);
    expect(await errorsFor('src/rules/bad.ts', "import { http } from '@/api/client';\nexport const x = http;")).toHaveLength(1);
  });
  it('Container được phép dùng api + rules', async () => {
    expect(await errorsFor('src/features/auth/containers/Ok.tsx', "import { http } from '@/api/client';\nimport { validateEmail } from '@/rules/validation';\nexport const x = [http, validateEmail];")).toHaveLength(0);
  });
});
