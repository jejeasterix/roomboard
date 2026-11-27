# Gomme à la surface de contact (OG25) — plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Objectif :** une paume, un poing ou trois doigts serrés posés sur le tableau gomment tout seuls, à la taille du contact,
et l'outil d'avant reste en place au lever.

**Architecture :** l'échantillonneur lit `PointerEvent.width` / `height` et les pose sur le geste (`contact`) ; un module
pur `engine/input/contact.ts` porte seuils et calculs ; le routeur, seul décideur du rôle d'un geste, ouvre une gomme sous
un identifiant négatif sans jamais changer l'outil courant (A1), et agrandit son rayon par `GestureSink.resize` jusqu'à
l'outil Gomme (une seule `Erase` au lever, A2) ; un anneau DOM montre la gomme (A4) ; le réglage vit dans
`DeviceSettings` (A5), réglable par le panneau Réglages et Ctrl+Maj+H, et passe à la fenêtre d'annotation par la charge.

**Pile :** TypeScript strict (`apps/web`), Solid, vitest (happy-dom), Playwright (Chromium de la VM). Aucun Rust.

**Spec :** `docs/plans/gomme-surface-contact-cadrage.md`

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Module pur des seuils et calculs | — | `apps/web/src/engine/input/contact.ts` (neuf), `apps/web/src/engine/input/contact.test.ts` (neuf) | partagé | implementeur-tdd | `contact.test.ts` ≥ 7 tests verts, noms « OG25 contact » présents ; tsc rc=0 | S2, S3, S6 | #tache-t1 |
| T2 | Géométrie du contact dans l'échantillonneur | T1 | `apps/web/src/engine/input/sampler.ts`, `apps/web/src/engine/input/sampler.test.ts` | partagé | implementeur-tdd | `sampler.test.ts` tout vert dont 2 tests « OG25 » ; tsc rc=0 | S5, S6 | #tache-t2 |
| T3 | Rayon qui grandit jusqu'à la gomme, `gesturesToTools` | — | `apps/web/src/engine/input/gesture.ts`, `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/tools/eraser.ts`, `apps/web/src/engine/tools/eraser.test.ts`, `apps/web/src/engine/input/predict.ts`, `apps/web/src/engine/input/predict.test.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | partagé | implementeur-tdd | `eraser.test.ts`, `predict.test.ts`, `engine.test.ts` tout verts dont 7 tests « OG25 » ; tsc rc=0 | S2, S7 | #tache-t3 |
| T4 | Routeur : bascule en gomme automatique | T1, T2, T3 | `apps/web/src/engine/input/router.ts`, `apps/web/src/engine/input/router.test.ts` | partagé | concepteur-critique | `router.test.ts` tout vert (anciens inchangés) dont 18 tests « OG25 » ; tsc rc=0 | S1, S2, S3, S4, S5, S7 | #tache-t4 |
| T5 | Réglage de l'appareil et anneau DOM | — | `apps/web/src/device-settings.ts`, `apps/web/src/device-settings.test.ts`, `apps/web/src/app/eraser-ring.ts` (neuf), `apps/web/src/app/eraser-ring.test.ts` (neuf), `apps/web/src/ui/rb.css` | partagé | implementeur-tdd | `device-settings.test.ts` et `eraser-ring.test.ts` verts dont 7 tests « OG25 » ; tsc rc=0 | S2, S8 | #tache-t5 |
| T6 | Branchement de la session et de l'amorce | T3, T4, T5 | `apps/web/src/app/board-session.ts`, `apps/web/src/app/board-session.test.ts`, `apps/web/src/main.ts` | partagé | implementeur-tdd | `board-session.test.ts` tout vert dont 2 tests « OG25 » ; tsc rc=0 | S2, S8 | #tache-t6 |
| T7 | Réglage vers la fenêtre d'annotation | T5, T6 | `apps/web/src/platform/annotation-port.ts`, `apps/web/src/platform/annotation-port.test.ts`, `apps/web/src/platform/annotation-fake.ts`, `apps/web/src/platform/annotation-tauri.ts`, `apps/web/src/app/annotation.ts`, `apps/web/src/app/annotation.test.ts`, `apps/web/src/app/annotation-page.ts`, `apps/web/src/app/annotation-page.test.ts`, `apps/web/src/annotate-start.ts`, `apps/web/src/main.ts` | partagé | implementeur-tdd | trois fichiers de test verts dont 4 tests « OG25 » ; tsc rc=0 | S8 | #tache-t7 |
| T8 | Bouton Réglages, Ctrl+Maj+H et avis | T5 | `apps/web/src/ui/SettingsPanel.tsx`, `apps/web/src/ui/SettingsPanel.test.tsx`, `apps/web/src/ui/App.tsx`, `apps/web/src/ui/App.test.tsx`, `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`, `apps/web/src/ui/shortcuts.ts`, `apps/web/src/ui/shortcuts.test.ts` | partagé | implementeur-tdd | cinq fichiers de test verts dont 6 tests « OG25 », `MenuBar.test.tsx` vert ; tsc rc=0 | S8 | #tache-t8 |
| T9 | Essai navigateur S1 à S8, captures, suite complète | T1 à T8 | `scripts/essais/gomme-paume-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/gomme-paume.md` (neuf), `docs/design/captures/gomme-surface-contact/gomme-anneau-grand.png`, `…/gomme-anneau-petit.png`, `…/reglage-gomme-paume.png` (neufs) | partagé | implementeur-tdd | essai : `gomme paume : OK`, 40 lignes `ok —` au moins ; `verifier-e2e.test.sh : OK` ; `verifier.sh : e2e OK` puis `verifier.sh : OK` ; octets Wasm égaux à la référence | S1, S2, S3, S4, S5, S6, S7, S8 | #tache-t9 |

Ordre d'exécution : T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9, à la suite, dans le worktree partagé
`/home/adminjd/projets/roomboard-wt/gomme-surface-contact` (une seule VM chargée).

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `apps/web/src/engine/input/contact.ts` (neuf) | constantes et fonctions pures : géométrie, contact large, doigts serrés, rejoindre le groupe, cercle de la gomme | T1 |
| `apps/web/src/engine/input/sampler.ts` | lit `width` / `height`, pose `GestureEvent.contact` | T2 |
| `apps/web/src/engine/input/gesture.ts`, `engine/tools/tool.ts` | `resize?` facultatif sur `GestureSink` et `GestureTool` | T3 |
| `apps/web/src/engine/tools/eraser.ts` | rayon du passage qui ne fait que grandir | T3 |
| `apps/web/src/engine/input/predict.ts` | relaie `resize` | T3 |
| `apps/web/src/engine/engine.ts` | relaie `resize` à l'outil du geste ; `gesturesToTools()` | T3 |
| `apps/web/src/engine/input/router.ts` | rôle `palm`, groupe gomme, fenêtre, abandon, anneau | T4 |
| `apps/web/src/device-settings.ts` | `palmEraser()`, `setPalmEraser(on)`, clé `roomboard.gomme.paume` | T5 |
| `apps/web/src/app/eraser-ring.ts` (neuf), `ui/rb.css` | anneau DOM, une écriture de style par image | T5 |
| `apps/web/src/app/board-session.ts`, `main.ts` | branche réglage, anneau et `gesturesToTools` au routeur | T6 |
| `platform/annotation-port.ts`, `annotation-fake.ts`, `annotation-tauri.ts`, `app/annotation.ts`, `app/annotation-page.ts`, `annotate-start.ts`, `main.ts` | champ `palmEraser` de la charge | T7 |
| `ui/SettingsPanel.tsx`, `ui/App.tsx`, `engine/input/keys.ts`, `ui/shortcuts.ts` | bouton `gomme-paume`, Ctrl+Maj+H, avis | T8 |
| `scripts/essais/gomme-paume-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/gomme-paume.md`, captures | preuve de bout en bout | T9 |

## Global Constraints

Chaque ligne est recopiée dans les sections qu'elle concerne.

- G1 — Détection et seuils en fonctions pures testées à part (`engine/input/contact.ts`).
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G4 — Toucher le moins possible le panneau d'options (autres ouvriers dessus) : `ui/OptionsPanel.tsx` et `ui/tool-options.ts` ne sont pas touchés.
- G5 — Aucun octet ajouté aux modules Wasm (pas de changement Rust attendu ; s'il en faut un, le dire et s'arrêter).
- G6 — VM partagée : `nice -n 10`, `cargo … -j 4` (ou `CARGO_BUILD_JOBS=4`).
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G9 — Essai navigateur neuf avec des `PointerEvent` synthétiques qui portent `width`, `height`, `pointerType` (patron des essais de `scripts/essais/`, inscrit dans `scripts/verifier.sh --e2e` et `scripts/tests/verifier-e2e.test.sh`) couvrant : doigt fin dessine ; paume gomme à la bonne taille puis retour à l'outil d'avant ; trois doigts serrés gomment ; pincement à deux doigts zoome ; stylet large dessine ; appareil sans géométrie dessine ; annulation en une étape ; réglage coupé gardé après rechargement.
- G10 — Captures 2x dans `docs/design/captures/gomme-surface-contact/` (curseur de gomme à deux tailles, réglage) produites par l'essai navigateur ; netteté § 10 du cadrage design (traits fins, icônes Lucide).
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur (le build web le joue).

Commande de typage, commune (bornée) :

```bash
mkdir -p ~/.cache/tmp && cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx tsc --noEmit > ~/.cache/tmp/og25-tsc.log 2>&1; echo "tsc rc=$?"; tail -15 ~/.cache/tmp/og25-tsc.log
```

Attendu : `tsc rc=0`, aucune ligne `error TS`.

## Review Focus

Les cinq entrées que le cadrage implique et qui mordraient le plus un utilisateur ; chacune a son test dans la tâche qui
possède le code.

1. **Contact porteur levé avant les autres, puis `pointerId` redonné à un nouveau toucher** (déc. 35) : la gomme reste
   un seul geste sous `-1`, le nouveau contact proche la rejoint, un contact loin est ignoré. Test T4
   « OG25 : contact loin du groupe ignoré ; pointerId du porteur réutilisé… ».
2. **Géométrie invalide** (NaN, infinie, négative, un seul côté donné, 1 × 1, 0 × 0) (déc. 3) : jamais de bascule par
   erreur, jamais d'exception. Test T1 « OG25 contact : contactGeometry… ».
3. **Stylet posé pendant la gomme en réglage « Paume : souple »** (déc. 15) : l'échantillonneur n'annule pas les
   touchers, le routeur doit fermer la gomme par `abort` lui-même. Test T4 « OG25 : un stylet posé ferme la gomme… ».
4. **Zoom différent de 1 et séances modales** (déc. 18, 23) : rayon monde = px / zoom ; aucune bascule pendant un
   rognage ou une orbite. Tests T3 « OG25 resize : le rayon ne fait que grandir (px / zoom)… » et
   « OG25 gesturesToTools… ».
5. **Stockage local qui refuse** (déc. 25) : le réglage reste en mémoire, rien ne lève. Test T5
   « OG25 gomme à la paume : valeur inconnue… stockage qui lève… ».

## Écarts au cadrage relevés en écrivant le plan

- `platform/annotation-fake.ts` et `platform/annotation-tauri.ts` sont marqués « non touché (S) » dans la carte d'impact,
  mais ils construisent la charge par `...frameField(o)` seul : sans `...palmEraserField(o)`, le champ serait perdu. Ils
  entrent dans T7.
- `ui/shortcuts.test.ts` est marqué « non touché » ; son test « chaque raccourci a son reconnaisseur » exige une ligne
  `EXPECT` par raccourci de la table. T8 y ajoute une ligne et un test, sans rien réécrire.
- `RouterOptions.autoEraser` est **facultatif** (`autoEraser?: boolean`, absent : coupée) et non `readonly autoEraser:
  boolean` : les tests existants construisent des `RouterOptions` littéraux sans ce champ (G3). La session passe un
  accesseur.
- `RouterDeps` gagne `gesturesToTools?(): boolean` en plus de `ring?` (le cadrage, déc. 23, dit que le routeur le lit,
  sans lui donner de dépendance).
- `contact.ts` gagne une cinquième fonction pure, `joinsCluster`, pour la règle « un contact posé à 160 px au plus de la
  boîte du groupe le rejoint » (déc. 12, G1).
- `createEraserRing(stage, frame?)` prend un ordonnanceur d'image facultatif (tests sans `requestAnimationFrame` réel).

---

<a id="tache-t1"></a>
### Tâche T1 — Module pur des seuils et calculs

**Objectif.** Créer `engine/input/contact.ts` : les six constantes du cadrage et cinq fonctions pures (géométrie, contact
large, doigts serrés, rejoindre le groupe, cercle de la gomme), testées sans DOM.

**Fichiers.**
- Créer : `apps/web/src/engine/input/contact.ts`
- Créer : `apps/web/src/engine/input/contact.test.ts`

**Interfaces.**
- Consomme : rien.
- Produit (noms exacts, utilisés par T2 et T4) :
  - `export const LARGE_CONTACT_PX = 80`, `CLUSTER_PX = 160`, `CLUSTER_COUNT = 3`, `DETECT_MS = 250`,
    `AUTO_ERASER_MIN_RADIUS_PX = 24`, `AUTO_ERASER_MAX_RADIUS_PX = 160`
  - `export interface ContactGeometry { readonly width: number; readonly height: number }`
  - `export interface ContactBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }` (centre x, y ; 0 × 0 sans géométrie)
  - `export function contactGeometry(width?: number, height?: number): ContactGeometry | null`
  - `export function isLargeContact(g: ContactGeometry | null): boolean`
  - `export function isTightCluster(boxes: readonly ContactBox[]): boolean`
  - `export function joinsCluster(group: readonly ContactBox[], b: ContactBox): boolean`
  - `export function eraserCircle(boxes: readonly ContactBox[]): { x: number; y: number; radius: number }`
- Réutilise : aucun — nouveau module `engine/input/contact.ts` (A3 ; termes cherchés par le cadrage : `radiusX`, `contact`, `e.width` : rien). Le rapport porte `Réutilisation : écart — nouveau module prévu par le cadrage (A3)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/engine/input/contact.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -30
```

Preuve : `Test Files  1 passed (1)`, `Tests  7 passed (7)` (N ≥ 7), noms « OG25 contact : » présents, aucune ligne
`FAIL `. Puis la commande de typage commune : `tsc rc=0`.

**Contraintes (recopiées).**
- G1 — Détection et seuils en fonctions pures testées à part (`engine/input/contact.ts`).
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G5 — Aucun octet ajouté aux modules Wasm (pas de changement Rust attendu ; s'il en faut un, le dire et s'arrêter).
- G6 — VM partagée : `nice -n 10`, `cargo … -j 4`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Aucun import du DOM, du moteur ni du routeur dans `contact.ts`. Aucune autre valeur de seuil que celles
du cadrage (déc. 7, 8, 9, 18).

**Terminé quand.** Les 7 tests passent, `tsc rc=0`, un commit contient exactement les deux fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire le test qui échoue** — `apps/web/src/engine/input/contact.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  AUTO_ERASER_MAX_RADIUS_PX,
  AUTO_ERASER_MIN_RADIUS_PX,
  CLUSTER_COUNT,
  CLUSTER_PX,
  contactGeometry,
  DETECT_MS,
  eraserCircle,
  isLargeContact,
  isTightCluster,
  joinsCluster,
  LARGE_CONTACT_PX,
  type ContactBox,
} from "./contact";

const box = (x: number, y: number, width = 0, height = width): ContactBox => ({ x, y, width, height });

describe("contact (OG25, A3)", () => {
  it("OG25 contact : valeurs du cadrage (déc. 7, 8, 9, 18)", () => {
    expect([LARGE_CONTACT_PX, CLUSTER_PX, CLUSTER_COUNT, DETECT_MS]).toEqual([80, 160, 3, 250]);
    expect([AUTO_ERASER_MIN_RADIUS_PX, AUTO_ERASER_MAX_RADIUS_PX]).toEqual([24, 160]);
  });

  it("OG25 contact : contactGeometry — 1 × 1 (W3C), 0 × 0 (Windows), absente, NaN : null ; un côté invalide vaut 0", () => {
    expect(contactGeometry(20, 20)).toEqual({ width: 20, height: 20 });
    expect(contactGeometry(1, 1)).toBeNull();
    expect(contactGeometry(0, 0)).toBeNull();
    expect(contactGeometry()).toBeNull();
    expect(contactGeometry(Number.NaN, Number.NaN)).toBeNull();
    expect(contactGeometry(0.5, 0.9)).toBeNull();
    expect(contactGeometry(Number.POSITIVE_INFINITY, 5)).toEqual({ width: 0, height: 5 });
    expect(contactGeometry(-3, 140)).toEqual({ width: 0, height: 140 });
    expect(contactGeometry(140, undefined)).toEqual({ width: 140, height: 0 });
  });

  it("OG25 contact : isLargeContact — D = max(largeur, hauteur) ≥ 80, tranchant de la main compris", () => {
    expect(isLargeContact(null)).toBe(false);
    expect(isLargeContact({ width: 79, height: 20 })).toBe(false);
    expect(isLargeContact({ width: 80, height: 10 })).toBe(true);
    expect(isLargeContact({ width: 20, height: 140 })).toBe(true);
  });

  it("OG25 contact : isTightCluster — trois centres dans 160 px, au moins une géométrie", () => {
    expect(isTightCluster([box(100, 100, 24), box(130, 100, 24), box(160, 100, 24)])).toBe(true);
    expect(isTightCluster([box(100, 100, 24), box(130, 100, 24)])).toBe(false);
    expect(isTightCluster([box(100, 100, 24), box(500, 100, 24), box(900, 100, 24)])).toBe(false);
    expect(isTightCluster([box(0, 0, 24), box(80, 0, 24), box(160, 160, 24)])).toBe(true);
    expect(isTightCluster([box(0, 0, 24), box(80, 0, 24), box(161, 0, 24)])).toBe(false);
    expect(isTightCluster([box(0, 0), box(30, 0), box(60, 0)])).toBe(false);
    expect(isTightCluster([box(0, 0), box(30, 0, 24), box(60, 0)])).toBe(true);
  });

  it("OG25 contact : eraserCircle — centre de la boîte englobante, rayon = moitié du plus grand côté, borné à [24, 160]", () => {
    expect(eraserCircle([box(100, 200, 140, 120)])).toEqual({ x: 100, y: 200, radius: 70 });
    expect(eraserCircle([box(100, 100, 20, 20)]).radius).toBe(24);
    expect(eraserCircle([box(100, 100, 600, 100)]).radius).toBe(160);
    expect(eraserCircle([box(100, 100, 24), box(130, 100, 24), box(160, 100, 24)])).toEqual({ x: 130, y: 100, radius: 42 });
    expect(eraserCircle([])).toEqual({ x: 0, y: 0, radius: 24 });
  });

  it("OG25 contact : joinsCluster — à 160 px au plus de la boîte du groupe ; groupe vide : faux", () => {
    const group = [box(100, 100, 140, 140)]; // boîte 30..170
    expect(joinsCluster(group, box(150, 100, 24))).toBe(true);
    expect(joinsCluster(group, box(330, 100, 24))).toBe(true);
    expect(joinsCluster(group, box(331, 100, 24))).toBe(false);
    expect(joinsCluster(group, box(100, 331))).toBe(false);
    expect(joinsCluster([], box(0, 0, 24))).toBe(false);
  });

  it("OG25 contact : fonctions pures — les entrées ne sont pas modifiées", () => {
    const boxes = Object.freeze([Object.freeze(box(1, 2, 90)), Object.freeze(box(3, 4, 90)), Object.freeze(box(5, 6, 90))]);
    expect(() => eraserCircle(boxes)).not.toThrow();
    expect(() => isTightCluster(boxes)).not.toThrow();
    expect(() => joinsCluster(boxes, box(0, 0))).not.toThrow();
  });
});
```

