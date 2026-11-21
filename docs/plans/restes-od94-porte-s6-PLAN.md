# restes-od94-porte-s6 — plan d'exécution (porte S6 du pot sur zones fermées, avec marge)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Banc S6 du vrai module et mesure « avant » (témoin natif, banc, empreinte d'afc2d8b) | — | `apps/web/src/engine/zone-s6-banc.test.ts` (neuf), `docs/essais/c8-porte-s6.md` (neuf) | partagé (série, worktree du chantier) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 \| grep -E "S6 \|Tests \|FAIL" \| tail -20` : `Tests  2 passed (2)`, lignes `S6 banc (a)`, `(b)`, `(c)`, `boucles`, `S6 empreinte : anneaux=` présentes | S1, S2 | #tache-t1 |
| T2 | Accesseur `elementIdsOfKind` : cœur, pont Wasm, deux liaisons, contrat | T1 | `crates/roomboard-core/src/document.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `docs/essais/taille-wasm.md` | partagé (série) | concepteur-critique | `nice -n 10 cargo test -p roomboard-core --lib element_ids_of_kind 2>&1 \| grep -E "^test \|test result" \| tail -5` : `document::tests::element_ids_of_kind_reads_raw_kind_in_page_order ... ok` ; `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 \| grep -E "OE23\|Tests " \| tail -12` : ≥ 4 tests `OE23`, 0 échec ; module ≤ 1 572 864 o | S1, S4 | #tache-t2 |
| T3 | `tableCounts` et recompte des `fill` par l'accesseur ; mesure après le gain | T2 | `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/zone-marks.ts`, `apps/web/src/app/zone-marks.test.ts`, `apps/web/src/app/board-session.test.ts`, `docs/essais/c8-porte-s6.md` | partagé (série) | implementeur-tdd | `nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/zone-marks.test.ts src/app/board-session.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 \| grep -E "OE23\|RF4\|tableMerges\|Tests \|FAIL" \| tail -20` : ≥ 3 tests `OE23`, tests `RF4` verts, 0 échec ; banc rejoué, ligne `S6 banc (b)` relevée | S1, S3 | #tache-t3 |
| T4 | Gain côté cœur, **conditionnel** : seulement si S1 n'est pas tenue après T3 | T3 | `crates/roomboard-core/src/zone.rs`, `docs/essais/c8-porte-s6.md`, `docs/essais/taille-wasm.md` | partagé (série) | concepteur-critique | `nice -n 10 cargo test -p roomboard-core --features zone --lib zone:: 2>&1 \| grep -E "test result\|FAILED" \| tail -3` : `test result: ok`, ≥ 1 test ; ligne `S6 empreinte :` du banc identique à celle d'afc2d8b | S1 | #tache-t4 |
| T5 | Non-régression C8 sur S6 dans le banc (vrai module) | T3, T4 (ou T4 sans objet) | `apps/web/src/engine/zone-s6-banc.test.ts`, `docs/essais/c8-porte-s6.md` | partagé (série) | implementeur-tdd | `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 \| grep -E "S2 :\|Tests \|FAIL" \| tail -12` : 3 tests `S2 :`, `Tests  5 passed (5)` | S2 | #tache-t5 |

Vagues : une tâche par vague, en série dans le worktree du chantier (une seule place VM) : **V1** T1 · **V2** T2 · **V3** T3 ·
**V4** T4 (ou « sans objet », voir sa section) · **V5** T5. La clôture (5 passages C8, `verifier.sh --e2e`) revient à
l'orchestrateur, hors de ce plan.

**Goal :** le pire cas S6 de C8 passe sa porte de 50 ms avec une marge réelle (médiane ≤ 35 ms à chacun des 5 passages, aucun
clic > 50 ms), en retirant d'abord le travail qui n'est pas le calcul de zone : la relecture O(N²) de chaque élément par
`tableCounts` dans la fenêtre du clic.

**Architecture :** mesurer d'abord dans le vrai module (banc vitest, témoin natif, empreinte du `fill` sur afc2d8b). Puis
étendre le cœur d'un accesseur `element_ids_of_kind(page, kind)` (même passe qu'`element_ids`, filtre sur le `kind` brut),
relayé par le pont et les deux liaisons ; `tableCounts` et le recompte des `fill` ne lisent plus que la vue des candidats,
chacun confirmé par `element(id)`. Un gain dans `closed_zone` n'arrive que si la porte n'est pas tenue ensuite. Pour finir,
le banc porte la non-régression du comportement C8.

**Tech Stack :** Rust (yrs, `i_overlay` 9.2.0 déjà présent), wasm-bindgen, TypeScript, Vitest (Node 22), Playwright (essai C8, lancé tel quel).

**Spec :** `docs/plans/restes-od94-porte-s6-cadrage.md`

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `apps/web/src/engine/zone-s6-banc.test.ts` (neuf) | banc S6 du vrai module (fixture de l'essai, durées sur la console, empreinte) ; puis non-régression S2 | T1, T5 |
| `docs/essais/c8-porte-s6.md` (neuf) | mesures : passages, témoin natif, banc (colonne « hors fenêtre »), empreinte, « où vont les ms » | T1, T3, T4, T5 |
| `crates/roomboard-core/src/document.rs` | `element_ids_of_kind` à côté d'`element_ids` (`:314`) et son test | T2 |
| `crates/roomboard-wasm/src/lib.rs` | `element_ids_of_kind` exporté à côté d'`element_ids` (`:1153`) | T2 |
| `apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts` | `CoreDocument.elementIdsOfKind`, relais, parité de la fausse liaison | T2 |
| `apps/web/src/core/wasm-core.contract.test.ts` | contrat `elementIdsOfKind` sur les deux liaisons | T2 |
| `docs/essais/taille-wasm.md` | ligne de taille du module principal | T2, T4 |
| `apps/web/src/engine/engine.ts` (`tableCounts`, `:281-295`) et `engine.test.ts` | comptes des tableaux par l'accesseur | T3 |
| `apps/web/src/app/zone-marks.ts` (`ZoneDoc`, recompte `:62`) et `zone-marks.test.ts` | recompte des `fill` par l'accesseur ; fenêtre `:42-58` inchangée | T3 |
| `apps/web/src/app/board-session.test.ts` (`watchDoc`, `:1213`) | espionne aussi `elementIds` et `elementIdsOfKind` (RF4) | T3 |
| `crates/roomboard-core/src/zone.rs` (`closed_zone`, `:733-789`) | gain mesuré, signature inchangée (conditionnel) | T4 |

## Global Constraints

- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC2 — Ce qui ne change pas (Q1) : `GATE_MS` 50, fixture S6 (triangle à main levée 2000 × 2000, 300 traits courts), `MIN_CELLS` 4 000 000, 3 clics annulés entre deux, médiane `ms[1]` après tri, tolérance 2 px, clic hors du triangle ≤ 50 ms. `scripts/essais/c8-pot-zones-navigateur.mjs` n'est pas modifié.
- GC3 — Fenêtre de mesure (Q2) : `performance.measure("pot-zone")` autour de `run` (`apps/web/src/app/zone-marks.ts:42-58`) inchangée. Un gain compte seulement si le travail disparaît ou coûte moins ; un travail sorti de la fenêtre reste fait avant l'image qui montre le `fill`, et sa durée est mesurée et écrite à côté de la porte (colonne « hors fenêtre »).
- GC4 — Témoin, pas porte (Q6, C8 Q18) : aucune assertion de durée, dans aucun test.
- GC5 — Tailles (Q10, S4) : module principal ≤ 1 572 864 o ; `formats` sans ajout (≤ 3 100 845 o, plafond 3 145 728 o) ; plafonds de `scripts/verifier.sh` inchangés.
- GC6 — Licences : aucune crate ni paquet npm nouveau ; aucune dépendance AGPL, GPL ni LGPL.
- GC7 — Cœur (Q8, C8 Q20) : signatures publiques de `closed_zone(walls, x, y, tol) -> Zone` et de `zone_walls` inchangées ; un seul masque `u8` d'au plus 2²² cellules ; aucune crate nouvelle.
- GC8 — Repli (Q9) : plafond 2²¹ exclu ; Worker de DA-Z5 hors périmètre. Si les gains directs ne suffisent pas, la tâche s'arrête et l'écrit dans son rapport, mesures à l'appui ; l'orchestrateur relance un cadrage.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android. Module Wasm de `apps/web/src/wasm` reconstruit comme `scripts/verifier.sh` : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release`, puis `wasm-bindgen --target web --remove-name-section`.
- GC10 — Essai C8 : jamais 5 passages ni `scripts/verifier.sh --e2e` dans une tâche (l'orchestrateur les rejoue à la clôture) ; un passage unique après un gain, lancé sans `nice` (Q4 : même commande avant et après), `cat /proc/loadavg` avant et après.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier, jamais `-A`, `--all`, `.` ni `commit -a` ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre (§ 7) : `tableAt` (`table-geom.ts:168`), `fragments.ts:85`, `pageViews` de `select.ts:99` ; un index par id dans `find_element` ; les constats `zone.rs:127` et `document.rs:423` ; `docs/audits/` (écrit par un autre agent) ; `docs/sessions/restes-od94-porte-s6-etat.md` (tenu par l'orchestrateur).
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC14 — Trois couches testables seules : `crates/` sans dépendance au navigateur.

## Review Focus

