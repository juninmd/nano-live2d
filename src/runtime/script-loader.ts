export const DEFAULT_SCRIPT_TIMEOUT_MS = 30_000;

export interface LoadedScript {
  element: HTMLScriptElement;
  url: string;
}

/**
 * Creates a script element for the given URL, appends it to the document head
 * and resolves once the script finishes loading. Rejects if the script errors
 * or fails to load within `timeoutMs`.
 */
export function loadScript(
  url: string,
  timeoutMs: number = DEFAULT_SCRIPT_TIMEOUT_MS,
): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    let timeoutId = 0;

    const cleanup = (): void => {
      window.clearTimeout(timeoutId);
    };

    timeoutId = window.setTimeout(() => {
      script.remove();
      reject(new Error(`Timed out after ${timeoutMs}ms loading script: ${url}`));
    }, timeoutMs);

    script.onload = () => {
      cleanup();
      resolve(script);
    };

    script.onerror = () => {
      cleanup();
      script.remove();
      reject(new Error(`Failed to load script: ${url}`));
    };

    document.head.appendChild(script);
  });
}
