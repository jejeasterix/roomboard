# État — design-l2

Statut : en cours
Gabarit : chantier (8 tâches)
Objectif : Remplacer la grille à bandes de RoomBoard par des îlots blancs flottants au-dessus de la scène (barre d'outils au centre, déplaçable et repliable ; onglets, menu, pages, annuler et zoom, bibliothèque et profil), pour que la scène occupe toute la hauteur de la fenêtre, comme la maquette 01.
Avancement : 14/14 tâches terminées (8 du plan, 2 correctifs d'essais, 4 correctifs de fin)
Étage : 4 — depuis 2026-11-25 20:00
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l2   Branche : feat/design-l2   Base : origin/main @ bbbc597
Branche principale locale au lancement : bbbc597
Cadrage : docs/plans/design-l2-cadrage.md   Plan(s) : docs/plans/design-l2-PLAN.md
Relectures : pc

## Brief
OF68, ouvrier CLI lancé le 2026-11-25 vers 17:58 ; arrêt ferme vers 21:28 (pousser et mettre l'état à jour avant 21:18).
Aucune question ne parvient à Jérôme : tout se tranche seul et s'écrit (section Hypothèses).
Fusion par `git merge --no-ff` locale puis `git push` sans `--force` ; auteur jejeasterix <jejeasterix@users.noreply.github.com>.

## Référence
Complète (origin/main @ bbbc597, verifier.sh --e2e) : OK — cargo 1356 (8 ignorés) · web 3477 · cli 263 · e2e OK — journal ~/.cache/tmp/of68-ref/verifier-bbbc597.log
Référence L3 sur 8113f4c (même arbre fusionné) : cargo 1356 (8 ignorés) · web 3477 · cli 263 · e2e OK
Wasm avant : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (1 bloquant petits écrans, 5 majeurs : renvoyés au cadreur) · relecture plan 0/3 (sautée pour le temps : le planificateur a pris 43 min ; la double relecture de fin couvre) · vagues sans progrès 0/2 · correctifs de fin 2/2 (+ une retouche d'une ligne de l'orchestrateur : place de trois numéros, CL5b-8)

## Tâches
| id | dépend | fichiers (abrégés) | état | commit vert | preuve rejouée |
|----|--------|--------------------|------|-------------|----------------|
| T1 | — | toolbar, toolbar-profiles, ProfileEditor + tests | terminée | 51b1029 | V1 : tsc 0, suite web 3529 |
| T2 | — | island-place (neuf), device-settings | terminée | 477ae06 | idem |
| T3 | — | icons, MenuBar (neuf), notices | terminée | 4f4af13 | idem ; controle-icones 9 cas |
| T4 | T1 | TabsBar, PagesBar, App.test | terminée | d6d4f12 | V2 : tsc 0, suite web 3558 |
| T5 | T2,T3 | Island (neuf) — concepteur-critique | terminée | e78ebe1 | idem ; revue immédiate reportée à la double relecture (temps) |
| T6 | T1-T5 | App, layout, Toolbar, rb.css — concepteur-critique | terminée | a866978 | V3 : tsc 0, suite web 3583 |
| T7 | T6 | essais existants, clickItem, s5b | terminée | f6bb825 | S5b : OK ; 8 essais rouges renvoyés en T9/T10 |
| T8 | T6 | essai design-l2, verifier.sh, captures, comparaison | terminée | 961f4a5 | design L2 : ÉCHEC sur bbbc597, OK sur L2 |
| T9 | T8 | icônes au pixel entier (padToPixel), c1 | terminée | 266414a | design L1, C1, design L2 OK ; suite 3589 |
| T10 | T8 | gestes des essais c2, c8, c10b, c13, c15, design-l4 | terminée | d37cc47 | 7 essais OK |
| T11 | relectures | #etat recouvert, Show keyed, clés d'appareil | terminée | c8c061b | suite 3597, design L2, S5b OK |
| T12 | relectures + impeccable | menu fixed, clavier, pages, eraser-part | terminée | 0151d82 | suite 3594, design L1/L2 OK |
| T13 | verifier | Ctrl+O (non reproductible), fond #F5F5F8 | terminée | 167e4b4 | c3 OK 5/5 ; suite 3589 |
| T14 | relecture du correctif 1 | mémo d'id, infobulle Menu, resize, %2E | terminée | 7b42738 | suite 3606 ; design L2, L3, C1 OK |
| — | verifier | place de trois numéros (CL5b-8) | terminée | 05677d4 | C13 OK, design L2 OK |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK sans régression · #stage = hauteur de la fenêtre (mesuré) · s5b joué · netteté § 10 · recadrages comparés à la maquette 01 · PR fusionnée dans main

## Hypothèses à revoir
Voir le cadrage (H1 à H14, H10 au niveau 1 : position de l'îlot sur l'appareil, contre U12). Choix de l'orchestrateur :
- RESERVED_BAR_IDS garde `tabs` (validation des profils inchangée) ; le test toolbar.test.ts:124 passe en inclusion.
- Ordre DOM des barres du tableau suit les coins du calque (App.test.tsx:637,641).

## Hors périmètre
- Icône de l'app (L5), thème sombre (Q7), police Inter (Q6).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Une scène pleine fenêtre met sous les îlots les gestes des essais écrits en px de scène (coin haut-gauche jusqu'à y 72) : choisir des points hors de `islandBoxes`.
- Icônes après un texte de largeur fractionnaire : x fractionnaire, donc flou ; `padToPixel` arrondit la boîte du texte vers le haut.
- Un `createMemo` qui rend un tableau neuf relance `Show keyed` à chaque lecture : mémoriser la chaîne d'abord.

## Restes
- moyen : la page commence à 16 px du haut, sous les îlots du haut (`fitPage`, `engine/camera.ts`) ; la maquette la pose vers y 152.
- faible : Ctrl+O sous charge après Ctrl+S (C3 rouge une fois, non reproduit 5/5 ; course `busy` supposée, déjà présente avant L2).
- faible : restes d'OF61 non pris (focus après « Revenir à l'origine », poignée de tri 44 px) : hors du chemin de L2.
- faible : revue immédiate de T5 (concepteur-critique) remplacée par la double relecture de fin ; relecture du plan sautée pour le temps.
