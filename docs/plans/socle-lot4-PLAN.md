# Plan du lot 4 — Outils d'édition (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D2, D4, D11, D13, D14, D15, D16, D17, D37, D38 ; DA2, DA4, DA5, DA6 ;
§ 3 « Modules à réutiliser ou à étendre » ; scénarios S3 et S4). Plan maître : `docs/plans/socle-PLAN.md` (ligne du
lot 4 ; preuve du lot 4 : vitest des outils d'édition, `cargo test` des commandes `Transform`, `AddShape`, `SetText`,
pages). Plans précédents : `docs/plans/socle-lot3-PLAN.md`, `docs/plans/socle-lot3b-PLAN.md` (HL3b-7 : « Retirer la
page montrée (lot 4) n'est pas traité ici »). État : `docs/sessions/socle-etat.md`.

**But :** sur la page web du socle, on sélectionne un élément (clic, rectangle, Maj), on le déplace, on le
redimensionne par 8 poignées, on pose un rectangle, une ellipse, une ligne ou une flèche, on écrit un texte (IME
comprise), on ajoute, change et retire des pages ; Ctrl+Z défait chaque geste, un geste = une étape.

**Architecture :** le cœur Rust gagne trois commandes (`Transform`, `AddShape`, `SetText`), deux types d'éléments
(`shape`, `text`, D2) et leurs lectures (`element`, `hit_test`, `ids_in_rect`, `bounds`) ; la liaison Wasm les expose
(DA5). Côté page : le contrat `api.ts` et la fausse liaison suivent ; trois outils de geste
(`engine/tools/select.ts`, `shape.ts`, `text.ts`) rendent leurs aperçus dans un calque d'édition (`EditOverlay`) que le
rendu peint sur la **scène** ; le moteur gère pages, sélection, Suppr, Échap, Maj ; la saisie du texte passe par une
`<textarea>` posée au-dessus du canvas (`app/text-editor.ts`). La barre DOM minimale gagne une troisième ligne
(`#edition`), remplacée au lot 5.

**Tech :** Rust 2021, yrs 0.28.1 (`TextPrelim`, `TextRef`), wasm-bindgen 0.2.130 ; TypeScript 5.6 strict, Vitest 3
(environnement Node, faux objets) ; Playwright 1.65.1 (cache npx de la VM) et son Chromium headless, hors
`verifier.sh`.

**Code du plan non essayé à l'écriture** (temps compté, arrêt ferme à 02:50) : chaque exécutant compile et fait
tourner ; une erreur de compilation du plan se corrige dans le périmètre de la tâche et se dit au rapport.

## Ce que le cœur offrait déjà (relevé à `5341564`)

- Commandes `AddPage { after }`, `RemovePage` (`Err(LastPage)` sur la dernière, D37), `CommitStroke`, `Erase`
  (partielle, objet), `Delete { ids }` : `crates/roomboard-core/src/commands.rs:23-45`. Une commande = une transaction
  `"local"` = une étape (D11) ; une commande sans effet n'ouvre aucune transaction d'écriture (test
  `command_without_effect_opens_no_write_transaction`).
- Lectures `element`, `hit_test`, `hit_test_path`, `ids_in_rect`, `bounds`, `outline`, `stroke_points` :
  `crates/roomboard-core/src/query.rs:66-158`, **traits seulement** (`read_stroke`).
- `ElementView { id, kind, transform, style }` et `Transform` affine à 6 nombres, `invert`, `apply_transform` :
  `crates/roomboard-core/src/element.rs:12-50`.
- Liaison : `add_page_after`, `remove_page`, `commit_stroke`, `erase`, `delete`, lectures, `undo`/`redo` :
  `crates/roomboard-wasm/src/lib.rs:78-208` ; `api.ts` annonce « AddShape, SetText, Transform arrivent au lot 4 ».
- Moteur : `showPage(id)` et caméra par page (`apps/web/src/engine/engine.ts:255-273`), mais aucun bouton de page,
  aucune suite donnée au retrait de la page montrée (HL3b-7).
- Manquent : `Transform`, `AddShape`, `SetText`, les éléments `shape` et `text`, et toute la page côté outils.

## Choix tranchés au lot 4

Aucun ne touche le format au-delà du schéma v1 non publié (D2 : réversible jusqu'à la première release) ; aucun ne
se défait mal pour l'utilisateur : tous vivent dans un module du moteur ou de la barre (remplacée au lot 5). Aucun
nouveau réglage dans `engine/settings.ts` n'est donc posé ; la raison est écrite à chaque ligne.

| # | choix | raison (source) |
|---|---|---|
| CL4-1 | Les aperçus d'édition (éléments déplacés ou redimensionnés, forme en cours, cadre de sélection, poignées, rectangle de sélection) sont peints sur la **scène** Canvas 2D (`drawScene(page, camera, hidden, overlay)`), pas dans `drawLive`. Écart à D38 (« dessinés dans `drawLive` »). | Avec l'échelon 4 (`webgl: on`), `drawLive` est en WebGL2 (`render/webgl2.ts:313-328`), qui ne sait peindre ni texte ni ellipse ; la scène reste au Canvas 2D dans les deux cas (`render/select.ts:41`, HL3b-4) : une seule implémentation, parité d'office. Le chemin de l'encre ne change pas. Coût : la scène est redessinée à chaque image pendant un glisser d'édition (chemins `Path2D` en cache). |
| CL4-2 | Saisie du texte : une `<textarea>` **visible** (fond transparent, cadre pointillé), hors de `#stage`, placée par une matrice CSS (caméra × transformation de l'élément), dimensionnée en unités monde. | D14 (« `<textarea>` posé sur le canvas ») ; une zone visible laisse le navigateur placer la fenêtre de candidats de l'IME au curseur ; hors de `#stage`, ses événements ne passent pas par l'échantillonneur (`setPointerCapture`). |
| CL4-3 | Composition IME : `compositionstart` → composition en cours ; toute demande de validation (Échap, clic ailleurs, perte du focus, changement d'outil ou de page) pendant la composition est **différée** et jouée à `compositionend`. Échap avec `isComposing` vrai est laissée à l'IME. Rien n'est écrit dans le document pendant la composition. | D14 (« sauf pendant une composition IME ») ; `engine/input/keys.ts:27-29` (même règle pour Ctrl+Z). |
| CL4-4 | Le cœur n'a pas de police : la page mesure le texte (`layoutText`, coupure aux espaces dans la largeur de boîte) et envoie la hauteur de boîte dans `SetText` ; le cœur la garde pour la collision, la sélection et les bornes. | D1 (cœur sans navigateur) ; une seule mise en lignes (`engine/text-layout.ts`) sert au rendu et à la mesure. |
| CL4-5 | Texte : largeur de boîte 600 unités, taille 36 parmi [24, 36, 48, 72], interligne 1,25, police `"Atkinson Hyperlegible", system-ui, sans-serif` (police embarquée au lot 5, H1-6), couleur du stylo. Aucun bouton de taille au lot 4. | D14 (« une police, une taille parmi 4, une couleur, largeur de boîte ») ; barre de styles au lot 5. |
| CL4-6 | Clic avec l'outil Texte : sur un texte → l'éditer ; ailleurs → nouvelle boîte ; une boîte déjà ouverte → la valider seulement. Texte vide validé : nouvelle boîte = rien d'écrit, texte existant = élément retiré. Texte inchangé = aucune étape. | D14 (« texte vide validé = élément retiré ») ; D38 (aucune étape vide). |
| CL4-7 | Formes : collision sur toute la surface du rectangle et de l'ellipse (remplis ou non), segment épaissi pour ligne et flèche ; remplissage « aucun » au lot 4 (le contrat le porte, le bouton viendra au lot 5) ; couleur et épaisseur du stylo. Forme plus petite que 4 px écran sur les deux axes : rien d'écrit. | D13 ; une forme vide qui ne se prend qu'au bord est difficile à saisir au stylet (D15 : tolérance 6 px). |
| CL4-8 | `Transform { ids, matrix }` : matrice monde composée à gauche (`nouvelle = matrix ∘ ancienne`), ids inconnus ignorés, matrice non finie ou non inversible refusée (`BadMatrix`), matrice identité = aucune étape. | DA5 ; D4 (seule `transform` est réécrite) ; D38. |
| CL4-9 | Pages : « Ajouter » insère après la page montrée et la montre ; retirer la page montrée montre la **précédente** (la première si c'était la première) ; après annuler / rétablir, une page qui réapparaît est montrée, une page montrée qui disparaît laisse la précédente. La caméra d'une page retirée est gardée : annuler le retrait rend aussi sa vue. | D16 ; HL3b-7 ; S3 (« Supprimer la page 2, annuler : elle revient avec son trait »). |
| CL4-10 | Sélection : vidée en changeant d'outil ou de page ; Échap la vide ; Suppr ou Retour arrière supprime la sélection (une étape, D12) ; glisser sur un élément non sélectionné le sélectionne et le déplace dans le même geste ; un clic sans glisser (< 2 px écran) n'écrit rien. | D15 ; D12 (« formes et texte se suppriment par sélection + Suppr »). |
| CL4-11 | Poignées : 8, carrées de 10 px écran, prises à 12 px écran ; échelle bornée à 0,05 en valeur absolue (jamais nulle) ; Maj = proportions (facteur dominant appliqué aux deux axes). | D15 ; une échelle nulle rendrait la matrice non inversible (refusée par le cœur). |
| CL4-12 | Maj est suivie par le moteur (`keydown` / `keyup` de `Shift`, relâchée à la perte du focus) : `InputSample` ne porte aucun modificateur. | `engine/input/sampler.ts:7-14` ; même patron que l'espace tenu (`engine.ts:233-251`). |
| CL4-13 | Troisième ligne de barre `#edition` (Sélection, Rectangle, Ellipse, Ligne, Flèche, Texte, page précédente, page suivante, Ajouter une page, Retirer la page, compteur « 1 / 3 ») sous `#reglages`, à 104 px du haut : la première ligne garde ses 6 boutons (S2 inchangé). | Consigne du lot (barre DOM minimale, remplacée au lot 5) ; 16 boutons ne tiennent pas sur une ligne de 1 280 px. |
| CL4-14 | Le geste de sélection ne suit qu'un pointeur à la fois ; un second pointeur pendant un glisser d'édition est ignoré. Le doigt suit le routeur tel quel (D18) : après un stylet vu, il déplace la vue. | D18 ; un glisser à deux mains n'a pas de sens au socle. |
| CL4-15 | La zone de texte ne suit pas un zoom ou un défilement fait pendant l'édition (elle est placée à l'ouverture) ; valider puis rouvrir la recale. | Cas rare au stylet ; reprise au lot 5 avec l'interface Solid. |

## Hypothèses prises par ce plan (à revoir)

- **HL4-1** Hauteur de boîte mesurée par le Canvas 2D de la page ; la `<textarea>` coupe ses lignes elle-même, à
  quelques pixels près de `layoutText` (même police, même largeur) : l'écart se voit au plus sur la dernière ligne.
- **HL4-2** La tolérance de collision (`tol`, unités monde) est appliquée dans le repère local de l'élément : sur un
  élément agrandi ×2 elle double. Accepté au socle.
- **HL4-3** IME au navigateur : seul Chromium headless est joué (CDP `Input.imeSetComposition`, sinon événements de
  composition synthétiques). Ni IME réelle de Windows ou de macOS, ni fenêtre de candidats, ni WebKit, ni clavier
  Android.

## Review Focus

1. Clic sans glisser avec l'outil Sélection : aucune étape d'historique (CL4-10) → T51,
   `un clic sans glisser n'écrit rien`.
2. Validation demandée pendant une composition IME (Échap, perte du focus) : rien n'est écrit avant `compositionend`
   (CL4-3, D14) → T53, `une validation pendant la composition attend compositionend` ; T56,
   `Échap pendant la composition reste à l'IME`.
3. Annuler un « Ajouter une page » pendant qu'on montre la page ajoutée : le moteur montre la précédente, sans erreur
   (CL4-9, S3) → T47, `annuler l'ajout montre la page précédente, rétablir la remontre`.
4. Ouvrir puis valider un texte sans rien changer : aucune étape (CL4-6, D38) → T49,
   `set_text_unchanged_is_no_step` ; T53, `une boîte neuve validée vide n'écrit rien`.
5. Poignée tirée au-delà de l'ancre ou sur l'ancre : la matrice reste inversible, jamais d'échelle nulle (CL4-11) →
   T48, `resizeMatrix ne s'écrase jamais`.

## Table des tâches

Vagues : **1** = T45, T46, T47, T48 · **2** = T49, T50, T51, T52, T53 · **3** = T54, T55, T56, T57 · **4** = T58, T59.
Aucune tâche d'une vague ne recoupe les fichiers d'une autre tâche de la même vague.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T45 | Cœur : `Transform` et `AddShape` | — | crates/roomboard-core/src/shape.rs, crates/roomboard-core/src/lib.rs, crates/roomboard-core/src/element.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/query.rs, crates/roomboard-core/src/document.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core` ≥ 14 tests neufs ok, dont `transform_moves_elements_in_one_step`, `add_shape_rect_normalizes_and_is_one_step`, `hit_test_finds_shape_interior` ; verifier.sh OK | S4 | #tache-t45 |
| T46 | Contrat TS, fausse liaison et calque d'édition | — | apps/web/src/core/api.ts, apps/web/src/core/shapes.ts, apps/web/src/core/shapes.test.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/fake-core.test.ts, apps/web/src/core/wasm-core.ts, apps/web/src/engine/render/overlay.ts, apps/web/src/engine/render/overlay.test.ts, apps/web/src/engine/tools/tool.ts | isolé | concepteur-critique | vitest `shapes`, `overlay`, `fake-core` ≥ 15 tests neufs, dont `Transform compose à gauche et ignore les ids inconnus` ; verifier.sh OK | S3, S4 | #tache-t46 |
| T47 | Moteur : pages (ajouter, retirer, précédente, suivante) | — | apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/app/barre.test.ts | isolé | implementeur-tdd | vitest `engine` ≥ 7 tests neufs, dont `annuler l'ajout montre la page précédente, rétablir la remontre` ; verifier.sh OK | S3 | #tache-t47 |
| T48 | Mise en lignes du texte et poignées | — | apps/web/src/engine/text-layout.ts, apps/web/src/engine/text-layout.test.ts, apps/web/src/engine/tools/handles.ts, apps/web/src/engine/tools/handles.test.ts | isolé | implementeur-tdd | vitest `text-layout`, `handles` ≥ 12 tests, dont `resizeMatrix ne s'écrase jamais` ; verifier.sh OK | S3, S4 | #tache-t48 |
| T49 | Cœur : `SetText` (Y.Text) et scénarios S3/S4 du cœur | T45 | crates/roomboard-core/src/element.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/query.rs, crates/roomboard-core/src/document.rs, crates/roomboard-core/tests/scenarios.rs | isolé | concepteur-critique | `cargo test -p roomboard-core` ≥ 9 tests neufs ok, dont `set_text_unchanged_is_no_step`, `s3_text_stroke_shape_survive_save_load`, `s4_transform_two_elements_then_undo_twice` ; verifier.sh OK | S3, S4 | #tache-t49 |
| T50 | Rendu : formes, texte et calque d'édition sur la scène | T46, T48 | apps/web/src/engine/render/renderer.ts, apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts, apps/web/src/engine/render/webgl2.ts, apps/web/src/engine/render/webgl2.test.ts | isolé | implementeur-tdd | vitest `canvas2d`, `webgl2` ≥ 7 tests neufs, dont `calque d'édition : fantômes, cadre, poignées, rectangle` ; verifier.sh OK | S3, S4 | #tache-t50 |
| T51 | Outil Sélection : clic, rectangle, Maj, déplacer, redimensionner | T46, T48 | apps/web/src/engine/tools/select.ts, apps/web/src/engine/tools/select.test.ts | isolé | implementeur-tdd | vitest `select` ≥ 10 tests, dont `un clic sans glisser n'écrit rien`, `poignée de coin : Transform d'échelle autour du coin opposé` ; verifier.sh OK | S4 | #tache-t51 |
| T52 | Outil Formes : rectangle, ellipse, ligne, flèche, Maj | T46 | apps/web/src/engine/tools/shape.ts, apps/web/src/engine/tools/shape.test.ts | isolé | implementeur-tdd | vitest `shape` ≥ 7 tests, dont `une AddShape au relâché, aperçu avant` ; verifier.sh OK | S3 | #tache-t52 |
| T53 | Outil Texte : session d'édition et composition IME | T46, T48 | apps/web/src/engine/tools/text.ts, apps/web/src/engine/tools/text.test.ts | isolé | concepteur-critique | vitest `text` ≥ 9 tests, dont `une validation pendant la composition attend compositionend` ; verifier.sh OK | S3 | #tache-t53 |
| T54 | Liaison Wasm et contrat commun des trois commandes | T46, T49 | crates/roomboard-wasm/src/lib.rs, apps/web/src/core/wasm-core.ts, apps/web/src/core/wasm-core.contract.test.ts | isolé | concepteur-critique | `cargo test -p roomboard-wasm` ≥ 4 tests neufs ; vitest contrat ≥ 6 tests neufs × 2 fabriques, aucun sauté (`ROOMBOARD_WASM_REQUIRED=1`) ; verifier.sh OK | S3, S4 | #tache-t54 |
| T55 | Moteur : outils d'édition branchés, Suppr, Échap, Maj, routeur | T47, T50, T51, T52, T53 | apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/engine/input/gesture.ts, apps/web/src/engine/input/router.ts, apps/web/src/engine/input/router.test.ts, apps/web/src/engine/input/keys.ts, apps/web/src/engine/input/keys.test.ts, apps/web/src/engine/render/trail-style.ts, apps/web/src/engine/render/trail-style.test.ts | isolé | implementeur-tdd | vitest `engine`, `router`, `keys`, `trail-style` ≥ 12 tests neufs, dont `Suppr supprime la sélection en une étape` ; verifier.sh OK | S3, S4 | #tache-t55 |
| T56 | Zone de saisie du texte (DOM) | T53, T48 | apps/web/src/app/text-editor.ts, apps/web/src/app/text-editor.test.ts | isolé | implementeur-tdd | vitest `text-editor` ≥ 6 tests, dont `Échap pendant la composition reste à l'IME` ; verifier.sh OK | S3 | #tache-t56 |
| T57 | Script S3/S4 au navigateur (rouge attendu avant T58) | — | scripts/essais/commun.mjs, scripts/essais/s34-navigateur.mjs | isolé | implementeur-tdd | `node --check` des deux fichiers ; s34 sort 1 avec `boutons absents : select, rect, ellipse, line, arrow, text` ; S2 lot 3 `OK`, S2 lot 3b `OK (4 passages)` | S3, S4 | #tache-t57 |
| T58 | Amorce et barre d'édition ; S3/S4 joué vert, captures | T54, T55, T56, T57 | apps/web/src/main.ts, apps/web/src/app/barre.ts, apps/web/src/app/barre.test.ts, apps/web/index.html, docs/essais/s34-lot4-selection.png, docs/essais/s34-lot4-forme-texte.png, docs/essais/s34-lot4-pages.png | isolé | implementeur-tdd | vitest `barre` ≥ 4 tests neufs ; verifier.sh OK ; `S3/S4 lot 4 : OK` ; S2 lot 3 `OK` ; S2 lot 3b `OK (4 passages)` ; 3 captures | S3, S4 | #tache-t58 |
| T59 | Fiche ENI : « Lot 4 : à essayer » | — | docs/essais/eni-stylet.md | isolé | implementeur-tdd | `grep -c` : titre `## Lot 4 : à essayer` présent une fois, 6 lignes d'outils | S3, S4 | #tache-t59 |

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `crates/roomboard-core/src/shape.rs` (nouveau) | `ShapeKind`, normalisation des coins, polygones locaux de collision | T45 |
| `crates/roomboard-core/src/element.rs` | `ShapeView`, `TextView`, champs `shape` / `text` d'`ElementView`, `compose` | T45, T49 |
| `crates/roomboard-core/src/commands.rs` | `Command::{Transform, AddShape, SetText}`, erreurs `BadShape`, `BadMatrix`, `BadText`, `UnknownElement`, `read_shape`, `read_text` | T45, T49 |
| `crates/roomboard-core/src/query.rs` | géométrie de tout élément (`element_geom`) pour `hit_test`, `ids_in_rect`, `bounds` ; `hit_test_path` reste aux traits (D12) | T45, T49 |
| `crates/roomboard-core/src/document.rs` | `element()` par type | T45, T49 |
| `crates/roomboard-core/tests/scenarios.rs` | S3 et S4 au niveau du cœur | T49 |
| `crates/roomboard-wasm/src/lib.rs` | `add_shape`, `set_text`, `transform` (+ `_inner`) | T54 |
| `apps/web/src/core/api.ts` | contrat : commandes, `ElementView` en union, `ShapeKind`, `ShapeData`, `TextData` | T46 |
| `apps/web/src/core/shapes.ts` (nouveau) | miroir TS de `shape.rs` ; `applyMatrix`, `composeMatrix` | T46 |
| `apps/web/src/core/fake-core.ts` | fausse liaison : éléments à matrice, formes, textes, `Transform` | T46 |
| `apps/web/src/core/wasm-core.ts` | lecture contrôlée de l'union ; `apply` des trois commandes | T46, T54 |
| `apps/web/src/engine/render/overlay.ts` (nouveau) | `EditOverlay` (fantômes, formes, cadre, poignées, rectangle) | T46 |
| `apps/web/src/engine/tools/tool.ts` | `LivePart.overlay`, `ToolContext.shift`, `GestureTool.leave`, `SelectionTool` | T46 |
| `apps/web/src/engine/text-layout.ts` (nouveau) | police, tailles, `layoutText`, `textBoxHeight` | T48 |
| `apps/web/src/engine/tools/handles.ts` (nouveau) | poignées, `hitHandle`, `translateMatrix`, `resizeMatrix`, `transformBounds` | T48 |
| `apps/web/src/engine/render/{renderer,canvas2d,webgl2}.ts` | `drawScene(…, overlay)` ; formes, texte, calque | T50 |
| `apps/web/src/engine/tools/{select,shape,text}.ts` (nouveaux) | outils d'édition | T51, T52, T53 |
| `apps/web/src/engine/engine.ts` | pages (T47) ; outils d'édition, Suppr, Échap, Maj, calque (T55) | T47, T55 |
| `apps/web/src/engine/input/{gesture,router,keys}.ts`, `render/trail-style.ts` | outils de tracé étendus, rôle « edit », touches d'édition | T55 |
| `apps/web/src/app/text-editor.ts` (nouveau) | `<textarea>` de saisie | T56 |
| `apps/web/src/app/barre.ts`, `apps/web/src/main.ts`, `apps/web/index.html` | ligne `#edition`, amorce des outils, attributs du scénario | T58 |
| `scripts/essais/commun.mjs`, `scripts/essais/s34-navigateur.mjs` (nouveaux) | serveur et Playwright partagés ; parcours S3/S4 | T57 |
| `docs/essais/eni-stylet.md` | « Lot 4 : à essayer » | T59 |

**Carte d'impact du cadrage** (lignes « touché » qui concernent ce lot) : `document.rs` → T45, T49 ;
`roomboard-wasm/src/lib.rs` → T54 ; `apps/web/src/engine/tools/` → T51, T52, T53 ; `apps/web/src/engine/render/` →
T50 ; `apps/web/src/main.ts` → T58 ; `apps/web/src/toolbar.ts` : **non touché** au lot 4 (DA10 au lot 5 ; la barre
lit seulement le libellé « Sélection » de `toolbar`). Tests à garder verts : `document.rs` (`new_document_has_no_page`,
`add_page_increments_count`, `blank_page_is_not_undoable`) → preuves de T45 et T49 ; `roomboard-wasm` (2 tests du
squelette) → T54 ; `toolbar.test.ts` → T58 ; S2 au navigateur → T57 et T58.

## Contrat d'interface du lot (référence commune)

Ce bloc est recopié, morceau par morceau, dans l'Interfaces de chaque tâche qui le produit ou le consomme.

```ts
// apps/web/src/core/api.ts (T46)
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export interface ShapeData { readonly shape: ShapeKind; readonly w: number; readonly h: number; readonly fill: string | null }
export interface TextData { readonly content: string; readonly size: number; readonly boxWidth: number; readonly boxHeight: number }
export type ElementView = StrokeElement | ShapeElement | TextElement; // style commun ; texte : style.width = 0
// Commandes ajoutées :
// { type: "AddShape"; page; shape: ShapeKind; x0; y0; x1; y1; style: StrokeStyle; fill: string | null }
// { type: "SetText"; page; id: string | null; x; y; content; color; size; boxWidth; boxHeight }
// { type: "Transform"; ids: readonly string[]; matrix: Matrix }
```

Messages d'erreur (cœur = fausse liaison, mot pour mot) : `forme invalide (rect, ellipse, line ou arrow, coins finis
attendus)` · `matrice invalide (six nombres finis, inversible)` · `texte invalide (taille et boîte finies > 0
attendues)` · `élément inconnu : <id>` · `page inconnue : <id>` · `épaisseur de trait invalide (nombre fini > 0
attendu)`.

Attributs lus par le scénario S3/S4 (posés par T58 sur `#stage`) : `data-ready="1"`, `data-elements` (nombre
d'éléments de la page montrée), `data-page` (`"<i>/<n>"`, i à partir de 1), `data-selection` (nombre d'ids
sélectionnés), `data-bounds` (`"x0,y0,x1,y1"` monde arrondis au dixième, vide sans sélection), `data-tool`. Boutons
(`button[data-action=…]`) : ligne `#barre` inchangée ; ligne `#edition` : `select`, `rect`, `ellipse`, `line`,
`arrow`, `text`, `page-prev`, `page-next`, `page-add`, `page-remove` ; compteur `#pages`. Zone de saisie :
`textarea#texte-edition`.

---

<a id="tache-t45"></a>
### Tâche T45 — Cœur : `Transform` et `AddShape`

**Objectif.** Le cœur pose une forme (rectangle, ellipse, ligne, flèche) en une étape et déplace ou redimensionne
n'importe quel élément par une matrice composée à gauche, en une étape (D13, D15, D4, CL4-7, CL4-8). Les lectures
`element`, `hit_test`, `ids_in_rect`, `bounds` voient les formes ; `hit_test_path` et `Erase` restent aux traits (D12).

**Fichiers.**
- Créer : `crates/roomboard-core/src/shape.rs`
- Modifier : `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/element.rs`,
  `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/document.rs`

**Interfaces.**
- Consomme : `Document::{transact_local, read, find_element, page_elements, done, unchanged, cached_outline}`
  (`document.rs`, `commands.rs`) ; `invert`, `transform_to_any`, `out_transform`, `read_style`
  (`element.rs`) ; `hit_outline`, `path_hits_outline` (`ink/hit.rs`).
- Produit :
  - `pub enum shape::ShapeKind { Rect, Ellipse, Line, Arrow }` avec `parse(&str) -> Option<ShapeKind>`,
    `as_str(self) -> &'static str`, `is_segment(self) -> bool` ;
    `pub fn shape::normalize(kind, x0: f64, y0: f64, x1: f64, y1: f64) -> (f64, f64, f64, f64)` (tx, ty, w, h) ;
    `pub fn shape::shape_polygon(kind, w: f64, h: f64, width: f32) -> Vec<f32>` ;
    `pub fn shape::box_polygon(w: f64, h: f64) -> Vec<f32>`.
  - `pub struct element::ShapeView { shape: String, w: f64, h: f64, fill: Option<String> }` ;
    `ElementView.shape: Option<ShapeView>` (omis à la sérialisation si `None`) ;
    `pub fn element::compose(m: &Transform, t: &Transform) -> Transform` (`m ∘ t`).
  - `Command::AddShape { page: String, shape: ShapeKind, x0: f64, y0: f64, x1: f64, y1: f64, style: StrokeStyle, fill: Option<String> }`,
    `Command::Transform { ids: Vec<String>, matrix: Transform }` ;
    `CommandError::BadShape` (« forme invalide (rect, ellipse, line ou arrow, coins finis attendus) »),
    `CommandError::BadMatrix` (« matrice invalide (six nombres finis, inversible) ») ;
    `pub(crate) struct commands::ShapeFields { kind, w, h, style, fill }`, `pub(crate) fn commands::read_shape`.
- Réutilise : `crates/roomboard-core/src/document.rs:4` `Document` — `apply(Command) -> Result<Change, CommandError>`
  étendu de deux commandes, `element(id)` étendu (cadrage, ligne « Document Yrs et pages », décision « étendre »).
- Réutilise : `yrs::uuid_v4` (`yrs-0.28.1/src/lib.rs:726`) — `uuid_v4()` pour l'id de la forme.
- Réutilise : `yrs::undo::UndoManager` derrière `History` — par `Document::transact_local()` (une transaction
  `"local"` = une étape, D11) ; aucun appel direct.

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T45 && export PATH=$HOME/.cargo/bin:$PATH && cargo test -p roomboard-core 2>&1 | grep -E "^test (shape|commands|query)::tests::(normalize|parse|polygon|transform|add_shape|erase_and_delete_on_shapes|new_errors|hit_test_finds_shape|ids_in_rect_and_bounds_include|hit_test_path_ignores|bounds_follow)|test result" | tail -30`
— attendu : 16 lignes `… ok` (5 `shape::tests`, 7 `commands::tests`, 4 `query::tests`) et chaque `test result: ok.`
(N ≥ 16, noms présents). Tests à garder verts (cadrage § Tests) : `new_document_has_no_page`,
`add_page_increments_count`, `blank_page_is_not_undoable`, `command_without_effect_opens_no_write_transaction`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T45` (créé par l'orchestrateur depuis `feat/socle-lot4`) ; neuf :
  `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background` : un sous-agent n'est pas
  réveillé.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `crates/roomboard-wasm` (T54), `SetText` (T49), le format (`format/`). Ouvrir une transaction
d'écriture avant de savoir que la commande a un effet (D38). Faire agir la gomme sur les formes (D12).

**Terminé quand** les 16 tests nommés passent, `cargo clippy --workspace --all-targets -- -D warnings` est vert,
`scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte : `Réutilisation : appelé Document::apply` (ou
écart), `Réutilisation : appelé yrs::uuid_v4`, `Réutilisation : appelé History par transact_local`.

**Étapes.**

- [ ] **1. Test rouge de `shape.rs`.** Créer `crates/roomboard-core/src/shape.rs` avec seulement les tests et
  ajouter `pub mod shape;` à `lib.rs` (après `pub mod query;`) :

```rust
//! Formes (D13) : géométrie locale. Rectangle et ellipse : boîte (0, 0)-(w, h), w et h ≥ 0, `transform` place le coin
//! haut-gauche. Ligne et flèche : segment (0, 0)-(w, h), `transform` place le départ. Miroir TS exact :
//! `apps/web/src/core/shapes.ts` (joué par le contrat, T54).

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_round_trip() {
        for k in [ShapeKind::Rect, ShapeKind::Ellipse, ShapeKind::Line, ShapeKind::Arrow] {
            assert_eq!(ShapeKind::parse(k.as_str()), Some(k));
        }
        assert_eq!(ShapeKind::parse("triangle"), None);
    }

    #[test]
    fn normalize_rect_takes_min_corner() {
        assert_eq!(normalize(ShapeKind::Rect, 300.0, 200.0, 100.0, 50.0), (100.0, 50.0, 200.0, 150.0));
        assert_eq!(normalize(ShapeKind::Ellipse, 10.0, 10.0, 30.0, 5.0), (10.0, 5.0, 20.0, 5.0));
    }

    #[test]
    fn normalize_line_keeps_direction() {
        assert_eq!(normalize(ShapeKind::Arrow, 300.0, 200.0, 100.0, 50.0), (300.0, 200.0, -200.0, -150.0));
    }

    #[test]
    fn polygon_of_rect_is_widened_by_half_width() {
        assert_eq!(
            shape_polygon(ShapeKind::Rect, 200.0, 100.0, 4.0),
            vec![-2.0, -2.0, 202.0, -2.0, 202.0, 102.0, -2.0, 102.0]
        );
        // demi-épaisseur au moins 1
        assert_eq!(shape_polygon(ShapeKind::Ellipse, 10.0, 10.0, 0.5)[0], -1.0);
        assert_eq!(box_polygon(600.0, 45.0), vec![0.0, 0.0, 600.0, 0.0, 600.0, 45.0, 0.0, 45.0]);
    }

    #[test]
    fn polygon_of_segment_covers_its_ends() {
        let p = shape_polygon(ShapeKind::Line, 100.0, 0.0, 4.0);
        assert_eq!(p, vec![-2.0, 2.0, 102.0, 2.0, 102.0, -2.0, -2.0, -2.0]);
        assert_eq!(shape_polygon(ShapeKind::Line, 0.0, 0.0, 4.0).len(), 8, "segment nul : carré autour du point");
    }
}
```

- [ ] **2. Le voir échouer.** `cd ~/projets/roomboard-wt/socle--T45 && export PATH=$HOME/.cargo/bin:$PATH && cargo test -p roomboard-core shape:: 2>&1 | tail -5`
  — attendu : `error[E0433]` ou `cannot find type ShapeKind`.

- [ ] **3. Écrire `shape.rs`** (au-dessus du module de tests) :

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShapeKind {
    Rect,
    Ellipse,
    Line,
    Arrow,
}

impl ShapeKind {
    pub fn parse(s: &str) -> Option<ShapeKind> {
        Some(match s {
            "rect" => ShapeKind::Rect,
            "ellipse" => ShapeKind::Ellipse,
            "line" => ShapeKind::Line,
            "arrow" => ShapeKind::Arrow,
            _ => return None,
        })
    }

    pub fn as_str(self) -> &'static str {
        match self {
            ShapeKind::Rect => "rect",
            ShapeKind::Ellipse => "ellipse",
            ShapeKind::Line => "line",
            ShapeKind::Arrow => "arrow",
        }
    }

    pub fn is_segment(self) -> bool {
        matches!(self, ShapeKind::Line | ShapeKind::Arrow)
    }
}

/// (tx, ty, w, h) depuis les deux coins du geste (monde).
pub fn normalize(kind: ShapeKind, x0: f64, y0: f64, x1: f64, y1: f64) -> (f64, f64, f64, f64) {
    if kind.is_segment() {
        (x0, y0, x1 - x0, y1 - y0)
    } else {
        (x0.min(x1), y0.min(y1), (x1 - x0).abs(), (y1 - y0).abs())
    }
}

/// Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : toute la surface du rectangle
/// et de l'ellipse (CL4-7), segment épaissi pour la ligne et la flèche.
pub fn shape_polygon(kind: ShapeKind, w: f64, h: f64, width: f32) -> Vec<f32> {
    let half = (f64::from(width) / 2.0).max(1.0);
    let pts: [f64; 8] = if kind.is_segment() {
        let len = w.hypot(h);
        let (ux, uy) = if len > 1e-9 { (w / len, h / len) } else { (1.0, 0.0) };
        let (nx, ny) = (-uy * half, ux * half);
        let (bx, by) = (-ux * half, -uy * half);
        let (ex, ey) = (w + ux * half, h + uy * half);
        [bx + nx, by + ny, ex + nx, ey + ny, ex - nx, ey - ny, bx - nx, by - ny]
    } else {
        [-half, -half, w + half, -half, w + half, h + half, -half, h + half]
    };
    pts.iter().map(|v| *v as f32).collect()
}

/// Boîte locale (0, 0)-(w, h) d'un texte.
pub fn box_polygon(w: f64, h: f64) -> Vec<f32> {
    vec![0.0, 0.0, w as f32, 0.0, w as f32, h as f32, 0.0, h as f32]
}
```

  Vérifier : même commande qu'à l'étape 2 → `test result: ok. 5 passed`. Si `polygon_of_segment_covers_its_ends`
  rend `-0.0` au lieu de `0.0`, c'est égal pour `assert_eq!` sur `f32` : aucune retouche.

- [ ] **4. Tests rouges des commandes.** Dans `crates/roomboard-core/src/commands.rs`, module `tests`, ajouter
  `use crate::element::{ShapeView, IDENTITY};` et `use crate::shape::ShapeKind;` en tête du module, puis :

```rust
    fn rect(page: &str, corners: [f64; 4]) -> Command {
        let [x0, y0, x1, y1] = corners;
        Command::AddShape {
            page: page.into(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: pen(),
            fill: None,
        }
    }

    #[test]
    fn transform_moves_elements_in_one_step() {
        let mut d = Document::blank();
        let (p, [a, b, _]) = three(&mut d);
        let before = d.element(&a).expect("a").transform;
        let c = d
            .apply(Command::Transform {
                ids: vec![b.clone(), a.clone(), a.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 50.0],
            })
            .expect("transform");
        let mut want = vec![a.clone(), b.clone()];
        want.sort();
        assert_eq!(c.ids, want);
        assert_eq!(c.pages, vec![p]);
        assert_eq!(
            d.element(&a).expect("a").transform,
            [1.0, 0.0, 0.0, 1.0, before[4] + 100.0, before[5] + 50.0]
        );
        assert!(d.undo());
        assert_eq!(d.element(&a).expect("a").transform, before);
        assert!(d.can_undo(), "une seule étape défaite : les trois traits restent");
    }

    #[test]
    fn transform_composes_on_the_left() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0)); // [1, 0, 0, 1, 100, 100]
        d.apply(Command::Transform { ids: vec![a.clone()], matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0] })
            .expect("échelle");
        d.apply(Command::Transform { ids: vec![a.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0] })
            .expect("translation");
        assert_eq!(d.element(&a).expect("a").transform, [2.0, 0.0, 0.0, 2.0, 210.0, 200.0]);
    }

    #[test]
    fn transform_rejects_bad_matrix_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        for m in [[f64::NAN, 0.0, 0.0, 1.0, 0.0, 0.0], [0.0; 6], [1.0, 2.0, 2.0, 4.0, 0.0, 0.0]] {
            assert_eq!(
                d.apply(Command::Transform { ids: vec![a.clone()], matrix: m }),
                Err(CommandError::BadMatrix)
            );
        }
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn transform_unknown_ids_or_identity_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        let v = d.version();
        let c = d
            .apply(Command::Transform { ids: vec!["absent".into()], matrix: [1.0, 0.0, 0.0, 1.0, 5.0, 5.0] })
            .expect("inconnu");
        assert!(c.ids.is_empty() && c.pages.is_empty());
        let c = d.apply(Command::Transform { ids: vec![a], matrix: IDENTITY }).expect("identité");
        assert!(c.ids.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn add_shape_rect_normalizes_and_is_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d.apply(rect(&p, [300.0, 200.0, 100.0, 50.0])).expect("rect");
        assert_eq!(c.pages, vec![p.clone()]);
        let e = d.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "shape");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert_eq!(e.style, pen());
        assert_eq!(e.shape, Some(ShapeView { shape: "rect".into(), w: 200.0, h: 150.0, fill: None }));
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn add_shape_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let n = writes(&d);
        assert_eq!(d.apply(rect(&p, [f64::NAN, 0.0, 10.0, 10.0])), Err(CommandError::BadShape));
        let mut thin = rect(&p, [0.0, 0.0, 10.0, 10.0]);
        if let Command::AddShape { style, .. } = &mut thin {
            style.width = 0.0;
        }
        assert_eq!(d.apply(thin), Err(CommandError::BadWidth));
        assert_eq!(
            d.apply(rect("absente", [0.0, 0.0, 10.0, 10.0])),
            Err(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn erase_and_delete_on_shapes() {
        let mut d = Document::blank();
        let p = first(&d);
        let arrow = d
            .apply(Command::AddShape {
                page: p.clone(),
                shape: ShapeKind::Arrow,
                x0: 300.0,
                y0: 200.0,
                x1: 100.0,
                y1: 50.0,
                style: pen(),
                fill: Some("#ff0000".into()),
            })
            .expect("flèche")
            .ids[0]
            .clone();
        let e = d.element(&arrow).expect("flèche");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 300.0, 200.0]);
        assert_eq!(
            e.shape,
            Some(ShapeView { shape: "arrow".into(), w: -200.0, h: -150.0, fill: Some("#ff0000".into()) })
        );
        let id = d.apply(rect(&p, [100.0, 300.0, 300.0, 500.0])).expect("rect").ids[0].clone();
        for mode in [EraseMode::Partial, EraseMode::Object] {
            let c = d
                .apply(Command::Erase { page: p.clone(), path: vec![100.0, 400.0, 300.0, 400.0], radius: 20.0, mode })
                .expect("gomme");
            assert!(c.removed.is_empty(), "la gomme n'agit que sur les traits (D12)");
        }
        assert_eq!(d.apply(Command::Delete { ids: vec![id.clone()] }).expect("suppression").removed, vec![id]);
    }

    #[test]
    fn new_errors_have_readable_messages() {
        assert_eq!(
            CommandError::BadShape.to_string(),
            "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)"
        );
        assert_eq!(CommandError::BadMatrix.to_string(), "matrice invalide (six nombres finis, inversible)");
    }
```

- [ ] **5. Le voir échouer.** `cargo test -p roomboard-core commands:: 2>&1 | tail -5` — attendu : erreurs de
  compilation (`no variant named AddShape`, `ShapeView` introuvable).

- [ ] **6. `element.rs` : vue de forme et composition.** Remplacer la structure `ElementView` et ajouter `ShapeView`
  et `compose` :

```rust
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ShapeView {
    pub shape: String,
    pub w: f64,
    pub h: f64,
    pub fill: Option<String>,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ElementView {
    pub id: String,
    pub kind: String,
    pub transform: Transform,
    pub style: StrokeStyle,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shape: Option<ShapeView>,
}

/// `m ∘ t` : applique `t` puis `m` (Transform du lot 4, CL4-8).
pub fn compose(m: &Transform, t: &Transform) -> Transform {
    [
        m[0] * t[0] + m[2] * t[1],
        m[1] * t[0] + m[3] * t[1],
        m[0] * t[2] + m[2] * t[3],
        m[1] * t[2] + m[3] * t[3],
        m[0] * t[4] + m[2] * t[5] + m[4],
        m[1] * t[4] + m[3] * t[5] + m[5],
    ]
}
```

- [ ] **7. `commands.rs` : variantes, erreurs, lecture d'une forme.** Ajouter aux `use` :
  `use crate::element::{compose, out_f64, IDENTITY, ...}` (garder les noms déjà importés) et
  `use crate::shape::{normalize, ShapeKind};`. Ajouter à `enum Command` :

```rust
    AddShape {
        page: String,
        shape: ShapeKind,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        style: StrokeStyle,
        fill: Option<String>,
    },
    Transform {
        ids: Vec<String>,
        matrix: Transform,
    },
```

  À `enum CommandError` : `BadShape,` et `BadMatrix,` ; au `Display` :

```rust
            CommandError::BadShape => write!(
                f,
                "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)"
            ),
            CommandError::BadMatrix => {
                write!(f, "matrice invalide (six nombres finis, inversible)")
            }
```

  Après `read_stroke`, ajouter :

```rust
/// Champs d'une forme (D13) ; `None` si l'élément n'en est pas une.
pub(crate) struct ShapeFields {
    pub kind: ShapeKind,
    pub w: f64,
    pub h: f64,
    pub style: StrokeStyle,
    pub fill: Option<String>,
}

pub(crate) fn read_shape<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<ShapeFields> {
    if out_string(e.get(txn, "kind"))? != "shape" {
        return None;
    }
    Some(ShapeFields {
        kind: ShapeKind::parse(&out_string(e.get(txn, "shape"))?)?,
        w: out_f64(e.get(txn, "w"))?,
        h: out_f64(e.get(txn, "h"))?,
        style: read_style(txn, e)?,
        fill: out_string(e.get(txn, "fill")),
    })
}
```

  `out_f64` est `pub(crate)` dans `element.rs` : l'importer. Dans `apply`, ajouter les deux bras :

```rust
            Command::AddShape {
                page,
                shape,
                x0,
                y0,
                x1,
                y1,
                style,
                fill,
            } => self.cmd_add_shape(&page, shape, [x0, y0, x1, y1], &style, fill.as_deref()),
            Command::Transform { ids, matrix } => self.cmd_transform(&ids, &matrix),
```

  et, dans `impl Document`, les deux méthodes (plan sous lecture, puis une seule écriture, comme `cmd_erase`) :

```rust
    fn cmd_add_shape(
        &mut self,
        page: &str,
        kind: ShapeKind,
        corners: [f64; 4],
        style: &StrokeStyle,
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if corners.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadShape);
        }
        if !positive(style.width) {
            return Err(CommandError::BadWidth);
        }
        let elements = {
            let txn = self.read();
            self.page_elements(&txn, page)
        }
        .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let [x0, y0, x1, y1] = corners;
        let (tx, ty, w, h) = normalize(kind, x0, y0, x1, y1);
        let id = yrs::uuid_v4().to_string();
        let mut fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from("shape")),
            ("shape", In::from(kind.as_str())),
            ("transform", In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, tx, ty]))),
            ("color", In::from(style.color.as_str())),
            ("width", In::Any(Any::from(f64::from(style.width)))),
            ("w", In::Any(Any::from(w))),
            ("h", In::Any(Any::from(h))),
        ];
        if let Some(f) = fill {
            fields.push(("fill", In::from(f)));
        }
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// Compose `m` à gauche de la transformation de chaque élément trouvé (CL4-8) ; ids inconnus ignorés ; rien trouvé
    /// ou identité : aucune transaction (D38).
    fn cmd_transform(&mut self, ids: &[String], m: &Transform) -> Result<Change, CommandError> {
        if m.iter().any(|v| !v.is_finite()) || invert(m).is_none() {
            return Err(CommandError::BadMatrix);
        }
        let unique: BTreeSet<&String> = ids.iter().collect();
        let targets: Vec<(MapRef, Transform, String, String)> = {
            let txn = self.read();
            unique
                .into_iter()
                .filter_map(|id| {
                    let f = self.find_element(&txn, id)?;
                    let t = out_transform(f.element.get(&txn, "transform"))?;
                    Some((f.element, t, f.page_id, id.clone()))
                })
                .collect()
        };
        if targets.is_empty() || *m == IDENTITY {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (e, t, _, _) in &targets {
                e.insert(&mut txn, "transform", transform_to_any(&compose(m, t)));
            }
        }
        let mut pages: Vec<String> = targets.iter().map(|t| t.2.clone()).collect();
        pages.sort();
        pages.dedup();
        let ids = targets.into_iter().map(|t| t.3).collect();
        Ok(self.done(Change {
            pages,
            ids,
            ..Default::default()
        }))
    }
```

  Retirer le `#[allow(dead_code)]` de `transform_to_any` et de `out_bytes` dans `element.rs` s'ils deviennent
  inutiles (clippy le dira).

- [ ] **8. `document.rs` : `element()` par type.** Ajouter `use crate::commands::read_shape;` et `ShapeView` aux
  imports de `element`, puis remplacer `pub fn element` :

```rust
    pub fn element(&self, id: &str) -> Option<ElementView> {
        let txn = self.doc.transact();
        let found = self.find_element(&txn, id)?;
        let e = &found.element;
        let kind = out_string(e.get(&txn, "kind"))?;
        let transform = out_transform(e.get(&txn, "transform"))?;
        let (style, shape) = if kind == "shape" {
            let s = read_shape(&txn, e)?;
            let view = ShapeView {
                shape: s.kind.as_str().to_string(),
                w: s.w,
                h: s.h,
                fill: s.fill,
            };
            (s.style, Some(view))
        } else {
            (read_style(&txn, e)?, None)
        };
        Some(ElementView {
            id: id.to_string(),
            kind,
            transform,
            style,
            shape,
        })
    }
```

- [ ] **9. Vérifier les commandes.** `cargo test -p roomboard-core commands:: 2>&1 | tail -5` →
  `test result: ok.` ; les 7 noms neufs présents dans `cargo test -p roomboard-core commands:: 2>&1 | grep -c "ok$"`.

- [ ] **10. Tests rouges des lectures.** Dans `query.rs`, module `tests`, ajouter `use crate::shape::ShapeKind;` et :

```rust
    fn rect_at(d: &mut Document, p: &str, c: [f64; 4]) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0: c[0],
            y0: c[1],
            x1: c[2],
            y1: c[3],
            style: pen(),
            fill: None,
        })
        .expect("rect")
        .ids[0]
            .clone()
    }

    #[test]
    fn hit_test_finds_shape_interior() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert_eq!(d.hit_test(&p, 700.0, 650.0, 1.0), Some(id), "intérieur sans remplissage (CL4-7)");
        assert_eq!(d.hit_test(&p, 900.0, 650.0, 1.0), None);
    }

    #[test]
    fn ids_in_rect_and_bounds_include_shapes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert_eq!(
            d.bounds(std::slice::from_ref(&id)),
            Some(Bounds { x0: 598.0, y0: 598.0, x1: 802.0, y1: 702.0 })
        );
        assert_eq!(
            d.ids_in_rect(&p, Bounds { x0: 590.0, y0: 590.0, x1: 810.0, y1: 710.0 }),
            vec![id]
        );
        assert!(d
            .ids_in_rect(&p, Bounds { x0: 600.0, y0: 600.0, x1: 810.0, y1: 710.0 })
            .is_empty());
    }

    #[test]
    fn hit_test_path_ignores_shapes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert!(d.hit_test_path(&p, &[600.0, 650.0, 800.0, 650.0], 10.0).is_empty());
    }

    #[test]
    fn bounds_follow_transform() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        d.apply(Command::Transform { ids: vec![id.clone()], matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0] })
            .expect("échelle");
        assert_eq!(
            d.bounds(&[id]),
            Some(Bounds { x0: 1196.0, y0: 1196.0, x1: 1604.0, y1: 1404.0 })
        );
    }
```

- [ ] **11. Le voir échouer.** `cargo test -p roomboard-core query:: 2>&1 | tail -8` — attendu :
  `hit_test_finds_shape_interior … FAILED` (formes invisibles des lectures).

- [ ] **12. `query.rs` : géométrie de tout élément.** Remplacer `struct StrokeGeom` et `stroke_geoms` par :

```rust
struct Geom {
    id: String,
    transform: Transform,
    outline: Rc<[f32]>,
}
```

  et, dans `impl Document` :

```rust
    /// Géométrie locale d'un élément pour la collision et les bornes : contour en cache (trait), polygone (forme).
    fn element_geom<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Geom> {
        let id = out_string(e.get(txn, "id")).unwrap_or_default();
        if let Some((transform, style, pts)) = read_stroke(txn, e) {
            let outline = self.cached_outline(&id, &style, &pts);
            return Some(Geom { id, transform, outline });
        }
        let transform = out_transform(e.get(txn, "transform"))?;
        let s = read_shape(txn, e)?;
        Some(Geom {
            id,
            transform,
            outline: shape_polygon(s.kind, s.w, s.h, s.style.width).into(),
        })
    }

    /// Éléments de la page, du dessous vers le dessus ; `strokes_only` : traits seuls (gomme, D12).
    fn geoms(&self, page: &str, strokes_only: bool) -> Vec<Geom> {
        let txn = self.read();
        let Some(elements) = self.page_elements(&txn, page) else {
            return Vec::new();
        };
        elements
            .iter(&txn)
            .filter_map(|o| match o {
                Out::YMap(e) => Some(e),
                _ => None,
            })
            .filter(|e| !strokes_only || out_string(e.get(&txn, "kind")).as_deref() == Some("stroke"))
            .filter_map(|e| self.element_geom(&txn, &e))
            .collect()
    }
```

  Dans `hit_test` et `ids_in_rect` : `self.stroke_geoms(page)` → `self.geoms(page, false)` ; dans `hit_test_path` :
  → `self.geoms(page, true)`. Remplacer le corps de `bounds` :

```rust
    pub fn bounds(&self, ids: &[String]) -> Option<Bounds> {
        let txn = self.read();
        let mut acc: Option<Bounds> = None;
        for id in ids {
            let Some(found) = self.find_element(&txn, id) else {
                continue;
            };
            let Some(g) = self.element_geom(&txn, &found.element) else {
                continue;
            };
            if let Some(b) = world_bounds(&g.transform, &g.outline) {
                acc = Some(match acc {
                    Some(a) => a.union(b),
                    None => b,
                });
            }
        }
        acc
    }
```

  Imports : `use yrs::{Array, Map, MapRef, Out, ReadTxn};`, `use crate::commands::{read_shape, read_stroke, world_to_local_path};`,
  `use crate::element::{apply_transform, invert, out_string, out_transform, Transform};`,
  `use crate::shape::shape_polygon;`.

- [ ] **13. Vérifier la tâche.** La commande bornée de la section → 16 noms `ok`, tous les `test result: ok.` ;
  puis `cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5` (aucun `error`) et
  `cd ~/projets/roomboard-wt/socle--T45 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **14. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T45
git add crates/roomboard-core/src/shape.rs crates/roomboard-core/src/lib.rs crates/roomboard-core/src/element.rs crates/roomboard-core/src/commands.rs crates/roomboard-core/src/query.rs crates/roomboard-core/src/document.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): add Transform and AddShape commands, shape reads (T45)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t46"></a>
### Tâche T46 — Contrat TS, fausse liaison et calque d'édition

**Objectif.** Le contrat `api.ts` porte les trois commandes du lot et l'élément en union (`stroke`, `shape`,
`text`) ; la fausse liaison les joue avec la même sémantique que le cœur (matrice composée à gauche, coins normalisés,
texte créé, remplacé, retiré, inchangé = aucune étape) ; les types du calque d'édition et du contrat des outils sont
posés pour les tâches de la vague 2. La vraie liaison lève « commande non liée » jusqu'à T54.

**Fichiers.**
- Créer : `apps/web/src/core/shapes.ts`, `apps/web/src/core/shapes.test.ts`,
  `apps/web/src/engine/render/overlay.ts`, `apps/web/src/engine/render/overlay.test.ts`
- Modifier : `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`,
  `apps/web/src/core/wasm-core.ts`, `apps/web/src/engine/tools/tool.ts`

**Interfaces.**
- Consomme : `CoreDocument`, `Command`, `Change`, `Matrix`, `Bounds`, `StrokeStyle` (`api.ts`, figés au lot 2).
- Produit (`api.ts`) : `type ShapeKind = "rect" | "ellipse" | "line" | "arrow"` ;
  `type ElementKind = "stroke" | "shape" | "text"` ; `interface ShapeData { shape: ShapeKind; w: number; h: number; fill: string | null }` ;
  `interface TextData { content: string; size: number; boxWidth: number; boxHeight: number }` ;
  `StrokeElement`, `ShapeElement` (`shape: ShapeData`), `TextElement` (`text: TextData`), `type ElementView = StrokeElement | ShapeElement | TextElement`
  (champs communs `id`, `transform: Matrix`, `style: StrokeStyle` ; texte : `style.width = 0`) ; commandes
  `AddShape { page, shape, x0, y0, x1, y1, style, fill: string | null }`,
  `SetText { page, id: string | null, x, y, content, color, size, boxWidth, boxHeight }`,
  `Transform { ids: readonly string[], matrix: Matrix }`.
- Produit (`core/shapes.ts`) : `SHAPE_KINDS`, `isShapeKind(s: string): s is ShapeKind`, `isSegment(k)`,
  `interface ShapeGeometry { tx; ty; w; h }`, `normalizeShape(kind, x0, y0, x1, y1): ShapeGeometry`,
  `shapePolygon(kind, w, h, width): number[]`, `boxPolygon(w, h): number[]`, `applyMatrix(m, x, y): [number, number]`,
  `composeMatrix(m, t): Matrix` (`m ∘ t`), `IDENTITY_MATRIX`.
- Produit (`engine/render/overlay.ts`) : `GhostView { id; matrix }`, `ShapePreview { shape; x0; y0; x1; y1; style; fill }`,
  `EditOverlay { ghosts; shapes; frame: Bounds | null; handles: boolean; band: Bounds | null }`, `EMPTY_OVERLAY`,
  `mergeOverlays(parts: readonly (EditOverlay | undefined)[]): EditOverlay`, `overlayKey(o): string`,
  `isEmptyOverlay(o): boolean`.
- Produit (`engine/tools/tool.ts`) : `ToolContext.shift?(): boolean` ; `LivePart.overlay?: EditOverlay` ;
  `type LeaveReason = "tool" | "page"` ; `GestureTool.leave?(reason: LeaveReason): void` ;
  `interface SelectionTool extends GestureTool { selection(): readonly string[]; setSelection(ids: readonly string[]): void; prune(): void }`.
- Messages d'erreur (identiques au cœur, T45 et T49) : `forme invalide (rect, ellipse, line ou arrow, coins finis attendus)`,
  `matrice invalide (six nombres finis, inversible)`, `texte invalide (taille et boîte finies > 0 attendues)`,
  `élément inconnu : <id>`, `épaisseur de trait invalide (nombre fini > 0 attendu)`.
- Réutilise : `apps/web/src/core/fake-core.ts` — `fakeCore: CoreFactory` étendu (même fabrique, même `step`, même
  écart de gomme partielle déclaré en tête).
- Réutilise : `apps/web/src/core/wasm-core.ts` — `toElementView` étendu à l'union (mêmes contrôles de forme).

**Patron à ne pas reprendre.** La fausse liaison range un trait par sa translation seule (`x0`, `y0` :
`apps/web/src/core/fake-core.ts:11` et `:94-104`) et calcule collision et bornes sur ces seuls décalages
(`:41-56`, `:147-178`). Avec `Transform`, une matrice complète s'applique : garder `x0`/`y0` à côté d'une matrice ferait
deux vérités. Chaque élément porte **sa matrice** et toute lecture passe par `applyMatrix`. Chemin de référence de la
sémantique : `crates/roomboard-core/src/query.rs:104-158` (lectures en coordonnées monde par la transformation) et
`crates/roomboard-core/src/commands.rs:337-375` (`cmd_delete` : ids uniques, pages triées, rien trouvé = aucune étape).

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T46 && pnpm --filter @roomboard/web exec vitest run src/core/shapes.test.ts src/engine/render/overlay.test.ts src/core/fake-core.test.ts 2>&1 | tail -15`
— attendu : `Test Files  3 passed`, `Tests  N passed` avec N ≥ (tests existants de `fake-core.test.ts`) + 17, aucun
`skipped`. Noms attendus dans `… --reporter=verbose 2>&1 | grep -E "Transform compose à gauche|SetText crée, remplace, retire|normalizeShape"`.
Tests à garder verts : `wasm-core.contract.test.ts` (le contrat commun joue la fausse liaison : `pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -6`).

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T46` (créé par l'orchestrateur depuis `feat/socle-lot4`) ; neuf :
  `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `crates/` (T45, T49, T54), le contrat commun `wasm-core.contract.test.ts` (T54), le moteur ou
le rendu au-delà de `overlay.ts` et `tool.ts`. Changer l'écart déclaré de la gomme partielle. Garder `x0`/`y0` à côté
de la matrice.

**Terminé quand** la commande bornée est verte avec les 17 tests neufs nommés, `pnpm --filter @roomboard/web build`
passe (`tsc --noEmit` sans erreur), `scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte
`Réutilisation : appelé fakeCore (étendu)` et `Réutilisation : appelé toElementView (étendu)`.

**Étapes.**

- [ ] **1. Test rouge de `core/shapes.ts`.** Créer `apps/web/src/core/shapes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { applyMatrix, boxPolygon, composeMatrix, isShapeKind, normalizeShape, shapePolygon } from "./shapes";

describe("shapes (miroir de shape.rs)", () => {
  it("normalizeShape : rectangle et ellipse au coin haut-gauche, tailles positives", () => {
    expect(normalizeShape("rect", 300, 200, 100, 50)).toEqual({ tx: 100, ty: 50, w: 200, h: 150 });
    expect(normalizeShape("ellipse", 10, 10, 30, 5)).toEqual({ tx: 10, ty: 5, w: 20, h: 5 });
  });

  it("normalizeShape : ligne et flèche gardent le départ et le sens", () => {
    expect(normalizeShape("arrow", 300, 200, 100, 50)).toEqual({ tx: 300, ty: 200, w: -200, h: -150 });
  });

  it("shapePolygon : boîte élargie de la demi-épaisseur, au moins 1", () => {
    expect(shapePolygon("rect", 200, 100, 4)).toEqual([-2, -2, 202, -2, 202, 102, -2, 102]);
    expect(shapePolygon("ellipse", 10, 10, 0.5)[0]).toBe(-1);
    expect(boxPolygon(600, 45)).toEqual([0, 0, 600, 0, 600, 45, 0, 45]);
  });

  it("shapePolygon : segment épaissi qui couvre ses bouts", () => {
    expect(shapePolygon("line", 100, 0, 4).map((v) => v + 0)).toEqual([-2, 2, 102, 2, 102, -2, -2, -2]);
    expect(shapePolygon("line", 0, 0, 4)).toHaveLength(8);
  });

  it("composeMatrix(m, t) applique t puis m", () => {
    const t = [1, 0, 0, 1, 100, 100] as const;
    const m = [2, 0, 0, 2, 0, 0] as const;
    expect(composeMatrix([1, 0, 0, 1, 10, 0], composeMatrix(m, t))).toEqual([2, 0, 0, 2, 210, 200]);
    expect(applyMatrix([2, 0, 0, 2, 10, 0], 3, 4)).toEqual([16, 8]);
  });

  it("isShapeKind : les quatre noms seulement", () => {
    expect(["rect", "ellipse", "line", "arrow", "triangle"].map(isShapeKind)).toEqual([true, true, true, true, false]);
  });
});
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/core/shapes.test.ts 2>&1 | tail -5`
  — attendu : `Failed to resolve import "./shapes"`.

- [ ] **3. `api.ts`.** Remplacer la ligne 5 du commentaire de tête par :

```ts
// Change.full = true : tout invalider (annuler, rétablir). Lot 4 : AddShape, SetText, Transform ; éléments shape et text.
// Forme : rect / ellipse = boîte locale (0, 0)-(w, h), w, h ≥ 0 ; line / arrow = segment (0, 0)-(w, h) (core/shapes.ts).
// Texte : boîte locale (0, 0)-(boxWidth, boxHeight) ; style.color = couleur du texte, style.width = 0.
```

  Remplacer `export type ElementKind = "stroke";` par :

```ts
export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export type ElementKind = "stroke" | "shape" | "text";
```

  Ajouter trois membres à l'union `Command` (après `Delete`) :

```ts
  | {
      readonly type: "AddShape";
      readonly page: string;
      readonly shape: ShapeKind;
      readonly x0: number;
      readonly y0: number;
      readonly x1: number;
      readonly y1: number;
      readonly style: StrokeStyle;
      readonly fill: string | null;
    }
  | {
      readonly type: "SetText";
      readonly page: string;
      /** null : nouvelle boîte en (x, y) ; sinon le texte à remplacer (x, y ignorés). Contenu vide : rien ou retrait. */
      readonly id: string | null;
      readonly x: number;
      readonly y: number;
      readonly content: string;
      readonly color: string;
      readonly size: number;
      readonly boxWidth: number;
      readonly boxHeight: number;
    }
  | { readonly type: "Transform"; readonly ids: readonly string[]; readonly matrix: Matrix };
```

  Remplacer `interface ElementView` par :

```ts
export interface ShapeData { readonly shape: ShapeKind; readonly w: number; readonly h: number; readonly fill: string | null }
export interface TextData { readonly content: string; readonly size: number; readonly boxWidth: number; readonly boxHeight: number }

interface ElementBase {
  readonly id: string;
  readonly transform: Matrix;
  readonly style: StrokeStyle;
}
export interface StrokeElement extends ElementBase { readonly kind: "stroke" }
export interface ShapeElement extends ElementBase { readonly kind: "shape"; readonly shape: ShapeData }
export interface TextElement extends ElementBase { readonly kind: "text"; readonly text: TextData }
export type ElementView = StrokeElement | ShapeElement | TextElement;
```

- [ ] **4. Écrire `core/shapes.ts`.**

```ts
/** Miroir TS de `crates/roomboard-core/src/shape.rs` (D13) : mêmes coins, mêmes polygones ; joué par le contrat (T54). */
import type { Matrix, ShapeKind } from "./api";

export const SHAPE_KINDS: readonly ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
export const isShapeKind = (s: string): s is ShapeKind => (SHAPE_KINDS as readonly string[]).includes(s);
export const isSegment = (k: ShapeKind): boolean => k === "line" || k === "arrow";
export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

export interface ShapeGeometry {
  readonly tx: number;
  readonly ty: number;
  readonly w: number;
  readonly h: number;
}

export function normalizeShape(kind: ShapeKind, x0: number, y0: number, x1: number, y1: number): ShapeGeometry {
  if (isSegment(kind)) return { tx: x0, ty: y0, w: x1 - x0, h: y1 - y0 };
  return { tx: Math.min(x0, x1), ty: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

/** Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : `shape_polygon` du cœur. */
export function shapePolygon(kind: ShapeKind, w: number, h: number, width: number): number[] {
  const half = Math.max(width / 2, 1);
  if (!isSegment(kind)) return [-half, -half, w + half, -half, w + half, h + half, -half, h + half];
  const len = Math.hypot(w, h);
  const ux = len > 1e-9 ? w / len : 1;
  const uy = len > 1e-9 ? h / len : 0;
  const nx = -uy * half;
  const ny = ux * half;
  const bx = -ux * half;
  const by = -uy * half;
  const ex = w + ux * half;
  const ey = h + uy * half;
  return [bx + nx, by + ny, ex + nx, ey + ny, ex - nx, ey - ny, bx - nx, by - ny];
}

export const boxPolygon = (w: number, h: number): number[] => [0, 0, w, 0, w, h, 0, h];

export function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** `m ∘ t` : applique `t` puis `m` (`element::compose` du cœur). */
export function composeMatrix(m: Matrix, t: Matrix): Matrix {
  return [
    m[0] * t[0] + m[2] * t[1],
    m[1] * t[0] + m[3] * t[1],
    m[0] * t[2] + m[2] * t[3],
    m[1] * t[2] + m[3] * t[3],
    m[0] * t[4] + m[2] * t[5] + m[4],
    m[1] * t[4] + m[3] * t[5] + m[5],
  ];
}
```

  Vérifier : commande de l'étape 2 → `Tests  6 passed`.

- [ ] **5. Test rouge du calque.** Créer `apps/web/src/engine/render/overlay.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_OVERLAY, isEmptyOverlay, mergeOverlays, overlayKey } from "./overlay";

describe("calque d'édition", () => {
  it("mergeOverlays : rien → EMPTY_OVERLAY ; un seul → lui-même", () => {
    expect(mergeOverlays([undefined, undefined])).toBe(EMPTY_OVERLAY);
    const one = { ...EMPTY_OVERLAY, handles: true, frame: { x0: 0, y0: 0, x1: 1, y1: 1 } };
    expect(mergeOverlays([undefined, one])).toBe(one);
  });

  it("mergeOverlays : fantômes et formes concaténés, premier cadre et premier rectangle gardés", () => {
    const style = { color: "#000000", width: 4 };
    const a = { ...EMPTY_OVERLAY, ghosts: [{ id: "a", matrix: [1, 0, 0, 1, 5, 0] as const }] };
    const b = {
      ...EMPTY_OVERLAY,
      shapes: [{ shape: "rect" as const, x0: 0, y0: 0, x1: 10, y1: 10, style, fill: null }],
      band: { x0: 1, y0: 1, x1: 2, y1: 2 },
    };
    const m = mergeOverlays([a, b]);
    expect(m.ghosts.map((g) => g.id)).toEqual(["a"]);
    expect(m.shapes).toHaveLength(1);
    expect(m.band).toEqual({ x0: 1, y0: 1, x1: 2, y1: 2 });
    expect(m.frame).toBeNull();
  });

  it("overlayKey change quand le calque change ; isEmptyOverlay", () => {
    expect(overlayKey(EMPTY_OVERLAY)).toBe(overlayKey({ ...EMPTY_OVERLAY }));
    expect(overlayKey({ ...EMPTY_OVERLAY, handles: true })).not.toBe(overlayKey(EMPTY_OVERLAY));
    expect(isEmptyOverlay(EMPTY_OVERLAY)).toBe(true);
    expect(isEmptyOverlay({ ...EMPTY_OVERLAY, band: { x0: 0, y0: 0, x1: 1, y1: 1 } })).toBe(false);
  });
});
```

- [ ] **6. Écrire `engine/render/overlay.ts`.**

```ts
/** Calque d'édition (lot 4, CL4-1) : aperçus des outils d'édition, peints sur la scène après les éléments. */
import type { Bounds, Matrix, ShapeKind, StrokeStyle } from "../../core/api";

/** Élément masqué de la scène et redessiné avec une matrice provisoire posée avant la sienne (D38). */
export interface GhostView {
  readonly id: string;
  readonly matrix: Matrix;
}

/** Forme en cours, par ses deux coins monde (normalisée au rendu comme par le cœur). */
export interface ShapePreview {
  readonly shape: ShapeKind;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly style: StrokeStyle;
  readonly fill: string | null;
}

export interface EditOverlay {
  readonly ghosts: readonly GhostView[];
  readonly shapes: readonly ShapePreview[];
  /** Cadre de la sélection (monde), ou null. */
  readonly frame: Bounds | null;
  /** Poignées dessinées sur le cadre. */
  readonly handles: boolean;
  /** Rectangle de sélection en cours (monde), ou null. */
  readonly band: Bounds | null;
}

export const EMPTY_OVERLAY: EditOverlay = { ghosts: [], shapes: [], frame: null, handles: false, band: null };

export function mergeOverlays(parts: readonly (EditOverlay | undefined)[]): EditOverlay {
  const present = parts.filter((p): p is EditOverlay => p !== undefined);
  if (present.length === 0) return EMPTY_OVERLAY;
  if (present.length === 1) return present[0] ?? EMPTY_OVERLAY;
  return {
    ghosts: present.flatMap((p) => p.ghosts),
    shapes: present.flatMap((p) => p.shapes),
    frame: present.find((p) => p.frame !== null)?.frame ?? null,
    handles: present.some((p) => p.handles),
    band: present.find((p) => p.band !== null)?.band ?? null,
  };
}

/** Clé de comparaison : le moteur redessine la scène quand elle change (petit objet, une fois par image). */
export const overlayKey = (o: EditOverlay): string => JSON.stringify(o);

export const isEmptyOverlay = (o: EditOverlay): boolean =>
  o.ghosts.length === 0 && o.shapes.length === 0 && o.frame === null && o.band === null;
```

- [ ] **7. `engine/tools/tool.ts`.** Remplacer le fichier par :

```ts
/** Contrat des outils de geste (stylo, gomme ; sélection, formes, texte au lot 4) : aperçu sans écriture, une écriture au relâché (D38). */
import type { Change, Command, CoreDocument } from "../../core/api";
import type { Camera } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import type { EditOverlay } from "../render/overlay";
import type { LiveLayer } from "../render/renderer";

/** Ce qu'un outil voit du moteur. `run` ne lève jamais : null si le cœur refuse (message dans l'état du moteur). */
export interface ToolContext {
  readonly doc: CoreDocument;
  page(): string;
  camera(): Camera;
  run(cmd: Command): Change | null;
  /** Maj tenue (CL4-12) ; absent = jamais tenue. */
  shift?(): boolean;
}

/** Aperçu d'un outil : couche vive, éléments masqués de la scène, calque d'édition (CL4-1). */
export interface LivePart extends LiveLayer {
  readonly hidden: ReadonlySet<string>;
  readonly overlay?: EditOverlay;
}

/** Pourquoi le moteur fait quitter un outil. */
export type LeaveReason = "tool" | "page";

export interface GestureTool {
  begin(pointerId: number, samples: readonly InputSample[]): void;
  extend(pointerId: number, samples: readonly InputSample[], predicted: readonly InputSample[]): void;
  /** Une fois par image : pousse les points en attente, met l'aperçu à jour. */
  frame(): void;
  close(pointerId: number, how: CloseReason): void;
  live(): LivePart;
  active(): boolean;
  /** Outil quitté ou page changée : valide ou abandonne ce qui reste ouvert (texte : valide ; sélection : vide). */
  leave?(reason: LeaveReason): void;
}

/** Outil Sélection (D15) : la sélection survit aux gestes ; le moteur la lit (Suppr, état) et la vide. */
export interface SelectionTool extends GestureTool {
  selection(): readonly string[];
  setSelection(ids: readonly string[]): void;
  /** Retire les ids absents de la page montrée (après annuler, rétablir, suppression). */
  prune(): void;
}

export const NO_LIVE: LivePart = { strokes: [], erasers: [], hidden: new Set<string>() };
```

- [ ] **8. Tests rouges de la fausse liaison.** Ajouter à `apps/web/src/core/fake-core.test.ts` (imports `describe`,
  `expect`, `it` de vitest et `fakeCore` déjà présents ; sinon les ajouter) :

```ts
describe("fakeCore — lot 4 (formes, texte, Transform)", () => {
  const pen = { color: "#000000", width: 4 };
  const setup = () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const rect = (x0: number, y0: number, x1: number, y1: number): string =>
      d.apply({ type: "AddShape", page: p, shape: "rect", x0, y0, x1, y1, style: pen, fill: null }).ids[0] ?? "";
    const text = (content: string, id: string | null = null) =>
      d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
    const errorOf = (f: () => unknown): string => {
      try {
        f();
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
      return "aucune erreur";
    };
    return { d, p, rect, text, errorOf };
  };

  it("AddShape normalise les coins et s'annule en une étape", () => {
    const { d, p, rect } = setup();
    const id = rect(300, 200, 100, 50);
    expect(d.element(id)).toEqual({
      id,
      kind: "shape",
      transform: [1, 0, 0, 1, 100, 50],
      style: pen,
      shape: { shape: "rect", w: 200, h: 150, fill: null },
    });
    d.undo();
    expect(d.elementIds(p)).toEqual([]);
  });

  it("AddShape refuse des coins non finis et une épaisseur nulle, sans étape", () => {
    const { d, p, errorOf } = setup();
    expect(errorOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: Number.NaN, y0: 0, x1: 1, y1: 1, style: pen, fill: null })))
      .toBe("forme invalide (rect, ellipse, line ou arrow, coins finis attendus)");
    expect(errorOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: 0, y0: 0, x1: 1, y1: 1, style: { color: "#000000", width: 0 }, fill: null })))
      .toBe("épaisseur de trait invalide (nombre fini > 0 attendu)");
    expect(d.canUndo()).toBe(false);
  });

  it("SetText crée, remplace, retire ; inchangé = aucune étape", () => {
    const { d, p, text } = setup();
    expect(text("").ids).toEqual([]);
    const id = text("Bonjour").ids[0] ?? "";
    expect(d.element(id)).toEqual({
      id,
      kind: "text",
      transform: [1, 0, 0, 1, 100, 200],
      style: { color: "#000000", width: 0 },
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 },
    });
    const v = d.version();
    expect(text("Bonjour", id).version).toBe(v);
    expect(text("Bonsoir", id).ids).toEqual([id]);
    expect(d.element(id)?.kind === "text" && d.element(id)).toMatchObject({ text: { content: "Bonsoir" } });
    expect(text("", id).removed).toEqual([id]);
    expect(d.elementIds(p)).toEqual([]);
    d.undo();
    d.undo();
    expect(d.element(id)).toMatchObject({ text: { content: "Bonjour" } });
  });

  it("SetText : élément inconnu, texte invalide", () => {
    const { d, text, errorOf } = setup();
    expect(errorOf(() => text("x", "absent"))).toBe("élément inconnu : absent");
    const p = d.pageIds()[0] ?? "";
    expect(errorOf(() => d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "x", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45 })))
      .toBe("texte invalide (taille et boîte finies > 0 attendues)");
  });

  it("Transform compose à gauche et ignore les ids inconnus", () => {
    const { d, p, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    const c = d.apply({ type: "Transform", ids: [b, "absent", a, a], matrix: [2, 0, 0, 2, 0, 0] });
    expect(c.ids).toEqual([a, b].sort());
    expect(c.pages).toEqual([p]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 210, 200]);
    const v = d.version();
    expect(d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 0, 0] }).version).toBe(v);
    expect(d.apply({ type: "Transform", ids: ["absent"], matrix: [1, 0, 0, 1, 5, 5] }).ids).toEqual([]);
    d.undo();
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 200, 200]);
  });

  it("Transform refuse une matrice non inversible ou non finie", () => {
    const { d, rect, errorOf } = setup();
    const a = rect(100, 100, 200, 200);
    for (const matrix of [[0, 0, 0, 0, 0, 0], [1, 2, 2, 4, 0, 0], [Number.NaN, 0, 0, 1, 0, 0]] as const) {
      expect(errorOf(() => d.apply({ type: "Transform", ids: [a], matrix }))).toBe("matrice invalide (six nombres finis, inversible)");
    }
  });

  it("formes et textes : hitTest sur la surface, idsInRect et bounds ; hitTestPath et Erase les ignorent", () => {
    const { d, p, rect, text } = setup();
    const r = rect(600, 600, 800, 700);
    const t = text("Bonjour").ids[0] ?? "";
    expect(d.hitTest(p, 700, 650, 1)).toBe(r);
    expect(d.hitTest(p, 300, 220, 1)).toBe(t);
    expect(d.hitTest(p, 900, 650, 1)).toBeNull();
    expect(d.bounds([r])).toEqual({ x0: 598, y0: 598, x1: 802, y1: 702 });
    expect(d.bounds([t])).toEqual({ x0: 100, y0: 200, x1: 700, y1: 245 });
    expect(d.idsInRect(p, { x0: 590, y0: 590, x1: 810, y1: 710 })).toEqual([r]);
    expect(d.hitTestPath(p, new Float32Array([600, 650, 800, 650]), 10)).toEqual([]);
    expect(d.apply({ type: "Erase", page: p, path: new Float32Array([600, 650, 800, 650]), radius: 10, mode: "object" }).removed).toEqual([]);
  });

  it("save puis load garde formes, textes et matrices", () => {
    const { d, p, rect, text } = setup();
    const r = rect(100, 100, 200, 200);
    const t = text("Bonjour").ids[0] ?? "";
    d.apply({ type: "Transform", ids: [r], matrix: [1, 0, 0, 1, 50, 0] });
    const e = fakeCore.load(d.save("2026-11-19T21:00:00Z", "0.1.0"));
    expect(e.elementIds(p)).toEqual([r, t]);
    expect(e.element(r)).toEqual(d.element(r));
    expect(e.element(t)).toEqual(d.element(t));
  });
});
```

- [ ] **9. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts 2>&1 | tail -8`
  — attendu : les 8 tests neufs `FAIL` (commande inconnue de la fausse liaison).

