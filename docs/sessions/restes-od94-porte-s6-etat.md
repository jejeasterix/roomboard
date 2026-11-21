# État — restes-od94-porte-s6

Statut : clos
Gabarit : courte
Objectif : Le pire cas S6 du pot (C8) répond sous 35 ms de médiane même sur la VM chargée, et un audit d'architecture classe les zones à refondre pour que Jérôme choisisse.
Étage : 4 — depuis 2026-11-21 13:40
Avancement : 7/7 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/restes-od94-porte-s6   Branche : fix/restes-od94-porte-s6   Base : origin/main @ afc2d8b
Branche principale locale au lancement : afc2d8b
Cadrage : docs/plans/restes-od94-porte-s6-cadrage.md   Plan(s) : docs/plans/restes-od94-porte-s6-PLAN.md

## Référence
Complète (origin/main afc2d8b, verifier.sh --e2e) : OK en 6 min 40 · module Wasm 1 368 840 o · module formats 3 100 845 o · S6 médiane 40 ms (38, 40, 50), fond 22 ms

## Mesure avant (5 passages C8 de suite, 2026-11-21 ~12:50)
| passage | charge 1/5/15 min | S6 trois clics triés | médiane | fond |
|---|---|---|---|---|
| 1 | 3.90 4.42 3.73 | 38, 40, 50 | 40 | 22 |
| 2 | 3.67 4.36 3.71 | 38, 40, 51 | 40 | 23 |
| 3 | 3.45 4.31 3.70 | 38, 40, 50 | 40 | 22 |
| 4 | 3.26 4.25 3.68 | 37, 39, 50 | 39 | 22 |
| 5 | 3.16 4.21 3.68 | 37, 40, 50 | 40 | 21 |
Médiane des médianes 40 ms, maximum 51 ms (un clic sur trois à ~50 ms, à chaque passage).

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 1/2

## Terminé quand
porte S6 : médiane ≤ 35 ms sur 5 passages C8 de suite sur la VM, aucun > 50 ms, seuil et fixture inchangés · test de non-régression du comportement C8 · rapport d'audit docs/audits/2026-11-21-audit-architecture.md · verifier.sh --e2e OK · double relecture sans bloquant · PR fusionnée (merge --no-ff local + push)

## Choix tranchés seul
- Mode du cadrage : autonome (brief : aucune question ne parvient à Jérôme pendant le tour).

## Hors périmètre
- Tout refactor issu de l'audit (choix du candidat : Jérôme).

## Tâches
| id | dépend | état | dernier commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 | — | terminée | 8fddb99 | banc 2 passed ; fenêtre médiane 36.6 ms, element(id) 17.1 ms, empreinte sha256 b2f8da76… |
| T2 | T1 | terminée | 1cb53da | core element_ids_of_kind ok ; contrat 374 passed ; module 1 370 577 o |
| T3 | T2 | terminée | a28989e | banc fenêtre 37.0 → 19.8 ms ; 5 passages C8 médiane 27, max 37 |
| T5 | T2, T3 | terminée | 2cad5b5 | banc 5 passed, 3 S2 verts ; mutation du sha256 → rouge |
| T6 | T1-T5 | terminée (simplification du lot) | 5e56292 | ids_where partagé ; core 384 + 404 ok ; contrat et banc verts, empreinte égale ; module 1 371 293 o |
| T7 | T2 | terminée (correctif de couverture) | 3f7c157 | contrat 375 passed ; 6 mutations de rawKind → rouge |
| T4 | T3, T5 | terminée — sans gain retenu | 31537c9 | zone.rs identique à 2cad5b5 ; premier clic = compilation V8 (~17 ms) + mémoire (~3,5 ms) |

## Mesure après T3 (5 passages C8 de suite, ~13:15, charge réelle)
| passage | charge 1/5/15 min | S6 trois clics triés | médiane | fond |
|---|---|---|---|---|
| 1 | 1.77 1.76 1.67 | 25, 27, 37 | 27 | 10 |
| 2 | 1.71 1.75 1.66 | 25, 27, 37 | 27 | 9 |
| 3 | 1.65 1.74 1.66 | 25, 27, 37 | 27 | 9 |
| 4 | 1.68 1.74 1.66 | 25, 27, 37 | 27 | 9 |
| 5 | 1.70 1.75 1.66 | 25, 27, 37 | 27 | 9 |

