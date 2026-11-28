# Plan d'exécution — personnalisation-2-outils (OG12 chapitre 2b, reprise OG33), lot 2b

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** quatre morceaux fusionnables l'un après l'autre dans `main`, chacun vert seul : (M1) losange atteignable depuis la
barre, lettres des outils dans les infobulles, message `BadFill` juste ; (M2) rotation au doigt, à la souris et au clavier ;
(M3) texte dans une forme ; (M4) pointes losange et navigation Alt+flèche.

**Architecture :** M1 est de l'interface seule (îlot contextuel de `Toolbar.tsx`) plus une chaîne du cœur. M2 : le cœur
porte déjà toute matrice (`valid_matrix`, `commands.rs:727` ; `Arrange rotate-cw`, `arrange.rs`) ; il gagne une commande
`Rotate { ids, angle }` qui réutilise `cmd_arrange` (portée « matrice » ou « place », groupes entiers, une étape) ; la page
gagne la poignée, le pas de 15° et Alt+T. M3 : le texte est une clé `label` de la forme (une seule entité : il suit
déplacer, tourner, copier, supprimer sans liaison), éditée par la zone de saisie de l'outil Texte. M4 : deux pointes de
plus, navigation par les liaisons lues sur la page.

**Tech Stack :** Rust (yrs 0.28, wasm-bindgen), TypeScript (Solid, Vitest), Canvas 2D, roughjs, Playwright.

**Spec :** `docs/plans/personnalisation-2-outils-cadrage.md` (§ 2.5 n° 35, § 2.4 n° 29 et 32, § 4 H3 H4 H5, modules à
réutiliser) ; plan du lot 2a `docs/plans/personnalisation-2-outils-LOT2-PLAN.md` § « Lot 2b (hors de ce plan) » ; état
`docs/sessions/personnalisation-2-outils-etat.md` (Lot 2b, Pièges, Prémisses démenties) ; profil `.claude/chantier.md` ;
charte `docs/plans/design-cadrage.md` (§ 10 netteté, Lucide du lot L1) ; fiche `docs/essais/outils-excalidraw.md`.

Base : le lot 2a est fusionné dans `main` (0e683c75) ; la branche du lot 2b intègre `origin/main` avant l'exécution.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| B1 | M1 : rangée « Formes », lettres des outils dans les infobulles, essai M1 | — | apps/web/src/ui/{Toolbar.tsx, Toolbar.test.tsx, shortcuts.ts, shortcuts.test.ts}, scripts/essais/{outils-excalidraw-2b-navigateur.mjs (neuf), dist-avant.sh (neuf), restes-personnalisation-1-navigateur.mjs}, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/essais/outils-excalidraw.md, docs/design/captures/personnalisation-2-outils/{avant-formes.png, apres-formes.png, apres-formes-infobulle.png} | isolé | implementeur-tdd | vitest `Toolbar.test.tsx` ≥ 1 test `rangée Formes` et ≥ 1 test `lettre de l'outil` ; `shortcuts.test.ts` ≥ 1 test `toolShortcut` ; `outils-excalidraw-2b : OK` avec `Lire : M1.tool=diamond` | S10 | #tache-b1 |
| B2 | M1 : message `BadFill` (losange, ligne fermée) | — | crates/roomboard-core/src/commands.rs, crates/roomboard-core/tests/pot.rs, apps/web/src/core/{fake-core.ts, wasm-core.contract.test.ts} | isolé | implementeur-tdd | `cargo test -p roomboard-core --test pot` ≥ 1 test `bad_fill_message_is_readable` ; vitest contrat ≥ 2 tests `C6a` verts (deux fabriques) | S10 | #tache-b2 |
| B3 | M2 : commande `Rotate` (cœur, pont, faux cœur, contrat, CLI) | B2 | crates/roomboard-core/src/{arrange.rs, commands.rs}, crates/roomboard-core/tests/arrange.rs, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts, arrange.ts, arrange.test.ts, fake-core.ts, wasm-core.ts, wasm-core.contract.test.ts}, apps/cli/src/{ops.ts, ops.test.ts}, scripts/essais/cli-essai.mjs | isolé | concepteur-critique | `cargo test -p roomboard-core --test arrange` ≥ 6 tests `rotate_` dont `rotate_30_keeps_center_one_step` et `rotate_bound_arrow_follows` ; taille Wasm avant/après au rapport ; vitest `contrat OG33 Rotate` ≥ 2 (deux fabriques) ; `CLI : OK` ; Wasm ≤ 1 572 864 o | S11 | #tache-b3 |
| B4 | M2 : poignée de rotation, Maj 15°, Alt+T, rendu | B1, B3 | apps/web/src/engine/tools/{handles.ts, handles.test.ts, select.ts, select.test.ts}, apps/web/src/engine/render/{overlay.ts, overlay.test.ts, canvas2d.ts, canvas2d.test.ts, link-badge.ts}, apps/web/src/engine/input/{keys.ts, keys.test.ts}, apps/web/src/engine/{engine.ts, engine.test.ts}, apps/web/src/ui/{shortcuts.ts, shortcuts.test.ts} | isolé | concepteur-critique | vitest `select.test.ts` ≥ 4 tests `poignée de rotation` ; `handles.test.ts` ≥ 1 test `rotateAngle` ; `engine.test.ts` ≥ 1 test `Alt+T` ; suite web verte | S11 | #tache-b4 |
| B5 | M2 : essai navigateur rotation, captures, fiche | B4 | scripts/essais/outils-excalidraw-2b-navigateur.mjs, docs/essais/outils-excalidraw.md, docs/design/captures/personnalisation-2-outils/{avant-rotation.png, apres-rotation.png} | isolé | implementeur-tdd | `outils-excalidraw-2b : OK` avec `Lire : M2.angle=30`, `M2.pas=0`, `M2.clavier=15`, `M2.coin=none` ; `verifier.sh : OK` | S11 | #tache-b5 |
| B6 | M3 : texte de forme `SetShapeLabel` (cœur, pont, faux cœur, contrat, CLI) | B3 | crates/roomboard-core/src/{label.rs (neuf), lib.rs, element.rs, document.rs, commands.rs, linear.rs}, crates/roomboard-core/tests/etiquettes.rs (neuf), crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts, fake-core.ts, wasm-core.ts, wasm-core.contract.test.ts}, apps/cli/src/{ops.ts, ops.test.ts}, scripts/essais/cli-essai.mjs | partagé | concepteur-critique | `cargo test -p roomboard-core --test etiquettes` ≥ 6 tests dont `label_one_step_undo` ; vitest `contrat OG33 SetShapeLabel` ≥ 2 ; `CLI : OK` ; Wasm ≤ 1 572 864 o | S12 | #tache-b6 |
| B7 | M3 : édition et rendu du texte de forme, double toucher, Entrée, export | B4, B6 | apps/web/src/core/{shape-label.ts (neuf), shape-label.test.ts (neuf)}, apps/web/src/engine/tools/{tool.ts, text.ts, text.test.ts, select.ts, select.test.ts}, apps/web/src/engine/render/{overlay.ts, canvas2d.ts, canvas2d.test.ts}, apps/web/src/engine/input/{keys.ts, keys.test.ts}, apps/web/src/engine/{engine.ts, engine.test.ts}, apps/web/src/app/{board-io.ts, board-io.test.ts} | isolé | implementeur-tdd | vitest `text.test.ts` ≥ 2 tests `texte de forme` ; `select.test.ts` ≥ 1 test `double toucher sur une forme : son texte` ; `engine.test.ts` ≥ 1 test `Entrée sur une forme` ; `canvas2d.test.ts` ≥ 1 test `texte de forme` ; `board-io.test.ts` ≥ 1 test `texte de forme exporté` | S12 | #tache-b7 |
| B8 | M3 : essai navigateur texte dans une forme, captures, fiche | B5, B7 | scripts/essais/outils-excalidraw-2b-navigateur.mjs, docs/essais/outils-excalidraw.md, docs/design/captures/personnalisation-2-outils/{avant-texte-forme.png, apres-texte-forme.png, apres-texte-losange.png} | isolé | implementeur-tdd | `outils-excalidraw-2b : OK` avec `Lire : M3.label=Bonjour`, `M3.shape=rect`, `M3.enter=Losange` ; `verifier.sh : OK` | S12 | #tache-b8 |
| B9 | M4 : pointes `diamond` et `diamond_outline` | B6, B7 | crates/roomboard-core/src/element.rs, crates/roomboard-core/tests/fleches.rs, apps/web/src/core/{look.ts, look.test.ts}, apps/web/src/engine/render/{canvas2d.ts, canvas2d.test.ts, sketch.ts, sketch.test.ts}, apps/web/src/ui/{OptionsPanel.tsx, OptionsPanel.test.tsx, icons.ts, icons.test.ts} | isolé | implementeur-tdd | `cargo test -p roomboard-core --test fleches` ≥ 1 test `diamond_heads_round_trip` ; vitest `look.test.ts`, `canvas2d.test.ts` ≥ 1 test `pointe losange` ; `OptionsPanel.test.tsx` ≥ 1 test `Losange creux` | S13 | #tache-b9 |
| B10 | M4 : navigation Alt+flèche entre objets reliés, essai M4, fiche | B8, B9 | apps/web/src/engine/{flow-nav.ts (neuf), flow-nav.test.ts (neuf), engine.ts, engine.test.ts}, apps/web/src/engine/input/{keys.ts, keys.test.ts}, apps/web/src/ui/{shortcuts.ts, shortcuts.test.ts}, scripts/essais/outils-excalidraw-2b-navigateur.mjs, docs/essais/outils-excalidraw.md | isolé | implementeur-tdd | vitest `flow-nav.test.ts` ≥ 3 tests ; `engine.test.ts` ≥ 1 test `Alt+→` ; `outils-excalidraw-2b : OK` avec `Lire : M4.nav` = boîte de B (`data-bounds`) ; `verifier.sh : OK` | S13 | #tache-b10 |

**Morceaux** (fusion dans `main` après la dernière tâche de chacun, `scripts/verifier.sh --e2e` vert) : M1 = B1 + B2 ; M2 =
B3 + B4 + B5 ; M3 = B6 + B7 + B8 ; M4 = B9 + B10. Ordre de sortie si le temps manque : M4 entier, puis M3 entier ; un
morceau n'est jamais fusionné à moitié.

## Vagues

| vague | tâches | sert |
|---|---|---|
| V1 | B1 ∥ B2 | M1 |
| V2 | B3 (dès B2 fini, pendant que B1 finit) | M2 cœur |
| V3 | B4 ∥ B6 (fichiers disjoints) | M2 page, M3 cœur |
| V4 | B5 ∥ B7 | M2 essai, M3 page |
| V5 | B8 ∥ B9 | M3 essai, M4 pointes |
| V6 | B10 | M4 |

B6 est marqué `partagé` : il suit B3 sur les mêmes fichiers du cœur et du pont (jamais en parallèle avec lui).

## Scénarios du lot 2b (dérivés du cadrage n° 33, 35, 28 ; à revoir)

- **S10 — Losange depuis la barre (M1).** Profil par défaut, au doigt : toucher Rectangle ; sous la barre, la rangée
  « Formes » montre Rectangle, Losange, Ellipse (44 px) ; toucher Losange : `data-tool="diamond"` ; glisser : un losange.
  La barre d'outils ne change ni de largeur ni de rangée à 1280 px. Souris : survol de Rectangle 400 ms : infobulle
  « Rectangle » et `data-keys="R ou 2"`. Pot refusé : le message cite le losange et la ligne fermée.
- **S11 — Rotation (M2).** Au doigt : un rectangle choisi montre une poignée ronde sous son coin bas droit ; la tirer de 30°
  autour du centre : la matrice tourne de 30°, une étape. Second doigt tardif (Maj) : multiple de 15°. Souris + Maj :
  idem. Alt+T : +15° ; Alt+Maj+T : −15°. Toucher un coin de la boîte englobante hors de la forme tournée : rien. Un objet
  tourné hors des quarts de tour n'a plus ses 8 poignées de taille (pas de cisaillement). CLI : `Rotate` puis `undo`.
- **S12 — Texte dans une forme (M3).** Au doigt : double toucher sur un rectangle : zone de saisie centrée dans la forme,
  taper « Bonjour », Échap : `shape.label = "Bonjour"`, la forme reste un rectangle (aucune conversion, décision du lot 2a).
  Déplacer et tourner la forme : le texte suit. Clavier : losange choisi, Entrée, taper, Échap. Annuler : une étape. CLI :
  `SetShapeLabel`, `undo`.
- **S13 — Pointes et navigation (M4).** Pointe de fin « Losange creux » choisie au panneau (44 px, icône nette). Deux
  rectangles A et B reliés par une flèche, A choisi, Alt+→ : B choisi.

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `apps/web/src/ui/Toolbar.tsx`, `shortcuts.ts` | rangée « Formes » (`ShapeRow`, `SHAPE_TOOLS`), `toolShortcut` ; lignes de raccourcis neuves | B1, B4, B10 |
| `scripts/essais/outils-excalidraw-2b-navigateur.mjs` (neuf), `dist-avant.sh` (neuf) | essai du lot 2b (`--only m1…m4`, `--captures`), application « avant » | B1, B5, B8, B10 |
| `crates/roomboard-core/src/arrange.rs`, `commands.rs` | `rotation`, `plan_rotate`, `cmd_rotate`, `Command::Rotate` ; message `BadFill` ; `Command::SetShapeLabel` | B2, B3, B6 |
| `crates/roomboard-core/src/label.rs` (neuf), `element.rs`, `document.rs`, `linear.rs` | clé `label`, `ShapeView.label`, copie d'`AddLinked` sans texte | B6, B9 |
| `crates/roomboard-wasm/src/lib.rs` | `rotate`, `set_shape_label` | B3, B6 |
| `apps/web/src/core/{api.ts, arrange.ts, fake-core.ts, wasm-core.ts}` | contrat et miroir | B2, B3, B6 |
| `apps/web/src/core/shape-label.ts` (neuf) | boîte du texte d'une forme | B7 |
| `apps/web/src/engine/tools/{handles.ts, select.ts, text.ts, tool.ts}` | poignée de rotation ; double toucher ; séance de texte de forme | B4, B7 |
| `apps/web/src/engine/render/{overlay.ts, canvas2d.ts, link-badge.ts, sketch.ts}` | poignée, `noResize`, texte de forme, pointes | B4, B7, B9 |
| `apps/web/src/engine/{engine.ts, flow-nav.ts}`, `input/keys.ts` | Alt+T, Entrée, Alt+flèche | B4, B7, B10 |
| `apps/web/src/app/board-io.ts` | texte de forme exporté en texte | B7 |
| `apps/cli/src/ops.ts`, `scripts/essais/cli-essai.mjs` | `Rotate`, `SetShapeLabel` (D15) | B3, B6 |

Hors carte, voulu : `FORMAT_LOTS` inchangé (aucun format ne change, prémisse de l'état) ; `crates/roomboard-formats` inchangé
(`write.rs:75` écrit déjà `transform="matrix(…)"` pour toute matrice : la rotation s'exporte sans code) ; `table.rs`,
`table-geom.ts`, `table.ts` (OG32), panneau d'image, sections médias et 3D (OG34) jamais touchés.

## Choix tranchés ici (sources lues)

1. **« Dans la barre par défaut » = atteignable depuis la barre, sans largeur ajoutée** : la rangée « Formes » s'ouvre dans
   l'îlot contextuel sous la barre (le patron de `TableActionRow`, `Toolbar.tsx`) dès qu'un outil de forme est actif et
   qu'une des trois formes manque à la barre. Raison : f97bbae0 a retiré le bouton Losange parce que la barre (1 058 px)
   quittait la rangée du haut à 1 280 px ; un bouton « menu » coûterait la même largeur ; l'îlot contextuel n'en prend
   aucune, garde les cibles de 44 px et ne change ni le format des profils ni les `data-item` des essais. Au clavier : D, 3.
   Excalidraw groupe aussi les formes dans un menu sur sa barre mobile (souvenir, clone absent de la VM : non vérifié).
2. **Lettres dans l'infobulle** : « R ou 2 » (lettre, puis chiffre) ; `aria-keyshortcuts="R 2"` (deux raccourcis séparés
   par une espace, WAI-ARIA). Main : « H ». Un outil sans lettre (Tableau, Pot) n'a rien.
3. **Rotation dans le cœur** : prémisse « pas de rotation » démentie à moitié : toute matrice inversible est admise
   (`valid_matrix`) et `Arrange rotate-cw` tourne déjà ; il manquait un angle quelconque avec la portée d'Arrange (texte,
   tableau, média, objet 3D : place seule, H5 d'OG23) en une étape : `Rotate { ids, angle }` réutilise `cmd_arrange`
   (ajout Rust minimal, OG35). Angle en degrés, sens horaire à l'écran (y vers le bas) ; quarts de tour exacts.
4. **Poignée de rotation sous le coin bas droit** (26 px écran en diagonale, rond de 24 px, cible de 44 px au doigt, 24 à la
   souris) : le haut du cadre est pris par « + » (40 px, n° 28) et « Déplacer » (28 px, OG23), le coin haut droit par le
   badge du lien (T18), le coin haut gauche par le badge « copie » (OG23). Écart avec Excalidraw (poignée en haut au milieu).
5. **Pas de 15°** : Maj (ou second doigt tardif, n° 29) cale l'angle absolu d'un objet seul (celui de sa matrice), le delta
   d'une sélection multiple, comme `SHIFT_LOCKING_ANGLE` d'Excalidraw.
6. **Raccourci** : Alt+T (+15°), Alt+Maj+T (−15°), lettre lue par `code` comme `arrangeKey`. Maj+R et Alt+Maj+R (90°, OG23)
   inchangés. `[` et `]` écartés (AltGr en AZERTY), Ctrl+R écarté (rechargement du navigateur).
7. **Objet tourné hors des quarts de tour : pas de poignée de taille** (rotation et déplacement gardés). Redimensionner dans
   le repère de l'objet demande un cadre tourné : hors de ce lot. Sinon l'échelle aux axes du monde cisaillerait la forme.
8. **Texte dans une forme = clé `label` de la forme**, pas un second élément : il suit déplacer, tourner, copier, supprimer
   et l'annulation sans aucune liaison à tenir dans le cœur (le `containerId` d'Excalidraw demanderait suivi, suppression en
   cascade et renumérotation en Rust, contraire à OG35). Texte simple (pas de gras), taille 24 (plus petite de
   `TEXT_SIZES`, la plus proche des 20 d'Excalidraw), couleur du trait, centré, boîte inscrite (`BOUND_TEXT_PADDING` 5 ;
   losange w/2, ellipse w/√2). `ShapeToPolygon` retire `label` (H5 : la ligne fermée perd le texte, l'annulation le rend) ;
   la copie d'`AddLinked` part sans texte (`cloneFlowchartNode` d'Excalidraw ne copie pas le texte).
9. **Double toucher = double-clic** sur rectangle, losange, ellipse : ouvre son texte, jamais la conversion (décidé au lot
   2a, C4b). Entrée sur une forme seule choisie : idem.
10. **Navigation Alt+flèche** : vers l'objet relié par une flèche liée dans la direction (axe dominant du centre), le plus
    proche ; rien dans la direction : la touche passe. Alt+flèche reste au tableau en outil Tableau avec une case active.

## Global Constraints

Chaque ligne est recopiée dans la section des tâches qu'elle concerne (marque entre crochets).

- **GC1 VM partagée** [toutes] : toute commande commence par `cd <worktree de la tâche> &&` ; `export
  PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4` ; toute commande lourde sous
  `nice -n 10` ; `cargo … -j 4` ; vitest ciblé `cd apps/web && nice -n 10 npx vitest run <fichiers>` ; suites complètes par
  `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>` ; aucun `tauri build`, aucun `jeton.ps1` ; commande de plus de
  2 min en arrière-plan, jamais de boucle `sleep`.
- **GC2 Tailles Wasm** [B2, B3, B6, B9] : module principal ≤ 1 572 864 o (mesuré après `wasm-bindgen` puis
  `pnpm exec wasm-opt -Oz`, comme `verifier.sh`), formats ≤ 3 145 728 o ; plafonds jamais relevés ; `opt-level = "z"`
  refusé ; ajouts Rust minimes (OG35) : ce qui peut vivre côté TS y vit.
- **GC3 Tests** [toutes] : aucun test désactivé, sauté ou affaibli ; aucun seuil ni délai relevé ; un test qui fige un
  comportement changé par une décision de ce plan est mis à la nouvelle valeur et consigné au rapport (rien d'autre).
- **GC4 Commits** [toutes] : fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`, `--force`) ; forme
  `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message anglais>" -m
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- **GC5 CLI (D15)** [B3, B6] : toute commande neuve entre dans `COMMAND_TYPES` (`apps/cli/src/ops.ts`), ses tests
  (`ops.test.ts`, compte des commandes) et un bloc de `scripts/essais/cli-essai.mjs` (sortie `CLI : OK`) ; `FORMAT_LOTS`
  inchangé.
- **GC6 Excalidraw** [B3, B4, B7, B9, B10] : code repris d'Excalidraw (MIT) : mention MIT en tête du bloc ; la fiche cite
  `fichier:fonction` ; `THIRD_PARTY_NOTICES.md` seulement si un fichier neuf reprend du code.
- **GC7 Tactile** [B1, B4, B5, B7, B8, B9, B10] : doigt d'abord (cibles ≥ 44 px, appui long au lieu du clic droit, glisser
  aux événements de pointeur, jamais HTML5 drag), chaque geste a son raccourci clavier ; icônes Lucide (ISC), trait fin,
  `ICON_VIEWBOX`, netteté § 10 de `docs/plans/design-cadrage.md` (0 frange colorée à 2x).
- **GC8 Format** [B3, B6, B9] : `schema` 1 et `formatVersion` 1 inchangés ; `label` facultatif, jamais écrit vide ; un
  fichier de `main` se relit et se réenregistre octet pour octet (`tests/fleches.rs::old_file_keeps_bytes` vert).
- **GC9 Rust** [B2, B3, B6, B9] : `cargo fmt --all --check` et `nice -n 10 cargo clippy --workspace --all-targets -j 4 --
  -D warnings` verts avant le commit.
- **GC10 Worktree neuf** [toutes] : `pnpm install --frozen-lockfile` à la racine avant le premier test ; modules Wasm
  construits comme `verifier.sh` avant tout contrat ou essai (commande « Wasm » ci-dessous).
- **GC11 Rouge hors périmètre** [toutes] : consigné au rapport, jamais corrigé (piège connu : `office-node.test.ts:118`
  instable sous charge, vert rejoué seul).
- **GC12 Voisins** [toutes] : ne pas toucher `table.rs`, `table-geom.ts`, `engine/tools/table.ts`, panneau du tableau (OG32),
  panneau de retouche d'image, sections médias et 3D d'`OptionsPanel.tsx` (OG34) ; Rust hors `table.rs` = zone d'OG35,
  ajouts courts seulement.
- **GC13 Empreinte S6** [toutes] : aucune tâche ne touche `zone.rs`, `ink/`, ni la géométrie des traits ; si
  `zone-s6-banc.test.ts` rougit quand même, relever le nouveau hash et le documenter dans `docs/essais/c8-porte-s6.md` comme
  la PR 53, au rapport.
- **GC14 Rapport** [toutes] : le rapport de tâche porte `Réutilisation : appelé <module>` ou `Réutilisation : écart —
  <pourquoi>` pour chaque ligne `Réutilise :` de sa section.

Commande « Wasm » (GC10, recopiée là où elle sert) :

```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 \
 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm \
    target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release -j 4 \
 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && pnpm exec wasm-opt -Oz apps/web/src/wasm/roomboard_wasm_bg.wasm -o apps/web/src/wasm/roomboard_wasm_bg.wasm \
 && pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm \
 && stat -c %s apps/web/src/wasm/roomboard_wasm_bg.wasm      # ≤ 1 572 864
