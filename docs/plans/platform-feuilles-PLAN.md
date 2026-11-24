# platform-feuilles (OF13) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Feuille `editable.ts` (D4) | — | apps/web/src/platform/editable.ts (neuf), apps/web/src/platform/editable.test.ts (neuf), apps/web/src/platform/paste.ts, apps/web/src/platform/clipboard.ts | isolé | implementeur-tdd | web : `editable.test.ts` 4 tests verts ; `paste.test.ts`, `clipboard.test.ts`, `text-editor.test.ts` verts ; suite web sans `FAIL ` | S1, S3 | #tache-t1 |
| T2 | Feuille `messages.ts` (D9) | — | apps/web/src/platform/messages.ts (neuf), apps/web/src/platform/messages.test.ts (neuf), apps/web/src/platform/controller-open-failed.test.ts (neuf), apps/web/src/platform/controller.ts, apps/web/src/platform/import.ts, apps/web/src/platform/mount.ts, apps/web/src/app/open-export.ts, apps/web/src/app/container-io.ts, apps/web/src/app/pdf-convert.ts | isolé | concepteur-critique | web : `messages.test.ts` 4 + `controller-open-failed.test.ts` 2 verts ; `container-io`, `open-export`, `pdf-convert`, `import`, `mount`, `controller` verts ; gabarit « Ouverture impossible (${ » sur 1 seule ligne ; CLI `session`, `boards`, `convert` verts | S1, S2, S3 | #tache-t2 |
| T3 | Feuille `import-handler.ts` et `officeErrorCode` (D5, D8) | T2 | apps/web/src/platform/import-handler.ts (neuf), apps/web/src/platform/import-handler.test.ts (neuf), apps/web/src/platform/office-error-code.test.ts (neuf), apps/web/src/platform/import.ts, apps/web/src/platform/office-import.ts, apps/web/src/platform/model3d-handlers.ts, apps/web/src/platform/media-import.ts, apps/web/src/platform/image-import.ts, apps/cli/src/session.ts | isolé | implementeur-tdd | web : `import-handler.test.ts` 6 + `office-error-code.test.ts` 1 verts ; `import`, `office-import`, `model3d-handlers`, `media-import`, `image-import`, `table-insert` verts ; CLI `office`, `session`, `import` verts | S1, S2, S3 | #tache-t3 |
| T4 | Codec `board-list.ts`, `olf-read.ts` et `ZipFile` dans `platform/` (D6, D7) | — | apps/web/src/platform/board-list.ts (neuf), apps/web/src/platform/board-list.test.ts (neuf), apps/web/src/app/olf-read.ts → apps/web/src/platform/olf-read.ts, apps/web/src/app/olf-read.test.ts → apps/web/src/platform/olf-read.test.ts, apps/web/src/app/board-io.ts, apps/web/src/app/board-files.ts, apps/web/src/platform/board-reader.ts, apps/web/src/platform/archive-path.ts, apps/web/src/platform/zip-read.ts, apps/web/src/platform/zip-worker.ts, apps/web/src/platform/zip-read.test.ts, apps/web/src/platform/zip-worker.test.ts | isolé | implementeur-tdd | web : `board-list.test.ts` 8 verts ; `olf-read`, `zip-read`, `zip-worker`, `board-io`, `board-files`, `board-reader`, `board-convert`, `rbpack` verts ; CLI `boards`, `convert`, `board-node` verts | S1, S3, S4 | #tache-t4 |
| T5 | Garde `import-graph.test.ts` et preuves S1 à S5 | T1, T2, T3, T4 | apps/web/src/platform/import-graph.test.ts (neuf) | partagé (worktree du chantier, après fusion de T1 à T4) | implementeur-tdd | garde : base `2 failed / 4 passed`, tête `6 passed` ; `COMPARAISON : OK` ; `CLI : OK` ; chunk `zip-worker-*.js` sans `document.`/`window.`, ≤ 28 441 o ; Wasm 1 374 215 o et 2 794 511 o ; `verifier.sh : e2e OK` | S1, S2, S3, S4, S5 | #tache-t5 |

Vagues : 1 = T1, T2, T4 (fichiers disjoints) · 2 = T3 (partage `apps/web/src/platform/import.ts` avec T2) · 3 = T5.

**Goal :** casser les cycles d'import de `apps/web/src/platform/` et sa dépendance vers `src/app/` par quatre modules
feuilles, puis garder la règle par un test du dépôt, sans rien changer de ce que voient la page, la coque et la CLI.

**Architecture :** chaque nom déplacé part dans une feuille de `platform/` (`editable.ts`, `messages.ts`,
`import-handler.ts`, `board-list.ts`) ou dans une feuille existante (`archive-path.ts`) ; son module d'origine le
réexporte (H3), donc aucun importeur ne change, sauf `olf-read.ts` qui déménage entier dans `platform/`. La garde lit
les imports par `ts.preProcessFile` et cherche les composantes fortement connexes (Tarjan).

**Tech Stack :** TypeScript 5.9, Vitest 4, Vite 6, pnpm ; paquet `typescript` déjà en devDependencies de `apps/web`.

**Spec :** `docs/plans/platform-feuilles-cadrage.md`

## Global Constraints

- GC1 — Refactor sans changement de comportement : textes, codes de sortie de la CLI, ordre des avis, `console.warn` identiques.
- GC2 — Tests existants non réécrits sur le fond. Seules 4 lignes d'import changent : `olf-read.test.ts:2` et `:3` (fichier déplacé), `zip-read.test.ts:7`, `zip-worker.test.ts:7`. Les tests neufs vont dans des fichiers neufs.
- GC3 — Chaque nom déplacé reste exporté par son module d'origine (H3). Seule exception : `olf-read`, qui déménage entier.
- GC4 — `apps/web/src/app/open-export.ts` (OF12) n'est pas défait : il reste le module que la page et la CLI partagent.
- GC5 — Le Worker ZIP, chargé par `new Worker(new URL("./platform/zip-worker.ts", import.meta.url))` (`main.ts:220`), reste sans DOM et n'importe que des fichiers de `platform/`.
- GC6 — Aucun Rust touché ; modules Wasm inchangés (1 374 215 o et 2 794 511 o).
- GC7 — Aucune dépendance ajoutée : `package.json` et `pnpm-lock.yaml` intacts.
- GC8 — Builds et tests en `nice -n 10`, `cargo … -j 4` ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` : les fichiers s'ajoutent un par un. Aucun push, aucun tag, aucune release.
- GC10 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 — Fixtures du dépôt seulement, rien de téléchargé ; écritures de la CLI sur des fichiers temporaires.
- GC12 — Aucune commande, opération ni sortie de la CLI ne change : ni `FORMAT_LOTS`, ni `scripts/essais/cli-essai.mjs` ne sont touchés (D10).

## Review Focus

1. Boîte de message en échec pendant un échec d'ouverture (effet de bord « `fail` du contrôleur coupé en `say` + `fail` ») : `console.warn` reçoit d'abord `RoomBoard : Ouverture impossible (a.roomboard) : quota dépassé`, puis l'abandon de la commande. Test : `controller-open-failed.test.ts` (T2).
2. Plafond Office lu dans `SHEET_MAX_BYTES` au lieu d'un littéral (effet de bord « `OFFICE_MAX_BYTES` ») : 100 Mio exactement, `gros.pptx` à 100 Mio + 1 refusé. Tests : `import-handler.test.ts` « OFFICE_MAX_BYTES vaut SHEET_MAX_BYTES » (T3) et `import.test.ts:1161,1213` gardés verts (T3).
3. Code d'échec d'une conversion Office (D8) : `no-program` reste `no-program` (code 3 côté CLI), toute autre erreur devient `failed` (code 1). Tests : `office-error-code.test.ts` (T3) et CLI `office.test.ts` (S2, `ROOMBOARD_OFFICE` absent → 3) gardé vert (T3).
4. Flux BoardList après déplacement (effets de bord « contenu du chunk du Worker ZIP » et « `olf-read` déménagé ») : aller-retour `encodeBoardList` → `decodeBoardList` identique, textes internés, budget d'objets. Test : `board-list.test.ts` (T4).
5. Garde qui passerait à vide (D3) : dossier mal lu, `new URL("…", import.meta.url)` oublié, relatif non résolu. Tests : « lit bien le dossier », « lit import, import type, export … from, import() et new URL », « tout import relatif se résout » de `import-graph.test.ts` (T5).

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/platform/editable.ts` (neuf) | `isEditable`, `NOT_TEXT` ; aucun import | T1 |
| `apps/web/src/platform/paste.ts`, `clipboard.ts` | importent `editable` ; `paste` réexporte `isEditable` | T1 |
| `apps/web/src/platform/messages.ts` (neuf) | `messageOf`, `openFailedMessage` ; aucun import | T2 |
| `apps/web/src/platform/controller.ts` | réexporte `messageOf` ; `fail` coupé en `say` + `fail` | T2 |
| `apps/web/src/platform/import.ts` | l. 16 et 155 (T2) ; contrat et aides retirés, réexportés (T3) | T2, T3 |
| `apps/web/src/platform/mount.ts`, `app/container-io.ts`, `app/pdf-convert.ts` | appellent `openFailedMessage` | T2 |
| `apps/web/src/app/open-export.ts` | réexporte `openFailedMessage` | T2 |
| `apps/web/src/platform/import-handler.ts` (neuf) | `StageRect`, `ImageTarget`, `ImportContext`, `ImportOutcome`, `ImportHandler`, `hasExtension`, `ZIP_MAGIC`, `hasZipMagic`, `SHEET_MAX_BYTES`, `isSheetName` ; types seuls importés | T3 |
| `apps/web/src/platform/office-import.ts` | importe `import-handler` ; `OFFICE_MAX_BYTES = SHEET_MAX_BYTES` ; `officeErrorCode` | T3 |
| `apps/web/src/platform/model3d-handlers.ts`, `media-import.ts`, `image-import.ts` | importent `import-handler` ; `image-import` réexporte `ImageTarget`, `StageRect` | T3 |
| `apps/cli/src/session.ts` | appelle `officeErrorCode` | T3 |
| `apps/web/src/platform/board-list.ts` (neuf) | codec BoardList, bornes, `BOARD_OBJECTS_MESSAGE`, `BOARD_MAX_OBJECTS`, `SKIPPED_LABEL` ; types de `core/api` seuls | T4 |
| `apps/web/src/platform/olf-read.ts` (déplacé de `app/`) | lecteur `.olf`, importe `board-list` et `archive-path` | T4 |
| `apps/web/src/app/board-io.ts`, `board-files.ts`, `platform/board-reader.ts` | réexportent ce qu'ils exportaient | T4 |
| `apps/web/src/platform/archive-path.ts` | reçoit `ZipFile` | T4 |
| `apps/web/src/platform/zip-read.ts`, `zip-worker.ts` | importent depuis `platform/` seulement ; `zip-read` réexporte `ZipFile` | T4 |
| `apps/web/src/platform/import-graph.test.ts` (neuf) | garde D2 | T5 |

---

<a id="tache-t1"></a>
### Tâche T1 — Feuille `editable.ts` (D4)

**Objectif.** Casser le cycle `clipboard.ts ↔ paste.ts` (constat `clipboard.ts:7`) : `isEditable` et `NOT_TEXT` partent,
sans changement, dans la feuille `platform/editable.ts` ; `clipboard.ts` l'importe de là ; `paste.ts` l'importe et le
réexporte. `TABLE_TAG` reste dans `paste.ts`. On ne fusionne pas avec `inEditable` (`engine/input/keys.ts:17`), qui a
d'autres règles.

**Fichiers.**
- Créer : `apps/web/src/platform/editable.ts`, `apps/web/src/platform/editable.test.ts`
- Modifier : `apps/web/src/platform/paste.ts:14,17-23`, `apps/web/src/platform/clipboard.ts:7`

**Interfaces.**
- Consomme : rien.
- Produit : `apps/web/src/platform/editable.ts` → `export function isEditable(t: EventTarget | null): boolean` ; `paste.ts` → `export { isEditable }` (même fonction).
- Réutilise : `apps/web/src/platform/paste.ts:17` — `isEditable(t: EventTarget | null): boolean`, déplacée dans `platform/editable.ts`, même signature, même corps.

**Test et commande bornée.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web && nice -n 10 npx vitest run src/platform/editable.test.ts src/platform/paste.test.ts src/platform/clipboard.test.ts src/app/text-editor.test.ts 2>&1 | tail -15`
Motif de preuve : `Test Files  4 passed (4)`, une ligne `Tests  N passed` avec N ≥ 4, `editable.test.ts` nommé, aucune ligne `FAIL `.

**Preuve visuelle.** Sans objet : aucune interface ne change (profil : aucune preuve visuelle automatique).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : textes, codes de sortie de la CLI, ordre des avis, `console.warn` identiques.
- GC2 — Tests existants non réécrits sur le fond ; aucun test existant ne change dans cette tâche ; les tests neufs vont dans `editable.test.ts`.
- GC3 — `isEditable` reste exporté par `paste.ts` (H3) : `paste.test.ts:5` et `app/text-editor.test.ts:10` ne changent pas.
- GC7 — Aucune dépendance ajoutée.
- GC8 — Builds et tests en `nice -n 10` ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag, aucune release.
- GC10 — Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Interdits.** Toucher `engine/input/keys.ts`, `app/annotation-page.ts` (constat l. 43, hors périmètre) ; exporter `NOT_TEXT` ; déplacer `TABLE_TAG`.

**Critère « terminé ».** Étapes 1 à 8 faites ; un commit ; rapport avec la sortie des étapes 6 et 7 et la ligne
`Réutilisation : appelé platform/editable.ts (isEditable)` ou `Réutilisation : écart — <pourquoi>`.

- [ ] **1. Préparer le worktree.** Dossier de la tâche : `/home/adminjd/projets/roomboard-wt/platform-feuilles--T1` ; si l'orchestrateur en donne un autre, remplacer ce préfixe dans toutes les commandes.

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web/src/wasm
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm-formats /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web/src/wasm-formats
```

- [ ] **2. Écrire le test rouge** `apps/web/src/platform/editable.test.ts` :

```ts
// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isEditable } from "./editable";
import * as paste from "./paste";

describe("isEditable (OF13, D4)", () => {
  it("zone de texte, champ texte, contenteditable : éditables", () => {
    const area = document.createElement("textarea");
    const input = document.createElement("input");
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const empty = document.createElement("div");
    empty.setAttribute("contenteditable", "");
    for (const t of [area, input, div, empty]) expect(isEditable(t), t.outerHTML).toBe(true);
  });

  it("case à cocher, bouton, élément ordinaire, null : non éditables", () => {
    const box = document.createElement("input");
    box.type = "checkbox";
    const btn = document.createElement("input");
    btn.type = "button";
    for (const t of [box, btn, document.createElement("button"), document.createElement("div"), null]) expect(isEditable(t)).toBe(false);
  });

  it("même fonction réexportée par paste.ts (H3)", () => {
    expect(paste.isEditable).toBe(isEditable);
  });

  it("feuille : aucun import", () => {
    expect(readFileSync(new URL("./editable.ts", import.meta.url), "utf8")).not.toMatch(/^\s*(import|export .* from)\s/m);
  });
});
```

- [ ] **3. Le voir rouge.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web && nice -n 10 npx vitest run src/platform/editable.test.ts 2>&1 | tail -15`
Attendu : `FAIL  src/platform/editable.test.ts`, échec de chargement de `./editable` (fichier absent).

- [ ] **4. Créer `apps/web/src/platform/editable.ts`** :

```ts
/** Cible éditable (R19, C3) : champ de texte, zone de texte ou `contenteditable` ; le collage et la copie d'objets s'y
 *  effacent. Feuille sans import (OF13, D4) : `clipboard.ts` et `paste.ts` l'importent ; `paste.ts` réexporte `isEditable`. */
const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);

export function isEditable(t: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(t instanceof HTMLElement)) return false;
  const ce = t.getAttribute("contenteditable");
  if (t.isContentEditable || ce === "" || ce === "true") return true;
  if (t instanceof HTMLTextAreaElement) return true;
  return t instanceof HTMLInputElement && !NOT_TEXT.has(t.type);
}
```

- [ ] **5. Brancher `paste.ts` et `clipboard.ts`.**
  - `apps/web/src/platform/paste.ts` : supprimer la ligne 14 (`const NOT_TEXT = …`) et les lignes 17 à 23 (`export function isEditable … }`) avec la ligne vide qui suit ; après la ligne `import type { DroppedFile } from "./files";`, ajouter :

```ts
import { isEditable } from "./editable";
```

    puis, après la ligne `const TABLE_TAG = /<table[\s>]/i;`, ajouter :

```ts

