# Plan du lot 1 — Stylet mesurable (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D18, D29, D30, D31, D39, D9 ; scénario S1 ; DA9). Plan maître : `docs/plans/socle-PLAN.md`.

**But :** un fichier HTML autonome `apps/web/dist-proto/proto-stylet.html`, ouvrable en `file://` sur l'ENI cet
après-midi, qui trace au stylet (polyligne à largeur variable selon la pression), propose les bascules de D29 et
exporte les mesures de D30 au format `roomboard-stylet/1`. Le module `src/engine/input/sampler.ts` (règles de D39)
est gardé pour le lot 3.

**Architecture :** TS pur, ni framework ni Wasm. `src/engine/input/` = code gardé (échantillonneur, statistiques) ;
`src/proto/` = banc (polyligne, boucle d'image, enregistreur, page). Configuration Vite séparée
(`vite.proto.config.ts` + `vite-plugin-singlefile`) : le build de l'application n'est pas touché.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Échantillonneur `sampler.ts` (D39) | — | apps/web/src/engine/input/sampler.ts, apps/web/src/engine/input/sampler.test.ts | isolé | concepteur-critique | vitest `sampler.test.ts` ≥ 18 tests, `pointerup ferme le geste sans point de pression nulle` présent ; `verifier.sh : OK` | S1 | #tache-t1 |
| T2 | Statistiques et rapport `roomboard-stylet/1` (D30) | — | apps/web/src/engine/input/stats.ts, apps/web/src/engine/input/stats.test.ts | isolé | implementeur-tdd | vitest `stats.test.ts` ≥ 10 tests, `le rapport survit à JSON.stringify` présent ; `verifier.sh : OK` | S1 | #tache-t2 |
| T3 | Polyligne et boucle d'image du banc | — | apps/web/src/proto/polyline.ts, apps/web/src/proto/polyline.test.ts, apps/web/src/proto/frame-loop.ts, apps/web/src/proto/frame-loop.test.ts | isolé | implementeur-tdd | vitest `polyline.test.ts` + `frame-loop.test.ts` ≥ 12 tests, `aucune durée mesurée à travers une pause` présent ; `verifier.sh : OK` | S1 | #tache-t3 |
| T4 | Contrôle de version `wasm-bindgen` dans `verifier.sh` (D9) | — | scripts/controle-wasm-bindgen.sh, scripts/tests/controle-wasm-bindgen.test.sh, scripts/verifier.sh | isolé | implementeur-tdd | `controle-wasm-bindgen.test.sh : 4 cas OK` ; `verifier.sh : OK` | S1 | #tache-t4 |
| T5 | Fiche d'essai ENI | — | docs/essais/eni-stylet.md | isolé | implementeur-tdd | contrôle `grep` des 5 titres de la fiche (5 lignes) | S1 | #tache-t5 |
| T6 | Enregistreur et page prototype en fichier unique | T1, T2, T3, T4 | apps/web/src/proto/recorder.ts, apps/web/src/proto/recorder.test.ts, apps/web/src/proto/stylet.ts, apps/web/proto-stylet.html, apps/web/vite.proto.config.ts, apps/web/package.json, pnpm-lock.yaml, .gitignore, scripts/verifier.sh | isolé | implementeur-tdd | vitest `recorder.test.ts` ≥ 9 tests ; `dist-proto` = 1 fichier sans `<script src`, `verifier.sh : OK` | S1 | #tache-t6 |

Vagues : T1, T2, T3, T4, T5 en parallèle (aucun fichier commun) ; T6 seule ensuite. T6 livre le fichier à remettre
avant l'essai (`apps/web/dist-proto/proto-stylet.html`).

## Carte des fichiers

| fichier | tâche | rôle |
|---|---|---|
| `apps/web/src/engine/input/sampler.ts` | T1 | nouveau, gardé au lot 3 : `createSampler`, types `InputSample`, `GestureEvent`, `SamplerOptions`, `SamplerStats`, `PointerLike`, `PointerSurface`, `Sampler` |
| `apps/web/src/engine/input/stats.ts` | T2 | nouveau, gardé : statistiques pures et rapport `roomboard-stylet/1` |
| `apps/web/src/proto/polyline.ts` | T3 | nouveau, banc : `widthFor`, `drawSegments`, `drawPredicted` |
| `apps/web/src/proto/frame-loop.ts` | T3 | nouveau, banc : `createFrameLoop` (durées d'image) |
| `apps/web/src/proto/recorder.ts` | T6 | nouveau, banc : traits vifs et mesures par trait |
| `apps/web/src/proto/stylet.ts` | T6 | nouveau, banc : câblage DOM de la page |
| `apps/web/proto-stylet.html`, `apps/web/vite.proto.config.ts` | T6 | nouveaux (D29) |
| `apps/web/package.json`, `pnpm-lock.yaml` | T6 | `vite-plugin-singlefile` 2.3.4 en dépendance de dev, script `build:proto` |
| `.gitignore` | T6 | `apps/web/dist-proto/` |
| `scripts/controle-wasm-bindgen.sh`, `scripts/tests/controle-wasm-bindgen.test.sh` | T4 | nouveaux (D9) |
| `scripts/verifier.sh` | T4 puis T6 | contrôle de version (T4) ; build du prototype et contrôle « fichier unique » (T6) |
| `docs/essais/eni-stylet.md` | T5 | nouveau : protocole S1, lecture du JSON, tableau « si échec » |

Carte d'impact du cadrage, entrées du lot 1 : `apps/web/package.json` (T6), `apps/web/proto-stylet.html` et
`vite.proto.config.ts` (T6), `apps/web/src/engine/input/` (T1, T2), `scripts/verifier.sh:13-16` (T4 ; build du
prototype : T6). Effet de bord du lot : « `verifier.sh` s'arrête si la CLI `wasm-bindgen` diffère de `Cargo.lock` »
→ test `controle-wasm-bindgen.test.sh` cas « versions différentes » (T4). Tests à garder verts dans la zone :
`apps/web/src/toolbar.test.ts` (2 tests) et les tests Rust du squelette, cités dans la preuve de chaque tâche par
`verifier.sh`. Les autres entrées de la carte d'impact relèvent des lots 2 à 5 (plan maître).

## Global Constraints (recopiées dans chaque section)

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Pas de `--force`.
- Aucun workflow GitHub Actions (`.github/workflows/` non touché).
- Un seul build Tauri à la fois ; aucun build Android. Le lot 1 n'a besoin d'aucun build Tauri : n'en lancer aucun.
- Tests : `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH`.
- Sous-agents relecteurs au premier plan (`run_in_background: false`).
- `$WT` = dossier de travail donné par l'orchestrateur pour la tâche (par défaut `/home/adminjd/projets/roomboard-wt/socle`).
  Worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord.
- TypeScript strict avec `noUncheckedIndexedAccess` (`apps/web/tsconfig.json`) : aucun `any`, aucun `!` d'assertion
  non nulle sur un index de tableau.

## Review Focus

- T1 : `pointerup` ne pousse aucun échantillon (pression 0 du stylet levé) ; `lostpointercapture` qui suit un
  `pointerup` n'est pas compté comme interruption ; contact tactile ignoré tant qu'un stylet touche (D39, D18) ;
  `pointerrawupdate` remplace `pointermove`, ne s'y ajoute pas (pas de doublons).
- T2 : le rapport ne contient ni `NaN` ni `Infinity` (JSON lisible tel quel), percentile au rang le plus proche.
- T6 : la page ne trace pas à travers le build de l'application (`pnpm --filter @roomboard/web build` inchangé) ; le
  fichier produit n'a aucune ressource externe (ouvrable en `file://`, hors ligne).

---

<a id="tache-t1"></a>
### Tâche T1 — Échantillonneur `sampler.ts` (D39)

**Objectif.** Créer le module gardé qui transforme les Pointer Events en gestes (`start`, `move`, `end`, `cancel`)
avec échantillons fusionnés et prédits, en appliquant les règles de fin anormale de D39 et la règle « paume » de D18.
Scénario servi : S1 (le prototype et l'essai ENI lisent ces gestes) ; réutilisé tel quel au lot 3.

**Fichiers.** Créer `apps/web/src/engine/input/sampler.ts`, `apps/web/src/engine/input/sampler.test.ts`. Rien d'autre.

**Interfaces.**
- Consomme : API du navigateur, appelée seulement ici — `PointerEvent.getCoalescedEvents()`, `getPredictedEvents()`,
  `Element.setPointerCapture(id)`, événements `pointerdown`, `pointermove`, `pointerrawupdate`, `pointerup`,
  `pointercancel`, `lostpointercapture`, `contextmenu`.
- Réutilise : API du navigateur `PointerEvent.getCoalescedEvents()` / `getPredictedEvents()`, `setPointerCapture` —
  appelées seulement par `engine/input/sampler.ts` (cadrage, « Modules à réutiliser »).
- Produit (nouveau module prévu par le cadrage, « Échantillonnage et mesure de l'entrée ») :
  ```ts
  export interface InputSample { readonly x: number; readonly y: number; readonly pressure: number; readonly tiltX: number; readonly tiltY: number; readonly t: number }
  export type GestureKind = "start" | "move" | "end" | "cancel";
  export interface GestureEvent { readonly kind: GestureKind; readonly pointerId: number; readonly pointerType: string; readonly eraserButton: boolean; readonly samples: readonly InputSample[]; readonly predicted: readonly InputSample[] }
  export interface SamplerOptions { readonly coalesced: boolean; readonly predicted: boolean; readonly raw: boolean }
  export interface SamplerStats { readonly moveEvents: number; readonly samples: number; readonly rawUpdateUsed: boolean; readonly pointerCancels: number; readonly lostCaptures: number; readonly touchIgnored: number; readonly eraserSeen: boolean; readonly gestures: number }
  export interface PointerLike { readonly pointerId: number; readonly pointerType: string; readonly clientX: number; readonly clientY: number; readonly pressure: number; readonly tiltX: number; readonly tiltY: number; readonly buttons: number; readonly timeStamp: number; getCoalescedEvents?(): PointerLike[]; getPredictedEvents?(): PointerLike[]; preventDefault(): void }
  export interface PointerSurface { addEventListener(type: string, listener: (e: Event) => void): void; removeEventListener(type: string, listener: (e: Event) => void): void; setPointerCapture(pointerId: number): void; getBoundingClientRect(): { readonly left: number; readonly top: number } }
  export interface Sampler { onGesture(cb: (g: GestureEvent) => void): () => void; stats(): SamplerStats; dispose(): void }
  export function createSampler(target: PointerSurface, opts: SamplerOptions): Sampler
  ```
  Écart assumé avec le cadrage : `target: PointerSurface` au lieu de `HTMLElement` (un `HTMLElement` le satisfait ;
  les tests tournent en Node sans DOM). Les options sont fixées à la création : la page recrée l'échantillonneur à
  chaque bascule (T6).

**Le patron à ne pas reprendre** (le gestionnaire de pointeur « évident ») : pousser le point du `pointerup` (sa
pression vaut 0 pour un stylet levé, le trait finit en pointe et les statistiques de pression sont faussées) ; traiter
`lostpointercapture` comme une interruption même après `pointerup` (il suit toujours le relâché) ; écouter
`pointerrawupdate` en plus de `pointermove` (chaque point compté deux fois) ; un seul geste global au lieu d'un geste
par `pointerId` (D18 : deux stylets, stylet + souris) ; laisser un doigt tracer pendant que le stylet touche (paume).
Chemin de référence : règles `docs/plans/socle-cadrage.md:137` (D39) et `docs/plans/socle-cadrage.md:116` (D18),
interface `docs/plans/socle-cadrage.md:283`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/sampler.test.ts 2>&1 | tail -20`
Motif attendu : `Tests  18 passed` (N ≥ 18), nom `pointerup ferme le geste sans point de pression nulle` présent dans
`pnpm exec vitest run src/engine/input/sampler.test.ts --reporter=verbose 2>&1 | grep -c "✓"` (≥ 18).
Puis `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK` (garde verts
`toolbar.test.ts` et les tests Rust du squelette).

**Preuve visuelle.** Aucune (module sans interface ; l'essai réel est S1 via T6).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun build Tauri dans cette tâche) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` ; relecteurs au premier plan (`run_in_background: false`) ;
TS strict, `noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Aucun import de framework, de Wasm, ni de `src/proto/`. Aucune référence à un global du DOM à
l'exécution (`PointerEvent`, `window`, `document`) : les tests tournent dans l'environnement `node` de vitest. Ne pas
toucher `vitest` ni sa configuration.

**Terminé quand.** Les 18 tests passent, `verifier.sh : OK`, et le rapport contient
`Réutilisation : appelé getCoalescedEvents/getPredictedEvents/setPointerCapture (sampler.ts seul)` ou
`Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** Créer `apps/web/src/engine/input/sampler.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  createSampler,
  type GestureEvent,
  type PointerLike,
  type PointerSurface,
  type Sampler,
  type SamplerOptions,
} from "./sampler";

type Init = Partial<Omit<PointerLike, "preventDefault">> & { pointerId: number };

class FakeSurface implements PointerSurface {
  readonly handlers = new Map<string, Set<(e: Event) => void>>();
  readonly captured: number[] = [];
  failCapture = false;

  constructor(withRawUpdate = false) {
    if (withRawUpdate) {
      Object.defineProperty(this, "onpointerrawupdate", { value: null, enumerable: true });
    }
  }

  addEventListener(type: string, listener: (e: Event) => void): void {
    const set = this.handlers.get(type) ?? new Set<(e: Event) => void>();
    set.add(listener);
    this.handlers.set(type, set);
  }

  removeEventListener(type: string, listener: (e: Event) => void): void {
    this.handlers.get(type)?.delete(listener);
  }

  setPointerCapture(pointerId: number): void {
    if (this.failCapture) throw new Error("NotFoundError");
    this.captured.push(pointerId);
  }

  getBoundingClientRect(): { left: number; top: number } {
    return { left: 10, top: 20 };
  }

  listenerCount(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }

  /** Déclenche un événement ; rend vrai si `preventDefault` a été appelé. */
  fire(type: string, init: Init): boolean {
    let prevented = false;
    const e: PointerLike = {
      pointerType: "pen",
      clientX: 0,
      clientY: 0,
      pressure: 0.5,
      tiltX: 0,
      tiltY: 0,
      buttons: 1,
      timeStamp: 0,
      ...init,
      preventDefault: () => {
        prevented = true;
      },
    };
    for (const listener of this.handlers.get(type) ?? []) listener(e as unknown as Event);
    return prevented;
  }
}

const pt = (clientX: number, clientY: number, timeStamp: number, pressure = 0.5): PointerLike => ({
  pointerId: 1,
  pointerType: "pen",
  clientX,
  clientY,
  pressure,
  tiltX: 0,
  tiltY: 0,
  buttons: 1,
  timeStamp,
  preventDefault: () => undefined,
});

const ALL: SamplerOptions = { coalesced: true, predicted: true, raw: false };

function record(sampler: Sampler): GestureEvent[] {
  const out: GestureEvent[] = [];
  sampler.onGesture((g) => {
    out.push(g);
  });
  return out;
}

describe("createSampler", () => {
  it("start : coordonnées locales, pression du stylet et capture du pointeur", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, clientX: 110, clientY: 220, pressure: 0.3, tiltX: 12, timeStamp: 5 });
    expect(surface.captured).toEqual([1]);
    expect(out).toEqual([
      {
        kind: "start",
        pointerId: 1,
        pointerType: "pen",
        eraserButton: false,
        samples: [{ x: 100, y: 200, pressure: 0.3, tiltX: 12, tiltY: 0, t: 5 }],
        predicted: [],
      },
    ]);
  });

  it("move : un échantillon par événement fusionné quand l'option est active", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", {
      pointerId: 1,
      timeStamp: 3,
      getCoalescedEvents: () => [pt(11, 21, 1), pt(12, 22, 2), pt(13, 23, 3)],
    });
    expect(out[1]?.kind).toBe("move");
    expect(out[1]?.samples.map((s) => s.t)).toEqual([1, 2, 3]);
    expect(out[1]?.samples[0]).toMatchObject({ x: 1, y: 1 });
    expect(sampler.stats()).toMatchObject({ moveEvents: 1, samples: 4, gestures: 1 });
  });

  it("move : l'événement seul quand les fusionnés sont coupés", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, { ...ALL, coalesced: false }));
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", {
      pointerId: 1,
      timeStamp: 9,
      getCoalescedEvents: () => [pt(11, 21, 1), pt(12, 22, 2)],
    });
    expect(out[1]?.samples.map((s) => s.t)).toEqual([9]);
  });

  it("move : liste de fusionnés vide, l'événement lui-même", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, timeStamp: 7, getCoalescedEvents: () => [] });
    expect(out[1]?.samples.map((s) => s.t)).toEqual([7]);
  });

  it("prédits rendus seulement si l'option est active", () => {
    const on = new FakeSurface();
    const outOn = record(createSampler(on, ALL));
    const off = new FakeSurface();
    const outOff = record(createSampler(off, { ...ALL, predicted: false }));
    for (const [surface] of [[on], [off]] as const) {
      surface.fire("pointerdown", { pointerId: 1 });
      surface.fire("pointermove", { pointerId: 1, getPredictedEvents: () => [pt(50, 60, 20), pt(52, 62, 24)] });
    }
    expect(outOn[1]?.predicted.map((s) => s.t)).toEqual([20, 24]);
    expect(outOff[1]?.predicted).toEqual([]);
  });

  it("souris et doigt : pression constante 0,5", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pointerType: "mouse", pressure: 0 });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch", pressure: 1 });
    expect(out.map((g) => g.samples[0]?.pressure)).toEqual([0.5, 0.5]);
  });

  it("pointerup ferme le geste sans point de pression nulle", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pressure: 0.4 });
    surface.fire("pointerup", { pointerId: 1, pressure: 0, buttons: 0 });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "end"]);
    expect(out[1]?.samples).toEqual([]);
  });

  it("lostpointercapture après pointerup est ignoré", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointerup", { pointerId: 1 });
    surface.fire("lostpointercapture", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "end"]);
    expect(sampler.stats().lostCaptures).toBe(0);
  });

  it("pointercancel ferme le geste par cancel", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointercancel", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "cancel"]);
    expect(sampler.stats().pointerCancels).toBe(1);
  });

  it("lostpointercapture pendant le geste ferme par cancel", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("lostpointercapture", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "cancel"]);
    expect(sampler.stats().lostCaptures).toBe(1);
  });

  it("contextmenu est empêché", () => {
    const surface = new FakeSurface();
    createSampler(surface, ALL);
    expect(surface.fire("contextmenu", { pointerId: 1 })).toBe(true);
  });

  it("bouton gomme vu au pointerdown et pendant le geste", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, buttons: 32 });
    surface.fire("pointerdown", { pointerId: 2, buttons: 1 });
    surface.fire("pointermove", { pointerId: 2, buttons: 33 });
    expect(out[0]?.eraserButton).toBe(true);
    expect(out[1]?.eraserButton).toBe(false);
    expect(out[2]?.eraserButton).toBe(true);
    expect(sampler.stats().eraserSeen).toBe(true);
  });

  it("contact tactile ignoré tant qu'un stylet touche", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "touch" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "touch" });
    expect(out.map((g) => g.pointerId)).toEqual([1]);
    expect(surface.captured).toEqual([1]);
    expect(sampler.stats().touchIgnored).toBe(1);
    surface.fire("pointerup", { pointerId: 1 });
    surface.fire("pointerdown", { pointerId: 3, pointerType: "touch" });
    expect(out.map((g) => `${g.kind}:${g.pointerId}`)).toEqual(["start:1", "end:1", "start:3"]);
  });

  it("deux pointeurs tracent ensemble, un geste par pointerId", () => {
    const surface = new FakeSurface();
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1, pointerType: "pen" });
    surface.fire("pointerdown", { pointerId: 2, pointerType: "mouse" });
    surface.fire("pointermove", { pointerId: 2, pointerType: "mouse", timeStamp: 4 });
    surface.fire("pointermove", { pointerId: 1, pointerType: "pen", timeStamp: 5 });
    expect(out.map((g) => `${g.kind}:${g.pointerId}:${g.pointerType}`)).toEqual([
      "start:1:pen",
      "start:2:mouse",
      "move:2:mouse",
      "move:1:pen",
    ]);
  });

  it("pointerrawupdate remplace pointermove si demandé et disponible", () => {
    const surface = new FakeSurface(true);
    const sampler = createSampler(surface, { ...ALL, raw: true });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1, timeStamp: 1 });
    surface.fire("pointerrawupdate", { pointerId: 1, timeStamp: 2 });
    expect(out.map((g) => g.kind)).toEqual(["start", "move"]);
    expect(out[1]?.samples[0]?.t).toBe(2);
    expect(sampler.stats()).toMatchObject({ rawUpdateUsed: true, moveEvents: 1 });
  });

  it("pointerrawupdate demandé mais absent : pointermove", () => {
    const surface = new FakeSurface(false);
    const sampler = createSampler(surface, { ...ALL, raw: true });
    const out = record(sampler);
    surface.fire("pointerdown", { pointerId: 1 });
    surface.fire("pointermove", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start", "move"]);
    expect(sampler.stats().rawUpdateUsed).toBe(false);
  });

  it("setPointerCapture qui échoue n'empêche pas le geste", () => {
    const surface = new FakeSurface();
    surface.failCapture = true;
    const out = record(createSampler(surface, ALL));
    surface.fire("pointerdown", { pointerId: 1 });
    expect(out.map((g) => g.kind)).toEqual(["start"]);
  });

  it("dispose retire tous les écouteurs et onGesture se désabonne", () => {
    const surface = new FakeSurface();
    const sampler = createSampler(surface, ALL);
    const seen: string[] = [];
    const unsubscribe = sampler.onGesture((g) => {
      seen.push(g.kind);
    });
    expect(surface.listenerCount()).toBe(6);
    unsubscribe();
    surface.fire("pointerdown", { pointerId: 1 });
    expect(seen).toEqual([]);
    sampler.dispose();
    expect(surface.listenerCount()).toBe(0);
  });
});
```

- [ ] **2. Lancer, constater le rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/sampler.test.ts 2>&1 | tail -20`
  → échec attendu : `Failed to resolve import "./sampler"` (ou `FAIL `).

- [ ] **3. Écrire le module.** Créer `apps/web/src/engine/input/sampler.ts` :

```ts
/**
 * Échantillonneur d'entrée (cadrage D29, D39, D18 partiel). TS pur : ni framework, ni Wasm, ni global du DOM
 * à l'exécution. Un geste par pointerId ; pointerup ne pousse aucun point (pression 0 du stylet levé).
 */

export interface InputSample {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly t: number;
}

export type GestureKind = "start" | "move" | "end" | "cancel";

export interface GestureEvent {
  readonly kind: GestureKind;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly eraserButton: boolean;
  readonly samples: readonly InputSample[];
  readonly predicted: readonly InputSample[];
}

export interface SamplerOptions {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly raw: boolean;
}

export interface SamplerStats {
  readonly moveEvents: number;
  readonly samples: number;
  readonly rawUpdateUsed: boolean;
  readonly pointerCancels: number;
  readonly lostCaptures: number;
  readonly touchIgnored: number;
  readonly eraserSeen: boolean;
  readonly gestures: number;
}

export interface PointerLike {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly buttons: number;
  readonly timeStamp: number;
  getCoalescedEvents?(): PointerLike[];
  getPredictedEvents?(): PointerLike[];
  preventDefault(): void;
}

export interface PointerSurface {
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
  setPointerCapture(pointerId: number): void;
  getBoundingClientRect(): { readonly left: number; readonly top: number };
}

export interface Sampler {
  onGesture(cb: (g: GestureEvent) => void): () => void;
  stats(): SamplerStats;
  dispose(): void;
}

/** Bit du bouton gomme du stylet dans `PointerEvent.buttons`. */
const ERASER_BUTTON = 32;
/** Pression donnée à la souris et au doigt (D8). */
const NON_PEN_PRESSURE = 0.5;

interface ActiveGesture {
  readonly pointerType: string;
  readonly left: number;
  readonly top: number;
  eraser: boolean;
}

export function createSampler(target: PointerSurface, opts: SamplerOptions): Sampler {
  const listeners = new Set<(g: GestureEvent) => void>();
  const active = new Map<number, ActiveGesture>();
  const useRaw = opts.raw && "onpointerrawupdate" in target;
  let moveEvents = 0;
  let samples = 0;
  let pointerCancels = 0;
  let lostCaptures = 0;
  let touchIgnored = 0;
  let gestures = 0;
  let eraserSeen = false;

  const emit = (g: GestureEvent): void => {
    for (const cb of listeners) cb(g);
  };

  const penInContact = (): boolean => {
    for (const g of active.values()) if (g.pointerType === "pen") return true;
    return false;
  };

  const toSample = (e: PointerLike, g: ActiveGesture): InputSample => ({
    x: e.clientX - g.left,
    y: e.clientY - g.top,
    pressure: g.pointerType === "pen" ? e.pressure : NON_PEN_PRESSURE,
    tiltX: e.tiltX ?? 0,
    tiltY: e.tiltY ?? 0,
    t: e.timeStamp,
  });

  const onDown = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) return;
    if (e.pointerType === "touch" && penInContact()) {
      touchIgnored++;
      return;
    }
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Pointeur déjà relâché ou inconnu : le geste continue sans capture.
    }
    const rect = target.getBoundingClientRect();
    const g: ActiveGesture = {
      pointerType: e.pointerType,
      left: rect.left,
      top: rect.top,
      eraser: (e.buttons & ERASER_BUTTON) !== 0,
    };
    active.set(e.pointerId, g);
    gestures++;
    samples++;
    if (g.eraser) eraserSeen = true;
    emit({
      kind: "start",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: [toSample(e, g)],
      predicted: [],
    });
  };

  const onMove = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    const g = active.get(e.pointerId);
    if (!g) return;
    if ((e.buttons & ERASER_BUTTON) !== 0) {
      g.eraser = true;
      eraserSeen = true;
    }
    const coalesced =
      opts.coalesced && typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const source = coalesced.length > 0 ? coalesced : [e];
    const predicted =
      opts.predicted && typeof e.getPredictedEvents === "function" ? e.getPredictedEvents() : [];
    moveEvents++;
    samples += source.length;
    emit({
      kind: "move",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: source.map((s) => toSample(s, g)),
      predicted: predicted.map((s) => toSample(s, g)),
    });
  };

  const close = (e: PointerLike, kind: "end" | "cancel"): void => {
    const g = active.get(e.pointerId);
    if (!g) return;
    active.delete(e.pointerId);
    emit({
      kind,
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: [],
      predicted: [],
    });
  };

  const onUp = (ev: Event): void => close(ev as unknown as PointerLike, "end");

  const onCancel = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) pointerCancels++;
    close(e, "cancel");
  };

  const onLostCapture = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) lostCaptures++;
    close(e, "cancel");
  };

  const onContextMenu = (ev: Event): void => {
    ev.preventDefault();
  };

  const bindings: ReadonlyArray<readonly [string, (e: Event) => void]> = [
    ["pointerdown", onDown],
    [useRaw ? "pointerrawupdate" : "pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onCancel],
    ["lostpointercapture", onLostCapture],
    ["contextmenu", onContextMenu],
  ];
  for (const [type, listener] of bindings) target.addEventListener(type, listener);

  return {
    onGesture(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    stats() {
      return {
        moveEvents,
        samples,
        rawUpdateUsed: useRaw,
        pointerCancels,
        lostCaptures,
        touchIgnored,
        eraserSeen,
        gestures,
      };
    },
    dispose() {
      for (const [type, listener] of bindings) target.removeEventListener(type, listener);
      listeners.clear();
      active.clear();
    },
  };
}
```

- [ ] **4. Lancer, constater le vert.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/sampler.test.ts 2>&1 | tail -20`
  → `Tests  18 passed`.

- [ ] **5. Suite complète.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK`
  (fmt, clippy, tests Rust, `tsc --noEmit` qui couvre le nouveau fichier, `toolbar.test.ts`).

- [ ] **6. Commit.** `git -C "$WT" add apps/web/src/engine/input/sampler.ts apps/web/src/engine/input/sampler.test.ts`
  puis `git -C "$WT" commit -m "feat(web): pointer sampler with D39 abnormal-end rules"`.

---

<a id="tache-t2"></a>
### Tâche T2 — Statistiques et rapport `roomboard-stylet/1` (D30)

**Objectif.** Fonctions pures qui transforment les mesures brutes d'un trait en chiffres de D30 (pression, fréquence,
retard interne, durée d'image) et assemblent le rapport JSON `roomboard-stylet/1` lu après l'essai S1.

**Fichiers.** Créer `apps/web/src/engine/input/stats.ts`, `apps/web/src/engine/input/stats.test.ts`. Rien d'autre.

**Interfaces.**
- Consomme : rien (aucun import du projet ; types structurels).
- Produit :
  ```ts
  export const REPORT_FORMAT = "roomboard-stylet/1";
  export const FRAME_BUDGET_MS = 25;
  export function percentile(values: readonly number[], p: number): number | null
  export interface PressureStats { readonly count: number; readonly min: number; readonly max: number; readonly stdDev: number; readonly zeroShare: number; readonly halfShare: number }
  export function pressureStats(values: readonly number[]): PressureStats | null
  export function isConstantPressure(stats: PressureStats | null): boolean
  export function frequencyHz(times: readonly number[]): number | null
  export interface FrameStats { readonly count: number; readonly p50: number; readonly p95: number; readonly overBudgetShare: number }
  export function frameStats(durations: readonly number[], budgetMs?: number): FrameStats | null
  export interface BenchOptions { readonly coalesced: boolean; readonly predicted: boolean; readonly raw: boolean; readonly desynchronized: boolean; readonly inkTrail: boolean }
  export interface StrokeMeasure { readonly pointerType: string; readonly options: BenchOptions; readonly pressures: readonly number[]; readonly tiltX: readonly number[]; readonly tiltY: readonly number[]; readonly moveTimes: readonly number[]; readonly sampleTimes: readonly number[]; readonly latencies: readonly number[]; readonly eraserSeen: boolean; readonly cancelled: boolean }
  export interface Support { readonly coalesced: boolean; readonly predicted: boolean; readonly desynchronized: boolean; readonly inkPresenter: boolean; readonly pointerRawUpdate: boolean; readonly secureContext: boolean }
  export interface Environment { readonly userAgent: string; readonly devicePixelRatio: number; readonly support: Support }
  export interface Counters { readonly pointerCancels: number; readonly lostCaptures: number; readonly touchIgnored: number }
  export interface StrokeSummary { readonly index: number; readonly pointerType: string; readonly options: BenchOptions; readonly points: number; readonly pressure: PressureStats | null; readonly constantPressure: boolean; readonly maxTiltX: number; readonly maxTiltY: number; readonly eraserSeen: boolean; readonly cancelled: boolean; readonly eventsHz: number | null; readonly samplesHz: number | null; readonly latencyP50: number | null; readonly latencyP95: number | null }
  export interface ReportTotals { readonly strokes: number; readonly penStrokes: number; readonly cancelledStrokes: number; readonly penPressure: PressureStats | null; readonly penConstantPressure: boolean; readonly penEventsHzP50: number | null; readonly penSamplesHzP50: number | null; readonly latencyP50: number | null; readonly latencyP95: number | null }
  export interface BenchReport { readonly format: typeof REPORT_FORMAT; readonly createdAt: string; readonly environment: Environment; readonly counters: Counters; readonly frames: FrameStats | null; readonly totals: ReportTotals; readonly strokes: readonly StrokeSummary[] }
  export interface ReportInput { readonly createdAt: string; readonly environment: Environment; readonly counters: Counters; readonly frameDurations: readonly number[]; readonly strokes: readonly StrokeMeasure[] }
  export function summarizeStroke(m: StrokeMeasure, index: number): StrokeSummary
  export function buildReport(input: ReportInput): BenchReport
  ```
  Ces noms de champs sont ceux que la fiche d'essai (T5) décrit : ne pas les renommer.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/stats.test.ts 2>&1 | tail -20` → `Tests  10 passed`
(N ≥ 10), dont `le rapport survit à JSON.stringify`. Puis `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
→ `verifier.sh : OK` (garde verts `toolbar.test.ts` et les tests Rust).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` ; relecteurs au premier plan (`run_in_background: false`) ;
TS strict, `noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Aucun import (ni `sampler.ts`, ni DOM). Aucune valeur `NaN`, `Infinity` ou `undefined` dans le rapport :
une statistique sans données vaut `null`.

**Terminé quand.** 10 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : écart — module nouveau prévu par le cadrage (aucun existant)`.

**Étapes.**

- [ ] **1. Tests (rouge).** Créer `apps/web/src/engine/input/stats.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  REPORT_FORMAT,
  buildReport,
  frameStats,
  frequencyHz,
  isConstantPressure,
  percentile,
  pressureStats,
  summarizeStroke,
  type BenchOptions,
  type Environment,
  type StrokeMeasure,
} from "./stats";

const OPTS: BenchOptions = { coalesced: true, predicted: false, raw: false, desynchronized: true, inkTrail: false };

const ENV: Environment = {
  userAgent: "test",
  devicePixelRatio: 1.5,
  support: {
    coalesced: true,
    predicted: true,
    desynchronized: true,
    inkPresenter: false,
    pointerRawUpdate: true,
    secureContext: true,
  },
};

const measure = (over: Partial<StrokeMeasure> = {}): StrokeMeasure => ({
  pointerType: "pen",
  options: OPTS,
  pressures: [0.2, 0.4, 0.6],
  tiltX: [-30, 10],
  tiltY: [5],
  moveTimes: [0, 10, 20],
  sampleTimes: [0, 5, 10, 15, 20],
  latencies: [4, 6, 8, 30],
  eraserSeen: false,
  cancelled: false,
  ...over,
});

describe("percentile", () => {
  it("rang le plus proche, null sans données", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([], 50)).toBeNull();
  });
});

describe("pressureStats", () => {
  it("min, max, écart type", () => {
    const s = pressureStats([0.2, 0.4, 0.6]);
    expect(s?.min).toBe(0.2);
    expect(s?.max).toBe(0.6);
    expect(s?.stdDev).toBeCloseTo(0.1633, 3);
    expect(s?.zeroShare).toBe(0);
  });

  it("part des valeurs 0 et 0,5", () => {
    expect(pressureStats([0, 0.5, 0.5, 0])).toMatchObject({ count: 4, zeroShare: 0.5, halfShare: 0.5 });
    expect(pressureStats([])).toBeNull();
  });

  it("pression constante détectée", () => {
    expect(isConstantPressure(pressureStats([0, 0.5, 0.5, 0]))).toBe(true);
    expect(isConstantPressure(pressureStats([0.7, 0.7, 0.7]))).toBe(true);
    expect(isConstantPressure(null)).toBe(true);
    expect(isConstantPressure(pressureStats([0.2, 0.4, 0.6]))).toBe(false);
  });
});

describe("frequencyHz", () => {
  it("intervalles réguliers de 10 ms = 100 Hz ; null si moins de deux instants distincts", () => {
    expect(frequencyHz([0, 10, 20, 30])).toBe(100);
    expect(frequencyHz([5])).toBeNull();
    expect(frequencyHz([5, 5])).toBeNull();
  });
});

describe("frameStats", () => {
  it("p50, p95 et part des images au-delà du budget", () => {
    expect(frameStats([16, 16, 16, 40])).toEqual({ count: 4, p50: 16, p95: 40, overBudgetShare: 0.25 });
    expect(frameStats([])).toBeNull();
  });
});

describe("summarizeStroke", () => {
  it("résume un trait au stylet", () => {
    expect(summarizeStroke(measure(), 1)).toMatchObject({
      index: 1,
      pointerType: "pen",
      points: 3,
      constantPressure: false,
      maxTiltX: 30,
      maxTiltY: 5,
      eventsHz: 100,
      samplesHz: 200,
      latencyP50: 6,
      latencyP95: 30,
    });
  });

  it("trait d'un seul point : fréquences et inclinaison neutres", () => {
    const s = summarizeStroke(measure({ pressures: [0.5], moveTimes: [], sampleTimes: [3], tiltX: [], tiltY: [], latencies: [] }), 2);
    expect(s).toMatchObject({ eventsHz: null, samplesHz: null, maxTiltX: 0, latencyP50: null, constantPressure: true });
  });
});

describe("buildReport", () => {
  it("totaux du stylet séparés de la souris", () => {
    const r = buildReport({
      createdAt: "2026-11-16T14:00:00.000Z",
      environment: ENV,
      counters: { pointerCancels: 1, lostCaptures: 0, touchIgnored: 3 },
      frameDurations: [16, 17],
      strokes: [measure(), measure({ pointerType: "mouse", pressures: [0.5, 0.5], latencies: [100], cancelled: true })],
    });
    expect(r.format).toBe(REPORT_FORMAT);
    expect(r.strokes.map((s) => s.index)).toEqual([1, 2]);
    expect(r.totals).toMatchObject({
      strokes: 2,
      penStrokes: 1,
      cancelledStrokes: 1,
      penConstantPressure: false,
      penEventsHzP50: 100,
      penSamplesHzP50: 200,
      latencyP95: 100,
    });
    expect(r.totals.penPressure?.count).toBe(3);
    expect(r.frames?.count).toBe(2);
  });

  it("le rapport survit à JSON.stringify", () => {
    const r = buildReport({
      createdAt: "2026-11-16T14:00:00.000Z",
      environment: ENV,
      counters: { pointerCancels: 0, lostCaptures: 0, touchIgnored: 0 },
      frameDurations: [],
      strokes: [measure({ pressures: [], moveTimes: [], sampleTimes: [], latencies: [], tiltX: [], tiltY: [] })],
    });
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    expect(r.totals.penPressure).toBeNull();
    expect(r.frames).toBeNull();
  });
});
```

- [ ] **2. Rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/stats.test.ts 2>&1 | tail -20` → `Failed to resolve import "./stats"`.

- [ ] **3. Module.** Créer `apps/web/src/engine/input/stats.ts` :

```ts
/** Statistiques du banc du stylet (cadrage D30) et rapport `roomboard-stylet/1`. Fonctions pures. */

export const REPORT_FORMAT = "roomboard-stylet/1";
/** Seuil d'image longue (journal du prototype ActCraft, D30). */
export const FRAME_BUDGET_MS = 25;

/** Percentile au rang le plus proche ; `null` sans données. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1] ?? null;
}

export interface PressureStats {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly stdDev: number;
  readonly zeroShare: number;
  readonly halfShare: number;
}

export function pressureStats(values: readonly number[]): PressureStats | null {
  const n = values.length;
  if (n === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let zero = 0;
  let half = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    if (v === 0) zero++;
    if (v === 0.5) half++;
  }
  const mean = sum / n;
  let variance = 0;
  for (const v of values) variance += (v - mean) ** 2;
  return { count: n, min, max, stdDev: Math.sqrt(variance / n), zeroShare: zero / n, halfShare: half / n };
}

/** Vrai si la pression n'apporte rien : seulement 0 et 0,5 (D8), ou quasi fixe, ou absente. */
export function isConstantPressure(stats: PressureStats | null): boolean {
  if (stats === null) return true;
  return stats.zeroShare + stats.halfShare >= 0.99 || stats.stdDev < 0.005;
}

/** Fréquence moyenne (Hz) d'une suite d'instants en ms ; `null` sous deux instants ou sur une durée nulle. */
export function frequencyHz(times: readonly number[]): number | null {
  const first = times[0];
  const last = times[times.length - 1];
  if (times.length < 2 || first === undefined || last === undefined) return null;
  const span = last - first;
  if (span <= 0) return null;
  return ((times.length - 1) * 1000) / span;
}

export interface FrameStats {
  readonly count: number;
  readonly p50: number;
  readonly p95: number;
  readonly overBudgetShare: number;
}

export function frameStats(durations: readonly number[], budgetMs: number = FRAME_BUDGET_MS): FrameStats | null {
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);
  if (p50 === null || p95 === null) return null;
  const over = durations.filter((d) => d > budgetMs).length;
  return { count: durations.length, p50, p95, overBudgetShare: over / durations.length };
}