```

Commande « Essai » (application et CLI construites, puis l'essai) :

```bash
cd <worktree> && nice -n 10 pnpm --filter @roomboard/web build >/dev/null && pnpm --filter @roomboard/cli build >/dev/null \
 && node scripts/essais/outils-excalidraw-2b-navigateur.mjs --only <m> 2>&1 | tail -20
```

## Review Focus

1. **Barre à 1 280 px** : la rangée « Formes » ne doit jamais élargir la barre d'outils ni la faire changer de rangée (cause
   de f97bbae0) — S10. Test : `rangée Formes : hors de la barre, dans l'îlot contextuel` (B1) et lectures `M1.barre` (place et largeur) et `M1.ilot` (bord droit ≤ 1280) (B1).
2. **Texte d'une forme tournée ou retournée** : il tourne avec la forme (repère local), à l'export comme à l'écran — choix 8,
   S12. Test : `texte de forme : peint dans le repère de la forme` (B7), `texte de forme exporté avec la matrice` (B7).
3. **Rotation d'une sélection mêlée texte + forme** : le texte garde sa matrice, sa place tourne ; jamais de texte tourné —
   choix 3. Test : `rotate_text_keeps_matrix_moves_place` (B3) et `Rotate texte + rectangle` (contrat, B3).
4. **Cisaillement** : un objet tourné de 30° puis redimensionné aux axes deviendrait un parallélogramme — choix 7. Test :
   `objet tourné de 30° : aucune poignée de taille` (B4).
5. **Fichier ancien et lecture tolérante** : une clé `label` non textuelle (autre version) se lit absente sans erreur ;
   un fichier de `main` garde ses octets — GC8. Test : `label_non_string_reads_absent` (B6), `old_file_keeps_bytes` vert (B6).

---

## Tâches

<a id="tache-b1"></a>
### Tâche B1 — M1 : rangée « Formes », lettres des outils dans les infobulles, essai M1

**Objectif :** le Losange s'atteint depuis la barre du profil par défaut sans la rendre plus large (choix 1) ; l'infobulle
d'un bouton d'outil montre sa lettre et son chiffre (choix 2) ; essai navigateur du lot 2b créé, avec captures avant et
après. Scénario S10.

**Fichiers :** `apps/web/src/ui/{Toolbar.tsx, Toolbar.test.tsx, shortcuts.ts, shortcuts.test.ts}`,
`scripts/essais/{outils-excalidraw-2b-navigateur.mjs (neuf), dist-avant.sh (neuf), restes-personnalisation-1-navigateur.mjs}`,
`scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/outils-excalidraw.md`,
`docs/design/captures/personnalisation-2-outils/{avant-formes.png, apres-formes.png, apres-formes-infobulle.png}`.

**Interfaces :**
- Produit : `export function toolShortcut(tool: string | undefined): { readonly text: string; readonly aria: string } | null`
  (`shortcuts.ts`) ; `export const SHAPE_TOOLS: readonly ToolId[] = ["rect", "diamond", "ellipse"]` (`Toolbar.tsx`) ;
  attribut `data-shape-choice="<outil>"` sur les boutons de la rangée ; script
  `scripts/essais/outils-excalidraw-2b-navigateur.mjs [--only m1|m2|m3|m4] [--captures] [--dist <d> --nom avant]`, sortie
  `outils-excalidraw-2b : OK` ; `scripts/essais/dist-avant.sh <dossier>` (application de la base du morceau).
- Réutilise : `apps/web/src/ui/Toolbar.tsx` — `TableActionRow` (patron de rangée contextuelle), `toolOf(choice)`,
  `itemState(item, view)`, `iconFor(item, icon)`, `IconButton` (props `icon`, `label`, `pressed`, `shortcut`, `attrs`,
  `onPress`).
- Réutilise : `apps/web/src/ui/shortcuts.ts` — `shortcutText(id, mac)` et les lignes `tool-<id>` / `tool-<id>-num` de L8.
- Réutilise : `scripts/essais/gestes.mjs` (`newPage`, `useTool`, `touchDrag`, `tapAt`, `saved`, `waitAttr`), `commun.mjs`
  (`serve`, `loadPlaywright`, `frames`, `item`, `stageBox`, `VIEWPORT`, `Echec`, `gitSha`), `nettete.mjs` (`pixelsOf`,
  `fringes`).

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 npx vitest run src/ui/Toolbar.test.tsx src/ui/shortcuts.test.ts 2>&1 | tail -8
# attendu : « Test Files  2 passed » ; noms « rangée Formes », « lettre de l'outil », « toolShortcut » présents (-t pour les voir)
```
Puis la commande « Wasm », la commande « Essai » avec `--only m1` (attendu `outils-excalidraw-2b : OK`, lignes
`Lire : M1.…`), `node scripts/essais/restes-personnalisation-1-navigateur.mjs 2>&1 | tail -3` (vert) et
`bash scripts/tests/verifier-e2e.test.sh` (code 0).

**Preuve visuelle :** lectures d'abord : `Lire : M1.row=rect,diamond,ellipse`, `Lire : M1.cible=44x44` (au moins),
`Lire : M1.tool=diamond`, `Lire : M1.diamond=1`, `Lire : M1.tip=R ou 2`, `Lire : M1.barre=<y:largeur>/<y:largeur>` (égales avec et sans
rangée ; `.rb-context` est en absolute, la hauteur ne prouverait rien), `Lire : M1.ilot=<bord droit>` (≤ 1280), `Lire : M1.nettete=0`. Puis captures 2x : `avant-formes.png` (base : Rectangle actif, pas de rangée),
`apres-formes.png` (rangée sous la barre, Losange enfoncé), `apres-formes-infobulle.png`. À décrire : alignement de la
rangée sous la barre, netteté de l'icône losange.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&` ; `nice -n 10` ; vitest ciblé ; suites par `suite-vm.cjs` ; aucun `tauri build`.
- GC3 Tests : aucun test affaibli ; le test qui fige « Stylo sans raccourci » (`Toolbar.test.tsx` l. ~512 et
  `restes-personnalisation-1-navigateur.mjs` l. ~145) passe sur `table` (Tableau, sans lettre) et le Stylo attend
  « P ou 7 » : consigné au rapport.
- GC4 Commits : fichiers un par un, auteur `jejeasterix`, message anglais, trailer Opus 5.5.
- GC7 Tactile : cibles ≥ 44 px, doigt d'abord ; icône Lucide `diamond` déjà dans `icons.ts`, netteté § 10.
- GC10 Worktree neuf : `pnpm install --frozen-lockfile` ; Wasm construit avant l'essai.
- GC11, GC12, GC13, GC14 : rouge hors périmètre consigné ; zones voisines intactes ; empreinte S6 non touchée ; lignes
  `Réutilisation :` au rapport.

**Interdits :** pas de nouvelle sorte d'élément de profil (`ITEM_KINDS` inchangé), pas de bouton Losange remis dans
`toolbar-profiles.ts`, aucun `data-item` existant renommé. Ne pas toucher `outils-excalidraw-navigateur.mjs`.

**Terminé :** deux fichiers vitest verts, suite web verte (`suite-vm.cjs`), `outils-excalidraw-2b : OK` (m1), trois
captures, fiche à jour, commits.

**Étapes :**

1. Tests rouges, `shortcuts.test.ts` :

```ts
describe("toolShortcut (OG33 lot 2b)", () => {
  it("toolShortcut : lettre puis chiffre, aria à deux raccourcis ; Main : la lettre ; sans lettre : null", () => {
    expect(toolShortcut("rect")).toEqual({ text: "R ou 2", aria: "R 2" });
    expect(toolShortcut("pen")).toEqual({ text: "P ou 7", aria: "P 7" });
    expect(toolShortcut("hand")).toEqual({ text: "H", aria: "H" });
    expect(toolShortcut("table")).toBeNull();
    expect(toolShortcut(undefined)).toBeNull();
  });
});
```

   `Toolbar.test.tsx` (aides du fichier : `setup`, `VIEW`, `tipOf` du test OG19 l. ~493, à remonter en aide de fichier) :

```ts
describe("Toolbar — rangée Formes (OG33 lot 2b)", () => {
  const shapes = (c: HTMLElement) => [...c.querySelectorAll("[data-shape-choice]")].map((b) => b.getAttribute("data-shape-choice"));
  it("rangée Formes : Rectangle actif dans le profil par défaut : trois formes, hors de la barre, dans l'îlot contextuel", () => {
    const { container, setV } = setup();
    expect(shapes(container)).toEqual([]);
    setV({ ...VIEW, tool: "rect" });
    expect(shapes(container)).toEqual(["rect", "diamond", "ellipse"]);
    expect(container.querySelector("[data-island-context] [data-shape-choice='diamond']")).not.toBeNull();
    expect(container.querySelector('[data-item="diamond"]')).toBeNull();
  });
  it("rangée Formes : toucher Losange → setTool(diamond) ; Losange actif : la rangée reste, Losange enfoncé", () => {
    const { container, setV, host } = setup();
    setV({ ...VIEW, tool: "rect" });
    fireEvent.click(container.querySelector("[data-shape-choice='diamond']")!);
    expect(host.setTool).toHaveBeenCalledWith("diamond");
    setV({ ...VIEW, tool: "diamond" });
    expect(container.querySelector("[data-shape-choice='diamond']")!.getAttribute("aria-pressed")).toBe("true");
  });
  it("rangée Formes : barre qui porte déjà les trois formes : aucune rangée", () => {
    const { container, setV } = setup(mkBar([tool("rect"), tool("diamond"), tool("ellipse")], "floating"));
    setV({ ...VIEW, tool: "rect" });
    expect(shapes(container)).toEqual([]);
  });
  it("lettre de l'outil : l'infobulle de Rectangle porte « R ou 2 », aria-keyshortcuts « R 2 »", () => {
    vi.useFakeTimers();
    try {
      const { container } = setup();
      expect(tipOf(container, 'button[data-item="rect"]')).toEqual({ text: "Rectangle", keys: "R ou 2" });
      expect(container.querySelector('button[data-item="rect"]')!.getAttribute("aria-keyshortcuts")).toBe("R 2");
    } finally {
      vi.useRealTimers();
    }
  });
});
```

   Dans le test OG19 existant : la ligne « Sans raccourci » vise `button[data-item="table"]` (`{ text: "Tableau", keys: null }`)
   et la ligne du Stylo attend `{ text: "Stylo", keys: "P ou 7" }`. Lancer : rouge (`toolShortcut` absent).

2. `shortcuts.ts`, à la fin :

