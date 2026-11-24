/**
 * Médias et en-têtes d'images dans la CLI (cadrage cli-lot4, D60, D62, D65, DA17, DA20). `nodeMedia` : `probe` et
 * `mediaUrls` de `createImporter` par un seul mécanisme d'URL, celui de Node (`URL.createObjectURL`, `resolveObjectURL`) ;
 * la sonde lit l'en-tête (`readMediaHeader`, format tiré du type que `mediaHandler` pose sur le Blob, `MEDIA_MIME`),
 * sans poster (rien ne décode). `headerBlocked` : avant `createImporter`, une image ou un média dont l'en-tête est
 * illisible sort en code 3 (message rendu ici, levé par `importInto`) ; seules les extensions au lecteur `image` ou
 * `media` de `FORMAT_LOTS`, ou absentes de la table, sont contrôlées (H47) ; les octets décident du lecteur (RF4).
 */
import { resolveObjectURL } from "node:buffer";
import { basename } from "node:path";
import { HEAD_BYTES, probeSize, sniffImage } from "../../web/src/platform/image-import";
import { readMediaHeader } from "../../web/src/platform/media-header";
import { MEDIA_MIME, sniffMedia, type MediaFormat, type MediaProbe } from "../../web/src/platform/media-import";
import { formatOf } from "./formats";

const formatOfMime = (mime: string): MediaFormat | null =>
  (Object.entries(MEDIA_MIME) as Array<[MediaFormat, string]>).find(([, m]) => m === mime)?.[0] ?? null;

export function nodeMedia(): { readonly probe: (url: string) => Promise<MediaProbe>; readonly mediaUrls: { create(b: Blob): string; revoke(u: string): void } } {
  return {
    async probe(url) {
      const blob = resolveObjectURL(url);
      if (blob === undefined) throw new Error(`média introuvable : ${url}`);
      const format = formatOfMime(blob.type);
      const header = format === null ? null : readMediaHeader(new Uint8Array(await blob.arrayBuffer()), format);
      if (header === null) throw new Error("durée du média illisible dans l'en-tête");
      return { duration: header.duration, width: header.width, height: header.height, poster: null };
    },
    mediaUrls: { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) },
  };
}

/** Message du code 3 d'une source d'en-tête illisible, ou null (DA17). */
export async function headerBlocked(name: string, bytes: Uint8Array): Promise<string | null> {
  const handler = formatOf(name)?.handler;
  if (handler !== undefined && handler !== "image" && handler !== "media") return null;
  const base = basename(name);
  const head = bytes.subarray(0, HEAD_BYTES);
  const media = sniffMedia(head, base);
  if (media !== null && "format" in media) {
    return readMediaHeader(bytes, media.format) === null ? `${base} : durée du média illisible dans l'en-tête (la CLI ne décode pas les médias)` : null;
  }
  const kind = sniffImage(head, base);
  if (kind === null) return null;
  return (await probeSize(new Blob([bytes as BlobPart]), kind)) === null ? `${base} : taille de l'image ${kind} illisible dans l'en-tête (la CLI ne décode pas les images)` : null;
}
