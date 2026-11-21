# Cadrage — usage-c16-office (Word, Excel, PowerPoint)

Cadré en mode autonome le 2026-11-21 (étage 1, cadreur), sans question posée à Jérôme. Base : `origin/main` @ `41342b0`.
Les décisions U35, U34, U23, U24 du cadrage de l'usage (`docs/plans/usage-cadrage.md:76-77, 87-88`) sont **citées, pas
refaites** : elles sont la source de rang 2 de ce chantier. Pas de graphe graphify pour RoomBoard (`~/.cache/graphes/`
n'a que `claude-config`, `roomflow2`, `roomflow2-web`) : carte d'impact par recherche texte et lecture. Coffre : recherche
non dégradée.

## 1. Demande et gabarit

**Demande.** Un document Word, Excel ou PowerPoint déposé sur RoomBoard s'importe : converti en PDF par LibreOffice ou
Microsoft Office dans la coque, puis importé comme un PDF, avec « Modifier dans l'application d'origine » et réimport ;
sur le web, lu en valeurs (`.xlsx`) ou refusé avec le message « exportez en PDF depuis Office ».

**Gabarit.** `chantier` (budget 40 questions ; 36 consommées, numérotées O1 à O36).

## 2. Décisions

Ordre : formats et détection, puis ce que fait le dépôt, puis la conversion (programme, arguments, sécurité, délai,
COM), puis le modèle de données (original gardé), puis « Modifier dans l'application d'origine », puis la coque Tauri,
puis tests, essais, tailles, licences, coexistence. « réversible ? » : oui tant qu'aucune release n'est publiée, sauf
mention.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| O1 | Formats pris | Coque : `.docx`, `.doc`, `.odt` (texte) ; `.xlsx`, `.xlsm`, `.xls`, `.ods` (classeur) ; `.pptx`, `.ppt`, `.odp` (présentation). `.csv` hors périmètre. | brief (« `.doc`, `.ppt`, `.xls` si le cadrage de l'usage les cite ») ; `usage-cadrage.md:599-601` (cite `.doc`, `.odt`, `.xls`, `.ods`, `.csv`, `.ppt`, `.odp`) ; C10b F25 (`usage-c10b-tableau-cadrage.md:50`, `.csv` : séparateur et encodage à deviner) ; étude formats-documents-medias `:63` (LibreOffice couvre les neuf) | oui (HO2-1) |
| O2 | Détection (U23) | En-tête d'abord, puis extension : OOXML et ODF = en-tête ZIP `PK\x03\x04` (`hasZipMagic`, `import.ts:146-148`) **et** extension ; `.doc`, `.xls`, `.ppt` = en-tête CFB `D0 CF 11 E0 A1 B1 1A E1` **et** extension. Extension Office sans le bon en-tête : refusé comme aujourd'hui (« format pris en charge dans une prochaine version »). | U23 (`usage-cadrage.md:76`) ; patron `sheetHandler` (`import.ts:212`) ; brief | oui |
| O3 | Web et iPad | `.docx`, `.pptx`, `.doc`, `.ppt`, `.odt`, `.odp`, `.xls`, `.ods` : avis « <nom> : exportez en PDF depuis Office », rien d'inséré ; `.xlsx` / `.xlsm` : tableau en valeurs de C10b, inchangé. Gestionnaire `office-web` placé **avant** `sheet`, qui ne prend jamais `.xlsx`. | U35 (`usage-cadrage.md:88`, « Web, iPad : `.xlsx` en valeurs seulement ; `.docx`, `.pptx` : message ») ; brief ; C10b F25 amendé pour `.xls`/`.ods` (message Office au lieu de « prochaine version ») | oui (HO1-6) |
| O4 | `.xlsx` dans la coque | Avec un convertisseur : **pages** par conversion (nouvel onglet, comme `.docx`). Sans convertisseur : **repli** sur le tableau en valeurs (C10b), jamais un refus, avec l'avis « <nom> : importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages ». Le tableau reste aussi par le collage HTML (C10b F19). `usage-cadrage.md:600` prévoit les deux chemins (« valeurs → tableau (partout) ; P par conversion (coque) ») ; le brief tranche pour P dans la coque (décision de l'orchestrateur, contre-relecture tour 1). | brief (« en coque, un `.docx`, `.pptx` ou `.xlsx` déposé est converti en PDF ») ; U35 et `usage-cadrage.md:600` ; Q3 (« il sera nécessaire de pouvoir édit le contenu », `usage-cadrage.md:636`) : objection du relecteur, d'où HO1-1 | oui (HO1-1) |
| O5 | Ce que fait le dépôt | Nature `document` : nouvel onglet `<racine du nom>.roomboard`, `target: null` (l'original n'est jamais réécrit), sans menu ; plusieurs fichiers : dans l'ordre (boucle de `importFiles`). | Q1 (`usage-cadrage.md:619`, « s'ouvre toujours dans un nouvel onglet ») ; U1 ; `workspace.ts:396-430` (`openPdf`) | oui |
| O6 | Ordre des convertisseurs | LibreOffice d'abord (PATH, puis chemins connus), **puis** Word / Excel / PowerPoint par COM sous Windows seulement. | U35 (« LibreOffice sans interface avec profil jetable, puis Word / Excel / PowerPoint par COM ») ; ActCraft `export/src/officeconvert.cpp:35-46, 218` (rang 4, même ordre) | oui (HO1-3) |
| O7 | Recherche de LibreOffice | Fonction pure sur un `Search { path: Option<OsString>, known: Vec<PathBuf> }` (testable sans toucher au système) : `soffice` puis `libreoffice` dans chaque dossier du PATH (recherche écrite en Rust, aucun `which`), puis chemins connus : Linux `/usr/lib/libreoffice/program/soffice`, `/opt/libreoffice*/program/soffice`, `/snap/bin/libreoffice`, `/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice` ; macOS `/Applications/LibreOffice.app/Contents/MacOS/soffice` et la même sous `~/Applications` ; Windows `%ProgramFiles%` et `%ProgramFiles(x86)%` + `\LibreOffice\program\soffice.exe`. Fichier ordinaire exécutable exigé. COM : `CLSIDFromProgID("Word.Application")` (resp. `Excel`, `PowerPoint`) réussit. | ActCraft `officeconvert.cpp:35-46` ; VM : `/usr/bin/soffice` → `../lib/libreoffice/program/soffice`, LibreOffice 26.2.6.3 (V, `soffice --version`) | oui |
| O8 | Arguments LibreOffice | `Command::new(<soffice>)` avec la liste `--headless --invisible --norestore --nolockcheck --nodefault --nologo -env:UserInstallation=<URL file:// du profil> --convert-to pdf --outdir <dossier> <dossier>/source.<ext>` ; aucun interpréteur de commandes, aucune chaîne assemblée ; `stdin` nul, `stdout` et `stderr` **redirigés vers des fichiers** du dossier de travail (`soffice.out`, `soffice.err` : aucun tube qui se remplit et bloque), 2 Kio de `soffice.err` gardés pour le message. URL du profil par une fonction `file_url(path)` testée (espaces, `%`, `#`, lecteur Windows `file:///C:/…`). | U35 (« process externe à arguments en liste ») ; étude `:63` ; ActCraft `officeconvert.cpp:128, 222-224` ; brief (« aucun shell, arguments en liste ») ; contre-relecture tour 1 | oui |
| O9 | Chemins contrôlés | Racine de travail **propre à l'utilisateur** : dossier cache de l'application (`app.path().app_cache_dir()`, identifiant `org.roomboard.app`), jamais `/tmp` partagé ; sous-dossiers `conversions/` et `originaux/` créés en 0700 sous Unix, refusés s'ils sont un lien symbolique ou si leur propriétaire n'est pas l'utilisateur courant (`MetadataExt::uid()` contre `libc::geteuid()`). Dossier neuf par conversion `conversions/<pid>-<compteur>/` créé par `create_dir` (échoue s'il existe). Entrée : `convert_granted(g: &GrantedPaths, path, …)` refuse un chemin non accordé (`NotGranted`, patron `read_granted`, `roomboard-shell/src/lib.rs:82-97`) puis **copie** le fichier sous `source.<ext>` (le nom d'origine n'atteint jamais les arguments : un nom `-x; $(…).docx` est sans effet). Sortie : `<dossier>/source.pdf`, exigé fichier ordinaire (`symlink_metadata`, jamais un lien) dont le chemin canonique est sous le dossier canonique ; tout autre fichier produit est ignoré. Le profil est supprimé dès la fin du processus (succès, échec ou délai, garde `Drop`) ; le PDF suit O35. | brief (« jamais hors du dossier temporaire de la conversion ») ; U24 (chemins accordés) ; patron `symlink_to_ungranted_file_is_refused` (`lib.rs:266`) ; contre-relecture tour 1 | oui |
| O10 | Profil jetable | `<dossier>/profil/user/registrymodifications.xcu` écrit avant le lancement : macros coupées (`/org.openoffice.Office.Common/Security/Scripting` : `MacroSecurityLevel` = 3, `DisableMacrosExecution` = true) ; liens jamais mis à jour (`/org.openoffice.Office.Calc/Content/Update` et `/org.openoffice.Office.Writer/Content/Update` : `Link` = 1) ; formules jamais recalculées au chargement (`/org.openoffice.Office.Calc/Formula/Load` : `OOXMLRecalcMode` = 1, `ODFRecalcMode` = 1). Un test lit le profil écrit et y retrouve ces six valeurs. Supprimé avec le profil (O9). | brief (« profil jetable `-env:UserInstallation=` ») ; étude `:63` (sans profil, la commande part à l'instance ouverte et ne produit rien) ; clés et valeurs : contre-relecture tour 1, effet réel non mesuré sur LibreOffice 26.2 | oui (HO2-2) |
| O11 | Délai et arrêt | 120 s par défaut (paramètre `timeout` pour les tests). Attente par `try_wait` toutes les 50 ms. Au délai **et après un succès** : **arbre entier** tué — Unix : `CommandExt::process_group(0)` au lancement puis `libc::kill(-pgid, SIGKILL)` (`soffice` est un script qui lance `oosplash` puis `soffice.bin`) ; Windows : objet Job `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` (`windows`, `Win32_System_JobObjects`), affecté juste après `spawn` (course : un enfant lancé avant l'affectation échappe au Job ; `std::process` ne donne pas le fil pour un lancement suspendu ; risque accepté, HO2-13) ; puis `wait()` (aucun zombie) et, au délai, erreur `Timeout`. | U35 (« délai de 120 s ») ; ActCraft `officeconvert.cpp:29, 170` ; coffre `04_Pieges/edge-sans-tete-screenshot-ne-rend-pas-la-main.md` (arbres orphelins sous Windows quand seule la racine est tuée) ; contre-relecture tour 1 | oui |
| O12 | Une conversion à la fois | Verrou (`Mutex`) dans l'état de la coque : une seconde conversion attend la première ; le délai ne court que pendant le processus. | aucune source (mémoire : 7,5 Go pour un build Tauri sur la VM, profil ; LibreOffice ≈ 300 Mo par instance, supposé) | oui (HO2-3) |
| O13 | COM sous Windows | Module `office/com.rs` sous `cfg(windows)`, crate `windows` 0.62 (même version que `src-tauri/Cargo.lock:4177`, `MIT OR Apache-2.0`), fil STA dédié. Avant toute ouverture : `AutomationSecurity = 3` (`msoAutomationSecurityForceDisable`), `DisplayAlerts` coupé. Ouverture en lecture seule, sans fenêtre, hors fichiers récents, liens non mis à jour. Word : `Documents.Open` puis `ExportAsFixedFormat(out, 17)` ; Excel : `Workbooks.Open(…, UpdateLinks=0, ReadOnly=True)` puis `ExportAsFixedFormat(0, out)` ; PowerPoint : `Presentations.Open(…, ReadOnly, Untitled, WithWindow=False)` puis `SaveAs(out, 32)`. On ne ferme que ce qu'on a ouvert ; on ne quitte l'application que si on l'a lancée. Délai : le fil rend `Timeout`, le processus Office lancé par nous est tué par son PID. Entrée et sortie dans le même dossier de conversion (O9). **Prouvé par lecture** ; essai réel sur le PC (file d'attente). | U35 ; étude `:64, :141` (script d'ActCraft : lecture seule, sans fenêtre, ne ferme que ce qu'il a lancé, 120 s) ; brief (« Branche COM Windows écrite sous `cfg(windows)`, prouvée par lecture ») | oui (HO2-5) |
| O14 | Erreurs, messages, plafond | Rust `ConvertError { NotOffice, NotGranted, TooLarge, NoProgram, Timeout, Failed(String), NoOutput, Io(String) }`, rendu en chaîne stable (`no-program`, `timeout`, …) par la commande. Plafond : gestionnaire `office` avec `limit: { maxBytes: OFFICE_MAX_BYTES, message: "fichier Office trop gros pour être converti" }`, `OFFICE_MAX_BYTES = SHEET_MAX_BYTES` (100 Mio, `import.ts:201`) pour **tout** fichier Office, `.xlsx` compris : aucun fichier Office n'est lu sans borne ; `convert_granted` refuse aussi au-delà (`TooLarge`). Page : `NoProgram` → « <nom> : installez LibreOffice ou Microsoft Office » ; `Timeout` → « <nom> : conversion trop longue (plus de 120 s) » ; `Failed`, `NoOutput` → « Import impossible (<nom>) : la conversion en PDF a échoué » ; puis les refus du PDF de C12 (chiffré, aucune page, 500 pages) inchangés. Fichier sans chemin (collage) dans la coque : comme le web (O3). | brief (message mot pour mot) ; U35 ; U26 (`usage-cadrage.md:79`, 100 Mo par fichier) ; C10b F22 (100 Mo aussi dans la coque, `usage-c10b-tableau-cadrage.md:47`) ; patrons `import.ts:213, 222`, `workspace.ts:409-417` | oui (HO1-6) |
| O15 | Où vit la conversion | `crates/roomboard-shell/src/office.rs` (et `office/com.rs`), testé par `cargo test -p roomboard-shell` hors de Tauri ; pas de crate neuve. Voir DA-O1. | profil (« Trois couches testables seules ») ; `roomboard-shell/src/lib.rs:1-3` (« Logique de la coque testable sans Tauri ») ; brief | oui |
| O16 | Original gardé | Deux assets par import : l'**original** (octets du fichier déposé, `mime` Office, `name` d'origine) et le **PDF converti** (`<racine>.pdf`, `application/pdf`). Chaque fond `pdf-page` gagne la clé facultative `original` (empreinte de l'original). Comme `cited_assets` relève toute chaîne conforme des pages (`document.rs:238-245`), l'original est enregistré dans `assets/` sans autre code. Voir DA-O2. | U35 (« ouvre l'original gardé dans `assets/` ») ; U4 (« seuls les assets cités par un élément ou un fond vivant sont écrits ») ; U3 (champ facultatif, `Y.Map` de scalaires) | oui |
| O17 | Cœur et liaison | `Document::from_pdf_pages(asset, sizes, original: Option<&AssetRef>)` écrit `original` dans chaque fond et la métadonnée de l'original ; `RawBackdrop.original`, `BackdropView.original: Option<String>` (filtré par `is_asset_id`). Wasm : `from_pdf_pages` inchangé, `from_office_pages(id, name, mime, size, sizes, original_id, original_name, original_mime, original_size)` en plus, même `from_pdf_pages_inner`. TS : `fromPdfPages(asset, sizes, original?: AssetRef)`, `BackdropView.original: string \| null` (vraie et fausse liaison, contrat). | `document.rs:153-187` ; `element.rs:54-63, 383-445` ; `crates/roomboard-wasm/src/lib.rs:482-490, 1417-1428` ; `apps/web/src/core/api.ts:302-311, 397` ; `wasm-core.ts:708-709` ; `fake-core.ts:1905` | oui |
| O18 | Compatibilité | Un `.roomboard` d'avant C16 n'a pas `original` : `original: None`, rien ne change (test sur la fixture C12). Un lecteur d'avant C16 ignore la clé (`read_backdrop` ne lit que ses champs nommés, `element.rs:394-414`). `schema` et `formatVersion` inchangés. Test « recharger garde les octets » d'un document à `original`. | U3 (`usage-cadrage.md:56`) ; `format/mod.rs` sans `deny_unknown_fields` (`usage-cadrage.md:110`) ; brief (« un fichier d'avant C16 s'ouvre toujours ») | oui |
| O19 | « Modifier dans l'application d'origine » | Action `edit-original` (libellé « Modifier dans l'application d'origine ») de la table `ACTION_TABLE`, ajoutée à la barre des pages du profil par défaut avec `requires: ["officeConverter"]` (masquée sur le web). Elle agit sur le fond de la **page montrée** ; page sans `original` : avis « cette page ne vient pas d'un fichier Word, Excel ou PowerPoint ». | U35 ; `toolbar.ts:25-30` (clé `officeConverter` déjà prévue au lot 5b), `:108` ; `toolbar-profiles.ts:24-38` (barre des pages) ; `toolbar-host.ts:43-52` (`ACTIONS`) ; profil, design existant (boutons d'action de la barre des pages) | oui (HO1-5) |
| O20 | Ouvrir l'original | La page envoie l'original à `open_original` en **corps brut** (`ipc::Request`, `InvokeBody::Raw`), le nom dans l'en-tête `x-roomboard-name` (encodé en pourcentage), jamais en JSON. La coque écrit `<cache>/originaux/<id>/<nom>` (racine d'O9) ; `<nom>` assaini par **liste blanche** (lettres et chiffres Unicode, `-`, `_`, `.`, espace ; tout autre caractère → `_`), sans `-`, `.` ni espace en tête, sans `.` ni espace en fin, 120 caractères au plus ; noms réservés de Windows refusés (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`, sans tenir compte de la casse ni de l'extension) ; extension parmi celles d'O1 et en-tête ZIP ou CFB (O2) exigés : un `.roomboard` piégé ne fait jamais ouvrir un exécutable. Puis `open::that_detached(path)` **depuis Rust** (crate `open` 5.4.5, O36) : aucune permission pour la page. Sous Windows, flux `Zone.Identifier` (`ZoneId=3`) posé sur la copie : Office l'ouvre en mode protégé. Voir DA-O4. | U35 (« ouvre l'original gardé dans `assets/` avec l'application du système ») ; U24 (la page ne reçoit aucune portée) ; contre-relecture tour 1 | oui (HO1-7) |
| O21 | Surveiller l'enregistrement | En Rust, par **relevé** (taille et date de modification) chaque seconde, des seules copies écrites par `open_original` ; un changement stable sur deux relevés émet `roomboard://original-changed { id, path, name }`. Les enregistrements par fichier temporaire puis renommage (Word, LibreOffice) sont vus. Pas de `watch` du plugin `fs`, aucune permission `fs:allow-watch`. Voir DA-O3. | U35 (« surveille l'enregistrement ») ; `usage-cadrage.md:154` (« plugin `fs`, `watch` », noté **S**) ; U24 (ensemble de chemins tenu en Rust) | oui |
| O22 | Réimporter | À l'événement : question « <nom> a été modifié. Le réimporter dans un nouvel onglet ? » (`ws.ask`). Oui : la page appelle `reimport_original(id)` ; **la coque** accorde la copie et émet l'événement de dépôt (patron `grant_and_emit`, `main.rs:113-125`, sans position) : la copie suit le chemin d'un fichier déposé jusqu'à `importFiles` → nouvel onglet ; l'onglet d'origine et son annotation restent intacts. La page ne nomme jamais un chemin à accorder. Non : on continue de surveiller. | Q1 (nouvel onglet) ; U23 (chaîne d'import unique) ; U24 ; contre-relecture tour 1 | oui (HO1-2) |
| O23 | Durée de vie des fichiers | Profil : supprimé à la fin du processus (O9). Dossier de conversion : supprimé par `release_conversion(id)` dès le PDF lu (O35), et restes d'un plantage purgés au lancement (dossiers de `conversions/` dont le processus n'existe plus). Copies d'originaux : **jamais supprimées à la sortie** (l'utilisateur peut encore modifier le fichier dans Word) ; purgées au lancement au-delà de 7 jours. | aucune source (choix de prudence : aucune perte de modification) | oui (HO2-4) |
| O24 | Capacité `officeConverter` | Vraie si coque **et** convertisseur trouvé au lancement (commande `office_converter`, appelée par l'amorce avant `runtimeCapabilities`, qui gagne `env.officeConverter`). | `runtime-capabilities.ts:14-24` (clé à `false` en dur) ; `main.ts:154-159` | oui |
| O25 | Pendant la conversion | Curseur d'attente (`progress`) sur la scène et attribut `data-conversion="en-cours"` sur la racine (lu par les tests) ; l'import en cours bloque déjà les autres commandes de fichier (`IMPORT_BUSY_MESSAGE`, `controller.ts:12, 178`). Aucun avis avant la fin. | design existant (aucun avis non bloquant dans l'interface, recherche `toast`, `aria-live` : rien) ; `impeccable` (retour visible pour une attente longue) | oui (HO1-4, porte visuelle) |
| O26 | Tests qui demandent `soffice` | Exigés par défaut : sans LibreOffice, le test **échoue** avec « soffice introuvable : installez LibreOffice, ou posez ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test » ; avec `ROOMBOARD_SANS_SOFFICE=1`, il passe en l'écrivant sur `stderr`. `verifier.sh` et la CI ne posent jamais la variable. | brief (« disent clairement quand il manque, sans être sautés en silence sur la VM ») ; patron `ROOMBOARD_WASM_REQUIRED` (`verifier.sh:48`) | oui (HO2-8) |
| O27 | Fichiers d'essai | Fabriqués par le test : ZIP écrit avec `zip` (dev-dependency de `roomboard-shell`, déjà au `Cargo.lock:1284`, mêmes features que `roomboard-core`) : `.docx` d'un paragraphe, `.pptx` de **2** diapositives, `.xlsx` d'une feuille. Écrits sous `crates/roomboard-shell/tests/fixtures/` et régénérés par `ROOMBOARD_REGENERER_FIXTURES=1` (patron C10b), relus par l'essai navigateur. Aucun fichier d'autrui. | brief (« fabriqués par le test ») ; `roomboard-formats/src/sheet.rs:332-360, 501-512` (patron) ; U36 (fichiers synthétiques) | oui (HO2-9) |
| O28 | Preuves sur la VM | Rust : conversions réelles `.docx`, `.pptx`, `.xlsx` par `/usr/bin/soffice` (PDF qui commence par `%PDF-`, 2 pages pour le `.pptx`), délai dépassé (faux programme), un test par cas de sécurité (O9 à O11, O20). Navigateur : `scripts/essais/c16-office-navigateur.mjs` dans `verifier.sh --e2e` et `scripts/tests/verifier-e2e.test.sh:13`. Capture `docs/essais/c16-pptx-libreoffice.png` (option `--captures`) : le `.pptx` converti par l'exemple `cargo run -p roomboard-shell --example convertir_office` (même code Rust que la coque), le PDF déposé dans le navigateur, ses pages montrées. | brief (tests, geste Playwright, capture) ; patron `c12-pdf-navigateur.mjs` ; `scripts/essais/commun.mjs:103` (`stageBox(page, 640)`), `:145` (`dropFile`) | oui |
| O29 | Coque sans build | Aucun plugin Tauri neuf (O36) : commandes `office_converter`, `convert_office`, `release_conversion`, `open_original`, `reimport_original` dans `generate_handler!` (`main.rs:173-180`) ; `src-tauri/Cargo.lock` mis à jour par `cargo metadata` / `cargo fetch` (crates tirées par `roomboard-shell`), sans build. Capacités **inchangées**. Preuves : tests de `roomboard-shell` par `include_str!` (patron `lib.rs:344, 372` : commandes enregistrées, capacités sans `opener:` ni `fs:allow-watch`) et contrôle neuf dans `controle-hors-ligne.mjs` (pas de `tauri-plugin-opener`, pas de feature `watch` sur `tauri-plugin-fs`, aucune de ces permissions). `cargo check --target x86_64-pc-windows-msvc` **seulement si la cible est déjà installée** (aucune installation) : elle ne l'est pas sur la VM (`rustup target list --installed`), donc preuve par lecture. | brief (« Aucun build Tauri : config prouvée par lecture et test ») ; C14 M28 (`usage-c14-media-cadrage.md:50`, même méthode) ; `controle-hors-ligne.mjs:131` (patron `checkAssetProtocol`) ; contre-relecture tour 1 | oui |
| O30 | Tailles Wasm | Module principal : seuls `original` du fond et `from_office_pages` s'ajoutent (estimé < 5 Ko ; 201 571 o de marge). Module `formats` : **rien** (44 883 o de marge). Plafonds inchangés ; tailles avant et après au rapport. | brief ; `verifier.sh:55-75` ; état (`docs/sessions/usage-c16-office-etat.md`, tailles avant) | oui |
| O31 | Licences | Crates : `libc` (déjà au `Cargo.lock:564`, `MIT OR Apache-2.0`), `windows` 0.62.2 (`MIT OR Apache-2.0`, cible Windows), `open` 5.4.5 (`MIT`) et son arbre (O36) : `is-wsl` 0.4.0 (`MIT`) → `is-docker` 0.2.0 (`MIT`) sous Linux, `libc` sous Unix, `dunce` 1.0.5 (`CC0-1.0 OR MIT-0 OR Apache-2.0`, déjà au `src-tauri/Cargo.lock:695`) sous Windows ; lus dans `~/.cargo/registry`. Aucune dépendance npm. LibreOffice et Office : programmes externes, jamais liés. `controle-licences.mjs` les relève (workspace et `src-tauri`, `:6`) ; toutes dans la liste permise (`:15-18`). | U39 (`usage-cadrage.md:92`) ; `Cargo.toml` des crates (V) | oui |
| O32 | Constats d'architecture | Réutiliser `typed` (`container-io.ts:67`) sans le recopier (le constat « `workspace.ts:151` » vise une ligne déplacée : `typed` vit désormais dans `container-io.ts`) ; `ImageTarget` (`image-import.ts:244`) non touché. Aucune demande « Constats à fermer ». | `docs/architecture-constats.md:12, 19` | oui |
| O33 | Coexistence avec C13 (OE24) | Entrées ajoutées dans `createImporter` (`import.ts:274-289`) **juste avant** `sheet` (C13 place `iwb`, `ubz` après `pdf`) ; champs ajoutés **en fin** d'`ImportDeps` et de `WorkspaceDeps` ; `openPdf` étendu par un champ facultatif, `openBoard` de C13 non touché ; une ligne chacun dans `verifier.sh --e2e` et `verifier-e2e.test.sh`. C13 a avancé (`7aca94b`, cadrage seul) : conflit **sûr** sur `scripts/tests/verifier-e2e.test.sh:13` (même liste sur une ligne), résolu en gardant les deux noms ; rebasage sur `main` avant la PR si C13 fusionne d'abord. | brief ; `usage-c13-lot1-svg-iwb-ubz-cadrage.md:25, 68, 74, 92` (branche `feat/usage-c13-lot1-svg-iwb-ubz` @ `7aca94b`) ; contre-relecture tour 1 | oui |
| O34 | Plateformes | VM : tout le Rust (LibreOffice réel), l'interface, le web. Restes nommés : build et essai de la coque Linux, Windows (LibreOffice, puis Office seul par COM, mode protégé), macOS (`LibreOffice.app`) ; iPad et Android hors périmètre. | profil (« Essais de plateforme séparés des tests automatiques ») ; Jérôme 21:45 (`usage-cadrage.md:31-33`) | oui |
| O35 | Sortie de la conversion | `convert_office(path)` rend `{ id, pdf, size }` : `source.pdf` est **accordé** (`GrantedPaths::grant`) et la page le lit par `grantedFile(ipc, pdf, size)` (morceaux de 8 Mio, `read_granted_file`) ; puis, dans un `finally`, `release_conversion(id)` retire l'accord (`GrantedPaths::revoke`, neuf) et supprime le dossier. Jamais le PDF en un seul message IPC. | U23 (« `blob()` lit par morceaux via `read_granted_file` ») ; `host-tauri.ts:77-101` ; `lib.rs:46-97` ; contre-relecture tour 1 | oui |
| O36 | Ouvrir avec l'application du système | Crate `open` 5.4.5 (`MIT`) dans `roomboard-shell`, `default-features = false, features = ["shellexecute-on-windows"]`, plutôt que `tauri-plugin-opener` : elle suffit (appel Rust seulement) et le plugin n'ajoute que des commandes JS. Sans cette feature, `open` lance `powershell.exe -Command` sous Windows (`open-5.4.5/src/windows.rs:75-82`) : interdit (aucun shell) ; avec, `ShellExecuteW` (`lib.rs:402`). macOS : `/usr/bin/open` (`macos.rs:4`) ; Linux : `xdg-open` puis `gio open` (`unix.rs:57, 65`), lancés comme programmes, le chemin en argument. Arbre : O31. | contre-relecture tour 1 (« préférer la crate `open` si elle suffit ») ; `tauri-plugin-opener-2.7.3/src/open.rs:9-12` et `Cargo.toml:66-68` (le plugin appelle `open` avec la même feature) ; sources lues | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (cœur, liaison Wasm, coque, interface, persistance,
scripts et licences, essais et documentation, tests). Chemins de `origin/main` @ `41342b0`.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/document.rs:153-187` (`from_pdf_pages`) | oui | paramètre `original: Option<&AssetRef>`, clé `original` dans chaque fond, métadonnée de l'original (O16, O17) | V |
| `src/document.rs:238-245` (`cited_assets`) | non | relève déjà toute chaîne conforme des pages : l'original est cité sans code neuf | V |
| `src/element.rs:54-63` (`BackdropView`) | oui | `original: Option<String>` | V |
| `src/element.rs:383-414` (`RawBackdrop`, `read_backdrop`) | oui | lecture de `original` | V |
| `src/element.rs:423-445` (`backdrop_view`) | oui | `original` filtré par `is_asset_id` | V |
| `src/copy.rs:94` (`cited_by`) | non | « Insérer des pages » d'un document converti emporte l'original (chaînes relevées à toute profondeur) | S |
| `src/asset.rs:7-36` (`is_asset_id`, `AssetInfo`) | non | réutilisés | V |
| `src/format/mod.rs` (manifeste, `load_parts`) | non | aucune clé de manifeste ; `schema` inchangé | V |
| `src/commands.rs` (`SetBackdrop`) | non | aucune commande neuve ; `fromPdfPages` reste hors historique | S |

### Liaison Wasm (`crates/roomboard-wasm`, `apps/web/src/core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/src/lib.rs:482-490` (`from_pdf_pages`) | non | gardé tel quel | V |
| `crates/roomboard-wasm/src/lib.rs:1417-1428` (`from_pdf_pages_inner`) | oui | paramètre `original` ; `from_office_pages` neuf à côté | V |
| `apps/web/src/core/api.ts:302-311` (`BackdropView`), `:397` (`fromPdfPages`) | oui | `original`, paramètre facultatif | V |
| `apps/web/src/core/wasm-core.ts:708-709` | oui | appelle `from_office_pages` quand `original` est donné | V |
| `apps/web/src/core/wasm-core.ts:310` (`toBackdropView`) | oui | lit `original` (chaîne ou null) | V |
| `apps/web/src/core/fake-core.ts:385` (`backdropView`) | oui | même champ `original` dans la fausse liaison | V |
| `apps/web/src/core/fake-core.ts:1905` | oui | même contrat dans la fausse liaison | V |
| `scripts/controle-wasm-bindgen.sh` | non | aucune version d'outil changée | S |

### Coque (`crates/roomboard-shell`, `apps/desktop/src-tauri`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/src/office.rs` (nouveau) | oui | extensions, recherche, arguments, dossier, profil, délai, erreurs (O1-O14) | — |
| `crates/roomboard-shell/src/office/com.rs` (nouveau, `cfg(windows)`) | oui | COM (O13) | — |
| `crates/roomboard-shell/src/originals.rs` (nouveau) | oui | copies d'originaux et relevé (O20, O21, O23) | — |
| `crates/roomboard-shell/src/lib.rs:1-3, 13-14` | oui | `pub mod office; pub mod originals;` | V |
| `crates/roomboard-shell/src/lib.rs:46-74` (`GrantedPaths`) | oui | `revoke(&Path)` neuf (O35) ; `grant`, `granted_path` réutilisés | V |
| `crates/roomboard-shell/src/lib.rs:82-97` (`read_granted`) | non | patron de `convert_granted` | V |
| `crates/roomboard-shell/src/lib.rs:344-419` (tests de configuration) | oui | deux tests neufs (opener, capacités sans `opener:` ni `fs:allow-watch`) ; ceux-ci restent verts | V |
| `crates/roomboard-shell/Cargo.toml` | oui | `libc` (Unix), `windows` (Windows), `open` (`shellexecute-on-windows`), dev : `zip` ; `[[example]] convertir_office` | V |
| `crates/roomboard-shell/examples/convertir_office.rs` (nouveau) | oui | conversion en ligne de commande pour la capture (O28) | — |
| `apps/desktop/src-tauri/src/main.rs:40-56` (commandes), `:113-125` (`grant_and_emit`), `:161-192` (`main`) | oui | `office_converter`, `convert_office`, `release_conversion`, `open_original` (corps brut), `reimport_original` (par `grant_and_emit`), fil de relevé, racine `app_cache_dir`, purge au lancement | V |
| `apps/desktop/src-tauri/Cargo.toml:9-17` | non | aucun plugin neuf (O36) ; `open` arrive par `roomboard-shell` | V |
| `apps/desktop/src-tauri/Cargo.lock` | oui | `open`, `is-wsl`, `is-docker` (par `roomboard-shell`), sans build | S |
| `apps/desktop/src-tauri/capabilities/default.json` | non | appels Rust seulement ; description complétée d'une phrase | V |
| `apps/desktop/src-tauri/tauri.conf.json:29-31` (`plugins`) | non | aucune configuration de plugin (appel Rust) ; `fs.scopeDroppedPaths: false` gardé | V |
| `apps/desktop/src-tauri/tauri.conf.json:13-24` (CSP) | non | aucune ressource neuve | V |
| `apps/desktop/src-tauri/tauri.conf.json:36-58` (`fileAssociations`) | non | aucune association Office (RoomBoard n'est pas l'éditeur de ces fichiers) | V |

### Interface web (`apps/web/src`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `platform/office-import.ts` (nouveau) | oui | gestionnaires `office` (coque) et `office-web`, en-têtes, messages | — |
| `platform/import.ts:40-73` (`ImportDeps`) | oui | `convertOffice?`, `openOffice?` en fin (fichier commun avec C13) | V |
| `platform/import.ts:146-148` (`ZIP_MAGIC`, `hasZipMagic`) | non | réutilisés | V |
| `platform/import.ts:118-120` (`hasExtension`) | oui | exporté, réutilisé par `isOfficeName` | V |
| `platform/import.ts:200-228` (`sheetHandler`) | non | réutilisé comme repli de la coque sans convertisseur | V |
| `platform/import.ts:261-290` (`createImporter`) | oui | entrées ajoutées avant `sheet` (fichier commun avec C13) | V |
| `platform/import.ts:293-432` (`importerOf`) | non | boucle inchangée | V |
| `platform/host-tauri.ts:61-112` | oui | `officeConverter`, `convertOffice` (PDF lu par `grantedFile`, puis `release_conversion`), `openOriginal` (corps brut), `reimportOriginal`, `onOriginalChanged` | V |
| `platform/files.ts:53-62` (`DroppedFile`) | non | `path` déjà là | V |
| `platform/controller.ts:12, 178` | non | blocage « Import en cours » réutilisé | V |
| `app/workspace.ts:63-110` (`WorkspaceDeps`) | oui | `convertOffice?`, `openOriginal?`, `onOriginalChanged?` en fin (fichier commun avec C13) | V |
| `app/workspace.ts:111-150` (`Workspace`) | oui | `editOriginal()` | V |
| `app/workspace.ts:51` (`stemOf`) | oui | racine du nom pour toute extension Office | V |
| `app/workspace.ts:351-366` (importeur) | oui | dépendances Office transmises | V |
| `app/workspace.ts:396-430` (`openPdf`) | oui | champ facultatif `original`, deux assets, nom d'onglet | V |
| `app/container-io.ts:67` (`typed`) | non | réutilisé | V |
| `app/toolbar-host.ts:43-52` (`ACTIONS`), `:28-41` (`HostTargets`) | oui | `edit-original` | V |
| `toolbar.ts:25-30` (`CapabilityKey`), `:99-128` (`ACTION_TABLE`) | oui | entrée `edit-original` ; clé `officeConverter` inchangée | V |
| `toolbar-profiles.ts:24-38` (barre des pages) | oui | bouton `edit-original` avec `requires` | V |
| `runtime-capabilities.ts:14-24` | oui | `officeConverter` lu de l'environnement | V |
| `main.ts:154-159, 256, 283-288` (amorce) | oui | `office_converter` au lancement, ports de la coque, écoute de l'événement | V |
| `ui/App.tsx:250-251` (hôte de barre) | oui | `editOriginal` | V |
| `ui/` (styles de la scène) | oui | curseur d'attente et `data-conversion` (O25) | S |

### Persistance et format

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| fond de page `pdf-page` (`Y.Map`) | oui | clé facultative `original` (O16, O18) | V |
| `assets/<sha256>.<ext>` du `.roomboard` | oui | l'original Office en plus du PDF ; écrit `assets/<sha256>.bin` en deflate (type inconnu de la table) | V |
| `crates/roomboard-formats/src/container.rs:30, 60` (`TYPES`, `extension`) | non | aucun type Office ajouté : `bin` suffit, l'original est relu par son empreinte et sa métadonnée `mime` ; module `formats` intact | V |
| `manifest.json`, `schema`, `formatVersion` | non | inchangés (U3) | V |
| `crates/roomboard-core/tests/fixtures/` (document C12) | non | test de compatibilité « fichier d'avant C16 » | S |
| `.rbitem`, `.rbpack` | non | un fragment ne porte pas de fond de page | S |

### Scripts, vérification, licences

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:95-120` (`--e2e`) | oui | `c16-office-navigateur.mjs` (fichier commun avec C13) | V |
| `scripts/verifier.sh:48` (`pnpm -r test`) et `cargo test` | non | les tests `soffice` y tournent, sans variable de saut | V |
| `scripts/verifier.sh:51-75` (tailles) | non | plafonds inchangés | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | nom du nouvel essai ; conflit sûr avec C13, garder les deux (O33) | V |
| `scripts/controle-hors-ligne.mjs:131-141` | oui | contrôle : ni `tauri-plugin-opener`, ni `watch`, ni permission `opener:` / `fs:allow-watch` (O29) | V |
| `scripts/tests/controle-hors-ligne.test.sh` | oui | cas du contrôle neuf | S |
| `scripts/controle-licences.mjs:6`, `licences-acceptees.json` | non | licences déjà permises | V |
| `THIRD_PARTY_NOTICES.md` | oui | section « Coque (C16) » : `open`, `is-wsl`, `is-docker`, `windows` ; LibreOffice et Office appelés comme programmes externes (fichier commun avec C13) | S |
| `.github/workflows` (`runs-on: [self-hosted, linux, vm]`) | non | LibreOffice déjà sur la VM | S |

### Essais et documentation

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c16-office-navigateur.mjs` (nouveau) | oui | S3, S4 | — |
| `scripts/essais/commun.mjs:103, 145, 223` | non | `stageBox`, `dropFile`, `zipEntries` réutilisés | V |
| `scripts/essais/c12-pdf-navigateur.mjs` | non | patron ; à garder vert | V |
| `scripts/essais/c10b-tableau-navigateur.mjs:23, 188-219` | non | `.xlsx` sur le web inchangé ; à garder vert | V |
| `docs/essais/c16-pptx-libreoffice.png` (nouveau) | oui | capture (O28) | — |
| `docs/essais/coque-windows.md`, `coque-macos.md` | oui | fiches de plateforme : restes C16 (O34) | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-shell/src/office.rs` (tests) | oui | conversions réelles, délai, sécurité (O8-O11, O26) | — |
| `crates/roomboard-shell/src/originals.rs` (tests) | oui | nom assaini, extension, en-tête, relevé, purge | — |
| `crates/roomboard-shell/src/lib.rs:166-481` (tests existants) | non | à garder verts | V |
| `crates/roomboard-core/src/document.rs:1585-1650` (tests `from_pdf_pages`) | oui | appel avec `None` ; test neuf avec `original`, rechargement à l'octet | V |
| `crates/roomboard-core/src/element.rs:452-480` (`backdrop_tests`) | oui | `original` lu, filtré | V |
| `crates/roomboard-wasm/src/lib.rs:2806-2825` | oui | `from_office_pages` | V |
| `apps/web/src/core/wasm-core.contract.test.ts:2744-2770` | oui | contrat `fromPdfPages` avec `original` et `pageView(id).backdrop.original` (vraie et fausse liaison ; `null` pour un PDF) ; cas existants verts | V |
| `apps/web/src/platform/import.test.ts` | oui | coque (convertisseur, sans programme, délai, sans chemin, `.xlsx` repli), web (message), en-têtes | S |
| `apps/web/src/app/workspace.test.ts` (`openPdf`) | oui | deux assets, nom d'onglet, `editOriginal`, réimport ; cas C12 verts | S |
| `apps/web/src/runtime-capabilities.test.ts:7-12` | oui | `officeConverter` lu de l'environnement | V |
| `apps/web/src/toolbar.test.ts:172`, `toolbar-profiles.test.ts`, `ui/Toolbar.test.tsx` | oui | bouton masqué sans la capacité | V |
| `apps/web/src/platform/host-tauri.test.ts` | oui | ports Office | S |
| `apps/web/src/platform/pdf-*.test.ts`, `app/pdf-export.test.ts` | non | à garder verts | V |

### Effets de bord sur l'existant

- Web : un `.docx`, `.pptx`, `.doc`, `.ppt`, `.odt`, `.odp`, `.xls`, `.ods` déposé disait « format pris en charge dans une
  prochaine version » ; il dit « exportez en PDF depuis Office » (C10b F25 amendé pour `.xls`, `.ods`). Couvert par
  `import.test.ts` (« office-web : message, rien d'inséré ») et S3.
- Coque : un `.xlsx` déposé donnait un tableau ; avec un convertisseur, il donne des pages dans un nouvel onglet ; sans
  convertisseur, un tableau comme avant. Couvert par `import.test.ts` (« coque : xlsx converti », « coque sans
  convertisseur : tableau et avis »).
- `fromPdfPages` gagne un paramètre facultatif et `BackdropView` un champ : un PDF importé a `original: null`. Couvert par
  `wasm-core.contract.test.ts` (cas C12 existants + cas neuf) et `document.rs` (`from_pdf_pages_*`).
- La barre des pages du profil par défaut gagne un bouton masqué sans `officeConverter` : sur le web et dans les tests à
  capacités nulles, rien ne change à l'écran. Couvert par `toolbar-profiles.test.ts` et `ui/Toolbar.test.tsx`.
- `officeConverter` n'est plus toujours faux dans la coque. Couvert par `runtime-capabilities.test.ts`.
- La coque lance un fil de relevé seulement après le premier « Modifier » ; aucun plugin neuf. Couvert par le
  test de configuration de `roomboard-shell` et le contrôle de `controle-hors-ligne.mjs` ; essai réel : restes O34.

### Chantiers en cours

- `feat/usage-c13-lot1-svg-iwb-ubz` (worktree `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz` @ `c9781d5`, ouvrier
  OE24, cadrage seul commité, aucun code ; `7aca94b` à la contre-relecture) : touchera `apps/web/src/platform/import.ts` (`createImporter`, `ImportDeps`),
  `apps/web/src/app/workspace.ts` (`openBoard` à côté d'`openPdf`), `scripts/verifier.sh` (`--e2e`),
  `scripts/tests/verifier-e2e.test.sh`, `THIRD_PARTY_NOTICES.md`, `apps/web/src/main.ts` (supposé). Nos entrées s'ajoutent
  sans réécrire les siennes (O33).
- PR ouvertes : aucune (`gh pr list --state open`).
- Autre machine : aucun worktree donné par l'orchestrateur.

### Termes cherchés

- Coffre : `chercher.js "RoomBoard Office conversion LibreOffice PDF" 8`, `"processus externe délai profil jetable
  soffice" 6`, `"Tauri coque commande Rust piège plugin" 6` ; `ls 04_Pieges | grep -i "roomboard|tauri|libre|office"`,
  `ls 02_Decisions | grep -i roomboard`.
- Graphe : aucun pour RoomBoard (`ls ~/.cache/graphes/`).
- `grep -n "C16|U35|U34|U23|U24|U26|U39"` dans `docs/plans/usage-cadrage.md` ; `grep -n -i "C16|coque|xls|ods|calamine"`
  dans `usage-c10b-tableau-cadrage.md` ; `grep -n -i "C16|office"` dans `usage-c12-pdf-cadrage.md`,
  `usage-c10b-tableau-etat.md`.
- `grep -rln "importFiles|Importer\b|interface Importer" apps/web/src` ; `grep -rn "openPdf"`, `"fromPdfPages|from_pdf_pages"`,
  `"officeConverter"`, `"requires"`, `"source_asset|sourceAsset|\"source\""`, `"const typed|function typed"`,
  `"toast|aria-live|busy"`, `"IMPORT_BUSY_MESSAGE"`.
- `grep -rn "\.docx|\.pptx|\.doc\"|\.xls\"|\.ods|\.odt|\.ppt\""` dans `apps/web/src`, `scripts`, `crates` : rien.
- `grep -n "fn \|mod tests"` sur `roomboard-shell/src/lib.rs` ; `grep -n "read_backdrop|backdrop_view|BackdropView|PDF_PAGE_KIND"`
  dans `roomboard-core/src` ; `grep -n "cited_by|cited_assets"`.
- `grep -n "^name = \"(libc|windows|tauri-plugin-opener|notify|open|zip)\""` dans les deux `Cargo.lock` ;
  `grep -n "^license"` des `Cargo.toml` de `tauri-plugin-opener-2.7.3`, `open-5.4.5`, `windows-0.62.2` ;
  `grep -n "open_path"` dans `tauri-plugin-opener-2.7.3/src` ; `grep -n "shellexecute|Command::new|powershell"` dans
  `open-5.4.5/src` et `Cargo.toml` ; `grep -n "^license"` de `is-wsl-0.4.0`, `is-docker-0.2.0`, `dunce-1.0.5` ;
  `grep -n "toBackdropView|function backdropView"` dans `apps/web/src/core` ; `grep -n "\.bin|fn extension"` dans
  `roomboard-formats/src/container.rs` ; `git log` de la branche C13.
- `grep -n "soffice|Program Files|Applications|kill|120|UserInstallation"` dans ActCraft `export/src/officeconvert.cpp` ;
  `grep -n "officeconvert|soffice|UserInstallation|LibreOffice|ECMA"` dans `docs/etudes/usage-formats-documents-medias.md`.
- `git worktree list`, `gh pr list --state open`, `git diff --stat origin/main...feat/usage-c13-lot1-svg-iwb-ubz`,
  `grep -n "import.ts|workspace.ts|verifier.sh|THIRD_PARTY|…"` dans le cadrage de C13.
- `soffice --version`, `ls -la /usr/bin/soffice`, `rustup target list --installed` (aucune cible Windows).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Entrée unique, détection | `apps/web/src/platform/import.ts:96-115` (`ImportHandler`), `:261` (`createImporter`) | `ImportHandler { id: "office", nature: "document", detect, run }` et `{ id: "office-web", nature: "document", detect, run }` | étendre |
| En-tête ZIP | `import.ts:146-148` | `hasZipMagic(head)` | réutiliser |
| En-tête CFB, extensions Office | aucun (termes : `CFB`, `D0CF`, `docx`, `pptx`, `office` dans `apps/web/src` : rien) | `platform/office-import.ts` : `OFFICE_EXTENSIONS: readonly string[]`, `isOfficeName(name): boolean` (par `hasExtension`, exporté d'`import.ts:118`), `hasCfbMagic(head): boolean`, `officeHandler(deps: { convert(path: string): Promise<Blob>; /* PDF lu par morceaux, dossier libéré */ open(f: { name: string; original: Blob; pdf: Blob }): Promise<boolean>; sheet?: ImportHandler }): ImportHandler`, `officeWebHandler(): ImportHandler`, `OFFICE_EXPORT_MESSAGE = "exportez en PDF depuis Office"`, `OFFICE_INSTALL_MESSAGE = "installez LibreOffice ou Microsoft Office"` | nouveau module |
| Repli `.xlsx` sans convertisseur | `import.ts:208-228` (`sheetHandler`) | passé à `officeHandler` comme `sheet`, `sheet.run(f, ctx)` | réutiliser |
| Ouvrir le PDF converti | `apps/web/src/app/workspace.ts:396-430` (`openPdf`) | `openPdf(file: { name: string; blob: Blob; original?: Blob })` | étendre |
| Type d'un Blob | `apps/web/src/app/container-io.ts:67` | `typed(blob, mime)` | réutiliser |
| Document des pages | `crates/roomboard-core/src/document.rs:153` | `from_pdf_pages(asset: &AssetRef, sizes: &[(f64, f64)], original: Option<&AssetRef>) -> Result<Self, CommandError>` | étendre |
| Vue du fond | `crates/roomboard-core/src/element.rs:54, 394, 423` | `BackdropView { …, original: Option<String> }` | étendre |
| Liaison | `crates/roomboard-wasm/src/lib.rs:1417` ; `apps/web/src/core/api.ts:397` | `from_office_pages(id, name, mime, size, sizes, original_id, original_name, original_mime, original_size)` ; TS `fromPdfPages(asset, sizes, original?: AssetRef)` | étendre |
| Fichier accordé, lecture par morceaux | `crates/roomboard-shell/src/lib.rs:46-74` ; `apps/web/src/platform/host-tauri.ts:77-101` | `GrantedPaths::granted_path`, `GrantedPaths::grant`, `GrantedPaths::revoke(&self, path: &Path) -> bool` (neuf) ; `grantedFile(ipc, path, size)` pour l'entrée et le PDF converti | réutiliser, étendre |
| Accorder puis émettre un dépôt | `apps/desktop/src-tauri/src/main.rs:113` (`grant_and_emit`) | `grant_and_emit(app, &[copie], None)` pour le réimport | réutiliser |
| Vue du fond côté page | `apps/web/src/core/wasm-core.ts:310` (`toBackdropView`), `fake-core.ts:385` (`backdropView`) | champ `original: string \| null` | étendre |
| Conversion en PDF | aucun (termes : `soffice`, `convert`, `Command::new`, `process` dans `crates/` : rien) | `roomboard_shell::office` : `pub const OFFICE_EXTENSIONS: &[&str]` ; `pub const CONVERT_TIMEOUT: Duration` (120 s) ; `pub enum Converter { LibreOffice(PathBuf), #[cfg(windows)] MsOffice }` ; `pub struct Search { pub path: Option<OsString>, pub known: Vec<PathBuf> }` + `Search::from_env()` ; `pub fn find_converter(s: &Search) -> Option<Converter>` ; `pub fn convert_granted(g: &GrantedPaths, path: &Path, c: &Converter, work_root: &Path, timeout: Duration) -> Result<Converted, ConvertError>` ; `pub struct Converted { pub id: String, pub pdf: PathBuf, pub size: u64 }` (`pdf` accordé dans `g`) ; `pub fn release_conversion(g: &GrantedPaths, work_root: &Path, id: &str)` ; `pub fn ensure_private_dir(p: &Path) -> Result<(), ConvertError>` (0700, propriétaire) ; `pub enum ConvertError { NotOffice, NotGranted, TooLarge, NoProgram, Timeout, Failed(String), NoOutput, Io(String) }` + `code(&self) -> &'static str` ; internes testés : `libreoffice_args(input, outdir, profile) -> Vec<OsString>`, `file_url(&Path) -> String` | nouveau module (DA-O1) |
| Copies d'originaux et relevé | aucun (termes : `watch`, `notify`, `mtime`, `modified` dans `crates/` : rien) | `roomboard_shell::originals` : `pub struct Originals` ; `Originals::new(root: PathBuf)` ; `fn write(&self, name: &str, bytes: &[u8]) -> Result<(String, PathBuf), ConvertError>` ; `pub fn safe_name(name: &str) -> Option<String>` (liste blanche, noms réservés de Windows refusés) ; `fn path_of(&self, id: &str) -> Option<PathBuf>` (pour `reimport_original`) ; `fn changed(&self) -> Vec<(String, PathBuf)>` (relevé taille + date, stable sur deux appels) ; `pub fn purge(root: &Path, older_than: Duration)` | nouveau module (DA-O3, DA-O4) |
| Ouvrir avec l'application du système | crate `open` 5.4.5 (`src/lib.rs:402`, `shellexecute-on-windows`) | `open::that_detached(path)` depuis Rust | réutiliser (dépendance neuve, O36) |
| Commandes minces de la coque | `apps/desktop/src-tauri/src/main.rs:40-56` (`read_granted_file`, `async`, `ipc::Response`) | même patron : `office_converter`, `convert_office(path)` (rend `{ id, pdf, size }`, PDF lu ensuite par `read_granted_file`), `release_conversion(id)`, `open_original` (corps brut), `reimport_original(id)` | étendre |
| Capacité de barre | `apps/web/src/toolbar.ts:25-30` ; `runtime-capabilities.ts:14` | `officeConverter` ; `runtimeCapabilities(staticCaps, env: { tauri; officeConverter? })` | étendre |
| Action de barre | `toolbar.ts:108` ; `toolbar-host.ts:51` ; `toolbar-profiles.ts:36` | `"edit-original": { label: "Modifier dans l'application d'origine" }`, `(t) => t.editOriginal?.()`, `{ …action("edit-original", …), requires: ["officeConverter"] }` | étendre |
| Fabriquer un `.xlsx` de test | `crates/roomboard-formats/src/sheet.rs:332` (privé, tests) | patron recopié dans les tests de `roomboard-shell` (crate différente, test seulement) | réutiliser (patron) |
| Essai navigateur | `scripts/essais/commun.mjs:103, 145` ; `c12-pdf-navigateur.mjs` | `stageBox(page, 640)`, `dropFile(page, "#stage", name, bytes)` | réutiliser |
| Contrôle de configuration | `scripts/controle-hors-ligne.mjs:131` (`checkAssetProtocol`) | `checkOpener(cargoToml, mainRs, capabilities)` | étendre |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **HO1-1** Dans la coque, un `.xlsx` déposé donne des **pages** (conversion), pas un tableau modifiable, quand un
  convertisseur existe ; sans convertisseur, repli sur le tableau (O4). `usage-cadrage.md:600` prévoit les deux chemins,
  le brief tranche pour les pages (décision de l'orchestrateur). Objection du relecteur, maintenue : Q3 (« pouvoir édit
  le contenu ») plaide pour le tableau, seul contenu modifiable dans RoomBoard. Inverser : une ligne d'ordre dans
  `createImporter`.
- **HO1-2** Réimport en **nouvel onglet**, l'onglet d'origine intact (O22) ; l'autre lecture est « remplacer les fonds des
  pages en place », qui casse l'annotation si le nombre de pages change.
- **HO1-3** LibreOffice passe avant Microsoft Office même sous Windows (O6) : avec les deux installés, le rendu est celui
  de LibreOffice, moins fidèle pour un `.pptx` (U35 l'ordonne ainsi).
- **HO1-4** Pendant une conversion (5 à 60 s), seul le curseur d'attente le dit (O25). À juger à la porte visuelle.
- **HO1-5** Bouton « Modifier dans l'application d'origine » dans la barre des pages, masqué sans convertisseur (O19). Les
  profils déjà enregistrés par l'utilisateur ne le gagnent pas (seul le profil par défaut change). Porte visuelle.
- **HO1-6** Libellés : « exportez en PDF depuis Office », « installez LibreOffice ou Microsoft Office », « conversion
  trop longue (plus de 120 s) », « importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages » (O3,
  O4, O14).
- **HO1-7** Sous Windows, la copie ouverte par « Modifier » porte la marque Internet : Office l'ouvre en mode protégé, il
  faut cliquer « Activer la modification » (O20). Prudence choisie contre un `.doc` à macros venu d'un `.roomboard` reçu.

**Niveau 2**

- **HO2-1** `.odt`, `.ods`, `.odp` et `.xlsm` inclus (O1) : cités par le cadrage de l'usage (`:599-601`), pas par le brief.
- **HO2-2** Effet réel des six valeurs de `registrymodifications.xcu` (macros, liens, recalcul) non mesuré sur
  LibreOffice 26.2 (O10) : le test prouve qu'elles sont écrites, pas que LibreOffice les applique.
- **HO2-3** Une conversion à la fois (O12).
- **HO2-4** Copies d'originaux gardées 7 jours dans le dossier cache, jamais supprimées à la sortie (O23).
- **HO2-5** COM : au délai, le processus Office lancé par nous est tué par son PID ; une instance de PowerPoint déjà ouverte
  par l'utilisateur n'est jamais tuée (O13). Essai sur le PC. Limite connue : une instance ouverte par l'utilisateur pendant la conversion (donc absente de la liste d'avant) peut être tuée au délai ; à vérifier sur le PC.
- **HO2-6** Le PDF converti n'a pas de plafond propre (seule l'entrée est bornée à 100 Mio, O14) ; lu par morceaux (O35).
- **HO2-7** Relevé toutes les secondes, changement stable sur deux relevés (O21).
- **HO2-8** Tests `soffice` exigés par défaut, sautés seulement par `ROOMBOARD_SANS_SOFFICE=1` dit sur `stderr` (O26).
- **HO2-9** LibreOffice accepte un `.pptx` minimal fabriqué à la main (présentation, 2 diapositives, mise en page, masque,
  thème) ; sinon le test le fabrique par LibreOffice depuis un `.fodp` texte (O27).
- **HO2-10** « Insérer des pages » d'un document converti emporte l'original (`copy.rs:94`, supposé, à tester).
- **HO2-11** Les commandes minces de `main.rs` ne sont pas compilées sur la VM (aucun build Tauri) : compilées au premier
  essai de plateforme.
- **HO2-13** Course de l'objet Job sous Windows : un enfant lancé par `soffice.exe` avant l'affectation échappe au Job
  (O11). Essai sur le PC : délai provoqué, aucun `soffice.bin` restant.
- **HO2-14** Sous Linux, `xdg-open` est lui-même un script : lancé comme programme, le chemin en argument, jamais une
  ligne de commande assemblée (O36).
- **HO2-12** Un fichier Office protégé par mot de passe échoue ou atteint le délai sous LibreOffice sans interface : message
  générique, pas de message « chiffré ».

## 5. Décisions d'architecture

**DA-O1 — La conversion vit dans `roomboard-shell`.**
Contexte : il faut une logique de processus testable sans Tauri, et `src-tauri` est hors du workspace (build de 7,5 Go).
Décision : modules `office` et `originals` de `roomboard-shell` ; `main.rs` ne fait qu'appeler, en `spawn_blocking`.
Conséquences : `cargo test --workspace` prouve la conversion réelle sur la VM ; `roomboard-shell` gagne `libc` et
`windows` (par cible) ; une crate à part ne se justifie pas tant que la coque reste la seule cliente.

**DA-O2 — L'original est référencé par le fond de page (`original`).**
Contexte : seuls les assets cités dans les pages sont enregistrés (U4) ; une métadonnée de document ne serait pas relevée.
Décision : clé facultative `original` dans chaque fond `pdf-page` d'un import Office, posée par `from_pdf_pages`.
Conséquences : aucune règle d'enregistrement neuve, la copie de pages l'emporte, un ancien lecteur l'ignore ; une page
supprimée seule garde l'original tant qu'une autre page le cite.

**DA-O3 — Surveillance en Rust par relevé, pas par `watch` du plugin `fs`.**
Contexte : le brief cite `watch` du plugin `fs`, noté S dans le cadrage de l'usage ; il exigerait `fs:allow-watch` et une
portée de la page sur un dossier temporaire, contre U24.
Décision : la coque relève taille et date des seules copies qu'elle a écrites, et émet un événement.
Conséquences : aucune permission neuve, testable hors Tauri, robuste aux enregistrements par renommage ; une seconde de
latence ; réversible sans toucher la page.

**DA-O4 — L'original s'ouvre depuis Rust, après contrôle.**
Contexte : le nom et les octets d'un asset viennent du document, qui peut venir d'ailleurs ; `open` lance ce que le
système associe à l'extension.
Décision : écriture par la coque dans son dossier cache (0700, propriétaire vérifié), nom par liste blanche, noms réservés
de Windows refusés, extension Office et en-tête ZIP ou CFB exigés, `open::that_detached` (ShellExecuteW sous Windows) en
Rust, aucune permission pour la page, marque Internet sous Windows.
Conséquences : un `.roomboard` piégé ne lance jamais un exécutable ; la page ne peut rien ouvrir d'autre.

**DA-O5 — Au délai, l'arbre de processus entier est tué.**
Contexte : `soffice` est un lanceur ; tuer sa racine laisse `soffice.bin` vivant (piège du coffre, arbres orphelins).
Décision : groupe de processus sous Unix (`process_group(0)`, `kill(-pgid)`), objet Job sous Windows, puis `wait()`.
Conséquences : un test le prouve sur la VM avec un faux programme qui lance un enfant ; la branche Windows est prouvée
par lecture, puis par l'essai sur le PC.

## 6. Scénarios d'acceptation

Jouables sur la VM (S1 à S5), puis restes de plateforme (R1 à R3).

- **S1 — Conversion réelle.** `cargo test -p roomboard-shell office` : le test fabrique `cours.docx`, `diapos.pptx` (2
  diapositives), `notes.xlsx`, les convertit par `/usr/bin/soffice` : trois PDF qui commencent par `%PDF-`, 2 pages pour
  le `.pptx` ; après chaque conversion, le PDF est lu par l'accord puis `release_conversion` : aucun dossier ne reste sous `conversions/` du test, et
  le profil écrit portait les six valeurs d'O10.
- **S2 — Délai et sécurité.** Un faux convertisseur qui lance un enfant puis dort : avec un délai de 2 s, l'erreur
  `Timeout` arrive en moins de 4 s, ni lui ni son enfant ne vivent encore, le dossier est supprimé. Puis, un cas chacun :
  nom hostile (`-x; $(touch pwn).docx`) sans effet sur les arguments ; sortie `source.pdf` en lien symbolique refusée ;
  `convert_granted` sur un fichier non accordé : `NotGranted`, aucun processus lancé ; fichier de plus de 100 Mio :
  `TooLarge` ; racine de travail en lien symbolique ou à un autre propriétaire refusée ; `safe_name("CON.docx")` refusé,
  `safe_name("a/../b<>.docx")` assaini ; extension `.exe` refusée par `Originals::write` ; aucun programme : `NoProgram`.
- **S3 — Web.** Ouvrir l'application dans Chromium (1280 × 900), déposer `cours.docx` puis `diapos.pptx` : deux avis
  « <nom> : exportez en PDF depuis Office », aucun élément ni onglet ajouté ; déposer `valeurs.xlsx` : un tableau en
  valeurs ; enregistrer, rouvrir le `.roomboard` : le tableau est là ; la scène mesure au moins 640 px de haut ; le
  bouton « Modifier dans l'application d'origine » n'est pas dans la barre.
- **S4 — Pages d'un `.pptx` converti.** `cargo run -p roomboard-shell --example convertir_office -- diapos.pptx
  /tmp/c16/diapos.pdf` sur la VM, puis déposer ce PDF dans le navigateur : nouvel onglet de 2 pages à fond `pdf-page` ;
  capture `docs/essais/c16-pptx-libreoffice.png`.
- **S5 — Coque simulée et aller-retour.** Tests de l'interface avec de faux ports de coque : déposer `cours.docx` avec un
  chemin ouvre `cours.roomboard` dont chaque fond porte `original` ; enregistrer puis rouvrir : l'original est dans
  `assets/` avec la même empreinte et le fond garde `original` ; « Modifier dans l'application d'origine » envoie le nom
  (en-tête) et les octets bruts de l'original ; l'événement de modification pose la question, « oui » appelle `reimport_original(id)` (aucun chemin envoyé par la
  page), et le dépôt émis par la coque ouvre un second onglet ; un
  `.roomboard` d'avant C16 (document PDF de C12) s'ouvre comme avant ; sans convertisseur, `notes.xlsx` donne un tableau
  et l'avis.

Restes de plateforme (après un build de la coque, un seul à la fois) :

- **R1 — Linux.** Coque construite : déposer `diapos.pptx` (2 pages), « Modifier dans l'application d'origine » ouvre
  LibreOffice Impress, enregistrer : la question arrive, « oui » ouvre un nouvel onglet.
- **R2 — Windows (file d'attente du PC).** Avec LibreOffice, puis avec Microsoft Office seul (COM) : `.docx`, `.xlsx`,
  `.pptx` convertis ; délai provoqué sans processus Office restant ; « Modifier » ouvre Word en mode protégé, enregistrer,
  réimporter ; sans aucun des deux : « installez LibreOffice ou Microsoft Office ».
- **R3 — macOS.** `LibreOffice.app` trouvé par son chemin connu (PATH minimal d'une application lancée du Finder) ;
  conversion et « Modifier » dans LibreOffice.

## 7. Hors périmètre

- Import en objets éditables (ECMA-376) ; rendu fidèle sur le web ; iPad et Android (message seulement là où la page
  tourne).
- `.csv` en valeurs ; `.xls`, `.ods` en valeurs sur le web (C10b F25) ; `.docm`, `.pptm`, `.dotx`, `.potx`.
- Association de fichiers Office à RoomBoard dans le système.
- Remplacement en place des pages au réimport (HO1-2) ; synchronisation de l'annotation entre l'ancienne et la nouvelle
  version.
- LibreOffice embarqué ou installé par RoomBoard ; conversion côté serveur (D27, hors ligne).
- Code du chantier C13 (`feat/usage-c13-lot1-svg-iwb-ubz`) : ses entrées du registre d'importeurs ne sont pas touchées.

## 8. Portes immédiates

Aucune.
