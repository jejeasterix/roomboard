/**
 * Gestes du menu Profil et de l'éditeur (C1 : P4-P6, P22-P24, P28) : enregistrer, enregistrer comme nouveau, importer,
 * exporter, remettre à zéro, supprimer. Le magasin garde les profils, `profile-file.ts` lit et écrit le texte,
 * `ProfileFiles` choisit le fichier ; ici, l'ordre des gestes et les questions posées. Aucun DOM.
 */
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { originOf, resetToOrigin } from "../profile-edit";
import { planImport, profileFromText, profileToFile, slug, uniqueId } from "../profile-file";
import type { ProfileStore } from "../profile-store";
import { withCurrentMinor, type Profile } from "../toolbar";
import type { ActiveProfile } from "../ui/active-profile";

export type ImportOutcome = "imported" | "cancelled" | "refused";

export const RESET_ALL_QUESTION = "Tout remettre à zéro ? Les profils créés et les changements des profils fournis seront effacés.";

export interface ProfileActionsDeps {
  readonly store: ProfileStore;
  readonly active: ActiveProfile;
  readonly files: ProfileFiles;
  readonly shell: Pick<ShellPort, "confirm" | "notify">;
  readonly builtins: readonly Profile[];
  /** Journal des avertissements d'import (U13) ; `console.warn` dans l'application. */
  readonly warn: (message: string) => void;
}

export interface ProfileActions {
  /** « Enregistrer » : remplace le profil (copie de même id pour un livré, P5) et le rend actif. */
  save(draft: Profile): void;
  /** « Enregistrer comme nouveau » : id = slug unique du nom (jamais un livré), `basedOn` = origine ; rendu actif. */
  saveAsNew(draft: Profile, label: string): Profile;
  importFile(): Promise<ImportOutcome>;
  exportActive(): Promise<boolean>;
  /** Faux pour un profil livré sans copie (rien à remettre à zéro). */
  canResetCurrent(): boolean;
  /** Copie d'un livré : retirée ; profil de l'utilisateur : ramené à son origine, id et nom gardés (P6). */
  resetCurrent(): void;
  canRemove(): boolean;
  remove(): Promise<boolean>;
  resetAll(): Promise<boolean>;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createProfileActions(d: ProfileActionsDeps): ProfileActions {
  const builtinIds = new Set(d.builtins.map((b) => b.id));
  /** Écrit en mineure courante et rend actif. */
  const keep = (p: Profile): void => {
    d.store.save(withCurrentMinor(p));
    d.active.choose(p.id);
  };
  return {
    save: (draft) => keep(draft),
    saveAsNew(draft, label) {
      const name = label.trim();
      if (name === "") throw new Error("nom de profil vide");
      const taken = new Set([...builtinIds, ...d.store.list().map((p) => p.id)]);
      const { basedOn: _previous, ...rest } = draft;
      const id = uniqueId(slug(name), taken);
      keep({ ...rest, id, label: name, basedOn: originOf(draft, d.builtins).id });
      return d.store.get(id)!;
    },
    async importFile() {
      const picked = await d.files.pick();
      if (picked === null) return "cancelled";
      const r = profileFromText(picked.text);
      if ("errors" in r) {
        await d.shell.notify(`Profil non importé (${picked.name}) : ${r.errors.join(" ; ")}`);
        return "refused";
      }
      for (const w of r.warnings) d.warn(`profil importé ${picked.name} : ${w}`);
      const plan = planImport(r.profile, d.store.list(), builtinIds);
      if (plan.kind === "confirm" && !(await d.shell.confirm(plan.message))) return "cancelled";
      keep(r.profile);
      return "imported";
    },
    async exportActive() {
      const f = profileToFile(d.active.profile());
      try {
        return await d.files.save(f.name, f.text);
      } catch (e) {
        await d.shell.notify(`Profil non exporté (${f.name}) : ${messageOf(e)}`);
        return false;
      }
    },
    canResetCurrent() {
      const p = d.active.profile();
      return d.store.isBuiltin(p.id) ? d.store.hasOverride(p.id) : true;
    },
    resetCurrent() {
      const p = d.active.profile();
      if (d.store.isBuiltin(p.id)) d.store.revert(p.id);
      else d.store.save(withCurrentMinor(resetToOrigin(p, originOf(p, d.builtins))));
      d.active.refresh();
    },
    canRemove: () => !d.store.isBuiltin(d.active.profile().id),
    async remove() {
      const p = d.active.profile();
      if (d.store.isBuiltin(p.id)) return false;
      if (!(await d.shell.confirm(`Supprimer le profil « ${p.label} » ?`))) return false;
      d.store.remove(p.id);
      d.active.refresh();
      return true;
    },
    async resetAll() {
      if (!(await d.shell.confirm(RESET_ALL_QUESTION))) return false;
      d.store.resetAll();
      d.active.refresh();
      return true;
    },
  };
}
