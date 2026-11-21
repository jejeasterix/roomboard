# État — restes-od94-porte-s6

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Le pire cas S6 du pot (C8) répond sous 35 ms de médiane même sur la VM chargée, et un audit d'architecture classe les zones à refondre pour que Jérôme choisisse.
Étage : 1 — depuis 2026-11-21 12:35
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
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Terminé quand
porte S6 : médiane ≤ 35 ms sur 5 passages C8 de suite sur la VM, aucun > 50 ms, seuil et fixture inchangés · test de non-régression du comportement C8 · rapport d'audit docs/audits/2026-11-21-audit-architecture.md · verifier.sh --e2e OK · double relecture sans bloquant · PR fusionnée (merge --no-ff local + push)

## Choix tranchés seul
- Mode du cadrage : autonome (brief : aucune question ne parvient à Jérôme pendant le tour).

## Hors périmètre
- Tout refactor issu de l'audit (choix du candidat : Jérôme).
