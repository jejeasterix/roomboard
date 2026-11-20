# État — usage-c9-grille

Statut : en cours
Gabarit : courte (6 tâches, confirmé à l'étage 2)
Objectif : Chaque page de RoomBoard peut afficher une grille nette (six types d'U31) et aimanter les éléments déplacés, enregistrée dans le fichier `.roomboard`.
Avancement : 7/7 tâches terminées
Étage : 3 (fin de lot : double relecture conformité + qualité Rust + qualité TS) — depuis 2026-11-20 05:21
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c9-grille   Branche : feat/usage-c9-grille   Base : origin/main @ 05fdb73
Branche principale locale au lancement : 05fdb73
Cadrage : docs/plans/usage-c9-grille-cadrage.md   Plan(s) : docs/plans/usage-c9-grille-PLAN.md
Lancement : 2026-11-20 03:40 · repli (push + état) au plus tard 08:30 · arrêt ferme 08:40
Ordre de fusion : C2, C7, C9 (cadrage § 9) — fusion de C9 seulement après C7 dans origin/main.

## Référence
Tête 7cf48d7 : verifier.sh OK · core 208 (2 ignorés) · web 884 / 63 fichiers (/tmp/c9-fin-sha.log)
Rapide = complète (worktree neuf sur origin/main 05fdb73) : verifier.sh OK · cargo core 181 (2 ignorés) · web 814 / 62 fichiers

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; 6 corrections passées dans les consignes des tâches au lieu d'un retour au planificateur, pour tenir le délai) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan : 9973848. Vague 1 : T1, T2, T3 · vague 2 : T4 (T2,T3), T5 (T2), T6 (T1,T2).
| id | dépend | worktree | sub | état | essais | commit vert | preuve rejouée |
|----|--------|----------|-----|------|--------|-------------|----------------|
| T1 cœur Rust grid.rs/SetGrid | — | --T1 | concepteur-critique | terminée | 1/3 | 2438faa | cargo core 205 ok/2 ign ; 25 grid ; compat socle vert |
| T2 contrat TS + fake-core | — | --T2 | concepteur-critique | terminée | 1/3 | 2d8c2fc | vitest src/core 95 ok/12 sautés (sans wasm) ; C9 fausse liaison 9, G4 5 |
| T3 grid-paint.ts | — | --T3 | implementeur-tdd | terminée | 1/3 | 893ecff | vitest grid-paint 7/7 rejoué |
| T4 scène canvas2d, couches | T2,T3 | --T4 | implementeur-tdd | terminée | 1/3 | 3a6d299 | vitest canvas2d+page 29/29 |
| T5 magnétisme select/shape, Alt | T2 | --T5 | concepteur-critique | terminée | 1/3 | 06e7027 | vitest src/engine 351/351, S3 S4 présents |
| T6 liaison Wasm + contrat + notices | T1,T2 | --T6 | concepteur-critique | terminée | 1/3 | 06f9ce0 | vitest src/core wasm requis 149/149 ; tsc 0 ; module 1 520 076 o |
| T7 correctifs des relectures T1/T2/T5/T6 | T1-T6 | --T7 | concepteur-critique | terminée | 1/3 | c662d97 | verifier.sh OK sur 7cf48d7 (core 208, web 884) |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · scénarios réussis · C7 fusionné puis rebase · fusion locale --no-ff poussée

## Hypothèses à revoir
- Choix de l'orchestrateur (relectures) : snap_delta rend `q - point d'origine` (0 exact) ; aperçu de forme soumis au même seuil que le relâché ; rectangle/ellipse dégénérés (largeur ou hauteur nulle après aimant) refusés ; niveau relu sans `kind` écarté, `color`/`line` vides → défauts de lecture ; plafond des portées = MAX_GRID_DOTS / 5.

## Hors périmètre
- Panneau d'édition à aperçu direct (C9 vague 1) · ressource grille (C4)

## Portes
ouvertes : — · passées : —

## Constats d'architecture
duplication · cœur · crates/roomboard-core/src/query.rs:233-252 · `snap_box` recopie la boucle de `bounds` (:211-229) ; une aide commune recevant la fonction de contour suffirait.

## Pièges trouvés
- Prémisses démenties (cadrage) : commande nommée `SetGrid` (et non `SetPageGrid`, cadrage usage l. 107) ; `backdrop` de C2 pas encore dessiné (place réservée) ; magnétisme aussi sur les formes (U31) ; `bounds` inclut l'épaisseur du trait → boîte d'accroche géométrique à part.
- Chantier en cours sur les mêmes fichiers : C7 `feat/usage-c7-texte-riche` (commands.rs, element.rs, document.rs, roomboard-wasm/src/lib.rs, api.ts, fake-core.ts, wasm-core.ts, canvas2d.ts) : à relire avant le rebase.

## Cadrage
f2ac57d · 15 décisions · 9 hypothèses (6 de niveau 1) · 3 DA · 15 modules à réutiliser · S1 aller-retour + annuler A→B · S2 compatibilité + kind inconnu · S3 déplacement aimanté · S4 forme aimantée · S5 rendu net page infinie
