# État — personnalisation-3-tableau

Statut : en cours — lot A fusionné ; lot B partiel en fusion ; TB3–TB6 et lot C reportés (taille Wasm)
Gabarit : lots (provisoire : 15 points en 3 lots A, B, C)
Objectif : L'outil Tableau accueille des objets dans ses cases (la case s'adapte), se règle finement (bordures, alignement, en-tête) et sert en classe (case cachée, tri, tableau de tri, collage Excel/Word).
Avancement : 1/3 lots clos (A, PR #72, main bf9eb292) · lot B 2/6 (TB1, TB2) en PR
Étage : 4 (lot A) / 3 (lot B, worktree --B) — depuis 2026-11-27 22:20
Lot : A « objets dans les cases » — 11/11 tâches terminées — depuis 2026-11-27 19:25
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau   Branche : feat/personnalisation-3-tableau   Base : origin/main @ 53a14b6e
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/personnalisation-3-tableau-cadrage.md (745275c1)   Plan(s) : docs/plans/personnalisation-3-tableau-PLAN.md (lot A) · …-PLAN-lotB.md (aff954e3, 6 tâches TB1–TB6, non relu)
Mode du cadrage : autonome (brief OG26 : aucune question ne parvient à Jérôme pendant le tour)
Arrêt ferme : 2026-11-28 00:50 (lancement 18:20 + 6 h 30) ; pousser à 00:40

## Référence
Rapide = complète (worktree à 53a14b6e + docs) : cargo 1495 passés (2 ignorés) · apps/web 4043 (195 fichiers) · apps/cli 282 (30 fichiers)
Complète (verifier.sh --e2e) : verte ; C3 groupes ÉCHEC sur délai (filechooser 30 s) au 1er passage, OK au rejeu unique (suite e2e rejouée depuis C3 : « verifier.sh : e2e OK »)
Tailles Wasm mesurées à 53a14b6e : principal 1 429 754 o · formats 2 794 527 o
Tailles Wasm avant (brief, à 59b75db) : principal 1 429 407 o · formats 2 794 527 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; 8 corrections faites, coupe T1/T2) · vagues sans progrès 0/2 · correctifs de fin 2/2 (tour 1 : 1 bloquant, 3 majeurs ; tour 2 : 1 majeur neuf, corrigé en C4)

## Tâches (lot A, plan 957b90fd ; toutes « partagé », séquentielles)
| id | état | essais | commit vert | preuve rejouée |
|----|------|--------|-------------|----------------|
| T1a | terminée | 1/3 | cd7b8e4c | table_links 11 passés ; roomboard-core sans échec |
| T1b | terminée | 1/3 | 303804cb | transform 3 passés ; roomboard-wasm place_in_cell 1 ; module 1 462 073 o |
| T2a | terminée | 1/3 | a8f22003 | contrat -t personnalisation-3 : 20 passés (dont vrai wasm) ; web 4063 |
| T2b | terminée | 1/3 | 809f2e68 | ops.test 12 passés ; cli-essai S16 ×5 + CLI : OK |
| T3 | terminée | 1/3 | a0b510b4 | cell-drop 9 (S1, D28) + table-geom/select/table : 117 passés ; select.ts +13/−4 |
| T4 | terminée | 1/3 | 977f478a | essai navigateur 7 ok, « personnalisation-3 tableau : OK » ; captures photo-case-avant/agrandie |
| T5 | terminée | 1/3 | 9aeea3c3 | core 569 passés 0 échec ; 4 tests nommés + repeated_line ; contrat p-3 28 ; module 1 478 554 o |
| T6 | terminée | 1/3 | 63fb9aa7 | D11/cellKey/Alt+Entrée : 49 passés ; essai S4 colonne revient à 240 |
| T7 | terminée | 1/3 (+1 relance limite de tours) | 87c0514e | set_table_options 1 ; vitest 72 ; essai S2 au doigt 64×48 ; module 1 482 684 o |
| T8 | terminée | 2/3 (essai 1 : S3 rouge, îlot d'options sur la case dans l'essai) | 9173659c | commit_stroke_with 2 ; pen D10 3 ; web 4105 (197 fichiers) ; module 1 483 963 o ; défaut trouvé : trait perdu si le cœur refuse cell → repli a14fb697 |
| T9 | terminée | 1/3 (+1 relance ; régression cellContent bg:null corrigée 3aebad3c) | 3aebad3c | set_cell_image 2 ; S5 7 dont S5 PDF ; web 4118 ; module 1 488 946 o |
| C1 | terminée (bloquant tour 1 : fond absent du PDF vectoriel) | 1/3 | 283a0230 | pdf-overlay-vector + CLI /Subtype /Image ; 508 tests ciblés au rejeu |
| C2 | terminée (worktree isolé, fusionné ddd05888) | 1/3 | f3843eb0 | PlaceInCell refuse id en double ; cell_of ; table_links 26 ; module 1 489 781 o |
| C3 | terminée (Sortir réduit la case, écouteur du menu, a11y, icônes 24 px) | 1/3 | b70c04e9 | web 4134 |
| C4 | terminée (tour 2 : lien perdu en zone fusionnée ; garde rognage ; menu fermé sur Alt) | 1/3 | 8ebdd850 | 25 ciblés + essai OK |
| Fusion origin/main | f6f3f43f intégré (6 conflits, deux côtés gardés) | — | e2e40a23 | cargo check, tsc, 236 ciblés, contrat 501 |


