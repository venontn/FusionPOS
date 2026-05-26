import type { FusionPosApi } from "../../../electron/preload";

declare global {
  interface Window {
    fusionpos: FusionPosApi;
  }
}

export {};