export interface BenchOptions {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly raw: boolean;
  readonly desynchronized: boolean;
  readonly inkTrail: boolean;
}

export interface StrokeMeasure {
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly pressures: readonly number[];
  readonly tiltX: readonly number[];
  readonly tiltY: readonly number[];
  /** instant du dernier échantillon de chaque message `move` (fréquence des événements) */
  readonly moveTimes: readonly number[];
  /** instant de chaque échantillon (fréquence des échantillons fusionnés) */
  readonly sampleTimes: readonly number[];
  /** retard interne par échantillon dessiné : `performance.now()` au rAF − `timeStamp` (ms) */
  readonly latencies: readonly number[];
  readonly eraserSeen: boolean;
  readonly cancelled: boolean;
}

export interface Support {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly desynchronized: boolean;
  readonly inkPresenter: boolean;
  readonly pointerRawUpdate: boolean;
  readonly secureContext: boolean;
}

export interface Environment {
  readonly userAgent: string;
  readonly devicePixelRatio: number;
  readonly support: Support;
}

export interface Counters {
  readonly pointerCancels: number;
  readonly lostCaptures: number;
  readonly touchIgnored: number;
}

export interface StrokeSummary {
  readonly index: number;
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly points: number;
  readonly pressure: PressureStats | null;
  readonly constantPressure: boolean;
  readonly maxTiltX: number;
  readonly maxTiltY: number;
  readonly eraserSeen: boolean;
  readonly cancelled: boolean;
  readonly eventsHz: number | null;
  readonly samplesHz: number | null;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
}

