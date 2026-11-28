/**
 * Fichiers de profil (C1, DAC1-3) : texte ↔ profil, nom du fichier exporté, slug, décision d'import. Fonctions pures,
 * sans fichier ni boîte : `platform/profile-files.ts` choisit et écrit le fichier, `app/profile-actions.ts` enchaîne.
 * Un futur dépôt de `.rbprofile` (P26, non attribué) appellera `profileFromText` et `planImport`.
 */
import { MAX_JSON_DEPTH, textTooDeep } from "./json-depth";
import { parseProfile, serializeProfile, type ParsedProfile, type Profile } from "./toolbar";

export const PROFILE_EXTENSION = ".rbprofile";
export const PROFILE_MIME = "application/vnd.roomboard.profile+json";

/** Plafond du texte d'un `.rbprofile` à l'import (1 Mo, compté en octets UTF-8) : au-delà, refusé avant toute lecture JSON. */
export const MAX_PROFILE_TEXT = 1_048_576;

export type ImportPlan = { readonly kind: "add" } | { readonly kind: "confirm"; readonly message: string };

/** Identifiant tiré d'un libellé : minuscules sans accents, `[a-z0-9-]`, vide → `profil` (P28). */
export function slug(label: string): string {
  const s = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s === "" ? "profil" : s;
}

/** Fichier exporté (P23) : `<slug du libellé>.rbprofile`, JSON indenté de 2. */
export function profileToFile(p: Profile): { readonly name: string; readonly text: string } {
  return { name: `${slug(p.label)}${PROFILE_EXTENSION}`, text: JSON.stringify(serializeProfile(p), null, 2) };
}

/** Texte d'un fichier → profil ; trop gros, trop imbriqué (OG45) ou JSON illisible : erreur lisible ; ensuite les
 *  règles de `parseProfile` (P24, P33). */
export function profileFromText(text: string): ParsedProfile {
  if (new TextEncoder().encode(text).length > MAX_PROFILE_TEXT) return { errors: ["fichier trop gros (plus d'un mégaoctet)"] };
  if (textTooDeep(text)) return { errors: [`fichier trop imbriqué (plus de ${MAX_JSON_DEPTH} niveaux)`] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { errors: [`fichier de profil illisible : ${e instanceof Error ? e.message : String(e)}`] };
  }
  return parseProfile(json);
}

/** Import (P24) : id libre → ajout ; id pris (livré ou utilisateur) → confirmation « Remplacer le profil « … » ? ». */
export function planImport(p: Profile, existing: readonly Profile[], builtinIds: ReadonlySet<string>): ImportPlan {
  const taken = existing.find((x) => x.id === p.id);
  if (taken === undefined && !builtinIds.has(p.id)) return { kind: "add" };
  return { kind: "confirm", message: `Remplacer le profil « ${taken?.label ?? p.id} » ?` };
}
