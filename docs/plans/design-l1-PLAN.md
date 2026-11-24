# design-l1 — Plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Table d'icônes et licence | — | `apps/web/src/ui/icons.ts` (neuf), `apps/web/src/ui/icons.test.ts` (neuf), `THIRD_PARTY_NOTICES.md` | partagé | implementeur-tdd | vitest `src/ui/icons.test.ts` ≥ 9 tests, `ICONS : 46 icônes` présent ; 9 tracés relus par `gh api` | S4, S1 | #tache-t1 |
| T2 | Infobulle et bouton à icône | T1 | `apps/web/src/ui/tooltip.ts` (neuf), `apps/web/src/ui/tooltip.test.ts` (neuf), `apps/web/src/ui/IconButton.tsx` (neuf), `apps/web/src/ui/IconButton.test.tsx` (neuf) | partagé | concepteur-critique | vitest `tooltip.test.ts` ≥ 10 tests et `IconButton.test.tsx` ≥ 11 tests, `appui long au doigt` présent | S2, S3 | #tache-t2 |
| T3 | Branchement de la barre et icône d'état | T2 | `apps/web/src/ui/item-state.ts`, `apps/web/src/ui/item-state.test.ts`, `apps/web/src/ui/Toolbar.tsx`, `apps/web/src/ui/Toolbar.test.tsx` | partagé | implementeur-tdd | vitest `src/ui` vert (0 échec), `S4 : jamais un bouton vide` et `S3 : bascule Souris / Dessin` présents ; `tsc --noEmit` code 0 | S3, S4 | #tache-t3 |
| T4 | Jetons, tailles et couleurs de `rb.css` | T3 | `apps/web/src/ui/rb.css`, `apps/web/src/ui/rb-css.test.ts` (neuf), `scripts/essais/c7b-texte-riche-navigateur.mjs` (l. 309) | partagé | implementeur-tdd | vitest `rb-css.test.ts` ≥ 7 tests + `src/ui` vert ; build web ; `C7b texte riche : OK`, c10a et c1 OK ; hauteur de scène outil Tableau relevée ≥ 640 | S5, S1 | #tache-t4 |
| T5 | Mesure de netteté et essai navigateur | T4 | `scripts/essais/nettete.mjs` (neuf), `scripts/tests/nettete.test.mjs` (neuf), `scripts/essais/design-l1-navigateur.mjs` (neuf), `scripts/essais/commun.mjs` (l. 38-57), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | partagé | concepteur-critique | `node --test` ≥ 7 tests ; `verifier-e2e.test.sh : OK` ; essai `design L1 : OK` avec `0 pixel intermédiaire`, `0 frange`, contre-épreuve ≥ 2 | S1, S2, S5 | #tache-t5 |
| T6 | Captures avant/après et suite complète | T5 | `docs/essais/design-l1-avant.png`, `design-l1-avant-barre.png`, `design-l1-apres.png`, `design-l1-apres-barre.png`, `design-l1-infobulle.png` (neufs) | partagé | implementeur-tdd | `verifier.sh : e2e OK` puis `verifier.sh : OK` ; Wasm 1 374 215 / 2 794 511 o ; 5 PNG, fenêtre 3840 × 2160 | S1, S2, S3, S4, S5 | #tache-t6 |

Une seule vague par tâche (chaîne T1 → T6), toutes dans le worktree du chantier : aucune exécution en parallèle.

**Goal :** donner à la barre d'outils de RoomBoard les jetons de la charte RoomFlow, des icônes Lucide nettes à 2x sur
des boutons à icône avec infobulle et nom accessible, et les tailles S 44 / M 48 / L 64, avec la preuve du § 10.

**Architecture :** trois modules neufs dans `apps/web/src/ui` : `icons.ts` (table de tracés, sans JSX ni dépendance),
`tooltip.ts` (états et délais de l'infobulle, une seule à la fois, placement en px entiers), `IconButton.tsx` (bouton
avec `<svg>` rendu par `Dynamic`, libellé `rb-sr`, infobulle en `Portal` dans `body`). `Toolbar.tsx` délègue ses
boutons à `IconButton` ; `item-state.ts` publie une icône d'état ; `rb.css` reçoit les jetons. La preuve passe par un
essai Playwright neuf qui lit les pixels d'une capture 2x (`nettete.mjs`, fonctions pures testées).

**Tech Stack :** Solid 1.9.20, TypeScript, Vitest 4 (happy-dom 21), Playwright 1.65 (Chromium du cache npx), Node 22
(`node --test`), Bash.

**Spec :** `docs/plans/design-l1-cadrage.md` (amont : `docs/plans/design-cadrage.md` § 9-10).

## Global Constraints

- G1 — Test rouge d'abord (TDD) ; aucun test désactivé, sauté, ni seuil baissé ou relevé.
- G2 — Aucune dépendance ajoutée (`package.json`, `pnpm-lock.yaml`, `Cargo.toml`, `Cargo.lock` inchangés).
- G3 — Tracés Lucide lus par `gh api` au commit `7981a0798a` (dépôt `lucide-icons/lucide`) ; sans accès, la tâche
  s'arrête et rend « source absente : Lucide » (aucun repli local) ; mention ISC + MIT de Feather dans
  `THIRD_PARTY_NOTICES.md`.
- G4 — Essais existants (sélecteurs `data-item`) verts sans réécriture de fond ; seule retouche de forme admise :
  `c7b-texte-riche-navigateur.mjs:309` (cadrage L1-9 f). Un test existant qui échoue sur le fond arrête la tâche.
- G5 — Mise en page des barres inchangée, aucun pixel de hauteur ajouté à une barre (ni filet, ni bordure, ni
  `padding` de plus sur `.rb-bar`).
- G6 — Tailles Wasm : principal 1 374 215 o, formats 2 794 511 o avant ; plafonds 1 572 864 / 3 145 728 inchangés ;
  aucun fichier Rust touché.
- G7 — Builds et tests en `nice -n 10`, cargo `-j 4` (`CARGO_BUILD_JOBS=4`) ;
  `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; suites complètes par
  `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`.
- G8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A`, `.`, ni `commit -a` ; aucun push.
- G9 — Fichiers temporaires dans `~/.cache/tmp/of43-*` (`TMPDIR=$HOME/.cache/tmp/of43-tmp`) ; aucun processus laissé
  en marche.
- G10 — Netteté (§ 10 du cadrage design) : 0 pixel intermédiaire au bord du Rectangle, 0 frange colorée, avec
  contre-épreuve qui doit échouer.