- [ ] **Étape 2 : lancer le test, vérifier qu'il échoue** — commande de la section. Attendu : `FAIL`, « Failed to
  resolve import "./contact" » (ou « Cannot find module »).

- [ ] **Étape 3 : écrire le module** — `apps/web/src/engine/input/contact.ts` :

```ts
/**
 * OG25 (cadrage gomme-surface-contact, A3) : seuils et calculs purs de la gomme automatique à la surface de contact.
 * Px CSS de la scène. Sans géométrie (W3C : 1 × 1 ; Windows : 0 × 0), rien ne bascule : la détection échoue du côté sûr.
 * TS pur : ni DOM, ni moteur ; le routeur garde l'état des contacts et appelle ces fonctions.
 */

/** Taille D = max(largeur, hauteur) à partir de laquelle un contact est « large » (déc. 7). */
export const LARGE_CONTACT_PX = 80;
/** Côté maximal de la boîte des centres des doigts serrés, et portée d'un contact qui rejoint le groupe (déc. 9, 12). */
export const CLUSTER_PX = 160;
/** Nombre de contacts posés ensemble pour la règle des doigts serrés (déc. 9). */
export const CLUSTER_COUNT = 3;
/** Fenêtre de détection qui suit la pose d'un contact (déc. 8). */
export const DETECT_MS = 250;
/** Bornes du rayon de la gomme automatique, px d'écran (déc. 18). */
export const AUTO_ERASER_MIN_RADIUS_PX = 24;
export const AUTO_ERASER_MAX_RADIUS_PX = 160;

export interface ContactGeometry {
  readonly width: number;
  readonly height: number;
}

/** Contact centré en (x, y), de largeur et hauteur données ; 0 × 0 sans géométrie. */
export interface ContactBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const side = (v: number | undefined): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Géométrie de `PointerEvent.width` / `height` ; null quand les deux sont ≤ 1, non finies ou absentes (déc. 3). Un côté
 *  invalide vaut 0. */
export function contactGeometry(width?: number, height?: number): ContactGeometry | null {
  const w = side(width);
  const h = side(height);
  return w <= 1 && h <= 1 ? null : { width: w, height: h };
}

/** Contact large : D = max(largeur, hauteur) ≥ LARGE_CONTACT_PX (déc. 6, 7). */
export function isLargeContact(g: ContactGeometry | null): boolean {
  return g !== null && Math.max(g.width, g.height) >= LARGE_CONTACT_PX;
}

const hasGeometry = (b: ContactBox): boolean => b.width > 1 || b.height > 1;

/** CLUSTER_COUNT contacts ou plus dont les centres tiennent dans une boîte de CLUSTER_PX de côté, au moins un avec
 *  géométrie (déc. 9, 11). */
export function isTightCluster(boxes: readonly ContactBox[]): boolean {
  if (boxes.length < CLUSTER_COUNT || !boxes.some(hasGeometry)) return false;
  const xs = boxes.map((b) => b.x);
  const ys = boxes.map((b) => b.y);
  return Math.max(...xs) - Math.min(...xs) <= CLUSTER_PX && Math.max(...ys) - Math.min(...ys) <= CLUSTER_PX;
}

interface Bounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function boundsOf(boxes: readonly ContactBox[]): Bounds {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x - b.width / 2);
    x1 = Math.max(x1, b.x + b.width / 2);
    y0 = Math.min(y0, b.y - b.height / 2);
    y1 = Math.max(y1, b.y + b.height / 2);
  }
  return { x0, y0, x1, y1 };
}

/** Un contact dont le centre est à CLUSTER_PX au plus de la boîte englobante du groupe le rejoint (déc. 12). */
export function joinsCluster(group: readonly ContactBox[], b: ContactBox): boolean {
  if (group.length === 0) return false;
  const r = boundsOf(group);
  const dx = Math.max(r.x0 - b.x, 0, b.x - r.x1);
  const dy = Math.max(r.y0 - b.y, 0, b.y - r.y1);
  return dx <= CLUSTER_PX && dy <= CLUSTER_PX;
}

/** Gomme du groupe : centre de la boîte englobante (chaque contact avec sa largeur et sa hauteur), rayon = moitié de son
 *  plus grand côté, borné à [24, 160] px (déc. 17, 18). Vide : rayon minimal en (0, 0). */
export function eraserCircle(boxes: readonly ContactBox[]): { x: number; y: number; radius: number } {
  if (boxes.length === 0) return { x: 0, y: 0, radius: AUTO_ERASER_MIN_RADIUS_PX };
  const r = boundsOf(boxes);
  const half = Math.max(r.x1 - r.x0, r.y1 - r.y0) / 2;
  return {
    x: (r.x0 + r.x1) / 2,
    y: (r.y0 + r.y1) / 2,
    radius: Math.min(AUTO_ERASER_MAX_RADIUS_PX, Math.max(AUTO_ERASER_MIN_RADIUS_PX, half)),
  };
}
```

- [ ] **Étape 4 : relancer le test** — attendu : `Tests  7 passed (7)`, sept lignes « OG25 contact : ».
- [ ] **Étape 5 : typage** — commande commune, attendu `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/engine/input/contact.ts apps/web/src/engine/input/contact.test.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(input): pure contact-area thresholds for the auto eraser (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : écart — nouveau module prévu par le cadrage (A3)`.

---

<a id="tache-t2"></a>
### Tâche T2 — Géométrie du contact dans l'échantillonneur

**Objectif.** L'échantillonneur lit `width` / `height` de l'événement envoyé (pas des fusionnés) et pose
`contact: { width, height }` sur les gestes `start` et `move`, seulement quand `contactGeometry` n'est pas null.

**Fichiers.**
- Modifier : `apps/web/src/engine/input/sampler.ts` (`PointerLike` l. 51-64, `GestureEvent` l. 18-27, `onDown` l. 185-192, `onMove` l. 210-217)
- Tester : `apps/web/src/engine/input/sampler.test.ts` (ajouts en fin de fichier)