- RF1 — Tableau mal formé (`kind` brut `table`, vue `unknown`) : il ne compte ni fusion ni ombrage et ne lève rien (effet de bord « `data-table-merges` et `data-table-shades` : mêmes valeurs », H4) → T3, test `OE23 (H4) : un candidat « table » dont la vue n'est pas un tableau…`.
- RF2 — `fill` mal formé, vu `unknown` : non compté dans `data-zones` (effet de bord « `data-zones` : même compte », H4) → T3, test `OE23 (H4) : un fill mal formé…`.
- RF3 — Page inconnue : `elementIdsOfKind` rend `[]` sur les deux liaisons, sans lever (alors que `elementIds` de la fausse liaison lève) (§ 3, interface « Page inconnue : `[]` ») → T2, test `OE23 : ids d'un kind dans l'ordre de la page…`.
- RF4 — Document libéré : `elementIdsOfKind` est un accès de plus, jamais appelé après `dispose` (effet de bord « accès au document après sa libération », RF4 de C6b) → T3, `watchDoc` étendu.
- RF5 — `kind` brut contre vue : un élément de kind inconnu (`hologram`) est listé sous son kind brut, jamais sous `unknown` ; un élément sans `id` n'apparaît pas (K8, `query.rs:161`) → T2, test `OE23 (H4, K8)` du contrat et test Rust `element_ids_of_kind_reads_raw_kind_in_page_order`.

---

### Tâche T1 — Banc S6 du vrai module et mesure « avant »

<a id="tache-t1"></a>

**Objectif :** chronométrer S6 dans le vrai module avant tout gain (Q5, Q6) et relever l'empreinte du `fill` sur le code
d'afc2d8b (Q10, H3). Le banc sépare `fill_zone` seul, `engine.run` (commande et état du moteur), la fenêtre et le hors-fenêtre
de `zone-marks`, et, dans la boucle `element(id)`, le parcours de `find_element` du coût de la vue (H7). Tout s'écrit dans
`docs/essais/c8-porte-s6.md`, section « avant ».

**Fichiers :**
- Créer : `apps/web/src/engine/zone-s6-banc.test.ts`, `docs/essais/c8-porte-s6.md`
- Lu seulement : `apps/web/src/engine/render/grid-cache.test.ts:10-28` (patron), `scripts/essais/c8-pot-zones-navigateur.mjs:17-73`, `apps/web/src/app/board-session.ts:200`, `:331`, `:658`, `docs/sessions/restes-od94-porte-s6-etat.md` (mesure avant)

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Produit (lu par T3, T4, T5, dans le même fichier) : `need(): CoreFactory` ; `buildS6(core: CoreFactory): { readonly d: CoreDocument; readonly p: string }` ; `zoneAt(p: string, at: readonly [number, number], color: string | null): Command` ; `interface Fingerprint { readonly rings: number; readonly length: number; readonly sha256: string; readonly bounds: readonly number[] }` ; `fingerprint(d: CoreDocument, id: string): Promise<Fingerprint>` ; constantes `FIXED`, `INSIDE`, `OUTSIDE`, `YELLOW`, `BLUE`, `TOL`, `MIN_CELLS` ; lignes de console `S6 banc (a) apply :`, `S6 banc (b) engine.run :`, `S6 banc (c) fenêtre :`, `S6 banc zoneCells :`, `S6 banc boucles`, `S6 empreinte :`.
- Réutilise : `apps/web/src/app/zone-marks.ts:28-58` — `createZoneMarks(doc, now, measure, onMarked).timed(run)` et `tags(page, version)`, inchangé.
- Réutilise : `apps/web/src/engine/engine.ts:234` — `createEngine({ doc, renderer, frames, tools })`, montage de `engine.test.ts:134`.
- Réutilise : `apps/web/src/engine/render/grid-cache.test.ts:13-27` — patron `present`, `required`, `loadWasm()` (code de test).
- Réutilise : `crates/roomboard-core/src/zone.rs:164` (`lap`), `:1518` (`s6_worst_case_timing_witness`) — `cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture`.
- Rapport : une ligne `Réutilisation : appelé <module>` par ligne « Réutilise » ci-dessus, ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée :**
```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && cat /proc/loadavg && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 | grep -E "S6 |Tests |FAIL" | tail -20 && cat /proc/loadavg
```
Preuve qu'il a tourné : `Tests  2 passed (2)`, aucune ligne `FAIL`, les six lignes `S6 banc (a)`, `S6 banc (b)`, `S6 banc (c)`, `S6 banc zoneCells`, `S6 banc boucles`, `S6 empreinte : anneaux=` présentes.

**Preuve visuelle :** aucune (aucune interface changée).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC2 — Ce qui ne change pas (Q1) : `GATE_MS` 50, fixture S6 (triangle à main levée 2000 × 2000, 300 traits courts), `MIN_CELLS` 4 000 000, 3 clics annulés entre deux, médiane `ms[1]` après tri, tolérance 2 px, clic hors du triangle ≤ 50 ms. `scripts/essais/c8-pot-zones-navigateur.mjs` n'est pas modifié.
- GC4 — Témoin, pas porte (Q6, C8 Q18) : aucune assertion de durée, dans aucun test.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android. Module Wasm de `apps/web/src/wasm` reconstruit comme `scripts/verifier.sh` : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release`, puis `wasm-bindgen --target web --remove-name-section`.
- GC10 — Essai C8 : jamais 5 passages ni `scripts/verifier.sh --e2e` dans une tâche ; un passage unique après un gain, lancé sans `nice`, `cat /proc/loadavg` avant et après.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier, jamais `-A`, `--all`, `.` ni `commit -a` ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre : `docs/audits/` et `docs/sessions/restes-od94-porte-s6-etat.md` ne sont pas touchés.
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** modifier du code de production (T1 ne fait que mesurer) ; asserter une durée ; relancer les 5 passages C8 (ils sont dans l'état, on les recopie).

**Terminé quand :** le banc passe sous `ROOMBOARD_WASM_REQUIRED=1`, `docs/essais/c8-porte-s6.md` porte la section « avant » remplie (passages, témoin natif, banc, empreinte, où vont les ms, verdict H7), un commit.

**Étapes :**

- [ ] **Étape 1 : vérifier que le code est celui d'afc2d8b, puis reconstruire le module comme `verifier.sh`**

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && git diff --stat afc2d8b -- crates apps scripts | tail -3
```
Attendu : aucune ligne (seuls des documents ont changé depuis afc2d8b). Sinon : s'arrêter et le dire dans le rapport (l'empreinte doit venir d'afc2d8b).

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
```
Attendu : `Finished`, puis `1368840 apps/web/src/wasm/roomboard_wasm_bg.wasm` (taille de la référence ; un écart est noté dans le document).

- [ ] **Étape 2 : écrire le banc, sans le module d'abord (rouge sous `ROOMBOARD_WASM_REQUIRED=1`)**

Créer `apps/web/src/engine/zone-s6-banc.test.ts` :

```ts
// Banc S6 du pot sur zones fermées (OE23, cadrage restes-od94-porte-s6 Q6) : vrai module Wasm chargé en Node par
// `initSync` (patron `render/grid-cache.test.ts`) ; sous `ROOMBOARD_WASM_REQUIRED=1`, un `.wasm` absent fait échouer ce
// fichier au lieu de le sauter. Témoin, pas porte : les durées vont sur la console, aucune n'est assertée (C8 Q18).
import { describe, expect, it } from "vitest";
import type { Command, CoreDocument, CoreFactory } from "../core/api";
import { createWasmCore } from "../core/wasm-core";
import { createZoneMarks } from "../app/zone-marks";
import type { FrameLoopDeps } from "../proto/frame-loop";
import { createEngine, type ToolFactories } from "./engine";
import type { Renderer } from "./render/renderer";
import { NO_LIVE, type GestureTool } from "./tools/tool";

interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm/roomboard_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
type WasmJs = typeof import("../wasm/roomboard_wasm");
async function loadWasm(): Promise<CoreFactory> {
  const href = new URL("../wasm/roomboard_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as WasmJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return createWasmCore(mod);
}
const wasmCore: CoreFactory | null = present ? await loadWasm() : null;
const need = (): CoreFactory => {
  if (wasmCore === null) throw new Error("module wasm absent");
  return wasmCore;
};

it("le module wasm est présent quand il est exigé (banc S6 sur le vrai cœur)", () => {
  if (env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

/** Constantes de l'essai C8 (`scripts/essais/c8-pot-zones-navigateur.mjs:17`, `:32-40`), recopiées sans changement (Q1). */
const FIXED = "2026-11-21T08:00:00.000Z";
const INSIDE: readonly [number, number] = [100, 100];
const OUTSIDE: readonly [number, number] = [900, 400];
const YELLOW = "#facc15";
const BLUE = "#1d4ed8";
const TOL = 2;
const MIN_CELLS = 4_000_000;
const PEN = { color: "#000000", width: 4 };

/** Fixture S6 de l'essai (`c8-pot-zones-navigateur.mjs:43-73`), enregistrée puis rouverte comme l'essai ouvre son fichier. */
function buildS6(core: CoreFactory): { readonly d: CoreDocument; readonly p: string } {
  const b = core.blank();
  const page = b.pageIds()[0] ?? "";
  const side = (x0: number, y0: number, x1: number, y1: number): void => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(len / 10);
    const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wob = 3 * Math.sin(t * Math.PI * 7) * Math.sin(t * Math.PI); // main levée, nulle aux sommets
      pts.push(x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob, 0.5);
    }
    b.apply({ type: "CommitStroke", page, points: new Float32Array(pts), style: PEN });
  };
  side(-700, -700, 1300, -700);
  side(1300, -700, -700, 1300);
  side(-700, 1300, -700, -700);
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 15; j++) {
      const [x, y] = [-600 + 40 * i, -600 + 40 * j];
      b.apply({ type: "CommitStroke", page, points: new Float32Array([x, y, 0.5, x + 15, y, 0.5]), style: PEN });
    }
  }
  const d = core.load(b.save(FIXED, "essai-c8"));
  b.free();
  return { d, p: d.pageIds()[0] ?? "" };
}

const zoneAt = (p: string, [x, y]: readonly [number, number], color: string | null): Command => ({
  type: "Fill",
  page: p,
  target: { kind: "zone", x, y, tol: TOL },
  color,
});

const ms = (f: () => void): number => {
  const t0 = performance.now();
  f();
  return performance.now() - t0;
};
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[1] ?? Number.NaN;
const show = (xs: readonly number[]): string =>
  `médiane ${median(xs).toFixed(1)} ms (ordre : ${xs.map((x) => x.toFixed(1)).join(", ")})`;

