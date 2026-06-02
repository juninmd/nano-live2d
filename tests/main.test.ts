import { describe, it, expect, vi, beforeEach } from 'vitest';

const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete (window as any).PIXI;
  delete (window as any).onAnimeModuleLoaded;
});

describe('withTimeout', () => {
  it('resolves with the promise result when it completes before timeout', async () => {
    const mod = await import('../src/main');
    const fastPromise = Promise.resolve('done');
    const result = await mod.withTimeout(fastPromise, 1000);
    expect(result).toBe('done');
  });

  it('resolves (does not throw) on timeout', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('../src/main');

    const neverResolves = new Promise<string>(() => {});
    const result = await mod.withTimeout(neverResolves, 50);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('timed out after'),
    );
  });
});

describe('main function', () => {
  it('rejects when a script fails to load', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => el.onerror?.(new Event('error')), 0);
      }
      return el;
    });

    const mod = await import('../src/main');
    await expect(mod.main()).rejects.toThrow('Failed to load script');
  });

  it('succeeds when all dependencies load', async () => {
    const canvas = originalCreateElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    const mockModel = {
      scale: { set: vi.fn() },
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
    } as unknown as any;

    const mockApp = {
      view: canvas,
      renderer: { width: 1920, height: 1080 },
      stage: { addChild: vi.fn() },
    } as unknown as any;

    (window as any).PIXI = {
      Application: vi.fn().mockImplementation(() => mockApp),
      live2d: { Live2DModel: { from: vi.fn().mockResolvedValue(mockModel) } },
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => el.onload?.(new Event('load')), 0);
      }
      return el;
    });

    const mod = await import('../src/main');
    await expect(mod.main()).resolves.toBeUndefined();
  });
});
