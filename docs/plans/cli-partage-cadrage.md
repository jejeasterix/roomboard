# Cadrage — cli-partage (OF12)

Cadrage autonome (aucune question à Jérôme, brief OF12). Tête lue : `origin/main` @ 7092fdd (après les lots 3 et 4 de la
CLI). Cadrage de la CLI : `docs/plans/cli-cadrage.md` (D1, DA1 à DA6), non refait ici. Graphe présent et frais
(`~/.cache/graphes/roomboard/graphify-out/graph.json`, 2026-11-24 07:08), complété par la recherche texte.

## 1. Demande et gabarit

La CLI n'a plus de copie de l'ouverture et de l'export d'un tableau : un module de `apps/web/src/app` ouvre et exporte un
tableau (lecture, écriture, messages), `workspace.ts` et la CLI l'appellent ; sorties JSON, codes et avis de la page
inchangés ; restes : `VITEST_MAX_WORKERS=3` par défaut dans `scripts/verifier.sh`, chargements à froid des tests de la
CLI déplacés en `beforeAll`.

**Gabarit : `courte`** (confirmé : un module neuf d'environ 60 lignes, une méthode ajoutée à `Tabs`, des délégations ;
aucun Rust, aucun format, aucune commande). Questions : 10/10.

**Prémisse démentie.** Les preuves du bilan (sur 352cbda) laissaient croire que la lecture et l'écriture des tableaux
étaient recopiées. Ce n'est plus vrai : le travail profond est déjà partagé depuis les lots 2 et 3 (`readBoardFile`,
`writeBoardFile` dans `app/board-convert.ts:28,82` ; `readPdfFile`, `writePdfFile` dans `app/pdf-convert.ts:49,101` ;
coffre `0283`, `cli-lot3-cadrage.md` D35, D36). Ce qui reste recopié, c'est la **couche autour** : le montage des
dépendances, les messages d'échec, la mise en forme des avis, le contrôle « onglets pleins », la garde des images non
lues ; la copie du document avant l'export n'est pas une recopie mais une divergence, gardée (carte R1 à R6 ci-dessous). Les lots 3 et 4 n'ont ajouté qu'une recopie de
cette couche, celle du PDF (R2) ; Office, médias, 3D et images n'en ont pas dans le périmètre (voir § 7).

### Carte des recopies (tête 7092fdd)

