/**
 * Conteneurs (C3, DAZ3) : écriture et lecture d'un `.roomboard` ou d'un `.rbitem`, décidées à chaque appel. Sans asset
 * cité : ZIP du cœur (`save` / `saveFragment`), second module jamais chargé (garde `compat_socle`) ; avec assets :
 * parties du cœur puis `ContainerCodec.write`. Lecture par le conteneur, repli par le cœur seul (R7). Repris de
 * `workspace.ts` (`encodeTab`, `readDocument`) sans changement de comportement pour un document.
 * Un fragment n'est écrit que si toutes ses images sont dans le magasin (pas d'élément sans son asset dans la cible).
 */
import type { CoreDocument, CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { CodecUnavailableError, type ContainerCodec, type ContainerContents } from "../platform/container";
import { messageOf } from "../platform/controller";

/** Repli R7 : le module du conteneur ne s'est pas chargé, le document s'ouvre par le cœur seul. */
export const CODEC_FALLBACK_MESSAGE = "images non lues : le module des images ne s'est pas chargé";

/** Fragment refusé parce qu'une image citée n'est pas dans le magasin (seule erreur que la copie dit « images absentes »). */
export class MissingAssetError extends Error {
  constructor() {
    super("fragment impossible : une image citée est absente du magasin");
    this.name = "MissingAssetError";
  }
}

export type EncodeAs = { readonly kind: "document" } | { readonly kind: "fragment"; readonly name: string };
export type ReadKind = "document" | "fragment";
export interface ReadResult {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  readonly unread: boolean;
}
export interface ContainerIODeps {
  readonly core: CoreFactory;
  readonly codec: ContainerCodec;
  say(message: string): Promise<void>;
  makeAssets(): AssetStore;
}
export interface ContainerIO {
  encode(doc: CoreDocument, assets: AssetStore, now: string, appVersion: string, as: EncodeAs): Promise<Uint8Array>;
  read(name: string, bytes: Uint8Array, kind: ReadKind): Promise<ReadResult | null>;
}

export const typed = (blob: Blob, mime: string | undefined): Blob =>
  mime !== undefined && mime !== "" && mime !== blob.type ? new Blob([blob], { type: mime }) : blob;

export const missingOf = (doc: CoreDocument, assets: AssetStore): string[] =>
  assets.pick(doc.citedAssets().map((a) => a.id)).missing;

export function createContainerIO(deps: ContainerIODeps): ContainerIO {
  const { core, codec, say } = deps;
  return {
    async encode(doc, assets, now, appVersion, as) {
      const cited = doc.citedAssets();
      if (cited.length === 0) {
        return as.kind === "document" ? doc.save(now, appVersion) : doc.saveFragment(now, appVersion, as.name);
      }
      const { present, missing } = assets.pick(cited.map((a) => a.id));
      if (as.kind === "fragment" && missing.length > 0) {
        throw new MissingAssetError();
      }
      const [manifest, ybin] = as.kind === "document" ? doc.saveParts(now, appVersion) : doc.saveFragmentParts(now, appVersion, as.name);
      const mimeOf = new Map(cited.map((a) => [a.id, a.mime]));
      return codec.write(manifest, ybin, present.map(([id, blob]) => ({ id, mime: mimeOf.get(id) ?? blob.type, blob })));
    },
    async read(name, bytes, kind) {
      const assets = deps.makeAssets();
      let contents: ContainerContents;
      try {
        contents = await codec.read(new Blob([bytes as BlobPart]) /* le Blob copie déjà les octets */);
      } catch (e) {
        if (!(e instanceof CodecUnavailableError)) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
          return null;
        }
        let doc: CoreDocument;
        try {
          doc = kind === "document" ? core.load(bytes) : core.loadFragment(bytes);
        } catch (e2) {
          await say(`Ouverture impossible (${name}) : ${messageOf(e2)}`);
          return null;
        }
        const unread = doc.citedAssets().length > 0;
        // Un fragment non lu est refusé par l'appelant (`fragments`) avec son propre avis : un seul avis, pas deux.
        if (unread && kind === "document") await say(`${name} : ${CODEC_FALLBACK_MESSAGE}`);
        return { doc, assets, unread };
      }
      let doc: CoreDocument;
      try {
        doc = kind === "document" ? core.loadParts(contents.manifest, contents.ybin) : core.loadFragmentParts(contents.manifest, contents.ybin);
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
      // un asset cité mais ignoré par le conteneur (trop gros…) : marqué, Enregistrer refusé (R30)
      return { doc, assets, unread: missingOf(doc, assets).length > 0 };
    },
  };
}