/** Cible éditable : `editable.ts` (OF13, D4), réexportée ici pour ses importeurs. */
export { isEditable };
```

  - `apps/web/src/platform/clipboard.ts:7` : `import { isEditable } from "./paste";` devient `import { isEditable } from "./editable";`.

- [ ] **6. Le voir vert, avec les tests gardés.** Commande bornée de la section. Puis le typage :
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"` → `code 0`, aucune ligne `error TS`.

- [ ] **7. Suite web complète.**
`node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1/apps/web && nice -n 10 npx vitest run 2>&1 | tail -15'`
Attendu : aucune ligne `FAIL `, `Tests  N passed` avec N ≥ 3206 (référence 3202 + 4).

- [ ] **8. Commit.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T1 && git add apps/web/src/platform/editable.ts apps/web/src/platform/editable.test.ts apps/web/src/platform/paste.ts apps/web/src/platform/clipboard.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "refactor(platform): move isEditable into an import-free editable leaf (OF13 D4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t2"></a>
### Tâche T2 — Feuille `messages.ts` (D9)

**Objectif.** Fermer le constat `open-export.ts:33` : le format « Ouverture impossible (nom) : … » n'est écrit qu'une
fois, dans la feuille `platform/messages.ts` (aucun import), avec `messageOf`. `controller.ts` réexporte `messageOf`,
`open-export.ts` réexporte `openFailedMessage`. Les 8 sites qui écrivent le gabarit en ligne l'appellent, texte rendu
strictement identique : `app/container-io.ts:155,164,181,188`, `app/pdf-convert.ts:43`, `platform/import.ts:155`,
`platform/mount.ts:48`, `platform/controller.ts:166`. Pour ce dernier, `fail(prefix, e)` est coupé en `say(text)` et
`fail(prefix, e)`. Restent hors du module : `controller.ts:159` et `workspace.ts:787` (« Ouverture impossible : … », sans
nom) et `import.ts:472` (« ${Ouverture|Import} impossible »), qui sont d'autres formats.

**Fichiers.**
- Créer : `apps/web/src/platform/messages.ts`, `apps/web/src/platform/messages.test.ts`, `apps/web/src/platform/controller-open-failed.test.ts`
- Modifier : `apps/web/src/platform/controller.ts:7,86-88,108-117,166`, `apps/web/src/platform/import.ts:16,155`, `apps/web/src/platform/mount.ts:7,48`, `apps/web/src/app/open-export.ts:10,32-33`, `apps/web/src/app/container-io.ts:13,155,164,181,188`, `apps/web/src/app/pdf-convert.ts:11,43`

**Interfaces.**
- Consomme : rien.
- Produit : `apps/web/src/platform/messages.ts` → `export function messageOf(e: unknown): string` ; `export const openFailedMessage = (name: string, e: unknown): string`. `controller.ts` → `export { messageOf }` ; `open-export.ts` → `export { openFailedMessage }` (mêmes fonctions).
- Réutilise : `apps/web/src/app/open-export.ts:33` — `openFailedMessage(name: string, e: unknown): string`, déplacée dans `platform/messages.ts`, même signature, appelée par 8 sites (app ×5, platform ×3).
- Réutilise : `apps/web/src/platform/controller.ts:86-88` — `messageOf(e: unknown): string`, déplacée dans `platform/messages.ts` et réexportée par `controller.ts` pour ses 23 importeurs.
- Contrat pour T3 : `import.ts` garde son nombre de lignes (la ligne 16 est remplacée sur place, la ligne 155 aussi) ; T3 s'appuie sur ces numéros.

**Patron à ne pas reprendre.** `apps/web/src/platform/controller.ts:108-117` et `:166` : `fail` compose le texte en ligne
(`${prefix} : ${messageOf(e)}`) et la ligne 166 fabrique le préfixe `Ouverture impossible (${file.name})` à la main ;
`apps/web/src/app/pdf-convert.ts:43` recopie le gabarit. Ne pas non plus faire importer `controller.ts` par
`messages.ts` (cycle `controller ↔ messages`).
**Chemin de référence.** `apps/web/src/app/open-export.ts:32-33` : seule définition du format, déplacée telle quelle.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web && nice -n 10 npx vitest run src/platform/messages.test.ts src/platform/controller-open-failed.test.ts src/platform/controller.test.ts src/platform/mount.test.ts src/platform/import.test.ts src/app/container-io.test.ts src/app/open-export.test.ts src/app/pdf-convert.test.ts 2>&1 | tail -15`
Motif de preuve : `Test Files  8 passed (8)`, `messages.test.ts` et `controller-open-failed.test.ts` nommés, aucune ligne `FAIL `.
CLI : `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/cli && nice -n 10 npx vitest run src/session.test.ts src/boards.test.ts src/convert.test.ts src/pdf.test.ts 2>&1 | tail -15` → `Test Files  4 passed (4)`, aucune ligne `FAIL `.

**Preuve visuelle.** Sans objet : textes identiques, prouvés par les tests qui les figent (`container-io.test.ts:139,314,321,347`, `import.test.ts:63`, `mount.test.ts:50`, `controller.test.ts:353`).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : textes, codes de sortie de la CLI, ordre des avis, `console.warn` identiques.
- GC2 — Tests existants non réécrits sur le fond ; aucun test existant ne change dans cette tâche ; les tests neufs vont dans `messages.test.ts` et `controller-open-failed.test.ts`.
- GC3 — `messageOf` reste exporté par `controller.ts`, `openFailedMessage` par `open-export.ts` (H3) : `workspace.ts:51` et `apps/cli/src/session.ts:20` ne changent pas.
- GC4 — `apps/web/src/app/open-export.ts` (OF12) n'est pas défait : il reste le module que la page et la CLI partagent.
- GC7 — Aucune dépendance ajoutée.
- GC8 — Builds et tests en `nice -n 10` ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag, aucune release.
- GC10 — Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC12 — Aucune commande, opération ni sortie de la CLI ne change ; `cli-essai.mjs` et `FORMAT_LOTS` non touchés.

**Interdits.** Toucher `controller.ts:159`, `workspace.ts:787`, `import.ts:472` ; ajouter une ligne à `import.ts` ; toucher un fichier de T3 (`import-handler.ts`, `office-import.ts`, …).

**Critère « terminé ».** Étapes 1 à 10 faites ; un commit ; rapport avec la sortie des étapes 7, 8 et 9 et les lignes
`Réutilisation : appelé platform/messages.ts (openFailedMessage)` et `Réutilisation : appelé platform/messages.ts (messageOf)`, ou `Réutilisation : écart — <pourquoi>`.

- [ ] **1. Préparer le worktree.** Dossier de la tâche : `/home/adminjd/projets/roomboard-wt/platform-feuilles--T2` ; si l'orchestrateur en donne un autre, remplacer ce préfixe dans toutes les commandes.

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web/src/wasm
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm-formats /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web/src/wasm-formats
```

