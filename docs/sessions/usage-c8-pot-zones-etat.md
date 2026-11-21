# État — usage-c8-pot-zones

Statut : en cours
Gabarit : chantier (7 tâches, confirmé à l'étage 2)
Objectif : Un clic du pot dans une zone fermée par plusieurs objets (traits, formes) pose un nouvel élément `kind: "fill"` non lié, au-dessus des objets d'origine, avec une tolérance de fermeture de 2 px ; hors de toute zone fermée, le pot garde le comportement de C6a (fond de la page) ; chaque clic est une étape d'annulation.
Avancement : 13/13 tâches terminées
Étage : 3 — depuis 2026-11-21 08:02
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c8-pot-zones   Branche : feat/usage-c8-pot-zones   Base : origin/main @ 94976f0
Branche principale locale au lancement : 94976f0
Cadrage : docs/plans/usage-c8-pot-zones-cadrage.md   Plan(s) : docs/plans/usage-c8-pot-zones-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD94), aucune question à Jérôme pendant le tour. Arrêt ferme : 2026-11-21 11:00 (pousser avant 10:50).

## Référence
Avant (main 94976f0, chiffres du brief) : module Wasm principal 1 145 044 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728, marge 45 Ko)
Complète (origin/main @ 94976f0, verifier.sh --e2e) : OK · web 123 fichiers, 2425 tests · module Wasm 1 145 044 o · module formats 3 100 344 o · scène 662 px Pot actif, 706 px ailleurs

## Compteurs
contre-relecture cadrage 1/2 (B1 temps corrigé par porte DA-Z5) · relecture plan 1/3 (aucun bloquant ; T1 : Outside sans masque transmis ; T7 : S4 et petit cercle à ajouter à l'essai, attente de `data-zone-ms`) · vagues sans progrès 0/2 · correctifs de fin 1/2 (T12)

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
| T7 essai navigateur, capture, tailles | toutes | terminée | 2/3 | b82a929 | essai seul : C8 pot zones OK au rejeu (S6 médiane 47 ms, 4 052 169 cellules ; 1er passage 60 ms rouge sur la durée, rejoué) ; scène 662 px ; capture docs/essais/c8-pot-zones.png ; verifier.sh --e2e joué à la fin sur la tête |
| T8 correctifs revue T1 (murs fins, rects, tolérance par facteur, notice i_tree) | T1 | terminée | 1/3 | e9ebe05 | core zone 18 tests (wall_thinner_than_a_cell_still_closes ok) ; témoin S6 natif 126 ms |
| T9 porte S6 : profil par phase, réductions, repli DA-Z5 étape 1 | T8 | terminée | 1/3 | d65059b | core zone 21 tests ok ; témoin S6 natif release médiane 22,8 ms rejoué (17,9 rapporté), 4 032 064 cellules, sans plafond 2²¹ ni Worker ; module principal 1 373 557 o |
| T11 coût Wasm du clic de zone (porte S6 : 63 ms en Chromium, 18–23 ms natif) | T9, T10 | terminée | 1/3 | 85f850e | core zone 17 « test result: ok » ; src/app+src/core WASM_REQUIRED 856 tests ; essai S6 médiane 45 ms (2 passes, charge 18–26) ; module 1 364 322 o ; recompte des fill (~32 ms) sorti de la mesure |
| T13 simplification du lot | T12 | terminée | 1/1 | 36499fb | 3 simplifications, aucun test touché ; core avec et sans zone ok, render 244 ; preuve finale = verifier.sh --e2e |
| T12 correctifs de fin de lot (cœur sans zone testé, zone_walls O(N), cast zone-marks) | T11 | terminée | 1/3 | ae3e978 | core sans zone : zone_without_feature_is_background ok ; zone 23 tests ; zone-marks 5 ; verifier.sh lance désormais test et clippy du cœur seul |
| T10 marques de zone à jour au rendu du clic | T5, T6 | terminée | 1/3 | 13e4f6c | zone-marks, stage-tags, board-session 70 tests ; src/app 365 |

## Scénarios et captures
- `docs/essais/c8-pot-zones.png` : triangle pointe en bas fermé par trois traits noirs, rempli de jaune par le pot, sur un fond de page bleu (clic hors zone) ; le petit cercle noir intérieur laisse voir le fond bleu (trou du `fill`).

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
- T9 (revue immédiate, major non bloquant) : le coût dépend du nombre de segments de diffusion (`zone.rs:504`, `:539`, tris répétés) ; S6 n'est plus forcément le pire cas (hachures denses). Transmis à T11.
- T9 (revue, major non bloquant) : `spans` garde tous les segments avec le masque (jusqu'à ~12 Mio de plus) ; écart à la mémoire annoncée par Q20 (« à revoir »). Transmis à T11.
- T9 (minor) : `docs/essais/taille-wasm.md:62` garde l'écart de T1 ; sondes `lap()` dans la fonction pure.
- Fin de lot, double relecture (tête c5c9ef0, 3 relecteurs : conformité, qualité Rust, qualité TS) : aucun bloquant. Majeurs : test et clippy du cœur sans `zone` jamais lancés (`fill.rs:300`, `verifier.sh:20-21`) ; `zone_walls` appelle `bounds(&[id])` par élément « autre » (O(N²), `zone.rs:748`). → tâche corrective T12.
- Mineurs consignés : boîte englobante (et non boîte) pour une image tournée (`zone.rs:748`) ; tolérance réelle « 2 px au moins, moins de 4 px selon l'alignement » (test `zone.rs:922`) non écrite au cadrage ; `fill_element.rs`, `zone-marks.ts`, `renderer.ts` absents de la carte ; `taille-wasm.md:62` périmé ; test I3 TS affaibli (`fake-core.test.ts:544`) ; `insert_fill` sans `valid_color` ; `allow(dead_code)` large (`fill_element.rs:4`).
- Simplifications proposées : cast de `zone-marks.ts:22` (rend le test aveugle à un renommage de `tol`), garde unique dans `canvas2d.ts:445`, alias `c8Factories`, `FillFields::rings_f32()`, `ellipse_points` dans `shape.rs`.
