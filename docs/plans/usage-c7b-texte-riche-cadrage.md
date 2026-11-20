# Cadrage — usage-c7b-texte-riche (C7b, éditeur de texte riche)

Mode autonome (brief OD79), sans question à Jérôme. Cadrage court : U27 (`docs/plans/usage-cadrage.md:80`), U32 (`:85`)
et DAU9 (`:396-400`) s'appliquent tels quels ; C7 (`docs/plans/usage-c7-texte-riche-cadrage.md`, T1 à T16) et C10a
(`docs/plans/usage-c10a-tableau-cadrage.md`, DAC3 `:302-305`) sont cités, jamais refaits. Base lue : `origin/main @ 425d617`.
Coffre (`~/SecondBrain/.tools/bin/chercher.js`, recherche non dégradée) : « contenteditable IME éditeur texte riche »,
« RoomBoard texte riche barre mise en forme », « piège IME composition saisie navigateur », « Yrs CRDT collaboration
écriture perdue » : aucune note RoomBoard pertinente ; `06_MOC/actcraft.md` : rien sur la saisie riche (pièges Qt seulement).
Graphe : aucun pour RoomBoard (`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : recherche texte seule.
Constats (`docs/architecture-constats.md`) : lignes ouvertes des zones touchées lues ; aucune demande « Constats à fermer »
venue d'un audit ; R22 ferme de lui-même le constat `coqueCsp` (`scripts/essais`).

## 1. Demande et gabarit

**Demande** : on écrit dans un texte et dans une cellule de tableau par une saisie riche (contenteditable) qui respecte
l'IME ; une barre et Ctrl ou Cmd + B, I, U posent gras, italique, souligné, taille et couleur sur la sélection ; une mise
en forme s'annule en une étape ; le collage colle du texte simple ; tout survit à l'aller-retour `.roomboard`.

**Gabarit** : chantier (40 questions au plus ; 26 consommées, R1 à R26).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| R1 | Sort du `<textarea>` de D14 | La zone de saisie riche **remplace** le `<textarea>` pour l'outil Texte **et** pour les cellules, d'un coup ; aucun `<textarea>` n'est gardé sur la scène. Le texte « simple » de D14 survit comme donnée : un texte sans attribut reste un texte du socle (DAU9, C7 T12). Conflit de même rang : U27 (« le `<textarea>` de D14 reste pour le texte simple ») contre `usage-cadrage.md:136` (« remplacée par l'éditeur riche en C7b ») et DAC3 du C10a (« C7b remplacera la zone pour les deux outils d'un coup ») ; le plus récent (DAC3) l'emporte, point marqué à revoir (HC7b-1). | DAC3 (`usage-c10a-tableau-cadrage.md:302-305`) ; `usage-cadrage.md:136` ; brief OD79 (« les cellules d'un tableau s'éditent de la même façon ») | oui (HC7b-1) |
| R2 | Module de la zone | `app/text-editor.ts` garde son interface publique (`createTextEditor(parent, events)`, `TEXT_EDITOR_ID`, `cssMatrix`, `editorMove`, `TextEditorEvents`) ; son corps passe d'un `<textarea>` à un `<div contenteditable="true">` (id `#texte-edition` gardé, CL5b-2). La logique est sortie dans deux modules neufs : modèle pur `engine/rich-edit.ts`, aller-retour DOM `app/rich-dom.ts` (DAR2). | DAC3 (zone unique) ; CL4-2 (`socle-lot4-PLAN.md:55`) ; `board-session.ts:143` (seul appelant) | oui |
| R3 | Geste de saisie | **contenteditable relu par différence ancrée sur le curseur** : la frappe et la composition IME mutent le DOM (le navigateur, jamais nous, pendant la composition) ; à chaque `input` hors composition et à `compositionend`, le texte du DOM et la sélection d'après la frappe sont relus, puis appliqués au modèle par `editSpansAt(spans, content, caret)` : plus long **suffixe** commun borné pour ne pas passer à gauche du curseur relu (`suffixe ≤ longueur − caret`), puis plus long préfixe commun des restes ; le milieu neuf prend les attributs du caractère qui le précède (règle T5 du cœur) plus le format en attente (R9). Ainsi « aa », curseur en 1, Ctrl+B, « a » met en gras la **deuxième** lettre, pas la troisième. Curseur illisible : `editSpans` sans borne. Le cœur peut placer le même texte autrement (préfixe d'abord) : sans effet, R7 aligne les attributs sur les segments envoyés. Puis le DOM est redessiné depuis le modèle si sa forme diffère, curseur remis par positions UTF-16. Les mutations de structure sont prises à `beforeinput` (annulable) et appliquées au modèle : `insertParagraph`, `insertLineBreak` (→ « \n », D14 : Entrée = nouvelle ligne), `insertFromPaste`, `insertFromDrop`, `formatBold` / `formatItalic` / `formatUnderline` (→ R8), `historyUndo` / `historyRedo` (→ R10). Aucun `execCommand`. Lecture robuste : un `<br>` ou une frontière de bloc insérés par le navigateur valent « \n » ; le `<br>` final posé par notre rendu (R4) porte `data-rb-fin` et n'est **jamais** lu. | `core/rich-text.ts:35` (`editSpans`, étendue en `editSpansAt`) ; C7 T5 (`usage-c7-texte-riche-cadrage.md:25`) ; D14 (`socle-cadrage.md:41`) ; contre-relecture tour 1 (cas « aa ») ; HC7b-7 | oui (DAR2) |
| R4 | Rendu dans la zone | Un `<span>` par segment, style CSS en ligne tiré des attributs (`font-weight`, `font-style`, `text-decoration: underline`, `color`, `font-size` en px = unités monde, famille par `textFont` / `faceOf`) ; conteneur à la taille et à la couleur de l'élément (défaut T3), `white-space: pre-wrap`, `line-height: TEXT_LINE_HEIGHT`, placé par la matrice CSS comme aujourd'hui ; si le texte finit par « \n », un `<br data-rb-fin>` final pour que le curseur tienne sur la dernière ligne vide, ignoré à la relecture (R3). Le redessin pose un drapeau « redessin en cours » le temps de `setSelection` (R9). CSP de la coque : `style-src 'self' 'unsafe-inline'` permet ces styles. | `text-editor.ts:60-126` (placement actuel) ; `text-layout.ts:23`, `:83` ; `apps/desktop/src-tauri/tauri.conf.json:16` | oui |
| R5 | IME | Règles CL4-3 inchangées, portées par la porte partagée `commit-gate.ts` : rien n'est écrit pendant une composition ; toute validation attend `compositionend` ; Échap et toute touche avec `isComposing` laissées à l'IME. En plus : aucun redessin du DOM, aucun raccourci, aucune action de la barre pendant une composition (action ignorée, comme `settle()` de l'outil Tableau) ; `selectionchange` ignoré pendant la composition (R9). **Ordre à `compositionend`** : 1) relire le DOM et l'appliquer au modèle (R3), 2) redessiner si besoin, 3) seulement ensuite relayer à la porte (`compositionEnd()`), qui peut valider et lire `spans()` : la validation voit toujours le texte composé. `compositionupdate` relayé pour les tests, sans effet sur le modèle. | CL4-3 (`socle-lot4-PLAN.md:56`) ; `commit-gate.ts:1-20` ; `tools/table.ts:183-187` ; contre-relecture tour 1 (Chromium : dernier `input` `isComposing` vrai avant `compositionend`) | oui |
| R6 | Commit d'une séance | Une validation = **une** commande = une étape (D14) : `SetText` (texte) ou `SetTableCell` (cellule) portant le contenu **et** les segments voulus (`spans`, R7) ; texte et segments inchangés (`sameSpans`) : aucune commande ; texte inchangé mais segments changés (mise en forme seule) : la commande part. Hauteur : `richBoxHeight(layoutRich(spans…))` pour un texte, `cellHeight(spans…)` pour une cellule (plus de prévision par `editSpans`, les segments sont connus). | D14 ; D38 (`socle-cadrage.md:65`) ; C7 T11 ; `tools/text.ts:71-72`, `:60-86` ; `tools/table.ts:97-115` (`content !== o.initial`, `:104`) | oui |
| R7 | Contrat `spans` | `SetText` et `SetTableCell` gagnent `spans` **facultatif** (TS `spans?: readonly TextSpan[]` ; Rust `spans: Option<Vec<SpanInput>>`, `SpanInput{ text: String, attrs: SpanAttrs }`, `SpanAttrs` de C7 réutilisé : un état voulu, pas un patch). Présent : 1) contrôle d'abord, sans écriture, même ordre dans les deux cœurs : concaténation des `text` ≠ `content`, ou valeur hors domaine (T15, `size` fini > 0) → `BadFormat` ; 2) **sortie « inchangé »** : contenu, champs **et** attributs normalisés égaux → aucune transaction ; les sorties anticipées actuelles (`commands.rs:701-708`, `table.rs:410-412`, `fake-core.ts:490-492`) gagnent la comparaison des segments, sinon une mise en forme seule serait perdue ; 3) dans **la même** transaction que la différence de texte **ou la création** (`insert_text` `commands.rs:726-743`, `table.rs:420-424` : cellule sans `text` ou absente, puis `TextRef` relu), `apply_spans` parcourt les morceaux du `Y.Text` sur chaque plage de la cible, **normalise** leurs attributs par `normalize` (`rich_text.rs:175`) et n'écrit, par `Text::format`, que les clés connues **qui diffèrent** (valeur voulue, ou `Any::Null` pour retirer) ; une valeur brute hors domaine sur une plage que la cible laisse sans l'attribut n'est pas réécrite ; clés inconnues et embeds jamais touchés. `format_changes` (comparaison brute) n'est pas employé ici. Un `spans` dont tous les segments sont sans attribut sur un texte sans attribut produit **exactement** la mise à jour d'un `SetText` sans `spans` (même transaction, mêmes octets). Absent : comportement d'aujourd'hui (pot P2, appelants existants). **Liaison Wasm** : `set_text` et `set_table_cell` gagnent un dernier paramètre `spans: JsValue` (`undefined` ou `null` = absent) ; `read_patch` lit un objet, pas une liste (`lib.rs:236-247`, vérifié) : nouvelle `read_spans_input<'de, D: Deserializer<'de>>(d) -> Result<Vec<SpanInput>, CommandError>`, générique comme `read_patch` pour être testée en natif, `deserialize_seq` d'entrées `{ text, attrs }` dont `attrs` est lu par le `PatchVisitor` existant (`lib.rs:212`) puis `wire_attr` ; dans un état voulu, `false` et `null` valent « absent ». Côté TS, `wasm-core.ts` passe `spans.map(s => ({ text: s.text, attrs: cleanPatch(s.attrs) }))`. | U27 (« `SetText` doit appliquer une différence ») ; C7 T7, T8, T15, T16 ; `rich_text.rs:27-40` (`SpanAttrs`), `:175`, `:254` ; `crates/roomboard-wasm/src/lib.rs:179`, `:212-247`, `:452`, `:650` ; contre-relecture tour 1 | oui (DAR1) |
| R8 | Actions de mise en forme | Gras, italique, souligné : **bascule** (toute la sélection porte l'attribut → retiré ; sinon posé). Taille : un des quatre `TEXT_SIZES` (24, 36, 48, 72, D14) ; égale à la taille de l'élément (ou du tableau) → attribut retiré. Couleur : « Défaut » → attribut retiré ; sinon la valeur hexadécimale. Police : hors de la barre (C7 la garde si présente). Une action sur une sélection = une étape de séance (R10). | U27 (`bold`, `italic`, `underline`, `size`, `color`) ; D14 (« une taille parmi 4 ») ; `text-layout.ts:10` ; C7 T3, T7 (`null` = retrait) | oui |
| R9 | Sélection vide | Une action avec le curseur seul pose un **format en attente** appliqué au prochain texte inséré là (frappe, composition, collage) ; aucune étape tant que rien n'est inséré. Il est **oublié** seulement quand une sélection relue à `selectionchange` diffère de la sélection du modèle, **hors** composition et **hors** redessin (drapeau de R4) ; la frappe met à jour la sélection du modèle à l'`input`, donc le `selectionchange` qui la suit ne l'efface pas ; l'insertion le consomme. C'est le geste « Ctrl+B puis écrire en gras » du brief, au clavier comme sous IME. | brief OD79 (« écrire en gras dans une cellule ») ; contre-relecture tour 1 (Chromium : `selectionchange` pendant la composition et après `setSelection`) ; HC7b-5 | oui |
| R10 | Annulation en une étape | **Pendant la séance** : historique local de la zone (états `{segments, sélection}`) ; Ctrl ou Cmd + Z, Ctrl+Y, Ctrl+Maj+Z et `historyUndo` / `historyRedo` sont pris par la zone (le navigateur n'annule jamais, son historique ne connaît pas nos redessins) ; une étape par action de mise en forme, par collage, par Entrée, et par suite de frappe (coupée par une autre action ou un déplacement du curseur) ; historique vide : rien. **Après validation** : la séance entière est une étape de `History` (D11), comme au socle. Ainsi une mise en forme s'annule en une étape dans les deux temps. | D11 (`socle-cadrage.md:38`) ; D14 (« une édition = une transaction au moment de valider ») ; `keys.ts:17-18`, `:29` (raccourcis laissés à la zone éditable) ; HC7b-2 | oui (DAR3) |
| R11 | Raccourcis | Dans la zone : Ctrl ou Cmd + B, I, U (sans Alt : Alt Gr vaut Ctrl+Alt sous Windows), hors composition, `preventDefault` (le gras natif du contenteditable ne part jamais). Les raccourcis globaux restent ignorés dans une zone éditable (`keys.ts:29`, `editAction`, `isPanKey`) : rien à changer dans `keys.ts`. | `keys.ts:25-34`, `:39-44` ; R5 | oui |
| R12 | Collage | Texte simple seulement : `paste` pris par la zone, `text/plain` lu (`\r\n` et `\r` → « \n »), inséré à la place de la sélection avec les attributs du caractère précédent plus le format en attente ; HTML, images et fichiers ignorés ; une étape de séance. Le collage global d'image (`main.ts:109-116`) ignore déjà une cible éditable (`paste.ts:12-17`, `:21`) : inchangé. Dépôt (`drop`) dans la zone : refusé (`preventDefault`), le dépôt de fichiers reste sur la scène. Copier et couper : natifs (couper relu comme une frappe). | brief OD79 (« collage de texte simple ») ; `platform/paste.ts:1` (« zone de texte : collage normal ») ; HC7b-6 | oui |
| R13 | Place de la barre | **Rangée « Format »** de la barre des outils, sur le patron de `TableActionRow` (C1 P18-P19, C10a DAC4) : composant neuf `ui/FormatRow.tsx`, une ligne dans `Toolbar.tsx` après `TableActionRow`, **montrée selon l'outil actif** (Texte ou Tableau), boutons **désactivés** hors séance de saisie (`textFormat` nul) : la barre ne change pas de hauteur à l'ouverture ni à la validation, la scène ne saute pas (barre en `flex-wrap` dans une ligne de grille `auto`, `layout.ts:21`, `rb.css:13`). Boutons seulement (G, I, S avec `aria-pressed` ; 4 tailles ; « Défaut » puis pastilles) : aucun `<select>` ni `<input type=color>`, qui prendraient le focus. Chaque bouton fait `preventDefault` au `pointerdown` **et** au `mousedown` (WebKit donne le focus au `mousedown`, patron de `board-session.ts:207-215`) : la zone garde focus et sélection, la perte du focus ne valide pas. Hors du catalogue de l'éditeur de profils (comme DAC4 modifiée). | design existant : `Toolbar.tsx:80-141` (`PresetRow`, `TableActionRow` : montrée par outil, boutons désactivés sans cellule) ; DAC4 (`usage-c10a-tableau-cadrage.md:308-315`) ; `text-editor.ts:101-104` (blur = validation) ; `board-session.ts:207-215` ; contre-relecture tour 1 ; porte visuelle (HC7b-3) | oui |
| R14 | Couleurs de la barre | « Défaut » (retrait), noir `#000000`, rouge `#dc2626`, bleu `#1d4ed8` (les trois couleurs du stylo), vert `#15803d` ; constante `TEXT_COLORS` dans `ui/FormatRow.tsx` (pas dans `toolbar.ts`, que C10b touche). | `toolbar-profiles.ts:41-47` (couleurs du stylo) ; principes `impeccable` (contraste sur fond blanc) pour le vert ; HC7b-3 | oui |
| R15 | État de la barre | `FormatState{ bold, italic, underline: boolean ; size: number \| "mixed" ; color: string \| "default" \| "mixed" }` : `size` = taille **effective** (attribut, sinon taille de l'élément ou du tableau), donc le bouton de la taille de l'élément est enfoncé pour un texte sans attribut (cohérent avec R8) ; `color` = `"default"` quand l'attribut est absent (« Défaut » enfoncé), la valeur sinon ; `"mixed"` quand la sélection mêle plusieurs valeurs (aucun bouton enfoncé). Calculé par le modèle sur la sélection (curseur seul : format en attente, sinon attributs du caractère précédent, règle T5). Il remonte par le **patron de `tableFill`** : zone → outil (`formatState()`, `format(a)`) → `engine.state().textFormat`, `engine.textFormat(a)` → `ToolbarView.textFormat`, `ToolbarHost.textFormat(a)` ; la zone signale un changement (sélection, action) par `TextEditorEvents.formatChanged?()` → `ctx.stateChanged`. | `engine.ts:205` (`tableCell`), `:523` (`tableFill`) ; `toolbar-host.ts:7-14`, `:62` ; `item-state.ts:5-14` ; contre-relecture tour 1 | oui |
| R16 | Texte riche des cellules : vue | `TableCellView` gagne `spans` (lu par `read_spans`, C7 T8) ; `text` gardé. TS : `TableCell.spans`, exigé par `toElementView` ; faux cœur : cellule `{ text, spans, fill }`, JSON ancien sans `spans` → un segment. Écriture : `SetTableCell` par différence déjà (`table.rs:387-433`), `spans` de R7 ; sortie « inchangé » (`table.rs:410-412`) étendue aux segments ; cellule absente créée par `insert_cell` ou cellule sans `text` (`table.rs:420-424`) : attributs posés dans la même transaction, sur le `TextRef` relu après l'insertion. | U32 (`text: Y.Text`) ; DAU9 ; `table.rs:41-46`, `:190-210`, `:389-433` ; `wasm-core.ts:132-138` ; `fake-core.ts:153-160`, `:613-629` | oui |
| R17 | Texte riche des cellules : mesure et rendu | `cellContent` rend aussi `spans` ; `cellHeight(spans, size, colWidth, measure)` et `rowHeightsFor` mesurent par `layoutRich` des segments ; `cellTextBoxes` porte `spans` ; `cellLinesOf` (clé de cache sur les segments) remplace `plainSpans(b.text)` par `b.spans`. Même chemin de dessin du texte que les éléments (`paintText`, C7 T10). | `table-geom.ts:61-64`, `:108-116` ; `render/table-paint.ts:53-62` ; `render/canvas2d.ts:368-377` (« C7b remplacera `plainSpans` ») ; CL4-4 | oui |
| R18 | Ouverture d'une séance | `TextEditSession` porte déjà `spans` (C7 T11) : l'outil Texte passe `el.text.spans`, l'outil Tableau `cellContent(...).spans` (plus `plainSpans(text)`) ; `TextEditorHost` gagne `spans(): readonly TextSpan[]`, `format(a)`, `formatState()` ; `value()` reste (concaténation). | `tools/text.ts:21-42`, `:94-107` ; `tools/table.ts:127-143` | oui |
| R19 | Navigation des cellules | `editorMove` réutilisé tel quel sur le texte du modèle et la sélection UTF-16 relue du DOM (flèches au bord par lignes logiques, HC10-8) ; Tab, Maj+Tab inchangés (DAC3). | `text-editor.ts:36-46` ; DAC3 | oui |
| R20 | Licences et dépendances | Aucune dépendance ajoutée : ni ProseMirror, ni Lexical, ni Tiptap (MIT, permises par U39, mais leur modèle de document n'est pas un `Y.Text` à attributs ; `y-prosemirror` lie un `Y.XmlFragment`, ce qui serait une migration contraire à DAU9). Le contrôle des licences (`scripts/controle-licences.mjs`) reste vert sans changement. | U39 (`usage-cadrage.md:92`) ; DAU9 (« aucune migration ») | oui |
| R21 | Essais navigateur | Nouveau `scripts/essais/c7b-texte-riche-navigateur.mjs` sur le modèle de `c10a-tableau-navigateur.mjs` (dist servi en local avec la CSP de la coque, repli `?fichiers=repli`, heure figée, aucune requête hors 127.0.0.1, codes 0/1/2, `--captures` à la main seulement) ; IME par CDP `Input.imeSetComposition` puis `Input.insertText`, repli par événements synthétiques (patron de `s34-navigateur.mjs:135-170`) ; ajouté au bloc `--e2e` de `verifier.sh:91-101` et à `scripts/tests/verifier-e2e.test.sh`. Captures : `docs/essais/c7b-texte-riche.png`, `docs/essais/c7b-cellule-riche.png`. Les essais existants qui lisent la zone (`s34`, `s5b`, `c10a`) passent de `textarea#texte-edition` / `.value` / `inputValue` à `#texte-edition` / `textContent`, leurs vérifications inchangées. | brief OD79 (geste et captures) ; `s34-navigateur.mjs:114-200` ; `s5b-navigateur.mjs:227` ; `c10a-tableau-navigateur.mjs:53-54`, `:109` ; profil (aucune preuve visuelle automatique) | oui |
| R22 | Constat `coqueCsp` | `coqueCsp()` exportée de `scripts/essais/commun.mjs` ; le script neuf l'importe ; les quatre copies (`c2-image:25`, `c10a-tableau:27`, `c9-grille:19`, `fichiers:25`) la remplacent. Le constat ouvert du 2026-11-20 (`c10a-tableau-navigateur.mjs:27`, « trois copies ») se ferme à la clôture (il y en avait quatre). | `docs/architecture-constats.md` (ligne `usage-c10a-tableau`, `scripts/essais`) ; `anti-refactorisation.md` (ne pas aggraver un constat de la zone) | oui |
| R23 | Reste OD71 : écriture concurrente | **Non tranché** (changerait le modèle de document : cellules précréées ou clés par client). Mesuré par des tests du cœur (deux `Document` tirés des mêmes octets, mises à jour échangées dans les deux sens) : a) première écriture concurrente dans une cellule **absente** : les deux documents convergent et **une seule** des deux écritures reste — le test l'affirme, nommé et commenté comme mesure du défaut connu (il rougira le jour où le modèle le corrige) ; b) mises en forme concurrentes de deux mots différents d'un même texte ou d'une même cellule **existante** par `SetText` / `SetTableCell` avec `spans` : les deux restent (l'alignement n'écrit que les plages changées) ; c) frappe concurrente dans le même texte : les deux insertions restent. Le résultat va au rapport du chantier et aux hypothèses. | `docs/sessions/usage-c10a-tableau-etat.md:65` (« une écriture perdue ») ; étude grille-tableau § 5.3 (`docs/etudes/usage-grille-tableau.md:132-137`) ; brief OD79 (ne pas trancher) ; patron d'échange `commands.rs:2388-2393` | oui |
| R24 | Fichiers du tableau et C10b | Points de branchement minces dans les fichiers que C10b (OD80) touche aussi : champs ajoutés en fin (`TableCellView.spans`, `TableCell.spans`, `CellTextBox.spans`), une ligne dans `view()`, un appel à `rich_text::apply_spans` dans `cmd_set_table_cell`, `spans` passé dans `openActive` et `commit` de `tools/table.ts`. Toute la logique neuve vit dans les modules neufs (`rich-edit.ts`, `rich-dom.ts`, `FormatRow.tsx`) et dans `rich_text.rs` (fichier de C7). Ordre de fusion : le premier fusionné passe, l'autre rebase (constructeurs Rust de `SetTableCell` à compléter de `spans: None`). | brief OD79 (contrainte parallèle) ; C7 T14 (même patron d'ajouts groupés) ; `git worktree list` (C10b à l'étage 1) | oui |
| R25 | Ce que la zone ne fait pas | Pas de mise en forme d'un texte fermé depuis l'outil Sélection (le pot P1 et P2 de C6a la couvrent) ; pas de liste, d'alignement, de police dans la barre ; pas de glisser de texte dans la zone. | U28 (P1 « couleur d'un texte entier », P2 « mot par mot ») ; brief OD79 (périmètre) | oui |
| R26 | Tests de l'interface | Le modèle (`rich-edit.ts`) se teste en `node` (frappe, composition relue, bascule, format en attente, collage, historique, état de la barre) ; la zone (`text-editor.ts`, `rich-dom.ts`) en `happy-dom` (`// @vitest-environment happy-dom`, comme les composants) avec `compositionstart` / `compositionupdate` / `compositionend` et `beforeinput` simulés ; le geste réel en Playwright (R21). `text-editor.test.ts` est réécrit sur le contenteditable (son faux `<textarea>` disparaît) ; ses cas d'IME, d'Échap, de perte du focus et de navigation restent, à l'identique. | `vite.config.ts` (environnement `node`, `happy-dom` par fichier) ; `text-editor.test.ts:1-30` ; brief OD79 (« testée par événements simulés dans Vitest et Playwright ») | oui |

## 3. Carte d'impact

Rubriques déduites (profil sans ligne « Surfaces d'impact ») : cœur Rust, liaison Wasm, contrat et faux cœur TS, moteur
et rendu, zone de saisie et barre, persistance, essais navigateur, tests, autres dépôts. Fichiers du tableau partagés
avec C10b marqués **[T]**.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/commands.rs:65-` (`Command::SetText`) | oui | champ `spans: Option<Vec<SpanInput>>` (R7) | V |
| `src/commands.rs:117-123` (`Command::SetTableCell`) **[T]** | oui | champ `spans` (R7, R16) | V |
| `src/commands.rs:494`, `:554` (bras `apply`) | oui | passent `spans` | V |
| `src/commands.rs:671-` (`cmd_set_text`) | oui | contrôle des `spans` en premier, puis `rich_text::apply_spans` dans la même transaction ; inchangé si `None` | V |
| `src/commands.rs:701-708` (sortie « inchangé » de `cmd_set_text`) | oui | `same` gagne « attributs normalisés égaux à la cible » ; sinon une mise en forme seule serait perdue (R7) | V |
| `src/commands.rs:726-743` (`insert_text`, création en `TextPrelim`) | oui | `TextRef` relu après l'insertion, `apply_spans` dans la même transaction (R7) | V |
| `src/commands.rs:1061-` (`cmd_format_text`) | non | réutilisé tel quel par le pot P2 | V |
| `src/commands.rs:1926`, `:2033` et 11 autres constructions de `SetText` (tests, `document.rs:1204`) | oui | `spans: None` | V |
| `src/rich_text.rs:71` (`valid_attrs`), `:157` (`utf16_range`), `:200` (`read_spans`), `:254` (`apply_text_diff`) | non | réutilisés par `apply_spans` | V |
| `src/rich_text.rs:297-345` (`same_value`, `format_changes`, `apply_format` : comparaison des valeurs **brutes**) | non | gardés pour `FormatText` ; pas employés par `apply_spans`, qui compare la vue normalisée (R7) | V |
| `src/rich_text.rs:27-40` (`SpanAttrs`), `:175` (`normalize`) | non | réutilisés : état voulu des segments, comparaison normalisée (R7) | V |
| `src/rich_text.rs` (fin) | oui | `SpanInput`, `valid_spans(content, spans)`, `spans_differ(txn, text, spans) -> bool`, `apply_spans(txn, text, spans)` ; tests R7 (clé brute hors domaine non réécrite, segments sans attribut = mêmes octets que sans `spans`) et R23 (a, b, c) | V |
| `src/table.rs:41-46` (`TableCellView`) **[T]** | oui | champ `spans` en fin | V |
| `src/table.rs:157-178` (`read_cell`) **[T]** | non | rend déjà le `TextRef` de la cellule | V |
| `src/table.rs:190-210` (`view`) **[T]** | oui | une ligne `spans: read_spans(...)` | V |
| `src/table.rs:389-433` (`cmd_set_table_cell`) **[T]** | oui | contrôle des `spans` (avant `table_of`), `apply_spans` après la différence ou la création | V |
| `src/table.rs:410-412` (sortie « inchangé » : `current == content && grow.is_none()`) **[T]** | oui | étendue aux segments (R7, R16) | V |
| `src/table.rs:420-424` (cellule sans `text` : `TextPrelim` ; cellule absente : `insert_cell`) **[T]** | oui | `TextRef` relu, `apply_spans` dans la même transaction | V |
| `src/table.rs:295` (`insert_cell`), `:343-` (`cmd_add_table`), `:437-` à `:545-` (lignes, tailles, remplissage) **[T]** | non | création vide, structure : inchangés | V |
| `src/history.rs` | non | `expand_scope` sur `pages` suit les formats imbriqués (C7) | S |
| `src/document.rs:482-520` (`collect_any`) | non | T15 : aucune couleur citée comme asset | V |
| `src/format/mod.rs` | non | les attributs voyagent dans `document.ybin` (C7 T13) | V |
| `tests/tableau.rs`, `tests/scenarios.rs`, `tests/compat_socle.rs` | oui (`tableau.rs`, `scenarios.rs`) | aller-retour d'une cellule et d'un texte riches ; `compat_socle.rs` à garder vert | V |

### Liaison Wasm (`crates/roomboard-wasm/src/lib.rs`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:452` (`set_table_cell`), `:888` (`set_table_cell_inner`) **[T]** | oui | dernier paramètre `spans: JsValue` / `Option<Vec<SpanInput>>` | V |
| `:650` (`set_text`), `:1037` (`set_text_inner`) | oui | idem | V |
| `:212-247` (`PatchVisitor`, `read_patch` : lit un **objet**) | non | `PatchVisitor` réutilisé pour les `attrs` de chaque segment | V |
| après `:247` | oui | `read_spans_input` (`deserialize_seq` d'entrées `{ text, attrs }`), générique, testée en natif (R7) | V |
| `:684` (`format_text`) | non | inchangé | V |
| `scripts/controle-wasm-bindgen.sh` | non | aucune dépendance, aucune version changée | S |

### Contrat et faux cœur TS (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:1-15` (en-tête de contrat) | oui | ligne C7b | V |
| `api.ts:52-` (`SetText`), `:94` (`SetTableCell`) **[T]** | oui | `spans?: readonly TextSpan[]` | V |
| `api.ts:121` (`TableCell`) **[T]** | oui | `spans: readonly TextSpan[]` | V |
| `api.ts:227-244` (`TextAttrs`, `TextAttrsPatch`, `TextSpan`) | non | réutilisés | V |
| `rich-text.ts:35` (`editSpans`), `:110` (`formatSpans`), `:120` (`sameSpans`), `:9` (`plainSpans`), `:69` (`validPatch`) | non | réutilisés par le modèle et le faux cœur | V |
| `rich-text.ts` (fin) | oui | `validSpans(content, spans)`, `spansText(spans)` partagés par le faux cœur et le modèle ; `editSpansAt(spans, content, caret)` (R3) à côté d'`editSpans` | V |
| `fake-core.ts:462-500` (`SetText`) | oui | `spans` : contrôle puis segments posés | V |
| `fake-core.ts:467` (création : `plainSpans`) | oui | segments reçus si `spans` est donné | V |
| `fake-core.ts:490-492` (sortie « inchangé ») | oui | étendue aux segments (`sameSpans`) | V |
| `fake-core.ts:613-629` (`SetTableCell`), `:108`, `:153-160` (cellules, vue) **[T]** | oui | cellule `{ text, spans, fill }` | V |
| `fake-core.ts` (`save`, `load`) | oui | `spans` des cellules gardés ; JSON ancien → un segment | S |
| `wasm-core.ts:338-342` (`SetText`), `:367-368` (`SetTableCell`) **[T]** | oui | `spans` passé (attributs nettoyés par `cleanPatch`) | V |
| `wasm-core.ts:132-138` (`toElementView`, cellules) **[T]** | oui | contrôle de `spans` | V |

### Moteur et rendu (`apps/web/src/engine`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `rich-edit.ts` (nouveau) | oui | modèle pur de la séance (DAR2, DAR3) | V |
| `tools/text.ts:21-42` (`TextEditSession`, `TextEditorHost`) | oui | hôte : `spans()`, `format(a)`, `formatState()` (R18) | V |
| `tools/text.ts:44-51`, `:60-86`, `:139-150` (`TextTool`, `commit`) | oui | `format`, `formatState` ; commit avec `spans` (R6) | V |
| `tools/table.ts:56-61`, `:97-115`, `:118-144` (`Opened`, `commit`, `openActive`) **[T]** | oui | `initialSpans`, commit avec `spans`, ouverture sur `cellContent(...).spans` | V |
| `tools/table.ts:146-323` (création, lignes, uniformiser, navigation) **[T]** | non | inchangés ; `uniform` mesure par `rowHeightsFor` étendu | V |
| `tools/tool.ts:56-69` (`TableTool`) **[T]** | oui | `format`, `formatState` | V |
| `tools/commit-gate.ts` | non | réutilisé tel quel (R5) | V |
| `engine.ts:195-209` (`state`), `:523` (`tableFill`) | oui | `textFormat` dans l'état, `textFormat(a)` | V |
| `table-geom.ts:61-64` (`cellContent`), `:108-116` (`cellHeight`, `rowHeightsFor`) **[T]** | oui | segments (R17) | V |
| `render/table-paint.ts:8-12`, `:53-62` (`CellTextBox`, `cellTextBoxes`) **[T]** | oui | `spans` | V |
| `render/table-paint.ts:22-` (`paintTableGrid`) **[T]** | non | fonds et traits | V |
| `render/canvas2d.ts:368-377` (`cellLinesOf`) **[T]** | oui | `b.spans`, clé de cache | V |
| `render/canvas2d.ts:359-366` (`linesOf`), `paintText` | non | déjà par segments (C7) | V |
| `text-layout.ts:10` (`TEXT_SIZES`), `:23` (`textFont`), `:83` (`faceOf`), `:206` (`layoutRich`) | non | réutilisés | V |
| `input/keys.ts:14-44` | non | zone éditable déjà exclue (R11) | V |

### Zone de saisie et barre (`apps/web/src/app`, `apps/web/src/ui`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `app/text-editor.ts:60-135` (`createTextEditor`) | oui | contenteditable (R2-R5, R10-R12) ; `cssMatrix`, `editorMove` gardés | V |
| `app/rich-dom.ts` (nouveau) | oui | segments → DOM, DOM → texte, sélection UTF-16 (DAR2) | V |
| `app/board-session.ts:143-147`, `:332`, `:339`, `:360` | non | même fabrique, même `element` (type élargi à `HTMLElement`) | V |
| `app/toolbar-host.ts:7-14`, `:16`, `:62` | oui | `textFormat(a)` | V |
| `ui/item-state.ts:5-14` (`ToolbarView`) | oui | `textFormat?: FormatState \| null` | V |
| `ui/Toolbar.tsx:159-160` | oui | une ligne `<FormatRow …/>` | V |
| `ui/Toolbar.tsx:111-141` (`TableActionRow`) **[T]** | non | voisin seulement | V |
| `ui/FormatRow.tsx` (nouveau) | oui | rangée Format, `TEXT_COLORS` (R13, R14) | V |
| `ui/rb.css` | oui | style des boutons G, I, S, pastilles (porte visuelle) | S |
| `toolbar.ts:98-141` (`ACTION_TABLE`, `TABLE_ACTIONS`, `TABLE_FILLS`) **[T]** | non | rien de neuf ici (R14) | V |
| `profile-edit.ts` (catalogue) | non | la rangée n'y entre pas (R13) | S |
| `platform/paste.ts:12-24`, `main.ts:109-116` | non | collage global : cible éditable déjà ignorée (R12) | V |

### Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `document.ybin` (attributs du `Y.Text` de texte et de cellule) | non (format) | aucun champ neuf ; preuve par aller-retour (S1, tests) | V |
| `tests/fixtures/socle-v1.roomboard` | non | rechargé et réenregistré sans édition : mêmes octets (C7 T12, gardé) ; édité par un `SetText` à segments sans attribut : même mise à jour qu'un `SetText` sans `spans` (R7, S5) | V |
| fichiers `.roomboard` de C10a (cellules sans attribut) | non | vue : un segment sans attribut | S |

### Essais navigateur (`scripts`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/essais/c7b-texte-riche-navigateur.mjs` (nouveau) | oui | S1-S4 au navigateur (R21) | V |
| `scripts/essais/commun.mjs` | oui | `coqueCsp` exportée (R22) | V |
| `scripts/essais/s34-navigateur.mjs:63-200` | oui | zone lue par `textContent` ; IME CDP et synthétique sur le contenteditable | V |
| `scripts/essais/s5b-navigateur.mjs:227` | oui | sélecteur `#texte-edition` | V |
| `scripts/essais/c10a-tableau-navigateur.mjs:27-31`, `:53-54`, `:109` **[T]** | oui | `textContent`, `coqueCsp` importée | V |
| `scripts/essais/c2-image-navigateur.mjs:25`, `c9-grille-navigateur.mjs:19`, `fichiers-navigateur.mjs:25` | oui | `coqueCsp` importée | V |
| `scripts/verifier.sh:91-101`, `scripts/tests/verifier-e2e.test.sh` | oui | essai neuf listé | V |
| `docs/essais/c7b-texte-riche.png`, `docs/essais/c7b-cellule-riche.png` | oui | captures du brief | V |

### Tests (entrée non touchée = test à garder vert)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/rich_text.rs` (tests T4-T16) | non | à garder verts | V |
| `crates/roomboard-core/src/commands.rs:2529-` (tests C7 : `format_text_is_one_step_and_reads_spans`, `format_text_checks_in_order_without_transaction`, `set_text_keeps_range_attributes_outside_the_edit`) | non | à garder verts | V |
| `crates/roomboard-core/src/table.rs:1298`, `:1378` (vue littérale des cellules, une étape) **[T]** | oui | `spans` dans l'attendu | V |
| `crates/roomboard-wasm/src/lib.rs:1602` (`format_text_inner_formats_and_reads_spans`), `:1312` | non | à garder verts | V |
| `apps/web/src/core/wasm-core.contract.test.ts` (vue des cellules, `SetText`) | oui | `spans` des cellules ; `SetText` et `SetTableCell` avec `spans` dans les deux cœurs | V |
| `apps/web/src/core/fake-core.test.ts` | oui | `spans`, JSON ancien de cellule | V |
| `apps/web/src/core/rich-text.test.ts` | oui | `validSpans`, `spansText` | V |
| `apps/web/src/engine/rich-edit.test.ts` (nouveau) | oui | modèle (R26) | V |
| `apps/web/src/app/rich-dom.test.ts` (nouveau) | oui | `happy-dom` | V |
| `apps/web/src/app/text-editor.test.ts` | oui | réécrit sur le contenteditable, mêmes cas (R26) | V |
| `apps/web/src/engine/tools/text.test.ts`, `tools/table.test.ts` **[T]** | oui | faux hôte : `spans()`, `format`, `formatState` ; commit avec `spans` | V |
| `apps/web/src/engine/tools/commit-gate.test.ts`, `input/keys.test.ts` | non | à garder verts | V |
| `apps/web/src/engine/table-geom.test.ts`, `render/canvas2d.test.ts` **[T]** | oui | cellules par segments | V |
| `apps/web/src/engine/text-layout.test.ts` | non | à garder vert | V |
| `apps/web/src/app/board-session.test.ts:130` | oui | `HTMLTextAreaElement` → `HTMLElement` | V |
| `apps/web/src/app/board-session.test.ts:209` (`querySelector("textarea")` nul après `dispose`) | oui | devient `querySelector("#texte-edition, [contenteditable]")` : sinon toujours vrai, le test ne prouve plus rien | V |
| `apps/web/src/ui/Toolbar.test.tsx`, `ui/FormatRow.test.tsx` (nouveau) | oui | rangée visible avec l'outil Texte ou Tableau, boutons désactivés hors séance, `aria-pressed`, « Défaut » et taille de l'élément enfoncés sans attribut, `pointerdown` et `mousedown` empêchés | V |
| `apps/web/src/engine/engine.test.ts` | oui | `textFormat` dans l'état | S |
| `apps/web/src/platform/paste.test.ts` | non | à garder vert | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `roomboard-web`, `claude-config` | non | aucun lien | S |

### Effets de bord sur l'existant

- La zone de saisie n'est plus un `<textarea>` (R1, R2) : essais `s34` (IME), `s5b`, `c10a` adaptés, vérifications
  identiques ; `text-editor.test.ts` réécrit, mêmes cas ; `board-session.test.ts:130`, `:209`.
- L'annulation dans la zone n'est plus celle du navigateur (R10) : `rich-edit.test.ts` (« Ctrl+Z annule la dernière
  mise en forme seule ») et S2 au navigateur.
- Cliquer un bouton de la barre ne valide plus la séance (R13) : `FormatRow.test.tsx` (« `pointerdown` et `mousedown` empêchés,
  pas de perte du focus ») et S1. Les autres boutons de la barre valident toujours (perte du focus) : `text-editor.test.ts`.
- Une cellule écrite par C10a se lit avec un segment sans attribut et se dessine comme avant : `canvas2d.test.ts`
  (appels identiques pour une cellule sans attribut), `table-geom.test.ts` (hauteur identique).
- `SetText` et `SetTableCell` sans `spans` gardent leur comportement : tests C7 et C10a existants, verts sans changement.
- Rangée Format montrée selon l'outil (R13) : avec l'outil Texte ou Tableau, la barre peut prendre une ligne de plus à
  1 280 px (HC10-15), mais sa hauteur ne change ni à l'ouverture ni à la validation d'une séance :
  `c7b-texte-riche-navigateur.mjs` mesure la boîte de `#stage` avant l'ouverture, pendant la séance et après la
  validation (égales), puis `noOverlap` et scène ≥ 640 px.
- Une mise en forme seule (texte inchangé) est maintenant une écriture, jamais « inchangé » : tests R7 du cœur et du
  faux cœur, S6.

### Chantiers en cours

- `feat/usage-c10b-tableau` (`/home/adminjd/projets/roomboard-wt/usage-c10b-tableau`, OD80, étage 1, aucun fichier
  modifié à 425d617) : fusion, ombrage, collage `<table>` HTML, `.xlsx`. Fichiers communs probables : `table.rs`
  (`TableCellView`, `view`, `cmd_set_table_cell`), `commands.rs` (enum), `lib.rs` Wasm, `api.ts` (`TableCell`), `fake-core.ts`,
  `wasm-core.ts`, `table-geom.ts`, `table-paint.ts`, `canvas2d.ts`, `tools/table.ts`, `Toolbar.tsx` (voisin), `toolbar.ts`
  (pas touché ici), `c10a-tableau-navigateur.mjs`. Règle : son collage `<table>` doit rester hors d'une zone éditable
  (`paste.ts:12-17`) ; dans la zone, R12 colle du texte simple.
- PR ouvertes : aucune (`gh pr list` : vide). Autre machine : aucune donnée de l'orchestrateur.

### Termes cherchés

- Graphe : aucun (pas de graphe RoomBoard).
- `grep -n "C7\|U27\|DAU9\|D14\|textarea\|IME\|riche" docs/plans/usage-cadrage.md` ;
  `grep -n "C7b\|riche\|spans" docs/plans/usage-c10a-tableau-cadrage.md docs/plans/usage-c7-texte-riche-cadrage.md` ;
  `grep -n "DAC3 —\|HC10-10\|HC10-15\|HC10-8" docs/plans/usage-c10a-tableau-cadrage.md`.
- `grep -rn "FormatText\|format_text" crates` ; `grep -n "SetTableCell\|TableCellView\|cell_text" crates/roomboard-core/src/*.rs` ;
  `grep -rn "Command::SetText {" crates | wc -l` (13) ; `grep -rn "Command::SetTableCell {" crates | wc -l` (4).
- `grep -rn "contenteditable\|beforeinput\|execCommand" apps/web/src` (seulement `paste.ts:14`, `proto/stylet.ts:287`) ;
  `grep -rn "getSelection\|createRange\|selectionchange" apps/web/src` (rien) ; `grep -rn "\"paste\"\|clipboardData" apps/web/src`.
- `grep -rn "createTextEditor\|TEXT_EDITOR_ID\|texte-edition" apps/web/src scripts/essais` ;
  `grep -rn "textarea\|inputValue\|\.value" scripts/essais/*.mjs` ; `grep -n "coqueCsp" scripts/essais/*.mjs`.
- `grep -rn "TEXT_SIZES\|presets" apps/web/src` ; `grep -n "tableFill\|tableCell" apps/web/src/engine/engine.ts apps/web/src/app/toolbar-host.ts` ;
  `grep -n "cellHeight\|cellContent\|plainSpans" apps/web/src/engine/table-geom.ts apps/web/src/engine/render/*.ts`.
- Tour 1 de contre-relecture : `grep -n "fn read_patch\|PatchVisitor\|deserialize_map\|deserialize_seq" crates/roomboard-wasm/src/lib.rs`
  (objet seul, aucune liste) ; `grep -n "fn normalize\|fn format_changes\|fn same_value" crates/roomboard-core/src/rich_text.rs` ;
  `grep -n "same\|insert_text\|TextPrelim" crates/roomboard-core/src/commands.rs crates/roomboard-core/src/table.rs` ;
  `grep -n "unchanged\|plainSpans" apps/web/src/core/fake-core.ts` ; `grep -n "textarea" apps/web/src/app/board-session.test.ts` ;
  `grep -n "mousedown" apps/web/src/app/board-session.ts`.
- `grep -rn -i "concurren\|écriture concurrente" docs crates apps/web/src` ;
  `grep -n "apply_update\|encode_state_as_update" -r crates/roomboard-core/src`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Différence de texte avec héritage (relecture du DOM) | `apps/web/src/core/rich-text.ts:35` | `editSpans(spans, content)` ; étendue par `editSpansAt(spans: readonly TextSpan[], content: string, caret: number): TextSpan[]` (suffixe borné par le curseur, R3), même module, même `spansOf` | étendre |
| Poser un patch sur une plage (barre, raccourcis) | `apps/web/src/core/rich-text.ts:110` | `formatSpans(spans, start, len, patch)` | réutiliser |
| Comparer, créer des segments | `apps/web/src/core/rich-text.ts:9`, `:11`, `:120` | `plainSpans`, `sameAttrs`, `sameSpans` | réutiliser |
| Contrôler des segments reçus (TS) | `apps/web/src/core/rich-text.ts:69` (`validPatch`) | `validSpans(content: string, spans: readonly TextSpan[]): boolean` ajoutée à côté | étendre |
| Différence et formats dans le cœur | `crates/roomboard-core/src/rich_text.rs:254` (`apply_text_diff`), `:175` (`normalize`), `:157` (`utf16_range`) | `valid_spans(content: &str, spans: &[SpanInput]) -> bool`, `spans_differ<T: ReadTxn>(txn: &T, text: &TextRef, spans: &[SpanInput]) -> bool` (sortie « inchangé »), `apply_spans(txn: &mut TransactionMut, text: &TextRef, spans: &[SpanInput])` (clés normalisées qui diffèrent seulement) ; `format_changes` (`:309`, brut) non employé | étendre |
| Contrôler les valeurs d'attribut (Rust) | `crates/roomboard-core/src/rich_text.rs:71` | `valid_attrs` | réutiliser |
| Lire les segments venus de la page (Wasm) | `crates/roomboard-wasm/src/lib.rs:212` (`PatchVisitor`), `:179` (`wire_attr`) | `read_spans_input<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<SpanInput>, CommandError>` : liste d'objets `{ text, attrs }`, `attrs` lu par `PatchVisitor` (`read_patch` lit un objet seul) | étendre |
| Commit d'un texte, d'une cellule | `crates/roomboard-core/src/commands.rs:671`, `table.rs:389` | `SetText`, `SetTableCell` + `spans` (R7) | étendre |
| Vue des segments d'une cellule | `crates/roomboard-core/src/rich_text.rs:200` | `read_spans(txn, text)` | réutiliser |
| Porte IME | `apps/web/src/engine/tools/commit-gate.ts:16` | `createCommitGate(commit, open)` | réutiliser |
| Placement CSS, navigation au bord | `apps/web/src/app/text-editor.ts:36`, `:54` | `editorMove`, `cssMatrix` | réutiliser |
| Zone de saisie unique | `apps/web/src/app/text-editor.ts:60` | `createTextEditor(parent, events)` → contenteditable ; `TextEditorEvents.formatChanged?()` | étendre |
| Hôte de saisie des outils | `apps/web/src/engine/tools/text.ts:38` | `TextEditorHost` + `spans()`, `format(a: FormatAction)`, `formatState(): FormatState \| null` | étendre |
| Police CSS d'un segment | `apps/web/src/engine/text-layout.ts:23`, `:83` | `textFont(size, face)`, `faceOf(style)` | réutiliser |
| Mise en lignes, hauteur | `apps/web/src/engine/text-layout.ts:206` | `layoutRich`, `richBoxHeight` | réutiliser |
| Mesure d'une cellule | `apps/web/src/engine/table-geom.ts:61`, `:108`, `:113` | `cellContent` (+ `spans`), `cellHeight(spans, size, colWidth, measure)`, `rowHeightsFor` | étendre |
| Dessin d'une cellule | `apps/web/src/engine/render/canvas2d.ts:369`, `render/table-paint.ts:53` | `cellLinesOf`, `cellTextBoxes` (+ `spans`) | étendre |
| État et action de la barre | `apps/web/src/engine/engine.ts:205`, `:523` ; `app/toolbar-host.ts:13` ; `ui/item-state.ts:5` | patron `tableFill` : `textFormat(a)`, `ToolbarView.textFormat` | étendre |
| Rangée contextuelle de la barre | `apps/web/src/ui/Toolbar.tsx:111` (`TableActionRow`) | composant voisin `FormatRow(props: { view, host })` | nouveau module : `ui/FormatRow.tsx` — `TableActionRow` est propre au tableau (actions de `TABLE_ACTIONS`) ; termes cherchés : `rangée`, `PresetRow`, `TableActionRow`, `aria-pressed` |
| Collage global d'image | `apps/web/src/platform/paste.ts:12` | `isEditable` (déjà appelé par `main.ts:110`) | réutiliser |
| Raccourcis globaux hors zone | `apps/web/src/engine/input/keys.ts:17` | `inEditable` | réutiliser |
| Modèle de séance (segments, sélection, format en attente, historique local, état de la barre) | aucun | `createRichEdit(initial: readonly TextSpan[], base: { size: number; color: string }): RichEdit` (DAR2) | nouveau module : `engine/rich-edit.ts` — termes cherchés : `history`, `undoStack`, `snapshot`, `pending`, `selection` dans `apps/web/src` : seul `History` du cœur (D11), qui n'annule que le document |
| Segments ↔ DOM, sélection en UTF-16 | aucun | `renderSpans`, `readText`, `readSelection`, `setSelection` (DAR2) | nouveau module : `app/rich-dom.ts` — termes cherchés : `getSelection`, `createRange`, `selectionchange`, `contenteditable` : rien |
| Essais navigateur | `scripts/essais/commun.mjs:25-148` | `loadPlaywright`, `serve`, `frames`, `inkIn`, `stageMouse`, `noOverlap`, `item` ; `coqueCsp` exportée (R22) | réutiliser / étendre |
| Échange de mises à jour entre deux documents (tests R23) | `crates/roomboard-core/src/commands.rs:2388-2393` (patron de test) ; `document.rs:356` (`encode_v1`) | `apply_update(Update::decode_v1(...))` sur le `Doc` interne, en test | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 (visibles des utilisateurs ou difficiles à défaire)**

- **HC7b-1** Le `<textarea>` disparaît de la scène, texte simple compris (R1) ; U27 le gardait « pour le texte simple ».
  Si Jérôme le veut ailleurs (champ de saisie plat), il reviendra comme zone à part, sans toucher au document.
- **HC7b-2** Annulation à deux temps (R10) : dans la séance, étape par action ; après validation, toute la séance en une
  étape. Alternative écartée pour ce chantier : chaque mise en forme écrite tout de suite comme étape du document (plus
  proche d'un traitement de texte, mais plusieurs étapes par séance et un document modifié sous une zone ouverte).
- **HC7b-3** Barre en rangée de la barre des outils (R13), couleurs « Défaut », noir, rouge, bleu, vert (R14), tailles
  24, 36, 48, 72 : à montrer à la porte visuelle de fin de lot ; à 1 280 px, la barre peut prendre une ligne de plus avec
  la rangée du tableau (HC10-15 prolongée).
- **HC7b-4** Ctrl+B, I, U pris par la zone sur toutes les plates-formes, Cmd aussi sous Windows et Linux (comme
  `keys.ts`), jamais avec Alt.
- **HC7b-5** Format en attente au curseur (R9), oublié quand l'utilisateur déplace le curseur (clic, flèches), jamais
  par une composition, une frappe ou un redessin.
- **HC7b-6** Collage : texte simple même quand le presse-papiers porte du HTML mis en forme ; dépôt dans la zone refusé (R12).

**Niveau 2**

- **HC7b-7** Le contenteditable de WebView2, WKWebView, WebKitGTK et Chromium émet `beforeinput` annulable pour
  `insertParagraph`, `insertFromPaste`, `formatBold` et `historyUndo` hors composition ; la lecture robuste (`<br>`, blocs)
  couvre un moteur qui insérerait quand même (le `<br data-rb-fin>` du rendu restant ignoré). Vérifié par la
  contre-relecture sous Chromium seulement ; WKWebView et WebKitGTK (dont le focus au `mousedown`, R13) : essai de
  plate-forme. IME réelle par plate-forme (iPad, Android) : essai de Jérôme.
- **HC7b-8** La mise en lignes du DOM pendant l'édition peut différer légèrement de celle du canvas (tailles mêlées,
  coupure des mots trop longs) ; la hauteur écrite vient de `layoutRich` (CL4-4), jamais du DOM.
- **HC7b-9** CDP `Input.imeSetComposition` puis `Input.insertText` produisent `compositionstart` puis `compositionend` sur
  un contenteditable, comme sur le `<textarea>` (`s34-navigateur.mjs:135-170`) ; sinon repli synthétique.
- **HC7b-10** `happy-dom` (21.0.4) suffit pour `Selection`, `Range` et les événements de composition simulés ; à défaut,
  le modèle pur porte les cas et Playwright le reste.
- **HC7b-11** Une suite de frappe forme une étape de séance, coupée par une action, un collage, Entrée ou un déplacement
  du curseur (R10).
- **HC7b-12** R23 a) affirme la perte mesurée aujourd'hui (une écriture sur deux) ; elle se tranchera avant de brancher
  la collaboration.
- **HC7b-13** Choisir la taille de l'élément retire l'attribut `size` (R8) ; choisir une couleur égale à celle de
  l'élément l'écrit (seul « Défaut » la retire).

## 5. Décisions d'architecture

**DAR1 — Commit riche en une transaction : `spans` facultatif sur `SetText` et `SetTableCell`.**
Contexte : une séance mêle frappe et mises en forme ; `FormatText` après `SetText` ferait plusieurs étapes (D11, horloge 0).
Décision : la validation envoie l'état voulu (`content` + `spans`) ; le cœur applique la différence puis aligne les
attributs connus, plage par plage, dans la même transaction ; `spans` absent = comportement d'aujourd'hui.
Conséquences : une étape par séance (D14), aucun format de fichier changé, clés inconnues et embeds gardés. Réversible (API interne, D10).

**DAR2 — Zone riche = modèle pur + adaptateur DOM.**
Contexte : l'IME interdit d'empêcher la frappe (`insertCompositionText` non annulable) ; `execCommand` est déprécié et inégal.
Décision : `engine/rich-edit.ts` (`createRichEdit(initial, base)` → `state()`, `input(text, start, end)` (texte et sélection
relus après la frappe, différence ancrée par `editSpansAt`), `select(start, end)` (oublie le format en attente si elle change),
`insert(text)`, `format(a) -> boolean`, `formatState()`, `undo()`, `redo()`) ; `app/rich-dom.ts` (`renderSpans(root, spans, base)`,
`readText(root)`, `readSelection(root)`, `setSelection(root, start, end)`) ; `text-editor.ts` les relie aux événements.
Conséquences : l'héritage suit la règle T5 du cœur, ancré au curseur ; le modèle se teste sans DOM. Réversible.

**DAR3 — Historique local de séance, une étape du document à la validation.**
Contexte : D14 écrit une édition en une transaction à la validation ; l'annulation native du contenteditable ignore nos redessins.
Décision : la zone tient sa pile (états `{segments, sélection}`) et prend Ctrl+Z / Ctrl+Y / `historyUndo` / `historyRedo` ;
`History` (D11) ne reçoit que la commande de validation.
Conséquences : rien n'est écrit pendant une séance (D38, collaboration plus simple) ; après validation, une seule étape. Réversible.

**DAR4 — Barre de format par le patron `tableFill`.**
Contexte : la barre (Solid) ne connaît que `ToolbarView` et `ToolbarHost` (U15) ; la sélection vit dans la zone.
Décision : zone → outil actif (`formatState`, `format`) → moteur (`state().textFormat`, `textFormat(a)`) → hôte et vue ;
la zone signale ses changements par `TextEditorEvents.formatChanged?()`.
Conséquences : aucun lien direct barre ↔ DOM de la zone ; rangée neuve `FormatRow.tsx`, une ligne dans `Toolbar.tsx`. Réversible.

## 6. Scénarios d'acceptation

- **S1 — Texte et cellule riches, enregistrés puis rouverts** (geste Playwright du brief, captures) : outil Texte, clic,
  écrire « Le chat noir » ; sélectionner « chat » ; cliquer G puis la pastille rouge de la rangée Format (la zone reste
  ouverte, la sélection aussi) ; Échap : sur la scène, « chat » est gras et rouge, le reste comme avant. Outil Tableau,
  2 × 2 ; la rangée Format est là, grisée, et la scène ne bouge pas à l'ouverture de la cellule ; dans la première
  cellule, écrire « aa », curseur entre les deux « a », Ctrl+B, écrire « a » : la deuxième lettre est grasse, pas la
  troisième ; Fin, Ctrl+B, puis écrire « Total » ; Tab : « Total » est gras dans la cellule. Ctrl+S, puis
  rouvrir le fichier : « chat » gras rouge, la deuxième lettre de « aaa » et « Total » gras sont là ; captures `c7b-texte-riche.png`, `c7b-cellule-riche.png`.
- **S2 — Une mise en forme s'annule en une étape** : rouvrir « Le chat noir » ; sélectionner « noir », Ctrl+I ; Ctrl+Z dans
  la zone : l'italique part, le texte et la sélection restent ; Ctrl+I à nouveau, Échap ; Ctrl+Z hors de la zone :
  l'italique part en une étape, « chat » reste gras rouge ; Ctrl+Y : il revient.
- **S3 — Composition IME dans un texte riche et dans une cellule** : curseur après « chat » (gras rouge) ; composition
  « ni » : rien n'est écrit dans le document, Échap et Ctrl+B pendant la composition sont laissés à l'IME, un clic
  ailleurs attend ; la composition se valide en « にほん » : le texte est écrit en une étape, « にほん » gras et rouge
  (attributs du caractère précédent). Même composition dans une cellule : écrite par `SetTableCell` à la fin seulement.
  **Ctrl+B puis composition** : curseur seul après un mot sans attribut, Ctrl+B, composition « に » validée en « に » :
  « に » est gras (le format en attente survit aux `selectionchange` de la composition et du redessin) ; puis clic
  ailleurs dans la zone, frappe : plus de gras (format oublié par le déplacement).
- **S4 — Collage de texte simple** : copier un passage mis en forme (presse-papiers `text/html` + `text/plain`) ; dans une
  cellule ouverte, au milieu d'un mot gras, coller : le texte brut est inséré en gras (attributs du caractère précédent),
  aucune image ni aucun tableau importé ; Ctrl+Z dans la zone : le collage part seul.
- **S5 — Compatibilité et écritures concurrentes** (tests du cœur) : sur `socle-v1.roomboard` et sur un document neuf,
  un `SetText` dont les segments n'ont aucun attribut produit la **même** mise à jour (mêmes octets de `document.ybin`)
  qu'un `SetText` sans `spans` ; un texte dont une plage porte une valeur brute hors domaine (`bold: "oui"`) garde cette
  valeur après un `SetText` avec `spans` qui ne touche pas cette plage ; une cellule de C10a se dessine comme avant ; deux documents tirés des mêmes
  octets mettent en forme deux mots différents d'un même texte : après échange, les deux formats restent ; première
  écriture concurrente dans une même cellule absente : les deux documents convergent sur une seule écriture (mesure R23 a).
- **S6 — Mise en forme seule, sans changer le texte** : outil Tableau, ouvrir une cellule existante « Total » (sans
  attribut), tout sélectionner, cliquer I, Échap : la cellule est en italique (une `SetTableCell` au même contenu est
  écrite, pas « inchangé ») ; Ctrl+Z : l'italique part en une étape, « Total » reste. Même geste sur un texte avec
  l'outil Texte et validation par clic ailleurs : même résultat.

## 7. Hors périmètre

- IME réelle par plate-forme (iPad, Android en attente de KVM) : essai de Jérôme (état du chantier).
- Correction de la perte d'écriture concurrente dans une cellule absente (OD71) : mesurée (R23), à trancher avant la
  collaboration ; cellule orpheline après suppression concurrente : idem.
- Mise en forme d'un texte fermé depuis l'outil Sélection, police, listes, alignement, glisser de texte (R25) ; couleur
  par le pot (C6a).
- Collage d'un `<table>` HTML, fusion, ombrage, `.xlsx` : C10b (OD80), qui garde son collage hors des zones éditables.
- Build Tauri, essais de la coque, seuils : aucun changement.

## 8. Portes immédiates

Aucune.