```ts
/** OG33 (lot 2b, choix 2) : lettre et chiffre d'un outil (lignes `tool-<id>` et `tool-<id>-num`), montrés dans son
 *  infobulle : « R ou 2 » ; `aria-keyshortcuts` « R 2 » (deux raccourcis séparés par une espace, WAI-ARIA) ; null sans lettre. */
export function toolShortcut(tool: string | undefined): { readonly text: string; readonly aria: string } | null {
  if (tool === undefined) return null;
  const letter = shortcutText(`tool-${tool}`, false);
  if (letter === null) return null;
  const digit = shortcutText(`tool-${tool}-num`, false);
  return digit === null ? { text: letter, aria: letter } : { text: `${letter} ou ${digit}`, aria: `${letter} ${digit}` };
}
```

3. `Toolbar.tsx` : import `toolShortcut` ; dans `Button`, `const keys = props.item.kind === "action" ?
   buttonShortcut(props.item.action) : props.item.kind === "tool" ? toolShortcut(props.item.tool) : null;`. Puis, après
   `TableActionRow` :

```tsx
/** OG33 (lot 2b, choix 1) : outils du menu « Formes », dans l'ordre d'Excalidraw (`Tools.tsx`). */
export const SHAPE_TOOLS: readonly ToolId[] = ["rect", "diamond", "ellipse"];
const shapeItem = (t: ToolId): ToolItem => ({ id: `shape-${t}`, kind: "tool", tool: t, label: TOOL_TABLE[t]?.label ?? t, requires: [], rest: {} });

/** Rangée « Formes » (OG33) : un outil de forme actif et au moins une des trois formes absente de la barre (le Losange du
 *  profil par défaut, f97bbae0) : les trois formes dans l'îlot contextuel, sous la barre ; aucune largeur prise à la barre. */
function ShapeRow(props: { items: Accessor<readonly ToolItem[]>; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const shown = createMemo(() => {
    const active = toolOf(props.view().tool);
    if (active === null || !SHAPE_TOOLS.includes(active)) return false;
    const inBar = new Set(props.items().filter((i) => i.kind === "tool").map((i) => i.tool));
    return SHAPE_TOOLS.some((t) => !inBar.has(t));
  });
  return (
    <Show when={shown()}>
      <span class="rb-sep" role="separator" data-shapes-sep />
      <For each={SHAPE_TOOLS}>
        {(t) => {
          const item = shapeItem(t);
          const st = createMemo(() => itemState(item, props.view()));
          return (
            <IconButton
              icon={iconFor(item, st().icon)}
              label={st().label}
              pressed={st().pressed}
              shortcut={toolShortcut(t)}
              attrs={{ "data-shape-choice": t }}
              onPress={() => props.host.setTool(t)}
            />
          );
        }}
      </For>
    </Show>
  );
}
```

   Dans `rows()` de `Toolbar`, en premier : `<ShapeRow items={items} view={props.view} host={props.host} />`. Vert.

4. `scripts/essais/dist-avant.sh` (neuf, `chmod +x`) :

```bash
#!/usr/bin/env bash
# OG33 (lot 2b) : application de la base du morceau (merge-base HEAD origin/main) dans <dossier>, pour les captures
# « avant » : worktree détaché sous /tmp, modules Wasm recopiés du worktree courant (ajouts seulement), build web seul.
set -euo pipefail
dest=${1:?usage : dist-avant.sh <dossier>}
cd "$(dirname "$0")/../.."
base=$(git merge-base HEAD origin/main)
wt=$(mktemp -d /tmp/og33-avant-XXXXXX)
git worktree add --detach "$wt" "$base" >/dev/null
trap 'rm -rf "$wt"; git worktree prune' EXIT
cp -r apps/web/src/wasm apps/web/src/wasm-formats "$wt/apps/web/src/"
(cd "$wt" && pnpm install --frozen-lockfile --prefer-offline >/dev/null && nice -n 10 pnpm --filter @roomboard/web build >/dev/null)
rm -rf "$dest" && cp -r "$wt/apps/web/dist" "$dest"
echo "dist-avant : $dest (base $base)"
```

5. `scripts/essais/outils-excalidraw-2b-navigateur.mjs` (neuf). En-tête : but, usage, codes de sortie (0, 1, 2) sur le
   modèle de `outils-excalidraw-navigateur.mjs` l. 1-9. Corps : `main()` recopié de ce fichier (l. 951-1014 : contrôle de
   `dist/index.html` et du binaire CLI, `loadPlaywright`, `serve`, `mkdtempSync`, `--only`, `--captures`, `--nom`), avec
   `LABEL = "outils-excalidraw-2b"`, `OUT = docs/design/captures/personnalisation-2-outils`, aides locales `check`,
   `lire`, `tool(page, id)` (pause 600 ms, `useTool(page, "doigt", id)`, `waitAttr(page, "data-tool", id)`) et `shoot`
   recopiées ; puis :

```js
/** M1 (S10) : Losange par la rangée « Formes » au doigt ; lettre dans l'infobulle ; barre inchangée. */
async function m1(browser, base, tmp) {
  const { ctx, page, cdp, errors } = await newPage(browser, base, { scale: 2 });
  // `.rb-context` est en `position: absolute` (rb.css:143) : la hauteur de la barre ne bouge jamais ; on lit sa place
  // (y, largeur) avant et après, et le bord droit de l'îlot contextuel (dans la fenêtre de 1280 px).
  const bar = async () => {
    const b = await page.locator('[data-toolbar="outils"]').first().boundingBox();
    return `${Math.round(b.y)}:${Math.round(b.width)}`;
  };
  const h0 = await bar();
  await tool(page, "rect");
  const row = await page.$$eval("[data-shape-choice]", (bs) => bs.map((b) => b.getAttribute("data-shape-choice")).join(","));
  lire("M1.row", row);
  check(row === "rect,diamond,ellipse", "M1 : Rectangle touché : la rangée Formes montre les trois formes");
  const bb = await page.locator("[data-shape-choice='diamond']").boundingBox();
  lire("M1.cible", `${Math.round(bb.width)}x${Math.round(bb.height)}`);
  check(bb.width >= 43.5 && bb.height >= 43.5, "M1 : cible Losange ≥ 44 px");
  const h1 = await bar();
  lire("M1.barre", `${h0}/${h1}`);
  check(h0 === h1, "M1 : la barre d'outils garde sa place et sa largeur (même rangée à 1280 px)");
  const isle = await page.locator('[data-toolbar="outils"] [data-island-context]').first().boundingBox();
  lire("M1.ilot", Math.round(isle.x + isle.width));
  check(isle.x + isle.width <= VIEWPORT.width, "M1 : l'îlot de la rangée Formes tient dans la fenêtre de 1280 px");
  await tapAt(page, bb.x + bb.width / 2, bb.y + bb.height / 2);
  await waitAttr(page, "data-tool", "diamond");
  lire("M1.tool", "diamond");
  await touchDrag(page, cdp, [500, 300], [620, 400]);
  const s = await saved(page, tmp, "m1.roomboard");
  const n = s.elements.filter((e) => e.shape?.shape === "diamond").length;
  lire("M1.diamond", n);
  check(n === 1, "M1 : un losange posé au doigt depuis la rangée");
  // Netteté de l'icône de la rangée (§ 10) : même mesure que `cibles2a` d'outils-excalidraw-navigateur.mjs.
  // … pixelsOf + fringes sur `[data-shape-choice='diamond'] svg.rb-icon` → lire("M1.nettete", f) ; check(f === 0, …)
  await page.hover(item("rect"));
  const tip = page.locator('[role="tooltip"]');
  await tip.waitFor({ state: "visible", timeout: 5000 });
  const keys = await tip.getAttribute("data-keys");
  lire("M1.tip", keys);
  check(keys === "R ou 2", "M1 : infobulle de Rectangle : « R ou 2 »");
  check(errors.length === 0, "M1 : aucune erreur dans la page");
  await ctx.close();
}
```

   La mesure de netteté reprend `colorsOf`, `rgbOf` et la ligne `fringes(px, fond, encre)` de
   `outils-excalidraw-navigateur.mjs` (l. 674-710, 797-804), recopiées dans ce fichier. Captures (`--captures`) :
   `capturesM1(browser, base, nom)` : Rectangle actif, `shoot("<nom>-formes", { x: 0, y: 0, width: 1280, height: 200 })` ;
   avec `nom === "apres"` aussi le survol de Rectangle : `shoot("apres-formes-infobulle", …)`. `main` appelle `m1` sous
   `on("m1")` et `capturesM1` sous `--captures`.

6. `scripts/verifier.sh` : après `echo "outils-excalidraw : OK"`, deux lignes :
   `  node scripts/essais/outils-excalidraw-2b-navigateur.mjs` et `  echo "outils-excalidraw-2b : OK"`.
   `scripts/tests/verifier-e2e.test.sh`, à la fin des `grep -q` : `grep -q "scripts/essais/outils-excalidraw-2b-navigateur.mjs"
   scripts/verifier.sh || ko "outils-excalidraw-2b-navigateur absent de verifier.sh"`. `restes-personnalisation-1-navigateur.mjs`
   l. ~143-145 : `item("pen")` → `item("table")`, message « Tableau, sans raccourci dans la table : aucun data-keys ».

7. Commande « Wasm », commande « Essai » `--only m1` ; captures : `scripts/essais/dist-avant.sh /tmp/og33-avant-m1` puis
   `node scripts/essais/outils-excalidraw-2b-navigateur.mjs --captures --dist /tmp/og33-avant-m1 --nom avant`, puis
   `… --captures` (après). Fiche : section « Raccourcis d'outils », ligne « lettres et chiffres » → `copié` (S et G restent
   aux pipettes), essai `outils-excalidraw-2b` m1 (`Lire : M1.tip`) ; section « Rectangle, losange, ellipse », ligne
   « losange » : « atteint par la rangée Formes (choix 1 du plan 2b) », essai m1.

8. Suite web par `suite-vm.cjs -- pnpm --filter @roomboard/web test`. Commits :
   `feat(ui): shapes row and tool letters in tooltips (OG33 lot 2b)` puis
   `test(essais): lot 2b browser check M1, captures and sheet`.

<a id="tache-b2"></a>
### Tâche B2 — M1 : message `BadFill` (losange, ligne fermée)

**Objectif :** le refus du pot nomme les intérieurs admis depuis le lot 2a (`fillable()`, `commands.rs:539` : toute forme
non segment et la ligne fermée). Scénario S10.

**Fichiers :** `crates/roomboard-core/src/commands.rs` (l. ~478-481), `crates/roomboard-core/tests/pot.rs` (l. ~266-271),
`apps/web/src/core/fake-core.ts` (l. ~231, `MESSAGES.badFill`), `apps/web/src/core/wasm-core.contract.test.ts` (l. ~2550
`BAD_FILL`, l. ~4659 `P1B_BAD_FILL`).

**Interfaces :**
- Produit : message exact, partagé par les deux cœurs :
  `remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle, d'un losange, d'une ellipse ou d'une ligne fermée attendus)`.
- Réutilise : `CommandError::BadFill` (`commands.rs`), `MESSAGES.badFill` (`fake-core.ts`) — valeur seule changée.

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo test -p roomboard-core --test pot -j 4 bad_fill 2>&1 | grep -E "test result|FAILED|bad_fill"
# attendu : « test bad_fill_message_is_readable ... ok », « 1 passed »
```
Puis `pnpm install --frozen-lockfile`, commande « Wasm » (taille lue), `cd apps/web && nice -n 10 npx vitest run
src/core/wasm-core.contract.test.ts src/core/fake-core.test.ts -t "C6a|pot|Fill" 2>&1 | tail -6` (≥ 2 tests, deux
fabriques, aucun échec).

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `CARGO_TARGET_DIR=$PWD/target`, `nice -n 10`, `-j 4`, aucun `tauri build`.
- GC2 Tailles Wasm : principal ≤ 1 572 864 o après `wasm-opt -Oz` ; plafonds jamais relevés.
- GC3, GC4, GC9, GC10, GC11, GC12, GC13, GC14 : comme l'en-tête (tests non affaiblis ; commits un par un, trailer Opus 5.5 ;
  fmt et clippy verts ; worktree installé ; rouge hors périmètre consigné ; voisins intacts ; S6 non touchée ;
  `Réutilisation :` au rapport).

**Interdits :** aucun autre changement de `fill.rs` ni de l'ordre des refus (PC2).

**Terminé :** `pot` vert, contrat vert sur les deux fabriques, un commit `fix(core): BadFill message names diamond and
closed line (OG33 lot 2b)`.

**Étapes :**

1. `tests/pot.rs::bad_fill_message_is_readable` : attendre le nouveau message ; les deux constantes du contrat aussi.
   Rouge.
2. `commands.rs` : la chaîne du bras `CommandError::BadFill` ; `fake-core.ts` : `badFill:` ; même texte. Vert.
3. `cargo fmt --all --check`, clippy (GC9), commande « Wasm », contrat. Commit (fichiers un par un).

<a id="tache-b3"></a>
### Tâche B3 — M2 : commande `Rotate` (cœur, pont, faux cœur, contrat, CLI)

**Objectif :** `Command::Rotate { ids, angle }` : rotation de `angle` degrés (sens horaire à l'écran) autour du centre des
boîtes d'accroche réunies, en une étape, avec la portée et les groupes d'`Arrange` (choix 3). Scénario S11.

**Patron à ne pas reprendre :** une `Transform` unique avec la matrice de rotation pour tous les ids (`commands.rs:1434`,
`cmd_transform`) : elle tournerait les textes, tableaux, médias et objets 3D, que H5 d'OG23 garde droits. Chemin de
référence : `crates/roomboard-core/src/arrange.rs:160-187` (bras `FlipH | FlipV | RotateCw | RotateCcw` : matrice entière
pour `Reach::Matrix`, translation du centre pour `Reach::Place`) et `arrange.rs:222-330` (`cmd_arrange`). Second patron
interdit : dupliquer le corps de `cmd_arrange` ; il devient `arrange_with`, appelé par les deux.

**Fichiers :** `crates/roomboard-core/src/{arrange.rs, commands.rs}`, `crates/roomboard-core/tests/arrange.rs`,
`crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/{api.ts, arrange.ts, arrange.test.ts, fake-core.ts, wasm-core.ts,
wasm-core.contract.test.ts}`, `apps/cli/src/{ops.ts, ops.test.ts}`, `scripts/essais/cli-essai.mjs`.

**Interfaces :**
- Produit (Rust) : `pub(crate) fn rotation(cx: f64, cy: f64, deg: f64) -> Transform` ;
  `pub(crate) fn plan_rotate(units: &[Unit], deg: f64) -> Vec<(String, Transform)>` ;
  `pub fn cmd_rotate(&mut self, ids: &[String], deg: f64) -> Result<Change, CommandError>` ;
  `Command::Rotate { ids: Vec<String>, angle: f64 }` ; pont `rotate(ids: Vec<String>, angle: f64)` et `rotate_inner`.
- Produit (TS) : `| { readonly type: "Rotate"; readonly ids: readonly string[]; readonly angle: number }` dans `Command`
  (`api.ts`) ; `export function rotationMatrix(cx: number, cy: number, deg: number): Matrix` ;
  `export function planRotate(units: readonly ArrangeUnit[], deg: number): Array<readonly [string, Matrix]>` ;
  `export function reachOfKind(kind: string): Reach | null` (`arrange.ts`).
- Réutilise : `crates/roomboard-core/src/arrange.rs:222` — `cmd_arrange` (corps extrait en `arrange_with`), `Unit`,
  `Member`, `Reach`, `box_of`, `shift`.
- Réutilise : `crates/roomboard-core/src/linear.rs` — `follow(doc, txn, moved, Some(m))`, appelé comme dans
  `cmd_transform` (`commands.rs:1463-1473`).
- Réutilise : `apps/web/src/core/arrange.ts:35` — `planArrange` (bras de retournement extrait en `applyFull`).
- Réutilise : `apps/web/src/core/fake-core.ts:1487` — cas `Arrange` (corps extrait en `private arrangeWith(ids, plan)`).
- Réutilise : `apps/cli/src/ops.ts:12` — `COMMAND_TYPES`, contrôle de `how` d'`Arrange` (l. 89) comme modèle.

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo test -p roomboard-core --test arrange -j 4 2>&1 | grep -E "test result|FAILED|rotate_"
# attendu : 0 FAILED ; rotate_30_keeps_center_one_step, rotate_90_equals_arrange_rotate_cw,
#           rotate_text_keeps_matrix_moves_place, rotate_zero_and_nan, rotate_unknown_id_refused, rotate_bound_arrow_follows ok
```
Taille du module principal relevée **avant** (commande « Wasm » sur la base de B3) et **après** : `main` est à 1 465 748 o
(marge 107 116 o sous 1 572 864) ; les deux valeurs vont au rapport.
Puis commande « Wasm » (taille ≤ 1 572 864 o, citée), `cd apps/web && nice -n 10 npx vitest run src/core/arrange.test.ts
src/core/wasm-core.contract.test.ts -t "Rotate|rotation" 2>&1 | tail -6` (≥ 2 tests par fabrique), `cd apps/cli && nice -n
10 npx vitest run src/ops.test.ts 2>&1 | tail -4`, `pnpm --filter @roomboard/cli build >/dev/null && node
scripts/essais/cli-essai.mjs 2>&1 | tail -3` (`CLI : OK`), `tsc` web et cli verts.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `CARGO_TARGET_DIR=$PWD/target`, `nice -n 10`, `-j 4`, suites par `suite-vm.cjs`.
- GC2 Tailles Wasm : principal ≤ 1 572 864 o après `wasm-opt -Oz`, formats ≤ 3 145 728 o ; ajouts Rust minimes (OG35).
- GC3 Tests : les tests `Arrange` existants (cœur, contrat, CLI) restent verts sans retouche.
- GC4 Commits : un par un, trailer Opus 5.5.
- GC5 CLI : `Rotate` dans `COMMAND_TYPES`, compte 44 → 45 dans `ops.test.ts`, bloc dans `cli-essai.mjs`, `FORMAT_LOTS`
  inchangé.
