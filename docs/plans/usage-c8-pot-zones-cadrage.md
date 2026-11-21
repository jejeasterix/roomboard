# Cadrage — usage-c8-pot-zones (pot de peinture, zones fermées)

## 1. Demande et gabarit

Demande : un clic du pot dans une zone fermée par un ou plusieurs objets (traits, formes), à 2 px près, sur une
rastérisation de la vue, pose un nouvel élément `kind: "fill"` non lié, au-dessus des objets, qui la remplit ; hors de toute zone fermée, le fond de la page
change comme en C6a ; un clic = une étape. Demande d'origine de Jérôme, citée par U28 : « remplir n'importe quelle zone
fermée (image comprise) ». Mode autonome (Jérôme, 2026-11-19 : « Continue d'avancer autant que possible suivant notre
objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu »).

Gabarit : **chantier** (budget du brief : 20 questions ; 20 consommées). Reprend U28 palier **P3** et **HU2-8**
(`docs/plans/usage-cadrage.md:81`, `:315`) sans les refaire ; C6a (décision 0254), C6b (DAB2, décision 0259) étendus.

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| Q1 | Ordre de la cible | Inchangé : élément le plus haut sous le pointeur (`hitTest`, 6 px écran), puis zone fermée, puis fond de la page. Seule la branche « rien touché » change. | U28 (`usage-cadrage.md:81`) ; `apps/web/src/engine/fill-target.ts:78-97` ; C6a D3 | oui |
| Q2 | Intérieur vide d'une forme fermée seule (rectangle ou ellipse non remplis) | Comportement de C6a gardé : `hit_test` touche le polygone plein de la forme (`query.rs:233`, `shape.rs:70`), donc l'intérieur reçoit le `fill` de la forme (`Fill Inside`), et aucune zone n'est cherchée. Un trait seul refermé sur lui-même n'est touché que sur son tracé : son intérieur passe par la zone de C8. | `fill-target.ts:86-88` ; C6a D5 ; `shape.rs:70-81` | oui |
| Q3 | Où tournent la rastérisation et la forme | Dans le cœur Rust, nouveau module `crates/roomboard-core/src/zone.rs`, sans dépendance au navigateur, qui passe par le module Wasm principal et le fil principal. Le calcul est synchrone et se fait dans la commande, au moment de l'écriture. Rastériseur par balayage écrit dans le module (aucune crate : `tiny-skia` serait trop lourd), aucun Worker, aucun troisième module. La diffusion de C6b (`roomboard-formats/src/pixels.rs:69`, `flood_region`) n'est pas appelable : `formats` dépend du cœur, pas l'inverse. | mesure (DA-Z1) ; DAU1 (`usage-cadrage.md:330` : `formats` ne connaît pas le `Doc`) ; profil (« trois couches testables seules ») | oui |
| Q4 | Taille | `i_overlay` coûte +214 643 o dans le module principal (mesuré). Il n'entre pas dans `formats` (marge 45 384 o). Il passe derrière la fonctionnalité Cargo `zone` de `roomboard-core`, désactivée par défaut et activée par `roomboard-wasm` seul. `formats` ne la reçoit jamais. | mesure (DA-Z1) | oui |
| Q5 | Seuil de repli | Module principal mesuré par `verifier.sh` après la tâche du cœur : au-delà de 1 420 000 o (marge restante sous 150 Ko), on arrête et on passe au repli HU2-8. | HU2-8 ; H2-13 | oui |
| Q6 | Décision de la région (U28 P3 tel quel) | Sur une **rastérisation de la vue** : masque des murs (1 cellule = 1 px de la vue = `tol / 2` en monde), murs dilatés d'une cellule (voisinage 8, les écarts ≤ 2 px se ferment), diffusion 4-connexe depuis la cellule du clic. Si la diffusion touche le bord de l'emprise, la zone n'est pas fermée et le cœur applique `Background` (C6a). | U28 (`usage-cadrage.md:81`) ; brief ; étude pot, option C (`docs/etudes/usage-pot-de-peinture.md:84`, `:125`) | oui |
| Q7 | Tolérance de fermeture | 2 px écran (`ZONE_CLOSE_TOL_PX = 2` dans `fill-target.ts`), convertis en monde par `2 / zoom` et passés dans la commande (`tol`). La cellule vaut `tol / 2`. La tolérance est fixe : aucun contrôle neuf, la rangée du pot reste celle de C6a et C6b, la scène reste ≥ 640 px (C6a D19, `c6a-pot-navigateur.mjs:173`, `:325`). | U28 (« tolérance de fermeture 2 px ») ; patron `FILL_HIT_TOL_PX / zoom` (`fill-target.ts:79`) ; C6a D19 | oui |
| Q8 | Murs (ce qui ferme une zone) | Les géométries de la page dont la boîte coupe l'emprise (`geoms`, `query.rs:211`), rastérisées puis réutilisées pour les bords exacts. Trait : contour `ink::outline` en cache (`document.rs:517`), lu sans modification, en non-nul comme au rendu (`canvas2d.ts:433`). Ligne et flèche : `shape_polygon`. Rectangle et ellipse **non remplis** : un anneau (aide neuve `shape_ring`). Formes remplies : polygone plein. `fill` : ses anneaux, en pair-impair. **Image, texte**, tableau, média, 3D, élément inconnu : **leur boîte**. Le cœur n'a ni les pixels des images (U4 : ils restent dans la page), ni les glyphes ; « image comprise » n'est donc pas bon marché ici (HC8-1). Le fond de page, la grille et le fond PDF ou image ne ferment rien. | U28 ; U4 (`usage-cadrage.md:57`) ; `query.rs:136-208` | oui (à revoir) |
| Q9 | Forme vectorielle par `i_overlay` | 1) Chaque suite horizontale de cellules diffusées devient un rectangle, agrandi de 2 cellules (ce qui défait la dilatation et l'arrondi), puis tous sont unis (`FloatOverlay`, non-nul). 2) Le résultat moins l'union des polygones exacts des murs (`OverlayRule::Difference`). 3) On ne garde que la forme qui contient le clic. Les bords suivent alors exactement les objets, trous compris : les objets inclus (îlots) sont retirés et ne sont pas cachés par le `fill` posé au-dessus. Seul le pont tracé au droit d'un écart de 2 px ou moins reste en marches d'1 px de la vue. | U28 (« forme calculée par `i_overlay` ») ; brief ; étude pot, Cas 4 (« remplit la région visible », `:58`) | oui |
| Q10 | Commande | `FillTarget::Zone { x, y, tol }` (variante annoncée par `fill.rs:4` et la décision 0254). Zone trouvée : un nouvel élément `fill` en haut de la page, une transaction, `Change.ids = [id neuf]`. Aucune zone : exactement `Background` (même valeur : aucune étape, D38). Couleur `null` (« Aucune ») : `Background` avec `null`, donc `#ffffff` (C6a D11) ; aucun `fill` transparent. | 0254 (cible extensible) ; `fill.rs:19-24`, `:46-117` ; C6a D11 | oui |
| Q11 | Modèle de l'élément | Y.Map : `id`, `kind: "fill"`, `transform` (translation au coin de la boîte), `color`, `contours`. `contours` est un `Any::Array` d'`Any::Array` positionnels de f64 en repère local ; le premier anneau est l'extérieur, les suivants sont des trous. Pas de `style`, pas de `group` posé. Ajouté à `KNOWN_KINDS` (`element.rs:31`). Champ absent ou illisible, ou moins de 3 points : cadre inconnu (patron T2, M7, X8). Test « recharger garde les octets ». | U3 (`usage-cadrage.md:56`, jamais `Any::Map`) ; U28 (`kind: "fill"`, non lié) | oui jusqu'à la release (U3, D24) |
| Q12 | Vue | `ElementView.fill: Option<FillView { color: String, contours: Vec<Vec<f64>> }>` (champ libre à ce niveau, `element.rs:122-147`). TS : `FillElement { kind: "fill"; fill: { color; contours: number[][] } }`. | `element.rs:122` ; `wasm-core.ts:176` | oui |
| Q13 | Collision | La `Geom` d'un `fill` porte tous ses anneaux, avec test pair-impair et **intérieur strict** (tolérance 0). Un trait sous le bord du `fill` reste ainsi touchable par le pot et la sélection. La gomme d'objet ne vise que les traits (`query.rs:250`) et n'efface donc pas un `fill`. | U28 (géométrie de collision demandée) ; `ink/hit.rs:90` | oui (à revoir) |
| Q14 | Pot sur un `fill` existant | Couleur : `Fill Inside { id }`, où `field_for` rend `color` pour `kind: "fill"`. « Aucune » : `Delete { ids: [id] }`. Une étape dans les deux cas. | C6a D11 (« effacer » une forme) ; `fill.rs:27-40` | oui |
| Q15 | Rendu et export | `canvas2d.ts` `paintElement` : `Path2D` des anneaux en cache par id (contours immuables), puis `ctx.fill(path, "evenodd")` avec `fill.color`. L'export PDF suit par `record-ctx` (pair-impair gardé, `record-ctx.ts:214`, `pdf.rs:336`). | code lu | oui |
| Q16 | File du pot et `doc.version()` | Aucune modification de la file : la commande `Zone` passe par `queue.submit({ command })` comme toute commande vectorielle. Son jeton est vérifié avant l'écriture (`image-fill.ts`, `pump`). La rastérisation et la forme se calculent dans la commande, donc sur l'état gardé par ce jeton, jamais sur un état périmé. | DAB2, B13 (C6b) ; `tools/fill.ts:50-53` ; `image-fill.ts` (`pump`) | oui |
| Q17 | Fausse liaison (`fake-core.ts`) | `Zone` se comporte comme `Background` (aucune géométrie booléenne en TS). Le `kind: "fill"` est lu, dessiné, touché en intérieur strict et sauvegardé. La vraie zone est prouvée par les tests Rust, le contrat Wasm et l'essai Playwright. | `fake-core.ts:180`, `:1169-1183` ; contrat D33 | oui |
| Q18 | Marquage pour les essais | `#stage[data-zones]` : nombre d'éléments `fill` de la page courante (patron `stage-tags.ts:30`). | patron B21 (`data-pot`) | oui |
| Q19 | Licences | `i_overlay` 9.2.0 MIT OR Apache-2.0 ; `i_float` 5.0.0, `i_shape` 5.0.0, `i_tree` 0.20.0, `i_key_sort` 0.12.0 MIT ; `libm` 0.2.16 MIT, déjà listé (`THIRD_PARTY_NOTICES.md:261`). Aucune AGPL, GPL ni LGPL (U39). Section neuve « Crate `roomboard-core` (C8) » avec le texte MIT (« Copyright (c) 2023 iShape-Rust »). `i_overlay` et `i_key_sort` n'embarquent pas de fichier LICENSE : texte repris du dépôt amont. | `cargo metadata` (mesure) ; U39 ; `scripts/controle-licences.mjs` | oui |
| Q20 | Emprise et résolution | Emprise = boîte monde des murs de la page, agrandie de 2 cellules, avec une cellule par px de la vue (`tol / 2`). Elle ne dépend pas de la taille de l'écran : aucun changement de `ToolContext`, et une zone fermée hors champ se ferme quand même. Plafond : 2048 × 2048 cellules (4 Mio de masque, mémoire passagère du module). Au-delà, l'emprise devient la fenêtre de 2048 × 2048 cellules centrée sur le clic, coupée par la boîte : une zone qui la dépasse est « non fermée », donc fond. | brief (« fenêtre bornée autour du clic à l'échelle de la vue ») ; DAU1 (mémoire du module de l'encre) | oui (à revoir) |