**Interfaces.**
- Consomme (T1) : `contactGeometry(width?: number, height?: number): ContactGeometry | null`, `type ContactGeometry`.
- Produit (T4) : `GestureEvent.contact?: { readonly width: number; readonly height: number }` ; `PointerLike.width?: number`, `PointerLike.height?: number`.
- Réutilise : `engine/input/sampler.ts:98` (`createSampler`) — `PointerLike` + `readonly width?: number; readonly height?: number` ; `GestureEvent` + `readonly contact?: { readonly width: number; readonly height: number }` (posé si `contactGeometry` n'est pas null). Le rapport porte `Réutilisation : appelé createSampler (étendu)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/engine/input/sampler.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -30
```

Preuve : `Test Files  1 passed (1)`, `Tests  N passed (N)` avec N = nombre d'avant + 2, deux lignes « OG25 : »,
aucune ligne `FAIL ` (les `toEqual` existants de `sampler.test.ts:100-146` restent verts : clé absente sans géométrie,
effet de bord 5). Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G1 — Détection et seuils en fonctions pures testées à part (`engine/input/contact.ts`).
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G5 — Aucun octet ajouté aux modules Wasm.
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Ne pas lire la géométrie des événements fusionnés ni des prédits ; ne rien poser sur `end` / `cancel` ;
ne pas toucher la réjection de paume du stylet (`sampler.ts:143-168`, hors périmètre).

**Terminé quand.** Tous les tests de `sampler.test.ts` passent dont les deux neufs, `tsc rc=0`, commit des deux fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent** — à la fin de `sampler.test.ts` :

```ts
describe("géométrie du contact (OG25, déc. 2, 3)", () => {
  it("OG25 : contact posé sur start et move quand width et height portent une géométrie (celle de l'événement envoyé)", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 4, pointerType: "touch", width: 30, height: 28 });
    surface.fire("pointermove", {
      pointerId: 4,
      pointerType: "touch",
      width: 140,
      height: 120,
      getCoalescedEvents: () => [{ ...pt(1, 1, 1), width: 5, height: 5 }],
    });
    surface.fire("pointerup", { pointerId: 4, pointerType: "touch", width: 140, height: 120 });
    expect(out[0]?.contact).toEqual({ width: 30, height: 28 });
    expect(out[1]?.contact).toEqual({ width: 140, height: 120 });
    expect(out[2] && "contact" in out[2]).toBe(false);
  });

  it("OG25 : sans géométrie (1 × 1, 0 × 0, absente, NaN) : aucune clé contact", () => {
    for (const geo of [{ width: 1, height: 1 }, { width: 0, height: 0 }, {}, { width: Number.NaN, height: Number.NaN }]) {
      const surface = new FakeSurface();
      const out = record(createSampler(surface, ALL));
      surface.fire("pointerdown", { pointerId: 4, pointerType: "touch", ...geo });
      surface.fire("pointermove", { pointerId: 4, pointerType: "touch", ...geo });
      expect(out).toHaveLength(2);
      expect(out.every((g) => !("contact" in g))).toBe(true);
    }
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL`, erreur de type ou `expected undefined to deeply equal { width: 30, height: 28 }`.

- [ ] **Étape 3 : implémenter** dans `sampler.ts` :

  a. Import en tête (après le commentaire d'en-tête) :

```ts
import { contactGeometry, type ContactGeometry } from "./contact";
```

  b. Dans `GestureEvent`, après `readonly palm?: boolean;` :

```ts
  /** OG25 (déc. 2) : taille du contact en px CSS, lue de l'événement envoyé ; absente sans géométrie (déc. 3). */
  readonly contact?: ContactGeometry;
```

  c. Dans `PointerLike`, après `readonly timeStamp: number;` :

```ts
  /** OG25 : `PointerEvent.width` / `height` (px CSS ; 1 par défaut, 0 sous Windows sans géométrie). */
  readonly width?: number;
  readonly height?: number;
```

  d. Au niveau du module, après `pressureOf` :

```ts
/** OG25 : champ `contact` d'un geste, écrit seulement quand l'événement porte une géométrie (patron du champ `palm`). */
const contactOf = (e: PointerLike): { readonly contact?: ContactGeometry } => {
  const c = contactGeometry(e.width, e.height);
  return c === null ? {} : { contact: c };
};
```

  e. Dans `onDown`, l'objet émis devient :

```ts
    emit({
      kind: "start",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: [toSample(e, g)],
      predicted: [],
      ...contactOf(e),
    });
```

  f. Dans `onMove`, l'objet émis devient :

```ts
    emit({
      kind: "move",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: source.map((s) => toSample(s, g)),
      predicted: predicted.map((s) => toSample(s, g)),
      ...contactOf(e),
    });
```

- [ ] **Étape 4 : relancer** — attendu : tout vert, deux lignes « OG25 : ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/engine/input/sampler.ts apps/web/src/engine/input/sampler.test.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(input): carry pointer contact geometry on gestures (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé createSampler (étendu)`.

---

<a id="tache-t3"></a>
### Tâche T3 — Rayon qui grandit jusqu'à la gomme, `gesturesToTools`

**Objectif.** Faire passer un rayon (px d'écran, le plus grand vu) du routeur jusqu'à l'outil Gomme par une méthode
facultative `resize` (`GestureSink` → `withPrediction` → `engine.sink` → `GestureTool`), et exposer
`Engine.gesturesToTools()` (faux pendant un rognage ou une pipette de retouche, et tant qu'une orbite est ouverte).

**Fichiers.**
- Modifier : `apps/web/src/engine/input/gesture.ts` (`GestureSink`, l. 14-19)
- Modifier : `apps/web/src/engine/tools/tool.ts` (`GestureTool`, l. 124-134)
- Modifier : `apps/web/src/engine/tools/eraser.ts` (`Pass.radius`, l. 18 ; objet rendu, l. 50-87 ; en-tête)
- Modifier : `apps/web/src/engine/input/predict.ts` (`withPrediction`, objet rendu, l. 157-178)
- Modifier : `apps/web/src/engine/engine.ts` (`Engine` après `panHeld(): boolean;` l. 188 ; `sink` l. 704-728 ; objet `engine` près de `panHeld: () => spaceHeld,` l. 940)
- Tester : `apps/web/src/engine/tools/eraser.test.ts`, `apps/web/src/engine/input/predict.test.ts`, `apps/web/src/engine/engine.test.ts`

**Interfaces.**
- Consomme : rien des autres tâches.
- Produit (T4, T6) :
  - `GestureSink.resize?(pointerId: number, radiusPx: number): void`
  - `GestureTool.resize?(pointerId: number, radiusPx: number): void`
  - `Engine.gesturesToTools(): boolean`
- Réutilise : `engine/tools/eraser.ts:26` (`createEraserTool`) — `GestureTool.resize?(pointerId: number, radiusPx: number): void` : rayon monde = `max(rayon, radiusPx / zoom)` ; en mode objet, `checked = 0` quand il grandit.
- Réutilise : `engine/input/gesture.ts:14-19` (`GestureSink`), `predict.ts:139` (`withPrediction`), `engine.ts:704` (`sink`) — `resize?(pointerId: number, radiusPx: number): void` relayé tel quel.
- Réutilise : `engine/engine.ts:711-716` (choix de `owner`) — `Engine.gesturesToTools(): boolean`.
- Le rapport porte `Réutilisation : appelé createEraserTool, GestureSink/withPrediction/engine.sink, Engine (étendus)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/engine/tools/eraser.test.ts src/engine/input/predict.test.ts src/engine/engine.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -30
```

Preuve : `Test Files  3 passed (3)`, 7 lignes « OG25 », aucune ligne `FAIL ` (les tests existants des trois fichiers
restent verts). Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé (`ERASER_RADIUS_PX` reste 12).
- G5 — Aucun octet ajouté aux modules Wasm (la commande `Erase` ne change pas ; pas de changement Rust).
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Ne pas toucher `engine.setTool` ni `leaveAll` (déc. 16) ; ne pas changer la commande `Erase`
(`core/api.ts:70`) ni les rendus (`canvas2d.ts`, `webgl2.ts`). Si `tsc` signale un faux `Engine` typé dans un test
existant, lui ajouter `gesturesToTools: () => true` sans rien réécrire d'autre.

**Terminé quand.** Les trois fichiers de test passent, `tsc rc=0`, un commit avec les huit fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent.**

  a. `eraser.test.ts`, à la fin du `describe("createEraserTool (D12, D38)", …)` :

```ts
  it("OG25 resize : le rayon ne fait que grandir (px / zoom), une seule Erase au rayon le plus grand", () => {
    const { runs, tool } = setup("partial", { zoom: 2, tx: 0, ty: 0 });
    tool.begin(1, [s(300, 80)]);
    tool.resize?.(1, 70);
    tool.resize?.(1, 40);
    tool.extend(1, [s(300, 120)], []);
    expect(tool.live().erasers[0]?.radius).toBe(35);
    tool.close(1, "end");
    expect(runs).toHaveLength(1);
    expect(eraseOf(runs).radius).toBe(35);
  });

  it("OG25 resize : plus petit que le rayon de départ, invalide ou geste inconnu : sans effet", () => {
    const { runs, tool } = setup();
    tool.begin(1, [s(300, 80)]);
    tool.resize?.(1, 5);
    tool.resize?.(1, Number.NaN);
    tool.resize?.(1, -3);
    tool.resize?.(9, 100);
    tool.extend(1, [s(300, 120)], []);
    tool.close(1, "end");
    expect(eraseOf(runs).radius).toBe(ERASER_RADIUS_PX);
  });

  it("OG25 resize, gomme d'objet : la sonde repart du début quand le rayon grandit", () => {
    const { tool, target } = setup("object");
    tool.begin(1, [s(300, 140)]);
    tool.extend(1, [s(310, 140)], []);
    tool.frame();
    expect(tool.live().hidden.has(target)).toBe(false);
    tool.resize?.(1, 60);
    tool.frame();
    expect(tool.live().hidden.has(target)).toBe(true);
  });
```

  b. `predict.test.ts`, à la fin du `describe("withPrediction (échelon 2 derrière le réglage)", …)` :

```ts
  it("OG25 : resize relayé tel quel au puits ; puits sans resize : rien ne lève", () => {
    const calls: string[] = [];
    const inner: GestureSink = { begin: () => {}, extend: () => {}, close: () => {}, resize: (id, r) => void calls.push(`resize ${id} ${r}`) };
    withPrediction(inner, () => "none").resize?.(-1, 70);
    expect(calls).toEqual(["resize -1 70"]);
    const bare = withPrediction({ begin: () => {}, extend: () => {}, close: () => {} }, () => "none");
    expect(() => bare.resize?.(-1, 70)).not.toThrow();
  });
```

  c. `engine.test.ts` — dans `describe("createEngine", …)`, après le test « sink : le geste va à l'outil demandé par le routeur… » :

```ts
  it("OG25 : sink.resize va à l'outil du geste ; geste inconnu : rien", () => {
    const log: string[] = [];
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", log, ctx),
      eraser: (ctx) => ({ ...fakeTool("eraser", log, ctx), resize: (id: number, r: number) => void log.push(`eraser.resize ${id} ${r}`) }),
    };
    const engine = createEngine({ doc: fakeCore.blank(), renderer: new FakeRenderer(), frames: new Frames(), tools });
    engine.sink.begin(-1, "eraser", [sample]);
    engine.sink.resize?.(-1, 70);
    engine.sink.resize?.(5, 70);
    expect(log).toEqual(["eraser.begin -1", "eraser.resize -1 70"]);
  });
```

  d. `engine.test.ts` — dans le `describe` qui définit `function c5()` (autour de `engine.test.ts:1580`), à la fin :

```ts
  it("OG25 gesturesToTools : vrai retouche au repos, faux pendant le rognage, vrai après", () => {
    const { engine, id } = c5();
    expect(engine.gesturesToTools()).toBe(true);
    const edit = engine.editImage(id)!;
    expect(engine.gesturesToTools()).toBe(true);
    edit.startCrop();
    expect(engine.gesturesToTools()).toBe(false);
    edit.finishCrop(false);
    expect(engine.gesturesToTools()).toBe(true);
  });
```

  e. `engine.test.ts` — dans `describe("moteur : séance d'orbite (C15, X23)", …)`, à la fin :

```ts
  it("OG25 gesturesToTools : faux tant qu'une orbite est ouverte", () => {
    const { engine, open } = c15();
    expect(engine.gesturesToTools()).toBe(true);
    const o = open();
    expect(engine.gesturesToTools()).toBe(false);
    o?.close();
    expect(engine.gesturesToTools()).toBe(true);
  });
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` (« engine.gesturesToTools is not a function »,
  `expected 6 to be 35`, `expected [ 'eraser.begin -1' ] to deeply equal …`).

- [ ] **Étape 3 : implémenter.**

  a. `gesture.ts`, dans `GestureSink`, après `close(…)` :

```ts
  /** OG25 (A2) : rayon de la gomme du geste, px d'écran, le plus grand vu ; absent : sans effet. */
  resize?(pointerId: number, radiusPx: number): void;
```

  b. `tool.ts`, dans `GestureTool`, après `active(): boolean;` :

```ts
  /** OG25 (A2) : agrandit le rayon du geste `pointerId` (px d'écran) ; jamais ne le réduit ; absent : sans effet. */
  resize?(pointerId: number, radiusPx: number): void;
```

  c. `eraser.ts` : dans `interface Pass`, `readonly radius: number;` devient `radius: number;` ; ajouter à la fin du
  commentaire d'en-tête la ligne ` * OG25 : `resize` agrandit le rayon d'un passage (le plus grand vu) ; une seule Erase
  au rayon final.` ; dans l'objet rendu, après `close(…) {…},` :

```ts
    resize(pointerId: number, radiusPx: number) {
      const p = passes.get(pointerId);
      if (!p || !Number.isFinite(radiusPx) || radiusPx <= 0) return;
      const r = radiusPx / ctx.camera().zoom;
      if (!(r > p.radius)) return;
      p.radius = r;
      // Gomme d'objet : le chemin déjà passé est sondé de nouveau, au rayon nouveau.
      if (p.mode === "object") p.checked = 0;
    },
```

  d. `predict.ts`, dans l'objet rendu par `withPrediction`, après `close(…) {…},` :

```ts
    resize(pointerId, radiusPx) {
      sink.resize?.(pointerId, radiusPx);
    },
```

  e. `engine.ts` :
  - dans `interface Engine`, après `panHeld(): boolean;` :

```ts
  /** OG25 (déc. 23) : faux quand une retouche d'image (rognage, pipette) ou une orbite prend les gestes ; le routeur le
   *  lit avant de basculer en gomme automatique. */
  gesturesToTools(): boolean;
```

  - dans `const sink: GestureSink = {…}`, après `close(pointerId, how) {…},` :

```ts
    resize(pointerId, radiusPx) {
      owner.get(pointerId)?.resize?.(pointerId, radiusPx);
      loop.start(); // l'aperçu suit le rayon
    },
```

  - dans `const engine: Engine = {…}`, juste après `panHeld: () => spaceHeld,` :

```ts
    gesturesToTools: () => !(imageEdit !== null && imageEdit.mode() !== "idle") && orbit === null,
```

- [ ] **Étape 4 : relancer** — attendu : trois fichiers verts, 7 lignes « OG25 ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/engine/input/gesture.ts apps/web/src/engine/tools/tool.ts apps/web/src/engine/tools/eraser.ts apps/web/src/engine/tools/eraser.test.ts apps/web/src/engine/input/predict.ts apps/web/src/engine/input/predict.test.ts apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(engine): growing eraser radius and gesturesToTools (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé createEraserTool, GestureSink/withPrediction/engine.sink, Engine (étendus)`.

---

<a id="tache-t4"></a>
### Tâche T4 — Routeur : bascule en gomme automatique

**Objectif.** Dans le routeur, seul décideur du rôle d'un geste : un contact tactile large (D ≥ 80 px), ou trois doigts
serrés, dans les 250 ms de leur pose, ouvrent une gomme sous un identifiant négatif (-1, -2…) au centre et au rayon du
groupe ; le trait commencé est avorté, le défilement de la fenêtre est défait ; la gomme suit le groupe, son rayon ne fait
que grandir, elle se ferme au lever du dernier contact (`end`), par `cancel` si ce dernier est annulé, par `abort` si un
stylet touche. Rien ne change hors bascule (règle finale du cadrage, § 2).

**Fichiers.**
- Modifier (remplacement complet, code ci-dessous) : `apps/web/src/engine/input/router.ts`
- Tester : `apps/web/src/engine/input/router.test.ts` (ajouts en fin de fichier ; aucun test existant touché)

**Interfaces.**
- Consomme : T1 `DETECT_MS`, `eraserCircle`, `isLargeContact`, `isTightCluster`, `joinsCluster`, `type ContactBox` ;
  T2 `GestureEvent.contact?: { width; height }` ; T3 `GestureSink.resize?(pointerId: number, radiusPx: number): void`.
- Produit (T6) :
  - `RouterOptions.autoEraser?: boolean` (absent : coupée ; la session passe un accesseur)
  - `export interface EraserRingView { readonly x: number; readonly y: number; readonly radius: number }`
  - `RouterDeps.gesturesToTools?(): boolean` (absent : vrai) ; `RouterDeps.ring?(c: EraserRingView | null): void`
  - `Router.roleOf` rend `"erase"` pour un contact du groupe.
- Réutilise : `engine/input/router.ts:53` (`createRouter`) — `RouterOptions` + `autoEraser` (accesseur) ; `RouterDeps` + `ring?(c: { readonly x: number; readonly y: number; readonly radius: number } | null): void` ; rôle interne `"palm"` ; `roleOf` rend `"erase"` pour un contact du groupe.
- Réutilise : `CloseReason "abort"` (`gesture.ts:9-12`), `pen.ts:118` — `gestures.close(id, "abort")` pour le trait avorté.
- Réutilise : `ViewSink.panBy` (`gesture.ts:21-24`) — `panBy(-dx, -dy)` du cumul du contact.
- Le rapport porte `Réutilisation : appelé createRouter (étendu), gestures.close(id, "abort"), view.panBy`.

**Patron à ne pas reprendre (concepteur-critique).**
- Ne pas appeler `engine.setTool("eraser")` puis rendre l'outil au lever : `setTool` fait quitter l'outil courant
  (`leaveAll`, `apps/web/src/engine/engine.ts:778-784` : texte validé, sélection vidée), qui ne reviendrait pas intact
  (déc. 16, A1).
- Ne pas ouvrir la gomme sous le `pointerId` du contact porteur : le moteur range les gestes par identifiant
  (`apps/web/src/engine/engine.ts:704-728`, `owner`), le porteur peut se lever avant les autres et son `pointerId` être
  redonné (déc. 35).
- Ne pas faire basculer un geste établi (au-delà de 250 ms) : `apps/web/src/engine/input/router.ts:85` et `:94-99`
  gardent leur comportement (déc. 13, 32).

**Chemin de référence.** Le bouton gomme du stylet fixe l'outil du geste sans changer l'outil courant :
`apps/web/src/engine/input/router.ts:80-82`. L'abandon d'un trait par le routeur : `router.ts:88-92`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/engine/input/router.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -40
```

Preuve : `Test Files  1 passed (1)`, `Tests  N passed (N)` avec N = nombre d'avant + 18, 18 lignes « OG25 », aucune
ligne `FAIL ` ; les tests existants de `router.test.ts` restent verts sans changement (ils n'ont ni géométrie ni
`autoEraser`). Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G1 — Détection et seuils en fonctions pures testées à part (`engine/input/contact.ts`) : le routeur n'écrit aucun seuil, il appelle `contact.ts`.
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé (`SECOND_FINGER_MS` reste 150).
- G5 — Aucun octet ajouté aux modules Wasm.
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Aucun appel à `currentTool`/`setTool` pour changer d'outil ; aucun changement de `DEFAULT_ROUTER_OPTIONS`
(la gomme automatique y reste absente, donc coupée) ; aucune lecture de `Touch.radiusX` (déc. 4).

**Terminé quand.** Tous les tests de `router.test.ts` passent dont les 18 neufs, `tsc rc=0`, commit des deux fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent** — à la fin de `router.test.ts` (les aides `s`, `ev`, `penSeen` du
  fichier sont réutilisées ; les types `GestureSink`, `ToolChoice`, `ViewSink`, `RouterOptions`, `GestureEvent`,
  `GestureKind` sont déjà importés en tête, `router.test.ts:1-4`) :

```ts
describe("gomme automatique à la surface de contact (OG25)", () => {
  function palmSetup(o: { tool?: ToolChoice; held?: boolean; toTools?: boolean; on?: () => boolean } = {}) {
    const log: string[] = [];
    const rings: string[] = [];
    const gestures: GestureSink = {
      begin: (id, t, samples) => log.push(`begin ${id} ${t} ${samples.length}`),
      extend: (id, samples) => log.push(`extend ${id} ${samples.length}`),
      close: (id, how) => log.push(`close ${id} ${how}`),
      resize: (id, r) => log.push(`resize ${id} ${r}`),
    };
    const view: ViewSink = {
      panBy: (dx, dy) => log.push(`pan ${dx} ${dy}`),
      zoomAt: (x, y, f) => log.push(`zoom ${x} ${y} ${f}`),
    };
    const on = o.on ?? (() => true);
    const options: RouterOptions = {
      ...DEFAULT_ROUTER_OPTIONS,
      get autoEraser() {
        return on();
      },
    };
    const router = createRouter(options, {
      currentTool: () => o.tool ?? "pen",
      panHeld: () => o.held === true,
      gesturesToTools: () => o.toTools !== false,
      ring: (c) => rings.push(c === null ? "null" : `${c.x},${c.y},${c.radius}`),
      gestures,
      view,
    });
    return { router, log, rings };
  }
  /** Toucher ; `w`, `h` : géométrie (0 : aucune). */
  const touch = (kind: GestureKind, id: number, x: number, y: number, t: number, w = 0, h = w): GestureEvent =>
    ev(kind, id, "touch", kind === "end" || kind === "cancel" ? [] : [s(x, y, t)], w > 0 || h > 0 ? { contact: { width: w, height: h } } : {});

  it("OG25 S2 : un trait avorté à la bascule n'écrit rien — contact élargi à 140 × 120 dans sa fenêtre, gomme sous -1 au rayon 70, anneau", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 30));
    router.handle(touch("move", 5, 100, 110, 40, 140, 120));
    expect(router.roleOf(5)).toBe("erase");
    router.handle(touch("move", 5, 100, 150, 60, 140, 120));
    router.handle(touch("end", 5, 0, 0, 0));
    expect(log).toEqual(["begin 5 pen 1", "close 5 abort", "begin -1 eraser 1", "resize -1 70", "extend -1 1", "close -1 end"]);
    expect(rings).toEqual(["100,110,70", "100,150,70", "null"]);
    expect(router.roleOf(5)).toBeNull();
  });

  it("OG25 S1 : doigt fin (20 × 20) : trait ordinaire, aucune gomme, aucun anneau", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 0, 0, 0, 20));
    router.handle(touch("move", 5, 50, 0, 10, 20));
    router.handle(touch("end", 5, 0, 0, 0));
    expect(log).toEqual(["begin 5 pen 1", "extend 5 1", "close 5 end"]);
    expect(rings).toEqual([]);
  });

  it("OG25 : contact élargi après sa fenêtre de 250 ms : le trait continue (déc. 8)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 0, 0, 0, 30));
    router.handle(touch("move", 5, 10, 0, 300, 140));
    expect(log).toEqual(["begin 5 pen 1", "extend 5 1"]);
    expect(rings).toEqual([]);
  });

  it("OG25 S5 : stylet et souris larges ne basculent jamais (déc. 5)", () => {
    const { router, log, rings } = palmSetup();
    const big = { contact: { width: 150, height: 150 } };
    router.handle(ev("start", 1, "pen", [s(0, 0, 0)], big));
    router.handle(ev("move", 1, "pen", [s(10, 0, 10)], big));
    router.handle(ev("end", 1, "pen", []));
    router.handle(ev("start", 2, "mouse", [s(0, 0, 20)], big));
    router.handle(ev("move", 2, "mouse", [s(10, 0, 30)], big));
    router.handle(ev("end", 2, "mouse", []));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 1", "close 1 end", "begin 2 pen 1", "extend 2 1", "close 2 end"]);
    expect(rings).toEqual([]);
  });

  it("OG25 S6 : sans géométrie, trois doigts serrés gardent le comportement d'aujourd'hui (déc. 11)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 0, 0, 0));
    router.handle(touch("start", 2, 30, 0, 40));
    router.handle(touch("start", 3, 60, 0, 80));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    expect(rings).toEqual([]);
    expect(router.roleOf(3)).toBeNull();
  });

  it("OG25 S3 : trois doigts serrés gomment ; trois doigts éloignés ou tardifs gardent le pincement (effet de bord 1)", () => {
    const a = palmSetup();
    a.router.handle(touch("start", 1, 100, 100, 0, 24));
    a.router.handle(touch("start", 2, 130, 100, 40, 24));
    a.router.handle(touch("start", 3, 160, 100, 80, 24));
    expect(a.log).toEqual(["begin 1 pen 1", "close 1 abort", "begin -1 eraser 1", "resize -1 42"]);
    expect(a.rings).toEqual(["130,100,42"]);
    expect([a.router.roleOf(1), a.router.roleOf(2), a.router.roleOf(3)]).toEqual(["erase", "erase", "erase"]);
    const far = palmSetup();
    far.router.handle(touch("start", 1, 100, 100, 0, 24));
    far.router.handle(touch("start", 2, 500, 100, 40, 24));
    far.router.handle(touch("start", 3, 900, 100, 80, 24));
    expect(far.log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    const late = palmSetup();
    late.router.handle(touch("start", 1, 100, 100, 0, 24));
    late.router.handle(touch("start", 2, 130, 100, 40, 24));
    late.router.handle(touch("start", 3, 160, 100, 300, 24));
    expect(late.log).toEqual(["begin 1 pen 1", "close 1 abort"]);
    expect(late.router.roleOf(3)).toBeNull();
  });

  it("OG25 S4 : deux doigts qui s'écartent : pincement inchangé, aucune gomme (déc. 10)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("move", 2, 300, 100, 40, 24));
    expect(log).toEqual(["begin 1 pen 1", "close 1 abort", "pan 50 0", "zoom 200 100 2"]);
    expect(rings).toEqual([]);
  });

  it("OG25 : paume posée pendant un pincement établi : ignorée, le pincement continue (effet de bord 8, déc. 32)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 100, 100, 0, 24));
    router.handle(touch("start", 2, 200, 100, 20, 24));
    router.handle(touch("move", 2, 210, 100, 400, 24));
    router.handle(touch("start", 3, 150, 300, 420, 140));
    router.handle(touch("move", 3, 160, 300, 425, 140));
    router.handle(touch("move", 2, 220, 100, 430, 24));
    expect(log.some((l) => l.startsWith("begin -"))).toBe(false);
    expect(log.at(-1)).toMatch(/^zoom 160 100 /);
    expect(rings).toEqual([]);
    expect(router.roleOf(3)).toBeNull();
  });

  it("OG25 : paume posée pendant un défilement établi : devient la seconde moitié du pincement, comme aujourd'hui (effet de bord 8)", () => {
    const { router, log, rings } = palmSetup();
    penSeen(router, log);
    router.handle(touch("start", 5, 100, 100, 1000));
    router.handle(touch("move", 5, 110, 100, 1400));
    router.handle(touch("start", 6, 300, 100, 1420, 140));
    expect(log).toEqual(["pan 10 0"]);
    expect(router.roleOf(6)).toBe("view");
    expect(rings).toEqual([]);
  });

  it("OG25 : paume après stylet : gomme, vue revenue (effet de bord 3, déc. 34)", () => {
    const { router, log } = palmSetup();
    penSeen(router, log);
    router.handle(touch("start", 5, 100, 100, 1000, 30));
    router.handle(touch("move", 5, 110, 105, 1050, 30));
    router.handle(touch("move", 5, 120, 110, 1100, 140));
    expect(log).toEqual(["pan 10 5", "pan -10 -5", "begin -1 eraser 1", "resize -1 70"]);
  });

  it("OG25 : un stylet posé ferme la gomme sans rien écrire, même en paume souple ; un toucher annulé par le stylet aussi (effet de bord 4, déc. 15)", () => {
    const a = palmSetup();
    a.router.handle(touch("start", 5, 100, 100, 0, 140));
    a.router.handle(ev("start", 9, "pen", [s(0, 0, 10)]));
    a.router.handle(touch("move", 5, 100, 120, 20, 140));
    a.router.handle(touch("end", 5, 0, 0, 0));
    expect(a.log).toEqual(["begin -1 eraser 1", "resize -1 70", "close -1 abort", "begin 9 pen 1"]);
    expect(a.rings).toEqual(["100,100,70", "null"]);
    const b = palmSetup();
    b.router.handle(touch("start", 5, 100, 100, 0, 140));
    b.router.handle(ev("cancel", 5, "touch", [], { palm: true }));
    expect(b.log).toEqual(["begin -1 eraser 1", "resize -1 70", "close -1 abort"]);
  });

  it("OG25 : pointercancel d'un contact du groupe : la gomme continue ; le dernier annulé ferme par cancel (effet de bord 10, déc. 22)", () => {
    const { router, log } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 140));
    router.handle(touch("start", 6, 150, 100, 10, 30));
    router.handle(touch("cancel", 6, 0, 0, 0));
    router.handle(touch("move", 5, 100, 120, 20, 140));
    router.handle(touch("cancel", 5, 0, 0, 0));
    expect(log).toEqual(["begin -1 eraser 1", "resize -1 70", "extend -1 1", "extend -1 1", "close -1 cancel"]);
  });

  it("OG25 : contact loin du groupe ignoré ; pointerId du porteur réutilisé : rejoint le groupe, le geste reste -1 (déc. 12, 35)", () => {
    const { router, log } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 140));
    router.handle(touch("start", 7, 600, 100, 10, 24));
    expect(router.roleOf(7)).toBeNull();
    router.handle(touch("start", 6, 150, 100, 20, 24));
    router.handle(touch("end", 5, 0, 0, 0));
    router.handle(touch("start", 5, 120, 100, 40, 24));
    expect(router.roleOf(5)).toBe("erase");
    router.handle(touch("move", 5, 125, 100, 50, 24));
    router.handle(touch("end", 6, 0, 0, 0));
    router.handle(touch("end", 5, 0, 0, 0));
    router.handle(touch("end", 7, 0, 0, 0));
    expect(log).toEqual(["begin -1 eraser 1", "resize -1 70", "extend -1 1", "extend -1 1", "extend -1 1", "close -1 end"]);
  });

  it("OG25 : outil Sélection, contact qui grandit : aucune gomme, begin de la sélection une seule fois ; réglage coupé, Main, espace tenu, Texte, Tableau, retouche ou orbite : aucune bascule (effet de bord 9, déc. 14, 23, 25, 33)", () => {
    const cases: Parameters<typeof palmSetup>[0][] = [
      { tool: "select" },
      { on: () => false },
      { tool: "hand" },
      { held: true },
      { tool: "text" },
      { tool: "table" },
      { toTools: false },
    ];
    for (const c of cases) {
      const { router, log, rings } = palmSetup(c);
      router.handle(touch("start", 5, 100, 100, 0, 30));
      router.handle(touch("move", 5, 100, 110, 40, 140, 120));
      router.handle(touch("end", 5, 0, 0, 0));
      expect(log.some((l) => l.startsWith("begin -")), JSON.stringify(c)).toBe(false);
      expect(rings, JSON.stringify(c)).toEqual([]);
      if (c.tool === "select") expect(log.filter((l) => l.startsWith("begin"))).toEqual(["begin 5 select 1"]);
    }
  });

  it("OG25 : Rectangle, Ellipse, Ligne, Flèche, Pot, Gomme peuvent basculer (déc. 33)", () => {
    for (const tool of ["rect", "ellipse", "line", "arrow", "fill", "eraser"] as const) {
      const { router, log } = palmSetup({ tool });
      router.handle(touch("start", 5, 100, 100, 0, 30));
      router.handle(touch("move", 5, 100, 110, 40, 140, 120));
      expect(log.slice(0, 3), tool).toEqual([`begin 5 ${tool} 1`, "close 5 abort", "begin -1 eraser 1"]);
    }
  });

  it("OG25 : réglage lu à chaque pose (accesseur) ; identifiants réservés -1 puis -2", () => {
    let on = false;
    const { router, log } = palmSetup({ on: () => on });
    router.handle(touch("start", 5, 0, 0, 0, 140));
    router.handle(touch("end", 5, 0, 0, 0));
    on = true;
    router.handle(touch("start", 6, 0, 0, 1000, 140));
    router.handle(touch("end", 6, 0, 0, 0));
    router.handle(touch("start", 7, 0, 0, 2000, 140));
    expect(log).toEqual(["begin 5 pen 1", "close 5 end", "begin -1 eraser 1", "resize -1 70", "close -1 end", "begin -2 eraser 1", "resize -2 70"]);
  });

  it("OG25 : le rayon ne fait que grandir pendant le contact, borné à 160 (déc. 18, 19)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 5, 100, 100, 0, 100));
    router.handle(touch("move", 5, 100, 100, 10, 200));
    router.handle(touch("move", 5, 100, 100, 20, 60));
    router.handle(touch("move", 5, 100, 100, 30, 500));
    expect(log.filter((l) => l.startsWith("resize"))).toEqual(["resize -1 50", "resize -1 100", "resize -1 160"]);
    expect(rings).toEqual(["100,100,50", "100,100,100", "100,100,100", "100,100,160"]);
  });

  it("OG25 : trait au doigt établi : un contact large posé ensuite est ignoré, le trait continue (déc. 13)", () => {
    const { router, log, rings } = palmSetup();
    router.handle(touch("start", 1, 0, 0, 0));
    router.handle(touch("move", 1, 10, 0, 300));
    router.handle(touch("start", 2, 100, 0, 320, 140));
    router.handle(touch("move", 1, 20, 0, 330));
    expect(log).toEqual(["begin 1 pen 1", "extend 1 1", "extend 1 1"]);
    expect(rings).toEqual([]);
    expect(router.roleOf(2)).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` sur les tests « OG25 » (aucun `begin -1`), les
  anciens verts.

- [ ] **Étape 3 : remplacer `apps/web/src/engine/input/router.ts` par :**

```ts
/**
 * Routeur d'entrées (D18) : pour chaque geste de l'échantillonneur, tracer, déplacer la vue, pincer ou ignorer.
 * Un geste par pointerId. Stylet et souris tracent avec l'outil courant (bouton gomme du stylet : gomme). Doigt : trace
 * tant qu'aucun stylet n'a été vu (ENI sans stylet), sinon déplace la vue (réglable). Un second doigt posé dans les
 * 150 ms du premier annule le trait commencé (rien d'écrit) et passe en pincement. L'outil d'un geste est fixé au début.
 * Outil main ou espace tenu : tout geste déplace la vue (D17).
 * OG25 : un contact tactile large, ou trois doigts serrés, dans les 250 ms de leur pose, ouvrent une gomme automatique à
 * la taille du contact (seuils et calculs : `contact.ts`), sous un identifiant de geste négatif ; l'outil courant ne
 * change jamais (A1). Un geste établi n'est jamais interrompu ; un stylet posé ferme la gomme sans rien écrire.
 */
import { DETECT_MS, eraserCircle, isLargeContact, isTightCluster, joinsCluster, type ContactBox } from "./contact";
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./gesture";
import type { GestureEvent, InputSample } from "./sampler";

export const SECOND_FINGER_MS = 150;

export interface RouterOptions {
  /** Après un stylet vu dans la séance, le doigt seul déplace la vue au lieu de tracer (D18, réglable). */
  readonly fingerPansAfterPen: boolean;
  readonly secondFingerMs: number;
  /** OG25 (déc. 25) : gomme automatique à la paume ; lu à chaque pose (la page passe un accesseur) ; absent : coupée. */
  readonly autoEraser?: boolean;
}

export const DEFAULT_ROUTER_OPTIONS: RouterOptions = { fingerPansAfterPen: true, secondFingerMs: SECOND_FINGER_MS };

/** OG25 (déc. 24) : anneau de la gomme automatique, px CSS de la scène. */
export interface EraserRingView {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface RouterDeps {
  /** Outil courant ; "hand" (outil main, D17) : tout geste déplace la vue. */
  currentTool(): ToolChoice;
  /** Barre d'espace tenue (D17) : lue au début du geste ; absent = jamais tenue. */
  panHeld?(): boolean;
  /** OG25 (déc. 23) : faux quand une retouche d'image ou une orbite prend les gestes ; absent : vrai. */
  gesturesToTools?(): boolean;
  /** OG25 (déc. 24) : montre l'anneau de la gomme automatique (null : le retire) ; absent : rien. */
  ring?(c: EraserRingView | null): void;
  readonly gestures: GestureSink;
  readonly view: ViewSink;
}

export interface Router {
  handle(g: GestureEvent): void;
  penSeen(): boolean;
  /**
   * Rôle du geste en cours de ce pointeur : "ink" (trace), "erase" (gomme), "view" (déplacement ou pincement de la vue),
   * null (inconnu, ignoré, annulé ou fini). Source unique pour la traînée déléguée (échelon 3).
   */
  roleOf(pointerId: number): "ink" | "erase" | "edit" | "view" | null;
}

type Role = "draw" | "pan" | "pinch" | "ignored" | "palm";

interface Track {
  role: Role;
  tool: DrawTool;
  readonly pointerType: string;
  readonly startT: number;
  x: number;
  y: number;
  /** OG25 : dernière géométrie reçue (px CSS) ; 0 × 0 sans géométrie. */
  w: number;
  h: number;
  /** OG25 (déc. 14, 33) : outil choisi et espace tenu à la pose. */
  readonly choice: ToolChoice;
  readonly held: boolean;
  /** OG25 (déc. 12) : déplacement de vue cumulé par ce contact (rôle "pan"), défait à la bascule. */
  panX: number;
  panY: number;
}

/** OG25 : groupe gomme ; `id` : identifiant réservé négatif du geste (déc. 35) ; `radius` : le plus grand vu (déc. 19). */
interface PalmGroup {
  readonly id: number;
  readonly members: Set<number>;
  radius: number;
}

/** OG25 (déc. 33) : outils sans effet au `begin`, seuls à pouvoir basculer. */
const SWITCHABLE: ReadonlySet<ToolChoice> = new Set<ToolChoice>(["pen", "eraser", "rect", "ellipse", "line", "arrow", "fill"]);

const lastOf = (samples: readonly InputSample[]): InputSample | undefined => samples[samples.length - 1];
const boxOf = (t: Track): ContactBox => ({ x: t.x, y: t.y, width: t.w, height: t.h });
const sampleAt = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t });

export function createRouter(opts: RouterOptions, deps: RouterDeps): Router {
  const tracks = new Map<number, Track>();
  let seenPen = false;
  let palm: PalmGroup | null = null;
  let nextPalmId = -1;

  const touches = (role: Role): [number, Track][] =>
    [...tracks].filter(([, t]) => t.pointerType === "touch" && t.role === role);

  const pinchPair = (): [Track, Track] | null => {
    const p = touches("pinch");
    const a = p[0];
    const b = p[1];
    return a && b ? [a[1], b[1]] : null;
  };

  const memberBoxes = (): ContactBox[] => {
    const out: ContactBox[] = [];
    if (palm === null) return out;
    for (const id of palm.members) {
      const t = tracks.get(id);
      if (t) out.push(boxOf(t));
    }
    return out;
  };

  /** OG25 : le chemin et l'anneau suivent le centre du groupe ; le rayon ne fait que grandir (déc. 17, 19). */
  const follow = (t: number): void => {
    if (palm === null) return;
    const boxes = memberBoxes();
    if (boxes.length === 0) return;
    const c = eraserCircle(boxes);
    if (c.radius > palm.radius) {
      palm.radius = c.radius;
      deps.gestures.resize?.(palm.id, c.radius);
    }
    deps.gestures.extend(palm.id, [sampleAt(c.x, c.y, t)], []);
    deps.ring?.({ x: c.x, y: c.y, radius: palm.radius });
  };

  /** OG25 : ferme la gomme ; les contacts encore posés n'agissent plus jusqu'à leur lever. */
  const closePalm = (how: CloseReason): void => {
    if (palm === null) return;
    const p = palm;
    palm = null;
    for (const id of p.members) {
      const t = tracks.get(id);
      if (t) t.role = "ignored";
    }
    deps.gestures.close(p.id, how);
    deps.ring?.(null);
  };

  /**
   * OG25 : essaie la bascule déclenchée par `trigger` (contact posé ou élargi) à l'instant `now`. Le groupe : le
   * déclencheur et les contacts tactiles qui tracent, déplacent ou pincent (les ignorés le restent, déc. 12). Rien ne
   * bascule si l'un d'eux a dépassé sa fenêtre (geste établi, déc. 13, 32), ni hors des outils sans effet au `begin`
   * (déc. 33), ni avec la main ou l'espace (déc. 14), ni pendant une retouche ou une orbite (déc. 23).
   */
  const tryPalm = (triggerId: number, trigger: Track, now: number): boolean => {
    if (opts.autoEraser !== true || palm !== null || trigger.pointerType !== "touch") return false;
    const group: [number, Track][] = [[triggerId, trigger]];
    for (const [id, t] of tracks) {
      if (id !== triggerId && t.pointerType === "touch" && (t.role === "draw" || t.role === "pan" || t.role === "pinch")) group.push([id, t]);
    }
    if (group.some(([, t]) => now - t.startT > DETECT_MS)) return false;
    let first = trigger;
    for (const [, t] of group) if (t.startT < first.startT) first = t;
    if (first.held || !SWITCHABLE.has(first.choice)) return false;
    const boxes = group.map(([, t]) => boxOf(t));
    if (!group.some(([, t]) => isLargeContact({ width: t.w, height: t.h })) && !isTightCluster(boxes)) return false;
    if (deps.gesturesToTools?.() === false) return false;
    const id = nextPalmId--;
    for (const [pid, t] of group) {
      if (t.role === "draw") deps.gestures.close(pid, "abort");
      else if (t.role === "pan" && (t.panX !== 0 || t.panY !== 0)) deps.view.panBy(-t.panX, -t.panY);
      t.role = "palm";
      t.panX = 0;
      t.panY = 0;
    }
    const c = eraserCircle(boxes);
    palm = { id, members: new Set(group.map(([pid]) => pid)), radius: c.radius };
    deps.gestures.begin(id, "eraser", [sampleAt(c.x, c.y, now)], "touch");
    deps.gestures.resize?.(id, c.radius);
    deps.ring?.({ x: c.x, y: c.y, radius: c.radius });
    return true;
  };

  const onStart = (g: GestureEvent): void => {
    const s = g.samples[0];
    if (!s) return;
    const tool = deps.currentTool();
    const held = deps.panHeld?.() === true;
    const track: Track = {
      role: "ignored",
      tool: "pen",
      pointerType: g.pointerType,
      startT: s.t,
      x: s.x,
      y: s.y,
      w: g.contact?.width ?? 0,
      h: g.contact?.height ?? 0,
      choice: tool,
      held,
      panX: 0,
      panY: 0,
    };
    tracks.set(g.pointerId, track);
    if (g.pointerType === "pen") {
      seenPen = true;
      closePalm("abort"); // OG25 (déc. 15) : une main posée pour écrire n'est pas une gomme
    }
    if (g.pointerType !== "touch") {
      if (tool === "hand" || held) {
        track.role = "pan";
        return;
      }
      track.role = "draw";
      track.tool = g.eraserButton ? "eraser" : tool;
      deps.gestures.begin(g.pointerId, track.tool, g.samples, g.pointerType);
      return;
    }
    if (palm !== null) {
      // OG25 (déc. 12) : un contact proche rejoint le groupe ; un plus loin est ignoré, et la vue ne bouge plus.
      if (joinsCluster(memberBoxes(), boxOf(track))) {
        track.role = "palm";
        palm.members.add(g.pointerId);
        follow(s.t);
      }
      return;
    }
    if (tryPalm(g.pointerId, track, s.t)) return;
    if (pinchPair()) return; // troisième doigt : ignoré
    const drawing = touches("draw")[0];
    const panning = touches("pan")[0];
    if (drawing && s.t - drawing[1].startT <= opts.secondFingerMs) {
      deps.gestures.close(drawing[0], "abort");
      drawing[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (panning) {
      panning[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (drawing) return; // second doigt tardif : ignoré, le trait continue
    if (tool === "hand" || held || (seenPen && opts.fingerPansAfterPen)) {
      track.role = "pan";
      return;
    }
    track.role = "draw";
    track.tool = tool;
    deps.gestures.begin(g.pointerId, tool, g.samples, g.pointerType);
  };

  const onMove = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    const s = lastOf(g.samples);
    if (!t || !s) return;
    if (g.contact) {
      t.w = g.contact.width;
      t.h = g.contact.height;
    }
    if (t.role === "palm") {
      t.x = s.x;
      t.y = s.y;
      follow(s.t);
      return;
    }
    if (palm === null && (t.role === "draw" || t.role === "pan" || t.role === "pinch") && isLargeContact({ width: t.w, height: t.h })) {
      // OG25 : un contact qui s'élargit dans sa fenêtre bascule ; la gomme part de sa position nouvelle (H10).
      const px = t.x;
      const py = t.y;
      t.x = s.x;
      t.y = s.y;
      if (tryPalm(g.pointerId, t, s.t)) return;
      t.x = px;
      t.y = py;
    }
    if (t.role === "draw") {
      deps.gestures.extend(g.pointerId, g.samples, g.predicted);
    } else if (t.role === "pan") {
      deps.view.panBy(s.x - t.x, s.y - t.y);
      t.panX += s.x - t.x;
      t.panY += s.y - t.y;
    } else if (t.role === "pinch") {
      const pair = pinchPair();
      if (pair) {
        const [a, b] = pair;
        const cx0 = (a.x + b.x) / 2;
        const cy0 = (a.y + b.y) / 2;
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        t.x = s.x;
        t.y = s.y;
        const cx1 = (a.x + b.x) / 2;
        const cy1 = (a.y + b.y) / 2;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        deps.view.panBy(cx1 - cx0, cy1 - cy0);
        if (d0 > 0 && d1 > 0) deps.view.zoomAt(cx1, cy1, d1 / d0);
      }
    }
    t.x = s.x;
    t.y = s.y;
  };

  const onClose = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    if (!t) return;
    tracks.delete(g.pointerId);
    if (t.role === "palm") {
      if (palm === null) return;
      palm.members.delete(g.pointerId);
      // OG25 (déc. 15, 22) : paume annulée par le stylet : abort ; dernier contact levé : end, ou cancel s'il est annulé.
      if (g.palm === true) closePalm("abort");
      else if (palm.members.size === 0) closePalm(g.kind === "cancel" ? "cancel" : "end");
      return;
    }
    if (t.role === "draw") {
      const how: CloseReason = g.palm === true ? "abort" : g.kind === "cancel" ? "cancel" : "end";
      deps.gestures.close(g.pointerId, how);
    } else if (t.role === "pinch") {
      for (const [, other] of touches("pinch")) other.role = "ignored";
    }
  };

  return {
    handle(g) {
      if (g.kind === "start") onStart(g);
      else if (g.kind === "move") onMove(g);
      else onClose(g);
    },
    penSeen: () => seenPen,
    roleOf(pointerId) {
      const t = tracks.get(pointerId);
      if (!t) return null;
      if (t.role === "palm") return "erase";
      if (t.role === "draw") return t.tool === "eraser" ? "erase" : t.tool === "pen" ? "ink" : "edit";
      return t.role === "pan" || t.role === "pinch" ? "view" : null;
    },
  };
}
```

- [ ] **Étape 4 : relancer** — attendu : tout vert, 18 lignes « OG25 », anciens tests inchangés et verts.
- [ ] **Étape 5 : contrôle des voisins** — `cd …/apps/web && nice -n 10 npx vitest run src/engine/render/trail-style.test.ts src/app/board-session.test.ts 2>&1 | tail -8` : attendu `Test Files  2 passed (2)` (si `trail-style.test.ts` n'existe pas, lancer `board-session.test.ts` seul).
- [ ] **Étape 6 : typage** — `tsc rc=0`.
- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/engine/input/router.ts apps/web/src/engine/input/router.test.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(input): route large contacts and tight three-finger groups to an auto eraser (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé createRouter (étendu), gestures.close(id, "abort"), view.panBy` ; dire si un
test existant a dû changer (attendu : aucun ; sinon, s'arrêter et le signaler, G3).

---

<a id="tache-t5"></a>
### Tâche T5 — Réglage de l'appareil et anneau DOM

**Objectif.** (1) `DeviceSettings` gagne le réglage « Gomme automatique à la paume », actif par défaut, gardé sous
`roomboard.gomme.paume` (`non` quand il est coupé, clé absente sinon, patron du cadre). (2) Module neuf
`app/eraser-ring.ts` : un anneau DOM `pointer-events: none` posé dans la scène, une écriture de style par image, positions
en px entiers. (3) Sa règle CSS en fin de `ui/rb.css`.

**Fichiers.**
- Modifier : `apps/web/src/device-settings.ts` (constante après `FRAME_HIDDEN` l. 10 ; `DeviceSettings` l. 85-103 ; `createDeviceSettings` l. 113-201)
- Tester : `apps/web/src/device-settings.test.ts` (import l. 2 ; ajouts en fin)
- Créer : `apps/web/src/app/eraser-ring.ts`, `apps/web/src/app/eraser-ring.test.ts`
- Modifier : `apps/web/src/ui/rb.css` (fin du fichier)

**Interfaces.**
- Consomme : rien.
- Produit (T6, T7, T8) :
  - `export const PALM_ERASER_KEY = "roomboard.gomme.paume"`
  - `DeviceSettings.palmEraser(): boolean` ; `DeviceSettings.setPalmEraser(on: boolean): boolean` (vrai si gardé ; prévient `onChange`)
  - `export interface EraserRing { show(c: { readonly x: number; readonly y: number; readonly radius: number } | null): void; dispose(): void }`
  - `export function createEraserRing(stage: HTMLElement, frame?: (cb: () => void) => void): EraserRing` ; élément `.rb-eraser-ring`, `hidden` hors bascule, `data-rayon` = rayon peint.
- Réutilise : `device-settings.ts:113` (`createDeviceSettings`, patron `FRAME_KEY`) — `palmEraser(): boolean` ; `setPalmEraser(on: boolean): boolean` (vrai si gardé ; notifie `onChange`) ; `PALM_ERASER_KEY = "roomboard.gomme.paume"`.
- Réutilise : aucun pour l'anneau — nouveau module `app/eraser-ring.ts` (A4 ; termes cherchés par le cadrage : `cursor`, `erasers`, `EraserPreview` : rien pour un anneau) : `createEraserRing(stage: HTMLElement): { show(c: { x: number; y: number; radius: number } | null): void; dispose(): void }` (une écriture de style par image, `requestAnimationFrame`).
- Le rapport porte `Réutilisation : appelé createDeviceSettings (étendu)` et `Réutilisation : écart — nouveau module eraser-ring prévu par le cadrage (A4)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/device-settings.test.ts src/app/eraser-ring.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -30
```

Preuve : `Test Files  2 passed (2)`, 7 lignes « OG25 » (4 + 3), aucune ligne `FAIL ` ; les tests du cadre de
`device-settings.test.ts` restent verts. Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G4 — Toucher le moins possible le panneau d'options (autres ouvriers dessus) : les règles `.rb-options` de `rb.css` ne bougent pas ; la règle neuve s'ajoute après la dernière ligne.
- G5 — Aucun octet ajouté aux modules Wasm.
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G10 (partie code) — netteté § 10 : traits fins (1,5 px), positions en px CSS entiers.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Ne rien écrire dans le profil ni dans l'adresse (déc. 25) ; ne pas dessiner l'anneau dans les rendus
Canvas 2D ou WebGL2 (A4).

**Terminé quand.** Les deux fichiers de test passent, `tsc rc=0`, un commit avec les cinq fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent.**

  a. `device-settings.test.ts` : l'import de la ligne 2 gagne `PALM_ERASER_KEY` :
  `import { createDeviceSettings, FRAME_KEY, ITEM_STYLE_KEY, NO_ISLAND, islandKey, PALM_ERASER_KEY, SIDEBAR_KEY } from "./device-settings";` ; à la fin :

```ts
describe("gomme automatique à la paume (OG25, déc. 25)", () => {
  it("OG25 gomme à la paume : clé roomboard.gomme.paume ; absente : active", () => {
    expect(PALM_ERASER_KEY).toBe("roomboard.gomme.paume");
    expect(createDeviceSettings(memoryKv()).palmEraser()).toBe(true);
  });
  it("OG25 gomme à la paume : couper écrit « non », rallumer retire la clé ; relu par une nouvelle instance (rechargement) ; onChange prévenu", () => {
    const kv = memoryKv();
    const s = createDeviceSettings(kv);
    const cb = vi.fn();
    s.onChange(cb);
    expect(s.setPalmEraser(false)).toBe(true);
    expect(kv.map.get(PALM_ERASER_KEY)).toBe("non");
    expect(s.palmEraser()).toBe(false);
    expect(createDeviceSettings(kv).palmEraser()).toBe(false);
    expect(s.setPalmEraser(true)).toBe(true);
    expect(kv.map.has(PALM_ERASER_KEY)).toBe(false);
    expect(createDeviceSettings(kv).palmEraser()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(2);
  });
  it("OG25 gomme à la paume : valeur inconnue : active ; sans stockage ou stockage qui lève : mémoire seule, faux, rien ne lève", () => {
    expect(createDeviceSettings(memoryKv({ [PALM_ERASER_KEY]: "oui" })).palmEraser()).toBe(true);
    const mem = createDeviceSettings(null);
    expect(mem.setPalmEraser(false)).toBe(false);
    expect(mem.palmEraser()).toBe(false);
    const bad = createDeviceSettings(throwing);
    expect(bad.palmEraser()).toBe(true);
    expect(() => bad.setPalmEraser(false)).not.toThrow();
    expect(bad.palmEraser()).toBe(false);
    expect(bad.setPalmEraser(true)).toBe(false);
  });
  it("OG25 gomme à la paume : indépendante du cadre de l'annotation", () => {
    const kv = memoryKv();
    const s = createDeviceSettings(kv);
    s.setPalmEraser(false);
    expect(s.frame()).toBe(true);
    expect(kv.map.has(FRAME_KEY)).toBe(false);
  });
});
```

  b. `apps/web/src/app/eraser-ring.test.ts` :

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createEraserRing } from "./eraser-ring";

afterEach(() => {
  document.body.innerHTML = "";
});

function setup() {
  const stage = document.createElement("div");
  document.body.append(stage);
  const queued: (() => void)[] = [];
  const ring = createEraserRing(stage, (cb) => void queued.push(cb));
  const flush = (): void => {
    for (const cb of queued.splice(0)) cb();
  };
  const el = (): HTMLElement | null => stage.querySelector<HTMLElement>(".rb-eraser-ring");
  return { ring, flush, el, queued };
}

describe("anneau de la gomme automatique (OG25, déc. 24, A4)", () => {
  it("OG25 anneau : posé caché dans la scène, hors de l'arbre d'accessibilité", () => {
    const { el } = setup();
    expect(el()?.hidden).toBe(true);
    expect(el()?.getAttribute("aria-hidden")).toBe("true");
  });
  it("OG25 anneau : une écriture par image, au dernier cercle demandé ; px entiers, diamètre = 2 × rayon", () => {
    const { ring, flush, el, queued } = setup();
    ring.show({ x: 100, y: 200, radius: 30 });
    ring.show({ x: 110.4, y: 205.6, radius: 70 });
    expect(queued).toHaveLength(1);
    expect(el()?.hidden).toBe(true);
    flush();
    const e = el()!;
    expect(e.hidden).toBe(false);
    expect(e.style.width).toBe("140px");
    expect(e.style.height).toBe("140px");
    expect(e.style.transform).toBe("translate(40px, 136px)");
    expect(e.dataset["rayon"]).toBe("70");
  });
  it("OG25 anneau : show(null) le cache à l'image suivante ; dispose le retire, plus aucune écriture", () => {
    const { ring, flush, el } = setup();
    ring.show({ x: 50, y: 50, radius: 24 });
    flush();
    ring.show(null);
    flush();
    expect(el()?.hidden).toBe(true);
    expect(el()?.dataset["rayon"]).toBeUndefined();
    ring.show({ x: 50, y: 50, radius: 24 });
    ring.dispose();
    expect(() => flush()).not.toThrow();
    expect(el()).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` (« s.setPalmEraser is not a function », import de
  `./eraser-ring` introuvable).

- [ ] **Étape 3 : implémenter.**

  a. `device-settings.ts`, après `const FRAME_HIDDEN = "non";` :

```ts

/** OG25 (déc. 25) : gomme automatique à la paume ; « non » quand elle est coupée ; absente (ou toute autre valeur) : active. */
export const PALM_ERASER_KEY = "roomboard.gomme.paume";
const PALM_ERASER_OFF = "non";
```

  b. Dans `interface DeviceSettings`, après `setFrame(on: boolean): boolean;` :

```ts
  /** OG25 (déc. 25) : gomme automatique à la paume active. */
  palmEraser(): boolean;
  /** Vrai si le choix est gardé sur l'appareil ; faux : mémoire seule. Prévient `onChange` (comme `setFrame`). */
  setPalmEraser(on: boolean): boolean;
```

  c. Après `function readFrame(…) {…}` :

```ts
function readPalmEraser(kv: KeyValue | null): boolean {
  try {
    return kv?.getItem(PALM_ERASER_KEY) !== PALM_ERASER_OFF;
  } catch {
    return true;
  }
}
```

  d. Dans `createDeviceSettings`, après `let frame = readFrame(kv);` : `let palmEraser = readPalmEraser(kv);` ; dans
  l'objet rendu, après `setFrame(on) {…},` :

```ts
    palmEraser: () => palmEraser,
    setPalmEraser(on) {
      palmEraser = on;
      let kept = false;
      if (kv !== null) {
        try {
          if (on) kv.removeItem(PALM_ERASER_KEY);
          else kv.setItem(PALM_ERASER_KEY, PALM_ERASER_OFF);
          kept = true;
        } catch {
          kept = false;
        }
      }
      for (const cb of [...listeners]) cb();
      return kept;
    },
```

  e. `apps/web/src/app/eraser-ring.ts` :

```ts
/**
 * OG25 (déc. 24, A4) : anneau de la gomme automatique, élément du DOM posé dans la scène (`pointer-events: none`), hors des
 * rendus Canvas 2D et WebGL2 : visible aussi en annotation transparente, où l'aperçu de la gomme partielle n'est pas
 * peint. Une écriture de style par image (le dernier cercle demandé) ; positions et diamètre en px CSS entiers (§ 10).
 */
export interface EraserRingCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface EraserRing {
  /** Cercle en px CSS de la scène ; null : anneau caché. */
  show(c: EraserRingCircle | null): void;
  dispose(): void;
}

const nextFrame =
  (stage: HTMLElement) =>
  (cb: () => void): void => {
    const w = stage.ownerDocument.defaultView;
    if (w !== null && typeof w.requestAnimationFrame === "function") w.requestAnimationFrame(() => cb());
    else cb();
  };

export function createEraserRing(stage: HTMLElement, frame: (cb: () => void) => void = nextFrame(stage)): EraserRing {
  const el = stage.ownerDocument.createElement("div");
  el.className = "rb-eraser-ring";
  el.hidden = true;
  el.setAttribute("aria-hidden", "true");
  stage.append(el);
  let want: EraserRingCircle | null = null;
  let queued = false;
  let disposed = false;
  const paint = (): void => {
    queued = false;
    if (disposed) return;
    if (want === null) {
      el.hidden = true;
      delete el.dataset["rayon"];
      return;
    }
    const d = Math.max(2, Math.round(want.radius * 2));
    const left = Math.round(want.x - d / 2);
    const top = Math.round(want.y - d / 2);
    el.style.cssText = `width: ${d}px; height: ${d}px; transform: translate(${left}px, ${top}px);`;
    el.dataset["rayon"] = String(d / 2);
    el.hidden = false;
  };
  return {
    show(c) {
      if (disposed) return;
      want = c === null ? null : { x: c.x, y: c.y, radius: c.radius };
      if (queued) return;
      queued = true;
      frame(paint);
    },
    dispose() {
      disposed = true;
      el.remove();
    },
  };
}
```

  f. `ui/rb.css`, à la fin du fichier :

```css
/* OG25 (déc. 24) : anneau de la gomme automatique, trait violet de 1,5 px doublé d'un filet blanc de 1 px, sans
   remplissage ; jamais une cible ; position et taille écrites par `app/eraser-ring.ts`. */
.rb-eraser-ring { position: absolute; left: 0; top: 0; box-sizing: border-box; border: 1.5px solid var(--rf-violet-600); border-radius: 50%; box-shadow: 0 0 0 1px #fff; background: none; pointer-events: none; z-index: 2; }
.rb-eraser-ring[hidden] { display: none; }
```

- [ ] **Étape 4 : relancer** — attendu : `Test Files  2 passed (2)`, 7 lignes « OG25 ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/device-settings.ts apps/web/src/device-settings.test.ts apps/web/src/app/eraser-ring.ts apps/web/src/app/eraser-ring.test.ts apps/web/src/ui/rb.css && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ui): palm eraser device setting and DOM eraser ring (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Lignes `Réutilisation : appelé createDeviceSettings (étendu)` et `Réutilisation : écart — nouveau module
eraser-ring prévu par le cadrage (A4)`.

---

<a id="tache-t6"></a>
### Tâche T6 — Branchement de la session et de l'amorce

**Objectif.** La session passe au routeur l'accesseur `autoEraser` (réglage lu à chaque pose, absent : actif),
`gesturesToTools` du moteur et l'anneau ; l'amorce donne le réglage de l'appareil à la session.

**Fichiers.**
- Modifier : `apps/web/src/app/board-session.ts` (`SessionShared` l. 63-95 ; bloc du routeur l. 405-421 ; imports)
- Tester : `apps/web/src/app/board-session.test.ts` (ajout en fin)
- Modifier : `apps/web/src/main.ts` (`const shared: SessionShared = {…}` l. 228-234)

**Interfaces.**
- Consomme : T3 `Engine.gesturesToTools(): boolean` ; T4 `RouterOptions.autoEraser?`, `RouterDeps.gesturesToTools?`,
  `RouterDeps.ring?(c: EraserRingView | null)` ; T5 `createEraserRing(stage: HTMLElement): EraserRing`,
  `DeviceSettings.palmEraser(): boolean`.
- Produit (T7) : `SessionShared.palmEraser?: () => boolean` (absent : active).
- Réutilise : rien de plus que T3, T4, T5 (aucune ligne de la liste du cadrage n'est propre à cette tâche).

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/app/board-session.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -20
```

Preuve : `Test Files  1 passed (1)`, 2 lignes « OG25 », aucune ligne `FAIL ` (tous les tests existants de la session
verts). Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G5 — Aucun octet ajouté aux modules Wasm.
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Ne pas toucher `ui/OptionsPanel.tsx`, la barre (`Toolbar.tsx`, `toolbar.ts`) ni `stage-tags.ts` (la barre
ne change pas pendant la bascule, déc. 16). `board-session.ts` et `main.ts` sont aussi touchés par deux chantiers en
cours (`feat/personnalisation-2b`, `fix/portrait-pleine-largeur`) : ajouts minimaux, aucune ligne voisine reformatée.

**Terminé quand.** `board-session.test.ts` vert dont les 2 neufs, `tsc rc=0`, commit des trois fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent** — à la fin de `board-session.test.ts` :

```ts
describe("session : gomme automatique à la paume (OG25)", () => {
  /** Événement de pointeur synthétique : les champs lus par l'échantillonneur, posés sur un `Event` (happy-dom). */
  const pointer = (stage: HTMLElement, type: string, o: Record<string, number | string>): void => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    const fields = { pointerType: "touch", pressure: 0.5, tiltX: 0, tiltY: 0, buttons: type === "pointerup" ? 0 : 1, ...o };
    for (const [k, v] of Object.entries(fields)) Object.defineProperty(e, k, { value: v });
    stage.dispatchEvent(e);
  };
  const ringOf = (stage: HTMLElement): HTMLElement | null => stage.querySelector<HTMLElement>(".rb-eraser-ring");

  it("OG25 : paume posée puis élargie : anneau au rayon 70, outil courant inchangé ; levée : anneau caché ; dispose : retiré", async () => {
    const s = await createBoardSession(fakeCore.blank(), { ...shared, palmEraser: () => true });
    s.activate();
    expect(ringOf(s.stage)?.hidden).toBe(true);
    pointer(s.stage, "pointerdown", { pointerId: 11, clientX: 300, clientY: 300, width: 30, height: 30, timeStamp: 1000 });
    pointer(s.stage, "pointermove", { pointerId: 11, clientX: 300, clientY: 320, width: 140, height: 120, timeStamp: 1040 });
    await vi.waitFor(() => expect(ringOf(s.stage)?.hidden).toBe(false));
    expect(ringOf(s.stage)?.dataset["rayon"]).toBe("70");
    expect(s.engine.tool()).toBe("pen");
    pointer(s.stage, "pointerup", { pointerId: 11, clientX: 300, clientY: 320, timeStamp: 1080 });
    await vi.waitFor(() => expect(ringOf(s.stage)?.hidden).toBe(true));
    s.dispose();
    expect(ringOf(s.stage)).toBeNull();
  });

  it("OG25 : réglage coupé (SessionShared.palmEraser faux) : aucune bascule, l'anneau reste caché", async () => {
    const s = await createBoardSession(fakeCore.blank(), { ...shared, palmEraser: () => false });
    s.activate();
    pointer(s.stage, "pointerdown", { pointerId: 12, clientX: 300, clientY: 300, width: 140, height: 120, timeStamp: 2000 });
    pointer(s.stage, "pointermove", { pointerId: 12, clientX: 300, clientY: 340, width: 140, height: 120, timeStamp: 2040 });
    await new Promise((r) => setTimeout(r, 50));
    expect(ringOf(s.stage)?.hidden).toBe(true);
    pointer(s.stage, "pointerup", { pointerId: 12, clientX: 300, clientY: 340, timeStamp: 2080 });
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` (« expected undefined to be true » : aucun anneau).

- [ ] **Étape 3 : implémenter.**

  a. `board-session.ts`, import (près de `import { stageTags } from "./stage-tags";`) :

```ts
import { createEraserRing } from "./eraser-ring";
```

  b. Dans `interface SessionShared`, après `readonly subscribeItemStyle?: …;` :

```ts
  /** OG25 (déc. 25, 30) : gomme automatique à la paume (réglage de l'appareil, ou reçu par la fenêtre d'annotation), lue
   *  à chaque pose de contact ; absent : active. */
  readonly palmEraser?: () => boolean;
```

  c. Remplacer le bloc `const routerOptions: RouterOptions = {…};` et l'appel `createRouter(…)` (l. 405-421) par :

```ts
  // Doigt (D18, réglage) : lu à chaque geste. OG25 (déc. 25) : gomme automatique à la paume, lue à chaque pose.
  const routerOptions: RouterOptions = {
    get fingerPansAfterPen() {
      return settings.get().finger === "pan";
    },
    secondFingerMs: SECOND_FINGER_MS,
    get autoEraser() {
      return shared.palmEraser?.() ?? true;
    },
  };
  // Échelon 2 : `prediction` dit si la prédiction TS est effective (tag et libellé ; auto : seulement sans prédits
  // natifs). OF73 : `source` (TS, natifs bornés, aucun) est lue à chaque image ; `off` coupe les natifs, la souris n'en a jamais.
  const prediction = (): boolean => resolvePrediction(settings.get().prediction, support.predicted);
  const source = (): PredictionSource => predictionSource(settings.get().prediction, support.predicted);
  // OG25 (déc. 24, A4) : anneau de la gomme automatique, dans la scène, piloté par le routeur.
  const eraserRing = createEraserRing(stage);
  undo.push(() => eraserRing.dispose());
  const router = createRouter(routerOptions, {
    currentTool: () => engine.tool(),
    panHeld: () => engine.panHeld(),
    gesturesToTools: () => engine.gesturesToTools(),
    ring: (c) => eraserRing.show(c),
    gestures: withPrediction(engine.sink, source),
    view: engine.view,
  });
```

  (Les deux lignes `prediction` et `source` et leur commentaire existent déjà entre les deux blocs : les garder telles
  quelles, une seule fois.)

  d. `main.ts`, dans `const shared: SessionShared = {…}`, après la ligne `...createSharedItemStyle(…),` :

```ts
    // OG25 (déc. 25) : gomme automatique à la paume, réglage de l'appareil lu à chaque pose (`device`, plus bas).
    palmEraser: () => device.palmEraser(),
```

- [ ] **Étape 4 : relancer** — attendu : tout vert, 2 lignes « OG25 ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/app/board-session.ts apps/web/src/app/board-session.test.ts apps/web/src/main.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(session): wire the auto eraser setting, ring and modal check into the router (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé createRouter, createEraserRing, DeviceSettings.palmEraser (produits de T4, T5)`.

---

<a id="tache-t7"></a>
### Tâche T7 — Réglage vers la fenêtre d'annotation

**Objectif.** Le réglage arrive dans la fenêtre `annotate` par le canal du cadre : `main.ts` → contrôleur
(`palmEraser?()`) → charge `DocumentPayload.palmEraser` (écrit seulement s'il est donné, `palmEraserField`) → hôtes faux et
Tauri → page d'annotation (`palmEraser?(on)`, `p?.palmEraser !== false`) → variable lue par `SessionShared.palmEraser`.
Charge sans le champ (avant ce lot) : active.

**Fichiers.**
- Modifier : `apps/web/src/platform/annotation-port.ts` (`DocumentPayload` l. 128-134, `frameField` l. 137, `AnnotationWindows.enter`/`load` l. 175-177)
- Modifier : `apps/web/src/platform/annotation-fake.ts` (import l. 10 ; interface l. 45-56 ; `enter` l. 92-110, `load` l. 112-119 ; objet l. 195)
- Modifier : `apps/web/src/platform/annotation-tauri.ts` (import l. 11 ; `enter` l. 86 ; `load` l. 96)
- Modifier : `apps/web/src/app/annotation.ts` (import l. 29 ; `AnnotationDeps` l. 77-79 ; `frameOf` l. 151-152 ; l. 193 ; l. 307)
- Modifier : `apps/web/src/app/annotation-page.ts` (`AnnotationPageDeps` l. 96 ; `load` l. 214)
- Modifier : `apps/web/src/annotate-start.ts` (l. 35-43, l. 50-64)
- Modifier : `apps/web/src/main.ts` (dépendances du contrôleur, près de `frame: () => device.frame(),` l. 516)
- Tester : `apps/web/src/platform/annotation-port.test.ts`, `apps/web/src/app/annotation.test.ts`, `apps/web/src/app/annotation-page.test.ts`

**Interfaces.**
- Consomme : T5 `DeviceSettings.palmEraser(): boolean` ; T6 `SessionShared.palmEraser?: () => boolean`.
- Produit :
  - `DocumentPayload.palmEraser?: boolean`
  - `export const palmEraserField = (o: { readonly palmEraser?: boolean }): { readonly palmEraser?: boolean }`
  - `AnnotationWindows.enter(o: … & { readonly palmEraser?: boolean })`, `load(o: … & { readonly palmEraser?: boolean })`
  - `FakeAnnotationWindows.palmEraser(): boolean | null`
  - `AnnotationDeps.palmEraser?(): boolean` ; `AnnotationPageDeps.palmEraser?(on: boolean): void`
- Réutilise : `platform/annotation-port.ts:133-137` (`DocumentPayload.frame`, `frameField`), `app/annotation.ts:152` (`frameOf`), `annotation-page.ts:214` — `DocumentPayload` + `readonly palmEraser?: boolean` ; `palmEraserField(o: { readonly palmEraser?: boolean }): { readonly palmEraser?: boolean }` ; `AnnotationDeps.palmEraser?(): boolean` ; page : `d.palmEraser?.(p?.palmEraser !== false)`.
- Le rapport porte `Réutilisation : appelé frameField/frameOf (patron recopié en palmEraserField/palmOf)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/platform/annotation-port.test.ts src/app/annotation.test.ts src/app/annotation-page.test.ts src/app/annotation-frame.test.ts --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -20
```

Preuve : `Test Files  4 passed (4)`, 4 lignes « OG25 », aucune ligne `FAIL ` (tests du cadre L4-13 verts, effet de
bord 11). Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G5 — Aucun octet ajouté aux modules Wasm ; aucune capacité Tauri neuve (`apps/desktop` non touché).
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Jamais `?? true` dans la charge (patron `opaque`/`frame` : le champ n'est écrit que s'il est donné).
Ne pas mettre le réglage dans le profil envoyé (`ANNOTATION_EVENTS.profile`).

**Terminé quand.** Les quatre fichiers de test passent, `tsc rc=0`, un commit avec les dix fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent.**

  a. `annotation-port.test.ts` : ajouter `palmEraserField,` à l'import de `./annotation-port` ; à la fin :

```ts
describe("gomme automatique à la paume dans la charge (OG25, déc. 30)", () => {
  it("OG25 : palmEraserField écrit le champ seulement s'il est donné", () => {
    expect(palmEraserField({})).toEqual({});
    expect(palmEraserField({ palmEraser: false })).toEqual({ palmEraser: false });
    expect(palmEraserField({ palmEraser: true })).toEqual({ palmEraser: true });
  });
});
```

  b. `annotation.test.ts` : dans le type des options de `setup` (après `frame?: () => boolean;`) ajouter
  `palmEraser?: () => boolean;` ; dans `deps` (après la ligne `...(o.frame === undefined ? {} : { frame: o.frame }),`)
  ajouter `...(o.palmEraser === undefined ? {} : { palmEraser: o.palmEraser }),` ; puis, après le test « L4-13 : sans
  dépendance frame, enter et load du contrôleur ne portent pas le champ… » :

```ts
  it("OG25 : palmEraser lu à l'entrée puis au rechargement de « Figer » ; relayé par le faux hôte", async () => {
    let on = false;
    const { ctl, windows } = setup({ palmEraser: () => on });
    await ctl.enter();
    expect(windows.palmEraser()).toBe(false);
    on = true;
    await ctl.freeze();
    expect(windows.log).toContain("load opaque");
    expect(windows.palmEraser()).toBe(true);
  });
  it("OG25 : sans dépendance palmEraser, enter et load ne portent pas le champ ; le faux hôte lit « active »", async () => {
    const { ctl, windows } = setup();
    const enter = vi.spyOn(windows, "enter");
    const load = vi.spyOn(windows, "load");
    await ctl.enter();
    await ctl.freeze();
    expect(enter.mock.calls[0]![0]).not.toHaveProperty("palmEraser");
    expect(load.mock.calls[0]![0]).not.toHaveProperty("palmEraser");
    expect(windows.palmEraser()).toBe(true);
  });
```

  c. `annotation-page.test.ts` : dans `setup`, après `const frames: boolean[] = [];` ajouter
  `const palms: boolean[] = [];` ; dans les dépendances de `createAnnotationPage`, après `frame: (on) => void frames.push(on),`
  ajouter `palmEraser: (on) => void palms.push(on),` ; ajouter `palms` à l'objet rendu par `setup` ; puis, après le test
  « design-l4 (L4-13) : chaque document applique son cadre… » :

```ts
  it("OG25 (déc. 30) : chaque document applique son réglage de gomme à la paume ; absent : active ; illisible : rien", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { page, c, palms } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), palmEraser: false });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: "@@@" });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), palmEraser: true });
    await flush();
    expect(palms).toEqual([true, false, true]);
    warn.mockRestore();
  });
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` (import `palmEraserField` absent, « windows.palmEraser is not a function »).

- [ ] **Étape 3 : implémenter.**

  a. `annotation-port.ts` — dans `DocumentPayload`, après `readonly frame?: boolean;` :

```ts
  /** OG25 (déc. 30) : gomme automatique à la paume de l'appareil ; absent : active (charge d'avant OG25). */
  readonly palmEraser?: boolean;
