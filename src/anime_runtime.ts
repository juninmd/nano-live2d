import type { LoadCompletePayload, Live2DModelInstance, PIXIApp } from './types';

const CUBISM_CORE_URL = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
const PIXI_JS_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js';
const CUBISM4_URL = 'https://cdn.jsdelivr.net/gh/RaSan147/pixi-live2d-display@v0.5.0-ls-7/dist/cubism4.min.js';

const MODEL_PATH = 'runtime/haru_greeter_t05.model3.json';
const SCRIPT_URLS: readonly string[] = [CUBISM_CORE_URL, PIXI_JS_URL, CUBISM4_URL];

let model: Live2DModelInstance | null = null;
let app: PIXIApp | null = null;

export function loadScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

export function getCanvas(): HTMLCanvasElement {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas element with id "canvas" not found');
  }
  return canvas;
}

export function dispatchLoadComplete(): void {
  const payload: LoadCompletePayload = {
    message: 'Anime avatar module loaded successfully',
    timestamp: new Date().toISOString(),
  };

  const event = new CustomEvent<LoadCompletePayload>('animeModuleLoaded', { detail: payload });
  document.dispatchEvent(event);

  window.onAnimeModuleLoaded?.(payload);
}

export function setModelPosition(
  targetModel?: Live2DModelInstance | null,
  targetApp?: PIXIApp | null,
): void {
  const m = targetModel ?? model;
  const a = targetApp ?? app;
  if (!m || !a) return;
  m.x = a.renderer.width / 2;
  m.y = a.renderer.height / 2;
}

export async function initializeAvatar(): Promise<void> {
  const PIXI = window.PIXI;
  if (!PIXI) {
    throw new Error('PIXI is not loaded');
  }
  if (!PIXI.live2d) {
    throw new Error('PIXI.live2d is not available');
  }

  const canvas = getCanvas();
  app = new PIXI.Application({
    view: canvas,
    autoStart: true,
    resizeTo: window,
    backgroundAlpha: 0,
  });

  model = await PIXI.live2d.Live2DModel.from(MODEL_PATH);
  app.stage.addChild(model);
  model.scale.set(0.2, 0.2);
  model.anchor.set(0.5, 0.5);
  setModelPosition();

  window.addEventListener('resize', () => {
    setModelPosition();
  });
}

export async function loadRuntimeScripts(): Promise<void> {
  for (const url of SCRIPT_URLS) {
    await loadScript(url);
  }

  await initializeAvatar();
  dispatchLoadComplete();
}
