# État — personnalisation-3-tableau

Statut : en cours
Gabarit : lots (provisoire : 15 points en 3 lots A, B, C)
Objectif : L'outil Tableau accueille des objets dans ses cases (la case s'adapte), se règle finement (bordures, alignement, en-tête) et sert en classe (case cachée, tri, tableau de tri, collage Excel/Word).
Avancement : 0/3 lots clos
Étage : 2 — depuis 2026-11-27 18:55
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau   Branche : feat/personnalisation-3-tableau   Base : origin/main @ 53a14b6e
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/personnalisation-3-tableau-cadrage.md (745275c1)   Plan(s) : docs/plans/personnalisation-3-tableau-PLAN.md (lot A)
Mode du cadrage : autonome (brief OG26 : aucune question ne parvient à Jérôme pendant le tour)
Arrêt ferme : 2026-11-28 00:50 (lancement 18:20 + 6 h 30) ; pousser à 00:40

## Référence
Rapide = complète (worktree à 53a14b6e + docs) : cargo 1495 passés (2 ignorés) · apps/web 4043 (195 fichiers) · apps/cli 282 (30 fichiers)
Complète (verifier.sh --e2e) : verte ; C3 groupes ÉCHEC sur délai (filechooser 30 s) au 1er passage, OK au rejeu unique (suite e2e rejouée depuis C3 : « verifier.sh : e2e OK »)
Tailles Wasm mesurées à 53a14b6e : principal 1 429 754 o · formats 2 794 527 o
Tailles Wasm avant (brief, à 59b75db) : principal 1 429 407 o · formats 2 794 527 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
lots A, B, C fusionnés dans main (ou A puis B, reste écrit) · verifier.sh --e2e OK · double relecture sans bloquant · scénarios réussis · captures 2x · PR fusionnée par git merge --no-ff + push sans --force

## Hypothèses à revoir
Cadrage : 33+ décisions, 5 d'architecture (DA1 objet de la page lié par `cell = [tableId,rowId,colId]`), ~24 hypothèses dont ~14 de niveau 1 (voir cadrage). 16 modules à réutiliser.
Scénarios : S1 loger une image · S2 rétrécir · S3 tracé suit sa case · S4 sortir l'objet · S5 image de fond · S6 tirer une bordure · S7 double appui · S8 alignement · S9 bordures · S10 en-tête · S11 déplacer ligne · S12 cache · S13 trier · S14 tableau de tri · S15 collage tabulé · S16 CLI · S17 U3 · S18 refus

## Hors périmètre
—

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : OG23 n'a pas livré d'accordéon (panneau absent pour l'outil Tableau) ; tableAt relit tous les éléments (O(N²)) ; runAll n'existe pas (une commande du cœur par geste).
- Ouvriers voisins : OG14 (personnalisation-2b), OG23 (outil de sélection), OG24 (portrait), OG25 (gomme) : intégrer origin/main avant fusion.