export interface ReportTotals {
  readonly strokes: number;
  readonly penStrokes: number;
  readonly cancelledStrokes: number;
  readonly penPressure: PressureStats | null;
  readonly penConstantPressure: boolean;
  readonly penEventsHzP50: number | null;
  readonly penSamplesHzP50: number | null;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
}

export interface BenchReport {
  readonly format: typeof REPORT_FORMAT;
  readonly createdAt: string;
  readonly environment: Environment;
  readonly counters: Counters;
  readonly frames: FrameStats | null;
  readonly totals: ReportTotals;
  readonly strokes: readonly StrokeSummary[];
}

export interface ReportInput {
  readonly createdAt: string;
  readonly environment: Environment;
  readonly counters: Counters;
  readonly frameDurations: readonly number[];
  readonly strokes: readonly StrokeMeasure[];
}

const maxAbs = (values: readonly number[]): number => values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

export function summarizeStroke(m: StrokeMeasure, index: number): StrokeSummary {
  const pressure = pressureStats(m.pressures);
  return {
    index,
    pointerType: m.pointerType,
    options: m.options,
    points: m.pressures.length,
    pressure,
    constantPressure: isConstantPressure(pressure),
    maxTiltX: maxAbs(m.tiltX),
    maxTiltY: maxAbs(m.tiltY),
    eraserSeen: m.eraserSeen,
    cancelled: m.cancelled,
    eventsHz: frequencyHz(m.moveTimes),
    samplesHz: frequencyHz(m.sampleTimes),
    latencyP50: percentile(m.latencies, 50),
    latencyP95: percentile(m.latencies, 95),
  };
}

