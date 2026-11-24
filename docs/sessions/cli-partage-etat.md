# État — cli-partage

Statut : en cours
Gabarit : chantier (7 tâches ; cadrage court gardé : les 2 tâches de plus découpent T1, aucune décision nouvelle)
Objectif : La CLI n'a plus de copie de l'ouverture et de l'export d'un tableau : un seul module de la page les fait pour la page et pour la CLI, sans changement visible.
Avancement : 8/8 tâches terminées
Étage : 4 — depuis 2026-11-24 09:55
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-partage   Branche : refactor/cli-partage   Base : origin/main @ 7092fdd
Branche principale locale au lancement : 7092fdd
Cadrage : docs/plans/cli-partage-cadrage.md   Plan(s) : docs/plans/cli-partage-PLAN.md

## Référence
Complète (7092fdd, verifier.sh --e2e, load 21-25) : cargo vert · CLI 250/255, 5 `Test timed out in 5000ms` (import S3 image+xlsx, model3d-node S4 ×2, model3d D76, pdf-node loadNodePdfjs) · web arrêtée par SIGTERM après l'échec CLI (pnpm -r)
Tailles Wasm avant : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — à remesurer

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 3 majeurs corrigés) · relecture plan 1/3 (aucun bloquant, 3 majeurs corrigés) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | fichiers touchés | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------------------|----------|------|--------|---------------------|----------------|
| T1 | — | apps/cli/src/boards.test.ts, convert.test.ts | --T1 (retiré) | terminée | 1/3 | ed3a2d4 | 27/27, 9 lignes « caractérisation cli-partage » |
| T2 | — | apps/web/src/app/open-export.ts(+test), tabs.ts(+test) | retiré | terminée | 1/3 | 4717eeb | 22/22, tsc web 0 ; revue immédiate : 1 minor corrigé |
| T3 | T2 | apps/web/src/app/workspace.ts | retiré | terminée | 1/3 | 7f2f503 | web 3202/3202 (155 fichiers), tsc 0, tests page inchangés |
| T4 | T1,T2,T6 | apps/cli/src/session.ts, exporter.ts, importer.ts | retiré | terminée | 2/3 (1er agent mort avec le tour) | b2b721d | CLI 262/262 ; CLI : OK ; COMPARAISON : OK ; grep S4 0 |
| T5 | T1 | testing.ts, verifier.sh, verifier-e2e.test.sh, 16 tests CLI | retiré | terminée | 2/3 (1er agent mort avec le tour) | f55842a | CLI 263/263, 0 timed out, verifier-e2e OK |
| T6 | — | scripts/essais/cli-essai.mjs | --T6 (retiré) | terminée | 1/3 | 57508c9 | E1-E5 ok, CLI : OK |
| T7 | T6 | scripts/essais/cli-comparer.mjs, cli-normalise.mjs, cli-essai.mjs | retiré | terminée | 1/3 | b5be69c | COMPARAISON : OK, faux N → ÉCART |
| T8 | T1-T7 | session.ts, workspace.ts, cli-comparer.mjs | (partagé) | terminée (simplification du lot) | 1/1 | b29e35d | web 3202, CLI 263, COMPARAISON : OK, tests inchangés |
Base S1 : ~/.cache/tmp/of12-base (worktree détaché 7092fdd, CLI construite).

## Terminé quand
CLI sans copie de l'ouverture et de l'export · workspace.ts et la CLI appellent le module partagé · sorties JSON et codes inchangés · tests web et CLI existants verts sans réécriture de fond, tests du module ajoutés · verifier.sh pose VITEST_MAX_WORKERS=3 si absent · tailles Wasm sous plafond, non changées · verifier.sh --e2e OK · PR avec ## Preuve · double relecture sans bloquant · fusion locale --no-ff poussée sans --force

## Choix tranchés seul
- Ouvrier sans Jérôme : cadrage autonome, aucune question (brief OF12).
- Branche `refactor/cli-partage` (brief) au lieu de `feat/<sujet>` du profil.

## Cadrage
6 hypothèses dont 1 de niveau 1 (H1 : aligner les 3 écarts visibles page/CLI — à Jérôme) ; H6 : copie avant export côté CLI non faite (created). Scénarios : S1 sorties identiques à la base · S2 cli-essai étendu E1-E5 · S3 tests page verts sans toucher workspace.test.ts · S4 grep sans recopie · S5 verifier --e2e, tailles, VITEST_MAX_WORKERS.

