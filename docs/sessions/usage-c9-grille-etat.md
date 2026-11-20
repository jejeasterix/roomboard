# État — usage-c9-grille

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Chaque page de RoomBoard peut afficher une grille nette (six types d'U31) et aimanter les éléments déplacés, enregistrée dans le fichier `.roomboard`.
Avancement : —
Étage : 2 — depuis 2026-11-20 04:01
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c9-grille   Branche : feat/usage-c9-grille   Base : origin/main @ 05fdb73
Branche principale locale au lancement : 05fdb73
Cadrage : docs/plans/usage-c9-grille-cadrage.md   Plan(s) : docs/plans/usage-c9-grille-PLAN.md
Lancement : 2026-11-20 03:40 · repli (push + état) au plus tard 08:30 · arrêt ferme 08:40
Ordre de fusion : C2, C7, C9 (cadrage § 9) — fusion de C9 seulement après C7 dans origin/main.

## Référence
Rapide = complète (worktree neuf sur origin/main 05fdb73) : verifier.sh OK · cargo core 181 (2 ignorés) · web 814 / 62 fichiers

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · scénarios réussis · C7 fusionné puis rebase · fusion locale --no-ff poussée

## Hypothèses à revoir
—

## Hors périmètre
- Panneau d'édition à aperçu direct (C9 vague 1) · ressource grille (C4)

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties (cadrage) : commande nommée `SetGrid` (et non `SetPageGrid`, cadrage usage l. 107) ; `backdrop` de C2 pas encore dessiné (place réservée) ; magnétisme aussi sur les formes (U31) ; `bounds` inclut l'épaisseur du trait → boîte d'accroche géométrique à part.
- Chantier en cours sur les mêmes fichiers : C7 `feat/usage-c7-texte-riche` (commands.rs, element.rs, document.rs, roomboard-wasm/src/lib.rs, api.ts, fake-core.ts, wasm-core.ts, canvas2d.ts) : à relire avant le rebase.

## Cadrage
f2ac57d · 15 décisions · 9 hypothèses (6 de niveau 1) · 3 DA · 15 modules à réutiliser · S1 aller-retour + annuler A→B · S2 compatibilité + kind inconnu · S3 déplacement aimanté · S4 forme aimantée · S5 rendu net page infinie