const notNull = (v: number | null): v is number => v !== null;

export function buildReport(input: ReportInput): BenchReport {
  const strokes = input.strokes.map((m, i) => summarizeStroke(m, i + 1));
  const penMeasures = input.strokes.filter((m) => m.pointerType === "pen");
  const penSummaries = strokes.filter((s) => s.pointerType === "pen");
  const penPressure = pressureStats(penMeasures.flatMap((m) => m.pressures));
  const latencies = input.strokes.flatMap((m) => m.latencies);
  return {
    format: REPORT_FORMAT,
    createdAt: input.createdAt,
    environment: input.environment,
    counters: input.counters,
    frames: frameStats(input.frameDurations),
    totals: {
      strokes: strokes.length,
      penStrokes: penSummaries.length,
      cancelledStrokes: strokes.filter((s) => s.cancelled).length,
      penPressure,
      penConstantPressure: isConstantPressure(penPressure),
      penEventsHzP50: percentile(penSummaries.map((s) => s.eventsHz).filter(notNull), 50),
      penSamplesHzP50: percentile(penSummaries.map((s) => s.samplesHz).filter(notNull), 50),
      latencyP50: percentile(latencies, 50),
      latencyP95: percentile(latencies, 95),
    },
    strokes,
  };
}
```

  Note : `format: typeof REPORT_FORMAT` exige `export const REPORT_FORMAT = "roomboard-stylet/1";` sans annotation
  (type littéral) ; ne pas écrire `: string`.

- [ ] **4. Vert.** `cd "$WT/apps/web" && pnpm exec vitest run src/engine/input/stats.test.ts 2>&1 | tail -20` → `Tests  10 passed`.

- [ ] **5. Suite complète.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK`.

- [ ] **6. Commit.** `git -C "$WT" add apps/web/src/engine/input/stats.ts apps/web/src/engine/input/stats.test.ts`
  puis `git -C "$WT" commit -m "feat(web): stylus bench statistics and roomboard-stylet/1 report"`.

---

<a id="tache-t3"></a>
### Tâche T3 — Polyligne et boucle d'image du banc

**Objectif.** Le dessin du banc (polyligne à largeur variable assumée, D29 : segments `lineTo` dont l'épaisseur suit
la pression, queue prédite provisoire) et la boucle `requestAnimationFrame` qui mesure les durées d'image (D30), tous
deux testables sans navigateur.

**Fichiers.** Créer `apps/web/src/proto/polyline.ts`, `apps/web/src/proto/polyline.test.ts`,
`apps/web/src/proto/frame-loop.ts`, `apps/web/src/proto/frame-loop.test.ts`.

**Interfaces.**
- Consomme : rien du projet (type structurel `InkPointLike`, compatible avec `InputSample` de T1).
- Produit :
  ```ts
  // polyline.ts
  export interface InkPointLike { readonly x: number; readonly y: number; readonly pressure: number }
  export interface StrokeCtx { lineWidth: number; lineCap: CanvasLineCap; lineJoin: CanvasLineJoin; strokeStyle: string | CanvasGradient | CanvasPattern; globalAlpha: number; beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; stroke(): void }
  export function widthFor(pressure: number, base: number): number
  export function drawSegments(ctx: StrokeCtx, points: readonly InkPointLike[], from: number, base: number, color: string): number
  export function drawPredicted(ctx: StrokeCtx, last: InkPointLike, predicted: readonly InkPointLike[], base: number, color: string): void
  // frame-loop.ts
  export interface FrameLoopDeps { requestFrame(cb: (ts: number) => void): number; cancelFrame(id: number): void; now(): number }
  export interface FrameLoop { start(): void; stop(): void; running(): boolean; durations(): number[]; clear(): void }
  export function createFrameLoop(deps: FrameLoopDeps, onFrame: (now: number) => void): FrameLoop
  ```
  `CanvasRenderingContext2D` satisfait `StrokeCtx`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/proto/polyline.test.ts src/proto/frame-loop.test.ts 2>&1 | tail -20`
→ `Tests  12 passed` (N ≥ 12), dont `aucune durée mesurée à travers une pause`. Puis
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK`.

**Preuve visuelle.** Aucune ici (rendu réel vu à l'essai S1, via T6).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` ; relecteurs au premier plan (`run_in_background: false`) ;
TS strict, `noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Pas de lissage ni de contour `freedraw` (D29 : l'essai mesure l'entrée et l'affichage, pas le lissage).
Aucun global du DOM à l'exécution (`requestAnimationFrame`, `performance` passent par `FrameLoopDeps`).

**Terminé quand.** 12 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : écart — banc jetable, aucun module existant`.

**Étapes.**

- [ ] **1. Tests de la polyligne (rouge).** Créer `apps/web/src/proto/polyline.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { drawPredicted, drawSegments, widthFor, type StrokeCtx } from "./polyline";

class FakeCtx implements StrokeCtx {
  lineWidth = 1;
  lineCap: CanvasLineCap = "butt";
  lineJoin: CanvasLineJoin = "miter";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000";
  globalAlpha = 1;
  readonly calls: string[] = [];
  readonly widths: number[] = [];
  readonly alphas: number[] = [];
  beginPath(): void {
    this.calls.push("begin");
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`M${x},${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`L${x},${y}`);
  }
  stroke(): void {
    this.calls.push("stroke");
    this.widths.push(this.lineWidth);
    this.alphas.push(this.globalAlpha);
  }
}

const p = (x: number, pressure: number) => ({ x, y: 0, pressure });

describe("widthFor", () => {
  it("suit la pression, bornée entre 0 et 1", () => {
    expect(widthFor(0, 4)).toBeCloseTo(0.8);
    expect(widthFor(0.5, 4)).toBeCloseTo(4);
    expect(widthFor(1, 4)).toBeCloseTo(7.2);
    expect(widthFor(2, 4)).toBeCloseTo(7.2);
    expect(widthFor(-1, 4)).toBeCloseTo(0.8);
  });
});

describe("drawSegments", () => {
  it("premier passage : un segment par paire, largeur = pression moyenne", () => {
    const ctx = new FakeCtx();
    const drawn = drawSegments(ctx, [p(0, 0), p(10, 1), p(20, 0.5)], 0, 4, "#111");
    expect(drawn).toBe(3);
    expect(ctx.calls).toEqual(["begin", "M0,0", "L10,0", "stroke", "begin", "M10,0", "L20,0", "stroke"]);
    expect(ctx.widths[0]).toBeCloseTo(4);
    expect(ctx.widths[1]).toBeCloseTo(widthFor(0.75, 4));
    expect(ctx.strokeStyle).toBe("#111");
    expect(ctx.lineCap).toBe("round");
  });

  it("passage suivant : seulement les nouveaux segments, raccordés au dernier point dessiné", () => {
    const ctx = new FakeCtx();
    const drawn = drawSegments(ctx, [p(0, 0.5), p(10, 0.5), p(20, 0.5), p(30, 0.5), p(40, 0.5)], 3, 4, "#111");
    expect(drawn).toBe(5);
    expect(ctx.calls).toEqual(["begin", "M20,0", "L30,0", "stroke", "begin", "M30,0", "L40,0", "stroke"]);
  });

  it("un seul point : un point rond", () => {
    const ctx = new FakeCtx();
    expect(drawSegments(ctx, [p(5, 0.5)], 0, 4, "#111")).toBe(1);
    expect(ctx.calls).toEqual(["begin", "M5,0", "L5,0", "stroke"]);
  });

  it("rien de neuf : aucun appel", () => {
    const ctx = new FakeCtx();
    expect(drawSegments(ctx, [p(0, 0.5), p(10, 0.5)], 2, 4, "#111")).toBe(2);
    expect(ctx.calls).toEqual([]);
  });
});

describe("drawPredicted", () => {
  it("queue provisoire semi-transparente depuis le dernier point", () => {
    const ctx = new FakeCtx();
    drawPredicted(ctx, p(10, 0.5), [p(12, 0.5), p(14, 0.5)], 4, "#111");
    expect(ctx.calls).toEqual(["begin", "M10,0", "L12,0", "L14,0", "stroke"]);
    expect(ctx.alphas).toEqual([0.5]);
    expect(ctx.globalAlpha).toBe(1);
  });

  it("aucun point prédit : aucun appel", () => {
    const ctx = new FakeCtx();
    drawPredicted(ctx, p(10, 0.5), [], 4, "#111");
    expect(ctx.calls).toEqual([]);
  });
});
```

- [ ] **2. Tests de la boucle (rouge).** Créer `apps/web/src/proto/frame-loop.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createFrameLoop, type FrameLoopDeps } from "./frame-loop";

function fakeClock() {
  let t = 0;
  let next = 1;
  const queue = new Map<number, (ts: number) => void>();
  const deps: FrameLoopDeps = {
    requestFrame: (cb) => {
      const id = next++;
      queue.set(id, cb);
      return id;
    },
    cancelFrame: (id) => {
      queue.delete(id);
    },
    now: () => t,
  };
  return {
    deps,
    advance(ms: number): void {
      t += ms;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) cb(t);
    },
    pending: () => queue.size,
  };
}

