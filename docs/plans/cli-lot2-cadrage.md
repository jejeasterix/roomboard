# Cadrage — cli-lot2

Cadrage autonome (étage 1, cadreur), 2026-11-24, mode autonome (brief OF5 : aucune question à Jérôme). **Ce cadrage
complète `docs/plans/cli-cadrage.md` sans le refaire** : D1 à D16, H1 à H10, DA1 à DA6 et la référence de la CLI du
lot 1 restent en vigueur ; seul ce qui est nouveau pour le lot 2 est écrit ici (numérotation continuée : D17…, H11…,
DA7…). Graphe graphify de RoomBoard présent mais construit le 2026-11-23 à 23:28, **avant** la fusion du lot 1
(3b3c88a) : `apps/cli` n'y figure pas ; liens de `apps/cli` établis par recherche texte, ceux de `apps/web` par le
graphe puis lecture. Décision du coffre « 0281 » absente du miroir de la VM (dernière : 0280) : son texte est la note 2
de `docs/sessions/cli-etat.md` (CLI Node sur les deux modules Wasm et le code de la page, aucune logique recopiée).

## 1. Demande et gabarit

**Demande** : lot 2 de la CLI — insérer un `.rbitem` dans un tableau neuf ou existant, importer `.iwb .ubz .notebook
.olf .flipchart`, exporter `.iwb .ubz`, lire et écrire `.rbpack`, commande `convert` ; chaque format passe de « code
3 » à « couvert » dans `FORMAT_LOTS`, avec ses tests et un contrôle dans `scripts/essais/cli-essai.mjs` (Jérôme,
2026-11-23 ~22:15 : « En plus de construire le graphify, ajoute la construction de la cli complète », brief OF5).

**Gabarit** : chantier (40 questions au plus ; 28 consommées). Estimation : **9 tâches, ~4 h 20 de travail, ~2 h 40 de
chemin critique**, jusqu'à trois tâches en parallèle sans fichier commun (DA10).