/** Empreinte d'un `fill` (Q10, H3) : nombre d'anneaux, longueur et SHA-256 des octets de `fillRings(id)`, boîte. */
interface Fingerprint { readonly rings: number; readonly length: number; readonly sha256: string; readonly bounds: readonly number[] }
async function fingerprint(d: CoreDocument, id: string): Promise<Fingerprint> {
  const rings = d.fillRings(id);
  if (rings === null) throw new Error(`pas de fill : ${id}`);
  let count = 0;
  for (let i = 0; i < rings.length; i += 1 + 2 * (rings[i] ?? 0)) count++;
  const bytes = Uint8Array.from(new Uint8Array(rings.buffer, rings.byteOffset, rings.byteLength));
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = [...hash].map((x) => x.toString(16).padStart(2, "0")).join("");
  const b = d.bounds([id]);
  if (b === null) throw new Error(`pas de boîte : ${id}`);
  return { rings: count, length: rings.length, sha256, bounds: [b.x0, b.y0, b.x1, b.y1] };
}

/** Moteur sans rendu ni image (`requestFrame` ne rappelle jamais) : `engine.run` = commande + état du moteur (`emit`). */
const NO_RENDERER: Renderer = { drawScene() {}, drawLive() {}, resize() {}, invalidate() {}, setGridPreview() {}, setImagePreview() {} };
const NO_FRAMES: FrameLoopDeps = { requestFrame: () => 0, cancelFrame: () => undefined, now: () => performance.now() };
const inert = (): GestureTool => ({ begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false });
const TOOLS: ToolFactories = { pen: inert, eraser: inert };

describe.skipIf(wasmCore === null)("banc S6 (OE23, Q6) : vrai module, témoin sans porte", () => {
  it("S6 banc : apply seul, engine.run, fenêtre et hors fenêtre de zone-marks, boucles du pont, empreinte", async () => {
    const { d, p } = buildS6(need());
    const ids = d.elementIds(p);
    expect(ids).toHaveLength(303);
    // (a) Commande seule ; le premier clic est le premier calcul de zone du module (mémoire à froid, Q3, Q8).
    const a: number[] = [];
    let print: Fingerprint | null = null;
    for (let k = 0; k < 3; k++) {
      let id = "";
      a.push(ms(() => {
        id = d.apply(zoneAt(p, INSIDE, YELLOW)).ids[0] ?? "";
      }));
      expect(id).not.toBe("");
      if (print === null) print = await fingerprint(d, id);
      d.undo();
    }
    if (print === null) throw new Error("aucune empreinte");
    const cells = d.zoneCells(p, TOL);
    const zc = ms(() => {
      d.zoneCells(p, TOL);
    });
    expect(cells).toBeGreaterThanOrEqual(MIN_CELLS);
    // (b) engine.run : commande, puis état du moteur (tableCounts) dans emit, comme dans la session.
    const engine = createEngine({ doc: d, renderer: NO_RENDERER, frames: NO_FRAMES, tools: TOOLS });
    const b: number[] = [];
    for (let k = 0; k < 3; k++) {
      b.push(ms(() => {
        engine.run(zoneAt(p, INSIDE, YELLOW));
      }));
      expect(d.elementIds(p)).toHaveLength(304);
      engine.undo();
    }
    // (c) zone-marks branché comme la session (`board-session.ts:200`, `:331`, `:658`) : fenêtre `pot-zone`, puis hors
    // fenêtre (cellules et recompte des fill rappelé par onMarked), mesurés à part (Q2).
    let win = 0;
    const marks = createZoneMarks(
      d,
      () => performance.now(),
      (s, e) => {
        win = e - s;
      },
      () => {
        const s = engine.state();
        marks.tags(s.page, s.version);
      },
    );
    const off = engine.onState((s) => {
      marks.tags(s.page, s.version);
    });
    const timed = marks.timed((c) => engine.run(c));
    const inside: number[] = [];
    const outside: number[] = [];
    for (let k = 0; k < 3; k++) {
      const total = ms(() => {
        timed(zoneAt(p, INSIDE, YELLOW));
      });
      inside.push(win);
      outside.push(total - win);
      expect(marks.tags(p, d.version()).zones).toBe("1");
      engine.undo();
    }
    off();
    // H7 : dans la boucle `element(id)` de tableCounts, parcours de find_element (fillRings d'un trait : find_element puis
    // refus au kind) contre vue (to_js, lecture des champs).
    const loops = { ids: [] as number[], views: [] as number[], finds: [] as number[] };
    for (let k = 0; k < 3; k++) {
      loops.ids.push(ms(() => {
        d.elementIds(p);
      }));
      loops.views.push(ms(() => {
        for (const id of ids) d.element(id);
      }));
      loops.finds.push(ms(() => {
        for (const id of ids) d.fillRings(id);
      }));
    }
    console.info(`S6 banc (a) apply : ${show(a)}`);
    console.info(`S6 banc (b) engine.run : ${show(b)}`);
    console.info(`S6 banc (c) fenêtre : ${show(inside)} ; hors fenêtre : ${show(outside)}`);
    console.info(`S6 banc zoneCells : ${zc.toFixed(1)} ms (${cells} cellules)`);
    console.info(
      `S6 banc boucles (${ids.length} éléments) : elementIds ${show(loops.ids)} ; element(id) ${show(loops.views)} ; ` +
        `fillRings(id), parcours seul ${show(loops.finds)} ; vue ≈ ${(median(loops.views) - median(loops.finds)).toFixed(1)} ms`,
    );
    console.info(
      `S6 empreinte : anneaux=${print.rings} longueur=${print.length} sha256=${print.sha256} boîte=${print.bounds.join(",")}`,
    );
    engine.dispose();
    d.free();
  }, 120_000);
});
```

- [ ] **Étape 3 : voir le banc rouge sans module, puis vert avec**

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && mv apps/web/src/wasm /tmp/oe23-wasm-t1 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts 2>&1 | grep -E "Tests |FAIL|présent" | tail -5; mv /tmp/oe23-wasm-t1 apps/web/src/wasm
```
Attendu : `FAIL` sur `le module wasm est présent quand il est exigé` (`Tests  1 failed`), puis le module remis en place.

Puis la commande bornée de la section : `Tests  2 passed (2)` et les six lignes `S6 `.

- [ ] **Étape 4 : témoin natif release**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && cat /proc/loadavg && nice -n 10 cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture 2>&1 | grep -E " ms|S6 natif|test result" | tail -14 && cat /proc/loadavg
```
Attendu : neuf lignes de phase (`lecture des murs` à `écriture du fill`), une ligne `S6 natif : médiane …`, `test result: ok. 1 passed`.

- [ ] **Étape 5 : écrire `docs/essais/c8-porte-s6.md`, section « avant »**

Créer le fichier avec ce gabarit ; chaque `‹…›` reçoit la valeur relevée aux étapes 1, 3 et 4 (rien d'estimé : une valeur
non relevée s'écrit « non relevé ») ; les 5 passages sont recopiés tels quels de `docs/sessions/restes-od94-porte-s6-etat.md`
(§ « Mesure avant »).

```markdown
# Porte S6 du pot sur zones fermées : mesures (OE23)

Chantier `restes-od94-porte-s6`, cadrage `docs/plans/restes-od94-porte-s6-cadrage.md` (Q2 à Q6, Q10). Seuil 50 ms, fixture
et essai C8 inchangés (Q1). Témoins, pas portes : aucune de ces durées n'est assertée par un test.

Commandes : banc `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose` ;
témoin natif `nice -n 10 cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture` ;
essai `node scripts/essais/c8-pot-zones-navigateur.mjs`, `cat /proc/loadavg` avant et après. VM de 8 cœurs, état réel (Q4).

## Passages de l'essai C8

| moment | tête | passage | charge 1/5/15 min | S6 trois clics triés | médiane | fond |
|---|---|---|---|---|---|---|
| avant | afc2d8b | 1 | 3.90 4.42 3.73 | 38, 40, 50 | 40 | 22 |
| avant | afc2d8b | 2 | 3.67 4.36 3.71 | 38, 40, 51 | 40 | 23 |
| avant | afc2d8b | 3 | 3.45 4.31 3.70 | 38, 40, 50 | 40 | 22 |
| avant | afc2d8b | 4 | 3.26 4.25 3.68 | 37, 39, 50 | 39 | 22 |
| avant | afc2d8b | 5 | 3.16 4.21 3.68 | 37, 40, 50 | 40 | 21 |

## Témoin natif release (`s6_worst_case_timing_witness`, clic médian)

| moment | charge | médiane (3 valeurs) | lecture des murs | contours f64 | rastérisation et dilatation | diffusion | piles | murs à soustraire | i_overlay | choix | écriture |
|---|---|---|---|---|---|---|---|---|---|---|---|
| avant | ‹charge› | ‹médiane› (‹v1›, ‹v2›, ‹v3›) | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› |

## Banc du vrai module (vitest, Node 22, V8)

| moment | charge | (a) apply, médiane (ordre) | (b) engine.run, médiane | (c) fenêtre, médiane | (c) hors fenêtre, médiane | zoneCells | elementIds | boucle element(id) | boucle fillRings(id) (parcours) | vue ≈ |
|---|---|---|---|---|---|---|---|---|---|---|
| avant | ‹charge› | ‹a› (‹ordre›) | ‹b› | ‹c fenêtre› | ‹c hors› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› |

## Empreinte du fill S6 (afc2d8b, avant tout gain)

Ligne du banc, recopiée telle quelle :

    ‹S6 empreinte : anneaux=… longueur=… sha256=… boîte=…›

## Où vont les ms (avant)

| part | ms | source |
|---|---|---|
| calcul de zone (`fill_zone`, clic médian) | ‹a› | banc (a) |
| état du moteur dans la fenêtre (`tableCounts`, O(N²)) | ‹b − a› | banc (b) − (a) |
| hors fenêtre (cellules, recompte des `fill`) | ‹c hors› | banc (c) |
| premier clic à froid | ‹premier de (a)› | banc (a), ordre |

