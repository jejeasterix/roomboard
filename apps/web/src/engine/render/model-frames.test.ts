import { describe, expect, it } from "vitest";
import { clampCamera, DEFAULT_CAMERA, degrees, PITCH_LIMIT } from "./model-frames";

describe("caméra d'orbite (C15, X4)", () => {
  it("clampCamera : pitch à ±85°, yaw ramené dans ]−π, π], vue valide à l'octet, non fini → défaut", () => {
    expect(clampCamera({ yaw: 0.3, pitch: 2 })).toEqual({ yaw: 0.3, pitch: PITCH_LIMIT });
    expect(clampCamera({ yaw: Math.PI / 6, pitch: Math.PI / 9 })).toEqual(DEFAULT_CAMERA);
    expect(clampCamera({ yaw: -Math.PI, pitch: 0 }).yaw).toBeCloseTo(Math.PI, 12);
    expect(clampCamera({ yaw: 3 * Math.PI + 0.5, pitch: 0 }).yaw).toBeCloseTo(-Math.PI + 0.5, 12);
    expect(clampCamera({ yaw: Number.NaN, pitch: 0 })).toEqual(DEFAULT_CAMERA);
  });
  it("degrees : entiers ; défauts 30° et 20°", () => {
    expect([degrees(DEFAULT_CAMERA.yaw), degrees(DEFAULT_CAMERA.pitch), degrees(Math.PI / 6 + 1)]).toEqual([30, 20, 87]);
  });
});