describe("createFrameLoop", () => {
  it("appelle onFrame à chaque image et mesure les intervalles", () => {
    const clock = fakeClock();
    const seen: number[] = [];
    const loop = createFrameLoop(clock.deps, (now) => seen.push(now));
    loop.start();
    clock.advance(16);
    clock.advance(16);
    clock.advance(20);
    expect(seen).toEqual([16, 32, 52]);
    expect(loop.durations()).toEqual([16, 20]);
  });

  it("start deux fois : une seule image en attente", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    loop.start();
    expect(clock.pending()).toBe(1);
    expect(loop.running()).toBe(true);
  });

  it("stop annule l'image en attente", () => {
    const clock = fakeClock();
    const seen: number[] = [];
    const loop = createFrameLoop(clock.deps, (now) => seen.push(now));
    loop.start();
    loop.stop();
    clock.advance(16);
    expect(seen).toEqual([]);
    expect(clock.pending()).toBe(0);
    expect(loop.running()).toBe(false);
  });

  it("aucune durée mesurée à travers une pause", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    clock.advance(16);
    loop.stop();
    clock.advance(500);
    loop.start();
    clock.advance(16);
    expect(loop.durations()).toEqual([]);
    clock.advance(18);
    expect(loop.durations()).toEqual([18]);
  });

  it("clear vide les durées mesurées", () => {
    const clock = fakeClock();
    const loop = createFrameLoop(clock.deps, () => undefined);
    loop.start();
    clock.advance(16);
    clock.advance(16);
    loop.clear();
    expect(loop.durations()).toEqual([]);
  });
});
```

- [ ] **3. Rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/proto/polyline.test.ts src/proto/frame-loop.test.ts 2>&1 | tail -20` → imports introuvables.

- [ ] **4. Modules.** Créer `apps/web/src/proto/polyline.ts` :

```ts
/** Dessin du banc du stylet : polyligne à largeur variable assumée (cadrage D29), pas le contour du produit. */

export interface InkPointLike {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

export interface StrokeCtx {
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

/** Épaisseur pour une pression dans [0, 1] : de 0,2 × base à 1,8 × base ; 0,5 donne la base. */
export function widthFor(pressure: number, base: number): number {
  const p = Math.min(1, Math.max(0, pressure));
  return base * (0.2 + 1.6 * p);
}

/**
 * Dessine les segments qui aboutissent aux points d'indice ≥ `from` (chacun part du point précédent).
 * Rend le nombre de points désormais dessinés (`points.length`).
 */
export function drawSegments(
  ctx: StrokeCtx,
  points: readonly InkPointLike[],
  from: number,
  base: number,
  color: string,
): number {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 1;
  const only = points[0];
  if (points.length === 1 && from === 0 && only) {
    ctx.lineWidth = widthFor(only.pressure, base);
    ctx.beginPath();
    ctx.moveTo(only.x, only.y);
    ctx.lineTo(only.x, only.y);
    ctx.stroke();
    return 1;
  }
  for (let i = Math.max(1, from); i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    ctx.lineWidth = widthFor((a.pressure + b.pressure) / 2, base);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  return points.length;
}

/** Queue prédite, provisoire : semi-transparente, jamais enregistrée (D20). */
export function drawPredicted(
  ctx: StrokeCtx,
  last: InkPointLike,
  predicted: readonly InkPointLike[],
  base: number,
  color: string,
): void {
  if (predicted.length === 0) return;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = widthFor(last.pressure, base);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  for (const q of predicted) ctx.lineTo(q.x, q.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
```

  Créer `apps/web/src/proto/frame-loop.ts` :

```ts
/** Boucle d'image du banc : un rappel par image tant qu'elle tourne, intervalles mesurés (D30). */

export interface FrameLoopDeps {
  requestFrame(cb: (ts: number) => void): number;
  cancelFrame(id: number): void;
  now(): number;
}

export interface FrameLoop {
  start(): void;
  stop(): void;
  running(): boolean;
  durations(): number[];
  clear(): void;
}

export function createFrameLoop(deps: FrameLoopDeps, onFrame: (now: number) => void): FrameLoop {
  let id: number | null = null;
  let last: number | null = null;
  let measured: number[] = [];

  const tick = (): void => {
    const now = deps.now();
    if (last !== null) measured.push(now - last);
    last = now;
    id = deps.requestFrame(tick);
    onFrame(now);
  };

  return {
    start() {
      if (id !== null) return;
      last = null;
      id = deps.requestFrame(tick);
    },
    stop() {
      if (id !== null) deps.cancelFrame(id);
      id = null;
      last = null;
    },
    running: () => id !== null,
    durations: () => measured.slice(),
    clear() {
      measured = [];
    },
  };
}
```

  Note : `requestFrame` est appelé avant `onFrame` pour que `onFrame` puisse arrêter la boucle (`stop()` annule alors
  l'image déjà demandée).

- [ ] **5. Vert.** `cd "$WT/apps/web" && pnpm exec vitest run src/proto/polyline.test.ts src/proto/frame-loop.test.ts 2>&1 | tail -20` → `Tests  12 passed`.

- [ ] **6. Suite complète.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK`.

- [ ] **7. Commit.** `git -C "$WT" add apps/web/src/proto/polyline.ts apps/web/src/proto/polyline.test.ts apps/web/src/proto/frame-loop.ts apps/web/src/proto/frame-loop.test.ts`
  puis `git -C "$WT" commit -m "feat(web): stylus bench polyline and frame loop"`.

---

<a id="tache-t4"></a>
### Tâche T4 — Contrôle de version `wasm-bindgen` dans `verifier.sh` (D9)

**Objectif.** `scripts/verifier.sh` s'arrête avec un message clair (et la commande d'installation) si la CLI
`wasm-bindgen` n'a pas la version de `wasm-bindgen` verrouillée dans `Cargo.lock`. Effet de bord du cadrage couvert :
« `verifier.sh` s'arrête si la CLI `wasm-bindgen` diffère de `Cargo.lock` ».

**Fichiers.** Créer `scripts/controle-wasm-bindgen.sh`, `scripts/tests/controle-wasm-bindgen.test.sh` ; modifier
`scripts/verifier.sh` (lignes 13-16 du squelette : avant le build Wasm).

**Interfaces.**
- Consomme : `Cargo.lock` (bloc `name = "wasm-bindgen"` suivi de `version = "…"`), sortie de `wasm-bindgen --version`
  (`wasm-bindgen 0.2.130`).
- Produit : `scripts/controle-wasm-bindgen.sh [chemin/Cargo.lock]` — code 0 et
  `controle-wasm-bindgen : <v> (identique à Cargo.lock)` si égales ; code 1 et message sur stderr contenant
  `cargo install wasm-bindgen-cli --version <attendue> --locked` sinon (versions différentes, CLI absente,
  `wasm-bindgen` absent du verrou).
- Réutilise : `scripts/verifier.sh` (étendu, cadrage carte d'impact `scripts/verifier.sh:13-16`).

**Test et commande bornée.**
`cd "$WT" && bash scripts/tests/controle-wasm-bindgen.test.sh 2>&1 | tail -10` → dernière ligne
`controle-wasm-bindgen.test.sh : 4 cas OK`. Puis `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
→ `controle-wasm-bindgen : 0.2.130 (identique à Cargo.lock)` puis `verifier.sh : OK` (garde verts tous les tests du
squelette).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun dans cette tâche) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` ; relecteurs au premier plan (`run_in_background: false`).

**Interdits.** Ne pas installer ni mettre à jour `wasm-bindgen-cli` ; ne pas toucher `Cargo.toml` ni `Cargo.lock` ;
ne rien changer d'autre dans `verifier.sh` (T6 y ajoutera le build du prototype).

**Terminé quand.** 4 cas OK, `verifier.sh : OK`, rapport avec `Réutilisation : appelé scripts/verifier.sh (étendu)`.

**Étapes.**

- [ ] **1. Test (rouge).** Créer `scripts/tests/controle-wasm-bindgen.test.sh` :

```bash
#!/usr/bin/env bash
# Test du contrôle de version wasm-bindgen (cadrage D9). Faux Cargo.lock et fausse CLI dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-wasm-bindgen.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/vide"

cat > "$tmp/Cargo.lock" <<'EOF'
[[package]]
name = "wasm-bindgen"
version = "0.2.130"
source = "registry+https://github.com/rust-lang/crates.io-index"

[[package]]
name = "wasm-bindgen-backend"
version = "0.2.999"
EOF
printf '[[package]]\nname = "yrs"\nversion = "0.28.1"\n' > "$tmp/sans.lock"

fausse_cli() {
  printf '#!/usr/bin/env bash\necho "wasm-bindgen %s"\n' "$1" > "$tmp/bin/wasm-bindgen"
  chmod +x "$tmp/bin/wasm-bindgen"
}

echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

# 1. versions identiques → 0
fausse_cli 0.2.130
PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1 || echec "versions identiques refusées"
grep -q "0.2.130 (identique à Cargo.lock)" "$tmp/out" || echec "message de réussite absent"
cas=$((cas + 1))

# 2. versions différentes → 1, commande d'installation dans le message
fausse_cli 0.2.100
if PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1; then echec "versions différentes acceptées"; fi
grep -q "cargo install wasm-bindgen-cli --version 0.2.130 --locked" "$tmp/out" || echec "commande d'installation absente"
grep -q "0.2.100" "$tmp/out" || echec "version trouvée absente du message"
cas=$((cas + 1))

# 3. wasm-bindgen absent du verrou → 1
fausse_cli 0.2.130
if PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/sans.lock" > "$tmp/out" 2>&1; then echec "verrou sans wasm-bindgen accepté"; fi
grep -q "absent de" "$tmp/out" || echec "message « absent de » manquant"
cas=$((cas + 1))

# 4. CLI absente → 1
if PATH="$tmp/vide:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1; then
  if command -v wasm-bindgen > /dev/null 2>&1 && [ "$(PATH="$tmp/vide:/usr/bin:/bin" command -v wasm-bindgen || true)" != "" ]; then
    echo "note : une CLI wasm-bindgen existe dans /usr/bin ou /bin, cas 4 non jouable" >&2
  else
    echec "CLI absente acceptée"
  fi
else
  grep -q "cargo install wasm-bindgen-cli --version 0.2.130 --locked" "$tmp/out" || echec "commande d'installation absente (CLI absente)"
fi
cas=$((cas + 1))

echo "controle-wasm-bindgen.test.sh : $cas cas OK"
```

- [ ] **2. Rouge.** `cd "$WT" && bash scripts/tests/controle-wasm-bindgen.test.sh 2>&1 | tail -10` → `ÉCHEC : versions identiques refusées` (script absent).

- [ ] **3. Script.** Créer `scripts/controle-wasm-bindgen.sh` puis `chmod +x scripts/controle-wasm-bindgen.sh scripts/tests/controle-wasm-bindgen.test.sh` :

```bash
#!/usr/bin/env bash
# Compare la CLI wasm-bindgen à la version de wasm-bindgen verrouillée dans Cargo.lock (cadrage D9).
# Usage : scripts/controle-wasm-bindgen.sh [chemin/Cargo.lock]
set -euo pipefail
verrou="${1:-Cargo.lock}"