- [ ] **10. Réécrire `fake-core.ts`** (le contrat commun et les tests existants doivent rester verts) :

```ts
// Fausse liaison en TS pur (D36) : même contrat que le vrai module, géométrie grossière, pour les tests du moteur.
// Contrat commun joué sur les deux fabriques : `wasm-core.contract.test.ts` (`describe.each`).
//
// Écart assumé, exclu du contrat commun : la gomme partielle (`Erase`, `mode: "partial"`) ne coupe pas. Elle retire
// en entier chaque trait touché (comme la gomme d'objet) et rend `ids: []`, là où le cœur remplace le trait par ses
// morceaux restants (`ids` = les morceaux, `removed` = le trait coupé). Le test de « touché » d'un trait est lui aussi
// grossier : distance des seuls points du trait au chemin, sans contour ni pression.
// Lot 4 : chaque élément porte sa matrice (`Transform` la compose à gauche, comme le cœur) ; formes et textes suivent
// les polygones de `shapes.ts` (miroir de `shape.rs`) : même collision et mêmes bornes que le cœur.
import type {
  Bounds,
  Change,
  Command,
  CoreDocument,
  CoreFactory,
  ElementView,
  Matrix,
  ShapeData,
  StrokeBuilderApi,
  StrokeStyle,
  TextData,
} from "./api";
import { applyMatrix, boxPolygon, composeMatrix, normalizeShape, shapePolygon } from "./shapes";

interface FakeElement {
  readonly id: string;
  readonly transform: Matrix;
  readonly style: StrokeStyle;
  /** Trait : triplets x, y, pression locaux. */
  readonly local?: Float32Array;
  readonly shape?: ShapeData;
  readonly text?: TextData;
}
interface FakePage { readonly id: string; readonly elements: FakeElement[] }
interface State { readonly pages: FakePage[] }

const MESSAGES = {
  badShape: "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)",
  badMatrix: "matrice invalide (six nombres finis, inversible)",
  badText: "texte invalide (taille et boîte finies > 0 attendues)",
  badWidth: "épaisseur de trait invalide (nombre fini > 0 attendu)",
} as const;

let counter = 0;
const newId = (): string => `fake-${++counter}`;
const finitePath = (path: Float32Array): boolean =>
  path.length >= 2 && path.length % 2 === 0 && path.every((v) => Number.isFinite(v));
const positive = (v: number): boolean => Number.isFinite(v) && v > 0;
const clone = (s: State): State => ({ pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements] })) });
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const isIdentity = (m: Matrix): boolean => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

function toLocal(points: Float32Array): { x0: number; y0: number; local: Float32Array } {
  const x0 = points[0] ?? 0;
  const y0 = points[1] ?? 0;
  const local = new Float32Array(points.length);
  for (let i = 0; i + 2 < points.length; i += 3) {
    local[i] = (points[i] ?? 0) - x0;
    local[i + 1] = (points[i + 1] ?? 0) - y0;
    local[i + 2] = points[i + 2] ?? 0;
  }
  return { x0, y0, local };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

/** Points monde d'un trait (vide pour une forme ou un texte). */
function worldPoints(e: FakeElement): [number, number][] {
  const out: [number, number][] = [];
  const l = e.local;
  if (!l) return out;
  for (let i = 0; i + 2 < l.length; i += 3) out.push(applyMatrix(e.transform, l[i] ?? 0, l[i + 1] ?? 0));
  return out;
}

function strokeTouches(e: FakeElement, path: Float32Array, radius: number): boolean {
  const reach = radius + e.style.width / 2;
  for (const [x, y] of worldPoints(e)) {
    for (let j = 0; j + 1 < path.length; j += 2) {
      const ax = path[j] ?? 0;
      const ay = path[j + 1] ?? 0;
      const bx = j + 3 < path.length ? (path[j + 2] ?? 0) : ax;
      const by = j + 3 < path.length ? (path[j + 3] ?? 0) : ay;
      if (distToSegment(x, y, ax, ay, bx, by) <= reach) return true;
    }
  }
  return false;
}

/** Polygone monde (x, y alternés) d'une forme ou d'un texte ; null pour un trait. */
function worldPolygon(e: FakeElement): number[] | null {
  const local = e.shape
    ? shapePolygon(e.shape.shape, e.shape.w, e.shape.h, e.style.width)
    : e.text
      ? boxPolygon(e.text.boxWidth, e.text.boxHeight)
      : null;
  if (!local) return null;
  const out: number[] = [];
  for (let i = 0; i + 1 < local.length; i += 2) out.push(...applyMatrix(e.transform, local[i] ?? 0, local[i + 1] ?? 0));
  return out;
}

function polygonHit(poly: number[], x: number, y: number, tol: number): boolean {
  const n = poly.length / 2;
  let inside = false;
  let edge = Number.POSITIVE_INFINITY;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[2 * i] ?? 0;
    const yi = poly[2 * i + 1] ?? 0;
    const xj = poly[2 * j] ?? 0;
    const yj = poly[2 * j + 1] ?? 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    edge = Math.min(edge, distToSegment(x, y, xi, yi, xj, yj));
  }
  return inside || edge <= tol;
}

function polyOutline(points: Float32Array, dx: number, dy: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push((points[i] ?? 0) + dx, (points[i + 1] ?? 0) + dy);
  return new Float32Array(out);
}

interface Found { readonly page: FakePage; readonly index: number; readonly element: FakeElement }

class FakeDocument implements CoreDocument {
  private state: State;
  private undoStack: State[] = [];
  private redoStack: State[] = [];
  private ver = 0;

  constructor(state: State) {
    this.state = state;
  }

  private page(id: string): FakePage {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) throw new Error(`page inconnue : ${id}`);
    return p;
  }

  private find(id: string): Found | undefined {
    for (const page of this.state.pages) {
      const index = page.elements.findIndex((e) => e.id === id);
      const element = page.elements[index];
      if (element) return { page, index, element };
    }
    return undefined;
  }

  private unchanged(): Change {
    return { pages: [], ids: [], removed: [], full: false, version: this.ver };
  }

  private step(mutate: (s: State) => Omit<Change, "version" | "full">): Change {
    const next = clone(this.state);
    const partial = mutate(next);
    if (partial.ids.length === 0 && partial.removed.length === 0 && partial.pages.length === 0) {
      return { ...partial, full: false, version: this.ver };
    }
    this.undoStack.push(this.state);
    this.redoStack = [];
    this.state = next;
    return { ...partial, full: false, version: ++this.ver };
  }

  pageIds(): string[] { return this.state.pages.map((p) => p.id); }
  elementIds(page: string): string[] { return this.page(page).elements.map((e) => e.id); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": {
        const after = cmd.after;
        if (after !== null) this.page(after);
        return this.step((s) => {
          const id = newId();
          const at = after === null ? s.pages.length : s.pages.findIndex((p) => p.id === after) + 1;
          s.pages.splice(at, 0, { id, elements: [] });
          return { pages: [id], ids: [], removed: [] };
        });
      }
      case "RemovePage": {
        const removed = this.elementIds(cmd.page);
        if (this.state.pages.length <= 1) throw new Error("la dernière page ne se supprime pas");
        return this.step((s) => {
          s.pages.splice(s.pages.findIndex((p) => p.id === cmd.page), 1);
          return { pages: [cmd.page], ids: [], removed };
        });
      }
      case "CommitStroke": {
        if (cmd.points.length < 3 || cmd.points.length % 3 !== 0 || !cmd.points.every((v) => Number.isFinite(v))) {
          throw new Error("points invalides");
        }
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        this.page(cmd.page);
        return this.step((s) => {
          const id = newId();
          const { x0, y0, local } = toLocal(cmd.points);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(x0, y0), local, style: cmd.style });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "Erase": {
        if (!finitePath(cmd.path)) throw new Error("points invalides");
        if (!positive(cmd.radius)) throw new Error("rayon de gomme invalide (nombre fini > 0 attendu)");
        const hit = this.page(cmd.page).elements
          .filter((e) => e.local !== undefined && strokeTouches(e, cmd.path, cmd.radius))
          .map((e) => e.id);
        if (hit.length === 0) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !hit.includes(e.id)));
          return { pages: [cmd.page], ids: [], removed: hit };
        });
      }
      case "Delete": {
        // Comme le cœur : ids inconnus ignorés, doublons fusionnés, `pages` = pages touchées triées ; rien de trouvé =
        // aucune étape (D38).
        const removed = [...new Set(cmd.ids)].filter((id) => this.find(id) !== undefined);
        const pages = this.state.pages.filter((p) => p.elements.some((e) => removed.includes(e.id))).map((p) => p.id).sort();
        return this.step((s) => {
          for (const p of s.pages) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !removed.includes(e.id)));
          return { pages, ids: [], removed };
        });
      }
      case "AddShape": {
        if (![cmd.x0, cmd.y0, cmd.x1, cmd.y1].every((v) => Number.isFinite(v))) throw new Error(MESSAGES.badShape);
        if (!positive(cmd.style.width)) throw new Error(MESSAGES.badWidth);
        this.page(cmd.page);
        return this.step((s) => {
          const id = newId();
          const g = normalizeShape(cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({
            id,
            transform: translate(g.tx, g.ty),
            style: cmd.style,
            shape: { shape: cmd.shape, w: g.w, h: g.h, fill: cmd.fill },
          });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetText": {
        // Même ordre que le cœur : texte invalide, puis page ou élément inconnu, puis contenu vide, puis inchangé.
        if (!positive(cmd.size) || !positive(cmd.boxWidth) || !positive(cmd.boxHeight) || !Number.isFinite(cmd.x) || !Number.isFinite(cmd.y)) {
          throw new Error(MESSAGES.badText);
        }
        const text: TextData = { content: cmd.content, size: cmd.size, boxWidth: cmd.boxWidth, boxHeight: cmd.boxHeight };
        const style: StrokeStyle = { color: cmd.color, width: 0 };
        if (cmd.id === null) {
          this.page(cmd.page);
          if (cmd.content === "") return this.unchanged();
          return this.step((s) => {
            const id = newId();
            s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: translate(cmd.x, cmd.y), style, text });
            return { pages: [cmd.page], ids: [id], removed: [] };
          });
        }
        const id = cmd.id;
        const found = this.find(id);
        if (!found || !found.element.text) throw new Error(`élément inconnu : ${id}`);
        const pageId = found.page.id;
        if (cmd.content === "") {
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === pageId);
            if (p) p.elements.splice(p.elements.findIndex((e) => e.id === id), 1);
            return { pages: [pageId], ids: [], removed: [id] };
          });
        }
        const t = found.element.text;
        if (t.content === text.content && t.size === text.size && t.boxWidth === text.boxWidth && t.boxHeight === text.boxHeight && found.element.style.color === cmd.color) {
          return this.unchanged();
        }
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
          const old = p?.elements[i];
          if (p && old) p.elements[i] = { ...old, style, text };
          return { pages: [pageId], ids: [id], removed: [] };
        });
      }
      case "Transform": {
        const m = cmd.matrix;
        const det = m[0] * m[3] - m[1] * m[2];
        if (!m.every((v) => Number.isFinite(v)) || Math.abs(det) < 1e-12) throw new Error(MESSAGES.badMatrix);
        const ids = [...new Set(cmd.ids)].filter((id) => this.find(id) !== undefined).sort();
        if (ids.length === 0 || isIdentity(m)) return this.unchanged();
        const pages = [...new Set(ids.map((id) => this.find(id)?.page.id ?? ""))].sort();
        return this.step((s) => {
          for (const p of s.pages) {
            p.elements.forEach((e, i) => {
              if (ids.includes(e.id)) p.elements[i] = { ...e, transform: composeMatrix(m, e.transform) };
            });
          }
          return { pages, ids, removed: [] };
        });
      }
    }
  }

  element(id: string): ElementView | null {
    const e = this.find(id)?.element;
    if (!e) return null;
    const base = { id, transform: e.transform, style: e.style };
    if (e.shape) return { ...base, kind: "shape", shape: e.shape };
    if (e.text) return { ...base, kind: "text", text: e.text };
    return { ...base, kind: "stroke" };
  }
  points(id: string): Float32Array | null { return this.find(id)?.element.local ?? null; }
  outline(id: string): Float32Array | null {
    const l = this.find(id)?.element.local;
    return l ? polyOutline(l, 0, 0) : null;
  }
  hitTest(page: string, x: number, y: number, tol: number): string | null {
    const els = this.page(page).elements;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (!e) continue;
      const poly = worldPolygon(e);
      if (poly ? polygonHit(poly, x, y, tol) : strokeTouches(e, new Float32Array([x, y]), tol)) return e.id;
    }
    return null;
  }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] {
    return this.page(page).elements.filter((e) => e.local !== undefined && strokeTouches(e, path, radius)).map((e) => e.id);
  }
  idsInRect(page: string, r: Bounds): string[] {
    return this.page(page).elements.filter((e) => {
      const b = this.bounds([e.id]);
      return b !== null && b.x0 >= r.x0 && b.y0 >= r.y0 && b.x1 <= r.x1 && b.y1 <= r.y1;
    }).map((e) => e.id);
  }
  bounds(ids: readonly string[]): Bounds | null {
    let b: Bounds | null = null;
    const add = (x0: number, y0: number, x1: number, y1: number): void => {
      b = b === null
        ? { x0, y0, x1, y1 }
        : { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) };
    };
    for (const id of ids) {
      const e = this.find(id)?.element;
      if (!e) continue;
      const poly = worldPolygon(e);
      if (poly) {
        for (let i = 0; i + 1 < poly.length; i += 2) add(poly[i] ?? 0, poly[i + 1] ?? 0, poly[i] ?? 0, poly[i + 1] ?? 0);
        continue;
      }
      const h = e.style.width / 2;
      for (const [x, y] of worldPoints(e)) add(x - h, y - h, x + h, y + h);
    }
    return b;
  }
  undo(): Change {
    const prev = this.undoStack.pop();
    if (!prev) return this.unchanged();
    this.redoStack.push(this.state);
    this.state = prev;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  redo(): Change {
    const next = this.redoStack.pop();
    if (!next) return this.unchanged();
    this.undoStack.push(this.state);
    this.state = next;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  version(): number { return this.ver; }
  save(now: string, appVersion: string): Uint8Array {
    const json = JSON.stringify({ now, appVersion, pages: this.state.pages.map((p) => ({
      id: p.id,
      elements: p.elements.map((e) => ({
        id: e.id,
        transform: [...e.transform],
        style: e.style,
        ...(e.local ? { local: Array.from(e.local) } : {}),
        ...(e.shape ? { shape: e.shape } : {}),
        ...(e.text ? { text: e.text } : {}),
      })),
    })) });
    return new TextEncoder().encode(json);
  }
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const pts: number[] = [];
    void style;
    return {
      push: (p: Float32Array) => { pts.push(...p); return polyOutline(new Float32Array(pts), 0, 0); },
      finish: () => polyOutline(new Float32Array(pts), 0, 0),
      free: () => undefined,
    };
  }
  free(): void { /* rien à libérer */ }
}

interface SavedElement {
  id: string;
  transform: [number, number, number, number, number, number];
  style: StrokeStyle;
  local?: number[];
  shape?: ShapeData;
  text?: TextData;
}
interface SavedPage { id: string; elements: SavedElement[] }

export const fakeCore: CoreFactory = {
  blank: () => new FakeDocument({ pages: [{ id: newId(), elements: [] }] }),
  load: (bytes: Uint8Array) => {
    // Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel.
    const notRoomboard = "ce fichier n'est pas un document RoomBoard";
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error(notRoomboard);
    }
    if (typeof raw !== "object" || raw === null || !("pages" in raw) || !Array.isArray(raw.pages)) {
      throw new Error(notRoomboard);
    }
    const pages = (raw.pages as SavedPage[]).map((p) => ({
      id: p.id,
      elements: p.elements.map((e): FakeElement => ({
        id: e.id,
        transform: e.transform,
        style: e.style,
        ...(e.local ? { local: new Float32Array(e.local) } : {}),
        ...(e.shape ? { shape: e.shape } : {}),
        ...(e.text ? { text: e.text } : {}),
      })),
    }));
    return new FakeDocument({ pages });
  },
  version: () => "fake",
};
```

  Si un test existant lisait le message « épaisseur de trait invalide (nombre fini > 0 attendu) » : il est inchangé.