| # | CLI | Page | Ce qui diffère vraiment | Comment c'est résolu sans changer de comportement |
|---|---|---|---|---|
| R1 | `apps/cli/src/session.ts:162-175` (`readBoard`, `readBoardNoticed`) | `apps/web/src/app/workspace.ts:571-578` (`openBoard`) | dépendances : `decode` (`nodeDecode` ; page : `deps.decode ?? decodeImage`), `makeAssets` ; canal de l'échec : `CliError("format")` levée (CLI) ou `say` (page) ; moment de l'avis « ouvert avec N avertissements » : CLI avant l'ajout de l'onglet, page après `addTab` réussi ; nom d'onglet `boardTabName` (page seule) | `openBoardDocument` lève `Error` au message complet `Ouverture impossible (<nom>) : …` et **rend** `notices` et `tabName` sans les dire ; chaque appelant garde son canal et son moment (D3, D4). `decode` et `makeAssets` restent injectés. |
| R2 | `session.ts:177-187` (`readPdfNoticed`) | `workspace.ts:518-525` (`openPdf`) | canal (`CliError("format")` ou `say`) ; avis dits par la page **avant** `addTab` | `openPdfDocument` rend la même forme que R1 ; messages déjà composés par `readPdfFile`, rendus tels quels. |
| R3 | `apps/cli/src/exporter.ts:54`, `:74` (`missingOf` → `UNREAD_ASSETS_MESSAGE`) | `workspace.ts:534-537`, `:589-592` | aucune règle ; la page contrôle « occupé » (`BUSY_MESSAGE`) d'abord, puis la garde, puis pose `exporting` | `exportBlocked(doc, assets)` rend le message ou null ; la page l'appelle au même endroit, avant `exporting = true` (D6). |
| R4 | `exporter.ts:56-61` (`writeBoardFile` sur `tab.doc`) | `workspace.ts:594-611` (copie `saveParts`/`loadParts`, `writeBoardFile`, `free`) | la page copie le document avant d'écrire (DAPF3) ; la CLI écrit l'original. La copie n'est pas neutre : `saveParts` fixe `created` sur le document d'origine s'il n'est pas encore fixé (`crates/roomboard-wasm/src/lib.rs:1463-1480`, `mark_saved`) | `exportBoardDocument(doc, assets, format, deps)` ; la copie est une dépendance **optionnelle** `deps.copy` : la page la donne, la CLI non. Chacun garde exactement son comportement (D7) ; un test fige `created` côté CLI. |
| R5 | `session.ts:223`, `:234`, `:258` ; `apps/cli/src/importer.ts:126` | `workspace.ts:315` (`full`) | aucune (`tabs.list().length >= MAX_TABS`) ; messages différents selon le site, gardés | `Tabs.full()` ajouté à `app/tabs.ts` (D5). |
| R6 | `session.ts:171`, `:235`, `:249`, `:259` (`Ouverture impossible (<nom>) : …`) ; `exporter.ts:86`, `:88` (`Export impossible : …`) | `workspace.ts:557`, `:577`, `:606`, `:777`, `:861` | aucune dans la forme ; trois divergences visibles **gardées** (D8, H1) | `openFailedMessage(name, e)`, `exportFailedMessage(e)` du module. |

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D1 | Ce qui est partagé | La couche « ouvrir / exporter » au-dessus de `board-convert.ts` et `pdf-convert.ts` (R1 à R6) ; ces deux modules ne changent pas. | `board-convert.ts:1` ; `pdf-convert.ts:1-6` ; coffre `0281` (« aucune logique recopiée »), `0283` ; `cli-lot3-cadrage.md` D35, D36 | oui |
| D2 | Module partagé | **`apps/web/src/app/open-export.ts`** (nom : H2), interface exacte au § 3, « Modules à réutiliser ou à étendre ». | brief OF12 (« un module de `apps/web/src/app` ») | oui |
| D3 | Forme de l'injection | **Lecture et écriture** : par les ports déjà injectés (`BoardReadDeps` `board-convert.ts:18`, `PdfReadDeps` `pdf-convert.ts:29`, `BoardPorts` ; `decode`, `makeAssets`, `now` fournis par l'appelant). **Messages** : rendus comme des données, pas par un canal injecté : échec = `Error` au message complet du produit ; avis = `notices: readonly string[]`. La page les dit (`say`) ; la CLI les lève (`CliError`, `readDoc`) ou les range (`notices`, importeur). Un `say` injecté ne servirait pas la CLI, qui a besoin des deux canaux selon l'appel (`session.ts:171` lève, `:242` range). | patron de `readPdfFile` (« rejette avec le message complet du produit », `pdf-convert.ts:43-48`) ; `session.ts:171,242` | oui |
| D4 | Ordre des avis | Inchangé partout : tableau de la page après `addTab` (`workspace.ts:573-574`) ; PDF de la page avant (`:524`) ; CLI avant l'ajout de l'onglet (`session.ts:173,186`). Le module ne dit rien ; il rend. | code lu | oui |
| D5 | Onglets pleins | `Tabs.full(): boolean` dans `app/tabs.ts` (`entries.length >= MAX_TABS`, même règle que `add`, `tabs.ts:44`) ; appelé par `workspace.ts:315` et les quatre sites de la CLI. Messages des sites inchangés : page `TOO_MANY_TABS` ; CLI `open` : `CliError("command", TOO_MANY_TABS)` ; CLI importeur : `Ouverture impossible (<nom>) : 12 onglets au plus ; fermez-en un`. | `tabs.ts:18-44` ; `session.test.ts:43` ; `workspace.test.ts:389,1126` | oui |
| D6 | Garde des images non lues | `exportBlocked(doc, assets): string \| null` ; page : après le contrôle `exporting`, avant `exporting = true`, comme aujourd'hui (pendant l'avis, un second export n'est pas « occupé ») ; CLI : `CliError("command", blocked)`. `saveBlocked` (`workspace.ts:401`) reste tel quel (règle d'enregistrement, avec `slot.unread`). | `workspace.ts:529-538,584-593` ; `convert.test.ts:79-84` ; `pdf.test.ts:235-240` | oui |
| D7 | Copie avant l'export d'un tableau | **Page seulement.** `exportBoardDocument` prend `deps.copy?: { core; now() }` : donnée (page), il fait `saveParts(copy.now(), APP_VERSION)`, `loadParts`, `writeBoardFile` sur la copie, `free` dans `finally` ; absente (CLI), il écrit `doc` tel quel, comme `exporter.ts:58` aujourd'hui. Raison : `saveParts` sur le document d'origine fixe son `created` quand il est vide (`lib.rs:1463-1480`) ; une copie dans la CLI changerait `created` d'un document neuf exporté puis enregistré (`run --new`, `export x.iwb` à T1, `save` à T2 : aujourd'hui `created` = T2, avec copie T1). Test de caractérisation (T1) : session de la CLI dont `now` rend une date neuve à chaque appel, objet posé, `exportBoardFile` vers `.iwb`, puis `save` : dans `manifest.json` du `.roomboard` écrit, `created === modified`. La copie de la page est libérée avant `files.save` au lieu d'après, sans effet visible. Aligner la CLI sur la page : H6. | `lib.rs:1463-1480` ; DAPF3 (coffre `0255`) ; `workspace.ts:594-611` ; `exporter.ts:56-61` ; contre-relecture, tour 1 | oui |
| D8 | Divergences visibles page ↔ CLI | **Gardées telles quelles** : (a) échec d'écriture d'un `.iwb`/`.ubz` : CLI sans préfixe (`asCliError`, `exporter.ts:60`), page `Export impossible : …` ; (b) avertissements d'écriture : CLI bruts dans `notices` (`exporter.ts:63`), page `boardSavedMessage` (`workspace.ts:603`) ; (c) onglets pleins à l'import : nommés dans la CLI. Les aligner changerait stderr ou `notices` : hors chantier (H1). | brief (« mêmes sorties JSON, mêmes codes ») | oui |
| D9 | Node, DOM, Wasm | `open-export.ts` n'importe que des modules **déjà** dans le fichier construit de la CLI (`board-convert`, `pdf-convert`, `board-files`, `container-io`, `platform/controller`, types du cœur) : aucune nouvelle évaluation au chargement, aucun accès au DOM. `decodeImage` (`createImageBitmap`) reste dans `workspace.ts`. La CLI importe la page par chemins relatifs `../../web/src/…`, mis en un seul fichier par vite (`ssr.noExternal`). Aucun Rust touché : modules Wasm et plafonds inchangés. **`apps/web/src/platform/` n'est pas modifié** : l'extraction ne l'exige pas. | `apps/cli/vite.config.ts:1-4,30-37` ; imports de `session.ts:14-27`, `exporter.ts:7-15` | oui |
| D10 | `VITEST_MAX_WORKERS` | `scripts/verifier.sh:54` devient `ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}" pnpm -r test` : 3 sauf valeur donnée ; `:-` traite aussi la chaîne vide (piège « chaîne vide lue comme zéro »). vitest 4.1.12 lit la variable (`resolved.maxWorkers = Number.parseInt(process.env.VITEST_MAX_WORKERS)`, `vitest/dist/chunks/coverage.DM_a_rWm.js:380`). Aucun délai de test relevé. | brief OF12, reste 1 ; coffre `04_Pieges/chaine-vide-lue-comme-zero-par-number`, `04_Pieges/faux-rouge-par-contention-vitest` | oui |
| D11 | Chargements à froid des tests de la CLI | Aide `warmModules()` ajoutée à `apps/cli/src/testing.ts` (cœur et formats chargés par `nodeSession(memoryIO())` puis `deps.formats()`, patron de `pdf.test.ts:20-27` et `model3d.test.ts:25-30`) ; un `beforeAll(warmModules)` dans le **premier bloc `describeWasm` qui exécute au moins un test sans condition** de chaque fichier de la liste ci-dessous (Vitest ne lance pas le `beforeAll` d'un bloc entièrement sauté ; jamais au niveau du fichier, qui tournerait aussi sans Wasm). Chargeur 3D : `await import("../../web/src/platform/model-view-three")` (patron `model3d.test.ts:28`). Assertions et délais des tests inchangés. Raison : la colle wasm-bindgen est gardée par fichier de test (`import()`), `initSync` ne recompile pas une seconde fois ; le premier test de chaque fichier paie seul la compilation (1,3 Mo + 2,8 Mo) dans ses 5 s. Le `beforeAll` a son propre délai, 10 s par défaut (`hookTimeout`, vitest 4) : non relevé (H7). | brief OF12, reste 2 ; `wasm-node.ts:39-61` ; `pdf.test.ts:21-22` (« sous charge, S1 dépassait 5000 ms ») ; référence `verifier.sh --e2e` sur 7092fdd (fichier d'état), contre-relecture tour 1 | oui |
| D12 | Essai `cli-essai.mjs` (D15 du profil) | Étendu des contrôles E1 à E5 (S2), sur fichiers fabriqués dans l'essai (fabriques existantes, chaîne XML littérale pour le tableau abîmé) ; aucun fichier téléchargé. Les contrôles actuels restent. | profil § CLI (D15) ; `cli-essai.mjs:202-221,266-319` ; `workspace.test.ts:1602-1606` | oui |
| D13 | Ordre du travail | Caractérisation d'abord, sur le code de la base : tests CLI qui figent les messages et octets actuels, extension de l'essai ; puis le module ; puis les délégations. Une caractérisation qui passe avant et après est la preuve du « comportement inchangé ». | brief (« sans changement de comportement ») | oui |

