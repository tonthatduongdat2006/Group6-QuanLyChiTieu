// Jest `setupFiles` for harness and integration suites (P0-TD-02).
// - Fixes the process time zone to Asia/Ho_Chi_Minh (test-strategy §1.5).
// - Forces AI_PROVIDER=fake: no test may call a live AI provider
//   (test-strategy §1.2, Architecture v1.1 §12).

export function applyTestEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.AI_PROVIDER;
  if (provider !== undefined && provider !== '' && provider !== 'fake') {
    throw new Error(
      `Tests must run with AI_PROVIDER=fake (got '${provider}'); live AI calls are not allowed.`,
    );
  }
  env.AI_PROVIDER = 'fake';
  env.TZ = 'Asia/Ho_Chi_Minh';
}

applyTestEnvironment();
