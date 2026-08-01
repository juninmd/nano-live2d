import {
  ANIME_MODULE_LOADED_EVENT,
  type AvatarModuleLoadDetail,
} from '../runtime/anime_runtime.js';

export const DEFAULT_LOAD_TIMEOUT_MS = 30_000;

export interface AnimeRuntimeModule {
  initializeAnimeAvatar(): Promise<unknown>;
}

/**
 * Resolves with the load-complete detail when the anime module dispatches the
 * `animeModuleLoaded` event, or with `undefined` if the event does not arrive
 * within `timeoutMs`. Mirrors the original "30 second timeout, proceed anyway"
 * behaviour.
 */
export function waitForAnimeModuleLoaded(
  timeoutMs: number = DEFAULT_LOAD_TIMEOUT_MS,
): Promise<AvatarModuleLoadDetail | undefined> {
  return new Promise((resolve) => {
    let timeoutId: number | undefined;

    const cleanup = (detail?: AvatarModuleLoadDetail): void => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener(ANIME_MODULE_LOADED_EVENT, onLoadComplete);
      resolve(detail);
    };

    const onLoadComplete = (event: Event): void => {
      const customEvent = event as CustomEvent<AvatarModuleLoadDetail>;
      cleanup(customEvent.detail);
    };

    document.addEventListener(ANIME_MODULE_LOADED_EVENT, onLoadComplete);
    timeoutId = window.setTimeout(() => cleanup(undefined), timeoutMs);
  });
}

/**
 * Loads the anime runtime module and waits for it to report that the Live2D
 * avatar has finished initializing.
 */
export async function loadDependencies(
  importRuntime: () => Promise<AnimeRuntimeModule> = () => import('../runtime/anime_runtime.js'),
  timeoutMs: number = DEFAULT_LOAD_TIMEOUT_MS,
): Promise<AvatarModuleLoadDetail | undefined> {
  const waitForLoad = waitForAnimeModuleLoaded(timeoutMs);
  const runtime = await importRuntime();
  await runtime.initializeAnimeAvatar();
  return waitForLoad;
}