- [ ] **2. Écrire le test de caractérisation** `apps/web/src/platform/controller-open-failed.test.ts` (il passe sur la base : il fige le comportement que la coupe de `fail` doit garder) :

```ts
import { describe, expect, it, vi } from "vitest";
import { createFileController } from "./controller";
import type { FileHost, Notify, ShellPort } from "./files";

/** Ouverture réussie dans la boîte, puis `openInTab` qui lève « quota dépassé » (controller.ts:166). */
function setup(notify: Notify) {
  const shell: ShellPort = { confirm: async () => true, notify, guardClose: () => () => undefined, setTitle: () => undefined };
  const host = {
    kind: "repli",
    open: async () => ({ name: "a.roomboard", bytes: new Uint8Array(), target: { kind: "ask", name: "a.roomboard" } }),
    pick: async () => [],
    save: async () => null,
  } as unknown as FileHost;
  return createFileController({
    versions: { state: () => ({ version: 0 }), onState: () => () => undefined },
    host,
    shell,
    opened: null,
    openInTab: async () => {
      throw new Error("quota dépassé");
    },
    newTab: async () => undefined,
    now: () => "2026-11-24T00:00:00Z",
    appVersion: "0.1.0",
    encode: async () => new Uint8Array(),
    importFiles: async () => undefined,
  });
}

describe("échec d'ouverture dans un nouvel onglet (OF13, D9 : fail coupé en say + fail)", () => {
  it("le texte dit est « Ouverture impossible (a.roomboard) : quota dépassé »", async () => {
    const notes: string[] = [];
    const ctl = setup(async (m) => {
      notes.push(m);
    });
    expect(await ctl.run("open")).toBe(false);
    expect(notes).toEqual(["Ouverture impossible (a.roomboard) : quota dépassé"]);
  });

  it("boîte en échec : console.warn reçoit le texte d'origine, puis l'abandon de la commande", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const ctl = setup(async () => {
        throw new Error("boîte fermée");
      });
      expect(await ctl.run("open")).toBe(false);
      expect(warn.mock.calls.map((c) => c.join(" "))).toEqual([
        "RoomBoard : Ouverture impossible (a.roomboard) : quota dépassé",
        "RoomBoard : commande de fichier abandonnée (boîte fermée)",
      ]);
    } finally {
      warn.mockRestore();
    }
  });
});
```

Lancer : `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web && nice -n 10 npx vitest run src/platform/controller-open-failed.test.ts 2>&1 | tail -15` → `Tests  2 passed (2)` (caractérisation sur la base).

- [ ] **3. Écrire le test rouge** `apps/web/src/platform/messages.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as openExport from "../app/open-export";
import * as controller from "./controller";
import { messageOf, openFailedMessage } from "./messages";

describe("messages (OF13, D9)", () => {
  it("messageOf : message d'une Error, sinon String(e)", () => {
    expect(messageOf(new Error("quota dépassé"))).toBe("quota dépassé");
    expect(messageOf("déjà une chaîne")).toBe("déjà une chaîne");
    expect(messageOf(42)).toBe("42");
  });

  it("openFailedMessage : « Ouverture impossible (<nom>) : <message> »", () => {
    expect(openFailedMessage("a.roomboard", new Error("quota dépassé"))).toBe("Ouverture impossible (a.roomboard) : quota dépassé");
    expect(openFailedMessage("x.pdf", "fichier chiffré")).toBe("Ouverture impossible (x.pdf) : fichier chiffré");
  });

  it("mêmes fonctions réexportées par controller.ts et open-export.ts (H3)", () => {
    expect(controller.messageOf).toBe(messageOf);
    expect(openExport.openFailedMessage).toBe(openFailedMessage);
  });

  it("feuille : aucun import", () => {
    expect(readFileSync(new URL("./messages.ts", import.meta.url), "utf8")).not.toMatch(/^\s*(import|export .* from)\s/m);
  });
});
```

- [ ] **4. Le voir rouge.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web && nice -n 10 npx vitest run src/platform/messages.test.ts 2>&1 | tail -15`
Attendu : `FAIL  src/platform/messages.test.ts`, échec de chargement de `./messages` (fichier absent).

- [ ] **5. Créer `apps/web/src/platform/messages.ts`** :

```ts
/**
 * Messages partagés par la page, la coque et la CLI (OF13, cadrage platform-feuilles D9) : feuille sans aucun import.
 * `controller.ts` réexporte `messageOf`, `open-export.ts` réexporte `openFailedMessage`.
 */

/** Texte d'une erreur : son `message`, sinon sa conversion en chaîne (une chaîne reste elle-même). */
export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** « Ouverture impossible (<nom>) : <message> » ; `name` est le nom affiché, jamais un chemin. */
export const openFailedMessage = (name: string, e: unknown): string => `Ouverture impossible (${name}) : ${messageOf(e)}`;
```

- [ ] **6. Brancher les modules.**
  - `apps/web/src/platform/controller.ts` : après la ligne 7 (`import { UNTITLED, … } from "./files";`), ajouter `import { messageOf, openFailedMessage } from "./messages";`. Remplacer `export function messageOf(e: unknown): string { … }` (lignes 86 à 88 de la base) par :

```ts
/** Texte d'une erreur : `messages.ts` (OF13, D9), réexporté ici pour ses importeurs. */
export { messageOf };
```

    Remplacer le bloc `const fail = async (prefix: string, e: unknown): Promise<false> => { … };` (lignes 108 à 117 de la base) par :

```ts
  const say = async (text: string): Promise<false> => {
    try {
      await d.shell.notify(text);
    } catch (boxError) {
      console.warn(`RoomBoard : ${text}`); // l'erreur d'origine, sinon perdue avec celle de la boîte
      throw boxError;
    }
    return false;
  };
  const fail = (prefix: string, e: unknown): Promise<false> => say(`${prefix} : ${messageOf(e)}`);
```

    Dans `open()`, remplacer `return fail(\`Ouverture impossible (${file.name})\`, e);` par `return say(openFailedMessage(file.name, e));`.
  - `apps/web/src/platform/import.ts:16` : `import { messageOf } from "./controller";` devient, sur la même ligne, `import { messageOf, openFailedMessage } from "./messages";`. Ligne 155 : `await ctx.notify(\`Ouverture impossible (${f.name}) : ${messageOf(e)}\`);` devient `await ctx.notify(openFailedMessage(f.name, e));`. Aucune ligne ajoutée ni retirée dans `import.ts`.
  - `apps/web/src/platform/mount.ts:7` : `import { messageOf } from "./controller";` devient `import { messageOf, openFailedMessage } from "./messages";`. Ligne 48 : ``error: `Ouverture impossible (${opened.name}) : ${messageOf(e)}` `` devient `error: openFailedMessage(opened.name, e)`.
  - `apps/web/src/app/open-export.ts` : après la ligne 10, ajouter `import { openFailedMessage } from "../platform/messages";`. Remplacer les lignes 32-33 (commentaire et `export const openFailedMessage = …`) par :

```ts
/** « Ouverture impossible (<nom>) : <message> » : `platform/messages.ts` (OF13, D9), réexporté ici (page, CLI). */
export { openFailedMessage };
```

  - `apps/web/src/app/container-io.ts:13` : `import { messageOf } from "../platform/controller";` devient `import { openFailedMessage } from "../platform/messages";`. Lignes 155, 164, 181, 188 : ``await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);`` devient `await say(openFailedMessage(name, e));` (ligne 164 : `openFailedMessage(name, e2)`).
  - `apps/web/src/app/pdf-convert.ts` : après la ligne 11 (`import { PDF_EXTENSION, … } from "../platform/files";`), ajouter `import { openFailedMessage } from "../platform/messages";`. Ligne 43 devient :

```ts
const failed = (name: string, why: string): Error => new Error(openFailedMessage(name, why));
```

- [ ] **7. Le voir vert, avec les tests gardés.** Commande bornée de la section (web), puis typage :
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"` → `code 0`.
Puis le gabarit n'existe plus qu'une fois :
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2 && grep -rn 'Ouverture impossible (\${' apps/web/src apps/cli/src --include=*.ts | grep -v '\.test\.ts'` → une seule ligne, `apps/web/src/platform/messages.ts:<n>:export const openFailedMessage = …`. Et `grep -c messageOf apps/web/src/app/container-io.ts` → `0`.

- [ ] **8. CLI.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/cli && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"` → `code 0` ; puis la commande CLI bornée de la section.

- [ ] **9. Suite web complète.**
`node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2/apps/web && nice -n 10 npx vitest run 2>&1 | tail -15'`
Attendu : aucune ligne `FAIL `, `Tests  N passed` avec N ≥ 3208 (référence 3202 + 6).

- [ ] **10. Commit.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T2 && git add apps/web/src/platform/messages.ts apps/web/src/platform/messages.test.ts apps/web/src/platform/controller-open-failed.test.ts apps/web/src/platform/controller.ts apps/web/src/platform/import.ts apps/web/src/platform/mount.ts apps/web/src/app/open-export.ts apps/web/src/app/container-io.ts apps/web/src/app/pdf-convert.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "refactor(platform): shared messages leaf for messageOf and openFailedMessage (OF13 D9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t3"></a>
### Tâche T3 — Feuille `import-handler.ts` et `officeErrorCode` (D5, D8)

**Objectif.** Casser le bloc de 6 fichiers `import, office-import, model3d-handlers, image-import, media-import,
table-insert` (constat `office-import.ts:40`) : le contrat d'un gestionnaire (`ImportContext`, `ImportOutcome`,
`ImportHandler`, `ImageTarget`, `StageRect`) et les aides sans registre (`hasExtension`, `ZIP_MAGIC`, `hasZipMagic`,
`SHEET_MAX_BYTES`, `isSheetName`) partent, à l'identique, dans la feuille `platform/import-handler.ts`, qui n'importe
que des types. `import.ts` réexporte les dix noms ; `image-import.ts` réexporte `ImageTarget` et `StageRect`.
`OFFICE_MAX_BYTES = SHEET_MAX_BYTES`. Le commentaire « cycle d'import » d'`office-import.ts` est retiré. Puis D8 :
`officeErrorCode(e)` exporté par `office-import.ts`, appelé par `officeHandler` et par `readDoc` de la CLI
(`apps/cli/src/session.ts:195`), codes de sortie inchangés (3 sur `no-program`, 1 sinon).

**Fichiers.**
- Créer : `apps/web/src/platform/import-handler.ts`, `apps/web/src/platform/import-handler.test.ts`, `apps/web/src/platform/office-error-code.test.ts`
- Modifier : `apps/web/src/platform/import.ts:20-21,27,96-140,163-168,219-225`, `apps/web/src/platform/office-import.ts:7,10,17-18,134`, `apps/web/src/platform/model3d-handlers.ts:13`, `apps/web/src/platform/media-import.ts:10`, `apps/web/src/platform/image-import.ts:6-13,16,141-148,181-201`, `apps/cli/src/session.ts:29,195`

