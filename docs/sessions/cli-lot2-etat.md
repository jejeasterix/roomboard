# État — cli-lot2

Statut : en cours
Gabarit : chantier (9 tâches, confirmé à l'étage 2)
Objectif : La CLI de RoomBoard insère un fragment `.rbitem`, lit et écrit les tableaux blancs et les paquets `.rbpack`, et convertit un fichier d'un format à l'autre.
Avancement : 13/13 tâches terminées
Étage : 4 — depuis 2026-11-24 02:08
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot2   Branche : feat/cli-lot2   Base : origin/main @ 3b3c88a
Branche principale locale au lancement : 3b3c88a
Cadrage : docs/plans/cli-lot2-cadrage.md   Plan(s) : docs/plans/cli-lot2-PLAN.md
Mode : autonome (ouvrier CLI OF5, aucune question à Jérôme : choix tranchés seul et consignés)

## Référence
Rapide : — (le build de référence est la suite complète ci-dessous)
Complète (origin/main @ 3b3c88a, `verifier.sh --e2e`, 14 min 22 s) : CODE=0, `verifier.sh : e2e OK` ; cli 84 tests, web 3097 tests, cargo tout vert

## Tailles Wasm avant
module principal 1 374 215 o (plafond 1 572 864) · module formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 2 majeurs, 9 mineurs renvoyés au cadreur) · relecture plan 1/3 (relecteur arrêté à sa limite après T1-T8 relues : aucun bloquant, 2 mineurs) · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Vagues : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 ∥ T5 ∥ T8 ; 3 = T6 ; 4 = T7 ; 5 = T9. Toutes `isolé` (`~/projets/roomboard-wt/cli-lot2--T<n>`, branche `feat/cli-lot2--T<n>`).
| id | dépend | subagent | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 | — | implementeur-tdd | terminée | 1/3 | e196dc0 (fusion 1ffeabe) | web fragments+workspace 202 tests, `encodeIds` 3 tests |
| T2 | — | concepteur-critique | terminée | 1/3 | ac5c8da (fusion 6d01d19) | web 4 fichiers 73 tests ; `-t inlineWorker|boardJobReply|zipJobReply` 21 ; relecture immédiate : 0 bloquant, 2 mineurs |
| T3 | — | implementeur-tdd | terminée | 1/3 | 4db0311 (fusion f85b8b4) | fabriques 12 tests ; `node --check` c13 OK |
| T4 | T1, T2 | implementeur-tdd | terminée | 1/3 | 2ada481 (fusion c84e5ae) | web 6 fichiers 358 tests ; suite web 3126 (rapport) |
| T5 | T1 | implementeur-tdd | terminée | 1/3 | 3b8fabe | cli 93 tests, `-t S1` 6 tests |
| T8 | T2 | implementeur-tdd | terminée | 1/3 | 62e3e93 (fusion b3de80e) | cli `library.test.ts` 4 tests |
| T6 | T3, T4, T5 | concepteur-critique | terminée | 1/3 | 54cab2a (fusion 36286d4) | cli 113 tests ; `-t S2|D23|D29` 19 ; relecture immédiate : 0 bloquant, 1 majeur (câblage D29 non testé de bout en bout), 1 simplification, 1 mineur → T10 |
| T7 | T6 | implementeur-tdd | terminée | 1/3 | dc6c409 (fusion 9e98ca3) | cli 122 tests ; `-t S3` 12 |
| T9 | T7, T8 | implementeur-tdd | terminée | 1/3 | 7ffff68 (fusion eed60f4) | cli 124 tests ; essai 63 contrôles `CLI : OK` |
| T10 | T9 | implementeur-tdd | terminée | 1/3 | 36bd8f3 (fusion b5f8d6b) | correctif relecture T6 ; cli 126 tests, `D29 — main import` 1 |
| T11 | T10 | implementeur-tdd | terminée | 1/3 | f6f1d67 — cli 137 tests, essai 64 `CLI : OK` | correctifs CLI du tour 1 (majeur : sortie = source ; D25 lot 4 → 2 ; tests D19, avis de lecture, ordre usage/interruption, garde .rbitem ; simplification `formatsWith`) |
| T12 | T10 | implementeur-tdd | terminée | 1/3 | 46124a7 — web tsc 0, 6 fichiers 266 tests | correctifs web du tour 1 (`partOf` garde la panique d'origine ; commentaires ; `boardJobFailure`, `BoardFile`, import mort) |

## Scénarios
S1 insérer un `.rbitem` (tableau existant et neuf) · S2 lire les cinq tableaux blancs, jamais réécrits à leur chemin · S3 écrire puis relire `.iwb`/`.ubz`, `.pdf` en code 3 · S4 aller-retour `.rbpack` par `library` · S5 `cli-essai.mjs` : `CLI : OK`

## Terminé quand
toutes les tâches terminées · chaque format du lot 2 « couvert » dans `FORMAT_LOTS` avec ses tests et un contrôle dans `scripts/essais/cli-essai.mjs` · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF5).
- Contre-relecture du cadrage : un seul tour (aucun bloquant au tour 1, corrections faites) ; plan relu en un tour partiel, faute de temps (arrêt ferme 04:49).
- Phase 0 (3.1) : les preuves portent sur des tests que les tâches écrivent ; jugées en 3.6 (N ≥ 1, nom attendu).
- Mineurs du plan acceptés : `importer.ts:287` → ligne réelle 100 ; preuve T4 rejouée sur ses 6 fichiers de test.