- GC6 Excalidraw : la rotation reprend la règle de `resizeElements.ts:rotateSingleElement` (centre) ; mention dans le
  commentaire.
- GC8 Format : aucune clé neuve ; `old_file_keeps_bytes` vert.
- GC9 Rust : fmt et clippy verts. GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** pas de variante à donnée dans `ArrangeHow` (il est `Copy + Eq`) ; aucun changement de `cmd_transform`.

**Terminé :** cinq tests Rust, contrat sur les deux fabriques, `CLI : OK`, Wasm mesuré, deux commits.

**Étapes :**

1. Tests rouges, `crates/roomboard-core/tests/arrange.rs` (aides du fichier : `blank`, `add_rect`, `add_text`, `sbox`,
   `matrix`, `close`, `mid_x`, `mid_y`) :

```rust
fn rotate(d: &mut Document, ids: &[&String], angle: f64) -> Result<Change, CommandError> {
    d.apply(Command::Rotate { ids: ids.iter().map(|s| s.to_string()).collect(), angle })
}

#[test]
fn rotate_30_keeps_center_one_step() {
    let mut d = blank();
    let r = add_rect(&mut d, 100.0, 100.0, 150.0, 150.0);
    let b0 = sbox(&d, &r);
    let v = d.version();
    rotate(&mut d, &[&r], 30.0).expect("tourner");
    let m = matrix(&d, &r);
    assert!(close(m[0], 30f64.to_radians().cos()) && close(m[1], 30f64.to_radians().sin()));
    let b = sbox(&d, &r);
    assert!(close(mid_x(&b), mid_x(&b0)) && close(mid_y(&b), mid_y(&b0)), "centre gardé");
    assert_ne!(d.version(), v);
    assert!(d.undo());
    assert_eq!(matrix(&d, &r), [1.0, 0.0, 0.0, 1.0, 100.0, 100.0]);
}

#[test]
fn rotate_90_equals_arrange_rotate_cw() {
    let (mut a, mut b) = (blank(), blank());
    let ra = add_rect(&mut a, 0.0, 0.0, 200.0, 50.0);
    let rb = add_rect(&mut b, 0.0, 0.0, 200.0, 50.0);
    rotate(&mut a, &[&ra], 90.0).expect("Rotate");
    arrange(&mut b, &[&rb], ArrangeHow::RotateCw).expect("Arrange");
    assert_eq!(matrix(&a, &ra), matrix(&b, &rb)); // quart de tour exact
}

#[test]
fn rotate_text_keeps_matrix_moves_place() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 100.0, 100.0);
    let t = add_text(&mut d, 300.0, 0.0);
    rotate(&mut d, &[&r, &t], 45.0).expect("tourner");
    let mt = matrix(&d, &t);
    assert_eq!(&mt[..4], &[1.0, 0.0, 0.0, 1.0]);
    assert!(!close(mt[4], 300.0) || !close(mt[5], 0.0), "la place du texte a tourné");
}

#[test]
fn rotate_zero_and_nan() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 50.0, 50.0);
    let v = d.version();
    assert!(rotate(&mut d, &[&r], 0.0).expect("nul").ids.is_empty());
    assert!(rotate(&mut d, &[&r], 360.0).expect("tour").ids.is_empty());
    assert_eq!(rotate(&mut d, &[&r], f64::NAN), Err(CommandError::BadMatrix));
    assert_eq!(d.version(), v);
}

#[test]
fn rotate_unknown_id_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    let nope = "inconnu".to_string();
    let v = d.version();
    assert_eq!(rotate(&mut d, &[&a, &nope], 15.0), Err(CommandError::UnknownElement(nope.clone())));
    assert_eq!(d.version(), v);
}
```

2. `arrange.rs` : extraire du bras de retournement la boucle sur les membres :

```rust
/// Matrice `full` aux membres de portée `Matrix`, translation de leur centre aux membres `Place` (H5).
fn apply_full(units: &[Unit], full: Transform, out: &mut Vec<(String, Transform)>) {
    for m in units.iter().flat_map(|u| &u.members) {
        match m.reach {
            Reach::Matrix => out.push((m.id.clone(), full)),
            Reach::Place => {
                let (px, py) = ((m.bounds.x0 + m.bounds.x1) / 2.0, (m.bounds.y0 + m.bounds.y1) / 2.0);
                let (nx, ny) = (full[0] * px + full[2] * py + full[4], full[1] * px + full[3] * py + full[5]);
                if nx != px || ny != py {
                    out.push((m.id.clone(), shift(nx - px, ny - py)));
                }
            }
        }
    }
}

/// OG33 (lot 2b) : rotation de `deg` degrés, sens horaire à l'écran (y vers le bas), autour de (cx, cy) ; le centre,
/// comme `rotateSingleElement` d'Excalidraw (packages/element/src/resizeElements.ts, MIT). Cosinus et sinus ramenés à 0 ou
/// ±1 à 1e-12 près : un quart de tour donne la matrice exacte de `RotateCw`.
pub(crate) fn rotation(cx: f64, cy: f64, deg: f64) -> Transform {
    let snap = |v: f64| {
        if v.abs() < 1e-12 { 0.0 } else if (v.abs() - 1.0).abs() < 1e-12 { v.signum() } else { v }
    };
    let (s, c) = deg.to_radians().sin_cos();
    let (s, c) = (snap(s), snap(c));
    [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]
}

/// Plan d'une disposition : matrices à composer, et matrice pleine passée à `linear::follow` (suivi des flèches liées).
pub(crate) type Planned = (Vec<(String, Transform)>, Option<Transform>);

/// OG33 : plan d'une rotation autour du centre des boîtes réunies ; angle nul modulo 360 : rien (D38). La matrice pleine
/// est rendue aussi : `Rotate` suit les flèches liées comme `cmd_transform` (n° 7).
pub(crate) fn plan_rotate(units: &[Unit], deg: f64) -> Planned {
    let boxes: Vec<Bounds> = units.iter().filter_map(box_of).collect();
    if boxes.len() != units.len() || boxes.is_empty() || deg.rem_euclid(360.0) == 0.0 {
        return (Vec::new(), None);
    }
    let sel = boxes.iter().skip(1).fold(boxes[0], |a, b| a.union(*b));
    let full = rotation((sel.x0 + sel.x1) / 2.0, (sel.y0 + sel.y1) / 2.0, deg);
    let mut out = Vec::new();
    apply_full(units, full, &mut out);
    (out, Some(full))
}
```

   Le bras de retournement de `plan` appelle `apply_full(units, full, &mut out)`. Puis `cmd_arrange` devient (son
   comportement ne change pas : pas de suivi, `arrange.rs:316-321`) :

```rust
    pub fn cmd_arrange(&mut self, ids: &[String], how: ArrangeHow) -> Result<Change, CommandError> {
        self.arrange_with(ids, &|units| (plan(units, how), None))
    }

    /// OG33 (lot 2b) : `Rotate` ; angle non fini : `BadMatrix` avant toute lecture ; sinon les règles de `cmd_arrange`,
    /// plus le suivi des flèches liées dans la même transaction (une étape).
    pub fn cmd_rotate(&mut self, ids: &[String], deg: f64) -> Result<Change, CommandError> {
        if !deg.is_finite() {
            return Err(CommandError::BadMatrix);
        }
        self.arrange_with(ids, &|units| plan_rotate(units, deg))
    }
```

   et `fn arrange_with(&mut self, ids: &[String], planner: &dyn Fn(&[Unit]) -> Planned) -> Result<Change, CommandError>`
   (`&dyn Fn`, pas `impl Fn` : le corps n'est compilé qu'une fois, marge Wasm) porte le corps et la doc actuels de
   `cmd_arrange`, `plan(&units, how)` devenant `let (moves, follow) = planner(&units);`. Dans la transaction unique de
   l'étape 5, après les `insert` de `transform`, et seulement si `follow` est `Some(m)` : `let followed =
   crate::linear::follow(self, &mut txn, &moved_ids, Some(&m));` (forme exacte de `cmd_transform`, `commands.rs:1463-1473` ;
   `moved_ids` = ids écrits) ; les ids suivis qui manquent s'ajoutent à `Change.ids` comme dans `cmd_transform`
   (l. 1478-1484). Test de plus dans l'étape 1 :

```rust
#[test]
fn rotate_bound_arrow_follows() {
    // Deux rectangles reliés par une flèche liée aux deux (patron des tests de liaison de tests/fleches.rs : AddShape
    // arrow avec `line.start` / `line.end`) ; Rotate 90 du second : la fin de la flèche suit son contour dans la même
    // étape (Change.ids contient la flèche) ; undo : flèche et rectangle reviennent ensemble.
}
```

   (corps écrit avec les aides de liaison de `tests/fleches.rs`, à recopier). Faux cœur : dans `arrangeWith`, le planificateur
   rend aussi la matrice pleine (`rotationMatrix` du centre des boîtes, `null` pour `Arrange`) et, si elle est donnée,
   appelle dans la même étape le suivi que le cas `Transform` du faux cœur appelle déjà (même fonction, même place). Contrat :
   un cas « Rotate : la flèche liée suit, une étape » de plus dans le bloc de l'étape 5.
   `commands.rs` : variante `Rotate { ids: Vec<String>, angle: f64 }` après `Arrange` (doc : « OG33 (lot 2b) : tourne les
   `ids` d'`angle` degrés… portée et groupes comme `Arrange` ») ; bras `Command::Rotate { ids, angle } =>
   self.cmd_rotate(&ids, angle),` après celui d'`Arrange` (l. 904). Vert.

3. Pont `crates/roomboard-wasm/src/lib.rs`, à côté d'`arrange` (l. ~1709) et d'`arrange_inner` (l. ~2569) :

```rust
    /// OG33 (lot 2b) : tourne `ids` de `angle` degrés (sens horaire à l'écran) en une étape ; angle non fini : BadMatrix.
    pub fn rotate(&mut self, ids: Vec<String>, angle: f64) -> Result<JsValue, JsError> {
        to_js(&self.rotate_inner(ids, angle).map_err(cmd_err)?)
    }
    pub fn rotate_inner(&mut self, ids: Vec<String>, angle: f64) -> Result<Change, CommandError> {
        self.run(Command::Rotate { ids, angle })
    }