**Interfaces.**
- Consomme : T2 — `import.ts:16` vaut `import { messageOf, openFailedMessage } from "./messages";` et `import.ts` a gardé son nombre de lignes (les numéros ci-dessous sont ceux de la base, contrôlés à l'étape 5).
- Produit : `apps/web/src/platform/import-handler.ts` → `export interface StageRect`, `export interface ImageTarget`, `export interface ImportContext`, `export type ImportOutcome = "opened" | "inserted" | "failed"`, `export interface ImportHandler`, `export function hasExtension(name: string, ext: string): boolean`, `export const ZIP_MAGIC: readonly number[]`, `export const hasZipMagic = (head: Uint8Array): boolean`, `export const SHEET_MAX_BYTES = 100 * 1024 * 1024`, `export function isSheetName(name: string): boolean`. `apps/web/src/platform/office-import.ts` → `export function officeErrorCode(e: unknown): string`.
- Réutilise : `apps/web/src/platform/import.ts:96-135,137,165-167,220-224` et `apps/web/src/platform/image-import.ts:142,182` — types `ImportContext`, `ImportOutcome`, `ImportHandler`, `ImageTarget`, `StageRect` ; `hasExtension(name, ext): boolean`, `ZIP_MAGIC`, `hasZipMagic(head): boolean`, `SHEET_MAX_BYTES`, `isSheetName(name): boolean`, déplacés tels quels dans `platform/import-handler.ts`.
- Réutilise : `apps/web/src/platform/import.ts:220` — `SHEET_MAX_BYTES`, lu par `OFFICE_MAX_BYTES = SHEET_MAX_BYTES`.
- Réutilise : `apps/web/src/platform/office-import.ts:134` — `officeErrorCode(e: unknown): string` (module étendu, dans les fichiers touchés), appelé par `apps/cli/src/session.ts:195`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web && nice -n 10 npx vitest run src/platform/import-handler.test.ts src/platform/office-error-code.test.ts src/platform/import.test.ts src/platform/office-import.test.ts src/platform/model3d-handlers.test.ts src/platform/media-import.test.ts src/platform/image-import.test.ts src/platform/table-insert.test.ts src/platform/host-tauri.test.ts 2>&1 | tail -15`
Motif de preuve : `Test Files  9 passed (9)`, `import-handler.test.ts` et `office-error-code.test.ts` nommés, aucune ligne `FAIL `.
CLI : `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/cli && nice -n 10 npx vitest run src/office.test.ts src/session.test.ts src/import.test.ts src/media.test.ts src/images.test.ts 2>&1 | tail -15` → `Test Files  5 passed (5)`, aucune ligne `FAIL ` (D79 de `office-node.test.ts` n'est pas dans la liste ; `office.test.ts` lance LibreOffice, lent).

**Preuve visuelle.** Sans objet : aucune interface ne change.

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : textes, codes de sortie de la CLI (3 sur `no-program`, 1 sur un autre échec de conversion), ordre des avis identiques.
- GC2 — Tests existants non réécrits sur le fond ; aucun test existant ne change dans cette tâche ; les tests neufs vont dans `import-handler.test.ts` et `office-error-code.test.ts`.
- GC3 — Les dix noms restent exportés par `import.ts`, `ImageTarget` et `StageRect` par `image-import.ts` (H3) : `import.test.ts:8-12`, `table-insert.ts:16`, `apps/cli/src/importer.ts:16` ne changent pas.
- GC7 — Aucune dépendance ajoutée.
- GC8 — Builds et tests en `nice -n 10` ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag, aucune release.
- GC10 — Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 — Fixtures du dépôt seulement.
- GC12 — Aucune commande, opération ni sortie de la CLI ne change ; `cli-essai.mjs` et `FORMAT_LOTS` non touchés.

**Interdits.** Renommer `ImageTarget` (constat l. 19, H4, hors périmètre) ; sortir un gestionnaire d'`import.ts` (reste du candidat E) ; faire importer `import.ts` ou `image-import.ts` par `import-handler.ts` ; un import de valeur dans `import-handler.ts` ; toucher les lignes 16 et 155 d'`import.ts` (T2).

**Critère « terminé ».** Étapes 1 à 12 faites ; un commit ; rapport avec la sortie des étapes 9, 10 et 11 et les lignes
`Réutilisation : appelé platform/import-handler.ts (contrat, aides, SHEET_MAX_BYTES)` et `Réutilisation : appelé office-import.ts (officeErrorCode) depuis session.ts`, ou `Réutilisation : écart — <pourquoi>`.

- [ ] **1. Préparer le worktree** (branche à jour de T2). Dossier de la tâche : `/home/adminjd/projets/roomboard-wt/platform-feuilles--T3` ; si l'orchestrateur en donne un autre, remplacer ce préfixe dans toutes les commandes.

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/wasm
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm-formats /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/wasm-formats
mkdir -p /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/target/debug && cp /home/adminjd/projets/roomboard-wt/platform-feuilles/target/debug/roomboard-office /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/target/debug/
grep -n 'from "./messages"' /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/platform/import.ts
```

Attendu (dernière commande) : `16:import { messageOf, openFailedMessage } from "./messages";`. Sinon : arrêter, T2 n'est pas fusionnée.

- [ ] **2. Écrire les tests rouges.** `apps/web/src/platform/import-handler.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type * as Image from "./image-import";
import * as registry from "./import";
import { hasExtension, hasZipMagic, isSheetName, SHEET_MAX_BYTES, ZIP_MAGIC, type ImageTarget, type ImportContext, type ImportHandler, type ImportOutcome, type StageRect } from "./import-handler";
import { OFFICE_MAX_BYTES } from "./office-import";

/** Vrai seulement si A et B sont le même type (contrôlé par `tsc --noEmit`). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe("import-handler (OF13, D5)", () => {
  it("hasExtension : fin de nom sans casse, jamais le nom seul", () => {
    expect(hasExtension("Cours.XLSX", ".xlsx")).toBe(true);
    expect(hasExtension(".xlsx", ".xlsx")).toBe(false);
    expect(hasExtension("a.xls", ".xlsx")).toBe(false);
  });

  it("ZIP_MAGIC figé, hasZipMagic sur les 4 premiers octets", () => {
    expect([...ZIP_MAGIC]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Object.isFrozen(ZIP_MAGIC)).toBe(true);
    expect(hasZipMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe(true);
    expect(hasZipMagic(new Uint8Array([0x50, 0x4b]))).toBe(false);
  });

  it("SHEET_MAX_BYTES vaut 100 Mio, OFFICE_MAX_BYTES vaut SHEET_MAX_BYTES ; isSheetName : .xlsx et .xlsm", () => {
    expect(SHEET_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(OFFICE_MAX_BYTES).toBe(SHEET_MAX_BYTES);
    expect([isSheetName("a.xlsx"), isSheetName("B.XLSM"), isSheetName("c.xls"), isSheetName(".xlsx")]).toEqual([true, true, false, false]);
  });

  it("mêmes valeurs réexportées par import.ts (H3)", () => {
    expect(registry.hasExtension).toBe(hasExtension);
    expect(registry.hasZipMagic).toBe(hasZipMagic);
    expect(registry.isSheetName).toBe(isSheetName);
    expect(registry.ZIP_MAGIC).toBe(ZIP_MAGIC);
    expect(registry.SHEET_MAX_BYTES).toBe(SHEET_MAX_BYTES);
  });

  it("mêmes types réexportés par import.ts et image-import.ts (H3, contrôlé par tsc)", () => {
    const same: [
      Same<Image.ImageTarget, ImageTarget>,
      Same<Image.StageRect, StageRect>,
      Same<registry.ImageTarget, ImageTarget>,
      Same<registry.StageRect, StageRect>,
      Same<registry.ImportContext, ImportContext>,
      Same<registry.ImportHandler, ImportHandler>,
      Same<registry.ImportOutcome, ImportOutcome>,
    ] = [true, true, true, true, true, true, true];
    expect(same.every(Boolean)).toBe(true);
  });

  it("feuille : n'importe que des types, jamais le registre", () => {
    const lines = readFileSync(new URL("./import-handler.ts", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => /^(import|export .* from)\s/.test(l));
    expect(lines.filter((l) => !l.startsWith("import type "))).toEqual([]);
    expect(lines.filter((l) => l.includes('"./import"') || l.includes('"./image-import"'))).toEqual([]);
  });
});
```

`apps/web/src/platform/office-error-code.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { OfficeConvertError, officeErrorCode } from "./office-import";

describe("officeErrorCode (OF13, D8)", () => {
  it("code d'un OfficeConvertError, sinon failed", () => {
    expect(officeErrorCode(new OfficeConvertError("no-program"))).toBe("no-program");
    expect(officeErrorCode(new OfficeConvertError("timeout"))).toBe("timeout");
    expect(officeErrorCode(new Error("no-program"))).toBe("failed");
    expect(officeErrorCode("no-program")).toBe("failed");
    expect(officeErrorCode(undefined)).toBe("failed");
  });
});
```

- [ ] **3. Les voir rouges.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web && nice -n 10 npx vitest run src/platform/import-handler.test.ts src/platform/office-error-code.test.ts 2>&1 | tail -15`
Attendu : 2 fichiers `FAIL` — chargement de `./import-handler` impossible ; `officeErrorCode is not a function`.

- [ ] **4. Contrôler les numéros de ligne** (ceux de la base ; T2 n'en a ajouté aucun) :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/platform && sed -n '96p;136p;163p;167p;219p;222p' import.ts && sed -n '141p;142p;181p;182p;200p' image-import.ts
```

Attendu, dans l'ordre : `export interface ImportContext {` · `/** Nom qui se termine par …` · `/** En-tête d'un ZIP …` · `export const hasZipMagic = …` · `/** Plafond d'un classeur (F22) …` · `export function isSheetName(name: string): boolean {` · `/** Rectangle du stage actif …` · `export interface StageRect {` · `/** Onglet qui reçoit les objets (R3) …` · `export interface ImageTarget {` · `}`. Un écart : arrêter et le rapporter.

- [ ] **5. Créer `import-handler.ts` par extraction exacte** (le texte déplacé est celui des sources, octet pour octet) :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/platform && {
cat <<'EOF'
/**
 * Contrat d'un gestionnaire d'import et aides sans registre (OF13, cadrage platform-feuilles D5) : feuille que le registre
 * (`import.ts`) et ses gestionnaires (`office-import`, `model3d-handlers`, `media-import`, `image-import`) importent sans
 * cycle ; elle n'importe que des types. `import.ts` réexporte ces dix noms, `image-import.ts` réexporte `ImageTarget` et
 * `StageRect`.
 */
import type { Change, Command } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { Camera } from "../engine/camera";
import type { Measure } from "../engine/text-layout";
import type { DroppedFile, Notify, Point } from "./files";

EOF
sed -n '141,148p' image-import.ts
sed -n '181,201p' image-import.ts
sed -n '96,140p' import.ts
sed -n '163,167p' import.ts
echo
sed -n '219,224p' import.ts
} > import-handler.ts
```

- [ ] **6. Retirer le texte déplacé des sources.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web/src/platform && sed -i -e '96,140d' -e '163,168d' -e '219,225d' import.ts && sed -i -e '141,148d' -e '181,201d' image-import.ts
```