## Terminé quand
lots A, B, C fusionnés dans main (ou A puis B, reste écrit) · verifier.sh --e2e OK · double relecture sans bloquant · scénarios réussis · captures 2x · PR fusionnée par git merge --no-ff + push sans --force

## Scénarios et captures
S1 loger une photo — réussi au doigt (CDP) · capture docs/design/captures/personnalisation-3-tableau/photo-case-agrandie.png : photo dans la case (1,1), colonne 416, ligne 316, tableau 896×444 ; traits 1 px nets ; le panneau « Transparence » masque le coin haut gauche (à refaire).
S4 sortir l'objet — réussi (image libre).
S16 CLI — réussi (cli-essai S16 ×5).
S2 rétrécir — réussi au doigt (menu de case, 44 px) · objet-ajuste.png, menu-case.png : îlot blanc, bouton « Rétrécir » net.
S3 tracé dans une case — réussi (le mot descend de 64) · trace-dans-case.png.

## Hypothèses à revoir
Cadrage : 33+ décisions, 5 d'architecture (DA1 objet de la page lié par `cell = [tableId,rowId,colId]`), ~24 hypothèses dont ~14 de niveau 1 (voir cadrage). 16 modules à réutiliser.
Scénarios : S1 loger une image · S2 rétrécir · S3 tracé suit sa case · S4 sortir l'objet · S5 image de fond · S6 tirer une bordure · S7 double appui · S8 alignement · S9 bordures · S10 en-tête · S11 déplacer ligne · S12 cache · S13 trier · S14 tableau de tri · S15 collage tabulé · S16 CLI · S17 U3 · S18 refus

## Hors périmètre
- (à corriger dans T5, défaut du chantier) `write_line_sizes` : une ligne en double dans `SetTableLineSizes` (`[[c0,400],[c0,240]]`) laisse 400, et `[[c0,1e39],[c0,240]]` écrit 1e39 (contrôle sur la dernière seulement). Le faux cœur reproduit.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Essais navigateur : l'îlot d'options d'un outil (80..364 px) recouvre la case (1, 0) au premier tracé ; l'essai le replie. Pour un utilisateur réel, même recouvrement possible (hors périmètre, à signaler).
- Une suite lancée en fond par un sous-agent meurt à la fin de son tour : la rejouer soi-même.
- Prémisses démenties : OG23 n'a pas livré d'accordéon (panneau absent pour l'outil Tableau) ; tableAt relit tous les éléments (O(N²)) ; runAll n'existe pas (une commande du cœur par geste).
- Ouvriers voisins : OG14 (personnalisation-2b), OG23 (outil de sélection), OG24 (portrait), OG25 (gomme) : intégrer origin/main avant fusion.

## Lot B (worktree …--B, branche --B2)
| id | état | commit vert | preuve rejouée |
|----|------|-------------|----------------|
| TB1 | terminée (relue, 7 constats corrigés ; C10b réparé : échelle du tableau) | e64c9777 | essai S6 +100, Ctrl+Z 720, Alt+→ 728 ; C10a/C10b OK |
| TB2 | terminée (relue, mineurs reportés) | 4bc9ae86 | essai S10 data-table-header 1/0/1 ; CLI T-B2 + CLI : OK |
| TB3–TB6 | reportées : TB4–TB6 demandent du Rust, module à 1 571 221 o (marge 1 643 o) ; TB3 faute de temps | — | — |

## Restes
- [fort] Module Wasm principal à 1 571 221 o pour un plafond de 1 572 864 : toute commande Rust neuve (lot B 8, 9, 11 ; lot C 13, 14) demande d'abord un travail sur la taille.
- [moyen] Points 7, 8, 9, 11 (lot B) et 12 (refermer le cache), 13, 14, 15 (collage tabulé) non faits.