**Tests chargés à froid (D11), liste exacte.** Premier test qui charge le cœur et le module formats dans son propre délai
de 5 s, sans `beforeAll` : `boards.test.ts:21` · `contract.test.ts:94` · `convert.test.ts:34` (première itération) ·
`export.test.ts:8` · `guards.test.ts:15` · `images.test.ts:18` · `import.test.ts:19` · `library.test.ts:36` ·
`main.test.ts:64` · `media.test.ts:23` · `rbitem.test.ts:32` · `session.test.ts:14` · `pdf-node.test.ts:139` ·
`office.test.ts:125` : le `beforeAll` va dans le bloc S2 (`describeWasm`, `:124`, tests `it` sans condition), pas dans
le bloc S1 (`:51`), dont tous les tests sont des `itReal` sautés sans LibreOffice (`office.test.ts:15-16`).

**Les cinq dépassements de la référence (`verifier.sh --e2e` sur 7092fdd, charge 21 à 25)**, un par un :

| test | chargement à froid | décision |
|---|---|---|
| `import.test.ts:19` « S3 — import image.png valeurs.xlsx --at 400,300 » | cœur et formats (premier test du fichier) | `beforeAll(warmModules)` dans le bloc `:18` ; le test vérifie l'insertion, pas le chargement |
| `model3d-node.test.ts:38` « S4 — GLB sans et avec texture… » | chargeur 3D (three, import dynamique de `model-view-three` par `nodeModel3d().view()`) ; aucun Wasm | `beforeAll` avec `await import("../../web/src/platform/model-view-three")` dans le bloc `describe("nodeModel3d…")` (`:37`) ; l'import ne pose aucun global (`model3d.test.ts:28` le fait déjà avant `:94`, qui vérifie que `self`, `ProgressEvent`, `document` sont absents) |
| `model3d-node.test.ts:49` « S4 — glTF sans son .bin » | aucun à lui : il attend le même import que `:38`, encore en cours quand `:38` dépasse ses 5 s | couvert par le même `beforeAll` ; rien d'autre à déplacer |
| `model3d.test.ts:101` « D76 — session run : import 3D puis tab.open d'un PDF » | pdf-lib (`pdfFixture`) et pdf.js (`tab.open`) ; cœur, formats et three déjà en `beforeAll` (`:27-30`) | pdf-lib : ajouté au `beforeAll` existant (`await loadPdfLib()`) ; si pdf-lib posait `self`, `:94` le verrait. **pdf.js laissé dans le test** : son chargement est le sujet (pdf.js pose `globalThis.self` en se chargeant, `:107` ; le charger avant ferait échouer `:94` et ne prouverait plus que pdf.js se charge après un import 3D) |
| `pdf-node.test.ts:24` « loadNodePdfjs — worker posé sur globalThis.pdfjsWorker… » | pdf.js | **laissé** : le chargement est ce que le test vérifie (worker posé par `loadNodePdfjs` avant tout document) |

