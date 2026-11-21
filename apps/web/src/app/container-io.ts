/**
 * Conteneurs (C3, DAZ3) : écriture et lecture d'un `.roomboard` ou d'un `.rbitem`, décidées à chaque appel. Sans asset
 * cité : ZIP du cœur (`save` / `saveFragment`), second module jamais chargé (garde `compat_socle`) ; avec assets :
 * parties du cœur puis `ContainerCodec.write`. Lecture par le conteneur, repli par le cœur seul (R7). Repris de
 * `workspace.ts` (`encodeTab`, `readDocument`) sans changement de comportement pour un document.
 * Un fragment n'est écrit que si toutes ses images sont dans le magasin (pas d'élément sans son asset dans la cible).
 * C14 (M30 à M32) : un média lié n'a jamais d'octets dans le conteneur ; il n'est pas « absent » (Enregistrer permis),
 * un fragment qui le cite est refusé, et l'ouverture d'un document résout ses liens par `relink`.
 */
import type { ContainerKind, CoreDocument, CoreFactory, LinkedAsset } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { messageOf } from "../platform/controller";
import { baseName } from "../platform/host-tauri";

/** Repli R7 : le module du conteneur ne s'est pas chargé, le document s'ouvre par le cœur seul. */
export const CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé";

/** Fragment refusé parce qu'une image citée n'est pas dans le magasin (seule erreur que la copie dit « images absentes »). */
export class MissingAssetError extends Error {
  constructor() {
    super("fragment impossible : une image citée est absente du magasin");
    this.name = "MissingAssetError";
  }
}

/** C14 (M32) : un fragment (copie, export, objet) qui cite un média lié est refusé. */
export const LINKED_COPY_MESSAGE = "vidéo liée : copie non prise en charge, déposez le fichier à nouveau";
export class LinkedMediaError extends Error {
  constructor() {
    super(LINKED_COPY_MESSAGE);
    this.name = "LinkedMediaError";
  }
}
/** C14 (S5) : hors coque, aucun lien n'est lu ; un avis par document. */
export const LINKED_WEB_MESSAGE = "vidéo non incluse (liée, lisible dans l'application de bureau)";
export const linkedMissingMessage = (path: string): string => `${baseName(path)} : vidéo liée introuvable (${path})`;

export type EncodeAs =
  | { readonly kind: "document" }
  | { readonly kind: "fragment"; readonly name: string }
  | { readonly kind: "grid"; readonly name: string };
export type ReadKind = ContainerKind;
export interface ReadResult {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  readonly unread: boolean;
  /** C4 : type lu (un parmi ceux demandés). */
  readonly kind: ReadKind;
}
export interface ContainerIODeps {
  readonly core: CoreFactory;
  readonly codec: ContainerCodec;
  say(message: string): Promise<void>;
  makeAssets(): AssetStore;
  /** C14 (M31) : chemin absolu accordé du lien `link` d'un document situé en `docPath`, ou null (introuvable, refusé).
   *  Absent (web) : aucun lien résolu, un avis par document. */
  relink?(docPath: string | null, link: LinkedAsset, size: number): Promise<string | null>;
}
export interface ContainerIO {
  encode(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string, as: EncodeAs): Promise<Uint8Array>;
  /** `docPath` : chemin du document lu (liens relatifs des médias liés, C14), null s'il n'est pas connu. C4 : une liste
   *  de types lit le type une fois (manifeste extrait, ou fichier entier dans le repli), puis un seul lecteur. */
  read(name: string, bytes: Uint8Array, kind: ReadKind | readonly ReadKind[], docPath?: string | null): Promise<ReadResult | null>;
}

export const typed = (blob: Blob, mime: string | undefined): Blob =>
  mime !== undefined && mime !== "" && mime !== blob.type ? new Blob([blob], { type: mime }) : blob;

const linkedIds = (doc: CoreDocument): Set<string> => new Set(doc.linkedAssets().map((l) => l.id));

/** Assets cités à octets attendus (les médias liés n'en ont jamais, C14) et absents du magasin. */
export const missingOf = (doc: CoreDocument, assets: AssetStore): string[] => {
  const linked = linkedIds(doc);
  return assets.pick(doc.citedAssets().map((a) => a.id).filter((id) => !linked.has(id))).missing;
};

