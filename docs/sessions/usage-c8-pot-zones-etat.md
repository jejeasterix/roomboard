# État — usage-c8-pot-zones

Statut : en cours
Gabarit : chantier (7 tâches, confirmé à l'étage 2)
Objectif : Un clic du pot dans une zone fermée par plusieurs objets (traits, formes) pose un nouvel élément `kind: "fill"` non lié, au-dessus des objets d'origine, avec une tolérance de fermeture de 2 px ; hors de toute zone fermée, le pot garde le comportement de C6a (fond de la page) ; chaque clic est une étape d'annulation.
Avancement : 9/11 tâches terminées
Étage : 3 — depuis 2026-11-21 08:02
Tâche : T11 — coût Wasm de la zone — depuis 2026-11-21 09:13
Tâche : T7 — essai navigateur, capture, tailles — depuis 2026-11-21 08:31
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c8-pot-zones   Branche : feat/usage-c8-pot-zones   Base : origin/main @ 94976f0
Branche principale locale au lancement : 94976f0
Cadrage : docs/plans/usage-c8-pot-zones-cadrage.md   Plan(s) : docs/plans/usage-c8-pot-zones-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD94), aucune question à Jérôme pendant le tour. Arrêt ferme : 2026-11-21 11:00 (pousser avant 10:50).

## Référence
Avant (main 94976f0, chiffres du brief) : module Wasm principal 1 145 044 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728, marge 45 Ko)
Complète (origin/main @ 94976f0, verifier.sh --e2e) : OK · web 123 fichiers, 2425 tests · module Wasm 1 145 044 o · module formats 3 100 344 o · scène 662 px Pot actif, 706 px ailleurs

## Compteurs
contre-relecture cadrage 1/2 (B1 temps corrigé par porte DA-Z5) · relecture plan 1/3 (aucun bloquant ; T1 : Outside sans masque transmis ; T7 : S4 et petit cercle à ajouter à l'essai, attente de `data-zone-ms`) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Vagues : V1 = T1, T3, T5 · V2 = T2, T4, T6 · V3 = T7. Worktrees : ~/projets/roomboard-wt/usage-c8-pot-zones--T<n>. Relecture du plan 1/3 lancée en parallèle de V1 (temps serré).
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 cœur zone, i_overlay, Fill Zone, pont Wasm | — | terminée | 1/3 | f388463 | core --features zone 470 tests ok (25 zone/fill/shape, square_gap_1px_closes_3px_leaks ok, témoin S6 ignoré comme prévu) ; module principal 1 350 143 o, formats 3 100 344 o |
| T2 vue, collision, anneaux ; contrat | T1, T3 | terminée | 1/3 | da044b5 | core fill 18 tests (fill_is_hit_inside_far_from_edges_only ok) ; contrat WASM_REQUIRED 364 tests, 3 « vrai module seulement » ; tsc 0 ; module principal 1 355 945 o |
| T3 interface TS, fausse liaison | — | terminée | 1/3 | cb5a511 | fake-core + contrat 251 tests, 6 « C8 » (bloc vrai module sauté faute de .wasm dans le worktree de tâche, joué en T2) ; écart : `continue` pour fill dans le test I3 TS |
| T4 rendu canvas2d | T3 | terminée | 1/3 | 006e8dd | canvas2d + record-ctx 98 tests, 3 « C8 fill » |
| T5 marques de zone | — | terminée | 1/3 | 690f802 | zone-marks + stage-tags 11 tests (dont « C8 Fill zone : durée mesurée ») |
| T6 outil Pot, cible zone | T3, T5 | terminée | 1/3 | 51961da | fill-target, tools/fill, image-fill, board-session 108 tests, 3 « C8 » ; 2 tests C6a remplacés comme prévu (clic dans le vide → Fill zone) |
| T7 essai navigateur, capture, tailles | toutes | en attente de T11 : porte S6 163 ms puis 63 ms (après T9, charge 16–19), S1–S5 OK | 1/3 | 4c55e67 (porte rouge) | — |
| T8 correctifs revue T1 (murs fins, rects, tolérance par facteur, notice i_tree) | T1 | terminée | 1/3 | e9ebe05 | core zone 18 tests (wall_thinner_than_a_cell_still_closes ok) ; témoin S6 natif 126 ms |
| T9 porte S6 : profil par phase, réductions, repli DA-Z5 étape 1 | T8 | terminée | 1/3 | d65059b | core zone 21 tests ok ; témoin S6 natif release médiane 22,8 ms rejoué (17,9 rapporté), 4 032 064 cellules, sans plafond 2²¹ ni Worker ; module principal 1 373 557 o |
| T11 coût Wasm du clic de zone (porte S6 : 63 ms en Chromium, 18–23 ms natif) | T9, T10 | en cours | 1/3 | — | — |
| T10 marques de zone à jour au rendu du clic | T5, T6 | terminée | 1/3 | 13e4f6c | zone-marks, stage-tags, board-session 70 tests ; src/app 365 |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · scénarios réussis · capture dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 07:00 lancement, worktree depuis origin/main @ 94976f0.
- 2026-11-21 07:31 cadrage écrit et corrigé (vue rastérisée U28 rétablie ; contre-relecture 1/2 : B1 temps → porte ≤ 50 ms, S6). 20 décisions, 5 DA, 13 hypothèses dont 6 de niveau 1, scénarios S1–S6. `i_overlay` mesuré : +214 643 o dans le module principal (formats exclu, marge 45 Ko).

## Pièges trouvés
- Porte S6 rouge (163 ms, 4 052 169 cellules, VM chargée) → repli DA-Z5 étape 1 (plafond 2²¹) décidé par l'orchestrateur, après T8 (rects en fusion).
- `zone-marks.ts` `timed()` écrit les marques après le rendu de la commande : `data-zone-ms` périmé jusqu'au rendu suivant.
- Prémisse démentie : `usage-cadrage.md` plaçait `i_overlay` dans `formats` ; il ne tient pas dans sa marge (45 384 o) → module principal.
- Le dépôt n'utilise pas `wasm-opt` ; `i_overlay` et `i_key_sort` ne livrent pas de LICENSE (texte amont à reprendre).
- Chantiers en cours sur les mêmes fichiers : aucun.

## Constats d'architecture
- T2 (revue immédiate, mineur) : `element()` d'un `fill` (`document.rs:423`) passe par `read_fill`, qui alloue tous les anneaux pour rendre `color`, `w`, `h` ; `geoms` alloue trois fois par `fill` (`query.rs:126`, `:219`). Acceptable (hitTest seulement à l'appui) ; correction propre = lecture sans allocation dans `fill_element.rs`. Reporté.
- T2 (mineur) : un `fill` de moins de 2·tol de large n'est pas touchable (HC8-4, voulu par le cadrage).
