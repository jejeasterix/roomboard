# État — usage-c8-pot-zones

Statut : en cours
Gabarit : chantier (provisoire, ~9 tâches estimées)
Objectif : Un clic du pot dans une zone fermée par plusieurs objets (traits, formes) pose un nouvel élément `kind: "fill"` non lié, au-dessus des objets d'origine, avec une tolérance de fermeture de 2 px ; hors de toute zone fermée, le pot garde le comportement de C6a (fond de la page) ; chaque clic est une étape d'annulation.
Avancement : 0/? tâches terminées
Étage : 2 — depuis 2026-11-21 07:36
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c8-pot-zones   Branche : feat/usage-c8-pot-zones   Base : origin/main @ 94976f0
Branche principale locale au lancement : 94976f0
Cadrage : docs/plans/usage-c8-pot-zones-cadrage.md   Plan(s) : docs/plans/usage-c8-pot-zones-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD94), aucune question à Jérôme pendant le tour. Arrêt ferme : 2026-11-21 11:00 (pousser avant 10:50).

## Référence
Avant (main 94976f0, chiffres du brief) : module Wasm principal 1 145 044 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728, marge 45 Ko)
Complète (origin/main @ 94976f0, verifier.sh --e2e) : OK · web 123 fichiers, 2425 tests · module Wasm 1 145 044 o · module formats 3 100 344 o · scène 662 px Pot actif, 706 px ailleurs

## Compteurs
contre-relecture cadrage 1/2 (B1 temps corrigé par porte DA-Z5) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à venir, étage 2)

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · scénarios réussis · capture dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 07:00 lancement, worktree depuis origin/main @ 94976f0.
- 2026-11-21 07:36 cadrage écrit et corrigé (vue rastérisée U28 rétablie ; contre-relecture 1/2 : B1 temps → porte ≤ 50 ms, S6). 20 décisions, 5 DA, 13 hypothèses dont 6 de niveau 1, scénarios S1–S6. `i_overlay` mesuré : +214 643 o dans le module principal (formats exclu, marge 45 Ko).

## Pièges trouvés
- Prémisse démentie : `usage-cadrage.md` plaçait `i_overlay` dans `formats` ; il ne tient pas dans sa marge (45 384 o) → module principal.
- Le dépôt n'utilise pas `wasm-opt` ; `i_overlay` et `i_key_sort` ne livrent pas de LICENSE (texte amont à reprendre).
- Chantiers en cours sur les mêmes fichiers : aucun.