**Laissés tels quels** : `wasm-node.test.ts:20,24,29` et `pdf-node.test.ts:24` (le chargement est le sujet) ;
`model3d.test.ts:101` pour pdf.js (même raison) ; `pdf.test.ts` (déjà en `beforeAll`) ; `office.test.ts:39` et suivants
(délai propre de 180 s) ; `images.test.ts:68` (pdf-lib à froid ; cœur déjà chaud ; aucun dépassement relevé).

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites du graphe et de la recherche. Gabarit `courte` :
endroits touchés seulement.

### 3.1 Page (`apps/web/src/app`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/open-export.ts` (neuf) | oui | module partagé, interface ci-dessous | — |
| `apps/web/src/app/tabs.ts:18-44` | oui | `Tabs.full()` (D5) | V |
| `apps/web/src/app/workspace.ts:315` | oui | `full` → `tabs.full()` | V |
| `apps/web/src/app/workspace.ts:509-526` | oui | `openPdf` délègue à `openPdfDocument` | V |
| `apps/web/src/app/workspace.ts:527-562` | oui | `exportPdf` : `exportBlocked`, `exportFailedMessage` ; `writePdfFile` inchangé | V |
| `apps/web/src/app/workspace.ts:563-580` | oui | `openBoard` délègue à `openBoardDocument` ; avis dits après `addTab` | V |
| `apps/web/src/app/workspace.ts:581-612` | oui | `exportBoard` délègue à `exportBoardDocument` ; `boardSavedMessage`, `files.save` restent | V |
| `apps/web/src/app/workspace.ts:777`, `:861` | oui | `exportFailedMessage`, `openFailedMessage` (même chaîne) | V |

### 3.2 CLI (`apps/cli/src`) : sorties JSON et codes

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/session.ts:162-187` | oui | `readBoardNoticed`, `readPdfNoticed` réduits à un appel du module + canal CLI | V |
| `apps/cli/src/session.ts:222-261` | oui | `tabs.full()`, `openFailedMessage` ; messages inchangés | V |
| `apps/cli/src/exporter.ts:51-93` | oui | `exportBlocked`, `exportBoardDocument`, `exportFailedMessage` ; `rasterMissing` et `nodeOverlay` restent | V |
| `apps/cli/src/importer.ts:126` | oui | `full: () => session.tabs.full()` | V |
| `apps/cli/src/testing.ts` | oui | `warmModules()` (D11) | V |

### 3.3 Persistance (octets écrits)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.iwb`, `.ubz` écrits par la CLI (`export`, `convert`, op `export`) | non | toujours écrits depuis `tab.doc`, sans copie (D7) ; octets identiques exigés (S1) | V |
| `created` du manifeste d'un document neuf exporté puis enregistré par la CLI | non | aucun `saveParts` avant l'export dans la CLI (D7) ; figé par le test de caractérisation de `convert.test.ts` | V |
| `.pdf`, `.roomboard` | non | `writePdfFile` et `io.encode` inchangés | V |

### 3.4 Scripts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:54` | oui | `VITEST_MAX_WORKERS` (D10) | V |
| `scripts/essais/cli-essai.mjs` | oui | E1 à E5 (D12) | V |

