# État — usage-c4-bibliotheque

Statut : en cours
Gabarit : chantier (15 tâches au plan, 20 avec les correctifs)
Objectif : Un panneau « Bibliothèque » montre « Mes ressources » et « Ressources partagées », en dossiers, avec recherche par nom et mot-clé et une vignette par ressource ; on ajoute une ressource depuis la sélection (`.rbitem`, U9) ou depuis la grille d'une page (`kind: "grid"`, U31), on la glisse sur la page (insertion en une étape d'annulation), on exporte un dossier en `.rbpack` et on l'importe ailleurs avec les mêmes ressources.
Avancement : 20/20 tâches terminées
Étage : 4 — depuis 2026-11-21 11:40
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque   Branche : feat/usage-c4-bibliotheque   Base : origin/main @ 443edd4
Branche principale locale au lancement : 443edd4
Cadrage : docs/plans/usage-c4-bibliotheque-cadrage.md   Plan(s) : docs/plans/usage-c4-bibliotheque-PLAN.md
Mode : autonome, ouvrier CLI sur la VM, aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible… », 2026-11-19). Arrêt ferme : 2026-11-21 13:54 (pousser avant 13:44).

## Référence
Avant (origin/main @ 443edd4, reprise de la référence finale de C8 sur f417fbc, seuls des commits de documentation depuis) : verifier.sh --e2e OK · web 124 fichiers, 2445 tests · module Wasm principal 1 362 599 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728) · scène 662 px Pot actif. Suite complète non rejouée au lancement : VM chargée (charge 16,9 sur 8 cœurs), une seule place.

## Compteurs
contre-relecture cadrage 1/2 (B1 unknownKindMessage, I1–I3, M1–M9 intégrés : D23–D32, H1-7) · relecture plan 1/3 (aucun bloquant ; 3 importants et 7 mineurs sur T13, T14, T15, transmis dans leurs prompts, /tmp/c4-corrections-plan.txt) · vagues sans progrès 0/2 · correctifs de fin de lot 1/2 (T18, T19, T20 ; tour 2 de relecture sans bloquant ni major)