## Série d'information sous charge artificielle (8 boucles `nice -n 10`, après T3)
| passage | charge | clics triés | médiane | fond |
|---|---|---|---|---|
| 1 | 6.36 3.07 2.13 | 25, 27, 51 | 27 | 10 |
| 2 | 7.14 3.35 2.23 | 25, 28, 40 | 28 | 10 |
| 3 | 7.73 3.60 2.32 | 28, 29, 39 | 29 | 9 |
| 4 | 8.08 3.81 2.40 | 25, 27, 40 | 27 | 10 |
| 5 | 8.23 3.91 2.45 | 27, 28, 39 | 28 | 14 |
Un clic sur 15 à 51 ms : le premier clic à froid (compilation paresseuse de V8), pas une porte (choix tranché).

## Corrections de la relecture du plan (portées par les briefs, pas par le plan)
- Ordre V4 = T5, V5 = T4 ; T4 décidée par l'orchestrateur sur 5 passages C8, pas sur un seul.
- Premier clic à froid : aucun préchauffage, aucune mémoire réservée au chargement, aucun appel à blanc ; seulement moins de mémoire de pointe ou d'allocations.
- Commits par `git commit -- <chemins>` ; taille `formats` lue dans verifier.sh à la clôture ; K8 sans id aussi sur la fausse liaison ; 6 lignes OE23 en T2.
- T3 : banc (c) appelle `marks.tags` avant la boucle ; témoin natif « sans objet » ; clôture du constat `zone-marks.ts:56` à la clôture (4.3).

## Choix tranchés seul (suite)
- T4 menée malgré S1 tenue, pour le premier clic à froid ; aucun gain retenu (le seul essai ralentissait le natif), code rétabli.
- Pas de préchauffage du module pour le premier clic : interdit par le brief (cacher le coût).
- Cible S1 en lecture stricte : chacune des 5 médianes ≤ 35 ms, aucun clic > 50 ms.
- « VM chargée » = VM dans son état réel, charge relevée ; pas de charge artificielle comme porte.
- Interface `elementIdsOfKind(page, kind)` plutôt qu'`elementKinds` (pas d'alignement de tableaux).
- Plafond 2²¹ exclu (S6 passerait sous MIN_CELLS) ; Worker seulement en décision écrite si les gains directs échouent.