### 3.5 Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/open-export.test.ts` (neuf) | oui | messages ; avis ; `tabName` et message pris tels quels de `file.name` (nom de base donné par l'appelant, aucun chemin retiré par le module) ; garde ; `exportBoardDocument` : avec `copy`, copie libérée et `created` du document d'origine fixé à la date de `copy.now()` (comportement de la page) ; sans `copy`, aucun `saveParts` sur le document d'origine (`created` encore libre : un `saveParts` ultérieur à T2 rend `created` = T2) ; octets égaux avec et sans copie | — |
| `apps/web/src/app/tabs.test.ts` | oui | `full()` faux à 11, vrai à 12 | V |
| `apps/web/src/app/workspace.test.ts:380-389,1109-1126,1171-1175,1602-1674,1859` | non | à garder verts **sans modification** (messages et ordre de la page) | V |
| `apps/web/src/app/board-convert.test.ts`, `pdf-convert.test.ts` | non | à garder verts | V |
| `apps/cli/src/boards.test.ts` | oui | caractérisation : `state abime.iwb` code 1 et message exact ; import d'un tableau abîmé : partiel, avis ; 12 onglets puis import : avis nommé ; + `beforeAll` | V |
| `apps/cli/src/convert.test.ts` | oui | caractérisation (T1) : session dont `now` rend une date neuve à chaque appel, objet posé, `exportBoardFile` vers `x.iwb`, `save` vers `a.roomboard` : dans `manifest.json` de `a.roomboard` (`unzipSync` de fflate), `created === modified` (D7) ; + `beforeAll` | V |
| `apps/cli/src/convert.test.ts:79-84`, `pdf.test.ts:84-98,235-240`, `session.test.ts:40-43` | non | figent déjà messages et codes : à garder verts | V |
| les 14 fichiers de la liste de D11, `model3d-node.test.ts` (`beforeAll` du chargeur 3D), `model3d.test.ts` (`loadPdfLib` ajouté au `beforeAll` existant) | oui | `beforeAll` seulement | V |

### 3.6 Autres dépôts

Aucun.

### Effets de bord sur l'existant

- Aucun pour l'export d'un tableau par la CLI : pas de copie (D7) ; le test `created === modified` de `convert.test.ts`
  et S1 le prouvent.
- La page libère sa copie avant `files.save` (D7) : `workspace.test.ts:1661,1674` (export réussi) restent verts.
- `openBoard` de la page n'enveloppe plus `addTab` dans son `try` (`addTab` ne lève jamais : il dit ses refus,
  `workspace.ts:365-437`) : `workspace.test.ts:1602-1653` restent verts.
- `Tabs` gagne une méthode : aucun faux de `Tabs` dans le dépôt (recherche `Tabs<` sans `createTabs`) ; `tsc` de la
  page et de la CLI le vérifie.
- `verifier.sh` borne vitest à 3 workers par processus (`pnpm -r` peut lancer la page et la CLI ensemble : 6 au plus) :
  suite plus lente sur une machine à beaucoup de cœurs ; une valeur donnée l'emporte (S5).
- Les tests de D11 démarrent plus tôt leur chargement : ce qu'ils vérifient ne change pas (diff limité au `beforeAll` et
  à l'import de `warmModules`).

### Chantiers en cours

Aucun : `git worktree list` montre `~/projets/roomboard` (main), `~/.cache/tmp/ctl-main-lQwf` (détaché sur 7092fdd,
contrôle) et ce worktree ; `gh pr list --state open` est vide. Aucun worktree d'une autre machine donné.

### Termes cherchés

- Graphe : `graphify query "qui appelle readBoardFile writeBoardFile readPdfFile writePdfFile"` ; `graphify affected
  "readBoardFile()"`, `"writeBoardFile()"`, `"boardWarningsMessage"`, `"missingOf()"`.
- Texte (`grep -n`) : `Ouverture impossible`, `Export impossible`, `MAX_TABS`, `TOO_MANY_TABS`, `UNREAD_ASSETS_MESSAGE`,
  `boardWarningsMessage`, `boardSavedMessage`, `saveParts`, `loadParts(`, `readBoardFile(`, `writeBoardFile(`,
  `readPdfFile(`, `writePdfFile(`, `BUSY_MESSAGE` dans `apps/web/src` et `apps/cli/src` ; `Tabs<` (faux) ;
  `SheetReader.open`, `gridOf(` (classeur) ; `convertOffice`, `convertFailureMessage`, `OfficeConvertError` (Office) ;
  `MEDIA_MIME` (médias) ; `beforeAll`, `nodeSession`, `loadCore`, `loadFormats`, `loadNodePdfjs`, `nodePdfEngine`,
  `SLOW`, `timeout` dans `apps/cli/src/*.test.ts` ; `VITEST_MAX_WORKERS` dans `node_modules/.pnpm/vitest@4.1.12*`.
- Coffre : `chercher.js "roomboard cli recopie ouverture export tableau" 8`, `"vitest timeout VITEST_MAX_WORKERS wasm
  beforeAll" 6`, `"roomboard workspace.ts extraction module partagé page CLI" 6` ; décisions `0281`, `0283`, `0284`,
  `0286` lues.
- Constats : `docs/architecture-constats.md` lu ; zone `apps/web/src/app` : `workspace.ts:151` (`typed`) et `:552`
  (`BoardSources`, code parti dans `board-convert.ts`) ouverts, ni corrigés ni aggravés ; aucune ligne « Constats à
  fermer » dans la demande.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| lire un tableau en document | `apps/web/src/app/board-convert.ts:28` | `readBoardFile(file: BoardFile, deps: BoardReadDeps)` | réutiliser |