- G11 — Captures avant/après à 2x dans `docs/essais/design-l1-*`, comparées à `docs/design/maquettes/01-tableau.png`.
- G12 — Format `.rbprofile`, `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `ProfileEditor.tsx`, `PagesBar.tsx`,
  `SelectionRow.tsx`, `FormatRow.tsx` : non modifiés.
- G13 — `src/ui/*.tsx` sans `\d+px`, sans `switch (`, sans `innerHTML` (garde de `Toolbar.test.tsx:147-159`).

Préambule de toutes les commandes (recopié dans chaque section) :
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR"`

## Review Focus

1. `item.icon` égal à une clé héritée (`"__proto__"`, `"toString"`, `"constructor"`) dans un `.rbprofile` importé :
   l'icône de la table, jamais une exception ni un svg vide (cadrage L1-3, `Object.hasOwn` ; S4) → T1, test
   « iconFor : clé héritée ou inconnue → table ».
2. Doigt relâché, puis `pointerleave` tactile émis juste après : l'infobulle reste 1 500 ms (L1-4, H1 ; S2) → T2, test
   « IconButton : appui long au doigt… ».
3. Bouton au bord droit ou bas de la fenêtre : infobulle bornée à la fenêtre, au-dessus s'il manque la place (L1-4)
   → T2, tests `placeTip`.
4. Libellé qui change pendant que l'infobulle est montrée (bascule Souris / Dessin, Gomme partielle / objet) : le texte
   suit (L1-3, S3) → T2, test « le libellé change pendant l'affichage ».
5. Bouton retiré pendant que son infobulle est montrée (changer d'outil fait disparaître la rangée du tableau) :
   l'infobulle part avec lui (L1-4, « une seule à la fois ») → T2, test « bouton démonté ».

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/web/src/ui/icons.ts` (neuf) | `ICONS`, `TOOL_ICONS`, `ACTION_ICONS`, `ICON_VIEWBOX`, `iconFor` | T1 |
| `apps/web/src/ui/icons.test.ts` (neuf) | complétude, fidélité aux maquettes, `iconFor` | T1 |
| `THIRD_PARTY_NOTICES.md` | section « Icônes Lucide (ISC) » | T1 |
| `apps/web/src/ui/tooltip.ts` (neuf) | `createTip`, `placeTip`, délais | T2 |
| `apps/web/src/ui/tooltip.test.ts` (neuf) | délais, une seule à la fois, placement | T2 |
| `apps/web/src/ui/IconButton.tsx` (neuf) | `Icon`, `IconButton`, bulle en `Portal` | T2 |
| `apps/web/src/ui/IconButton.test.tsx` (neuf) | svg, nom accessible, infobulle | T2 |
| `apps/web/src/ui/item-state.ts` | `ItemState.icon?` | T3 |
| `apps/web/src/ui/item-state.test.ts` | icône d'état | T3 |
| `apps/web/src/ui/Toolbar.tsx` | `Button`, pastilles, rangée du tableau → `IconButton` | T3 |
| `apps/web/src/ui/Toolbar.test.tsx` | S3, S4 | T3 |
| `apps/web/src/ui/rb.css` | jetons, tailles, couleurs | T4 |
| `apps/web/src/ui/rb-css.test.ts` (neuf) | règles lues par expressions régulières | T4 |
| `scripts/essais/c7b-texte-riche-navigateur.mjs:309` | `boxTool` → `boxTable` | T4 |
| `scripts/essais/nettete.mjs` (neuf) | `pixelsOf`, `edgeRow`, `fringes`, `offSegment`, `gray`, `hex` | T5 |
| `scripts/tests/nettete.test.mjs` (neuf) | rangées fabriquées, `serve({ dist })` | T5 |
| `scripts/essais/design-l1-navigateur.mjs` (neuf) | essai § 10, S1, S2, S5, captures | T5 |
| `scripts/essais/commun.mjs:38-57` | `serve({ headers, dist = DIST })` | T5 |
| `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai dans `--e2e`, test de netteté hors du bloc | T5 |
| `docs/essais/design-l1-*.png` (neufs) | captures | T6 |

---

### Tâche T1 — Table d'icônes et licence
<a id="tache-t1"></a>

**Objectif.** Créer `apps/web/src/ui/icons.ts` : les 46 icônes utilisées (35 des maquettes, 9 lues chez Lucide, 2
dessinées), leur attribution aux 11 outils et 37 actions, et `iconFor` (cadrage L1-1, L1-2, L1-3, § 2 bis). Ajouter la
licence Lucide (L1-10).

**Fichiers.**
- Créer : `apps/web/src/ui/icons.ts`, `apps/web/src/ui/icons.test.ts`
- Modifier : `THIRD_PARTY_NOTICES.md` (section ajoutée en fin de fichier)

**Interfaces.**
- Consomme : `apps/web/src/toolbar.ts` — `type ToolItem`, `type ToolId`, `type ActionId` (import de type seul).
- Réutilise : `apps/web/src/toolbar.ts:84` (`TOOL_TABLE`), `:99` (`ACTION_TABLE`) — clés lues par les tests de
  complétude, aucune écriture.
- Produit (nouveau module, aucun existant : termes `icon`, `<svg`, `lucide`, `Icon` cherchés par le cadrage) :
  - `type IconTag = "path" | "rect" | "circle" | "line" | "polyline" | "ellipse"`
  - `type IconNode = readonly (readonly [IconTag, Readonly<Record<string, string>>])[]`
  - `const ICON_VIEWBOX = "-0.25 -0.25 24 24"`
  - `const ICONS: Readonly<Record<string, IconNode>>`
  - `const TOOL_ICONS: Readonly<Record<ToolId, string>>`
  - `const ACTION_ICONS: Readonly<Record<ActionId, string>>`
  - `function iconFor(item: ToolItem, stateIcon?: string): string | null`
- Rapport : une ligne `Réutilisation : appelé toolbar.ts (TOOL_TABLE, ACTION_TABLE)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts --reporter=verbose 2>&1 | tail -40`
Preuve : `Tests  N passed (N)`, N ≥ 9, `ICONS : 46 icônes` présent, aucun `FAIL `.

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test sauté ni seuil changé · G2 aucune dépendance ajoutée ·
G3 tracés Lucide lus par `gh api` au commit `7981a0798a` (`lucide-icons/lucide`), sans accès : arrêt et « source
absente : Lucide », mention ISC + MIT de Feather dans `THIRD_PARTY_NOTICES.md` · G7 `nice -n 10`, PATH exporté ·
G8 auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude
Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un · G9 temporaires dans `~/.cache/tmp/of43-*` ·
G12 `toolbar.ts` non modifié · G13 aucun `switch (` dans `src/ui`.

**Interdits.** Aucun JSX dans `icons.ts` ; aucun fichier écrit par `gh api` dans le dépôt (lecture sur la sortie
standard) ; aucune icône non utilisée dans `ICONS` (pas les 56 symboles des maquettes) ; ne pas toucher `toolbar.ts`.

**Terminé quand.** Le test passe, les 9 tracés L relus par `gh api` sont identiques à ceux de l'étape 3, la section de
licence est commitée.

- [ ] **Étape 1 : écrire le test rouge** — `apps/web/src/ui/icons.test.ts`

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_TABLE, TOOL_TABLE, type ToolItem } from "../toolbar";
import { ACTION_ICONS, ICONS, ICON_VIEWBOX, TOOL_ICONS, iconFor, type IconNode } from "./icons";

const MAQUETTE = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "01-tableau.html"), "utf8");
/** Symbole `i-<nom>` de la maquette 01, lu comme `IconNode`. */
function symbol(name: string): IconNode {
  const m = MAQUETTE.match(new RegExp(`<symbol id="i-${name}" viewBox="-0\\.25 -0\\.25 24 24">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`symbole absent : i-${name}`);
  return [...m[1]!.matchAll(/<(path|rect|circle|line|polyline|ellipse)\s([^>]*?)\s*\/>/g)].map(([, tag, attrs]) => [
    tag as IconNode[number][0],
    Object.fromEntries([...attrs!.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k!, v!])),
  ]);
}
const FROM_MOCKUP = ["pen", "eraser", "hand", "select", "rect", "ellipse", "line", "arrow", "text", "table", "fill", "eraser-part", "undo", "redo", "prev", "next", "plus", "trash", "file-import", "pdf", "export", "fit", "file-new", "file-open", "save", "settings", "profile", "grid", "library", "annotate", "pointer", "screen", "freeze", "board", "reset"];
const TAGS = ["path", "rect", "circle", "line", "polyline", "ellipse"];
const tool = (t: string, icon?: string): ToolItem => ({ id: t, kind: "tool", tool: t, label: t, ...(icon !== undefined ? { icon } : {}), requires: [], rest: {} });
const action = (a: string): ToolItem => ({ id: a, kind: "action", action: a, label: a, requires: [], rest: {} });

describe("icons (design-l1, L1-1 à L1-3)", () => {
  it("ICONS : 46 icônes, exactement celles qu'attribuent les tables et les états", () => {
    const used = new Set([...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS), "pen-line", "reset"]);
    expect(Object.keys(ICONS).sort()).toEqual([...used].sort());
    expect(Object.keys(ICONS)).toHaveLength(46);
  });
  it("calage : viewBox -0.25 -0.25 24 24", () => {
    expect(ICON_VIEWBOX).toBe("-0.25 -0.25 24 24");
  });
  it("chaque outil et chaque action connus ont une icône de la table (11 + 37)", () => {
    expect(Object.keys(TOOL_ICONS).sort()).toEqual(Object.keys(TOOL_TABLE).sort());
    expect(Object.keys(ACTION_ICONS).sort()).toEqual(Object.keys(ACTION_TABLE).sort());
    for (const name of [...Object.values(TOOL_ICONS), ...Object.values(ACTION_ICONS)]) expect(Object.hasOwn(ICONS, name), name).toBe(true);
    expect(Object.keys(TOOL_ICONS)).toHaveLength(11);
    expect(Object.keys(ACTION_ICONS)).toHaveLength(37);
  });
  it("balises admises, attributs en chaînes non vides", () => {
    for (const [name, node] of Object.entries(ICONS)) {
      expect(node.length, name).toBeGreaterThan(0);
      for (const [tag, attrs] of node) {
        expect(TAGS, name).toContain(tag);
        for (const v of Object.values(attrs)) expect(typeof v === "string" && v.length > 0, name).toBe(true);
      }
    }
  });
  it("les 35 icônes des maquettes sont recopiées à l'identique de 01-tableau.html", () => {
    for (const name of FROM_MOCKUP) expect(ICONS[name], name).toEqual(symbol(name));
  });
  it("row-remove et col-remove : les rectangles de between-*-start, coordonnées entières", () => {
    expect(ICONS["row-remove"]).toEqual([ICONS["between-horizontal-start"]![0], ["path", { d: "M2 12h4" }], ICONS["between-horizontal-start"]![2]]);
    expect(ICONS["col-remove"]).toEqual([ICONS["between-vertical-start"]![0], ["path", { d: "M10 4h4" }], ICONS["between-vertical-start"]![2]]);
  });
  it("attribution du § 2 bis (échantillon)", () => {
    expect([TOOL_ICONS.rect, ACTION_ICONS["eraser-mode"], ACTION_ICONS["edit-original"], ACTION_ICONS["file-save-as"], ACTION_ICONS["annotation-send-new"], ACTION_ICONS["table-unshade"]]).toEqual(["rect", "eraser-part", "square-arrow-up-right-exit", "save", "plus", "droplet-off"]);
  });
  it("iconFor : item.icon connu prioritaire, puis icône d'état, puis table", () => {
    expect(iconFor(tool("pen", "rect"))).toBe("rect");
    expect(iconFor(tool("pen", "rect"), "pen-line")).toBe("rect");
    expect(iconFor(action("annotation-pointer"), "pen-line")).toBe("pen-line");
    expect(iconFor(action("annotation-pointer"))).toBe("pointer");
    expect(iconFor(tool("pen"))).toBe("pen");
  });
  it("iconFor : clé héritée ou inconnue → table ; rien → null", () => {
    for (const bad of ["inconnue", "__proto__", "toString", "constructor"]) expect(iconFor(tool("pen", bad)), bad).toBe("pen");
    expect(iconFor(action("undo"), "constructor")).toBe("undo");
    expect(iconFor(tool("laser"))).toBeNull();
    expect(iconFor(action("inconnue"))).toBeNull();
    expect(iconFor({ id: "z", kind: "dropzone", label: "Déposer", requires: [], rest: {} })).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts 2>&1 | tail -15`
Attendu : `FAIL `, `Failed to resolve import "./icons"` (ou équivalent).

- [ ] **Étape 3 : relire les 9 tracés Lucide au commit** (G3 ; arrêt si la commande échoue)

```bash
for n in square-arrow-up-right-exit pen-line between-horizontal-start between-vertical-start columns-3 table-cells-merge table-cells-split droplet droplet-off; do
  gh api "repos/lucide-icons/lucide/contents/icons/$n.svg?ref=7981a0798a" -H 'Accept: application/vnd.github.raw' \
    | grep -o '<\(path\|rect\|circle\|line\|polyline\|ellipse\) [^>]*/>' | sed "s/^/$n /" || echo "ÉCHEC $n"
done
```
Attendu (relevé le 2026-11-24 par le planificateur ; chaque ligne doit se retrouver dans l'étape 4, dans cet ordre) :
`square-arrow-up-right-exit` : `path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"`, `path d="m21 3-9 9"`,
`path d="M15 3h6v6"` · `pen-line` : `path d="M13 21h8"`, `path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2
0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"` · `between-horizontal-start` : `rect
width="13" height="7" x="8" y="3" rx="1"`, `path d="m2 9 3 3-3 3"`, `rect width="13" height="7" x="8" y="14" rx="1"` ·
`between-vertical-start` : `rect width="7" height="13" x="3" y="8" rx="1"`, `path d="m15 2-3 3-3-3"`, `rect width="7"
height="13" x="14" y="8" rx="1"` · `columns-3` : `rect width="18" height="18" x="3" y="3" rx="2"`, `path d="M9 3v18"`,
`path d="M15 3v18"` · `table-cells-merge` : `path d="M12 21v-6"`, `path d="M12 9V3"`, `path d="M3 15h18"`, `path
d="M3 9h18"`, `rect width="18" height="18" x="3" y="3" rx="2"` · `table-cells-split` : `path d="M12 15V9"`, `path
d="M3 15h18"`, `path d="M3 9h18"`, `rect width="18" height="18" x="3" y="3" rx="2"` · `droplet` : `path d="M12 22a7 7
0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"` · `droplet-off` : `path
d="M18.715 13.186C18.29 11.858 17.384 10.607 16 9.5c-2-1.6-3.5-4-4-6.5a10.7 10.7 0 0 1-.884 2.586"`, `path d="m2 2 20
20"`, `path d="M8.795 8.797A11 11 0 0 1 8 9.5C6 11.1 5 13 5 15a7 7 0 0 0 13.222 3.208"`. Un écart : le tracé lu
l'emporte, à recopier tel quel dans l'étape 4 et à signaler au rapport.

- [ ] **Étape 4 : écrire `apps/web/src/ui/icons.ts`**

```ts
import type { ActionId, ToolId, ToolItem } from "../toolbar";

// Table d'icônes de RoomBoard (cadrage design-l1, L1-1 à L1-3, § 2 bis). Trait 1,5 sur une grille de 24, calage
// `ICON_VIEWBOX` (coffre 0290). Origines : maquettes `docs/design/maquettes/01-tableau.html` (Lucide
// lucide-icons/lucide@7981a0798a ; `annotate`, `eraser-part`, `line` dessinées), Lucide lu au même commit par `gh api`
// (nom Lucide en commentaire), ou dessinées pour ce lot. Licence : THIRD_PARTY_NOTICES.md (ISC, MIT de Feather).

export type IconTag = "path" | "rect" | "circle" | "line" | "polyline" | "ellipse";
export type IconNode = readonly (readonly [IconTag, Readonly<Record<string, string>>])[];

/** Décalage d'un quart de pixel : un trait de 1,5 sur coordonnée entière tombe sur 3 pixels pleins à 2x (§ 10). */
export const ICON_VIEWBOX = "-0.25 -0.25 24 24";

export const ICONS: Readonly<Record<string, IconNode>> = Object.freeze({
  // Maquettes (symboles `i-<nom>` de 01-tableau.html, recopiés tels quels).
  "pen": [["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }], ["path", { d: "m15 5 4 4" }]],
  "eraser": [["path", { d: "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" }], ["path", { d: "m5.082 11.09 8.828 8.828" }]],
  "hand": [["path", { d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }], ["path", { d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }], ["path", { d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }], ["path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" }]],
  "select": [["path", { d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" }]],
  "rect": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  "ellipse": [["circle", { cx: "12", cy: "12", r: "10" }]],
  "line": [["path", { d: "M5 19 19 5" }]],
  "arrow": [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]],
  "text": [["path", { d: "M12 4v16" }], ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }], ["path", { d: "M9 20h6" }]],
  "table": [["path", { d: "M12 3v18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }]],
  "fill": [["path", { d: "M11 7 6 2" }], ["path", { d: "M18.992 12H2.041" }], ["path", { d: "M21.145 18.38A3.34 3.34 0 0 1 20 16.5a3.3 3.3 0 0 1-1.145 1.88c-.575.46-.855 1.02-.855 1.595A2 2 0 0 0 20 22a2 2 0 0 0 2-2.025c0-.58-.285-1.13-.855-1.595" }], ["path", { d: "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33" }]],
  "eraser-part": [["path", { d: "M8 21a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21H8" }], ["path", { d: "m5.082 11.09 8.828 8.828" }], ["path", { d: "M16 21h1" }], ["path", { d: "M20 21h1" }]],
  "undo": [["path", { d: "M9 14 4 9l5-5" }], ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]],
  "redo": [["path", { d: "m15 14 5-5-5-5" }], ["path", { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]],
  "prev": [["path", { d: "m15 18-6-6 6-6" }]],
  "next": [["path", { d: "m9 18 6-6-6-6" }]],
  "plus": [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
  "trash": [["path", { d: "M10 11v6" }], ["path", { d: "M14 11v6" }], ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }], ["path", { d: "M3 6h18" }], ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
  "file-import": [["path", { d: "M4 11V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M2 15h10" }], ["path", { d: "m9 18 3-3-3-3" }]],
  "pdf": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M12 18v-6" }], ["path", { d: "m9 15 3 3 3-3" }]],
  "export": [["path", { d: "M12 15V3" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }], ["path", { d: "m7 10 5 5 5-5" }]],
  "fit": [["path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }], ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }], ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }], ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }]],
  "file-new": [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }], ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M9 15h6" }], ["path", { d: "M12 18v-6" }]],
  "file-open": [["path", { d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" }]],
  "save": [["path", { d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }], ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }], ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }]],
  "settings": [["path", { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }], ["circle", { cx: "12", cy: "12", r: "3" }]],
  "profile": [["path", { d: "M10 15H6a4 4 0 0 0-4 4v2" }], ["path", { d: "m14.305 16.53.923-.382" }], ["path", { d: "m15.228 13.852-.923-.383" }], ["path", { d: "m16.852 12.228-.383-.923" }], ["path", { d: "m16.852 17.772-.383.924" }], ["path", { d: "m19.148 12.228.383-.923" }], ["path", { d: "m19.53 18.696-.382-.924" }], ["path", { d: "m20.772 13.852.924-.383" }], ["path", { d: "m20.772 16.148.924.383" }], ["circle", { cx: "18", cy: "15", r: "3" }], ["circle", { cx: "9", cy: "7", r: "4" }]],
  "grid": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M3 9h18" }], ["path", { d: "M3 15h18" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
  "library": [["rect", { width: "8", height: "18", x: "3", y: "3", rx: "1" }], ["path", { d: "M7 3v18" }], ["path", { d: "M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" }]],
  "annotate": [["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }], ["path", { d: "M8 21h8" }], ["path", { d: "M12 17v4" }], ["path", { d: "M6 12c1.5-2.5 3-2.5 4 0s2.5 2.5 4 0 2.5-2.5 4 0" }]],
  "pointer": [["path", { d: "M14 4.1 12 6" }], ["path", { d: "m5.1 8-2.9-.8" }], ["path", { d: "m6 12-1.9 2" }], ["path", { d: "M7.2 2.2 8 5.1" }], ["path", { d: "M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" }]],
  "screen": [["path", { d: "M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" }], ["path", { d: "M8 21h8" }], ["path", { d: "M12 17v4" }], ["path", { d: "m17 8 5-5" }], ["path", { d: "M17 3h5v5" }]],
  "freeze": [["path", { d: "m10 20-1.25-2.5L6 18" }], ["path", { d: "M10 4 8.75 6.5 6 6" }], ["path", { d: "m14 20 1.25-2.5L18 18" }], ["path", { d: "m14 4 1.25 2.5L18 6" }], ["path", { d: "m17 21-3-6h-4" }], ["path", { d: "m17 3-3 6 1.5 3" }], ["path", { d: "M2 12h6.5L10 9" }], ["path", { d: "m20 10-1.5 2 1.5 2" }], ["path", { d: "M22 12h-6.5L14 15" }], ["path", { d: "m4 10 1.5 2L4 14" }], ["path", { d: "m7 21 3-6-1.5-3" }], ["path", { d: "m7 3 3 6h4" }]],
  "board": [["path", { d: "M2 3h20" }], ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" }], ["path", { d: "m7 21 5-5 5 5" }]],
  "reset": [["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }]],
  // Lucide @7981a0798a, lus par gh api.
  // Lucide square-arrow-up-right-exit (ex-square-arrow-out-up-right, alias obsolète)
  "square-arrow-up-right-exit": [["path", { d: "M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" }], ["path", { d: "m21 3-9 9" }], ["path", { d: "M15 3h6v6" }]],
  // Lucide pen-line (état « Dessin » de annotation-pointer)
  "pen-line": [["path", { d: "M13 21h8" }], ["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }]],
  // Lucide between-horizontal-start
  "between-horizontal-start": [["rect", { width: "13", height: "7", x: "8", y: "3", rx: "1" }], ["path", { d: "m2 9 3 3-3 3" }], ["rect", { width: "13", height: "7", x: "8", y: "14", rx: "1" }]],
  // Lucide between-vertical-start
  "between-vertical-start": [["rect", { width: "7", height: "13", x: "3", y: "8", rx: "1" }], ["path", { d: "m15 2-3 3-3-3" }], ["rect", { width: "7", height: "13", x: "14", y: "8", rx: "1" }]],
  // Lucide columns-3
  "columns-3": [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], ["path", { d: "M9 3v18" }], ["path", { d: "M15 3v18" }]],
  // Lucide table-cells-merge
  "table-cells-merge": [["path", { d: "M12 21v-6" }], ["path", { d: "M12 9V3" }], ["path", { d: "M3 15h18" }], ["path", { d: "M3 9h18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  // Lucide table-cells-split
  "table-cells-split": [["path", { d: "M12 15V9" }], ["path", { d: "M3 15h18" }], ["path", { d: "M3 9h18" }], ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  // Lucide droplet
  droplet: [["path", { d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" }]],
  // Lucide droplet-off
  "droplet-off": [["path", { d: "M18.715 13.186C18.29 11.858 17.384 10.607 16 9.5c-2-1.6-3.5-4-4-6.5a10.7 10.7 0 0 1-.884 2.586" }], ["path", { d: "m2 2 20 20" }], ["path", { d: "M8.795 8.797A11 11 0 0 1 8 9.5C6 11.1 5 13 5 15a7 7 0 0 0 13.222 3.208" }]],
  // Dessinées pour RoomBoard : rectangles de between-*-start, chevron remplacé par un tiret « moins ».
  "row-remove": [["rect", { width: "13", height: "7", x: "8", y: "3", rx: "1" }], ["path", { d: "M2 12h4" }], ["rect", { width: "13", height: "7", x: "8", y: "14", rx: "1" }]],
  "col-remove": [["rect", { width: "7", height: "13", x: "3", y: "8", rx: "1" }], ["path", { d: "M10 4h4" }], ["rect", { width: "7", height: "13", x: "14", y: "8", rx: "1" }]],
});

/** Outil → icône (§ 2 bis). */
export const TOOL_ICONS: Readonly<Record<ToolId, string>> = Object.freeze({
  pen: "pen",
  eraser: "eraser",
  hand: "hand",
  select: "select",
  rect: "rect",
  ellipse: "ellipse",
  line: "line",
  arrow: "arrow",
  text: "text",
  table: "table",
  fill: "fill",
});

/** Action → icône (§ 2 bis) ; l'icône d'état (`ItemState.icon`) passe avant (L1-3). */
export const ACTION_ICONS: Readonly<Record<ActionId, string>> = Object.freeze({
  "eraser-mode": "eraser-part",
  undo: "undo",
  redo: "redo",
  "page-prev": "prev",
  "page-next": "next",
  "page-add": "plus",
  "page-remove": "trash",
  "page-insert-file": "file-import",
  "edit-original": "square-arrow-up-right-exit",
  "export-pdf": "pdf",
  "export-iwb": "export",
  "export-ubz": "export",
  "fit-page": "fit",
  "file-new": "file-new",
  "file-open": "file-open",
  "file-import": "file-import",
  "file-save": "save",
  "file-save-as": "save",
  settings: "settings",
  profiles: "profile",
  grid: "grid",
  library: "library",
  "desktop-annotation": "annotate",
  "annotation-pointer": "pointer",
  "annotation-screen": "screen",
  "annotation-freeze": "freeze",
  "annotation-send": "board",
  "annotation-send-new": "plus",
  "table-row-insert": "between-horizontal-start",
  "table-col-insert": "between-vertical-start",
  "table-row-remove": "row-remove",
  "table-col-remove": "col-remove",
  "table-uniform": "columns-3",
  "table-merge": "table-cells-merge",
  "table-split": "table-cells-split",
  "table-shade": "droplet",
  "table-unshade": "droplet-off",
});

const own = (table: Readonly<Record<string, string>>, key: string | undefined): string | undefined =>
  key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;
const known = (name: string | undefined): name is string => name !== undefined && Object.hasOwn(ICONS, name);

/** Icône d'un élément de barre par sorte (table, jamais un branchement sur l'identifiant). */
const BY_KIND: Readonly<Record<ToolItem["kind"], (item: ToolItem) => string | undefined>> = {
  tool: (item) => own(TOOL_ICONS, item.tool),
  action: (item) => own(ACTION_ICONS, item.action),
  dropzone: () => undefined,
  separator: () => undefined,
};

/** L1-3 : `item.icon` s'il est une clé propre d'`ICONS`, sinon l'icône d'état, sinon la table ; rien : null (texte). */
export function iconFor(item: ToolItem, stateIcon?: string): string | null {
  if (known(item.icon)) return item.icon;
  if (known(stateIcon)) return stateIcon;
  const byTable = BY_KIND[item.kind](item);
  return known(byTable) ? byTable : null;
}
```

- [ ] **Étape 5 : lancer, constater le vert**

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/icons.test.ts --reporter=verbose 2>&1 | tail -40`
Attendu : `Tests  9 passed (9)`, ligne `ICONS : 46 icônes` présente.

- [ ] **Étape 6 : licence** — ajouter en fin de `THIRD_PARTY_NOTICES.md` :

````markdown

## Icônes Lucide (ISC), design L1

Tracés repris de Lucide (https://github.com/lucide-icons/lucide), commit `7981a0798a`, sans paquet npm : ils sont
recopiés dans `apps/web/src/ui/icons.ts`.

- Repris des maquettes `docs/design/maquettes/01-tableau.html` (tracés Lucide au même commit), noms RoomBoard :
  `pen`, `eraser`, `hand`, `select`, `rect`, `ellipse`, `arrow`, `text`, `table`, `fill`, `undo`, `redo`, `prev`,
  `next`, `plus`, `trash`, `file-import`, `pdf`, `export`, `fit`, `file-new`, `file-open`, `save`, `settings`,
  `profile`, `grid`, `library`, `pointer`, `screen`, `freeze`, `board`, `reset`.
- Lus au commit par `gh api`, noms Lucide : `square-arrow-up-right-exit`, `pen-line`, `between-horizontal-start`,
  `between-vertical-start`, `columns-3`, `table-cells-merge`, `table-cells-split`, `droplet`, `droplet-off`.
- Dessinées pour RoomBoard dans le même style (grille de 24, trait 1,5) : `annotate`, `eraser-part`, `line`,
  `row-remove`, `col-remove`.

Licence de Lucide (ISC), qui contient la licence MIT de Feather (Cole Bemis) pour les icônes qui en dérivent,
recopiée de `LICENSE` au commit `7981a0798a` :

```text
<SORTIE EXACTE de la commande ci-dessous, sans retouche>
```
````

Commande dont la sortie remplace la ligne `<SORTIE EXACTE…>` :
`gh api 'repos/lucide-icons/lucide/contents/LICENSE?ref=7981a0798a' -H 'Accept: application/vnd.github.raw'`
Contrôle : le bloc commence par `ISC License`, contient `Copyright (c) 2026 Lucide Icons and Contributors` et
`Copyright (c) 2013-present Cole Bemis`.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add apps/web/src/ui/icons.ts
git add apps/web/src/ui/icons.test.ts
git add THIRD_PARTY_NOTICES.md
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): Lucide icon table and attribution (design L1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Infobulle et bouton à icône
<a id="tache-t2"></a>

**Objectif.** Créer `tooltip.ts` (délais 400 / 500 / 1 500 ms, une seule infobulle à la fois, placement en px entiers)
et `IconButton.tsx` (svg rendu par `Dynamic`, `aria-label`, libellé en `rb-sr`, infobulle en `Portal` dans `body`)
(cadrage L1-1 rendu, L1-4).

**Patron à ne pas reprendre (concepteur-critique).**
- L'infobulle de la maquette, `docs/design/maquettes/01-tableau.html:64-65` (`.tip` en `position: absolute`, enfant du
  bouton, `transform: translateX(-50%)`) : un `transform` pose le texte sur un demi-pixel (flou, § 10) et un enfant du
  bouton changerait `textContent` et les enfants de `.rb-bar` (`Toolbar.test.tsx:199-201`). Ici : `Portal` dans
  `body`, `left`/`top` en px entiers calculés par `placeTip`.
- L'attribut `title` natif de `apps/web/src/ui/Toolbar.tsx:113`, `:120`, `:167` : il donnerait deux infobulles.
- Le réflexe « `pointerleave` cache l'infobulle » : au doigt, Chromium émet `pointerleave` juste après `pointerup`,
  ce qui casserait les 1 500 ms après le relâcher. Seule la souris passe par `enter`/`leave`.
- Le réflexe « l'appui long annule le clic » : l'outil reste choisi au relâcher (H1).

**Fichiers.**
- Créer : `apps/web/src/ui/tooltip.ts`, `apps/web/src/ui/tooltip.test.ts`, `apps/web/src/ui/IconButton.tsx`,
  `apps/web/src/ui/IconButton.test.tsx`

**Interfaces.**
- Consomme (T1) : `ICONS: Readonly<Record<string, IconNode>>`, `ICON_VIEWBOX = "-0.25 -0.25 24 24"` de `./icons`.
- Produit (nouveaux modules, aucun existant : termes `tooltip`, `infobulle`, `data-tip`, `aria-label`, `rb-sr`,
  `visually` cherchés par le cadrage) :
  - `tooltip.ts` : `TIP_HOVER_MS = 400`, `TIP_HOLD_MS = 500`, `TIP_LINGER_MS = 1500`, `TIP_GAP = 8` ;
    `interface Tip { shown: Accessor<boolean>; enter(): void; leave(): void; down(pointerType: string): void; up(): void; focus(): void; blur(): void }` ;
    `createTip(opts?: { hoverMs?: number; holdMs?: number; lingerMs?: number }): Tip` (signal de module : une seule
    montrée) ; `placeTip(anchor: { left: number; top: number; right: number; bottom: number }, tip: { width: number; height: number }, view: { width: number; height: number }, gap?: number): { left: number; top: number }` (ajout au cadrage : fonction pure du placement).
  - `IconButton.tsx` : `Icon(props: { name: string }): JSX.Element` (svg `class="rb-icon"`, `data-icon={name}`) ;
    `IconButton(props: { icon: string | null; label: string; pressed?: boolean | null; disabled?: boolean; attrs?: Readonly<Record<string, string>>; children?: JSX.Element; onPress: () => void }): JSX.Element` —
    classe `rb-ib` quand il y a une icône ou un enfant ; libellé visible seulement sans `icon` ni `children` ;
    infobulle `div.rb-tip[role="tooltip"]` dans `body`.
- Rapport : `Réutilisation : appelé icons.ts (ICONS, ICON_VIEWBOX)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/tooltip.test.ts src/ui/IconButton.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | tail -80`
Preuve : `tooltip.test.ts` ≥ 10 tests, `IconButton.test.tsx` ≥ 11 tests, `appui long au doigt` et
`bouton démonté` présents, 0 échec ; `Toolbar.test.tsx` reste vert (sa garde `\d+px` / `switch` lit les nouveaux
fichiers).

**Contraintes (recopiées).** G1 test rouge d'abord · G2 aucune dépendance (Solid seul : `solid-js`, `solid-js/web`) ·
G7 `nice -n 10`, PATH exporté · G8 auteur et message (anglais, `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`), fichiers ajoutés un par un · G9 temporaires dans `~/.cache/tmp/of43-*` · G13 aucun `\d+px`,
`switch (`, `innerHTML` dans `IconButton.tsx`.

**Interdits.** Aucun attribut `title` ; aucun `transform` ; aucune infobulle enfant du bouton ni de `.rb-bar` ; ne pas
annuler le clic d'un appui long ; ne pas toucher `Toolbar.tsx` (T3).

**Terminé quand.** Les trois fichiers de test passent ; les cinq lignes du Review Focus de cette tâche (2 à 5) sont
couvertes par un test nommé.

- [ ] **Étape 1 : test rouge de `tooltip.ts`** — `apps/web/src/ui/tooltip.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTip, placeTip, TIP_HOLD_MS, TIP_HOVER_MS, TIP_LINGER_MS } from "./tooltip";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createTip (design-l1, L1-4, H1)", () => {
  it("délais du cadrage : 400, 500, 1 500 ms", () => {
    expect([TIP_HOVER_MS, TIP_HOLD_MS, TIP_LINGER_MS]).toEqual([400, 500, 1500]);
  });
  it("survol : montrée à 400 ms, pas avant ; sortie : cachée", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(399);
    expect(t.shown()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(true);
    t.leave();
    expect(t.shown()).toBe(false);
  });
  it("sortie avant 400 ms : jamais montrée", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(200);
    t.leave();
    vi.advanceTimersByTime(1000);
    expect(t.shown()).toBe(false);
  });
  it("focus clavier : montrée tout de suite ; blur : cachée", () => {
    const t = createTip();
    t.focus();
    expect(t.shown()).toBe(true);
    t.blur();
    expect(t.shown()).toBe(false);
  });
  it("focus qui suit un appui (souris, doigt) : pas d'infobulle de focus", () => {
    const t = createTip();
    t.down("mouse");
    t.focus();
    expect(t.shown()).toBe(false);
  });
  it("appui de souris : cache l'infobulle du survol", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(400);
    t.down("mouse");
    expect(t.shown()).toBe(false);
  });
  it("appui au doigt : montrée à 500 ms ; relâcher : reste 1 500 ms puis cachée", () => {
    const t = createTip();
    t.down("touch");
    vi.advanceTimersByTime(499);
    expect(t.shown()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(true);
    t.up();
    vi.advanceTimersByTime(1499);
    expect(t.shown()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(false);
  });
  it("appui court au stylet (< 500 ms) : jamais montrée", () => {
    const t = createTip();
    t.down("pen");
    vi.advanceTimersByTime(300);
    t.up();
    vi.advanceTimersByTime(2000);
    expect(t.shown()).toBe(false);
  });
  it("pendant l'appui long, une sortie ne cache pas", () => {
    const t = createTip();
    t.down("touch");
    vi.advanceTimersByTime(500);
    t.leave();
    expect(t.shown()).toBe(true);
  });
  it("une seule à la fois : la seconde montrée cache la première", () => {
    const a = createTip();
    const b = createTip();
    a.focus();
    b.focus();
    expect([a.shown(), b.shown()]).toEqual([false, true]);
  });
});

describe("placeTip (L1-4 : sous le bouton, au-dessus faute de place, bornée, px entiers)", () => {
  const VIEW = { width: 1920, height: 1080 };
  const TIP = { width: 80, height: 32 };
  it("sous le bouton, centrée", () => {
    expect(placeTip({ left: 100, top: 10, right: 148, bottom: 58 }, TIP, VIEW)).toEqual({ left: 84, top: 66 });
  });
  it("au-dessus quand le bas de la fenêtre manque", () => {
    expect(placeTip({ left: 100, top: 1022, right: 148, bottom: 1070 }, TIP, VIEW)).toEqual({ left: 84, top: 982 });
  });
  it("bornée à gauche et à droite", () => {
    expect(placeTip({ left: 0, top: 10, right: 48, bottom: 58 }, TIP, VIEW).left).toBe(0);
    expect(placeTip({ left: 1872, top: 10, right: 1920, bottom: 58 }, TIP, VIEW).left).toBe(1840);
  });
  it("px entiers depuis une boîte fractionnaire", () => {
    const p = placeTip({ left: 100.25, top: 10, right: 148.25, bottom: 58.5 }, { width: 80.4, height: 32 }, VIEW);
    expect(Number.isInteger(p.left) && Number.isInteger(p.top)).toBe(true);
  });
});
```

- [ ] **Étape 2 : test rouge d'`IconButton.tsx`** — `apps/web/src/ui/IconButton.test.tsx`

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Show, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ICONS } from "./icons";
import { Icon, IconButton } from "./IconButton";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const tips = (): Element[] => [...document.querySelectorAll('[role="tooltip"]')];
const one = (icon: string | null = "rect", label = "Rectangle", onPress = vi.fn()) => {
  const r = render(() => <IconButton icon={icon} label={label} attrs={{ "data-item": "rect" }} onPress={onPress} />);
  return { ...r, btn: r.container.querySelector("button")!, onPress };
};

describe("Icon (L1-1)", () => {
  it("svg calé, trait 1,5, caché aux lecteurs d'écran, un enfant SVG par entrée d'ICONS", () => {
    const { container } = render(() => <Icon name="table" />);
    const svg = container.querySelector("svg.rb-icon")!;
    expect(svg.getAttribute("viewBox")).toBe("-0.25 -0.25 24 24");
    expect(svg.getAttribute("stroke-width")).toBe("1.5");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.getAttribute("data-icon")).toBe("table");
    expect([...svg.children].map((c) => c.tagName.toLowerCase())).toEqual(ICONS.table!.map(([t]) => t));
    expect(svg.children[0]!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.querySelector("rect")!.getAttribute("rx")).toBe("2");
  });
  it("aucun innerHTML dans IconButton.tsx (rendu par Dynamic)", () => {
    expect(readFileSync(join(__dirname, "IconButton.tsx"), "utf8")).not.toMatch(/innerHTML/);
  });
});

describe("IconButton (L1-4)", () => {
  it("icône : svg, aria-label, libellé en rb-sr (textContent = libellé), classe rb-ib, aucun title", () => {
    const { btn } = one();
    expect(btn.querySelector("svg.rb-icon")?.getAttribute("data-icon")).toBe("rect");
    expect(btn.getAttribute("aria-label")).toBe("Rectangle");
    expect(btn.querySelector(".rb-sr")?.textContent).toBe("Rectangle");
    expect(btn.textContent).toBe("Rectangle");
    expect(btn.classList.contains("rb-ib")).toBe(true);
    expect(btn.hasAttribute("title")).toBe(false);
    expect(btn.getAttribute("data-item")).toBe("rect");
    expect(btn.getAttribute("type")).toBe("button");
  });
  it("sans icône ni enfant : libellé visible, aucun svg, jamais vide", () => {
    const { btn } = one(null, "Laser");
    expect(btn.querySelector("svg")).toBeNull();
    expect(btn.querySelector(".rb-sr")).toBeNull();
    expect(btn.textContent).toBe("Laser");
    expect(btn.classList.contains("rb-ib")).toBe(false);
  });
  it("pastille (enfant) : enfant + rb-sr, classe d'attrs gardée", () => {
    const { container } = render(() => (
      <IconButton icon={null} label="Rouge" attrs={{ class: "rb-preset", "data-preset": "rouge" }} onPress={() => {}}>
        <span class="rb-swatch" />
      </IconButton>
    ));
    const btn = container.querySelector("button")!;
    expect(btn.querySelector(".rb-swatch")).not.toBeNull();
    expect(btn.textContent).toBe("Rouge");
    expect([btn.classList.contains("rb-preset"), btn.classList.contains("rb-ib")]).toEqual([true, true]);
    expect(btn.getAttribute("data-preset")).toBe("rouge");
  });
  it("clic → onPress ; pressed null : pas d'aria-pressed ; true : aria-pressed ; disabled", () => {
    const { btn, onPress } = one();
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(btn.hasAttribute("aria-pressed")).toBe(false);
    cleanup();
    const { container } = render(() => <IconButton icon="pen" label="Stylo" pressed={true} disabled={true} onPress={() => {}} />);
    const b = container.querySelector("button")!;
    expect([b.getAttribute("aria-pressed"), b.disabled]).toEqual(["true", true]);
  });
  it("survol souris : une infobulle dans body à 400 ms, hors du bouton, au libellé ; sortie : partie", () => {
    const { btn } = one();
    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    vi.advanceTimersByTime(399);
    expect(tips()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(tips()).toHaveLength(1);
    expect(tips()[0]!.textContent).toBe("Rectangle");
    expect(btn.contains(tips()[0]!)).toBe(false);
    expect(tips()[0]!.classList.contains("rb-tip")).toBe(true);
    expect(btn.textContent).toBe("Rectangle");
    fireEvent.pointerLeave(btn, { pointerType: "mouse" });
    expect(tips()).toHaveLength(0);
  });
  it("focus : infobulle tout de suite ; blur : partie", () => {
    const { btn } = one();
    fireEvent.focus(btn);
    expect(tips().map((t) => t.textContent)).toEqual(["Rectangle"]);
    fireEvent.blur(btn);
    expect(tips()).toHaveLength(0);
  });
  it("appui long au doigt : infobulle à 500 ms, le clic passe, pointerleave tactile ignoré, partie 1 500 ms après", () => {
    const { btn, onPress } = one();
    fireEvent.pointerDown(btn, { pointerType: "touch" });
    vi.advanceTimersByTime(500);
    expect(tips()).toHaveLength(1);
    fireEvent.pointerUp(btn, { pointerType: "touch" });
    fireEvent.pointerLeave(btn, { pointerType: "touch" });
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1499);
    expect(tips()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(tips()).toHaveLength(0);
  });
  it("une seule infobulle à la fois entre deux boutons", () => {
    const { container } = render(() => (
      <>
        <IconButton icon="pen" label="Stylo" onPress={() => {}} />
        <IconButton icon="undo" label="Annuler" onPress={() => {}} />
      </>
    ));
    const [a, b] = [...container.querySelectorAll("button")];
    fireEvent.focus(a!);
    fireEvent.pointerEnter(b!, { pointerType: "mouse" });
    vi.advanceTimersByTime(400);
    expect(tips().map((t) => t.textContent)).toEqual(["Annuler"]);
  });
  it("le libellé change pendant l'affichage : l'infobulle suit", () => {
    const [label, setLabel] = createSignal("Souris");
    const { container } = render(() => <IconButton icon="pointer" label={label()} onPress={() => {}} />);
    fireEvent.focus(container.querySelector("button")!);
    setLabel("Dessin");
    expect(tips().map((t) => t.textContent)).toEqual(["Dessin"]);
  });
  it("bouton démonté pendant l'affichage : l'infobulle part avec lui", () => {
    const [on, setOn] = createSignal(true);
    const { container } = render(() => (
      <Show when={on()}>
        <IconButton icon="table" label="Tableau" onPress={() => {}} />
      </Show>
    ));
    fireEvent.focus(container.querySelector("button")!);
    expect(tips()).toHaveLength(1);
    setOn(false);
    expect(tips()).toHaveLength(0);
  });
});
```

- [ ] **Étape 3 : lancer, constater l'échec**

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/tooltip.test.ts src/ui/IconButton.test.tsx 2>&1 | tail -15`
Attendu : `FAIL ` sur les deux fichiers (imports `./tooltip` et `./IconButton` introuvables).

- [ ] **Étape 4 : écrire `apps/web/src/ui/tooltip.ts`**

```ts
import { createSignal, getOwner, onCleanup, type Accessor } from "solid-js";

// Infobulle des boutons à icône (cadrage design-l1, L1-4, H1) : survol à la souris, focus clavier, appui long au doigt
// ou au stylet. L'appui long n'annule pas le clic : l'outil est choisi au relâcher, comme avant.

export const TIP_HOVER_MS = 400;
export const TIP_HOLD_MS = 500;
export const TIP_LINGER_MS = 1500;
/** Écart entre le bouton et l'infobulle (`--rf-space-sm`). */
export const TIP_GAP = 8;

export interface TipOptions { readonly hoverMs?: number; readonly holdMs?: number; readonly lingerMs?: number }
export interface Tip {
  readonly shown: Accessor<boolean>;
  enter(): void;
  leave(): void;
  down(pointerType: string): void;
  up(): void;
  focus(): void;
  blur(): void;
}

/** Infobulle montrée : une seule pour toute la page. */
const [current, setCurrent] = createSignal<symbol | null>(null);

export function createTip(opts: TipOptions = {}): Tip {
  const hoverMs = opts.hoverMs ?? TIP_HOVER_MS;
  const holdMs = opts.holdMs ?? TIP_HOLD_MS;
  const lingerMs = opts.lingerMs ?? TIP_LINGER_MS;
  const id = Symbol("tip");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let holding = false;
  /** Le focus qui suit un appui n'est pas un focus clavier. */
  let byPointer = false;
  const clear = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const show = (): void => {
    clear();
    setCurrent(id);
  };
  const hide = (): void => {
    clear();
    if (current() === id) setCurrent(null);
  };
  const after = (ms: number, then: () => void): void => {
    clear();
    timer = setTimeout(() => {
      timer = undefined;
      then();
    }, ms);
  };
  if (getOwner() !== null) onCleanup(hide);
  return {
    shown: () => current() === id,
    enter: () => {
      if (!holding) after(hoverMs, show);
    },
    leave: () => {
      if (!holding) hide();
    },
    down: (pointerType) => {
      byPointer = true;
      if (pointerType === "mouse") {
        hide();
        return;
      }
      holding = true;
      after(holdMs, show);
    },
    up: () => {
      if (!holding) return;
      holding = false;
      if (current() === id) after(lingerMs, hide);
      else clear();
    },
    focus: () => {
      if (!byPointer) show();
    },
    blur: () => {
      byPointer = false;
      holding = false;
      hide();
    },
  };
}

export interface TipAnchor { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
export interface TipSize { readonly width: number; readonly height: number }

/** Sous le bouton, centrée ; au-dessus s'il manque la place ; bornée à la fenêtre ; px entiers (aucun transform). */
export function placeTip(anchor: TipAnchor, tip: TipSize, view: TipSize, gap = TIP_GAP): { left: number; top: number } {
  const below = anchor.bottom + gap;
  const top = below + tip.height <= view.height ? below : anchor.top - gap - tip.height;
  const centered = (anchor.left + anchor.right - tip.width) / 2;
  const left = Math.min(Math.max(0, centered), Math.max(0, view.width - tip.width));
  return { left: Math.round(left), top: Math.round(Math.max(0, top)) };
}
```

- [ ] **Étape 5 : écrire `apps/web/src/ui/IconButton.tsx`**

```tsx
import { For, Show, children, createEffect, createSignal, type JSX } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { ICONS, ICON_VIEWBOX } from "./icons";
import { createTip, placeTip } from "./tooltip";

/** Attributs d'accessibilité du svg (L1-4) : jamais annoncé, jamais focusable. */
const SVG_A11Y = { "aria-hidden": "true", focusable: "false" } as const;

/** Icône de la table `ICONS` (L1-1) : tracés rendus par `Dynamic` dans un `<svg>`, jamais par innerHTML. */
export function Icon(props: { name: string }): JSX.Element {
  const node = () => (Object.hasOwn(ICONS, props.name) ? ICONS[props.name]! : []);
  return (
    <svg
      class="rb-icon"
      data-icon={props.name}
      viewBox={ICON_VIEWBOX}
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...SVG_A11Y}
    >
      <For each={node()}>{([tag, attrs]) => <Dynamic component={tag as string} {...attrs} />}</For>
    </svg>
  );
}

/** Infobulle posée en px entiers sous son bouton (L1-4) ; recalculée quand le libellé change. */
function Bubble(props: { label: string; anchor: HTMLElement }): JSX.Element {
  let el: HTMLDivElement | undefined;
  const [at, setAt] = createSignal<{ left: number; top: number } | null>(null);
  createEffect(() => {
    void props.label;
    if (el === undefined) return;
    const size = el.getBoundingClientRect();
    setAt(placeTip(props.anchor.getBoundingClientRect(), { width: size.width, height: size.height }, { width: window.innerWidth, height: window.innerHeight }));
  });
  return (
    <div
      ref={el}
      class="rb-tip"
      role="tooltip"
      style={at() === null ? { visibility: "hidden" } : { left: `${at()!.left}px`, top: `${at()!.top}px` }}
    >
      {props.label}
    </div>
  );
}

export interface IconButtonProps {
  readonly icon: string | null;
  readonly label: string;
  readonly pressed?: boolean | null;
  readonly disabled?: boolean;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly children?: JSX.Element;
  readonly onPress: () => void;
}

/** Bouton de barre (L1-4, L1-5) : icône ou pastille, `aria-label`, libellé en `rb-sr` (le `textContent` reste le libellé),
 *  infobulle maison dans `body`. Sans icône ni pastille : le libellé en texte, jamais un bouton vide. */
export function IconButton(props: IconButtonProps): JSX.Element {
  const tip = createTip();
  const kids = children(() => props.children);
  const graphic = (): boolean => props.icon !== null || kids.toArray().length > 0;
  const cls = (): string | undefined =>
    [props.attrs?.class, graphic() ? "rb-ib" : undefined].filter((c) => c !== undefined).join(" ") || undefined;
  let button: HTMLButtonElement | undefined;
  return (
    <>
      <button
        {...(props.attrs ?? {})}
        ref={button}
        type="button"
        class={cls()}
        aria-label={props.label}
        aria-pressed={props.pressed ?? undefined}
        disabled={props.disabled === true}
        onClick={() => props.onPress()}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") tip.enter();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") tip.leave();
        }}
        onPointerDown={(e) => tip.down(e.pointerType)}
        onPointerUp={() => tip.up()}
        onPointerCancel={() => tip.up()}
        onFocus={() => tip.focus()}
        onBlur={() => tip.blur()}
      >
        <Show when={graphic()} fallback={props.label}>
          <Show when={props.icon} fallback={kids()}>
            {(name) => <Icon name={name()} />}
          </Show>
          <span class="rb-sr">{props.label}</span>
        </Show>
      </button>
      <Show when={tip.shown()}>
        <Portal>
          <Bubble label={props.label} anchor={button!} />
        </Portal>
      </Show>
    </>
  );
}
```

Si `tsc` refuse la décomposition `{...attrs}` sur `Dynamic`, garder `component={tag as string}` (props alors
`Record<string, unknown>`) : c'est la forme voulue, pas un contournement.

- [ ] **Étape 6 : lancer, constater le vert** (et la garde de `Toolbar.test.tsx`)

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/tooltip.test.ts src/ui/IconButton.test.tsx src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | tail -80 && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -15`
Attendu : 0 `FAIL `, `tooltip.test.ts` 14 tests, `IconButton.test.tsx` 11 tests, `appui long au doigt` et
`bouton démonté` présents ; `tsc` sans sortie, code 0.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add apps/web/src/ui/tooltip.ts
git add apps/web/src/ui/tooltip.test.ts
git add apps/web/src/ui/IconButton.tsx
git add apps/web/src/ui/IconButton.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): icon button with accessible name and tooltip (design L1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T3 — Branchement de la barre et icône d'état
<a id="tache-t3"></a>

**Objectif.** `ItemState` publie une icône d'état (`annotation-pointer`, `annotation-freeze` sans bureau vivant) ;
`Toolbar.tsx` rend ses outils, ses actions, les 9 actions du tableau et les pastilles par `IconButton` (cadrage L1-3,
L1-5, L1-9 a, b, d).

**Fichiers.**
- Modifier : `apps/web/src/ui/item-state.ts:45`, `:63-74` ; `apps/web/src/ui/Toolbar.tsx:1-25` (imports), `:46-59`
  (`Button`), `:111-123` (préréglages, « Aucune »), `:151-175` (rangée du tableau)
- Tests : `apps/web/src/ui/item-state.test.ts` (ajouts en fin), `apps/web/src/ui/Toolbar.test.tsx` (ajouts en fin)

**Interfaces.**
- Consomme (T1) : `iconFor(item: ToolItem, stateIcon?: string): string | null`, `ICONS` ; (T2) :
  `IconButton(props: { icon: string | null; label: string; pressed?: boolean | null; disabled?: boolean; attrs?: Readonly<Record<string, string>>; children?: JSX.Element; onPress: () => void })` ;
  le svg porte `data-icon={nom}`.
- Réutilise : `apps/web/src/ui/item-state.ts:116` (`itemState`), `:54` (`ACTION_STATE`) — `ItemState` gagne
  `readonly icon?: string` ; deux entrées d'`ACTION_STATE` le posent (étendre).
- Réutilise : `apps/web/src/ui/Toolbar.tsx:46` (`Button`), `:71` (`RENDER`) — `Button` rend `IconButton` ; `RENDER`
  inchangé (étendre).
- Produit : `interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string; readonly icon?: string }`.
- Rapport : `Réutilisation : appelé item-state.ts (itemState, ACTION_STATE), Toolbar.tsx (Button, RENDER)` ou
  `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui --reporter=dot 2>&1 | tail -25 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/ui/item-state.test.ts --reporter=verbose 2>&1 | grep -E "S3|S4|icône d'état|Tests " && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -15`
Preuve : `src/ui` 0 `FAIL ` ; `S4 : jamais un bouton vide`, `S3 : bascule Souris / Dessin`, `icône d'état` présents ;
`tsc` code 0. Tests à garder verts sans retouche (G4) : `Toolbar.test.tsx:125`, `:199-203`, `:242-243`, `:309`,
`App.test.tsx:618`.

**Contraintes (recopiées).** G1 test rouge d'abord, aucun test sauté · G2 aucune dépendance · G4 tests existants
verts sans réécriture de fond (un échec de fond arrête la tâche) · G7 `nice -n 10`, PATH exporté · G8 auteur et
message (anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), fichiers un par un · G9 temporaires dans
`~/.cache/tmp/of43-*` · G12 `toolbar.ts`, `toolbar-profiles.ts`, `PagesBar.tsx`, `SelectionRow.tsx`, `FormatRow.tsx`
non modifiés, format `.rbprofile` inchangé · G13 aucun `\d+px` ni `switch (` dans `Toolbar.tsx`.

**Interdits.** Aucun attribut `title` sur les boutons rendus (le `title` du curseur de tolérance, `Toolbar.tsx:124`,
reste) ; ne pas retoucher les tests existants ; ne pas changer `RENDER` ni l'ordre des éléments ; `eraser-mode` sans
icône d'état (H13).

**Terminé quand.** `src/ui` vert, `tsc` vert, commit fait.

- [ ] **Étape 1 : tests rouges de l'icône d'état** — ajouter en fin de `apps/web/src/ui/item-state.test.ts` (les
  helpers `view` et `action` du fichier existent déjà, l. 6-10) :

```ts
import { ICONS } from "./icons";

describe("icône d'état (design-l1, L1-3)", () => {
  const ann = (over: Partial<NonNullable<ToolbarView["annotation"]>> = {}): ToolbarView =>
    view({ annotation: { active: true, pointer: "draw", screens: 1, ...over } });
  it("annotation-pointer : « Souris » → pointer, « Dessin » → pen-line", () => {
    expect(itemState(action("annotation-pointer"), ann())).toMatchObject({ label: "Souris", icon: "pointer" });
    expect(itemState(action("annotation-pointer"), ann({ pointer: "mouse" }))).toMatchObject({ label: "Dessin", icon: "pen-line" });
  });
  it("annotation-freeze : « Recapturer le bureau » → reset ; figer et bureau vivant : aucune icône d'état", () => {
    expect(itemState(action("annotation-freeze"), ann({ live: false }))).toMatchObject({ label: "Recapturer le bureau", icon: "reset" });
    expect(itemState(action("annotation-freeze"), ann()).icon).toBeUndefined();
    expect(itemState(action("annotation-freeze"), ann({ frozen: true })).icon).toBeUndefined();
  });
  it("eraser-mode : aucune icône d'état dans les deux modes (H13)", () => {
    expect(itemState(action("eraser-mode"), view()).icon).toBeUndefined();
    expect(itemState(action("eraser-mode"), view({ eraserMode: "object" })).icon).toBeUndefined();
  });
  it("chaque icône d'état est une clé d'ICONS", () => {
    for (const icon of ["pointer", "pen-line", "reset"]) expect(Object.hasOwn(ICONS, icon), icon).toBe(true);
  });
});
```
(Placer l'`import` avec les autres imports en tête du fichier.)

- [ ] **Étape 2 : tests rouges de la barre** — ajouter en fin de `apps/web/src/ui/Toolbar.test.tsx` (helpers
  existants : `setup`, `mkBar`, `tool`, `VIEW`, `NO_CAPS`, `PEN`, `outils`, `presetIds`) :

```tsx
describe("Toolbar — icônes (design-l1, S3, S4)", () => {
  const iconOf = (root: ParentNode, sel: string): string | null =>
    root.querySelector(`${sel} svg.rb-icon`)?.getAttribute("data-icon") ?? null;
  const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };

  it("S4 : item.icon inconnu ou hérité → icône de la table ; item.icon connu → prioritaire", () => {
    const { container } = setup(mkBar([{ ...tool("pen"), icon: "inconnue" }, { ...tool("eraser"), icon: "rect" }, { ...tool("hand"), icon: "__proto__" }]));
    expect(iconOf(container, '[data-item="pen"]')).toBe("pen");
    expect(iconOf(container, '[data-item="eraser"]')).toBe("rect");
    expect(iconOf(container, '[data-item="hand"]')).toBe("hand");
    cleanup();
    const stylo = setup(mkBar([{ ...tool("pen"), icon: "rect" }]));
    expect(iconOf(stylo.container, '[data-item="pen"]')).toBe("rect");
  });
  it("S4 : jamais un bouton vide — chaque bouton des profils livrés a icône, nom accessible et libellé en texte", () => {
    let n = 0;
    for (const p of BUILTIN_PROFILES) {
      for (const bar of p.toolbars) {
        const { container, unmount } = setup(bar, ALL);
        for (const b of container.querySelectorAll<HTMLButtonElement>("button[data-item]")) {
          const id = b.getAttribute("data-item") ?? "?";
          expect(b.querySelector("svg.rb-icon"), id).not.toBeNull();
          expect(b.getAttribute("aria-label"), id).toBeTruthy();
          expect(b.textContent, id).toBe(b.getAttribute("aria-label"));
          expect(b.hasAttribute("title"), id).toBe(false);
          n++;
        }
        unmount();
      }
    }
    expect(n).toBeGreaterThan(20);
  });
  it("S3 : « Annuler » a le nom accessible « Annuler », svg caché aux lecteurs d'écran", () => {
    const { container } = setup();
    const undo = container.querySelector('button[data-item="undo"]')!;
    expect(undo.getAttribute("aria-label")).toBe("Annuler");
    expect(undo.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(iconOf(container, '[data-item="undo"]')).toBe("undo");
  });
  it("S3 : bascule Souris / Dessin en annotation : l'icône suit le libellé", () => {
    const { container, setV } = setup(mkBar([tool("pen")]), { ...NO_CAPS, desktopAnnotation: true }, "m", undefined, "desktop-annotation");
    const sel = '[data-item="annotation-pointer-ajout"]';
    setV({ ...VIEW, annotation: { active: true, pointer: "draw", screens: 1 } });
    expect(container.querySelector(sel)!.textContent).toBe("Souris");
    expect(iconOf(container, sel)).toBe("pointer");
    setV({ ...VIEW, annotation: { active: true, pointer: "mouse", screens: 1 } });
    expect(container.querySelector(sel)!.textContent).toBe("Dessin");
    expect(iconOf(container, sel)).toBe("pen-line");
  });
  it("rangée du tableau : 9 actions en icônes ; pastilles sans title, pastille + rb-sr", () => {
    const { container, setV } = setup();
    setV({ ...VIEW, tool: "table", tableCell: { id: "t", row: 0, col: 0, rows: 3, cols: 4 } });
    expect([...container.querySelectorAll("[data-table-action] svg.rb-icon")].map((s) => s.getAttribute("data-icon"))).toEqual([
      "between-horizontal-start", "between-vertical-start", "row-remove", "col-remove", "columns-3", "table-cells-merge", "table-cells-split", "droplet", "droplet-off",
    ]);
    for (const f of container.querySelectorAll("button[data-table-fill]")) {
      expect(f.hasAttribute("title")).toBe(false);
      expect(f.querySelector(".rb-swatch.rb-swatch-square")).not.toBeNull();
      expect(f.querySelector(".rb-sr")?.textContent).toBe(f.getAttribute("aria-label"));
    }
  });
  it("préréglages et « Aucune » : pastille seule, libellé en rb-sr, aucun title", () => {
    const { container, setV } = setup(outils, NO_CAPS, "m", PEN);
    const rouge = container.querySelector('button[data-preset="rouge"]')!;
    expect([rouge.hasAttribute("title"), rouge.getAttribute("aria-label"), rouge.querySelector(".rb-sr")?.textContent]).toEqual([false, "Rouge", "Rouge"]);
    expect(rouge.classList.contains("rb-preset")).toBe(true);
    setV({ ...VIEW, tool: "fill" });
    const none = container.querySelector("button[data-fill-none]")!;
    expect([none.hasAttribute("title"), none.getAttribute("aria-label")]).toEqual([false, "Aucune"]);
  });
});
```
`RuntimeCapabilities` et `cleanup` sont déjà importés (l. 2, 7) ; aucun import nouveau.

- [ ] **Étape 3 : lancer, constater l'échec**

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/ui/item-state.test.ts 2>&1 | tail -25`
Attendu : `FAIL ` sur les nouveaux tests seulement (`icon` indéfini, `svg.rb-icon` absent) ; les tests existants
passent encore.

- [ ] **Étape 4 : `item-state.ts`** — remplacer la ligne 45 :

```ts
export interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string; readonly icon?: string }
```
et les entrées `annotation-pointer` et `annotation-freeze` (l. 63-74) :

```ts
  "annotation-pointer": (v) => {
    const mouse = v.annotation?.pointer === "mouse";
    // design-l1 (L1-3, H5) : l'icône suit le libellé ; `pen-line` reste distinct de l'outil Stylo `pen`.
    return { pressed: null, label: mouse ? "Dessin" : "Souris", icon: mouse ? "pen-line" : "pointer", disabled: v.annotation?.active !== true };
  },
  "annotation-screen": (v) => ({ disabled: v.annotation?.active !== true || v.annotation.screens <= 1 }),
  "annotation-freeze": (v) => {
    const a = v.annotation;
    const disabled = a?.active !== true;
    if (a?.live === false) return { pressed: null, label: "Recapturer le bureau", icon: "reset", disabled };
    const frozen = a?.frozen === true;
    return { pressed: frozen, label: frozen ? "Bureau vivant" : "Figer le bureau", disabled };
  },
```

- [ ] **Étape 5 : `Toolbar.tsx`** — ajouter aux imports (après `import { SelectionRow } from "./SelectionRow";`) :

```tsx
import { IconButton } from "./IconButton";
import { iconFor } from "./icons";
```
Remplacer `Button` (l. 46-59) :

```tsx
function Button(props: { item: ToolItem; ctx: Ctx; onPress: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.ctx.view()));
  return (
    <IconButton
      icon={iconFor(props.item, st().icon)}
      label={st().label}
      pressed={st().pressed}
      disabled={st().disabled}
      attrs={{ "data-item": props.item.id }}
      onPress={() => props.onPress()}
    />
  );
}
```
Remplacer les deux boutons de `PresetRow` (l. 111-123) :

```tsx
      <For each={list()}>
        {(p) => (
          <IconButton icon={null} label={p.label} attrs={{ class: "rb-preset", "data-preset": p.id }} onPress={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
          </IconButton>
        )}
      </For>
      <Show when={isFill()}>
        <IconButton icon={null} label={FILL_NONE_LABEL} attrs={{ class: "rb-preset", "data-fill-none": "" }} onPress={() => props.host.fillColor(null)}>
          <span class="rb-swatch" aria-hidden="true" style={{ "background-color": "transparent" }} />
        </IconButton>
```
(le `<label class="rb-fill-tolerance" …>` qui suit est inchangé). Remplacer le corps des deux `<For>` de
`TableActionRow` (l. 151-175) :

```tsx
      <For each={TABLE_ACTIONS}>
        {(id) => {
          const item = tableItem(id);
          const st = createMemo(() => itemState(item, props.view()));
          return (
            <IconButton
              icon={iconFor(item, st().icon)}
              label={st().label}
              disabled={st().disabled}
              attrs={{ "data-table-action": id }}
              onPress={() => props.host.runAction(id)}
            />
          );
        }}
      </For>
      <For each={TABLE_FILLS}>
        {(f) => (
          <IconButton
            icon={null}
            label={f.label}
            disabled={!props.view().tableCell}
            attrs={{ class: "rb-preset", "data-table-fill": f.id }}
            onPress={() => props.host.tableFill(f.color)}
          >
            <span class="rb-swatch rb-swatch-square" aria-hidden="true" style={{ "background-color": f.color ?? "transparent" }} />
          </IconButton>
        )}
      </For>
```

- [ ] **Étape 6 : lancer, constater le vert** — commande bornée de la section (vitest `src/ui`, sortie filtrée,
  `tsc`). Attendu : 0 `FAIL `, les trois noms présents, `tsc` code 0.

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add apps/web/src/ui/item-state.ts
git add apps/web/src/ui/item-state.test.ts
git add apps/web/src/ui/Toolbar.tsx
git add apps/web/src/ui/Toolbar.test.tsx
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): toolbar renders icon buttons, state icons for annotation (design L1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T4 — Jetons, tailles et couleurs de `rb.css`
<a id="tache-t4"></a>

**Objectif.** Recopier les jetons de la charte en tête de `rb.css`, passer aux tailles S 44 / M 48 / L 64, styler les
barres et le bouton à icône, poser `.rb-sr` et `.rb-tip`, remplacer les couleurs hors charte ligne par ligne (cadrage
L1-6, L1-9 c, e, f), puis **mesurer** la scène outil Tableau actif en 1280 × 900.

**Fichiers.**
- Modifier : `apps/web/src/ui/rb.css:1-8`, `:9`, `:15`, `:23-25`, `:45`, `:71`, `:79`, `:96`, `:98-100`, `:109`,
  `:123`, `:136`, `:139` ; `scripts/essais/c7b-texte-riche-navigateur.mjs:309`
- Créer : `apps/web/src/ui/rb-css.test.ts`

**Interfaces.**
- Consomme (T2) : classes `rb-ib` (bouton à icône ou pastille), `rb-icon` (svg), `rb-sr` (libellé), `rb-tip`
  (infobulle dans `body`).
- Produit : variables `--rf-*` (29 déclarations), `--rb-btn-s: 44px`, `--rb-btn-m: 48px`, `--rb-btn-l: 64px`,
  `--rb-icon: 24px`, `--rb-cell: 36px`.
- Réutilise : aucun module à appeler (règles CSS existantes étendues : `rb.css` est dans la carte d'impact, pas dans
  la liste des modules).

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui --reporter=dot 2>&1 | tail -20 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -8 && node scripts/essais/c7b-texte-riche-navigateur.mjs 2>&1 | tail -30 && node scripts/essais/c10a-tableau-navigateur.mjs 2>&1 | tail -6 && node scripts/essais/c1-profils-navigateur.mjs 2>&1 | tail -6`
Preuve : `rb-css.test.ts` ≥ 7 tests, `src/ui` 0 `FAIL ` (dont `App.test.tsx:385-401`, `PagesBar.test.tsx:125-160`,
`TabsBar.test.tsx:92-104`, `Toolbar.test.tsx:309-325`, à garder verts) ; build `✓ built` ; `C7b texte riche : OK`,
ligne `la boîte de #stage est immobile à l'ouverture de la cellule (W × H px, ≥ 640)` dont **H** est la hauteur de
scène outil Tableau actif à consigner au rapport ; c10a et `C1 : OK`.

**Contraintes (recopiées).** G1 test rouge d'abord, aucun seuil baissé (`stageBox(page, 640)` intouché) · G4 essais
existants verts sans réécriture de fond, seule retouche admise `c7b:309` (forme), à citer dans la PR · G5 aucun pixel
de hauteur ajouté à une barre (ni filet, ni bordure, ni `padding` de plus sur `.rb-bar`) · G2 aucune dépendance ·
G7 `nice -n 10`, PATH exporté, aucun `tauri build` · G8 auteur et message (anglais, `Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>`), fichiers un par un · G9 temporaires dans `~/.cache/tmp/of43-*`, aucun processus laissé.

**Interdits.** Ne pas toucher `rb.css:77`, `:78` (bande et onglets, L2), l'intérieur des panneaux (`:55`, `:63`,
`:113`, `:116`), `:87`, les ombres `rgba(0, 0, 0, 0.2)`, les couleurs d'erreur et du canvas ; ne pas appliquer
`--rf-font` (H6) ; aucune règle `.rb-bar … .rb-sr` ni `.rb-bar … .rb-tip` (`App.test.tsx:389-393`). **Scène sous
640 px outil Tableau actif : s'arrêter, rendre la valeur, ne rien baisser.**