- [ ] **7. Brancher les importeurs.**
  - `import.ts` : après `import type { TableGrid } from "./html-table";`, ajouter `import { hasExtension, hasZipMagic, isSheetName, SHEET_MAX_BYTES, type ImageTarget, type ImportHandler, type ImportOutcome } from "./import-handler";`. La ligne `import { HEAD_BYTES, imageHandler, type ImageDecoder, type ImageTarget } from "./image-import";` devient `import { HEAD_BYTES, imageHandler, type ImageDecoder } from "./image-import";`. Après la dernière ligne d'import (`import { officeHandler, … } from "./office-import";`), ajouter :

```ts

/** Contrat d'un gestionnaire et aides sans registre : `import-handler.ts` (OF13, D5), réexportés ici pour leurs importeurs. */
export { hasExtension, hasZipMagic, isSheetName, SHEET_MAX_BYTES, ZIP_MAGIC, type ImageTarget, type ImportContext, type ImportHandler, type ImportOutcome, type StageRect } from "./import-handler";
```

  - `image-import.ts` : les lignes d'import 6 à 13 deviennent (`Change`, `Command`, `AssetStore`, `Measure` ne servaient qu'à `ImageTarget`) :

```ts
import type { Matrix } from "../core/api";
import { screenToWorld, type Camera } from "../engine/camera";
import { PAGE_WIDTH } from "../engine/page";
import { messageOf } from "./controller";
import type { Point } from "./files";
import type { ImportHandler, StageRect } from "./import-handler";
```

    et après la ligne `export { DISPLAY_MAX, ImageTooLargeError, … } from "./image-decode";`, ajouter :

```ts
/** Cible d'import et rectangle du stage : `import-handler.ts` (OF13, D5), réexportés ici pour leurs importeurs. */
export type { ImageTarget, StageRect } from "./import-handler";
```

  - `model3d-handlers.ts:13` : `import { hasZipMagic, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";` → `… from "./import-handler";`.
  - `media-import.ts:10` : `import type { ImportContext, ImportHandler, ImportOutcome } from "./import";` → `… from "./import-handler";`.
  - `office-import.ts` : supprimer la ligne 7 (` * Cycle d'import avec \`import.ts\` : aucune constante de ce module ne lit une valeur importée (fonctions seulement).`). La ligne d'import `import { hasExtension, hasZipMagic, isSheetName, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";` devient `import { hasExtension, hasZipMagic, isSheetName, SHEET_MAX_BYTES, type ImportContext, type ImportHandler, type ImportOutcome } from "./import-handler";`. Les deux lignes du plafond deviennent :

```ts
/** Plafond de tout fichier Office (O14) : 100 Mio, la valeur de `SHEET_MAX_BYTES`. */
export const OFFICE_MAX_BYTES = SHEET_MAX_BYTES;
```

- [ ] **8. D8 : `officeErrorCode`.** Dans `office-import.ts`, juste après la fermeture de `export class OfficeConvertError … }`, ajouter :

```ts

/** Code d'échec d'une conversion (OF13, D8) : `code` d'un `OfficeConvertError`, sinon `failed`. Lu par `officeHandler` et
 *  par `readDoc` de la CLI, qui garde ses règles (code 3 sur `no-program` : D56, D59 du cadrage cli-lot4). */
export function officeErrorCode(e: unknown): string {
  return e instanceof OfficeConvertError ? e.code : "failed";
}
```

    Dans `officeHandler`, `const code = e instanceof OfficeConvertError ? e.code : "failed";` devient `const code = officeErrorCode(e);`.
    Dans `apps/cli/src/session.ts`, ligne 29 : `import { convertFailureMessage, OfficeConvertError } from "../../web/src/platform/office-import";` devient `import { convertFailureMessage, officeErrorCode } from "../../web/src/platform/office-import";` ; ligne 195 : `const code = e instanceof OfficeConvertError ? e.code : "failed";` devient `const code = officeErrorCode(e);`.

- [ ] **9. Les voir verts, avec les tests gardés.** Commande bornée de la section (web). Puis typage web et CLI :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/cli && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3 && grep -rn 'from "./import"' apps/web/src/platform/office-import.ts apps/web/src/platform/model3d-handlers.ts apps/web/src/platform/media-import.ts apps/web/src/platform/image-import.ts; grep -rn 'instanceof OfficeConvertError ? e.code' apps --include=*.ts | grep -v '\.test\.ts'
```

Attendu : `code 0` deux fois ; le premier `grep` ne rend rien ; le second rend la seule ligne de `officeErrorCode` dans `office-import.ts`.

- [ ] **10. CLI.** Commande CLI bornée de la section.

- [ ] **11. Suite web complète.**
`node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3/apps/web && nice -n 10 npx vitest run 2>&1 | tail -15'`
Attendu : aucune ligne `FAIL `, `Tests  N passed` avec N ≥ 3209 (référence 3202 + 7 de cette tâche).

- [ ] **12. Commit.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T3 && git add apps/web/src/platform/import-handler.ts apps/web/src/platform/import-handler.test.ts apps/web/src/platform/office-error-code.test.ts apps/web/src/platform/import.ts apps/web/src/platform/office-import.ts apps/web/src/platform/model3d-handlers.ts apps/web/src/platform/media-import.ts apps/web/src/platform/image-import.ts apps/cli/src/session.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "refactor(platform): import-handler leaf breaks the import registry cycle; officeErrorCode shared with the CLI (OF13 D5 D8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t4"></a>
### Tâche T4 — Codec `board-list.ts`, `olf-read.ts` et `ZipFile` dans `platform/` (D6, D7)

**Objectif.** Supprimer les 3 imports `platform → app` (constat `zip-worker.ts:25`) et le cycle de types
`board-reader ↔ zip-read`. Le codec du flux BoardList (`app/board-io.ts:23-48,63-343`, sans `BoardFormat`,
`BoardSourceFormat` ni `BoardPorts`) part dans la feuille `platform/board-list.ts` avec `BOARD_OBJECTS_MESSAGE`
(de `board-reader.ts:35`), `BOARD_MAX_OBJECTS` (`board-files.ts:16`) et `SKIPPED_LABEL` (`board-files.ts:129`) ; elle
n'importe que des types de `core/api`. `app/olf-read.ts` déménage entier dans `platform/` (`git mv`, avec son test).
`ZipFile` passe dans `platform/archive-path.ts`. `board-io.ts`, `board-files.ts`, `board-reader.ts` et `zip-read.ts`
réexportent ce qu'ils exportaient. Le Worker reste à `platform/zip-worker.ts`.

**Fichiers.**
- Créer : `apps/web/src/platform/board-list.ts`, `apps/web/src/platform/board-list.test.ts`
- Déplacer : `apps/web/src/app/olf-read.ts` → `apps/web/src/platform/olf-read.ts` ; `apps/web/src/app/olf-read.test.ts` → `apps/web/src/platform/olf-read.test.ts`
- Modifier : `apps/web/src/app/board-io.ts:9,12,22-48,63-344`, `apps/web/src/app/board-files.ts:5-9,15-16,129`, `apps/web/src/platform/board-reader.ts:13,16,34-35`, `apps/web/src/platform/archive-path.ts`, `apps/web/src/platform/zip-read.ts:9,16-20`, `apps/web/src/platform/zip-worker.ts:30-31`, `apps/web/src/platform/olf-read.ts:10-12`, `apps/web/src/platform/olf-read.test.ts:2-3`, `apps/web/src/platform/zip-read.test.ts:7`, `apps/web/src/platform/zip-worker.test.ts:7`

**Interfaces.**
- Consomme : rien.
- Produit : `apps/web/src/platform/board-list.ts` → `BOARD_OBJECTS_MESSAGE`, `BOARD_MAX_OBJECTS = 100_000`, `SKIPPED_LABEL`, `MAX_GROUP_DEPTH`, `BOARD_OP`, `BOARD_BAD_LIST_PREFIX`, `MAX_POINTS`, `MAX_SPANS`, types `BoardObject`, `BoardListPage`, `BoardListData`, `hexOf(r, g, b): string`, `rgbOf(color): [number, number, number]`, `decodeBoardList(ops: ArrayLike<number>, texts: readonly string[], budget?: number): BoardListPage[]`, `encodeBoardList(pages: readonly BoardListPage[]): BoardListData`. `apps/web/src/platform/olf-read.ts` → mêmes exports qu'`app/olf-read.ts` (`readOlf`, `OLF_MAX_JSON_BYTES`, `OLF_TOO_BIG_MESSAGE`, `OLF_BROKEN_MESSAGE`, `olfColor`, `olfMatrix`, …). `apps/web/src/platform/archive-path.ts` → `export interface ZipFile { readonly path: string; readonly bytes: Uint8Array }`.
- Réutilise : `apps/web/src/app/board-io.ts:20-344` — `encodeBoardList(pages): BoardListData`, `decodeBoardList(ops, texts, budget?): BoardListPage[]`, `hexOf`, `rgbOf`, `BOARD_OP`, `MAX_POINTS`, `MAX_SPANS`, `MAX_GROUP_DEPTH`, `BOARD_BAD_LIST_PREFIX`, types `BoardObject`, `BoardListPage`, `BoardListData`, plus `BOARD_MAX_OBJECTS`, `SKIPPED_LABEL`, `BOARD_OBJECTS_MESSAGE`, déplacés tels quels dans `platform/board-list.ts`.
- Réutilise : `apps/web/src/app/olf-read.ts:287` — `readOlf`, `OLF_MAX_JSON_BYTES`, `OLF_TOO_BIG_MESSAGE`, déplacés par `git mv` dans `platform/olf-read.ts`.
- Réutilise : `apps/web/src/platform/zip-read.ts:17` — `ZipFile`, par extension de `apps/web/src/platform/archive-path.ts` (feuille existante, dans les fichiers touchés).

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web && nice -n 10 npx vitest run src/platform/board-list.test.ts src/platform/olf-read.test.ts src/platform/zip-read.test.ts src/platform/zip-worker.test.ts src/platform/board-reader.test.ts src/platform/rbpack.test.ts src/app/board-io.test.ts src/app/board-files.test.ts src/app/board-convert.test.ts src/app/open-export.test.ts 2>&1 | tail -15`
Motif de preuve : `Test Files  10 passed (10)`, `board-list.test.ts` et `olf-read.test.ts` nommés sous `src/platform/`, aucune ligne `FAIL `.
CLI : `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/cli && nice -n 10 npx vitest run src/boards.test.ts src/convert.test.ts src/board-node.test.ts src/library.test.ts 2>&1 | tail -15` → `Test Files  4 passed (4)`, aucune ligne `FAIL `.

**Preuve visuelle.** Sans objet : aucune interface ne change ; le chunk du Worker est contrôlé par T5 (S4).

**Contraintes (recopiées).**
- GC1 — Refactor sans changement de comportement : textes, codes de sortie de la CLI, ordre des avis identiques.
- GC2 — Tests existants non réécrits sur le fond. Seules 4 lignes d'import changent : `olf-read.test.ts:2` et `:3` (fichier déplacé), `zip-read.test.ts:7`, `zip-worker.test.ts:7`. `zip-worker.test.ts:6` (`decodeBoardList` de `../app/board-io`) ne change pas : c'est voulu (D2).
- GC3 — Chaque nom déplacé reste exporté par son module d'origine (H3). Seule exception : `olf-read`, qui déménage entier.
- GC5 — Le Worker ZIP, chargé par `new Worker(new URL("./platform/zip-worker.ts", import.meta.url))` (`main.ts:220`), reste sans DOM et n'importe que des fichiers de `platform/` ; `main.ts` ne change pas.
- GC6 — Aucun Rust touché ; modules Wasm inchangés.
- GC7 — Aucune dépendance ajoutée.
- GC8 — Builds et tests en `nice -n 10` ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag, aucune release.
- GC10 — Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 — Fixtures du dépôt seulement.

**Interdits.** Changer une ligne du codec en le déplaçant ; déplacer `BoardFormat`, `BoardSourceFormat`, `BoardPorts` ou `boardFirstPagesMessage` ; déplacer `sniffImage` (`zip-worker.ts:28`, hors périmètre) ; toucher `main.ts` ; mettre à jour les docs historiques qui citent `app/olf-read.ts`.

**Précision sur le cadrage.** `olf-read.test.ts:3` importe aussi `boardFirstPagesMessage`, qui reste dans
`app/board-files.ts` : la ligne 3 devient `../app/board-files` (et non `./board-list`). Le compte de 4 lignes tient.

**Critère « terminé ».** Étapes 1 à 12 faites ; un commit ; rapport avec la sortie des étapes 8, 9, 10 et 12 et les lignes
`Réutilisation : appelé platform/board-list.ts (codec)`, `Réutilisation : appelé platform/olf-read.ts (readOlf)`, `Réutilisation : appelé platform/archive-path.ts (ZipFile)`, ou `Réutilisation : écart — <pourquoi>`.

- [ ] **1. Préparer le worktree.** Dossier de la tâche : `/home/adminjd/projets/roomboard-wt/platform-feuilles--T4` ; si l'orchestrateur en donne un autre, remplacer ce préfixe dans toutes les commandes.

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4 && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web/src/wasm
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm-formats /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web/src/wasm-formats
```

