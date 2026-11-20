# État — usage-c10b-tableau

Statut : en cours
Gabarit : chantier
Objectif : On fusionne et on divise des cellules d'un tableau, on pose un ombrage révélable sur une cellule, on colle un tableau HTML qui devient un tableau RoomBoard, et on importe un fichier Excel en valeurs.
Avancement : 9/12 tâches terminées
Étage : 3 (vague 3) — depuis 2026-11-20 13:57
Tâche : T7 — liaison Wasm C10b — depuis 2026-11-20 13:57
Tâche : T11 — branchement boutons, collage, classeur — depuis 2026-11-20 13:57
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c10b-tableau   Branche : feat/usage-c10b-tableau   Base : origin/main @ 425d617
Branche principale locale au lancement : 425d617
Cadrage : docs/plans/usage-c10b-tableau-cadrage.md   Plan(s) : docs/plans/usage-c10b-tableau-PLAN.md

## Référence
Rapide (worktree neuf) : couverte par la complète (verifier.sh)
Complète (origin/main @ 425d617) : verifier.sh OK · module principal 953 883 o · formats 385 454 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table : en tête du plan (12 tâches). Vagues : 1 = T1 T3 T4 T5 T6 ; 2 = T2 T8 T9 T10 ; 3 = T7 T11 ; 4 = T12.
| id | worktree | état | essais | commit vert |
|---|---|---|---|---|
| T1 | retiré | terminée | 1/3 | 96234a8 (core 281 ok) |
| T3 | retiré | terminée | 1/3 | b75d6be (sheet 10 ok, essai réel ok, formats 850 430 o) |
| T4 | retiré | terminée | 1/3 | 021ede1 (src/core 261/261, wasm reconstruit) |
| T5 | retiré | terminée | 1/3 | c2c3985 (15 ok) |
| T6 | retiré | terminée | 1/3 | ba4f9bd (103 ok) |
| T2 | retiré | terminée | 1/3 | 4172e0e (core 292 ok) |
| T8 | retiré | terminée | 1/3 | ab99fea (117 ok) |
| T9 | retiré | terminée | 1/3 | cda13f8 (84 ok) |
| T10 | retiré | terminée | 1/3 | 045be2b (226 ok) |
| T7 T11 | ~/projets/roomboard-wt/usage-c10b-tableau--T<n> | en cours | 1/3 | — |
| T12 | — | à faire | 0/3 | — |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture tableau fusionné + ombrage dans docs/essais/ · PR mergée par fusion locale --no-ff et push sans --force

## Hypothèses à revoir
—

## Hors périmètre
- Objets dans une cellule ; Word/PowerPoint (C16) ; formules et mise en forme Excel.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Sur la VM, la notification de fin d'une commande de fond n'a pas réveillé T1 ni T4 (35 min figés) : briefs suivants en premier plan.
- Le `.wasm` copié dans un worktree de tâche est celui de la référence : le contrat sur vrai module exige une reconstruction après T1/T2.
- T3 : `zip` pris par `roomboard_core::format::zip` (un test du conteneur interdit une dépendance propre).
- OD79 (C7b, feat/usage-c7b-texte-riche) touche aussi les cellules de tableau (texte riche) : rebase/fusion de origin/main avant merge.

## Choix tranchés seul (mode autonome, aucune question à Jérôme pendant ce tour)
- Cadrage autonome (brief : « tranche seul et écris tes choix »).
- Cadrage : 1 tour de contre-relecture seulement (aucun bloquant au tour 1 ; budget de temps de 5 h).
- Vague 1 lancée pendant que le planificateur finit T7–T12 (il a buté sur 100 tours) : les sections T1–T6 étaient complètes.
- Places du jeton : 5 par sujet (VM 8 places, 28 Go libres).
- Relecture du plan : un tour, en parallèle de la vague 1 ; corrections passées dans les briefs T7, T9, T10, T12 (l'interdit `rb.css` reste).
- T4 fusionnée malgré 13 échecs du vrai module périmé : wasm reconstruit avec T1, 261/261.

## Constats d'architecture
- duplication · fake-core · apps/web/src/core/fake-core.ts:677 · AddTable et ImportTable ont deux corps d'écriture (le cœur n'en a qu'un, write_table).
- duplication · cœur · crates/roomboard-core/src/table.rs:603 · ImportTable réécrit valid_matrix (commands.rs:409, privée).

## Revues immédiates
- T1+T4 : aucun bloquant ni important ; 5 mineurs (trous de test : ancre vide d'une fusion, refus finite/fits_f32 d'ImportTable, span ignoré gardé), nom `color0`, double lecture dans merges_of. Vers la simplification du lot.
