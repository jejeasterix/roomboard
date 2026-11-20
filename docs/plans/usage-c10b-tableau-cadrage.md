# Cadrage — usage-c10b-tableau (C10b : tableau, fusion, ombrage, imports)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme. Ce cadrage court **cite** U32
(`docs/plans/usage-cadrage.md:85`), U35 « Excel en données » (`:88`), U23 (`:76`), U26 (`:79`), U39 (`:92`), DAU10
(`:403-408`), HU2-7 (`:313-314`) et S11 (`:448-450`, partie C10b) sans les refaire ; il **étend** C10a
(`docs/plans/usage-c10a-tableau-cadrage.md`, T1 à T15, DAC1 à DAC6) et le dépôt de C2 (`usage-c2-depot-cadrage.md`).
Il ne tranche que les détails (F1 à F33). Base : `origin/main` `425d617` (socle, C1, C2, C7, C9, C10a fusionnés).
Aucun graphe graphify pour RoomBoard (`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : recherche
texte seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision RoomBoard ni tableau dans `02_Decisions`,
aucun piège applicable. Étude citée : `docs/etudes/usage-grille-tableau.md` (§ 3.3, § 5.1, § 5.3, § 5.4), rang 2.
Mesure faite pour ce cadrage (F26) : projet jetable `/tmp/mesure-calamine-c10b`, hors dépôt, rien écrit dans le worktree.

## 1. Demande et gabarit

**Demande.** Fusionner et diviser des cellules, poser sur une cellule un ombrage qu'un toucher révèle, coller un
`<table>` HTML qui devient un tableau, importer un `.xlsx` en valeurs par le dépôt de fichiers de C2, le tout gardé à
l'aller-retour `.roomboard`.

**Gabarit.** `chantier`, cadrage court demandé : budget 40 questions, 33 consommées (F1 à F33).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| F1 | Forme de la fusion dans le fichier | Sur la cellule **d'ancrage** (en haut à gauche) seulement : `span` = `Any::Array` positionnel de **deux chaînes** `[<id de la dernière ligne>, <id de la dernière colonne>]` de la zone fusionnée (U3 : tableau positionnel de scalaires, jamais `Any::Map`). Les cellules couvertes **n'ont pas** de `mergedInto` écrit : la couverture se déduit des `span` à la lecture (une donnée dérivée écrite deviendrait fausse dès qu'une ligne s'insère dans la zone). Un `mergedInto` lu (fichier d'une autre version) est ignoré et gardé. Une plage par ids (et non des comptes) suit les lignes insérées, comme le demande l'étude (§ 5.3 : « `span` exprime des plages d'identifiants »). `schema` et `formatVersion` restent 1. | U32 (`span \| mergedInto`) ; étude § 5.1, § 5.3 ; U3 (`usage-cadrage.md:56`) ; DAU10 | oui jusqu'à la release (HB-1, DAB1) |
| F2 | Règle déterministe de lecture (DAU10 : « règle déterministe à écrire au chantier ») | Les ancres sont parcourues dans l'ordre de lecture (rang de ligne, puis de colonne). Un `span` est retenu si : ses deux ids désignent une ligne et une colonne lisibles, de rang ≥ celui de l'ancre ; la zone compte au moins 2 cellules ; elle ne recoupe aucune zone déjà retenue. Sinon il est ignoré (gardé dans le document) et la cellule se lit comme une cellule simple. Même règle dans `fake-core.ts` (parité, D36). Les fusions sont calculées **par le cœur** et rendues dans la vue (F29) : la page ne recode pas la règle. | DAU10 (`:408`) ; étude § 5.3 ; DAC6 de C10a (« passer au cœur si C10b la complique ») | oui |
| F3 | Fusionner | Commande `MergeTableCells{ id, from: (row, col), to: (row, col) }` (ids ; rectangle normalisé par les rangs). Refus `BadTable` : moins de 2 cellules, ligne ou colonne inconnue, rectangle qui **recoupe en partie** une fusion existante (la page élargit la plage avant, F14). Effet, une transaction : les fusions entièrement dedans sont dissoutes ; l'ancre garde son texte, son `fill` et son `shade` ; les cellules couvertes sont **retirées** de `cells` (texte, `fill`, `shade`) : « le contenu en haut à gauche reste », ce qui est perdu se retrouve par l'annulation. Aucun avertissement. | U32 (« le contenu en haut à gauche reste ») ; étude § 3.3, § 5.1 (« ce qui est perdu à la fusion se retrouve par l'annulation ») | oui (HB-2) |
| F4 | Diviser | `SplitTableCell{ id, row, col }` sur une ancre : retire `span` ; le contenu reste dans la cellule en haut à gauche, les autres sont vides. Cellule qui n'est pas une ancre retenue → `BadTable`. **Diviser = défusionner** : couper une cellule simple en plusieurs (SMART « division en lignes ou colonnes ») n'est pas fait. | U32 (« division ») ; étude § 3.3 (« contenu en haut à gauche ») | oui (HB-3, HB-21) |
| F5 | Insertion de ligne ou de colonne et fusion | Aucune garde : une ligne insérée **entre** l'ancre et la fin d'une zone l'agrandit (conséquence directe de F1, comme Excel). « + Ligne » sur une cellule fusionnée active ou une plage insère **après** sa dernière ligne (« + Colonne » : après sa dernière colonne). Écart assumé à HU2-7 (« une insertion dans une fusion est refusée par l'interface ») : HU2-7 visait des plages instables en concurrence ; avec F1 et F2 l'issue est déterministe et un bouton grisé de plus deviendrait inutile. | HU2-7 (`usage-cadrage.md:313`, hypothèse à revoir) ; étude § 5.3 (« agrandit la fusion ») | oui (HB-7) |
| F6 | Suppression de lignes ou colonnes et fusion | `RemoveTableLine` gagne `to: Option<String>` (dernière ligne, comprise, dans l'ordre des rangs) : une plage se retire en **une** étape ; refus `BadTable` s'il ne resterait aucune ligne. « − Ligne » retire les lignes de la plage ou de la cellule fusionnée active. Dans la même transaction, pour chaque fusion touchée : ligne d'ancrage retirée → `span` reporté sur la première ligne restante de la zone (le contenu de l'ancre part avec sa ligne) ; dernière ligne retirée → `span` ramené à la dernière ligne restante ; zone réduite à une cellule → `span` retiré ; toute la zone retirée → plus rien. Même règle pour les colonnes. | DAU10 ; T3 de C10a (`RemoveTableLine`) ; F2 | oui (HB-20) |
| F7 | Hauteur de ligne et fusion | `SetTableCell.row_height` devient « hauteur exigée par la cellule » : sur une ancre qui couvre plusieurs lignes, le cœur agrandit la **dernière** ligne de la zone jusqu'à ce que la somme atteigne la hauteur exigée (jamais de réduction, DAC2). La page mesure à la largeur de la zone (somme des colonnes). `rowHeightsFor` (Uniformiser) tient compte des zones de la même façon. | DAC2 de C10a ; T5, T11 de C10a | oui |
| F8 | Ombrage dans le fichier | Clé `shade` de la cellule = **couleur** `#rrggbb` (ombrage opaque) ; absente = pas d'ombrage ; valeur invalide → ignorée, gardée. Sur une ancre, l'ombrage couvre toute la zone. Distinct de `fill` (U32). L'ombrage **ne bloque pas** la structure : il suit sa cellule par son id. | U32 (« ombrage révélable (`shade`) […] ne bloque pas la structure ») ; étude § 5.1 (« couleur ou masque opaque ») | oui jusqu'à la release |
| F9 | Poser, retirer, révéler | `SetTableShade{ id, from: (row, col), to: (row, col), shade: Option<String> }` : sur toutes les cellules (ancres) du rectangle, une transaction ; rien à changer → aucune transaction (D38). « Ombrer » (couleur F13), « Retirer l'ombrage » et la révélation (F10) passent par elle. « Ombrer une colonne » (S11) = choisir la plage de la colonne (F14) puis « Ombrer ». | U32 ; S11 (`usage-cadrage.md:449`, « ombrer une colonne ») ; D11, D38 | oui |
| F10 | Qui révèle | **Outil Sélection** : un toucher sans glisser (< `DRAG_THRESHOLD_PX`, 2 px écran), sans Maj, dont l'élément le plus haut (`hitTest`) est un tableau et dont la cellule sous le point porte un ombrage → `SetTableShade` à `None` sur cette cellule, une étape ; la sélection n'est pas changée. Un glisser garde son effet (sélection, déplacement). Les autres outils ne révèlent rien (le stylo écrit sur l'ombrage, l'outil Tableau ouvre la cellule). RoomBoard n'a pas de mode « présentation » : l'outil Sélection en tient lieu. | U32 (« retiré d'un toucher en présentation ») ; S11 ; `engine/tools/select.ts:116-141` (sélection au `begin`) | oui (HB-4) |
| F11 | Ombrage pendant l'édition | Toujours dessiné **opaque**, quel que soit l'outil (jamais transparent pour l'enseignant : l'outil actif pendant la classe ne doit pas montrer la réponse). L'outil Tableau ouvre une cellule ombrée : la zone de saisie (fond opaque, HC10-10) montre son texte le temps de l'édition. | étude § 5.1 (« couvre le contenu ») ; HC10-10 | oui |
| F12 | Ombrage révélé et rechargement | La révélation est une modification du document : elle s'annule (Ctrl+Z, S11 « annuler : il revient ») et s'enregistre ; rouvrir un fichier enregistré après révélation montre la cellule révélée. Aucune action « remettre tous les ombrages ». | S11 ; étude § 5.1 (« écriture `shade = null` ») | oui (HB-5) |
| F13 | Apparence de l'ombrage | Fond opaque `#94a3b8` puis hachures à 45° `#cbd5e1`, trait 2 unités, pas 16 unités, découpées à la cellule (ou à la zone fusionnée) ; les traits du tableau restent par-dessus. Une seule couleur proposée (le fichier en garde une par cellule). **Choix visuel, à l'essai** (porte visuelle de fin de lot). | design existant : palette claire de C10a (`toolbar.ts:134`, T12) ; principes `impeccable` (contraste net avec `fill`) | oui (HB-6) |
| F14 | Plage de cellules (outil Tableau) | **Glisser** d'une cellule à une autre du même tableau = plage (aucune saisie ouverte) ; **Maj+clic** = plage de la cellule active au point ; plage élargie jusqu'à contenir entièrement chaque fusion qu'elle touche (fonction pure de `table-geom.ts`). La plage est montrée par `EditOverlay.frame` (rectangle réuni, sous la matrice du tableau). Échap, changement d'outil ou de page, `prune` : plage retirée. **Changement de C10a** : un clic sans glisser ouvre la saisie au **relâché** (au lieu de l'appui) pour distinguer clic et glisser ; le reste de T7 est inchangé. | T7 de C10a (« pas de sélection de plage (C10b ou plus tard) ») ; S11 (« fusionner deux cellules ») ; `render/overlay.ts:25` | oui (HB-12) |
| F15 | Boutons | Quatre actions dans la rangée du tableau (DAC4), après les cinq de C10a : `table-merge` « Fusionner », `table-split` « Diviser », `table-shade` « Ombrer », `table-unshade` « Retirer l'ombrage » ; grisées par `ACTION_STATE` (`Fusionner` : plage d'au moins 2 cellules ; `Diviser` : cellule active fusionnée, sans plage ; `Ombrer` : une cellule active ; `Retirer` : au moins une cellule ombrée dans la plage). Hors du catalogue de l'éditeur de profil, comme les cinq de C10a (`TABLE_ACTIONS`, `profile-edit.ts:112`). Les pastilles de remplissage s'appliquent à la plage : `SetTableFill` gagne `to: Option<(row, col)>`. Suppr : cellule active seulement (C10a, inchangé). | DAC4 de C10a (modifiée à la clôture) ; `toolbar.ts:115-130` ; `item-state.ts:28-32` ; `Toolbar.tsx:111-130` | oui (HB-19) |
| F16 | Navigation et cellule sous le point | `cellAt` rend l'**ancre** d'une cellule couverte ; Tab et Maj+Tab sautent les cellules couvertes (ordre de lecture des ancres et cellules simples) ; flèches depuis une zone : → vers la colonne après sa fin, à la ligne de l'ancre, ↓ vers la ligne après sa fin, à la colonne de l'ancre ; arrivée sur une cellule couverte → son ancre. Tab dans la dernière cellule (dans l'ordre de lecture) ajoute une ligne (T8, inchangé). | T8 de C10a ; `table-geom.ts:42`, `:85` | oui |
| F17 | Annulation | Une étape par commande : fusion, division, ombrer ou retirer (toute la plage), chaque révélation, suppression d'une plage de lignes, remplissage d'une plage, chaque collage ou import (le tableau entier avec son contenu). | D11, D38 ; T9 de C10a ; S11 | oui |
| F18 | Créer un tableau rempli | Nouvelle commande `ImportTable{ page, matrix, col_width, row_heights: Vec<f64>, cols: u32, cells: Vec<String> (rangées bout à bout, `rows × cols`), merges: Vec<[u32; 4]> (rang de ligne, rang de colonne, lignes, colonnes), color, size }` : une transaction ; ids neufs ; textes vides non écrits ; textes des cellules couvertes ignorés ; fusions écrites en `span` (F1). Refus `BadTable` : dimensions hors 1..=64, longueurs incohérentes, fusion hors du tableau, d'une seule cellule ou qui en recoupe une autre, tailles non finies, couleur invalide. Le corps d'écriture est **partagé** avec `AddTable` (une fonction d'écriture, deux commandes). Plus `AddTable` reste tel quel. | DAU10 (« une commande par opération de structure ») ; T3 de C10a ; `table.rs:343` (`cmd_add_table`) | oui (DAB3) |
| F19 | Collage HTML : entrée et sécurité | Au `paste` de la fenêtre (cible non éditable, `isEditable`), si `text/html` contient un `<table>` : il **passe avant** les fichiers image du presse-papiers (Excel joint aussi une image, supposé, HB-9) et donne un tableau ; sinon le collage d'image de C2 est inchangé. Lecture par `DOMParser` (`text/html`) : document **inerte** (aucun script exécuté, aucune ressource chargée), seuls `rows`, `cells`, `rowSpan`, `colSpan` et le texte sont lus ; aucun nœud n'est adopté ni inséré dans la page, aucun `innerHTML` n'est écrit. Plus de 8 Mio de caractères : refusé avec le message « tableau trop gros pour être collé ». Le collage crée **toujours** un nouveau tableau (jamais dans un tableau existant). | U35 (« collage d'un `<table>` HTML (Excel, Word) → tableau ») ; étude § 5.4 ; `platform/paste.ts:20` ; `main.ts:108-116` ; CSP de la coque (`tauri.conf.json:13-22`) | oui (HB-9, HB-18) |
| F20 | HTML → grille | Premier `<table>` qui a au moins une ligne ; lignes dans l'ordre de `HTMLTableElement.rows` ; grille par l'algorithme d'occupation du modèle de tableau HTML (une case déjà prise par un `rowspan` est sautée) ; `rowspan`/`colspan` > 1 → fusion (F1), `rowspan="0"` → jusqu'à la fin du tableau ; fusion qui en recouperait une autre (HTML mal formé) → ignorée. Texte : `<br>` et fin de `<p>`, `<div>`, `<li>`, `<tr>` d'un tableau imbriqué → saut de ligne ; blancs repliés comme le HTML ; espace insécable → espace ; bords rognés ; tableau imbriqué aplati en texte. Texte seul : ni couleurs, ni gras, ni largeurs. | étude § 5.4 (« lignes, colonnes, fusions (`rowspan`, `colspan`) ») | oui (HB-18) |
| F21 | Taille et place d'un tableau collé ou importé | Colonnes à `TABLE_COL_WIDTH` (240), lignes à la hauteur exigée par leur texte (`rowHeightsFor`, au moins `TABLE_ROW_HEIGHT`), texte de la couleur du stylo et taille 36 (T4). Matrice par `placement` de l'import d'image : réduit (jamais agrandi) à 80 % du visible, centré au point de dépôt ou au centre de la vue (collage), décalé en cascade. Rien n'est sélectionné après. | T4 de C10a ; `image-import.ts:194`, `:204`, `:212` (R4, R5) | oui (HB-11) |
| F22 | Plafonds | 64 lignes × 64 colonnes (`MAX_TABLE_LINES`) : au-delà, le tableau est **tronqué** et un message le dit (« <nom> : tableau limité à 64 lignes et 64 colonnes (le fichier en a <L> × <C>) » ; collage : sans nom). Texte d'une cellule coupé à 2 000 caractères (suivi de « … »), un seul message. HTML collé : 8 Mio de caractères (F19). Classeur : 100 Mo sur le web (U26, déjà contrôlé par `importFiles`) ; parties lues en entier par `calamine` (`xl/sharedStrings.xml`, `xl/styles.xml`, `xl/workbook.xml`) refusées au-delà de 64 Mio décompressés **déclarés** (garde contre une bombe ZIP), avec le message « classeur trop gros pour un import en valeurs ». | U26 (`:79`) ; T4 de C10a (64) ; `table.rs:25` | oui (HB-13) |
| F23 | Lecture du `.xlsx` | `calamine` 0.38 (MIT), `default-features = false` (ni `chrono` ni `dates`), lecteur `Xlsx` seul (pas `open_workbook_auto` : +154 Ko, F26). **Première feuille visible** dans l'ordre du classeur (`sheets_metadata`, `SheetVisible::Visible`), à défaut la première. Lecture en flux (`worksheet_cells_reader`, arrêt après 64 lignes) ; rectangle utilisé (lignes et colonnes vides de tête retirées, de queue aussi) ; fusions de la feuille (`worksheet_merge_cells`) gardées si entièrement dans le rectangle gardé. Valeurs calculées seulement (le `<v>` des formules) : ni formules, ni styles, ni images. Code dans `roomboard-formats` (`sheet.rs`), testé en natif. | U35 (« valeurs de la première feuille par `calamine` (MIT) dans `roomboard-formats` ») ; U23 ; brief | oui (HB-14 à HB-16) |
| F24 | Valeurs Excel en texte | Entier : chiffres tels quels ; nombre : 15 chiffres significatifs au plus, zéros de fin retirés, **virgule** décimale, sans séparateur de milliers ; booléen : `VRAI` / `FAUX` ; date : `JJ/MM/AAAA` ; date et heure : `JJ/MM/AAAA HH:MM` (`:SS` si non nulles) ; heure seule : `HH:MM` (`:SS`) ; durée : `H:MM:SS` ; dates ISO (`t="d"`) : même forme ; erreur : son code tel que l'écrit le fichier (`#DIV/0!`, `#N/A`, `#NAME?`…) ; texte : tel quel, `\r\n` → `\n`. Les formats d'affichage (pourcentage, monnaie, nombre de décimales) ne sont **pas** appliqués. Dates par `ExcelDateTime::to_ymd_hms_milli` (disponible sans `chrono`, calendrier 1904 compris). | U35 (« valeurs ») ; interface en français (socle) ; `calamine-0.38.0/src/datatype.rs` (lu) | oui (HB-8, HB-17) |
| F25 | `.xls`, `.xlsb`, `.ods`, `.csv` | **Hors périmètre** : refusés comme aujourd'hui (« format pris en charge dans une prochaine version »). Conflit dans le cadrage de l'usage, même rang, même date : U35 et le résumé des formats (`:600`, « `.xlsx`, `.xls`, `.ods`, `.csv` : valeurs → tableau ») ; U35 (« Web, iPad : `.xlsx` en valeurs seulement ») est suivi, le point est **à revoir**. Raisons : aucun fichier `.xls`/`.ods` d'exemple ni moyen de les fabriquer en test sans écrivain, `.csv` demande séparateur et encodage à deviner, `open_workbook_auto` coûte +154 Ko. | U35 (`:88`) ; `usage-cadrage.md:600` ; mesure F26 ; `~/telechargements-roomboard/INVENTAIRE.md:84-90` (trois `.xlsx` seulement) | oui (HB-10) |
| F26 | Poids du module `formats` | Mesuré (projet jetable, même profil `release` `opt-level = "s"`, `lto`, `codegen-units = 1`, `wasm-bindgen --remove-name-section`) : module seul 303 511 o, avec `calamine` (`Xlsx`, lecture d'une feuille) 714 815 o, soit **+411 304 o** ; avec `open_workbook_auto` 868 525 o (+565 014 o). Module `formats` actuel servi : 385 454 o (`apps/web/dist/assets`) ; attendu après C10b ≈ 800 Ko, sous le plafond de 3 Mio (`verifier.sh:68`), **inchangé**. Module principal : seules les commandes F3-F9, F18 s'y ajoutent (`calamine` n'y entre pas : `cargo build -p roomboard-wasm` n'unifie pas les features de `zip` avec celles de `calamine`) ; plafond 1 572 864 o (H2-13) ni baissé ni relevé ; 953 883 o aujourd'hui. Le plan relève les deux tailles avant et après dans le rapport. | brief (« mesure la taille que `calamine` ajouterait […] et tranche ») ; `verifier.sh:53-71` ; H2-13 | oui |
| F27 | Licences | Crates ajoutés (relevé `Cargo.lock` du projet jetable) : `calamine` MIT, `quick-xml` MIT, `simd-adler32` MIT, `encoding_rs` (Apache-2.0 OR MIT) AND BSD-3-Clause, `byteorder` Unlicense OR MIT, `zopfli` Apache-2.0 (tiré par la feature `deflate` de `zip` qu'exige `calamine` ; inutilisé, éliminé par `lto`), `atoi_simd`, `codepage`, `core_detect` (`MIT/Apache-2.0`, lu `OR` par `controle-licences.mjs:26`), `debug_unsafe`, `fast-float2`, `log`, `multiversion_no_op`, `simdutf8` (MIT OR Apache-2.0). Toutes permises (U39, `controle-licences.mjs:16-19`), aucune exception à écrire. `THIRD_PARTY_NOTICES.md` gagne une section « Crate `roomboard-formats` (C10b) » et les textes exigés (MIT de `calamine`, `quick-xml`, `simd-adler32` ; BSD-3-Clause des données d'`encoding_rs`). | U39 (`:92`) ; `THIRD_PARTY_NOTICES.md` ; `scripts/controle-licences.mjs` | oui |
| F28 | Où le classeur se lit | Dans un **Worker jetable** par import (`platform/sheet-worker.ts`), qui charge sa propre instance du module `formats`, lit, répond, puis est arrêté. Raison : un `panic` de `calamine` sur un fichier malformé arrête l'instance Wasm (`panic = abort` en `wasm32`) ; dans la page, il casserait l'instance qui **enregistre** le `.roomboard` (`createPageCodec`, gardée jusqu'au rechargement, HR6), et le travail ne s'enregistrerait plus. Le conteneur reste dans la page (C2). U23 prévoyait déjà ces lectures « en Worker ». Entrée : gestionnaire `sheet` du registre de `importFiles` (nature `objet`), détecté par l'extension `.xlsx` ou `.xlsm` **et** l'en-tête ZIP `PK\x03\x04` ; échec : « Import impossible (<nom>) : <message> » ; feuille vide : « <nom> : la première feuille est vide ». | U23 (`:76`, « en Worker, chargé au premier besoin ») ; DAR1, R10 de C2 (`container.ts:1-4`, « un Worker pourra le servir ») ; `import.ts:91` (registre) | oui (DAB4) |
| F29 | Vue et contrat de la page | `TableView` (cœur) et `TableData` (TS) gagnent `merges: [{ row, col, rows, cols }]` (ancre par ids, étendue en rangs, après F2) ; `TableCellView`/`TableCell` gagnent `shade: Option<String>` / `string \| null` ; une cellule qui n'a qu'un ombrage est listée. `TableCellState` gagne `range` (rangs, ou null), `merged`, `shaded` ; `#stage[data-table]` garde sa forme de C10a sans plage (`<c>x<l>@<r>,<c>`) et devient `…@<r>,<c>-<r2>,<c2>` avec une plage ; deux attributs neufs `data-table-merges` et `data-table-shades` (nombre de fusions et de cellules ombrées du tableau actif) pour l'essai. `fake-core.ts` : parité complète (F2, F3-F9, F18). | T13 de C10a ; D36 ; `stage-tags.ts:12-22` | oui |
| F30 | Versions sans C10b | Un fichier C10b ouvert par `main` `425d617` (C10a) : fusions ignorées (cellules dessinées séparées : l'ancre garde le texte, les couvertes sont vides), **ombrages ignorés (réponses visibles)**, clés gardées et réécrites telles quelles (`c10b_keys_are_ignored_and_kept`, `table.rs:820`). Aucune release publiée. Test « recharger garde les octets » d'un tableau avec fusion et ombrage (U3, `span` est une valeur composée), plus une fixture `tableau-fusion-ombrage.roomboard` régénérée par `ROOMBOARD_REGENERER_FIXTURES=1`. | U3 ; HC10-12 de C10a ; `crates/roomboard-core/tests/fixtures/` | oui |
| F31 | Essai navigateur et capture | Nouveau `scripts/essais/c10b-tableau-navigateur.mjs` (patron de `c10a-tableau-navigateur.mjs`), ajouté au bloc `--e2e` de `verifier.sh` et à `verifier-e2e.test.sh:13` ; scénarios S1 à S4 ; capture `docs/essais/c10b-tableau-fusion-ombrage.png` (avec `--captures` seulement, jamais par `verifier.sh`). Collage simulé par un `ClipboardEvent("paste")` portant un `DataTransfer` `text/html` (le presse-papiers réel d'Excel reste une fiche de plateforme). `coqueCsp()` est **exportée** de `commun.mjs` et les quatre essais l'importent (ferme le constat `architecture-constats.md`, `c10a-tableau-navigateur.mjs:27`). | brief (preuve exigée) ; T15 de C10a ; constat ouvert « coqueCsp() existe en trois copies » | oui |
| F32 | Fichiers d'exemple | Aucun fichier de `~/telechargements-roomboard/` n'entre au dépôt. Les tests fabriquent leurs classeurs : un `.xlsx` synthétique écrit par un test Rust avec `zip` (déjà en dépendance) dans `crates/roomboard-formats/tests/fixtures/valeurs.xlsx`, régénérable par `ROOMBOARD_REGENERER_FIXTURES=1`, lu aussi par le test de contrat TS et par l'essai S4. Un test `#[ignore]` lit les trois `.xlsx` d'exemple **s'ils existent** (première feuille sans erreur, plafonds tenus), lancé à la main. | brief (« jamais commités ; les tests fabriquent leur fichier ») ; INVENTAIRE `:84-90` ; patron `tableau-4x3.roomboard` | oui |
| F33 | C7b en parallèle | Le texte des cellules reste brut (C10a) ; F18 écrit des `Y.Text` sans attribut ; rien de C10b ne lit ni n'écrit d'attribut de plage. Fichiers en commun avec C7b (supposés : C7b n'a ni cadrage ni commit) listés en § 3 ; le second des deux à fusionner rebase sur `origin/main` avant sa fusion (piège de l'état). | brief ; `usage-c7b-texte-riche-etat.md` (étage 0, aucun commit) ; état `usage-c10b-tableau-etat.md` (Pièges) | oui |

## 3. Carte d'impact

Rubriques déduites (le profil n'a pas de ligne « Surfaces d'impact ») : cœur, liaison Wasm principale, module `formats`,
contrat de la page, moteur et rendu, application et barre, plateforme (collage, import), essais et scripts, licences,
tests, autres dépôts. Chemins de `main` `425d617`, lus sauf mention S.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/table.rs:1-7` (en-tête), `:40-56` (`TableCellView`, `TableView`) | oui | `shade`, `merges` (F29) | V |
| `src/table.rs:120` (`read_raw`), `:157` (`read_cell`), `:190` (`view`) | oui | lecture de `span` et `shade`, règle F2 | V |
| `src/table.rs:283` (`insert_cell`), `:269` (`line_prelim`), `:343` (`cmd_add_table`) | oui | corps d'écriture partagé avec `ImportTable` (F18, DAB3) | V |
| `src/table.rs:389` (`cmd_set_table_cell`) | oui | hauteur exigée sur une ancre de plusieurs lignes (F7) | V |
| `src/table.rs:437` (`cmd_insert_table_line`) | non | l'agrandissement d'une fusion découle de F1 sans code | V |
| `src/table.rs:469` (`cmd_remove_table_line`) | oui | `to`, report des `span` (F6) | V |
| `src/table.rs:509` (`cmd_set_table_sizes`) | non | écrit les tailles données | V |
| `src/table.rs:545` (`cmd_set_table_fill`) | oui | `to` (plage, F15) | V |
| `src/table.rs` (nouveau : `cmd_merge_table_cells`, `cmd_split_table_cell`, `cmd_set_table_shade`, `cmd_import_table`, `merges_of`) | oui | F3, F4, F9, F18, F2 | S |
| `src/table.rs:820` (test `c10b_keys_are_ignored_and_kept`) | oui | réécrit : formes invalides (`span` nombre, `shade` booléen) toujours ignorées et gardées ; formes valides lues | V |
| `src/commands.rs:103-149` (`Command`), `:185` (`BadTable`), `:232` (message), `:533-575` (`apply`) | oui | quatre commandes neuves, deux champs `to` ; bras courts | V |
| `src/element.rs:25` (`KNOWN_KINDS`), `src/document.rs:296-302`, `src/query.rs:125-126` | non | aucun `kind` neuf ; la boîte du tableau ne change pas (somme des tailles) | V |
| `src/rich_text.rs` (`apply_text_diff`, `valid_color`) | non | réutilisés | V |
| `src/history.rs`, `src/format/mod.rs`, `src/document.rs` (`cited_assets`) | non | une commande = une transaction ; le tableau voyage dans `document.ybin` | V |

### Liaison Wasm principale (`crates/roomboard-wasm/src/lib.rs`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:422-510` (`add_table` … `set_table_fill` et leurs `*_inner`) | oui | `merge_table_cells`, `split_table_cell`, `set_table_shade`, `import_table` ; `to` de `remove_table_line` et `set_table_fill` | V |
| `:97` (`table_axis`) | non | réutilisée | V |

### Module `formats` (`crates/roomboard-formats`, `crates/roomboard-formats-wasm`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-formats/Cargo.toml` | oui | `calamine = { version = "0.38", default-features = false }` | V |
| `roomboard-formats/src/lib.rs:1-3` | oui | `pub mod sheet;` | V |
| `roomboard-formats/src/sheet.rs` (nouveau) | oui | F22-F24 : `read_first_sheet` | S |
| `roomboard-formats/src/container.rs` | non | conteneur inchangé | V |
| `roomboard-formats-wasm/src/lib.rs:1-3` (en-tête), après `:105` | oui | `SheetReader` (`read_sheet`) sur le patron de `ContainerReader` | V |
| `roomboard-formats/tests/fixtures/valeurs.xlsx` (nouveau) | oui | classeur synthétique (F32) | S |
| `Cargo.lock` | oui | crates de F27 | V |

### Contrat de la page (`apps/web/src/core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:12-13` (en-tête), `:82-102` (`Command`), `:117-128` (`TableCell`, `TableData`) | oui | commandes F3, F4, F9, F18, champs `to` ; `shade`, `merges` | V |
| `wasm-core.ts:110-` (`toTable`), `:363-377` (`apply`) | oui | `merges`, `shade` ; six appels | V |
| `fake-core.ts:19-21`, `:101-160` (`FakeTable`, `tableView`), `:593-` (`apply`) | oui | parité F2-F9, F18 | V |
| `core/rich-text.ts` (`validColor`) | non | réutilisé | V |

### Moteur et rendu (`apps/web/src/engine`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `table-geom.ts:20` (`TableAction`), `:26` (`TableCellState`), `:42` (`cellAt`), `:48` (`cellRect`), `:85` (`step`), `:113` (`rowHeightsFor`) | oui | zones fusionnées, plage, quatre actions (F14-F16, F7) | V |
| `table-geom.ts:67` (`tableAt`), `:108` (`cellHeight`) | non | réutilisées | V |
| `tools/table.ts:131-160` (`begin`, `extend`, `close`), `:173-230` (`act`, `fill`) | oui | plage, saisie au relâché, quatre actions, remplissage d'une plage (F14, F15) | V |
| `tools/tool.ts:56-69` (`TableTool`) | oui | `act` reçoit les actions neuves ; `cellState` publie la plage | V |
| `tools/select.ts:116-160` (`begin`, `close`) | oui | toucher sur un ombrage → révélation (F10) | V |
| `render/table-paint.ts:22` (`paintTableGrid`), `:53` (`cellTextBoxes`) | oui | rectangles réunis, traits intérieurs d'une zone omis, ombrage hachuré (F13) | V |
| `render/canvas2d.ts:244-255`, `:369` (`cellLinesOf`) | oui | cache des lignes : clé étendue aux zones (largeur réunie) | V |
| `render/overlay.ts:25` (`frame`) | non | rectangle de la plage | V |
| `engine.ts:31-32` (`EngineState.tableCell`), `:102-104`, `:520-525` | non | même forme ; l'état publié s'enrichit par `TableCellState` | V |
| `tools/text.ts`, `tools/commit-gate.ts`, `text-layout.ts` | non | réutilisés | V |

### Application et barre (`apps/web/src/app`, `src/ui`, `src/toolbar*.ts`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:115-130` (`ACTION_TABLE`, `TABLE_ACTIONS`) | oui | quatre actions (F15) | V |
| `ui/item-state.ts:28-32` (`ACTION_STATE`) | oui | état grisé des quatre actions | V |
| `app/toolbar-host.ts:41-45` (`ACTIONS`) | oui | quatre exécutants | V |
| `ui/Toolbar.tsx:111-130` (`TableActionRow`) | non | parcourt `TABLE_ACTIONS` : les boutons apparaissent sans code | V |
| `profile-edit.ts:112` (filtre `TABLE_ACTIONS`) | non | les quatre restent hors catalogue sans code | V |
| `app/stage-tags.ts:12-22` | oui | plage dans `data-table`, `data-table-merges`, `data-table-shades` (F29) | V |
| `app/workspace.ts:213` (`imageTarget`), `:271-281` (`createImporter`) | oui | cible : mesure et style du texte ; lecteur de classeur passé à l'importeur | V |
| `main.ts:108-116` (écoute `paste`) | oui | tableau HTML d'abord (F19) | V |
| `ui/rb.css` | non | les boutons reprennent `.rb-btn` de la rangée ; aucun style neuf (S) | S |

### Plateforme (`apps/web/src/platform`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `paste.ts:1`, `:20` (`pastedFiles`) | oui | `pastedTableHtml(e): string \| null` à côté ; en-tête mis à jour | V |
| `import.ts:91` (registre), `:25-41` (`ImportDeps`) | oui | gestionnaire `sheet` ; `readSheet` dans les dépendances | V |
| `image-import.ts:194`, `:204`, `:212` (`anchorOf`, `visibleOf`, `placement`), `:226` (`ImageTarget`) | oui (`:226`) / non | placement réutilisé ; `ImageTarget` gagne `measure()` et `textStyle()` | V |
| `html-table.ts`, `table-insert.ts`, `sheet-reader.ts`, `sheet-worker.ts` (nouveaux) | oui | F19-F22, F28 (DAB2, DAB4) | S |
| `container.ts:47-56` (`FormatsBinding`), `container-load.ts` | oui | `read_sheet` et `SheetReader` dans le type du module, chargé par le Worker | V |
| `container.ts:59` (`createPageCodec`) | non | le conteneur reste dans la page | V |
| `files.ts`, `drop-web.ts`, `host-tauri.ts`, `host-fsa.ts`, `host-repli.ts` | non | le dépôt et « Importer » passent déjà par `importFiles` | V |
| `apps/web/vite.config.ts:7` | oui | `worker: { format: "es" }` (Worker qui importe le module Wasm) | S |
| `apps/desktop/src-tauri/tauri.conf.json:13-22` (CSP) | non | `script-src 'self' 'wasm-unsafe-eval'` couvre un Worker de même origine (CSP3 : `worker-src` → `script-src`) ; coque non construite ici, à la fiche de plateforme | S |

### Essais et scripts

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c10b-tableau-navigateur.mjs` (nouveau) | oui | S1-S4, capture (F31) | S |
| `scripts/essais/commun.mjs` | oui | `coqueCsp` exportée ; `dropFile` (`:136`), `stageMouse`, `item`, `TAB` réutilisés | V |
| `scripts/essais/c10a-tableau-navigateur.mjs:27`, `c2-image-navigateur.mjs:25`, `c9-grille-navigateur.mjs:19`, `fichiers-navigateur.mjs:25` | oui | copie locale de `coqueCsp` remplacée par l'import ; doivent rester verts | V |
| `scripts/verifier.sh:90-102` (bloc `--e2e`) | oui | une ligne | V |
| `scripts/verifier.sh:61-65` (un seul module `formats` attendu dans `dist/assets`) | non (à surveiller) | le Worker et la page doivent émettre **le même** fichier `.wasm` (même empreinte de contenu) ; sinon le contrôle échoue et le plan l'adapte | S |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c10b-tableau-navigateur` dans la liste | V |
| `scripts/controle-hors-ligne.mjs` | non | le `.wasm` est exclu (`:3`) ; aucun hôte dans le JS neuf | V |
| `docs/essais/c10b-tableau-fusion-ombrage.png` (nouveau) | oui | capture | S |

### Licences

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `THIRD_PARTY_NOTICES.md` | oui | section C10b et textes (F27) | V |
| `scripts/controle-licences.mjs:16-19`, `scripts/licences-acceptees.json` | non | toutes les licences sont permises, aucune exception | V |

### Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/table.rs` (tests, `:667-1576`) | oui | F2-F9, F18 ; « recharger garde les octets » avec fusion et ombrage ; une étape par commande ; tests de C10a gardés verts | V |
| `crates/roomboard-core/tests/tableau.rs`, `tests/fixtures/tableau-4x3.roomboard` | non | à garder verts (fichier C10a lu par C10b) | V |
| `crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard` (nouveau) | oui | F30 | S |
| `crates/roomboard-core/tests/compat_socle.rs`, `compat_grille_pr12.rs`, `element_inconnu.rs`, `scenarios.rs` | non | à garder verts | V |
| `crates/roomboard-formats/src/sheet.rs` (tests), `crates/roomboard-formats-wasm/src/lib.rs` (tests `*_inner`) | oui | types de valeurs, dates 1900 et 1904, plafonds, bombe déclarée, feuille cachée, fusions, `#[ignore]` sur les exemples | S |
| `apps/web/src/core/wasm-core.contract.test.ts`, `fake-core.test.ts` | oui | contrat commun des commandes neuves | V |
| `apps/web/src/platform/container.contract.test.ts` | oui | `read_sheet` du vrai module sur `valeurs.xlsx` | V |
| `apps/web/src/engine/table-geom.test.ts`, `tools/table.test.ts`, `tools/select.test.ts`, `render/table-paint.test.ts`, `render/canvas2d.test.ts` | oui | zones, plage, révélation, hachures ; tests de C10a gardés verts (saisie ouverte au relâché : attendus d'ouverture déplacés de `begin` à `close`) | V |
| `apps/web/src/platform/paste.test.ts`, `import.test.ts` | oui | priorité du tableau HTML ; gestionnaire `sheet` | V |
| tests neufs `platform/html-table.test.ts` (`// @vitest-environment happy-dom`), `table-insert.test.ts`, `sheet-reader.test.ts` | oui | F19-F22, F28 | S |
| `apps/web/src/ui/item-state.test.ts`, `app/toolbar-host.test.ts:41-42`, `app/stage-tags.test.ts`, `toolbar.test.ts`, `profile-edit.test.ts` | oui / non | quatre actions et attributs neufs ; `toolbar-host.test.ts` (chaque action a son exécutant) et `profile-edit.test.ts` gardés verts | V |
| `apps/web/src/engine/engine.test.ts`, `board-session.test.ts`, `workspace.test.ts`, `tools/text.test.ts` | non | à garder verts | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| ActCraft, roomflow2, `claude-config` | non | aucune reprise de code, aucun outillage changé | V |

**Effets de bord sur l'existant**
- L'outil Tableau ouvre la saisie au **relâché** et non plus à l'appui (F14) : `tools/table.test.ts` (attendus déplacés),
  `c10a-tableau-navigateur.mjs` resté vert (il clique sans glisser).
- L'outil Sélection ne sélectionne plus un tableau quand on **touche** une cellule ombrée sans glisser : il la révèle
  (F10) ; test neuf de `tools/select.test.ts` (toucher = révélation, sélection inchangée ; glisser = déplacement) ;
  `s34-navigateur.mjs` resté vert (aucun ombrage).
- Un collage dont le HTML contient un `<table>` ne colle plus l'image jointe (F19) : `paste.test.ts` (les deux cas) ;
  `c2-image-navigateur.mjs` (collage d'une image seule) resté vert.
- `RemoveTableLine` et `SetTableFill` gagnent un champ facultatif `to` : sans lui, comportement de C10a ; contrat commun
  (`wasm-core.contract.test.ts`) et tests de `table.rs` de C10a restés verts.
- `SetTableCell.row_height` sur une ancre fusionnée agrandit la dernière ligne de la zone (F7) ; cellule simple :
  inchangé ; test neuf de `table.rs`.
- Le test `c10b_keys_are_ignored_and_kept` (`table.rs:820`) change d'attendu : il garde ses formes invalides ignorées et
  ajoute les formes valides lues ; couvert par lui-même.
- La vue d'un tableau gagne `merges` et `shade` : `toTable` (`wasm-core.ts:110`) contrôle la forme ; `fake-core.test.ts`
  et le contrat commun.
- Le module `formats` grossit d'environ 411 Ko (F26) et se charge aussi dans un Worker : la ligne « module formats » de
  `verifier.sh` (plafond 3 Mio et fichier unique) le contrôle.
- `coqueCsp()` passe dans `commun.mjs` : les quatre essais qui l'avaient en copie restent verts (`verifier.sh --e2e`).
- Un fichier C10b ouvert par une version C10a montre les ombrages levés et les fusions séparées (F30) : test
  `c10b_keys_are_ignored_and_kept` côté lecture C10a déjà présent sur `main`, et test neuf « recharger garde les octets ».

**Chantiers en cours**
- C7b `feat/usage-c7b-texte-riche` (`~/projets/roomboard-wt/usage-c7b-texte-riche`, base `425d617`, étage 0, aucun
  commit, aucun cadrage ; fichier modifié : `docs/sessions/usage-c7b-texte-riche-etat.md` seulement). Fichiers en commun
  **supposés** d'après son objectif (« cellules de tableau en texte riche ») et C7b dans `usage-cadrage.md:552` :
  `apps/web/src/app/text-editor.ts` (non touché par C10b), `apps/web/src/engine/tools/table.ts`,
  `apps/web/src/engine/render/canvas2d.ts` (`cellLinesOf`), `apps/web/src/engine/table-geom.ts` (`cellContent`,
  `cellHeight`), `apps/web/src/core/api.ts` (`TableCell`), `wasm-core.ts` (`toTable`), `fake-core.ts`,
  `crates/roomboard-core/src/table.rs` (`read_cell`, `view`), `crates/roomboard-wasm/src/lib.rs`. Le second à fusionner
  rebase sur `origin/main`.
- `gh pr list --state open` : aucune PR ouverte. `git worktree list` : `~/projets/roomboard` (`main`), ce worktree, C7b.

**Termes cherchés** (aucun graphe pour ce dépôt, recherche texte seule)
- Coffre : `chercher.js` « RoomBoard tableau fusion cellules import xlsx », « RoomBoard calamine formats wasm »,
  « coller HTML sanitisation presse-papiers » (aucune note RoomBoard).
- `grep -n "U32\|U35\|DAU10\|S11\|C10b\|C10a\|U39\|calamine\|ombrage\|révél\|fusion"` dans `usage-cadrage.md` ;
  `grep -n "fusion\|Merge\|ombrage\|shade\|Excel\|HTML\|span\|révél\|xlsx"` dans `docs/etudes/usage-grille-tableau.md`.
- `grep -n "pub fn\|pub(crate) fn\|pub struct\|shade\|span\|merged"` sur `table.rs` ; `grep -n "Table"` sur
  `commands.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`, `wasm-core.ts`, `fake-core.ts` ; `grep -n "table"` sur
  `document.rs`, `query.rs`, `canvas2d.ts`, `table-paint.ts`, `toolbar.ts`, `item-state.ts`, `Toolbar.tsx`,
  `toolbar-host.ts`, `stage-tags.ts`, `profile-edit.ts`, `engine.ts`.
- `grep -rn "span\|mergedInto\|shade"` dans `apps/web/src` et `crates` (aucune lecture existante hors test C10a).
- `grep -rn "présentation\|presentation\|fullscreen\|readOnly"` dans `apps/web/src` et `usage-cadrage.md` (aucun mode
  présentation).
- `grep -rn "DOMParser"` dans `apps/web/src` (aucun) ; `grep -n "environment\|happy\|jsdom"` sur `vite.config.ts`,
  `package.json`.
- `grep -rn "pastedFiles\|formats-worker\|wasm-formats\|loadFormats\|Worker("` dans `apps/web/src` (aucun Worker) ;
  lecture de `import.ts`, `paste.ts`, `container.ts`, `container-load.ts`, `image-import.ts:186-290`,
  `workspace.ts:213-317`, `main.ts:95-125`, `select.ts:110-190`.
- `grep -n "coqueCsp"` dans `scripts/essais/*.mjs` (quatre copies) ; `grep -n "^export"` sur `commun.mjs`.
- `grep -n "formats\|3145728\|1572864"` sur `verifier.sh` ; `grep -n "ALLOWED\|/\|OR"` sur `controle-licences.mjs` ;
  `controle-hors-ligne.mjs:1-60`.
- `cargo info calamine@0.38.0` ; `Cargo.toml` de `calamine-0.38.0` et `zip-9.6.0` (features) ;
  `grep -n "worksheet_cells_reader\|load_merged_regions\|worksheet_merge_cells\|SheetVisible\|to_ymd_hms_milli"` dans
  les sources de `calamine-0.38.0` ; projet jetable `/tmp/mesure-calamine-c10b` (`base`, `avec`, `auto`) et `diff` des
  `Cargo.lock`.
- `git worktree list`, `gh pr list --state open`, `git -C ~/projets/roomboard-wt/usage-c7b-texte-riche status`.

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Lire un tableau, ses lignes, ses cellules | `crates/roomboard-core/src/table.rs:120`, `:157`, `:190` | `read_raw`, `read_cell`, `RawTable::view` : lisent aussi `span` et `shade` ; nouvelle `merges_of(&RawTable, txn) -> Vec<Merge>` (règle F2, une seule fonction appelée par `view` et par les commandes) | étendre |
| Écrire un tableau neuf (vide ou rempli) | `table.rs:343` (`cmd_add_table`), `:269` (`line_prelim`), `:283` (`insert_cell`) | corps extrait `write_table(&mut self, page, NewTableSpec) -> Change` appelé par `AddTable` et `ImportTable` (DAB3) | étendre |
| Fusion, division, ombrage | aucun (termes : `span`, `shade`, `merge`, `mergedInto` dans `crates/`) | `table.rs` : `cmd_merge_table_cells(id, from: (&str, &str), to: (&str, &str))`, `cmd_split_table_cell(id, (row, col))`, `cmd_set_table_shade(id, from, to, shade: Option<&str>)` | étendre (dans le module de DAC1) |
| Retirer des lignes, remplir une plage | `table.rs:469`, `:545` | `cmd_remove_table_line(id, axis, line, to: Option<&str>)`, `cmd_set_table_fill(id, from, to: Option<(&str, &str)>, fill)` | étendre |
| Une commande = une étape, aucune étape vide | `commands.rs` (`done`, `unchanged`), `document.rs` (`transact_local`) ; `table.rs:333` (`table_done`) | appelés tels quels | réutiliser |
| Texte d'une cellule, couleur | `rich_text.rs` (`apply_text_diff`, `valid_color`) ; `core/rich-text.ts` (`validColor`) | appelés tels quels | réutiliser |
| Exposer les commandes | `crates/roomboard-wasm/src/lib.rs:422-510` | patron `set_table_fill` / `*_inner` | étendre |
| Vue TS et fausse liaison | `wasm-core.ts:110` (`toTable`), `:363-377` ; `fake-core.ts:101-160`, `:593-` | `toTable` (`merges`, `shade`), `apply` ; `FakeTable`, `tableView`, `writeTable` | étendre |
| Lire un `.xlsx` | `calamine` 0.38 (MIT), dépendance neuve permise par U35 | `Xlsx::new`, `sheets_metadata`, `worksheet_cells_reader`, `worksheet_merge_cells`, `ExcelDateTime::to_ymd_hms_milli` | réutiliser |
| Garde contre une bombe ZIP | `zip` 9.6 (déjà dans `roomboard-core/Cargo.toml`) | `ZipArchive::by_name(..).size()` des parties lues en entier | réutiliser |
| Plafond 64 | `roomboard-core/src/table.rs:25` (`MAX_TABLE_LINES`), `api.ts:221` (`TABLE_MAX_LINES`) | lus par `sheet.rs` (dépendance déjà présente de `roomboard-formats` vers le cœur) et par `html-table.ts` | réutiliser |
| Première feuille en grille de textes | aucun (termes : `sheet`, `xlsx`, `calamine`, `worksheet` dans `crates/`) | `roomboard-formats/src/sheet.rs` : `pub fn read_first_sheet(bytes: &[u8]) -> Result<Sheet, SheetError>`, `pub struct Sheet { rows: u32, cols: u32, cells: Vec<String>, merges: Vec<[u32; 4]>, source_rows: u32, source_cols: u32, cut_cells: bool }` | nouveau module (DAB4) |
| Liaison de la lecture du classeur | `roomboard-formats-wasm/src/lib.rs:9-54` (`ContainerReader`, patron `open_inner`) | `SheetReader::open(bytes) -> Result<SheetReader, JsError>` ; `rows()`, `cols()`, `cells() -> Vec<String>`, `merges() -> Vec<u32>`, `source_rows()`, `source_cols()`, `cut_cells()` ; `open_inner` testé en natif | étendre |
| Type du module `formats` | `platform/container.ts:47` (`FormatsBinding`) ; `container-load.ts:7` (`loadFormatsModule`) | `FormatsBinding.SheetReader` ; `loadFormatsModule` appelé tel quel dans le Worker | étendre, réutiliser |
| Lire le classeur hors de l'instance qui enregistre | aucun Worker dans `apps/web/src` (termes : `Worker(`, `postMessage`, `onmessage`) | `platform/sheet-reader.ts` : `createSheetReader(spawn: () => WorkerLike): SheetReader`, `SheetReader { read(file: Blob): Promise<TableGrid> }` (un Worker par lecture, arrêté après la réponse ou l'erreur) ; `platform/sheet-worker.ts` : entrée du Worker, un message `{ bytes }` → `{ grid }` ou `{ error }` | nouveau module (DAB4) |
| Entrée des fichiers | `platform/import.ts:58` (`ImportHandler`), `:91` (registre), `:25` (`ImportDeps`) | gestionnaire `sheetHandler(deps: { readSheet(b: Blob): Promise<TableGrid> }): ImportHandler` ajouté au registre ; `ImportDeps.readSheet?` | étendre |
| Lire l'en-tête, le nom | `import.ts` (`f.head(HEAD_BYTES)`, `isRoomboardName`) | `detect(head, name)` : extension `.xlsx`/`.xlsm` et `PK\x03\x04` | réutiliser |
| Collage | `platform/paste.ts:12` (`isEditable`), `:20` (`pastedFiles`) ; `main.ts:108` | `pastedTableHtml(e: PasteEventLike & { clipboardData: { getData(t: string): string } }): string \| null` à côté de `pastedFiles` ; l'écoute de `main.ts` l'essaie d'abord | étendre |
| HTML → grille | aucun (termes : `DOMParser`, `rowspan`, `colSpan`, `<table` dans `apps/web/src`) | `platform/html-table.ts` : `tableFromHtml(html: string, parse: (s: string) => Document): TableGrid \| null` et `export interface TableGrid { rows: number; cols: number; cells: string[]; merges: { row: number; col: number; rows: number; cols: number }[]; sourceRows: number; sourceCols: number; cutCells: boolean }` (type partagé avec le lecteur de classeur) | nouveau module (DAB2) |
| Poser une grille dans la page | `image-import.ts:194` (`anchorOf`), `:204` (`visibleOf`), `:212` (`placement`), `:226` (`ImageTarget`) ; `engine/table-geom.ts:113` (`rowHeightsFor`), `:13-14` (`TABLE_COL_WIDTH`, `TABLE_ROW_HEIGHT`) | `platform/table-insert.ts` : `insertTableGrid(target: ImageTarget, grid: TableGrid, at: Point \| null, index: number, notify, name?: string): "inserted" \| "failed"` (mesure, matrice, `ImportTable`, message de troncature) ; `ImageTarget` gagne `measure(): Measure` et `textStyle(): { color: string; size: number }` | réutiliser, étendre, nouveau module (DAB2) |
| Mesurer les hauteurs | `engine/table-geom.ts:108` (`cellHeight`), `:113` (`rowHeightsFor`) ; `text-layout.ts` | `rowHeightsFor` étendu aux zones (F7) | étendre |
| Zone fusionnée, plage, navigation | `engine/table-geom.ts:42`, `:48`, `:55`, `:85` | `cellAt` (ancre), `cellRect` (rectangle réuni), `step` (sauts) ; ajouts `anchorOf(t, c): Cell`, `expandRange(t, a: Cell, b: Cell): Range`, `rangeRect(t, r: Range): Bounds` | étendre |
| Outil Tableau | `engine/tools/table.ts:60-323` ; `tools/tool.ts:56` (`TableTool`) | `begin`/`extend`/`close` (plage, saisie au relâché), `act` (quatre actions), `fill` (plage) | étendre |
| Révéler | `engine/tools/select.ts:116` (`begin`), `:153` (`close`), `:27` (`DRAG_THRESHOLD_PX`) ; `table-geom.ts:42` (`cellAt`) | mode de glisser `"tap-shade"` (cellule retenue au `begin`, révélée au `close` si pas de glisser) ; `ctx.run(SetTableShade)` | étendre |
| Dessin des zones et de l'ombrage | `engine/render/table-paint.ts:22`, `:53` ; `canvas2d.ts:244`, `:369` | `paintTableGrid` (zones, ombrage), `cellTextBoxes` (rectangle réuni) ; `paintText` inchangé (seul chemin du texte, B1 de C10a) | étendre |
| Boutons et état | `toolbar.ts:115-130` ; `ui/item-state.ts:28` ; `app/toolbar-host.ts:41` ; `ui/Toolbar.tsx:111` | `ACTION_TABLE`, `TABLE_ACTIONS`, `ACTION_STATE`, `ACTIONS` | étendre |
| Attributs de l'essai | `app/stage-tags.ts:12-22` | `stageTags(s)` : `table` (plage), clés `tableMerges`, `tableShades` | étendre |
| Essai navigateur | `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `stageMouse`, `dropFile`, `item`, `TAB`, `VIEWPORT`, `Echec`) ; `c10a-tableau-navigateur.mjs:27` (`coqueCsp`) | appelés tels quels ; `coqueCsp` déplacée dans `commun.mjs` et importée (constat fermé) | réutiliser, étendre |
| Test « recharger garde les octets », fixture régénérable | `table.rs:1319` (`table_reload_keeps_bytes`) ; `tests/tableau.rs` | mêmes patrons | réutiliser |

## 4. Hypothèses à revoir

Difficiles à défaire ou visibles des utilisateurs :
- **HB-1** Fusion écrite `span = [id de dernière ligne, id de dernière colonne]` sur l'ancre, sans `mergedInto` (F1) ;
  réversible jusqu'à la première release seulement.
- **HB-2** Fusionner efface le contenu des cellules couvertes, sans avertissement ; Ctrl+Z le rend (F3).
- **HB-3** « Diviser » = défusionner ; couper une cellule simple en plusieurs n'existe pas (F4).
- **HB-4** Seul un toucher avec l'outil Sélection révèle un ombrage (F10).
- **HB-5** La révélation s'enregistre ; aucune action « remettre tous les ombrages » (F12).
- **HB-6** Ombrage gris `#94a3b8` hachuré `#cbd5e1`, une seule couleur proposée (F13). **Choix visuel, à l'essai.**
- **HB-7** Une ligne ou colonne insérée dans une zone fusionnée l'agrandit (écart à HU2-7) (F5).
- **HB-8** Valeurs Excel : nombres à virgule et 15 chiffres, dates `JJ/MM/AAAA`, `VRAI`/`FAUX` ; pourcentages et
  monnaies montrés en valeur brute (`0,25` pour 25 %) (F24).
- **HB-9** Un collage qui porte un `<table>` HTML donne un tableau même si le presse-papiers joint une image (Excel,
  supposé non vérifié : à confirmer sur le PC avec Excel) ; il crée toujours un tableau neuf (F19).
- **HB-10** `.xls`, `.xlsb`, `.ods`, `.csv` hors périmètre, malgré le résumé des formats (`usage-cadrage.md:600`) (F25).
- **HB-11** Tableau importé à colonnes de 240, réduit pour tenir dans 80 % de la vue (F21).
- **HB-12** La saisie d'une cellule s'ouvre au relâché du pointeur (C10a : à l'appui) (F14).

Les autres :
- **HB-13** Plafonds : 64 × 64 tronqué avec message, 2 000 caractères par cellule, 8 Mio de HTML, 64 Mio décompressés
  déclarés par partie lue en entier (F22).
- **HB-14** « Première feuille » = première feuille **visible** (F23).
- **HB-15** Lignes et colonnes vides de tête et de queue retirées (rectangle utilisé) (F23).
- **HB-16** Fusions d'Excel gardées seulement si entièrement dans le rectangle gardé (F23).
- **HB-17** Erreurs Excel montrées par leur code anglais du fichier (`#NAME?`, et non `#NOM?`) (F24).
- **HB-18** HTML : texte seul (ni couleurs, ni gras, ni largeurs), premier tableau, tableaux imbriqués aplatis, une
  cellule seule copiée donne un tableau 1 × 1 (F19, F20).
- **HB-19** Suppr vide la cellule active seulement, pas la plage (F15).
- **HB-20** Retirer la ligne d'ancrage d'une zone emporte son contenu ; la zone glisse sur la ligne suivante (F6).
- **HB-21** « Diviser » sur une cellule qui n'est pas une ancre : refus du cœur (`BadTable`), bouton grisé (F4).
- **HB-22** Diviser une zone ombrée laisse l'ombrage sur la seule cellule en haut à gauche (F4, F8).
- **HB-23** Worker sous la CSP de la coque Tauri : supposé couvert par `script-src 'self' 'wasm-unsafe-eval'`, non
  essayé sans build Tauri (fiche de plateforme) (F28).

## 5. Décisions d'architecture

**DAB1 — Fusion par plage d'ids sur l'ancre, couverture calculée par le cœur.**
Contexte : DAU10 demande une règle déterministe ; un `mergedInto` écrit devient faux dès qu'une ligne s'insère.
Décision : `span = [dernière ligne, dernière colonne]` sur l'ancre ; `merges_of` (F2) seule source de la couverture,
rendue dans la vue ; la page et la fausse liaison ne font que la lire (la fausse liaison la recopie, D36).
Conséquences : insertion dans une zone sans code ; suppression : report écrit par `RemoveTableLine`. Réversible avant release.

**DAB2 — Une grille commune pour le collage et le classeur.**
Contexte : HTML collé et `.xlsx` donnent la même chose : des textes en rangées, des fusions, un plafond.
Décision : `TableGrid` (TS) produit par `tableFromHtml` et par `SheetReader` ; `insertTableGrid` mesure, place et lance
`ImportTable`, un seul chemin vers le cœur. Conséquences : C16 (Word, Excel convertis) et C3 (texte tabulé) s'y
brancheront. Réversible : modules internes à la page.

**DAB3 — `ImportTable` à côté d'`AddTable`, corps d'écriture partagé.**
Contexte : `AddTable` reçoit un coin et des tailles uniformes ; un import a une matrice, des hauteurs par ligne, des textes.
Décision : commande neuve, une transaction ; `write_table` commun aux deux. Conséquences : une seule étape d'annulation
par import ; `AddTable` et ses tests inchangés. Réversible : fusionner les deux commandes plus tard.

**DAB4 — Le classeur se lit dans un Worker jetable, avec sa propre instance du module `formats`.**
Contexte : `panic = abort` en `wasm32` ; l'instance de la page enregistre les `.roomboard` et n'est jamais recréée (HR6).
Décision : `sheet.rs` dans `roomboard-formats`, `SheetReader` dans la liaison, `sheet-worker.ts` un Worker par lecture.
Conséquences : un classeur malformé ne peut pas empêcher d'enregistrer ; premier Worker du projet (U23 le prévoyait),
`worker.format: "es"` dans Vite. Réversible : rapatrier la lecture dans la page si un jour `calamine` ne panique plus.

## 6. Scénarios d'acceptation

- **S1** (S11, partie C10b ; Playwright, `verifier.sh --e2e`) Outil Tableau, créer un 4 × 3, écrire « Lundi » dans la
  première cellule ; glisser de la première à la deuxième cellule : `data-table` = `4x3@0,0-0,1` ; « Fusionner » :
  `data-table-merges` = `1`, la cellule fusionnée montre « Lundi » sur deux colonnes. Glisser sur la troisième colonne
  (trois lignes), « Ombrer » : `data-table-shades` = `3` (S11 « ombrer une colonne »). Capture
  `docs/essais/c10b-tableau-fusion-ombrage.png` (avec `--captures` seulement). Outil Sélection, toucher la cellule
  ombrée de la première ligne : `data-table-shades` = `2` et aucun élément sélectionné (`data-selection` vide) ;
  Ctrl+Z : `3` (S11 « annuler : il revient ») ; toucher encore : `2`. Aucune erreur dans la page.
- **S2** (Playwright) Coller (événement `paste` avec `text/html`) `<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table><img src="http://exemple.invalid/x.png" onerror="window.__rb=1"><script>window.__rb=1</script>` :
  un tableau 2 × 2 de plus sur la page, une fusion sur la première ligne (« Titre »), « a » et « b » dessous ;
  `window.__rb` indéfini, aucune requête hors 127.0.0.1, aucun nœud `<table>` ni `<img>` ajouté au DOM de la page.
- **S3** (Playwright) Après S1 et S2 : Ctrl+S, puis Ctrl+O sur le fichier : nouvel onglet ; outil Tableau, cliquer sur
  la cellule fusionnée du premier tableau : la zone montre « Lundi », `data-table-merges` = `1`, `data-table-shades`
  = `2` ; le tableau collé garde « Titre », « a », « b » et sa fusion. Côté cœur : enregistrer, recharger,
  réenregistrer un tableau avec fusion et ombrage donne les mêmes octets.
- **S4** (Playwright et tests) Déposer `valeurs.xlsx` (synthétique, F32 : texte, entier, nombre `3.5`, date, booléen,
  erreur `#DIV/0!`, une fusion, une première feuille cachée, 70 lignes) : un tableau de 64 lignes, valeurs `3,5`,
  `20/11/2026`, `VRAI`, `#DIV/0!`, la fusion gardée, et le message « valeurs.xlsx : tableau limité à 64 lignes et 64
  colonnes (le fichier en a 70 × 6) ». Un `.xlsx` qui n'est pas un ZIP valide : « Import impossible (…) », et
  l'enregistrement du document marche toujours après (DAB4). Ctrl+Z retire le tableau d'un coup.
- **S5** (tests du cœur et de la page) Une ligne insérée entre l'ancre et la fin d'une zone l'agrandit ; « − Ligne »
  sur la ligne d'ancrage reporte la zone sur la ligne suivante ; « − Ligne » sur une plage de deux lignes = une étape ;
  un `span` qui recoupe une zone déjà lue, ou dont un id manque, est ignoré et gardé ; Tab saute les cellules couvertes ;
  « Diviser » rend les cellules, le texte reste en haut à gauche ; une version C10a lit ce fichier sans le perdre.

## 7. Hors périmètre

- `.xls`, `.xlsb`, `.ods`, `.csv` en valeurs (HB-10) ; Word, Excel, PowerPoint convertis en pages (C16).
- Formules, mises en forme, couleurs, largeurs de colonnes, images d'un classeur ou d'un HTML collé ; texte riche des
  cellules (C7b) ; collage de texte tabulé sans HTML et collage dans un tableau existant (C3 ou plus tard).
- Couper une cellule simple en plusieurs (SMART) ; ombrage de tout le tableau en un bouton ; plusieurs couleurs
  d'ombrage ; « remettre tous les ombrages » ; révélation par le stylo ou au doigt pendant un autre outil ; mode présentation.
- Vider une plage par Suppr (HB-19) ; redimensionner lignes et colonnes en tirant une bordure (C10a, hors périmètre).
- Copier un tableau RoomBoard vers le presse-papiers (HTML ou texte tabulé, étude § 5.4 « Export ») : C3.
- Objets dans une cellule ; concurrence réelle entre deux éditeurs (synchronisation hors périmètre, D27).
- Collage réel depuis Excel, Word, Google Sheets sur le PC et le Mac, Worker sous la coque Tauri (HB-9, HB-23) : fiches
  de plateforme ; aucun build Tauri dans ce chantier.

## 8. Portes immédiates

Aucune.
