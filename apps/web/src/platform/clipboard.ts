/**
 * Presse-papiers des objets (C3, Z8, U9, DAZ4) : enveloppe JSON `{format: "roomboard-items/1", rbitem: <base64>}` en
 * `text/plain` (HZ1-1), presse-papiers interne (un par fenêtre, partagé par les onglets) et système. L'écriture système
 * part pendant le geste (`ClipboardItem` avec promesse), repli `writeText` ; un échec laisse l'interne seul (HZ2-3).
 * Le format natif de la coque se branchera derrière `SystemClipboard` (DAZ4).
 */
import { isEditable } from "./paste";

export const ITEMS_FORMAT = "roomboard-items/1";
const FORMAT_PREFIX = "roomboard-items/";
const CURRENT = 1;
export const MAX_ITEMS_BYTES = 100 * 1024 * 1024;
export const NEWER_ITEMS_MESSAGE = "objets copiés par une version plus récente de RoomBoard : mettez RoomBoard à jour";
export const TOO_BIG_ITEMS_MESSAGE = "objets copiés trop gros (plus de 100 Mo)";
export const INTERNAL_ONLY_MESSAGE = "copié dans RoomBoard seulement";
export type ItemsRefusal = "newer" | "too-big";

const CHUNK = 0x8000;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

export function fromBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !B64.test(text)) return null;
  let s: string;
  try {
    s = atob(text);
  } catch {
    return null;
  }
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function toEnvelope(rbitem: Uint8Array): string {
  return JSON.stringify({ format: ITEMS_FORMAT, rbitem: toBase64(rbitem) });
}

/** Octets du `.rbitem`, ou refus (`newer` : format plus récent ; `too-big` : plus de 100 Mo décodés), ou null (pas une enveloppe). */
export function fromEnvelope(text: string, max: number = MAX_ITEMS_BYTES): Uint8Array | ItemsRefusal | null {
  const t = text.trimStart();
  if (!t.startsWith("{") || !t.includes(`"${FORMAT_PREFIX}`)) return null;
  let v: unknown;
  try {
    v = JSON.parse(t);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  const { format, rbitem } = v as Record<string, unknown>;
  if (typeof format !== "string" || !format.startsWith(FORMAT_PREFIX)) return null;
  const rest = format.slice(FORMAT_PREFIX.length);
  const n = /^\d+$/.test(rest) ? Number(rest) : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return null;
  if (n > CURRENT) return "newer";
  if (typeof rbitem !== "string") return null;
  const pad = rbitem.endsWith("==") ? 2 : rbitem.endsWith("=") ? 1 : 0;
  if ((rbitem.length / 4) * 3 - pad > max) return "too-big";
  return fromBase64(rbitem);
}

export interface SystemClipboard {
  write(text: Promise<string>): Promise<void>;
}
export interface NavigatorLike {
  readonly clipboard?: { write?(items: ClipboardItem[]): Promise<void>; writeText?(text: string): Promise<void> };
}
export type ClipboardItemCtor = new (items: Record<string, Promise<Blob>>) => ClipboardItem;

export function browserSystemClipboard(
  nav: NavigatorLike,
  Item: ClipboardItemCtor | undefined = typeof ClipboardItem === "undefined" ? undefined : ClipboardItem,
): SystemClipboard | null {
  const cb = nav.clipboard;
  if (cb === undefined || (cb.write === undefined && cb.writeText === undefined)) return null;
  return {
    async write(text) {
      if (Item !== undefined && cb.write !== undefined) {
        try {
          await cb.write([new Item({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
          return;
        } catch (e) {
          if (cb.writeText === undefined) throw e;
        }
      }
      if (cb.writeText === undefined) throw new Error("presse-papiers système indisponible");
      await cb.writeText(await text);
    },
  };
}

export interface Clipboard {
  /** Appelée pendant le geste : l'écriture système part avant toute attente. */
  put(rbitem: Promise<Uint8Array>): Promise<"system" | "internal">;
  last(): Uint8Array | null;
  /** PC2 : après chaque copie retenue. */
  onChange(cb: () => void): () => void;
}

export function createClipboard(sys: SystemClipboard | null): Clipboard {
  let last: Uint8Array | null = null;
  const listeners = new Set<() => void>();
  return {
    put(rbitem) {
      // Écriture système lancée tout de suite, pendant le geste ; son issue n'est lue qu'une fois les octets prêts.
      const system: Promise<"system" | "internal"> =
        sys === null
          ? Promise.resolve("internal")
          : sys.write(rbitem.then(toEnvelope)).then(
              () => "system" as const,
              () => "internal" as const,
            );
      return rbitem.then(async (bytes) => {
        last = bytes;
        for (const cb of [...listeners]) cb();
        return system;
      });
    },
    last: () => last,
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

export interface CopyEventLike {
  readonly target: EventTarget | null;
}
export interface CopySink {
  hasSelection(): boolean;
  copySelection(cut: boolean): Promise<void>;
}

/** Corps des écouteurs `copy` et `cut` : pris hors cible éditable et avec une sélection ; null = copie native. */
export function handleCopy(e: CopyEventLike, sink: CopySink, cut: boolean): Promise<void> | null {
  if (isEditable(e.target) || !sink.hasSelection()) return null;
  return sink.copySelection(cut);
}
