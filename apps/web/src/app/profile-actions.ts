/**
 * Gestes du menu Profil et de l'éditeur (C1 : P4-P6, P22-P24, P28) : enregistrer, enregistrer comme nouveau, importer,
 * exporter, remettre à zéro, supprimer. Le magasin garde les profils, `profile-file.ts` lit et écrit le texte,
 * `ProfileFiles` choisit le fichier ; ici, l'ordre des gestes et les questions posées. Aucun DOM.
 */
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { originOf, resetToOrigin } from "../profile-edit";
import { planImport, profileFromText, profileToFile, slug } from "../profile-file";
import type { ProfileStore } from "../profile-store";
import { uniqueId, withCurrentMinor, type Profile } from "../toolbar";
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
  /** « Enregistrer » : remplace le profil (copie de même id pour un livré, P5) et le rend actif. Faux (message) si l'écriture échoue. */
  save(draft: Profile): boolean;
  /** « Enregistrer comme nouveau » : id = slug unique du nom (jamais un livré), `basedOn` = origine ; rendu actif. Null (message) si l'écriture échoue. */
  saveAsNew(draft: Profile, label: string): Profile | null;
  importFile(): Promise<ImportOutcome>;
  exportActive(): Promise<boolean>;
  /** Faux pour un profil livré sans copie (rien à remettre à zéro). */
  canResetCurrent(): boolean;
  /** Copie d'un livré : retirée ; profil de l'utilisateur : ramené à son origine, id et nom gardés (P6). */
  resetCurrent(): void;
  canRemove(): boolean;
  remove(): Promise<boolean>;
  resetAll(): Promise<boolean>;
  /** Rend un profil actif ; faux (message) si le choix ne pourra pas être gardé au prochain démarrage. */
  choose(id: string): boolean;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createProfileActions(d: ProfileActionsDeps): ProfileActions {
  const builtinIds = new Set(d.builtins.map((b) => b.id));
  /** Écrit en mineure courante et rend actif. */
  const keep = (p: Profile): void => {
    d.store.save(withCurrentMinor(p));
    d.active.choose(p.id);
  };
  /** Exécute un geste qui écrit ; l'échec (stockage plein, imbrication excessive) est dit par `notify`, jamais perdu. */
  const attempt = (what: string, run: () => void): boolean => {
    try {
      run();
      return true;
    } catch (e) {
      void d.shell.notify(`Profil non ${what} : ${messageOf(e)}`);
      return false;
    }
  };
  const notKept = (what: string): void => void d.shell.notify(`${what} ne sera pas gardé au prochain démarrage : le stockage est refusé.`);
  return {
    choose(id) {
      const kept = d.active.choose(id);
      if (!kept) notKept("Le choix du profil");
      return kept;
    },
    save: (draft) => attempt("enregistré", () => keep(draft)),
    saveAsNew(draft, label) {
      const name = label.trim();
      if (name === "") throw new Error("nom de profil vide");
      const taken = new Set([...builtinIds, ...d.store.list().map((p) => p.id)]);
      const { basedOn: _previous, ...rest } = draft;
      const id = uniqueId(slug(name), taken);
      return attempt("enregistré", () => keep({ ...rest, id, label: name, basedOn: originOf(draft, d.builtins).id })) ? d.store.get(id)! : null;
    },
    async importFile() {
      let picked;
      try {
        picked = await d.files.pick();
      } catch (e) {
        await d.shell.notify(`Profil non importé : ${messageOf(e)}`);
        return "refused";
      }
      if (picked === null) return "cancelled";
      const r = profileFromText(picked.text);
      if ("errors" in r) {
        await d.shell.notify(`Profil non importé (${picked.name}) : ${r.errors.join(" ; ")}`);
        return "refused";
      }
      for (const w of r.warnings) d.warn(`profil importé ${picked.name} : ${w}`);
      const plan = planImport(r.profile, d.store.list(), builtinIds);
      if (plan.kind === "confirm" && !(await d.shell.confirm(plan.message))) return "cancelled";
      try {
        keep(r.profile);
      } catch (e) {
        await d.shell.notify(`Profil non importé (${picked.name}) : ${messageOf(e)}`);
        return "refused";
      }
      return "imported";
    },
    async exportActive() {
      let name = "";
      try {
        const f = profileToFile(d.active.profile());
        name = f.name;
        return await d.files.save(f.name, f.text);
      } catch (e) {
        await d.shell.notify(`Profil non exporté${name === "" ? "" : ` (${name})`} : ${messageOf(e)}`);
        return false;
      }
    },
    canResetCurrent() {
      const p = d.active.profile();
      return d.store.isBuiltin(p.id) ? d.store.hasOverride(p.id) : true;
    },
    resetCurrent() {
      const p = d.active.profile();
      attempt("remis à zéro", () => {
        if (d.store.isBuiltin(p.id)) d.store.revert(p.id);
        else d.store.save(withCurrentMinor(resetToOrigin(p, originOf(p, d.builtins))));
      });
      d.active.refresh();
    },
    canRemove: () => !d.store.isBuiltin(d.active.profile().id),
    async remove() {
      const p = d.active.profile();
      if (d.store.isBuiltin(p.id)) return false;
      if (!(await d.shell.confirm(`Supprimer le profil « ${p.label} » ?`))) return false;
      const done = attempt("supprimé", () => d.store.remove(p.id));
      d.active.refresh();
      return done;
    },
    async resetAll() {
      if (!(await d.shell.confirm(RESET_ALL_QUESTION))) return false;
      const erased = d.store.resetAll();
      d.active.refresh();
      if (!erased) notKept("La remise à zéro");
      return true;
    },
  };
}
