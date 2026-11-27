# État — personnalisation-2

Statut : clôture (OG14) — lot 2 terminé sur feat/personnalisation-2b, PR puis fusion locale
Gabarit : chantier (18 tâches : lot 1 = 10, lot 2 = 8 ; lot 1 fusionnable seul)
Objectif : RoomBoard reçoit un panneau d'options par outil et un menu général ☰ copiés du comportement d'Excalidraw, remplis de nos commandes, tactile d'abord et clavier ensuite.
Avancement : 2/2 lots clos (lot 1 : PR #63, #64 ; lot 2 : T12–T19, T28, T13r, T31–T41)
Étage : 4 — depuis 2026-11-27 18:10
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2   Branche : feat/personnalisation-2b   Base : origin/main @ f61d2c4
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-2-cadrage.md   Plan(s) : docs/plans/personnalisation-2-PLAN.md
Arrêt ferme : 2026-11-27 21:19 (OG14 ; bilan et poussée à 21:09)

## Référence
Rapide : voir complète
Complète (origin/main, verifier.sh --e2e, 16 min) : OK · cargo 1356 · web 3628 (178 fichiers) · cli 263 (29 fichiers)
Tailles Wasm à 45484db : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Fin du lot 1
verifier.sh --e2e sur 75cfe6d : e2e OK, OK · cargo 1410 · web 3765 (184 fichiers) · cli 265 (29) · Wasm principal 1 394 336 o, formats 2 794 511 o · personnalisation-2 : OK, CLI : OK
Double relecture : conformité + qualité UI + qualité TS, aucun bloquant ; majeurs corrigés par T20, T21 ; essais anciens : amorce foldOptions dans s34, c3, c4, c6a, c8, c13 ; T22 (menu sous le panneau, panneau compact, calage, design-l2/l3), T24, T25, T26.

## Fin du lot 1
PR #63 fusionnée par merge --no-ff local, main 23b23c1. verifier.sh --e2e sur 09a7449 : e2e OK, OK · cargo 1487 · web 4033 (195) · cli 282 (30) · Wasm 1 429 407 / 2 794 527 o.
Correctif T30 (panneau sous la rangée de contexte d'OG4) : branche fix/options-panel-context-row, voir sa PR.
Restes : captures apres-mixte et apres-replie d'avant OG4 (le mode --captures échoue sur la vue mixte) ; 22 commits poussés portent Co-Authored-By Sonnet.

## Lot 2 — reprise (OG14)
T13r : fusion origin/main 42af8b2, rouge 309b56d, Restack d'OG4 seule 0bbfc74, suites d0d0541 — rejoué sur d0d0541 : cargo 952 (+6 ignorés ; 959 déclarés contre 948 dans main), web 4112 (197), cli 284 (30), CLI : OK ; Wasm principal 1 440 034 o, formats 2 794 527 o (sortie wasm-bindgen). BadOrder et order.rs retirés, rang non entier refusé par le pont d'OG4. Hors périmètre : rang de MovePage non contrôlé dans wasm-core.ts.
Branche poussée : feat/personnalisation-2b (c98c9b2), base lot 1 avant l'intégration d'OG4/OG5. Contient T12 (champs fillStyle, pointes, textAlign, link), T13 (Restack minimal), T14 (rendu hachures, pointes, alignement, polices), T15 (panneau : Remplissage, Texte, Pointes, Disposition, raccourcis Ctrl+(Maj+)↑/↓), T16 (sélecteur de couleur, S et G), T17 (Aide « ? », Effacer la page, Ctrl+Maj+E export PDF), T28 (outils de création lisent le style lot 2). Preuves rejouées par tâche ; aucune suite complète, aucune relecture de lot.
Prochaine tâche exacte : 1) `git merge origin/main` dans feat/personnalisation-2b ; **retirer le `Restack` de T13 (order.rs, BadOrder, pont, faux cœur, CLI) et brancher Disposition (T15) sur le `Restack { ids, to }` d'OG4 et ses raccourcis d'ordre** (OG4 a déjà des raccourcis d'ordre et la rangée Sélection Premier plan/Arrière-plan : garder un seul jeu, celui d'OG4, et l'afficher dans le panneau) ; 2) T18 lien (non commencé) ; 3) T19 essai navigateur S6–S8 + captures ; 4) double relecture du lot ; 5) verifier.sh --e2e ; 6) PR et fusion.

## Fin du lot 2 (OG14)
- T13r : fusion origin/main (42af8b2), Restack d'OG4 seule (0bbfc74, d0d0541).
- T18 lien (5bba1fa) ; T19 essai lot 2, captures (3e88acd) ; T31–T34 écarts vus à l'essai et à la critique de rendu (S7.1 police avant saisie, focus, sélecteur borné et ancré, calage strict, éditeur de lien, Aide, panneaux passagers) ; T35 lien ouvert par roomboard-shell, sans plugin opener (règle C16).
- Double relecture tour 1 (conformité + qualité en 3 zones) : 0 blocker, 3 major → T36–T39 ; tour 2 : 0 blocker, 2 major (alerte web à tort, piles de runAll) → T40, T41. Correctifs de fin : 2/2.
- Preuves rejouées : verifier.sh --e2e OK sur a8e31c5, e5f0f7e, puis la tête finale (voir PR).
- Constats d'architecture : tests Disposition en double dans engine.test.ts:2104 (laissés) ; regroupement d'annulation côté moteur (`runAll`) faute d'un lot atomique dans le cœur — à porter dans le cœur si d'autres gestes en ont besoin.
- Hors périmètre gardé : comportements des flèches communs avec Excalidraw (courbure, liaison, édition des points) → OG12.

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2 (lot 2)

## Tâches
Table complète : en tête de docs/plans/personnalisation-2-PLAN.md. Vagues : V1 T1,T3,T7 · V2 T2,T6,T8 · V3 T4 · V4 T5,T9 · V5 T10 · V6 T11 | lot 2 : V7 T12 · V8 T13,T14 · V9 T15 · V10 T16,T17 · V11 T18 · V12 T19
| id | worktree | état | essais | commit vert | preuve rejouée |
|----|----------|------|--------|-------------|----------------|
| T1 | retiré | terminée | 1/3 (+reprise limite) | a006b3b | core 495 ok, clippy/fmt ; revue : 4 mineurs → T2b |
| T2 | retiré | terminée | 1/3 | b4ab828 | core 504 ok ; revue : 7 mineurs → T2b |
| T2b | retiré | terminée (correctif) | 1/3 | 22bdb97 | core 510 ok, clippy/fmt |
| T3 | retiré | terminée | 1/3 | bd77521 | 8 tests, tsc 0 |
| T4 | …--T1 (réutilisé) | en cours | 1/3 (+reprise limite) | — | — |
| T6 | retiré | terminée | 1/3 | f78ba64 | 12 tests, tsc 0 |
| T7 | retiré | terminée | 1/3 | f626b3b | 110 tests, tsc 0 |
| T8 | retiré | terminée | 1/3 (+reprise limite) | 2e030c2 | 287 tests ; revue : 2 majeurs → T8b |
| T8b | retiré | terminée (correctif) | 1/3 | 2663f59 | 291 tests, tsc 0, licences 0 |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · verifier.sh --e2e OK · scénarios S1…Sn réussis · captures 2x avant/après · PR fusionnée par merge --no-ff local et poussée

## Hypothèses à revoir
15 au cadrage (7 de niveau 1) + H16-H17 ; voir cadrage § 4. Opacité tranchée 0..100 (contradiction déc. 24/15).

## Hors périmètre
- mode de page, barre latérale, barre des pages, ordre des objets dans le cœur (OG4) ; fonds de page (OG5)

## Portes
ouvertes : — · passées : aucune (merge sans go, profil « Porte avant merge : non »)

## Pièges trouvés
- OG4 (feat/personnalisation-1a) touche commands.rs, api.ts, fake-core.ts, ops.ts, keys.ts, toolbar-profiles.ts, App.tsx, rb.css, icons.ts, SelectionRow.tsx… ; OG5 (1b) commands.rs, element.rs, api.ts, rb.css, App.tsx : relire avant le rebase final.
- Wasm ignoré par git : posé par l'orchestrateur dans chaque worktree de tâche (copie de apps/web/src/wasm*).
- Prémisses démenties : menu ☰ existe déjà (MenuBar) ; WebGL2 ne peint que la couche vive ; aucune commande d'ordre dans main.

## Notes du coffre à poser
(à la clôture)
