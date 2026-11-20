/**
 * Opérations sur la sélection d'un onglet (C3, DAZ3) : encoder la sélection en `.rbitem` ; insérer un `.rbitem` collé
 * (centre de la vue, cascade de 24 px par collage successif du même contenu, Z7) ou déposé (centre de ses bornes au
 * point) ; insérer les pages d'un `.roomboard` après la page montrée (Z12). Assets adoptés par le magasin de l'onglet ;
 * un asset cité non lu : refus (HZ2-6, PC8). Lecture et écriture par `container-io.ts`. Pages d'un fichier : ses médias
 * liés ne sont pas insérés, avec l'avis de la copie d'un média lié (C14, R2) ; le reste l'est.
 */
import { anchorOf, CASCADE_STEP } from "../platform/image-import";
import type { OpenedFile, Point } from "../platform/files";
import type { CoreDocument } from "../core/api";
import { LINKED_COPY_MESSAGE, MissingAssetError, type ContainerIO, type ReadResult } from "./container-io";
import type { TabSession } from "./workspace";

export const SELECTION_NAME = "Sélection";
export const UNREAD_ITEMS_MESSAGE = "images non lues, rien n'est inséré";
export const MISSING_ITEMS_MESSAGE = "images absentes du magasin, rien n'est copié";
export const MISSING_EXPORT_MESSAGE = "images absentes du magasin, rien n'est exporté";
export const EMPTY_ITEMS_MESSAGE = "objet sans élément, rien n'est inséré";
export const TAB_GONE_MESSAGE = "onglet fermé pendant la lecture, rien n'est inséré";

export interface FragmentDeps {
  readonly io: ContainerIO;
  now(): string;
  readonly appVersion: string;
  say(message: string): Promise<void>;
  alive(tab: TabSession): boolean;
}

/** Issue d'une insertion : refusée (avis dit), objet sans élément (avis dit) ou insérée. */
export type InsertOutcome = "inserted" | "refused" | "empty";

export interface FragmentOps {
  /** Octets du `.rbitem` de la sélection, ou null (rien de sélectionné, image absente : avis dit). Autre erreur : rejet. */
  encodeSelection(tab: TabSession, action?: "copy" | "export"): Promise<Uint8Array | null>;
  /** `index` : rang dans un import (cascade, R4) ; absent, un collage suit la cascade du presse-papiers (Z7) si `at` est null. */
  insert(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<boolean>;
  insertOutcome(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome>;
  insertPages(tab: TabSession, file: OpenedFile): Promise<boolean>;
  resetCascade(): void;
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export function createFragmentOps(deps: FragmentDeps): FragmentOps {
  let last: Uint8Array | null = null;
  let cascade = 0;

  /** Refus (doc libéré) si un asset cité n'a pas été lu ou si l'onglet est fermé. */
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
    return true;
  }

  /** Assets de l'objet adoptés par l'onglet : après tous les contrôles, juste avant l'insertion. */
  function adopt(tab: TabSession, read: ReadResult): void {
    const { present } = read.assets.pick(read.doc.citedAssets().map((a) => a.id));
    for (const [id, blob] of present) tab.assets.adopt(id, blob);
  }

  /** R2 (C14) : médias liés de l'autre document retirés de la copie lue (jamais du fichier), avec un avis. */
  async function dropLinked(doc: CoreDocument, name: string): Promise<void> {
    const linked = new Set(doc.linkedAssets().map((l) => l.id));
    if (linked.size === 0) return;
    const ids = doc.pageIds().flatMap((p) => doc.elementIds(p)).filter((id) => {
      const e = doc.element(id);
      return e?.kind === "media" && linked.has(e.media.asset);
    });
    if (ids.length > 0) doc.apply({ type: "Delete", ids });
    await deps.say(`${name} : ${LINKED_COPY_MESSAGE}`);
  }

  async function insertOutcome(tab: TabSession, rbitem: Uint8Array, name: string, at: Point | null, index?: number): Promise<InsertOutcome> {
    const read = await deps.io.read(name, rbitem, "fragment");
    if (read === null) return "refused";
    if (!(await accept(tab, read, name))) return "refused";
    const src = read.doc;
    try {
      const page = src.pageIds()[0];
      const box = page === undefined ? null : src.bounds(src.elementIds(page));
      if (box === null) {
        await deps.say(`${name} : ${EMPTY_ITEMS_MESSAGE}`);
        return "empty";
      }
      const [ax, ay] = anchorOf(tab.board.stage.getBoundingClientRect(), tab.board.engine.camera(), at);
      let n = 0;
      if (index !== undefined) n = index;
      else if (at === null) {
        n = last !== null && sameBytes(last, rbitem) ? cascade + 1 : 0;
        last = rbitem;
        cascade = n;
      }
      const dx = ax + CASCADE_STEP * n - (box.x0 + box.x1) / 2;
      const dy = ay + CASCADE_STEP * n - (box.y0 + box.y1) / 2;
      adopt(tab, read);
      return tab.board.engine.insertFragment(src, dx, dy) !== null ? "inserted" : "refused";
    } finally {
      src.free();
    }
  }

  return {
    async encodeSelection(tab, action = "copy") {
      const { selection, page } = tab.board.engine.state();
      if (selection.length === 0) return null;
      const frag = tab.board.doc.extract(page, selection);
      try {
        return await deps.io.encode(frag, tab.assets, deps.now(), deps.appVersion, { kind: "fragment", name: SELECTION_NAME });
      } catch (e) {
        if (!(e instanceof MissingAssetError)) throw e; // les autres (module absent…) portent leur propre avis
        await deps.say(action === "export" ? MISSING_EXPORT_MESSAGE : MISSING_ITEMS_MESSAGE);
        return null;
      } finally {
        frag.free();
      }
    },
    insertOutcome,
    async insert(tab, rbitem, name, at, index) {
      return (await insertOutcome(tab, rbitem, name, at, index)) === "inserted";
    },
    async insertPages(tab, file) {
      const read = await deps.io.read(file.name, file.bytes, "document");
      if (read === null) return false;
      if (!(await accept(tab, read, file.name))) return false;
      try {
        await dropLinked(read.doc, file.name);
        adopt(tab, read);
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