H7 : ‹« parcours domine » si fillRings(id) ≥ la moitié de element(id), sinon « vue domine »›, valeurs ci-dessus.
```

- [ ] **Étape 6 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && git add apps/web/src/engine/zone-s6-banc.test.ts && git add docs/essais/c8-porte-s6.md && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(c8): S6 bench on the real wasm module, before measurements and fill fingerprint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : les six lignes `S6 ` du banc, la ligne `S6 natif`, le verdict H7, les lignes `Réutilisation :`.

---

### Tâche T2 — Accesseur `elementIdsOfKind` : cœur, pont Wasm, deux liaisons, contrat

<a id="tache-t2"></a>

**Objectif :** donner au cœur, au pont et aux deux liaisons les ids d'une page filtrés par le champ `kind` **brut**, en une
passe, sans lire de vue (Q7). Contrat : dans l'ordre de la page, les ids qu'`elementIds(page)` rendrait et dont le `kind`
brut vaut `kind` ; page inconnue : `[]` ; un élément mal formé y figure (H4) ; un élément sans `id` lisible n'y figure pas (K8).

**Fichiers :**
- Modifier : `crates/roomboard-core/src/document.rs` (après `element_ids`, `:314-326` ; test dans `mod tests`, `:749`, à côté de `element_without_id_has_no_geometry`, `:1086`), `crates/roomboard-wasm/src/lib.rs` (après `element_ids`, `:1153-1155`), `apps/web/src/core/api.ts` (`CoreDocument`, après `elementIds`, `:331`), `apps/web/src/core/wasm-core.ts` (`:496`), `apps/web/src/core/fake-core.ts` (`:671`, plus une fonction de module), `apps/web/src/core/wasm-core.contract.test.ts` (fin de fichier), `docs/essais/taille-wasm.md` (fin de fichier)

**Interfaces :**
- Consomme : rien d'une autre tâche (T1 n'est qu'une mesure).
- Produit (lu par T3, T5) :
  - cœur : `pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String>` (`impl Document`, `document.rs`)
  - pont : `pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String>` (`#[wasm_bindgen] impl Document`)
  - TS : `CoreDocument.elementIdsOfKind(page: string, kind: string): readonly string[]`
- Réutilise : `crates/roomboard-core/src/document.rs:314` (`element_ids`) — même passe (`page_elements`, `Out::YMap`, `out_string(e.get(&txn, "id"))`), même filtre ; étendu à côté.
- Réutilise : `crates/roomboard-core/src/document.rs:1019` (`push_raw`, tests) — `push_raw(&d, vec![("id", In::from("…")), ("kind", In::from("…"))])`.
- Réutilise : `crates/roomboard-core/tests/fixtures/element-inconnu.roomboard` et `apps/web/src/core/fixtures/element-inconnu.fake.json` — page `p1`, éléments `h1`, `h2` de kind `hologram`.
- Réutilise : `scripts/verifier.sh:51-60` — plafonds 1 572 864 o (principal) et 3 145 728 o (`formats`), lus sans modification ; la taille est relevée ici sur la sortie de `wasm-bindgen`, `verifier.sh` la contrôle à la clôture.
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`, une ligne par « Réutilise ».

**Patron à ne pas reprendre (concepteur-critique) :**
- Filtrer sur la **vue** (`element(id)?.kind === kind`) : c'est la boucle O(N²) mesurée (`apps/web/src/engine/engine.ts:286-290`) ; l'accesseur ne lit jamais de vue.
- Recopier `elementIds` de la fausse liaison (`apps/web/src/core/fake-core.ts:671`, par `pageOf`, `:595-599`) : il **lève** sur une page inconnue ; `elementIdsOfKind` rend `[]`, comme le cœur (`page_elements` → `None`).
- Dériver le kind de la fausse liaison de sa vue : un élément `unknown` (`sourceKind`) ou `malformed` garde son kind **brut** (`hologram`, `table`, `fill`, `image`) ; jamais `"unknown"`.
- Rendre un tableau parallèle (ids + kinds) à aligner : un seul tableau d'ids.
- Chemin de référence : `crates/roomboard-core/src/document.rs:314-326`, `:328-335` (`element`, lecture du `kind` brut), `apps/web/src/core/fake-core.ts:1311-1325` (`element`, ordre des champs), `:1731-1815` (`loadElement`, replis `unknown` et `malformed`).

**Test et commande bornée :**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 cargo test -p roomboard-core --lib element_ids_of_kind 2>&1 | grep -E "^test |test result" | tail -5
```
Preuve : `test document::tests::element_ids_of_kind_reads_raw_kind_in_page_order ... ok`, `test result: ok. 1 passed`.

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "OE23|Tests " | tail -12
```
Preuve : ≥ 4 lignes `OE23` (2 du `describe.each`, 1 fixture des deux liaisons, 1 fausse liaison), `Tests  N passed (N)`, 0 `failed`. Les blocs « contrat C8 » (`:3570-3620`) restent verts (tests à garder verts).

**Preuve visuelle :** aucune.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC5 — Tailles (Q10, S4) : module principal ≤ 1 572 864 o ; `formats` sans ajout (≤ 3 100 845 o, plafond 3 145 728 o) ; plafonds de `scripts/verifier.sh` inchangés.
- GC6 — Licences : aucune crate ni paquet npm nouveau ; aucune dépendance AGPL, GPL ni LGPL.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android. Module Wasm de `apps/web/src/wasm` reconstruit comme `scripts/verifier.sh` : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release`, puis `wasm-bindgen --target web --remove-name-section`.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier, jamais `-A`, `--all`, `.` ni `commit -a` ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre : `tableAt` (`table-geom.ts:168`), `fragments.ts:85`, `pageViews` de `select.ts:99` ne prennent pas l'accesseur ici ; aucun index par id dans `find_element` ; `docs/audits/` et le fichier d'état non touchés.
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC14 — Trois couches testables seules : `crates/` sans dépendance au navigateur.

**Interdits :** toucher `engine.ts` ou `zone-marks.ts` (T3) ; changer `element_ids` ou `elementIds` ; ajouter un champ à `ElementView`.

**Terminé quand :** test Rust et 4 tests `OE23` verts, `cargo fmt --all --check` et `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` propres, `tsc --noEmit` propre, ligne de taille écrite, un commit.

**Étapes :**

- [ ] **Étape 1 : test Rust rouge**

Dans `crates/roomboard-core/src/document.rs`, `mod tests`, juste après `element_without_id_has_no_geometry` :

```rust
    /// OE23 (Q7, H4, K8) : ids filtrés par le `kind` brut, dans l'ordre de la page ; un tableau mal formé y figure, un
    /// élément sans `id` lisible non ; page inconnue : vide.
    #[test]
    fn element_ids_of_kind_reads_raw_kind_in_page_order() {
        let d = Document::blank();
        push_raw(&d, vec![("id", In::from("s1")), ("kind", In::from("stroke"))]);
        push_raw(&d, vec![("id", In::from("t1")), ("kind", In::from("table"))]);
        push_raw(&d, vec![("kind", In::from("table"))]);
        push_raw(&d, vec![("id", In::from("h1")), ("kind", In::from("hologram"))]);
        push_raw(&d, vec![("id", In::from("t2")), ("kind", In::from("table"))]);
        let p = d.page_ids()[0].clone();
        assert_eq!(d.element_ids(&p), vec!["s1", "t1", "h1", "t2"]);
        assert_eq!(d.element_ids_of_kind(&p, "table"), vec!["t1", "t2"]);
        assert_eq!(d.element_ids_of_kind(&p, "stroke"), vec!["s1"]);
        assert_eq!(d.element_ids_of_kind(&p, "hologram"), vec!["h1"]);
        assert!(d.element_ids_of_kind(&p, "unknown").is_empty());
        assert!(d.element_ids_of_kind(&p, "fill").is_empty());
        assert!(d.element_ids_of_kind("page-inconnue", "table").is_empty());
    }
```

Lancer la première commande bornée. Attendu : `error[E0599]: no method named `element_ids_of_kind``.

- [ ] **Étape 2 : cœur**

Dans `crates/roomboard-core/src/document.rs`, juste après `pub fn element_ids` :

```rust
    /// Ids des éléments de `page` dont le champ `kind` brut vaut `kind`, dans l'ordre de la page, sans lire de vue
    /// (OE23, Q7) : les ids qu'`element_ids` rendrait (un élément sans `id` lisible n'y figure pas, K8). Un élément mal
    /// formé y figure : l'appelant confirme chaque candidat par `element(id)` (H4). Page inconnue : vide.
    pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String> {
        let txn = self.doc.transact();
        match self.page_elements(&txn, page) {
            Some(els) => els
                .iter(&txn)
                .filter_map(|o| match o {
                    Out::YMap(e) if out_string(e.get(&txn, "kind")).as_deref() == Some(kind) => {
                        out_string(e.get(&txn, "id"))
                    }
                    _ => None,
                })
                .collect(),
            None => Vec::new(),
        }
    }
```

Relancer : `test document::tests::element_ids_of_kind_reads_raw_kind_in_page_order ... ok`.

- [ ] **Étape 3 : pont Wasm**

Dans `crates/roomboard-wasm/src/lib.rs`, juste après `pub fn element_ids` (`:1153`) :

```rust
    /// OE23 (Q7) : ids de `page` dont le `kind` brut vaut `kind`, dans l'ordre de la page ; page inconnue : vide.
    pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String> {
        self.core.element_ids_of_kind(page, kind)
    }
```

