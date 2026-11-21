/**
 * Caméra d'orbite et image du rendu 3D partagé (C15, X4, X21, X25, DAX3) : le moteur ne voit jamais three ; il demande
 * l'image d'un élément `model3d` au port et retombe sur l'instantané quand il n'y en a pas.
 */
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, MODEL3D_PITCH_LIMIT } from "../../core/api";

export interface ModelCamera {
  readonly yaw: number;
  readonly pitch: number;
}
/** Mêmes valeurs que le cœur (X4, `model3d.rs`) ; repris d'`api.ts` (PC1). */
export const DEFAULT_CAMERA: ModelCamera = Object.freeze({ yaw: DEFAULT_MODEL3D_YAW, pitch: DEFAULT_MODEL3D_PITCH });
export const PITCH_LIMIT = MODEL3D_PITCH_LIMIT;
/** X21 : sensibilité, en radians par px CSS. */
export const ORBIT_RAD_PER_PX = 0.01;
const TAU = 2 * Math.PI;

/** `pitch` borné à ±85°, `yaw` ramené dans ]−π, π] seulement s'il en sort (une vue valide reste à l'octet). */
export function clampCamera(v: ModelCamera): ModelCamera {
  if (!Number.isFinite(v.yaw) || !Number.isFinite(v.pitch)) return DEFAULT_CAMERA;
  let yaw = v.yaw;
  if (yaw <= -Math.PI || yaw > Math.PI) {
    yaw = ((((yaw + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    if (yaw <= -Math.PI) yaw = Math.PI;
  }
  return { yaw, pitch: Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, v.pitch)) };
}

/** Degrés entiers (oracle `data-model3d`, X36). */
export const degrees = (r: number): number => Math.round((r * 180) / Math.PI);

export interface ModelFrames {
  /** Image du rendu partagé pour l'élément (séance ouverte, rendu prêt) ; null : instantané (X25). */
  frame(elementId: string): CanvasImageSource | null;
}