| écrire un `.iwb`/`.ubz` | `apps/web/src/app/board-convert.ts:82` | `writeBoardFile(doc, assets, format, ports)` | réutiliser |
| lire un PDF (original Office gardé) | `apps/web/src/app/pdf-convert.ts:49` | `readPdfFile(file: PdfSource, deps: PdfReadDeps)` | réutiliser |
| écrire un PDF | `apps/web/src/app/pdf-convert.ts:101` | `writePdfFile(doc, assets, deps)` (appelants inchangés hors garde et message) | réutiliser |
| avis d'ouverture, nom d'onglet | `apps/web/src/app/board-files.ts:117,121` | `boardWarningsMessage`, `boardTabName` | réutiliser |
| images non lues | `apps/web/src/app/container-io.ts:82` | `missingOf(doc, assets)` | réutiliser (dans `exportBlocked`) |
| texte d'une erreur | `apps/web/src/platform/controller.ts:87` | `messageOf(e)` | réutiliser |
| onglets pleins | `apps/web/src/app/tabs.ts:18` (`Tabs`), `:31` (`createTabs`) | ajouter `full(): boolean` (`entries.length >= MAX_TABS`) | étendre |
| réchauffer le cœur et les formats dans les tests | `apps/cli/src/testing.ts:47` (`memoryIO`) ; patron `pdf.test.ts:23-27` | ajouter `export async function warmModules(): Promise<void>` (`await (await nodeSession(memoryIO())).deps.formats()`) | étendre |
| tableau abîmé et fichiers de l'essai | `scripts/essais/fabriques/tableaux.mjs:8,28,34` ; `fabriques/pdf.mjs` | `iwbZip`, `iwbRaw3`, `ubzZip` ; abîmé : `Buffer.from("<iwb")` (XML mal formé, `workspace.test.ts:1602`) | réutiliser |
| composer les messages d'échec, rendre les avis, copier avant l'export d'un tableau, garde des images | aucun : termes `Ouverture impossible`, `Export impossible`, `saveParts`, `loadParts(`, `boardWarningsMessage` ne trouvent que les recopies R1 à R6 et la copie interne de `writePdfFile` (`pdf-convert.ts:111`, non appelable seule) | **nouveau module** `apps/web/src/app/open-export.ts`, interface ci-dessous | nouveau module |

Interface exacte de `apps/web/src/app/open-export.ts` (imports : `board-convert`, `board-io` (types), `board-files`,
`container-io`, `pdf-convert`, `../platform/controller`, `../core/api` (types), `../core/asset-store` (type)) :

```ts
/** Document ouvert, sans onglet. `notices` : avis d'ouverture dans l'ordre du produit, que l'appelant dit ou range. */
export interface OpenedDocument {
  readonly doc: CoreDocument;
  readonly assets: AssetStore;
  /** `<racine>.roomboard` : nom de l'onglet de la page ; la CLI l'ignore (onglet sans fichier). */
  readonly tabName: string;
  readonly notices: readonly string[];
}
export interface BoardExportDeps {
  readonly ports: Pick<BoardPorts, "write" | "zip">;
  /** Copie prise avant l'écriture (DAPF3) : donnée par la page ; absente dans la CLI, qui écrit `doc` tel quel (D7 :
   *  `saveParts` fixerait `created` sur le document d'origine). */
  readonly copy?: { readonly core: CoreFactory; now(): string };
}
/** « Ouverture impossible (<nom>) : <message> » ; `name` est le nom affiché, jamais un chemin. */
export const openFailedMessage = (name: string, e: unknown): string => `Ouverture impossible (${name}) : ${messageOf(e)}`;
/** « Export impossible : <message> ». */
export const exportFailedMessage = (e: unknown): string => `Export impossible : ${messageOf(e)}`;
/** `file.name` est le **nom de base** donné par l'appelant (page : `baseName(file.name)`, `workspace.ts:564` ; CLI :
 *  `basename(path)`), comme `PdfSource.name` (`pdf-convert.ts:23-24`) ; le module ne retire aucun chemin.
 *  `readBoardFile` ; rejette `new Error(openFailedMessage(file.name, e))` ; notices : `[boardWarningsMessage(file.name, w)]`
 *  si avertissements, sinon `[]` ; tabName : `boardTabName(file.name, file.format)`. */
export async function openBoardDocument(file: BoardFile, deps: BoardReadDeps): Promise<OpenedDocument>;
/** `readPdfFile` ; rejette avec son message complet, tel quel ; notices : `warnings` ; tabName : `tabName`. */
export async function openPdfDocument(file: PdfSource, deps: PdfReadDeps): Promise<OpenedDocument>;
/** `UNREAD_ASSETS_MESSAGE` si une image du document manque au magasin (`missingOf`), sinon null. */
export function exportBlocked(doc: CoreDocument, assets: AssetStore): string | null;
/** Avec `deps.copy` : copie (`saveParts(copy.now(), APP_VERSION)`, `copy.core.loadParts`, DAPF3), `writeBoardFile` sur
 *  la copie, copie libérée dans `finally`. Sans : `writeBoardFile(doc, …)`. Rejette tel quel (l'appelant met son
 *  préfixe : page `exportFailedMessage`, CLI aucun, D8). */
export async function exportBoardDocument(doc: CoreDocument, assets: AssetStore, format: BoardFormat, deps: BoardExportDeps): Promise<{ bytes: Uint8Array; warnings: string[] }>;
```

## 4. Hypothèses à revoir

**Niveau 1 (visibles des utilisateurs si on y touche)**