Contre-relecture, tour 1 (2026-11-24) : 2 majeurs (D23 étendue à toute écriture de document ; bibliothèque par
`disk.ts`) et 9 mineurs intégrés ; aucun point contesté.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| D17 | Port `FragmentTab` (DA5 du lot 1, exécutée) | `createFragmentOps<T>`, `FragmentDeps<T>`, `FragmentOps<T>` génériques ; toute lecture de `tab.board.*` passe par `deps.view(tab): FragmentTab` (interface exacte en DA5 du lot 1, rappelée en 3). `workspace.ts:348` passe l'adaptateur (~8 lignes) ; la CLI passe sa vue `CliPage`. Aucun comportement de la page ne change. | `docs/plans/cli-cadrage.md` DA5 ; `apps/web/src/app/fragments.ts:26-56,104,137-140,148-150,168` ; `docs/sessions/cli-etat.md` (« prochaine tâche exacte ») | oui |
| D18 | Insertion d'un `.rbitem` | Par le seul chemin du produit : `createImporter` → lecteur `rbitem` (`import.ts:174-193`) → `ImageTarget.insertFragment` de `headlessTarget`, branché sur `fragments.insertResource(view, …)` (objets : centre de leurs bornes à `--at` ou au centre de la scène, cascade de 24 px par rang dans l'appel ; grille : un `SetGrid` sur la page, même grille : aucune étape). Tableau existant : `import a.roomboard x.rbitem` ; tableau neuf : `new` puis `import`, ou `run --new --out` avec `{"op":"import",…}`. | `fragments.ts:94-125,162-166` ; `workspace.ts:363` ; `image-import.ts:192-197` | oui |
| D19 | Export `.rbitem` | `exporter.ts` passe par `encodeIds(view, page, ids, name, "export")` (nouveau, sous `encodeSelection`) : ferme le constat `apps/cli/src/exporter.ts:2`. `encodeIds` rend `{ bytes, elements }` : `elements` = nombre d'éléments de la première page du fragment extrait, la règle de `exporter.ts:42-43` déplacée dans `fragments.ts` ; le champ `elements` de la sortie `export` ne change donc pas (`encodeSelection` rend `.bytes`). `export … --grid` (et `{"op":"export","grid":true}`) : `encodeGrid` de la page choisie. Image absente du magasin : avis du produit (`MISSING_EXPORT_MESSAGE`), code 1. | `fragments.ts:147-180` ; `docs/architecture-constats.md` (ligne 2026-11-24 cli) ; D12 du lot 1 | oui |
| D20 | Workers des tableaux et du ZIP | **Worker en processus** (DA7) : le corps de `board-worker.ts:44-72` devient `boardJobReply(mod, job)` exporté de `platform/board-reader.ts`, celui de `zip-worker.ts:158-185` devient `zipJobReply(message)` exporté de `zip-worker.ts` ; les deux Workers ne gardent qu'une coquille. La CLI les appelle par `inlineWorker` (`one-shot-worker.ts`) et réutilise **sans changement** `createZipReader`, `createZipWriter`, `createOlfReader`, `createBoardCodec` (mêmes contrôles de réponse, mêmes bornes). Le mappage direct prévu au § 7 du lot 1 (`unzip = unzipEntries`…) est écarté : il recopiait `checkZipReply`, `checkBoardParts`, la borne de `createOlfReader` et l'emballage du `.flipchart`. | brief OF5 (« extraire la fonction du Worker ») ; `board-worker.ts:22-72` ; `zip-worker.ts:144-186` ; `zip-read.ts:47-90` ; `board-reader.ts:133-164` ; `one-shot-worker.ts:10-45` | oui |
| D21 | Orchestration des tableaux | Extraire de `workspace.ts:608-705` vers `app/board-convert.ts` : `readBoardFile`, `writeBoardFile`, et les ports `createBoardPorts` de `main.ts:365-373` (DA8). `workspace.ts` garde onglets pleins, `addTab`, copie de l'onglet, `missingOf`, boîte d'enregistrement et avis ; messages et ordre inchangés. | `cli-cadrage.md` § 7 ; `workspace.ts:608-705` ; `main.ts:273,365-373` | oui |
| D22 | Documents ouvrables par la CLI | Le choix se fait dans **`session.readDoc(path, kind)`**, seul point de lecture d'un fichier (`session.ts:92-98`) : avec `kind = "document"`, les cinq tableaux (`FORMAT_LOTS[ext].handler` ∈ `iwb ubz notebook olf flipchart`) passent par `readBoardFile`, tout le reste par le conteneur (inchangé) ; `readDoc` rend `Pick<ReadResult, "doc" \| "assets">`. `session.open` (onglet sans fichier pour un tableau, comme `target: null` de la page) et `state` (`main.ts:102`, qui appelle `readDoc` sans `open`) en héritent. Donc `state`, `run <source>`, `tab.open`, `export <source>` et `convert` lisent les tableaux ; `import` les ouvre en onglet par `openBoard` de `createImporter` (rapport `opened`). Avertissements de lecture : `boardWarningsMessage` dans `notices`. | `workspace.ts:608-674` ; `import.ts:319-327,360` ; `board-files.ts:117,121` | oui |
| D23 | Toute écriture d'un document vise un `.roomboard` | Une seule règle, `documentTarget(path)` (`apps/cli/src/session.ts`) : extension `.roomboard` (sans casse), sinon `CliError("usage")`, code 2. Appelée par `session.save` (donc op `save`, `new`, `run --save`/`--out`, `apply`, `import`), et en contrôle préalable par `main.ts` sur la cible connue (`new <sortie>`, `--out`, et le fichier passé à `run --save`, `apply`, `import` sans `--out`) **avant tout chargement**. Conséquence : un tableau blanc ouvert n'est jamais réécrit à son chemin (`run lecon.iwb --save` → 2 ; `--out x.roomboard` exigé). **Changement de contrat du lot 1** : `new`, `save`, `--out` acceptaient tout chemin ; ils n'acceptent plus que `.roomboard`. Compatible avec l'existant vérifié : tous les tests de `apps/cli` et `cli-essai.mjs` écrivent des `.roomboard` (`grep` des cibles de `new`, `--out`, `to`). Les `.rbitem` (export) et les sorties de `convert`/`export`/`library export` gardent leur propre contrôle d'extension. | `apps/cli/src/session.ts:112-124` ; `main.ts:93,103-117,122,134,147` ; contre-relecture tour 1 ; H14 | oui (règle unique) |
| D24 | Export `.iwb`, `.ubz` | `export <source> <sortie.iwb|.ubz>` et `{"op":"export","to":"x.ubz"}` : document entier de l'onglet actif par `writeBoardFile` (format = extension) ; `--page`, `--ids`, `--all`, `--grid`, `--name` avec ces sorties : code 2. Image du document non lue : `UNREAD_ASSETS_MESSAGE`, code 1 (même contrôle `missingOf` que la page). Avertissements d'écriture (`boardListOf`) dans `notices`. | `workspace.ts:676-705` ; `container-io.ts:82` ; `controller.ts:11` ; `board-io.ts:655` | oui |
| D25 | `convert` | `convert <source> <sortie>` : session neuve, `tab.open` de la source (D22), puis écriture selon l'extension de sortie : `.roomboard` (`save`), `.iwb`/`.ubz` (D24). Sortie `{"file":…,"from":…,"pages":n,"notices":[…]}`. Sources : `.roomboard` et les cinq tableaux ; `.pdf` source ou sortie : code 3 (lot 3) ; `.rbitem`, `.rbpack` et tout autre : code 2 (renvoi à `export`, `library`). Pas d'opération `convert` dans `run` (= `tab.open` + `export`). | `cli-cadrage.md` § 7 ; H12, H16 | oui |
| D26 | `.rbpack` | **Bibliothèque sur disque** (DA9) : `library list|import|export <dossier>` sur `createResourceLibrary` et `createTauriLibraryFiles` avec un adaptateur `node:fs`. Un `.rbpack` n'est jamais ouvert en onglet ni inséré : `import`/`export`/`convert` d'un `.rbpack` → code 2 avec le renvoi à `library`. | Jérôme, U25 « Paquet → importé dans la bibliothèque » (`import.ts:199`) ; coffre `02_Decisions/0263` ; `library.ts:126,260-330,353` ; `library-files.ts:193` ; `main.ts:329-335,382-390` | oui (commande neuve, additive) |
| D27 | `FORMAT_LOTS` | Le blocage du code 3 passe d'un seuil global à un **état par format et par sens** : chaque entrée garde ses lots (`read`, `write`, affichés par `formats`) et gagne `covered: { read: boolean; write: boolean }` ; `importBlocked`/`exportBlocked` lisent `covered`, `formatRows` rend `read`/`write` = `covered`. Chaque tâche CLI passe à `covered` les formats qu'elle branche (`.rbitem` lecture en T5, tableaux lecture en T6, `.iwb`/`.ubz` écriture en T7, `.rbpack` en T9 avec la commande `library`) : aucun état intermédiaire où un format passe le contrôle sans lecteur. `LOT_LIVRE` devient le plus haut lot entièrement couvert, posé à 2 en T9, et un test exige que toute entrée d'un lot ≤ `LOT_LIVRE` soit couverte. Notes mises à jour : `.rbitem` (« insertion par `import` ; `--grid` »), `.rbpack` (« par `library import` / `library export` »), tableaux (« images GIF, WebP, BMP, SVG non lues (lot 4) », H11 ; `.notebook .olf .flipchart` « lecture seule »). `formats` rend alors `read`/`write` vrais pour tout le lot 2. | `apps/cli/src/formats.ts:10,34-53,71` | oui |
| D28 | Fichiers d'essai | Aucun fichier de tableau suivi dans le dépôt (`git ls-files` : aucun `.iwb .ubz .notebook .olf .flipchart .rbpack`). Les fabriques existent en code : `iwbZip`, `iwbRaw3`, `ubzZip`, `notebookZip`, `olfZip`, `flipPages` de `scripts/essais/c13-tableaux-navigateur.mjs:30-188` sont **déplacées** dans `scripts/essais/fabriques/tableaux.mjs` (+ `.d.mts`) avec leurs constantes (`IWB_HEAD`, `NB_MANIFEST`, `nbSvg`, `TIFF`, `enc`). Interface : le ZIP est injecté (`zip: (files: Record<string, Uint8Array>) => Uint8Array`, forme de `fflate.zipSync`, patron du `deflate` de `fabriques/flipchart.mjs`) ; le PNG **ne l'est pas** : `tableaux.mjs` importe `solidPng` de `../commun.mjs:220` (`node:zlib` seul, déjà importé par `cli-essai.mjs`) ; `nbSvg` et `TIFF` sont exportés (encore utilisés par `c13-tableaux-navigateur.mjs:155,554-596`), `enc` reste aussi défini dans l'essai C13 (une ligne) ; `c13-tableaux-navigateur.mjs`, les tests de `apps/cli` et `cli-essai.mjs` les importent. `.flipchart` par `makeFlipchart` (`fabriques/flipchart.mjs:360`). Tests de la CLI : ZIP par `zipStored` (`zip-worker.ts:83`), aucune dépendance ajoutée. | brief OF5 ; `fabriques/flipchart.mjs` (déjà importé par `apps/web/src/platform/fabrique-flipchart.test.ts:5`) | oui |
| D29 | Modules Wasm | Aucune ligne Rust ; tailles inchangées à l'octet (1 374 398 o / 1 572 864 ; 2 794 511 o / 3 145 728). Le module formats de la CLI est une seule instance (pas de Worker jetable). **Panique pendant une tâche des tableaux** : `boardJobReply` relance une `WebAssembly.RuntimeError` au lieu de la rendre en `{ error }` (le Worker de la page l'attrape dans sa coquille et poste le même `{ error: boardErrorMessage(…) }` : rien ne change pour la page) ; le gestionnaire en processus de la CLI (`board-node.ts`) note alors le module « interrompu » et relance. Dès lors, dans ce processus, `session.save` et `session.write` refusent (code 1, `command`, « module des formats interrompu : rien n'est enregistré »). Ex. `import a.roomboard img.png bad.iwb` : le rapport est imprimé (PNG inséré, `bad.iwb` en échec), puis le refus d'enregistrer ; `a.roomboard` inchangé. Écrit en H15. | brief OF5 ; `docs/sessions/cli-etat.md` (« Tailles Wasm avant ») ; D16 du lot 1 | oui |
| D30 | Profil, aide, essai | `USAGE` de `main.ts` gagne `convert` et `library` ; `--help` les rend. Profil § CLI : « Lots restants » → lots 3 et 4 ; la ligne « Écritures (`new`, `run --save`, `import`, `export`) seulement sur des fichiers temporaires » gagne `convert` et `library import|export` ; la ligne des codes rappelle que toute écriture de document vise un `.roomboard` (D23). `cli-essai.mjs` : un contrôle par format du lot 2 (S5). | `.claude/chantier.md` § CLI ; D15 du lot 1 | oui |

## 3. Carte d'impact

Ligne « Surfaces d'impact » absente du profil : rubriques reprises du lot 1 (CLI, modules web, cœur et Wasm,
persistance, formats, scripts et profil, tests, autres dépôts).

