/**
 * Opérations sur la sélection d'un onglet (C3, DAZ3) : encoder la sélection en `.rbitem` ; insérer un `.rbitem` collé
 * (centre de la vue, cascade de 24 px par collage successif du même contenu, Z7) ou déposé (centre de ses bornes au
 * point) ; insérer les pages d'un `.roomboard` après la page montrée (Z12). Assets adoptés par le magasin de l'onglet ;
 * un asset cité non lu : refus (HZ2-6, PC8). Lecture et écriture par `container-io.ts`.
 */
import { anchorOf, CASCADE_STEP } from "../platform/image-import";
import type { OpenedFile, Point } from "../platform/files";
import type { ContainerIO, ReadResult } from "./container-io";
import type { TabSession } from "./workspace";

export const SELECTION_NAME = "Sélection";
export const UNREAD_ITEMS_MESSAGE = "images non lues, rien n'est inséré";
export const MISSING_ITEMS_MESSAGE = "images absentes du magasin, rien n'est copié";
export const TAB_GONE_MESSAGE = "onglet fermé pendant la lecture, rien n'est inséré";

export interface FragmentDeps {
  readonly io: ContainerIO;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  alive(tab: TabSession): boolean;
}

export interface FragmentOps {
  encodeSelection(tab: TabSession): Promise<Uint8Array | null>;
  insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null): Promise<boolean>;
  insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>;
  resetCascade(): void;
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export function createFragmentOps(deps: FragmentDeps): FragmentOps {
  let last: Uint8Array | null = null;
  let cascade = 0;

  /** Refus (doc libéré) si un asset cité n'a pas été lu ou si l'onglet est fermé ; sinon assets adoptés par l'onglet. */
  async function accept(tab: TabSession, read: ReadResult, name: string): Promise<boolean> {
    if (read.unread) {
      read.doc.free();
      await deps.say(`${name} : ${UNREAD_ITEMS_MESSAGE}`);
      return false;
    }
    if (!deps.alive(tab)) {
      read.doc.free();
      await deps.say(TAB_GONE_MESSAGE);
      return false;
    }
    const { present } = read.assets.pick(read.doc.citedAssets().map((a) => a.id));
    for (const [id, blob] of present) tab.assets.adopt(id, blob);
    return true;
  }

  return {
    async encodeSelection(tab) {
      const { selection, page } = tab.board.engine.state();
      if (selection.length === 0) return null;
      const frag = tab.board.doc.extract(page, selection);
      try {
        return await deps.io.encode(frag, tab.assets, deps.now(), deps.appVersion, { kind: "fragment", name: SELECTION_NAME });
      } catch {
        await deps.say(MISSING_ITEMS_MESSAGE);
        return null;
      } finally {
        frag.free();
      }
    },
    async insert(tab, rbitem, name, at) {
      const read = await deps.io.read(name, rbitem, "fragment");
      if (read === null) return false;
      if (!(await accept(tab, read, name))) return false;
      const src = read.doc;
      try {
        const page = src.pageIds()[0];
        const box = page === undefined ? null : src.bounds(src.elementIds(page));
        if (box === null) return false;
        const [ax, ay] = anchorOf(tab.board.stage.getBoundingClientRect(), tab.board.engine.camera(), at);
        let n = 0;
        if (at === null) {
          n = last !== null && sameBytes(last, rbitem) ? cascade + 1 : 0;
          last = rbitem;
          cascade = n;
        }
        const dx = ax + CASCADE_STEP * n - (box.x0 + box.x1) / 2;
        const dy = ay + CASCADE_STEP * n - (box.y0 + box.y1) / 2;
        return tab.board.engine.insertFragment(src, dx, dy) !== null;
      } finally {
        src.free();
      }
    },
    async insertPages(tab, file) {
      const read = await deps.io.read(file.name, file.bytes, "document");
      if (read === null) return false;
      if (!(await accept(tab, read, file.name))) return false;
      try {
        return tab.board.engine.insertPages(read.doc) !== null;
      } finally {
        read.doc.free();
      }
    },
    resetCascade() {
      last = null;
      cascade = 0;
    },
  };
}