- H1 — Les trois divergences page ↔ CLI de D8 sont gardées. Les aligner sur la page (`Export impossible : …` devant un
  échec d'écriture de tableau dans la CLI ; `boardSavedMessage` dans `notices`) changerait stderr et `notices` de la
  CLI : à décider par Jérôme, dans un autre chantier.

**Niveau 2**

- H2 — Nom du module : `open-export.ts` (choix ; aucun nom imposé par une source).
- H3 — (retirée au tour 1 de la contre-relecture : la CLI ne copie plus, D7.)
- H4 — 3 workers par processus vitest (valeur du brief) ; `pnpm -r` peut en lancer 6 au total.
- H5 — Le remède du reste 2 est le `beforeAll` (brief) ; le coût à froid n'a pas été mesuré ici (Wasm non construit
  dans ce worktree) : la liste vient de la lecture des tests et des cinq dépassements de la référence.
- H6 — Copie avant l'export d'un tableau : la page la fait, la CLI non (D7). Aligner la CLI sur la page (copie, donc
  `created` fixé à la date de l'export d'un document neuf) serait un changement visible du manifeste : à décider par
  Jérôme, pas fait ici.
- H7 — Les `beforeAll` gardent le délai par défaut des crochets (10 s, `hookTimeout` de vitest 4) ; sur une VM très
  chargée, un `beforeAll` pourrait le dépasser : à revoir si la référence le montre (aucun délai relevé, consigne).

## 5. Décisions d'architecture

Aucune (gabarit `courte`) : le module neuf et son interface sont au § 3, « Modules à réutiliser ou à étendre » ; le
choix des messages rendus comme données est la décision D3.

## 6. Scénarios d'acceptation

Préalable : Wasm et CLI construits comme le profil (§ CLI) ; `export ROOMBOARD_NOW=1795392000000`.