```

4. TS. `api.ts` : variante `Rotate` dans `Command` (après `Arrange`, commentaire OG33). `arrange.ts` : extraire
   `applyFull(units, full, out)` du bras `flip-h…rotate-ccw` (même code que Rust), puis :

```ts
/** OG33 (lot 2b) : ligne à ligne `rotation` du cœur (arrange.rs) ; `deg * (Math.PI / 180)` comme `to_radians`. */
export function rotationMatrix(cx: number, cy: number, deg: number): Matrix {
  const snap = (v: number): number => (Math.abs(v) < 1e-12 ? 0 : Math.abs(Math.abs(v) - 1) < 1e-12 ? Math.sign(v) : v);
  const r = deg * (Math.PI / 180);
  const [c, s] = [snap(Math.cos(r)), snap(Math.sin(r))];
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
}
/** OG33 : `plan_rotate` du cœur. */
export function planRotate(units: readonly ArrangeUnit[], deg: number): Array<readonly [string, Matrix]> {
  const boxes = units.map(boxOf).filter((b): b is Bounds => b !== null);
  if (boxes.length !== units.length || boxes.length === 0 || ((deg % 360) + 360) % 360 === 0) return [];
  const sel = boxes.slice(1).reduce((a, b) => union(a, b), boxes[0] as Bounds);
  const out: Array<readonly [string, Matrix]> = [];
  applyFull(units, rotationMatrix((sel.x0 + sel.x1) / 2, (sel.y0 + sel.y1) / 2, deg), out);
  return out;
}
/** OG33 : portée d'un genre de la vue (`reach_of` du cœur) ; null : jamais bougé. */
export function reachOfKind(kind: string): Reach | null {
  return kind === "stroke" || kind === "shape" || kind === "image" ? "matrix"
    : kind === "text" || kind === "table" || kind === "media" || kind === "model3d" ? "place" : null;
}
```

   `arrange.test.ts` : `rotationMatrix(cx, cy, 90)` égale la matrice `rotate-cw` de `planArrange` ; `planRotate` d'un texte
   seul : translation nulle omise (`[]`) ; `reachOfKind("fill") === null`. `fake-core.ts` : corps du cas `Arrange`
   (l. 1493-1543) déplacé tel quel dans `private arrangeWith(ids: readonly string[], plan: (units: ArrangeUnit[]) =>
   Array<readonly [string, Matrix]>): Change` ; `case "Arrange"` garde son contrôle de `how` puis `return
   this.arrangeWith(cmd.ids, (u) => planArrange(u, cmd.how))` ; `case "Rotate": if (!Number.isFinite(cmd.angle)) throw new
   Error(MESSAGES.badMatrix); return this.arrangeWith(cmd.ids, (u) => planRotate(u, cmd.angle));`. `wasm-core.ts` :
   `case "Rotate": return toChange(this.d.rotate([...cmd.ids], cmd.angle));`.

5. Contrat, après le bloc `contrat Arrange` (l. ~4858), joué par `factories` :

```ts
// OG33 (lot 2b, choix 3) : `Rotate` sur les deux cœurs ; portée d'`Arrange` (texte : place seule).
describe.each(factories)("contrat OG33 Rotate : $name", ({ f }) => {
  const rect = (d: CoreDocument, p: string, x: number, y = 100): string => {
    const id = d.apply({ type: "AddShape", page: p, shape: "rect", x0: x, y0: y, x1: x + 50, y1: y + 50, style, fill: null }).ids[0];
    if (id === undefined) throw new Error("aucun id");
    return id;
  };
  it("Rotate 30° : rotation autour du centre, une étape, undo", () => {
    const d = f.blank();
    const p = first(d);
    const r = rect(d, p, 100);
    d.apply({ type: "Rotate", ids: [r], angle: 30 });
    const t = viewOf(d, r).transform!;
    expect(t[0]).toBeCloseTo(Math.cos(Math.PI / 6), 9);
    expect(t[1]).toBeCloseTo(Math.sin(Math.PI / 6), 9);
    expect(t[0] * 25 + t[2] * 25 + t[4]).toBeCloseTo(125, 6);
    expect(t[1] * 25 + t[3] * 25 + t[5]).toBeCloseTo(125, 6);
    d.undo();
    expect(viewOf(d, r).transform).toEqual([1, 0, 0, 1, 100, 100]);
    d.free();
  });
  it("Rotate 90 = Arrange rotate-cw, à l'exact", () => {
    const [a, b] = [f.blank(), f.blank()];
    const [ra, rb] = [rect(a, first(a), 0), rect(b, first(b), 0)];
    a.apply({ type: "Rotate", ids: [ra], angle: 90 });
    b.apply({ type: "Arrange", ids: [rb], how: "rotate-cw" });
    expect(viewOf(a, ra).transform).toEqual(viewOf(b, rb).transform);
    a.free();
    b.free();
  });
  it("Rotate texte + rectangle : le texte reste droit", () => {
    const d = f.blank();
    const p = first(d);
    const r = rect(d, p, 0, 0);
    const t = d.apply({ type: "SetText", page: p, id: null, x: 200, y: 0, content: "abc", color: "#000000", size: 20, boxWidth: 100, boxHeight: 30 }).ids[0]!;
    d.apply({ type: "Rotate", ids: [t, r], angle: 45 });
    expect(viewOf(d, t).transform?.slice(0, 4)).toEqual([1, 0, 0, 1]);
    d.free();
  });
  it("Rotate 0 : aucune étape ; id inconnu : élément inconnu, rien d'écrit", () => {
    const d = f.blank();
    const r = rect(d, first(d), 0);
    const v = d.version();
    d.apply({ type: "Rotate", ids: [r], angle: 0 });
    expect(() => d.apply({ type: "Rotate", ids: [r, "nope"], angle: 15 })).toThrow("élément inconnu : nope");
    expect(d.version()).toBe(v);
    d.free();
  });
});
```

6. CLI : `"Rotate"` dans `COMMAND_TYPES` (après `"ShapeToPolygon"`) ; dans `parseOp`, après le contrôle d'`Arrange` :
   `if (type === "Rotate" && (typeof cmd["angle"] !== "number" || !Number.isFinite(cmd["angle"]))) throw new
   CliError("usage", "angle : nombre fini attendu (degrés)");`. `ops.test.ts` : compte 45 (titre mis à jour), `describe("Rotate
   (OG33)")` : admis avec références `$1`, `angle` absent ou chaîne → usage. `cli-essai.mjs`, après le bloc OG12 lot 2a :
   un rectangle (`AddShape`, `run --new --out`), puis `{ type: "Rotate", ids: [id], angle: 30 }`, `state`, `undo`, `state` ;
   `verifie("OG33 : Rotate 30°, matrice tournée", …transform[1] ≈ 0,5…)`, `verifie("OG33 : undo en une étape", …)`,
   `verifie("OG33 : angle non numérique : code 2", …)` ; `console.log("OG33 : Rotate")`.
7. GC9, commande « Wasm », contrat, CLI. Commits : `feat(core): Rotate command with Arrange reach (OG33 lot 2b)` puis
   `feat(web,cli): Rotate contract, fake core and CLI (OG33 lot 2b)`.

<a id="tache-b4"></a>
### Tâche B4 — M2 : poignée de rotation, Maj 15°, Alt+T, rendu

**Objectif :** la page tourne une sélection au doigt et à la souris par une poignée sous le coin bas droit du cadre (choix
4), Maj ou second doigt tardif au pas de 15° (choix 5), Alt+T / Alt+Maj+T (choix 6) ; un objet tourné hors des quarts de
tour perd ses 8 poignées de taille (choix 7). Scénario S11.

**Patron à ne pas reprendre :** la matrice unique de `matrixOf(d)` (`select.ts`, mode `move` et `resize`) posée sur tous
les fantômes : un texte de la sélection tournerait dans l'aperçu et resterait droit une fois écrit. L'aperçu suit le plan
du cœur : `planRotate` (B3), un fantôme par membre. Chemin de référence : `apps/web/src/core/arrange.ts` (`planRotate`) et
`select.ts` bloc `live()` des fantômes (`ghosts: selection.map(...)`). Second patron interdit : lire `ctx.doc.element()` à
chaque image pendant un glisser (D28) : les membres sont lus au `begin`, l'état « tournable / tourné » est mis en cache par
`doc.version()` et sélection.

**Fichiers :** `apps/web/src/engine/tools/{handles.ts, handles.test.ts, select.ts, select.test.ts}`,
`apps/web/src/engine/render/{overlay.ts, overlay.test.ts, canvas2d.ts, canvas2d.test.ts, link-badge.ts}`,
`apps/web/src/engine/input/{keys.ts, keys.test.ts}`, `apps/web/src/engine/{engine.ts, engine.test.ts}`,
`apps/web/src/ui/{shortcuts.ts, shortcuts.test.ts}`.

**Interfaces :**
- Consomme (B3) : `Command` `Rotate`, `planRotate`, `rotationMatrix`, `reachOfKind`, `ArrangeMember` (`core/arrange.ts`).
- Produit : dans `handles.ts` : `ROTATE_HANDLE_GAP_PX = 26`, `rotateHandlePoint(b: Bounds, zoom: number): [number, number]`,
  `hitRotateHandle(b: Bounds, x: number, y: number, zoom: number, pointerType?: string): boolean`, `ROTATE_STEP_DEG = 15`,
  `rotateAngle(cx, cy, x0, y0, x, y, snap: boolean, base = 0): number`, `isAxisAligned(m: Matrix, eps = 1e-9): boolean`,
  `matrixAngle(m: Matrix): number` ; `EditOverlay.rotate?: boolean`, `EditOverlay.noResize?: boolean` ;
  `ROTATE_ICON_PATHS`, `paintRotateHandle(ctx, cx, cy, color)` (`link-badge.ts`) ; `rotateKey(e: KeyLike): 15 | -15 | null`
  (`keys.ts`) ; lignes de raccourcis `rotate-15-cw` (« Tourner de 15° à droite », `Alt+T`), `rotate-15-ccw` (« Tourner de
  15° à gauche », `Alt+Maj+T`), `rotate-handle` (« Tourner (poignée ; Maj : pas de 15°) », `Maj + glisser`).
- Réutilise : `apps/web/src/engine/tools/handles.ts:47-61` — `moveHandlePoint`, `hitMoveHandle` (même forme pour la
  poignée de rotation).
- Réutilise : `apps/web/src/engine/render/link-badge.ts:140` — `paintRoundIcon` (rond de 24 px), `pathsOf`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:575` — `paintMoveHandle` de la scène (patron de
  `paintRotateHandle` de la classe).
- Réutilise : `apps/web/src/engine/engine.ts:580` — `arrange(how)` et `selectedBlock()` (patron de `rotateSelection`).
- Réutilise : `apps/web/src/engine/input/keys.ts:199` — `arrangeKey` (lecture de la lettre par `code`).

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 npx vitest run src/engine/tools/handles.test.ts src/engine/tools/select.test.ts src/engine/render/overlay.test.ts \
    src/engine/render/canvas2d.test.ts src/engine/input/keys.test.ts src/engine/engine.test.ts src/ui/shortcuts.test.ts 2>&1 | tail -8
# attendu : « Test Files  7 passed » ; « poignée de rotation » (≥ 4), « rotateAngle », « rotateKey », « Alt+T » présents
```
Puis `npx tsc --noEmit -p apps/web` et la suite web par `suite-vm.cjs -- pnpm --filter @roomboard/web test`.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `nice -n 10`, vitest ciblé, suite par `suite-vm.cjs`, aucun `tauri build`.
- GC3 Tests : les tests de la poignée « Déplacer », des « + » et du cadre restent verts sans retouche.
- GC4 Commits : un par un, trailer Opus 5.5.
- GC6 Excalidraw : `SHIFT_LOCKING_ANGLE` (π/12) et `rotateSingleElement` cités en commentaire (MIT).
- GC7 Tactile : cible de 44 px au doigt (portée 22), 24 px à la souris (12) ; Lucide `rotate-cw` (ISC), trait 1 px CSS au
  rond de 24 px comme `paintMoveHandle` ; Alt+T au clavier.
- GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** pas de cadre tourné ni de redimensionnement dans le repère local (hors de ce lot) ; aucune commande neuve
autre que `Rotate` ; la ligne seule (`isLine`) et « Modifier les points » n'ont pas de poignée de rotation.

**Terminé :** sept fichiers verts, suite web verte, un ou deux commits.

**Étapes :**

1. Tests rouges. `handles.test.ts` :

```ts
describe("poignée de rotation (OG33 lot 2b)", () => {
  const b = { x0: 0, y0: 0, x1: 100, y1: 50 };
  it("rotateHandlePoint : 26 px écran en diagonale sous le coin bas droit", () => {
    expect(rotateHandlePoint(b, 2)).toEqual([113, 63]);
  });
  it("hitRotateHandle : 22 px au doigt, 12 à la souris", () => {
    expect(hitRotateHandle(b, 126 + 21, 76, 1)).toBe(true);
    expect(hitRotateHandle(b, 126 + 21, 76, 1, "mouse")).toBe(false);
  });
  it("rotateAngle : sens horaire à l'écran ; Maj : angle absolu au pas de 15°", () => {
    expect(rotateAngle(0, 0, 10, 0, 0, 10, false)).toBeCloseTo(90, 9);
    expect(rotateAngle(0, 0, 10, 0, Math.cos(0.65), Math.sin(0.65), true)).toBe(30); // 37,2° → 30
    expect(rotateAngle(0, 0, 10, 0, Math.cos(0.65), Math.sin(0.65), true, 7)).toBeCloseTo(38, 9); // 7 + 37,2 → 45, Δ 38
  });
  it("isAxisAligned : identité et quart de tour oui, 30° non", () => {
    expect(isAxisAligned([1, 0, 0, 1, 5, 5])).toBe(true);
    expect(isAxisAligned([0, 1, -1, 0, 0, 0])).toBe(true);
    expect(isAxisAligned([0.866, 0.5, -0.5, 0.866, 0, 0])).toBe(false);
  });
});
```

   `select.test.ts` (aides : `setup`, `gesture`, `at`) :

```ts
describe("OG33 lot 2b : poignée de rotation", () => {
  const turned = (cx: number, cy: number, [x, y]: [number, number], deg: number): [number, number] => {
    const r = (deg * Math.PI) / 180;
    return [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)];
  };
  it("poignée de rotation : glisser d'un quart de tour écrit une Rotate de 90°", () => {
    const { tool, runs, rect, doc } = setup();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    expect(tool.live().overlay).toMatchObject({ rotate: true });
    const f = doc.bounds([a])!;
    const h = rotateHandlePoint(f, 1);
    const c: [number, number] = [(f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2];
    gesture(tool, [h, turned(c[0], c[1], h, 45), turned(c[0], c[1], h, 90)]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ type: "Rotate", ids: [a] });
    expect((runs[0] as { angle: number }).angle).toBeCloseTo(90, 6);
  });
  it("poignée de rotation : Maj tenue, 37° demandés, 30° écrits", () => {
    const { tool, runs, rect, doc, setShift } = setup();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    const f = doc.bounds([a])!;
    const h = rotateHandlePoint(f, 1);
    setShift(true);
    gesture(tool, [h, turned(150, 150, h, 37)]);
    expect((runs[0] as { angle: number }).angle).toBeCloseTo(30, 6);
  });
  it("poignée de rotation : objet tourné de 30° : aucune poignée de taille", () => {
    const { tool, rect, doc } = setup();
    const a = rect(100, 100, 200, 200);
    doc.apply({ type: "Rotate", ids: [a], angle: 30 });
    tool.setSelection([a]);
    expect(tool.live().overlay).toMatchObject({ handles: true, noResize: true, rotate: true });
  });
  it("poignée de rotation : texte seul : aucune poignée ; appui sans glisser : rien d'écrit", () => {
    const { tool, runs, rect, doc } = setup();
    const page = doc.pageIds()[0]!;
    const t = doc.apply({ type: "SetText", page, id: null, x: 0, y: 0, content: "a", color: "#000000", size: 20, boxWidth: 100, boxHeight: 30 }).ids[0]!;
    tool.setSelection([t]);
    expect(tool.live().overlay?.rotate).toBeUndefined();
    const a = rect(100, 100, 200, 200);
    tool.setSelection([a]);
    gesture(tool, [rotateHandlePoint(doc.bounds([a])!, 1)]);
    expect(runs).toEqual([]);
  });
});
```

   `keys.test.ts` : `rotateKey({ key: "†", code: "KeyT", altKey: true, … })` → 15 ; avec `shiftKey` → −15 ; avec `ctrlKey`,
   sans Alt, ou cible éditable → null (aide `key` du fichier). `engine.test.ts` (aide `og12()`, `key`) :
   `it("Alt+T tourne la sélection de 15°, une étape", …)` : `engine.select([id])`, `engine.key(key("t", { altKey: true,
   code: "KeyT" }))` vrai, `doc.element(id)!.transform[1]` ≈ sin 15°, `doc.undo()` rend l'identité ; sans sélection : faux.
   `overlay.test.ts` : `mergeOverlays` garde `rotate` et `noResize` s'ils sont dans une part, les omet sinon.
   `canvas2d.test.ts` (aide `makeViews`, test « calque d'édition » l. ~225) : avec `noResize: true`, `rect` compté
   `1 + 1 + 1` (sans les 8 poignées) ; journal `scene.log` plus long avec `rotate: true` qu'avec `rotate` absent ; égal avec
   `rotate: true, handles: false`. `shortcuts.test.ts` : les trois lignes, `ariaShortcut("rotate-15-cw", false) === "Alt+T"`.

2. `handles.ts`, après `hitMoveHandle` :

```ts
/** OG33 (lot 2b, choix 4) : poignée de rotation sous le coin bas droit du cadre, à 26 px écran en diagonale : le haut est
 *  pris par « + » (40 px, n° 28) et « Déplacer » (28 px, OG23), le coin haut droit par le badge du lien (T18), le coin
 *  haut gauche par le badge « copie » (OG23). */
export const ROTATE_HANDLE_GAP_PX = 26;
const ROTATE_REACH_TOUCH_PX = 22;
const ROTATE_REACH_MOUSE_PX = 12;
export function rotateHandlePoint(b: Bounds, zoom: number): [number, number] {
  return [b.x1 + ROTATE_HANDLE_GAP_PX / zoom, b.y1 + ROTATE_HANDLE_GAP_PX / zoom];
}
export function hitRotateHandle(b: Bounds, x: number, y: number, zoom: number, pointerType?: string): boolean {
  const [hx, hy] = rotateHandlePoint(b, zoom);
  const reach = (pointerType === "mouse" ? ROTATE_REACH_MOUSE_PX : ROTATE_REACH_TOUCH_PX) / zoom;
  return Math.max(Math.abs(hx - x), Math.abs(hy - y)) <= reach;
}
/** `SHIFT_LOCKING_ANGLE` d'Excalidraw (π/12, MIT). */
export const ROTATE_STEP_DEG = 15;
/** Angle (degrés, sens horaire à l'écran) de (x0, y0) à (x, y) autour de (cx, cy) ; `snap` : l'angle absolu `base + Δ`
 *  calé au pas de 15°, rendu en Δ (choix 5). */
export function rotateAngle(cx: number, cy: number, x0: number, y0: number, x: number, y: number, snap: boolean, base = 0): number {
  const raw = ((Math.atan2(y - cy, x - cx) - Math.atan2(y0 - cy, x0 - cx)) * 180) / Math.PI;
  return snap ? Math.round((base + raw) / ROTATE_STEP_DEG) * ROTATE_STEP_DEG - base : raw;
}
/** Partie linéaire alignée sur les axes ou quart de tour : le cadre et ses huit poignées restent justes (choix 7). */
export function isAxisAligned(m: Matrix, eps = 1e-9): boolean {
  return (Math.abs(m[1]) <= eps && Math.abs(m[2]) <= eps) || (Math.abs(m[0]) <= eps && Math.abs(m[3]) <= eps);
}
export const matrixAngle = (m: Matrix): number => (Math.atan2(m[1], m[0]) * 180) / Math.PI;
```

3. `select.ts` :
   - `Mode` gagne `"rotate"` ; `Drag` gagne `readonly pivot?: readonly [number, number]; readonly angle0?: number; readonly
     members?: readonly ArrangeMember[];` (`angle0`, pas `base` : `Drag.base` existe déjà, `Bounds | null`, `select.ts:63`,
     comme `extra.base`, l. 171) ; `startDrag` les accepte dans `extra` et les recopie.
   - Dans `createSelectTool` :

```ts
  /** OG33 : poignée de rotation et poignées de taille, lues une fois par version du document et par sélection (D28). */
  let turnMemo: { readonly key: string; readonly rotate: boolean; readonly turned: boolean } | null = null;
  const turnState = (): { readonly rotate: boolean; readonly turned: boolean } => {
    const key = `${ctx.doc.version()}|${selection.join(",")}`;
    if (turnMemo?.key !== key) {
      const views = selection.map((id) => ctx.doc.element(id));
      turnMemo = {
        key,
        rotate: views.some((v) => v !== null && reachOfKind(v.kind) === "matrix"),
        turned: views.some((v) => v !== null && !isAxisAligned(v.transform)),
      };
    }
    return turnMemo;
  };
  /** Membres de l'aperçu (portée de `reachOfKind`, boîte de `bounds`) : les unités du cœur, lues au `begin`. */
  const rotateMembers = (): ArrangeMember[] =>
    selection.flatMap((id) => {
      const v = ctx.doc.element(id);
      const reach = v === null ? null : reachOfKind(v.kind);
      const b = reach === null ? null : ctx.doc.bounds([id]);
      return reach !== null && b !== null ? [{ id, reach, bounds: b }] : [];
    });
  const turnOf = (d: Drag): number =>
    d.pivot === undefined ? 0 : rotateAngle(d.pivot[0], d.pivot[1], d.x0, d.y0, d.x, d.y, ctx.shift?.() === true, d.angle0 ?? 0);
```

   - `begin` : la ligne `const h = frame && !isLine(v) ? grabbedHandle(...) : null` devient `frame && !isLine(v) &&
     !turnState().turned ? grabbedHandle(...) : null` ; juste après le bloc `resize`, avant la poignée « Déplacer » :

```ts
      // OG33 (lot 2b) : poignée de rotation (choix 4) ; Maj ou doigt tardif : pas de 15° (choix 5).
      if (frame && !isLine(v) && turnState().rotate && hitRotateHandle(frame, x, y, zoom, pointerTypeOf(s))) {
        const only = selection.length === 1 ? ctx.doc.element(selection[0]!) : null;
        startDrag(pointerId, "rotate", x, y, {
          pivot: [(frame.x0 + frame.x1) / 2, (frame.y0 + frame.y1) / 2],
          angle0: only === null ? 0 : matrixAngle(only.transform),
          members: rotateMembers(),
        });
        return;
      }
```

   - `close`, avant `if (d.mode === "none" || selection.length === 0) return;` :

```ts
      if (d.mode === "rotate") {
        const angle = moved(d) ? turnOf(d) : 0;
        if (Math.abs(angle) > 1e-9) ctx.run({ type: "Rotate", ids: [...selection], angle });
        return;
      }
```

   - `live`, après la branche `isLine(v)` :

```ts
      if (d && d.mode === "rotate" && d.pivot && d.members) {
        const angle = moved(d) ? turnOf(d) : 0;
        const ghosts = planRotate([{ members: d.members }], angle).map(([id, matrix]) => ({ id, matrix }));
        const turning = ghosts.length > 0;
        const overlay: EditOverlay = {
          ...EMPTY_OVERLAY,
          ghosts,
          frame: bounds === null ? null : turning ? transformBounds(rotationMatrix(d.pivot[0], d.pivot[1], angle), bounds) : bounds,
          handles: !turning,
          ...(turning ? {} : { rotate: true }),
        };
        return { strokes: [], erasers: [], hidden: turning ? new Set(ghosts.map((g) => g.id)) : NONE, overlay };
      }
```

     et dans l'aperçu ordinaire : `...(d === null && !isLine(v) && turnState().rotate ? { rotate: true } : {}),
     ...(turnState().turned ? { noResize: true } : {}),` (le second lu par le cache, sans `element()` par image).

4. `overlay.ts` : champs `rotate?` et `noResize?` (commentaires OG33) ; `mergeOverlays` :
   `...(present.some((p) => p.rotate === true) ? { rotate: true } : {}), ...(present.some((p) => p.noResize === true) ?
   { noResize: true } : {})`. `link-badge.ts` :

```ts
/** Lucide `rotate-cw` (ISC) : poignée de rotation (viewBox 24 × 24). */
export const ROTATE_ICON_PATHS: readonly string[] = ["M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", "M21 3v5h-5"];
let rotateIcon: Path2D[] | null = null;
/** OG33 : poignée de rotation (rond de 24 px CSS) centrée sur (cx, cy) px CSS. */
export function paintRotateHandle(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  if (rotateIcon === null) rotateIcon = pathsOf(ROTATE_ICON_PATHS);
  paintRoundIcon(ctx, { x: cx - 12, y: cy - 12, size: 24 }, rotateIcon, color);
}
```

   (tracés vérifiés contre `node_modules/lucide-static/icons/rotate-cw.svg` s'il est installé, sinon contre la source
   Lucide citée dans `icons.ts` ; consigné au rapport). `canvas2d.ts` : `paintOverlayChrome` peint `paintHandles` si
   `o.handles && o.noResize !== true` ; méthode `paintRotateHandle(ctx, o, camera)` sur le modèle de `paintMoveHandle`
   (l. 575 : `forExport`, `o.rotate !== true`, `!o.frame`, `!o.handles` → retour ; `rotateHandlePoint(o.frame,
   camera.zoom)`, `worldToScreen`, `setTransform(this.sx, 0, 0, this.sy, 0, 0)`), appelée après `paintMoveHandle`.

5. `keys.ts`, après `arrangeKey` :

```ts
/** OG33 (lot 2b, choix 6) : Alt+T tourne la sélection de 15° à droite, Alt+Maj+T de 15° à gauche ; lettre lue par `code`
 *  (Option+T donne « † » sous macOS) ; mêmes refus qu'`arrangeKey`. */
export function rotateKey(e: KeyLike): 15 | -15 | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || !e.altKey || e.defaultPrevented === true || inEditable(e.target)) return null;
  return e.code === "KeyT" ? (e.shiftKey ? -15 : 15) : null;
}
```

   `engine.ts` : `function rotateSelection(deg: number): boolean` à côté d'`arrange` (même corps, `run({ type: "Rotate",
   ids, angle: deg })`) ; dans le bloc `if (!imageBusy && textTool.editing() === null && selectTool.selection().length > 0)`,
   après le traitement de `how` : `const turn = lineEditor === null ? rotateKey(e) : null; if (turn !== null) {
   rotateSelection(turn); return true; }`. `shortcuts.ts` : trois lignes au groupe « Transformer », après `rotate-ccw`.

6. Vert (commande bornée), `tsc`, suite web par `suite-vm.cjs`. Commit(s) : `feat(engine): rotation handle, Shift 15° steps
   and Alt+T (OG33 lot 2b)`.

<a id="tache-b5"></a>
### Tâche B5 — M2 : essai navigateur rotation, captures, fiche

**Objectif :** S11 joué au doigt, à la souris et au clavier ; captures avant et après ; fiche à jour ; `verifier.sh --e2e`
vert (porte de fusion de M2).

**Fichiers :** `scripts/essais/outils-excalidraw-2b-navigateur.mjs`, `docs/essais/outils-excalidraw.md`,
`docs/design/captures/personnalisation-2-outils/{avant-rotation.png, apres-rotation.png}`.

**Interfaces :**
- Consomme : B3 (`Rotate`), B4 (`rotateHandlePoint` : 26 px écran sous le coin bas droit du cadre), B1 (script, aides).
- Réutilise : `scripts/essais/gestes.mjs` — `touchDrag`, `touchDragWithLateFinger`, `tapStage`, `saved` ; script du lot 2b
  (`check`, `lire`, `tool`, `shoot`, `main`).
- Produit : fonctions `m2(browser, base, tmp)` et `capturesM2(browser, base, nom)`, `--only m2`.

**Test et commande bornée :** commande « Wasm », commande « Essai » avec `--only m2` (attendu `outils-excalidraw-2b : OK`),
puis `node ~/.claude/scripts/vm/suite-vm.cjs -- scripts/verifier.sh --e2e 2>&1 | tail -6` en arrière-plan (attendu
`verifier.sh : OK`, `outils-excalidraw-2b : OK`).

**Preuve visuelle :** lectures : `Lire : M2.angle=30` (±1, au doigt sans Maj), `Lire : M2.pas=0` (reste modulo 15 avec un
second doigt tardif), `Lire : M2.souris=45` (Maj tenue), `Lire : M2.clavier=15` (Alt+T), `Lire : M2.undo=0`,
`Lire : M2.coin=none` (coin de la boîte englobante hors de la forme tournée), `Lire : M2.cible=44`. Captures 2x :
`avant-rotation.png` (base : rectangle choisi, pas de poignée), `apres-rotation.png` (rectangle tourné de 30°, poignée de
rotation, cadre sans poignées de taille). À décrire : netteté de l'icône `rotate-cw`.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `nice -n 10`, `verifier.sh --e2e` par `suite-vm.cjs` en arrière-plan.
- GC3 Tests : m1 et les essais existants verts sans retouche.
- GC4 Commits : captures une par une, trailer Opus 5.5.
- GC6 Excalidraw : la fiche cite `resizeElements.ts:rotateSingleElement`, `SHIFT_LOCKING_ANGLE`.
- GC7 Tactile : doigt d'abord (protocole, `pointerType: "touch"`), puis souris, puis clavier ; cible lue ≥ 44.
- GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** aucun code de produit ; un écart trouvé est rapporté avec la tâche qui possède le code (B3 ou B4).

**Terminé :** m2 vert, deux captures, fiche, `verifier.sh : OK`, un ou deux commits.

**Étapes :**

1. `m2` : page neuve ; Rectangle au doigt (500,250)-(620,350) ; Sélection, toucher (560,300) ; cadre lu par
   `page.evaluate` impossible : calculer la poignée depuis la boîte posée (boîte de l'état `saved` : transform et `w`, `h`,
   plus la demi-épaisseur 2) : `h = [x1 + 2 + 26, y1 + 2 + 26]` en px de la scène au zoom de l'essai (lire `data-zoom` de
   `#stage` s'il existe, sinon zoom 1 vérifié par la boîte d'un rectangle connu). Cible : `page.locator` impossible (canevas)
   → `M2.cible` vaut la portée annoncée par `hitRotateHandle` (22 px de demi-côté), lue en tapant à 20 px du centre de la
   poignée : rotation prise. `touchDrag` de `h` vers `h` tourné de 30° autour du centre ; état : `atan2(t[1], t[0])` = 30°.
   `touchDragWithLateFinger` d'un nouveau rectangle de 37° : multiple de 15. Souris + Maj (aide `mouseDrag` recopiée de
   `outils-excalidraw-navigateur.mjs` l. 61) de 50° : 45. Clavier : `page.keyboard.press("Alt+KeyT")` : +15°. `Control+z` :
   l'angle d'avant. Toucher le coin de la boîte englobante du rectangle tourné de 30° (hors de la forme) : `data-selection`
   ≠ 1.