- [ ] **2. Écrire le test rouge** `apps/web/src/platform/board-list.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as boardFiles from "../app/board-files";
import * as boardIo from "../app/board-io";
import type * as ArchivePath from "./archive-path";
import {
  BOARD_BAD_LIST_PREFIX, BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, BOARD_OP, decodeBoardList, encodeBoardList, hexOf, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS, rgbOf, SKIPPED_LABEL,
  type BoardListData, type BoardListPage, type BoardObject,
} from "./board-list";
import * as boardReader from "./board-reader";
import type * as Rbpack from "./rbpack";
import type * as ZipRead from "./zip-read";

/** Vrai seulement si A et B sont le même type (contrôlé par `tsc --noEmit`). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const pages: BoardListPage[] = [
  {
    background: "#ffffff",
    objects: [
      { kind: "shape", shape: "ellipse", m: [1, 0, 0, 1, 10, 20], x0: 0, y0: 0, x1: 50, y1: 40, color: "#ff0000", width: 2, fill: "#00ff00" },
      { kind: "stroke", m: [1, 0, 0, 1, 0, 0], color: "#000000", width: 3, points: [0, 0, 0.5, 10, 10, 0.5] },
      {
        kind: "group",
        children: [
          { kind: "text", m: [1, 0, 0, 1, 0, 0], x: 5, y: 6, boxWidth: 100, boxHeight: 20, size: 16, color: "#123456", spans: [{ text: "Bonjour", attrs: { bold: true, color: "#abcdef", size: 18, font: "Arial" } }, { text: "monde", attrs: {} }] },
          { kind: "image", m: [1, 0, 0, 1, 0, 0], x: 0, y: 0, w: 64, h: 32, path: "images/a.png" },
        ],
      },
    ],
  },
  { background: null, objects: [] },
];

describe("board-list (OF13, D6)", () => {
  it("aller-retour encode → decode identique", () => {
    const list = encodeBoardList(pages);
    expect(decodeBoardList(list.ops, list.texts)).toEqual(pages);
  });

  it("textes internés à leur première apparition", () => {
    expect(encodeBoardList(pages).texts).toEqual(["Bonjour", "Arial", "monde", "images/a.png"]);
  });

  it("budget d'objets : les feuilles comptent, BOARD_OBJECTS_MESSAGE dès la première de trop", () => {
    const list = encodeBoardList(pages);
    expect(() => decodeBoardList(list.ops, list.texts, 3)).toThrow(BOARD_OBJECTS_MESSAGE);
    expect(decodeBoardList(list.ops, list.texts, 4)).toHaveLength(2);
  });

  it("flux coupé : liste de tableau invalide", () => {
    expect(() => decodeBoardList([BOARD_OP.page, BOARD_OP.shape], [])).toThrow(BOARD_BAD_LIST_PREFIX);
  });

  it("bornes et libellés à l'identique", () => {
    expect([BOARD_MAX_OBJECTS, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS]).toEqual([100_000, 256, 1_000_000, 10_000]);
    expect(BOARD_OBJECTS_MESSAGE).toBe("fichier de tableau trop gros (plus de 100 000 objets)");
    expect(SKIPPED_LABEL).toEqual(["objet illisible ignoré", "objets illisibles ignorés"]);
    expect([hexOf(1, 2, 255), rgbOf("#0102ff"), rgbOf("rouge")]).toEqual(["#0102ff", [1, 2, 255], [0, 0, 0]]);
  });

  it("mêmes valeurs réexportées par board-io, board-files et board-reader (H3)", () => {
    expect(boardIo.encodeBoardList).toBe(encodeBoardList);
    expect(boardIo.decodeBoardList).toBe(decodeBoardList);
    expect(boardIo.hexOf).toBe(hexOf);
    expect(boardIo.rgbOf).toBe(rgbOf);
    expect([boardIo.BOARD_OP, boardIo.MAX_GROUP_DEPTH, boardIo.MAX_POINTS, boardIo.MAX_SPANS, boardIo.BOARD_BAD_LIST_PREFIX]).toEqual([BOARD_OP, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS, BOARD_BAD_LIST_PREFIX]);
    expect(boardFiles.SKIPPED_LABEL).toBe(SKIPPED_LABEL);
    expect([boardFiles.BOARD_MAX_OBJECTS, boardFiles.BOARD_OBJECTS_MESSAGE, boardReader.BOARD_OBJECTS_MESSAGE]).toEqual([BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, BOARD_OBJECTS_MESSAGE]);
    const same: [
      Same<boardIo.BoardObject, BoardObject>,
      Same<boardIo.BoardListPage, BoardListPage>,
      Same<boardIo.BoardListData, BoardListData>,
      Same<ZipRead.ZipFile, ArchivePath.ZipFile>,
      Same<Rbpack.ZipFile, ArchivePath.ZipFile>,
    ] = [true, true, true, true, true];
    expect(same.every(Boolean)).toBe(true);
  });

  it("feuille : n'importe que des types de core/api", () => {
    const lines = readFileSync(new URL("./board-list.ts", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => /^(import|export .* from)\s/.test(l));
    expect(lines).toEqual(['import type { Matrix, ShapeKind, TextSpan } from "../core/api";']);
  });

  it("le Worker ZIP et zip-read n'importent plus app/", () => {
    for (const f of ["./zip-worker.ts", "./zip-read.ts", "./olf-read.ts"]) {
      expect(readFileSync(new URL(f, import.meta.url), "utf8"), f).not.toMatch(/from "\.\.\/app\//);
    }
  });
});
```

- [ ] **3. Le voir rouge.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web && nice -n 10 npx vitest run src/platform/board-list.test.ts 2>&1 | tail -15`
Attendu : `FAIL  src/platform/board-list.test.ts`, chargement de `./board-list` impossible.

- [ ] **4. Créer `board-list.ts` par extraction exacte**, puis retirer le codec de `board-io.ts` :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web/src && sed -n '23p;48p;63p;343p' app/board-io.ts
```

Attendu : `/** Même borne que \`MAX_GROUP_DEPTH\` …` · `}` · `const bad = (m: string): Error => …` · `}`. Un écart : arrêter et le rapporter.

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web/src && {
cat <<'EOF'
/**
 * Flux BoardList (C13, DA2 ; OF13, cadrage platform-feuilles D6) : codage et décodage du flux plat que le module `formats`
 * lit et écrit, et ses bornes. Feuille : n'importe que des types de `core/api`, aucun DOM. Lue par la page
 * (`app/board-io.ts`, qui réexporte tout), le Worker ZIP (`zip-worker.ts`) et le lecteur `.olf` (`olf-read.ts`).
 * Table des codes : `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
 */
import type { Matrix, ShapeKind, TextSpan } from "../core/api";

/** `BoardError::TooBig` (`board.rs`). */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
/** D16 : borne par fichier (`.ubz` : toutes pages ensemble). */
export const BOARD_MAX_OBJECTS = 100_000;
/** Libellés (singulier, pluriel) des objets illisibles, que la page et le lecteur Rust écrivent à l'identique. */
export const SKIPPED_LABEL = ["objet illisible ignoré", "objets illisibles ignorés"] as const;
EOF
sed -n '23,48p' app/board-io.ts
echo
sed -n '63,343p' app/board-io.ts
} > platform/board-list.ts && sed -i -e '23,48d' -e '63,344d' app/board-io.ts
```

- [ ] **5. `board-io.ts` importe et réexporte.** Ligne 9 (`import { DEFAULT_BACKGROUND, … } from "../core/api";`) devient :

```ts
import { DEFAULT_BACKGROUND, PAGE_WIDTH, type AssetRef, type Change, type Command, type CoreDocument, type CoreFactory, type ElementView, type Matrix, type TextSpan } from "../core/api";
```

Ligne 12 (`import { BOARD_OBJECTS_MESSAGE, normalBoardPath, … } from "../platform/board-reader";`) devient les deux lignes :

```ts
import { encodeBoardList, type BoardListData, type BoardListPage, type BoardObject } from "../platform/board-list";
import { normalBoardPath, type BoardDialect, type BoardPart, type BoardReadOptions, type BoardSourceFormat } from "../platform/board-reader";
```

Après la ligne `export type { BoardSourceFormat };`, ajouter :

```ts
/** Codec du flux BoardList et ses bornes : `platform/board-list.ts` (OF13, D6), réexportés ici pour leurs importeurs. */
export { BOARD_BAD_LIST_PREFIX, BOARD_OP, decodeBoardList, encodeBoardList, hexOf, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS, rgbOf, type BoardListData, type BoardListPage, type BoardObject } from "../platform/board-list";
```

- [ ] **6. `board-files.ts` et `board-reader.ts` réexportent.**
  - `apps/web/src/app/board-files.ts` : après la ligne `import { BAMBOO_STRUCTURE_EXTENSIONS } from "../platform/bamboo";`, ajouter `import { SKIPPED_LABEL } from "../platform/board-list";`. La ligne `export const BOARD_MAX_OBJECTS = 100_000;` devient `export { BOARD_MAX_OBJECTS, SKIPPED_LABEL } from "../platform/board-list";`. Supprimer la ligne `export const SKIPPED_LABEL = ["objet illisible ignoré", "objets illisibles ignorés"] as const;` (le commentaire au-dessus reste, pour `MISSING_LABEL`). `export { BOARD_OBJECTS_MESSAGE };` reste tel quel.
  - `apps/web/src/platform/board-reader.ts` : les lignes 13 et 16 (`import { normalArchivePath } from "./archive-path";` et `import type { ZipFile } from "./zip-read";`) deviennent :

```ts
import { normalArchivePath, type ZipFile } from "./archive-path";
import { BOARD_OBJECTS_MESSAGE } from "./board-list";
```

    et les lignes 34-35 (commentaire et `export const BOARD_OBJECTS_MESSAGE = …`) deviennent :

```ts
/** `BoardError::TooBig` (`board.rs`) : `board-list.ts` (OF13, D6), réexporté ici pour ses importeurs. */
export { BOARD_OBJECTS_MESSAGE };
```

- [ ] **7. `ZipFile`, `olf-read`, Worker.**
  - `apps/web/src/platform/archive-path.ts` : ajouter en fin de fichier :

```ts