```

  après la ligne `export const frameField = …;` :

```ts
/** OG25 (déc. 30) : champ `palmEraser` d'une charge, écrit seulement s'il est donné (patron `frameField`). */
export const palmEraserField = (o: { readonly palmEraser?: boolean }): { readonly palmEraser?: boolean } =>
  o.palmEraser === undefined ? {} : { palmEraser: o.palmEraser };
```

  dans `AnnotationWindows`, les deux signatures deviennent :

```ts
  enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile; readonly opaque?: boolean; readonly frame?: boolean; readonly palmEraser?: boolean }): Promise<number>;
```

```ts
  load(o: { readonly document: Uint8Array; readonly opaque: boolean; readonly frame?: boolean; readonly palmEraser?: boolean }): Promise<void>;
```

  et le commentaire de `enter` gagne la phrase « OG25 : `palmEraser` faux : gomme automatique coupée ; absent : active. »

  b. `annotation-fake.ts` — import : ajouter `palmEraserField,` à la liste importée de `./annotation-port` ; dans `interface FakeAnnotationWindows`, après `frame(): boolean | null;` :

```ts
  /** OG25 : gomme à la paume du dernier `enter` ou `load` (absente de la charge : vrai) ; null avant. */
  palmEraser(): boolean | null;
```

  après `let lastFrame: boolean | null = null;` : `let lastPalm: boolean | null = null;` ; dans `enter`, la charge
  devient `{ base64: toBase64(p.document), opaque: p.opaque === true, ...frameField(p), ...palmEraserField(p) }` et, après
  `lastFrame = payload.frame !== false;`, ajouter `lastPalm = payload.palmEraser !== false;` ; dans `load`, la charge
  devient `{ base64: toBase64(p.document), opaque: p.opaque, ...frameField(p), ...palmEraserField(p) }` et, après
  `lastFrame = payload.frame !== false;`, ajouter `lastPalm = payload.palmEraser !== false;` ; dans l'objet `w`, après
  `frame: () => lastFrame,` ajouter `palmEraser: () => lastPalm,`.

  c. `annotation-tauri.ts` — import : ajouter `palmEraserField,` après `isViewport,` ; dans `enter` et `load`, chaque
  `...frameField(o) }` devient `...frameField(o), ...palmEraserField(o) }`.

  d. `annotation.ts` — import : ajouter `palmEraserField,` à côté de `frameField,` (l. 29) ; dans `AnnotationDeps`, après
  `frame?(): boolean;` :

```ts
  /** OG25 (déc. 30) : gomme automatique à la paume de l'appareil, lue à chaque entrée et à chaque rechargement ; absent :
   *  la charge ne porte pas le champ (`annotate` la garde active). */
  palmEraser?(): boolean;
