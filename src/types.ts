export interface LoadCompletePayload {
  message: string;
  timestamp: string;
}

export interface Live2DModelInstance {
  scale: { set: (x: number, y: number) => void };
  anchor: { set: (x: number, y: number) => void };
  x: number;
  y: number;
}

export interface PIXIApp {
  view: HTMLCanvasElement;
  renderer: { width: number; height: number };
  stage: { addChild: (child: Live2DModelInstance) => void };
}

export interface PIXILib {
  Application: new (options: {
    view: HTMLCanvasElement;
    autoStart: boolean;
    resizeTo: Window;
    backgroundAlpha: number;
  }) => PIXIApp;
  live2d?: {
    Live2DModel: {
      from: (modelPath: string) => Promise<Live2DModelInstance>;
    };
  };
}

declare global {
  interface Window {
    onAnimeModuleLoaded?: (payload: LoadCompletePayload) => void;
    PIXI?: PIXILib;
  }
}