attendue="$(awk '$0 == "name = \"wasm-bindgen\"" { getline; gsub(/version = |"/, ""); print; exit }' "$verrou")"
if [ -z "$attendue" ]; then
  echo "controle-wasm-bindgen : wasm-bindgen absent de $verrou" >&2
  exit 1
fi

installer="cargo install wasm-bindgen-cli --version $attendue --locked"
if ! command -v wasm-bindgen > /dev/null 2>&1; then
  echo "controle-wasm-bindgen : CLI wasm-bindgen introuvable (attendue $attendue). Installer : $installer" >&2
  exit 1
fi

trouvee="$(wasm-bindgen --version | awk '{ print $2 }')"
if [ "$trouvee" != "$attendue" ]; then
  echo "controle-wasm-bindgen : CLI wasm-bindgen $trouvee, Cargo.lock $attendue. Installer : $installer" >&2
  exit 1
fi
echo "controle-wasm-bindgen : $trouvee (identique à Cargo.lock)"
```

- [ ] **4. Vert.** `cd "$WT" && bash scripts/tests/controle-wasm-bindgen.test.sh 2>&1 | tail -10` → `controle-wasm-bindgen.test.sh : 4 cas OK`.

- [ ] **5. Brancher dans `verifier.sh`.** Dans `scripts/verifier.sh`, remplacer :

```bash
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release
```

  par :

```bash
bash scripts/tests/controle-wasm-bindgen.test.sh
bash scripts/controle-wasm-bindgen.sh Cargo.lock
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release
```

- [ ] **6. Suite complète.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` →
  `controle-wasm-bindgen : 0.2.130 (identique à Cargo.lock)` et `verifier.sh : OK`.

- [ ] **7. Commit.** `git -C "$WT" add scripts/controle-wasm-bindgen.sh scripts/tests/controle-wasm-bindgen.test.sh scripts/verifier.sh`
  puis `git -C "$WT" commit -m "build: check wasm-bindgen CLI matches Cargo.lock in verifier.sh"`.

---

<a id="tache-t5"></a>
### Tâche T5 — Fiche d'essai ENI

**Objectif.** La fiche que Jérôme suit sur l'ENI cet après-midi (S1) : protocole, lecture du panneau et du JSON
`roomboard-stylet/1`, repères de D31, tableau « si échec » de DA9.

**Fichiers.** Créer `docs/essais/eni-stylet.md`. Rien d'autre.

**Interfaces.**
- Consomme : noms de champs du rapport fixés par T2 (`format`, `environment.support.*`, `counters.*`, `frames.*`,
  `totals.*`, `strokes[].*`) et libellés de la page fixés par T6 (bascules « fusionnés », « prédits »,
  « pointerrawupdate », « desynchronized », « traînée déléguée (navigator.ink) » ; boutons « Effacer »,
  « Remettre les mesures à zéro », « Télécharger le JSON », « Copier le JSON »).
- Produit : la fiche.

**Test et commande bornée.**
`cd "$WT" && grep -c "^## \(Avant l'essai\|Protocole\|Lire le panneau et le JSON\|Repères\|Si l'essai échoue\)$" docs/essais/eni-stylet.md`
→ `5`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` (non requis pour un document seul) ; relecteurs au premier plan (`run_in_background: false`).

**Interdits.** Ne pas faire des repères une porte (D31 : le ressenti de Jérôme décide). Aucun autre fichier.

**Terminé quand.** Le contrôle `grep` rend `5`, rapport avec `Réutilisation : écart — document neuf`.

**Étapes.**

- [ ] **1. Écrire la fiche.** Créer `docs/essais/eni-stylet.md` avec exactement ce contenu :

````markdown
# Essai ENI — stylet (S1, lot 1 du socle)

Fichier à ouvrir : `proto-stylet.html` (produit par `pnpm --filter @roomboard/web build:proto`, dossier
`apps/web/dist-proto/`). Fichier unique, sans réseau : copier sur une clé ou le bureau de l'ENI et l'ouvrir par
double-clic dans Edge ou Chrome.

Ce qui est mesuré : l'entrée (Pointer Events) et l'affichage dans un navigateur. Pas le lissage du produit (le
prototype dessine une polyligne dont l'épaisseur suit la pression), pas la WebView2 de la future application (mesure
par la file du PC plus tard). Le retard mesuré est interne (horodatage de l'événement → image dessinée) : ni le
numériseur ni l'écran ne sont comptés.

## Avant l'essai

1. Noter le modèle de l'ENI, le stylet, le navigateur et sa version.
2. Ouvrir le fichier ; la première ligne du panneau dit ce que le navigateur prend en charge (fusionnés, prédits,
   `desynchronized`, `navigator.ink`, `pointerrawupdate`, contexte sûr, `dpr`). Une bascule non prise en charge est
   grisée.
3. Bascules par défaut : fusionnés, prédits, `desynchronized` actifs ; `pointerrawupdate` et traînée déléguée coupés.

## Protocole

Cliquer « Remettre les mesures à zéro » avant chaque série. Chaque trait garde dans le JSON les bascules en vigueur :
une série par réglage suffit, sans exporter entre deux.

1. **Stylet, réglage par défaut** : écrire « Bonjour la classe » en écriture normale, la paume posée sur l'écran.
2. **Stylet, prédiction coupée** : décocher « prédits », réécrire la même phrase. Recocher.
3. **Stylet, `pointerrawupdate`** (si non grisé) : cocher, réécrire, décocher.
4. **Stylet, traînée déléguée** (si non grisée) : cocher « traînée déléguée (navigator.ink) », réécrire, décocher.
5. **Pression** : tracer trois traits, léger, moyen, appuyé.
6. **Appui long** : tenir le stylet appuyé 2 s sans bouger. Attendu : aucun menu.
7. **Bouton gomme** (si le stylet en a un) : tracer en le tenant. Attendu : trait gris, « gomme oui ».
8. **Doigt** : écrire « Bonjour » au doigt.
9. **Paume** : poser la paume avant le stylet, puis écrire. Noter si la paume laisse une marque (règle du lot 3).
10. Cliquer « Télécharger le JSON » (ou « Copier le JSON », ou copier le texte de la zone en bas à droite) et le
    rapporter.

Verdict, en une phrase de Jérôme : **le trait suit-il la pointe ?** Noter aussi : pression ressentie, coupures, traits
parasites de la paume.

## Lire le panneau et le JSON

| dans le JSON (`roomboard-stylet/1`) | sens |
|---|---|
| `environment.userAgent`, `environment.devicePixelRatio` | navigateur et densité de l'écran |
| `environment.support.coalesced` / `predicted` / `desynchronized` / `inkPresenter` / `pointerRawUpdate` / `secureContext` | prise en charge détectée |
| `counters.pointerCancels` | traits coupés par le système (paume, geste) |
| `counters.lostCaptures` | capture du pointeur perdue pendant un trait |
| `counters.touchIgnored` | contacts tactiles ignorés pendant que le stylet touchait (paume) |
| `frames.p50`, `frames.p95`, `frames.overBudgetShare` | durée des images pendant le tracé (ms) ; part des images > 25 ms |
| `totals.penPressure.min` / `max` / `stdDev` | pression du stylet sur tous ses traits |
| `totals.penConstantPressure` | `true` = pression absente ou figée (0 / 0,5) |
| `totals.penEventsHzP50`, `totals.penSamplesHzP50` | fréquence des événements et des échantillons fusionnés (Hz) |
| `totals.latencyP50`, `totals.latencyP95` | retard interne (ms) |
| `strokes[].options` | bascules en vigueur pour ce trait (comparer prédiction coupée / active) |
| `strokes[].pointerType`, `points`, `maxTiltX`, `maxTiltY`, `eraserSeen`, `cancelled` | type de pointeur, points, inclinaison, bouton gomme, trait interrompu |
| `strokes[].eventsHz`, `samplesHz`, `latencyP50`, `latencyP95` | les mêmes mesures, trait par trait |

## Repères

Repères, pas une porte : le ressenti de Jérôme décide (cadrage D31).

- pression qui varie au stylet (`totals.penConstantPressure` = `false`) ;
- fréquence ≥ 100 Hz au stylet avec fusionnés (`totals.penSamplesHzP50`) ;
- retard interne p95 ≤ 17 ms (`totals.latencyP95`) ;
- moins de 2 % d'images > 25 ms (`frames.overBudgetShare` < 0,02).

## Si l'essai échoue

Échelle du cadrage (DA9), du moins coûteux au plus coûteux ; chaque échelon se mesure avec ce même fichier avant de
passer au suivant.

| constat | essai à faire tout de suite | suite dans le chantier |
|---|---|---|
| retard ou saccades | vérifier fusionnés + prédits + `desynchronized` actifs, essayer `pointerrawupdate` | rien si ça suffit (échelon 1) |
| prédits grisés (WebKit) et retard visible | — | prédiction linéaire en TS au lot 3 (échelon 2) |
| retard visible sous Chromium Windows malgré l'échelon 1 | cocher la traînée déléguée | traînée déléguée dans le moteur au lot 3 (échelon 3) |
| images > 25 ms fréquentes | noter `frames.p95` | canvas d'interaction en WebGL2 au lot 3 (échelon 4) |
| bon dans Edge, mauvais dans l'application plus tard | — | réglages WebView2 par la coque au lot 5 (échelon 5) |
| rien ne suffit | — | **décision de Jérôme** : encre vive native dans la coque (échelon 6), contraire à la règle « le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif » |
| pression figée (`penConstantPressure` = `true`) | essayer un autre navigateur, noter le pilote du stylet | rien ne casse : trait à largeur constante (D8) |
| appui long qui ouvre un menu, paume qui coupe le trait | noter le cas | réglages de D39 / D18 au lot 3 |
````

- [ ] **2. Contrôle.** `cd "$WT" && grep -c "^## \(Avant l'essai\|Protocole\|Lire le panneau et le JSON\|Repères\|Si l'essai échoue\)$" docs/essais/eni-stylet.md` → `5`.

- [ ] **3. Commit.** `git -C "$WT" add docs/essais/eni-stylet.md` puis `git -C "$WT" commit -m "docs: ENI stylus trial sheet (S1)"`.

---

<a id="tache-t6"></a>
### Tâche T6 — Enregistreur et page prototype en fichier unique

**Objectif.** Assembler le banc : l'enregistreur (traits vifs, mesures par trait), la page `proto-stylet.html` et son
câblage DOM, la configuration Vite séparée qui produit un seul fichier HTML autonome, et le contrôle de ce fichier dans
`verifier.sh`. Livrable remis à l'orchestrateur : `apps/web/dist-proto/proto-stylet.html` (S1).

**Fichiers.** Créer `apps/web/src/proto/recorder.ts`, `apps/web/src/proto/recorder.test.ts`,
`apps/web/src/proto/stylet.ts`, `apps/web/proto-stylet.html`, `apps/web/vite.proto.config.ts` ; modifier
`apps/web/package.json`, `pnpm-lock.yaml` (par `pnpm add`), `.gitignore`, `scripts/verifier.sh`.

**Interfaces.**
- Consomme (T1) : `createSampler(target: PointerSurface, opts: SamplerOptions): Sampler`, `GestureEvent`,
  `InputSample`, `SamplerOptions`, `Sampler` de `../engine/input/sampler`.
- Consomme (T2) : `buildReport(input: ReportInput): BenchReport`, `BenchOptions`, `StrokeMeasure`, `Counters`,
  `Environment`, `Support` de `../engine/input/stats`.
- Consomme (T3) : `widthFor`, `drawSegments(ctx, points, from, base, color): number`,
  `drawPredicted(ctx, last, predicted, base, color)` de `./polyline` ; `createFrameLoop(deps, onFrame): FrameLoop`
  (`start`, `stop`, `running`, `durations`, `clear`) de `./frame-loop`.
- Réutilise : `vite-plugin-singlefile` 2.3.4 — `viteSingleFile()` comme seul plugin de `vite.proto.config.ts`
  (cadrage, « Prototype en fichier unique »).
- Réutilise : `apps/web/src/engine/input/sampler.ts` (T1) — `createSampler(stage, { coalesced, predicted, raw })`,
  recréé à chaque bascule de ces trois options.
- Produit :
  ```ts
  // recorder.ts
  export interface LiveStroke { readonly pointerId: number; readonly pointerType: string; readonly eraserButton: boolean; readonly points: readonly InputSample[]; readonly predicted: readonly InputSample[]; readonly drawn: number }
  export interface Recorder { handle(g: GestureEvent): void; live(): readonly LiveStroke[]; markDrawn(now: number): void; strokes(): readonly StrokeMeasure[]; setOptions(o: BenchOptions): void; reset(): void }
  export function createRecorder(options: BenchOptions): Recorder
  ```
  Script `build:proto` = `vite build --config vite.proto.config.ts`, sortie `apps/web/dist-proto/proto-stylet.html`.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/proto/recorder.test.ts 2>&1 | tail -20` → `Tests  9 passed` (N ≥ 9),
dont `cancel garde le trait jusqu'au dernier point reçu`.
`cd "$WT" && pnpm --filter @roomboard/web build:proto 2>&1 | tail -10 && find apps/web/dist-proto -type f` → une seule
ligne `apps/web/dist-proto/proto-stylet.html` ; `grep -cE '<script[^>]*\ssrc=|<link[^>]*stylesheet' apps/web/dist-proto/proto-stylet.html`
→ `0`.
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : prototype en fichier unique OK`
puis `verifier.sh : OK` (garde verts `toolbar.test.ts`, les tests de T1 à T4 et les tests Rust ; le build de
l'application `pnpm --filter @roomboard/web build` reste inchangé et vert).

**Preuve visuelle.** Le profil n'a pas de capture automatique ; une lecture de valeur d'abord, par le Chromium de
Playwright présent sur la VM (vérifié à l'écriture du plan : la page s'exécute en `file://`) :
`B=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome | head -1); cd "$WT" && timeout 30 "$B" --headless=new --no-sandbox --disable-gpu --virtual-time-budget=2000 --dump-dom "file://$WT/apps/web/dist-proto/proto-stylet.html" 2>/dev/null | grep -o '<pre id="panneau">[^<]*' | head -3`
→ lecture attendue `Prise en charge : fusionnés oui · prédits oui · desynchronized oui` (le script tourne dans le
fichier unique, hors réseau). Puis, si le bureau xrdp est disponible : ouvrir le même fichier, tracer à la souris,
décrire dans le rapport la barre de bascules, le trait noir et la ligne « Traits : 1 (stylet 0 … ». La vraie preuve
reste S1 (Jérôme, ENI).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun build Tauri dans cette tâche) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` ; relecteurs au premier plan (`run_in_background: false`) ;
TS strict, `noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Ne pas toucher `apps/web/index.html`, `apps/web/src/main.ts`, le script `build` ni aucune configuration
Vite de l'application (il n'y en a pas : n'en créer aucune, `vite.proto.config.ts` seulement). Ne pas importer le
Wasm ni un framework dans `src/proto/`. Aucune ressource réseau (police, CDN). Ne modifier ni `sampler.ts`, ni
`stats.ts`, ni `polyline.ts`, ni `frame-loop.ts` : un manque se signale dans le rapport.

**Terminé quand.** 9 tests verts, fichier unique produit et contrôlé, `verifier.sh : OK`, et le rapport donne le
chemin absolu `$WT/apps/web/dist-proto/proto-stylet.html`, sa taille, et les lignes
`Réutilisation : appelé vite-plugin-singlefile (viteSingleFile)` et `Réutilisation : appelé engine/input/sampler.ts (createSampler)`.

**Étapes.**

- [ ] **1. Tests de l'enregistreur (rouge).** Créer `apps/web/src/proto/recorder.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { GestureEvent, InputSample } from "../engine/input/sampler";
import type { BenchOptions } from "../engine/input/stats";
import { createRecorder } from "./recorder";

const OPTS: BenchOptions = { coalesced: true, predicted: true, raw: false, desynchronized: true, inkTrail: false };

const s = (x: number, t: number, pressure = 0.5, tiltX = 0): InputSample => ({ x, y: 0, pressure, tiltX, tiltY: 0, t });

const g = (kind: GestureEvent["kind"], samples: InputSample[] = [], over: Partial<GestureEvent> = {}): GestureEvent => ({
  kind,
  pointerId: 1,
  pointerType: "pen",
  eraserButton: false,
  samples,
  predicted: [],
  ...over,
});

describe("createRecorder", () => {
  it("start et move alimentent un trait vif avec ses prédits", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4), s(2, 8)], { predicted: [s(3, 12)] }));
    const live = r.live();
    expect(live).toHaveLength(1);
    expect(live[0]?.points.map((p) => p.x)).toEqual([0, 1, 2]);
    expect(live[0]?.predicted.map((p) => p.x)).toEqual([3]);
    expect(live[0]?.drawn).toBe(0);
  });

  it("markDrawn mesure le retard des seuls points pas encore dessinés", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)]));
    r.markDrawn(10);
    expect(r.live()[0]?.drawn).toBe(2);
    r.markDrawn(30);
    r.handle(g("move", [s(2, 20)]));
    r.markDrawn(26);
    r.handle(g("end"));
    expect(r.strokes()[0]?.latencies).toEqual([10, 6, 6]);
  });

  it("end produit la mesure du trait et vide les traits vifs", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0, 0.2, -5)]));
    r.handle(g("move", [s(1, 4, 0.4), s(2, 8, 0.6)]));
    r.handle(g("move", [s(3, 12, 0.6)]));
    r.handle(g("end"));
    expect(r.live()).toEqual([]);
    expect(r.strokes()).toEqual([
      {
        pointerType: "pen",
        options: OPTS,
        pressures: [0.2, 0.4, 0.6, 0.6],
        tiltX: [-5, 0, 0, 0],
        tiltY: [0, 0, 0, 0],
        moveTimes: [8, 12],
        sampleTimes: [0, 4, 8, 12],
        latencies: [],
        eraserSeen: false,
        cancelled: false,
      },
    ]);
  });

  it("cancel garde le trait jusqu'au dernier point reçu", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)]));
    r.handle(g("cancel"));
    expect(r.strokes()[0]).toMatchObject({ cancelled: true, pressures: [0.5, 0.5] });
  });

  it("bouton gomme vu pendant le trait", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("move", [s(1, 4)], { eraserButton: true }));
    expect(r.live()[0]?.eraserButton).toBe(true);
    r.handle(g("end", [], { eraserButton: true }));
    expect(r.strokes()[0]?.eraserSeen).toBe(true);
  });

  it("setOptions ne vaut que pour les traits suivants", () => {
    const r = createRecorder(OPTS);
    const other: BenchOptions = { ...OPTS, predicted: false };
    r.handle(g("start", [s(0, 0)]));
    r.setOptions(other);
    r.handle(g("end"));
    r.handle(g("start", [s(0, 20)]));
    r.handle(g("end"));
    expect(r.strokes().map((m) => m.options.predicted)).toEqual([true, false]);
  });

  it("fin d'un pointeur inconnu ignorée", () => {
    const r = createRecorder(OPTS);
    r.handle(g("end", [], { pointerId: 9 }));
    r.handle(g("move", [s(1, 1)], { pointerId: 9 }));
    expect(r.strokes()).toEqual([]);
    expect(r.live()).toEqual([]);
  });

  it("deux pointeurs, deux traits", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)], { pointerId: 1 }));
    r.handle(g("start", [s(50, 1)], { pointerId: 2, pointerType: "mouse" }));
    r.handle(g("move", [s(51, 5)], { pointerId: 2, pointerType: "mouse" }));
    expect(r.live().map((l) => l.points.length)).toEqual([1, 2]);
    r.handle(g("end", [], { pointerId: 2, pointerType: "mouse" }));
    expect(r.strokes().map((m) => m.pointerType)).toEqual(["mouse"]);
    expect(r.live().map((l) => l.pointerId)).toEqual([1]);
  });

  it("reset vide traits vifs et mesures", () => {
    const r = createRecorder(OPTS);
    r.handle(g("start", [s(0, 0)]));
    r.handle(g("end"));
    r.handle(g("start", [s(0, 0)], { pointerId: 2 }));
    r.reset();
    expect(r.strokes()).toEqual([]);
    expect(r.live()).toEqual([]);
  });
});
```

  Le test « markDrawn » : points t = 0 et 4 dessinés à 10 → retards 10 et 6 ; second `markDrawn(30)` sans point neuf →
  rien ; point t = 20 dessiné à 26 → 6.

- [ ] **2. Rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/proto/recorder.test.ts 2>&1 | tail -20` → `Failed to resolve import "./recorder"`.

