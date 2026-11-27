# État — personnalisation-2

Statut : en cours
Gabarit : chantier (18 tâches : lot 1 = 10, lot 2 = 8 ; lot 1 fusionnable seul)
Objectif : RoomBoard reçoit un panneau d'options par outil et un menu général ☰ copiés du comportement d'Excalidraw, remplis de nos commandes, tactile d'abord et clavier ensuite.
Avancement : 0/19 tâches terminées (lot 1 : T1–T11, lot 2 : T12–T19)
Étage : 3 (vague 1) — depuis 2026-11-27 09:56
Lot : —
Tâche : T1 — Cœur Look — depuis 09:56 ; T3 — Contrat TS Look — depuis 09:56 ; T7 — Raccourcis et menu ☰ — depuis 09:56
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2   Branche : feat/personnalisation-2   Base : origin/main @ 45484db
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-2-cadrage.md   Plan(s) : docs/plans/personnalisation-2-PLAN.md
Arrêt ferme : 2026-11-27 15:21 (bilan et poussée à 15:11)

## Référence
Rapide : voir complète
Complète (origin/main, verifier.sh --e2e, 16 min) : OK · cargo 1356 · web 3628 (178 fichiers) · cli 263 (29 fichiers)
Tailles Wasm à 45484db : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 7 importantes arbitrées) · relecture plan 1/3 (1 bloquant + 7 importants corrigés ; tour 2 sauté faute de temps, lot 1 relu en entier) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table complète : en tête de docs/plans/personnalisation-2-PLAN.md. Vagues : V1 T1,T3,T7 · V2 T2,T6,T8 · V3 T4 · V4 T5,T9 · V5 T10 · V6 T11 | lot 2 : V7 T12 · V8 T13,T14 · V9 T15 · V10 T16,T17 · V11 T18 · V12 T19
| id | worktree | état | essais | commit vert | preuve rejouée |
|----|----------|------|--------|-------------|----------------|
| T1 | …--T1 | en cours | 1/3 | — | — |
| T3 | …--T3 | en cours | 1/3 | — | — |
| T7 | …--T7 | en cours | 1/3 | — | — |

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
