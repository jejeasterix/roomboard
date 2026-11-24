# Cadrage — platform-feuilles (OF13)

## 1. Demande et gabarit

Casser les cycles d'import de `apps/web/src/platform/` et sa dépendance vers `app/` par de petits modules feuilles, gardés par un test du dépôt, sans changer ce que voient la page, la coque et la CLI.

Gabarit : `courte` (cadrage autonome, ouvrier CLI de la VM ; délégation de Jérôme : « Non effectivement tu leurs confie et il juges ce qui doit être fait ou pas. »). Sources : bilan d'Outillage cité par le brief (non retrouvé sur la VM), audit `docs/audits/2026-11-21-audit-architecture.md` (candidats B et E), `docs/architecture-constats.md`, coffre 0268, 0283, 0287. Graphe `~/.cache/graphes/roomboard` présent et cohérent avec le relevé.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Les 5 constats visés | Les 4 constats ouverts qui parlent d'un cycle ou de la dépendance `platform → app` : `clipboard.ts:7` (l. 20), `office-import.ts:40` (l. 29), `zip-worker.ts:25` (l. 34), `open-export.ts:33` (l. 49), plus `session.ts:186` (l. 47), le seul marqué « OF13 ». Les cinq se ferment ; aucun ne reste ouvert. Le cycle `import.ts` ↔ `model3d-handlers.ts` de l'audit E n'est pas un constat du fichier : il tombe avec D5. `image-import.ts:244` (l. 19, nom d'`ImageTarget`) et `annotation-page.ts:76` (l. 43) restent ouverts (hors périmètre). | `docs/architecture-constats.md:20,29,34,47,49` ; audit `:118` | oui (H1) |
| D2 | Règle de la garde | Test vitest `apps/web/src/platform/import-graph.test.ts` : (a) aucun cycle entre les fichiers non-test de `platform/`, imports de type compris ; (b) aucun import, de type compris, d'un fichier non-test de `platform/` vers `src/app/`. Message d'échec : le cycle (fichiers dans l'ordre) ou `fichier:ligne → cible`. Les `*.test.ts` de `platform/` ne sont pas lus : `zip-worker.test.ts:6` décode par `app/board-io`, et c'est voulu. Le test essaie aussi son détecteur sur un faux graphe en cycle (`a → b → a`). | brief OF13 ; relevé ci-dessous (§ 3, Tests) | oui (H2) |
| D3 | Lecture des imports | `ts.preProcessFile(texte, true, true)` du paquet `typescript`, déjà en devDependencies (`apps/web/package.json:28`) ; il rend `import`, `import type`, `export … from` et `import()`. En plus, une regex lit `new URL("<relatif>", import.meta.url)` (Workers : `pdf-load.ts:54`). Résolution : spécificateur relatif → `.ts`, `.tsx` ou `/index.ts`. Un spécificateur relatif non résolu fait **échouer** la garde, sauf le dossier généré `../wasm-formats/` (`container-load.ts:8`, absent d'un worktree neuf). Un import vers `src/app/` échoue même si le fichier manque. Aucune dépendance ajoutée. | `apps/web/package.json:28` ; `pdf-load.ts:54` ; `container-load.ts:8` ; brief (« pas de nouvelle dépendance ») ; contre-relecture 1 | oui (H7) |
| D4 | Cycle `clipboard` ↔ `paste` | Nouveau module feuille `platform/editable.ts` : `isEditable` (`paste.ts:17-23`) et `NOT_TEXT` (`paste.ts:14`), déplacés sans changement ; `TABLE_TAG` (`paste.ts:15`) reste dans `paste.ts` ; `clipboard.ts` l'importe de là ; `paste.ts` l'importe et le réexporte (pour que `paste.test.ts:5` ne change pas). On ne fusionne pas `isEditable` avec `inEditable` (`engine/input/keys.ts:17`), qui a d'autres règles (pas de `SELECT` ni d'exclusion des `<input type=button…>`, pas de lecture de l'attribut). | constat l. 20 ; `paste.ts:14,17-23` ; `keys.ts:15-18` | oui |
| D5 | Cycle `import` ↔ `office-import` ↔ `model3d-handlers` (et les types de `image-import`, `media-import`) | Nouveau module feuille `platform/import-handler.ts` : contrat du gestionnaire (types `ImportContext`, `ImportOutcome`, `ImportHandler`, `ImageTarget`, `StageRect`) et aides sans registre (`hasExtension`, `ZIP_MAGIC`, `hasZipMagic`, `SHEET_MAX_BYTES`, `isSheetName`). `office-import`, `model3d-handlers`, `media-import` et `image-import` importent de là ; `import.ts` réexporte les dix noms ; `image-import.ts` réexporte `ImageTarget` et `StageRect`. `OFFICE_MAX_BYTES = SHEET_MAX_BYTES` (même valeur, 100 Mio). Le commentaire « cycle d'import » de `office-import.ts:7,17` est retiré. | constat l. 29 ; `office-import.ts:17` ; audit E `:118` | oui |
| D6 | `platform → app` (Worker ZIP) | Nouveau module feuille `platform/board-list.ts` : codec du flux BoardList, déplacé de `board-io.ts:20-344` (sans `BoardFormat`, `BoardSourceFormat` ni `BoardPorts`), avec `BOARD_MAX_OBJECTS`, `SKIPPED_LABEL` (de `board-files.ts:16,129`) et `BOARD_OBJECTS_MESSAGE` (de `board-reader.ts:35`) ; il n'importe que des types de `core/api`. `app/olf-read.ts` part entier dans `platform/olf-read.ts` (`git mv`, avec son test), et importe `board-list`. `board-io.ts`, `board-files.ts` et `board-reader.ts` réexportent ce qu'ils exportaient. `zip-worker.ts` et `zip-read.ts` importent depuis `platform/` seulement. Le Worker reste à `platform/zip-worker.ts`, chargé par `main.ts:220`. | constat l. 34 (« sortir encodeBoardList, decodeBoardList et les bornes dans un module pur ») ; coffre 0268 (`.olf` lu en TS dans le Worker ZIP) ; 0283 (`zipJobReply` joué en processus par la CLI) | oui |
| D7 | Cycle de types `board-reader` ↔ `zip-read` | `ZipFile` passe dans `platform/archive-path.ts`, déjà une feuille et déjà importé par `board-reader`. `zip-read.ts` le réexporte (pour `rbpack`, `board-io`, `zip-worker` et `library` via `rbpack`). | relevé ; `zip-read.ts:16-20` ; `board-reader.ts:13,16` | oui |
| D8 | Constat l. 47 (`session.ts:186`) | `officeErrorCode(e: unknown): string` (`e instanceof OfficeConvertError ? e.code : "failed"`), exporté par `office-import.ts` et appelé par `officeHandler` (`:134`) et `readDoc` de la CLI (`session.ts:195`). Ce n'est pas un constat de cycle : il entre dans le chantier par sa mention « OF13 » (le chantier cli-partage l'a laissé à `platform/`). Les codes de sortie de la CLI (3 sur `no-program`, 1 sur un autre échec de conversion) et tous les messages restent identiques. Les deux règles qui restent différentes sont voulues (D56, D59 du cadrage cli-lot4) : repli sur le classeur côté page, code 3 côté CLI. Le constat se ferme avec cette raison écrite. | constat l. 47 ; `cli-lot4-cadrage.md:45,48` (D56, D59) | oui |
| D9 | Constat l. 49 (`open-export.ts:33`) | Nouveau module feuille `platform/messages.ts`, sans aucun import : `messageOf(e: unknown): string` (déplacé de `controller.ts:86-88`, que `controller.ts` réexporte pour ses 23 importeurs) et `openFailedMessage(name: string, e: unknown): string` (déplacé de `open-export.ts:33`, que `open-export.ts` réexporte : `workspace.ts:51` et `session.ts:20` ne changent pas). Appellent `openFailedMessage` au lieu du gabarit écrit en ligne, texte rendu strictement identique : `app/container-io.ts:155,164,181,188`, `app/pdf-convert.ts:43` (`messageOf` d'une chaîne rend la chaîne), `platform/import.ts:155`, `platform/mount.ts:48` et `platform/controller.ts:166`. Pour ce dernier, `fail(prefix, e)` (`controller.ts:108-117`) est coupé en `say(text)` (avis, avec `console.warn` puis relance si la boîte échoue) et `fail(prefix, e)` qui rend `say(prefix + " : " + messageOf(e))` ; la ligne 166 devient `say(openFailedMessage(file.name, e))`, ce qui donne le même texte et le même `console.warn`. Restent hors du module, car ce sont d'autres formats : `controller.ts:159` et `workspace.ts:787` (« Ouverture impossible : … », sans nom). | constat l. 49 ; contre-relecture 1 ; `controller.ts:86-88,108-117,159,166` ; textes figés par `container-io.test.ts:139,314,321,347`, `import.test.ts:63`, `mount.test.ts:50`, `controller.test.ts:353` | oui |
| D10 | Interface publique et tests | Chaque nom déplacé reste exporté par son module d'origine. Seule exception : `olf-read`, qui déménage entier. Côté CLI, seul `session.ts` change (D8). Dans les tests existants, seules 4 lignes d'import changent : `olf-read.test.ts:2-3` (fichier déplacé ; `board-io`/`board-files` → `board-list`), `zip-read.test.ts:7`, `zip-worker.test.ts:7`. Branche `refactor/platform-feuilles` (fichier d'état). Aucune commande, opération ni sortie de la CLI ne change : pas de mise à jour D15 (`FORMAT_LOTS`, `cli-essai.mjs`). | `.claude/chantier.md` § CLI ; brief | oui (H3) |

Budget de questions : 10 / 10.

## 3. Carte d'impact

Profil sans ligne « Surfaces d'impact » : rubriques déduites du graphe et de la recherche texte.

### Modules de `platform/`

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/platform/paste.ts:14-23` | oui | `isEditable` part dans `editable.ts`, réexporté (D4) | V |
| `apps/web/src/platform/clipboard.ts:7` | oui | importe `editable.ts` (D4) | V |
| `apps/web/src/platform/import.ts:96-135,137,165-167,220-224` | oui | contrat et aides dans `import-handler.ts`, réexportés (D5) | V |
| `apps/web/src/platform/office-import.ts:7,10,17-18,134` | oui | importe `import-handler` ; `OFFICE_MAX_BYTES = SHEET_MAX_BYTES` ; `officeErrorCode` (D5, D8) | V |
| `apps/web/src/platform/model3d-handlers.ts:13` | oui | importe `import-handler` (D5) | V |
| `apps/web/src/platform/media-import.ts:10` | oui | types depuis `import-handler` (D5) | V |
| `apps/web/src/platform/image-import.ts:13,142-147,182-199` | oui | `ImageTarget`, `StageRect` dans `import-handler`, réexportés (D5) | V |
| `apps/web/src/platform/zip-worker.ts:30-31` | oui | `board-list`, `olf-read` de `platform/` (D6) | V |
| `apps/web/src/platform/zip-read.ts:9,16-20` | oui | `olf-read` de `platform/` ; `ZipFile` réexporté (D6, D7) | V |
| `apps/web/src/platform/board-reader.ts:16,35` | oui | `ZipFile` d'`archive-path` ; `BOARD_OBJECTS_MESSAGE` de `board-list` (D6, D7) | V |
| `apps/web/src/platform/archive-path.ts` | oui | reçoit `ZipFile` (D7) | V |
| `apps/web/src/platform/messages.ts` (neuf) | oui | `messageOf`, `openFailedMessage` (D9) | — |
| `apps/web/src/platform/controller.ts:86-88,108-117,166` | oui | réexporte `messageOf` ; `fail` coupé en `say` + `fail` ; l. 166 par `openFailedMessage` (D9) | V |
| `apps/web/src/platform/import.ts:155`, `mount.ts:48` | oui | `openFailedMessage` (D9) | V |
| `apps/web/src/platform/table-insert.ts:16`, `host-tauri.ts:19` | non | importent par les réexports, sans cycle | V |

### `app/` (réexports et messages)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/board-io.ts:12,16,20-344` | oui | codec déplacé dans `platform/board-list`, réexporté (D6) | V |
| `apps/web/src/app/board-files.ts:15-16,129` | oui | `BOARD_MAX_OBJECTS`, `SKIPPED_LABEL`, `BOARD_OBJECTS_MESSAGE` réexportés de `board-list` (D6) | V |
| `apps/web/src/app/olf-read.ts` | oui | déplacé dans `platform/` (D6) | V |
| `apps/web/src/app/open-export.ts:33` | oui | `openFailedMessage` déplacé dans `platform/messages.ts`, réexporté (D9) | V |
| `apps/web/src/app/container-io.ts:155,164,181,188`, `pdf-convert.ts:43` | oui | appellent `openFailedMessage` (D9) | V |
| `apps/web/src/main.ts:220` | non | URL du Worker ZIP inchangée | V |

### CLI (`apps/cli`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/session.ts:29,195` | oui | `officeErrorCode` (D8) | V |
| `apps/cli/src/board-node.ts:16`, `library.ts:16`, `model3d-node.ts:15` | non | `zipJobReply` inchangé ; le fichier construit change de contenu, pas de sortie | V |
| `apps/cli/src/importer.ts:16`, `exporter.ts:15`, `main.ts:15`, `pdf-node.ts:17` | non | `isSheetName`, `hexOf` par réexports | V |

### Build et Worker

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| chunk `zip-worker-*.js` de `pnpm --filter @roomboard/web build` | oui | n'importe plus `app/board-io` (qui tire `container-io`) ; mais `zip-worker.ts:28` importe encore `sniffImage` d'`image-import` (qui importe `engine/camera`, `engine/page`, `controller`) : le chunk reste sans DOM **par le seul tree-shaking**, comme avant. Hors périmètre : la garde D2 ne le contrôle pas ; S4 le contrôle sur le chunk construit | V |
| modules Wasm (1 374 215 o / 2 794 511 o) | non | aucun Rust touché | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/platform/import-graph.test.ts` (neuf) | oui | garde D2 ; rouge sur la base, vert à la fin | — |
| `apps/web/src/app/olf-read.test.ts` → `platform/olf-read.test.ts` | oui | déplacé ; lignes d'import 2 et 3 seules | V |
| `apps/web/src/platform/zip-read.test.ts:7`, `zip-worker.test.ts:7` | oui | chemin d'import `olf-read` seul | V |
| tests des feuilles neuves (`editable`, `import-handler`, `board-list`, `messages`) | oui | un test par module extrait | — |
| `paste.test.ts`, `clipboard.test.ts`, `import.test.ts:10,20,433,1161,1213`, `office-import.test.ts`, `model3d-handlers.test.ts`, `media-import.test.ts`, `board-io.test.ts`, `container-io.test.ts:139,314,321,347`, `open-export.test.ts`, `workspace.test.ts`, `controller.test.ts:282,353`, `mount.test.ts:50`, `import.test.ts:63` | non | à garder verts tels quels | V |
| CLI : `office.test.ts:109`, `session.test.ts`, `boards.test.ts`, `convert.test.ts` ; `scripts/essais/cli-essai.mjs`, `cli-comparer.mjs` | non | à garder verts ; sorties identiques à la base | V |

Relevé « avant » sur `34d4d61` (script jetable `~/.cache/tmp/of13-cadrage/cycles.cjs`, compilateur `typescript` de `apps/web`, retiré ; la garde D2 le remplace) : 53 fichiers non-test, 152 imports relatifs.
- `platform → app` : 3 imports, `zip-read.ts:9 → app/olf-read`, `zip-worker.ts:30 → app/board-io`, `zip-worker.ts:31 → app/olf-read`.
- Cycles, imports de type compris : 3 composantes, `clipboard ↔ paste` ; `board-reader ↔ zip-read` (`board-reader.ts:16`, de type) ; `import, office-import, model3d-handlers, image-import, media-import, table-insert` (6 fichiers).
- Cycles, imports de valeur seuls : 2 composantes, `clipboard ↔ paste` ; `import, office-import, model3d-handlers`.
- Sur tout `src/` : une composante de 13 fichiers à cheval sur `app/` et `platform/` (`board-files`, `board-io`, `container-io`, `olf-read`, `board-reader`, `host-tauri`, `image-import`, `import`, `media-import`, `model3d-handlers`, `office-import`, `table-insert`, `zip-read`). Elle tombe avec D6.

**Effets de bord sur l'existant**
- Ordre d'évaluation des modules d'import changé (plus de cycle) : `import.test.ts`, `office-import.test.ts`, `model3d-handlers.test.ts`.
- `OFFICE_MAX_BYTES` lu dans `SHEET_MAX_BYTES` au lieu d'un littéral : `import.test.ts:1161,1213`.
- Contenu du chunk du Worker ZIP : S4 (build, recherche de `document`/`window`), `zip-worker.test.ts`.
- Fichier construit de la CLI (modules réordonnés et feuilles ajoutées) : S2 (`cli-comparer.mjs` base ↔ tête), `cli-essai.mjs`.
- Messages « Ouverture impossible (nom) : … » composés par une seule fonction : `container-io.test.ts:139,314,321,347`, `open-export.test.ts`, `import.test.ts:63`, `mount.test.ts:50`, `controller.test.ts:353`.
- `fail` du contrôleur coupé en `say` + `fail` (mêmes textes, même `console.warn`) : `controller.test.ts:282,353` et les autres échecs (enregistrement, import).
- `olf-read` déménagé : `olf-read.test.ts` (déplacé), `zip-worker.test.ts`.

**Chantiers en cours**
- `git worktree list` : le dossier principal (`main`, 34d4d61) et ce worktree ; `gh pr list` : aucune PR ouverte. Aucun autre chantier sur ces fichiers. Autre machine : aucun worktree transmis.

**Termes cherchés**
- Graphe : `graphify affected "encodeBoardList"`, `affected "hasZipMagic"`, `affected "isEditable"` (ambigu : `paste.ts` et `annotation-page.ts`).
- Texte : `git grep -n "olf-read"` ; `grep -rn "app/board-io\|app/olf-read\|\./board-io\|\./olf-read"` (web et CLI) ; `grep -rn "isEditable\|inEditable"` ; `grep -rn "ImageTarget"`, `"StageRect"`, `"type ZipFile"` ; `grep -rn "Ouverture impossible\|openFailedMessage"` (app, platform, CLI) ; `grep -n "fail("` (`platform/controller.ts`) ; `grep -rn "platform/controller\"\|\./controller\""` (importeurs de `messageOf`, 23) ; `grep -n "OFFICE_MAX_BYTES\|SHEET_MAX_BYTES"` ; `grep -n "OfficeConvertError"` (web, CLI) ; `grep -rn "BOARD_OBJECTS_MESSAGE\|BOARD_MAX_OBJECTS\|SKIPPED_LABEL"` ; `grep -n "new URL" platform/*.ts` ; `grep -rn "wasm-formats\|\.\./wasm/" platform/*.ts` ; `grep -rn "zip-worker"`.
- Relevé : `node ~/.cache/tmp/of13-cadrage/cycles.cjs <worktree>/apps/web platform` et `global.cjs` (SCC sur `src/`), décrits plus haut.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant | interface appelée ou étendue | décision |
|---|---|---|---|
| dire si une cible est éditable (presse-papiers, collage) | `platform/paste.ts:17` | `isEditable(t: EventTarget \| null): boolean` | nouveau module `platform/editable.ts`, même signature, déplacée : le cycle interdit de la laisser dans `paste.ts` ; `inEditable` (`keys.ts:17`) a d'autres règles (termes : `isEditable`, `inEditable`) |
| contrat d'un gestionnaire d'import, aides sans registre | `platform/import.ts:96-135,137,165-167,220-224`, `image-import.ts:142,182` | types `ImportContext`, `ImportOutcome`, `ImportHandler`, `ImageTarget`, `StageRect` ; `hasExtension(name, ext): boolean`, `ZIP_MAGIC`, `hasZipMagic(head): boolean`, `SHEET_MAX_BYTES`, `isSheetName(name): boolean` | nouveau module `platform/import-handler.ts`, ces dix noms à l'identique : `import.ts` est le registre, que ses gestionnaires ne peuvent pas importer sans cycle (termes : `hasZipMagic`, `ImportHandler`, `ImageTarget`) |
| plafond Office | `platform/import.ts:220` | `SHEET_MAX_BYTES` | réutiliser (`OFFICE_MAX_BYTES = SHEET_MAX_BYTES`) |
| coder et décoder le flux BoardList, bornes | `app/board-io.ts:20-344` | `encodeBoardList(pages): BoardListData`, `decodeBoardList(ops, texts, budget?): BoardListPage[]`, `hexOf`, `rgbOf`, `BOARD_OP`, `MAX_POINTS`, `MAX_SPANS`, `MAX_GROUP_DEPTH`, `BOARD_BAD_LIST_PREFIX`, types `BoardObject`, `BoardListPage`, `BoardListData` ; plus `BOARD_MAX_OBJECTS`, `SKIPPED_LABEL`, `BOARD_OBJECTS_MESSAGE` | nouveau module `platform/board-list.ts` (n'importe que des types de `core/api`) : le Worker ZIP ne peut pas lire `app/` (termes : `encodeBoardList`, `BOARD_OBJECTS_MESSAGE`, `SKIPPED_LABEL`) |
| lire un `.olf` dans le Worker | `app/olf-read.ts:287` | `readOlf`, `OLF_MAX_JSON_BYTES`, `OLF_TOO_BIG_MESSAGE` | réutiliser, déplacé dans `platform/olf-read.ts` (`git mv`) |
| type d'un fichier d'archive | `platform/zip-read.ts:17` | `ZipFile` | étendre `platform/archive-path.ts` (feuille existante) |
| lire le code d'échec d'une conversion Office | `platform/office-import.ts:134` | `officeErrorCode(e: unknown): string` | étendre `office-import.ts` ; appelé par `session.ts:195` |
| composer « Ouverture impossible (nom) : … » | `app/open-export.ts:33` | `openFailedMessage(name: string, e: unknown): string` | nouveau module `platform/messages.ts`, même signature. `container-io` et `pdf-convert` sont importés par `open-export` ; `controller.ts` ne peut pas importer une feuille qui importerait son `messageOf`. Appelé par 8 sites (app ×5, platform ×3). Termes : `Ouverture impossible`, `openFailedMessage`, `fail(` |
| texte d'une erreur | `platform/controller.ts:86-88` | `messageOf(e: unknown): string` | réutiliser, déplacé dans `platform/messages.ts` et réexporté par `controller.ts` |
| lire les imports d'un fichier TS | paquet `typescript` (devDependency de `apps/web`) | `ts.preProcessFile(text, true, true).importedFiles` | réutiliser |

## 4. Hypothèses à revoir

Niveau 1 (critère de fin) :
- H1 — Les « 5 constats » du bilan d'Outillage n'ont pas été retrouvés sur la VM. Le cadrage retient l. 20, 29, 34, 47 et 49 (D1). Si le bilan en visait d'autres, par exemple l. 19 `ImageTarget` ou l. 43 `isEditable` de `annotation-page`, le critère de fin change.

Niveau 2 :
- H2 — La garde compte aussi les imports de type (D2). C'est la règle la plus simple à énoncer, mais elle oblige à déplacer `ImageTarget`, `StageRect` et `ZipFile`. Une garde limitée aux imports de valeur laisserait deux cycles de types : `board-reader ↔ zip-read`, et `image-import ↔ import-handler` (ou `↔ import`).
- H3 — Les noms déplacés restent réexportés par leur module d'origine (D10), pour ne toucher ni la CLI ni les tests. Retirer ces réexports serait un chantier de rangement à part.
- H4 — `ImageTarget` est déplacé sans être renommé. Le constat l. 19 et le candidat E de l'audit restent à faire.
- H5 — `SKIPPED_LABEL`, `BOARD_MAX_OBJECTS` et `BOARD_OBJECTS_MESSAGE` vivent dans `board-list.ts`, pour que le Worker n'importe que des feuilles.
- H6 — La garde n'interdit que `app/`. Les imports `platform → ui/item-state` (types), `toolbar.ts` et `profile-file.ts` restent permis, faute de règle de couche écrite à leur sujet.
- H7 — Les imports sont lus par `ts.preProcessFile`, avec une regex pour `new URL("…", import.meta.url)`, pas par une analyse complète. `preProcessFile` ne distingue pas les imports de type, ce qui suffit sous H2. Un relatif non résolu fait échouer la garde, sauf `../wasm-formats/` (dossier généré) ; un autre dossier généré ajouté plus tard devra être nommé dans la garde.

## 5. Décisions d'architecture

Aucune ouverte (gabarit `courte`). Les quatre modules neufs ont leur interface dans la liste « Modules à réutiliser ou à étendre » : `platform/editable.ts`, `platform/import-handler.ts`, `platform/board-list.ts`, `platform/messages.ts`.

## 6. Scénarios d'acceptation

- S1 — Garde : copier `import-graph.test.ts` dans un worktree détaché sur `34d4d61` et le lancer : rouge, avec les 3 imports `platform → app` et les 3 composantes du relevé. Sur la tête, `pnpm --filter @roomboard/web exec vitest run src/platform/import-graph.test.ts` est vert, et le cas `a → b → a` du détecteur est rouge comme attendu.
- S2 — CLI inchangée : construire la CLI sur `34d4d61` et sur la tête, puis `node scripts/essais/cli-comparer.mjs <base>/roomboard.mjs <tête>/roomboard.mjs` rend `COMPARAISON : OK`, et `node scripts/essais/cli-essai.mjs` rend `CLI : OK`.
- S3 — Page et coque inchangées : la suite web passe sans toucher aux tests existants. `git diff -M 34d4d61 -- '*.test.ts'` ne montre que les tests neufs et 4 lignes d'import : `olf-read.test.ts:2` et `:3` (déplacé, `board-io`/`board-files` → `board-list`), `zip-read.test.ts:7`, `zip-worker.test.ts:7` (`../app/olf-read` → `./olf-read`). Ouvrir un `.olf`, un `.ubz`, déposer un `.docx` dans la coque, copier-coller des objets : les tests `zip-worker`, `board-convert`, `import`, `clipboard` et `paste` restent verts.
- S4 — Worker ZIP : `pnpm --filter @roomboard/web build` passe. Le chunk `zip-worker-*.js` ne contient ni `document.` ni `window.` (le tree-shaking de `sniffImage`, `zip-worker.ts:28`, est ainsi contrôlé), et sa taille est égale ou plus petite qu'à la base. Les tailles Wasm restent 1 374 215 o et 2 794 511 o.
- S5 — Fin : `scripts/verifier.sh --e2e` passe. `constats.cjs fermer … --seulement <fichier> --nature <nature>` rend `fermés : 1` pour chacun des 5 constats de D1 (zones `apps/web/src/platform` ×3, `apps/cli/src`, `apps/web/src/app`). La fermeture de l. 47 porte la raison écrite en D8.

## 7. Hors périmètre

- Constats l. 19 (`ImageTarget`, candidat E de l'audit) et l. 43 (`isEditable` d'`annotation-page` contre `inEditable` d'`engine`) : règles différentes de celles de `platform/`.
- Le reste du candidat B de l'audit : `typed`, `slug`, `baseName` (`container-io.ts:14 → host-tauri`), la `Map` `blobs`.
- Le reste du candidat E : registre qui se décrit lui-même, gestionnaires sortis d'`import.ts`.
- Cycles de `app/` hors D9 (`fragments.ts ↔ workspace.ts`, de type).
- `controller.ts:159` et `workspace.ts:787` (« Ouverture impossible : … » sans nom) : un autre format que `openFailedMessage`.
- La dépendance du Worker ZIP à `image-import` (`zip-worker.ts:28`, `sniffImage`) : sans DOM par le seul tree-shaking ; contrôlée par S4, non déplacée.
- Imports `platform → ui/`, `toolbar.ts`, `profile-file.ts` (H6).
- Docs historiques qui citent `app/olf-read.ts` (`docs/plans/cli-cadrage.md:104`).
- Tout Rust, tout module Wasm.

## 8. Portes immédiates

Aucune.
