import { loadScript } from './script-loader.js';

export const ANIME_MODULE_LOADED_EVENT = 'animeModuleLoaded';

export const RUNTIME_SCRIPT_URLS: readonly string[] = [
  'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
  'https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js',
  'https://cdn.jsdelivr.net/gh/RaSan147/pixi-live2d-display@v0.5.0-ls-7/dist/cubism4.min.js',
];

export const CUBISM4_MODEL_PATH = 'runtime/haru_greeter_t05.model3.json';

export const MODEL_SCALE = 0.2;

export const DEFAULT_SCRIPT_TIMEOUT_MS = 30_000;

export interface AvatarModuleLoadDetail {
  message: string;
  timestamp: string;
}

export interface ModelSize {
  set(x: number, y: number): void;
}

export interface Live2DModelHandle {
  scale: ModelSize;
  anchor: ModelSize;
  x: number;
  y: number;
}

export interface Live2DStage {
  addChild(child: Live2DModelHandle): void;
}

export interface Live2DRenderer {
  width: number;
  height: number;
}

export interface PixiApplicationOptions {
  view: HTMLCanvasElement;
  autoStart: boolean;
  resizeTo: Window;
  backgroundAlpha: number;
}

export interface PixiApplication {
  stage: Live2DStage;
  renderer: Live2DRenderer;
}

export interface PixiNamespace {
  Application: new (options: PixiApplicationOptions) => PixiApplication;
  live2d: {
    Live2DModel: {
      from(url: string): Promise<Live2DModelHandle>;
    };
  };
}

export type AvatarGlobal = Window & { PIXI?: PixiNamespace };

export type OnAnimeModuleLoaded = (detail: AvatarModuleLoadDetail) => void;

export type AvatarGlobalWithCallback = Window & {
  onAnimeModuleLoaded?: OnAnimeModuleLoaded;
};

export function createLoadCompleteDetail(): AvatarModuleLoadDetail {
  return {
    message: 'Anime avatar module loaded successfully',
    timestamp: new Date().toISOString(),
  };
}

export function notifyLoadComplete(
  target: Document = document,
  global: AvatarGlobalWithCallback = window,
): void {
  const detail = createLoadCompleteDetail();
  target.dispatchEvent(new CustomEvent<AvatarModuleLoadDetail>(ANIME_MODULE_LOADED_EVENT, { detail }));
  global.onAnimeModuleLoaded?.(detail);
}

function getCanvas(): HTMLCanvasElement {
  const canvas = document.getElementById('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas element with id "canvas" not found');
  }
  return canvas;
}

function getPixi(global: AvatarGlobal): PixiNamespace {
  const pixi = global.PIXI;
  if (!pixi) {
    throw new Error('PIXI is not loaded. Ensure pixi.js is loaded before initializing the avatar.');
  }
  return pixi;
}

function centerModel(app: PixiApplication, model: Live2DModelHandle): void {
  model.x = app.renderer.width / 2;
  model.y = app.renderer.height / 2;
}

export async function initializeAvatar(
  global: AvatarGlobal = window,
  resizeTarget: Window = window,
): Promise<PixiApplication> {
  const canvas = getCanvas();
  const pixi = getPixi(global);

  const app = new pixi.Application({
    view: canvas,
    autoStart: true,
    resizeTo: resizeTarget,
    backgroundAlpha: 0,
  });

  const model = await pixi.live2d.Live2DModel.from(CUBISM4_MODEL_PATH);
  app.stage.addChild(model);
  model.scale.set(MODEL_SCALE, MODEL_SCALE);
  model.anchor.set(0.5, 0.5);
  centerModel(app, model);

  resizeTarget.addEventListener('resize', () => centerModel(app, model));
  return app;
}

export async function loadRuntimeScripts(
  log: (message: string) => void = console.log,
  timeoutMs: number = DEFAULT_SCRIPT_TIMEOUT_MS,
): Promise<HTMLScriptElement[]> {
  const scripts: HTMLScriptElement[] = [];
  for (const [index, url] of RUNTIME_SCRIPT_URLS.entries()) {
    scripts.push(await loadScript(url, timeoutMs));
    log(`Script ${index + 1}/${RUNTIME_SCRIPT_URLS.length} loaded`);
  }
  return scripts;
}

export async function initializeAnimeAvatar(
  global: AvatarGlobal = window,
  log: (message: string) => void = console.log,
): Promise<PixiApplication> {
  await loadRuntimeScripts(log);
  log('All scripts loaded successfully! Initializing avatar...');
  const app = await initializeAvatar(global);
  notifyLoadComplete();
  return app;
}