Puis reconstruire le module :

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm && grep -c "element_ids_of_kind" apps/web/src/wasm/roomboard_wasm.d.ts
```
Attendu : `Finished`, une taille ≤ 1 572 864 (de l'ordre de 1 369 000), un compte ≥ 1.

- [ ] **Étape 4 : tests de contrat rouges**

À la fin de `apps/web/src/core/wasm-core.contract.test.ts` :

```ts
// OE23 (Q7) : ids d'une page filtrés par le champ `kind` brut, dans l'ordre de la page, sans vue ; page inconnue : [].
describe.each(factories)("contrat elementIdsOfKind : $name", ({ f }) => {
  it("OE23 : ids d'un kind dans l'ordre de la page ; kind absent et page inconnue : [] ; rien d'écrit", () => {
    const d = f.blank();
    const p = first(d);
    const s1 = commit(d, p, 100);
    const t1 = d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const s2 = commit(d, p, 400);
    unchanged(d, () => {
      expect(d.elementIdsOfKind(p, "stroke")).toEqual([s1, s2]);
      expect(d.elementIdsOfKind(p, "table")).toEqual([t1]);
      expect(d.elementIdsOfKind(p, "fill")).toEqual([]);
      expect(d.elementIdsOfKind("page-inconnue", "stroke")).toEqual([]);
    });
    d.free();
  });

  it("OE23 : même liste qu'elementIds filtrée par la vue, pour chaque kind connu de la page", () => {
    const d = f.blank();
    const p = first(d);
    commit(d, p, 100);
    d.apply({ type: "AddTable", page: p, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 });
    commit(d, p, 400);
    for (const kind of ["stroke", "table"]) {
      expect(d.elementIdsOfKind(p, kind)).toEqual(d.elementIds(p).filter((id) => d.element(id)?.kind === kind));
    }
    d.free();
  });
});

describe.skipIf(loaded === null)("contrat elementIdsOfKind : kind brut, vrai module et fausse liaison", () => {
  const bytesOf = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));
  it("OE23 (H4, K8) : un élément de kind inconnu est listé sous son kind brut, jamais sous « unknown »", () => {
    const real = need().core.load(bytesOf("../../../../crates/roomboard-core/tests/fixtures/element-inconnu.roomboard"));
    const fake = fakeCore.load(bytesOf("./fixtures/element-inconnu.fake.json"));
    for (const d of [real, fake]) {
      expect(d.elementIdsOfKind("p1", "hologram")).toEqual(["h1", "h2"]);
      expect(d.elementIdsOfKind("p1", "unknown")).toEqual([]);
      expect(d.element("h1")?.kind).toBe("unknown");
    }
    real.free();
    fake.free();
  });
});

// Un tableau ou un `fill` mal formé ne se fabrique, côté page, que par la fausse liaison (JSON) ; côté cœur, le test Rust
// `element_ids_of_kind_reads_raw_kind_in_page_order` couvre le tableau mal formé et l'élément sans id.
describe("contrat elementIdsOfKind : tableau et fill mal formés (fausse liaison)", () => {
  const doc = (elements: unknown[]): Uint8Array =>
    new TextEncoder().encode(
      JSON.stringify({ now, appVersion: "1.0.0", assets: {}, pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements }] }),
    );
  it("OE23 (H4) : un tableau ou un fill mal formé figure sous son kind brut ; sa vue est unknown", () => {
    const d = fakeCore.load(
      doc([
        { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table: { cols: "x" } },
        { id: "f1", kind: "fill", transform: [1, 0, 0, 1, 0, 0], fill: { color: 3 } },
      ]),
    );
    expect(d.elementIdsOfKind("p1", "table")).toEqual(["t1"]);
    expect(d.elementIdsOfKind("p1", "fill")).toEqual(["f1"]);
    expect(d.element("t1")?.kind).toBe("unknown");
    expect(d.element("f1")?.kind).toBe("unknown");
    d.free();
  });
});
```

Lancer la seconde commande bornée. Attendu : les tests `OE23` échouent sur `d.elementIdsOfKind is not a function`.

- [ ] **Étape 5 : `CoreDocument`, relais, fausse liaison**

`apps/web/src/core/api.ts`, dans `CoreDocument`, juste après `elementIds(page: string): string[];` :

```ts
  /** OE23 (Q7) : ids de `page` dont le champ `kind` brut vaut `kind`, dans l'ordre de la page, sans lire de vue ; page
   *  inconnue : []. Un élément mal formé y figure (vue `unknown`) : confirmer chaque candidat par `element(id)`. */
  elementIdsOfKind(page: string, kind: string): readonly string[];
```

`apps/web/src/core/wasm-core.ts`, juste après `elementIds(page: string): string[] { … }` :

```ts
  elementIdsOfKind(page: string, kind: string): readonly string[] { return this.d.element_ids_of_kind(page, kind); }
```

`apps/web/src/core/fake-core.ts`, fonction de module juste avant `class FakeDocument implements CoreDocument` (`:585`) :

```ts
/** Champ `kind` brut d'un élément (OE23, H4) : celui du fichier, même quand la vue est `unknown` ou absente (`malformed`) ;
 *  ordre des champs d'`element()`. */
function rawKind(e: FakeElement): string {
  if (e.unknown) return e.unknown.sourceKind;
  if (e.malformed) return typeof e.malformed["kind"] === "string" ? e.malformed["kind"] : "";
  if (e.image) return "image";
  if (e.media) return "media";
  if (e.model3d) return "model3d";
  if (e.fill) return "fill";
  if (e.table) return "table";
  if (e.shape) return "shape";
  if (e.text) return "text";
  return "stroke";
}
```

et la méthode, juste après `elementIds(page: string): string[] { … }` (`:671`) :

```ts
  elementIdsOfKind(page: string, kind: string): readonly string[] {
    const p = this.state.pages.find((q) => q.id === page);
    return p === undefined ? [] : p.elements.filter((e) => typeof e.id === "string" && rawKind(e) === kind).map((e) => e.id);
  }
```

Relancer la seconde commande bornée : ≥ 4 `OE23` verts, 0 échec. Puis :

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5 && nice -n 10 cargo fmt --all --check 2>&1 | tail -3 && nice -n 10 cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)|Finished" | tail -5
```
Attendu : aucune sortie de `tsc`, aucune de `fmt` (sinon `cargo fmt --all`, puis relancer), `Finished` sans `warning`/`error`.

- [ ] **Étape 6 : ligne de taille**

À la fin de `docs/essais/taille-wasm.md` :

```markdown
| OE23 T2 (`element_ids_of_kind`, sortie de `wasm-bindgen --remove-name-section`) | ‹octets de l'étape 3› o | 3 100 845 o (crate non touché) |

OE23 T2 : principal ‹écart signé› o depuis 1 368 840 o (final C4). Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).
```

- [ ] **Étape 7 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && git add crates/roomboard-core/src/document.rs && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/api.ts && git add apps/web/src/core/wasm-core.ts && git add apps/web/src/core/fake-core.ts && git add apps/web/src/core/wasm-core.contract.test.ts && git add docs/essais/taille-wasm.md && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): element ids of a page filtered by raw kind, without views

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : sorties des deux commandes bornées, taille du module, lignes `Réutilisation :`.

---

### Tâche T3 — `tableCounts` et recompte des `fill` par l'accesseur ; mesure après le gain

<a id="tache-t3"></a>

**Objectif :** retirer de la fenêtre du clic la relecture de chaque élément par `tableCounts` (Q7, ≈ 19,8 ms mesurés), et du
fil principal le même recompte des `fill` hors fenêtre (`zone-marks.ts:62`), sans changer les comptes : chaque candidat est
confirmé par `element(id)` (H4). Puis mesurer : banc et un passage de l'essai, écrits dans `docs/essais/c8-porte-s6.md`.

**Fichiers :**
- Modifier : `apps/web/src/engine/engine.ts:281-295`, `apps/web/src/engine/engine.test.ts` (`describe("moteur — C10b (F29, F14)")`, `:1027-1057`), `apps/web/src/app/zone-marks.ts:8-13`, `:17-21`, `:62`, `apps/web/src/app/zone-marks.test.ts:9-23` et un cas neuf, `apps/web/src/app/board-session.test.ts:1213-1219`, `:1232`, `:1257`, `docs/essais/c8-porte-s6.md`
- Tests à garder verts : `engine.test.ts` (`tableMerges, tableShades`, `:1042`), `zone-marks.test.ts:27-92`, `board-session.test.ts` (RF4), `apps/web/src/app/stage-tags.test.ts:84` ; à la clôture, `scripts/essais/c10b-tableau-navigateur.mjs:112-133` (`data-table-merges`, `data-table-shades`, S3), rejoué par l'orchestrateur.