- [ ] **3. Enregistreur.** Créer `apps/web/src/proto/recorder.ts` :

```ts
/** Enregistreur du banc : traits vifs pendant le geste, mesure par trait au relâché (D30). */
import type { GestureEvent, InputSample } from "../engine/input/sampler";
import type { BenchOptions, StrokeMeasure } from "../engine/input/stats";

export interface LiveStroke {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly eraserButton: boolean;
  readonly points: readonly InputSample[];
  readonly predicted: readonly InputSample[];
  readonly drawn: number;
}

export interface Recorder {
  handle(g: GestureEvent): void;
  live(): readonly LiveStroke[];
  markDrawn(now: number): void;
  strokes(): readonly StrokeMeasure[];
  setOptions(o: BenchOptions): void;
  reset(): void;
}

interface Building {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly options: BenchOptions;
  readonly points: InputSample[];
  readonly moveTimes: number[];
  readonly latencies: number[];
  predicted: readonly InputSample[];
  eraserButton: boolean;
  drawn: number;
}

export function createRecorder(options: BenchOptions): Recorder {
  let current = options;
  const building = new Map<number, Building>();
  let done: StrokeMeasure[] = [];

  const finish = (b: Building, cancelled: boolean): StrokeMeasure => ({
    pointerType: b.pointerType,
    options: b.options,
    pressures: b.points.map((p) => p.pressure),
    tiltX: b.points.map((p) => p.tiltX),
    tiltY: b.points.map((p) => p.tiltY),
    moveTimes: b.moveTimes.slice(),
    sampleTimes: b.points.map((p) => p.t),
    latencies: b.latencies.slice(),
    eraserSeen: b.eraserButton,
    cancelled,
  });

  return {
    handle(g) {
      if (g.kind === "start") {
        building.set(g.pointerId, {
          pointerId: g.pointerId,
          pointerType: g.pointerType,
          options: current,
          points: [...g.samples],
          moveTimes: [],
          latencies: [],
          predicted: [],
          eraserButton: g.eraserButton,
          drawn: 0,
        });
        return;
      }
      const b = building.get(g.pointerId);
      if (!b) return;
      if (g.eraserButton) b.eraserButton = true;
      if (g.kind === "move") {
        b.points.push(...g.samples);
        const last = g.samples[g.samples.length - 1];
        if (last) b.moveTimes.push(last.t);
        b.predicted = g.predicted;
        return;
      }
      building.delete(g.pointerId);
      done.push(finish(b, g.kind === "cancel"));
    },
    live() {
      return [...building.values()];
    },
    markDrawn(now) {
      for (const b of building.values()) {
        for (let i = b.drawn; i < b.points.length; i++) {
          const p = b.points[i];
          if (p) b.latencies.push(now - p.t);
        }
        b.drawn = b.points.length;
      }
    },
    strokes() {
      return done.slice();
    },
    setOptions(o) {
      current = o;
    },
    reset() {
      building.clear();
      done = [];
    },
  };
}
```

- [ ] **4. Vert.** `cd "$WT/apps/web" && pnpm exec vitest run src/proto/recorder.test.ts 2>&1 | tail -20` → `Tests  9 passed`.

- [ ] **5. Commit intermédiaire.** `git -C "$WT" add apps/web/src/proto/recorder.ts apps/web/src/proto/recorder.test.ts`
  puis `git -C "$WT" commit -m "feat(web): stylus bench recorder"`.

- [ ] **6. Dépendance et script.** `cd "$WT" && pnpm --filter @roomboard/web add -D vite-plugin-singlefile@2.3.4 2>&1 | tail -5`
  (met à jour `apps/web/package.json` et `pnpm-lock.yaml`). Puis, dans `apps/web/package.json`, ajouter le script
  après `"build"` :

```json
    "build:proto": "vite build --config vite.proto.config.ts",
```

  Le bloc `scripts` devient :

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "build:proto": "vite build --config vite.proto.config.ts",
    "test": "vitest run"
  },
```

  Si `pnpm add` signale un avertissement de pair `rollup` : le verrou a `rollup@4.68.3`, compatible avec `^4.59.0` ;
  ne rien forcer.

- [ ] **7. Configuration Vite séparée.** Créer `apps/web/vite.proto.config.ts` :

```ts
// Build du banc du stylet (cadrage D29) : un seul fichier HTML autonome, ouvrable en file://.
// Séparé de la configuration (implicite) de l'application : `vite build` sans --config n'est pas touché.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist-proto",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./proto-stylet.html", import.meta.url)),
    },
  },
});
```

  Ajouter à `.gitignore`, après la ligne `dist/` :

```
apps/web/dist-proto/
```

- [ ] **8. Page HTML.** Créer `apps/web/proto-stylet.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RoomBoard — banc du stylet</title>
    <style>
      html, body { margin: 0; height: 100%; font: 14px system-ui, sans-serif; color: #1a1a1a; }
      body { display: flex; flex-direction: column; }
      #barre { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; align-items: center; padding: 0.5rem 0.75rem; background: #f2f2f2; border-bottom: 1px solid #ccc; }
      #barre label { display: flex; gap: 0.35rem; align-items: center; }
      #barre button { font: inherit; padding: 0.35rem 0.8rem; }
      #stage { position: relative; flex: 1; min-height: 0; background: #fff; touch-action: none; user-select: none; -webkit-user-select: none; }
      #stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
      #bas { display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #fafafa; border-top: 1px solid #ccc; }
      #panneau { margin: 0; white-space: pre-wrap; font: 13px ui-monospace, monospace; }
      #json { width: 100%; height: 6.5rem; box-sizing: border-box; font: 11px ui-monospace, monospace; }
    </style>
  </head>
  <body>
    <div id="barre">
      <strong>Banc du stylet</strong>
      <label><input type="checkbox" id="opt-coalesced" checked /> fusionnés</label>
      <label><input type="checkbox" id="opt-predicted" checked /> prédits</label>
      <label><input type="checkbox" id="opt-raw" /> pointerrawupdate</label>
      <label><input type="checkbox" id="opt-desync" checked /> desynchronized</label>
      <label><input type="checkbox" id="opt-inktrail" /> traînée déléguée (navigator.ink)</label>
      <button type="button" id="btn-effacer">Effacer</button>
      <button type="button" id="btn-zero">Remettre les mesures à zéro</button>
      <button type="button" id="btn-telecharger">Télécharger le JSON</button>
      <button type="button" id="btn-copier">Copier le JSON</button>
      <span id="etat" aria-live="polite"></span>
    </div>
    <div id="stage"></div>
    <div id="bas">
      <pre id="panneau"></pre>
      <textarea id="json" readonly placeholder="JSON exporté (roomboard-stylet/1)"></textarea>
    </div>
    <script type="module" src="/src/proto/stylet.ts"></script>
  </body>
</html>
```

- [ ] **9. Câblage de la page.** Créer `apps/web/src/proto/stylet.ts` :

```ts
/** Page du banc du stylet (cadrage D29, D30). Câblage DOM seulement : la logique est testée dans ses modules. */
import { createSampler, type GestureEvent, type Sampler } from "../engine/input/sampler";
import { buildReport, type BenchOptions, type BenchReport, type Counters, type Support } from "../engine/input/stats";
import { createFrameLoop } from "./frame-loop";
import { drawPredicted, drawSegments, widthFor } from "./polyline";
import { createRecorder } from "./recorder";

const BASE_WIDTH = 4;
const INK = "#1a1a1a";
const ERASER_INK = "#9a9a9a";
const PANEL_EVERY_MS = 250;

interface InkPresenterLike {
  updateInkTrailStartPoint(evt: PointerEvent, style: { color: string; diameter: number }): void;
}
interface InkLike {
  requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike>;
}

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`élément absent : #${id}`);
  return found as T;
}

function detectSupport(): Support {
  const proto = typeof PointerEvent === "undefined" ? null : PointerEvent.prototype;
  const probe = document.createElement("canvas").getContext("2d", { desynchronized: true });
  return {
    coalesced: proto !== null && "getCoalescedEvents" in proto,
    predicted: proto !== null && "getPredictedEvents" in proto,
    desynchronized: probe?.getContextAttributes().desynchronized === true,
    inkPresenter: "ink" in navigator,
    pointerRawUpdate: "onpointerrawupdate" in window,
    secureContext: window.isSecureContext,
  };
}

