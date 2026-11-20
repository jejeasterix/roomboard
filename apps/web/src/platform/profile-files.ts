/**
 * Port des fichiers de profil (C1, P25, DAC1-3). Web (Chromium, repli, iPad) : `<input type=file>` et téléchargement de
 * l'hôte de repli. Coque : boîtes natives filtrées sur `rbprofile`, lecture et écriture par `plugin-fs` (portée limitée
 * au chemin choisi : le chemin rendu par la boîte est écrit tel quel). `FileHost` reste réservé au `.roomboard`.
 */
import { PROFILE_EXTENSION, PROFILE_MIME } from "../profile-file";
import type { FallbackDeps } from "./host-repli";
import { baseName, type TauriDialog, type TauriFs } from "./host-tauri";

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

export function createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">): ProfileFiles {
  return {
    async pick() {
      const f = await deps.pickFile(PROFILE_ACCEPT);
      return f === null ? null : { name: f.name, text: decode(f.bytes) };
    },
    async save(name, text) {
      deps.download(name, encode(text), PROFILE_MIME);
      return true;
    },
  };
}

export function createTauriProfileFiles(dialog: Pick<TauriDialog, "open" | "save">, fs: TauriFs): ProfileFiles {
  return {
    async pick() {
      const path = await dialog.open({ multiple: false, directory: false, filters: [PROFILE_FILTER] });
      if (path === null) return null;
      return { name: baseName(path), text: decode(await fs.readFile(path)) };
    },
    async save(name, text) {
      const path = await dialog.save({ defaultPath: name, filters: [PROFILE_FILTER] });
      if (path === null) return false;
      await fs.writeFile(path, encode(text));
      return true;
    },
  };
}