### 3.1 CLI (`apps/cli/src`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `formats.ts:10-17,30-31,71-96` | oui | `covered` par entrée et par sens, `LOT_LIVRE = 2` en T9, notes (D27) | V |
| `target.ts:18-35` (`headlessTarget`) | oui | gagne `insertFragment` ; `run` vient de la vue `cliView` (D18) | V |
| `exporter.ts:21-27` (`checkExportTarget`), `:28-55` (`exportFragment`, `elements` en `:42-43`) | oui | `encodeIds`, `--grid`, `.iwb`/`.ubz` (D19, D24) ; `checkExportTarget` accepte `.iwb .ubz` | V |
| `importer.ts:87-106` | oui | `openBoard` passé à `createImporter` ; `.rbpack` → code 2 (D22, D26) | V |
| `session.ts:30-37,72-75,92-124,169-175,238-252` | oui | `SessionDeps` gagne `fragments`, `board` (ports), `codec` et l'état « formats interrompu » ; `readDoc` choisit par l'extension (D22) ; `documentTarget` dans `save` (D23) ; refus après panique dans `save`/`write` (D29) ; op `export` (`grid`) | V |
| `main.ts:24-33,88-167` | oui | `convert`, `library`, contrôle préalable D23 (`new` `:93`, `run` `:103-122`, `apply` `:134`, `import` `:147`), `state` d'un tableau par `readDoc` (`:102`), `export --grid` | V |
| `fragment-view.ts`, `board-node.ts`, `library.ts` (neufs) | oui | vue `CliPage`, ports en processus, bibliothèque sur disque (liste 3.10) | V (absents) |
| `state.ts`, `ops.ts`, `args.ts`, `contract.ts`, `disk.ts`, `wasm-node.ts` | non | réutilisés tels quels (`disk.ts:9,49` porte aussi la bibliothèque, liste 3.10) | V |
| `bin.ts`, `vite.config.ts`, `package.json` | non | `fflate` résolu depuis `apps/web` (H20) | S |

### 3.2 Modules web réutilisés ou étendus

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/fragments.ts:26-56,94-200` | oui | générique `T`, `view`, `encodeIds` (D17, D19) | V |
| `apps/web/src/app/workspace.ts:348` | oui | adaptateur `view` | V |
| `apps/web/src/app/workspace.ts:608-705` | oui | `openBoard`, `exportBoard` appellent `readBoardFile`, `writeBoardFile` (D21) | V |
| `apps/web/src/app/workspace.ts:352-364` (`imageTarget`), `:838-892` | non | appels à `fragments` inchangés (signatures génériques) | V |
| `apps/web/src/app/board-convert.ts` (neuf) | oui | DA8 | V (absent) |
| `apps/web/src/main.ts:365-373` | oui | `board: createBoardPorts(...)` | V |
| `apps/web/src/main.ts:329-335,382-390` | non | bibliothèque et `importPack` de la page inchangés | V |
| `apps/web/src/platform/board-worker.ts:22-72` | oui | coquille autour de `boardJobReply` (D20) | V |
| `apps/web/src/platform/board-reader.ts` | oui | `BoardJob`, `boardJobReply` | V |
| `apps/web/src/platform/zip-worker.ts:144-186` | oui | `ZipJob`, `zipJobReply` ; coquille | V |
| `apps/web/src/platform/one-shot-worker.ts:10-45` | oui | `WorkerReply`, `inlineWorker` | V |
| `apps/web/src/platform/zip-read.ts:47-90` | non | `createZipReader`, `createZipWriter`, `createOlfReader` réutilisés | V |
| `apps/web/src/app/board-io.ts:50-61,199,528,655` | non | `BoardPorts`, `decodeBoardList`, `buildBoardDocument`, `boardListOf` réutilisés | V |
| `apps/web/src/app/board-files.ts:31,46,93,117-122` | non | appelés depuis `board-convert.ts` | V |
| `apps/web/src/app/library.ts:126,353` | non | `createResourceLibrary`, `resourceKindReader`, `importedMessage` | V |
| `apps/web/src/platform/library-files.ts:193` | non | `createTauriLibraryFiles` sur un port `node:fs` | V |
| `apps/web/src/platform/import.ts:174-212,319-360` | non | lecteurs `rbitem`, `rbpack`, tableaux | V |
| `apps/web/src/platform/image-import.ts:146,180-198` | non | `anchorOf`, `ImageTarget` | V |
| `apps/web/src/app/container-io.ts:82` | non | `missingOf` | V |

### 3.3 Cœur Rust et modules Wasm

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/` | non | `insertFragment`, `insertPages`, `extract` appelés tels quels (`api.ts:381-385`) | V |
| `crates/roomboard-wasm/` | non | taille inchangée (D29) | V |
| `crates/roomboard-formats/`, `crates/roomboard-formats-wasm/` | non | `BoardReader`, `FlipchartReader`, `write_board_xml`, `notebook_order` appelés tels quels | V |
| `crates/roomboard-shell/` | non | lot 4 | V |