## Pièges trouvés
- Tour de l'orchestrateur terminé pendant que T4/T5 tournaient en fond : sous-agents morts, travail non commité repris (09:15). Règle : sous-agents au premier plan, suites au premier plan, une seule suite à la fois.
- Un worktree de tâche n'a pas `target/` : les tests Office cherchent `target/debug/roomboard-office` ; lien temporaire vers le target du chantier pendant la suite.
- Prémisse démentie : lecture/écriture déjà partagées (board-convert, pdf-convert) ; restent 6 recopies R1-R6 de la couche autour.
- saveParts fixe `created` : la copie avant export ne s'applique pas à la CLI.

## Rapport
- Suite complète finale (b29e35d, verifier.sh --e2e) : OK. CLI 263/263 (base 255, dont 5 en délai dépassé), web 3202/3202 (base 3188), 0 « timed out ». Tailles : module principal 1 374 215 o, formats 2 794 511 o (inchangées).
- S1 COMPARAISON : OK (30 contrôles, base 7092fdd ↔ b29e35d) · S2 CLI : OK (E1-E5) · S3 workspace.test.ts inchangé · S4 grep 0 ligne · S5 verifier OK, `VITEST_MAX_WORKERS=1` respecté (263/263).
- Double relecture : aucun bloquant ni majeur ; 3 simplifications et 2 minors du comparateur appliqués (T8) ; restent en minor : test « warmModules » sans pouvoir de preuve, S1.3 à l'horloge réelle (couvert par convert.test.ts).
- Constats d'architecture : 5 écrits (apps/cli/src 3, apps/web/src/app 2). Zones à 3 constats ou plus : audit proposé (apps/web/src/app 9, apps/web/src/platform 8, crates/roomboard-core 5, crates/roomboard-formats 4, apps/cli/src 3) — proposition seulement.
- Hypothèses à revoir : H1 (niveau 1) aligner les 3 écarts visibles page/CLI ; H6 copie avant export côté CLI ; H7 hookTimeout de 10 s sous forte charge.
- Release : non due (aucune release du projet ; refactor sans changement visible).

## Choix tranchés seul (suite)
- Gabarit chantier sans retour au cadrage : les 2 tâches de plus découpent l'estimation, aucune décision nouvelle.
- Copie avant export : gardée pour la page, absente pour la CLI (created inchangé) ; alignement laissé à Jérôme (H6).
- Simplification de test (beforeAll en double) non appliquée : tests figés par le chantier ; consignée en constat.
- Fusion par `git merge --no-ff` locale (brief) au lieu de finalize-session-chaine.

## Hors périmètre
- apps/web/src/platform/ (OF13)

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

Trois notes. `NNNN-a` et `NNNN-b` : numéros à poser par le canal (deux numéros qui se suivent).

### 1. `00_Journal/2026-11-24-roomboard-cli-partage-ouverture-export-clos.md`

```markdown
---
id: 2026-11-24-roomboard-cli-partage-ouverture-export-clos
type: journal
summary: "RoomBoard : la CLI n'a plus de copie de l'ouverture et de l'export d'un tableau ; le module apps/web/src/app/open-export.ts les fait pour la page et pour la CLI, sorties de la CLI identiques à l'octet près (OF12) ; verifier.sh borne Vitest à 3 ouvriers ; PR #49."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature, cli, refactor]
evidence: "docs/sessions/cli-partage-etat.md ; docs/plans/cli-partage-cadrage.md ; docs/plans/cli-partage-PLAN.md ; scripts/essais/cli-comparer.mjs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — ouverture et export d'un tableau partagés par la page et la CLI, clos (OF12)

- Origine : candidat 2 du bilan d'Outillage (recopie contraire à [[0281-roomboard-cli-node-modules-wasm-et-web]], « aucune logique recopiée ») ; jugé à faire par le canal RoomBoard, mené seul par l'ouvrier OF12.
- Prémisse démentie : la lecture et l'écriture étaient déjà communes (`board-convert.ts`, `pdf-convert.ts`) ; restaient six recopies de la couche autour (messages « Ouverture impossible » / « Export impossible », avis, onglets pleins à 5 endroits, garde des images non lues, copie avant export).
- Livré : `apps/web/src/app/open-export.ts` (`openBoardDocument`, `openPdfDocument`, `exportBoardDocument`, `exportBlocked`, `openFailedMessage`, `exportFailedMessage`) et `Tabs.full()` ; `workspace.ts`, `session.ts`, `exporter.ts`, `importer.ts` l'appellent.
- Comportement inchangé, prouvé : `scripts/essais/cli-comparer.mjs` compare la CLI de la base (7092fdd) et celle de la branche (stdout, stderr, codes, SHA-256 des `.iwb`, `.ubz`, `.pdf` exportés) : `COMPARAISON : OK`, 30 contrôles ; `cli-essai.mjs` étendu (E1 à E5).
- Restes d'OF9 et d'OF11 : `verifier.sh` pose `VITEST_MAX_WORKERS=3` s'il n'est pas donné ; 16 fichiers de tests de la CLI chargent le Wasm (et le chargeur 3D) dans un `beforeAll` ; les 5 « Test timed out in 5000ms » de la référence ont disparu ; aucun délai relevé.
- Tests : CLI 255 → 263, page 3188 → 3202. Tailles inchangées : module principal 1 374 215 o, formats 2 794 511 o.
- Constats consignés (`docs/architecture-constats.md`) : branche Office de `readDoc`, `readSheet` du classeur, message d'ouverture encore à 6 endroits, `openPdfDocument` peu profond, `beforeAll` de test en double.
- Décisions : [[NNNN-a-roomboard-open-export-module-partage]], [[NNNN-b-roomboard-verifier-vitest-trois-ouvriers]].
```