export function createContainerIO(deps: ContainerIODeps): ContainerIO {
  const { core, codec, say } = deps;
  /** Les quatre lectures et écritures de chaque type, en un seul endroit (`name` : ignoré pour un document). */
  const byKind: Record<ReadKind, {
    whole(b: Uint8Array): CoreDocument;
    parts(m: Uint8Array, y: Uint8Array): CoreDocument;
    save(d: CoreDocument, now: string, v: string, name: string): Uint8Array;
    saveParts(d: CoreDocument, now: string, v: string, name: string): readonly [Uint8Array, Uint8Array];
  }> = {
    document: { whole: (b) => core.load(b), parts: (m, y) => core.loadParts(m, y), save: (d, now, v) => d.save(now, v), saveParts: (d, now, v) => d.saveParts(now, v) },
    fragment: { whole: (b) => core.loadFragment(b), parts: (m, y) => core.loadFragmentParts(m, y), save: (d, now, v, n) => d.saveFragment(now, v, n), saveParts: (d, now, v, n) => d.saveFragmentParts(now, v, n) },
    grid: { whole: (b) => core.loadGrid(b), parts: (m, y) => core.loadGridParts(m, y), save: (d, now, v, n) => d.saveGrid(now, v, n), saveParts: (d, now, v, n) => d.saveGridParts(now, v, n) },
  };
  const loadWhole = (k: ReadKind, b: Uint8Array): CoreDocument => byKind[k].whole(b);
  const loadParts = (k: ReadKind, m: Uint8Array, y: Uint8Array): CoreDocument => byKind[k].parts(m, y);
  /** Un seul type demandé : lui, sans détection (chemin d'avant C4) ; sinon le type lu s'il est demandé, sinon le
   *  premier demandé (son lecteur dit le bon message du mauvais type). */
  const choose = (wanted: readonly ReadKind[], detect: () => ReadKind): ReadKind => {
    if (wanted.length === 1) return wanted[0]!;
    const found = detect();
    return wanted.includes(found) ? found : wanted[0]!;
  };
  /** Liens d'un document lu (M31) : hors coque, un avis ; sinon chaque lien accordé au magasin, ou un avis par absent. */
  async function relinkAll(name: string, doc: CoreDocument, assets: AssetStore, docPath: string | null): Promise<void> {
    const links = doc.linkedAssets();
    if (links.length === 0) return;
    const relink = deps.relink;
    if (relink === undefined) {
      await say(`${name} : ${LINKED_WEB_MESSAGE}`);
      return;
    }
    for (const l of links) {
      let found: string | null;
      try {
        found = await relink(docPath, l, doc.asset(l.id)?.size ?? 0);
      } catch {
        found = null;
      }
      if (found === null) await say(linkedMissingMessage(l.path));
      else assets.link(l.id, found);
    }
  }
  return {
    async encode(doc, assets, now, appVersion, as) {
      const cited = doc.citedAssets();
      const name = as.kind === "document" ? "" : as.name;
      if (cited.length === 0) return byKind[as.kind].save(doc, now, appVersion, name);
      const linked = linkedIds(doc);
      if (as.kind !== "document" && linked.size > 0) throw new LinkedMediaError(); // avant l'image absente (M32)
      // R9 : les octets d'un média lié ne sont jamais écrits, même si le magasin les tient.
      const { present, missing } = assets.pick(cited.map((a) => a.id).filter((id) => !linked.has(id)));
      if (as.kind !== "document" && missing.length > 0) {
        throw new MissingAssetError();
      }
      const [manifest, ybin] = byKind[as.kind].saveParts(doc, now, appVersion, name);
      const mimeOf = new Map(cited.map((a) => [a.id, a.mime]));
      return codec.write(manifest, ybin, present.map(([id, blob]) => ({ id, mime: mimeOf.get(id) ?? blob.type, blob })));
    },
    async read(name, bytes, kind, docPath = null) {
      const wanted: readonly ReadKind[] = typeof kind === "string" ? [kind] : kind;
      const assets = deps.makeAssets();
      let contents: ContainerContents;
      try {
        contents = await codec.read(new Blob([bytes as BlobPart]) /* le Blob copie déjà les octets */);
      } catch (e) {
        if (!(e instanceof CodecUnavailableError)) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
          return null;
        }
        let k: ReadKind;
        let doc: CoreDocument;
        try {
          k = choose(wanted, () => core.containerKind(bytes));
          doc = loadWhole(k, bytes);
        } catch (e2) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e2)}`);
          return null;
        }
        const linked = linkedIds(doc);
        const unread = doc.citedAssets().some((a) => !linked.has(a.id));
        // Un fragment non lu est refusé par l'appelant (`fragments`) avec son propre avis : un seul avis, pas deux.
        if (unread && k === "document") await say(`${name} : ${CODEC_FALLBACK_MESSAGE}`);
        if (k === "document") await relinkAll(name, doc, assets, docPath);
        return { doc, assets, unread, kind: k };
      }
      let k: ReadKind;
      let doc: CoreDocument;
      try {
        // C4 : type lu sur le manifeste déjà extrait, jamais une seconde lecture des octets.
        k = choose(wanted, () => core.manifestKind(contents.manifest));
        doc = loadParts(k, contents.manifest, contents.ybin);
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      try {
        for (const [id, blob] of contents.assets) assets.adopt(id, typed(blob, doc.asset(id)?.mime));
      } catch (e) {
        doc.free();
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return null;
      }
      if (contents.warnings.length > 0) await say(`${name} : ${contents.warnings.join(" ; ")}`);
      if (k === "document") await relinkAll(name, doc, assets, docPath);
      // un asset cité mais ignoré par le conteneur (trop gros…) : marqué, Enregistrer refusé (R30)
      return { doc, assets, unread: missingOf(doc, assets).length > 0, kind: k };
    },
  };
}
