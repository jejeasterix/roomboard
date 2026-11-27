# État — personnalisation-2

Statut : en cours — lot 1 en fusion (OG4 et OG5 intégrés), lot 2 sur feat/personnalisation-2b (poussée, non fusionnée)
Gabarit : chantier (18 tâches : lot 1 = 10, lot 2 = 8 ; lot 1 fusionnable seul)
Objectif : RoomBoard reçoit un panneau d'options par outil et un menu général ☰ copiés du comportement d'Excalidraw, remplis de nos commandes, tactile d'abord et clavier ensuite.
Avancement : lot 1 clos (T1–T11 + correctifs T2b, T4b, T8b, T9b, T20–T27) ; lot 2 : T12–T17 + T28 fusionnés dans feat/personnalisation-2b, T18 (lien) non fait, T19 en cours
Étage : 4 (lot 1) — depuis 2026-11-27 13:06
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2   Branche : feat/personnalisation-2   Base : origin/main @ 45484db
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-2-cadrage.md   Plan(s) : docs/plans/personnalisation-2-PLAN.md
Arrêt ferme : 2026-11-27 15:21 (bilan et poussée à 15:11)

## Référence
Rapide : voir complète
Complète (origin/main, verifier.sh --e2e, 16 min) : OK · cargo 1356 · web 3628 (178 fichiers) · cli 263 (29 fichiers)
Tailles Wasm à 45484db : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Fin du lot 1
verifier.sh --e2e sur 75cfe6d : e2e OK, OK · cargo 1410 · web 3765 (184 fichiers) · cli 265 (29) · Wasm principal 1 394 336 o, formats 2 794 511 o · personnalisation-2 : OK, CLI : OK
Double relecture : conformité + qualité UI + qualité TS, aucun bloquant ; majeurs corrigés par T20, T21 ; essais anciens : amorce foldOptions dans s34, c3, c4, c6a, c8, c13 ; T22 (menu sous le panneau, panneau compact, calage, design-l2/l3), T24, T25, T26.

## Lot 2 — reprise
Branche poussée : feat/personnalisation-2b (c98c9b2), base lot 1 avant l'intégration d'OG4/OG5. Contient T12 (champs fillStyle, pointes, textAlign, link), T13 (Restack minimal), T14 (rendu hachures, pointes, alignement, polices), T15 (panneau : Remplissage, Texte, Pointes, Disposition, raccourcis Ctrl+(Maj+)↑/↓), T16 (sélecteur de couleur, S et G), T17 (Aide « ? », Effacer la page, Ctrl+Maj+E export PDF), T28 (outils de création lisent le style lot 2). Preuves rejouées par tâche ; aucune suite complète, aucune relecture de lot.
Prochaine tâche exacte : 1) `git merge origin/main` dans feat/personnalisation-2b ; **retirer le `Restack` de T13 (order.rs, BadOrder, pont, faux cœur, CLI) et brancher Disposition (T15) sur le `Restack { ids, to }` d'OG4 et ses raccourcis d'ordre** (OG4 a déjà des raccourcis d'ordre et la rangée Sélection Premier plan/Arrière-plan : garder un seul jeu, celui d'OG4, et l'afficher dans le panneau) ; 2) T18 lien (non commencé) ; 3) T19 essai navigateur S6–S8 + captures ; 4) double relecture du lot ; 5) verifier.sh --e2e ; 6) PR et fusion.

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 7 importantes arbitrées) · relecture plan 1/3 (1 bloquant + 7 importants corrigés ; tour 2 sauté faute de temps, lot 1 relu en entier) · vagues sans progrès 0/2 · correctifs de fin 0/2

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
ouvertes : — · passées : —

## Pièges trouvés
- OG4 (feat/personnalisation-1a) touche commands.rs, api.ts, fake-core.ts, ops.ts, keys.ts, toolbar-profiles.ts, App.tsx, rb.css, icons.ts, SelectionRow.tsx… ; OG5 (1b) commands.rs, element.rs, api.ts, rb.css, App.tsx : relire avant le rebase final.
- Wasm ignoré par git : posé par l'orchestrateur dans chaque worktree de tâche (copie de apps/web/src/wasm*).
- Prémisses démenties : menu ☰ existe déjà (MenuBar) ; WebGL2 ne peint que la couche vive ; aucune commande d'ordre dans main.

## Notes du coffre à poser
(à la clôture)