### 2. `02_Decisions/NNNN-a-roomboard-open-export-module-partage.md`

```markdown
---
id: NNNN-a-roomboard-open-export-module-partage
type: decision
summary: "RoomBoard : un seul module, apps/web/src/app/open-export.ts, ouvre et exporte un tableau pour la page et pour la CLI ; les messages sont rendus comme des données (Error au message complet, liste notices), chaque appelant les dit ; la copie avant export est une dépendance optionnelle, donnée par la page seulement, pour que la CLI ne fixe pas created à l'export ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, cli]
evidence: "docs/plans/cli-partage-cadrage.md (D1 à D9, H1, H6) ; apps/web/src/app/open-export.ts ; apps/cli/src/session.ts, exporter.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — ouverture et export d'un tableau : un module partagé, messages en données (prise par l'agent)

- Applique [[0281-roomboard-cli-node-modules-wasm-et-web]] (« aucune logique recopiée ») à la couche autour de la lecture et de l'écriture.
- Le module n'importe que des modules déjà dans le fichier construit de la CLI : aucun DOM, aucun module Wasm changé, `platform/` non touché.
- Messages : le module rend une `Error` au message complet et une liste `notices` ; la page les affiche, la CLI les lève (`CliError`) ou les range dans `notices`. Pas de fonction d'affichage injectée.
- Copie avant export (`deps.copy`) : la page la garde (un onglet fermé pendant l'export ne libère pas le document écrit) ; la CLI ne la donne pas, car `saveParts` fixe `created` sur le document d'origine (`lib.rs`, `mark_saved`).
- Trois écarts visibles entre page et CLI gardés (échec d'écriture `.iwb`/`.ubz` sans préfixe, avertissements d'écriture bruts, onglet plein nommé à l'import) ; les aligner changerait les sorties de la CLI : à Jérôme (H1, H6 du cadrage).
```

### 3. `02_Decisions/NNNN-b-roomboard-verifier-vitest-trois-ouvriers.md`

```markdown
---
id: NNNN-b-roomboard-verifier-vitest-trois-ouvriers
type: decision
summary: "RoomBoard : scripts/verifier.sh lance pnpm -r test avec VITEST_MAX_WORKERS=3 quand la variable n'est pas donnée, et les tests de la CLI chargent le Wasm dans un beforeAll ; remède aux « Test timed out in 5000ms » sur la VM chargée, sans relever aucun délai ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/outillage, tests, vm]
evidence: "scripts/verifier.sh:54 ; apps/cli/src/testing.ts (warmModules) ; docs/plans/cli-partage-cadrage.md (D10, D11, H7) (dépôt jejeasterix/roomboard)"
---

# RoomBoard — Vitest borné à 3 ouvriers par verifier.sh, Wasm chargé hors du délai des tests (prise par l'agent)

- Cause prouvée par OF11 (PR 48) : `pnpm -r test` lance la page et la CLI ensemble, chaque Vitest prend un ouvrier par cœur.
- `verifier.sh` : `VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}"` ; une valeur donnée l'emporte.
- Tests de la CLI : `beforeAll(warmModules)` dans le premier bloc qui exécute un test sans condition (16 fichiers) ; un test dont le chargement est le sujet le garde (`loadNodePdfjs`, pdf.js après un import 3D).
- Aucun délai relevé ; limite connue : un `beforeAll` a 10 s (`hookTimeout`) sur une VM très chargée (H7).
- Référence sur 7092fdd (charge 21 à 25) : 5 dépassements ; après : 0, CLI 263/263.
```

### Segment à ajouter à la ligne 21 de `01_Projets/roomboard.md`

```
 ; ouverture et export d'un tableau partagés par la page et la CLI (OF12 : module `open-export.ts`, la CLI n'a plus de copie, sorties identiques à la base, Vitest borné à 3 ouvriers par verifier.sh) clos (PR #49, `main` MAINSHA) — voir [[2026-11-24-roomboard-cli-partage-ouverture-export-clos]] et [[NNNN-a-roomboard-open-export-module-partage]]
```