## Rapport
- Scénarios : S1 porte S6 réussi (tête 3f7c157, 5 passages, charge 7.9 à 9.4 : médianes 30, 27, 29, 27, 27 ; maximum 38 ; détail `docs/essais/c8-porte-s6.md`) · S2 non-régression C8 réussi (banc, 3 tests S2, empreinte égale) · S3 `verifier.sh --e2e` OK (4 min 31, 2623 tests web, cargo 404 + 384) · S4 tailles : principal 1 371 293 o, formats 3 100 845 o, scène 662 px Pot actif, licences OK.
- Où allaient les ms (avant) : `fill_zone` ~22 ms ; `tableCounts` dans `emit` ~17 ms (relecture O(N²) par `element(id)`) ; navigateur ~3 ms ; hors fenêtre, recompte des `fill` ~19 ms. Après : fenêtre du banc 19.8 ms, hors fenêtre 2.6 ms.
- Premier clic à froid : compilation paresseuse de V8 (~17 ms) + mémoire (~3.5 ms) ; non retiré (préchauffage interdit).
- Double relecture (base afc2d8b, tête 3c11968) : aucun blocker ; conformité : 1 major (S1 sur la tête finale, fait ici) + 3 minor (dates des têtes corrigées, taille formats reportée ; K8 vrai module couvert en Rust seul) ; qualité : 1 simplification (T6) + 4 minor (T7 pour rawKind, doc api.ts corrigée en T6 ; restent : règle H4 recopiée chez deux appelants, `median` = `[1]` du banc).
- Constats d'architecture : 1 fermé (`zone-marks.ts:56`) ; aucun nouveau. Ouverts : crates/roomboard-core 5, apps/web/src/app 4, apps/web/src/platform 4 → audit fait en rapport (`docs/audits/2026-11-21-audit-architecture.md`).
- Hors périmètre, consignés : `elementIds` de la fausse liaison rend `undefined` pour un élément chargé sans id (le cœur l'écarte) ; fausse liaison lit `stroke` un élément sans kind ; seconde croissance de la mémoire au second clic (~1 à 2 ms) après écriture du `fill`.
- Release due : non (aucune release, aucun tag).

## Notes du coffre à poser

### 1. `00_Journal/2026-11-21-roomboard-restes-od94-porte-s6-clos.md`

```markdown
---
id: 2026-11-21-roomboard-restes-od94-porte-s6-clos
type: journal
summary: "RoomBoard restes d'OD94 clos : porte S6 du pot sur zones fermées tenue sous charge (médianes 27 à 30 ms, maximum 38 ms, charge 7,9 à 9,4) par un accesseur elementIdsOfKind qui retire la relecture O(N²) de tableCounts ; audit d'architecture en rapport seul ; PR #28."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/restes-od94-porte-s6-etat.md, docs/essais/c8-porte-s6.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — restes d'OD94 : porte S6 et audit, clos (OE23)

- Porte S6 : avant, médianes 39 à 40 ms, maximum 51 ms (charge 3,2 à 3,9) ; après, médianes 27 à 30 ms, maximum 38 ms (charge 7,9 à 9,4). Seuil 50 ms, fixture et essai inchangés.
- Où allaient les ms : `tableCounts` relisait les 303 éléments par `element(id)` dans `emit`, donc dans la fenêtre du clic (~17 ms, parcours O(N²) de `find_element`) ; `fill_zone` seul ~22 ms ; le recompte des `fill` hors fenêtre ~19 ms.
- Livré : `element_ids_of_kind` (cœur, pont, deux liaisons), `tableCounts` et recompte des `fill` par candidats, banc `zone-s6-banc.test.ts` et non-régression S2 (empreinte exacte du `fill`).
- Premier clic à froid : compilation paresseuse de V8, non retirée (préchauffage exclu).
- Tailles : principal 1 371 293 o (1 368 840 avant), formats 3 100 845 o (inchangé). Scène 662 px Pot actif.
- Audit : `docs/audits/2026-11-21-audit-architecture.md`, 5 candidats, choix à Jérôme.
- Décision : [[NNNN-roomboard-porte-s6-gains-sans-prechauffage]]. Pièges : [[roomboard-tablecounts-relit-chaque-element-dans-emit]], [[wasm-premier-appel-lent-compilation-paresseuse-v8]].
```

### 2. `02_Decisions/NNNN-roomboard-porte-s6-gains-sans-prechauffage.md`

```markdown
---
id: NNNN-roomboard-porte-s6-gains-sans-prechauffage
type: decision
summary: "RoomBoard porte S6 (C8) : la marge se gagne en rendant le travail moins cher (elementIdsOfKind : ids d'un kind brut sans vue), jamais en le sortant de la fenêtre ni par préchauffage du module ; plafond 2²¹ exclu (S6 passerait sous 4 M cellules) ; prise par l'agent."
created: 2026-11-21
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/restes-od94-porte-s6-cadrage.md (Q2, Q3, Q7, Q8, Q9) ; docs/essais/c8-porte-s6.md ; PR #28"
---

# RoomBoard — porte S6 : gains sans préchauffage (prise par l'agent)

- Accesseur `element_ids_of_kind(page, kind)` / `elementIdsOfKind` : même filtre d'id qu'`element_ids` (helper `ids_where`), filtre sur le kind brut ; chaque candidat reste confirmé par `element(id)` (un élément mal formé est écarté).
- Interdit : sortir un travail de la fenêtre `timed` de `zone-marks.ts`, préchauffer le module, réserver la mémoire au chargement, faire un appel à blanc.
- Cible lue au sens strict : chacune des 5 médianes ≤ 35 ms et aucun clic > 50 ms, VM dans son état réel, charge relevée.
- Repli de C8 : plafond 2²¹ exclu ; Worker seulement par un nouveau cadrage si les gains directs échouent.
```

### 3. `04_Pieges/roomboard-tablecounts-relit-chaque-element-dans-emit.md`

```markdown
---
id: roomboard-tablecounts-relit-chaque-element-dans-emit
type: piege
summary: "RoomBoard : tableCounts (engine.ts) relisait chaque élément par element(id) à chaque emit ; find_element parcourt la page, donc O(N²) : ~17 ms sur 303 éléments dans la fenêtre du clic du pot S6. Lister d'abord les ids d'un kind brut (elementIdsOfKind), puis lire la vue des seuls candidats."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, piege/performance]
evidence: "PR #28 (commits 23ba840, 32bac50) ; banc zone-s6-banc.test.ts : element(id) sur 303 éléments 17,1 ms, dont fillRings 15,5 ms de parcours ; fenêtre 37,0 → 19,8 ms"
---

# RoomBoard — une boucle `element(id)` dans `emit` coûte O(N²)

- Symptôme : porte S6 à 40 ms alors que `fill_zone` seul prenait 22 ms ; le clic de fond, sans calcul de zone, coûtait déjà 21 à 23 ms.
- Cause : `commit` → `emit` → `state()` → `tableCounts` lisait la vue de chaque élément ; chaque lecture passe par `find_element`, qui parcourt la page.
- Correction : `elementIdsOfKind(page, "table")` puis `element(id)` des seuls candidats ; même chose pour le recompte des `fill`.
- Règle : dans un chemin appelé à chaque version, ne jamais lire la vue de tous les éléments ; prolonge [[roomboard-mesure-performance-inclut-le-rendu-synchrone]].
```

### 4. `04_Pieges/wasm-premier-appel-lent-compilation-paresseuse-v8.md`

```markdown
---
id: wasm-premier-appel-lent-compilation-paresseuse-v8
type: piege
summary: "Wasm sous V8 : le premier appel d'un chemin lourd coûte ~2 fois les suivants surtout par la compilation paresseuse puis Liftoff (~17 ms au pot S6 de RoomBoard), pas par la croissance de la mémoire (~3,5 ms) ; prouvé par --no-liftoff --no-wasm-lazy-compilation."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, piege/performance, tech/wasm]
evidence: "docs/essais/c8-porte-s6.md § T4 (RoomBoard PR #28) : premier clic 39,8 ms par défaut, 21,0 ms tout compilé par TurboFan, 30,8 ms tout en Liftoff au chargement ; mémoire 3,06 → 6,94 Mio dans les deux cas"
---

# Wasm — un premier appel lent vient de la compilation, pas de la mémoire

- Symptôme : au pot S6, premier clic ~40 à 44 ms, suivants ~20 à 22 ms ; on accusait `memory.grow`.
- Cause : V8 compile les fonctions Wasm à la première exécution (paresseux), d'abord en Liftoff ; la croissance de la mémoire ne pèse que ~3,5 ms.
- Preuve : mêmes clics sous `node --no-liftoff --no-wasm-lazy-compilation` : 21,0 ms au premier clic, même croissance mémoire.
- Règle : ne pas chercher le gain du premier appel dans les allocations ; le seul remède est de compiler ou d'exécuter avant (préchauffage), à décider en clair car il sort le coût de la mesure.
```

### 5. Fiche `01_Projets/roomboard.md`, ligne 21

Ajouter à la fin de la ligne 21 (après « … [[0263-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts]] ») :

```
 ; restes d'OD94 : porte S6 tenue sous charge (médianes 27 à 30 ms, maximum 38 ms, accesseur elementIdsOfKind) et audit d'architecture en rapport seul (`docs/audits/2026-11-21-audit-architecture.md`, 5 candidats) clos (PR #28) — voir [[2026-11-21-roomboard-restes-od94-porte-s6-clos]] et [[NNNN-roomboard-porte-s6-gains-sans-prechauffage]]
```