- [ ] **11. `wasm-core.ts` : union et commandes non liées.** Ajouter `import { isShapeKind } from "./shapes";` ;
  remplacer `toElementView` par :

```ts
export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error("ElementView invalide");
  const { id, kind, transform, style } = v;
  if (typeof id !== "string" || !isNumbers(transform) || transform.length !== 6 || !isRecord(style)) {
    throw new Error("ElementView invalide");
  }
  const [a, b, c, d, e, f] = transform;
  if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error("ElementView invalide");
  }
  const { color, width } = style;
  if (typeof color !== "string" || typeof width !== "number") throw new Error("ElementView invalide");
  const base = { id, transform: [a, b, c, d, e, f] as Matrix, style: { color, width } };
  if (kind === "stroke") return { ...base, kind };
  if (kind === "shape") {
    const s = v["shape"];
    if (!isRecord(s)) throw new Error("ElementView invalide");
    const { shape, w, h, fill } = s;
    if (typeof shape !== "string" || !isShapeKind(shape) || typeof w !== "number" || typeof h !== "number") {
      throw new Error("ElementView invalide");
    }
    if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error("ElementView invalide");
    return { ...base, kind, shape: { shape, w, h, fill: typeof fill === "string" ? fill : null } };
  }
  if (kind === "text") {
    const t = v["text"];
    if (!isRecord(t)) throw new Error("ElementView invalide");
    const { content, size, boxWidth, boxHeight } = t;
    if (typeof content !== "string" || typeof size !== "number" || typeof boxWidth !== "number" || typeof boxHeight !== "number") {
      throw new Error("ElementView invalide");
    }
    return { ...base, kind, text: { content, size, boxWidth, boxHeight } };
  }
  throw new Error("ElementView invalide");
}
```

  et ajouter dans le `switch` de `apply` (T54 les remplacera par les vrais appels) :