2. `capturesM2(browser, base, nom)` : rectangle choisi ; `nom === "apres"` : aussi tourné de 30° au doigt ; `shoot(`${nom}-rotation`,
   { x: 400, y: 150, width: 640, height: 330 })`. `scripts/essais/dist-avant.sh /tmp/og33-avant-m2`, puis captures avant
   et après.
3. Fiche, section « Sélection » : « rotation, Maj 15° » → `adapté au tactile` : poignée sous le coin bas droit (choix 4),
   second doigt tardif = Maj, Alt+T / Alt+Maj+T, pas de poignée de taille sur un objet tourné (choix 7, écart) ; essai m2
   (`Lire : M2.angle`) et `select.test.ts` « poignée de rotation », `tests/arrange.rs::rotate_30_keeps_center_one_step`.
4. `verifier.sh --e2e`. Commits : `test(essais): lot 2b browser check M2 (rotation)` puis `docs(og33): rotation sheet and
   captures`.

<a id="tache-b6"></a>
### Tâche B6 — M3 : texte de forme `SetShapeLabel` (cœur, pont, faux cœur, contrat, CLI)

**Objectif :** clé facultative `label` (chaîne non vide) sur un rectangle, un losange ou une ellipse ; commande
`SetShapeLabel { id, label }` en une étape ; vue `shape.label` ; `ShapeToPolygon` retire `label` ; la copie d'`AddLinked`
part sans texte (choix 8). Scénario S12.

