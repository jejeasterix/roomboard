# État — usage-c10a-tableau

Statut : en cours
Gabarit : chantier (provisoire, 7 à 12 tâches estimées)
Objectif : Dans RoomBoard, créer un tableau par une grille de choix, écrire dans ses cellules au clavier (Tab), insérer et supprimer lignes et colonnes, uniformiser les tailles, choisir une couleur, et le retrouver en rouvrant le `.roomboard`.
Avancement : 0/? tâches
Étage : 2 — depuis 2026-11-20 08:47
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c10a-tableau   Branche : feat/usage-c10a-tableau   Base : origin/main @ 8247215
Branche principale locale au lancement : 8247215
Cadrage : docs/plans/usage-c10a-tableau-cadrage.md   Plan(s) : docs/plans/usage-c10a-tableau-PLAN.md
Lancement : 2026-11-20 08:04 · repli (push + état) au plus tard 12:54 · arrêt ferme 13:04
Mode : ouvrier CLI autonome (OD71) — aucune question à Jérôme, choix tranchés et consignés.

## Référence
verifier.sh OK sur origin/main 8247215 (rapide = complète, worktree neuf) · core 244 (2 ignorés) · module Wasm 917 469 o — /tmp/c10a-ref.log

## Compteurs
contre-relecture cadrage 1/2 (1 bloquant B1 + 3 importants corrigés ; 2e tour non joué, pour le délai) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à venir, étage 2)

## Restes à prendre (brief OD71)
- OD56 : fichier non reconnu lu entier avant refus (appli) → lire l'en-tête seulement, test.
- OD56 : 12 branches feat/usage-c2-depot--T<n> — FAIT : 12/12 fusionnées dans origin/main, supprimées en local (git branch -d) ; aucune n'existait sur origin.
- OD55 : mesure du module Wasm seulement s'il passe 1 400 000 o.

## Choix tranchés seul
- (aucun encore)

## Cadrage
15 décisions T1-T15, 6 DAC, 17 hypothèses (7 de niveau 1). Scénarios : S1 geste S11 e2e (4×3, Tab, + colonne, + ligne, enregistrer, rouvrir) · S2 clavier (Tab fin, Maj+Tab, flèches, annulation, cellule sous l'encre) · S3 tailles, uniformiser, couleur, rechargement · S4 kind inconnu gardé octet pour octet · S5 fichier non reconnu refusé après lecture de 4 096 o.
Pièges trouvés : reste OD56 dans import.ts:115 (blob() avant détection), pas l'ouverture Ctrl+O ; constat KNOWN_KINDS (architecture-constats.md:10) reste ouvert.

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · S11 (partie C10a) réussi en Playwright · capture 4 × 3 dans docs/essais/ · fusion locale --no-ff poussée

## Hypothèses à revoir
—