**Interfaces :**
- Consomme (T2) : `CoreDocument.elementIdsOfKind(page: string, kind: string): readonly string[]`.
- Consomme (T1) : banc `apps/web/src/engine/zone-s6-banc.test.ts`, lignes `S6 banc (a)`, `(b)`, `(c)`, `boucles`.
- Produit : `ZoneDoc` devient `{ elementIdsOfKind(page: string, kind: string): readonly string[]; element(id: string): { readonly kind: string } | null; zoneCells(page: string, tol: number): number }` (`elementIds` en sort : plus lu) ; `createZoneMarks` inchangé ; `tableCounts` inchangé en signature.
- Réutilise : `apps/web/src/engine/engine.ts:281` (`tableCounts`) et `apps/web/src/app/zone-marks.ts:62` — étendus : `elementIdsOfKind(page, "table")` et `elementIdsOfKind(page, "fill")`, puis `element(id)` pour confirmer chaque candidat.
- Réutilise : `apps/web/src/app/zone-marks.ts:28-58` — fenêtre `timed(run)` inchangée.
- Réutilise : `scripts/essais/c8-pot-zones-navigateur.mjs:227-267` — `node scripts/essais/c8-pot-zones-navigateur.mjs`, lignes « S6 : médiane … » et « S6 : fond en … », inchangé.
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`, une ligne par « Réutilise ».

**Test et commande bornée :**
```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/zone-marks.test.ts src/app/board-session.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 | grep -E "OE23|RF4|tableMerges|Tests |FAIL" | tail -20
```
Preuve : 3 lignes `OE23` (deux du moteur, une de `zone-marks`), les lignes `RF4 (session)` et `tableMerges, tableShades : comptés…` en vert, `Tests  N passed (N)`, aucune `FAIL`.

**Preuve visuelle :** aucune (mêmes marques `#stage`, mêmes valeurs).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC2 — Ce qui ne change pas (Q1) : `GATE_MS` 50, fixture S6, `MIN_CELLS` 4 000 000, 3 clics annulés entre deux, médiane `ms[1]` après tri, tolérance 2 px, clic hors du triangle ≤ 50 ms. `scripts/essais/c8-pot-zones-navigateur.mjs` n'est pas modifié.
- GC3 — Fenêtre de mesure (Q2) : `performance.measure("pot-zone")` autour de `run` (`apps/web/src/app/zone-marks.ts:42-58`) inchangée. Un gain compte seulement si le travail disparaît ou coûte moins ; un travail sorti de la fenêtre reste fait avant l'image qui montre le `fill`, et sa durée est mesurée et écrite à côté de la porte (colonne « hors fenêtre »).
- GC4 — Témoin, pas porte : aucune assertion de durée, dans aucun test.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android.
- GC10 — Essai C8 : jamais 5 passages ni `scripts/verifier.sh --e2e` dans une tâche ; un passage unique après un gain, lancé sans `nice` (Q4 : même commande avant et après), `cat /proc/loadavg` avant et après.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier, jamais `-A`, `--all`, `.` ni `commit -a` ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre : `tableAt` (`table-geom.ts:168`), `fragments.ts:85`, `pageViews` de `select.ts:99` restent tels quels ; `docs/audits/` et le fichier d'état non touchés.
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** déplacer un travail hors de la fenêtre pour gagner (GC3) ; changer `createZoneMarks`, ses paramètres ou la garde `running` ; affaiblir `watchDoc` si un accès apparaît après `dispose` (s'arrêter et le rapporter).

**Terminé quand :** commande bornée verte, `tsc --noEmit` propre, banc rejoué, un passage de l'essai relevé, section « après T3 » écrite, un commit.

**Étapes :**

- [ ] **Étape 1 : tests du moteur rouges**

Dans `apps/web/src/engine/engine.test.ts`, `describe("moteur — C10b (F29, F14)")` : dans le test existant
`tableMerges, tableShades : comptés sur tous les tableaux de la page montrée…` (`:1042`), ajouter juste après
`doc.element = (id) => els.get(id) ?? realEl(id);` les deux lignes qui exposent aussi les faux tableaux par l'accesseur
(le test garde son sens : les tableaux de la page montrée) :

```ts
    const realKind = doc.elementIdsOfKind.bind(doc);
    doc.elementIdsOfKind = (p, k) => (p === page && k === "table" ? [...realKind(p, k), ...els.keys()] : realKind(p, k));
```

Puis, à la suite de ce test, deux cas neufs (RF1) :

```ts
  it("OE23 (Q7) : tableMerges, tableShades : seule la vue des candidats « table » est lue, jamais celle d'un trait", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const stroke = doc.apply({ type: "CommitStroke", page, points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN }).ids[0] ?? "";
    const table = doc.apply({ type: "AddTable", page, x: 100, y: 200, cols: 2, rows: 1, colWidth: 100, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const read = vi.spyOn(doc, "element");
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([0, 0]);
    const ids = read.mock.calls.map(([id]) => id);
    expect(ids).toContain(table);
    expect(ids).not.toContain(stroke);
  });

  it("OE23 (H4) : un candidat « table » dont la vue n'est pas un tableau (mal formé, vue unknown) ne compte pas", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const views = new Map<string, ElementView>([
      ["a", tableEl("a", true, 2)],
      ["m", { id: "m", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "table", w: 10, h: 10 } }],
    ]);
    const realEl = doc.element.bind(doc);
    doc.elementIdsOfKind = (p, k) => (p === page && k === "table" ? [...views.keys()] : []);
    doc.element = (id) => views.get(id) ?? realEl(id);
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 2]);
  });
```

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts -t "OE23" --reporter=verbose 2>&1 | grep -E "OE23|Tests " | tail -6
```
Attendu : 2 échecs (le premier lit `element(stroke)`, le second compte `[0, 0]`) ; le test existant reste vert.

- [ ] **Étape 2 : `tableCounts`**

`apps/web/src/engine/engine.ts:279-295`, remplacer le commentaire et la boucle :

```ts
  /** Comptes de `#stage[data-table-merges|data-table-shades]` (F29), recalculés quand la version ou la page change (PC12).
   *  OE23 (Q7) : seuls les candidats `table` (kind brut) sont lus, chacun confirmé par sa vue (un mal formé est `unknown`). */
  let counted = { key: "", merges: 0, shades: 0 };
  const tableCounts = (): { readonly merges: number; readonly shades: number } => {
    const key = `${pageId}|${doc.version()}`;
    if (counted.key !== key) {
      let merges = 0;
      let shades = 0;
      for (const id of doc.elementIdsOfKind(pageId, "table")) {
        const el = doc.element(id);
        if (el?.kind !== "table") continue;
        merges += el.table.merges.length;
        shades += el.table.cells.filter((c) => c.shade !== null).length;
      }
      counted = { key, merges, shades };
    }
    return counted;
  };
```

Relancer la commande de l'étape 1 : 3 verts (les 2 `OE23` et le test existant).

- [ ] **Étape 3 : test de `zone-marks` rouge (RF2)**

`apps/web/src/app/zone-marks.test.ts:9-23`, remplacer l'aide `doc` (le kind brut et la vue peuvent différer) :

```ts
function doc(kinds: Record<string, string>, views: Record<string, string> = kinds): ZoneDoc & { reads: number; asked: [string, number][] } {
  const d = {
    reads: 0,
    asked: [] as [string, number][],
    elementIdsOfKind: (_page: string, kind: string) => {
      d.reads++;
      return Object.keys(kinds).filter((id) => kinds[id] === kind);
    },
    element: (id: string) => (views[id] === undefined ? null : { kind: views[id] ?? "" }),
    zoneCells: (page: string, tol: number) => {
      d.asked.push([page, tol]);
      return 4_032_064;
    },
  };
  return d;
}
```

et ajouter, à la fin du `describe("zone-marks (C8, Q18)")` :

```ts
  it("OE23 (H4) : un fill mal formé (vue unknown) n'est pas compté ; seule la vue des candidats « fill » est lue", () => {
    const d = doc({ a: "stroke", f: "fill", g: "fill" }, { a: "stroke", f: "fill", g: "unknown" });
    const seen: string[] = [];
    const spy: ZoneDoc = { ...d, element: (id) => (seen.push(id), d.element(id)) };
    const m = createZoneMarks(spy, () => 0, () => undefined);
    expect(m.tags("p", 1).zones).toBe("1");
    expect(seen).toEqual(["f", "g"]);
  });
```

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web exec vitest run src/app/zone-marks.test.ts --reporter=verbose 2>&1 | grep -E "C8|OE23|Tests " | tail -10
```
Attendu : échecs `doc.elementIds is not a function` (le recompte lit encore `elementIds`).

- [ ] **Étape 4 : `zone-marks.ts`**

`apps/web/src/app/zone-marks.ts:8-13` :

```ts
/** Ce que les marques lisent du document (structurel : `CoreDocument` convient). */
export interface ZoneDoc {
  /** OE23 (Q7) : ids des éléments de `page` dont le `kind` brut vaut `kind` ; chaque candidat est confirmé par `element`. */
  elementIdsOfKind(page: string, kind: string): readonly string[];
  element(id: string): { readonly kind: string } | null;
  zoneCells(page: string, tol: number): number;
}
```

`:17-20`, commentaire de `tags` : remplacer « le recompte lit chaque élément par le pont » par « le recompte lit la vue des
seuls candidats `fill` (OE23) ».

`:62` :

```ts
        const zones = doc.elementIdsOfKind(page, "fill").filter((id) => doc.element(id)?.kind === "fill").length;
```

Relancer la commande de l'étape 3 : tous verts, dont les cas existants (`le recompte des fill rappelé pendant la commande
reste hors de la mesure`, `compte des fill relu seulement quand la page ou la version change`).

- [ ] **Étape 5 : `watchDoc` étendu (RF4)**

`apps/web/src/app/board-session.test.ts:1213-1219` :

```ts
  /** Accès au document à partir de maintenant (le vrai cœur lève sur un document libéré) ; OE23 : listes d'ids comprises. */
  const watchDoc = (doc: ReturnType<typeof fakeCore.blank>) => {
    const spies = [vi.spyOn(doc, "version"), vi.spyOn(doc, "element"), vi.spyOn(doc, "apply"), vi.spyOn(doc, "elementIds"), vi.spyOn(doc, "elementIdsOfKind")];
    return {
      reset: (): void => spies.forEach((x) => x.mockClear()),
      counts: (): number[] => spies.map((x) => x.mock.calls.length),
    };
  };
```

et, aux deux assertions `:1232` et `:1257`, `expect(access.counts()).toEqual([0, 0, 0, 0, 0]);`.

Puis la commande bornée de la section et :

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5
```
Attendu : commande bornée verte (3 `OE23`, `RF4` verts) ; aucune sortie de `tsc`. Un `RF4` rouge (accès après `dispose`) : s'arrêter et le rapporter.

- [ ] **Étape 6 : mesure après le gain (banc et un passage de l'essai)**

Banc (module de T2, déjà construit) :

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && cat /proc/loadavg && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 | grep -E "S6 |Tests |FAIL" | tail -20 && cat /proc/loadavg
```
Attendu : `Tests  2 passed (2)` ; `S6 banc (b)` proche de `(a)` (l'écart d'environ 20 ms d'avant a disparu) ; `(c) hors fenêtre` en baisse ; `S6 empreinte :` identique à celle d'afc2d8b.

Un passage de l'essai, sur l'application construite :

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 && cat /proc/loadavg && node scripts/essais/c8-pot-zones-navigateur.mjs 2>&1 | grep -E "S6|C8 pot zones|chec" | tail -8; cat /proc/loadavg
```
Attendu : `built in`, puis les lignes `S6 : médiane … ms … (a, b, c)` et `S6 : fond en … ms`, et le code de sortie 0.

- [ ] **Étape 7 : écrire la mesure dans `docs/essais/c8-porte-s6.md`**

Ajouter une ligne `après T3` dans chaque tableau concerné, avec les valeurs relevées à l'étape 6 :
- « Passages de l'essai C8 » : `| après T3 | ‹sha court› | 1 | ‹charge avant› | ‹trois clics triés› | ‹médiane› | ‹fond› |` ;
- « Banc du vrai module » : `| après T3 | ‹charge› | ‹a› (‹ordre›) | ‹b› | ‹c fenêtre› | ‹c hors› | ‹ms› | ‹ms› | ‹ms› | ‹ms› | ‹ms› |` ;

puis, sous ces tableaux, une section :

```markdown
## Gain T3 : `tableCounts` et recompte des `fill` par `elementIdsOfKind`

| mesure | avant | après T3 | écart |
|---|---|---|---|
| banc (b) engine.run, médiane | ‹avant› | ‹après› | ‹écart› |
| banc (c) hors fenêtre, médiane | ‹avant› | ‹après› | ‹écart› |
| essai, médiane S6 (un passage) | 40 (médiane des 5 avant) | ‹après› | ‹écart› |
| essai, clic le plus lent | 51 (maximum des 5 avant) | ‹après› | ‹écart› |

S1 après T3 (lecture de ce seul passage) : ‹« médiane ≤ 35 et aucun clic > 50 » ou « non tenue : … »›.
```

- [ ] **Étape 8 : commit**

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && git add apps/web/src/engine/engine.ts && git add apps/web/src/engine/engine.test.ts && git add apps/web/src/app/zone-marks.ts && git add apps/web/src/app/zone-marks.test.ts && git add apps/web/src/app/board-session.test.ts && git add docs/essais/c8-porte-s6.md && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "perf(engine): count tables and fills from raw-kind candidates only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : sortie de la commande bornée, lignes `S6 ` du banc, lignes `S6` de l'essai avec la charge, verdict S1 de ce
passage, lignes `Réutilisation :`.

---

### Tâche T4 — Gain côté cœur, conditionnel

<a id="tache-t4"></a>

**Condition de lancement (lue par l'orchestrateur) :** T4 ne tourne que si S1 n'est pas tenue après T3 : le passage relevé par
T3 (section « Gain T3 » de `docs/essais/c8-porte-s6.md`) a une médiane S6 > 35 ms ou un clic > 50 ms, ou l'orchestrateur, s'il
rejoue les 5 passages après T3, voit une médiane > 35 ms ou un clic > 50 ms. Sinon T4 est « sans objet » : rien n'est modifié,
T5 suit.

**Objectif :** réduire le calcul de zone lui-même, un gain à la fois, dans l'ordre que donne la mesure (Q8) : d'abord le premier
clic à froid s'il approche 50 ms (42,9 ms au cadrage pour `fill_zone` seul, croissance de la mémoire du module) ; ensuite, par
part mesurée décroissante, `i_overlay` (6,6 ms natif), rastérisation et dilatation (4,3 ms, dont la remise à zéro du masque de
4 Mio), diffusion, puis la lecture par le pont et les allocations. Le `fill` produit reste identique (empreinte d'afc2d8b).

**Fichiers :**
- Modifier : `crates/roomboard-core/src/zone.rs` (`closed_zone`, `:733-789`, et les fonctions de phase qu'il appelle : `Mask`, `:231-460`, `stacks`, `:497`, `clip_of`, `:693`), `docs/essais/c8-porte-s6.md`, `docs/essais/taille-wasm.md`
- Tests à garder verts : `crates/roomboard-core/src/zone.rs:933-1510` (oracles de masque, trous, fond), `apps/web/src/core/wasm-core.contract.test.ts` (blocs « contrat C8 »), `apps/web/src/app/stage-tags.test.ts:84`.

**Interfaces :**
- Consomme (T1) : banc `apps/web/src/engine/zone-s6-banc.test.ts` (ligne `S6 empreinte :`, lignes `S6 banc`) ; témoin `s6_worst_case_timing_witness`.
- Produit : rien de nouveau ; `pub fn closed_zone(walls: &[Wall], x: f64, y: f64, tol: f64) -> Zone` et `pub(crate) fn zone_walls(&self, page: &str) -> Vec<Wall>` inchangées.
- Réutilise : `crates/roomboard-core/src/zone.rs:765` — `FloatOverlay::with_subj_and_clip(&subj, &clip).overlay(OverlayRule::Difference, FillRule::NonZero)` (`i_overlay` 9.2.0, déjà en dépendance, aucune crate).
- Réutilise : `crates/roomboard-core/src/document.rs:537` (`cached_outline`), appelé par `wall_of` (`zone.rs:843`) — contours des traits, sans copie de plus.
- Réutilise : `crates/roomboard-core/src/zone.rs:164` (`lap`), `:1518` (témoin) — phases mesurées avant et après chaque gain.
- Rapport : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`, une ligne par « Réutilise ».

**Patron à ne pas reprendre (concepteur-critique) :**
- Le repli DA-Z5 étape 1 : plafond 2²¹ cellules (cellule doublée, tolérance à 4 px, `data-zone-cells` ≈ 1 M sous `MIN_CELLS`) : exclu (Q9).
- Sortir le calcul de la fenêtre (Worker, calcul différé, préchauffage compté hors mesure) : GC3 et Q9 ; un gain compte seulement si le travail disparaît ou coûte moins.
- Un second masque, ou une troisième copie des contours (constats `zone.rs:127`, `document.rs:423`) : un seul masque `u8` d'au plus 2²² cellules.
- Un gain qui change l'ordre ou la découpe des sommets du `fill` : l'empreinte change ; il ne passe pas sans décision écrite (H3), donc s'arrêter et le rapporter.
- Chemin de référence : `crates/roomboard-core/src/zone.rs:733-789` (ordre des phases et `lap`), `:231-250` (`Mask::new`, `vec![FREE; g.w * g.h]`), `docs/plans/usage-c8-pot-zones-cadrage.md:37` (Q20), `:215-219` (DA-Z5).

**Protocole d'un gain (répété pour chaque gain, un à la fois) :**
1. Mesurer : témoin natif et banc, charge avant et après (commandes ci-dessous). Choisir la phase de plus grande part mesurée dans l'ordre de l'objectif ; l'écrire dans le rapport avec ses ms.
2. Test d'abord : si le gain touche une fonction de phase, ajouter dans `mod tests` de `zone.rs` un test d'oracle qui fige sa sortie actuelle sur une entrée réduite (même masque, mêmes suites ou mêmes contours avant et après), vu vert avant le changement et vert après ; un test vu rouge n'est exigé que si le gain ajoute un comportement.
3. Changer le code, sans toucher aux signatures publiques.
4. Prouver : `zone::` vert, témoin natif, banc avec `S6 empreinte :` **identique octet pour octet** à la ligne d'afc2d8b (`docs/essais/c8-porte-s6.md` § Empreinte) ; module reconstruit, taille ≤ 1 572 864 o.
5. Un passage de l'essai, écrit dans `docs/essais/c8-porte-s6.md` (ligne `après T4 (<gain>)` dans « Passages », « Témoin natif » et « Banc »), commit.
6. S'arrêter dès que le passage tient S1 (médiane ≤ 35 ms, aucun clic > 50 ms). Si la liste de Q8 est épuisée sans tenir S1 : écrire « S1 non tenue par les gains directs » dans le document avec les mesures, et le rapport le dit (GC8) ; aucun autre essai.

**Test et commande bornée :**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 cargo test -p roomboard-core --features zone --lib zone:: 2>&1 | grep -E "test result|FAILED" | tail -3
```
Preuve : `test result: ok. N passed` (N ≥ 1), aucune `FAILED`. Puis le témoin et le banc :

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && cat /proc/loadavg && nice -n 10 cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture 2>&1 | grep -E " ms|S6 natif|test result" | tail -14 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 | grep -E "S6 |Tests |FAIL" | tail -20 && cat /proc/loadavg
```
Preuve : `S6 natif : médiane …`, taille ≤ 1 572 864, `Tests  2 passed (2)`, ligne `S6 empreinte :` égale à celle d'afc2d8b (`diff` des deux lignes vide). Passage de l'essai : la commande de T3, étape 6 (`pnpm --filter @roomboard/web build`, puis `node scripts/essais/c8-pot-zones-navigateur.mjs` sans `nice`, `cat /proc/loadavg` avant et après).

**Preuve visuelle :** aucune.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC2 — Ce qui ne change pas (Q1) : `GATE_MS` 50, fixture S6, `MIN_CELLS` 4 000 000, 3 clics annulés entre deux, médiane `ms[1]` après tri, tolérance 2 px, clic hors du triangle ≤ 50 ms. `scripts/essais/c8-pot-zones-navigateur.mjs` n'est pas modifié.
- GC3 — Fenêtre de mesure (Q2) : inchangée. Un gain compte seulement si le travail disparaît ou coûte moins ; un travail sorti de la fenêtre reste fait avant l'image qui montre le `fill`, et sa durée est mesurée et écrite à côté de la porte.
- GC4 — Témoin, pas porte : aucune assertion de durée, dans aucun test.
- GC5 — Tailles : module principal ≤ 1 572 864 o ; `formats` sans ajout (≤ 3 100 845 o, plafond 3 145 728 o) ; plafonds de `scripts/verifier.sh` inchangés.
- GC6 — Licences : aucune crate ni paquet npm nouveau ; aucune dépendance AGPL, GPL ni LGPL.
- GC7 — Cœur (Q8, C8 Q20) : signatures publiques de `closed_zone(walls, x, y, tol) -> Zone` et de `zone_walls` inchangées ; un seul masque `u8` d'au plus 2²² cellules ; aucune crate nouvelle.
- GC8 — Repli (Q9) : plafond 2²¹ exclu ; Worker de DA-Z5 hors périmètre. Si les gains directs ne suffisent pas, la tâche s'arrête et l'écrit dans son rapport, mesures à l'appui.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android. Module Wasm reconstruit comme `scripts/verifier.sh`.
- GC10 — Essai C8 : jamais 5 passages ni `scripts/verifier.sh --e2e` ; un passage unique après un gain, sans `nice`, `cat /proc/loadavg` avant et après.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre : constats `zone.rs:127` et `document.rs:423` non aggravés ; aucun index par id dans `find_element` ; `docs/audits/` et le fichier d'état non touchés.
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC14 — Trois couches testables seules : `crates/` sans dépendance au navigateur.

**Interdits :** toucher à `crates/roomboard-formats*`, à l'essai, à la fenêtre de `zone-marks` ; accepter une empreinte changée ; enchaîner deux gains dans un même commit.

**Terminé quand :** S1 tenue sur le passage du dernier gain, ou liste de Q8 épuisée et écrite ; chaque gain a sa ligne avant/après (témoin, banc, passage) dans `docs/essais/c8-porte-s6.md`, la ligne de taille du module dans `docs/essais/taille-wasm.md`, et son commit (`perf(zone): <gain>` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git add crates/roomboard-core/src/zone.rs`, puis chaque document, un par un).

Rapport : pour chaque gain, la phase visée et ses ms avant/après, la ligne `S6 empreinte :` (identique), la taille, les lignes
`S6` de l'essai avec la charge ; le verdict S1 ; les lignes `Réutilisation :`.

---

### Tâche T5 — Non-régression C8 sur S6 dans le banc (vrai module)

<a id="tache-t5"></a>

**Objectif :** figer dans le vrai module le comportement C8 sur S6 (S2, Q10) : trois clics posent chacun un `fill` à trous,
chaque annulation le retire en une étape, l'empreinte est celle d'afc2d8b, l'aller-retour `.roomboard` rend le même `fill`,
un clic hors du triangle change le fond sans `fill`.

**Fichiers :**
- Modifier : `apps/web/src/engine/zone-s6-banc.test.ts` (constante et `describe` neufs, à la fin), `docs/essais/c8-porte-s6.md` (une ligne)
- Tests à garder verts : `crates/roomboard-core/src/zone.rs:933-1510`, `apps/web/src/core/wasm-core.contract.test.ts` (« contrat C8 »).

**Interfaces :**
- Consomme (T1, même fichier) : `need()`, `buildS6(core)`, `zoneAt(p, at, color)`, `Fingerprint`, `fingerprint(d, id)`, `FIXED`, `INSIDE`, `OUTSIDE`, `YELLOW`, `BLUE`.
- Consomme (T2) : `CoreDocument.elementIdsOfKind(page: string, kind: string): readonly string[]`.
- Consomme (T1, document) : ligne `S6 empreinte : anneaux=… longueur=… sha256=… boîte=…` de `docs/essais/c8-porte-s6.md` § « Empreinte du fill S6 (afc2d8b, avant tout gain) ».
- Produit : `const S6_EMPREINTE_AFC2D8B: Fingerprint` ; trois tests `S2 :`.
- Rapport : `Réutilisation : appelé zone-s6-banc.test.ts (buildS6, fingerprint)` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée :**
```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose 2>&1 | grep -E "S2 :|Tests |FAIL" | tail -12
```
Preuve : 3 lignes `S2 :` en vert, `Tests  5 passed (5)`, aucune `FAIL`. Puis, tests à garder verts :

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && nice -n 10 cargo test -p roomboard-core --features zone --lib zone:: 2>&1 | grep -E "test result|FAILED" | tail -3 && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "C8" --reporter=verbose 2>&1 | grep -E "Tests |FAIL" | tail -3
```
Preuve : `test result: ok. N passed` (N ≥ 1) ; `Tests  N passed`, N ≥ 1, aucune `FAIL`.

**Preuve visuelle :** aucune.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord, vu rouge pour la bonne raison. Aucun test retiré, désactivé ni sauté ; aucun seuil baissé ni relevé.
- GC2 — Ce qui ne change pas (Q1) : fixture S6, `MIN_CELLS` 4 000 000, tolérance 2 px ; `scripts/essais/c8-pot-zones-navigateur.mjs` n'est pas modifié.
- GC4 — Témoin, pas porte : aucune assertion de durée, dans aucun test.
- GC9 — Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; builds et tests sous `nice -n 10` ; aucun build Tauri, aucun build Android.
- GC10 — Essai C8 : jamais 5 passages ni `scripts/verifier.sh --e2e` dans une tâche.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; `git add` fichier par fichier, jamais `-A`, `--all`, `.` ni `commit -a` ; aucun push forcé, aucun tag.
- GC12 — Hors périmètre : `docs/audits/` et le fichier d'état non touchés.
- GC13 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** relever l'empreinte sur la tête courante (elle vient d'afc2d8b, recopiée du document) ; modifier le banc de T1 au-delà de l'ajout ; changer du code de production.

**Terminé quand :** 5 tests verts dans le banc, la mutation de l'empreinte vue rouge puis rétablie, tests à garder verts, un commit.

**Étapes :**

- [ ] **Étape 1 : constante d'empreinte**

Recopier la ligne `S6 empreinte :` de `docs/essais/c8-porte-s6.md` dans une constante, juste après `fingerprint` dans
`apps/web/src/engine/zone-s6-banc.test.ts` : `anneaux` → `rings`, `longueur` → `length`, `sha256` → `sha256` (chaîne),
`boîte` → `bounds` (les quatre nombres, tels qu'écrits) :

```ts
/** Empreinte du `fill` S6 relevée sur afc2d8b avant tout gain (OE23, Q10, H3) : `docs/essais/c8-porte-s6.md` § Empreinte. */
const S6_EMPREINTE_AFC2D8B: Fingerprint = { rings: ‹anneaux›, length: ‹longueur›, sha256: "‹sha256›", bounds: [‹x0›, ‹y0›, ‹x1›, ‹y1›] };
```

- [ ] **Étape 2 : tests de non-régression**

À la fin du fichier :

```ts
describe.skipIf(wasmCore === null)("non-régression C8 sur S6 (OE23, S2) : vrai module", () => {
  it("S2 : trois clics posent chacun un fill à trous, chaque annulation le retire en une étape ; empreinte d'afc2d8b", async () => {
    const { d, p } = buildS6(need());
    const strokes = d.elementIds(p);
    expect(strokes).toHaveLength(303);
    expect(d.canUndo()).toBe(false);
    for (let k = 0; k < 3; k++) {
      const c = d.apply(zoneAt(p, INSIDE, YELLOW));
      expect(c.ids).toHaveLength(1);
      const id = c.ids[0] ?? "";
      expect(d.elementIds(p)).toEqual([...strokes, id]);
      expect(d.elementIdsOfKind(p, "fill")).toEqual([id]);
      expect(d.element(id)).toMatchObject({ kind: "fill", fill: { color: YELLOW } });
      const f = await fingerprint(d, id);
      expect(f.rings).toBeGreaterThan(1);
      expect(f).toEqual(S6_EMPREINTE_AFC2D8B);
      expect(d.canUndo()).toBe(true);
      d.undo();
      expect(d.canUndo()).toBe(false);
      expect(d.elementIds(p)).toEqual(strokes);
      expect(d.elementIdsOfKind(p, "fill")).toEqual([]);
    }
    d.free();
  }, 120_000);

  it("S2 : enregistrer puis rouvrir rend le même fill (vue et anneaux)", () => {
    const { d, p } = buildS6(need());
    const id = d.apply(zoneAt(p, INSIDE, YELLOW)).ids[0] ?? "";
    const r = need().load(d.save(FIXED, "essai-c8"));
    expect(r.element(id)).toEqual(d.element(id));
    expect(r.fillRings(id)).toEqual(d.fillRings(id));
    expect(r.elementIdsOfKind(p, "fill")).toEqual([id]);
    r.free();
    d.free();
  }, 120_000);

  it("S2 : un clic hors du triangle change le fond, sans fill", () => {
    const { d, p } = buildS6(need());
    const c = d.apply(zoneAt(p, OUTSIDE, BLUE));
    expect(c.ids).toEqual([]);
    expect(d.page(p)?.background).toBe(BLUE);
    expect(d.elementIdsOfKind(p, "fill")).toEqual([]);
    expect(d.elementIds(p)).toHaveLength(303);
    d.free();
  }, 120_000);
});
```

Lancer la commande bornée : 3 `S2 :` verts, `Tests  5 passed (5)`.

- [ ] **Étape 3 : prouver que l'empreinte mord**

Changer le dernier caractère hexadécimal de `sha256` dans `S6_EMPREINTE_AFC2D8B` (par exemple `0` ↔ `1`), relancer la commande
bornée : attendu `FAIL` sur `S2 : trois clics…` avec un écart sur `sha256`. Rétablir la valeur, relancer : `Tests  5 passed (5)`.

- [ ] **Étape 4 : tests à garder verts**

Les deux commandes de « Test et commande bornée », après la première : `test result: ok`, `Tests  N passed`.

- [ ] **Étape 5 : note et commit**

Sous la section « Empreinte » de `docs/essais/c8-porte-s6.md`, ajouter :

```markdown
Non-régression : `zone-s6-banc.test.ts`, `describe` « non-régression C8 sur S6 » (S2), compare cette empreinte sur la tête ‹sha court› : égale.
```

```bash
cd /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6 && git add apps/web/src/engine/zone-s6-banc.test.ts && git add docs/essais/c8-porte-s6.md && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(c8): S6 non-regression on the real module, fill fingerprint from afc2d8b

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : sortie des commandes bornées, la mutation vue rouge, la ligne `Réutilisation :`.