## Double relecture (3.8, tour 1, tête b5f8d6b)
Conformité : 0 bloquant, 0 majeur, 2 mineurs (D25 lot 4, test D19). Qualité web : 0 bloquant, 2 mineurs, 3 simplifications. Qualité CLI : 1 majeur (sortie = source dans `convert`/`export`), 7 mineurs, 1 simplification. Simplifications intégrées aux correctifs T11/T12 (gain de temps, décision de l'orchestrateur). Consignés sans correction : `library list` crée un dossier absent (comportement du produit), règle `.rbpack` écrite deux fois, ré-export `SCENE`, RF4 sans écriture partielle.
`verifier.sh --e2e` sur b5f8d6b : arrêt sur délai de l'essai C3 (`filechooser` 30 s) ; C3 rejoué seul : OK → délai, pas une régression. Tailles : 1 374 215 o et 2 794 511 o (inchangées). `CLI : OK`.

## Double relecture, tour 2 (tête 20b1560)
2 majeurs (ligne `{"notices"}` en plus dans `run`/`apply` ; tableau importé absent des sources de la garde), 2 mineurs (lien symbolique vers une source par `save` ; tests de « panique masquée » devenus sans objet) → T13 (815ab33, fusion 644975f) : cli 144 tests, `CLI : OK`. Fin des deux tours de correctifs ; aucun bloquant ouvert.
| T13 | T11, T12 | implementeur-tdd | terminée | 1/3 | 815ab33 — avis d'ouverture dans `notices` de la 1re ligne (D31), sources importées, `save` refuse une source non `.roomboard` |
`verifier.sh --e2e` sur 20b1560 : CODE=0, `e2e OK`, tailles 1 374 215 / 2 794 511.
Intégration : `origin/main` a avancé (5c6c506, PR #43) → fusion dans `feat/cli-lot2` (dfd3762), conflit `workspace.ts` (export de tableau : `writeBoardFile` gardé + nature d'avis `info`/`error` de main) ; web tsc 0, workspace+board-convert 174 tests ; cli tsc 0. `verifier.sh --e2e` sur dfd3762 : deux passages tombés sur un délai de 5 s dans des tests non touchés (`olf-read` N13, `pdf-overlay-vector` S5 ; charge VM 21 sur 8 cœurs), chacun vert seul en < 1,1 s ; troisième passage : CODE=0, `verifier.sh : e2e OK`, CLI 144, web 3129, `CLI : OK`, tailles 1 374 215 / 2 794 511.

## Pièges trouvés
- Les sous-agents `implementeur-tdd` signent `Co-Authored-By: Claude Sonnet 5.5` (rappel d'attribution de leur modèle) ; le brief exige `Claude Opus 5.5` : messages réécrits sur la branche locale non poussée (`git filter-branch --msg-filter`), consigne ajoutée aux prompts.
- Relecture T2, mineur 1 (plausible, code déplacé tel quel) : `partOf` (`board-reader.ts:144-150`) libère dans un `finally` ; une panique pendant `ops()` peut devenir l'erreur « borrowed » de `free()` et masquer la `RuntimeError` → transmis à T6 (D29).
- Relecture T2, mineur 2 : pas de test « `postMessage` qui lève » pour la coquille `board-worker.ts` (le code est correct) → consigné.

## Hors périmètre
- `roomboard-prive`
- Lots 3 (PDF) et 4 (Office, médias, 3D, autres images)

## Portes
ouvertes : — · passées : —

## Tailles Wasm après
module principal 1 374 215 o (plafond 1 572 864, inchangé) · module formats 2 794 511 o (plafond 3 145 728, inchangé) — identiques à avant.

## Rapport
- Scénarios : S1 insertion `.rbitem` (tableau neuf et existant), S2 lecture des cinq tableaux, S3 écriture et relecture `.iwb`/`.ubz` (`.pdf` code 3), S4 aller-retour `.rbpack` par `library`, S5 essai `cli-essai.mjs` (64 contrôles, `CLI : OK`) : réussis, par les tests Vitest au vrai Wasm, l'essai et la CLI réelle (sorties dans la PR).
- Conditions du merge : double relecture faite (2 tours, aucun bloquant ouvert) · aucune tâche bloquée · suite complète sans baisse (CLI 84 → 144, web 3097 → 3129) · aucun test retiré hors plan (5 tests réécrits ou renommés, prévus ou couverts) · scénarios réussis · CLI vérifiée (sorties réelles) · point de retour `origin/main` 5c6c506 · CI : aucune (pas de CI GitHub, brief).
- Hypothèses niveau 1 : H11 images GIF/WebP/BMP/SVG d'un tableau non lues par la CLI (lot 4) ; H12 conversion avec pertes en code 0 et avis ; H13 `library` limitée à « Mes ressources » ; H14 cible de document `.roomboard` seule (changement de contrat du lot 1). Niveau 2 : H15 à H22 (cadrage § 4).
- Décisions d'architecture : DA7 (corps des Workers en fonctions, `inlineWorker`), DA8 (`app/board-convert.ts`), DA9 (`library`), DA10 (contrat du lot 2) ; D31 (avis d'ouverture dans `notices` de la 1re ligne).
- Choix tranchés seul : plan relu en un tour partiel ; simplifications intégrées aux correctifs T10, T11, T12 ; critère D29 élargi (échec générique = instance non sûre) gardé comme filet ; garde « sortie ≠ source » insensible à la casse ; fusion de `origin/main` plutôt que rebase (branche aux fusions de tâches).
- Constats d'architecture : 1 fermé (`apps/cli/src/exporter.ts`, par `encodeIds`) ; aucun ajouté. Zones à 3 constats ou plus (proposition d'audit, jamais lancé) : `apps/web/src/platform` 8, `apps/web/src/app` 7, `crates/roomboard-core` 5, `crates/roomboard-formats` 4.
- Hors périmètre consigné : `library list` crée un dossier absent (comportement du produit) ; règle `.rbpack` écrite deux fois ; ré-export `SCENE` ; RF4 sans écriture partielle ; dépendance `platform` → `app` de `zip-worker.ts:25` (constat existant).
- Graphe : pas de `graphify-out/` dans le dépôt ; `~/.cache/graphes/` non écrit (brief) ; la mise à jour toutes les 15 min le reprendra.
- Documentation utilisateur : aucune dans le dépôt.
- Release : non due (aucune release ni tag, brief).
- Lots suivants : lot 3 PDF lire et écrire ; lot 4 Office, médias, 3D, autres images (GIF, WebP, BMP, SVG, y compris dans un tableau blanc).
## Notes du coffre à poser

Coffre de la VM en lecture seule (OD81) : trois écritures à faire depuis le Mac. `NNNN` est à numéroter par le canal.

### 1. Journal — `00_Journal/2026-11-24-roomboard-cli-lot2-clos.md`

```markdown
---
id: 2026-11-24-roomboard-cli-lot2-clos
type: journal
summary: "RoomBoard CLI lot 2 clos (OF5) : insertion d'un .rbitem (tableau neuf ou existant, --grid), lecture des tableaux blancs .iwb .ubz .notebook .olf .flipchart, écriture .iwb .ubz, commande convert, bibliothèque .rbpack (library list|import|export) ; corps des Workers en fonctions jouées en processus ; cible de document .roomboard seule ; PR #45."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature, cli]
evidence: "docs/sessions/cli-lot2-etat.md ; docs/plans/cli-lot2-cadrage.md ; docs/plans/cli-lot2-PLAN.md ; scripts/essais/cli-essai.mjs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI, lot 2, clos (OF5)

- Demande de Jérôme (2026-11-23) : « ajoute la construction de la cli complète » ; lot 2 du cadrage de la CLI (§ 7), mené seul par l'ouvrier OF5.
- Livré : `import <tableau> x.rbitem` (onglet neuf ou existant), `export --grid` ; `state`, `run`, `apply`, `import` lisent `.iwb .ubz .notebook .olf .flipchart` ; `export` et `convert` écrivent `.iwb .ubz` ; `library list|import|export <dossier>` pour les `.rbpack` ; `FORMAT_LOTS` passe à un état `covered` par format et par sens, `LOT_LIVRE = 2`.
- Aucune logique recopiée : corps des Workers sortis en `boardJobReply` et `zipJobReply`, joués dans la CLI par `inlineWorker` ; lecture et écriture des tableaux extraites de `workspace.ts` dans `app/board-convert.ts` ; port `FragmentTab` générique et `encodeIds` dans `fragments.ts` (ferme le constat `apps/cli/src/exporter.ts`).
- Règles nouvelles : une cible de document finit en `.roomboard` (sinon code 2, contrôlé avant tout chargement) ; une sortie ne remplace jamais un fichier source (casse, lien symbolique) ; après une panique du module formats, plus aucune écriture (code 1).
- Preuve : `verifier.sh --e2e` OK ; essai `cli-essai.mjs` à 64 contrôles ; 144 tests Vitest de la CLI au vrai Wasm, 3129 tests web.
- Tailles inchangées : module principal 1 374 215 o, formats 2 794 511 o.
- Double relecture : 2 tours, 3 majeurs corrigés (sortie = source, ligne d'avis qui décalait la sortie de `run`, tableau importé absent des sources).
- Lots restants : lot 3 PDF (lire et écrire) ; lot 4 Office, médias, 3D, autres images (GIF, WebP, BMP, SVG, aussi dans un tableau blanc).
- Décision : [[NNNN-roomboard-cli-lot2-workers-en-processus]].
```

### 2. Décision — `02_Decisions/NNNN-roomboard-cli-lot2-workers-en-processus.md`

```markdown
---
id: NNNN-roomboard-cli-lot2-workers-en-processus
type: decision
summary: "RoomBoard CLI lot 2 : le corps des Workers de la page devient des fonctions exportées (boardJobReply, zipJobReply) que la CLI joue en processus par inlineWorker ; lecture/écriture des tableaux dans app/board-convert.ts ; .rbpack par une bibliothèque sur disque (library) ; cible de document .roomboard seule ; aucune sortie sur une source ; panique formats = plus d'écriture ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, cli]
evidence: "docs/plans/cli-lot2-cadrage.md (D17 à D31, DA7 à DA10) ; apps/web/src/platform/one-shot-worker.ts ; apps/web/src/app/board-convert.ts ; apps/cli/src (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI lot 2 : Workers joués en processus, cible .roomboard (prise par l'agent)

- Prolonge [[0281-roomboard-cli-node-modules-wasm-et-web]] : un Worker de la page ne se recopie pas. Son corps devient une fonction exportée (`boardJobReply`, `zipJobReply`) ; le Worker l'appelle, la CLI la joue par `inlineWorker`, passé à `runOnce` et `createBoardCodec` inchangés. Les contrôles des réponses restent communs.
- `app/board-convert.ts` (`readBoardFile`, `writeBoardFile`, `createBoardPorts`) est extrait de `workspace.ts` et `main.ts` à l'identique ; la page et la CLI l'appellent.
- Un `.rbpack` n'ouvre jamais un onglet (U25) : la CLI le range dans une bibliothèque sur disque, `library list|import|export <dossier>`, par `createResourceLibrary` et `disk.ts` (écriture atomique).
- Contrat : une cible de document finit en `.roomboard` (code 2 sinon, changement du lot 1) ; une sortie ne remplace jamais un fichier lu par la session ; une panique du module formats, même masquée, interdit toute écriture jusqu'à la fin du processus (code 1) ; une conversion avec pertes sort en 0 avec ses avis ; les avis d'ouverture vont dans `notices` de la première ligne, jamais dans une ligne de plus.
```

### 3. Fiche projet — `01_Projets/roomboard.md`, ligne 21, segment à ajouter à la fin

```
 ; CLI lot 2 (OF5 : insertion .rbitem, lecture .iwb .ubz .notebook .olf .flipchart, écriture .iwb .ubz, convert, bibliothèque .rbpack par `library` ; Workers joués en processus ; cible de document .roomboard seule ; lots 3 PDF et 4 Office, médias, 3D restants) clos (PR #45, `main` 48118ae) — voir [[2026-11-24-roomboard-cli-lot2-clos]] et [[NNNN-roomboard-cli-lot2-workers-en-processus]]
```
