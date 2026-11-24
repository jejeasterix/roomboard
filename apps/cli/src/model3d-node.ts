/**
 * 3D de la CLI (cadrage cli-lot4, D67, D76, DA20) : le rendu partagé de la page (`createThreeModelView`) sans WebGL —
 * three valide le modèle, l'instantané est null, le produit dit `NO_WEBGL_MESSAGE` une fois (H44) — et le lecteur de ZIP
 * de la page en processus (`inlineWorker`, patron de `board-node.ts`). three attend trois globaux du navigateur (`self`,
 * `ProgressEvent`, `document.createElementNS` pour les images) : posés seulement s'ils manquent, le temps d'un
 * `view.load()`, puis retirés (pdf.js, évalué dans le même fichier construit, lit `self` et `document`). Le `fetch` de
 * Node reste celui de Node (les URL `blob:nodedata:` se lisent). Les images ne sont pas décodées : `load` si l'URL
 * `blob:` a un contenu, `error` sinon (texture absente → `missing`).
 * Aucun `await` de premier niveau (piège du lot 3, `bin.ts`).
 */
import type { Model3dDeps } from "../../web/src/platform/model3d-handlers";
import { createModelViewLoader, type ModelView } from "../../web/src/platform/model-view";
import { inlineWorker } from "../../web/src/platform/one-shot-worker";
import { createZipReader } from "../../web/src/platform/zip-read";
import { zipJobReply, type ZipJob } from "../../web/src/platform/zip-worker";

type Slot = "self" | "ProgressEvent" | "document";
const slots = globalThis as unknown as Record<Slot, unknown>;

class NodeProgressEvent extends Event {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly total: number;
  constructor(type: string, init: { readonly lengthComputable?: boolean; readonly loaded?: number; readonly total?: number } = {}) {
    super(type);
    this.lengthComputable = init.lengthComputable ?? false;
    this.loaded = init.loaded ?? 0;
    this.total = init.total ?? 0;
  }
}

type ImageListener = (this: unknown, e: Event) => void;

/** Image sans canvas (D76) : `src` posé → `fetch` de l'URL ; contenu non vide → `load` (1 × 1), vide ou illisible → `error`. */
function nodeImage(): object {
  const on = new Map<string, ImageListener[]>();
  let url = "";
  const img = {
    width: 1,
    height: 1,
    naturalWidth: 1,
    naturalHeight: 1,
    crossOrigin: null as string | null,
    addEventListener(type: string, cb: ImageListener): void {
      on.set(type, [...(on.get(type) ?? []), cb]);
    },
    removeEventListener(type: string, cb: ImageListener): void {
      on.set(type, (on.get(type) ?? []).filter((x) => x !== cb));
    },
    get src(): string {
      return url;
    },
    set src(u: string) {
      url = u;
      void fetch(u)
        .then((r) => r.arrayBuffer())
        .then(
          (b) => b.byteLength > 0,
          () => false,
        )
        .then((ok) => {
          const type = ok ? "load" : "error";
          for (const cb of on.get(type) ?? []) cb.call(img, new Event(type));
        });
    },
  };
  return img;
}

const BROWSER: Readonly<Record<Slot, unknown>> = Object.freeze({
  self: globalThis,
  ProgressEvent: NodeProgressEvent,
  document: Object.freeze({ createElementNS: (_ns: string, _name: string): object => nodeImage() }),
});

let depth = 0;
let posed: Slot[] = [];

/** D76 : `run` avec `self`, `ProgressEvent`, `document` posés s'ils manquent ; retirés à la fin du dernier `run` en cours. */
export async function withThreeGlobals<T>(run: () => Promise<T>): Promise<T> {
  if (depth === 0) {
    posed = (Object.keys(BROWSER) as Slot[]).filter((k) => !(k in globalThis));
    for (const k of posed) slots[k] = BROWSER[k];
  }
  depth++;
  try {
    return await run();
  } finally {
    depth--;
    if (depth === 0) {
      for (const k of posed) delete slots[k];
      posed = [];
    }
  }
}

/** Toile sans DOM : la vue n'y pose que ses écouteurs de perte de contexte ; aucun rendu. */
const nodeCanvas = (): HTMLCanvasElement => ({ addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as HTMLCanvasElement;

/** Dépendances 3D de `createImporter` (D67) : vue chargée au premier besoin, ZIP lu en processus. */
export function nodeModel3d(): Model3dDeps {
  const loader = createModelViewLoader(async (): Promise<ModelView> => {
    const { createThreeModelView } = await import("../../web/src/platform/model-view-three");
    const view = createThreeModelView({
      createCanvas: nodeCanvas,
      createRenderer: () => {
        throw new Error("aucun WebGL dans la CLI");
      },
      urls: { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) },
    });
    return { ...view, load: (src) => withThreeGlobals(() => view.load(src)) };
  });
  return {
    view: () => loader.load(),
    readZip: createZipReader(inlineWorker((m) => zipJobReply(m as ZipJob))),
  };
}