**Terminé quand.** Tests et essais verts, hauteur H relevée (≥ 640) et écrite au rapport, commit fait.

- [ ] **Étape 1 : test rouge** — `apps/web/src/ui/rb-css.test.ts`

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "rb.css"), "utf8").replace(/\s+/g, " ");
const MAQUETTE = readFileSync(join(__dirname, "..", "..", "..", "..", "docs", "design", "maquettes", "01-tableau.html"), "utf8");
/** Corps de la règle dont le sélecteur est exactement `sel` ; "" si absente. */
const rule = (sel: string): string =>
  (CSS.replace(/\/\*.*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? []).find((r) => r.split("{")[0]!.trim() === sel) ?? "";

describe("rb.css (design-l1, L1-6)", () => {
  it("les 29 jetons --rf-* de la maquette 01 sont recopiés à l'identique", () => {
    const start = MAQUETTE.indexOf(":root {");
    const root = MAQUETTE.slice(start, MAQUETTE.indexOf("}", start));
    const decls = [...root.matchAll(/(--rf-[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => `${k}: ${v!.replace(/\s+/g, " ").trim()};`);
    expect(decls).toHaveLength(29);
    for (const d of decls) expect(CSS, d).toContain(d);
  });
  it("tailles S 44, M 48, L 64, icône 24, cases du sélecteur 36", () => {
    for (const d of ["--rb-btn-s: 44px;", "--rb-btn-m: 48px;", "--rb-btn-l: 64px;", "--rb-icon: 24px;", "--rb-cell: 36px;"]) expect(CSS).toContain(d);
    expect(rule(".rb-table-picker-grid")).toContain("repeat(8, var(--rb-cell))");
    expect(rule(".rb-table-picker-grid button")).toMatch(/inline-size: var\(--rb-cell\); block-size: var\(--rb-cell\);/);
  });
  it("accents hors charte retirés ; #a1a1aa ne reste que sur la bande et les onglets (L2)", () => {
    for (const c of ["#1e3a8a", "#94a3b8", "#bfdbfe"]) expect(CSS.toLowerCase(), c).not.toContain(c);
    const keep = (CSS.match(/[^{}]+\{[^}]*#a1a1aa[^}]*\}/gi) ?? []).map((r) => r.replace(/\/\*.*?\*\//g, "").split("{")[0]!.trim());
    expect(keep).toEqual([".rb-tabs", ".rb-tab"]);
  });
  it("barre : fond blanc, padding 4px, aucune bordure (aucun pixel de hauteur ajouté)", () => {
    const bar = rule(".rb-bar");
    expect(bar).toContain("background: var(--rf-white);");
    expect(bar).toContain("padding: 4px;");
    expect(bar).not.toMatch(/border/);
  });
  it("bouton : sans bordure, rayon lg, navy ; survol gris ; enfoncé et page violets ; grisé ; focus en outline", () => {
    expect(rule(".rb-bar button")).toMatch(/border: none;.*border-radius: var\(--rf-radius-lg\);.*background: transparent;.*color: var\(--rf-navy-500\);/);
    expect(CSS).toMatch(/:hover \{ background: var\(--rf-gray-50\); \}/);
    const on = "background: var(--rf-violet-100); border-color: var(--rf-violet-600); color: var(--rf-violet-700);";
    expect(rule('.rb-bar button[aria-pressed="true"]')).toContain(on);
    expect(rule('.rb-bar button[aria-current="page"]')).toContain(on);
    expect(rule('.rb-media-bar-inner button[aria-pressed="true"]')).toContain(on);
    expect(rule(".rb-bar button:disabled")).toContain("color: var(--rf-gray-500);");
    expect(rule(".rb-bar button:focus-visible")).toContain("outline: 2px solid var(--rf-violet-600);");
    expect(rule('.rb-tab[aria-selected="true"]')).toContain("border-color: var(--rf-violet-600);");
  });
  it("bouton à icône carré de --rb-btn, icône de --rb-icon", () => {
    expect(rule(".rb-bar button.rb-ib")).toMatch(/inline-size: var\(--rb-btn\);.*block-size: var\(--rb-btn\);.*padding: 0;.*flex: none;/);
    expect(rule(".rb-icon")).toMatch(/inline-size: var\(--rb-icon\);.*block-size: var\(--rb-icon\);/);
  });
  it(".rb-sr et .rb-tip de premier niveau ; infobulle fixe, inerte, navy, sans transform", () => {
    expect(rule(".rb-sr")).toContain("position: absolute;");
    const tip = rule(".rb-tip");
    expect(tip).toMatch(/position: fixed;.*pointer-events: none;.*background: var\(--rf-navy-500\);.*color: var\(--rf-white\);.*font-size: 14px;.*font-weight: 500;.*border-radius: var\(--rf-radius-md\);.*box-shadow: var\(--rf-shadow-card\);/);
    expect(tip).not.toMatch(/transform/);
    expect(CSS).not.toMatch(/\.rb-bar[^{}]*\.rb-(sr|tip)\b/);
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui/rb-css.test.ts 2>&1 | tail -20`
Attendu : `FAIL `, 7 tests en échec.

- [ ] **Étape 3 : `rb.css`, en-tête** — remplacer les lignes 1-8 (`:root { … }`) par :

```css
:root {
  /* Jetons de la charte RoomFlow (design-l1, L1-6), recopiés de docs/design/maquettes/01-tableau.html:12-33 ; source de
     chaque valeur dans docs/design/charte.md. rf2 = roomflow2@ddaba7ca RoomFlow2.App/Themes ; web = roomflow2-web@07cc047c src/index.css */
  --rf-violet-600: #6044EB; /* rf2 Tokens.Base.xaml:12 RF.Base.Violet600Color = RF.Accent.Brush */
  --rf-violet-700: #4F35C4; /* rf2 Tokens.Base.xaml:13 = RF.Accent.HoverBrush */
  --rf-violet-400: #8B6FEF; /* rf2 Tokens.Base.xaml:14 = RF.Nav.AccentBrush (accent sur fond sombre) */
  --rf-violet-100: #EDE8FD; /* rf2 Tokens.Base.xaml:15 = RF.Accent.SubtleBrush */
  --rf-navy-900: #0D1B2A;   /* rf2 Tokens.Base.xaml:18 */
  --rf-navy-700: #1E3355;   /* rf2 Tokens.Base.xaml:20 */
  --rf-navy-500: #182946;   /* rf2 Tokens.Base.xaml:22 = RF.Text.HeadingBrush, RF.Studio.TextBrush */
  --rf-gray-50: #F5F5F8;    /* rf2 Tokens.Base.xaml:26 = RF.App.BackgroundBrush, RF.Studio.CanvasBrush */
  --rf-gray-100: #FAFAFE;   /* rf2 Tokens.Base.xaml:27 */
  --rf-gray-300: #E0E0E8;   /* rf2 Tokens.Base.xaml:28 = RF.Border.Brush */
  --rf-gray-500: #888888;   /* rf2 Tokens.Base.xaml:29 = RF.Text.SecondaryBrush (icône désactivée seulement) */
  --rf-gray-800: #333333;   /* rf2 Tokens.Base.xaml:30 = RF.Text.PrimaryBrush */
  --rf-text-muted-aa: #6B7280; /* web index.css:34 --color-text-muted-aa (texte secondaire lisible) */
  --rf-white: #FFFFFF;      /* rf2 Tokens.Base.xaml:31 */
  --rf-danger: #E74C3C;     /* rf2 Tokens.Base.xaml:44 = RF.Status.DangerBrush */
  --rf-success: #27AE60;    /* rf2 Tokens.Base.xaml:36 = RF.Status.SuccessBrush */
  --rf-shadow-card: 0 2px 8px rgba(24, 41, 70, 0.08);   /* web index.css:63 = RF.Shadow.Card */
  --rf-shadow-hover: 0 6px 16px rgba(24, 41, 70, 0.12); /* web index.css:64 = RF.Shadow.Hover */
  --rf-shadow-modal: 0 13px 27px rgba(24, 41, 70, 0.15); /* web index.css:65 = RF.Shadow.Modal */
  --rf-radius-sm: 4px; --rf-radius-md: 6px; --rf-radius-lg: 8px; --rf-radius-xl: 12px; /* rf2 Tokens.Semantic.xaml:99-102 */
  --rf-space-xs: 4px; --rf-space-sm: 8px; --rf-space-md: 16px; --rf-space-lg: 24px; --rf-space-xl: 32px; /* rf2 Tokens.Semantic.xaml:91-95 */
  --rf-font: "Inter", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; /* rf2 Tokens.Semantic.xaml:77 ; déclaré, non appliqué : Inter n'est pas embarquée (Q6, H6) */
  /* RoomBoard : tailles de bouton S / M / L et icône (design-cadrage D-DS3, D-DS4 ; noms des jetons de profil inchangés). */
  --rb-btn-s: 44px;
  --rb-btn-m: 48px;
  --rb-btn-l: 64px;
  --rb-icon: 24px;
  /* Cases du sélecteur de tableau : seules hors de la règle S/M/L (H8). */
  --rb-cell: 36px;
  --rb-tab-h: 36px;
  --rb-gap: 8px;
  --rb-pad: 12px;
}
```

- [ ] **Étape 4 : `rb.css`, barres et boutons** — remplacer la ligne 9 :

```css
.rb-bar { display: flex; align-items: center; gap: 4px; padding: 4px; background: var(--rf-white); --rb-btn: var(--rb-btn-m); }
```
la ligne 15 :

```css
.rb-bar button { min-width: var(--rb-btn); min-height: var(--rb-btn); padding: 0 var(--rb-pad); border: none; border-radius: var(--rf-radius-lg); background: transparent; color: var(--rf-navy-500); }
```
les lignes 23-25 :

```css
.rb-bar button[aria-pressed="true"] { background: var(--rf-violet-100); border-color: var(--rf-violet-600); color: var(--rf-violet-700); }
.rb-bar button:not(:disabled, [aria-pressed="true"], [aria-current="page"]):hover { background: var(--rf-gray-50); }
.rb-bar button:disabled { color: var(--rf-gray-500); }
.rb-bar button:focus-visible { outline: 2px solid var(--rf-violet-600); outline-offset: 0; }
/* Bouton à icône ou pastille (design-l1, L1-4 à L1-6) : carré de --rb-btn, icône centrée ; l'emporte (0,2,1) sur les
   boutons resserrés des rangées contextuelles (0,2,0) et des barres horizontales (0,1,1). */
.rb-bar button.rb-ib { display: inline-grid; place-items: center; inline-size: var(--rb-btn); block-size: var(--rb-btn); padding: 0; flex: none; }
.rb-bar button.rb-ib .rb-swatch { inline-size: var(--rb-icon); block-size: var(--rb-icon); }
.rb-icon { display: block; flex: none; inline-size: var(--rb-icon); block-size: var(--rb-icon); }
/* Libellé lu par les lecteurs d'écran et par textContent, masqué à l'œil ; règle de premier niveau (App.test.tsx:389). */
.rb-sr { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
/* Infobulle (L1-4) : rendue dans body, jamais dans la barre ; left/top en px entiers posés par IconButton, aucun transform. */
.rb-tip { position: fixed; z-index: 10; pointer-events: none; padding: 6px 10px; background: var(--rf-navy-500); color: var(--rf-white); font-size: 14px; font-weight: 500; line-height: 20px; border-radius: var(--rf-radius-md); white-space: nowrap; box-shadow: var(--rf-shadow-card); }
.rb-sep { align-self: center; block-size: var(--rb-icon); border-inline-start: 1px solid var(--rf-gray-300); margin: 0 4px; }
.rb-drop { display: flex; align-items: center; padding: 0 8px; border: 1px dashed var(--rf-gray-300); min-height: var(--rb-btn); }
```

- [ ] **Étape 5 : `rb.css`, couleurs ligne par ligne** — remplacements exacts (le reste de chaque ligne inchangé) :
  - `:45` `.rb-popover` : `border: 1px solid #a1a1aa;` → `border: 1px solid var(--rf-gray-300);`
  - `:71` : `.rb-bar button[aria-current="page"] { background: var(--rf-violet-100); border-color: var(--rf-violet-600); color: var(--rf-violet-700); }`
  - `:79` : `.rb-tab[aria-selected="true"] { background: #ffffff; border-color: var(--rf-violet-600); font-weight: 600; }`
  - `:96` `.rb-table-picker` : `border: 1px solid #a1a1aa;` → `border: 1px solid var(--rf-gray-300);` (ombre gardée)
  - `:98` : `.rb-table-picker-grid { display: grid; grid-template-columns: repeat(8, var(--rb-cell)); gap: 2px; }`
  - `:99` : `.rb-table-picker-grid button { inline-size: var(--rb-cell); block-size: var(--rb-cell); padding: 0; border: 1px solid var(--rf-gray-300); background: #ffffff; }`
  - `:100` : `.rb-table-picker-grid button[data-on] { background: var(--rf-violet-100); border-color: var(--rf-violet-600); }`
  - `:109` : `.rb-menu-sep { border-block-start: 1px solid var(--rf-gray-300); margin: 4px 0; }`
  - `:123` : `.rb-bar[data-dock="left"] .rb-sep, .rb-bar[data-dock="right"] .rb-sep { align-self: auto; block-size: auto; border-inline-start: 0; border-block-start: 1px solid var(--rf-gray-300); margin: 4px 0; }`
  - `:136` `.rb-media-bar` : `border: 1px solid #a1a1aa;` → `border: 1px solid var(--rf-gray-300);` (ombre gardée)
  - `:139` : `.rb-media-bar-inner button[aria-pressed="true"] { background: var(--rf-violet-100); border-color: var(--rf-violet-600); color: var(--rf-violet-700); }`

- [ ] **Étape 6 : lancer les tests de l'interface** — `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/ui --reporter=dot 2>&1 | tail -20`
  Attendu : 0 `FAIL ` (`rb-css.test.ts` 7 tests verts, `App.test.tsx`, `PagesBar.test.tsx`, `TabsBar.test.tsx` verts).

- [ ] **Étape 7 : build et essai c7b rouge sur la forme** — `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -8 && node scripts/essais/c7b-texte-riche-navigateur.mjs 2>&1 | tail -30`
  Attendu : build `✓ built` ; c7b passe la ligne 216 (`… immobile à l'ouverture de la cellule (W × H px, ≥ 640)`,
  relever **H**) puis échoue à la ligne 309, `ÉCHEC — la boîte de #stage est immobile après la validation du tableau`
  (Texte 2 rangées, Tableau 3). Si c7b passe déjà : sauter l'étape 8 et le dire au rapport. Tout autre échec, ou
  H < 640 : arrêt, rapport.

- [ ] **Étape 8 : retouche de forme `c7b:309`** (L1-9 f) — remplacer :

```js
  check(sameBox(boxTool, await stageBox(page)), "la boîte de #stage est immobile après la validation du tableau");
```
par :

```js
  check(sameBox(boxTable, await stageBox(page)), "la boîte de #stage est immobile après la validation du tableau");
```
(`boxTable` est mesurée l. 208 avec l'outil Tableau actif, comme ici ; c7b:322 reclique Texte ensuite.)

- [ ] **Étape 9 : essais verts** — commande bornée de la section (relance build et c7b, puis c10a et c1-profils).
  Attendu : `C7b texte riche : OK`, c10a `: OK`, `C1 : OK` ; hauteur H recopiée au rapport (« scène outil Tableau
  actif, 1280 × 900 : H px »).

- [ ] **Étape 10 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add apps/web/src/ui/rb.css
git add apps/web/src/ui/rb-css.test.ts
git add scripts/essais/c7b-texte-riche-navigateur.mjs
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): RoomFlow tokens, S/M/L sizes, icon button and tooltip styles (design L1)" -m "c7b:309 now compares with boxTable (Table tool still active), shape-only change." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T5 — Mesure de netteté et essai navigateur
<a id="tache-t5"></a>

**Objectif.** Écrire les fonctions pures de mesure (`nettete.mjs`) testées sur des rangées fabriquées, étendre
`serve` d'une option `dist`, écrire l'essai `design-l1-navigateur.mjs` (calage, bord du Rectangle, franges,
contre-épreuve, tailles, infobulle au survol, au clavier et à l'appui long, captures) et le brancher dans
`verifier.sh --e2e` (cadrage L1-7, L1-8 ; § 10 du cadrage design).

**Patron à ne pas reprendre (concepteur-critique).** `scripts/essais/commun.mjs:72-96` (`inkIn`) lit le canvas de
scène `#scene` : il ne voit pas le rendu DOM des boutons. Ici, la mesure lit une **capture Playwright à 2x** décodée
dans un canvas de la page (`pixelsOf`), puis compte des pixels pleins, comme le § 10 (`docs/plans/design-cadrage.md:207-221`).
Une mesure sans contre-épreuve ne prouve rien : le témoin `viewBox="0 0 24 24"` doit donner ≥ 2 pixels
intermédiaires, sinon l'essai échoue (« mesure aveugle »).

**Fichiers.**
- Créer : `scripts/essais/nettete.mjs`, `scripts/tests/nettete.test.mjs`, `scripts/essais/design-l1-navigateur.mjs`
- Modifier : `scripts/essais/commun.mjs:38-57` (`serve`), `scripts/verifier.sh:32` et `:139-141`,
  `scripts/tests/verifier-e2e.test.sh:21`

**Interfaces.**
- Consomme (T2-T4) : `svg.rb-icon[data-icon]` dans les boutons, `[role="tooltip"].rb-tip` dans `body`,
  `button[data-item]`, `aria-label`, tailles 44 / 48 / 64, `[data-toolbar="outils"][data-size]`.
- Réutilise : `scripts/essais/commun.mjs:39` (`serve`) — étendu en `serve({ headers = {}, dist = DIST } = {})`.
- Réutilise : `scripts/essais/commun.mjs:27` (`loadPlaywright`), `:101` (`item`) — appelés tels quels ; et `DIST`,
  `Echec`, `ROOT`, `frames`, `gitSha`, `stageMouse` du même fichier.
- Produit (nouveau module ; `inkIn`, `commun.mjs:74`, non substituable) : `scripts/essais/nettete.mjs` —
  `pixelsOf(page, clip): Promise<{ width: number; height: number; data: Uint8ClampedArray }>` ;
  `edgeRow(px, y, x0, x1, bg, ink, tol = 1): { gray: number[]; intermediate: number; runs: number[] }` ;
  `fringes(px, bg, ink, tol = 2): number` ; en plus : `hex(s): number[]`, `gray(rgb): number`,
  `offSegment(p, bg, ink): number` (`bg`, `ink` : `[r, g, b]`).
- Rapport : `Réutilisation : appelé commun.mjs (serve étendu, loadPlaywright, item)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && nice -n 10 node --test scripts/tests/nettete.test.mjs 2>&1 | tail -12 && bash scripts/tests/verifier-e2e.test.sh && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -4 && node scripts/essais/design-l1-navigateur.mjs 2>&1 | tail -40`
Preuve : `# pass N`, N ≥ 7, `# fail 0` ; `verifier-e2e.test.sh : OK` ; essai `design L1 : OK` avec les lignes
`bord du Rectangle : 0 pixel intermédiaire`, `Rectangle : 0 frange colorée`, `infobulle : 0 frange colorée`,
`contre-épreuve : … (≥ 2)`, `rangée du Rectangle (gris, 2x) : 255 … 39 39 39 … 255`.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : la rangée de gris imprimée, le
nombre d'icônes calées (`calage : N icônes sur la grille de pixels`, N ≥ 20 en défaut et en S, ≥ 8 en simple), les tailles
`48 × 48`, `64 × 64`, `44 × 44`. Captures (`--captures`) : faites en T6.

**Contraintes (recopiées).** G1 test rouge d'abord · G10 netteté : 0 pixel intermédiaire au bord du Rectangle, 0
frange colorée, contre-épreuve qui doit échouer ; aucune tolérance relevée au-delà de 1 (plein) et 2 (segment) (H10) ·
G2 aucune dépendance (Playwright du cache npx, comme les autres essais) · G7 `nice -n 10`, PATH exporté, aucun
`tauri build` · G8 auteur et message (anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), fichiers un
par un · G9 temporaires dans `~/.cache/tmp/of43-*` (`TMPDIR` exporté), aucun serveur ni navigateur laissé en marche ·
G4 `verifier.sh` ne passe jamais `--captures`.

**Interdits.** Ne pas lire les pixels par `inkIn` ; ne pas relever une tolérance ni retirer la contre-épreuve pour
faire passer l'essai ; si le calage ou le bord échoue, rendre les valeurs lues (rangée de gris, positions) et
s'arrêter : le correctif est dans le CSS ou la mise en page, pas dans la mesure.

**Terminé quand.** Tests de netteté verts, garde `verifier-e2e` verte, essai `design L1 : OK` sur le build du
worktree, commit fait.

- [ ] **Étape 1 : test rouge** — `scripts/tests/nettete.test.mjs`

```js
// Tests des mesures de netteté (design-l1, L1-7 ; § 10 du cadrage design) sur des rangées fabriquées, et de
// serve({ dist }) (L1-8). Joué par scripts/verifier.sh hors du bloc --e2e (aucun navigateur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { edgeRow, fringes, gray, hex, offSegment } from "../essais/nettete.mjs";
import { serve } from "../essais/commun.mjs";

const W = [255, 255, 255];
const N = hex("#182946");
const MID = [139, 148, 162];
const rowPx = (cols) => ({ width: cols.length, height: 1, data: Uint8ClampedArray.from(cols.flatMap((c) => [...c, 255])) });

test("hex et gris : #182946 → [24, 41, 70], gris 39 ; blanc 255", () => {
  assert.deepEqual(N, [24, 41, 70]);
  assert.equal(gray(N), 39);
  assert.equal(gray(W), 255);
});
test("edgeRow : bord net, 0 pixel intermédiaire, deux traits de 3 pixels", () => {
  const cols = [W, W, N, N, N, W, W, W, N, N, N, W];
  const r = edgeRow(rowPx(cols), 0, 0, cols.length, W, N);
  assert.equal(r.intermediate, 0);
  assert.deepEqual(r.runs, [3, 3]);
  assert.deepEqual(r.gray, [255, 255, 39, 39, 39, 255, 255, 255, 39, 39, 39, 255]);
});
test("edgeRow : trait à cheval sur deux pixels (contre-épreuve) → intermédiaires comptés", () => {
  const r = edgeRow(rowPx([W, MID, N, N, MID, W]), 0, 0, 6, W, N);
  assert.equal(r.intermediate, 2);
  assert.deepEqual(r.runs, [2]);
});
test("edgeRow : tolérance 1 par composante pour « plein »", () => {
  assert.equal(edgeRow(rowPx([[254, 255, 255], [25, 42, 71]]), 0, 0, 2, W, N).intermediate, 0);
  assert.equal(edgeRow(rowPx([[253, 255, 255]]), 0, 0, 1, W, N).intermediate, 1);
});
test("offSegment : fond, encre et milieu sur le segment ; rouge loin", () => {
  assert.equal(offSegment(W, W, N), 0);
  assert.equal(offSegment(N, W, N), 0);
  assert.ok(offSegment(MID, W, N) <= 1);
  assert.ok(offSegment([200, 40, 40], W, N) > 2);
});
test("fringes : mélanges fond/encre → 0 ; un pixel coloré → 1", () => {
  const ok = { width: 3, height: 2, data: Uint8ClampedArray.from([W, MID, N, N, MID, W].flatMap((c) => [...c, 255])) };
  assert.equal(fringes(ok, W, N), 0);
  assert.equal(fringes(rowPx([W, [200, 40, 40], N]), W, N), 1);
  assert.equal(fringes(rowPx([N, MID, W]), N, W), 0);
});
test("serve({ dist }) sert un autre dossier que apps/web/dist", async () => {
  const dir = await mkdtemp(join(tmpdir(), "of43-serve-"));
  await writeFile(join(dir, "index.html"), "avant");
  const server = await serve({ dist: dir });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await res.text(), "avant");
  } finally {
    server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Étape 2 : garde rouge de `verifier.sh`** — ajouter après la ligne 21 de `scripts/tests/verifier-e2e.test.sh` :

```bash
# design L1 : ligne à part, comme C11b ; le test des mesures de netteté hors du bloc --e2e.
grep -q "scripts/essais/design-l1-navigateur.mjs" scripts/verifier.sh || ko "design-l1-navigateur absent de verifier.sh"
grep -q "node --test scripts/tests/nettete.test.mjs" scripts/verifier.sh || ko "nettete.test.mjs absent de verifier.sh"
```

- [ ] **Étape 3 : lancer, constater l'échec** — `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && mkdir -p "$TMPDIR" && node --test scripts/tests/nettete.test.mjs 2>&1 | tail -6; bash scripts/tests/verifier-e2e.test.sh; echo "code $?"`
  Attendu : `ERR_MODULE_NOT_FOUND` (`nettete.mjs`) ; `ECHEC : design-l1-navigateur absent de verifier.sh`, `code 1`.

- [ ] **Étape 4 : `serve` avec `dist`** — dans `scripts/essais/commun.mjs`, remplacer les lignes 38-48 :

```js
/** `headers` : en-têtes ajoutés à chaque réponse 200 (ex. la CSP de la coque). `dist` : dossier servi (défaut
 *  apps/web/dist ; design-l1 sert le build « avant » d'un autre worktree). */
export function serve({ headers = {}, dist = DIST } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
      const rel = normalize(path).replace(/^[/\\]+/, "");
      const file = join(dist, rel === "" ? "index.html" : rel);
      if (file !== dist && !file.startsWith(dist + sep)) {
        res.writeHead(403).end();
        return;
      }
```
(lignes 49-57 inchangées).

- [ ] **Étape 5 : `scripts/essais/nettete.mjs`**

```js
// Mesure de netteté du cadrage design § 10 (design-l1, L1-7) : pixels RVBA d'une capture Playwright, décodée dans un
// canvas de la page, et fonctions pures sur ces pixels. Réutilisable par les lots L2 à L5 (§ 10 : à refaire à chaque lot).

/** Pixels RVBA d'une zone de page en px CSS ; la capture suit le deviceScaleFactor du contexte (2x : 2 pixels par px). */
export async function pixelsOf(page, clip) {
  const png = await page.screenshot({ clip, animations: "disabled", caret: "hide", scale: "device" });
  const { width, height, data } = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return { width: d.width, height: d.height, data: Array.from(d.data) };
  }, png.toString("base64"));
  return { width, height, data: Uint8ClampedArray.from(data) };
}

/** `#rrggbb` → [r, g, b]. */
export const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
/** Gris Rec. 601 arrondi, comme les rangées du § 10 : `#182946` → 39. */
export const gray = ([r, g, b]) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
const at = (px, x, y) => {
  const i = (y * px.width + x) * 4;
  return [px.data[i], px.data[i + 1], px.data[i + 2]];
};
const near = (p, q, tol) => p.every((v, k) => Math.abs(v - q[k]) <= tol);

/** Rangée `y`, de `x0` (inclus) à `x1` (exclu) : gris imprimés, pixels ni fond ni encre (à `tol` près par composante),
 *  longueurs des suites d'encre. Bord net du § 10 : `intermediate === 0`, `runs` = [3, 3] pour le Rectangle à 2x. */
export function edgeRow(px, y, x0, x1, bg, ink, tol = 1) {
  const out = { gray: [], intermediate: 0, runs: [] };
  let run = 0;
  for (let x = x0; x < x1; x++) {
    const p = at(px, x, y);
    out.gray.push(gray(p));
    const isInk = near(p, ink, tol);
    if (!isInk && !near(p, bg, tol)) out.intermediate++;
    if (isInk) run++;
    else if (run > 0) {
      out.runs.push(run);
      run = 0;
    }
  }
  if (run > 0) out.runs.push(run);
  return out;
}

/** Écart (plus grande composante) entre `p` et le point le plus proche du segment RVB `bg` → `ink`. */
export function offSegment(p, bg, ink) {
  const d = ink.map((v, k) => v - bg[k]);
  const len = d.reduce((s, v) => s + v * v, 0);
  const dot = p.reduce((s, v, k) => s + (v - bg[k]) * d[k], 0);
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, dot / len));
  return Math.max(...p.map((v, k) => Math.abs(v - (bg[k] + t * d[k]))));
}

/** Pixels à plus de `tol` du segment fond → encre : franges colorées (0 attendu, § 10). */
export function fringes(px, bg, ink, tol = 2) {
  let n = 0;
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) if (offSegment(at(px, x, y), bg, ink) > tol) n++;
  }
  return n;
}
```

- [ ] **Étape 6 : brancher `verifier.sh`** — après `node --test scripts/tests/avis.test.mjs` (l. 32) :

```bash
node --test scripts/tests/nettete.test.mjs
```
et après `  echo "C11b capture : OK"` (l. 140), avant `  echo "verifier.sh : e2e OK"` :

```bash
  node scripts/essais/design-l1-navigateur.mjs
  echo "design L1 : OK"
```

- [ ] **Étape 7 : lancer tests et garde** — `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && nice -n 10 node --test scripts/tests/nettete.test.mjs 2>&1 | tail -10 && bash scripts/tests/verifier-e2e.test.sh`
  Attendu : `# pass 7`, `# fail 0` ; `verifier-e2e.test.sh : OK`.

- [ ] **Étape 8 : `scripts/essais/design-l1-navigateur.mjs`**

```js
#!/usr/bin/env node
// Essai design L1 au navigateur (docs/plans/design-l1-cadrage.md, L1-7, L1-8 ; S1, S2, S5) : netteté du § 10 du cadrage
// design (calage des icônes sur la grille de pixels, bord du Rectangle, franges, contre-épreuve), tailles S/M/L,
// infobulle (survol, clavier, appui long au doigt par CDP). Chromium de Playwright, 1920 × 1080 à 2x, --disable-lcd-text,
// --force-color-profile=srgb. Code de sortie : 0 réussi, 1 échec, 2 outil absent. Joué par scripts/verifier.sh --e2e,
// jamais avec --captures.
// Usage : node scripts/essais/design-l1-navigateur.mjs [--captures] [--dist <dossier> --nom avant]
//   --captures : docs/essais/design-l1-<nom>.png (fenêtre 3840 × 2160), design-l1-<nom>-barre.png, et pour l'après
//                design-l1-infobulle.png ; --dist : sert un autre build ; --nom avant : captures seules, mesures sautées.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DIST, Echec, ROOT, frames, gitSha, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";
import { edgeRow, fringes, hex, pixelsOf } from "./nettete.mjs";

const LABEL = "design L1";
const VIEW = { width: 1920, height: 1080 };
const ARGS = ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"];
const OUTILS = '[data-toolbar="outils"]';
const TIP = '[role="tooltip"]';
const WHITE = hex("#ffffff");
const NAVY = hex("#182946");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await frames(page);
}

/** Scène des captures (design-cadrage.md:49-50) : trois traits et un rectangle à la souris, puis Stylo actif, souris
 *  au milieu de la scène (hors de toute barre). */
async function drawScene(page) {
  const mouse = stageMouse(page);
  await page.click(item("pen"));
  for (const [y, dx] of [[200, 500], [300, 420], [400, 560]]) {
    await mouse.move(200, y);
    await mouse.down();
    await mouse.move(200 + dx, y + 60, { steps: 12 });
    await mouse.up();
  }
  await page.click(item("rect"));
  await mouse.move(900, 200);
  await mouse.down();
  await mouse.move(1300, 500, { steps: 12 });
  await mouse.up();
  await page.click(item("pen"));
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  await frames(page);
}

/** (1) Calage : chaque svg.rb-icon visible a x et y × 2 entiers et mesure 24 × 24. */
async function calage(page, label, min) {
  const boxes = await page.$$eval("svg.rb-icon", (els) =>
    els.filter((e) => e.getClientRects().length > 0).map((e) => {
      const r = e.getBoundingClientRect();
      return { icon: e.getAttribute("data-icon"), x: r.x, y: r.y, w: r.width, h: r.height };
    }));
  const bad = boxes.filter((b) => !Number.isInteger(b.x * 2) || !Number.isInteger(b.y * 2) || b.w !== 24 || b.h !== 24);
  check(boxes.length >= min && bad.length === 0, `calage (${label}) : ${boxes.length} icônes sur la grille de pixels${bad.length ? `, hors grille : ${JSON.stringify(bad)}` : ""}`);
}

async function size(page, sel, px, msg) {
  const b = await page.locator(sel).boundingBox();
  check(b !== null && b.width === px && b.height === px, `${msg} : ${b?.width} × ${b?.height} (attendu ${px} × ${px})`);
}

/** (2) Bord et (3) franges du Rectangle, souris hors de la barre. */
async function rectEdge(page) {
  const b = await page.locator(`${item("rect")} svg.rb-icon`).boundingBox();
  const px = await pixelsOf(page, b);
  check(px.width === 48 && px.height === 48, `capture de l'icône Rectangle : ${px.width} × ${px.height} pixels (48 × 48)`);
  const y = 12 * 2;
  const bg = [px.data[y * px.width * 4], px.data[y * px.width * 4 + 1], px.data[y * px.width * 4 + 2]];
  const row = edgeRow(px, y, 0, px.width, bg, NAVY);
  console.log(`rangée du Rectangle (gris, 2x) : ${row.gray.join(" ")}`);
  check(row.intermediate === 0, `bord du Rectangle : 0 pixel intermédiaire (${row.intermediate})`);
  check(JSON.stringify(row.runs) === "[3,3]", `bord du Rectangle : deux traits de 3 pixels d'encre (${JSON.stringify(row.runs)})`);
  const f = fringes(px, bg, NAVY);
  check(f === 0, `Rectangle : 0 frange colorée (${f})`);
}

/** (4) Contre-épreuve : un témoin sans calage (viewBox 0 0 24 24) doit montrer du flou, sinon la mesure est aveugle. */
async function counterProof(page) {
  await page.evaluate(() => {
    const ns = "http://www.w3.org/2000/svg";
    const host = document.createElement("div");
    host.id = "temoin-nettete";
    host.style.cssText = "position:fixed;left:200px;top:400px;width:24px;height:24px;background:#ffffff;color:#182946;z-index:50";
    const svg = document.createElementNS(ns, "svg");
    const attrs = { viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" };
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    svg.style.display = "block";
    const rect = document.createElementNS(ns, "rect");
    for (const [k, v] of Object.entries({ width: "18", height: "18", x: "3", y: "3", rx: "2" })) rect.setAttribute(k, v);
    svg.append(rect);
    host.append(svg);
    document.body.append(host);
  });
  await frames(page);
  const px = await pixelsOf(page, { x: 200, y: 400, width: 24, height: 24 });
  const row = edgeRow(px, 24, 0, px.width, WHITE, NAVY);
  console.log(`contre-épreuve (viewBox 0 0 24 24, gris) : ${row.gray.join(" ")}`);
  await page.evaluate(() => document.getElementById("temoin-nettete")?.remove());
  check(row.intermediate >= 2, `contre-épreuve : le témoin sans calage donne ${row.intermediate} pixels intermédiaires (≥ 2), la mesure n'est pas aveugle`);
}

/** S2 au survol, puis (3) franges de l'infobulle (coins arrondis exclus : 6 px de chaque côté). */
async function hoverTip(page, captures) {
  await page.hover(item("rect"));
  const tip = page.locator(TIP);
  await tip.waitFor({ state: "visible", timeout: 5000 });
  check((await tip.textContent()) === "Rectangle", "S2 : survol de « Rectangle » : infobulle « Rectangle »");
  const t = await tip.boundingBox();
  const b = await page.locator(item("rect")).boundingBox();
  check(t.y >= b.y + b.height, `S2 : infobulle sous le bouton (haut ${t.y}, bas du bouton ${b.y + b.height})`);
  check(Number.isInteger(t.x) && Number.isInteger(t.y), `infobulle posée en px entiers (${t.x}, ${t.y})`);
  check(await tip.evaluate((e) => e.closest(".rb-bar") === null), "infobulle hors de la barre");
  const px = await pixelsOf(page, { x: t.x + 6, y: t.y, width: Math.floor(t.width) - 12, height: t.height });
  const f = fringes(px, NAVY, WHITE);
  check(f === 0, `infobulle : 0 frange colorée (${f})`);
  if (captures) {
    const x = Math.floor(Math.min(b.x, t.x) - 16);
    const y = Math.floor(b.y - 16);
    const right = Math.ceil(Math.max(b.x + b.width, t.x + t.width) + 16);
    const bottom = Math.ceil(t.y + t.height + 16);
    const path = join(ROOT, "docs", "essais", "design-l1-infobulle.png");
    await page.screenshot({ path, clip: { x, y, width: right - x, height: bottom - y } });
    console.log(`capture : ${path}`);
  }
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  await tip.waitFor({ state: "detached", timeout: 5000 });
}

/** S2 et S3 au clavier : Tab jusqu'à « Annuler ». */
async function keyboardTip(page) {
  await page.focus(item("undo"));
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  check((await page.evaluate(() => document.activeElement?.getAttribute("data-item"))) === "undo", "Tab : focus sur « Annuler »");
  const tips = page.locator(TIP);
  check((await tips.count()) === 1 && (await tips.textContent()) === "Annuler", "S2 : au clavier, une seule infobulle « Annuler »");
  check((await page.getAttribute(item("undo"), "aria-label")) === "Annuler", "S3 : nom accessible « Annuler »");
  await page.evaluate(() => document.activeElement?.blur());
}

/** S5 : profil simple (gauche, L) puis retour au défaut ; taille S forcée sur la barre (aucun profil livré en S). */
async function sizes(page) {
  await size(page, item("pen"), 48, "S5 : bouton M du profil par défaut");
  await page.evaluate((sel) => document.querySelector(sel)?.setAttribute("data-size", "s"), OUTILS);
  await size(page, item("pen"), 44, "S5 : bouton S");
  await calage(page, "taille S", 20);
  await page.evaluate((sel) => document.querySelector(sel)?.setAttribute("data-size", "m"), OUTILS);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="simple"]');
  await frames(page);
  check((await page.locator(`${OUTILS}[data-dock="left"][data-size="l"]`).count()) === 1, "S5 : profil simple : barre à gauche, taille l");
  await size(page, item("pen"), 64, "S5 : bouton L du profil simple");
  await calage(page, "profil simple, L", 8);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="defaut"]');
  await frames(page);
  check((await page.locator(`${OUTILS}[data-dock="top"]`).count()) === 1, "retour au profil par défaut");
}

/** (5) Appui long au doigt (S2), contexte tactile, séance CDP : infobulle, clic au relâcher, aucun menu contextuel. */
async function longPress(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, hasTouch: true });
  try {
    const page = await ctx.newPage();
    await page.goto(url);
    await ready(page);
    await page.evaluate(() => {
      const b = document.querySelector('[data-item="eraser"]');
      window.__appui = [];
      for (const t of ["pointerdown", "pointerup", "click", "contextmenu"]) b.addEventListener(t, () => window.__appui.push(t));
    });
    const b = await page.locator(item("eraser")).boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const pt = { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await page.waitForTimeout(800);
    const tip = page.locator(TIP);
    check((await tip.isVisible()) && (await tip.textContent()) === "Gomme", "S2 : appui de 800 ms au doigt sur « Gomme » : infobulle « Gomme »");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
    const ev = await page.evaluate(() => window.__appui);
    console.log(`appui long : ${ev.join(", ")}`);
    check(["pointerdown", "pointerup", "click"].every((t) => ev.includes(t)) && !ev.includes("contextmenu"), "S2 : appui long : pointerdown, pointerup, click reçus, aucun contextmenu");
    check((await page.getAttribute(item("eraser"), "aria-pressed")) === "true", "S2 : au relâcher, la gomme est choisie");
  } finally {
    await ctx.close();
  }
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const dist = resolve(arg("--dist") ?? DIST);
  const nom = arg("--nom") ?? "apres";
  const captures = process.argv.includes("--captures");
  if (!existsSync(join(dist, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — ${dist}/index.html absent : construire d'abord l'application (scripts/verifier.sh)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ dist });
  const url = `http://127.0.0.1:${server.address().port}/`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ARGS });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await ready(page);
    await drawScene(page);
    if (captures) {
      const win = join(ROOT, "docs", "essais", `design-l1-${nom}.png`);
      await page.screenshot({ path: win });
      await page.locator(OUTILS).screenshot({ path: join(ROOT, "docs", "essais", `design-l1-${nom}-barre.png`) });
      console.log(`captures : ${win}, design-l1-${nom}-barre.png`);
    }
    if (nom === "avant") {
      console.log(`${LABEL} : captures « avant » seules, mesures sautées`);
      return 0;
    }
    await calage(page, "profil par défaut, M", 20);
    await rectEdge(page);
    await counterProof(page);
    await hoverTip(page, captures);
    await keyboardTip(page);
    await sizes(page);
    check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
    await longPress(browser, url);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
```

- [ ] **Étape 9 : jouer l'essai** — commande bornée de la section (build puis essai).
  Attendu : `design L1 : OK` ; lignes `rangée du Rectangle (gris, 2x) : 255 … 39 39 39 … 255 … 39 39 39 … 255`,
  `0 pixel intermédiaire`, `deux traits de 3 pixels`, `Rectangle : 0 frange colorée`, `infobulle : 0 frange colorée`,
  `contre-épreuve : … (≥ 2)`, `appui long : pointerdown, pointerup, click`. Un échec de calage ou de bord : rendre la
  rangée et les positions imprimées, s'arrêter.

- [ ] **Étape 10 : vérifier qu'aucun processus ne reste** — `pgrep -fa "design-l1-navigateur|chrome-headless|ms-playwright" | grep -v pgrep || echo "aucun processus"` ; attendu `aucun processus`.

- [ ] **Étape 11 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add scripts/essais/nettete.mjs
git add scripts/tests/nettete.test.mjs
git add scripts/essais/design-l1-navigateur.mjs
git add scripts/essais/commun.mjs
git add scripts/verifier.sh
git add scripts/tests/verifier-e2e.test.sh
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(essais): sharpness measurement with counter-proof, design L1 browser test" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T6 — Captures avant/après et suite complète
<a id="tache-t6"></a>

**Objectif.** Jouer la suite complète une fois (`verifier.sh --e2e`), relever les tailles Wasm, prendre les captures
après et avant à 2x, les comparer à `docs/design/maquettes/01-tableau.png` et lister les écarts pour la PR (cadrage
L1-8 ; tous les scénarios et effets de bord).

**Fichiers.**
- Créer : `docs/essais/design-l1-avant.png`, `docs/essais/design-l1-avant-barre.png`, `docs/essais/design-l1-apres.png`,
  `docs/essais/design-l1-apres-barre.png`, `docs/essais/design-l1-infobulle.png`

**Interfaces.**
- Consomme (T5) : `node scripts/essais/design-l1-navigateur.mjs [--captures] [--dist <dossier> --nom avant]` ;
  `serve({ dist })`.
- Produit : les 5 PNG ; au rapport, la liste des écarts avec la maquette 01.
- Réutilise : aucun module (exécution).

**Test et commande bornée.**
`cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp CARGO_BUILD_JOBS=4 && mkdir -p "$TMPDIR" && node ~/.claude/scripts/vm/suite-vm.cjs -- nice -n 10 bash scripts/verifier.sh --e2e > "$TMPDIR/verifier-e2e.log" 2>&1; echo "code $?"; grep -E "module Wasm|module formats|Tests .*passed|test result|: OK|ÉCHEC|FAIL |error\[" "$TMPDIR/verifier-e2e.log" | tail -60`
Preuve : `code 0` ; `design L1 : OK`, `C11a annotation : OK`, `C11b capture : OK`, `C14 média : OK`, `C15 3D : OK`,
`verifier.sh : e2e OK`, `verifier.sh : OK` ; `module Wasm : 1374215 octets`, `module formats : 2794511 octets`
(identiques à l'avant ; sinon rapport) ; aucun `FAIL `, `ÉCHEC`, `error[`, `test result: FAILED`. Effets de bord
couverts ici : hauteur de scène (`stageBox(page, 640)` de c7b, c10a, c10b, c12, c13, c14, c16, `allVisible` de c1),
`--rb-btn-m` hors barres (c1 éditeur, c14 barre du média), curseur de tolérance (c6b), infobulle et `innerText`
(c14:182, c15:171-175), bascule Souris / Dessin (c11a:117-120), textes des boutons (c11a:100-120, c11b:123-267).

**Preuve visuelle.** Lectures d'abord, dans la sortie de l'essai `--captures` : rangée de gris du Rectangle, nombre
d'icônes calées, tailles 48 / 44 / 64, franges 0. Puis les captures à décrire au rapport :
`file docs/essais/design-l1-*.png` (fenêtre `3840 x 2160`, barre et infobulle à 2x) ; lire `design-l1-apres.png`,
`design-l1-apres-barre.png`, `design-l1-infobulle.png`, `design-l1-avant.png` et `docs/design/maquettes/01-tableau.png`
(outil Read) et lister, écart par écart, ce qui sépare l'après de la maquette (îlots flottants, menu, onglets et pages
en îlots, rangée des préréglages : lots L2 à L4), et contrôler à l'œil la hauteur des menus de profils (risque
`--rb-btn-m` sans essai de hauteur).

**Contraintes (recopiées).** G6 tailles Wasm 1 374 215 / 2 794 511 o, plafonds 1 572 864 / 3 145 728 inchangés,
aucun fichier Rust touché · G7 `nice -n 10`, cargo `-j 4` (`CARGO_BUILD_JOBS=4`), suite complète par
`node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`, aucun `tauri build` · G9 temporaires dans `~/.cache/tmp/of43-*`,
le worktree « avant » dans `~/.cache/tmp/of43-design-l1-avant` (jamais `/tmp`), retiré par `git worktree remove`,
aucun processus laissé · G11 captures avant/après à 2x dans `docs/essais/design-l1-*`, comparées à
`docs/design/maquettes/01-tableau.png` · G4 `verifier.sh` sans `--captures` · G8 auteur et message (anglais,
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), fichiers un par un · G1 aucun test sauté ni seuil changé.

**Interdits.** Aucun `git worktree remove --force` ; aucun changement de code dans cette tâche (un essai rouge :
rapport et arrêt, l'orchestrateur rouvre la tâche fautive) ; aucune autre capture commitée réécrite.

**Terminé quand.** Suite complète verte une fois, tailles Wasm relevées, 5 PNG commités, worktree « avant » retiré,
écarts avec la maquette listés au rapport.

- [ ] **Étape 1 : suite complète** — commande bornée de la section. Attendu : voir « Preuve ». Un échec : relever la
  ligne `ÉCHEC`/`FAIL ` et les 30 lignes qui la précèdent dans `$TMPDIR/verifier-e2e.log`, s'arrêter.

- [ ] **Étape 2 : captures « après »** (sur le `apps/web/dist` construit par la suite) —
  `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && node scripts/essais/design-l1-navigateur.mjs --captures 2>&1 | tail -40`
  Attendu : `design L1 : OK`, `captures : …/design-l1-apres.png`, `capture : …/design-l1-infobulle.png`.

- [ ] **Étape 3 : build « avant »** (application d'`origin/main` @ 5a34c9b) —

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp
AVANT=$HOME/.cache/tmp/of43-design-l1-avant
git worktree add --detach "$AVANT" 5a34c9b
cp -r apps/web/src/wasm "$AVANT/apps/web/src/wasm"
cp -r apps/web/src/wasm-formats "$AVANT/apps/web/src/wasm-formats"
(cd "$AVANT" && nice -n 10 pnpm install --frozen-lockfile 2>&1 | tail -3 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -4)
ls "$AVANT/apps/web/dist/index.html"
```
Attendu : `✓ built`, `index.html` listé.

- [ ] **Étape 4 : captures « avant »** —
  `cd /home/adminjd/projets/roomboard-wt/design-l1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH TMPDIR=$HOME/.cache/tmp/of43-tmp && node scripts/essais/design-l1-navigateur.mjs --captures --dist "$HOME/.cache/tmp/of43-design-l1-avant/apps/web/dist" --nom avant 2>&1 | tail -10`
  Attendu : `captures : …/design-l1-avant.png, design-l1-avant-barre.png`, `mesures sautées`, code 0.

- [ ] **Étape 5 : retirer le worktree « avant »** —
  `git -C /home/adminjd/projets/roomboard-wt/design-l1 worktree remove "$HOME/.cache/tmp/of43-design-l1-avant" && git -C /home/adminjd/projets/roomboard-wt/design-l1 worktree prune && git -C /home/adminjd/projets/roomboard-wt/design-l1 worktree list`
  Attendu : le chemin `of43-design-l1-avant` absent de la liste. S'il refuse (fichiers non suivis) : lister
  `git -C "$HOME/.cache/tmp/of43-design-l1-avant" status --short`, rendre la liste au rapport, ne pas forcer.

- [ ] **Étape 6 : contrôle des images** — `file /home/adminjd/projets/roomboard-wt/design-l1/docs/essais/design-l1-*.png` ;
  attendu `design-l1-apres.png` et `design-l1-avant.png` en `3840 x 2160`. Puis lectures et liste des écarts
  (section « Preuve visuelle »).

- [ ] **Étape 7 : aucun processus restant** — `pgrep -fa "design-l1-navigateur|chrome-headless|ms-playwright|vite" | grep -v pgrep || echo "aucun processus"`.

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/design-l1
git add docs/essais/design-l1-avant.png
git add docs/essais/design-l1-avant-barre.png
git add docs/essais/design-l1-apres.png
git add docs/essais/design-l1-apres-barre.png
git add docs/essais/design-l1-infobulle.png
git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "docs(essais): design L1 before/after captures at 2x" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport de la tâche : hauteur de scène outil Tableau (reprise de T4), tailles Wasm lues, rangée de gris du Rectangle,
liste des écarts avec `01-tableau.png`, rappel de la retouche de forme `c7b:309` à citer dans la PR, H12 (WebView2 non
vérifié).

---

## Relecture du plan (par le planificateur)

- **Couverture du cadrage.** L1-1, L1-2, § 2 bis → T1 ; L1-3 → T1 (`iconFor`), T3 (`ItemState.icon`) ; L1-4 → T2,
  T4 (`.rb-sr`, `.rb-tip`) ; L1-5 → T3 ; L1-6 → T4 ; L1-7 → T5 ; L1-8 → T5 (options), T6 (captures) ; L1-9 a, b, d →
  T3, c, e → T4, f → T4 ; L1-10 → T1 (licence), T6 (tailles Wasm). Scénarios : S1 → T4, T5, T6 ; S2 → T2, T5 ; S3 →
  T2, T3 ; S4 → T1, T3 ; S5 → T4, T5.
- **Carte d'impact.** Chaque entrée « touché » est dans une colonne `fichiers touchés` ; les entrées « à garder
  verts » sont citées dans la preuve de T3 (Toolbar.test, App.test:618), T4 (App.test:385-401, PagesBar.test,
  TabsBar.test, c7b:208-216, c10a, c1) et T6 (tous les essais). Effets de bord : hauteur des barres (T4 mesure, T6
  suite), `--rb-btn-m` hors barres (T6 c1, c14, contrôle des captures), allure des autres barres (T4 tests CSS),
  curseur de tolérance (T3 Toolbar.test:309-325, T6 c6b), texte de la page (T6 c14, c15), bascule Souris / Dessin
  (T3, T6 c11a).
- **Modules à réutiliser.** `item-state.ts` et `Toolbar.tsx` → T3 ; `toolbar.ts` → T1 ; `commun.mjs` (`serve`,
  `loadPlaywright`, `item`) → T5 ; nouveaux modules `icons.ts` (T1), `IconButton.tsx`, `tooltip.ts` (T2),
  `nettete.mjs` (T5). Aucune tâche ne recrée un module existant.
- **Noms d'une tâche à l'autre.** `ICONS`, `ICON_VIEWBOX`, `iconFor`, `IconButton`, `Icon`, `createTip`, `placeTip`,
  `ItemState.icon`, classes `rb-ib`, `rb-icon`, `rb-sr`, `rb-tip`, attribut `data-icon`, `pixelsOf`, `edgeRow`,
  `fringes`, `serve({ dist })` : mêmes noms partout.