```

  après `const frameOf = …;` :

```ts
  /** OG25 : champ `palmEraser` de la charge, seulement si l'appareil le donne. */
  const palmOf = (): { readonly palmEraser?: boolean } => palmEraserField({ palmEraser: d.palmEraser?.() });
```

  l. 193 : `…, opaque: frozen, ...frameOf() });` devient `…, opaque: frozen, ...frameOf(), ...palmOf() });` ;
  l. 307 : `…, opaque: !toLive, ...frameOf() });` devient `…, opaque: !toLive, ...frameOf(), ...palmOf() });`.

  e. `annotation-page.ts` — dans `AnnotationPageDeps`, après `frame?(on: boolean): void;` :

```ts
  /** OG25 (déc. 30) : gomme automatique à la paume reçue avec chaque document (absent de la charge : active) ; absent : rien. */
  palmEraser?(on: boolean): void;
```

  dans `load`, après `d.frame?.(p?.frame !== false);` : `d.palmEraser?.(p?.palmEraser !== false);`.

  f. `annotate-start.ts` — avant `const shared: SessionShared = {` :

```ts
  // OG25 (déc. 30) : gomme automatique à la paume, reçue avec chaque document ; lue à chaque pose par la session.
  let palmEraser = true;
```

  dans `shared`, après `transparent: true,` : `palmEraser: () => palmEraser,` ; dans les dépendances de
  `createAnnotationPage`, après `frame,` :

```ts
    palmEraser: (on) => {
      palmEraser = on;
    },
```

  g. `main.ts` — dans les dépendances du contrôleur d'annotation, après `frame: () => device.frame(),` :

```ts
          // OG25 (déc. 30) : gomme automatique à la paume de l'appareil, envoyée à `annotate` avec le document.
          palmEraser: () => device.palmEraser(),
```

- [ ] **Étape 4 : relancer** — attendu : `Test Files  4 passed (4)`, 4 lignes « OG25 ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/platform/annotation-port.ts apps/web/src/platform/annotation-port.test.ts apps/web/src/platform/annotation-fake.ts apps/web/src/platform/annotation-tauri.ts apps/web/src/app/annotation.ts apps/web/src/app/annotation.test.ts apps/web/src/app/annotation-page.ts apps/web/src/app/annotation-page.test.ts apps/web/src/annotate-start.ts apps/web/src/main.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): send the palm eraser setting to the annotate window (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé frameField/frameOf (patron recopié en palmEraserField/palmOf)` ; signaler
l'écart à la carte d'impact (`annotation-fake.ts`, `annotation-tauri.ts` touchés).

---

<a id="tache-t8"></a>
### Tâche T8 — Bouton Réglages, Ctrl+Maj+H et avis

**Objectif.** Le panneau Réglages gagne un bouton `data-reglage="gomme-paume"` sur toutes les plateformes (prop neuve,
la prop `device` reste au cadre) ; Ctrl+Maj+H (Cmd+Maj+H sous macOS) coupe ou rallume le réglage, avec l'avis
« Gomme automatique à la paume : active / coupée » ; la table des raccourcis gagne la ligne.

**Fichiers.**
- Modifier : `apps/web/src/ui/SettingsPanel.tsx` (libellés après `FRAME_LABELS` l. 18 ; props l. 20-32 ; corps l. 36-85)
- Tester : `apps/web/src/ui/SettingsPanel.test.tsx` (`setup` l. 16-36, ajouts en fin)
- Modifier : `apps/web/src/ui/App.tsx` (import de `./toast` l. 52 et de `./SettingsPanel` ; raccourci l. 423-434 ; `<SettingsPanel …>` l. 633-642)
- Tester : `apps/web/src/ui/App.test.tsx` (après le test de `App.test.tsx:346`)
- Modifier : `apps/web/src/engine/input/keys.ts` (`AppShortcut`, `appShortcut` l. 100-108)
- Tester : `apps/web/src/engine/input/keys.test.ts` (dans `describe("appShortcut …")` l. 170)
- Modifier : `apps/web/src/ui/shortcuts.ts` (table `SHORTCUTS` l. 4-26)
- Tester : `apps/web/src/ui/shortcuts.test.ts` (`EXPECT` l. 7-13 ; un test neuf)

**Interfaces.**
- Consomme : T5 `DeviceSettings.palmEraser(): boolean`, `DeviceSettings.setPalmEraser(on: boolean): boolean`, `onChange`.
- Produit : `export const PALM_ERASER_LABELS = { on: "Gomme automatique à la paume : active", off: "Gomme automatique à la paume : coupée" }` ;
  `SettingsPanelProps.palmEraser?: DeviceSettings` ; `export type AppShortcut = "backgrounds" | "palm-eraser"` ;
  ligne `palm-eraser` de `SHORTCUTS`.
- Réutilise : `ui/SettingsPanel.tsx:36` — prop `palmEraser?: DeviceSettings` (bouton `data-reglage="gomme-paume"`, libellés `PALM_ERASER_LABELS`).
- Réutilise : `ui/shortcuts.ts:4` (`SHORTCUTS`), `engine/input/keys.ts:104` (`appShortcut`), `ui/toast.ts` (`showToast`) — ligne `palm-eraser` ; `appShortcut` rend `"palm-eraser"` ; avis existant.
- Le rapport porte `Réutilisation : appelé SettingsPanel (étendu), SHORTCUTS/appShortcut (étendus), showToast`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact/apps/web && nice -n 10 npx vitest run src/ui/SettingsPanel.test.tsx src/ui/App.test.tsx src/engine/input/keys.test.ts src/ui/shortcuts.test.ts src/ui/MenuBar.test.tsx --reporter=verbose 2>&1 | grep -E "OG25|Test Files|Tests |FAIL" | tail -20
```

Preuve : `Test Files  5 passed (5)`, 6 lignes « OG25 » (3 + 1 + 1 + 1), aucune ligne `FAIL ` ; `shortcuts.test.ts`
« ids uniques » (`:59`) et « chaque raccourci a son reconnaisseur » verts (effet de bord 7), `App.test.tsx:394`
(boutons du panneau) vert. Puis `tsc rc=0`.

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé (seules additions : une ligne `EXPECT`, une option de `setup`).
- G4 — Toucher le moins possible le panneau d'options (autres ouvriers dessus) : `ui/OptionsPanel.tsx` et `ui/tool-options.ts` ne sont pas touchés ; le réglage va au panneau Réglages.
- G5 — Aucun octet ajouté aux modules Wasm.
- G6 — VM partagée : `nice -n 10`.
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G10 (partie code) — netteté § 10, icônes Lucide : le bouton est un texte, aucune icône neuve.
- G11 — `npx tsc --noEmit` de `apps/web` reste à 0 erreur.

**Interdits.** Ne pas lier le bouton à la capacité d'annotation (la prop `device` reste réservée au cadre, H10 de
design-l4) ; ne prendre aucun autre raccourci que Ctrl+Maj+H (Ctrl+Maj+E est réservé par `feat/personnalisation-2b`).

**Terminé quand.** Les cinq fichiers de test passent, `tsc rc=0`, un commit avec les huit fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire les tests qui échouent.**

  a. `SettingsPanel.test.tsx` : l'import de `./SettingsPanel` gagne `PALM_ERASER_LABELS` ; le type des options de
  `setup` gagne `palmEraser?: DeviceSettings` et le JSX gagne
  `{...(over.palmEraser ? { palmEraser: over.palmEraser } : {})}` après la ligne `device` ; à la fin :

```tsx
describe("SettingsPanel : gomme automatique à la paume (OG25, déc. 26)", () => {
  it("OG25 gomme-paume : sans palmEraser, aucun bouton", () => {
    const { r } = setup();
    expect(r.container.querySelector('button[data-reglage="gomme-paume"]')).toBeNull();
  });
  it("OG25 gomme-paume : « active » ; un clic → « coupée », réglage coupé ; un autre → « active » ; sans le bouton du cadre", () => {
    const palmEraser = createDeviceSettings(null);
    const { r, btn } = setup({ palmEraser });
    expect(PALM_ERASER_LABELS).toEqual({ on: "Gomme automatique à la paume : active", off: "Gomme automatique à la paume : coupée" });
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.on);
    expect(r.container.querySelector('button[data-reglage="cadre"]')).toBeNull();
    fireEvent.click(btn("gomme-paume"));
    expect(palmEraser.palmEraser()).toBe(false);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.off);
    fireEvent.click(btn("gomme-paume"));
    expect(palmEraser.palmEraser()).toBe(true);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.on);
  });
  it("OG25 gomme-paume : un changement venu d'ailleurs (Ctrl+Maj+H) est suivi", () => {
    const palmEraser = createDeviceSettings(null);
    const { btn } = setup({ palmEraser });
    palmEraser.setPalmEraser(false);
    expect(btn("gomme-paume").textContent).toBe(PALM_ERASER_LABELS.off);
  });
});
```

  b. `keys.test.ts`, dans `describe("appShortcut (personnalisation-1b, Q28)", …)`, à la fin :

```ts
  it("OG25 : Ctrl+Maj+H et Cmd+Maj+H → palm-eraser ; hors champ, hors composition, jamais avec Alt ni sans Maj", () => {
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true }))).toBe("palm-eraser");
    expect(appShortcut(k("h", { metaKey: true, shiftKey: true }))).toBe("palm-eraser");
    expect(appShortcut(k("h", { ctrlKey: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, altKey: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, isComposing: true }))).toBeNull();
    expect(appShortcut(k("H", { ctrlKey: true, shiftKey: true, target: { tagName: "INPUT" } }))).toBeNull();
  });
