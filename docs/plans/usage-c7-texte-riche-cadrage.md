# Cadrage — usage-c7-texte-riche (C7, texte riche par plages)

Mode autonome (brief OD44, Jérôme dort). Coffre : aucune note RoomBoard sur le texte riche (`chercher.js` « RoomBoard Yrs
Y.Text attributs SetText » et « canvas mise en lignes texte mesure police » : rien de pertinent, recherche non dégradée).
Graphe : aucun pour RoomBoard (`~/.cache/graphes/` : `claude-config`, `roomflow2`, `roomflow2-web`) : recherche texte
seule. `docs/architecture-constats.md` : absent. Aucune demande « Constats à fermer ».

## 1. Demande et gabarit

**Demande** : les textes du tableau portent des attributs par plage (gras, italique, souligné, couleur, taille, police),
gardés à l'édition (`SetText` par différence) et à l'enregistrement, posés par `FormatText`, mis en lignes et rendus par
segments dans le canvas ; l'éditeur riche (contenteditable, barre) reste à C7b.

**Gabarit** : chantier, cadrage court (15 questions au plus, aucune décision d'architecture nouvelle : U27 et DAU9 de
`docs/plans/usage-cadrage.md` s'appliquent telles quelles).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| T1 | Où vivent les attributs | Attributs de plage du `Y.Text` `content` de l'élément texte (celui du lot 4) ; aucun nouveau champ d'élément, aucune migration ; `schema` reste 1. | U27 (`usage-cadrage.md:80`) ; DAU9 (`usage-cadrage.md:396-400`, « aucune migration ») ; `commands.rs` `read_text` (`:212`) et `insert_text` (`:603`, `content` en `TextPrelim`) | oui (DAU9) |
| T2 | Attributs et types | Clés Yrs : `bold`, `italic`, `underline` (booléen, écrit seulement `true`), `color` (chaîne CSS), `size` (nombre fini > 0, unités monde), `font` (nom de famille). Toute autre clé lue est gardée dans le document et ignorée de la vue. | U27 (`color`, `bold`, `italic`, `underline`, `size`) ; brief OD44 (« police au minimum » → `font`) ; hypothèse HC7-3 pour la forme de `font` | oui |
| T3 | Défaut d'un caractère sans attribut | `color` absent → couleur de l'élément ; `size` absent → taille de l'élément ; `font` absent → `TEXT_FONT_FAMILY` ; booléens absents → faux. `SetText` continue d'écrire `color`, `size` de l'élément. | U27 (« la couleur de l'élément restant le défaut (D14) ») ; D14 (`socle-cadrage.md:41`) ; `text-layout.ts:5` | oui |
| T4 | `SetText` par différence | Sur un texte existant, `SetText` calcule la différence **en points de code Unicode, des deux côtés** (Rust : `chars()` ; TS : `Array.from(s)`, jamais les unités UTF-16) : d'abord le plus long **préfixe** commun, puis le plus long **suffixe** commun des deux restes (sans chevaucher le préfixe) ; positions converties en octets UTF-8 pour Yrs (embeds comptés, T16) ; supprime le milieu ancien, insère le milieu neuf ; les champs d'élément (`color`, `size`, `boxWidth`, `boxHeight`) s'écrivent comme aujourd'hui, dans la **même** transaction ; contenu et champs inchangés : aucune transaction (règle actuelle gardée). Création (`id: null`) et vidage (contenu vide = élément retiré) inchangés. | U27 (« préfixe et suffixe communs, puis suppression et insertion au milieu ») ; `commands.rs:588-595` (code à remplacer, lu) ; D38 ; `usage-cadrage.md:200-201` (tests nommés) | oui |
| T5 | Attributs du texte inséré | Le milieu neuf prend les attributs connus et inconnus du caractère qui le précède (`insert_with_attributes`, attributs du caractère `p - 1`) ; inséré en tête (`p = 0`) : aucun attribut. Ainsi « Le chat noir » → « Le gros chat noir » laisse « gros » sans couleur et « chat » rouge. | HU2-15 (`usage-cadrage.md:324`, « à prouver par un test en C7 ») ; S8 (`usage-cadrage.md:440-442`) ; lecture de `yrs-0.28.1/src/types/text.rs:212-231` (`insert` sans attribut : dépend de la place des marques de format) → choix explicite | oui (HC7-1) |
| T6 | Unité des positions de `FormatText` | `start` et `len` en **unités UTF-16** (indices de chaîne JS, ceux qu'auront le pot P2 et l'éditeur C7b) ; le cœur convertit en octets UTF-8 (le `Doc` est en `OffsetKind::Bytes`) ; une borne au milieu d'une paire de substitution ou au-delà de la longueur : erreur `BadFormat`, sans écriture. | `document.rs:89` (`Doc::new()`) et `yrs-0.28.1/src/doc.rs:518` (`offset_kind: OffsetKind::Bytes` par défaut), lus ; JS en UTF-16 (convention) | oui (HC7-2) |
| T7 | Contrat de `FormatText` | `FormatText{id, start, len, attrs}` = une étape (D11). `attrs` est un **patch** : clé absente = inchangée ; `bold: false` **ou `bold: null`** (de même `italic`, `underline`) = attribut retiré ; `color`, `size`, `font` à `null` = attribut retiré (retour au défaut T3). Une clé à `undefined` vaut une clé absente : `wasm-core.ts` et `fake-core.ts` retirent les clés `undefined` avant tout traitement (sinon `serde-wasm-bindgen` la lirait comme `null`, donc comme un retrait). Valeurs permises : T15 (`color`, `font`), `size` fini > 0 (`element::finite_positive`, `element.rs:214`). **Ordre des contrôles**, le même dans les deux cœurs : 1) patch (clé inconnue, valeur au mauvais type ou hors domaine) → `BadFormat` ; 2) `boxHeight` donné mais non fini ou ≤ 0 → `BadFormat` ; 3) élément absent ou qui n'est pas un texte → `UnknownElement` ; 4) bornes (`start + len` au-delà de la longueur UTF-16 du contenu, borne au milieu d'une paire de substitution) → `BadFormat` ; 5) aucun attribut changé sur la plage (dont `len = 0`) **et** `boxHeight` absent ou égal à l'actuel → aucune transaction (D38) ; 6) sinon une transaction : format, puis `boxHeight` s'il change. Message `BadFormat` lisible, reproduit par `fake-core.ts`. `boxHeight` facultatif : la taille d'une plage change la hauteur de la boîte, mesurée côté page. | U27 (« Nouvelle commande `FormatText{id, start, len, attrs}` (une étape) ») ; D11, D38 (`socle-cadrage.md:38`, `:65`) ; patron des erreurs lisibles `commands.rs:124-` (`Display`), `fake-core.ts:67` ; `boxHeight` et sémantique du patch : HC7-4 | oui |
| T8 | Vue du texte | `TextView` gagne `spans: Vec<TextSpanView{ text, attrs }>` (sérialisé `spans`, attributs absents omis), lu par `Text::diff(txn, YChange::identity)` ; morceaux non textuels (embeds) sautés ; **normalisation à la lecture, avant fusion** : un attribut connu hors domaine est retiré de la vue (booléen autre que `true`, `size` non fini ou ≤ 0, `color` ou `font` hors de la forme de T15, valeur au mauvais type), le document n'est pas réécrit ; puis morceaux voisins aux attributs normalisés égaux fusionnés (nombres lus par `element::any_f64`). Texte sans attribut = un seul segment `{ text: content, attrs: {} }`. `content` reste (compatibilité des appelants). Côté TS : `TextData.spans: readonly TextSpan[]`, exigé par `toElementView` (une dérive lève « ElementView invalide », comme aujourd'hui). | DAU9 (« rendu par segments ») ; tolérance de K8 (`usage-c2-coeur-cadrage.md:42`, champ inconnu gardé, jamais d'échec de lecture) ; lecture par `Text::diff` déjà employée par C2 (`document.rs:495`, `collect_out`) ; `wasm-core.ts:77-85` | oui |
| T9 | Mise en lignes | Une seule implémentation : `layoutRich(spans, base, boxWidth, measure)` ; `layoutText` devient le cas d'un seul segment sans attribut et garde sa sortie (`string[]`) et ses tests. Coupure gloutonne aux espaces comme aujourd'hui, un mot peut traverser plusieurs segments sans être coupé ; mot trop long coupé par graphème. Hauteur d'une ligne = plus grande taille de la ligne × `TEXT_LINE_HEIGHT` ; ligne vide = taille du caractère `\n` qui la termine, sinon taille de l'élément. `Measure` gagne un troisième paramètre facultatif (gras, italique, police). | CL4-4 (`text-layout.ts:1-3`, « une seule implémentation pour la hauteur de boîte […] et pour le rendu ») ; U27 (« Rendu par segments ») ; DAU9 (« la mise en lignes mesure par segment ») | oui |
| T10 | Rendu par segments | Un `fillText` par segment, `ctx.font` = `[italic ][bold ]<taille>px <famille>` ; une ligne d'une seule taille est dessinée **exactement** comme au socle (même `font`, `textBaseline = "top"`, même `y`) ; taille mêlée : chaque segment descend de `(tailleMaxLigne − taille) × 0,8` pour aligner les lignes de base ; souligné = trait plein sous le segment, couleur du segment, épaisseur `taille / 16`, à `y + taille × 0,92`. Cache `textLines` : clé étendue aux segments. | design existant : `canvas2d.ts:88-94` (`paintText`) ; test `canvas2d.test.ts:243-247` (rendu du socle, à garder) ; coefficients : HC7-5 ; porte visuelle : à signaler en fin de lot (aucune preuve visuelle automatique, profil) | oui |
| T11 | Hauteur de boîte à l'édition par l'outil Texte | L'outil calcule la hauteur avec `layoutRich` sur les segments **prévus** après l'édition (`editSpans(el.text.spans, content)`, même règle que T4-T5, module partagé avec `fake-core.ts`) ; boîte neuve : un segment sans attribut (hauteur identique au socle). Le `<textarea>` montre le texte brut à la taille de l'élément (inchangé, C7b le remplace). | `tools/text.ts:69` (hauteur aujourd'hui) ; CL4-4 ; `usage-cadrage.md:136` (`<textarea>` remplacée par l'éditeur riche en C7b) ; HC7-6 | oui |
| T12 | Compatibilité du socle | Un texte créé sans attribut n'écrit aucun attribut : la fixture `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (présente dans `main` depuis C2) se recharge et se réenregistre aux mêmes octets, sa vue donne un seul segment sans attribut, et son rendu donne les mêmes appels de canvas qu'au socle (test TS de S3). | DAU9 (« un texte sans attribut reste un texte du socle ») ; K10 (`docs/plans/usage-c2-coeur-cadrage.md:44`) ; `tests/compat_socle.rs:91-125` (lu) | oui |
| T13 | Aller-retour `.roomboard` | Rien à écrire dans le format : les attributs voyagent dans `document.ybin` (mise à jour v1 de tout l'état). Preuve par tests : cœur (`tests/scenarios.rs`, à côté de `:123`) et contrat TS (`wasm-core.contract.test.ts`, les deux cœurs). | D24 (`socle-cadrage.md:51`) ; `document.rs:337` (`encode_v1`), lu | oui |
| T14 | Placement du code | C2 est fusionné (`origin/main` @ 3174b2e, worktree avancé dessus) : C7 part de ce code, sans conflit avec C2. La logique neuve vit dans deux modules neufs (`crates/roomboard-core/src/rich_text.rs`, `apps/web/src/core/rich-text.ts`) ; dans les fichiers communs du cœur et du contrat, des ajouts courts et groupés (variante en fin d'enum, bras en fin de `match`, un bloc par `impl`, un bloc `describe` en fin de test), pour que C9, qui fusionne après C7 et touche les mêmes fichiers, rebase sans peine. | `usage-cadrage.md:538-539` (fusion C2, C7, C9, chaque suivante rebasée) ; brief OD44 ; message de l'orchestrateur (C2 fusionné, 3174b2e) | oui |
| T15 | Couleur et police : valeurs et rendu | `color` = `#rgb`, `#rrggbb` ou `#rrggbbaa` (hexadécimal), ou un nom CSS de 3 à 20 lettres ASCII ; `font` = un nom de famille CSS seul, de 1 à 48 caractères, sans guillemet, barre oblique inverse, point-virgule, accolade ni retour à la ligne. Ces deux formes excluent une valeur de 64 hexadécimaux, que `collect_any` de C2 citerait comme asset (`is_asset_id`). Rendu de la police : `"<font>", "Atkinson Hyperlegible", system-ui, sans-serif` ; une police absente de la machine retombe sur Atkinson (aucun téléchargement, D27). Aucune police neuve embarquée, aucune liste imposée (choix d'interface : C7b). | D27 (`socle-cadrage.md:54`, hors ligne) ; H1-6 (police du socle) ; U39 (aucune dépendance ajoutée) ; HC7-3 | oui |
| T16 | Embeds dans le `Y.Text` | Un `Y.Text` peut porter des embeds (écrits par une autre version ; C2 en teste un : `document.rs`, `insert_embed`). Voie retenue : **les compter dans la conversion des positions**, jamais les perdre. `rich_text.rs` construit, par `Text::diff`, la table « position dans `content` (points de code pour `SetText`, UTF-16 pour `FormatText`) → décalage Yrs (octets des chaînes, 1 par embed) ». `SetText` ne supprime que les morceaux de chaîne du milieu (un embed du milieu est gardé) et insère juste après le dernier caractère du préfixe ; `FormatText` formate de la position Yrs du premier caractère de la plage à celle qui suit son dernier (un embed intérieur reçoit l'attribut, sans effet de rendu). La vue saute les embeds (T8) ; `content` (`get_string`) les ignore déjà. | `yrs-0.28.1/src/types/text.rs:120-132` (`get_string` saute tout ce qui n'est pas `ItemContent::String`), lu ; tolérance K8 (élément ou donnée inconnue gardée) ; recommandation de la contre-relecture, tour 1 | oui |

Constats d'architecture : fichier absent. Licences (U39) : aucune dépendance ajoutée (Yrs `format`, `diff`,
`insert_with_attributes` sont dans `yrs` 0.28.1 déjà présent ; `Intl.Segmenter` déjà employé).

## 3. Carte d'impact

Rubriques déduites (profil sans ligne « Surfaces d'impact ») : cœur Rust, liaison Wasm, contrat et faux cœur TS, moteur
et rendu, persistance, tests, autres dépôts. Base lue : `origin/main @ 3174b2e` (C2 fusionné) ; lignes relevées sur ce
commit.

### Cœur Rust (`crates/roomboard-core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/commands.rs:64-74` (`Command::SetText`), fin de l'enum (après `SetBackdrop`) | oui | variante `FormatText{ id, start: u32, len: u32, attrs: Vec<TextAttr>, box_height: Option<f64> }` en fin d'enum | V |
| `src/commands.rs:110-122`, `:124-` (`CommandError`, `Display`) | oui | variante `BadFormat` et son message, en fin | V |
| `src/commands.rs:418-` (`apply`, bras `SetText`) | oui | bras `FormatText` en fin de `match`, délègue à `rich_text` | V |
| `src/commands.rs:547-601` (`cmd_set_text`), `:588-589` | oui | `remove_range` + `insert` remplacés par `rich_text::apply_text_diff` (T4, T5, T16) | V |
| `src/commands.rs:203-227` (`TextFields`, `read_text`) | oui | `spans` lus pour la vue (T8) | V |
| `src/commands.rs:603-` (`insert_text`) | non | création inchangée : aucun attribut écrit (T12) | V |
| `src/rich_text.rs` (nouveau) | oui | différence, table des positions (embeds comptés), `FormatText`, segments, contrôle des valeurs | V |
| `src/element.rs:113` (`TextView`) | oui | champ `spans` ; types `TextSpanView`, `SpanAttrs` dans `rich_text.rs` | V |
| `src/element.rs:148` (`any_f64`), `:214` (`finite_positive`) | non | réutilisés (lecture de `size`, contrôle > 0) | V |
| `src/document.rs:267-281` (`element`, branche `text`) | oui | une ligne `spans` dans `TextView` | V |
| `src/document.rs:482-520` (`collect_any`, `collect_out`) | non | balaie les attributs des `Y.Text` ; T15 empêche qu'une couleur ou une police soit citée comme asset | V |
| `src/query.rs:881` et la boîte d'un texte | non | `boxWidth` × `boxHeight` inchangés | V |
| `src/history.rs` | non | `expand_scope` sur `pages` suit déjà les formats du `Y.Text` imbriqué (D11) | S |
| `src/format/mod.rs` | non | aucun champ neuf (T13) | V |
| `src/lib.rs:2-11` | oui | `pub mod rich_text;` | V |

### Liaison Wasm (`crates/roomboard-wasm/src/lib.rs`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `:290` (`set_text`), `:535` (`set_text_inner`) | non | signatures inchangées | V |
| après `:318` (`transform`) | oui | `format_text(id, start, len, attrs: JsValue, box_height: Option<f64>)` ; `attrs` lu par `serde_wasm_bindgen::from_value` en `BTreeMap<String, Option<WireValue>>` (clé présente à `null` = retrait ; les `undefined` sont déjà retirés par `wasm-core.ts`, T7) | V |
| après `:559` (`transform_inner`) | oui | `format_text_inner(id, start, len, Vec<TextAttr>, Option<f64>)`, testé en natif | V |
| `Cargo.toml` | non | `serde-wasm-bindgen` déjà là | V |

### Contrat et faux cœur TS (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `api.ts:29-62` (union `Command`, fin après `SetBackdrop`) | oui | `FormatText` en fin ; en-tête de contrat (`api.ts:1-8`) complété d'une ligne C7 | V |
| `api.ts:65` (`TextData`) | oui | `spans` ; `TextSpan`, `TextAttrs`, `TextAttrsPatch` en fin de fichier | V |
| `fake-core.ts:361-` (`SetText`) | oui | différence et héritage par `editSpans` (T4, T5) ; case `FormatText` (patch nettoyé de ses `undefined`, ordre des contrôles de T7) | V |
| `fake-core.ts:470`, `:585`, `:604`, `:639` (vue, `save`, `load`) | oui | `spans` gardés à l'enregistrement ; JSON ancien sans `spans` → un segment | V |
| `fake-core.ts:67` (`MESSAGES`) | oui | message `badFormat` identique au cœur | V |
| `wasm-core.ts:77-85` (`toElementView`, `case "text"`) | oui | contrôle de `spans` | V |
| `wasm-core.ts:176-179` (`apply`) | oui | case `FormatText` → `format_text`, clés `undefined` retirées avant l'appel | V |
| `rich-text.ts` (nouveau) | oui | opérations pures sur les segments (faux cœur et outil Texte) | V |

### Moteur et rendu (`apps/web/src/engine`, `apps/web/src/app`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/text-layout.ts:14-23` (`Measure`, `measureWith`, `textFont`) | oui | troisième paramètre facultatif (gras, italique, police) ; `textFont(size)` rend la même chaîne qu'aujourd'hui | V |
| `engine/text-layout.ts:34-64` (`layoutText`) | oui | délègue à `layoutRich` ; sortie inchangée | V |
| `engine/text-layout.ts:66` (`textBoxHeight`) | oui | `richBoxHeight(lines)` ajouté ; `textBoxHeight` gardé | V |
| `engine/render/canvas2d.ts:88-94` (`paintText`) | oui | segments, décalage de ligne de base, souligné | V |
| `engine/render/canvas2d.ts:98-99`, `:240-247` (`textLines`, `linesOf`) | oui | clé de cache étendue aux segments | V |
| `engine/render/canvas2d.ts:159-160` (aiguillage `text`) | oui | rendu par segments | V |
| `engine/render/fake-ctx.ts` (nouveau, aide de test) | oui | `FakeCtx` sorti de `canvas2d.test.ts:10-55` pour servir aussi au test de S3 | V |
| `engine/tools/text.ts:69` (hauteur au commit) | oui | `richBoxHeight(layoutRich(editSpans(...)))` (T11) | V |
| `engine/tools/text.ts:102-111` (ouverture sur un texte) | oui | garde `el.text.spans` dans la session (T11) | V |
| `engine/render/webgl2.ts` | non | l'encre seule | V |
| `app/text-editor.ts:83` | non | `<textarea>` brut (C7b) | V |
| `main.ts:61` (mesure de repli) | non | ignore le troisième paramètre | V |

### Persistance

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `document.ybin` (D24) | non (contenu enrichi) | attributs dans la mise à jour Yrs ; aucun champ de manifeste ; `schema` 1 | V |
| `tests/fixtures/socle-v1.roomboard` | non | lue seulement, jamais régénérée (SHA-256 figé par C2) | V |
| assets cités (`cited_assets`) | non | T15 : aucune valeur d'attribut permise n'a la forme d'un id d'asset | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `commands.rs:1739` (`set_text_creates_text_in_one_step`), littéral `TextView` `:1756` | oui | gagne `spans` | V |
| `commands.rs:1769`, `:1792`, `:1867` et les tests d'erreur `:1828-1840` | non | à garder verts (remplacer, inchangé sans étape, une transaction, erreurs) | V |
| `commands.rs` (fin du module de tests) | oui | `set_text_keeps_range_attributes_outside_the_edit`, `set_text_diff_is_one_step`, `set_text_inserted_text_inherits_previous_char` (HU2-15), `format_text_*` (ordre des contrôles de T7) | V |
| `rich_text.rs` (tests neufs) | oui | table des positions (emoji, paire coupée), différence en points de code, `set_text_and_format_keep_embeds` (T16 : embed inséré par `insert_embed` comme le test de C2, `SetText` et `FormatText` autour et à travers, embed toujours là, `cited_assets` inchangé), normalisation de la vue (T8) | V |
| `query.rs:881` (`hit_test_and_bounds_include_text`) | non | à garder vert | V |
| `tests/scenarios.rs:123` (`s3_text_stroke_shape_survive_save_load`) | oui | scénario neuf à côté (S2) | V |
| `format/mod.rs:433`, `:443` (`save_is_deterministic`, `reload_with_strokes_keeps_bytes`) | non | à garder verts | V |
| `tests/compat_socle.rs:103`, `:113` | non | à garder verts ; test neuf `socle_fixture_text_is_one_plain_span` dans ce fichier (réutilise `socle_bytes`, `:91`) | V |
| `roomboard-wasm/src/lib.rs:793` (`set_text_inner_creates_and_removes`) | non | à garder vert ; tests neufs `format_text_inner_*` | V |
| `wasm-core.contract.test.ts:362-372` (vue littérale du texte) | oui | `spans` ajoutés à l'attendu | V |
| `wasm-core.contract.test.ts:97`, `:385`, `:592` | non | à garder verts | V |
| `wasm-core.contract.test.ts` (bloc neuf en fin, après `:776`) | oui | contrat C7 sur les deux cœurs (S2, S4) et test de rendu du socle (S3) | V |
| `fake-core.test.ts:142-148` (vue littérale du texte) | oui | `spans` ajoutés à l'attendu | V |
| `fake-core.test.ts` (tests neufs) | oui | `FormatText`, patch à `undefined`, JSON ancien sans `spans` | V |
| `canvas2d.test.ts:194` (vue `t` littérale) | oui | `spans` ajoutés (type exigé) | V |
| `canvas2d.test.ts:10-55` (`FakeCtx`) | oui | sorti dans `fake-ctx.ts`, importé | V |
| `canvas2d.test.ts:243-247`, `:276-288` | non | à garder verts (rendu du socle, cache) ; tests neufs du rendu par segments | V |
| `text-layout.test.ts:8-56` | non | à garder verts ; tests neufs de `layoutRich` | V |
| `tools/text.test.ts:61-125` | non | à garder verts ; test neuf : hauteur d'un texte riche édité | V |
| `text-editor.test.ts:148` | non | à garder vert (`toMatchObject`) | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| aucun | non | RoomBoard seul ; ActCraft non lu (aucune reprise de code) | V |

### Effets de bord sur l'existant

- `SetText` sur un texte existant ne remplace plus tout le `Y.Text` (T4) : `set_text_replaces_content_in_one_step`,
  `set_text_unchanged_is_no_step` et `set_text_each_effect_is_one_transaction` restent verts ; tests neufs
  `set_text_keeps_range_attributes_outside_the_edit` et `set_text_diff_is_one_step` (noms de `usage-cadrage.md:200-201`).
- Un embed d'un texte venu d'une autre version survit désormais à une édition, alors que le code actuel le supprime
  (`remove_range(0, len)`, `commands.rs:588`) : `set_text_and_format_keep_embeds` (T16).
- La vue d'un texte gagne `spans` (T8) : `set_text_creates_text_in_one_step`, `fake-core.test.ts:142-148`,
  `wasm-core.contract.test.ts:362-372` et `canvas2d.test.ts:194` adaptés ; `toElementView` exige `spans` (test neuf
  « ElementView invalide si `spans` manque ou dérive ») ; « save puis load garde formes, textes et matrices » reste vert.
- `layoutText` passe par `layoutRich` (T9) : tous les tests de `text-layout.test.ts` restent verts ; le rendu d'un texte
  du socle garde ses appels (`canvas2d.test.ts:243`).
- Clé du cache des lignes étendue (T10) : `canvas2d.test.ts:276` reste vert.
- Hauteur de boîte d'un texte riche édité à l'outil (T11) : test neuf dans `tools/text.test.ts` ; texte simple :
  `tools/text.test.ts:82` reste vert.
- Poids du module Wasm principal : marge de 159 812 octets mesurée par C2 (`usage-c2-coeur-cadrage.md:48`, K14),
  partagée avec C9 : relevé par `verifier.sh` (HC7-7).

### Chantiers en cours

- **C2** : fusionné dans `origin/main` (3174b2e) ; le worktree de C7 est avancé dessus. Plus aucune zone de conflit.
- **C9** (grilles, cœur) : non lancé (aucune branche, aucun worktree). Il fusionne après C7 et touchera `commands.rs`
  (enum `Command`, `CommandError`, `apply`), `roomboard-wasm/src/lib.rs`, `api.ts` (union `Command`), `fake-core.ts`,
  `wasm-core.ts` : C7 y fait des ajouts groupés en fin d'enum, de `match` et de fichier (T14), pour que C9 rebase sans peine.
- Worktrees : `/home/adminjd/projets/roomboard` (main), ce worktree, `/tmp/ctl-main-c2` (détaché, 3174b2e, contrôle de
  l'orchestrateur) ; `gh pr list` : aucune PR ouverte.

### Termes cherchés

- Graphe : aucun (`ls ~/.cache/graphes/` : pas de `roomboard`).
- Texte : `grep -n "Text\|text" crates/roomboard-core/src/commands.rs` ; `grep -n "Text\|text" element.rs document.rs
  query.rs` ; `grep -n "text\|Text" crates/roomboard-wasm/src/lib.rs` ; `grep -n "text\|Text" wasm-core.ts fake-core.ts` ;
  `grep -rn "layoutText\|textFont\|measureWith\|TEXT_FONT_FAMILY\|textBoxHeight\|kind === \"text\"\|\.text\.content"
  apps/web/src` ; `grep -rln "SetText\|set_text" apps crates` ; `grep -rn "FormatText\|format_text\|spans\|
  insert_with_attributes\|\.format(" crates apps` (rien avant C2 ; C2 : `insert_with_attributes` en test seulement) ;
  `grep -rn "encode_utf16\|utf16\|char_indices" crates` (rien) ; `grep -rn "text: { content\|TextView {" apps/web/src crates`
  (vues littérales) ; `grep -n "fn any_f64\|fn finite_positive\|fn positive"` ; `grep -rn "OffsetKind\|Options\|Doc::new"
  crates/roomboard-core/src` ; dans `yrs-0.28.1` : `offset_kind`, `fn insert(&self`, `fn insert_with_attributes`,
  `fn format(`, `fn get_string`, `minimize_attr_changes`.
- Diff de C2 avant sa fusion : `git diff origin/main...origin/feat/usage-c2-coeur --stat`, puis `-- commands.rs`,
  `-- element.rs`, `-- document.rs`.
- Cadrages : `grep -n "U27\|DAU9\|C7\|texte riche\|U39" docs/plans/usage-cadrage.md` ; `grep -n -i "texte\|C7"
  docs/plans/usage-c2-coeur-cadrage.md`.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Écrire et lire des attributs de plage | `yrs` 0.28.1 `Text` (`types/text.rs:275`, `:372`) | `insert_with_attributes`, `format`, `remove_range`, `diff(txn, YChange::identity)` | réutiliser (`usage-cadrage.md:268`) |
| Lire les morceaux d'un `Y.Text` avec attributs | `document.rs:495` (`collect_out`, patron `t.diff(txn, YChange::identity)`) | même appel Yrs, pas la fonction (elle collecte des ids d'asset) | réutiliser le patron Yrs |
| Lire un nombre d'attribut (`size`) | `element.rs:148` (`any_f64`) | `any_f64(&Any) -> Option<f64>` | réutiliser |
| Contrôler une valeur finie > 0 (`size`, `boxHeight`) | `element.rs:214` (`finite_positive`) | `finite_positive(v: f64) -> bool` | réutiliser (le `positive` privé de `commands.rs` reste intact) |
| Une commande = une étape, aucune étape vide | `commands.rs:746` (`done`), `:751` (`unchanged`), `transact_local`, `find_element` | appelés par `FormatText` | réutiliser |
| Trouver le texte et ses champs | `commands.rs:212` (`read_text`, `TextFields`) | étendu de `spans` | étendre |
| Vue d'un texte | `element.rs:113` (`TextView`) | champ `spans: Vec<TextSpanView>` | étendre |
| Différence, positions, format, segments (cœur) | aucun (`FormatText`, `utf16`, `char_indices`, `spans` : rien dans `crates/`) | nouveau module `crates/roomboard-core/src/rich_text.rs` : `pub enum TextAttr { Bold(bool), Italic(bool), Underline(bool), Color(Option<String>), Size(Option<f32>), Font(Option<String>) }` ; `pub struct TextSpanView { text: String, attrs: SpanAttrs }` ; `pub(crate) fn valid_attrs(attrs: &[TextAttr]) -> bool` ; `pub(crate) fn read_spans<T: ReadTxn>(txn: &T, text: &TextRef) -> Vec<TextSpanView>` ; `pub(crate) fn apply_text_diff(txn: &mut TransactionMut, text: &TextRef, new: &str)` ; `pub(crate) fn utf16_range<T: ReadTxn>(txn: &T, text: &TextRef, start: u32, len: u32) -> Option<(u32, u32)>` (décalages Yrs, embeds comptés) ; `pub(crate) fn format_changes<T: ReadTxn>(txn: &T, text: &TextRef, range: (u32, u32), attrs: &[TextAttr]) -> bool` ; `pub(crate) fn apply_format(txn: &mut TransactionMut, text: &TextRef, range: (u32, u32), attrs: &[TextAttr])` | nouveau module (découpe interne sous DAU9 ; garde `commands.rs` court pour C9) |
| Commande exposée à la page | `roomboard-wasm/src/lib.rs:290` (`set_text`), `:535` (`set_text_inner`), `to_js`, `cmd_err` | `format_text`, `format_text_inner` sur le même patron | étendre |
| Contrat TS | `api.ts:29-62`, `:65` | `{ type: "FormatText"; id: string; start: number; len: number; attrs: TextAttrsPatch; boxHeight?: number }` ; `TextAttrs = { bold?: true; italic?: true; underline?: true; color?: string; size?: number; font?: string }` ; `TextAttrsPatch = { bold?: boolean \| null; italic?: boolean \| null; underline?: boolean \| null; color?: string \| null; size?: number \| null; font?: string \| null }` ; `TextSpan = { text: string; attrs: TextAttrs }` | étendre |
| Opérations sur segments côté page (faux cœur, outil) | aucun (`spans`, `FormatText` : rien dans `apps/web/src`) | nouveau module `apps/web/src/core/rich-text.ts` : `plainSpans(content: string): TextSpan[]` ; `editSpans(spans: readonly TextSpan[], content: string): TextSpan[]` (T4, T5, points de code) ; `cleanPatch(patch: TextAttrsPatch): TextAttrsPatch` (retire les `undefined`) ; `validPatch(patch: TextAttrsPatch): boolean` ; `utf16Bounds(content: string, start: number, len: number): boolean` ; `formatSpans(spans: readonly TextSpan[], start: number, len: number, patch: TextAttrsPatch): TextSpan[]` ; `sameSpans(a, b): boolean` | nouveau module (seule copie TS de la règle, voulue par D33 : le faux cœur reproduit le cœur, le contrat compare) |
| Faux cœur | `fake-core.ts:361` (`SetText`), `step`, `unchanged`, `find` | appelle `rich-text.ts` | étendre |
| Lecture de la vue | `wasm-core.ts:77` (`toElementView`, `case "text"`) | contrôle de `spans` | étendre |
| Mise en lignes | `text-layout.ts:34` (`layoutText`), `graphemes` (`:26`), `measureWith` (`:17`), `textFont` (`:11`) | `layoutRich(spans, base: { size: number }, boxWidth, measure): RichLine[]`, `RichLine = { segments: { text: string; style: SegmentStyle; x: number; width: number }[]; top: number; height: number; size: number }` ; `richBoxHeight(lines): number` ; `Measure = (text, size, face?: { bold?: boolean; italic?: boolean; font?: string }) => number` ; `textFont(size, face?)` | étendre (une implémentation, CL4-4) |
| Rendu | `canvas2d.ts:89` (`paintText`), `:240` (`linesOf`) | `paintText(ctx, lines, color)` sur `RichLine[]` | étendre |
| Faux contexte 2D des tests | `canvas2d.test.ts:10-55` (`FakeCtx`, `asCtx`) | sorti dans `engine/render/fake-ctx.ts` (comme `fake-gl.ts`), importé par `canvas2d.test.ts` et le test de S3 | étendre (déplacé, pas copié) |
| Chargement du vrai module et des fixtures en test | `wasm-core.contract.test.ts:63` (`initSync`), `:770-776` (`core`, `fixtureOf`) | test de S3 écrit dans ce bloc | réutiliser |
| Hauteur au commit | `tools/text.ts:69` | `richBoxHeight(layoutRich(editSpans(...)))` | étendre |
| Fixture du socle | `tests/compat_socle.rs:91` (`socle_bytes`), `tests/fixtures/socle-v1.roomboard` | `socle_bytes()` ; la même fixture lue en TS par `fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard")` | réutiliser (aucune seconde fixture) |
| Limites de mot (UAX 29) | `unicode-segmentation` | — | hors chantier (C6a, pot P2) |

Aucun besoin ne répond aux critères de duplication nette ou de couture contournée nette : les deux modules neufs ne
refont rien d'existant (termes ci-dessus sans résultat), et le seul doublon voulu (règle de différence en Rust et en TS)
est celui du faux cœur, prescrit par D33 et vérifié par le contrat (S4).

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**
- **HC7-1** (T5) Le texte inséré par `SetText` prend les attributs du caractère qui le précède ; en tête, aucun.
  Prouve HU2-15 par construction (`insert_with_attributes` explicite) ; S1 et S4 le jouent.
- **HC7-2** (T6) Positions de `FormatText` en unités UTF-16. Si l'éditeur C7b veut des graphèmes, il convertira de son
  côté ; le cœur ne change pas.
- **HC7-5** (T10) Rendu : décalage de ligne de base `0,8 × écart de taille`, souligné à `0,92 × taille`, épaisseur
  `taille / 16`. Visible ; à juger à la porte visuelle de fin de lot (essai manuel plus tard, consigne de Jérôme du
  2026-11-19).
- **HC7-3** (T2, T15) `color` limité aux formes hexadécimales `#…` et aux noms CSS de 3 à 20 lettres (pas de `rgb()`,
  `hsl()`) ; `font` = un nom de famille filtré de 48 caractères au plus ; une police absente retombe sur Atkinson
  Hyperlegible.

**Niveau 2**
- **HC7-4** (T7) Patch : `false` et `null` retirent l'attribut, `undefined` vaut absent ; `boxHeight` facultatif dans
  `FormatText`.
- **HC7-6** (T11) L'outil Texte prévoit les segments après édition par `editSpans` (même règle que le cœur) pour la
  hauteur ; le `<textarea>` reste brut jusqu'à C7b.
- **HC7-7** Le module Wasm principal grossit de moins de 30 Ko (marge 159 812 octets après C2, partagée avec C9).
- **HC7-8** (T8) Normalisation à la lecture puis fusion des morceaux voisins aux attributs normalisés égaux ; embeds
  sautés de la vue.
- **HC7-9** (T9) Ligne vide : taille du `\n` qui la termine, sinon taille de l'élément.
- **HC7-10** (T16) Un embed au milieu d'une édition est gardé et un embed intérieur à une plage formatée reçoit
  l'attribut ; aucune version actuelle n'en écrit, le faux cœur ne les modélise pas (test en Rust seulement).

## 5. Décisions d'architecture

Aucune nouvelle (consigne OD44). DAU9 (`usage-cadrage.md:396-400`) s'applique telle quelle. Les deux modules neufs
(`rich_text.rs`, `rich-text.ts`) sont des découpes internes sous DAU9, interfaces écrites en section 3.

## 6. Scénarios d'acceptation

Tous jouables par tests automatiques sur la VM (`cargo test --workspace`, `pnpm -r test`, `scripts/verifier.sh`).

- **S1** (cœur) Créer le texte « Le chat noir » ; `FormatText` sur « chat » (3, 4) en rouge et gras : une étape, segments
  `Le ` · `chat` {rouge, gras} · ` noir`. Valider par `SetText` « Le gros chat noir » : une étape, « gros » sans
  attribut, « chat » toujours rouge et gras ; `SetText` « Le gros chats noir » : le « s » est rouge et gras (hérite du
  « t »). Annuler trois fois : « Le chat noir » sans attribut ; rétablir : tout revient.
- **S2** (aller-retour) Un texte à six plages (gras, italique, souligné, couleur, taille 72, police « Georgia ») ;
  enregistrer en `.roomboard`, recharger : mêmes `spans`, même contenu ; réenregistrer : mêmes octets. Joué dans
  `tests/scenarios.rs` et, sur les deux cœurs, dans `wasm-core.contract.test.ts`.
- **S3** (compatibilité du socle) Cœur : `compat_socle.rs` charge `socle-v1.roomboard`, le texte « Bonjour RoomBoard »
  a un seul segment sans attribut, le réenregistrement garde les octets (test existant). Rendu : dans le bloc C7 de
  `wasm-core.contract.test.ts`, le vrai module Wasm charge la même fixture (`core.load(fixtureOf("../../../../crates/
  roomboard-core/tests/fixtures/socle-v1.roomboard"))`), la vue du texte (`element(id)` du troisième élément de la
  première page) est passée à un `Canvas2DRenderer` sur le `FakeCtx` de `engine/render/fake-ctx.ts` ; journal attendu :
  `fillText Bonjour RoomBoard 0,0`, police `36px "Atkinson Hyperlegible", system-ui, sans-serif`, couleur `#000000`,
  `textBaseline` `top`, aucun trait de souligné : les mêmes appels qu'au socle (`canvas2d.test.ts:243-247`). Sauté comme
  le reste du contrat si le `.wasm` manque, exigé sous `verifier.sh` (`ROOMBOARD_WASM_REQUIRED=1`).
- **S4** (contrat, les deux cœurs) La même suite sur `fakeCore` et le vrai module Wasm, mêmes vues, mêmes `Change`, mêmes
  erreurs :
  - texte « Le 🐱 noir », `FormatText` (3, 2) en rouge (positions UTF-16) ; `SetText` « Le gros 🐱 noir » : le chat
    reste rouge, « gros » sans attribut ; `SetText` « Le gros 🐱🐱 noir » : le second chat est rouge (différence en points
    de code, préfixe d'abord, héritage du caractère précédent) ;
  - retrait par `bold: false`, par `bold: null` et par `color: null` ; patch `{ bold: undefined, italic: true }` :
    seul l'italique change ; patch `{ bold: undefined }` : aucune étape ;
  - plage vide (`len = 0`) sans `boxHeight` : aucune étape ; même plage avec un `boxHeight` neuf : une étape, hauteur
    écrite ;
  - ordre des contrôles : clé inconnue sur un id absent → `BadFormat` (le patch passe avant l'élément) ; `boxHeight`
    négatif → `BadFormat` ; élément qui n'est pas un texte → `élément inconnu : …` ; borne au milieu de la paire de
    substitution du 🐱 → `BadFormat` ; couleur `rgb(0,0,0)` et police de 64 hexadécimaux → `BadFormat`.
- **S5** (mise en lignes et rendu) « Le chat noir » de base 36 avec « chat » en 48 gras souligné rouge, boîte étroite :
  `layoutRich` ne coupe pas « chat » entre deux segments ; ligne de hauteur 48 × 1,25 ; journal du faux contexte :
  `fillText Le ` en `36px …`, `fillText chat` en `bold 48px …` et couleur rouge, un trait de souligné sous « chat » ;
  rouvrir ce texte à l'outil Texte, ajouter « gros » : la `SetText` envoyée porte la hauteur de `richBoxHeight`.

## 7. Hors périmètre

- C7b : éditeur riche (contenteditable, IME riche), barre de mise en forme, choix de polices dans l'interface, texte riche
  des cellules de tableau (C10a).
- C6a : pot de peinture P2 (couleur mot par mot, limites de mot UAX 29, `unicode-segmentation`) ; il appellera
  `FormatText`.
- Import de texte riche depuis d'autres formats (C13), export PDF du texte riche (C11a, C12).
- Polices embarquées en plus d'Atkinson Hyperlegible.
- Tout build Tauri ; toute dépendance nouvelle ; le chantier C9 (grilles).

## 8. Portes immédiates

Aucune.