- **S1 — Mêmes sorties qu'avant.** Construire la CLI de la base dans un worktree jetable
  (`git worktree add /tmp/rb-base 7092fdd`, `pnpm install --frozen-lockfile`, copier `apps/web/src/wasm*`,
  `pnpm --filter @roomboard/cli build`) : binaires B (base) et N (branche). Fichiers d'entrée fabriqués une fois (mêmes
  fabriques que l'essai : `lecon.iwb`, `three.pdf`, `abime.iwb` = `<iwb`, `bad.pdf` = `%PDF-1.4\n%%EOF\n`), puis
  `l.roomboard` et `t.roomboard` produits **une seule fois** par B (`convert lecon.iwb l.roomboard`, `convert three.pdf
  t.roomboard`) et copiés dans deux dossiers neufs `dB/` et `dN/`. Les ids du cœur sont des `uuid_v4` aléatoires
  (`crates/roomboard-core/src/document.rs:80`) : deux `.roomboard` produits séparément ne sont jamais égaux en octets.
  1. **Sorties JSON et codes.** Dans chaque dossier, avec son binaire : `state lecon.iwb` ; `state three.pdf` ;
     `state l.roomboard` ; `state abime.iwb` ; `state bad.pdf` ; `import a.roomboard lecon.iwb three.pdf abime.iwb`
     (`a.roomboard` = `new`) ; `run --new --ops -` avec 11 `tab.new` puis `{"op":"import","files":["lecon.iwb"]}`.
     Codes égaux ; chaque ligne de stdout et de stderr comparée après la normalisation de `normalise`
     (`scripts/essais/cli-essai.mjs:57-71`) : toute chaîne UUID remplacée par son rang d'apparition (`#0`, `#1`…), la
     valeur de toute clé `file` remplacée par `<fichier>` ; les empreintes d'assets (SHA-256) restent.
  2. **Fichiers exportés.** Depuis le même `l.roomboard` et le même `t.roomboard` copiés : `export l.roomboard l.iwb` ;
     `export l.roomboard l.ubz` ; `export t.roomboard t.pdf` ; `convert t.roomboard t.iwb`. Comparaison par
     `sha256sum`. Vérifié dans le code : un `.iwb`/`.ubz` ne reprend pas les ids du cœur (ids `o1`, `o2`… numérotés à
     l'écriture, `crates/roomboard-formats/src/board/write.rs:208-210`), son ZIP a une date fixe et des entrées triées
     (`zip-worker.ts:81-88`, `board-io.ts:697`) ; le PDF n'a pas de date : pdf-lib en `updateMetadata: false`
     (`app/pdf-export.ts:150,204,258`), `ROOMBOARD_NOW` ne sert qu'à la copie interne de `writePdfFile`. Non vérifié :
     ce que krilla écrit dans la superposition (dépendance). D'où un **contrôle préalable** : chaque binaire exporte
     deux fois chaque fichier ; si B diffère de lui-même pour un format, ce format est comparé, entre B et N, par
     `readPdfBack` (`apps/cli/src/testing.ts:206` : nombre de pages, texte par page, sous-types des XObject) pour le PDF,
     ou par `state` normalisé après `convert` en `.roomboard` pour `.iwb`/`.ubz`, et l'écart de B est écrit au rapport.
  3. **`created`.** `run --new --out c.roomboard --ops -` avec une forme, `{"op":"export","to":"c.iwb"}` puis `save`,
     sans `ROOMBOARD_NOW` : dans `manifest.json` de `c.roomboard`, `created === modified` avec B comme avec N.
- **S2 — L'essai prouve chaque format touché.** `node scripts/essais/cli-essai.mjs` affiche `CLI : OK`, avec les
  contrôles neufs : E1 `state abime.iwb` → code 1, message `Ouverture impossible (abime.iwb) : fichier endommagé : …` ;
  E2 `import a.roomboard lecon.iwb three.pdf` → code 0, `opened` = les deux, avis `lecon.iwb : ouvert avec …` ; E3
  `import a.roomboard abime.iwb` → code 1 `import partiel`, avis `Ouverture impossible (abime.iwb)` ; E4 12 onglets puis
  import d'un `.iwb` → avis `Ouverture impossible (lecon.iwb) : 12 onglets au plus ; fermez-en un` ; E5 `state bad.pdf`
  → code 1, `Ouverture impossible (bad.pdf) : …`.
- **S3 — La page ne change pas.** `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test` vert, dont
  `open-export.test.ts` et `tabs.test.ts` ; `git diff origin/main -- apps/web/src/app/workspace.test.ts
  apps/web/src/app/board-convert.test.ts apps/web/src/app/pdf-convert.test.ts` vide.
- **S4 — Plus de recopie dans la CLI.** La commande ci-dessous ne rend rien. Les chaînes ne sont cherchées qu'en
  littéral de code (ouvertes par un guillemet ou un accent grave) : les commentaires qui les citent entre « », comme
  `session.ts:165` et `:242`, ne comptent pas. Sur la base, elle rend 16 lignes (`exporter.ts:54,74,86,88`,
  `session.ts:16,163,171,173,181,223,234,235,249,258,259`, `importer.ts:126`).

  ```bash
  grep -nE 'readBoardFile\(|readPdfFile\(|[`"](Ouverture|Export) impossible|length >= MAX_TABS|missingOf\(|boardWarningsMessage' apps/cli/src/*.ts | grep -v '\.test\.ts'
  ```

  Et `grep -ln "open-export" apps/cli/src/session.ts apps/cli/src/exporter.ts apps/web/src/app/workspace.ts` rend les
  trois fichiers.
- **S5 — Suite complète, workers bornés, Wasm inchangé.** `grep -n 'VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}"'
  scripts/verifier.sh` rend la ligne 54 ; `bash scripts/verifier.sh --e2e` vert ; tailles imprimées égales à la
  référence remesurée sur `origin/main` (fichier d'état) et sous 1 572 864 et 3 145 728 octets ;
  `VITEST_MAX_WORKERS=1 ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/cli test` vert (valeur donnée respectée).

**Estimation : 5 tâches.** T1 caractérisation (tests CLI de `boards.test.ts`, test `created` de `convert.test.ts`, E1 à E5 de l'essai) sur le code de la
base ; T2 `open-export.ts` + test, `Tabs.full()` + test ; T3 `workspace.ts` délègue (après T2) ; T4 la CLI délègue
(`session.ts`, `exporter.ts`, `importer.ts`, après T2, parallèle à T3) ; T5 `verifier.sh` et les `beforeAll` des
16 fichiers de D11 (indépendante).

## 7. Hors périmètre

- `apps/web/src/platform/` (OF13) : aucune modification nécessaire.
- Office de la CLI hors importeur : `session.ts:192-207` refait une partie de `officeHandler`
  (`platform/office-import.ts:129-141` : code tiré d'`OfficeConvertError`, `convertFailureMessage`, ouverture du PDF
  avec l'original). Duplication **non nette** : règles différentes (code 3 sur `no-program` dans la CLI, repli sur le
  classeur dans la page), et la corriger toucherait `platform/`. À consigner en constat à la clôture.
- Classeur : `importer.ts:93-100` (`readSheet`) refait le corps de `platform/sheet-worker.ts:15-19` (ouvrir, `gridOf`,
  `free`) sans `workerErrorMessage` : une panique y donne « unreachable » au lieu de « lecture du classeur
  interrompue ». Non nette (messages différents, lot 1, pas une ouverture de tableau) : à consigner en constat.
- Médias, 3D, images (lot 4) : aucune recopie trouvée (`nodeMedia`, `nodeModel3d`, `nodeDecode`, `headerBlocked`
  appellent les modules purs de la page ; `formatOfMime` est l'inverse de `MEDIA_MIME`, sans équivalent dans la page).
- Alignement des messages CLI sur ceux de la page (H1).
- `workspace.ts:787` (`Ouverture impossible : …` sans nom, boîte d'ouverture) et `saveBlocked` (`:401`) : autres règles.
- `pdf-convert.ts:43` (`failed`) compose la même chaîne que `openFailedMessage` dans la page : l'appeler depuis
  `pdf-convert.ts` créerait un cycle d'import avec `open-export.ts` ; laissé (copie interne à la page, pas à la CLI).
- Troisième copie `saveParts`/`loadParts` de `sendCapture` (`workspace.ts:697-698`) : autre usage (onglet neuf).
- Constats ouverts de la zone (`workspace.ts:151`, `:552`) : ni corrigés ni aggravés.

## 8. Portes immédiates

Aucune.