```

  c. `shortcuts.test.ts` : dans `EXPECT`, après `"page-number": ["page", "sidebar-pages"],` ajouter
  `"palm-eraser": ["app", "palm-eraser"],` ; dans `describe("shortcuts", …)`, à la fin :

```ts
  it("OG25 : palm-eraser dans la table — Ctrl+Maj+H, ⌘⇧H, Control+Shift+H", () => {
    expect(shortcutText("palm-eraser", false)).toBe("Ctrl+Maj+H");
    expect(shortcutText("palm-eraser", true)).toBe("⌘⇧H");
    expect(ariaShortcut("palm-eraser", false)).toBe("Control+Shift+H");
  });
```

  d. `App.test.tsx`, après le test « personnalisation-1b (Q28) : le bouton Fonds et Ctrl+Maj+F ouvrent la fenêtre des
  fonds… » (`App.test.tsx:346`) :

```tsx
  it("OG25 : Ctrl+Maj+H coupe puis rallume la gomme automatique, avec un avis ; le bouton du panneau Réglages suit", async () => {
    const device = createDeviceSettings(null);
    const { container } = renderApp({ device });
    const chord = (): void => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "H", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    };
    chord();
    expect(device.palmEraser()).toBe(false);
    await vi.waitFor(() => expect(container.querySelector(".rb-toast")?.textContent).toBe("Gomme automatique à la paume : coupée"));
    click(container.querySelector('button[data-item="settings"]'));
    expect(container.querySelector('button[data-reglage="gomme-paume"]')?.textContent).toBe("Gomme automatique à la paume : coupée");
    chord();
    expect(device.palmEraser()).toBe(true);
    await vi.waitFor(() => expect(container.querySelector(".rb-toast")?.textContent).toBe("Gomme automatique à la paume : active"));
    expect(container.querySelector('button[data-reglage="gomme-paume"]')?.textContent).toBe("Gomme automatique à la paume : active");
  });
```

- [ ] **Étape 2 : lancer, vérifier l'échec** — attendu : `FAIL` sur les 6 tests « OG25 » (`expected null to be
  'palm-eraser'`, bouton `gomme-paume` absent, `shortcutText("palm-eraser")` null) ; les tests existants restent verts.

- [ ] **Étape 3 : implémenter.**

  a. `keys.ts` — remplacer les lignes 100-108 (type et fonction `appShortcut`, avec leur commentaire) par :

```ts
export type AppShortcut = "backgrounds" | "palm-eraser";

/** personnalisation-1b (Q28) : raccourcis de l'application, écoutés par `App.tsx` (jamais par le moteur) : Ctrl+Maj+F
 *  (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds ; OG25 (déc. 27) : Ctrl+Maj+H (Cmd+Maj+H) coupe ou
 *  rallume la gomme automatique à la paume ; hors champ de saisie, hors composition, jamais avec Alt. */
