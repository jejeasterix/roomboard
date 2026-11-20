/**
 * Port des fichiers de profil (C1, P25, DAC1-3), instance texte du port `typed-files.ts` (C3, DAZ4). Web (Chromium, repli, iPad) : `<input type=file>` et téléchargement de
 * l'hôte de repli. Coque : boîtes natives filtrées sur `rbprofile`, lecture et écriture par `plugin-fs` (portée limitée
 * au chemin choisi : le chemin rendu par la boîte est écrit tel quel). `FileHost` reste réservé au `.roomboard`.
 */
import { PROFILE_EXTENSION, PROFILE_MIME } from "../profile-file";
import type { FallbackDeps } from "./host-repli";
import type { TauriDialog, TauriFs } from "./host-tauri";
import { createTauriTypedFiles, createWebTypedFiles, type FileType, type TypedFiles } from "./typed-files";

export interface ProfileFiles {
  /** null : boîte annulée. Lève si la lecture échoue. */
  pick(): Promise<{ readonly name: string; readonly text: string } | null>;
  /** faux : boîte annulée. Lève si l'écriture échoue. */
  save(name: string, text: string): Promise<boolean>;
}

export const PROFILE_ACCEPT = `${PROFILE_EXTENSION},${PROFILE_MIME},application/json`;
export const PROFILE_FILTER = { name: "Profil RoomBoard", extensions: ["rbprofile"] } as const;

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

export const PROFILE_TYPE: FileType = { extension: PROFILE_EXTENSION, mime: PROFILE_MIME, filter: PROFILE_FILTER, accept: PROFILE_ACCEPT };

const asText = (files: TypedFiles): ProfileFiles => ({
  async pick() {
    const f = await files.pick();
    return f === null ? null : { name: f.name, text: decode(f.bytes) };
  },
  save: (name, text) => files.save(name, encode(text)),
});

export function createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">): ProfileFiles {
  return asText(createWebTypedFiles(deps, PROFILE_TYPE));
}

export function createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs): ProfileFiles {
  return asText(createTauriTypedFiles(dialog, fs, PROFILE_TYPE));
}