/** Fichier à écrire dans une archive (C4) : chemin et octets. `zip-read.ts` (et `rbpack.ts` par lui) le réexporte (OF13, D7). */
export interface ZipFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}
```

  - `apps/web/src/platform/zip-read.ts` : ligne 9 `import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE } from "../app/olf-read";` devient `import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE } from "./olf-read";` ; ajouter avant la ligne 8 `import type { ZipFile } from "./archive-path";` ; les lignes 16-20 (commentaire et `export interface ZipFile { … }`) deviennent :

```ts
/** Fichier à écrire dans un ZIP (C4) : `archive-path.ts` (OF13, D7), réexporté ici pour `rbpack.ts` et ses importeurs. */
export type { ZipFile } from "./archive-path";
```

  - Déplacer le lecteur `.olf` et son test :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4 && git mv apps/web/src/app/olf-read.ts apps/web/src/platform/olf-read.ts && git mv apps/web/src/app/olf-read.test.ts apps/web/src/platform/olf-read.test.ts
```

  - `apps/web/src/platform/olf-read.ts` : les lignes 10 à 12 deviennent :

```ts
import { safeArchivePath } from "./archive-path";
import { BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, MAX_POINTS, MAX_SPANS, SKIPPED_LABEL, type BoardListPage, type BoardObject } from "./board-list";
```

  - `apps/web/src/platform/olf-read.test.ts` (seules lignes 2 et 3) : `import { MAX_POINTS, MAX_SPANS, type BoardObject } from "./board-io";` → `… from "./board-list";` ; `import { BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, boardFirstPagesMessage } from "./board-files";` → `… from "../app/board-files";`.
  - `apps/web/src/platform/zip-worker.ts:30-31` deviennent :

```ts
import { encodeBoardList } from "./board-list";
import { OLF_MAX_JSON_BYTES, OLF_TOO_BIG_MESSAGE, readOlf } from "./olf-read";
```

  - `apps/web/src/platform/zip-read.test.ts:7` et `zip-worker.test.ts:7` (seule ligne) : `from "../app/olf-read";` → `from "./olf-read";`.

- [ ] **8. Le voir vert, avec les tests gardés.** Commande bornée de la section (web), puis :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4 && grep -rn 'from "\.\./app/' apps/web/src/platform --include=*.ts | grep -v '\.test\.ts'; git grep -n "app/olf-read" -- apps scripts
```

Attendu : `code 0` ; les deux `grep` ne rendent rien.

- [ ] **9. CLI.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/cli && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"` → `code 0` ; puis la commande CLI bornée de la section.

- [ ] **10. Suite web complète.**
`node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4/apps/web && nice -n 10 npx vitest run 2>&1 | tail -15'`
Attendu : aucune ligne `FAIL `, `Tests  N passed` avec N ≥ 3210 (référence 3202 + 8).

- [ ] **11. Commit.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4 && git add apps/web/src/platform/board-list.ts apps/web/src/platform/board-list.test.ts apps/web/src/platform/olf-read.ts apps/web/src/platform/olf-read.test.ts apps/web/src/app/board-io.ts apps/web/src/app/board-files.ts apps/web/src/platform/board-reader.ts apps/web/src/platform/archive-path.ts apps/web/src/platform/zip-read.ts apps/web/src/platform/zip-worker.ts apps/web/src/platform/zip-read.test.ts apps/web/src/platform/zip-worker.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "refactor(platform): BoardList codec and olf reader move into platform; ZipFile joins archive-path (OF13 D6 D7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **12. Contrôler les tests existants (GC2).**
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles--T4 && git diff -M --numstat --diff-filter=MR 34d4d61 HEAD -- '*.test.ts'`
Attendu, exactement : `2	2	apps/web/src/{app => platform}/olf-read.test.ts`, `1	1	apps/web/src/platform/zip-read.test.ts`, `1	1	apps/web/src/platform/zip-worker.test.ts`.

---

<a id="tache-t5"></a>
### Tâche T5 — Garde `import-graph.test.ts` et preuves S1 à S5

**Objectif.** Poser la garde D2 (`apps/web/src/platform/import-graph.test.ts`) : (a) aucun cycle entre les fichiers
non-test de `platform/`, imports de type compris ; (b) aucun import d'un fichier non-test de `platform/` vers
`src/app/` ; (c) tout relatif se résout, sauf le dossier généré `wasm-formats/`. Prouver qu'elle est rouge sur la base
(`34d4d61`) et verte sur la tête, puis jouer les preuves S2 (CLI base = tête), S3 (tests existants), S4 (Worker ZIP sans
DOM, tailles) et la première moitié de S5 (`scripts/verifier.sh --e2e`). La fermeture des constats revient à
l'orchestrateur (section « Clôture »).

**Fichiers.**
- Créer : `apps/web/src/platform/import-graph.test.ts`
- Jetable, hors du dépôt : `/home/adminjd/.cache/tmp/of13-base` (worktree détaché sur `34d4d61`, retiré à la fin)

**Interfaces.**
- Consomme : la branche `refactor/platform-feuilles` avec T1 à T4 fusionnées, dans le worktree du chantier `/home/adminjd/projets/roomboard-wt/platform-feuilles` (Wasm, `target/debug/roomboard-office` et `node_modules` y sont déjà).
- Produit : la garde ; les sorties de preuve (pour `## Preuve` de la PR).
- Réutilise : paquet `typescript` (devDependency de `apps/web`, `apps/web/package.json:28`) — `ts.preProcessFile(text, true, true).importedFiles` ; aucune dépendance ajoutée.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web && nice -n 10 npx vitest run src/platform/import-graph.test.ts 2>&1 | tail -15`
Motif de preuve (tête) : `Tests  6 passed (6)`, `import-graph.test.ts` nommé. Sur la base (étape 4) : `Tests  2 failed | 4 passed (6)`.

**Preuve visuelle.** Sans objet : la preuve S4 est une lecture du chunk construit (étape 8), pas une capture.

**Contraintes (recopiées).**
- GC2 — Tests existants non réécrits sur le fond. Seules 4 lignes d'import changent : `olf-read.test.ts:2` et `:3`, `zip-read.test.ts:7`, `zip-worker.test.ts:7` (contrôlé à l'étape 7).
- GC5 — Le Worker ZIP reste sans DOM (contrôlé à l'étape 8).
- GC6 — Aucun Rust touché ; modules Wasm inchangés (1 374 215 o et 2 794 511 o).
- GC7 — Aucune dépendance ajoutée : `package.json` et `pnpm-lock.yaml` intacts.
- GC8 — Builds et tests en `nice -n 10`, `cargo … -j 4` (`CARGO_BUILD_JOBS=4`) ; suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- GC9 — Jamais `git add -A`, `git add .`, `git commit -a` ; aucun push, aucun tag, aucune release.
- GC10 — Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 — Fixtures du dépôt seulement ; écritures de la CLI sur des fichiers temporaires.
- GC12 — `cli-essai.mjs`, `cli-comparer.mjs` et `FORMAT_LOTS` ne sont pas touchés : ils sont lancés tels quels.

**Interdits.** Modifier un fichier source pour faire passer la garde (une garde rouge sur la tête est un défaut de T1 à
T4 : le rapporter avec ses lignes) ; lire les `*.test.ts` dans la garde ; écrire dans le worktree de base autre chose
que la copie de la garde ; `git worktree remove --force` ; fermer les constats (orchestrateur).

**Critère « terminé ».** Étapes 1 à 11 faites ; un commit (la garde seule) ; rapport avec les sorties des étapes 4, 5,
6, 7, 8 et 9, recopiables dans `## Preuve`, et la ligne `Réutilisation : appelé typescript (ts.preProcessFile)` ou
`Réutilisation : écart — <pourquoi>`. Si la taille du chunk dépasse 28 441 o : rapporter l'écart et sa cause (diff des
chunks), sans corriger.

- [ ] **1. Worktree de base jetable** (`34d4d61`), Wasm recopiés :

```bash
git -C /home/adminjd/projets/roomboard-wt/platform-feuilles worktree add --detach /home/adminjd/.cache/tmp/of13-base 34d4d61
cd /home/adminjd/.cache/tmp/of13-base && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm /home/adminjd/.cache/tmp/of13-base/apps/web/src/wasm
cp -r /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/wasm-formats /home/adminjd/.cache/tmp/of13-base/apps/web/src/wasm-formats
```

- [ ] **2. Écrire la garde** `apps/web/src/platform/import-graph.test.ts` :