```ts
      case "AddShape":
      case "SetText":
      case "Transform":
        throw new Error(`commande non liée avant T54 : ${cmd.type}`);
```

- [ ] **12. Vérifier.** La commande bornée de la section → `Test Files  3 passed` ; puis
  `pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -6` (contrat commun vert sur la fausse liaison) ;
  `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` (aucune erreur) ;
  `cd ~/projets/roomboard-wt/socle--T46 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **13. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T46
git add apps/web/src/core/api.ts apps/web/src/core/shapes.ts apps/web/src/core/shapes.test.ts apps/web/src/core/fake-core.ts apps/web/src/core/fake-core.test.ts apps/web/src/core/wasm-core.ts apps/web/src/engine/render/overlay.ts apps/web/src/engine/render/overlay.test.ts apps/web/src/engine/tools/tool.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(web): lot 4 core contract, fake core with shapes, text and transforms, edit overlay types (T46)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t47"></a>
### Tâche T47 — Moteur : pages (ajouter, retirer, précédente, suivante)

**Objectif.** Le moteur ajoute une page après la page montrée et la montre, retire la page montrée et montre la
précédente, avance et recule, et suit les pages après annuler / rétablir (CL4-9, D16, D37, HL3b-7). L'état porte le
compteur (`pageIndex`, `pageCount`) et, déjà, les champs de sélection que T55 remplira.

**Fichiers.**
- Modifier : `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`,
  `apps/web/src/app/barre.test.ts` (seulement l'objet `base`, qui doit porter les champs neufs d'`EngineState`)

**Interfaces.**
- Consomme : `CoreDocument.{pageIds, apply, undo, redo}` ; `Command` `AddPage`, `RemovePage` (`api.ts`) ;
  `fitPage`, `IDENTITY` (`engine/camera.ts`).
- Produit (`EngineState`, ajouts) : `pageIndex: number` (0 = première), `pageCount: number`,
  `selection: readonly string[]` (vide jusqu'à T55), `selectionBounds: Bounds | null` (null jusqu'à T55).
- Produit (`Engine`, ajouts) : `addPage(): boolean`, `removePage(): boolean`, `nextPage(): boolean`,
  `prevPage(): boolean`. `run(cmd)` (écriture brute) ne montre jamais une page ajoutée ; il suit seulement la
  disparition de la page montrée.
- Réutilise : `apps/web/src/engine/engine.ts` — `showPage(id)` et la caméra par page du lot 3b (HL3b-7), dont le corps
  devient `switchTo(id)` partagé.

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T47 && pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/barre.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -40`
— attendu : `Tests  N passed` (N = existants + 8), aucun `×`, et présents : `addPage : insère après la page montrée et la montre`,
`annuler l'ajout montre la page précédente, rétablir la remontre`, `annuler le retrait remontre la page avec ses éléments`.
Tests à garder verts : tous ceux de `engine.test.ts` (dont `caméra par page : chaque page garde sa vue`,
`showPage d'une page inconnue : false, rien ne change`) et de `barre.test.ts`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T47` (créé par l'orchestrateur depuis `feat/socle-lot4`) ; neuf :
  `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `barre.ts`, `main.ts` (T58), `tool.ts` (T46), le routeur. Montrer une page ajoutée par
`run` brut (le test lot 3b « caméra par page » en dépend). Oublier la caméra d'une page retirée.

**Terminé quand** la commande bornée est verte, `pnpm --filter @roomboard/web exec tsc --noEmit` est sans erreur,
`scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé showPage / caméra par page
(engine.ts)`.

**Étapes.**

- [ ] **1. Tests rouges.** Ajouter à la fin du `describe("createEngine", …)` de `engine.test.ts` :

```ts
  it("addPage : insère après la page montrée et la montre", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    expect(engine.addPage()).toBe(true);
    const [, p2] = doc.pageIds();
    expect(engine.state()).toMatchObject({ page: p2, pageIndex: 1, pageCount: 2 });
    expect(engine.prevPage()).toBe(true);
    expect(engine.state().page).toBe(p1);
    expect(engine.addPage()).toBe(true);
    const ids = doc.pageIds();
    expect(ids).toHaveLength(3);
    expect(ids[2]).toBe(p2);
    expect(engine.state()).toMatchObject({ page: ids[1], pageIndex: 1 });
  });

  it("removePage de la page montrée : la précédente est montrée (CL4-9)", () => {
    const { doc, engine } = setup();
    engine.addPage();
    engine.addPage();
    const [p1, p2, p3] = doc.pageIds();
    engine.showPage(p2 ?? "");
    expect(engine.removePage()).toBe(true);
    expect(doc.pageIds()).toEqual([p1, p3]);
    expect(engine.state()).toMatchObject({ page: p1, pageIndex: 0, pageCount: 2, error: null });
  });

  it("removePage de la première page : la nouvelle première est montrée", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    engine.addPage();
    engine.showPage(p1);
    expect(engine.removePage()).toBe(true);
    expect(engine.state().page).toBe(doc.pageIds()[0]);
    expect(engine.state().pageCount).toBe(1);
  });

  it("removePage sur la dernière page : refus dans l'état, rien ne change (D37)", () => {
    const { engine } = setup();
    const p = engine.state().page;
    expect(engine.removePage()).toBe(false);
    expect(engine.state()).toMatchObject({ page: p, pageCount: 1, error: "la dernière page ne se supprime pas" });
  });

  it("annuler l'ajout montre la page précédente, rétablir la remontre", () => {
    const { doc, engine } = setup();
    const p1 = engine.state().page;
    engine.addPage();
    const p2 = engine.state().page;
    engine.undo();
    expect(doc.pageIds()).toEqual([p1]);
    expect(engine.state()).toMatchObject({ page: p1, pageIndex: 0, pageCount: 1, error: null });
    engine.redo();
    expect(engine.state()).toMatchObject({ page: p2, pageIndex: 1, pageCount: 2 });
  });

  it("annuler le retrait remontre la page avec ses éléments", () => {
    const { engine } = setup();
    engine.addPage();
    const p2 = engine.state().page;
    engine.run({ type: "CommitStroke", page: p2, points: new Float32Array([10, 10, 0.5, 20, 20, 0.5]), style: PEN });
    engine.removePage();
    expect(engine.state().page).not.toBe(p2);
    engine.undo();
    expect(engine.state()).toMatchObject({ page: p2, elementCount: 1 });
  });

  it("retirer une page garde sa caméra : annuler le retrait rend sa vue", () => {
    const { engine } = setup();
    engine.resize(1280, 720, 1);
    engine.addPage();
    engine.view.panBy(40, 0);
    const cam = engine.camera();
    engine.removePage();
    engine.undo();
    expect(engine.camera()).toEqual(cam);
  });

  it("nextPage et prevPage s'arrêtent aux bords", () => {
    const { engine } = setup();
    expect(engine.nextPage()).toBe(false);
    expect(engine.prevPage()).toBe(false);
    engine.addPage();
    expect(engine.nextPage()).toBe(false);
    expect(engine.prevPage()).toBe(true);
    expect(engine.prevPage()).toBe(false);
    expect(engine.nextPage()).toBe(true);
    expect(engine.state()).toMatchObject({ pageIndex: 1, pageCount: 2, selection: [], selectionBounds: null });
  });
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts 2>&1 | tail -6`
  — attendu : 8 `FAIL` (`engine.addPage is not a function`).

- [ ] **3. `engine.ts` : état et interface.** Ajouter `Bounds` à l'import de `../core/api`. Dans `EngineState`,
  après `page` :

```ts
  /** Rang de la page montrée (0 = première) et nombre de pages (D16 : compteur « 3 / 7 »). */
  readonly pageIndex: number;
  readonly pageCount: number;
  /** Éléments sélectionnés (outil Sélection, T55) et leur boîte monde ; vides tant que la sélection n'est pas branchée. */
  readonly selection: readonly string[];
  readonly selectionBounds: Bounds | null;
```

  Dans `interface Engine`, après `showPage` :

```ts
  /** Ajoute une page après la page montrée et la montre (D16, CL4-9) ; false si le cœur refuse. */
  addPage(): boolean;
  /** Retire la page montrée, montre la précédente (CL4-9) ; dernière page : refus du cœur dans l'état (D37). */
  removePage(): boolean;
  nextPage(): boolean;
  prevPage(): boolean;
```

- [ ] **4. `engine.ts` : suivre les pages.** Dans `createEngine`, après `let pageId…` : `let lastIndex = 0;`.
  Remplacer `state()` :

```ts
  function state(): EngineState {
    const ids = doc.pageIds();
    return {
      tool,
      eraserMode,
      canUndo: doc.canUndo(),
      canRedo: doc.canRedo(),
      page: pageId,
      pageIndex: ids.indexOf(pageId),
      pageCount: ids.length,
      selection: [],
      selectionBounds: null,
      elementCount: doc.elementIds(pageId).length,
      version: doc.version(),
      error,
    };
  }
```

  Ajouter, avant `run` :

```ts
  /** Montre une page : gestes abandonnés, caméra de la page quittée gardée (D17, HL3b-7), ajustée si jamais vue. */
  function switchTo(id: string): void {
    closeAll("abort");
    cameras.set(pageId, camera);
    pageId = id;
    lastIndex = doc.pageIds().indexOf(id);
    const saved = cameras.get(id);
    if (saved) {
      camera = saved;
    } else if (viewW > 0 && viewH > 0) {
      camera = fitPage(viewW, viewH);
      fitted.add(id);
    } else {
      camera = IDENTITY;
    }
    requestScene();
  }

  /**
   * Après une écriture ou annuler / rétablir (CL4-9) : une page apparue est montrée si `showAppeared` ; la page montrée
   * disparue laisse la précédente (la première si c'était la première).
   */
  function followPages(before: readonly string[], showAppeared: boolean): void {
    const after = doc.pageIds();
    if (showAppeared) {
      const appeared = after.find((id) => !before.includes(id));
      if (appeared !== undefined) {
        switchTo(appeared);
        return;
      }
    }
    if (!after.includes(pageId)) {
      const next = after[Math.min(Math.max(0, lastIndex - 1), after.length - 1)];
      if (next !== undefined) switchTo(next);
      return;
    }
    lastIndex = after.indexOf(pageId);
  }
```

  `closeAll` est défini plus bas dans le fichier : le déplacer avant `switchTo` (c'est une déclaration de fonction,
  l'ordre ne change rien à l'exécution ; le garder lisible). Dans `run`, prendre `const before = doc.pageIds();` en
  première ligne, et appeler `followPages(before, false);` juste après `error = null;`. Dans `history`, même chose
  avec `followPages(before, true);`.

- [ ] **5. `engine.ts` : méthodes.** Remplacer `showPage` dans l'objet rendu et ajouter les quatre méthodes :

```ts
    showPage(id) {
      if (id === pageId) return true;
      if (!doc.pageIds().includes(id)) return false;
      switchTo(id);
      emit();
      return true;
    },
    addPage() {
      const id = run({ type: "AddPage", after: pageId })?.pages[0];
      if (id === undefined) return false;
      return this.showPage(id);
    },
    removePage() {
      return run({ type: "RemovePage", page: pageId }) !== null;
    },
    nextPage() {
      const ids = doc.pageIds();
      const next = ids[ids.indexOf(pageId) + 1];
      return next !== undefined && this.showPage(next);
    },
    prevPage() {
      const ids = doc.pageIds();
      const i = ids.indexOf(pageId);
      const prev = i > 0 ? ids[i - 1] : undefined;
      return prev !== undefined && this.showPage(prev);
    },
```

  Si `this` gêne le typage de l'objet littéral, nommer l'objet (`const engine: Engine = { … }; return engine;`) et
  appeler `engine.showPage`.

- [ ] **6. `barre.test.ts`.** Dans l'objet `base` (en tête du fichier), ajouter après `page: "p",` :

```ts
  pageIndex: 0,
  pageCount: 1,
  selection: [],
  selectionBounds: null,
```

- [ ] **7. Vérifier.** Commande bornée de la section → aucun `×` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur ; `cd ~/projets/roomboard-wt/socle--T47 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **8. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T47
git add apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts apps/web/src/app/barre.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(engine): add, remove and browse pages, follow pages after undo (T47)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t48"></a>
### Tâche T48 — Mise en lignes du texte et poignées

**Objectif.** Deux modules purs partagés : la mise en lignes du texte (même coupure pour la mesure de la hauteur de
boîte et pour le rendu, CL4-4, CL4-5) et la géométrie des 8 poignées avec les matrices de déplacement et de
redimensionnement (D15, CL4-11), sans jamais d'échelle nulle.

**Fichiers.**
- Créer : `apps/web/src/engine/text-layout.ts`, `apps/web/src/engine/text-layout.test.ts`,
  `apps/web/src/engine/tools/handles.ts`, `apps/web/src/engine/tools/handles.test.ts`

**Interfaces.**
- Consomme : `Bounds`, `Matrix` (`apps/web/src/core/api.ts`, existants).
- Produit (`engine/text-layout.ts`) : `TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif'`,
  `TEXT_SIZES = [24, 36, 48, 72]`, `DEFAULT_TEXT_SIZE = 36`, `TEXT_LINE_HEIGHT = 1.25`, `DEFAULT_TEXT_BOX_WIDTH = 600`,
  `textFont(size: number): string`, `type Measure = (text: string, size: number) => number`,
  `layoutText(content: string, size: number, boxWidth: number, measure: Measure): string[]`,
  `textBoxHeight(lines: number, size: number): number`.
- Produit (`engine/tools/handles.ts`) : `type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"`,
  `HANDLE_IDS`, `HANDLE_PX = 10`, `HANDLE_GRAB_PX = 12`, `MIN_SCALE = 0.05`,
  `handlePoint(b: Bounds, h: HandleId): [number, number]`, `handlesOf(b): { id: HandleId; x: number; y: number }[]`,
  `hitHandle(b, x, y, reach): HandleId | null`, `translateMatrix(dx, dy): Matrix`, `isIdentity(m): boolean`,
  `resizeMatrix(b, h, x, y, keepRatio: boolean): Matrix`, `transformBounds(m, b): Bounds`.
- Réutilise : aucun module existant ne met du texte en lignes ni ne place de poignées (termes cherchés :
  `measureText`, `fillText`, `handle`, `resize` dans `apps/web/src` : rien) — nouveaux modules.

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T48 && pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts src/engine/tools/handles.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -20`
— attendu : `Tests  13 passed`, aucun `×`, dont `resizeMatrix ne s'écrase jamais` et
`coupe aux espaces dans la largeur de boîte`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T48` (créé par l'orchestrateur depuis `feat/socle-lot4`) ; neuf :
  `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Importer `core/shapes.ts` (créé en parallèle par T46) ; toucher un autre fichier.

**Terminé quand** la commande bornée rend 13 tests verts nommés, `tsc --noEmit` est sans erreur,
`scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte `Réutilisation : écart — aucun module existant
(nouveaux modules)`.

**Étapes.**

- [ ] **1. Tests rouges de la mise en lignes.** Créer `apps/web/src/engine/text-layout.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { layoutText, textBoxHeight, textFont, type Measure } from "./text-layout";

/** Chaque caractère vaut 100 unités, quelle que soit la taille. */
const wide: Measure = (s) => s.length * 100;

describe("mise en lignes du texte (CL4-4)", () => {
  it("une ligne si elle tient", () => {
    expect(layoutText("Bonjour", 36, 1000, wide)).toEqual(["Bonjour"]);
  });

  it("coupe aux espaces dans la largeur de boîte", () => {
    expect(layoutText("aaaa bbbb cc", 36, 700, wide)).toEqual(["aaaa", "bbbb cc"]);
  });

  it("Entrée = nouvelle ligne, lignes vides gardées", () => {
    expect(layoutText("a\n\nb", 36, 600, wide)).toEqual(["a", "", "b"]);
  });

  it("un mot plus long que la boîte est coupé par caractères", () => {
    expect(layoutText("abcdefgh", 36, 300, wide)).toEqual(["abc", "def", "gh"]);
  });

  it("texte vide : une ligne vide", () => {
    expect(layoutText("", 36, 600, wide)).toEqual([""]);
  });

  it("hauteur : lignes × taille × 1,25, au moins une ligne ; police à la taille", () => {
    expect(textBoxHeight(2, 36)).toBe(90);
    expect(textBoxHeight(0, 36)).toBe(45);
    expect(textFont(48)).toBe('48px "Atkinson Hyperlegible", system-ui, sans-serif');
  });
});
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts 2>&1 | tail -4`
  — attendu : `Failed to resolve import "./text-layout"`.

- [ ] **3. Écrire `engine/text-layout.ts`.**

```ts
/**
 * Mise en lignes du texte (D14, CL4-4, CL4-5) : une seule implémentation pour la hauteur de boîte envoyée au cœur
 * (outil Texte) et pour le rendu (Canvas 2D). Coupure gloutonne aux espaces, mot trop long coupé par caractères.
 */
export const TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const DEFAULT_TEXT_SIZE = 36;
export const TEXT_LINE_HEIGHT = 1.25;
export const DEFAULT_TEXT_BOX_WIDTH = 600;

export const textFont = (size: number): string => `${size}px ${TEXT_FONT_FAMILY}`;

/** Largeur d'un texte à une taille, en unités monde (= px CSS de la police à cette taille). */
export type Measure = (text: string, size: number) => number;

