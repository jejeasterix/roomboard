# État — usage-c5-image

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : On rogne une image, on la retourne, on la tourne par quarts de tour, on règle luminosité et contraste, et on rend transparente une couleur (pipette, tolérance, contigu ou global, plume, aperçu), sans perdre l'original, avec les calculs de pixels dans un Worker.
Avancement : 16/19 tâches terminées
Étage : 3 (fin de lot : correctifs) — depuis 2026-11-20 19:16
Tâche : T18 — Correctifs de relecture — depuis 2026-11-20 19:16 — depuis 2026-11-20 18:50
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c5-image   Branche : feat/usage-c5-image   Base : origin/main @ 0dd7f1a, puis origin/main @ 9549785 (C12) fusionné en e6ffd35
Branche principale locale au lancement : 0dd7f1a (avancée à 9549785 par OD85, C12 fusionné : attendu)
Cadrage : docs/plans/usage-c5-image-cadrage.md   Plan(s) : docs/plans/usage-c5-image-PLAN.md
Lancement : 2026-11-20 17:16 · arrêt ferme 21:16 (bilan à 21:06)

## Référence
Complète (origin/main @ 0dd7f1a) : `verifier.sh --e2e` OK (e2e OK), 17:28. Wasm principal 1 080 736 o · formats 859 580 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; corrections T7 parité flipX, T12 asWorkerLike + timeout 5000, T16/T17 preuve par tee + grep) · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
Plan docs/plans/usage-c5-image-PLAN.md (17 tâches ; sections T11–T17 en écriture pendant la vague 1, choix tranché pour tenir l'arrêt ferme).
Vagues : V1 = T1, T5, T6, T8, T15 · V2 = T2, T9 · V3 = T3, T10 · V4 = T4 · V5 = T7 · V6 = T11 · V7 = T12, T13 · V8 = T14 · V9 = T16 · V10 = T17.
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 | terminée | 1/3 | 6bd9dca | compat_c5 1 ok (rejoué après fusion C12) |
| T5 | terminée | 1/3 | 003504e (fusion 74faaf8, conflit C12 résolu) | pixels 11 ok, wasm image_ 2 ok ; formats 859 580 → 866 775 o |
| T6 | terminée | 1/3 | 11b7b8f | image-params 16 ok |
| T8 | terminée | 1/3 | ab33a86 (fusion 9e2956b, conflit C12 résolu) | platform 324 ok |
| T2 | terminée | 1/3 | 9c70dac | core 350+ ok, compat_c5 2 ok |
| T9 | terminée | 1/3 | dde7f51 | render 196 ok |
| T10 | terminée | 1/3 | 278e04f | engine 675 ok |
| T15 | terminée | 1/3 | 9dc97f7 | node --check 3, empreintes identiques |
| T3 | terminée | 1/3 | f6da14a | core 0 FAILED, image:: 14 ok |
| T4 | terminée | 1/3 | 162c207 | wasm 48 ok ; module principal 1 080 736 → 1 098 034 o |
| T7 | terminée | 1/3 | e2ae635 | core 429 ok (vrai module), tsc 0 erreur ; contrat C5 15 tests |
| T11 | terminée | 1/3 | 0af685f | engine 692 ok |
| T12 | terminée | 1/3 | c41af82 | app 294 ok |
| T13 | terminée | 1/3 | 03ef298 | ui 206 ok |
| T14 | terminée | 1/3 | 0531257 | ui 186 ok |
| T16 | terminée | 1/3 | c13400d | verifier.sh --e2e OK, rejoué sur 21030f1 (C5 image : OK, scène 706 px) |
| T18 correctifs de relecture | T1–T16 | en cours | 1/3 | — | — |
| T19 simplification du lot (ex-T17) | T18 | à faire | 0/1 | — | — |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture image rognée au fond transparent dans docs/essais/ · scène ≥ 640 px mesurée par un test · module Wasm principal ≤ 1 572 864 octets · PR fusionnée par fusion locale --no-ff et push sans --force

## Rapides sur la tête 4a1bfc6
cargo --workspace : 546 passés, 0 FAILED · `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test` (wasm reconstruits) : 108 fichiers, 2062 passés. Double relecture (qualité A, qualité B, conformité) lancée sur 9549785..4a1bfc6, carnets /tmp/c5ref/relecture-usage-c5-image-3.8-*.md.

## Double relecture (tour 1, 9549785..4a1bfc6)
Aucun blocker. Majeurs : M1 aperçu périmé après écriture hors séance (qualité B + conformité) ; M2 Entrée pendant le rognage ignore la cible ; M3 export PDF vectoriel (C12) d'une image rognée faux (drawImage à 9 arguments non géré par RecordingContext2D, endroit absent de la carte d'impact). Mineurs : pixel-runner exceptions, contraste f64 inexact, hasPixels, Valider pendant calcul, aperçu gardé après fermeture, data-pixels I33, espace+glisser pendant le rognage, pointerId du geste. Simplifications : PixelParams = Pick<ImageParams>, échelle écran dupliquée, boucle des poignées [anti-refactorisation : duplication], sizeOf, nom `edit`, editAction calculé deux fois.

## Choix tranchés seul (orchestrateur)
- Vague 1 lancée pendant que le planificateur finissait T11–T17 ; relecture du plan en parallèle (tenir l'arrêt ferme).
- Revue immédiate des tâches `concepteur-critique` (3.5.5) remplacée par la double relecture de fin, pour le temps.
- Double relecture lancée sur T1–T15 pendant que T16 (essai navigateur) tourne.
- origin/main (C12) fusionné tôt dans la branche (e6ffd35) ; conflits container.ts et formats lib.rs résolus en gardant les deux.

## Scénarios et captures
S1, S2 joués par `scripts/essais/c5-image-navigateur.mjs` dans `verifier.sh --e2e` : « C5 image : OK ». Scène 706 px, panneau image ouvert.
Capture docs/essais/c5-image-rognee-transparente.png : fond de page bleu, image rognée 160×120 retournée, coin blanc rendu transparent (bleu visible), intérieur blanc du cercle gardé (contigu), panneau calé à droite.
Tailles : principal 1 080 736 → 1 098 034 o (≤ 1 572 864) ; formats après C12 3 092 294 → 3 099 365 o (+7 071 o pour C5 ; ≤ 3 145 728, marge 46 363 o) ; principal après C12 1 084 202 → 1 098 034 o (+13 832 o).

## Hypothèses à revoir
Cadrage 8319538 : 17 hypothèses dont 6 de niveau 1, 4 décisions d'architecture, 30 lignes « Modules à réutiliser ». Scénarios : S1 essai Playwright complet · S2 quart de tour + luminosité · S3 global/contigu/plume (Rust) · S4 fichier d'avant C5 · S5 résultat périmé jeté, module absent

## Hors périmètre
- rotation libre, pot sur image, gomme sur image (C6b)

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : contigu = diffusion depuis les bords (pas de graine) ; cache bitmap par asset → par élément ; rogner/tourner déplace la boîte ; pas d'encodage PNG en C5 ; Worker vivant (pas jetable comme C10b) ; une rangée de 8 boutons casse 640 px → un bouton « Image » + panneau.
- Chantier en cours sur les mêmes fichiers : OD85 C12 PDF (`feat/usage-c12-pdf`) : element.rs, api.ts, wasm-core.ts, fake-core.ts, renderer.ts, canvas2d.ts, board-session.ts, stage-tags.ts, toolbar-host.ts, App.tsx, main.ts, verifier.sh, verifier-e2e.test.sh.

## Notes du coffre à poser
—