**Patron à ne pas reprendre :** un élément `text` lié à son conteneur (`containerId` d'Excalidraw) : suivi au `Transform`,
à `Rotate`, suppression en cascade et renumérotation dans `copy.rs` (n° 10) seraient à écrire en Rust. Chemin de
référence : `crates/roomboard-core/src/element.rs:248-252` (`read_polygon`, lecture tolérante d'une clé de premier niveau)
et `commands.rs:1380-1430` (`cmd_shape_to_polygon`, plan de clés posé par `crate::fill::set_or_remove`). Second patron
interdit : écrire un `label` vide ou `null` (GC8) : le vide retire la clé.

**Fichiers :** `crates/roomboard-core/src/{label.rs (neuf), lib.rs, element.rs, document.rs, commands.rs, linear.rs}`,
`crates/roomboard-core/tests/etiquettes.rs (neuf)`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/{api.ts,
fake-core.ts, wasm-core.ts, wasm-core.contract.test.ts}`, `apps/cli/src/{ops.ts, ops.test.ts}`, `scripts/essais/cli-essai.mjs`.

**Interfaces :**
- Produit (Rust) : `pub const MAX_LABEL_CHARS: usize = 10_000` ; `pub(crate) fn read_label<T: ReadTxn>(txn: &T, e: &MapRef,
  kind: ShapeKind) -> Option<String>` ; `pub(crate) fn cmd_set_shape_label(&mut self, id: &str, label: &str) ->
  Result<Change, CommandError>` (`label.rs`) ; `Command::SetShapeLabel { id: String, label: String }` ;
  `ShapeView.label: Option<String>` (`#[serde(skip_serializing_if = "Option::is_none")]`) ; pont `set_shape_label(id: &str,
  label: &str)` et `set_shape_label_inner`.
- Produit (TS) : `| { readonly type: "SetShapeLabel"; readonly id: string; readonly label: string }` (`Command`) ;
  `ShapeData.label?: string` (« OG33 : texte d'un rectangle, d'un losange ou d'une ellipse ; absent : aucun ; jamais vide »).
- Réutilise : `crates/roomboard-core/src/commands.rs:555` — `read_shape` ; `crate::fill::set_or_remove` ;
  `Document::{read, find_element, transact_local, unchanged, done}`.
- Réutilise : `crates/roomboard-core/src/document.rs:410` — construction de `ShapeView` (un champ de plus).
- Réutilise : `crates/roomboard-core/src/linear.rs` — `cmd_add_linked` (copie par `copy_elements`, puis `label` retiré de
  la copie dans la même transaction).
- Réutilise : `apps/web/src/core/wasm-core.ts:225-240` — lecture contrôlée de la vue de forme (un champ de plus).

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo test -p roomboard-core --test etiquettes --test fleches --test formes -j 4 2>&1 | grep -E "test result|FAILED|label"
# attendu : 0 FAILED ; ≥ 6 tests label_* dont label_one_step_undo ; old_file_keeps_bytes ok
```
Puis commande « Wasm » (taille citée), `cd apps/web && nice -n 10 npx vitest run src/core/wasm-core.contract.test.ts
-t "SetShapeLabel" 2>&1 | tail -6` (≥ 2 par fabrique), `ops.test.ts`, `cli-essai.mjs` (`CLI : OK`), `tsc` web et cli.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `CARGO_TARGET_DIR=$PWD/target`, `nice -n 10`, `-j 4`, suites par `suite-vm.cjs`.
- GC2 Tailles Wasm : principal ≤ 1 572 864 o après `wasm-opt -Oz` ; ajout Rust court (OG35).
- GC3 Tests : les littéraux `ShapeView { … }` des tests de `commands.rs` (l. ~3281, ~3414) gagnent `label: None` (seule
  retouche admise).
- GC4 Commits : un par un, trailer Opus 5.5.
- GC5 CLI : `SetShapeLabel` dans `COMMAND_TYPES`, compte 45 → 46, bloc `cli-essai.mjs`, `FORMAT_LOTS` inchangé.
- GC8 Format : `label` facultatif, jamais vide ; `old_file_keeps_bytes` vert.
- GC9 Rust : fmt et clippy verts. GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** aucun champ de style du texte (taille, police, gras) dans le cœur ; pas de `copy.rs` modifié (la copie
garde `label`, sauf `AddLinked`).

**Terminé :** tests Rust, contrat sur les deux fabriques, `CLI : OK`, Wasm mesuré, deux commits.

**Étapes :**

1. Tests rouges `crates/roomboard-core/tests/etiquettes.rs` (aides recopiées de `tests/arrange.rs` : `pen`, `blank`,
   `first_page`, `add_rect` ; plus `add_shape(d, kind)`) : `label_one_step_undo` (SetShapeLabel « Bonjour » : vue
   `shape.label == Some("Bonjour")`, une étape, `undo` → `None`) ; `label_same_text_no_step` ; `label_empty_removes_key` ;
   `label_refused_on_line_and_unknown` (`BadShape` sur une ligne, `UnknownElement`, version inchangée) ;
   `label_too_long_bad_text` (10 001 caractères → `BadText`) ; `label_follows_rotate_and_copy` (Rotate 30 puis
   `extract` + `insert_fragment` : la copie porte le texte) ; `label_non_string_reads_absent` (clé `label` posée en
   `Any::Number` par une transaction brute, patron `with_raw_zone` de `tests/arrange.rs:367` : vue `None`, aucune erreur) ;
   `shape_to_polygon_drops_label_undo_restores` ; `add_linked_copy_has_no_label`.
2. `label.rs` (neuf), `pub mod label;` dans `lib.rs` :

```rust
//! OG33 (lot 2b, morceau 3, choix 8) : texte d'un rectangle, d'un losange ou d'une ellipse, clé `label` de la forme. Le
//! texte lié d'Excalidraw (`containerId`, MIT) ramené à un seul élément : il suit déplacer, tourner, copier et supprimer
//! sans liaison à tenir. Lecture tolérante (U3) : une valeur qui n'est pas une chaîne non vide se lit absente.
use yrs::{Any, In, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, Change, CommandError};
use crate::document::Document;
use crate::shape::ShapeKind;

/// Plafond du texte d'une forme, en caractères.
pub const MAX_LABEL_CHARS: usize = 10_000;

const fn boxed(kind: ShapeKind) -> bool {
    matches!(kind, ShapeKind::Rect | ShapeKind::Diamond | ShapeKind::Ellipse)
}

/// Clé `label` d'une forme à boîte ; absente, vide, d'un autre type ou d'un autre genre : `None`.
pub(crate) fn read_label<T: ReadTxn>(txn: &T, e: &MapRef, kind: ShapeKind) -> Option<String> {
    if !boxed(kind) {
        return None;
    }
    match e.get(txn, "label") {
        Some(Out::Any(Any::String(s))) if !s.is_empty() => Some(s.to_string()),
        _ => None,
    }
}

impl Document {
    /// Refus, dans l'ordre : `BadText` (plus de 10 000 caractères), `UnknownElement`, `BadShape` (ni rectangle, ni
    /// losange, ni ellipse) ; même texte : aucune étape (D38) ; vide : clé retirée ; une transaction sinon.
    pub(crate) fn cmd_set_shape_label(&mut self, id: &str, label: &str) -> Result<Change, CommandError> {
        if label.chars().count() > MAX_LABEL_CHARS {
            return Err(CommandError::BadText);
        }
        let (e, page, same) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let s = read_shape(&txn, &found.element).ok_or(CommandError::BadShape)?;
            if !boxed(s.kind) {
                return Err(CommandError::BadShape);
            }
            let current = read_label(&txn, &found.element, s.kind).unwrap_or_default();
            (found.element, found.page_id, current == label)
        };
        if same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            crate::fill::set_or_remove(&e, &mut txn, "label", (!label.is_empty()).then(|| In::Any(Any::from(label))));
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
}
```

   (si `set_or_remove` attend une autre forme de valeur, suivre son usage dans `cmd_shape_to_polygon`). `element.rs` :
   champ `label` de `ShapeView`. `document.rs:410` : `label: crate::label::read_label(&txn, e, s.kind),`.
   `commands.rs` : variante `SetShapeLabel { id: String, label: String }` et bras `Command::SetShapeLabel { id, label } =>
   self.cmd_set_shape_label(&id, &label),` ; dans `cmd_shape_to_polygon`, `plan.push(("label", None));` à côté de
   `roundness` (commentaire « H5 : le texte de la forme part avec elle, l'annulation le rend »). `linear.rs`
   (`cmd_add_linked`) : la copie de l'objet perd `label` dans la même transaction (`remove` sur la carte copiée, ou clé
   retirée du `MapPrelim` rendu par `copy_prelims` avant l'insertion ; choisir le chemin déjà suivi par la fonction).
3. Pont : `set_shape_label` et `_inner` à côté de `shape_to_polygon` (l. ~1585, ~2675). `api.ts` : variante et champ.
   `wasm-core.ts` : contrôle `if (s["label"] !== undefined && typeof s["label"] !== "string") throw new Error(ELEMENT);` et
   `...(typeof s["label"] === "string" && s["label"] !== "" ? { label: s["label"] } : {})` dans la vue ;
   `case "SetShapeLabel": return toChange(this.d.set_shape_label(cmd.id, cmd.label));`. `fake-core.ts` : `case
   "SetShapeLabel"` au même ordre de refus (message `BadText` de `MESSAGES`, `élément inconnu : <id>`, `MESSAGES.badShape`),
   `label` gardé dans `shape`, retiré si vide ; `ShapeToPolygon` : `const { label: _l, ...s0 } = s` avant la conversion ;
   `AddLinked` : copie sans `label`.
4. Contrat `describe.each(factories)("contrat OG33 SetShapeLabel : $name")` : une étape et `undo` ; même texte : version
   inchangée ; vide : `label` absent de la vue ; ligne → refus `forme invalide` ; `ShapeToPolygon` puis `undo` : le texte
   revient ; `AddLinked` : la copie n'a pas de `label`.
5. CLI : `"SetShapeLabel"` dans `COMMAND_TYPES`, compte 46 ; `cli-essai.mjs` : bloc « OG33 : SetShapeLabel » (rectangle,
   `SetShapeLabel` « Bonjour », `state`, `undo`, `state` ; sur une ligne : code 1 `forme invalide`).
6. GC9, commande « Wasm », contrat, CLI. Commits : `feat(core): shape label key and SetShapeLabel (OG33 lot 2b)` puis
   `feat(web,cli): SetShapeLabel contract, fake core and CLI (OG33 lot 2b)`.

<a id="tache-b7"></a>
### Tâche B7 — M3 : édition et rendu du texte de forme, double toucher, Entrée, export

**Objectif :** double toucher ou double-clic sur un rectangle, un losange ou une ellipse, et Entrée sur une forme seule
choisie, ouvrent la zone de saisie de l'outil Texte, centrée dans la forme ; Échap ou un toucher ailleurs valident par une
`SetShapeLabel` ; le texte est peint centré dans le repère de la forme et exporté en boîte de texte (choix 8, 9).
Scénario S12.

**Fichiers :** `apps/web/src/core/{shape-label.ts (neuf), shape-label.test.ts (neuf)}`,
`apps/web/src/engine/tools/{tool.ts, text.ts, text.test.ts, select.ts, select.test.ts}`,
`apps/web/src/engine/render/{overlay.ts, canvas2d.ts, canvas2d.test.ts}`, `apps/web/src/engine/input/{keys.ts, keys.test.ts}`,
`apps/web/src/engine/{engine.ts, engine.test.ts}`, `apps/web/src/app/{board-io.ts, board-io.test.ts}`.

**Interfaces :**
- Consomme (B6) : `ShapeData.label`, `Command` `SetShapeLabel`.
- Produit : `core/shape-label.ts` : `LABEL_SIZE = 24`, `LABEL_PAD = 5`,
  `labelBox(s: Pick<ShapeData, "shape" | "w" | "h">): { readonly x: number; readonly w: number; readonly cy: number } | null`,
  `labelTop(box: { readonly cy: number }, height: number): number` ; `TextEditSession.shape?: string` ;
  `TextTool.openLabel(id: string): boolean` ; `ToolContext.editText?(id: string): void`, `ToolContext.labelDone?(id:
  string): void` ; `GhostView.noLabel?: true`.
- Réutilise : `apps/web/src/engine/tools/text.ts` — séance, porte IME `createCommitGate`, `host.open`, `commit` (une branche
  de plus) ; `apps/web/src/engine/text-layout.ts` — `layoutRich`, `richBoxHeight`, `TEXT_LINE_HEIGHT`.
- Réutilise : `apps/web/src/core/rich-text.ts` — `plainSpans`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:388` — `paintText(ctx, lines, color, boxWidth, "center")` ;
  `measureWith(ctx)` ; patron du cache `linesOf`.
- Réutilise : `apps/web/src/engine/tools/select.ts` — branche du double toucher de `close` (`isDoubleTap`, `lastTap`,
  `isNode`).
- Réutilise : `apps/web/src/engine/text-layout.ts` — `layoutRich`, `richBoxHeight`, `measureOrFallback` (export).
- Réutilise : `apps/web/src/engine/input/keys.ts` — `inControl` (garde d'`enterAction`, comme `nudgeKey`).
- Réutilise : `apps/web/src/app/board-io.ts:398` — boucle d'export (un objet texte poussé après la forme) ;
  `apps/web/src/core/shapes.ts:207` — `composeMatrix`.

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 npx vitest run src/core/shape-label.test.ts src/engine/tools/text.test.ts src/engine/tools/select.test.ts \
    src/engine/render/canvas2d.test.ts src/engine/input/keys.test.ts src/engine/engine.test.ts src/app/board-io.test.ts 2>&1 | tail -8
# attendu : « Test Files  7 passed » ; « texte de forme » (≥ 4), « double toucher sur une forme : son texte »,
#           « Entrée sur une forme » présents ; « aucune conversion (C4b) » vert
```
Puis `tsc` et la suite web par `suite-vm.cjs`.

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `nice -n 10`, vitest ciblé, suite par `suite-vm.cjs`.
- GC3 Tests : le test « double toucher sur un rectangle, un losange, une ellipse : aucune conversion (C4b) » reste vert.
- GC4 Commits : un par un, trailer Opus 5.5.
- GC6 Excalidraw : `BOUND_TEXT_PADDING`, `getBoundTextMaxWidth`, `handleCanvasDoubleClick`, `textWysiwyg` cités.
- GC7 Tactile : double toucher au doigt d'abord (300 ms, 35 px, `isDoubleTap`), Entrée au clavier.
- GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** aucune commande composée pour un geste (une `SetShapeLabel` à la validation) ; la zone de saisie
(`app/text-editor.ts`) n'est pas modifiée ; l'outil Texte posé sur une forme garde son comportement (boîte libre).

**Terminé :** six fichiers verts, suite web verte, un ou deux commits.

**Étapes :**

1. `core/shape-label.ts` et ses tests :

```ts
/** OG33 (lot 2b, choix 8) : texte d'une forme, au modèle du texte lié d'Excalidraw (MIT) : `BOUND_TEXT_PADDING` 5, centré ;
 *  taille 24 (la plus petite de `TEXT_SIZES`) ; losange et ellipse ramenés au rectangle inscrit (`getBoundTextMaxWidth`). */
import type { ShapeData } from "./api";
export const LABEL_SIZE = 24;
export const LABEL_PAD = 5;
export function labelBox(s: Pick<ShapeData, "shape" | "w" | "h">): { readonly x: number; readonly w: number; readonly cy: number } | null {
  const w = Math.abs(s.w);
  const k = s.shape === "rect" ? 1 : s.shape === "diamond" ? 0.5 : s.shape === "ellipse" ? Math.SQRT1_2 : 0;
  const inner = w * k - 2 * LABEL_PAD;
  if (k === 0 || inner < LABEL_SIZE) return null;
  return { x: (w - inner) / 2, w: inner, cy: Math.abs(s.h) / 2 };
}
/** Haut (repère local) d'une boîte de hauteur `height` centrée verticalement. */
export const labelTop = (box: { readonly cy: number }, height: number): number => box.cy - height / 2;
```

   Tests : rectangle 200 × 100 → `{ x: 5, w: 190, cy: 50 }` ; losange 200 → `w: 90` ; ellipse 200 → `w ≈ 131,42` ; ligne
   → null ; rectangle de 30 de large → null.

2. `tool.ts` : `editText?(id: string): void` (« OG33 : ouvre le texte de la forme `id` (double toucher) ») et
   `labelDone?(id: string): void` (« OG33 : séance de texte de forme fermée »). `text.ts` : `TextEditSession.shape?: string`
   (« OG33 : forme dont on écrit le texte ; `id` reste null ») ; `TextTool.openLabel(id: string): boolean` :

```ts
  /** OG33 (choix 8, 9) : séance sur le texte de la forme `id`, zone centrée dans sa boîte ; la forme est masquée et
   *  repeinte sans son texte (fantôme `noLabel`). */
  const openLabel = (id: string): boolean => {
    const el = ctx.doc.element(id);
    if (el?.kind !== "shape") return false;
    const box = labelBox(el.shape);
    if (box === null) return false;
    if (session) gate.request();
    const label = el.shape.label ?? "";
    const spans = plainSpans(label);
    const height = Math.max(richBoxHeight(layoutRich(spans, { size: LABEL_SIZE }, box.w, measure)), LABEL_SIZE * TEXT_LINE_HEIGHT);
    session = { page: ctx.page(), id: null, shape: id, matrix: composeMatrix(el.transform, [1, 0, 0, 1, box.x, labelTop(box, height)]), boxWidth: box.w, color: el.style.color, size: LABEL_SIZE, initial: label, spans };
    live = { strokes: [], erasers: [], hidden: new Set([id]), overlay: { ...EMPTY_OVERLAY, ghosts: [{ id, matrix: IDENTITY_MATRIX, noLabel: true }] } };
    gate.reset();
    host.open(session, ctx.camera());
    ctx.stateChanged?.();
    return true;
  };
```

   Dans `commit`, juste après `ctx.stateChanged?.();` : `if (s.shape !== undefined) { if (content !== s.initial)
   ctx.run({ type: "SetShapeLabel", id: s.shape, label: content }); ctx.labelDone?.(s.shape); return; }`. Exposer
   `openLabel` dans l'objet rendu. Tests `text.test.ts` (aides `setup`, `FakeHost`) : « texte de forme : openLabel centre la
   zone (boxWidth 190 pour 200 × 100), validation : une SetShapeLabel » ; « texte de forme : texte inchangé : aucune
   commande, labelDone appelé » ; « texte de forme : openLabel sur une ligne : false ».

3. `overlay.ts` : `GhostView.noLabel?: true`. `canvas2d.ts` : `paintElement(ctx, el, pre, opts?: { readonly noLabel?:
   boolean })` ; après `paintShape`, si `el.shape.label !== undefined && opts?.noLabel !== true` :
   `const box = labelBox(el.shape); if (box) { const lines = this.labelLinesOf(ctx, el.id, el.shape.label, box.w);
   ctx.save(); ctx.transform(1, 0, 0, 1, box.x, labelTop(box, richBoxHeight(lines))); paintText(ctx, lines, el.style.color,
   box.w, "center"); ctx.restore(); }` ; `labelLinesOf` met en cache `layoutRich(plainSpans(label), { size: LABEL_SIZE }, w,
   measureWith(ctx))` par id et clé `${w}|${label}` (patron `linesOf`) ; boucle des fantômes :
   `this.paintElement(ctx, …, g.matrix, g.noLabel ? { noLabel: true } : undefined)`. Tests : « texte de forme : peint dans
   le repère de la forme » (forme tournée : `fillText` après les deux `transform`), « texte de forme : fantôme noLabel sans
   fillText ».

4. `select.ts`, branche du double toucher de `close` :

```ts
        if (id !== null && lastTap?.id === id && isDoubleTap(lastTap, cur)) {
          if (editsPointsOnTap(view)) {
            lastTap = null;
            ctx.editPoints?.(id);
            return;
          }
          // OG33 (choix 9, décision du lot 2a) : double toucher ou double-clic sur une forme = son texte, jamais la conversion.
          if (isNode(view)) {
            lastTap = null;
            ctx.editText?.(id);
            return;
          }
        }
```

   Test (aide `setupLines`, gagne `editText: (id) => { texts.push(id); }` et rend `texts`) : « double toucher sur une forme :
   son texte » (rectangle, losange, ellipse : `texts` = [id], aucune `ShapeToPolygon`).

5. `engine.ts` : `inertText()` gagne `openLabel: () => false` ; `ctx` gagne `editText: (id) => void editShapeText(id)` et
   `labelDone: (id) => { engine.setTool("select"); selectTool.setSelection([id]); requestScene(); emit(); }` ;

```ts
  /** OG33 (choix 9) : texte d'un rectangle, d'un losange ou d'une ellipse de la page montrée, par l'outil Texte. */
  function editShapeText(id: string): boolean {
    const v = doc.element(id);
    if (v?.kind !== "shape" || !isBoxShape(v.shape.shape) || !doc.elementIds(pageId).includes(id)) return false;
    if (tool !== "text") engine.setTool("text");
    return textTool.openLabel(id);
  }
```

   Dans `key`, après le bloc `lineEditKey` : `if (enterAction(e) && lineEditor === null && tool === "select" && (imageEdit
   === null || imageEdit.mode() === "idle")) { const sel = selectTool.selection(); if (sel.length === 1 &&
   editShapeText(sel[0]!)) return true; }`. Test (aide `og12()`, faux outil Texte dont `openLabel` note l'id) : « Entrée
   sur une forme : son texte » ; « Entrée sur une ligne : la touche passe ».
   `keys.ts:134` (`enterAction`) n'écarte que `inEditable` : ajouter `|| inControl(e.target)` à sa garde, comme `nudgeKey`
   (l. ~219), et garder le test `BUTTON` existant. Tests : `keys.test.ts` « enterAction : Entrée sur un contrôle
   (bouton, radio, case de grille) : faux » ; `engine.test.ts` « Entrée sur un bouton qui a le focus : le bouton agit, le
   texte de la forme ne s'ouvre pas » (forme seule choisie, `key("Enter", { target: <bouton> })` : `openLabel` non appelé,
   touche non prise).

6. `board-io.ts` : dans la boucle, après `levels.at(-1)!.push(o);` :

```ts
      // OG33 (choix 8) : le texte d'une forme s'écrit en boîte de texte posée par la matrice de la forme.
      if (el.kind === "shape" && el.shape.label !== undefined) {
        const box = labelBox(el.shape);
        if (box !== null) {
          // Même mise en page qu'à l'écran (`layoutRich` dans `box.w`) ; sans canevas, la mesure de repli
          // (`measureOrFallback(null)`, 0,6 × taille par caractère) : la hauteur peut différer de l'écran (écart écrit dans la fiche).
          const boxHeight = richBoxHeight(layoutRich(plainSpans(el.shape.label), { size: LABEL_SIZE }, box.w, measureOrFallback(null)));
          levels.at(-1)!.push({ kind: "text", m: composeMatrix(el.transform, [1, 0, 0, 1, box.x, labelTop(box, boxHeight)]), x: 0, y: 0, boxWidth: box.w, boxHeight, size: LABEL_SIZE, color: el.style.color, spans: plainSpans(el.shape.label) });
        }
      }
```

   Imports : `layoutRich`, `richBoxHeight`, `measureOrFallback` de `../engine/text-layout`. Test : « texte de forme exporté
   avec la matrice » et « texte de forme exporté : hauteur de `layoutRich` (deux lignes repliées pour un mot plus large que
   `box.w`, aucun `\n`) » ; la fiche (B8) écrit l'écart de mesure. Premier test : (rectangle tourné par `Rotate`, label « A » : un objet `text` dont `m`
   commence par la partie linéaire de la forme).
7. Vert, `tsc`, suite web. Commit : `feat(engine): text inside a shape by double tap and Enter (OG33 lot 2b)`.

<a id="tache-b8"></a>
### Tâche B8 — M3 : essai navigateur texte dans une forme, captures, fiche

**Objectif :** S12 joué au doigt puis au clavier ; captures avant et après ; fiche ; `verifier.sh --e2e` vert (porte de
fusion de M3).

**Fichiers :** `scripts/essais/outils-excalidraw-2b-navigateur.mjs`, `docs/essais/outils-excalidraw.md`,
`docs/design/captures/personnalisation-2-outils/{avant-texte-forme.png, apres-texte-forme.png, apres-texte-losange.png}`.

**Interfaces :**
- Consomme : B6, B7 ; zone de saisie `[role="textbox"][aria-label="Texte"]` (`app/text-editor.ts:114-118`), validée par
  Échap (patron de `c7b-texte-riche-navigateur.mjs` l. 126-142).
- Réutilise : `scripts/essais/gestes.mjs` — `doubleTouch`, `touchDrag`, `tapStage`, `saved` ; `commun.mjs` — `inkIn`.
- Produit : `m3(browser, base, tmp)`, `capturesM3(browser, base, nom)`, `--only m3`.

**Test et commande bornée :** commande « Wasm », commande « Essai » `--only m3` (`outils-excalidraw-2b : OK`), puis
`verifier.sh --e2e` par `suite-vm.cjs` en arrière-plan (`verifier.sh : OK`).

**Preuve visuelle :** lectures : `Lire : M3.label=Bonjour`, `Lire : M3.shape=rect` (aucune conversion), `Lire :
M3.encre=<n>` (> 0, pixels d'encre au centre de la forme, `inkIn`), `Lire : M3.suit=1` (après un glisser de 150 px, encre
au nouveau centre), `Lire : M3.enter=Losange`, `Lire : M3.undo=absent`. Captures 2x : `avant-texte-forme.png` (base :
double toucher sans effet), `apres-texte-forme.png`, `apres-texte-losange.png` (losange tourné de 30° avec son texte).

**Contraintes (recopiées) :**
- GC1 VM partagée : `cd <worktree> &&`, `nice -n 10`, `verifier.sh --e2e` par `suite-vm.cjs` en arrière-plan.
- GC3 Tests : m1, m2 et les essais existants verts sans retouche.
- GC4 Commits : captures une par une, trailer Opus 5.5.
- GC6 Excalidraw : la fiche cite `App.tsx:handleCanvasDoubleClick`, `textWysiwyg`, `BOUND_TEXT_PADDING`.
- GC7 Tactile : doigt d'abord, puis clavier (Entrée).
- GC10, GC11, GC12, GC13, GC14 : comme l'en-tête.

**Interdits :** aucun code de produit ; écart rapporté à B6 ou B7.

**Terminé :** m3 vert, trois captures, fiche, `verifier.sh : OK`, commits.

**Étapes :**

1. `m3` : Rectangle rempli au doigt (choisir un fond dans le panneau, patron de `s8`, l. 539-545 de
   `outils-excalidraw-navigateur.mjs`) ; Sélection, toucher, pause 600 ms, `doubleTouch` au centre ; attendre la zone ;
   `page.keyboard.type("Bonjour")` ; Échap ; état : `label === "Bonjour"`, `shape === "rect"`. `inkIn` au centre. Glisser la
   forme de 150 px : encre au nouveau centre. Losange par la touche D, posé, choisi ; Entrée ; taper « Losange » ; Échap ;
   état. `Control+z` : le texte du losange disparaît (une étape).
2. `capturesM3` puis `dist-avant.sh /tmp/og33-avant-m3`, captures avant et après.
3. Fiche, « Rectangle, losange, ellipse » : « double toucher = texte lié, Entrée » → `adapté` : clé `label` de la forme
   (choix 8, écarts : texte simple, taille 24, pas d'agrandissement de la forme ; à l'export, la hauteur de la boîte vient de
   la mesure de repli, la page qui relit le fichier replie de nouveau), essai m3, `tests/etiquettes.rs`.
4. `verifier.sh --e2e`. Commits : `test(essais): lot 2b browser check M3 (text in a shape)` puis `docs(og33): text in a shape
   sheet and captures`.

<a id="tache-b9"></a>
### Tâche B9 — M4 : pointes `diamond` et `diamond_outline`

**Objectif :** deux pointes d'Excalidraw de plus (n° 13), aux deux bouts, tracé net et roughjs, choix au panneau (Losange,
Losange creux). Scénario S13.