export function layoutText(content: string, size: number, boxWidth: number, measure: Measure): string[] {
  const out: string[] = [];
  for (const para of content.split("\n")) {
    let line = "";
    for (const token of para.split(/(\s+)/)) {
      if (token === "") continue;
      const candidate = line + token;
      if (line === "" || measure(candidate.trimEnd(), size) <= boxWidth) {
        line = candidate;
      } else {
        out.push(line.trimEnd());
        line = /^\s+$/.test(token) ? "" : token;
      }
      while (line.trimEnd().length > 1 && measure(line.trimEnd(), size) > boxWidth) {
        let cut = line.length - 1;
        while (cut > 1 && measure(line.slice(0, cut), size) > boxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

export const textBoxHeight = (lines: number, size: number): number => Math.max(1, lines) * size * TEXT_LINE_HEIGHT;
```

  Vérifier : `… vitest run src/engine/text-layout.test.ts 2>&1 | tail -4` → `Tests  6 passed`.

- [ ] **4. Tests rouges des poignées.** Créer `apps/web/src/engine/tools/handles.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Bounds } from "../../core/api";
import { handlePoint, handlesOf, hitHandle, isIdentity, MIN_SCALE, resizeMatrix, transformBounds, translateMatrix } from "./handles";

const b: Bounds = { x0: 100, y0: 100, x1: 300, y1: 200 };
const apply = (m: readonly number[], x: number, y: number): [number, number] => [
  (m[0] ?? 0) * x + (m[2] ?? 0) * y + (m[4] ?? 0),
  (m[1] ?? 0) * x + (m[3] ?? 0) * y + (m[5] ?? 0),
];

describe("poignées (D15, CL4-11)", () => {
  it("8 poignées : coins et milieux des bords", () => {
    expect(handlesOf(b).map((h) => [h.id, h.x, h.y])).toEqual([
      ["nw", 100, 100], ["n", 200, 100], ["ne", 300, 100], ["e", 300, 150],
      ["se", 300, 200], ["s", 200, 200], ["sw", 100, 200], ["w", 100, 150],
    ]);
  });

  it("hitHandle : la plus proche dans la portée, sinon null", () => {
    expect(hitHandle(b, 305, 203, 12)).toBe("se");
    expect(hitHandle(b, 200, 150, 12)).toBeNull();
  });

  it("poignée de coin : échelle autour du coin opposé", () => {
    const m = resizeMatrix(b, "se", 500, 300, false);
    expect(m).toEqual([2, 0, 0, 2, -100, -100]);
    expect(apply(m, 100, 100)).toEqual([100, 100]);
    expect(apply(m, 300, 200)).toEqual([500, 300]);
  });

  it("poignée de bord : un seul axe ; Maj : proportions", () => {
    expect(resizeMatrix(b, "e", 500, 999, false)).toEqual([2, 0, 0, 1, -100, 0]);
    const kept = resizeMatrix(b, "se", 500, 220, true);
    expect(kept[0]).toBe(2);
    expect(kept[3]).toBe(2);
  });

  it("resizeMatrix ne s'écrase jamais", () => {
    const flat = resizeMatrix(b, "se", 100, 100, false);
    expect(Math.abs(flat[0])).toBe(MIN_SCALE);
    expect(Math.abs(flat[3])).toBe(MIN_SCALE);
    const flipped = resizeMatrix(b, "e", 0, 150, false);
    expect(flipped[0]).toBe(-0.5);
    for (const m of [flat, flipped, resizeMatrix(b, "n", 200, Number.NaN, true)]) {
      expect(Math.abs(m[0] * m[3] - m[1] * m[2])).toBeGreaterThan(0);
      expect(m.every((v) => Number.isFinite(v))).toBe(true);
    }
  });

  it("translateMatrix, isIdentity, transformBounds", () => {
    expect(translateMatrix(10, -5)).toEqual([1, 0, 0, 1, 10, -5]);
    expect(isIdentity([1, 0, 0, 1, 0, 0])).toBe(true);
    expect(isIdentity(translateMatrix(0, 1))).toBe(false);
    expect(transformBounds([2, 0, 0, 2, -100, -100], b)).toEqual({ x0: 100, y0: 100, x1: 500, y1: 300 });
    expect(transformBounds([-1, 0, 0, 1, 0, 0], b)).toEqual({ x0: -300, y0: 100, x1: -100, y1: 200 });
  });

  it("handlePoint : milieu du bord nord", () => {
    expect(handlePoint(b, "n")).toEqual([200, 100]);
  });
});
```

- [ ] **5. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/tools/handles.test.ts 2>&1 | tail -4`
  — attendu : `Failed to resolve import "./handles"`.

- [ ] **6. Écrire `engine/tools/handles.ts`.**

```ts
/** Poignées de redimensionnement (D15, CL4-11) et matrices de déplacement, partagées par l'outil Sélection et le rendu. */
import type { Bounds, Matrix } from "../../core/api";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const HANDLE_IDS: readonly HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
/** Côté dessiné d'une poignée et portée de prise, en px écran. */
export const HANDLE_PX = 10;
export const HANDLE_GRAB_PX = 12;
/** Échelle minimale en valeur absolue : jamais de matrice non inversible (refusée par le cœur). */
export const MIN_SCALE = 0.05;

const OPPOSITE: Record<HandleId, HandleId> = { nw: "se", n: "s", ne: "sw", e: "w", se: "nw", s: "n", sw: "ne", w: "e" };
const MOVES_X: ReadonlySet<HandleId> = new Set<HandleId>(["nw", "ne", "e", "se", "sw", "w"]);
const MOVES_Y: ReadonlySet<HandleId> = new Set<HandleId>(["nw", "n", "ne", "se", "s", "sw"]);

export function handlePoint(b: Bounds, h: HandleId): [number, number] {
  const x = h.includes("w") ? b.x0 : h.includes("e") ? b.x1 : (b.x0 + b.x1) / 2;
  const y = h.includes("n") ? b.y0 : h.includes("s") ? b.y1 : (b.y0 + b.y1) / 2;
  return [x, y];
}

export const handlesOf = (b: Bounds): { id: HandleId; x: number; y: number }[] =>
  HANDLE_IDS.map((id) => {
    const [x, y] = handlePoint(b, id);
    return { id, x, y };
  });

/** Poignée la plus proche à moins de `reach` (unités monde, distance de Tchebychev), ou null. */
export function hitHandle(b: Bounds, x: number, y: number, reach: number): HandleId | null {
  let best: HandleId | null = null;
  let bestD = reach;
  for (const h of handlesOf(b)) {
    const d = Math.max(Math.abs(h.x - x), Math.abs(h.y - y));
    if (d <= bestD) {
      best = h.id;
      bestD = d;
    }
  }
  return best;
}

export const translateMatrix = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];

export const isIdentity = (m: Matrix): boolean =>
  m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return (s < 0 ? -1 : 1) * Math.max(MIN_SCALE, Math.abs(s));
}

/** Échelle autour de la poignée opposée qui amène la poignée `h` en (x, y) monde ; Maj : facteur dominant aux deux axes. */
export function resizeMatrix(b: Bounds, h: HandleId, x: number, y: number, keepRatio: boolean): Matrix {
  const [ax, ay] = handlePoint(b, OPPOSITE[h]);
  const [gx, gy] = handlePoint(b, h);
  let sx = MOVES_X.has(h) && gx !== ax ? (x - ax) / (gx - ax) : 1;
  let sy = MOVES_Y.has(h) && gy !== ay ? (y - ay) / (gy - ay) : 1;
  if (keepRatio) {
    const s = !MOVES_X.has(h) ? sy : !MOVES_Y.has(h) ? sx : Math.abs(sx) >= Math.abs(sy) ? sx : sy;
    sx = s;
    sy = s;
  }
  sx = clampScale(sx);
  sy = clampScale(sy);
  return [sx, 0, 0, sy, ax - sx * ax, ay - sy * ay];
}

/** Boîte monde, alignée sur les axes, de `b` transformée par `m`. */
export function transformBounds(m: Matrix, b: Bounds): Bounds {
  const corners: [number, number][] = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  const xs = corners.map(([x, y]) => m[0] * x + m[2] * y + m[4]);
  const ys = corners.map(([x, y]) => m[1] * x + m[3] * y + m[5]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
```

  Vérifier : `… vitest run src/engine/tools/handles.test.ts 2>&1 | tail -4` → `Tests  7 passed`. Si
  `resizeMatrix(b, "e", 0, 150, false)` rend `-0.5` : attendu (poignée tirée au-delà de l'ancre, retournement permis).

- [ ] **7. Vérifier la tâche.** Commande bornée de la section → `Tests  13 passed` ;
  `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` sans erreur ;
  `cd ~/projets/roomboard-wt/socle--T48 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **8. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T48
git add apps/web/src/engine/text-layout.ts apps/web/src/engine/text-layout.test.ts apps/web/src/engine/tools/handles.ts apps/web/src/engine/tools/handles.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(engine): shared text layout and selection handles geometry (T48)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t49"></a>
### Tâche T49 — Cœur : `SetText` (Y.Text) et scénarios S3/S4 du cœur

**Objectif.** Le cœur crée, remplace et retire un texte (contenu en `Y.Text`, D14) en une étape par validation ;
texte inchangé ou boîte neuve vide = aucune transaction (CL4-6, D38). Les lectures voient la boîte du texte. S3
(texte page 1, trait page 2, rectangle page 3, enregistrer, rouvrir, retirer la page 2, annuler) et S4 (deux éléments
déplacés de 100, agrandis ×2, deux annulations) passent au niveau du cœur.

**Fichiers.**
- Modifier : `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/commands.rs`,
  `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/document.rs`,
  `crates/roomboard-core/tests/scenarios.rs`

**Interfaces.**
- Consomme (de T45) : `ShapeKind`, `ShapeView`, `read_shape`, `element_geom` (`query.rs`), `box_polygon`
  (`shape.rs`), `Command::{AddShape, Transform}`, `CommandError::{BadShape, BadMatrix}`.
- Produit : `Command::SetText { page: String, id: Option<String>, x: f64, y: f64, content: String, color: String, size: f32, box_width: f64, box_height: f64 }` ;
  `CommandError::BadText` (« texte invalide (taille et boîte finies > 0 attendues) »),
  `CommandError::UnknownElement(String)` (« élément inconnu : <id> ») ;
  `pub struct element::TextView { content: String, size: f32, box_width: f64, box_height: f64 }` sérialisé en
  camelCase (`content`, `size`, `boxWidth`, `boxHeight`) ; `ElementView.text: Option<TextView>` (omis si `None`) ;
  `element()` d'un texte : `kind: "text"`, `style: StrokeStyle { color, width: 0.0 }`.
  Ordre des contrôles (la fausse liaison T46 le suit) : `BadText` ; puis `UnknownPage` (id absent) ou
  `UnknownElement` (id donné, introuvable ou pas un texte) ; puis contenu vide ; puis inchangé.
- Réutilise : `crates/roomboard-core/src/document.rs:4` `Document` — `apply` étendu de `SetText`, `element` étendu
  au texte (cadrage, « étendre »).
- Réutilise : `yrs::TextPrelim` (`yrs-0.28.1/src/types/text.rs:1442`), `Text::{len, insert, remove_range}`
  (`text.rs:158-361`), `GetString::get_string` — contenu du texte (D14 : « Contenu en `Y.Text` »).
- Réutilise : `crates/roomboard-core/src/format/mod.rs` `save` / `load` — appelés tels quels par les scénarios.

**Patron à ne pas reprendre.** Ouvrir la transaction d'écriture avant de savoir si la commande a un effet (texte
inchangé, boîte neuve vide) : l'`UndoManager` ignore une transaction vide, donc un test d'historique resterait vert,
mais D38 interdit toute écriture sans effet. Chemin de référence : `crates/roomboard-core/src/commands.rs:262-335`
(`cmd_erase` : plan sous lecture fermée, puis une seule écriture) et le test
`command_without_effect_opens_no_write_transaction` (`commands.rs:648-706`, compteur `writes`).

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T49 && export PATH=$HOME/.cargo/bin:$PATH && cargo test -p roomboard-core 2>&1 | grep -E "set_text_|hit_test_and_bounds_include_text|s3_text_stroke_shape_survive_save_load|s4_transform_two_elements_then_undo_twice|test result" | tail -20`
— attendu : 9 lignes `… ok` nommées et chaque `test result: ok.`. Tests à garder verts : tous ceux de T45
(`transform_*`, `add_shape_*`, `hit_test_finds_shape_interior`…), `s3_pages_save_load_remove_undo`,
`s3_last_page_cannot_be_removed`, `new_document_has_no_page`, `add_page_increments_count`, `blank_page_is_not_undoable`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T49` (créé par l'orchestrateur depuis `feat/socle-lot4`, T45 fusionnée) ;
  neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `crates/roomboard-wasm` (T54) ou le format. Ranger le texte en `Any::String` au lieu d'un
`Y.Text`. Plus d'une transaction par `SetText`.

**Terminé quand** les 9 tests nommés passent avec ceux de T45, `cargo clippy --workspace --all-targets -- -D warnings`
est vert, `scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé Document::apply`,
`Réutilisation : appelé yrs::TextPrelim / Text`, `Réutilisation : appelé format::save / load`.

**Étapes.**

- [ ] **1. Tests rouges des commandes.** Dans `commands.rs`, module `tests`, ajouter `TextView` à l'import de
  `crate::element` puis :

```rust
    fn text_cmd(page: &str, id: Option<String>, content: &str) -> Command {
        Command::SetText {
            page: page.into(),
            id,
            x: 100.0,
            y: 200.0,
            content: content.into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
        }
    }

    #[test]
    fn set_text_creates_text_in_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte");
        assert_eq!(c.pages, vec![p.clone()]);
        let e = d.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "text");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 200.0]);
        assert_eq!(e.style, StrokeStyle { color: "#000000".into(), width: 0.0 });
        assert_eq!(
            e.text,
            Some(TextView { content: "Bonjour".into(), size: 36.0, box_width: 600.0, box_height: 45.0 })
        );
        assert_eq!(e.shape, None);
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn set_text_replaces_content_in_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let c = d.apply(text_cmd(&p, Some(id.clone()), "Bonsoir")).expect("remplacer");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(d.element(&id).and_then(|e| e.text).map(|t| t.content), Some("Bonsoir".into()));
        assert!(d.undo());
        assert_eq!(d.element(&id).and_then(|e| e.text).map(|t| t.content), Some("Bonjour".into()));
    }

    #[test]
    fn set_text_unchanged_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let n = writes(&d);
        let v = d.version();
        let c = d.apply(text_cmd(&p, Some(id), "Bonjour")).expect("inchangé");
        assert!(c.ids.is_empty() && c.removed.is_empty());
        let c = d.apply(text_cmd(&p, None, "")).expect("boîte neuve vide");
        assert!(c.ids.is_empty() && c.pages.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn set_text_empty_removes_existing() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let c = d.apply(text_cmd(&p, Some(id.clone()), "")).expect("vider");
        assert_eq!(c.removed, vec![id.clone()]);
        assert_eq!(c.pages, vec![p.clone()]);
        assert!(d.element_ids(&p).is_empty());
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![id]);
    }

    #[test]
    fn set_text_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let stroke = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        let mut tiny = text_cmd(&p, None, "x");
        if let Command::SetText { size, .. } = &mut tiny {
            *size = 0.0;
        }
        assert_eq!(d.apply(tiny), Err(CommandError::BadText));
        let mut nan = text_cmd(&p, None, "x");
        if let Command::SetText { box_height, .. } = &mut nan {
            *box_height = f64::NAN;
        }
        assert_eq!(d.apply(nan), Err(CommandError::BadText));
        assert_eq!(
            d.apply(text_cmd(&p, Some("absent".into()), "x")),
            Err(CommandError::UnknownElement("absent".into()))
        );
        assert_eq!(
            d.apply(text_cmd(&p, Some(stroke.clone()), "x")),
            Err(CommandError::UnknownElement(stroke))
        );
        assert_eq!(
            d.apply(text_cmd("absente", None, "x")),
            Err(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn set_text_errors_have_readable_messages() {
        assert_eq!(
            CommandError::BadText.to_string(),
            "texte invalide (taille et boîte finies > 0 attendues)"
        );
        assert_eq!(CommandError::UnknownElement("x".into()).to_string(), "élément inconnu : x");
    }
```

- [ ] **2. Le voir échouer.** `cargo test -p roomboard-core set_text 2>&1 | tail -5` — attendu : erreurs de
  compilation (`no variant named SetText`, `TextView` introuvable).

- [ ] **3. `element.rs`.** Ajouter `TextView` et le champ `text` :

```rust
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextView {
    pub content: String,
    pub size: f32,
    pub box_width: f64,
    pub box_height: f64,
}
```

  et, dans `ElementView`, après `shape` :

```rust
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<TextView>,
```

- [ ] **4. `commands.rs` : variante, erreurs, lecture d'un texte.** Imports : ajouter
  `use yrs::{GetString, Text, TextPrelim, TextRef};` (à côté des imports yrs existants). Ajouter à `enum Command` :

```rust
    SetText {
        page: String,
        id: Option<String>,
        x: f64,
        y: f64,
        content: String,
        color: String,
        size: f32,
        box_width: f64,
        box_height: f64,
    },
```

  À `enum CommandError` : `BadText,` et `UnknownElement(String),` ; au `Display` :

```rust
            CommandError::BadText => {
                write!(f, "texte invalide (taille et boîte finies > 0 attendues)")
            }
            CommandError::UnknownElement(id) => write!(f, "élément inconnu : {id}"),
```

  Après `read_shape` :

```rust
/// Champs d'un texte (D14) ; `None` si l'élément n'en est pas un. `text` : le `Y.Text` du contenu.
pub(crate) struct TextFields {
    pub color: String,
    pub size: f32,
    pub box_width: f64,
    pub box_height: f64,
    pub content: String,
    pub text: TextRef,
}

pub(crate) fn read_text<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<TextFields> {
    if out_string(e.get(txn, "kind"))? != "text" {
        return None;
    }
    let Some(Out::YText(text)) = e.get(txn, "content") else {
        return None;
    };
    Some(TextFields {
        color: out_string(e.get(txn, "color"))?,
        size: out_f64(e.get(txn, "size"))? as f32,
        box_width: out_f64(e.get(txn, "boxWidth"))?,
        box_height: out_f64(e.get(txn, "boxHeight"))?,
        content: text.get_string(txn),
        text,
    })
}

/// Entrée de `SetText` (évite une fonction à neuf paramètres).
struct TextInput<'a> {
    page: &'a str,
    id: Option<&'a str>,
    x: f64,
    y: f64,
    content: &'a str,
    color: &'a str,
    size: f32,
    box_width: f64,
    box_height: f64,
}
```

  Dans `apply`, le bras :

```rust
            Command::SetText {
                page,
                id,
                x,
                y,
                content,
                color,
                size,
                box_width,
                box_height,
            } => self.cmd_set_text(TextInput {
                page: &page,
                id: id.as_deref(),
                x,
                y,
                content: &content,
                color: &color,
                size,
                box_width,
                box_height,
            }),
```

  et dans `impl Document` :

```rust
    /// Une validation de texte = une transaction (D14) ; texte invalide, page ou élément inconnus : erreur sans écriture ;
    /// boîte neuve vide ou texte inchangé : aucune transaction (CL4-6, D38) ; texte existant vidé : élément retiré.
    fn cmd_set_text(&mut self, t: TextInput<'_>) -> Result<Change, CommandError> {
        let finite_pos = |v: f64| v.is_finite() && v > 0.0;
        if !positive(t.size)
            || !finite_pos(t.box_width)
            || !finite_pos(t.box_height)
            || !t.x.is_finite()
            || !t.y.is_finite()
        {
            return Err(CommandError::BadText);
        }
        let Some(id) = t.id else {
            return self.insert_text(&t);
        };
        let (found, current) = {
            let txn = self.read();
            let unknown = || CommandError::UnknownElement(id.to_string());
            let found = self.find_element(&txn, id).ok_or_else(unknown)?;
            let current = read_text(&txn, &found.element).ok_or_else(unknown)?;
            (found, current)
        };
        if t.content.is_empty() {
            {
                let mut txn = self.transact_local();
                found.elements.remove(&mut txn, found.index);
            }
            return Ok(self.done(Change {
                pages: vec![found.page_id],
                removed: vec![id.to_string()],
                ..Default::default()
            }));
        }
        let same = current.content == t.content
            && current.color == t.color
            && current.size == t.size
            && current.box_width == t.box_width
            && current.box_height == t.box_height;
        if same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let len = current.text.len(&txn);
            current.text.remove_range(&mut txn, 0, len);
            current.text.insert(&mut txn, 0, t.content);
            let e = &found.element;
            e.insert(&mut txn, "color", In::from(t.color));
            e.insert(&mut txn, "size", In::Any(Any::from(f64::from(t.size))));
            e.insert(&mut txn, "boxWidth", In::Any(Any::from(t.box_width)));
            e.insert(&mut txn, "boxHeight", In::Any(Any::from(t.box_height)));
        }
        Ok(self.done(Change {
            pages: vec![found.page_id],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }

    fn insert_text(&mut self, t: &TextInput<'_>) -> Result<Change, CommandError> {
        let elements = {
            let txn = self.read();
            self.page_elements(&txn, t.page)
        }
        .ok_or_else(|| CommandError::UnknownPage(t.page.to_string()))?;
        if t.content.is_empty() {
            return Ok(self.unchanged());
        }
        let id = yrs::uuid_v4().to_string();
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from("text")),
            ("transform", In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, t.x, t.y]))),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(f64::from(t.size)))),
            ("boxWidth", In::Any(Any::from(t.box_width))),
            ("boxHeight", In::Any(Any::from(t.box_height))),
            ("content", In::from(TextPrelim::new(t.content))),
        ];
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.done(Change {
            pages: vec![t.page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }
```

  Si `ok_or_else(unknown)` gêne l'emprunteur (fermeture appelée deux fois), écrire deux fermetures identiques.

- [ ] **5. `document.rs` : `element()` du texte.** Ajouter `read_text` à l'import de `crate::commands` et
  `TextView`, `StrokeStyle` à celui de `crate::element`, puis remplacer le calcul de `(style, shape)` par :

```rust
        let (style, shape, text) = match kind.as_str() {
            "shape" => {
                let s = read_shape(&txn, e)?;
                let view = ShapeView {
                    shape: s.kind.as_str().to_string(),
                    w: s.w,
                    h: s.h,
                    fill: s.fill,
                };
                (s.style, Some(view), None)
            }
            "text" => {
                let t = read_text(&txn, e)?;
                let view = TextView {
                    content: t.content,
                    size: t.size,
                    box_width: t.box_width,
                    box_height: t.box_height,
                };
                (StrokeStyle { color: t.color, width: 0.0 }, None, Some(view))
            }
            _ => (read_style(&txn, e)?, None, None),
        };
```

  et ajouter `text,` dans la construction d'`ElementView`.

- [ ] **6. Vérifier les commandes.** `cargo test -p roomboard-core set_text 2>&1 | tail -4` → `6 passed`.

- [ ] **7. Test rouge de la lecture.** Dans `query.rs`, module `tests` :

```rust
    #[test]
    fn hit_test_and_bounds_include_text() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .apply(Command::SetText {
                page: p.clone(),
                id: None,
                x: 100.0,
                y: 200.0,
                content: "Bonjour".into(),
                color: "#000000".into(),
                size: 36.0,
                box_width: 600.0,
                box_height: 45.0,
            })
            .expect("texte")
            .ids[0]
            .clone();
        assert_eq!(d.hit_test(&p, 300.0, 220.0, 1.0), Some(id.clone()));
        assert_eq!(
            d.bounds(&[id]),
            Some(Bounds { x0: 100.0, y0: 200.0, x1: 700.0, y1: 245.0 })
        );
    }
```

  `cargo test -p roomboard-core hit_test_and_bounds_include_text 2>&1 | tail -4` → `FAILED` (le texte n'a pas de
  géométrie).

- [ ] **8. `query.rs` : géométrie du texte.** Imports : `read_text` (de `crate::commands`), `box_polygon` (de
  `crate::shape`). Dans `element_geom`, juste après `let transform = out_transform(e.get(txn, "transform"))?;` :

```rust
        if let Some(t) = read_text(txn, e) {
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(t.box_width, t.box_height).into(),
            });
        }
```

  Revérifier : la commande de l'étape 7 → `1 passed`.

- [ ] **9. Scénarios rouges.** Dans `crates/roomboard-core/tests/scenarios.rs`, ajouter aux imports
  `use roomboard_core::query::Bounds;` et `use roomboard_core::shape::ShapeKind;`, puis :

```rust
#[test]
fn s3_text_stroke_shape_survive_save_load() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d.apply(Command::AddPage { after: Some(p1.clone()) }).expect("p2").pages[0].clone();
    let p3 = d.apply(Command::AddPage { after: Some(p2.clone()) }).expect("p3").pages[0].clone();
    let t = d
        .apply(Command::SetText {
            page: p1.clone(),
            id: None,
            x: 200.0,
            y: 300.0,
            content: "Bonjour".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
        })
        .expect("texte")
        .ids[0]
        .clone();
    let s = commit(&mut d, &p2, hline(500.0));
    let r = d
        .apply(Command::AddShape {
            page: p3.clone(),
            shape: ShapeKind::Rect,
            x0: 100.0,
            y0: 100.0,
            x1: 400.0,
            y1: 300.0,
            style: pen(),
            fill: None,
        })
        .expect("rect")
        .ids[0]
        .clone();

    let mut e = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(e.page_ids(), vec![p1.clone(), p2.clone(), p3.clone()]);
    assert_eq!(e.element_ids(&p1), vec![t.clone()]);
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);
    assert_eq!(e.element_ids(&p3), vec![r.clone()]);
    for id in [&t, &s, &r] {
        assert_eq!(e.element(id), d.element(id), "élément {id}");
    }
    assert_eq!(
        e.element(&t).and_then(|v| v.text).map(|x| x.content),
        Some("Bonjour".to_string())
    );
    e.apply(Command::RemovePage { page: p2.clone() }).expect("retrait");
    assert!(e.undo());
    assert_eq!(e.element_ids(&p2), vec![s]);
}

#[test]
fn s4_transform_two_elements_then_undo_twice() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    commit(&mut d, &p, hline(100.0));
    d.apply(Command::AddShape {
        page: p.clone(),
        shape: ShapeKind::Rect,
        x0: 600.0,
        y0: 600.0,
        x1: 800.0,
        y1: 700.0,
        style: pen(),
        fill: None,
    })
    .expect("rect");
    let ids = d.ids_in_rect(&p, Bounds { x0: 0.0, y0: 0.0, x1: 1000.0, y1: 1000.0 });
    assert_eq!(ids.len(), 2);
    let start = d.bounds(&ids).expect("bornes");
    d.apply(Command::Transform { ids: ids.clone(), matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 0.0] })
        .expect("déplacer");
    let moved = d.bounds(&ids).expect("bornes");
    assert!((moved.x0 - start.x0 - 100.0).abs() < 1e-6);
    d.apply(Command::Transform {
        ids: ids.clone(),
        matrix: [2.0, 0.0, 0.0, 2.0, -moved.x0, -moved.y0],
    })
    .expect("agrandir");
    let big = d.bounds(&ids).expect("bornes");
    assert!(((big.x1 - big.x0) - 2.0 * (moved.x1 - moved.x0)).abs() < 1e-6);
    assert!(d.undo());
    assert!(d.undo());
    assert_eq!(d.bounds(&ids), Some(start), "deux annulations : état de départ (une étape par geste)");
}
```

  `cargo test -p roomboard-core --test scenarios 2>&1 | tail -6` → les 2 neufs `ok` (le code des étapes 3-8 les
  porte déjà ; s'ils échouent, corriger le code, jamais le test).

- [ ] **10. Vérifier la tâche.** Commande bornée de la section → 9 noms `ok` ; `cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5`
  sans `error` ; `cd ~/projets/roomboard-wt/socle--T49 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **11. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T49
git add crates/roomboard-core/src/element.rs crates/roomboard-core/src/commands.rs crates/roomboard-core/src/query.rs crates/roomboard-core/src/document.rs crates/roomboard-core/tests/scenarios.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): SetText on Y.Text, text reads, S3 and S4 core scenarios (T49)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t50"></a>
### Tâche T50 — Rendu : formes, texte et calque d'édition sur la scène

**Objectif.** La scène Canvas 2D dessine les trois types d'élément (trait inchangé, forme, texte) et, après eux, le
calque d'édition : éléments en fantôme avec leur matrice provisoire, formes en cours, rectangle de sélection, cadre et
8 poignées (CL4-1, D13, D14, D15, D38). Le rendu WebGL2 transmet le calque à sa scène Canvas 2D : une seule
implémentation pour les deux réglages de l'échelon 4.

**Fichiers.**
- Modifier : `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`,
  `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/webgl2.ts`,
  `apps/web/src/engine/render/webgl2.test.ts`

**Interfaces.**
- Consomme (T46) : `ElementView` en union, `ShapeData`, `TextData` (`core/api.ts`) ; `normalizeShape`
  (`core/shapes.ts`) ; `EditOverlay`, `EMPTY_OVERLAY` (`engine/render/overlay.ts`). (T48) : `handlesOf`, `HANDLE_PX`
  (`engine/tools/handles.ts`) ; `layoutText`, `textFont`, `TEXT_LINE_HEIGHT`, `Measure` (`engine/text-layout.ts`).
- Produit : `Renderer.drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void`
  (le 4ᵉ paramètre est facultatif : les faux rendus existants restent valides) ; dans `canvas2d.ts` :
  `export function arrowHead(w: number, h: number, width: number): [number, number, number, number] | null`,
  `export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number): void`,
  `export const SELECTION_COLOR = "#1e3a8a"`, `BAND_FILL = "rgba(30, 58, 138, 0.08)"`, `HANDLE_FILL = "#ffffff"`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts` `Canvas2DRenderer` — étendu derrière `Renderer` (DA2,
  cadrage ligne « Rendu ») ; `pathOf` et le cache `Path2D` des traits gardés tels quels.
- Réutilise : `apps/web/src/engine/render/webgl2.ts` `WebGL2LiveRenderer.drawScene` — délègue déjà à la scène
  Canvas 2D (`webgl2.ts:290-292`) ; seul le 4ᵉ argument est transmis.

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T50 && pnpm --filter @roomboard/web exec vitest run src/engine/render --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -60`
— attendu : aucun `×`, `Tests  N passed` (N = existants + 8), présents : `calque d'édition : fantômes, formes, cadre, poignées, rectangle`,
`texte : une ligne par fillText`, `drawScene passe le calque d'édition à la scène Canvas 2D`. Tests à garder verts :
tous ceux de `canvas2d.test.ts`, `webgl2.test.ts`, `select.test.ts`, `ink-trail.test.ts` (même dossier).

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T50` (créé par l'orchestrateur depuis `feat/socle-lot4`, T46 et T48
  fusionnées) ; neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement : `drawLive`,
  `paintStroke`, `paintEraser` et tout le WebGL2 de `drawLive` restent identiques.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Peindre le calque d'édition dans `drawLive` (CL4-1). Toucher `engine.ts` (T55). Changer l'ordre
`save` → `transform` → `fill` → `restore` d'un trait (tests existants).

**Terminé quand** la commande bornée est verte, `tsc --noEmit` sans erreur, `scripts/verifier.sh` rend
`verifier.sh : OK`, et le rapport porte `Réutilisation : appelé Canvas2DRenderer (étendu)` et
`Réutilisation : appelé WebGL2LiveRenderer.drawScene (transmis)`.

**Étapes.**

- [ ] **1. Tests rouges du rendu.** Dans `canvas2d.test.ts`, compléter `FakeCtx` (après `stroke()`) :

```ts
  font = "";
  textBaseline = "alphabetic";
  ellipse(): void { this.log.push("ellipse"); }
  fillText(text: string, x: number, y: number): void { this.log.push(`fillText ${text} ${x},${y}`); }
  measureText(text: string): { width: number } { return { width: text.length * 10 }; }
  setLineDash(d: number[]): void { this.log.push(`setLineDash ${d.join(",")}`); }
```

  puis ajouter, avec `import type { ElementView } from "../../core/api";`, `import { EMPTY_OVERLAY } from "./overlay";`
  et `arrowHead` à l'import de `./canvas2d` :

```ts
const VIEWS: Record<string, ElementView> = {
  a: { id: "a", kind: "stroke", transform: [1, 0, 0, 1, 5, 6], style: { color: "#000000", width: 4 } },
  r: { id: "r", kind: "shape", transform: [1, 0, 0, 1, 10, 20], style: { color: "#1e40af", width: 4 }, shape: { shape: "rect", w: 200, h: 100, fill: null } },
  e: { id: "e", kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color: "#1e40af", width: 4 }, shape: { shape: "ellipse", w: 50, h: 30, fill: "#ff0000" } },
  f: { id: "f", kind: "shape", transform: [1, 0, 0, 1, 0, 0], style: { color: "#1e40af", width: 4 }, shape: { shape: "arrow", w: 100, h: 0, fill: null } },
  t: { id: "t", kind: "text", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 }, text: { content: "un deux\ntrois", size: 20, boxWidth: 1000, boxHeight: 50 } },
};

function makeViews() {
  const src: SceneSource = { element: (id) => VIEWS[id] ?? null, outline: (id) => (id === "a" ? square : null) };
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D });
  const after = (marker: string): string[] => scene.log.slice(scene.log.indexOf(marker));
  return { r, scene, after };
}

