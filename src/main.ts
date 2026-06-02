import { loadRuntimeScripts } from './anime_runtime';

const LOAD_TIMEOUT_MS = 30000;

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn(`Operation timed out after ${ms}ms, proceeding anyway`);
      resolve();
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

export async function main(): Promise<void> {
  await withTimeout(loadRuntimeScripts(), LOAD_TIMEOUT_MS);
}

if (import.meta.env.MODE !== 'test') {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to load dependencies:', message);
  });
}