## Tâches
Vagues : V1 = T1, T3, T5, T6, T7, T9, T11, T12 · V2 = T2, T4, T8 · V3 = T10, T13 · V4 = T14 · V5 = T15. Worktrees : ~/projets/roomboard-wt/usage-c4-bibliotheque--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 cœur kind grid, WrongKind found | — | terminée | 1/3 | e8a64b3 | compat_c4 6, compat_c3 3, compat_socle 4, format 49 ok ; principal 1 364 082 o, formats 3 100 845 o |
| T2 pont Wasm | T1, T3 | terminée | 2/3 | 20babd4 | src/core WASM_REQUIRED 497 tests, 8 C4 (essai 2 : 3 tests fake-core cassés au 1er rejeu) ; principal 1 369 494 o, formats 3 100 845 o |
| T3 API TS du cœur, faux cœur | — | terminée | 1/3 | 8d921cb | fake-core 65 tests, 4 C4 ; 2 tests C3 « grid inconnu » passés à « pack » (assertions inchangées) |
| T4 ContainerIO, insertResource | T3 | terminée | 1/3 | 51cd474 | container-io + fragments 54 tests, 16 C4 dont cascade R4/D24 |
| T5 vignette | — | terminée | 1/3 | c382271 | thumbnail 4 tests C4 |
| T6 LibraryFiles (mémoire, IndexedDB, plugin-fs) | — | terminée | 1/3 | 3044471 | library-files + host-tauri-ports + pending 37 tests, 26 C4 |
| T7 paquet .rbpack, Worker ZIP | — | terminée | 1/3 | 7bd8bf4 | rbpack, zip-worker, zip-read, model3d-import 37 tests, 20 C4 |
| T8 ResourceLibrary | T6, T7 | terminée | 1/3 | 1679047 | library 15 tests C4 dont export puis import |
| T9 importeur .rbpack | — | terminée | 1/3 | 3442897 | import + files 86 tests, 4 C4 ; files.test attendu + rbpack (D30) |
| T10 coque : association, capacités | — | terminée | 1/3 | 5ec2bfc | roomboard-shell 18 tests ok (associations, capacités) |
| T11 action Bibliothèque | — | terminée | 1/3 | d14de10 | toolbar-profiles + toolbar-host 45 tests |
| T12 glisser Pointer Events | — | terminée | 1/3 | f60a3a8 | resource-drag 5 tests C4 |
| T13 LibraryPanel | T8, T12 | terminée | 1/3 | d32b3e8 | LibraryPanel 11 tests C4 |
| T14 branchement | T2, T4, T5, T8, T9, T11, T13 | terminée | 1/3 | b5daf94 | workspace + App 134 tests, 8 C4 ; build web et suite web 2564 tests (rapportés) |
| T15 essai navigateur, capture, tailles | toutes | terminée | 1/3 | 2bda4d9 | essai seul C4 OK ; a trouvé la régression de hauteur de scène (610 px) et le fmt → T18 |
| T16 correctif import de paquet (revue T8 major : index périmé, repli limité) | T8 | terminée | 1/3 | 4925dfa | library + LibraryPanel 29 tests |
| T17 mineurs et simplifications des revues immédiates (T1, T2, T4, T7, T8) | T1–T14 | terminée | 1/3 | 03c6452 | src/core+app+platform+ui WASM_REQUIRED 1663 tests ; roomboard-core 18 « ok », 0 FAILED |
| T18 hauteur de scène (rembourrage des barres 8 px) et fmt de la coque | T15 | terminée | 1/3 | 7f83742 | fmt OK ; essais C10a 658 px, C7b 706 px, C4 OK |
| T19 correctifs de fin de lot, interface (4 major, 8 minor, K1 K3 K4 K5 K8 K9) | T17 | terminée | 1/3 | 013f633 | src/ui+src/app 660 tests, 1 sauté préexistant |
| T20 correctifs de fin de lot, plateforme (C1 major, C2–C12, K2) | T17 | terminée | 1/3 | 6975138 | src/platform+src/core WASM_REQUIRED 1036 tests ; roomboard-shell 18 |

## Scénarios et captures
- `docs/essais/c4-bibliotheque.png` : panneau « Bibliothèque » ouvert à droite, recherche « frac », une carte « Moitié » (dossier Fractions) avec sa vignette ; sur la page 2, les trois objets glissés (rectangle, trait, texte « 1/2 ») sélectionnés ; scène 1280 × 706.
- Essai `c4-bibliotheque-navigateur.mjs` (dans `verifier.sh --e2e`) : « frac » → 1 résultat avec vignette, « Carré » disparaît ; glisser sur la page 2 : 3 objets ; Annuler 0, Rétablir 3 ; grille Seyès en ressource déposée sur la page 4 (none → seyes, annuler/refaire) ; export `Fractions.rbpack`, Vider, réimport, rechargement : mêmes ressources, mot-clé gardé ; scène ≥ 640 px panneau ouvert.

