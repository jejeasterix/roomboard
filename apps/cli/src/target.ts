/**
 * Cible sans écran des objets importés (cadrage cli, DA5 lot 1, H7) : la même interface `ImageTarget` que l'onglet de la
 * page (`workspace.ts`, `imageTarget`), sur une scène fixe 1920 × 1080 à l'origine et une caméra identité : un point
 * `--at x,y` est un point monde de la page. Mesure de repli (H1), style du stylo par défaut (même règle que
 * `engine.ts`, `textStyle`). `insertFragment` absent au lot 1 (insertion `.rbitem` au lot 2).
 */
import type { Command } from "../../web/src/core/api";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../web/src/core/api";
import { IDENTITY } from "../../web/src/engine/camera";
import { DEFAULT_PEN_STYLE } from "../../web/src/engine/engine";
import { DEFAULT_TEXT_SIZE, measureOrFallback } from "../../web/src/engine/text-layout";
import { messageOf } from "../../web/src/platform/controller";
import type { ImageTarget, StageRect } from "../../web/src/platform/image-import";
import type { CliTab } from "./session";

export const SCENE: StageRect = Object.freeze({ left: 0, top: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

export function headlessTarget(tab: CliTab, page: string, notices: string[]): ImageTarget {
  return {
    assets: tab.assets,
    page: () => page,
    camera: () => IDENTITY,
    stageRect: () => SCENE,
    measure: () => measureOrFallback(null),
    textStyle: () => ({ color: DEFAULT_PEN_STYLE.color, size: DEFAULT_TEXT_SIZE }),
    run: (cmd: Command) => {
      try {
        return tab.doc.apply(cmd);
      } catch (e) {
        notices.push(messageOf(e));
        return null;
      }
    },
  };
}