export function appShortcut(e: KeyLike): AppShortcut | null {
  if (e.isComposing || e.altKey || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return null;
  if (inEditable(e.target)) return null;
  const key = e.key.toLowerCase();
  return key === "f" ? "backgrounds" : key === "h" ? "palm-eraser" : null;
}
```

  b. `shortcuts.ts` — après `s("page-number", "Pages", "Barre latérale, onglet Pages", "Ctrl+Maj+P"),` :

```ts
  // OG25 (déc. 27) : coupe ou rallume la gomme automatique à la paume (réglage de l'appareil), avec un avis.
  s("palm-eraser", "Outils", "Gomme automatique à la paume", "Ctrl+Maj+H"),
```

  c. `SettingsPanel.tsx` — après `export const FRAME_LABELS = …;` :

```tsx

/** OG25 (déc. 26, 27) : libellés du bouton de la gomme automatique à la paume, repris par l'avis de Ctrl+Maj+H. */
export const PALM_ERASER_LABELS = Object.freeze({
  on: "Gomme automatique à la paume : active",
  off: "Gomme automatique à la paume : coupée",
});
```

  dans `SettingsPanelProps`, après `readonly device?: DeviceSettings;` :

```tsx
  /** OG25 (déc. 26) : réglage de la gomme automatique à la paume, sur toutes les plateformes ; absent : aucun bouton. */
  readonly palmEraser?: DeviceSettings;
```

  dans `SettingsPanel`, après la ligne `if (device !== undefined) onCleanup(…);` :

```tsx
  const palmDevice = props.palmEraser;
  const [palmOn, setPalmOn] = createSignal(palmDevice?.palmEraser() ?? true);
  if (palmDevice !== undefined) onCleanup(palmDevice.onChange(() => setPalmOn(palmDevice.palmEraser())));
```

  dans le JSX, après le bloc `<Show when={device}>…</Show>` du cadre :

```tsx
      <Show when={palmDevice}>
        {(dev) => (
          <button type="button" data-reglage="gomme-paume" onClick={() => void dev().setPalmEraser(!dev().palmEraser())}>
            {palmOn() ? PALM_ERASER_LABELS.on : PALM_ERASER_LABELS.off}
          </button>
        )}
      </Show>
```

  d. `App.tsx` — l'import `import { clearToast } from "./toast";` devient `import { clearToast, showToast } from "./toast";`
  (si `showToast` y est déjà importé, ne rien changer) ; l'import de `./SettingsPanel` gagne `PALM_ERASER_LABELS` ; le
  gestionnaire du raccourci (l. 423-434) devient :

```tsx
  // personnalisation-1b (Q28) : Ctrl+Maj+F (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds, hors champ de
  // saisie et hors annotation ; OG25 (déc. 27) : Ctrl+Maj+H coupe ou rallume la gomme automatique à la paume, avec un
  // avis. Écoutés ici, jamais par le moteur.
  onMount(() => {
    const onShortcut = (e: KeyboardEvent): void => {
      const key = { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, isComposing: e.isComposing, target: e.target instanceof HTMLElement ? e.target : null };
      const action = annotating() ? null : appShortcut(key);
      if (action === "palm-eraser") {
        e.preventDefault();
        const on = !optionSettings.palmEraser();
        optionSettings.setPalmEraser(on);
        showToast({ text: on ? PALM_ERASER_LABELS.on : PALM_ERASER_LABELS.off });
        return;
      }
      if (props.backgrounds === undefined || action !== "backgrounds") return;
      e.preventDefault();
      leaveEditor(() => setPanel((cur) => (cur === "backgrounds" ? null : "backgrounds")));
    };
    window.addEventListener("keydown", onShortcut);
    onCleanup(() => window.removeEventListener("keydown", onShortcut));
  });
```

  et dans `<SettingsPanel …>`, après la ligne `{...(props.device !== undefined && props.active.capabilities().desktopAnnotation ? { device: props.device } : {})}` :

```tsx
            palmEraser={optionSettings}
```

  (`optionSettings` vaut `props.device`, ou des réglages en mémoire seule quand l'hôte n'en donne pas : `App.tsx:196`.)

- [ ] **Étape 4 : relancer** — attendu : `Test Files  5 passed (5)`, 6 lignes « OG25 ».
- [ ] **Étape 5 : typage** — `tsc rc=0`.
- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add apps/web/src/ui/SettingsPanel.tsx apps/web/src/ui/SettingsPanel.test.tsx apps/web/src/ui/App.tsx apps/web/src/ui/App.test.tsx apps/web/src/engine/input/keys.ts apps/web/src/engine/input/keys.test.ts apps/web/src/ui/shortcuts.ts apps/web/src/ui/shortcuts.test.ts && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ui): palm eraser setting button and Ctrl+Shift+H toggle with toast (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Ligne `Réutilisation : appelé SettingsPanel (étendu), SHORTCUTS/appShortcut (étendus), showToast` ; signaler
l'écart (`shortcuts.test.ts` gagne une ligne `EXPECT` et un test).

---

<a id="tache-t9"></a>
### Tâche T9 — Essai navigateur S1 à S8, captures, suite complète

**Objectif.** Essai neuf `scripts/essais/gomme-paume-navigateur.mjs` qui joue les scénarios S1 à S8 du cadrage (§ 6) par
des `PointerEvent` synthétiques sur `#stage`, chacun sur une page rechargée ; captures 2x (anneau à deux tailles,
réglage) ; témoin CDP consigné ; inscription dans `verifier.sh --e2e` et dans son test ; suite complète verte, octets Wasm
inchangés.

