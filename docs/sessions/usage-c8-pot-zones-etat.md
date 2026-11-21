# État — usage-c8-pot-zones

Statut : en cours
Gabarit : chantier (provisoire, ~9 tâches estimées)
Objectif : Un clic du pot dans une zone fermée par plusieurs objets (traits, formes) pose un nouvel élément `kind: "fill"` non lié, au-dessus des objets d'origine, avec une tolérance de fermeture de 2 px ; hors de toute zone fermée, le pot garde le comportement de C6a (fond de la page) ; chaque clic est une étape d'annulation.
Avancement : 0/? tâches terminées
Étage : 0 — depuis 2026-11-21 07:00
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c8-pot-zones   Branche : feat/usage-c8-pot-zones   Base : origin/main @ 94976f0
Branche principale locale au lancement : 94976f0
Cadrage : docs/plans/usage-c8-pot-zones-cadrage.md   Plan(s) : docs/plans/usage-c8-pot-zones-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD94), aucune question à Jérôme pendant le tour. Arrêt ferme : 2026-11-21 11:00 (pousser avant 10:50).

## Référence
Avant (main 94976f0, chiffres du brief) : module Wasm principal 1 145 044 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728, marge 45 Ko)
Complète (origin/main @ 94976f0, verifier.sh --e2e) : OK · web 123 fichiers, 2425 tests · module Wasm 1 145 044 o · module formats 3 100 344 o · scène 662 px Pot actif, 706 px ailleurs

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à venir, étage 2)

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · scénarios réussis · capture dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 07:00 lancement, worktree depuis origin/main @ 94976f0.
