import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadScript,
  getCanvas,
  dispatchLoadComplete,
  setModelPosition,
  initializeAvatar,
  loadRuntimeScripts,
} from '../src/anime_runtime';
import type { PIXIApp, Live2DModelInstance } from '../src/types';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete (window as any).PIXI;
  delete (window as any).onAnimeModuleLoaded;
  vi.restoreAllMocks();
});

const originalCreateElement = document.createElement.bind(document);

describe('loadScript', () => {
  it('creates a script element with the given URL', () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    loadScript('https://example.com/test.js');
    const script = appendSpy.mock.calls[0][0] as HTMLScriptElement;

    expect(script.tagName).toBe('SCRIPT');
    expect(script.src).toBe('https://example.com/test.js');
  });

  it('resolves when script loads', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => el.onload?.(new Event('load')), 0);
      }
      return el;
    });

    await expect(loadScript('https://example.com/test.js')).resolves.toBeUndefined();
  });

  it('rejects when script fails to load', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => el.onerror?.(new Event('error')), 0);
      }
      return el;
    });

    await expect(loadScript('https://example.com/fail.js')).rejects.toThrow('Failed to load script');
  });
});

describe('getCanvas', () => {
  it('returns the canvas element when it exists', () => {
    const canvas = originalCreateElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    const result = getCanvas();
    expect(result).toBe(canvas);
  });

  it('throws when no canvas element with id "canvas" exists', () => {
    expect(() => getCanvas()).toThrow('Canvas element with id "canvas" not found');
  });
});

describe('dispatchLoadComplete', () => {
  it('dispatches a CustomEvent with the correct payload', () => {
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent');

    dispatchLoadComplete();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('animeModuleLoaded');
    expect(event.detail).toHaveProperty('message', 'Anime avatar module loaded successfully');
    expect(event.detail).toHaveProperty('timestamp');
  });

  it('calls window.onAnimeModuleLoaded when set', () => {
    const callback = vi.fn();
    window.onAnimeModuleLoaded = callback;

    dispatchLoadComplete();

    expect(callback).toHaveBeenCalledTimes(1);
    const payload = callback.mock.calls[0][0];
    expect(payload).toHaveProperty('message', 'Anime avatar module loaded successfully');
    expect(payload).toHaveProperty('timestamp');
  });

  it('does not throw when window.onAnimeModuleLoaded is not set', () => {
    delete (window as any).onAnimeModuleLoaded;
    expect(() => dispatchLoadComplete()).not.toThrow();
  });
});

describe('setModelPosition', () => {
  it('sets model position to center of renderer using provided model and app', () => {
    const mockApp = { renderer: { width: 1920, height: 1080 } } as PIXIApp;
    const mockModel = { x: 0, y: 0 } as Live2DModelInstance;

    setModelPosition(mockModel, mockApp);

    expect(mockModel.x).toBe(960);
    expect(mockModel.y).toBe(540);
  });

  it('does nothing when model or app is null', () => {
    expect(() => setModelPosition(null, null)).not.toThrow();
  });

  it('does nothing when model is null', () => {
    const mockApp = { renderer: { width: 1920, height: 1080 } } as PIXIApp;
    expect(() => setModelPosition(null, mockApp)).not.toThrow();
  });
});

describe('initializeAvatar', () => {
  it('throws when PIXI is not loaded', async () => {
    await expect(initializeAvatar()).rejects.toThrow('PIXI is not loaded');
  });

  it('throws when PIXI.live2d is not available', async () => {
    (window as any).PIXI = { Application: vi.fn() };
    await expect(initializeAvatar()).rejects.toThrow('PIXI.live2d is not available');
  });

  it('throws when canvas is missing', async () => {
    (window as any).PIXI = {
      Application: vi.fn(),
      live2d: { Live2DModel: { from: vi.fn() } },
    };
    await expect(initializeAvatar()).rejects.toThrow('Canvas element with id "canvas" not found');
  });

  it('creates PIXI app and loads model when all dependencies are present', async () => {
    const canvas = originalCreateElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    const mockModel = {
      scale: { set: vi.fn() },
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
    } as unknown as Live2DModelInstance;

    const mockApp = {
      view: canvas,
      renderer: { width: 1920, height: 1080 },
      stage: { addChild: vi.fn() },
    } as unknown as PIXIApp;

    const MockApplication = vi.fn().mockImplementation(() => mockApp);
    const mockFrom = vi.fn().mockResolvedValue(mockModel);

    (window as any).PIXI = {
      Application: MockApplication,
      live2d: { Live2DModel: { from: mockFrom } },
    };

    const resizeSpy = vi.spyOn(window, 'addEventListener');

    await initializeAvatar();

    expect(MockApplication).toHaveBeenCalledWith({
      view: canvas,
      autoStart: true,
      resizeTo: window,
      backgroundAlpha: 0,
    });

    expect(mockFrom).toHaveBeenCalledWith('runtime/haru_greeter_t05.model3.json');
    expect(mockApp.stage.addChild).toHaveBeenCalledWith(mockModel);
    expect(mockModel.scale.set).toHaveBeenCalledWith(0.2, 0.2);
    expect(mockModel.anchor.set).toHaveBeenCalledWith(0.5, 0.5);
    expect(resizeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('loadRuntimeScripts', () => {
  it('loads CDN scripts sequentially and dispatches completion event', async () => {
    const canvas = originalCreateElement('canvas');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    const mockModel = {
      scale: { set: vi.fn() },
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
    } as unknown as Live2DModelInstance;

    const mockApp = {
      view: canvas,
      renderer: { width: 1920, height: 1080 },
      stage: { addChild: vi.fn() },
    } as unknown as PIXIApp;

    (window as any).PIXI = {
      Application: vi.fn().mockImplementation(() => mockApp),
      live2d: { Live2DModel: { from: vi.fn().mockResolvedValue(mockModel) } },
    };

    const loadedUrls: string[] = [];
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => {
          loadedUrls.push(el.src);
          el.onload?.(new Event('load'));
        }, 0);
      }
      return el;
    });

    const dispatchSpy = vi.spyOn(document, 'dispatchEvent');

    await loadRuntimeScripts();

    expect(loadedUrls.length).toBe(3);
    expect(loadedUrls[0]).toContain('live2dcubismcore.min.js');
    expect(loadedUrls[1]).toContain('pixi.js');
    expect(loadedUrls[2]).toContain('cubism4.min.js');
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('animeModuleLoaded');
  });

  it('rejects if a CDN script fails to load', async () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'script') {
        setTimeout(() => el.onerror?.(new Event('error')), 0);
      }
      return el;
    });

    await expect(loadRuntimeScripts()).rejects.toThrow('Failed to load script');
  });
});
