# Cadrage — restes-od94-porte-s6 (porte S6 du pot sur zones fermées, avec marge)

## 1. Demande et gabarit

Demande (tâche OE23, reste d'OD94 « Porte S6 fragile sous charge (40 à 63 ms mesurés, plafond 50) ») : le pire cas S6 de
C8 passe sa porte de 50 ms avec une marge réelle, médiane ≤ 35 ms sur la VM chargée, sur 5 passages de suite de l'essai C8,
aucun au-dessus de 50 ms. Ce cadrage cite Q18, Q20, DA-Z5 (§ 217) et S6 de `docs/plans/usage-c8-pot-zones-cadrage.md` sans
les refaire.

Gabarit : **courte** (10 questions au plus, pas de section d'architecture) ; 10 consommées. Mode autonome : aucune question à Jérôme
pendant le tour (brief).

**Mesure faite au cadrage** (module construit hors du worktree, `CARGO_TARGET_DIR=/tmp/cadrage-s6/target`, 1 368 840 o, la
taille du brief ; fixture S6 recopiée de `scripts/essais/c8-pot-zones-navigateur.mjs:43-73`, Node 22 donc V8 comme Chromium ;
charge 4,4 à 6,5 sur 8 cœurs) :

| ce qui est chronométré | médiane de 3 (valeurs) |
|---|---|
| `fill_zone` seul, vrai module | 22,0 ms (42,9 ; 22,0 ; 19,9) |
| boucle `element(id)` sur les 303 éléments, comme `tableCounts` (`engine.ts:286-290`) | **19,8 ms** (28,3 ; 19,8 ; 18,9) |
| `element_ids` seul | 0,6 ms |
| `zone_cells` (après la mesure) | 2,0 ms |
| témoin natif release `s6_worst_case_timing_witness` (`zone.rs:1517`) | 14,1 ms : `i_overlay` 6,57 · rastérisation et dilatation 4,28 · diffusion 1,43 · piles 0,85 · lecture des murs 0,50 · écriture 0,27 |

22,0 + 19,8 ≈ 42 ms : c'est la médiane de 40 à 45 ms de l'essai. Près de la moitié de la mesure n'est pas le calcul de zone.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| Q1 | Ce qui ne change pas | Seuil de 50 ms (`GATE_MS`), fixture S6 (triangle à main levée 2000 × 2000, 300 traits courts, `MIN_CELLS` 4 000 000), 3 clics annulés entre deux, médiane `ms[1]` après tri, tolérance de fermeture 2 px, clic hors du triangle ≤ 50 ms : tout reste tel quel. `c8-pot-zones-navigateur.mjs` n'est pas modifié. | brief OE23 ; C8 Q18 (`usage-c8-pot-zones-cadrage.md:35`), Q20 (`:37`), S6 (`:232`) ; essai `:35-36`, `:246-267` | non (fixé par le brief) |
| Q2 | Fenêtre de mesure | Inchangée : `performance.measure("pot-zone")` autour de `run` (`zone-marks.ts:42-58`, branchée par `fillQueue.submit(r, zoneMarks.timed(run))`, `board-session.ts:331`), du clic à l'écriture. Règle (brief : « aucun travail retiré de la mesure sans être fait ailleurs avant l'écriture visible ») : un gain compte seulement si le travail **disparaît ou coûte moins**. Un travail sorti de la fenêtre (ex. le recompte des `fill` de T11, `zone-marks.ts:57`) doit rester fait avant l'image qui montre le `fill`, et sa durée est mesurée et écrite à côté de la porte. | brief ; Q18 ; piège `04_Pieges/roomboard-mesure-performance-inclut-le-rendu-synchrone.md` | oui |
| Q3 | Lecture de la cible | Lecture **stricte** : 5 passages consécutifs de l'essai, chacun « C8 pot zones : OK » ; **chacune** des 5 médianes S6 ≤ 35 ms ; **aucun clic** mesuré > 50 ms, soit les 15 clics de zone (le premier, à froid, compris, puisqu'il fait partie des 3 clics de l'essai) et les 5 clics de fond. Lecture souple (médiane des 5 médianes ≤ 35 ms) : seulement en repli, écrit dans l'état avec les mesures. | état `restes-od94-porte-s6-etat.md:20` (« Terminé quand ») ; brief ; arbitrage de l'orchestrateur après contre-relecture 1/2 | oui |
| Q4 | « VM chargée » | La VM dans son état réel, avec les autres ouvriers ; aucun seuil de charge exigé. `/proc/loadavg` est relevé avant et après chaque passage et recopié ; les passages d'avant et d'après les gains se font dans les mêmes conditions (même commande, même construction, VM partagée). Une série de plus sous charge artificielle est facultative : elle sert d'information, pas de porte. | brief ; arbitrage de l'orchestrateur après contre-relecture 1/2 | oui |
| Q5 | Démarche et livrable de mesure | D'abord la mesure (brief) : 5 passages **avant** tout gain sur la tête de départ (afc2d8b), témoin natif release, banc vitest du vrai module (Q6). Tout s'écrit dans `docs/essais/c8-porte-s6.md` : passages (charge, 3 clics, médiane, fond), phases, tableau « où vont les ms ». Ensuite, gains en TDD, un à la fois, chacun suivi d'une ligne avant/après (témoin, banc, un passage de l'essai). Pour finir, les 5 passages S1. | brief ; piège (règle : chronométrer dans le vrai module avant d'optimiser) | oui |
| Q6 | Banc du vrai module | Nouveau test vitest `apps/web/src/engine/zone-s6-banc.test.ts`. Il saute sans `.wasm`, et sous `ROOMBOARD_WASM_REQUIRED=1` il échoue au lieu de sauter (patron `grid-cache.test.ts:13-27`). Il fabrique la fixture S6 comme l'essai, puis chronomètre (a) `doc.apply(Fill zone)` seul ; (b) `engine.run` avec le vrai cœur (montage `engine.test.ts:134`, `createEngine`) ; (c) **hors fenêtre** : `createZoneMarks(doc, …, onMarked)`, `timed(run)` puis `tags` rappelé par `onMarked`, soit le recompte des `fill` et `zoneCells`. Il écrit les durées sur la console, et `docs/essais/c8-porte-s6.md` porte une colonne « hors fenêtre », avant et après chaque gain. Il sépare aussi, dans les 19,8 ms de la boucle (§ 1), le parcours de `find_element` du coût de la vue (`to_js`, `read_fill`) (H7). **Témoin, pas porte** : aucune assertion de durée (Q18 : « un test natif de durée […] sert de témoin, pas de porte » ; piège `04_Pieges/calibrage-perf-par-duree-fausse-le-ratio.md`). Il porte aussi les assertions de non-régression (Q9). | Q18 ; brief ; piège | oui |
| Q7 | Premier gain : `tableCounts` | Mesuré (§ 1) : `tableCounts` (`engine.ts:281-295`) relit **chaque** élément par `doc.element(id)` à chaque nouvelle version. Il est appelé par `state()` dans `emit()`, dans `commit`, donc dans la fenêtre. `element(id)` passe par `find_element`, qui parcourt la page (`document.rs:620-641`) : le tout est en O(N²) et coûte 19,8 ms sur 303 éléments. Correction : étendre le cœur avec les ids d'une page filtrés par `kind`, en une passe (`elementIdsOfKind(page, kind)`, interface § 3). `tableCounts` ne lit plus que la vue des candidats `table`, chacun confirmé par `element(id)`. Le recompte des `fill` de `zone-marks.ts:62` prend le même accesseur, avec la même confirmation : il est hors de la fenêtre, mais il gèle aussi le fil principal (constat ouvert `zone-marks.ts:56`, que ce chantier ferme). | mesure du cadrage ; piège ; `docs/architecture-constats.md:23` | oui |
| Q8 | Gains suivants, côté cœur | Seulement si S1 n'est pas tenue après Q7. Le premier clic à froid compte désormais (Q3) : 42,9 ms au cadrage pour `fill_zone` seul, dus à la croissance de la mémoire du module ; s'il approche 50 ms sous la charge réelle, il passe en tête. Ensuite, dans l'ordre de la part mesurée : `i_overlay` (6,6 ms natif), rastérisation et dilatation (4,3 ms, dont la remise à zéro du masque de 4 Mio), diffusion, puis la lecture par le pont et les allocations. Sans rouvrir Q20 : signature publique de `closed_zone(walls, x, y, tol) -> Zone` et de `zone_walls` inchangée (le Worker de DA-Z5 l'appelle), un seul masque `u8` d'au plus 2²² cellules, aucune crate nouvelle. | C8 Q20 (`:37`), DA-Z5 (`:215-219`) ; témoin natif | oui |
| Q9 | Repli de C8 | L'étape 1 (plafond 2²¹) est **exclue** : S6 compte 4 044 121 cellules, plus que 2²¹ (2 097 152). La cellule doublerait, la tolérance passerait à 4 px et `data-zone-cells` à environ 1 M, sous `MIN_CELLS` (essai `:36`, `:260`) : l'essai rougit et Q1 n'est plus tenue. L'étape 2 (Worker) est une décision d'architecture hors du gabarit courte. Si les gains directs ne suffisent pas, le chantier **s'arrête** et l'écrit dans l'état (mesures à l'appui), puis l'orchestrateur relance un cadrage. | DA-Z5 ; Q1 ; brief (« en décision écrite ») | oui |
| Q10 | Non-régression, tailles, licences | **Hypothèse H3** pour l'empreinte. Le banc (Q6) vérifie sur S6, dans le vrai module : un `fill` par clic, une étape d'annulation par clic, des trous (plus d'un anneau), l'aller-retour `.roomboard` (`fillRings` et `element` identiques), le fond hors du triangle. Il compare aussi une **empreinte** du `fill` relevée sur afc2d8b avant tout gain (nombre d'anneaux, longueur et condensé SHA-256 de `fillRings(id)`, `bounds([id])`). Tailles : module principal ≤ 1 572 864 o, `formats` sans ajout (≤ 3 100 845 o, sous son plafond de 3 145 728 o) ; scène ≥ 640 px ; aucune dépendance AGPL, GPL ni LGPL (`controle-licences.mjs`). | brief ; `verifier.sh:51-60` ; C8 Q19 | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (interface TS, cœur et pont, essai et documents, tests).
Aucun graphe graphify pour `roomboard` (`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : liens
relevés par recherche texte et lecture. Gabarit courte : endroits touchés seulement, et les tests à garder verts.

**Interface TS**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/engine.ts:281-295` (`tableCounts`) | oui (Q7) | relit chaque élément par le pont dans la fenêtre ; lira `elementIdsOfKind(page, "table")` | V |
| `apps/web/src/core/api.ts:331` (`CoreDocument`, à côté d'`elementIds`) | oui | `elementIdsOfKind(page, kind)` | V |
| `apps/web/src/core/wasm-core.ts:496` · `fake-core.ts:671` | oui | relais et parité de la fausse liaison | V |
| `apps/web/src/app/zone-marks.ts:9-13`, `:62` (`ZoneDoc`, recompte) | oui (Q7) | recompte des `fill` par `elementIdsOfKind(page, "fill")` ; fenêtre `:42-58` inchangée | V |

**Cœur et pont**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/document.rs:314` (`element_ids`) | oui | `element_ids_of_kind`, même passe et même filtre | V |
| `crates/roomboard-wasm/src/lib.rs:1153` | oui | `element_ids_of_kind` exporté | V |
| `crates/roomboard-core/src/zone.rs:733-789` (`closed_zone`, phases) | selon la mesure (Q8) | `i_overlay` `:765`, masque `:239-250` ; signature inchangée | V |

**Essai et documents**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c8-pot-zones-navigateur.mjs` | non (Q1) | lancé 5 fois, sortie lue telle quelle (les 3 clics sont imprimés, `:261`) | V |
| `scripts/essais/c10b-tableau-navigateur.mjs:112-133` | non | lit `data-table-merges` et `data-table-shades`, que `tableCounts` produit : à garder vert (S3) | V |
| `docs/essais/c8-porte-s6.md` (nouveau) · `docs/essais/taille-wasm.md:88` | oui | mesures (Q5) ; ligne de taille | V |

**Tests**

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/engine/zone-s6-banc.test.ts` (nouveau) | oui | banc et non-régression S6 (Q6, Q10) | S |
| `apps/web/src/core/wasm-core.contract.test.ts:3549-3620` | oui | contrat `elementIdsOfKind` sur les deux liaisons : un tableau à côté d'un élément inconnu sans `id` (K8, `query.rs:161`), qui n'apparaît ni dans `elementIds` ni dans `elementIdsOfKind` ; blocs C8 à garder verts | V |
| `apps/web/src/app/board-session.test.ts:1213` (`watchDoc`) | oui | espionne aussi `elementIdsOfKind` et `elementIds` : RF4 garde sa couverture des accès au document libéré | V |
| `apps/web/src/engine/engine.test.ts` (`tableMerges`, `tableShades`) · `zone-marks.test.ts:27-92` | oui | nouveau cas « vue lue pour les seuls tableaux » et « `fill` mal formé non compté » ; cas existants verts | V |
| `crates/roomboard-core/src/zone.rs:933-1510` (tests de zone) · `stage-tags.test.ts:84` | non | à garder verts (oracles de masque, trous, fond) | V |

- **Effets de bord sur l'existant**
  - `data-table-merges` et `data-table-shades` : mêmes valeurs, la vue ne se lit plus que pour les tableaux (`engine.test.ts`, nouveau cas).
  - `data-zones` : même compte. Un `fill` mal formé, vu `unknown`, reste non compté, parce que le candidat est confirmé par `element(id)` (`zone-marks.test.ts`, nouveau cas).
  - Le gel du fil principal par clic du pot doit baisser d'environ 40 ms (`tableCounts` dans la fenêtre, recompte hors d'elle). Le banc le mesure, cas (b) et (c), et `docs/essais/c8-porte-s6.md` l'écrit avant et après, colonne « hors fenêtre ».
  - Accès au document après sa libération : `elementIdsOfKind` devient un accès de plus, couvert par `watchDoc` (`board-session.test.ts:1213`, RF4).
  - Module principal : quelques centaines d'octets de plus (`verifier.sh:59`, plafond).
  - Gain dans `closed_zone` : la géométrie du `fill` reste identique (empreinte de `zone-s6-banc.test.ts`, plus les tests de `zone.rs`).
- **Chantiers en cours** : `git worktree list` donne seulement `main` et ce worktree. `gh pr list --state open` donne `[]`. Dans ce même worktree, l'agent `audit-od94` écrit `docs/audits/` : fichiers disjoints, aucun conflit.
- **Termes cherchés** : `data-zone-ms|data-zone-cells|zoneMs|zone-ms|pot-zone|zone_cells|zoneCells|fill_zone|fillZone|onMarked|ROOMBOARD_WASM_REQUIRED` ; `timed(` ; `onState(` ; `elementIds\([^)]*\)` (tous les parcours d'éléments par le pont) ; `element_kind|elementKind|kind_of|kindOf|kinds\(|count_kind|countKind` (**rien** : aucun accesseur de kind) ; `fn find_element`, `pub fn element(`, `fn cached_outline`, `fn insert_fill` ; `S6|témoin` dans les tests ; coffre `chercher.js` « roomboard pot zones performance porte S6 », « roomboard pont wasm element lecture coût engine state », « OD94 restes porte S6 charge VM mesure ». Contre-relecture 1/2 : `watchDoc`, `c10b-tableau-navigateur.mjs` (`data-table-`), `element_geom` (K8). Mesure à rejouer : construire le module dans `/tmp`, puis le script de § 1 (fixture de l'essai, 3 × `fill_zone` + boucle `element_ids`/`element` + `undo`).
- **Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| mesurer le clic | `apps/web/src/app/zone-marks.ts:28-58` | `createZoneMarks(doc, now, measure, onMarked).timed(run)` | réutiliser, inchangé |
| passages de la porte | `scripts/essais/c8-pot-zones-navigateur.mjs:227-267` | `node scripts/essais/c8-pot-zones-navigateur.mjs`, lignes « S6 : médiane … » et « S6 : fond en … » | réutiliser, inchangé |
| phases natives | `crates/roomboard-core/src/zone.rs:164` (`lap`), `:1517` (`s6_worst_case_timing_witness`) | `cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture` | réutiliser |
| charger le vrai module en test | `apps/web/src/engine/render/grid-cache.test.ts:13-27` | patron `present`, `required`, `loadWasm()` (code de test) | réutiliser le patron |
| moteur sur le vrai cœur | `apps/web/src/engine/engine.ts:234` | `createEngine({ doc, renderer, frames, tools })`, montage de `engine.test.ts:134` | réutiliser |
| ids des éléments d'une page d'un `kind` donné, sans vue | `crates/roomboard-core/src/document.rs:314` (`element_ids`, même passe et même filtre) | cœur `pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String>` ; pont `pub fn element_ids_of_kind(&self, page: &str, kind: &str) -> Vec<String>` ; `CoreDocument.elementIdsOfKind(page: string, kind: string): readonly string[]`. Rend, dans l'ordre de la page, les ids qu'`elementIds(page)` rendrait et dont le champ `kind` brut vaut `kind` : aucun tableau parallèle à aligner. Contrat : une vue de kind `k` ≠ `unknown` implique que son id figure dans `elementIdsOfKind(page, k)`. Page inconnue : `[]`. | étendre (rien trouvé, termes ci-dessus) |
| compter tableaux et `fill` | `apps/web/src/engine/engine.ts:281` (`tableCounts`), `apps/web/src/app/zone-marks.ts:62` | `elementIdsOfKind(page, "table")` et `elementIdsOfKind(page, "fill")`, puis `element(id)` pour confirmer chaque candidat ; `ZoneDoc` gagne `elementIdsOfKind(page: string, kind: string): readonly string[]` | étendre |
| union et différence | `zone.rs:765` (`FloatOverlay::with_subj_and_clip`) | `i_overlay` 9.2.0, déjà en dépendance | réutiliser, aucune crate |
| contours des traits | `crates/roomboard-core/src/document.rs:537` (`cached_outline`) | appelé par `wall_of` (`zone.rs:843`) | réutiliser |
| contrôle des tailles | `scripts/verifier.sh:51-60` | plafond 1 572 864 o ; `formats` 3 145 728 o | réutiliser |

Constats ouverts des zones touchées : `zone-marks.ts:56` (peu profond), fermé par Q7 à la clôture. `zone.rs:127` (union de
boîtes) et `document.rs:423` (vue d'un `fill` qui alloue) : ce chantier ne les aggrave pas, et un gain de Q8 n'ajoute aucune troisième copie.

## 4. Hypothèses à revoir

Difficiles à défaire ou visibles des utilisateurs : aucune. Q3 (lecture stricte) et Q4 (charge réelle) ont été tranchées par
l'orchestrateur à la contre-relecture 1/2 ; H1 et H2 sont retirées.

Autres :
- **H3** (Q10) L'empreinte du `fill` S6 est exacte : nombre d'anneaux, condensé de `fillRings`, boîte. Un gain qui change le condensé
  (ordre ou découpe des sommets) sans changer la forme ne passe qu'avec une décision écrite dans l'état, et seulement s'il garde le
  nombre d'anneaux et la boîte à 1e-9 près.
- **H4** (§ 3) `elementIdsOfKind` filtre sur le kind brut : un élément mal formé y figure encore. Ses appelants confirment donc chaque candidat par `element(id)`.
- **H5** (Q6) Le banc tourne dans `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test` (moins d'une seconde) et n'échoue jamais sur une durée.
- **H7** (Q6, Q7) Les 19,8 ms de la boucle `element(id)` viennent surtout du parcours de `find_element`, en O(N²), plutôt que de la vue (`to_js`, `read_fill`). C'est une supposition : le banc la mesure avant le gain (vues lues une à une contre `elementIds` seul), et `docs/essais/c8-porte-s6.md` l'écrit. Si la vue domine, Q7 tient encore, puisque le gain retire les vues des non-candidats.

## 5. Décisions d'architecture

Aucune (gabarit courte). Le Worker de DA-Z5, seule option d'architecture en jeu, est renvoyé à un nouveau cadrage (Q9).

## 6. Scénarios d'acceptation

- **S1** (porte S6) Sur la tête finale, après `scripts/verifier.sh`, lancer 5 fois de suite `node scripts/essais/c8-pot-zones-navigateur.mjs`,
  sur la VM dans son état réel, avec `cat /proc/loadavg` avant et après chaque passage. Les 5 passages disent « C8 pot zones : OK ».
  **Chacune** des 5 médianes S6 est ≤ 35 ms, et aucun des 15 clics de zone (premier clic à froid compris) ni des 5 clics de fond ne dépasse
  50 ms. Le tout est recopié dans `docs/essais/c8-porte-s6.md`, avec la colonne « hors fenêtre ».
- **S2** (comportement C8 inchangé) `zone-s6-banc.test.ts` sur le vrai module :
  - trois clics au pot dans le triangle S6 posent chacun un `fill` à trous, et chaque annulation le retire en une étape ;
  - l'empreinte est égale à celle d'afc2d8b ;
  - enregistrer puis rouvrir rend le même `fill` ;
  - un clic hors du triangle change le fond, sans `fill`.

  Les tests de zone de `zone.rs`, le contrat C8 et S1 à S5 de l'essai restent verts.
- **S3** `scripts/verifier.sh --e2e` OK sur la tête finale, sans test retiré, avec au moins autant de tests web qu'avant (référence prise au lancement).
- **S4** (tailles et licences) `verifier.sh` affiche un module principal ≤ 1 572 864 o et `formats` sans ajout : ≤ 3 100 845 o (l'égalité à l'octet n'est pas exigée), donc sous son plafond de 3 145 728 o.
  La scène fait au moins 640 px, outil Pot actif. `controle-licences.mjs` passe, sans dépendance nouvelle.

## 7. Hors périmètre

- Seuil, fixture, nombre de clics, médiane, tolérance et `MIN_CELLS` de l'essai (Q1).
- Repli DA-Z5 : plafond 2²¹ (exclu, Q9) et Worker (nouveau cadrage, Q9).
- Les autres parcours en O(N²) par `element(id)`, hors de la fenêtre du pot : `tableAt` (`table-geom.ts:168`), `fragments.ts:85`, `pageViews` de `select.ts:99`.
  Ils pourront prendre `elementIdsOfKind` plus tard.
- Un index des éléments par id dans `find_element` (`document.rs:620`).
- Les constats `zone.rs:127` et `document.rs:423`, et tout refactor issu de l'audit (`docs/audits/`, choix de Jérôme).
- `wasm-opt` dans la chaîne de build. Autres dépôts : aucun.

## 8. Portes immédiates

Aucune.