describe("Canvas2DRenderer — lot 4 (formes, texte, calque)", () => {
  it("forme : rectangle tracé dans son repère, contour à l'épaisseur du style, sans remplissage", () => {
    const { r, after } = makeViews();
    r.drawScene({ id: "p", elementIds: ["r"] }, IDENTITY, new Set());
    const tail = after("transform 1,0,0,1,10,20");
    expect(tail.slice(0, 4)).toEqual(["transform 1,0,0,1,10,20", "beginPath", "rect", "stroke #1e40af 4"]);
    expect(tail.some((l) => l.startsWith("fill "))).toBe(false);
  });

  it("forme remplie : ellipse, fill de la couleur de remplissage puis stroke", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["e"] }, IDENTITY, new Set());
    const i = scene.log.indexOf("ellipse");
    expect(i).toBeGreaterThan(0);
    expect(scene.log.slice(i + 1, i + 3)).toEqual(["fill #ff0000", "stroke #1e40af 4"]);
  });

  it("flèche : segment puis pointe (deux moveTo, trois lineTo)", () => {
    const { r, after } = makeViews();
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    const tail = after("transform 1,0,0,1,0,0");
    expect(tail.filter((l) => l === "moveTo")).toHaveLength(2);
    expect(tail.filter((l) => l === "lineTo")).toHaveLength(3);
  });

  it("arrowHead : pointe à ±25° derrière la fin, longueur max(12, 3 × épaisseur)", () => {
    const a = (25 * Math.PI) / 180;
    const head = arrowHead(100, 0, 4);
    expect(head).not.toBeNull();
    const [x1, y1, x2, y2] = head ?? [0, 0, 0, 0];
    expect(x1).toBeCloseTo(100 - 12 * Math.cos(a));
    expect(x2).toBeCloseTo(100 - 12 * Math.cos(a));
    expect(Math.abs(y1)).toBeCloseTo(12 * Math.sin(a));
    expect(y2).toBeCloseTo(-y1);
    expect(Math.hypot(100 - (arrowHead(100, 0, 10)?.[0] ?? 0), arrowHead(100, 0, 10)?.[1] ?? 0)).toBeCloseTo(30);
    expect(arrowHead(0, 0, 4)).toBeNull();
  });

  it("texte : une ligne par fillText, interligne 1,25, police à la taille", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["t"] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("fillText"))).toEqual(["fillText un deux 0,0", "fillText trois 0,25"]);
    expect(scene.font).toBe('20px "Atkinson Hyperlegible", system-ui, sans-serif');
  });

  it("calque d'édition : fantômes, formes, cadre, poignées, rectangle", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set(), {
      ghosts: [{ id: "a", matrix: [1, 0, 0, 1, 100, 0] }],
      shapes: [{ shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: { color: "#000000", width: 4 }, fill: null }],
      frame: { x0: 0, y0: 0, x1: 50, y1: 50 },
      handles: true,
      band: { x0: 1, y0: 1, x1: 2, y1: 2 },
    });
    const g = scene.log.indexOf("transform 1,0,0,1,100,0");
    expect(scene.log[g + 1]).toBe("transform 1,0,0,1,5,6");
    expect(scene.log).toContain("transform 1,0,0,1,100,50");
    expect(scene.log.filter((l) => l === "rect")).toHaveLength(1 + 1 + 1 + 8);
    expect(scene.log.filter((l) => l.startsWith("setLineDash"))).toEqual(["setLineDash 4,4", "setLineDash 6,4", "setLineDash "]);
  });

  it("élément masqué : absent de la scène, présent une fois en fantôme", () => {
    const { r, scene } = makeViews();
    r.drawScene({ id: "p", elementIds: ["a"] }, IDENTITY, new Set(["a"]), {
      ...EMPTY_OVERLAY,
      ghosts: [{ id: "a", matrix: [2, 0, 0, 2, 0, 0] }],
    });
    expect(scene.log.filter((l) => l === "transform 1,0,0,1,5,6")).toHaveLength(1);
    expect(scene.log).toContain("transform 2,0,0,2,0,0");
  });
});
```

  Dans `webgl2.test.ts`, `FakeScene` : remplacer `drawScene(page: PageView): void { … }` par

```ts
  readonly overlays: unknown[] = [];
  drawScene(page: PageView, _camera?: Camera, _hidden?: ReadonlySet<string>, overlay?: unknown): void {
    this.log.push(`scene ${page.id}`);
    this.overlays.push(overlay);
  }
```

  et ajouter (avec `import { EMPTY_OVERLAY } from "./overlay";`) :

```ts
  it("drawScene passe le calque d'édition à la scène Canvas 2D", () => {
    const { scene, r } = make();
    const ov = { ...EMPTY_OVERLAY, handles: true, frame: { x0: 0, y0: 0, x1: 1, y1: 1 } };
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set<string>(), ov);
    expect(scene.overlays.at(-1)).toBe(ov);
  });
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/render 2>&1 | tail -8`
  — attendu : 8 `FAIL` (`arrowHead` non exporté, formes non dessinées, calque ignoré).

- [ ] **3. `renderer.ts`.** Ajouter `import type { EditOverlay } from "./overlay";` et remplacer la ligne de
  `drawScene` dans `interface Renderer` :

```ts
  /**
   * Scène fixe : pourtour, cadre de page, éléments sauf `hidden` (masqués pendant un aperçu, D38), puis le calque
   * d'édition (fantômes, formes en cours, sélection : CL4-1). `overlay` absent : rien.
   */
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void;
```

- [ ] **4. `canvas2d.ts` : imports et fonctions de forme et de texte.** Imports à ajouter :

```ts
import type { Bounds, ElementView, Matrix, ShapeData, StrokeStyle, TextData } from "../../core/api";
import { normalizeShape } from "../../core/shapes";
import { layoutText, textFont, TEXT_LINE_HEIGHT, type Measure } from "../text-layout";
import { HANDLE_PX, handlesOf } from "../tools/handles";
import { EMPTY_OVERLAY, type EditOverlay } from "./overlay";
```

  (garder `import type { Change } …` existant en le fusionnant avec la ligne ci-dessus). Après `PEN_HALF_WIDTH` :

```ts
export const SELECTION_COLOR = "#1e3a8a";
export const BAND_FILL = "rgba(30, 58, 138, 0.08)";
export const HANDLE_FILL = "#ffffff";

/** Pointe de flèche (D13) : deux branches de longueur max(12, 3 × épaisseur) à ±25° derrière la fin du segment. */
export function arrowHead(w: number, h: number, width: number): [number, number, number, number] | null {
  const len = Math.hypot(w, h);
  if (len < 1e-9) return null;
  const l = Math.max(12, 3 * width);
  const back = Math.atan2(-h, -w);
  const a = (25 * Math.PI) / 180;
  return [w + l * Math.cos(back + a), h + l * Math.sin(back + a), w + l * Math.cos(back - a), h + l * Math.sin(back - a)];
}