const stage = el<HTMLDivElement>("stage");
const panel = el<HTMLPreElement>("panneau");
const jsonOut = el<HTMLTextAreaElement>("json");
const status = el<HTMLSpanElement>("etat");
const toggles = {
  coalesced: el<HTMLInputElement>("opt-coalesced"),
  predicted: el<HTMLInputElement>("opt-predicted"),
  raw: el<HTMLInputElement>("opt-raw"),
  desynchronized: el<HTMLInputElement>("opt-desync"),
  inkTrail: el<HTMLInputElement>("opt-inktrail"),
};

const support = detectSupport();
const supported: Record<keyof typeof toggles, boolean> = {
  coalesced: support.coalesced,
  predicted: support.predicted,
  raw: support.pointerRawUpdate,
  desynchronized: support.desynchronized,
  inkTrail: support.inkPresenter,
};
for (const key of Object.keys(toggles) as (keyof typeof toggles)[]) {
  if (!supported[key]) {
    toggles[key].checked = false;
    toggles[key].disabled = true;
  }
}

function readOptions(): BenchOptions {
  return {
    coalesced: toggles.coalesced.checked,
    predicted: toggles.predicted.checked,
    raw: toggles.raw.checked,
    desynchronized: toggles.desynchronized.checked,
    inkTrail: toggles.inkTrail.checked,
  };
}

const ZERO: Counters = { pointerCancels: 0, lostCaptures: 0, touchIgnored: 0 };
let options = readOptions();
const recorder = createRecorder(options);
let carried: Counters = ZERO;
let sampler: Sampler | null = null;
let inkCtx!: CanvasRenderingContext2D;
let liveCtx!: CanvasRenderingContext2D;
let presenter: InkPresenterLike | null = null;
let lastPanel = 0;

const loop = createFrameLoop(
  {
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (id) => cancelAnimationFrame(id),
    now: () => performance.now(),
  },
  renderFrame,
);

function buildCanvases(): void {
  stage.replaceChildren();
  const dpr = window.devicePixelRatio || 1;
  const make = (): CanvasRenderingContext2D => {
    const canvas = document.createElement("canvas");
    stage.append(canvas);
    canvas.width = Math.round(stage.clientWidth * dpr);
    canvas.height = Math.round(stage.clientHeight * dpr);
    const ctx = canvas.getContext("2d", { desynchronized: options.desynchronized });
    if (!ctx) throw new Error("canvas 2D indisponible");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };
  inkCtx = make();
  liveCtx = make();
  void setupInkTrail();
}

async function setupInkTrail(): Promise<void> {
  presenter = null;
  const nav = navigator as unknown as { ink?: InkLike };
  if (!options.inkTrail || !nav.ink) return;
  try {
    presenter = await nav.ink.requestPresenter({ presentationArea: liveCtx.canvas });
  } catch {
    presenter = null;
    flash("traînée déléguée refusée par le navigateur");
  }
}

function sumCounters(a: Counters, b: Counters): Counters {
  return {
    pointerCancels: a.pointerCancels + b.pointerCancels,
    lostCaptures: a.lostCaptures + b.lostCaptures,
    touchIgnored: a.touchIgnored + b.touchIgnored,
  };
}

function counters(): Counters {
  return sampler ? sumCounters(carried, sampler.stats()) : carried;
}

function buildSampler(): void {
  if (sampler) {
    carried = sumCounters(carried, sampler.stats());
    sampler.dispose();
  }
  sampler = createSampler(stage, { coalesced: options.coalesced, predicted: options.predicted, raw: options.raw });
  sampler.onGesture(onGesture);
}

function clearLive(): void {
  liveCtx.save();
  liveCtx.setTransform(1, 0, 0, 1, 0, 0);
  liveCtx.clearRect(0, 0, liveCtx.canvas.width, liveCtx.canvas.height);
  liveCtx.restore();
}

function renderFrame(now: number): void {
  clearLive();
  for (const stroke of recorder.live()) {
    const color = stroke.eraserButton ? ERASER_INK : INK;
    drawSegments(inkCtx, stroke.points, stroke.drawn, BASE_WIDTH, color);
    const last = stroke.points[stroke.points.length - 1];
    if (last) drawPredicted(liveCtx, last, stroke.predicted, BASE_WIDTH, color);
  }
  recorder.markDrawn(now);
  if (now - lastPanel > PANEL_EVERY_MS) updatePanel();
}

function onGesture(g: GestureEvent): void {
  if (g.kind === "end" || g.kind === "cancel") {
    // Dessiner et mesurer les derniers points reçus avant de clore (D39 : le trait est gardé même sur cancel).
    renderFrame(performance.now());
    recorder.handle(g);
    if (recorder.live().length === 0) {
      loop.stop();
      clearLive();
    }
    updatePanel();
    return;
  }
  recorder.handle(g);
  loop.start();
}

stage.addEventListener("pointermove", (e: PointerEvent) => {
  if (!presenter || e.buttons === 0) return;
  const pressure = e.pointerType === "pen" ? e.pressure : 0.5;
  presenter.updateInkTrailStartPoint(e, { color: INK, diameter: widthFor(pressure, BASE_WIDTH) });
});

function report(): BenchReport {
  return buildReport({
    createdAt: new Date().toISOString(),
    environment: { userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio || 1, support },
    counters: counters(),
    frameDurations: loop.durations(),
    strokes: recorder.strokes(),
  });
}

const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);
const yes = (b: boolean): string => (b ? "oui" : "non");

function updatePanel(): void {
  lastPanel = performance.now();
  const r = report();
  const t = r.totals;
  const last = r.strokes[r.strokes.length - 1];
  const s = r.environment.support;
  panel.textContent = [
    `Prise en charge : fusionnés ${yes(s.coalesced)} · prédits ${yes(s.predicted)} · desynchronized ${yes(s.desynchronized)} · navigator.ink ${yes(s.inkPresenter)} · pointerrawupdate ${yes(s.pointerRawUpdate)} · contexte sûr ${yes(s.secureContext)} · dpr ${r.environment.devicePixelRatio}`,
    `Traits : ${t.strokes} (stylet ${t.penStrokes}, interrompus ${t.cancelledStrokes}) · pointercancel ${r.counters.pointerCancels} · capture perdue ${r.counters.lostCaptures} · contacts tactiles ignorés ${r.counters.touchIgnored}`,
    `Stylet : pression ${fmt(t.penPressure?.min, 2)}–${fmt(t.penPressure?.max, 2)}, écart type ${fmt(t.penPressure?.stdDev, 3)}${t.penConstantPressure ? " (CONSTANTE)" : ""} · événements ${fmt(t.penEventsHzP50, 0)} Hz · échantillons ${fmt(t.penSamplesHzP50, 0)} Hz`,
    `Retard interne : p50 ${fmt(t.latencyP50)} ms · p95 ${fmt(t.latencyP95)} ms · images ${r.frames?.count ?? 0}, p95 ${fmt(r.frames?.p95)} ms, > 25 ms ${fmt(r.frames ? r.frames.overBudgetShare * 100 : null)} %`,
    last
      ? `Dernier trait : ${last.pointerType}, ${last.points} points, pression ${fmt(last.pressure?.min, 2)}–${fmt(last.pressure?.max, 2)}, inclinaison max ${last.maxTiltX}/${last.maxTiltY}, gomme ${yes(last.eraserSeen)}, ${fmt(last.samplesHz, 0)} Hz, retard p95 ${fmt(last.latencyP95)} ms${last.cancelled ? ", interrompu" : ""}`
      : "Dernier trait : —",
  ].join("\n");
}

function flash(message: string): void {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = "";
  }, 3000);
}

function exportJson(): string {
  const text = JSON.stringify(report(), null, 2);
  jsonOut.value = text;
  return text;
}

el<HTMLButtonElement>("btn-telecharger").addEventListener("click", () => {
  const text = exportJson();
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `roomboard-stylet-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash("JSON téléchargé");
});

el<HTMLButtonElement>("btn-copier").addEventListener("click", () => {
  const text = exportJson();
  navigator.clipboard.writeText(text).then(
    () => flash("JSON copié"),
    () => {
      jsonOut.focus();
      jsonOut.select();
      flash(document.execCommand("copy") ? "JSON copié" : "copie refusée : sélectionner le texte en bas à droite");
    },
  );
});

el<HTMLButtonElement>("btn-effacer").addEventListener("click", () => {
  buildCanvases();
  flash("page effacée (mesures gardées)");
});

el<HTMLButtonElement>("btn-zero").addEventListener("click", () => {
  recorder.reset();
  loop.clear();
  sampler?.dispose();
  sampler = null;
  carried = ZERO;
  buildSampler();
  jsonOut.value = "";
  updatePanel();
  flash("mesures remises à zéro");
});

for (const input of Object.values(toggles)) {
  input.addEventListener("change", () => {
    const before = options;
    options = readOptions();
    recorder.setOptions(options);
    if (before.coalesced !== options.coalesced || before.predicted !== options.predicted || before.raw !== options.raw) {
      buildSampler();
    }
    if (before.desynchronized !== options.desynchronized) {
      buildCanvases();
      flash("canvas recréés : page effacée");
    } else if (before.inkTrail !== options.inkTrail) {
      void setupInkTrail();
    }
    updatePanel();
  });
}

window.addEventListener("resize", () => buildCanvases());

buildCanvases();
buildSampler();
updatePanel();
```

  Si `tsc` refuse `probe?.getContextAttributes().desynchronized` (lib DOM sans `desynchronized` dans
  `CanvasRenderingContext2DSettings`), écrire
  `(probe?.getContextAttributes() as { desynchronized?: boolean } | undefined)?.desynchronized === true`. Si `tsc`
  refuse `getContext("2d", { desynchronized: … })`, même remède : `canvas.getContext("2d", { desynchronized } as CanvasRenderingContext2DSettings)`.

- [ ] **10. Build du prototype.** `cd "$WT" && pnpm --filter @roomboard/web build:proto 2>&1 | tail -10 && find apps/web/dist-proto -type f && grep -cE '<script[^>]*\ssrc=|<link[^>]*stylesheet' apps/web/dist-proto/proto-stylet.html`
  → une seule ligne `apps/web/dist-proto/proto-stylet.html`, puis `0`.

- [ ] **11. Contrôle dans `verifier.sh`.** Dans `scripts/verifier.sh`, remplacer :

```bash
pnpm --filter @roomboard/web build
echo "verifier.sh : OK"
```

  par :

```bash
pnpm --filter @roomboard/web build

# Banc du stylet (cadrage D29) : un seul fichier HTML, aucune ressource externe (ouvrable en file://).
pnpm --filter @roomboard/web build:proto
proto=apps/web/dist-proto/proto-stylet.html
if [ "$(find apps/web/dist-proto -type f | wc -l)" -ne 1 ] || [ ! -f "$proto" ]; then
  echo "verifier.sh : dist-proto doit contenir le seul fichier $proto" >&2
  exit 1
fi
if grep -Eq '<script[^>]*\ssrc=|<link[^>]*stylesheet' "$proto"; then
  echo "verifier.sh : le prototype charge une ressource externe" >&2
  exit 1
fi
echo "verifier.sh : prototype en fichier unique OK"
echo "verifier.sh : OK"
```

- [ ] **12. Suite complète.** `cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` →
  `controle-wasm-bindgen : 0.2.130 (identique à Cargo.lock)`, `verifier.sh : prototype en fichier unique OK`,
  `verifier.sh : OK`.

- [ ] **13. Preuve visuelle.** Lancer la lecture de « Preuve visuelle » ci-dessus et recopier la ligne lue dans le
  rapport ; tracé à la souris sur le bureau xrdp s'il est disponible, sinon le dire.

- [ ] **14. Commit.** `git -C "$WT" add apps/web/src/proto/stylet.ts apps/web/proto-stylet.html apps/web/vite.proto.config.ts apps/web/package.json pnpm-lock.yaml .gitignore scripts/verifier.sh`
  puis `git -C "$WT" commit -m "feat(web): single-file stylus bench page (proto-stylet.html)"`.

---

## Relecture du plan (auto-contrôle)

- Couverture du cadrage, lot 1 : D29 (page, config séparée, fichier unique, polyligne, bascules, export) → T3, T6 ;
  D30 (mesures, format `roomboard-stylet/1`) → T2, T6 ; D39 et D18 partiel (paume) → T1 ; D9 (contrôle de version)
  → T4 ; fiche d'essai, D31 (repères), DA9 (si échec) → T5 ; S1 → toutes.
- Hors lot 1, laissé au lot 3 : second doigt dans les 150 ms et doigt qui déplace la vue (D18), géométrie `freedraw`
  au banc (D29 « rejoue au lot 3 »).
- Noms cohérents : `InputSample`, `GestureEvent`, `SamplerOptions` (T1) ; `BenchOptions`, `StrokeMeasure`,
  `Counters`, `Support`, `buildReport` (T2) ; `drawSegments`, `drawPredicted`, `widthFor`, `createFrameLoop` avec
  `clear` (T3) ; tous consommés à l'identique par T6 ; libellés de la page (T6) repris par la fiche (T5).
