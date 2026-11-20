# État — usage-c7-texte-riche

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Les textes du tableau portent des attributs par plage (gras, italique, souligné, couleur, taille, police), conservés à l'édition et à l'enregistrement, et rendus par segments dans le canvas.
Avancement : 13/13 tâches terminées
Étage : 4 — depuis 2026-11-20 05:12
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c7-texte-riche   Branche : feat/usage-c7-texte-riche   Base : origin/main @ 05fdb73 (C2 fusionné ; rebase --rebase-merges à 04:18)
Branche principale locale au lancement : cacd2e3
Cadrage : docs/plans/usage-c7-texte-riche-cadrage.md   Plan(s) : docs/plans/usage-c7-texte-riche-PLAN.md
Lancement : 2026-11-20 03:02 · arrêt ferme 08:02 · point d'arrêt 07:52

## Référence
Complète (origin/main @ cacd2e3, scripts/verifier.sh) : OK

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | état | preuve rejouée |
|----|--------|------|----------------|
| T1 rich_text.rs | — | terminée | rich_text:: 13 ok |
| T2 api.ts + rich-text.ts | — | terminée | rich-text.test 13 ok |
| T3 FormatText + SetText par différence | T1 | terminée | workspace ok ; 3 tests nommés ok |
| T4 faux cœur | T2 | terminée | fake-core.test 31 ok |
| T5 layoutRich | T2 | terminée | text-layout.test 15 ok |
| T6 liaison Wasm + S2/S3 | T3 | terminée | wasm 25 ok, scenarios 6, compat_socle 3 |
| T7 rendu par segments | T5 | terminée | canvas2d.test 25 ok |
| T8 outil Texte | T4,T5 | terminée | text + text-editor 24 ok |
| T9 adaptateur Wasm + contrat C7 | T4,T6,T7,T8 | terminée | contrat 94 ok (vrai module exigé) |
| T10 réduire la taille du Wasm (ajoutée) | T9 | terminée | 1 562 871 → 1 528 260 o ; verifier.sh OK (e1b164a) |
| T11 correctifs Rust de la relecture | T10 | terminée | workspace 286 ok |
| T12 correctifs TS de la relecture (couleur illisible → texte blanc) | T10 | terminée | web 862 ok, verifier.sh OK (dce00f7) |
| T13 tolérance embed chaîne (2e tour) | T12 | terminée | workspace 287 ok |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · C2 fusionné dans origin/main puis rebase · PR fusionnée par merge local --no-ff

## Règles du brief OD44
- Fusion dans l'ordre C2, C7, C9 : attendre C2 dans origin/main (contrôle toutes les 15 min) ; sinon PR non fusionnée à 07:52.
- Hors périmètre : éditeur riche (C7b). Aucun build Tauri.
- Mode du cadrage : autonome (Jérôme dort, consigne OD44).

## Hors périmètre
- C7b : contenteditable, barre de mise en forme.
- `textFont` met toujours la police entre guillemets : `serif`/`monospace` ne sont pas les familles génériques (à trancher avant C7b).
- Clé du cache des lignes : `JSON.stringify(t.spans)` à chaque image (~11 µs pour 40 segments).
- Faux cœur TS : une taille brute non représentable en f32 déjà stockée compte comme changement (Rust : sans effet).
- Un `FormatText` qui change un autre attribut réécrit une taille 14.3 en f64::from(14.3f32).
- Texte avec embed chaîne (binaire fabriqué) : `FormatText` refusé, `SetText` remplace tout (embeds perdus), sans panique.
- `scripts/verifier.sh` lit `target/` en dur.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Cible Cargo partagée entre worktrees : `env!("CARGO_MANIFEST_DIR")` reste figé au worktree qui a compilé ; après son retrait, compat_socle ne trouve plus la fixture. Remède : `cargo clean -p roomboard-core` (vu à 04:36).
- Module Wasm : origin/main 1 480 983 o ; C7 avant T10 1 562 871 o ; après T10-T13 1 527 881 o (+46 898 pour C7, HC7-7 « < 30 Ko » démentie) ; plafond 1 572 864 o : marge 44 983 o pour C9. La section `name` pèse ~600 Ko : la retirer = décision de profil (Jérôme).
- verifier.sh lit `target/` en dur (incompatible avec CARGO_TARGET_DIR ailleurs) : hors périmètre.