**Fichiers :** `crates/roomboard-core/src/element.rs` (`ARROWHEADS`, l. ~471), `crates/roomboard-core/tests/fleches.rs`,
`apps/web/src/core/{look.ts, look.test.ts}`, `apps/web/src/engine/render/{canvas2d.ts, canvas2d.test.ts, sketch.ts,
sketch.test.ts}`, `apps/web/src/ui/{OptionsPanel.tsx, OptionsPanel.test.tsx, icons.ts, icons.test.ts}`.

**Interfaces :**
- Produit : `ARROWHEADS` (Rust, `[&str; 9]`) et `ARROWHEADS` / `Arrowhead` (TS) avec `"diamond"`, `"diamond_outline"` en
  fin ; icônes `head-diamond`, `head-diamond-outline` ; entrées `HEADS` « Losange », « Losange creux ».
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:301` — `arrowhead(ctx, kind, tipX, tipY, fromX, fromY, width,
  color)` (bras `circle` comme patron) ; `sketch.ts:180` — `addHead` (bras `circle`) ; `icons.ts:183-184` — `head-circle*`.

**Test et commande bornée :**
```bash
cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH CARGO_TARGET_DIR=$PWD/target CARGO_BUILD_JOBS=4 \
 && nice -n 10 cargo test -p roomboard-core --test fleches -j 4 2>&1 | grep -E "test result|FAILED|diamond"
cd apps/web && nice -n 10 npx vitest run src/core/look.test.ts src/engine/render/canvas2d.test.ts src/engine/render/sketch.test.ts \
   src/ui/OptionsPanel.test.tsx src/ui/icons.test.ts 2>&1 | tail -6
# attendu : diamond_heads_round_trip ok ; « Test Files  5 passed » ; « pointe losange », « Losange creux » présents
```
Puis commande « Wasm » (taille citée).

**Contraintes (recopiées) :**
- GC1, GC2 (≤ 1 572 864 o après `wasm-opt -Oz`), GC3 (le test `ARROWHEADS` de `look.test.ts` l. 71 passe à la liste de 9 :
  consigné), GC4, GC6 (`arrowheads.ts` d'Excalidraw cité), GC7 (icônes Lucide de trait 1,5 dans `ICON_VIEWBOX`, cible 44
  px du panneau), GC8 (valeur neuve facultative, `old_file_keeps_bytes` vert), GC9, GC10, GC11, GC12 (seule la liste
  `HEADS` d'`OptionsPanel.tsx` est touchée), GC13, GC14.

**Interdits :** pas de `cardinality_*` (hors de ce lot) ; aucun changement des pointes existantes.

**Terminé :** tests verts, Wasm mesuré, un commit `feat: diamond and diamond_outline arrowheads (OG33 lot 2b)`.

**Étapes :**

1. Tests rouges : `fleches.rs::diamond_heads_round_trip` (sur le patron de la boucle `for head in ["bar", "circle",
   "circle_outline"]`, l. ~338 : `SetStyle` puis lecture, aux deux bouts) ; `look.test.ts` (liste, `toLook({ endArrowhead:
   "diamond_outline" })`) ; `canvas2d.test.ts` « pointe losange : quatre sommets, fermée ; pleine remplie » ;
   `sketch.test.ts` « pointe losange : polygone roughjs » ; `OptionsPanel.test.tsx` « Losange creux » dans la section
   Pointes ; `icons.test.ts` les deux icônes.
2. Géométrie commune (tracé net et roughjs) : `L = Math.max(6, 2 * width)` le long du fût, demi-largeur `0.6 * L` ; sommets
   pointe `(tx, ty)`, côtés `t − L·u ± 0,6·L·n`, arrière `t − 2L·u` (`u` unitaire du fût vers la pointe, `n` normale).
   `canvas2d.ts` : bras `diamond` / `diamond_outline` dans `arrowhead` (chemin fermé, `fill` pour `diamond`) ; `sketch.ts` :
   bras dans `addHead` (`gen.polygon`, plein pour `diamond`) ; Rust et TS : les deux noms en fin de liste.
3. `icons.ts` : `"head-diamond": [["path", { d: "M4 12h9" }], ["path", { d: "M13 12l3.5-3 3.5 3-3.5 3z" }], ["path", { d:
   "M15 12h3" }]]` et `"head-diamond-outline": [["path", { d: "M4 12h9" }], ["path", { d: "M13 12l3.5-3 3.5 3-3.5 3z" }]]`
   (losange de 7 × 6 au bout du fût, comme `head-circle*` ; vérifier la netteté à 2x). `OptionsPanel.tsx` : deux entrées
   dans `HEADS` après `circle_outline`.
4. Vert, GC9, commande « Wasm ». Commit.

<a id="tache-b10"></a>
### Tâche B10 — M4 : navigation Alt+flèche entre objets reliés, essai M4, fiche

**Objectif :** Alt+flèche, une forme seule choisie, choisit l'objet relié par une flèche liée dans cette direction (choix
10, `FlowChartNavigator` d'Excalidraw) ; essai m4 (navigation et pointe Losange creux au panneau) ; fiche de M4 ;
`verifier.sh --e2e` vert (porte de fusion de M4). Scénario S13.

**Fichiers :** `apps/web/src/engine/{flow-nav.ts (neuf), flow-nav.test.ts (neuf), engine.ts, engine.test.ts}`,
`apps/web/src/engine/input/{keys.ts, keys.test.ts}`, `apps/web/src/ui/{shortcuts.ts, shortcuts.test.ts}`,
`scripts/essais/outils-excalidraw-2b-navigateur.mjs`, `docs/essais/outils-excalidraw.md`.

**Interfaces :**
- Produit : `export function linkedNodeIn(doc: CoreDocument, page: string, id: string, dir: LinkDir): string | null`
  (`flow-nav.ts`) ; `export function navKey(e: KeyLike): LinkDir | null` (`keys.ts`) ; ligne de raccourci `flow-nav`
  (« Aller à l'objet relié », `Alt+↑ ↓ ← →`, groupe « Édition ») ; `m4(browser, base, tmp)`, `--only m4`.
- Réutilise : `apps/web/src/engine/input/keys.ts:59-64` — `LINK_KEYS`, `linkedKey` (même table, sans Maj).
- Réutilise : `CoreDocument.elementIds`, `element`, `bounds` ; `ShapeData.start` / `end` (liaisons lues, n° 9 : une
  liaison vers un id absent est déjà lue absente).
- Réutilise : `apps/web/src/engine/engine.ts:1342` — bloc `tableKey` (Alt+flèches de l'outil Tableau gardées avant).

**Test et commande bornée :**
```bash
cd <worktree> && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 npx vitest run src/engine/flow-nav.test.ts src/engine/input/keys.test.ts src/engine/engine.test.ts src/ui/shortcuts.test.ts 2>&1 | tail -6
# attendu : « Test Files  4 passed » ; flow-nav ≥ 3 tests ; « Alt+→ » présent
```
Puis commande « Wasm », commande « Essai » `--only m4` (`Lire : M4.nav=<data-bounds>` égal à la boîte de B (`#stage` ne publie que `data-selection` et `data-bounds`,
`board-session.ts:771-772`), `Lire : M4.pointe=diamond_outline`),
`verifier.sh --e2e` par `suite-vm.cjs` (`verifier.sh : OK`).

**Contraintes (recopiées) :**
- GC1, GC3 (Alt+flèches du Tableau, `tableKey`, verts sans retouche), GC4, GC6 (`App.flowchart.ts:FlowChartNavigator`
  cité), GC7 (geste tactile existant : toucher l'objet ; Alt+flèche au clavier), GC10, GC11, GC12, GC13, GC14.

**Interdits :** pas de grappe centrée ni de cycle entre plusieurs objets d'une même direction (hors de ce lot) ; aucune
commande du cœur.

**Terminé :** quatre fichiers vitest verts, m4 vert, fiche de M4, `verifier.sh : OK`, commits.

**Étapes :**

1. `flow-nav.ts` :

```ts
/** OG33 (lot 2b, choix 10) : objet relié dans une direction, au modèle de `FlowChartNavigator` d'Excalidraw
 *  (packages/excalidraw/components/App.flowchart.ts, MIT) réduit au plus proche : flèches ou lignes liées par un bout à
 *  `id`, autre bout lié à un objet de la page dont le centre est dans `dir` (axe dominant). */
import type { CoreDocument, LinkDir } from "../core/api";
export function linkedNodeIn(doc: CoreDocument, page: string, id: string, dir: LinkDir): string | null {
  const center = (k: string): [number, number] | null => {
    const b = doc.bounds([k]);
    return b === null ? null : [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  };
  const c0 = center(id);
  if (c0 === null) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const k of doc.elementIds(page)) {
    const v = doc.element(k);
    if (v?.kind !== "shape") continue;
    const [a, b] = [v.shape.start?.id, v.shape.end?.id];
    const other = a === id ? b : b === id ? a : undefined;
    if (other === undefined || other === id) continue;
    const c = center(other);
    if (c === null) continue;
    const [dx, dy] = [c[0] - c0[0], c[1] - c0[1]];
    const ok = dir === "right" ? dx > Math.abs(dy) : dir === "left" ? -dx > Math.abs(dy) : dir === "down" ? dy > Math.abs(dx) : -dy > Math.abs(dx);
    const d = Math.hypot(dx, dy);
    if (ok && d < bestD) [best, bestD] = [other, d];
  }
  return best;
}
```

   Tests (faux cœur) : A relié à B à droite et C en bas : `right` → B, `down` → C, `up` → null ; flèche liée d'un seul bout :
   null.
2. `keys.ts` : `export function navKey(e: KeyLike): LinkDir | null { if (e.isComposing || !e.altKey || e.shiftKey ||
   e.ctrlKey || e.metaKey || inEditable(e.target)) return null; return Object.hasOwn(LINK_KEYS, e.key) ? LINK_KEYS[e.key]! :
   null; }`. `engine.ts`, juste après le bloc `tableKey` (avant la garde `imageBusy`, l. 1342-1358, d'où la condition image) :
   `const nav = navKey(e); if (nav !== null && tool === "select" && lineEditor === null && (imageEdit === null ||
   imageEdit.mode() === "idle")) { const sel = selectTool.selection(); const next = sel.length === 1 ? linkedNodeIn(doc, pageId,
   sel[0]!, nav) : null; if (next !== null) { selectTool.setSelection([next]); requestScene(); emit(); return true; } }`.
   Test `engine.test.ts` (aide `og12()`, `AddLinked` à droite) : « Alt+→ choisit l'objet relié » ; sans objet : faux ;
   pendant le rognage d'une image (`imageEdit.mode() === "crop"`) : la sélection ne change pas.
   `shortcuts.ts` : ligne `flow-nav`.
3. `m4` dans l'essai : rectangle A au doigt, poignée « + » de droite (patron de S3) : B relié ; A choisi ;
   `page.keyboard.press("Alt+ArrowRight")` ; `data-selection` = 1 et `data-bounds` de `#stage` égal (à 1 près) à la boîte
   de B lue dans l'état `saved` (transform, `w`, `h`, demi-épaisseur) ; `lire("M4.nav", …)` ; pointe de fin
   « Losange creux » choisie au doigt sur la flèche (`choose(page, "doigt", "endArrowhead", "diamond_outline")`, clé réelle
   de la section Pointes à lire dans `OptionsPanel.tsx`), cible ≥ 44 lue, état `look.endArrowhead`.
4. Fiche : « navigation Alt+flèche entre nœuds » → `adapté` (le plus proche, sans grappe), essai m4 ; « pointes » →
   `diamond`, `diamond_outline` copiés (B9), `cardinality_*` hors du lot 2b.
5. `verifier.sh --e2e`. Commits : `feat(engine): Alt+arrow navigation between linked nodes (OG33 lot 2b)` puis
   `test(essais): lot 2b browser check M4 and sheet`.

---

## Hors de ce lot

| reste du « Lot 2b » | raison |
|---|---|
| Îlot « Modificateurs » au doigt (n° 31, H4) | nouvel îlot, deux boutons collants, trois outils à brancher (Sélection, formes, rotation) : une tâche de conception à lui seul, hors des 4 h 30 ; Alt (depuis le centre) reste à la souris |
| Segments fixes des coudées (n° 25) | portage de `moveFixedSegment` / `deleteFixedSegment` dans la route Rust (`linear.rs`) : code du cœur hors `table.rs`, contraire à « ajouts Rust minimes » (OG35) pendant ce tour |
| Étiquettes sur flèche (H3) | demande d'arbitrer le double toucher sur une flèche, aujourd'hui « Modifier les points » (n° 21) ; le texte de forme (M3) pose le patron (`label`) à étendre ensuite |
| Courbe fermée (ellipse en Catmull-Rom fermée) | change le rendu, la collision et l'export de la ligne fermée du lot 2a ; aucun besoin bloquant |
| Multi-points au clic, Alt+clic au bout | nouveau mode de l'outil Flèche (état entre clics) ; Excalidraw ne l'a pas au doigt (n° 16) : priorité tactile basse |
| Fiche complète des autres outils (n° 36) | travail de fiche et d'essais au doigt pour chaque outil ; chaque morceau met déjà à jour ses lignes |
| Pointes `cardinality_*` (six pointes de cardinalité) | six tracés et six icônes : pas une tâche courte ; `diamond` et `diamond_outline` livrés (B9) |
| Alt-glisser qui duplique | Alt pendant un glisser vaut « sans aimant » (C9, G8, essais `c9-grille`) ; OG23 a livré « Glisser une copie » (propriété `dragCopy`) à la place (n° 32) : rouvrir Alt casserait C9 |
| Redimensionner un objet tourné dans son repère (cadre tourné) | décision de conception à part (cadre et poignées tournés, matrice locale) ; d'ici là, pas de poignée de taille sur un objet tourné (choix 7) |
| Grappe centrée du flowchart, cycle entre objets d'une même direction | Excalidraw `placeCluster` ; la navigation livrée prend le plus proche |
| Suivi des autres changements de boîte (H11 : `SetTableSizes`, lignes du tableau, `SetImageParams`) | zone d'OG32 (tableau) et d'OG34 (image) |