### 3.4 Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| formats `.roomboard`, `.rbitem` (`format/mod.rs`) | non | mêmes écrivains | V |
| format `.rbpack` (`rbpack.ts:50,83`) | non | `buildPack`/`readPack` par la bibliothèque | V |
| `.iwb`, `.ubz` écrits (`board/write.rs`) | non | mêmes écrivains | V |
| disposition d'une bibliothèque (`<nom>.rbitem`, `.rbitem.json`, `.rbitem.png`) | non | celle de la coque (`library-files.ts:193`), réutilisée | V |

### 3.5 Formats du lot 2

| format | sens | chemin dans la CLI | lot 1 → lot 2 |
|---|---|---|---|
| `.rbitem` objets et grille | insérer ; écrire (grille comprise) | `import` → `insertResource` ; `export` → `encodeIds`/`encodeGrid` | code 3 → couvert |
| `.iwb` (ZIP ou XML), `.ubz` | lire ; écrire | `readBoardFile` ; `writeBoardFile` | code 3 → couvert |
| `.notebook`, `.olf`, `.flipchart` | lire | `readBoardFile` | code 3 → couvert |
| `.rbpack` | lire ; écrire | `library import` ; `library export` | code 3 → couvert |
| `.pdf` ; lot 4 | — | inchangés (code 3) | — |

### 3.6 Scripts, profil, documentation

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/cli-essai.mjs` | oui | contrôles du lot 2 (S5) | V |
| `scripts/essais/fabriques/tableaux.mjs` (+ `.d.mts`, neufs) | oui | fabriques déplacées (D28) | V |
| `scripts/essais/c13-tableaux-navigateur.mjs:30-188` | oui | importe les fabriques au lieu de les définir | V |
| `scripts/essais/fabriques/flipchart.mjs` | non | `makeFlipchart` réutilisé | V |
| `scripts/verifier.sh:81-84` | non | build et essai de la CLI déjà joués | V |
| `.claude/chantier.md` § CLI | oui | lots restants ; ligne « Écritures » gagne `convert` et `library import\|export` ; codes : écriture de document en `.roomboard` (D30) | V |
| `docs/plans/cli-cadrage.md` | non | historique ; ce cadrage le complète | V |
| `scripts/controle-licences.mjs` | non | aucune dépendance ajoutée, à garder vert | V |

### 3.7 Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/fragments.test.ts:62,208,254,271,325` | oui | les cinq appels de `createFragmentOps` passent `view` ; tests neufs `encodeIds` | V |
| `apps/web/src/platform/board-reader.test.ts:15,193-196,230-232` | oui | lisent `board-worker.ts?raw` : réécrits en appels de `boardJobReply` sur un faux module (mêmes assertions : `notebookOrder(mod.notebook_order…)`, `FlipchartReader.open`, ni tri ni `DOMParser`) | V |
| `apps/web/src/platform/zip-worker.test.ts` | oui | tests neufs de `zipJobReply` (chaque `op`/`mode`, erreur) | V |
| `apps/web/src/platform/one-shot-worker.test.ts` | oui | tests neufs d'`inlineWorker` : réponse, rejet → `onerror` ; ceux de `runOnce` restent verts | V |
| `apps/web/src/app/board-convert.test.ts` (neuf) | oui | `readBoardFile`/`writeBoardFile` sur faux ports (messages des refus) | S |
| `apps/web/src/app/workspace.test.ts` | non | à garder vert : copier, coller, exporter, `openBoard`, `exportBoard` | V |
| `apps/web/src/app/board-io.test.ts`, `board-files.test.ts`, `library.test.ts`, `platform/rbpack.test.ts`, `zip-read.test.ts`, `bamboo.test.ts`, `flipchart-chaine.test.ts`, `fabrique-flipchart.test.ts`, `import.test.ts` | non | à garder verts | V |
| `apps/cli/src/formats.test.ts:17-40` | oui | lot 2 livré | V |
| `apps/cli/src/export.test.ts:53-60` | oui | `.iwb` n'est plus code 3 : le contrôle passe à `.pdf` | V |
| `apps/cli/src/*.test.ts` neufs (insertion, tableaux, convert, library) | oui | vrai Wasm (D2 du lot 1) | S |
| `scripts/essais/c13-tableaux-navigateur.mjs`, `c3-groupes-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs` (`--e2e`) | non | à garder verts (mêmes octets fabriqués, même câblage) | V |
| `cargo test --workspace` | non | aucune ligne Rust | V |

### 3.8 Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-prive` | non | hors périmètre (fichier d'état) | S |

### Effets de bord sur l'existant

- Collage, dépôt, export de la sélection et de la grille dans la page passent par `view` : comportement identique.
  Couvert par `fragments.test.ts`, `workspace.test.ts` et `c3-groupes-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs` (`--e2e`).
- Les Workers des tableaux et du ZIP délèguent à `boardJobReply`/`zipJobReply` : mêmes réponses et transferts.
  Couvert par `board-reader.test.ts` (réécrit), `zip-worker.test.ts`, `zip-read.test.ts`, `c13-tableaux-navigateur.mjs`.
- `openBoard`/`exportBoard` de la page passent par `board-convert.ts` : mêmes avis, même ordre. Couvert par
  `workspace.test.ts` (tableaux) et `board-convert.test.ts`.
- La CLI : `new`, `save`, `--save`, `--out` n'acceptent plus qu'une cible `.roomboard` (D23, code 2 sinon) ; les tests
  du lot 1 et `cli-essai.mjs` n'écrivent que des `.roomboard` (vérifié) : couvert par `main.test.ts` (tests neufs de la
  règle) et S5.
