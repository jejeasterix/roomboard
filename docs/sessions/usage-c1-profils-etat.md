# État — usage-c1-profils

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : On choisit un profil, on modifie sa barre (emplacement, taille des boutons, outils, préréglages), on l'exporte et l'importe en `.rbprofile`, et on remet à zéro.
Avancement : —
Étage : 2 — depuis 2026-11-20 06:14
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c1-profils   Branche : feat/usage-c1-profils   Base : origin/main @ 3057e29
Branche principale locale au lancement : 3057e29
Cadrage : docs/plans/usage-c1-profils-cadrage.md   Plan(s) : docs/plans/usage-c1-profils-PLAN.md

## Référence
Rapide et complète (origin/main 3057e29) : `verifier.sh --e2e` OK · apps/web 937 tests · e2e OK

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
—

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh` OK (et `--e2e`) · captures de l'éditeur et de la barre à gauche en grands boutons dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et poussée

## Hypothèses à revoir (niveau 1 d'abord)
18 hypothèses dont 6 de niveau 1 (HC1-1…HC1-6), dans le cadrage. 33 décisions P1-P33. Scénarios : S1 e2e (profil, barre à gauche grands boutons, export, remise à zéro, réimport, captures) · S2 version 1.2 et outil inconnu, 2.0 refusé · S3 modifier `defaut` puis revenir à l'origine · S4 préréglages (unitaire/composant) · S5 annotation au démarrage, repli `board`.

## Hors périmètre
- association `.rbprofile` au système ; profil par utilisateur du système ; fenêtre d'annotation (C11a).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : stockage écartait la copie d'un livré ; aucun préréglage affiché ; `resolveStartMode` rend toujours `board` ; pas de graphe graphify RoomBoard.
- OD56 partage `toolbar.ts`, `toolbar-profiles.ts`, `ui/App.tsx`, `main.ts`, `verifier.sh`, `verifier-e2e.test.sh`, tests toolbar : relire au rebase ; adapter `platform/profile-files.ts`.
- Modules à réutiliser : 21 lignes.