## Rapport
- Suite complète finale (tête 6975138, `verifier.sh --e2e`, /tmp/c4-verifier-final.out) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2608 tests (2445 avant) ; module Wasm 1 368 840 o, module formats 3 100 845 o ; scène 706 px, 662 Pot, 658 Tableau ou Texte (égal à main).
- Scénarios : S1 (geste objets, recherche, glisser, annuler/refaire), S2 (grille en ressource), S3 (export, vider, réimport, rechargement) réussis dans l'essai navigateur ; S4 (kind inconnu, compatibilité avant C4) par compat_c4, compat_c3, compat_socle et rbpack/library ; S5 (coque) par tests de contrat et lecture de `tauri.conf.json` et `default.json`, essai réel = reste.
- Hypothèses à revoir, niveau 1 : H1-1 (IndexedDB, OPFS plus tard = migration), H1-2 (mots-clés hors du .rbitem), H1-3 (format .rbpack, MIME, association), H1-4 (portées de la boîte native réunies), H1-5 (dossier partagé perdu au redémarrage, « Rouvrir… »), H1-6 (import dans un dossier neuf), H1-7 (persist() du navigateur) ; ajoutée en fin de lot : glisser au doigt seulement sur mouvement horizontal dominant (appui long non retenu).
- Décisions d'architecture (prises par l'agent) : DA1 LibraryFiles, DA2 ResourceLibrary et rbpack en TS, DA3 coque par plugin-fs sans commande Rust, DA4 Pointer Events.
- Tâches bloquées : aucune. Simplifications appliquées : T17, T19, T20 (aucune tâche « simplification du lot » séparée : les simplifications des relectures sont dans ces correctifs).
- Constats d'architecture écrits : 5 (apps/web/src/app 2, apps/web/src/platform 2, crates/roomboard-core 1). Zones à 3 constats ouverts ou plus : crates/roomboard-core (5), apps/web/src/app (5), apps/web/src/platform (4) → audit d'architecture **proposé**, pas lancé.
- Mineurs consignés, non appliqués : C10 (options nommées de createZipReader), test de montée IndexedDB v1→v2 (base jamais livrée), export d'un paquet vide si toutes les ressources sont sautées (non testé), test « vignette lue une fois ».
- Release : non due (aucune release ni tag dans ce chantier).

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright C4 du brief réussi · capture du panneau « Bibliothèque » dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 09:54 lancement, worktree depuis origin/main @ 443edd4.

- 2026-11-21 10:05 cadrage écrit (ee2d628) : 22 décisions, 13 hypothèses dont 6 de niveau 1, 4 DA, S1–S5 ; stockage web IndexedDB.
- 2026-11-21 10:33 contre-relecture 1/2 intégrée (20e2a63, 3b06a06) ; plan 15 tâches, 38 lignes `Réutilise :`.
- 2026-11-21 10:36 vague 1 lancée (8 tâches) et relecture du plan 1/3 en parallèle.

- 2026-11-21 10:36–11:00 vagues 1 à 4 : T1–T14 et T16 fusionnées, preuves rejouées ; revues immédiates de T1, T2, T4, T7, T8 (concepteur-critique et T2) : 1 major (T8 → T16), mineurs regroupés en T17.

## Pièges trouvés
- Les sous-agents signent `Co-Authored-By: Claude Sonnet 5.5` (attribution de leur session) : réécrit en `Claude Opus 5.5` par rebase de la branche de tâche avant chaque fusion (/tmp/c4-fusion.sh).
- Dossier de build Rust partagé (`CARGO_TARGET_DIR`) : la taille « formats » relevée par T10 venait du build de T1 en parallèle.
- Prémisses démenties (cadrage) : `formats` gagne quelques dizaines d'octets (`kind: "grid"` lu par le même code que le cœur) ; mots-clés et vignette hors du `.rbitem` (écart à U9, compagnon) ; glisser HTML5 risqué en coque Windows (`dragDropEnabled: true`) → Pointer Events ; portée du dossier partagé perdue au redémarrage de la coque (H1-5) ; fonds de page en ressource hors périmètre.
- Chantiers en cours sur les mêmes fichiers : aucun.
## Notes du coffre à poser

### 1. `00_Journal/2026-11-21-roomboard-usage-c4-bibliotheque-clos.md`

