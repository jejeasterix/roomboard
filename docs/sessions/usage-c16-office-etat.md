# État — usage-c16-office

Statut : clos (PR 29 fusionnée ; restes faibles fermés par OE31, branche `fix/restes-oe25-office`)
Gabarit : chantier
Objectif : Un document Word, Excel ou PowerPoint déposé sur RoomBoard s'importe : converti en PDF en coque, lu en valeurs ou refusé avec un message clair sur le web.
Avancement : 16/16 tâches terminées
Étage : 4 — depuis 2026-11-21 16:05
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c16-office   Branche : feat/usage-c16-office   Base : origin/main @ 41342b0
Branche principale locale au lancement : 41342b0
Cadrage : docs/plans/usage-c16-office-cadrage.md   Plan(s) : docs/plans/usage-c16-office-PLAN.md

## Référence
Rapide : couverte par la complète.
Complète (origin/main 41342b0, `nice -n 10 scripts/verifier.sh --e2e`) : `verifier.sh : e2e OK` · `verifier.sh : OK` ; module Wasm 1371293 o · formats 3100845 o (mesurés)
Tailles Wasm avant (brief) : principal 1 371 293 o (plafond 1 572 864) · formats 3 100 845 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 7 importants transmis au cadreur) · relecture plan 1/3 (aucun bloquant ; 1 important collision d'id → T12) · vagues sans progrès 0/2 · correctifs de fin 2/2 (T14+T15, puis T16)

## Tâches
Plan `cca074e` : 11 tâches, vagues V1 = T1 T2 T7 T8 ; V2 = T3 T4 T5 (dès T2), T9 (dès T1 T7) ; V3 = T6 (dès T3 T5), T10 (dès T7 T8 T9) ; V4 = T11.
Worktrees : `~/projets/roomboard-wt/usage-c16-office--T<n>`, branche `feat/usage-c16-office--T<n>`.

| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 | — | terminée | 1/3 | 836a4a4 | core+wasm 0 FAILED, compat_c12 1 passed ; contrat 386 passed ; Wasm 1 374 141 o ; revue immédiate : 4 mineurs → T13 |
| T2 | — | terminée | 1/3 | 1a0af11 | shell 27 passed, fmt après T4 |
| T3 | T2 | terminée | 1/3 | 97947b4 | shell 44 passed --test-threads=1 dont real_libreoffice_* et timeout_kills_* ; revue : 1 important → T12 |
| T4 | T2 | terminée | 1/3 | 880d8d7 | lecture 8 points ; shell 34 passed après fusion ; fmt vert |
| T5 | T2 | terminée | 1/3 | e5fa5c2 | shell 34 passed (7 originals::) |
| T6 | T3 T5 | terminée | 1/3 | abf0a57 | coque_c16 4 passed ; hors ligne 30 cas ; rustfmt main.rs vert |
| T7 | — | terminée | 1/3 | c35f4ef | vitest 2 fichiers 96 passed ; tsc 0 |
| T8 | — | terminée | 1/3 | ef2b5af | vitest 4 fichiers 89 passed ; tsc 0 |
| T9 | T1 T7 | terminée | 1/3 | 8be8940 | workspace 98 passed ; tsc 0 |
| T10 | T7 T8 T9 | terminée | 1/3 | ee6a90d + 1d47a85 | host-tauri 36 passed ; suite web 2665 passed (attente P15 complétée de edit-original) ; build web OK |
| T12 | T3 T5 | terminée | 1/3 | 4d601ee + rustfmt coque_c16 | shell 50+4 passed, 6 nouveaux noms ; clippy, fmt verts |
| T13 | T1 | terminée (correctif revue T1 : tests renforcés, filtre isAssetId côté Wasm) | 1/3 | 372581d | compat_c12 2 passed ; contrat 388 passed (WASM requis) |
| T11 | T3 T6 T10 | terminée | 1/3 | cedfeb4 | `/tmp/c16/T11-verifier.log` : « C16 Office : OK », « verifier.sh : e2e OK », rc=0 ; scène 706 px ; capture lue |
| T14 | fin de lot | terminée (correctif Rust tour 1 : `open` via `originals::open_detached`, COM `Quit` et `NoProgram`, purges, `new_numbered_dir`) | 1/3 | 2c4a32e | shell 52+5 passed ; clippy sans avertissement ; fmt |
| T15 | fin de lot | terminée (correctif web tour 1) | 1/3 | e1e352f | web 2672 passed ; tsc 0 |
| T16 | fin de lot | terminée (correctif tour 2 : avis O4 sans convertisseur, collage, garde `use`) | 1/3 | e430450 | web 2674 passed ; coque_c16 6 passed |

## Fin de lot
Suites rapides sur `badf1d5` : `/tmp/c16/rapide-badf1d5.log` (cargo 0 FAILED ; web 134 fichiers, 2667 passed). Double relecture (`badf1d5`) : qualité Rust — 1 bloquant (`open::` absent du manifeste de la coque), 1 important (COM `Quit`) ; qualité web — 6 mineurs, 3 simplifications ; conformité — 1 important (COM `NoProgram`), 4 mineurs. Tour 1 : T14, T15. Relecture du tour (`75bff9e`) : 1 bloquant (avis O4 absent sans convertisseur) → T16. Relecture finale de T16 (`b1cffd0`) : constats corrigés, 3 mineurs restants (avis O4 sur un `.xlsx` collé sans chemin, `office-import.ts:184` ; bloc « sheet + avis » écrit deux fois ; `detect` recopié au lieu de `sheet.detect`).
`verifier.sh --e2e` sur `b1cffd0` : « C16 Office : OK », « verifier.sh : e2e OK », « verifier.sh : OK » ; module Wasm 1 374 141 o ; formats 3 100 845 o ; 0 FAILED.
Simplifications appliquées dans T14/T15 (`new_numbered_dir`, types `OfficeOpenFile`/`OriginalChange`, `sheetHandler` unique, ternaire retiré).

## Clôture (OE31, 2026-11-22)
Les trois mineurs de la relecture finale sont fermés dans `apps/web/src/platform/office-import.ts` :
- avis O4 : `officeSheetNoConverterHandler` ne dit « importé en valeurs ; installez… » que pour un fichier déposé (chemin connu) ; un `.xlsx` collé sans chemin se lit en valeurs sans avis, comme le web (O14). Test : `office-import.test.ts`, « office sans convertisseur : .xlsx collé sans chemin… » (rouge avant le correctif) ;
- bloc « sheet + avis » écrit deux fois : une seule fonction, `runSheetWithValuesNotice`, appelée par `officeHandler` et `officeSheetNoConverterHandler` ; le test de chemin vide est aussi commun (`pathOf`) ;
- `detect` recopié : `officeSheetNoConverterHandler` délègue à `sheet.detect` (même règle : nom `.xlsx` / `.xlsm` et en-tête ZIP).

Restes de plateforme, à essayer sur les machines réelles : la coque Windows (LibreOffice puis COM seul, mode protégé, chemins `\\?\`) et la coque macOS (`LibreOffice.app`), essais réels R1 à R3 dans la file du PC et sur le Mac : `docs/essais/coque-windows.md` § 8, `docs/essais/coque-macos.md` § 8.

## Scénarios et captures
S1 conversion réelle .docx/.pptx/.xlsx (`/usr/bin/soffice`) — réussi (2,3–4,1 s ; 1,0–3,0 s ; 1,2–1,3 s).
S2 délai et sécurité — réussi (`timeout_kills_the_launcher_and_its_child`, `success_kills_leftover_children`, liens, ids, copie bornée, non accordé).
S3 web : .docx/.pptx → « exportez en PDF depuis Office », .xlsx → tableau, enregistrer puis rouvrir, scène 706 px — réussi.
S4 capture `docs/essais/c16-pptx-libreoffice.png` : page « Diapositive 1 », onglet `diapos.roomboard`, barre des pages « 1 / 2 » — réussi.
S5 coque simulée, original gardé, réimport, fichier d'avant C16 — réussi (tests ; essai réel en coque = reste R1 à R3).

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `verifier.sh --e2e` OK · conversions réelles .docx/.pptx/.xlsx et délai prouvés sur la VM · capture docs/essais/ · PR fusionnée par `git merge --no-ff` puis push sans force

## Choix tranchés seul
- Mode du cadrage : autonome (ouvrier CLI, consigne du brief « tranche seul »).
- Relecture du plan lancée en même temps que la vague 1 (temps de l'arrêt ferme 18:08).
- Ouverture de l'original par la crate `open` (MIT, feature `shellexecute-on-windows`) au lieu de `tauri-plugin-opener` (O36).
- Originaux et conversions dans le dossier cache de l'application, 0700 (O9/O20).
- `.xlsx` en coque : pages PDF par conversion (brief), repli sur le tableau en valeurs C10b sans convertisseur (HO1-1 à revoir ; `usage-cadrage.md:600` prévoit les deux chemins).

## Hors périmètre
- Boîte « Importer… » sans les extensions Office (PC11, HO2-15 à revoir).
- LibreOffice en snap : racine `~/.cache` peut-être inaccessible au confinement (reste Linux, non vérifié).
- Import en objets éditables (ECMA-376), rendu fidèle sur web, iPad, Android.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- `pub mod com;` sous `cfg(windows)` fait échouer `cargo fmt --check` tant que `office/com.rs` manque (levé par T4).
- T4 avait mis `Claude Sonnet 5.5` en attribution : corrigé par `--amend` local avant fusion (`880d8d7`).
- `src/import/` n'existe pas : registre d'importeurs dans `apps/web/src/platform/import.ts`.
- `watch` du plugin fs écarté (U24) : relevé en Rust.
- Chantier voisin C13 (OE24, `feat/usage-c13-lot1-svg-iwb-ubz`) : fichiers communs `import.ts`, `workspace.ts`, `main.ts`, `verifier.sh`, `verifier-e2e.test.sh:13`, `THIRD_PARTY_NOTICES.md`.

## Notes du coffre à poser
Voir la description de la PR (bloc complet : journal, décision `NNNN`, ligne 21 de `01_Projets/roomboard.md`) — 2 notes et une ligne de fiche.

## Constats d'architecture
Écrits dans `docs/architecture-constats.md` (zone `apps/web/src/platform`, 2 constats : cycle `import.ts` ↔ `office-import.ts`, patron stop/stopped dupliqué dans `host-tauri.ts`). Zones à 3 constats ouverts ou plus : `crates/roomboard-core` (5), `apps/web/src/app` (4), `apps/web/src/platform` (6) — audit proposé, pas lancé.
