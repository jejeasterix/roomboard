# État — usage-c6a-pot

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : L'outil Pot (couleur choisie, puis clic) colore la cible de U28 — forme (contour près du bord, sinon intérieur), trait, mot sous le pointeur dans un texte ou une cellule, fond de la page si rien n'est touché — et une coloration s'annule en une étape.
Avancement : 0/? tâches terminées
Étage : 2 — depuis 2026-11-20 15:56
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c6a-pot   Branche : feat/usage-c6a-pot   Base : origin/main @ 28ba886
Branche principale locale au lancement : 28ba886
Cadrage : docs/plans/usage-c6a-pot-cadrage.md   Plan(s) : docs/plans/usage-c6a-pot-PLAN.md
Lancement : 2026-11-20 15:33 · arrêt ferme 19:33 (bilan à 19:23)

## Référence
Complète (origin/main @ 28ba886) : `verifier.sh --e2e` OK (e2e OK)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à l'étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture forme + contour + mot colorés dans docs/essais/ · scène ≥ 640 px mesurée par un test · PR mergée par fusion locale --no-ff et push sans --force

## Scénarios et captures
S1 remplir un rectangle, annuler, rétablir · S2 contour près du bord, trait, « Aucune » · S3 mot d'un texte (et hors mot = texte entier), mot d'une cellule, cellule vide · S4 fond de page ; image → fond (C6b absent) · S5 aller-retour .roomboard, fichier d'avant C6a, scène ≥ 640 px, capture

## Hypothèses à revoir (niveau 1 d'abord)
13 hypothèses dont 5 de niveau 1 (cadrage § hypothèses) ; 24 lignes « Modules à réutiliser ou à étendre ».

## Hors périmètre
- P1 sur image (C6b, attend C5) ; P3 zones fermées par plusieurs objets (C8) : le pot passe à l'étape suivante de la cible (fond de la page).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : FormatText ne vise pas une cellule (mot d'une cellule par SetTableCell) ; aucune commande ne change fill/color/background d'un objet posé (→ commande Fill) ; le rendu peint un fond constant (canvas2d.ts:201, :439, webgl2.ts:384).
- Fichiers communs probables avec C3 : commands.rs, lib.rs (core, wasm), api.ts, fake-core.ts, wasm-core.ts, engine.ts, toolbar*.ts, toolbar-host.ts, verifier.sh.
- OD83 (C3 groupes, `feat/usage-c3-groupes`) tourne en même temps : sélection et collage. Intégrer origin/main avant la fusion.

## Notes du coffre à poser

## Choix tranchés seul
- Mode du cadrage : autonome (brief de Jérôme, 2026-11-19 : « Aucune question ne lui parvient pendant ton tour : tranche seul »).
- Un objet groupé se colore seul : le pot vise l'élément, pas le groupe.