```ts
/**
 * Garde des couches de `platform/` (OF13, cadrage platform-feuilles D2, D3) : (a) aucun cycle d'import entre les fichiers
 * non-test de `platform/`, imports de type compris ; (b) aucun import, de type compris, d'un fichier non-test de
 * `platform/` vers `src/app/` ; (c) tout import relatif se résout, sauf le dossier généré `wasm-formats/`. Les `*.test.ts`
 * ne sont pas lus (`zip-worker.test.ts` décode par `app/board-io`, voulu). Imports lus par `ts.preProcessFile` (`import`,
 * `import type`, `export … from`, `import()`) et par `new URL("<relatif>", import.meta.url)` (Workers).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PLATFORM = dirname(fileURLToPath(import.meta.url));
const SRC = dirname(PLATFORM);
const APP = join(SRC, "app");
/** Dossiers générés par `scripts/verifier.sh`, absents d'un worktree neuf (H7) : un nouveau dossier généré se nomme ici. */
const GENERATED: readonly string[] = [join(SRC, "wasm-formats")];
const NEW_URL = /new\s+URL\(\s*(["'])(\.{1,2}\/[^"']+)\1\s*,\s*import\.meta\.url\s*\)/g;

interface ImportRef {
  readonly spec: string;
  readonly line: number;
}
interface Edge {
  readonly from: string;
  readonly line: number;
  readonly to: string;
}

const lineAt = (text: string, pos: number): number => text.slice(0, pos).split("\n").length;

/** Spécificateurs importés par `text`, avec leur ligne (1 = première). */
function importsOf(text: string): ImportRef[] {
  const found: ImportRef[] = ts.preProcessFile(text, true, true).importedFiles.map((f) => ({ spec: f.fileName, line: lineAt(text, f.pos) }));
  for (const m of text.matchAll(NEW_URL)) found.push({ spec: m[2]!, line: lineAt(text, m.index ?? 0) });
  return found;
}

/** `file` est sous `dir`. */
function inside(dir: string, file: string): boolean {
  const r = relative(dir, file);
  return r !== "" && !r.startsWith("..") && !r.startsWith("/");
}

/** Relatif résolu en `.ts`, `.tsx` ou `/index.ts` existant, sinon null. */
function resolveSpec(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")].filter((c) => c.endsWith(".ts") || c.endsWith(".tsx"));
  return candidates.find((c) => existsSync(c)) ?? null;
}

/** Fichiers non-test de `platform/`, chemins absolus triés. */
function sourceFiles(): string[] {
  return readdirSync(PLATFORM)
    .filter((n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n))
    .sort()
    .map((n) => join(PLATFORM, n));
}

/** Imports relatifs des fichiers non-test de `platform/` ; `unresolved` : `fichier:ligne → spécificateur`. */
function platformEdges(): { readonly edges: Edge[]; readonly unresolved: string[] } {
  const edges: Edge[] = [];
  const unresolved: string[] = [];
  for (const from of sourceFiles()) {
    for (const { spec, line } of importsOf(readFileSync(from, "utf8"))) {
      if (!spec.startsWith(".")) continue;
      const target = resolve(dirname(from), spec);
      if (GENERATED.some((g) => inside(g, target))) continue;
      // Un import vers `src/app/` compte même si le fichier manque (D3).
      const to = resolveSpec(from, spec) ?? (inside(APP, target) ? target : null);
      if (to === null) unresolved.push(`${basename(from)}:${line} → ${spec}`);
      else edges.push({ from, line, to });
    }
  }
  return { edges, unresolved };
}

/** Un cycle par composante fortement connexe (Tarjan) : nœuds du cycle dans l'ordre, le premier répété à la fin. */
function findCycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  let next = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  const visit = (v: string): void => {
    index.set(v, next);
    low.set(v, next);
    next++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) !== index.get(v)) return;
    const comp: string[] = [];
    let w: string;
    do {
      w = stack.pop()!;
      onStack.delete(w);
      comp.push(w);
    } while (w !== v);
    if (comp.length > 1 || (graph.get(v) ?? []).includes(v)) cycles.push(cycleIn(graph, new Set(comp)));
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  return cycles;
}

/** Plus court cycle de la composante qui passe par son plus petit nœud (parcours en largeur). */
function cycleIn(graph: ReadonlyMap<string, readonly string[]>, comp: ReadonlySet<string>): string[] {
  const start = [...comp].sort()[0]!;
  const parent = new Map<string, string>();
  const queue = [start];
  while (queue.length > 0) {
    const v = queue.shift()!;
    for (const w of [...(graph.get(v) ?? [])].sort()) {
      if (w === start) {
        const path = [v];
        while (path[0] !== start) path.unshift(parent.get(path[0]!)!);
        return [...path, start];
      }
      if (comp.has(w) && !parent.has(w)) {
        parent.set(w, v);
        queue.push(w);
      }
    }
  }
  return [start];
}

describe("détecteur de la garde (D2)", () => {
  it("rend le cycle a → b → a d'un faux graphe, la boucle a → a, et rien sans cycle", () => {
    expect(findCycles(new Map([["a", ["b"]], ["b", ["a"]], ["c", ["a"]]]))).toEqual([["a", "b", "a"]]);
    expect(findCycles(new Map([["a", ["a"]]]))).toEqual([["a", "a"]]);
    expect(findCycles(new Map([["a", ["b"]], ["b", ["c"]], ["c", []]]))).toEqual([]);
  });

  it("lit import, import type, export … from, import() et new URL(…, import.meta.url), avec leur ligne", () => {
    const text = [
      'import { a } from "./a";',
      'import type { B } from "./b";',
      'export { c } from "./c";',
      'const d = () => import("./d");',
      'new Worker(new URL("./e.ts", import.meta.url));',
      'import x from "fflate";',
    ].join("\n");
    expect(importsOf(text).map((r) => `${r.line} ${r.spec}`).sort()).toEqual(["1 ./a", "2 ./b", "3 ./c", "4 ./d", "5 ./e.ts", "6 fflate"]);
  });
});

describe("couches de platform/ (OF13, D2)", () => {
  const { edges, unresolved } = platformEdges();

  it("lit bien le dossier : au moins 53 fichiers et 150 imports relatifs", () => {
    expect(sourceFiles().length).toBeGreaterThanOrEqual(53);
    expect(edges.length).toBeGreaterThanOrEqual(150);
  });

  it("tout import relatif se résout (sauf wasm-formats/, généré)", () => {
    expect(unresolved).toEqual([]);
  });

  it("aucun fichier non-test de platform/ n'importe src/app/", () => {
    expect(edges.filter((e) => inside(APP, e.to)).map((e) => `${basename(e.from)}:${e.line} → ${relative(SRC, e.to)}`)).toEqual([]);
  });

  it("aucun cycle d'import entre les fichiers non-test de platform/", () => {
    const graph = new Map<string, string[]>(sourceFiles().map((f) => [f, []]));
    for (const e of edges) graph.get(e.from)?.push(e.to);
    expect(findCycles(graph).map((c) => c.map((f) => basename(f)).join(" → "))).toEqual([]);
  });
});
```

- [ ] **3. Typage.** `cd /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web && nice -n 10 npx tsc --noEmit 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"` → `code 0`.

- [ ] **4. S1 — rouge sur la base.**

```bash
cp /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/src/platform/import-graph.test.ts /home/adminjd/.cache/tmp/of13-base/apps/web/src/platform/
cd /home/adminjd/.cache/tmp/of13-base/apps/web && nice -n 10 npx vitest run src/platform/import-graph.test.ts 2>&1 | tail -60
rm /home/adminjd/.cache/tmp/of13-base/apps/web/src/platform/import-graph.test.ts
```

Attendu : `Tests  2 failed | 4 passed (6)` ; les deux tests du détecteur, « lit bien le dossier » et « tout import relatif se résout » passent. Écarts attendus (relevé du cadrage, retrouvé par le prototype de la garde sur `34d4d61`) :
`zip-read.ts:9 → app/olf-read.ts`, `zip-worker.ts:30 → app/board-io.ts`, `zip-worker.ts:31 → app/olf-read.ts` ;
`clipboard.ts → paste.ts → clipboard.ts`, `board-reader.ts → zip-read.ts → board-reader.ts`, `image-import.ts → import.ts → image-import.ts` (un cycle par composante ; la troisième est le bloc de 6 fichiers du relevé).

- [ ] **5. S1 — vert sur la tête.** Commande bornée de la section → `Tests  6 passed (6)`. Puis `pnpm --filter @roomboard/web exec vitest run src/platform/import-graph.test.ts` depuis la racine du chantier (forme du cadrage) : même résultat.

- [ ] **6. Commit de la garde.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && git add apps/web/src/platform/import-graph.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(platform): import-graph guard against platform cycles and platform-to-app imports (OF13 D2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **7. S3 — tests existants.**

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && git diff -M --numstat --diff-filter=MR 34d4d61 HEAD -- '*.test.ts' && echo --- && git diff -M --name-only --diff-filter=A 34d4d61 HEAD -- '*.test.ts' && echo --- && git diff -M --name-only --diff-filter=D 34d4d61 HEAD -- '*.test.ts'
```

Attendu : bloc 1, exactement `2	2	apps/web/src/{app => platform}/olf-read.test.ts`, `1	1	apps/web/src/platform/zip-read.test.ts`, `1	1	apps/web/src/platform/zip-worker.test.ts` ; bloc 2, les 7 tests neufs (`board-list`, `controller-open-failed`, `editable`, `import-graph`, `import-handler`, `messages`, `office-error-code`) ; bloc 3 vide. Et `git diff 34d4d61 HEAD -- '*package.json' pnpm-lock.yaml '*.rs' '*Cargo.toml' Cargo.lock | wc -l` → `0` (GC6, GC7).

- [ ] **8. S4 — Worker ZIP et tailles.**

```bash
cd /home/adminjd/.cache/tmp/of13-base && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -5 && wc -c apps/web/dist/assets/zip-worker-*.js
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -5
cd /home/adminjd/projets/roomboard-wt/platform-feuilles/apps/web/dist/assets && ls zip-worker-*.js | wc -l && wc -c zip-worker-*.js && (grep -c 'document\.\|window\.' zip-worker-*.js || true) && wc -c roomboard_wasm_bg-*.wasm roomboard_formats_wasm_bg-*.wasm
```

Attendu : base `28441` (relevé sur le `dist` de la référence) ; tête : un seul chunk, taille ≤ celle de la base, `0` occurrence de `document.`/`window.`, `1374215` et `2794511` octets.

- [ ] **9. S2 — CLI base = tête.**

```bash
cd /home/adminjd/.cache/tmp/of13-base && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && nice -n 10 pnpm --filter @roomboard/cli build 2>&1 | tail -5
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && nice -n 10 node scripts/essais/cli-comparer.mjs /home/adminjd/.cache/tmp/of13-base/apps/cli/dist/roomboard.mjs apps/cli/dist/roomboard.mjs 2>&1 | tail -30; echo "code ${PIPESTATUS[0]}"
cd /home/adminjd/projets/roomboard-wt/platform-feuilles && nice -n 10 node scripts/essais/cli-essai.mjs 2>&1 | tail -5; echo "code ${PIPESTATUS[0]}"
```

Attendu : `COMPARAISON : OK` et `code 0` (lignes `note — …` recopiées dans le rapport) ; `CLI : OK` et `code 0`.

- [ ] **10. S5 (première moitié) — suite complète.**
`node ~/.claude/scripts/vm/suite-vm.cjs -- bash -c 'cd /home/adminjd/projets/roomboard-wt/platform-feuilles && CARGO_BUILD_JOBS=4 nice -n 10 scripts/verifier.sh --e2e 2>&1 | tail -25'`
Attendu : `module Wasm : 1374215 octets`, `module formats : 2794511 octets`, `CLI : OK`, `verifier.sh : e2e OK`. Si seul `office-node.test.ts` D79 est rouge (instable sous charge, état du chantier) : le rejouer seul (`cd apps/cli && nice -n 10 npx vitest run src/office-node.test.ts 2>&1 | tail -15`), puis relancer la suite une fois ; le rapporter.

- [ ] **11. Retirer le worktree de base** (sans `--force` ; les fichiers restants sont ignorés par git) :

```bash
cd /home/adminjd/.cache/tmp/of13-base && git status --short | head -5
git -C /home/adminjd/projets/roomboard-wt/platform-feuilles worktree remove /home/adminjd/.cache/tmp/of13-base && git -C /home/adminjd/projets/roomboard-wt/platform-feuilles worktree list
```

Attendu : `git status --short` vide ; le worktree disparaît de la liste. S'il est refusé : le laisser et le rapporter.

---

## Clôture (orchestrateur, pas une tâche)

Fermeture des 5 constats de D1 (S5, seconde moitié), depuis la racine du chantier, après le merge. Chaque commande rend
`fermés : 1` (essayé sur une copie jetable de `docs/architecture-constats.md` au moment du plan) :

```bash
cd /home/adminjd/projets/roomboard-wt/platform-feuilles
node ~/.claude/scripts/chaine/constats.cjs fermer --zone apps/web/src/platform --par platform-feuilles --seulement apps/web/src/platform/clipboard.ts --nature couture
node ~/.claude/scripts/chaine/constats.cjs fermer --zone apps/web/src/platform --par platform-feuilles --seulement apps/web/src/platform/office-import.ts --nature couture
node ~/.claude/scripts/chaine/constats.cjs fermer --zone apps/web/src/platform --par platform-feuilles --seulement apps/web/src/platform/zip-worker.ts --nature couture
node ~/.claude/scripts/chaine/constats.cjs fermer --zone apps/cli/src --par platform-feuilles --seulement apps/cli/src/session.ts --nature duplication
node ~/.claude/scripts/chaine/constats.cjs fermer --zone apps/web/src/app --par platform-feuilles --seulement apps/web/src/app/open-export.ts --nature duplication
```

`--nature duplication` sur `open-export.ts` laisse ouvert le constat `open-export.ts:57` (peu-profond, hors périmètre) ;
sur `apps/cli/src`, `--seulement` laisse ouverts `importer.ts:92` et `boards.test.ts:153`. `constats.cjs` n'a pas
d'option de raison : la raison de D8 pour `session.ts:186` (« les deux règles qui restent différentes sont voulues,
D56 et D59 du cadrage cli-lot4 : repli sur le classeur côté page, code 3 côté CLI ; le code d'échec est lu par
`officeErrorCode`, partagé ») va dans la PR et dans le fichier d'état.
