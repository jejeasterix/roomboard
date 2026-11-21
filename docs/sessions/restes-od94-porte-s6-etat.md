# État — restes-od94-porte-s6

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Le pire cas S6 du pot (C8) répond sous 35 ms de médiane même sur la VM chargée, et un audit d'architecture classe les zones à refondre pour que Jérôme choisisse.
Étage : 3 (vague 2) — depuis 2026-11-21 13:20
Avancement : 1/5 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6   Branche : fix/restes-od94-porte-s6   Base : origin/main @ afc2d8b
Branche principale locale au lancement : afc2d8b
Cadrage : docs/plans/restes-od94-porte-s6-cadrage.md   Plan(s) : docs/plans/restes-od94-porte-s6-PLAN.md

## Référence
Complète (origin/main afc2d8b, verifier.sh --e2e) : OK en 6 min 40 · module Wasm 1 368 840 o · module formats 3 100 845 o · S6 médiane 40 ms (38, 40, 50), fond 22 ms

## Mesure avant (5 passages C8 de suite, 2026-11-21 ~12:50)
| passage | charge 1/5/15 min | S6 trois clics triés | médiane | fond |
|---|---|---|---|---|
| 1 | 3.90 4.42 3.73 | 38, 40, 50 | 40 | 22 |
| 2 | 3.67 4.36 3.71 | 38, 40, 51 | 40 | 23 |
| 3 | 3.45 4.31 3.70 | 38, 40, 50 | 40 | 22 |
| 4 | 3.26 4.25 3.68 | 37, 39, 50 | 39 | 22 |
| 5 | 3.16 4.21 3.68 | 37, 40, 50 | 40 | 21 |
Médiane des médianes 40 ms, maximum 51 ms (un clic sur trois à ~50 ms, à chaque passage).

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Terminé quand
porte S6 : médiane ≤ 35 ms sur 5 passages C8 de suite sur la VM, aucun > 50 ms, seuil et fixture inchangés · test de non-régression du comportement C8 · rapport d'audit docs/audits/2026-11-21-audit-architecture.md · verifier.sh --e2e OK · double relecture sans bloquant · PR fusionnée (merge --no-ff local + push)

## Choix tranchés seul
- Mode du cadrage : autonome (brief : aucune question ne parvient à Jérôme pendant le tour).

## Hors périmètre
- Tout refactor issu de l'audit (choix du candidat : Jérôme).

## Tâches
| id | dépend | état | dernier commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 | — | terminée | 8fddb99 | banc 2 passed ; fenêtre médiane 36.6 ms, element(id) 17.1 ms, empreinte sha256 b2f8da76… |
| T2 | T1 | en cours | — | — |
| T3 | T2 | à faire | — | — |
| T5 | T2, T3 | à faire (avancée avant T4, relecture du plan point 1) | — | — |
| T4 | T3, T5 | conditionnelle : seulement si 5 passages C8 après T3 ratent S1 | — | — |

## Corrections de la relecture du plan (portées par les briefs, pas par le plan)
- Ordre V4 = T5, V5 = T4 ; T4 décidée par l'orchestrateur sur 5 passages C8, pas sur un seul.
- Premier clic à froid : aucun préchauffage, aucune mémoire réservée au chargement, aucun appel à blanc ; seulement moins de mémoire de pointe ou d'allocations.
- Commits par `git commit -- <chemins>` ; taille `formats` lue dans verifier.sh à la clôture ; K8 sans id aussi sur la fausse liaison ; 6 lignes OE23 en T2.
- T3 : banc (c) appelle `marks.tags` avant la boucle ; témoin natif « sans objet » ; clôture du constat `zone-marks.ts:56` à la clôture (4.3).

## Choix tranchés seul (suite)
- Cible S1 en lecture stricte : chacune des 5 médianes ≤ 35 ms, aucun clic > 50 ms.
- « VM chargée » = VM dans son état réel, charge relevée ; pas de charge artificielle comme porte.
- Interface `elementIdsOfKind(page, kind)` plutôt qu'`elementKinds` (pas d'alignement de tableaux).
- Plafond 2²¹ exclu (S6 passerait sous MIN_CELLS) ; Worker seulement en décision écrite si les gains directs échouent.
