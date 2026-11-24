/**
 * Cible sans écran des objets importés (cadrage cli, DA5 lot 1, H7) : la même interface `ImageTarget` que l'onglet de la
 * page (`workspace.ts`, `imageTarget`), sur une scène fixe 1920 × 1080 à l'origine et une caméra identité : un point
 * `--at x,y` est un point monde de la page. Mesure de repli (H1), style du stylo par défaut (même règle que
 * `engine.ts`, `textStyle`). `insertFragment` : `fragments.insertResource` (lot 2, D18).
 */
import type { FragmentOps } from "../../web/src/app/fragments";
import { IDENTITY } from "../../web/src/engine/camera";
import { DEFAULT_PEN_STYLE } from "../../web/src/engine/engine";
import { DEFAULT_TEXT_SIZE, measureOrFallback } from "../../web/src/engine/text-layout";
import type { ImageTarget } from "../../web/src/platform/image-import";
import { cliView, SCENE, type CliPage } from "./fragment-view";
import type { CliTab } from "./session";

export { SCENE } from "./fragment-view";

export function headlessTarget(tab: CliTab, page: string, notices: string[], fragments: FragmentOps<CliPage>): ImageTarget {
  const view = cliView({ tab, page }, notices);
  return {
    assets: tab.assets,
    page: () => page,
    camera: () => IDENTITY,
    stageRect: () => SCENE,
    measure: () => measureOrFallback(null),
    textStyle: () => ({ color: DEFAULT_PEN_STYLE.color, size: DEFAULT_TEXT_SIZE }),
    run: (cmd) => view.run(cmd),
    insertFragment: async (bytes, at, index, name) => (await fragments.insertResource({ tab, page }, bytes, name, at, index)) === "inserted",
  };
}