- La CLI : `.iwb` n'est plus refusé en code 3 ; le message d'une image absente à l'export `.rbitem` devient celui du
  produit (`MISSING_EXPORT_MESSAGE`). Couvert par `export.test.ts`, `formats.test.ts`, `cli-essai.mjs`.

### Chantiers en cours

Aucun sur les mêmes fichiers : `git worktree list` → `main`, `feat/cli-lot2` et `~/.cache/tmp/ctl-main-7Y13` (HEAD
détachée à 3b3c88a, contrôle de référence, aucun fichier modifié par un chantier) ; `gh pr list` : aucune PR ouverte.

### Termes cherchés

Graphe (`--graph ~/.cache/graphes/roomboard/graphify-out/graph.json`) : `query "createFragmentOps FragmentTab
encodeSelection insertResource"` ; `affected "createFragmentOps"` ; `affected "createBoardCodec"` ; `affected
"headlessTarget"` et `affected "exportFragment"` (aucun nœud : graphe d'avant la fusion du lot 1). Recherche texte :
`createFragmentOps`, `encodeSelection`, `insertResource`, `encodeGrid`, `insertPages` dans `workspace.ts` ; `openBoard`,
`exportBoard`, `BoardPorts`, `flipchartSources`, `boardSources`, `readOlf`, `unbamboo` ; `onmessage`, `postMessage` des
Workers ; `WorkerLike` hors tests (aucun Worker en processus existant) ; `board-worker`, `?raw` dans les tests ;
`createZipReader`, `createZipWriter`, `createOlfReader`, `createBoardCodec` ; `importPack`, `readPack`, `buildPack`,
`createResourceLibrary`, `resourceKindReader`, `createTauriLibraryFiles`, `TauriFs`, `TauriDirFs` ; `missingOf`,
`UNREAD_ASSETS_MESSAGE` ; `hasBoardReader`, `FlipchartReader` ; `fflate` dans les `package.json` ; `git ls-files` pour
`.iwb .ubz .notebook .olf .flipchart .rbpack .rbitem` et `fixtures` ; `iwbZip`, `notebookZip`, `olfZip`, `flipPages`,
`makeFlipchart`, `solidPng` dans `scripts/essais/` ; `lot 2`, `rbitem`, `iwb`, `LOT_LIVRE` dans `apps/cli/src/*.test.ts`
et `cli-essai.mjs`. Coffre : `chercher.js "0281 roomboard cli"`, `"roomboard tableaux blancs iwb ubz flipchart"`,
`"rbpack bibliothèque paquet"` ; `grep -rl 0281` dans le coffre (rien).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| insérer un `.rbitem` (objets ou grille), cascade, adoption des assets | `apps/web/src/app/fragments.ts:56` | `createFragmentOps<T>(deps: FragmentDeps<T>): FragmentOps<T>` ; `FragmentDeps<T>` = champs actuels avec `alive(tab: T): boolean` et `view(tab: T): FragmentTab` ; `FragmentTab` exacte de DA5 (lot 1) : `assets`, `doc`, `state(): { page; selection }`, `anchor(at: Point \| null): readonly [number, number]`, `run(cmd): Change \| null`, `insertFragment(src, dx, dy): Change \| null`, `insertPages(src): Change \| null` ; appel `insertResource(tab: T, bytes, name, at, index?)` | étendre |
| exporter des ids en `.rbitem` | `fragments.ts:147` | nouveau membre `encodeIds(tab: T, page: string, ids: readonly string[], name?: string, action?: "copy" \| "export"): Promise<{ readonly bytes: Uint8Array; readonly elements: number } \| null>` ; `encodeSelection(tab, action)` = `(await encodeIds(tab, state.page, state.selection, SELECTION_NAME, action))?.bytes ?? null` | étendre |
| exporter la grille | `fragments.ts:167` | `encodeGrid(tab: T, name?)` (page = `view(tab).state().page`) | réutiliser |
| vue CLI d'un onglet et d'une page | `FragmentTab` (ci-dessus), `anchorOf` (`image-import.ts:146`), `SCENE` (`apps/cli/src/target.ts:16`), `IDENTITY` (`apps/web/src/engine/camera.ts:12`) | — | nouveau module `apps/cli/src/fragment-view.ts` : `interface CliPage { readonly tab: CliTab; readonly page: string }` ; `cliView(p: CliPage, notices: string[]): FragmentTab` (`state` = `{ page, selection: [] }`, `anchor` = `anchorOf(SCENE, IDENTITY, at)`, `run`/`insertFragment`/`insertPages` sur `tab.doc` avec la page, refus → avis, null) ; `cliFragments(deps: { io; core; now(); notices }): FragmentOps<CliPage>`. Termes `FragmentTab`, `CliPage`, `view(` : aucune vue sans écran |
| cible d'import qui insère les `.rbitem` | `apps/cli/src/target.ts:18` | `headlessTarget(tab: CliTab, page: string, notices: string[], fragments: FragmentOps<CliPage>): ImageTarget` ; `insertFragment: async (b, at, i, name) => (await fragments.insertResource({ tab, page }, b, name, at, i)) === "inserted"` ; `run` = `cliView(…).run` | étendre |
| exécuter le corps d'un Worker sans Worker | `apps/web/src/platform/one-shot-worker.ts:10` | `interface WorkerReply { readonly data: unknown; readonly transfer: Transferable[] }` ; `inlineWorker(handle: (message: unknown) => WorkerReply \| Promise<WorkerReply>): () => WorkerLike` (réponse en tâche suivante, rejet → `onerror`, `terminate` sans effet) | étendre (termes `WorkerLike` hors tests, `inline` : rien) |
| lire, ordonner, écrire les tableaux par le module formats | `board-worker.ts:44-72` (corps non exporté) | `export type BoardJob` (déplacé) ; `boardJobReply(mod: FormatsBinding, job: BoardJob): WorkerReply` dans `platform/board-reader.ts` (erreurs → `{ error: boardErrorMessage(…) }`, sauf `WebAssembly.RuntimeError` relancée, D29) ; le Worker : `boardJobReply(await loadFormatsModule(), e.data)` dans son `try`, son `catch` poste `{ error: boardErrorMessage(…) }` comme aujourd'hui | étendre (extraire) |
| dézipper (pack, board, bamboo, 3D), zipper, lire un `.olf` | `zip-worker.ts:158-185` (corps), `:73,83,91,137` | `export type ZipJob` (ex-`WorkerMessage`) ; `zipJobReply(message: ZipJob): WorkerReply` ; puis `createZipReader(inlineWorker(zipJobReply), undefined, mode)`, `createZipWriter(…)`, `createOlfReader(…)` (`zip-read.ts:47,62,84`) | étendre (extraire) puis réutiliser |
| codec des tableaux | `board-reader.ts:133` | `createBoardCodec(inlineWorker(async (m) => boardJobReply(await formats(), m as BoardJob)))` | réutiliser |
| ports des tableaux | `main.ts:365-373` (câblage écrit dans l'amorce) | `createBoardPorts(spawn: { readonly zip: () => WorkerLike }, codec: BoardCodec): BoardPorts` dans `app/board-convert.ts` ; `main.ts` et la CLI l'appellent | nouveau (extraire) |
| ouvrir un tableau en document | `workspace.ts:608-674` | `readBoardFile(file: { readonly name: string; readonly blob: Blob; readonly format: BoardSourceFormat }, deps: { readonly core: CoreFactory; readonly ports: BoardPorts; makeAssets(): AssetStore; readonly decode: ImageDecoder; now(): string; readonly appVersion: string }): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }>` (lève avec le message du produit) | nouveau (extraire) |
| écrire un `.iwb`/`.ubz` | `workspace.ts:676-705` | `writeBoardFile(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat, ports: Pick<BoardPorts, "write" \| "zip">): Promise<{ bytes: Uint8Array; warnings: string[] }>` | nouveau (extraire) |
| ports des tableaux en Node | ci-dessus | nouveau module `apps/cli/src/board-node.ts` : `nodeBoardPorts(formats: () => Promise<FormatsBinding>, onPanic: () => void): BoardPorts` (= `createBoardPorts` sur `inlineWorker` ; `onPanic` appelé sur une `WebAssembly.RuntimeError`, D29) | nouveau (câblage, aucun contrôle) |
| ZIP de la bibliothèque en Node | `zip-read.ts:47,62` | `nodeZip(): LibraryZip` = `{ unzip: createZipReader(inlineWorker(zipJobReply), undefined, "pack"), zip: createZipWriter(inlineWorker(zipJobReply)) }`, dans `apps/cli/src/library.ts` | réutiliser |
| image d'un tableau (taille) | `apps/cli/src/importer.ts:33` (`nodeDecode`) | `decode` de `readBoardFile` | réutiliser |
| avis d'un tableau ouvert, nom d'onglet | `board-files.ts:117,121` | `boardWarningsMessage`, `boardTabName` | réutiliser |
| image non lue avant écriture | `container-io.ts:82`, `controller.ts:11` | `missingOf(doc, assets)`, `UNREAD_ASSETS_MESSAGE` | réutiliser |
| `.rbpack` : importer, exporter, lister | `library.ts:126,260,294,353` ; `library-files.ts:193` | `createResourceLibrary({ files: [createTauriLibraryFiles(nodeDirFs, dir, "mine")], zip: nodeZip(), now, appVersion, kindOf: resourceKindReader(core, codec) })` ; `importPack(bytes, name)`, `exportPack("mine", folder)`, `refresh()` + `folder("mine", f)` ; `importedMessage` | réutiliser |
| lire et écrire un fichier de la bibliothèque sans fichier à moitié écrit | `apps/cli/src/disk.ts:9` (`readBytes`), `:49` (`writeAtomic`, H8 du lot 1) | `nodeDirFs.readFile = readBytes`, `nodeDirFs.writeFile = writeAtomic` (le dossier parent est créé avant par `createTauriLibraryFiles.write`, `library-files.ts:247-248`) | réutiliser |
| système de fichiers de la bibliothèque en Node | port `TauriFs & TauriDirFs` (`host-tauri.ts:34-44`) | — | nouveau module `apps/cli/src/library.ts` : `nodeDirFs: TauriFs & TauriDirFs` (`readFile`/`writeFile` ci-dessus ; `readDir`, `mkdir`, `remove` sur `node:fs/promises`) ; `openLibrary(dir: string, deps: { core; codec; now() }): ResourceLibrary` (termes `TauriFs`, `readDir`, `node:fs` dans `apps/web` : aucune réalisation Node) |
| fichiers d'essai des tableaux | `c13-tableaux-navigateur.mjs:30-188`, `fabriques/flipchart.mjs:360`, `commun.mjs:220` (`solidPng`) | `iwbZip(zip)`, `iwbRaw3()`, `ubzZip(zip)`, `notebookZip(zip)`, `olfZip(zip)`, `flipPages()`, `nbSvg(body, head?)`, `TIFF` avec `zip: (files: Record<string, Uint8Array>) => Uint8Array` ; PNG par `solidPng` importé ; `makeFlipchart(pages, deflate)` | nouveau module `scripts/essais/fabriques/tableaux.mjs` (déplacé, jamais copié) |
| table des formats | `apps/cli/src/formats.ts:12,55,80-89` | `FormatEntry` gagne `covered: { read: boolean; write: boolean }` ; `importBlocked`, `exportBlocked`, `formatRows` le lisent ; `LOT_LIVRE` = plus haut lot couvert | étendre |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**

- H11 — Images d'un tableau en GIF, WebP, BMP ou SVG : la CLI ne sait pas lire leur taille sans décodeur (`nodeDecode`,
  lot 4) ; `buildBoardDocument` les compte en « objets non lus » (avis), alors que l'application les affiche. Défaut :
  accepté, écrit dans les notes de `formats`. À revoir au lot 4 (taille par en-tête).
- H12 — Conversion ou import d'un tableau avec pertes : **code 0**, avertissements du produit dans `notices` (même
  sémantique que l'avis « ouvert avec N avertissements » de la page, qui ouvre quand même). Seul un refus de lecture
  (endommagé, trop gros, sans page) donne le code 1. Contrat lu par les agents.
- H13 — Commande `library` (DA9) : nom, sous-commandes `list|import|export`, racine « mine » seule, dossier passé en
  argument. Contrat additif (DA2).
- H14 — Règle D23 : toute écriture d'un document (`new`, `save`, `--save`, `--out`, `apply`, `import`) vise un
  `.roomboard`, sinon code 2 avant tout chargement ; un tableau blanc ouvert n'est donc jamais réécrit à son chemin.
  Changement de contrat du lot 1 (tout chemin était accepté), sans effet sur les tests et l'essai existants, qui
  n'écrivent que des `.roomboard`.

**Niveau 2**

- H15 — Une panique Wasm pendant une tâche des tableaux (une seule instance du module formats par processus : une seule
  colle wasm-bindgen) rend l'erreur du produit (« lecture du tableau interrompue ») et **interdit toute écriture dans la
  suite du processus** (D29) : un import partiel `img.png bad.iwb` imprime son rapport puis sort en code 1 sans
  enregistrer. Une panique de la lecture d'un classeur reste régie par H8 du lot 1 (non étendue ici).
- H16 — `convert` remplace une sortie existante, comme `export` (pas de `--replace`).
- H17 — `import <a.roomboard> x.iwb` : le tableau est ouvert dans un onglet de la commande (`opened`), jamais enregistré
  (même règle que `.roomboard` au lot 1) ; `convert` ou `run` + `save` le gardent.
- H18 — `library list` rend l'index (`folders`, `items` : `path`, `name`, `kind`, `keywords`, `description`) d'un dossier
  de la racine ; pas de `library add` (un `.rbitem` posé dans le dossier par `export` y suffit, type lu par
  `resourceKindReader`).
- H19 — Les ids insérés par une opération `import` de `run` ne sont pas référençables par `$n` (comme au lot 1).
- H20 — `fflate` est résolu depuis `apps/web` par le build et les tests de la CLI (aucune dépendance ajoutée) ; sinon
  `fflate` `0.8.3` exact en dépendance de `apps/cli` (MIT, déjà au verrou).
- H21 — `export --grid` d'une page sans grille : avis du produit (`NO_GRID_MESSAGE`), code 1.
- H22 — `library` n'a pas d'opération dans `run` (la bibliothèque n'est pas un onglet).

## 5. Décisions d'architecture

**DA7 — Worker en processus.**
Contexte : la logique des Workers des tableaux et du ZIP vit dans leur `onmessage` ; `board-worker.ts` pose
`self.onmessage` au chargement (inimportable sous Node). Décision : extraire `boardJobReply` et `zipJobReply`
(`WorkerReply = { data, transfer }`) ; les Workers n'en sont qu'une coquille ; `inlineWorker(handle)` joue le même corps
en processus. Conséquences : la CLI réutilise les lecteurs, écrivains et contrôles de réponse de la page sans une ligne
recopiée ; le lot 3 fera de même pour `pdf-vector-worker.ts` ; deux tests `?raw` deviennent des tests d'appel.

**DA8 — `app/board-convert.ts`, orchestration des tableaux sans onglet.**
Contexte : `openBoard`/`exportBoard` mêlent lecture, construction et onglet (`workspace.ts:608-705`) ; les ports sont
câblés dans l'amorce. Décision : `readBoardFile`, `writeBoardFile`, `createBoardPorts` (interfaces en 3) ; le code est
déplacé tel quel, `workspace.ts` garde onglets, copie, avis et boîtes. Conséquences : la CLI et la page partagent le même
chemin ; les constats `workspace.ts:552` (BoardSources) et `board-files.ts:89` (flipchartSources) suivent le code, sans
aggravation, et restent ouverts.

**DA9 — `.rbpack` par une bibliothèque sur disque.**
Contexte : un paquet est importé dans la bibliothèque, jamais dans un onglet (U25, `import.ts:196-212`) ; la coque range
la bibliothèque en fichiers (`createTauriLibraryFiles`). Décision : `roomboard library list|import|export <dossier>` sur
`createResourceLibrary` et un port `node:fs` ; contrat en DA10. Conséquences : un dossier de bibliothèque de la CLI a la
disposition de la coque ; insérer une ressource = `import <tableau> <dossier>/<chemin>.rbitem`.

**DA10 — Contrat du lot 2 (additif à DA2) et découpage.**
Contexte : DA2 n'accepte que des ajouts. Décision : référence ci-dessous ; 9 tâches. Conséquences : schéma
`roomboard-cli/1` inchangé ; codes 0/1/2/3 inchangés.

| commande | arguments | sortie stdout | codes |
|---|---|---|---|
| `import` | inchangé ; sources en plus : `.rbitem`, cinq tableaux (`opened`) | rapport inchangé | `.rbpack` : 2 (renvoi à `library`) ; base non `.roomboard` sans `--out` : 2 (D23) |
| `export` | `<source> <sortie.rbitem \| .iwb \| .ubz> [--page] [--ids \| --all] [--grid] [--name]` | `{"file":…,"kind":"fragment"\|"grid"\|"iwb"\|"ubz","elements"?:n,"notices"?:[…]}` | `.rbpack` : 2 ; `.pdf` : 3 ; options de sélection avec `.iwb`/`.ubz` : 2 |
| `convert` | `<source> <sortie>` | `{"file":…,"from":…,"pages":n,"notices":[…]}` | 0 ; 1 refus de lecture ou d'écriture ; 2 sortie ou source non prise (`.rbitem`, `.rbpack`…) ; 3 `.pdf` |
| `library list` | `<dossier> [--folder <f>]` | `{"library":…,"folder":…,"folders":[…],"items":[…]}` | 0, 1, 2 |
| `library import` | `<dossier> <paquet.rbpack>` | `{"library":…,"folder":…,"count":n,"notices":[importedMessage]}` | 0 ; 1 paquet refusé (rien d'écrit, `library.ts:294`) ; 2 |
| `library export` | `<dossier> <sortie.rbpack> [--folder <f>]` | `{"file":…,"name":…,"skipped":[…]}` | 0 ; 1 trop gros ; 2 |
| `state`, `run`, `tab.open` | acceptent les cinq tableaux (D22) | inchangée | `run <tableau> --save` : 2 (D23) |
| `new`, `run --out`, `apply --out`, `import --out`, op `save` | inchangés | inchangée | cible non `.roomboard` : 2 (D23, changement de contrat) |

Opérations de `run` ajoutées : `{"op":"export","to":"g.rbitem","grid":true,"page"?:id,"name"?:…}`,
`{"op":"export","to":"x.iwb"}` ; `import` et `tab.open` acceptent les sources ci-dessus.

Tâches (estimation : ~4 h 20 de travail, ~2 h 40 de chemin critique ; « ∥ » = parallèle, aucun fichier commun) :

| tâche | contenu | fichiers | dépend | durée |
|---|---|---|---|---|
| T1 | `fragments.ts` générique, `encodeIds`, adaptateur `view` | `app/fragments.ts`, `fragments.test.ts`, `app/workspace.ts:348` | — | 25 min |
| T2 ∥ | `WorkerReply`, `inlineWorker`, `boardJobReply`, `zipJobReply`, tests `?raw` réécrits | `platform/one-shot-worker.ts`, `board-reader.ts`, `board-worker.ts`, `zip-worker.ts` et leurs tests | — | 25 min |
| T3 ∥ | fabriques déplacées | `scripts/essais/fabriques/tableaux.mjs` (+ `.d.mts`), `c13-tableaux-navigateur.mjs` | — | 20 min |
| T4 | `board-convert.ts` ; `openBoard`, `exportBoard` ; ports de l'amorce | `app/board-convert.ts` (+ test), `app/workspace.ts:608-705`, `main.ts:365-373` | T1, T2 | 30 min |
| T5 ∥ T4 | CLI : insertion et export `.rbitem`, `--grid`, `covered` par format (`.rbitem` lecture) | `apps/cli/src/fragment-view.ts`, `target.ts`, `exporter.ts`, `session.ts`, `main.ts`, `formats.ts` et tests | T1 | 35 min |
| T8 ∥ T4, T5 | CLI : bibliothèque sans commande (`nodeDirFs`, `nodeZip`, `openLibrary`, `list`/`import`/`export` en fonctions) | `apps/cli/src/library.ts`, `library.test.ts` | T2 | 25 min |
| T6 | CLI : lecture des tableaux (`board-node.ts`, `readDoc` par extension, `openBoard`, `state`, D23, D29, `.rbpack` → 2), tableaux `covered` en lecture | `board-node.ts`, `session.ts`, `importer.ts`, `main.ts`, `formats.ts` et tests | T3, T4, T5 | 40 min |
| T7 | CLI : export `.iwb`/`.ubz`, `convert`, `covered` en écriture | `exporter.ts`, `session.ts`, `main.ts`, `formats.ts` et tests | T6 | 30 min |
| T9 | CLI : commande `library` branchée, `.rbpack` `covered`, `LOT_LIVRE = 2` et son test, notes, aide, `cli-essai.mjs`, profil § CLI | `main.ts`, `formats.ts`, `scripts/essais/cli-essai.mjs`, `.claude/chantier.md` | T7, T8 | 30 min |

## 6. Scénarios d'acceptation

- **S1 — Insérer un `.rbitem` dans un tableau existant et dans un tableau neuf.** `roomboard export a.roomboard
  /tmp/sel.rbitem --all` ; `roomboard import /tmp/b.roomboard /tmp/sel.rbitem --at 400,300` : `inserted` le liste,
  `state` de `b` montre les mêmes sortes, styles et tailles que la page de `a`, centre des bornes en (400, 300), assets
  cités ; `roomboard run --new --out /tmp/c.roomboard` avec `{"op":"import","files":["/tmp/sel.rbitem"]}` : `c` les
  contient. `export a.roomboard /tmp/g.rbitem --grid` puis `import b.roomboard /tmp/g.rbitem` : la page de `b` a la grille
  de `a`.
- **S2 — Lire les cinq tableaux.** Avec les fabriques (`tableaux.mjs`, `flipchart.mjs`) : `convert lecon.iwb
  /tmp/l.roomboard` rend 0, 8 objets et l'avis de la vidéo non lue ; `.iwb` SVG brut : 3 pages ; `.ubz` : 4 objets ;
  `state lecon.notebook` : 2 pages dans l'ordre du manifeste ; `.olf` : 3 objets, fond `#ffeecc` ; `.flipchart` : 2 pages,
  5 objets en page 1 (TIFF et action en avis). `run lecon.iwb --save` rend 2 et le fichier n'est pas modifié.
- **S3 — Écrire et relire `.iwb` et `.ubz`.** `export a.roomboard /tmp/a.iwb`, puis `convert /tmp/a.iwb /tmp/a2.roomboard` :
  mêmes sortes et géométries (à la tolérance de l'aller-retour) ; idem `.ubz` ; `export a.roomboard /tmp/a.ubz --ids x`
  rend 2 ; `export a.roomboard /tmp/a.pdf` rend 3 (« lot 3 »).
- **S4 — Paquets `.rbpack`.** L'essai crée `/tmp/lib/Formes` (la CLI ne crée jamais le dossier parent d'une sortie :
  `writeAtomic`, `disk.ts:49`, règle du lot 1 gardée) ; `export a.roomboard /tmp/lib/Formes/carre.rbitem --ids …` et un
  second `.rbitem` dans le même dossier ; `library export /tmp/lib /tmp/p.rbpack --folder Formes` ; `library import /tmp/lib2 /tmp/p.rbpack` :
  dossier `Formes`, `count` 2 ; `library list /tmp/lib2 --folder Formes` les liste ; `state /tmp/lib2/Formes/carre.rbitem`
  égale l'original (ids par rang) ; `import a.roomboard /tmp/p.rbpack` rend 2 avec le renvoi à `library`.
- **S5 — Essai de `verifier.sh` (`cli-essai.mjs`).** En plus des 26 contrôles du lot 1 : réimport du `.rbitem` exporté
  dans un tableau neuf (état comparé, ids par rang) ; `.rbitem` de grille ; `convert` de chacun des cinq tableaux
  fabriqués (pages et nombre d'objets attendus) ; export `.iwb` et `.ubz` puis relecture comparée ; aller-retour
  `.rbpack` par `library` ; règle D23 (`run lecon.iwb --save` et `new z.iwb` : code 2, rien d'écrit) ; `formats` : `read`/`write` vrais pour tout le lot 2 ;
  `.pdf` toujours code 3 ; affiche `CLI : OK`.

## 7. Hors périmètre

- Lots 3 (PDF) et 4 (Office, médias, 3D, autres images, décodage des images GIF/WebP/BMP/SVG des tableaux).
- Toute ligne Rust ; seuils des modules Wasm ; `roomboard-prive` ; coque Tauri ; installation de paquet système.
- Écriture `.notebook`, `.olf`, `.flipchart` (lecture seule dans le produit, décision 0268, Q5).
- Correction des constats ouverts que le code déplacé emporte (`workspace.ts:552` BoardSources, `board-files.ts:89`
  flipchartSources, `fragments.ts:139` grille comparée par `JSON.stringify`, `zip-worker.ts:25` dépendance platform →
  app, `zip-read.ts:39` copies du mode pack) : ni corrigés ni aggravés.
- Racine « Ressources partagées », vignettes de ressources, `library add`, opérations `library` dans `run`.
- Fichiers téléchargés (`~/telechargements-roomboard/` reste hors du dépôt) ; toute écriture hors d'un dossier temporaire
  dans les tests.

## 8. Portes immédiates

Aucune.