/** Chemin d'une forme dans son repère local (boîte (0, 0)-(w, h) ou segment (0, 0)-(w, h)). */
export function traceShape(ctx: CanvasRenderingContext2D, s: ShapeData, width: number): void {
  ctx.beginPath();
  if (s.shape === "rect") {
    ctx.rect(0, 0, s.w, s.h);
  } else if (s.shape === "ellipse") {
    ctx.ellipse(s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(0, 0);
    ctx.lineTo(s.w, s.h);
    const head = s.shape === "arrow" ? arrowHead(s.w, s.h, width) : null;
    if (head) {
      ctx.moveTo(head[0], head[1]);
      ctx.lineTo(s.w, s.h);
      ctx.lineTo(head[2], head[3]);
    }
  }
}

function paintShape(ctx: CanvasRenderingContext2D, s: ShapeData, style: StrokeStyle): void {
  traceShape(ctx, s, style.width);
  if (s.fill !== null && (s.shape === "rect" || s.shape === "ellipse")) {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

/** Texte (D14, CL4-4) : mêmes lignes que la hauteur de boîte mesurée par l'outil (`layoutText`). */
function paintText(ctx: CanvasRenderingContext2D, t: TextData, color: string): void {
  const measure: Measure = (s, size) => {
    ctx.font = textFont(size);
    return ctx.measureText(s).width;
  };
  const lines = layoutText(t.content, t.size, t.boxWidth, measure);
  ctx.font = textFont(t.size);
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, 0, i * t.size * TEXT_LINE_HEIGHT));
}
```

- [ ] **5. `canvas2d.ts` : la scène.** Remplacer `drawScene` de `Canvas2DRenderer` et ajouter deux méthodes privées :

```ts
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay: EditOverlay = EMPTY_OVERLAY): void {
    const ctx = this.scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SURROUND_COLOR;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setView(ctx, camera);
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (el) this.paintElement(ctx, el, null);
    }
    this.paintOverlay(ctx, overlay, camera.zoom);
  }

  /** Un élément dans son repère ; `pre` : matrice provisoire posée avant la sienne (fantôme, D38). */
  private paintElement(ctx: CanvasRenderingContext2D, el: ElementView, pre: Matrix | null): void {
    const path = el.kind === "stroke" ? this.pathOf(el.id) : null;
    if (el.kind === "stroke" && !path) return;
    ctx.save();
    if (pre) ctx.transform(pre[0], pre[1], pre[2], pre[3], pre[4], pre[5]);
    const [a, b, c, d, e, f] = el.transform;
    ctx.transform(a, b, c, d, e, f);
    if (el.kind === "stroke" && path) {
      ctx.fillStyle = el.style.color;
      ctx.fill(path, "nonzero");
    } else if (el.kind === "shape") {
      paintShape(ctx, el.shape, el.style);
    } else if (el.kind === "text") {
      paintText(ctx, el.text, el.style.color);
    }
    ctx.restore();
  }

  /** Calque d'édition (CL4-1), en coordonnées monde ; traits du cadre à 1 px écran. */
  private paintOverlay(ctx: CanvasRenderingContext2D, o: EditOverlay, zoom: number): void {
    for (const g of o.ghosts) {
      const el = this.source.element(g.id);
      if (el) this.paintElement(ctx, el, g.matrix);
    }
    for (const s of o.shapes) {
      const n = normalizeShape(s.shape, s.x0, s.y0, s.x1, s.y1);
      ctx.save();
      ctx.transform(1, 0, 0, 1, n.tx, n.ty);
      paintShape(ctx, { shape: s.shape, w: n.w, h: n.h, fill: s.fill }, s.style);
      ctx.restore();
    }
    const px = 1 / zoom;
    const box = (b: Bounds): void => {
      ctx.beginPath();
      ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    };
    if (o.band) {
      ctx.save();
      ctx.fillStyle = BAND_FILL;
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 4 * px]);
      box(o.band);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (o.frame) {
      ctx.save();
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([6 * px, 4 * px]);
      box(o.frame);
      ctx.stroke();
      if (o.handles) {
        ctx.setLineDash([]);
        ctx.fillStyle = HANDLE_FILL;
        const half = (HANDLE_PX / 2) * px;
        for (const h of handlesOf(o.frame)) {
          ctx.beginPath();
          ctx.rect(h.x - half, h.y - half, 2 * half, 2 * half);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
```

- [ ] **6. `webgl2.ts`.** Ajouter `import type { EditOverlay } from "./overlay";` et remplacer `drawScene` :

```ts
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void {
    this.scene.drawScene(page, camera, hidden, overlay);
  }
```

- [ ] **7. Vérifier.** Commande bornée de la section → aucun `×` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur ; `cd ~/projets/roomboard-wt/socle--T50 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **8. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T50
git add apps/web/src/engine/render/renderer.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/render/webgl2.ts apps/web/src/engine/render/webgl2.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(render): draw shapes, text and the edit overlay on the scene (T50)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t51"></a>
### Tâche T51 — Outil Sélection : clic, rectangle, Maj, déplacer, redimensionner

**Objectif.** L'outil Sélection (D15, D38, CL4-10, CL4-11, CL4-14) : clic = l'élément le plus haut à 6 px écran ;
Maj+clic ajoute ou retire ; glisser dans le vide = rectangle (éléments entièrement inclus), Maj l'ajoute ; glisser un
élément le déplace (en le sélectionnant s'il ne l'était pas) ; une poignée le redimensionne autour de la poignée
opposée (Maj : proportions). Aperçu par le calque (fantômes, cadre, poignées, rectangle), une seule `Transform` au
relâché ; un clic sans glisser, `cancel` et `abort` n'écrivent rien.

**Fichiers.**
- Créer : `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/select.test.ts`

**Interfaces.**
- Consomme (T46) : `SelectionTool`, `ToolContext` (dont `shift?()`), `LivePart` (`overlay`) de `tools/tool.ts` ;
  `EMPTY_OVERLAY`, `EditOverlay` de `render/overlay.ts` ; commandes `Transform`, `AddShape` (tests) et la fausse
  liaison `fakeCore` (`hitTest`, `idsInRect`, `bounds`, `elementIds`). (T48) : `HANDLE_GRAB_PX`, `hitHandle`,
  `handlePoint`, `isIdentity`, `resizeMatrix`, `transformBounds`, `translateMatrix`, `HandleId` de `tools/handles.ts`.
- Produit : `export const SELECT_TOL_PX = 6`, `export const DRAG_THRESHOLD_PX = 2`,
  `export function createSelectTool(ctx: ToolContext): SelectionTool`.
- Réutilise : `apps/web/src/engine/camera.ts` — `screenToWorld(c, sx, sy)`.
- Réutilise : `apps/web/src/engine/tools/tool.ts` — contrat `GestureTool` tel que le stylo et la gomme le suivent
  (`tools/eraser.ts` : une écriture au relâché, rien sur `cancel` / `abort`).

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T51 && pnpm --filter @roomboard/web exec vitest run src/engine/tools/select.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -20`
— attendu : `Tests  10 passed`, aucun `×`, dont `un clic sans glisser n'écrit rien` et
`poignée de coin : Transform d'échelle autour du coin opposé`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T51` (créé par l'orchestrateur depuis `feat/socle-lot4`, T46 et T48
  fusionnées) ; neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Écrire dans le document avant le relâché (D38) ; plus d'une commande par geste ; toucher un autre
fichier que les deux de la tâche.

**Terminé quand** la commande bornée rend 10 tests verts nommés, `tsc --noEmit` sans erreur, `scripts/verifier.sh`
rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé screenToWorld` et
`Réutilisation : appelé contrat GestureTool (tool.ts)`.

**Étapes.**

- [ ] **1. Tests rouges.** Créer `apps/web/src/engine/tools/select.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { createSelectTool } from "./select";
import type { SelectionTool, ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });

function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shift = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    shift: () => shift,
  };
  const tool = createSelectTool(ctx);
  const rect = (x0: number, y0: number, x1: number, y1: number): string =>
    doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
  return { doc, tool, runs, rect, setShift: (v: boolean) => { shift = v; } };
}

function gesture(tool: SelectionTool, pts: [number, number][], how: CloseReason = "end", id = 1): void {
  const [first, ...rest] = pts;
  if (!first) return;
  tool.begin(id, [at(first[0], first[1])]);
  for (const [x, y] of rest) tool.extend(id, [at(x, y)], []);
  tool.close(id, how);
}

describe("outil Sélection (D15, D38)", () => {
  it("clic sur un élément : il est sélectionné, sans écriture", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([a]);
    expect(runs).toEqual([]);
  });

  it("un clic sans glisser n'écrit rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [151, 150]]);
    expect(runs).toEqual([]);
  });

  it("glisser un élément : aperçu sans écriture, puis une Transform de translation au relâché", () => {
    const { doc, tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    tool.begin(1, [at(150, 150)]);
    tool.extend(1, [at(250, 180)], []);
    const live = tool.live();
    expect([...live.hidden]).toEqual([a]);
    expect(live.overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(live.overlay?.frame).toEqual({ x0: 198, y0: 128, x1: 302, y1: 232 });
    expect(runs).toEqual([]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 100, 30] }]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 200, 130]);
    expect(tool.live().hidden.size).toBe(0);
  });

  it("glisser un élément non sélectionné : le sélectionne et le déplace dans le même geste", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    gesture(tool, [[450, 150], [460, 150]]);
    expect(tool.selection()).toEqual([b]);
    expect(runs).toEqual([{ type: "Transform", ids: [b], matrix: [1, 0, 0, 1, 10, 0] }]);
    expect(tool.selection()).not.toContain(a);
  });

  it("Maj+clic ajoute puis retire", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[450, 150]]);
    expect(tool.selection()).toEqual([a, b]);
    gesture(tool, [[150, 150]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("rectangle dans le vide : éléments entièrement inclus, rectangle en aperçu", () => {
    const { tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    rect(400, 100, 500, 200);
    tool.begin(1, [at(50, 50)]);
    tool.extend(1, [at(300, 300)], []);
    expect(tool.live().overlay?.band).toEqual({ x0: 50, y0: 50, x1: 300, y1: 300 });
    tool.close(1, "end");
    expect(tool.selection()).toEqual([a]);
  });

  it("Maj + rectangle ajoute à la sélection ; rectangle sans Maj la remplace", () => {
    const { tool, rect, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    gesture(tool, [[150, 150]]);
    setShift(true);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([a, b]);
    setShift(false);
    gesture(tool, [[350, 50], [600, 300]]);
    expect(tool.selection()).toEqual([b]);
  });

  it("poignée de coin : Transform d'échelle autour du coin opposé", () => {
    const { tool, runs, rect } = setup();
    const a = rect(100, 100, 200, 200); // bornes 98..202 (demi-épaisseur 2)
    gesture(tool, [[150, 150]]);
    gesture(tool, [[202, 202], [306, 306]]);
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [2, 0, 0, 2, -98, -98] }]);
  });

  it("cancel et abort n'écrivent rien", () => {
    const { tool, runs, rect } = setup();
    rect(100, 100, 200, 200);
    gesture(tool, [[150, 150], [250, 150]], "cancel");
    gesture(tool, [[150, 150], [250, 150]], "abort");
    expect(runs).toEqual([]);
    expect(tool.active()).toBe(false);
  });

  it("prune retire les ids absents ; leave vide la sélection ; cadre et poignées au repos", () => {
    const { doc, tool, rect } = setup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    tool.setSelection([a, b]);
    expect(tool.live().overlay).toMatchObject({ handles: true, frame: { x0: 98, y0: 98, x1: 502, y1: 202 } });
    doc.apply({ type: "Delete", ids: [b] });
    tool.prune();
    expect(tool.selection()).toEqual([a]);
    tool.leave?.("tool");
    expect(tool.selection()).toEqual([]);
    expect(tool.live().overlay).toBeUndefined();
  });
});
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/tools/select.test.ts 2>&1 | tail -4`
  — attendu : `Failed to resolve import "./select"`.

- [ ] **3. Écrire `engine/tools/select.ts`.**

```ts
/**
 * Outil Sélection (D15, D38, CL4-10, CL4-11) : clic = l'élément le plus haut (6 px écran), Maj = ajouter ou retirer,
 * glisser dans le vide = rectangle (éléments entièrement inclus), glisser un élément = le déplacer, 8 poignées =
 * redimensionner autour de la poignée opposée (Maj : proportions). Aperçu : éléments masqués de la scène et redessinés
 * en fantômes avec la matrice provisoire (CL4-1) ; une seule Transform au relâché ; "cancel" et "abort" n'écrivent
 * rien (D39) ; un clic sans glisser (< 2 px écran) non plus. Un seul pointeur à la fois (CL4-14).
 */
import type { Bounds, Matrix } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import type { InputSample } from "../input/sampler";
import { EMPTY_OVERLAY, type EditOverlay } from "../render/overlay";
import {
  HANDLE_GRAB_PX,
  handlePoint,
  hitHandle,
  isIdentity,
  resizeMatrix,
  transformBounds,
  translateMatrix,
  type HandleId,
} from "./handles";
import type { LivePart, SelectionTool, ToolContext } from "./tool";

export const SELECT_TOL_PX = 6;
export const DRAG_THRESHOLD_PX = 2;

type Mode = "move" | "resize" | "band" | "none";

interface Drag {
  readonly pointerId: number;
  readonly mode: Mode;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly handle: HandleId | null;
  readonly base: Bounds | null;
  readonly shift: boolean;
}

const NONE: ReadonlySet<string> = new Set<string>();
const IDENT: Matrix = [1, 0, 0, 1, 0, 0];
const norm = (ax: number, ay: number, bx: number, by: number): Bounds => ({
  x0: Math.min(ax, bx),
  y0: Math.min(ay, by),
  x1: Math.max(ax, bx),
  y1: Math.max(ay, by),
});

export function createSelectTool(ctx: ToolContext): SelectionTool {
  let selection: string[] = [];
  let drag: Drag | null = null;

  const world = (s: InputSample): [number, number] => screenToWorld(ctx.camera(), s.x, s.y);
  const moved = (d: Drag): boolean => Math.hypot(d.x - d.x0, d.y - d.y0) * d.zoom >= DRAG_THRESHOLD_PX;

  /** Matrice provisoire du glisser ; identité tant que le seuil n'est pas franchi. */
  const matrixOf = (d: Drag): Matrix => {
    if (!moved(d)) return IDENT;
    if (d.mode === "move") return translateMatrix(d.x - d.x0, d.y - d.y0);
    if (d.mode === "resize" && d.base && d.handle) {
      const [gx, gy] = handlePoint(d.base, d.handle);
      return resizeMatrix(d.base, d.handle, gx + d.x - d.x0, gy + d.y - d.y0, ctx.shift?.() === true);
    }
    return IDENT;
  };

  const startDrag = (pointerId: number, mode: Mode, x: number, y: number, extra: { handle?: HandleId; base?: Bounds } = {}): void => {
    drag = {
      pointerId,
      mode,
      x0: x,
      y0: y,
      x,
      y,
      zoom: ctx.camera().zoom,
      handle: extra.handle ?? null,
      base: extra.base ?? null,
      shift: ctx.shift?.() === true,
    };
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (drag !== null || !s) return;
      const [x, y] = world(s);
      const zoom = ctx.camera().zoom;
      const shift = ctx.shift?.() === true;
      const frame = selection.length > 0 ? ctx.doc.bounds(selection) : null;
      if (frame && !shift) {
        const h = hitHandle(frame, x, y, HANDLE_GRAB_PX / zoom);
        if (h) {
          startDrag(pointerId, "resize", x, y, { handle: h, base: frame });
          return;
        }
      }
      const hit = ctx.doc.hitTest(ctx.page(), x, y, SELECT_TOL_PX / zoom);
      if (hit !== null) {
        if (shift) {
          selection = selection.includes(hit) ? selection.filter((id) => id !== hit) : [...selection, hit];
          startDrag(pointerId, "none", x, y);
          return;
        }
        if (!selection.includes(hit)) selection = [hit];
        startDrag(pointerId, "move", x, y);
        return;
      }
      if (!shift) selection = [];
      startDrag(pointerId, "band", x, y);
    },
    extend(pointerId, samples) {
      const s = samples[samples.length - 1];
      if (!drag || drag.pointerId !== pointerId || !s) return;
      const [x, y] = world(s);
      drag.x = x;
      drag.y = y;
    },
    frame() {
      // rien à pousser : l'aperçu se calcule dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drag;
      if (!d || d.pointerId !== pointerId) return;
      drag = null;
      if (how !== "end") return;
      if (d.mode === "band") {
        const ids = ctx.doc.idsInRect(ctx.page(), norm(d.x0, d.y0, d.x, d.y));
        selection = d.shift ? [...selection, ...ids.filter((id) => !selection.includes(id))] : ids;
        return;
      }
      if (d.mode === "none" || selection.length === 0) return;
      const m = matrixOf(d);
      if (isIdentity(m)) return;
      ctx.run({ type: "Transform", ids: [...selection], matrix: m });
    },
    live(): LivePart {
      const d = drag;
      if (d && d.mode === "band") {
        return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, band: norm(d.x0, d.y0, d.x, d.y) } };
      }
      if (selection.length === 0) return { strokes: [], erasers: [], hidden: NONE };
      const bounds = ctx.doc.bounds(selection);
      const m = d && (d.mode === "move" || d.mode === "resize") ? matrixOf(d) : IDENT;
      const dragging = !isIdentity(m);
      const overlay: EditOverlay = {
        ...EMPTY_OVERLAY,
        ghosts: dragging ? selection.map((id) => ({ id, matrix: m })) : [],
        frame: bounds === null ? null : dragging ? transformBounds(m, bounds) : bounds,
        handles: !dragging,
      };
      return { strokes: [], erasers: [], hidden: dragging ? new Set(selection) : NONE, overlay };
    },
    active: () => drag !== null,
    selection: () => selection,
    setSelection(ids) {
      selection = [...ids];
    },
    prune() {
      const present = new Set(ctx.doc.elementIds(ctx.page()));
      selection = selection.filter((id) => present.has(id));
    },
    leave() {
      selection = [];
      drag = null;
    },
  };
}
```

- [ ] **4. Vérifier.** Commande bornée de la section → `Tests  10 passed` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur (si TS ne voit pas `drag` comme `Drag` après le test `!drag` dans `extend`, passer par une variable
  locale `const d = drag;`) ; `cd ~/projets/roomboard-wt/socle--T51 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T51
git add apps/web/src/engine/tools/select.ts apps/web/src/engine/tools/select.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(tools): selection tool with click, band, shift, move and resize handles (T51)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t52"></a>
### Tâche T52 — Outil Formes : rectangle, ellipse, ligne, flèche, Maj

**Objectif.** Un outil de geste par forme (D13, D38, CL4-7) : glisser dessine l'aperçu dans le calque, le relâché
écrit une seule `AddShape` (couleur et épaisseur du stylo, sans remplissage) ; Maj : carré, cercle, angle par pas de
15° ; plus petit que 4 px écran sur les deux axes, `cancel` et `abort` : rien d'écrit.

**Fichiers.**
- Créer : `apps/web/src/engine/tools/shape.ts`, `apps/web/src/engine/tools/shape.test.ts`

**Interfaces.**
- Consomme (T46) : `ShapeKind`, `StrokeStyle`, commande `AddShape` (`core/api.ts`) ; `EMPTY_OVERLAY`, `ShapePreview`
  (`render/overlay.ts`) ; `GestureTool`, `LivePart`, `ToolContext` (`tools/tool.ts`) ; `fakeCore` (tests).
- Produit : `export const MIN_SHAPE_PX = 4`, `export const ANGLE_STEP_DEG = 15`,
  `export function constrainEnd(kind: ShapeKind, x0: number, y0: number, x1: number, y1: number): [number, number]`,
  `export function createShapeTool(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool`.
- Réutilise : `apps/web/src/engine/camera.ts` — `screenToWorld(c, sx, sy)`.
- Réutilise : `apps/web/src/engine/tools/tool.ts` — contrat `GestureTool` (même patron que `tools/pen.ts` : brouillon
  par `pointerId`, écriture au relâché).

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T52 && pnpm --filter @roomboard/web exec vitest run src/engine/tools/shape.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -15`
— attendu : `Tests  7 passed`, aucun `×`, dont `une AddShape au relâché, aperçu avant`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T52` (créé par l'orchestrateur depuis `feat/socle-lot4`, T46 fusionnée) ;
  neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Écrire avant le relâché ; normaliser les coins dans l'outil (le cœur le fait, l'aperçu passe par
`normalizeShape` au rendu) ; toucher un autre fichier.

**Terminé quand** la commande bornée rend 7 tests verts nommés, `tsc --noEmit` sans erreur, `scripts/verifier.sh`
rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé screenToWorld` et
`Réutilisation : appelé contrat GestureTool (tool.ts)`.

**Étapes.**

- [ ] **1. Tests rouges.** Créer `apps/web/src/engine/tools/shape.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { constrainEnd, createShapeTool } from "./shape";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const PEN = { color: "#1e40af", width: 4 };

function setup(zoom = 1) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let shift = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return doc.apply(cmd);
    },
    shift: () => shift,
  };
  return { doc, page, ctx, runs, setShift: (v: boolean) => { shift = v; } };
}

describe("outil Formes (D13, D38)", () => {
  it("constrainEnd : carré et cercle par le plus grand côté, signe gardé", () => {
    expect(constrainEnd("rect", 0, 0, 100, 40)).toEqual([100, 100]);
    expect(constrainEnd("ellipse", 0, 0, -30, 80)).toEqual([-80, 80]);
  });

  it("constrainEnd : ligne et flèche à 15° près, longueur gardée", () => {
    const [x, y] = constrainEnd("line", 0, 0, 100, 20);
    const len = Math.hypot(100, 20);
    expect(x).toBeCloseTo(len * Math.cos(Math.PI / 12));
    expect(y).toBeCloseTo(len * Math.sin(Math.PI / 12));
    expect(constrainEnd("arrow", 5, 5, 5, 5)).toEqual([5, 5]);
  });

  it("une AddShape au relâché, aperçu avant", () => {
    const { ctx, page, runs, doc } = setup();
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(300, 200)]);
    tool.extend(1, [at(100, 50)], []);
    expect(tool.active()).toBe(true);
    expect(tool.live().overlay?.shapes).toEqual([{ shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: PEN, fill: null }]);
    expect(runs).toEqual([]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "AddShape", page, shape: "rect", x0: 300, y0: 200, x1: 100, y1: 50, style: PEN, fill: null }]);
    expect(doc.elementIds(page)).toHaveLength(1);
    expect(tool.active()).toBe(false);
    expect(tool.live().overlay).toBeUndefined();
  });

  it("forme plus petite que 4 px écran sur les deux axes : rien d'écrit", () => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, "ellipse", () => PEN);
    tool.begin(1, [at(100, 100)]);
    tool.extend(1, [at(103, 102)], []);
    tool.close(1, "end");
    expect(runs).toEqual([]);
  });

  it("cancel et abort : rien d'écrit", () => {
    const { ctx, runs } = setup();
    const tool = createShapeTool(ctx, "line", () => PEN);
    for (const how of ["cancel", "abort"] as const) {
      tool.begin(1, [at(0, 0)]);
      tool.extend(1, [at(200, 0)], []);
      tool.close(1, how);
    }
    expect(runs).toEqual([]);
  });

  it("Maj pendant le tracé : carré écrit", () => {
    const { ctx, runs, setShift } = setup();
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(0, 0)]);
    tool.extend(1, [at(100, 40)], []);
    setShift(true);
    tool.close(1, "end");
    expect(runs[0]).toMatchObject({ x1: 100, y1: 100 });
  });

  it("zoom 2 : coins en coordonnées monde, seuil en px écran", () => {
    const { ctx, runs } = setup(2);
    const tool = createShapeTool(ctx, "arrow", () => PEN);
    tool.begin(1, [at(100, 100)]);
    tool.extend(1, [at(105, 100)], []);
    tool.close(1, "end");
    expect(runs[0]).toMatchObject({ shape: "arrow", x0: 50, y0: 50, x1: 52.5, y1: 50 });
  });
});
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/tools/shape.test.ts 2>&1 | tail -4`
  — attendu : `Failed to resolve import "./shape"`.

- [ ] **3. Écrire `engine/tools/shape.ts`.**

```ts
/**
 * Outil Formes (D13, D38, CL4-7) : rectangle, ellipse, ligne, flèche. Aperçu dans le calque d'édition (CL4-1), une
 * seule AddShape au relâché ; "cancel" et "abort" n'écrivent rien (D39). Maj : carré, cercle, angle par pas de 15°.
 * Couleur et épaisseur du stylo, sans remplissage. Plus petit que 4 px écran sur les deux axes : rien.
 */
import type { ShapeKind, StrokeStyle } from "../../core/api";
import { screenToWorld } from "../camera";
import type { CloseReason } from "../input/gesture";
import { EMPTY_OVERLAY, type ShapePreview } from "../render/overlay";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const MIN_SHAPE_PX = 4;
export const ANGLE_STEP_DEG = 15;

/** Bout contraint par Maj : carré ou cercle par le plus grand côté ; segment ramené au pas de 15°, longueur gardée. */
export function constrainEnd(kind: ShapeKind, x0: number, y0: number, x1: number, y1: number): [number, number] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (kind === "line" || kind === "arrow") {
    const len = Math.hypot(dx, dy);
    if (len === 0) return [x1, y1];
    const step = (ANGLE_STEP_DEG * Math.PI) / 180;
    const a = Math.round(Math.atan2(dy, dx) / step) * step;
    return [x0 + len * Math.cos(a), y0 + len * Math.sin(a)];
  }
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return [x0 + (dx < 0 ? -s : s), y0 + (dy < 0 ? -s : s)];
}

interface Draft {
  readonly page: string;
  readonly style: StrokeStyle;
  readonly x0: number;
  readonly y0: number;
  x1: number;
  y1: number;
  readonly zoom: number;
}

const NONE: ReadonlySet<string> = new Set<string>();

export function createShapeTool(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool {
  const drafts = new Map<number, Draft>();
  const end = (d: Draft): [number, number] =>
    ctx.shift?.() === true ? constrainEnd(kind, d.x0, d.y0, d.x1, d.y1) : [d.x1, d.y1];

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      const cam = ctx.camera();
      const [x, y] = screenToWorld(cam, s.x, s.y);
      drafts.set(pointerId, { page: ctx.page(), style: style(), x0: x, y0: y, x1: x, y1: y, zoom: cam.zoom });
    },
    extend(pointerId, samples) {
      const d = drafts.get(pointerId);
      const s = samples[samples.length - 1];
      if (!d || !s) return;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      d.x1 = x;
      d.y1 = y;
    },
    frame() {
      // aperçu calculé dans live()
    },
    close(pointerId: number, how: CloseReason) {
      const d = drafts.get(pointerId);
      if (!d) return;
      drafts.delete(pointerId);
      if (how !== "end") return;
      const [x1, y1] = end(d);
      if (Math.abs(x1 - d.x0) * d.zoom < MIN_SHAPE_PX && Math.abs(y1 - d.y0) * d.zoom < MIN_SHAPE_PX) return;
      ctx.run({ type: "AddShape", page: d.page, shape: kind, x0: d.x0, y0: d.y0, x1, y1, style: d.style, fill: null });
    },
    live(): LivePart {
      if (drafts.size === 0) return { strokes: [], erasers: [], hidden: NONE };
      const shapes: ShapePreview[] = [...drafts.values()].map((d) => {
        const [x1, y1] = end(d);
        return { shape: kind, x0: d.x0, y0: d.y0, x1, y1, style: d.style, fill: null };
      });
      return { strokes: [], erasers: [], hidden: NONE, overlay: { ...EMPTY_OVERLAY, shapes } };
    },
    active: () => drafts.size > 0,
    leave() {
      drafts.clear();
    },
  };
}
```

- [ ] **4. Vérifier.** Commande bornée → `Tests  7 passed` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur ; `cd ~/projets/roomboard-wt/socle--T52 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T52
git add apps/web/src/engine/tools/shape.ts apps/web/src/engine/tools/shape.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(tools): rectangle, ellipse, line and arrow tool with shift constraints (T52)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t53"></a>
### Tâche T53 — Outil Texte : session d'édition et composition IME

**Objectif.** L'outil Texte (D14, CL4-3 à CL4-6) ouvre une boîte au clic (nouvelle, ou le texte touché, masqué de la
scène pendant l'édition), confie la saisie à un hôte (la zone DOM de T56), et écrit une seule `SetText` à la
validation, avec la hauteur de boîte mesurée par `layoutText`. Pendant une composition IME, toute demande de
validation (Échap, clic ailleurs, perte du focus, outil ou page quittés) attend `compositionend` : rien n'est écrit
pendant la composition.

**Fichiers.**
- Créer : `apps/web/src/engine/tools/text.ts`, `apps/web/src/engine/tools/text.test.ts`

**Interfaces.**
- Consomme (T46) : `Matrix`, `TextElement`, commande `SetText` (`core/api.ts`) ; `GestureTool`, `LivePart`,
  `ToolContext`, `LeaveReason` (`tools/tool.ts`) ; `fakeCore` (tests). (T48) : `DEFAULT_TEXT_BOX_WIDTH`,
  `layoutText`, `textBoxHeight`, `Measure` (`engine/text-layout.ts`).
- Produit :
  - `export const TEXT_HIT_TOL_PX = 6` ;
  - `export interface TextStyle { readonly color: string; readonly size: number }` ;
  - `export interface TextEditSession { readonly page: string; readonly id: string | null; readonly matrix: Matrix; readonly boxWidth: number; readonly color: string; readonly size: number; readonly initial: string }` ;
  - `export interface TextEditorHost { open(session: TextEditSession, camera: Camera): void; close(): void; value(): string }` ;
  - `export interface TextTool extends GestureTool { editing(): TextEditSession | null; composing(): boolean; compositionStart(): void; compositionEnd(): void; requestCommit(): void }` ;
  - `export function createTextTool(ctx: ToolContext, host: TextEditorHost, style: () => TextStyle, measure: Measure): TextTool`.
- Réutilise : `apps/web/src/engine/camera.ts` — `screenToWorld`, type `Camera`.
- Réutilise : `apps/web/src/engine/input/keys.ts:27-29` — règle « composition IME : la touche appartient à l'IME »
  (D14), appliquée ici aux demandes de validation.

**Patron à ne pas reprendre.** Valider sur la touche Échap ou sur la perte du focus sans regarder la composition :
sous Windows et macOS, choisir un candidat de l'IME passe par Entrée ou Échap, et la perte du focus arrive avant
`compositionend` ; on écrirait un texte à moitié composé. Chemin de référence : `apps/web/src/engine/input/keys.ts:27-29`
(`if (e.isComposing || e.altKey) return null;`).

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T53 && pnpm --filter @roomboard/web exec vitest run src/engine/tools/text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -15`
— attendu : `Tests  9 passed`, aucun `×`, dont `une validation pendant la composition attend compositionend` et
`une boîte neuve validée vide n'écrit rien`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T53` (créé par l'orchestrateur depuis `feat/socle-lot4`, T46 et T48
  fusionnées) ; neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher au DOM dans `engine/` (l'hôte est injecté, T56 l'écrit) ; écrire pendant une composition ;
plus d'une `SetText` par validation.

**Terminé quand** la commande bornée rend 9 tests verts nommés, `tsc --noEmit` sans erreur, `scripts/verifier.sh`
rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé screenToWorld` et
`Réutilisation : appelé règle isComposing de keys.ts (reprise, pas recopiée)`.

**Étapes.**

- [ ] **1. Tests rouges.** Créer `apps/web/src/engine/tools/text.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { Measure } from "../text-layout";
import type { InputSample } from "../input/sampler";
import { createTextTool, type TextEditorHost, type TextEditSession } from "./text";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
/** 10 unités par caractère à toute taille. */
const narrow: Measure = (s) => s.length * 10;

class FakeHost implements TextEditorHost {
  opened: TextEditSession[] = [];
  closed = 0;
  text = "";
  open(s: TextEditSession): void {
    this.opened.push(s);
    this.text = s.initial;
  }
  close(): void {
    this.closed++;
  }
  value(): string {
    return this.text;
  }
}

function setup(measure: Measure = narrow) {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      return doc.apply(cmd);
    },
  };
  const host = new FakeHost();
  const tool = createTextTool(ctx, host, () => ({ color: "#000000", size: 36 }), measure);
  const click = (x: number, y: number): void => {
    tool.begin(1, [at(x, y)]);
    tool.close(1, "end");
  };
  return { doc, page, runs, host, tool, click };
}

describe("outil Texte (D14, CL4-3 à CL4-6)", () => {
  it("clic dans le vide : boîte neuve à la pointe, hôte ouvert, rien d'écrit", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    expect(tool.editing()).toMatchObject({ id: null, matrix: [1, 0, 0, 1, 100, 200], boxWidth: 600, size: 36, initial: "" });
    expect(host.opened).toHaveLength(1);
    expect(runs).toEqual([]);
    expect(tool.active()).toBe(false);
  });

  it("validation : une SetText avec la hauteur mesurée, hôte fermé", () => {
    const { page, host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Bonjour";
    tool.requestCommit();
    expect(runs).toEqual([
      { type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 },
    ]);
    expect(host.closed).toBe(1);
    expect(tool.editing()).toBeNull();
  });

  it("hauteur sur plusieurs lignes : même coupure que le rendu", () => {
    const { host, tool, runs, click } = setup((s) => s.length * 100);
    click(0, 0);
    host.text = "aaaa bbbb";
    tool.requestCommit();
    expect(runs[0]).toMatchObject({ boxHeight: 90 });
  });

  it("une boîte neuve validée vide n'écrit rien", () => {
    const { tool, runs, click, host } = setup();
    click(100, 200);
    tool.requestCommit();
    expect(runs).toEqual([]);
    expect(host.closed).toBe(1);
  });

  it("clic sur un texte : rouvert avec son contenu, masqué de la scène ; vidé : retiré", () => {
    const { doc, page, host, tool, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Bonjour", color: "#1e40af", size: 48, boxWidth: 600, boxHeight: 60 }).ids[0] ?? "";
    click(150, 210);
    expect(tool.editing()).toMatchObject({ id, initial: "Bonjour", size: 48, color: "#1e40af", matrix: [1, 0, 0, 1, 100, 200] });
    expect([...tool.live().hidden]).toEqual([id]);
    host.text = "";
    tool.requestCommit();
    expect(doc.elementIds(page)).toEqual([]);
    expect(tool.live().hidden.size).toBe(0);
  });

  it("une validation pendant la composition attend compositionend", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    tool.compositionStart();
    host.text = "こん";
    tool.requestCommit();
    tool.leave?.("tool");
    expect(runs).toEqual([]);
    expect(tool.editing()).not.toBeNull();
    expect(tool.composing()).toBe(true);
    host.text = "こんにちは";
    tool.compositionEnd();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "SetText", content: "こんにちは" });
    expect(tool.editing()).toBeNull();
  });

  it("composition finie sans demande : la boîte reste ouverte", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    tool.compositionStart();
    host.text = "日本";
    tool.compositionEnd();
    expect(runs).toEqual([]);
    expect(tool.editing()).not.toBeNull();
  });

  it("clic ailleurs pendant l'édition : valide seulement, n'ouvre rien", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Bonjour";
    click(800, 800);
    expect(runs).toHaveLength(1);
    expect(host.opened).toHaveLength(1);
    expect(tool.editing()).toBeNull();
  });

  it("leave : valide la boîte ouverte", () => {
    const { host, tool, runs, click } = setup();
    click(100, 200);
    host.text = "Salut";
    tool.leave?.("page");
    expect(runs[0]).toMatchObject({ content: "Salut" });
  });
});
```

- [ ] **2. Le voir échouer.** `pnpm --filter @roomboard/web exec vitest run src/engine/tools/text.test.ts 2>&1 | tail -4`
  — attendu : `Failed to resolve import "./text"`.

- [ ] **3. Écrire `engine/tools/text.ts`.**

```ts
/**
 * Outil Texte (D14, CL4-2 à CL4-6) : un clic ouvre une boîte (nouvelle, ou le texte touché, masqué de la scène pendant
 * l'édition) ; la saisie se fait dans la zone de la page (hôte injecté : `app/text-editor.ts`) ; une seule SetText à la
 * validation, hauteur mesurée par `layoutText`. Composition IME (CL4-3) : toute demande de validation attend
 * `compositionend` ; rien n'est écrit pendant la composition. Clic pendant l'édition : valide seulement.
 */
import type { Matrix } from "../../core/api";
import { screenToWorld, type Camera } from "../camera";
import { DEFAULT_TEXT_BOX_WIDTH, layoutText, textBoxHeight, type Measure } from "../text-layout";
import type { GestureTool, LivePart, ToolContext } from "./tool";

export const TEXT_HIT_TOL_PX = 6;

export interface TextStyle {
  readonly color: string;
  readonly size: number;
}

export interface TextEditSession {
  readonly page: string;
  /** null : nouvelle boîte. */
  readonly id: string | null;
  /** Matrice monde de la boîte (translation pour une boîte neuve). */
  readonly matrix: Matrix;
  readonly boxWidth: number;
  readonly color: string;
  readonly size: number;
  readonly initial: string;
}

/** Zone de saisie de la page (DOM, T56) : le moteur n'en connaît que ceci. */
export interface TextEditorHost {
  open(session: TextEditSession, camera: Camera): void;
  close(): void;
  value(): string;
}

export interface TextTool extends GestureTool {
  editing(): TextEditSession | null;
  composing(): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  /** Échap, clic ailleurs, perte du focus, outil ou page quittés : valide, ou attend la fin de la composition. */
  requestCommit(): void;
}

const NONE: ReadonlySet<string> = new Set<string>();

export function createTextTool(ctx: ToolContext, host: TextEditorHost, style: () => TextStyle, measure: Measure): TextTool {
  let session: TextEditSession | null = null;
  let composing = false;
  let pending = false;

  const commit = (): void => {
    const s = session;
    if (!s) return;
    const content = host.value();
    session = null;
    pending = false;
    composing = false;
    host.close();
    if (s.id === null && content === "") return;
    const boxHeight = textBoxHeight(layoutText(content, s.size, s.boxWidth, measure).length, s.size);
    ctx.run({
      type: "SetText",
      page: s.page,
      id: s.id,
      x: s.matrix[4],
      y: s.matrix[5],
      content,
      color: s.color,
      size: s.size,
      boxWidth: s.boxWidth,
      boxHeight,
    });
  };

  const requestCommit = (): void => {
    if (!session) return;
    if (composing) {
      pending = true;
      return;
    }
    commit();
  };

  const open = (x: number, y: number): void => {
    const page = ctx.page();
    const cam = ctx.camera();
    const hit = ctx.doc.hitTest(page, x, y, TEXT_HIT_TOL_PX / cam.zoom);
    const el = hit === null ? null : ctx.doc.element(hit);
    if (el && el.kind === "text") {
      session = {
        page,
        id: el.id,
        matrix: el.transform,
        boxWidth: el.text.boxWidth,
        color: el.style.color,
        size: el.text.size,
        initial: el.text.content,
      };
    } else {
      const st = style();
      session = { page, id: null, matrix: [1, 0, 0, 1, x, y], boxWidth: DEFAULT_TEXT_BOX_WIDTH, color: st.color, size: st.size, initial: "" };
    }
    composing = false;
    pending = false;
    host.open(session, cam);
  };

  return {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      if (session) {
        requestCommit();
        return;
      }
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      open(x, y);
    },
    extend() {
      // la saisie passe par l'hôte
    },
    frame() {
      // rien à pousser
    },
    close() {
      // le clic a tout fait au begin
    },
    live(): LivePart {
      const id = session?.id ?? null;
      return { strokes: [], erasers: [], hidden: id === null ? NONE : new Set([id]) };
    },
    active: () => false,
    leave() {
      requestCommit();
    },
    editing: () => session,
    composing: () => composing,
    compositionStart() {
      composing = true;
    },
    compositionEnd() {
      composing = false;
      if (pending) commit();
    },
    requestCommit,
  };
}
```

- [ ] **4. Vérifier.** Commande bornée → `Tests  9 passed` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur ; `cd ~/projets/roomboard-wt/socle--T53 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **5. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T53
git add apps/web/src/engine/tools/text.ts apps/web/src/engine/tools/text.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(tools): text tool session with IME composition guard (T53)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t54"></a>
### Tâche T54 — Liaison Wasm et contrat commun des trois commandes

**Objectif.** La liaison Wasm expose `AddShape`, `SetText`, `Transform` (DA5, D10) ; l'adaptateur TS les appelle ;
le contrat commun (`describe.each` fausse liaison / vrai module) prouve que les deux jouent les trois commandes de la
même façon : coins normalisés, texte créé, remplacé, vidé, inchangé sans étape, matrice composée à gauche,
collision et bornes des formes et textes, aller-retour par le format, messages d'erreur mot pour mot.

**Fichiers.**
- Modifier : `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`,
  `apps/web/src/core/wasm-core.contract.test.ts`

**Interfaces.**
- Consomme (T45, T49) : `Command::{AddShape, SetText, Transform}`, `ShapeKind::parse`, `CommandError::{BadShape, BadMatrix, BadText, UnknownElement}`,
  `ElementView { shape, text }` sérialisés par serde (`shape` : `{shape, w, h, fill}` ; `text` : `{content, size, boxWidth, boxHeight}`).
  (T46) : union `ElementView`, commandes TS, `toElementView` (déjà étendu), `normalizeShape`.
- Produit (Wasm) : `Document.add_shape(page: &str, shape: &str, x0: f64, y0: f64, x1: f64, y1: f64, color: &str, width: f32, fill: Option<String>) -> Result<JsValue, JsError>` ;
  `Document.set_text(page: &str, id: Option<String>, x: f64, y: f64, content: &str, color: &str, size: f32, box_width: f64, box_height: f64) -> Result<JsValue, JsError>` ;
  `Document.transform(ids: Vec<String>, matrix: &[f64]) -> Result<JsValue, JsError>` ; et leurs `_inner` natifs :
  `add_shape_inner(&mut self, page: &str, shape: &str, corners: [f64; 4], color: &str, width: f32, fill: Option<String>) -> Result<Change, CommandError>`,
  `set_text_inner(&mut self, page: &str, id: Option<String>, at: [f64; 2], content: &str, color: &str, size: f32, boxes: [f64; 2]) -> Result<Change, CommandError>`,
  `transform_inner(&mut self, ids: Vec<String>, matrix: &[f64]) -> Result<Change, CommandError>` (longueur ≠ 6 : `BadMatrix` ; nom de forme inconnu : `BadShape`).
- Réutilise : `crates/roomboard-wasm/src/lib.rs:13` `Document` (wasm) — étendu des méthodes de DA5 (cadrage, ligne
  « Liaison Wasm », « étendre ») ; même patron `méthode exposée → _inner` (`lib.rs:1-3`), mêmes `to_js` et `cmd_err`.
- Réutilise : `apps/web/src/core/wasm-core.contract.test.ts:93` — le `describe.each(factories)` du contrat commun et
  ses aides (`first`, `messageOf`, `now`).

**Patron à ne pas reprendre.** Lire une valeur venue de Wasm par un `as` (« une dérive de forme entre Rust et TS lève
une erreur au lieu de passer sous un `as` », `apps/web/src/core/wasm-core.ts:1-2`) ; et tester la fausse liaison seule
en croyant tester le contrat. Chemin de référence : `toElementView` contrôlé (`wasm-core.ts`, T46) et le bloc
`describe.each(factories)` (`wasm-core.contract.test.ts:93-102`).

**Test et commande bornée.**
1. `cd ~/projets/roomboard-wt/socle--T54 && export PATH=$HOME/.cargo/bin:$PATH && cargo test -p roomboard-wasm 2>&1 | grep -E "add_shape_inner|set_text_inner|transform_inner|test result" | tail -10`
   — attendu : 4 lignes `… ok` nommées, `test result: ok.` ; à garder verts : `version_is_not_empty`,
   `wasm_document_counts_pages` (squelette).
2. Après `scripts/verifier.sh` (qui construit le `.wasm`) : `cd ~/projets/roomboard-wt/socle--T54 && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "contrat lot 4|Tests |skipped" | tail -20`
   — attendu : 12 lignes `contrat lot 4 : fausse liaison …` et `contrat lot 4 : vrai module wasm …` (6 × 2) en `✓`,
   aucun `skipped`, `Tests  N passed`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T54` (créé par l'orchestrateur depuis `feat/socle-lot4`, T46 et T49
  fusionnées) ; neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli. Taille du module Wasm
  contrôlée par `verifier.sh` (≤ 1,5 Mo, H2-13) : ne pas relever le seuil.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement.
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `crates/roomboard-core` (si un écart du cœur apparaît, le dire au rapport : la correction est
une tâche de l'orchestrateur) ; changer `fake-core.ts` (même règle) ; `as` sur une valeur venue de Wasm.

**Terminé quand** les deux commandes bornées sont vertes, `cargo clippy --workspace --all-targets -- -D warnings`
vert, `scripts/verifier.sh` rend `verifier.sh : OK` avec la taille du module affichée, et le rapport porte
`Réutilisation : appelé Document (wasm) étendu` et `Réutilisation : appelé describe.each(factories)`, plus la taille
du module (`module Wasm : N octets`).

**Étapes.**

- [ ] **1. Tests Rust rouges.** Dans `crates/roomboard-wasm/src/lib.rs`, module `tests` :

```rust
    #[test]
    fn add_shape_inner_reads_back_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .add_shape_inner(&p, "ellipse", [10.0, 10.0, 30.0, 5.0], "#000000", 4.0, None)
            .expect("forme");
        let e = d.core.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "shape");
        assert_eq!(
            e.shape.map(|s| (s.shape, s.w, s.h, s.fill)),
            Some(("ellipse".to_string(), 20.0, 5.0, None))
        );
    }

    #[test]
    fn add_shape_inner_unknown_kind_is_bad_shape() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(
            d.add_shape_inner(&p, "triangle", [0.0, 0.0, 1.0, 1.0], "#000000", 4.0, None),
            Err(CommandError::BadShape)
        );
    }

    #[test]
    fn set_text_inner_creates_and_removes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .set_text_inner(&p, None, [100.0, 200.0], "Bonjour", "#000000", 36.0, [600.0, 45.0])
            .expect("texte")
            .ids[0]
            .clone();
        assert_eq!(d.core.element(&id).and_then(|e| e.text).map(|t| t.content), Some("Bonjour".into()));
        let c = d
            .set_text_inner(&p, Some(id.clone()), [0.0, 0.0], "", "#000000", 36.0, [600.0, 45.0])
            .expect("vider");
        assert_eq!(c.removed, vec![id]);
    }

    #[test]
    fn transform_inner_checks_length() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0).expect("trait").ids[0].clone();
        assert_eq!(
            d.transform_inner(vec![id.clone()], &[1.0, 0.0, 0.0, 1.0]),
            Err(CommandError::BadMatrix)
        );
        let c = d
            .transform_inner(vec![id.clone()], &[1.0, 0.0, 0.0, 1.0, 10.0, 0.0])
            .expect("translation");
        assert_eq!(c.ids, vec![id]);
    }
```

  `cargo test -p roomboard-wasm 2>&1 | tail -5` — attendu : `no method named add_shape_inner`.

- [ ] **2. Liaison.** Imports : `use roomboard_core::element::{StrokeStyle, Transform};` (remplace l'import de
  `StrokeStyle` seul) et `use roomboard_core::shape::ShapeKind;`. Dans le `#[wasm_bindgen] impl Document`, après
  `delete` :

```rust
    #[allow(clippy::too_many_arguments)]
    pub fn add_shape(
        &mut self,
        page: &str,
        shape: &str,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        color: &str,
        width: f32,
        fill: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .add_shape_inner(page, shape, [x0, y0, x1, y1], color, width, fill)
                .map_err(cmd_err)?,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_text(
        &mut self,
        page: &str,
        id: Option<String>,
        x: f64,
        y: f64,
        content: &str,
        color: &str,
        size: f32,
        box_width: f64,
        box_height: f64,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_text_inner(page, id, [x, y], content, color, size, [box_width, box_height])
                .map_err(cmd_err)?,
        )
    }

    pub fn transform(&mut self, ids: Vec<String>, matrix: &[f64]) -> Result<JsValue, JsError> {
        to_js(&self.transform_inner(ids, matrix).map_err(cmd_err)?)
    }
```

  et dans le `impl Document` natif, après `delete_inner` :

```rust
    pub fn add_shape_inner(
        &mut self,
        page: &str,
        shape: &str,
        corners: [f64; 4],
        color: &str,
        width: f32,
        fill: Option<String>,
    ) -> Result<Change, CommandError> {
        let shape = ShapeKind::parse(shape).ok_or(CommandError::BadShape)?;
        let [x0, y0, x1, y1] = corners;
        self.run(Command::AddShape {
            page: page.to_string(),
            shape,
            x0,
            y0,
            x1,
            y1,
            style: StrokeStyle {
                color: color.to_string(),
                width,
            },
            fill,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_text_inner(
        &mut self,
        page: &str,
        id: Option<String>,
        at: [f64; 2],
        content: &str,
        color: &str,
        size: f32,
        boxes: [f64; 2],
    ) -> Result<Change, CommandError> {
        self.run(Command::SetText {
            page: page.to_string(),
            id,
            x: at[0],
            y: at[1],
            content: content.to_string(),
            color: color.to_string(),
            size,
            box_width: boxes[0],
            box_height: boxes[1],
        })
    }

    pub fn transform_inner(&mut self, ids: Vec<String>, matrix: &[f64]) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::Transform { ids, matrix: m })
    }
```

  `cargo test -p roomboard-wasm 2>&1 | tail -5` → `test result: ok.` (4 neufs + existants).

- [ ] **3. Adaptateur.** Dans `apps/web/src/core/wasm-core.ts`, remplacer les trois `case` « commande non liée »
  par :

```ts
      case "AddShape":
        return toChange(
          this.d.add_shape(cmd.page, cmd.shape, cmd.x0, cmd.y0, cmd.x1, cmd.y1, cmd.style.color, cmd.style.width, cmd.fill ?? undefined),
        );
      case "SetText":
        return toChange(
          this.d.set_text(cmd.page, cmd.id ?? undefined, cmd.x, cmd.y, cmd.content, cmd.color, cmd.size, cmd.boxWidth, cmd.boxHeight),
        );
      case "Transform":
        return toChange(this.d.transform([...cmd.ids], new Float64Array(cmd.matrix)));
```

  Le type des paramètres `Option<String>` vient du `.d.ts` généré par `wasm-bindgen` (`string | null | undefined`) :
  le lire dans `apps/web/src/wasm/roomboard_wasm.d.ts` après `verifier.sh` et ajuster `?? undefined` seulement si le
  type l'exige.

- [ ] **4. Contrat commun rouge puis vert.** Ajouter `import { normalizeShape } from "./shapes";` et, à la fin de
  `wasm-core.contract.test.ts` :

```ts
// Lot 4 (T54) : les trois commandes jouées par les deux fabriques (CL4-6, CL4-7, CL4-8).
describe.each(factories)("contrat lot 4 : $name", ({ f }) => {
  const pen = { color: "#1e40af", width: 4 };
  type Corners = [number, number, number, number];
  const shape = (d: CoreDocument, p: string, kind: "rect" | "ellipse" | "line" | "arrow", c: Corners, fill: string | null = null): string =>
    d.apply({ type: "AddShape", page: p, shape: kind, x0: c[0], y0: c[1], x1: c[2], y1: c[3], style: pen, fill }).ids[0] ?? "";
  const text = (d: CoreDocument, p: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });

  it("AddShape : coins normalisés comme normalizeShape, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "rect", [300, 200, 100, 50]);
    const g = normalizeShape("rect", 300, 200, 100, 50);
    expect(d.element(r)).toEqual({
      id: r,
      kind: "shape",
      transform: [1, 0, 0, 1, g.tx, g.ty],
      style: pen,
      shape: { shape: "rect", w: g.w, h: g.h, fill: null },
    });
    const a = shape(d, p, "arrow", [300, 200, 100, 50], "#ff0000");
    expect(d.element(a)).toMatchObject({ transform: [1, 0, 0, 1, 300, 200], shape: { shape: "arrow", w: -200, h: -150, fill: "#ff0000" } });
    d.undo();
    expect(d.elementIds(p)).toEqual([r]);
    d.free();
  });

  it("SetText : créer, remplacer, vider ; inchangé et boîte neuve vide = aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Bonjour").ids[0] ?? "";
    expect(d.element(id)).toEqual({
      id,
      kind: "text",
      transform: [1, 0, 0, 1, 100, 200],
      style: { color: "#000000", width: 0 },
      text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 },
    });
    const v = d.version();
    expect(text(d, p, "Bonjour", id).version).toBe(v);
    expect(text(d, p, "").version).toBe(v);
    expect(text(d, p, "Bonsoir", id).ids).toEqual([id]);
    expect(text(d, p, "", id).removed).toEqual([id]);
    d.undo();
    expect(d.element(id)).toMatchObject({ text: { content: "Bonsoir" } });
    d.free();
  });

  it("Transform : compose à gauche, ids inconnus ignorés, identité sans étape", () => {
    const d = f.blank();
    const p = first(d);
    const a = shape(d, p, "rect", [100, 100, 200, 200]);
    const s = commit(d, p, 400);
    const c = d.apply({ type: "Transform", ids: [s, "absent", a], matrix: [2, 0, 0, 2, 0, 0] });
    expect(c.ids).toEqual([a, s].sort());
    expect(c.pages).toEqual([p]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 210, 200]);
    unchanged(d, () => d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 0, 0] }));
    unchanged(d, () => d.apply({ type: "Transform", ids: ["absent"], matrix: [1, 0, 0, 1, 5, 5] }));
    d.undo();
    expect(d.element(a)?.transform).toEqual([2, 0, 0, 2, 200, 200]);
    d.free();
  });

  it("formes et textes : hitTest sur la surface, bornes élargies, hitTestPath et Erase les ignorent", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "rect", [600, 600, 800, 700]);
    const t = text(d, p, "Bonjour").ids[0] ?? "";
    expect(d.hitTest(p, 700, 650, 1)).toBe(r);
    expect(d.hitTest(p, 300, 220, 1)).toBe(t);
    expect(d.hitTest(p, 900, 650, 1)).toBeNull();
    expect(d.bounds([r])).toEqual({ x0: 598, y0: 598, x1: 802, y1: 702 });
    expect(d.bounds([t])).toEqual({ x0: 100, y0: 200, x1: 700, y1: 245 });
    expect(d.idsInRect(p, { x0: 590, y0: 590, x1: 810, y1: 710 })).toEqual([r]);
    expect(d.hitTestPath(p, new Float32Array([600, 650, 800, 650]), 10)).toEqual([]);
    unchanged(d, () => d.apply({ type: "Erase", page: p, path: new Float32Array([600, 650, 800, 650]), radius: 10, mode: "object" }));
    d.free();
  });

  it("save puis load garde formes, textes et matrices", () => {
    const d = f.blank();
    const p = first(d);
    const r = shape(d, p, "ellipse", [100, 100, 300, 200], "#ff0000");
    const t = text(d, p, "Bonjour").ids[0] ?? "";
    d.apply({ type: "Transform", ids: [r], matrix: [1, 0, 0, 1, 50, 0] });
    const e = f.load(d.save(now, "0.1.0"));
    expect(e.elementIds(p)).toEqual([r, t]);
    expect(e.element(r)).toEqual(d.element(r));
    expect(e.element(t)).toEqual(d.element(t));
    e.free();
    d.free();
  });

  it("erreurs des trois commandes : messages du contrat", () => {
    const d = f.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    expect(messageOf(() => d.apply({ type: "AddShape", page: p, shape: "line", x0: Number.NaN, y0: 0, x1: 1, y1: 1, style: pen, fill: null })))
      .toBe("forme invalide (rect, ellipse, line ou arrow, coins finis attendus)");
    expect(messageOf(() => d.apply({ type: "Transform", ids: [a], matrix: [1, 2, 2, 4, 0, 0] })))
      .toBe("matrice invalide (six nombres finis, inversible)");
    expect(messageOf(() => d.apply({ type: "SetText", page: p, id: null, x: 0, y: 0, content: "x", color: "#000000", size: 0, boxWidth: 600, boxHeight: 45 })))
      .toBe("texte invalide (taille et boîte finies > 0 attendues)");
    expect(messageOf(() => text(d, p, "x", a))).toBe(`élément inconnu : ${a}`);
    d.free();
  });
});
```

  `commit` et `messageOf` sont les aides du haut du fichier ; `unchanged` est défini dans le premier
  `describe.each` : le recopier en tête de ce bloc (même corps, 9 lignes) ou le remonter au niveau du fichier.
  Lancer d'abord `cd ~/projets/roomboard-wt/socle--T54 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  (construit le `.wasm`), puis la commande bornée 2. Un test rouge côté vrai module seulement = écart du cœur : le
  dire au rapport avec la sortie, ne pas toucher au cœur.

- [ ] **5. Vérifier.** Les deux commandes bornées vertes ; `cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5`
  sans `error` ; `scripts/verifier.sh 2>&1 | tail -30` → `verifier.sh : OK` et la ligne `module Wasm : N octets`.

- [ ] **6. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T54
git add crates/roomboard-wasm/src/lib.rs apps/web/src/core/wasm-core.ts apps/web/src/core/wasm-core.contract.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(wasm): bind AddShape, SetText and Transform, shared contract for both cores (T54)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

<a id="tache-t55"></a>
### Tâche T55 — Moteur : outils d'édition branchés, Suppr, Échap, Maj, routeur

**Objectif.** Le moteur connaît les outils `select`, `rect`, `ellipse`, `line`, `arrow`, `text` : il leur route les
gestes, fusionne leurs calques et redessine la scène quand le calque change (CL4-1) ; il suit Maj (CL4-12), supprime
la sélection par Suppr ou Retour arrière en une étape, la vide par Échap (CL4-10), fait quitter l'outil courant au
changement d'outil ou de page (`leave`), et publie la sélection dans l'état. Le routeur classe ces gestes « edit »
(la traînée déléguée ne suit que l'encre). Sans fabrique d'édition, les outils sont inertes (tests et amorce
existants inchangés).

**Fichiers.**
- Modifier : `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`,
  `apps/web/src/engine/input/gesture.ts`, `apps/web/src/engine/input/router.ts`, `apps/web/src/engine/input/router.test.ts`,
  `apps/web/src/engine/input/keys.ts`, `apps/web/src/engine/input/keys.test.ts`,
  `apps/web/src/engine/render/trail-style.ts`, `apps/web/src/engine/render/trail-style.test.ts`

**Interfaces.**
- Consomme (T46) : `ShapeKind` ; `SelectionTool`, `LeaveReason`, `NO_LIVE`, `ToolContext.shift` (`tools/tool.ts`) ;
  `mergeOverlays`, `overlayKey`, `EMPTY_OVERLAY` (`render/overlay.ts`). (T47) : `EngineState.{selection, selectionBounds}`,
  `switchTo`, `followPages`, `addPage`, `removePage`. (T50) : `Renderer.drawScene(…, overlay?)`. (T51) :
  `createSelectTool` (tests). (T52) : `createShapeTool` (tests). (T53) : `TextTool`, `TextStyle` (`tools/text.ts`).
  (T48) : `DEFAULT_TEXT_SIZE` (`engine/text-layout.ts`).
- Produit :
  - `gesture.ts` : `type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text"` (et donc `ToolChoice`) ;
  - `router.ts` : `Router.roleOf(pointerId): "ink" | "erase" | "edit" | "view" | null` (« ink » : stylo seulement) ;
  - `trail-style.ts` : `type TrailRole = "ink" | "erase" | "edit" | "view" | null` ;
  - `keys.ts` : `type EditAction = "delete" | "escape"`, `editAction(e: KeyLike): EditAction | null` ;
  - `engine.ts` : `ToolFactories.select?(ctx: ToolContext): SelectionTool`,
    `ToolFactories.shape?(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool`,
    `ToolFactories.text?(ctx: ToolContext, style: () => TextStyle): TextTool` ; `Engine.key` prend Suppr, Retour
    arrière, Échap (avec sélection) et suit Maj ; `Engine.keyUp` relâche Maj ; `releaseKeys` aussi ; l'état porte
    `selection` (copie) et `selectionBounds` (`doc.bounds`) ; `removePage` fait quitter l'outil **avant** la commande.
- Réutilise : `apps/web/src/engine/engine.ts` — `createEngine`, boucle d'image, `run`, `history` (étendus).
- Réutilise : `apps/web/src/engine/input/router.ts` `createRouter` — décision des rôles inchangée, seul `roleOf`
  distingue « edit ».
- Réutilise : `apps/web/src/engine/input/keys.ts` — `inEditable` et la garde `isComposing` pour `editAction`.

**Test et commande bornée.**
`cd ~/projets/roomboard-wt/socle--T55 && pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/engine/input/router.test.ts src/engine/input/keys.test.ts src/engine/render/trail-style.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests " | tail -80`
— attendu : aucun `×`, `Tests  N passed` (N = existants + 12), présents : `Suppr supprime la sélection en une étape`,
`calque d'édition : passé à drawScene, scène redessinée quand il change`, `roleOf : edit pour sélection, formes et texte`.
Tests à garder verts : tous ceux de ces quatre fichiers (dont `fin du geste : une écriture, … état émis` : un seul état
émis au relâché d'un trait) et `ink-trail.test.ts`.

**Contraintes (recopiées de « Global Constraints » du plan maître et du lot).**
- Worktree : `~/projets/roomboard-wt/socle--T55` (créé par l'orchestrateur depuis `feat/socle-lot4`, T47, T50, T51,
  T52, T53 fusionnées) ; neuf : `pnpm install --frozen-lockfile` à la racine.
- `export PATH=$HOME/.cargo/bin:$PATH` avant `cargo` et avant `scripts/verifier.sh`.
- Commandes bornées du profil : `cargo test --workspace 2>&1 | tail -20` ; `pnpm -r test 2>&1 | tail -20` ; suite
  complète `scripts/verifier.sh 2>&1 | tail -30` (réussite `verifier.sh : OK` ; échec `test result: FAILED`,
  `error[`, `FAIL `, code non nul).
- Toute suite au premier plan (outil Bash, `timeout: 600000`), jamais `run_in_background`.
- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Aucun `--force`, aucun tag.
- Commit : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message en anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (jamais « Sonnet »).
- Aucun test sauté ni ignoré de plus, aucun seuil baissé, aucun test existant affaibli.
- `.github/workflows/` non touché ; aucun build Tauri ; aucun build Android.
- Le chemin de l'encre (stylo, `StrokeBuilder`, canvas d'interaction) ne change pas de comportement : `drawLive`
  reçoit les mêmes traits et gommes qu'avant ; la traînée déléguée ne suit que le rôle « ink ».
- Relecteur éventuel lancé au premier plan (`run_in_background: false`).

**Interdits.** Toucher `main.ts`, `barre.ts` (T58) ; émettre un état de plus au relâché d'un trait ; prendre
Suppr ou Échap sans sélection (la touche reste à la page) ; prendre une touche dans un champ ou pendant une
composition.

**Terminé quand** la commande bornée est verte, `tsc --noEmit` sans erreur, `pnpm --filter @roomboard/web build`
passe, `scripts/verifier.sh` rend `verifier.sh : OK`, et le rapport porte `Réutilisation : appelé createEngine
(étendu)`, `Réutilisation : appelé createRouter.roleOf (étendu)`, `Réutilisation : appelé inEditable / isComposing
(keys.ts)`.

**Étapes.**

- [ ] **1. Tests rouges des touches, du routeur et de la traînée.** Dans `keys.test.ts` (avec `editAction` importé
  de `./keys` ; si le fichier n'a pas d'aide `key(…)`, en écrire une identique à celle de `engine.test.ts`) :

```ts
describe("editAction (D12, CL4-10)", () => {
  const k = (key: string, mods: Partial<Omit<KeyLike, "key">> = {}): KeyLike => ({
    key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null, ...mods,
  });
  it("Suppr et Retour arrière suppriment, Échap vide", () => {
    expect(editAction(k("Delete"))).toBe("delete");
    expect(editAction(k("Backspace"))).toBe("delete");
    expect(editAction(k("Escape"))).toBe("escape");
    expect(editAction(k("a"))).toBeNull();
  });
  it("rien dans un champ, pendant une composition, avec Ctrl, Cmd ou Alt", () => {
    expect(editAction(k("Delete", { target: { tagName: "TEXTAREA" } }))).toBeNull();
    expect(editAction(k("Escape", { isComposing: true }))).toBeNull();
    expect(editAction(k("Delete", { ctrlKey: true }))).toBeNull();
    expect(editAction(k("Delete", { metaKey: true }))).toBeNull();
    expect(editAction(k("Delete", { altKey: true }))).toBeNull();
  });
});
```

  Dans `router.test.ts` (même style que les tests de `roleOf` existants ; aide d'événement du fichier) :

```ts
  it("roleOf : edit pour sélection, formes et texte ; ink pour le stylo seulement", () => {
    for (const [tool, want] of [["select", "edit"], ["rect", "edit"], ["arrow", "edit"], ["text", "edit"], ["pen", "ink"], ["eraser", "erase"]] as const) {
      let current: ToolChoice = tool;
      const r = createRouter(DEFAULT_ROUTER_OPTIONS, {
        currentTool: () => current,
        gestures: { begin: () => {}, extend: () => {}, close: () => {} },
        view: { panBy: () => {}, zoomAt: () => {} },
      });
      r.handle({ kind: "start", pointerId: 7, pointerType: "mouse", eraserButton: false, samples: [{ x: 1, y: 1, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 }], predicted: [] });
      expect(r.roleOf(7)).toBe(want);
      current = "pen";
    }
  });
```

  (importer `ToolChoice` de `./gesture` ; si `GestureEvent` exige d'autres champs, les reprendre de l'aide du fichier.)
  Dans `trail-style.test.ts` :

```ts
  it("rôle edit : aucune traînée", () => {
    const style = trailStyleFor(() => "edit", { color: "#000000", width: 4 }, () => 1);
    expect(style({ pointerId: 1 } as Parameters<typeof style>[0])).toBeNull();
  });
```

  (si `TrailEvent` a des champs obligatoires, construire l'événement comme le test existant du fichier au lieu du
  `as`.)

- [ ] **2. Tests rouges du moteur.** Dans `engine.test.ts`, étendre `FakeRenderer.drawScene` pour garder le calque :

```ts
  readonly overlays: (EditOverlay | undefined)[] = [];
  drawScene(page: PageView, camera: Camera, hidden: ReadonlySet<string>, overlay?: EditOverlay): void {
    this.scenes.push({ page, camera, hidden: [...hidden] });
    this.overlays.push(overlay);
  }
```

  (imports : `import type { EditOverlay } from "./render/overlay";`, `import { EMPTY_OVERLAY } from "./render/overlay";`,
  `import { createSelectTool } from "./tools/select";`, `import { createShapeTool } from "./tools/shape";`), puis,
  à la fin du `describe("createEngine", …)` :

```ts
  function editSetup() {
    const doc = fakeCore.blank();
    const frames = new Frames();
    const renderer = new FakeRenderer();
    const leaves: string[] = [];
    let select: ReturnType<typeof createSelectTool> | null = null;
    const tools: ToolFactories = {
      pen: (ctx) => fakeTool("pen", [], ctx),
      eraser: (ctx) => fakeTool("eraser", [], ctx),
      select: (ctx) => {
        const s = createSelectTool(ctx);
        const leave = s.leave?.bind(s);
        select = { ...s, leave: (r) => { leaves.push(`select ${r}`); leave?.(r); } };
        return select;
      },
      shape: (ctx, kind, style) => createShapeTool(ctx, kind, style),
    };
    const engine = createEngine({ doc, renderer, frames, tools });
    const page = engine.state().page;
    const rect = (x0: number, y0: number, x1: number, y1: number): string =>
      doc.apply({ type: "AddShape", page, shape: "rect", x0, y0, x1, y1, style: PEN, fill: null }).ids[0] ?? "";
    const sel = () => {
      if (!select) throw new Error("outil Sélection absent");
      return select;
    };
    return { doc, frames, renderer, engine, page, rect, sel, leaves };
  }

  it("outils d'édition absents : outils inertes, sélection vide", () => {
    const { engine } = setup();
    engine.setTool("select");
    expect(() => {
      engine.sink.begin(1, "select", [sample]);
      engine.sink.close(1, "end");
      engine.sink.begin(2, "text", [sample]);
      engine.sink.close(2, "end");
    }).not.toThrow();
    expect(engine.state()).toMatchObject({ tool: "select", selection: [], selectionBounds: null });
  });

  it("le geste d'une forme va à l'outil de la forme : une AddShape au relâché", () => {
    const { engine, doc, page } = editSetup();
    engine.sink.begin(1, "ellipse", [{ ...sample, x: 10, y: 10 }]);
    engine.sink.extend(1, [{ ...sample, x: 110, y: 60 }], []);
    engine.sink.close(1, "end");
    const id = doc.elementIds(page)[0] ?? "";
    expect(doc.element(id)).toMatchObject({ kind: "shape", shape: { shape: "ellipse", w: 100, h: 50 } });
  });

  it("calque d'édition : passé à drawScene, scène redessinée quand il change", () => {
    const { engine, frames, renderer, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    engine.view.panBy(0, 0);
    frames.tick();
    expect(renderer.overlays.at(-1)).toMatchObject({ handles: true, frame: { x0: 98, y0: 98, x1: 202, y1: 202 } });
    const n = renderer.scenes.length;
    sel().setSelection([]);
    engine.sink.begin(1, "select", [{ ...sample, x: 500, y: 500 }]);
    frames.tick();
    expect(renderer.scenes.length).toBe(n + 1);
    expect(renderer.overlays.at(-1)).toMatchObject({ band: { x0: 500, y0: 500, x1: 500, y1: 500 } });
    expect(renderer.overlays.at(-1)).not.toBe(EMPTY_OVERLAY);
  });

  it("Suppr supprime la sélection en une étape ; annuler la rend", () => {
    const { engine, doc, page, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    const b = rect(400, 100, 500, 200);
    sel().setSelection([a, b]);
    expect(engine.key(key("Delete"))).toBe(true);
    expect(doc.elementIds(page)).toEqual([]);
    expect(engine.state().selection).toEqual([]);
    engine.undo();
    expect(doc.elementIds(page)).toEqual([a, b]);
  });

  it("Suppr ou Échap sans sélection : touche laissée à la page ; Suppr dans un champ : rien", () => {
    const { engine, doc, page, rect, sel } = editSetup();
    expect(engine.key(key("Delete"))).toBe(false);
    expect(engine.key(key("Escape"))).toBe(false);
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    expect(engine.key(key("Delete", { target: { tagName: "TEXTAREA" } }))).toBe(false);
    expect(doc.elementIds(page)).toEqual([a]);
  });

  it("Échap vide la sélection sans écrire", () => {
    const { engine, doc, rect, sel } = editSetup();
    const a = rect(100, 100, 200, 200);
    sel().setSelection([a]);
    const v = doc.version();
    expect(engine.key(key("Escape"))).toBe(true);
    expect(engine.state().selection).toEqual([]);
    expect(doc.version()).toBe(v);
  });

  it("changer d'outil ou de page fait quitter l'outil (leave) et vide la sélection", () => {
    const { engine, rect, sel, leaves } = editSetup();
    const a = rect(100, 100, 200, 200);
    engine.setTool("select");
    sel().setSelection([a]);
    engine.setTool("pen");
    expect(leaves).toContain("select tool");
    expect(engine.state().selection).toEqual([]);
    sel().setSelection([a]);
    engine.addPage();
    expect(leaves).toContain("select page");
    expect(engine.state().selection).toEqual([]);
  });

  it("Maj suivie : ctx.shift() vrai entre keydown et keyup, faux après releaseKeys ; la touche n'est pas prise", () => {
    let seen: ToolContext | null = null;
    const doc = fakeCore.blank();
    const engine = createEngine({
      doc,
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: (ctx) => {
          seen = ctx;
          return fakeTool("pen", [], ctx);
        },
        eraser: (ctx) => fakeTool("eraser", [], ctx),
      },
    });
    const shift = (): boolean => (seen as ToolContext | null)?.shift?.() === true;
    expect(engine.key(key("Shift", { shiftKey: true }))).toBe(false);
    expect(shift()).toBe(true);
    expect(engine.keyUp(key("Shift"))).toBe(false);
    expect(shift()).toBe(false);
    engine.key(key("Shift", { shiftKey: true }));
    engine.releaseKeys();
    expect(shift()).toBe(false);
  });

  it("état : sélection et boîte de la sélection ; un geste de sélection émet l'état", () => {
    const { engine, rect } = editSetup();
    const a = rect(100, 100, 200, 200);
    const states: number[] = [];
    engine.onState((s) => states.push(s.selection.length));
    engine.sink.begin(1, "select", [{ ...sample, x: 150, y: 150 }]);
    engine.sink.close(1, "end");
    expect(states).toEqual([1]);
    expect(engine.state()).toMatchObject({ selection: [a], selectionBounds: { x0: 98, y0: 98, x1: 202, y1: 202 } });
  });
```

  (`sample` du fichier vaut `x: 1, y: 2` ; la caméra de `setup` est l'identité tant que `resize` n'est pas appelé,
  donc écran = monde.)

- [ ] **3. Le voir échouer.** Commande bornée de la section — attendu : les 12 neufs en `×` (`editAction` absent,
  `"select"` refusé par `DrawTool`, `drawScene` sans calque).

- [ ] **4. `keys.ts`.** Ajouter à la fin :

```ts
export type EditAction = "delete" | "escape";

/** Suppr / Retour arrière (supprimer la sélection, D12) et Échap (la vider), hors champ, hors composition, sans modificateur. */
export function editAction(e: KeyLike): EditAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || inEditable(e.target)) return null;
  if (e.key === "Delete" || e.key === "Backspace") return "delete";
  if (e.key === "Escape") return "escape";
  return null;
}
```

- [ ] **5. `gesture.ts`, `router.ts`, `trail-style.ts`.** Dans `gesture.ts`, ajouter
  `import type { ShapeKind } from "../../core/api";` et remplacer `DrawTool` :

```ts
/** Outil d'un geste ; le bouton gomme du stylet impose "eraser" (D12). Lot 4 : sélection, formes, texte. */
export type DrawTool = "pen" | "eraser" | "select" | ShapeKind | "text";
```

  Dans `router.ts`, le type de `roleOf` devient `"ink" | "erase" | "edit" | "view" | null` (interface `Router`) et son
  corps :

```ts
    roleOf(pointerId) {
      const t = tracks.get(pointerId);
      if (!t) return null;
      if (t.role === "draw") return t.tool === "eraser" ? "erase" : t.tool === "pen" ? "ink" : "edit";
      return t.role === "pan" || t.role === "pinch" ? "view" : null;
    },
```

  Dans `trail-style.ts` : `export type TrailRole = "ink" | "erase" | "edit" | "view" | null;` (le corps ne change pas :
  seul « ink » reçoit un style).

- [ ] **6. `engine.ts` : fabriques et outils.** Imports à ajouter :

```ts
import type { ShapeKind } from "../core/api";
import { editAction } from "./input/keys";
import { mergeOverlays, overlayKey, EMPTY_OVERLAY } from "./render/overlay";
import { DEFAULT_TEXT_SIZE } from "./text-layout";
import type { TextStyle, TextTool } from "./tools/text";
import { NO_LIVE, type GestureTool, type LeaveReason, type LivePart, type SelectionTool, type ToolContext } from "./tools/tool";
```

  (fusionner avec les imports existants de `./input/keys` et `./tools/tool`). Remplacer `ToolFactories` :

```ts
export interface ToolFactories {
  pen(ctx: ToolContext, style: () => StrokeStyle): GestureTool;
  eraser(ctx: ToolContext, mode: () => EraseMode): GestureTool;
  /** Outils d'édition (lot 4) ; absents : outils inertes (tests du moteur, amorce partielle). */
  select?(ctx: ToolContext): SelectionTool;
  shape?(ctx: ToolContext, kind: ShapeKind, style: () => StrokeStyle): GestureTool;
  text?(ctx: ToolContext, style: () => TextStyle): TextTool;
}
```

  Avant `createEngine` :

```ts
function inertTool(): GestureTool {
  return { begin() {}, extend() {}, frame() {}, close() {}, live: () => NO_LIVE, active: () => false };
}

function inertSelection(): SelectionTool {
  return { ...inertTool(), selection: () => [], setSelection() {}, prune() {} };
}
```

  Dans `createEngine` : `let shiftHeld = false;` et `let lastOverlay = overlayKey(EMPTY_OVERLAY);` à côté de
  `spaceHeld` ; remplacer `ctx`, `tools`, `toolList` :

```ts
  const ctx: ToolContext = { doc, page: () => pageId, camera: () => camera, run, shift: () => shiftHeld };
  const selectTool: SelectionTool = deps.tools.select?.(ctx) ?? inertSelection();
  const shapeTool = (k: ShapeKind): GestureTool => deps.tools.shape?.(ctx, k, () => style) ?? inertTool();
  const tools: Record<DrawTool, GestureTool> = {
    pen: deps.tools.pen(ctx, () => style),
    eraser: deps.tools.eraser(ctx, () => eraserMode),
    select: selectTool,
    rect: shapeTool("rect"),
    ellipse: shapeTool("ellipse"),
    line: shapeTool("line"),
    arrow: shapeTool("arrow"),
    text: deps.tools.text?.(ctx, () => ({ color: style.color, size: DEFAULT_TEXT_SIZE })) ?? inertTool(),
  };
  const toolList: readonly GestureTool[] = Object.values(tools);

  function leaveAll(reason: LeaveReason): void {
    for (const t of toolList) t.leave?.(reason);
  }
```

- [ ] **7. `engine.ts` : état, image, écritures.** Dans `state()`, remplacer `selection: [], selectionBounds: null,`
  par :

```ts
      selection: [...selectTool.selection()],
      selectionBounds: selectTool.selection().length > 0 ? doc.bounds(selectTool.selection()) : null,
```

  Dans `run` et `history`, juste après `followPages(…)` : `selectTool.prune();`. Dans `switchTo`, juste après
  `closeAll("abort");` : `leaveAll("page");`. Remplacer `frame` :

```ts
  function frame(now: number): void {
    for (const t of toolList) t.frame();
    const parts: LivePart[] = toolList.map((t) => t.live());
    const hidden = new Set<string>();
    for (const p of parts) for (const id of p.hidden) hidden.add(id);
    const overlay = mergeOverlays(parts.map((p) => p.overlay));
    const key = overlayKey(overlay);
    if (sceneDirty || !sameSet(hidden, lastHidden) || key !== lastOverlay) {
      renderer.drawScene({ id: pageId, elementIds: doc.elementIds(pageId) }, camera, hidden, overlay);
      sceneDirty = false;
      lastHidden = hidden;
      lastOverlay = key;
    }
    renderer.drawLive({ strokes: parts.flatMap((p) => p.strokes), erasers: parts.flatMap((p) => p.erasers) }, camera);
    for (const cb of drawnListeners) cb(now);
    if (!toolList.some((t) => t.active())) loop.stop();
  }
```

  Dans `sink.begin` et `sink.close`, émettre l'état seulement si la sélection a changé (un clic de sélection la
  change au `begin`) :

```ts
    begin(pointerId, t, samples) {
      const g = tools[t];
      owner.set(pointerId, g);
      const before = selectTool.selection().join("\n");
      g.begin(pointerId, samples);
      if (selectTool.selection().join("\n") !== before) emit();
      loop.start();
    },
```

```ts
    close(pointerId, how) {
      const g = owner.get(pointerId);
      if (!g) return;
      owner.delete(pointerId);
      const before = selectTool.selection().join("\n");
      g.close(pointerId, how);
      if (selectTool.selection().join("\n") !== before) emit();
      loop.start(); // une image de plus : couche vive effacée, aperçu retiré
    },
```

- [ ] **8. `engine.ts` : outil, touches, pages.** Remplacer `setTool` :

```ts
    setTool(t) {
      if (t !== tool) {
        leaveAll("tool");
        tool = t;
        requestScene();
      }
      emit();
    },
```

  Remplacer `key`, `keyUp`, `releaseKeys` :

```ts
    key(e) {
      if (e.key === "Shift") {
        shiftHeld = true;
        return false;
      }
      if (isPanKey(e)) {
        spaceHeld = true;
        return true;
      }
      const edit = editAction(e);
      if (edit !== null) {
        const sel = selectTool.selection();
        if (sel.length === 0) return false;
        if (edit === "delete") run({ type: "Delete", ids: [...sel] });
        selectTool.setSelection([]);
        requestScene();
        emit();
        return true;
      }
      const action = keyAction(e);
      if (action === null) return false;
      history(action);
      return true;
    },
    keyUp(e) {
      if (e.key === "Shift") {
        shiftHeld = false;
        return false;
      }
      if (e.key !== " " || !spaceHeld) return false;
      spaceHeld = false;
      return true;
    },
    releaseKeys() {
      spaceHeld = false;
      shiftHeld = false;
    },
```

  Remplacer `removePage` :

```ts
    removePage() {
      leaveAll("page"); // texte ouvert validé sur la page encore présente, sélection vidée
      return run({ type: "RemovePage", page: pageId }) !== null;
    },
```

- [ ] **9. Vérifier.** Commande bornée → aucun `×` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`
  sans erreur (`main.ts` compile : ses fabriques d'édition sont facultatives) ; `pnpm --filter @roomboard/web build 2>&1 | tail -3` ;
  `cd ~/projets/roomboard-wt/socle--T55 && export PATH=$HOME/.cargo/bin:$PATH && scripts/verifier.sh 2>&1 | tail -30`
  → `verifier.sh : OK`.

- [ ] **10. Commit.**

```bash
cd ~/projets/roomboard-wt/socle--T55
git add apps/web/src/engine/engine.ts apps/web/src/engine/engine.test.ts apps/web/src/engine/input/gesture.ts apps/web/src/engine/input/router.ts apps/web/src/engine/input/router.test.ts apps/web/src/engine/input/keys.ts apps/web/src/engine/input/keys.test.ts apps/web/src/engine/render/trail-style.ts apps/web/src/engine/render/trail-style.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(engine): wire selection, shape and text tools, delete, escape and shift keys (T55)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
