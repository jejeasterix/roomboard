# État — personnalisation-3-tableau

Statut : en cours
Gabarit : lots (provisoire : 15 points en 3 lots A, B, C)
Objectif : L'outil Tableau accueille des objets dans ses cases (la case s'adapte), se règle finement (bordures, alignement, en-tête) et sert en classe (case cachée, tri, tableau de tri, collage Excel/Word).
Avancement : 0/3 lots clos · lot A 6/11 tâches
Étage : 3 (vague séquentielle, worktree partagé) — depuis 2026-11-27 19:25
Lot : A « objets dans les cases » — 6/11 tâches terminées — depuis 2026-11-27 19:25
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
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; 8 corrections faites, coupe T1/T2) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches (lot A, plan 957b90fd ; toutes « partagé », séquentielles)
| id | état | essais | commit vert | preuve rejouée |
|----|------|--------|-------------|----------------|
| T1a | terminée | 1/3 | cd7b8e4c | table_links 11 passés ; roomboard-core sans échec |
| T1b | terminée | 1/3 | 303804cb | transform 3 passés ; roomboard-wasm place_in_cell 1 ; module 1 462 073 o |
| T2a | terminée | 1/3 | a8f22003 | contrat -t personnalisation-3 : 20 passés (dont vrai wasm) ; web 4063 |
| T2b | terminée | 1/3 | 809f2e68 | ops.test 12 passés ; cli-essai S16 ×5 + CLI : OK |
| T3 | terminée | 1/3 | a0b510b4 | cell-drop 9 (S1, D28) + table-geom/select/table : 117 passés ; select.ts +13/−4 |
| T4 | terminée | 1/3 | 977f478a | essai navigateur 7 ok, « personnalisation-3 tableau : OK » ; captures photo-case-avant/agrandie |
| T5–T9 | à faire | | | |


## Terminé quand
lots A, B, C fusionnés dans main (ou A puis B, reste écrit) · verifier.sh --e2e OK · double relecture sans bloquant · scénarios réussis · captures 2x · PR fusionnée par git merge --no-ff + push sans --force

## Scénarios et captures
S1 loger une photo — réussi au doigt (CDP) · capture docs/design/captures/personnalisation-3-tableau/photo-case-agrandie.png : photo dans la case (1,1), colonne 416, ligne 316, tableau 896×444 ; traits 1 px nets ; le panneau « Transparence » masque le coin haut gauche (à refaire).
S4 sortir l'objet — réussi (image libre).
S16 CLI — réussi (cli-essai S16 ×5).

## Hypothèses à revoir
Cadrage : 33+ décisions, 5 d'architecture (DA1 objet de la page lié par `cell = [tableId,rowId,colId]`), ~24 hypothèses dont ~14 de niveau 1 (voir cadrage). 16 modules à réutiliser.
Scénarios : S1 loger une image · S2 rétrécir · S3 tracé suit sa case · S4 sortir l'objet · S5 image de fond · S6 tirer une bordure · S7 double appui · S8 alignement · S9 bordures · S10 en-tête · S11 déplacer ligne · S12 cache · S13 trier · S14 tableau de tri · S15 collage tabulé · S16 CLI · S17 U3 · S18 refus

## Hors périmètre
- (à corriger dans T5, défaut du chantier) `write_line_sizes` : une ligne en double dans `SetTableLineSizes` (`[[c0,400],[c0,240]]`) laisse 400, et `[[c0,1e39],[c0,240]]` écrit 1e39 (contrôle sur la dernière seulement). Le faux cœur reproduit.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : OG23 n'a pas livré d'accordéon (panneau absent pour l'outil Tableau) ; tableAt relit tous les éléments (O(N²)) ; runAll n'existe pas (une commande du cœur par geste).
- Ouvriers voisins : OG14 (personnalisation-2b), OG23 (outil de sélection), OG24 (portrait), OG25 (gomme) : intégrer origin/main avant fusion.
