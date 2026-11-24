/**
 * Vue sans écran d'une page de la CLI (cadrage cli-lot2, D17, D18) : le port `FragmentTab` de `fragments.ts` sur un
 * onglet de la CLI et une page ; scène fixe 1920 × 1080 et caméra identité (H7) ; un refus du cœur devient un avis.
 */
import { createFragmentOps, type FragmentOps, type FragmentTab } from "../../web/src/app/fragments";
import type { ContainerIO } from "../../web/src/app/container-io";
import type { Change, CoreFactory } from "../../web/src/core/api";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../../web/src/core/api";
import { IDENTITY } from "../../web/src/engine/camera";
import { APP_VERSION, messageOf } from "../../web/src/platform/controller";
import { anchorOf, type StageRect } from "../../web/src/platform/image-import";
import type { CliTab } from "./session";

export const SCENE: StageRect = Object.freeze({ left: 0, top: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

export interface CliPage {
  readonly tab: CliTab;
  readonly page: string;
}

export function cliView(p: CliPage, notices: string[]): FragmentTab {
  const { tab, page } = p;
  const guard = (f: () => Change): Change | null => {
    try {
      return f();
    } catch (e) {
      notices.push(messageOf(e));
      return null;
    }
  };
  return {
    assets: tab.assets,
    doc: tab.doc,
    state: () => ({ page, selection: [] }),
    anchor: (at) => anchorOf(SCENE, IDENTITY, at),
    run: (cmd) => guard(() => tab.doc.apply(cmd)),
    insertFragment: (src, dx, dy) => guard(() => tab.doc.insertFragment(src, page, dx, dy)),
    insertPages: (src) => guard(() => tab.doc.insertPages(src, page)),
  };
}

export function cliFragments(deps: { readonly io: ContainerIO; readonly core: Pick<CoreFactory, "blank">; now(): string; readonly notices: string[] }): FragmentOps<CliPage> {
  return createFragmentOps<CliPage>({
    io: deps.io,
    core: deps.core,
    now: () => deps.now(),
    appVersion: APP_VERSION,
    say: async (m) => {
      deps.notices.push(m);
    },
    alive: () => true,
    view: (p) => cliView(p, deps.notices),
  });
}