**Fichiers.**
- Créer : `scripts/essais/gomme-paume-navigateur.mjs`
- Modifier : `scripts/verifier.sh` (bloc `--e2e`, après `node scripts/essais/gomme-trait-epais-navigateur.mjs`)
- Modifier : `scripts/tests/verifier-e2e.test.sh` (après la ligne OG20)
- Créer : `docs/essais/gomme-paume.md`
- Créer : `docs/design/captures/gomme-surface-contact/gomme-anneau-grand.png`, `gomme-anneau-petit.png`, `reglage-gomme-paume.png` (produites par l'essai)

**Interfaces.**
- Consomme : l'application construite (T1 à T8) : `#stage[data-ready="1"]`, `data-elements`, `data-tool`, `data-camera`,
  `data-selection`, `data-version` ; `.rb-eraser-ring` (`hidden`, `data-rayon`) ; `button[data-reglage="gomme-paume"]` ;
  `.rb-toast` ; `localStorage["roomboard.gomme.paume"]` ; `scripts/essais/commun.mjs` (`Echec`, `VIEWPORT`, `clickItem`,
  `frames`, `inkIn`, `item`, `loadPlaywright`, `serve`, `stageMouse`).
- Produit : la commande `node scripts/essais/gomme-paume-navigateur.mjs [--dist <build>] [--captures <dossier>]` (code 0
  réussi, 1 échec, 2 outil absent), dernière ligne `gomme paume : OK`.
- Réutilise : rien de la liste du cadrage (les modules sont appelés par l'application) ; le patron des essais
  `scripts/essais/gomme-trait-epais-navigateur.mjs`. Le rapport porte `Réutilisation : appelé commun.mjs (patron de gomme-trait-epais-navigateur.mjs)`.

**Test et commande bornée.**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && nice -n 10 node scripts/essais/gomme-paume-navigateur.mjs > ~/.cache/tmp/og25-essai.log 2>&1; echo "essai rc=$?"; grep -c "^ok — " ~/.cache/tmp/og25-essai.log; tail -12 ~/.cache/tmp/og25-essai.log
```

Preuve : `essai rc=0`, au moins 40 lignes `ok — `, dernière ligne `gomme paume : OK`, une ligne `témoin CDP :`.
Puis `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `verifier-e2e.test.sh : OK`. Puis la suite complète
(étape 9) → `verifier.sh : e2e OK` et `verifier.sh : OK`, aucune ligne `FAIL `, `test result: FAILED` ni `error[` ;
tests à garder verts qu'elle joue : `zone-s6-banc.test.ts` (empreinte S6 inchangée), `gomme-trait-epais-navigateur.mjs`,
`design-l4-navigateur.mjs` (bouton du cadre), `cli-essai.mjs` (`CLI : OK`), `shortcuts.test.ts`.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : lignes de l'essai
`S2 : anneau visible, diamètre 140 px`, `S3 : anneau des trois doigts, diamètre 84 px`, `S2 : anneau calé sur la grille
des pixels`, `S8 : bouton du panneau Réglages à « coupée »`. Puis les trois captures, à décrire dans le rapport :
`gomme-anneau-grand.png` (anneau violet de 1,5 px doublé de blanc, sans remplissage, sur le trait noir en cours de
coupe), `gomme-anneau-petit.png` (anneau des trois doigts, 84 px), `reglage-gomme-paume.png` (panneau Réglages, bouton
« Gomme automatique à la paume : coupée »). Netteté § 10 : traits fins (1,5 px à 2x = 3 pixels), aucune icône neuve
(toute icône du panneau garde `viewBox="-0.25 -0.25 24 24"`, contrôlé par l'essai).

**Contraintes (recopiées).**
- G2 — TDD : test rouge d'abord. Tests vitest de `apps/web` lancés par fichier (`cd apps/web && npx vitest run <fichier>`), suites complètes par `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`.
- G3 — Comportement inchangé hors bascule : aucun test existant réécrit sur le fond, aucun test désactivé ni sauté, aucun seuil changé.
- G5 — Aucun octet ajouté aux modules Wasm (pas de changement Rust attendu ; s'il en faut un, le dire et s'arrêter).
- G6 — VM partagée : `nice -n 10`, `cargo … -j 4` (`CARGO_BUILD_JOBS=4`).
- G7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (`git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`/`.`/`commit -a`. Pas de `--force`.
- G8 — Fichiers temporaires dans le worktree ou `~/.cache/tmp/og25-*`.
- G9 — Essai navigateur neuf avec des `PointerEvent` synthétiques qui portent `width`, `height`, `pointerType` (patron des essais de `scripts/essais/`, inscrit dans `scripts/verifier.sh --e2e` et `scripts/tests/verifier-e2e.test.sh`) couvrant : doigt fin dessine ; paume gomme à la bonne taille puis retour à l'outil d'avant ; trois doigts serrés gomment ; pincement à deux doigts zoome ; stylet large dessine ; appareil sans géométrie dessine ; annulation en une étape ; réglage coupé gardé après rechargement.
- G10 — Captures 2x dans `docs/design/captures/gomme-surface-contact/` (curseur de gomme à deux tailles, réglage) produites par l'essai navigateur ; netteté § 10 du cadrage design (traits fins, icônes Lucide).

**Interdits.** `verifier.sh --e2e` ne passe aucune option de capture (garde de `verifier-e2e.test.sh`) ; aucun essai
hors du bloc `--e2e` ; aucune écriture sur un fichier de Jérôme ; aucun build Tauri.

**Terminé quand.** L'essai rend 0 avec `gomme paume : OK`, les trois captures existent (2x), `docs/essais/gomme-paume.md`
porte le témoin relevé, `verifier-e2e.test.sh : OK`, la suite complète finit par `verifier.sh : OK`, les octets Wasm sont
ceux de la référence, un commit contient les sept fichiers.

**Étapes.**

- [ ] **Étape 1 : écrire l'essai** — `scripts/essais/gomme-paume-navigateur.mjs` :

```js
#!/usr/bin/env node
// OG25 : gomme automatique à la surface de contact (cadrage docs/plans/gomme-surface-contact-cadrage.md, § 6, S1 à S8).
// Application construite servie en local, Chromium sans tête de Playwright, `deviceScaleFactor` 2. Les gestes sont des
// `PointerEvent` synthétiques envoyés sur `#stage` (`pointerType`, `pointerId`, `width`, `height`, `clientX/Y`,
// `buttons`) ; chaque scénario part d'une page rechargée (un stylet vu fait déplacer la vue au doigt). Les paumes sont
// posées petites (`width` 30) puis grandies, comme une vraie paume qui s'étale.
// `--captures <dossier>` : captures 2x (anneau à deux tailles, réglage). Témoin consigné, pas porte : la `width` que
// Chromium donne à un toucher CDP de `radiusX` 40.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/gomme-paume-navigateur.mjs [--dist <build>] [--captures <dossier>]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Echec, VIEWPORT, clickItem, frames, inkIn, item, loadPlaywright, serve, stageMouse } from "./commun.mjs";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? undefined : argv[i + 1];
};
const dist = opt("--dist");
const captures = opt("--captures");

const PALM_KEY = "roomboard.gomme.paume";
const TOAST = ".rb-toast";
const SETTING = 'button[data-reglage="gomme-paume"]';
const ON = "Gomme automatique à la paume : active";
const OFF = "Gomme automatique à la paume : coupée";
const RED = [220, 38, 38]; // préréglage « Rouge » (#dc2626)
const TOL = 2; // px CSS : diamètre de l'anneau
const HOLE_TOL = 8; // px CSS : trou de la gomme sur l'axe d'un trait (anticrénelage, bouts arrondis)

const pw = await loadPlaywright();
if (!pw) {
  console.error("Playwright absent (cache npx)");
  process.exit(2);
}
if (captures) mkdirSync(captures, { recursive: true });
const server = await serve(dist ? { dist } : {});
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await pw.chromium.launch({ args: ["--no-sandbox", "--disable-lcd-text", "--force-color-profile=srgb"] });
let failed = false;
try {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const check = (cond, msg) => {
    if (!cond) throw new Echec(`échec — ${msg}`);
    console.log(`ok — ${msg}`);
  };
  const ready = async () => {
    await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
    await frames(page);
  };
  const fresh = async () => {
    await page.goto(url);
    await ready();
  };
  const tag = (k) => page.evaluate((key) => document.querySelector("#stage").dataset[key] ?? "", k);
  const elements = async () => Number(await tag("elements"));
  const camera = async () => {
    await frames(page);
    return tag("camera");
  };
  const zoomOf = (cam) => Number(cam.split(",")[0]);
  /** PointerEvent synthétiques sur #stage, coordonnées en px de la scène ; `wait` : ms d'attente avant l'événement. */
  const send = (list) =>
    page.evaluate(async (evs) => {
      const st = document.querySelector("#stage");
      const r = st.getBoundingClientRect();
      for (const e of evs) {
        if (e.wait) await new Promise((res) => setTimeout(res, e.wait));
        const lift = e.type === "pointerup" || e.type === "pointercancel";
        st.dispatchEvent(
          new PointerEvent(e.type, {
            bubbles: true,
            cancelable: true,
            pointerId: e.id,
            pointerType: e.pt ?? "touch",
            isPrimary: false,
            clientX: r.left + e.x,
            clientY: r.top + e.y,
            width: e.w ?? 1,
            height: e.h ?? e.w ?? 1,
            pressure: lift ? 0 : (e.p ?? 0.5),
            buttons: lift ? 0 : 1,
          }),
        );
      }
    }, list);
  const down = (id, x, y, o = {}) => ({ type: "pointerdown", id, x, y, ...o });
  const move = (id, x, y, o = {}) => ({ type: "pointermove", id, x, y, ...o });
  const up = (id, x, y, o = {}) => ({ type: "pointerup", id, x, y, ...o });
  /** Glissé de (x0, y0) à (x1, y1) par pas de 10 px ; `o` (géométrie, type) porté par chaque événement. */
  const line = (id, x0, y0, x1, y1, o = {}) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
    return Array.from({ length: n }, (_, i) => move(id, x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n, o));
  };
  /** Trois doigts `base`, `base + 1`, `base + 2` qui descendent ensemble de y0 à y1 (pas de 10 px). */
  const trio = (base, xs, y0, y1, w) => {
    const out = [];
    for (let y = y0 + 10; y <= y1; y += 10) xs.forEach((x, i) => out.push(move(base + i, x, y, { w })));
    return out;
  };
  /** Anneau visible : sa boîte en px CSS de la page, sinon null (lu après deux images : il s'écrit à l'image). */
  const ring = async () => {
    await frames(page);
    return page.evaluate(() => {
      const el = document.querySelector("#stage .rb-eraser-ring");
      if (!el || el.hidden) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
  };
  /** Trait horizontal à la souris (vrais événements, pointerId de la souris), en px de la scène. */
  const mouseLine = async (y, x0 = 450, x1 = 1000) => {
    const m = stageMouse(page);
    await m.move(x0, y);
    await m.down();
    for (let x = x0 + 10; x <= x1; x += 10) await m.move(x, y);
    await m.up();
    await frames(page);
  };
  /** Plus longue suite sans encre sur la rangée y du canvas de scène, entre x0 et x1 (px CSS). */
  const holeOn = (y, x0, x1) =>
    page.$eval(
      "#scene",
      (c, [yy, a, b]) => {
        const g = c.getContext("2d");
        const sx = c.width / c.clientWidth;
        const row = g.getImageData(Math.round(a * sx), Math.round(yy * sx), Math.round((b - a) * sx), 1).data;
        let best = 0;
        let run = 0;
        for (let i = 0; i < row.length; i += 4) {
          const ink = row[i + 3] > 128 && row[i] + row[i + 1] + row[i + 2] < 300;
          run = ink ? 0 : run + 1;
          best = Math.max(best, run);
        }
        return best / sx;
      },
      [y, x0, x1],
    );
  const redIn = (box) => inkIn(page, box, { rgb: RED, tol: 60 });
  const pressed = (id) => page.getAttribute(item(id), "aria-pressed");
  const around = (r, m = 40) => ({ x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m });
  const shot = async (name, clip) => {
    if (!captures) return;
    const path = join(captures, name);
    await page.screenshot({ path, clip, animations: "disabled", caret: "hide", scale: "device" });
    console.log(`capture : ${path}`);
  };
  const toastSays = (text) =>
    page.waitForFunction(([sel, t]) => (document.querySelector(sel)?.textContent ?? "").includes(t), [TOAST, text], { timeout: 5000 }).then(
      () => true,
      () => false,
    );
  const stored = () => page.evaluate((k) => localStorage.getItem(k), PALM_KEY);

  // S1 — doigt fin dessine.
  await fresh();
  await send([down(1, 450, 300, { w: 20 }), ...line(1, 450, 300, 600, 300, { w: 20 })]);
  check((await ring()) === null, "S1 : doigt fin (20 × 20), aucun anneau");
  await send([...line(1, 600, 300, 750, 300, { w: 20 }), up(1, 750, 300)]);
  await frames(page);
  check((await elements()) === 1, "S1 : un trait de plus au document");
  check((await pressed("pen")) === "true", "S1 : outil Stylo toujours enfoncé");

  // S2 — paume : gomme à la bonne taille, puis l'outil d'avant (Stylo, couleur et épaisseur choisies).
  await fresh();
  await mouseLine(400);
  await page.click('button[data-preset="rouge"]');
  await send([down(11, 450, 640, { w: 20 }), ...line(11, 450, 640, 750, 640, { w: 20 }), up(11, 750, 640)]);
  await frames(page);
  const ref = await redIn([600, 625, 601, 655]);
  check(ref > 0, `S2 : trait au doigt de référence, rouge (${ref} px)`);
  await send([
    down(12, 700, 260, { w: 30 }),
    { ...move(12, 700, 265, { w: 140, h: 120 }), wait: 40 },
    ...line(12, 700, 265, 700, 390, { w: 140, h: 120 }),
  ]);
  const big = await ring();
  check(big !== null && Math.abs(big.width - 140) <= TOL && Math.abs(big.height - 140) <= TOL, `S2 : anneau visible, diamètre ${big?.width} px (140 ± ${TOL})`);
  check(Number.isInteger(big.x * 2) && Number.isInteger(big.y * 2) && Number.isInteger(big.width * 2), `S2 : anneau calé sur la grille des pixels (${big.x}, ${big.y})`);
  await shot("gomme-anneau-grand.png", around(big));
  await send([...line(12, 700, 390, 700, 520, { w: 140, h: 120 }), up(12, 700, 520)]);
  await frames(page);
  check((await ring()) === null, "S2 : anneau retiré au lever");
  check((await elements()) === 3, `S2 : trait coupé en deux, aucun trait neuf (${await elements()} éléments : 2 morceaux et le trait rouge)`);
  const hole = await holeOn(400, 480, 970);
  check(Math.abs(hole - 140) <= HOLE_TOL, `S2 : trou de ${hole} px sur l'axe du trait (140 ± ${HOLE_TOL})`);
  check((await pressed("pen")) === "true" && (await tag("tool")) === "pen", "S2 : bouton Stylo toujours enfoncé");
  await send([down(13, 450, 700, { w: 20 }), ...line(13, 450, 700, 750, 700, { w: 20 }), up(13, 750, 700)]);
  await frames(page);
  const after = await redIn([600, 685, 601, 715]);
  check(after > 0 && Math.abs(after - ref) <= 2, `S2 : trait au doigt après la paume, même couleur et même épaisseur (${after} px, avant ${ref})`);

  // S2, variante Rectangle.
  await fresh();
  await mouseLine(400);
  await clickItem(page, "rect");
  await send([
    down(14, 700, 260, { w: 30 }),
    { ...move(14, 700, 265, { w: 140, h: 120 }), wait: 40 },
    ...line(14, 700, 265, 700, 520, { w: 140, h: 120 }),
    up(14, 700, 520),
  ]);
  await frames(page);
  check((await elements()) === 2, "S2 Rectangle : trait coupé, aucun rectangle neuf");
  check((await pressed("rect")) === "true" && (await tag("tool")) === "rect", "S2 Rectangle : bouton Rectangle toujours enfoncé");

  // S2, variante Sélection (déc. 33) : la paume garde le comportement d'aujourd'hui.
  await fresh();
  await mouseLine(400);
  await clickItem(page, "select");
  await stageMouse(page).click(700, 400);
  await frames(page);
  check((await tag("selection")) === "1", "S2 Sélection : le trait est sélectionné");
  const v0 = await tag("version");
  await send([
    down(15, 700, 600, { w: 30 }),
    { ...move(15, 700, 605, { w: 140, h: 120 }), wait: 40 },
    ...line(15, 700, 605, 760, 605, { w: 140, h: 120 }),
  ]);
  check((await ring()) === null, "S2 Sélection : aucun anneau");
  await send([up(15, 760, 605)]);
  await frames(page);
  check((await elements()) === 1 && (await tag("version")) === v0, "S2 Sélection : aucun trait coupé, rien n'est écrit");
  check((await tag("selection")) === "0", "S2 Sélection : appui dans le vide, sélection vidée comme aujourd'hui");

  // S3 — trois doigts serrés gomment ; contre-épreuve à 400 px d'écart.
  await fresh();
  await mouseLine(400);
  const cam3 = await camera();
  await send([
    down(31, 670, 250, { w: 24 }),
    { ...down(32, 700, 250, { w: 24 }), wait: 40 },
    { ...down(33, 730, 250, { w: 24 }), wait: 40 },
    ...trio(31, [670, 700, 730], 250, 380, 24),
  ]);
  const small = await ring();
  check(small !== null && Math.abs(small.width - 84) <= TOL, `S3 : anneau des trois doigts, diamètre ${small?.width} px (84 ± ${TOL})`);
  await shot("gomme-anneau-petit.png", around(small));
  await send([...trio(31, [670, 700, 730], 380, 560, 24), up(31, 670, 560), up(32, 700, 560), up(33, 730, 560)]);
  await frames(page);
  check((await elements()) === 2, "S3 : trait coupé, aucun trait neuf");
  check((await camera()) === cam3, "S3 : vue inchangée");
  await fresh();
  await mouseLine(400);
  await send([
    down(31, 300, 250, { w: 24 }),
    { ...down(32, 700, 250, { w: 24 }), wait: 40 },
    { ...down(33, 1100, 250, { w: 24 }), wait: 40 },
    ...trio(31, [300, 700, 1100], 250, 380, 24),
  ]);
  check((await ring()) === null, "S3 contre-épreuve : doigts à 400 px d'écart, aucun anneau");
  await send([...trio(31, [300, 700, 1100], 380, 560, 24), up(31, 300, 560), up(32, 700, 560), up(33, 1100, 560)]);
  await frames(page);
  check((await elements()) === 1, "S3 contre-épreuve : aucun trait coupé");

  // S4 — pincement à deux doigts zoome, deux doigts ensemble défilent ; paume pendant un pincement établi : ignorée.
  await fresh();
  await mouseLine(400);
  const z0 = zoomOf(await camera());
  const spread = [];
  for (let k = 1; k <= 10; k++) spread.push(move(41, 650 - 10 * k, 300, { w: 24 }), move(42, 750 + 10 * k, 300, { w: 24 }));
  await send([down(41, 650, 300, { w: 24 }), { ...down(42, 750, 300, { w: 24 }), wait: 20 }, ...spread]);
  check((await ring()) === null, "S4 : pincement, aucun anneau");
  await send([up(41, 550, 300), up(42, 850, 300)]);
  const z1 = zoomOf(await camera());
  check(z1 > z0 * 1.5, `S4 : le zoom change (${z0} → ${z1})`);
  check((await elements()) === 1, "S4 : aucun trait coupé, aucun trait neuf");
  const c0 = await camera();
  const glide = [];
  for (let k = 1; k <= 10; k++) glide.push(move(43, 650, 600 + 10 * k, { w: 24 }), move(44, 750, 600 + 10 * k, { w: 24 }));
  await send([down(43, 650, 600, { w: 24 }), { ...down(44, 750, 600, { w: 24 }), wait: 20 }, ...glide, up(43, 650, 700), up(44, 750, 700)]);
  const c1 = await camera();
  check(c1 !== c0 && zoomOf(c1) === zoomOf(c0), `S4 : deux doigts qui glissent ensemble, la vue défile (${c0} → ${c1})`);
  check((await elements()) === 1, "S4 : défilement, aucun trait neuf");
  await fresh();
  await mouseLine(400);
  const hold = [];
  for (let k = 1; k <= 8; k++) hold.push({ ...move(46, 700 + 2 * k, 650, { w: 24 }), wait: 50 });
  await send([down(45, 600, 650, { w: 24 }), { ...down(46, 700, 650, { w: 24 }), wait: 20 }, ...hold]);
  const before = await camera();
  await send([down(47, 700, 400, { w: 140, h: 140 }), ...line(47, 700, 400, 700, 450, { w: 140, h: 140 })]);
  check((await ring()) === null, "S4 variante : paume posée pendant un pincement tenu depuis 400 ms, aucun anneau");
  await send([move(46, 740, 650, { w: 24 }), move(46, 760, 650, { w: 24 })]);
  const later = await camera();
  check(later !== before, `S4 variante : le pincement continue (${before} → ${later})`);
  await send([up(47, 700, 450), up(45, 600, 650), up(46, 760, 650)]);
  await frames(page);
  check((await elements()) === 1, "S4 variante : aucun trait coupé");

  // S5 — stylet large dessine.
  await fresh();
  const pen = { pt: "pen", w: 150, h: 150, p: 0.5 };
  await send([down(51, 450, 300, pen), ...line(51, 450, 300, 600, 300, pen)]);
  check((await ring()) === null, "S5 : stylet de 150 × 150, aucun anneau");
  await send([...line(51, 600, 300, 750, 300, pen), up(51, 750, 300, { pt: "pen" })]);
  await frames(page);
  check((await elements()) === 1, "S5 : stylet large, un trait neuf");

  // S6 — appareil sans géométrie dessine (1 × 1, puis 0 × 0) ; trois doigts serrés à 1 × 1 ne gomment pas.
  await fresh();
  await send([down(61, 450, 300, { w: 1 }), ...line(61, 450, 300, 600, 300, { w: 1 })]);
  check((await ring()) === null, "S6 : toucher à 1 × 1 (défaut W3C), aucun anneau");
  await send([...line(61, 600, 300, 750, 300, { w: 1 }), up(61, 750, 300)]);
  await send([down(62, 450, 360, { w: 0 }), ...line(62, 450, 360, 750, 360, { w: 0 }), up(62, 750, 360)]);
  await frames(page);
  check((await elements()) === 2, "S6 : 1 × 1 puis 0 × 0 (Windows), deux traits neufs");
  await send([
    down(63, 670, 250, { w: 1 }),
    { ...down(64, 700, 250, { w: 1 }), wait: 40 },
    { ...down(65, 730, 250, { w: 1 }), wait: 40 },
    ...trio(63, [670, 700, 730], 250, 330, 1),
  ]);
  check((await ring()) === null, "S6 : trois doigts serrés à 1 × 1, aucun anneau");
  await send([...trio(63, [670, 700, 730], 330, 420, 1), up(63, 670, 420), up(64, 700, 420), up(65, 730, 420)]);
  await frames(page);
  check((await elements()) === 2, "S6 : trois doigts sans géométrie, aucun trait coupé");

  // S7 — annulation en une étape.
  await fresh();
  await mouseLine(400);
  await mouseLine(470);
  check((await elements()) === 2, "S7 : deux traits de départ");
  const trace = [];
  for (let k = 1; k <= 6; k++) trace.push({ ...move(71, 700, 250 + 5 * k, { w: 30 }), wait: 10 });
  await send([
    down(71, 700, 250, { w: 30 }),
    ...trace,
    move(71, 700, 285, { w: 140, h: 140 }),
    ...line(71, 700, 285, 700, 560, { w: 140, h: 140 }),
    up(71, 700, 560),
  ]);
  await frames(page);
  check((await elements()) === 4, `S7 : les deux traits coupés, aucun trait neuf (${await elements()} éléments)`);
  await page.keyboard.press("Control+z");
  await frames(page);
  check((await elements()) === 2, "S7 : un seul Ctrl+Z rend les deux traits entiers");
  await page.keyboard.press("Control+z");
  await frames(page);
  check((await elements()) === 1, "S7 : un second Ctrl+Z défait le trait d'avant l'essai");

  // S8 — réglage coupé et gardé.
  await fresh();
  await page.keyboard.press("Control+Shift+KeyH");
  check(await toastSays(OFF), `S8 : Ctrl+Maj+H, avis « ${OFF} »`);
  check((await stored()) === "non", "S8 : réglage gardé sur l'appareil (« non »)");
  await clickItem(page, "settings");
  await page.waitForSelector(SETTING, { timeout: 15000 });
  check(((await page.textContent(SETTING)) ?? "").trim() === OFF, "S8 : bouton du panneau Réglages à « coupée »");
  const icons = await page.$$eval("#reglages svg", (l) => l.map((s) => s.getAttribute("viewBox")));
  check(icons.every((v) => v === "-0.25 -0.25 24 24"), `S8 : netteté § 10, icônes du panneau calées (${icons.length})`);
  const panel = await page.locator("#reglages").boundingBox();
  await shot("reglage-gomme-paume.png", around(panel, 8));
  await clickItem(page, "settings");
  await mouseLine(400);
  await send([down(81, 700, 260, { w: 140, h: 120 }), ...line(81, 700, 260, 700, 390, { w: 140, h: 120 })]);
  check((await ring()) === null, "S8 : réglage coupé, aucun anneau");
  await send([...line(81, 700, 390, 700, 520, { w: 140, h: 120 }), up(81, 700, 520)]);
  await frames(page);
  check((await elements()) === 2, "S8 : la paume dessine un trait comme aujourd'hui, rien n'est coupé");
  await page.reload();
  await ready();
  check((await stored()) === "non", "S8 : après rechargement, réglage toujours coupé");
  await clickItem(page, "settings");
  await page.waitForSelector(SETTING, { timeout: 15000 });
  check(((await page.textContent(SETTING)) ?? "").trim() === OFF, "S8 : après rechargement, bouton toujours à « coupée »");
  await clickItem(page, "settings");
  await page.keyboard.press("Control+Shift+KeyH");
  check(await toastSays(ON), `S8 : Ctrl+Maj+H la rallume, avis « ${ON} »`);
  check((await stored()) === null, "S8 : clé retirée de l'appareil");

  // Témoin (consigné, pas une porte) : ce que Chromium remonte comme `width` pour un toucher CDP de rayon 40.
  await fresh();
  await page.evaluate(() => {
    window.__og25 = [];
    document.querySelector("#stage").addEventListener("pointerdown", (e) => window.__og25.push([e.pointerType, e.width, e.height]), true);
  });
  const box = await page.locator("#stage").boundingBox();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 700, y: box.y + 650, radiusX: 40, radiusY: 40 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const seen = await page.evaluate(() => window.__og25);
  console.log(`témoin CDP : radiusX 40 → ${JSON.stringify(seen)} (width 40 : rayon ; 80 : diamètre)`);

  check(errors.length === 0, `aucune erreur de page${errors.length ? ` : ${errors.join(" | ")}` : ""}`);
  console.log("gomme paume : OK");
} catch (e) {
  failed = true;
  console.error(e instanceof Echec ? e.message : e);
} finally {
  await browser.close();
  server.close();
}
process.exitCode = failed ? 1 : 0;
```

- [ ] **Étape 2 : rouge d'abord, sur l'ancien build** — avant de reconstruire, `apps/web/dist` est celui d'avant T1 :
  lancer la commande de la section. Attendu : `essai rc=1`, première ligne d'échec `échec — S2 : anneau visible…`
  (S1 passe). Si `dist` a déjà été reconstruit avec le code neuf, le dire dans le rapport et passer à l'étape 3.

- [ ] **Étape 3 : construire l'application**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && nice -n 10 pnpm --filter @roomboard/web build > ~/.cache/tmp/og25-build.log 2>&1; echo "build rc=$?"; tail -8 ~/.cache/tmp/og25-build.log
```

  Attendu : `build rc=0`, ligne `✓ built in`.

- [ ] **Étape 4 : vert** — relancer la commande de la section. Attendu : `essai rc=0`, ≥ 40 lignes `ok — `,
  `gomme paume : OK`. Si un contrôle échoue, corriger le code de la tâche qui le possède (T1 à T8) en le disant, jamais
  relâcher une tolérance de l'essai sans le dire.

- [ ] **Étape 5 : captures**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && nice -n 10 node scripts/essais/gomme-paume-navigateur.mjs --captures docs/design/captures/gomme-surface-contact 2>&1 | grep -E "capture :|anneau|bouton|OK" | tail -12 && file docs/design/captures/gomme-surface-contact/*.png
```

  Attendu : trois lignes `capture :` ; `file` montre trois PNG dont la largeur est le double de la boîte (2x). Regarder
  les trois images et les décrire dans le rapport (Preuve visuelle ci-dessus).

- [ ] **Étape 6 : consigner le témoin** — `docs/essais/gomme-paume.md`, avec les valeurs lues dans la ligne
  `témoin CDP :` de l'étape 4 (remplacer `<W>`, `<H>`, `<date>`, `<sha>` ; garder une seule des deux lectures) :

```markdown
# Essai OG25 — gomme automatique à la surface de contact

Essai : `node scripts/essais/gomme-paume-navigateur.mjs` (joué par `scripts/verifier.sh --e2e`), Chromium de Playwright
sur la VM, `deviceScaleFactor` 2, `PointerEvent` synthétiques sur `#stage` ; scénarios S1 à S8 du cadrage
(`docs/plans/gomme-surface-contact-cadrage.md`, § 6). Captures : `docs/design/captures/gomme-surface-contact/`.

## Témoin CDP (consigné, pas une porte)

Relevé le <date> sur <sha> : `Input.dispatchTouchEvent` avec `radiusX` 40 et `radiusY` 40 donne un `pointerdown` de
`width` <W> et `height` <H>.

Lecture : W = 40, Chromium rend le rayon, donc la moitié du contact ; l'erreur va vers l'oubli (déc. 7). / W = 80,
Chromium rend le diamètre.

## Hors VM

Calibrage du seuil de 80 px (H2) et rejet de paume du pilote Windows (H15) : sur l'écran interactif, avec Jérôme.
```

- [ ] **Étape 7 : inscrire l'essai** — `scripts/verifier.sh`, dans le bloc `if [ "$E2E" = 1 ]`, juste après
  `  node scripts/essais/gomme-trait-epais-navigateur.mjs` :

```bash
  node scripts/essais/gomme-paume-navigateur.mjs
  echo "gomme paume : OK"
```

  `scripts/tests/verifier-e2e.test.sh`, après la ligne OG20 (`grep -q "scripts/essais/gomme-trait-epais-navigateur.mjs" …`) :

```bash
# OG25 gomme automatique à la paume : ligne à part, comme OG20.
grep -q "scripts/essais/gomme-paume-navigateur.mjs" scripts/verifier.sh || ko "gomme-paume-navigateur absent de verifier.sh"
```

- [ ] **Étape 8 : test de l'inscription**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3
```

  Attendu : `verifier-e2e.test.sh : OK`.

- [ ] **Étape 9 : suite complète** (longue : en fond, sous jeton)

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && node ~/.claude/scripts/vm/suite-vm.cjs -- env CARGO_BUILD_JOBS=4 nice -n 10 bash scripts/verifier.sh --e2e > ~/.cache/tmp/og25-verifier.log 2>&1; echo "verifier rc=$?"; grep -E "FAIL |test result: FAILED|error\[" ~/.cache/tmp/og25-verifier.log | head -5; grep -E "Tests .*passed|CLI : OK|gomme paume : OK|e2e OK|verifier.sh : OK" ~/.cache/tmp/og25-verifier.log | tail -8
```

  Attendu : `verifier rc=0`, aucune ligne d'échec, `gomme paume : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK`.

- [ ] **Étape 10 : octets Wasm** (G5)

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && stat -c '%n %s' apps/web/src/wasm/roomboard_wasm_bg.wasm apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm && git diff --stat origin/main -- crates | tail -1
```

  Attendu : `1429754` et `2794527` octets (référence de l'état, `53a14b6e`), aucune ligne de diff sous `crates/`.

- [ ] **Étape 11 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/gomme-surface-contact && git add scripts/essais/gomme-paume-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/gomme-paume.md docs/design/captures/gomme-surface-contact/gomme-anneau-grand.png docs/design/captures/gomme-surface-contact/gomme-anneau-petit.png docs/design/captures/gomme-surface-contact/reglage-gomme-paume.png && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(e2e): browser trial for the contact-area auto eraser, S1 to S8, with 2x captures (OG25)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Nombre de lignes `ok — `, ligne du témoin CDP, description des trois captures, sortie des étapes 8 à 10,
ligne `Réutilisation : appelé commun.mjs (patron de gomme-trait-epais-navigateur.mjs)`.

---

## Relecture du plan (faite)

- **Couverture du cadrage.** Décisions 1-3 (T1, T2), 4 (non construit, interdit en T4), 5-15 et 32-35 (T4), 16 (T4 :
  aucun `setTool`), 17-19 (T1, T3, T4), 20 (T3 : mode lu par la gomme au `begin`), 21-22 (T3, T4, S7), 23 (T3, T4), 24
  (T5, T6), 25 (T5, T6), 26 (T8), 27 (T8), 28-29 (rien à faire ; T9 rejoue CLI et `zone-s6-banc`), 30 (T7), 31 (T9).
  Scénarios S1 à S8 : T9, et chacun a au moins une tâche de code dans la table. Effets de bord 1-11 : T4 (1, 2, 3, 4, 8,
  9, 10), T2 (5), T8 (6, 7), T7 (11).
- **Carte d'impact.** Toutes les entrées « touché » sont dans une colonne « fichiers touchés » ; écarts listés plus haut
  (`annotation-fake.ts`, `annotation-tauri.ts`, `shortcuts.test.ts`).
- **Noms d'une tâche à l'autre.** `contactGeometry`, `isLargeContact`, `isTightCluster`, `joinsCluster`, `eraserCircle`,
  `DETECT_MS` (T1 → T2, T4) ; `GestureEvent.contact` (T2 → T4) ; `resize?(pointerId, radiusPx)` (T3 → T4) ;
  `gesturesToTools()` (T3 → T4, T6) ; `RouterOptions.autoEraser`, `RouterDeps.ring`, `EraserRingView` (T4 → T6) ;
  `createEraserRing`, `palmEraser()`, `setPalmEraser()`, `PALM_ERASER_KEY` (T5 → T6, T7, T8) ;
  `SessionShared.palmEraser` (T6 → T7) ; `PALM_ERASER_LABELS` (T8) ; `data-reglage="gomme-paume"`, `.rb-eraser-ring`,
  `data-rayon` (T5, T8 → T9).
- **Review Focus.** Cinq entrées, chacune avec son test nommé dans la tâche qui possède le code.