Constats à fermer : aucun (la demande ne vient pas d'`audit-architecture`).

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » ; rubriques déduites. Graphe graphify absent pour ce dépôt
(`~/.cache/graphes/` sans `roomboard`) : tout est cherché en texte.

### Cœur Rust (`crates/roomboard-core`)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `src/zone.rs` (neuf) | oui | rastérisation, dilatation, diffusion, forme `i_overlay` (`closed_zone`), derrière `#[cfg(feature = "zone")]` | S |
| `crates/roomboard-formats/src/pixels.rs:69` (`flood_region`) | non | diffusion RVBA de C6b, non appelable depuis le cœur (sens de dépendance) | V |
| `src/fill.rs:19-24` | oui | variante `FillTarget::Zone { x, y, tol }` | V |
| `src/fill.rs:27-40` (`field_for`) | oui | `kind: "fill"` → `color` | V |
| `src/fill.rs:46-117` (`cmd_fill`) | oui | branche `Zone` : insertion de l'élément ou repli sur `Background` | V |
| `src/element.rs:31` (`KNOWN_KINDS`) | oui | ajoute `"fill"` | V |
| `src/element.rs:122-147` (`ElementView`, `bare`) | oui | champ `fill: Option<FillView>` | V |
| `src/document.rs:328-420` (`element`) | oui | lecture d'un `fill`, sinon cadre inconnu | V |
| `src/query.rs:45` (`Geom`), `:136` (`element_geom`), `:233` (`hit_test`) | oui | anneaux du `fill`, intérieur strict | V |
| `src/query.rs:250` (`hit_test_path`), `:259` (`ids_in_rect`), `:268` (`bounds`), `:290` (`snap_box`) | non | suivent `element_geom` sans changement de code | V |
| `src/shape.rs:70` (`shape_polygon`) | non | réutilisé tel quel ; `shape_ring` est ajouté à côté | V |
| `src/ink/outline.rs:32`, `src/document.rs:517` (`cached_outline`) | non | lus sans modification (U28, D7) | V |
| `src/copy.rs:5` | non | copie générique, « aucune lecture du `kind` » : un `fill` se copie déjà | V |
| `src/format/mod.rs:112`, `:301` | non | aucune lecture du `kind` | S |
| `Cargo.toml` du cœur | oui | `i_overlay = { version = "=9.2.0", optional = true }`, `[features] zone = ["dep:i_overlay"]` | V |

### Liaison Wasm et modules

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-wasm/Cargo.toml` | oui | `roomboard-core = { path, features = ["zone"] }` | V |
| `crates/roomboard-wasm/src/lib.rs:1232` (`fill`), `:1790` (`fill_inner`) | oui | `fill_zone(page, x, y, tol, color)` sur le patron `fill_image` | V |
| `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats-wasm/Cargo.toml` | non | sans `zone` : taille inchangée, à vérifier par `verifier.sh:62-72` | V |

### Interface TS (`apps/web/src/core`)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `core/api.ts:26` (`ElementKind`), `:44` (`FillTarget`), `:175` (`Fill`) | oui | `"fill"`, `FillElement`, cible `{ kind: "zone", x, y, tol }` | V |
| `core/wasm-core.ts:176` (`toElementView`), `:586-593` (`Fill`) | oui | `case "fill"` ; appel de `fill_zone` | V |
| `core/fake-core.ts:180`, `:1169`, `:1265`, `:1585`, `:1701` | oui | `KNOWN_KINDS`, `Zone` traité comme `Background`, vue, sauvegarde, repli inconnu | V |

### Rendu et export

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/render/canvas2d.ts:426-460` (`paintElement`), `:643` (`pathOf`) | oui | branche `fill`, `Path2D` en cache, pair-impair | V |
| `engine/render/record-ctx.ts:210-214` | non | pair-impair déjà enregistré | V |
| `crates/roomboard-formats/src/pdf.rs:336` | non | `FillRule::EvenOdd` déjà rendu | V |
| `engine/render/webgl2.ts` | non | encre vive seulement, aucun `kind` | V |
| `engine/render/select.ts` | non | poignées par bornes génériques | S |

### Outil Pot, cible, file

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `engine/fill-target.ts:78-97` (`fillCommand`) | oui | rien touché → `Zone` ; `fill` touché → recolorer ou `Delete` | V |
| `engine/tools/fill.ts:50-53` | non | la commande passe déjà par la file | V |
| `app/image-fill.ts` (`pump`) | non | commande vectorielle, jeton vérifié | V |
| `app/stage-tags.ts:30`, `app/board-session.ts:632` | oui | `data-zones` | V |

### Persistance et compatibilité

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `.roomboard` (`document.ybin`) | oui | nouvel élément facultatif ; un fichier d'avant C8 s'ouvre sans changement | V |
| Build d'avant C8 lisant un `fill` | non | `kind` inconnu gardé, cadre gris (U3) | V |

### Tailles, licences, scripts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `scripts/verifier.sh:48-60` (principal ≤ 1 572 864) | non | plafond inchangé ; mesure attendue d'environ 1 360 000 à 1 380 000 o | V |
| `scripts/verifier.sh:62-72` (`formats` ≤ 3 145 728) | non | doit rester d'environ 3 100 344 o | V |
| `scripts/verifier.sh:91-113` (`--e2e`) | oui | ajoute `c8-pot-zones-navigateur.mjs` | V |
| `THIRD_PARTY_NOTICES.md` | oui | section C8 | V |
| `scripts/controle-licences.mjs`, `scripts/licences-acceptees.json` | non | MIT et Apache déjà acceptées | S |
| `docs/essais/taille-wasm.md` | oui | ligne de mesure C8 | V |

### Tests

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/zone.rs` (tests) | oui | rastériseur (non-nul, pair-impair, centres des cellules) ; triangle à 1 px d'écart → zone ; 3 px → fond ; diffusion jusqu'au bord de l'emprise → fond ; îlot exact ; bord du `fill` sur le bord intérieur du trait (à ½ cellule près) ; plafond d'emprise ; une étape ; annuler et refaire | S |
| `crates/roomboard-core/src/fill.rs` (tests) | oui | `Zone` sans zone = `Background` ; `null` ; recolorer un `fill` | V |
| `document.rs` (tests, patron `reload_with_strokes_keeps_bytes`) | oui | « recharger garde les octets » avec un `fill` ; `fill` mal formé → inconnu | V |
| `query.rs` (tests `hit_test`) | oui | intérieur strict, trou non touché | V |
| `engine/fill-target.test.ts` | oui | les cas « rien → fond » deviennent « rien → `Zone` » | V |
| `core/wasm-core.contract.test.ts` | oui | zone réelle par le vrai module | V |
| `engine/render/canvas2d` (tests du rendu), `record-ctx.test.ts` | oui / non | branche `fill` ; `record-ctx` à garder vert | S |
| `scripts/essais/c8-pot-zones-navigateur.mjs` (neuf) | oui | geste final du brief | S |
| `scripts/essais/c6a-pot-navigateur.mjs`, `c6b-pot-image-navigateur.mjs` | non | à garder verts (fond, ≥ 640 px, file) | V |
| `app/image-fill.test.ts`, `engine/tools/fill.test.ts` | non | à garder verts | V |

### Autres dépôts

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| aucun | non | site de documentation absent du profil | S |

**Effets de bord sur l'existant**
- Clic du pot sur une zone vide sans fermeture : la commande devient `Fill Zone`, et le cœur retombe sur `Background`. Le résultat reste le même, la forme de la commande change. Couvert par `fill.rs` (test « `Zone` sans zone = `Background` »), `fill-target.test.ts` (cas mis à jour) et `c6a-pot-navigateur.mjs` (inchangé, doit rester vert).
- Clic de sélection ou du pot sur un trait recouvert par un `fill` : le trait reste touché parce que l'intérieur du `fill` est strict. Couvert par `query.rs` (test `hit_test` sur le bord) et S5.
- Taille du module principal : +214 643 o mesurés, avant le code de C8 lui-même. Couvert par `verifier.sh:48-60`.
- Coût d'un clic dans le vide : rastérisation de l'emprise (4 Mio de cellules au plus) puis diffusion jusqu'au bord, de l'ordre de la dizaine de millisecondes, non mesuré. La mémoire du module principal monte d'autant une fois, sans redescendre. Couvert par un test de durée de `zone.rs` (page de 300 traits, emprise au plafond, en natif).

**Chantiers en cours** : aucun (`git worktree list` : `main` et ce worktree ; `gh pr list` : aucune PR ouverte).

**Termes cherchés** : graphe absent (aucune requête) ; `grep` sur `FillTarget|fill-target|fillCommand`,
`"model3d"|kind ===|case "shape"` (aiguillages par genre), `evenodd|nonzero|FillRule` (export), `KNOWN_KINDS`,
`roomboard_core::|Document` dans `roomboard-formats*` (ce que `formats` lit du cœur), `flood|diffus|contig` dans
`roomboard-formats/src` (diffusion de C6b), `viewSize|camera()` dans `engine/tools/tool.ts` (taille de vue), `wasm-opt|wasm-bindgen|formats`
(`verifier.sh`), `640` (essais), `dataset[` (marquages), `overlay|i_float|libm` (`THIRD_PARTY_NOTICES.md`) ; coffre :
`chercher.js` « pot de peinture zone fermée remplissage », « roomboard wasm taille module formats », « roomboard piège
wasm i_overlay feature cargo lto ».

**Modules à réutiliser ou à étendre**

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Contours des traits | `document.rs:517` `cached_outline` ; `ink/outline.rs:32` | `cached_outline(id, &style, &pts)` | réutiliser |
| Géométrie des éléments | `query.rs:136` `element_geom`, `:211` `geoms` | `geoms(page, false)` ; `element_geom` gagne la branche `fill` | étendre |
| Passage en monde | `query.rs:95` `world_outline` | `world_outline(&t, &poly)` | réutiliser |
| Anneau d'un rectangle ou d'une ellipse non remplis | `shape.rs:70` `shape_polygon` | `pub fn shape_ring(kind, w, h, width) -> Option<(Vec<f32>, Vec<f32>)>` (extérieur à +½ épaisseur, intérieur à −½, `None` pour une ligne ou une flèche) | étendre |
| Cible du pot | `fill.rs:19` `FillTarget`, `:46` `cmd_fill` ; `fill-target.ts:78` `fillCommand` | variante `Zone { x, y, tol }` | étendre |
| Booléens de polygones | `i_overlay` 9.2.0 (`FloatOverlay`, `OutlineOffset`) | — | réutiliser (crate) |
| Rastérisation, dilatation, diffusion | `roomboard-formats/src/pixels.rs:69` `flood_region` (RVBA, tolérance) : pas accessible depuis le cœur (`formats` → cœur), donc pas de duplication nette (condition « accessible » fausse) ; aucun rastériseur dans le cœur (termes `raster`, `scanline`, `mask`, `flood`) | dans `zone.rs`, privés : `struct Mask { w, h, cells: Vec<u8> }`, `fn paint(&mut self, ring_sets: &[&[f32]], even_odd: bool)`, `fn dilate(&mut self)`, `fn flood(&self, cx, cy) -> Option<Vec<u8>>` (`None` si le bord est atteint) | nouveau module |
| Calcul de zone | aucun (termes `zone`, `hole`, `union`, `closed`) | `zone.rs`, seule interface sortante : `impl Document { pub(crate) fn closed_zone(&self, page: &str, x: f64, y: f64, tol: f64) -> Option<Vec<Vec<f64>>> }` (anneaux monde, extérieur d'abord ; `None` = non fermée) | nouveau module (rien d'existant) |
| Ordre et péremption | `app/image-fill.ts` `createFillQueue` | `submit({ command }, run)` | réutiliser |
| Pont Wasm | `roomboard-wasm/src/lib.rs:1790` `fill_inner`, patron `fill_image` | `pub fn fill_zone(&mut self, page: &str, x: f64, y: f64, tol: f64, color: Option<String>)` | étendre |
| Élément inconnu mal formé | `document.rs` `unknown_view` (patron T2, M7, X8) | `unknown_view(&txn, e)` | réutiliser |
| Rendu du chemin | `canvas2d.ts:643` `pathOf` (cache `Path2D` par id) | même cache, nouvelle source | étendre |
| Marquage | `app/stage-tags.ts:30` `stageTags` | champ `zones` | étendre |
| Essai navigateur | `scripts/essais/commun.mjs` (`stageBox`, `stageMouse`, `inkIn`) | appel tel quel | réutiliser |

## 4. Hypothèses à revoir

**Niveau 1 (difficiles à défaire ou visibles des utilisateurs)**
- **HC8-1** Une image ou un texte ferme une zone par sa **boîte**, pas par ses pixels ni ses glyphes : le cœur n'a pas les pixels (U4), et les faire venir de la page coûterait un aller-retour de rendu. « Image comprise » est donc partiel. Pour le compléter plus tard, il suffit de rastériser ces éléments dans la page et de passer un masque, sans changer ni la commande ni le format.
- **HC8-11** Emprise = boîte des murs, plafond de 2048 × 2048 cellules centré sur le clic. Au plafond (fort zoom sur une grande page), une grande zone devient « non fermée » et c'est le fond qui change.
- **HC8-2** Le fond de la page (PDF, image de fond, grille) ne ferme aucune zone : un clic dans une case d'une fiche PDF change le fond de la page. Les zones du fond restent hors périmètre.
- **HC8-3** Les objets inclus dans la zone en sont retirés (trous). Un texte inclus y laisse un trou rectangulaire de sa boîte.
- **HC8-4** Le `fill` est touché en intérieur strict. La gomme d'objet ne l'efface pas ; on le retire par Sélection puis Supprimer, ou par le pot « Aucune ».
- **HC8-5** `i_overlay` va dans le module principal : +214 643 o (environ +78 Ko compressés en gzip) au démarrage, pour tous.

**Niveau 2**
- **HC8-6** « Aucune » dans une zone fermée vide remet le fond de la page à `#ffffff` (comme C6a) ; aucun `fill` transparent.
- **HC8-7** Pas de simplification des anneaux au-delà de celle d'`i_overlay` par défaut ; pas de plafond de points (pages de quelques centaines de traits).
- **HC8-8** Au droit d'un écart fermé, le bord du `fill` suit la grille de la vue au moment du clic (marches d'1 px de la vue), visibles en zoomant fort ; ailleurs, le bord suit exactement les objets. La couture d'anticrénelage entre `fill` et trait est acceptée.
- **HC8-9** Seuil de repli à 1 420 000 o pour le module principal.
- **HC8-10** `contours` en f64 positionnels plutôt qu'en octets (`Any::Buffer`) comme les points d'un trait : plus lisible, plus gros.

## 5. Décisions d'architecture

**DA-Z1 — Zone (rastérisation et `i_overlay`) dans le module principal, derrière la fonctionnalité `zone` du cœur.**
Contexte : mesure hors dépôt (`/tmp/c8`), profil `opt-level = "s"`, LTO, `codegen-units = 1`, `wasm-bindgen --remove-name-section` (le dépôt n'utilise pas `wasm-opt`). Crate jetable : 17 106 o sans, 213 264 o avec (+196 158 o ; +157 155 o pour l'union seule) ; copie du module principal : 1 145 044 o, puis 1 359 687 o avec la fonction de zone (+214 643 o). Un `opt-level = "z"` posé sur les seules crates `i_*` ne change rien sous LTO (1 359 687 o).
Décision : `formats` est exclu (3 100 344 + ~200 000 > 3 145 728). Le module principal tient : marge de 213 177 o après l'ajout. Le calcul vit dans `roomboard-core/src/zone.rs` sous `feature = "zone"`, que seul `roomboard-wasm` active.
Conséquences : le cœur, qui lit déjà les contours et les géométries, rastérise et calcule la zone sans faire passer de polygones ni de pixels par la frontière TS. La mesure inclut l'offset d'`i_overlay`, que le chantier n'utilise plus (union et différence seulement) : le coût réel devrait être plus bas. `formats` ne grossit pas, et `verifier.sh` le prouve. Le repli HU2-8 sert si le seuil Q5 est dépassé.

**DA-Z2 — Région sur la vue rastérisée, bords exacts par différence (U28 P3 tel quel).**
Contexte : U28 décide la région sur la vue rastérisée, avec une tolérance de 2 px et une forme par `i_overlay`. Le cœur a les contours peints (`ink::outline`) et les géométries des formes, mais ni les pixels des images ni les glyphes.
Décision : masque des murs à 1 cellule par px de la vue sur l'emprise (Q20), dilatation d'une cellule, diffusion 4-connexe ; si le bord est touché, `Background`. Sinon, union des suites de cellules agrandies de 2 cellules, moins les polygones exacts des murs, et on garde la forme qui contient le clic.
Conséquences : ce qui ferme la zone est ce que l'élève voit (à la boîte près pour les images et les textes, HC8-1), et les bords sont exacts sauf au droit des écarts (HC8-8). Tout est testable en natif. Une pré-rastérisation des images par la page, ajoutée plus tard, ne changera ni la commande ni le format.

**DA-Z3 — Cible `Fill Zone` qui retombe sur le fond.**
Contexte : la page ne peut pas savoir s'il existe une zone sans le cœur, et la file peut différer l'écriture.
Décision : `fillCommand` envoie `Zone { x, y, tol }` dès que rien n'est touché ; le cœur calcule à l'écriture et insère le `fill`, sinon applique `Background`.
Conséquences : une seule rastérisation, toujours sur l'état gardé par le jeton de la file. La file de C6b reste inchangée. La fausse liaison peut traiter `Zone` comme `Background`.

**DA-Z4 — Élément `fill` : anneaux positionnels, intérieur strict.**
Contexte : élément non lié, au-dessus des objets, qui doit être enregistré, rouvert, dessiné, touché et exporté.
Décision : Y.Map `{ id, kind: "fill", transform, color, contours }`, avec `contours` en `Any::Array` d'`Any::Array` de f64 (U3), rendu et touché en pair-impair, intérieur strict. Un `fill` mal formé devient un cadre inconnu.
Conséquences : format facultatif (U3), aller-retour à octets constants, copie et groupes génériques. Ancien build : cadre gris.

## 6. Scénarios d'acceptation

- **S1** Tracer trois traits qui ferment un triangle avec un écart de 1 px à un sommet, choisir le pot et une couleur, cliquer au centre : `data-zones` passe à 1, le centre prend la couleur, et les pixels des trois traits gardent leur couleur. Annuler : `data-zones` à 0. Refaire : 1.
- **S2** Cliquer au pot hors de toute zone (page vide, ou triangle à 4 px d'écart, où la diffusion fuit jusqu'au bord de l'emprise) : `data-fond` change, aucun `fill`, une étape.
- **S3** Après S1, enregistrer, fermer, rouvrir : le `fill` est là, même couleur, au-dessus des traits. Ouvrir un `.roomboard` d'avant C8 (fixture) : rien ne change.
- **S4** Dessiner un rectangle non rempli et cliquer dedans au pot : la forme reçoit son `fill` (C6a), `data-zones` reste à 0. Poser une image, fermer avec deux traits la zone entre l'image et les traits, puis cliquer dedans : un `fill` est posé, son bord longe la boîte de l'image.
- **S5** Dans le triangle de S1, tracer un petit cercle avant de remplir : il reste visible après le remplissage (trou exact). Cliquer au pot sur le `fill` avec une autre couleur : il est recoloré, en une étape. Cliquer sur un des traits du bord : le trait change de couleur, pas le `fill`. La scène garde au moins 640 px.

## 7. Hors périmètre

- U28 P2 (couleur mot par mot, déjà en C6a) ; zones fermées par le fond de page (PDF, image de fond, grille) ; pixels transparents d'une image ou glyphes d'un texte comme murs (rastérisation par la page, HC8-1).
- Un `fill` qui suit les objets d'origine quand on les déplace (modèle 3 de l'étude) : le `fill` est non lié (U28).
- Réglage de la tolérance de fermeture dans la rangée ; `wasm-opt` dans la chaîne de build.
- Autres dépôts : aucun.

## 8. Portes immédiates

Aucune.