```markdown
---
id: 2026-11-21-roomboard-usage-c4-bibliotheque-clos
type: journal
summary: "RoomBoard usage C4 bibliothèque de ressources clos : panneau « Bibliothèque » (Mes ressources, Ressources partagées), dossiers, recherche par nom et mot-clé, vignettes, ajout depuis la sélection (.rbitem) ou la grille (kind grid), glisser vers la page en une étape, paquets .rbpack en export et import ; stockage web IndexedDB, coque plugin-fs ; PR #PR."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c4-bibliotheque-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C4 bibliothèque de ressources, clos (OE18)

- Livré : `LibraryFiles` (mémoire, IndexedDB `roomboard-bibliotheque` v2 à deux magasins, plugin-fs), `ResourceLibrary` (index, dossiers, recherche sans casse ni accents, ajout, export et import atomique de paquet), codec `.rbpack` en TypeScript (ZIP stocké, entrées triées, date fixe), `kind: "grid"` dans le cœur (`WrongKind { expected, found }`), pont Wasm `save_grid*`/`load_grid*`/`manifest_kind`/`container_kind`, vignette 128 px, `LibraryPanel`, glisser par Pointer Events, association `.rbpack` et capacités de dossiers en coque, essai `c4-bibliotheque-navigateur.mjs` dans `verifier.sh --e2e`.
- Tailles : module Wasm principal 1 368 840 o (1 362 599 avant), module formats 3 100 845 o (3 100 344 avant). Scène 706 px, 662 px Pot, 658 px Tableau ou Texte.
- Régression trouvée et corrigée : le bouton « Bibliothèque » faisait passer la barre à une ligne de plus avec une rangée contextuelle (scène 610 px) ; rembourrage des barres horizontales ramené à 8 px.
- Reste : essai réel en coque (Windows, macOS : dossier partagé, `Documents/RoomBoard/Ressources`, double-clic sur un `.rbpack`).
- Décision : [[NNNN-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts]].
```

### 2. `02_Decisions/NNNN-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts.md`

```markdown
---
id: NNNN-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts
type: decision
summary: "RoomBoard C4 : la bibliothèque de ressources vit derrière une interface LibraryFiles (IndexedDB sur le web, plugin-fs et capacités en coque, sans commande Rust neuve) ; le paquet .rbpack est un ZIP écrit et lu en TypeScript seul (formats n'a que 45 Ko de marge) ; mots-clés, description et vignette dans un compagnon hors du .rbitem ; glisser par Pointer Events ; prise par l'agent."
created: 2026-11-21
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c4-bibliotheque-cadrage.md (D6, D17, DA1 à DA4, H1-1 à H1-7) ; apps/web/src/platform/library-files.ts ; apps/web/src/platform/rbpack.ts"
---

# RoomBoard — bibliothèque C4 : IndexedDB, plugin-fs, paquet en TypeScript (prise par l'agent)

- Stockage web : IndexedDB (base `roomboard-bibliotheque`, magasins `entrees` et `octets`), pas OPFS : Playwright Chromium headless le joue, il survit au rechargement, le dépôt avait déjà le patron (`pending.ts`) et un double (`fake-indexeddb`) ; `navigator.storage.persist()` demandé à la première écriture (H1-7). Passer à OPFS demandera une migration (H1-1).
- Coque : `plugin-fs` avec `fs:allow-read-dir`, `fs:allow-mkdir`, `fs:allow-remove` et une portée `$DOCUMENT/RoomBoard/Ressources` ; dossier partagé par la boîte native (`recursive: true`), accès perdu au redémarrage (pas de persisted-scope, H1-5) ; aucune commande Rust neuve (src-tauri hors du workspace).
- Paquet `.rbpack` : ZIP stocké, `manifest.json` (`kind: "pack"`, `schema`, `modified`) et `items/<dossier>/<nom>.rbitem` + compagnons ; écrit et lu en TS par le Worker ZIP existant (fflate, MIT) ; le cœur ne fait que refuser un paquet avec un message propre ; `formats` +501 o seulement (ligne `kind: "grid"`).
- Écart à U9 : mots-clés, description et vignette dans un compagnon `.json`/`.png`, pas dans le manifeste du `.rbitem` (H1-2, compatible si on les y ajoute plus tard).
- Glisser : Pointer Events (le glisser natif de la fenêtre Tauri bloque le HTML5 sous Windows, supposé) ; un dépôt passe par `insertResource`, une étape d'annulation.
```

### 3. Fiche `01_Projets/roomboard.md`, ligne 21

Ajouter à la fin de la ligne 21 (« Vague 2 en cours : … ») :

```
 ; C4 bibliothèque de ressources (panneau, dossiers, recherche, vignettes, glisser vers la page, paquets .rbpack ; IndexedDB sur le web, plugin-fs en coque) clos (PR #PR, `main` MERGE) — voir [[2026-11-21-roomboard-usage-c4-bibliotheque-clos]] et [[NNNN-roomboard-c4-bibliotheque-indexeddb-plugin-fs-rbpack-ts]]
```
