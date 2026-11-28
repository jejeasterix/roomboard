# C13 lot 1 — lecteur SVG commun, `.iwb`, `.ubz` : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** un `.iwb` (ZIP ou SVG brut) ou un `.ubz` déposé ou ouvert devient un onglet RoomBoard avec sa liste
d'avertissements ; « Enregistrer une copie au format .iwb… » et « … .ubz… » écrivent les copies (niveaux A et E).

**Architecture :** le module `formats` (Rust) lit le XML en un flux plat « BoardList » et écrit le XML depuis ce flux
(DA2) ; le ZIP reste au Worker ZIP TypeScript (D3) ; la page traduit le flux en commandes du cœur sur un document
jetable, puis `saveParts` → `loadParts` (D7). Le module `formats` tient sous son plafond grâce à `opt-level = "z"` sur
ses crates tierces (D2, DA1).

**Tech Stack :** Rust (`quick-xml` 0.42 déjà au `Cargo.lock`), wasm-bindgen 0.2.130, TypeScript (vitest), fflate,
Playwright (essais `scripts/essais/`).

**Spec :** `docs/plans/usage-c13-lot1-svg-iwb-ubz-cadrage.md`

**Gabarit :** chantier (confirmé : 12 tâches, 3 vagues, un lot).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Réglage `opt-level = "z"` des crates tierces de `formats`, tailles avant/après | — | `Cargo.toml`, `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1` | implementeur-tdd | module formats ≤ 2 950 000 o et principal = 1 371 293 o lus par `wc -c` ; `cargo test -p roomboard-formats` : `test result: ok`, N ≥ 30, `golden_stream_g1_parses_to_one_red_rect` présent | S1 | #tache-t1 |
| T2 | Contrat BoardList (Rust) : types, codage, flux témoin W1, signatures | — | `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/board.rs`, `crates/roomboard-formats/src/board/read.rs`, `crates/roomboard-formats/src/board/write.rs`, `crates/roomboard-formats/src/board/qt_html.rs` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T2` | concepteur-critique | `cargo test -p roomboard-formats board::` : N ≥ 6 tests, `golden_w1_parses_to_the_expected_pages` présent ; taille formats notée | S4 | #tache-t2 |
| T3 | Worker ZIP : mode `board` et filtre `keepBoardPath` | — | `apps/web/src/platform/zip-worker.ts`, `apps/web/src/platform/zip-worker.test.ts`, `apps/web/src/platform/zip-read.ts`, `apps/web/src/platform/zip-read.test.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T3` | implementeur-tdd | vitest `zip-worker.test.ts zip-read.test.ts` : N ≥ 4 tests neufs, `C13 : keepBoardPath` présent | S5 | #tache-t3 |
| T4 | Entrées et sorties de fichiers : détection `.iwb`/`.ubz`, types, actions de barre | — | `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/typed-files.ts`, `apps/web/src/platform/typed-files.test.ts`, `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T4` | implementeur-tdd | vitest des 6 fichiers de test : N ≥ 10 tests neufs `C13`, `C13 : .iwb ZIP ou XML` présent | S1 | #tache-t4 |
| T5 | `board-io.ts` : flux BoardList ↔ commandes du cœur, dans les deux sens | — | `apps/web/src/app/board-io.ts`, `apps/web/src/app/board-io.test.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T5` | concepteur-critique | vitest `board-io.test.ts` : N ≥ 11 tests, `flux témoin W1` présent | S4 | #tache-t5 |
| T6 | Liaison Wasm `BoardReader` / `write_board_xml` et Worker jetable des tableaux | T1, T2 | `crates/roomboard-formats-wasm/src/lib.rs`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/board-worker.ts`, `apps/web/src/platform/board-reader.ts`, `apps/web/src/platform/board-reader.test.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T6` | implementeur-tdd | `cargo test -p roomboard-formats-wasm board` : N ≥ 3 ; vitest `board-reader.test.ts` : N ≥ 6 ; taille formats notée | S1 | #tache-t6 |
| T7 | Lecteur SVG commun `read_svg` (IWB et pages OpenBoard) | T1, T2 | `crates/roomboard-formats/src/board/read.rs` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T7` | concepteur-critique | `cargo test -p roomboard-formats board::read` : N ≥ 17, `doctype_and_external_entity_are_never_resolved` présent ; taille formats notée | S1, S2, S5 | #tache-t7 |
| T8 | Texte d'OpenBoard : lecteur tolérant du HTML de Qt | T1, T2 | `crates/roomboard-formats/src/board/qt_html.rs` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T8` | implementeur-tdd | `cargo test -p roomboard-formats board::qt_html` : N ≥ 6, `reads_the_shape_our_writer_emits` présent ; taille formats notée | S3 | #tache-t8 |
| T9 | Écrivain des copies `.iwb` et `.ubz`, avis de tiers 1EdTech | T1, T2 | `crates/roomboard-formats/src/board/write.rs`, `THIRD_PARTY_NOTICES.md` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T9` | implementeur-tdd | `cargo test -p roomboard-formats board::write` : N ≥ 7, `iwb_of_w1_has_namespaces_pages_background_arrow_and_spans` présent ; taille formats notée | S4 | #tache-t9 |
| T10 | Espace de travail : ouvrir un tableau, enregistrer une copie | T4, T5 | `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/app/board-files.ts`, `apps/web/src/app/board-files.test.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T10` | implementeur-tdd | vitest `workspace.test.ts board-files.test.ts` : N ≥ 12 tests neufs `C13`, `C13 : .iwb ZIP ouvert` présent ; suite web entière verte | S1, S3, S4 | #tache-t10 |
| T11 | Mesures hors dépôt : fidélité sur les exemples, vitesse du réglage `z` | T1, T7 | `docs/essais/c13-fidelite-iwb.md` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11` | implementeur-tdd | tableau de 55 lignes dans `docs/essais/c13-fidelite-iwb.md`, ligne `7-11 Maths 3.iwb` à 3 pages ; `git status` sans `examples/` | S2 | #tache-t11 |
| T12 | Câblage, essai navigateur C13, aller-retour natif, capture, tailles finales | T3, T4, T5, T6, T7, T8, T9, T10 | `apps/web/src/main.ts`, `apps/web/src/ui/App.tsx`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `scripts/essais/c13-tableaux-navigateur.mjs`, `crates/roomboard-formats/tests/board_roundtrip.rs`, `docs/essais/c13-iwb-lecon.png`, `docs/essais/taille-wasm.md` ; correctifs permis : `crates/roomboard-formats/src/board/read.rs`, `crates/roomboard-formats/src/board/write.rs`, `crates/roomboard-formats/src/board/qt_html.rs`, `apps/web/src/app/board-io.ts`, `apps/web/src/app/board-files.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/platform/board-reader.ts` | isolé `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12` | implementeur-tdd | `scripts/verifier.sh --e2e` code 0, lignes `C13 tableaux : OK` et `verifier.sh : e2e OK` ; `board_roundtrip` N ≥ 2 ; capture écrite | S1, S2, S3, S4, S5 | #tache-t12 |

**Vagues** (chaque vague : fichiers disjoints entre ses tâches)

- Vague 1 (départ immédiat) : T1, T2, T3, T4, T5.
- Vague 2 : T6, T7, T8, T9 (dès que T1 et T2 sont fusionnées), T10 (dès que T4 et T5 le sont).
- Vague 3 : T11 (dès que T7 l'est), T12 (quand T3 à T10 le sont). T11 et T12 courent en même temps.

Chemin critique estimé : T2 (25 min) → T7 (60 min) → T12 (60 min) ; T5 (60 min) → T10 (40 min) tient dans la même fenêtre.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `Cargo.toml` (racine) | 22 blocs `[profile.release.package.<crate>] opt-level = "z"` | T1 |
| `crates/roomboard-formats/src/board.rs` | types `BoardList`, `Page`, `Item`, `Span` ; `encode`, `parse` ; table des codes | T2 |
| `crates/roomboard-formats/src/board/read.rs` | `read_svg` : arbre `quick-xml`, pages, avertissements | T2 (signature), T7 (corps) |
| `crates/roomboard-formats/src/board/qt_html.rs` | `read_qt_html` : HTML de Qt → segments | T2 (signature), T8 (corps) |
| `crates/roomboard-formats/src/board/write.rs` | `write_iwb`, `write_ubz_pages`, `ubz_metadata` | T2 (signature), T9 (corps) |
| `crates/roomboard-formats-wasm/src/lib.rs` | `BoardReader`, `write_board_xml` | T6 |
| `crates/roomboard-formats/tests/board_roundtrip.rs` | aller-retour natif `read(write(l))` | T12 |
| `apps/web/src/platform/zip-worker.ts`, `zip-read.ts` | mode `board`, `keepBoardPath` | T3 |
| `apps/web/src/platform/import.ts`, `files.ts`, `typed-files.ts` | détection, extensions, `IWB_TYPE`, `UBZ_TYPE` | T4 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `app/toolbar-host.ts` | actions `export-iwb`, `export-ubz` | T4 |
| `apps/web/src/app/board-io.ts` | `decodeBoardList`, `encodeBoardList`, `buildBoardDocument`, `boardListOf`, types des ports | T5 |
| `apps/web/src/platform/container.ts`, `board-worker.ts`, `board-reader.ts` | liaison TS du module, Worker jetable | T6 |
| `apps/web/src/app/board-files.ts`, `workspace.ts` | choix des entrées du ZIP, messages, `openBoard`, `exportBoard` | T10 |
| `apps/web/src/main.ts`, `ui/App.tsx` | ports réels, boutons | T12 |
| `scripts/essais/c13-tableaux-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai Playwright branché dans `--e2e` | T12 |
| `docs/essais/taille-wasm.md` | tailles avant D2, après D2 (T1), finales (T12) | T1, T12 |
| `docs/essais/c13-fidelite-iwb.md` | fidélité sur `~/telechargements-roomboard/iwb/`, vitesse `z` | T11 |
| `docs/essais/c13-iwb-lecon.png` | capture de `7-11 Maths 3.iwb` importée | T12 |
| `THIRD_PARTY_NOTICES.md` | attribution 1EdTech (D21) | T9 |

## Table des codes du flux BoardList (contrat de T2, lu par T5, T6, T7, T9, T12)

Flux de nombres `ops` (f32) et tableau `texts` ; coordonnées **locales** de l'objet, matrice `m = [a, b, c, d, e, f]`
(x' = a·x + c·y + e, y' = b·x + d·y + f) qui place l'objet dans la page RoomBoard (1 920 de large). Couleurs : trois
entiers 0 à 255. Textes internés dans l'ordre de première apparition, sans doublon (le texte d'un segment avant sa
police).

| code | opération | nombres qui suivent le code |
|---|---|---|
| 1 | page (ouvre une page) | — |
| 2 | fond de la page courante | r, g, b |
| 3 | forme | kind (0 rect, 1 ellipse, 2 line, 3 arrow), m×6, x0, y0, x1, y1, r, g, b (contour), épaisseur, aRemplissage (0/1), fr, fg, fb (0, 0, 0 sans remplissage) |
| 4 | trait | m×6, r, g, b, épaisseur, n, puis n triplets x, y, pression |
| 5 | texte | m×6, x, y, largeur, hauteur, taille, r, g, b, n, puis n segments : indiceTexte, drapeaux (1 gras, 2 italique, 4 souligné), taille (0 = absente), r, g, b (−1, −1, −1 = absente), indicePolice (−1 = absente) |
| 6 | image | m×6, x, y, largeur, hauteur, indiceChemin |
| 7 | début de groupe | — |
| 8 | fin de groupe | — |
| 9 | grille de la page courante (OG70, G11 ; `.flipchart` seul, au plus une par page) | visible, snap, above (0/1), n (≤ 16), puis n niveaux : type (0 squares, 1 lines, 2 dots), pas x, pas y (> 0), origine x, y, r, g, b, trait (0 solid, 1 dashed, 2 dotted), épaisseur (1 à 8), snap, visible (0/1) |

Flux témoin **W1** (identique dans `board.rs` et `board-io.test.ts`) :

```text
ops = [
  1,
  2, 0, 0, 0,
  3, 0, 1, 0, 0, 1, 0, 0, 10, 20, 110, 70, 255, 0, 0, 4, 1, 0, 0, 255,
  4, 1, 0, 0, 1, 0, 0, 0, 128, 0, 3, 2, 0, 0, 1, 10, 10, 0.5,
  5, 1, 0, 0, 1, 100, 200, 0, 0, 300, 50, 24, 0, 0, 0, 2, 0, 1, 0, -1, -1, -1, -1, 1, 0, 32, 255, 0, 0, 2,
  6, 1, 0, 0, 1, 0, 0, 5, 5, 64, 32, 3,
  7,
  3, 2, 1, 0, 0, 1, 0, 0, 0, 0, 50, 0, 0, 0, 0, 2, 0, 0, 0, 0,
  3, 3, 1, 0, 0, 1, 0, 0, 0, 10, 50, 10, 0, 0, 0, 2, 0, 0, 0, 0,
  8,
  1
]
texts = ["Bonjour ", "monde", "Liberation Sans", "images/a.png"]
```

Lecture : page 1, fond noir ; rectangle rouge (10, 20)-(110, 70) épaisseur 4 rempli de bleu ; trait vert épaisseur 3
de deux points (0, 0, 1) et (10, 10, 0,5) ; texte placé en (100, 200), boîte 300 × 50, taille 24, noir, segments
« Bonjour » gras puis « monde » taille 32 rouge police « Liberation Sans » ; image `images/a.png` (5, 5) 64 × 32 ;
groupe d'une ligne (0, 0)-(50, 0) et d'une flèche (0, 10)-(50, 10), noires, épaisseur 2 ; page 2 vide.

## Global Constraints

- GC1 — TDD : test rouge d'abord, puis le code, puis le test vert. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — Builds et tests en `nice -n 10` ; chaque commande commence par `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : module principal 1 572 864 o, module `formats` 3 145 728 o (`scripts/verifier.sh` lignes 59 et 72). Aucun troisième module Wasm.
- GC4 — Une tâche qui touche le Rust de `formats` (ou de `formats-wasm`) mesure la taille du module `formats` (release wasm32 puis `wasm-bindgen --target web --remove-name-section`, comme `verifier.sh`) et l'écrit dans son rapport.
- GC5 — Sécurité : aucun script SVG exécuté, aucune entité externe ni DTD résolue, aucun chemin ZIP qui sort (`../`, absolu), bornes U26 (100 Mo web, 1 000 entrées et 256 Mio par ZIP, 100 000 objets, 500 pages) ; un test par cas.
- GC6 — Aucune requête réseau pour une image distante (avertissement) ; l'essai compte les requêtes hors origine.
- GC7 — Fichiers d'exemple `~/telechargements-roomboard/` : lecture seule, jamais copiés dans le dépôt ni commités ; les fixtures se fabriquent dans les tests.
- GC8 — Ne pas toucher : `crates/roomboard-core/src/zone.rs`, l'élément `fill` du pot, `scripts/essais/c8-pot-zones-navigateur.mjs`, les marques `data-zone-*`, `docs/audits/`, `crates/roomboard-core/**`, `crates/roomboard-wasm/**`. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve (ni crate ni paquet npm, D22) ; aucune dépendance AGPL/GPL/LGPL (U39) ; le code d'OpenBoard (GPL) est lu pour comprendre, jamais copié.
- GC10 — Interface : textes en français ; ni « IWB/CFF » ni « conforme » dans l'interface, seulement l'extension `.iwb` (D21).
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `git add -A`, `git add .`, ni `git commit -a` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs lancés au premier plan (`run_in_background: false`).
- GC13 — Chaque tâche travaille dans son seul worktree (colonne `worktree`) ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant tout test TypeScript ; avant `tsc`, copier les sorties Wasm ignorées par git depuis le worktree du chantier : `cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/` (jamais commitées).

## Review Focus

1. Un `.iwb` réel place ses `iwb:element` et `iwb:group` **après** les pages (fichiers `groups.iwb`, `7-11 Maths 3.iwb`) : groupes, flèches et verrous doivent s'appliquer quand même. Test `iwb_refs_after_pages_group_and_flags` (T7), d'après D13 et D15.
2. Texte en `CDATA` suivi d'espaces, de `tbreak` et de retours (forme de `7-11 Maths 3.iwb`) : aucune espace parasite en tête, en fin ni autour d'un saut de ligne. Test `text_whitespace_cdata_tbreak_and_baseline` (T7), d'après D11 et S2.
3. Couleurs de la suite de test : nommées (`red`, `grey`, `pink`), `rgb(0,255,0)`, `rgb(100%,0%,0%)`, `#f00`, `#ff0000`, valeur non ASCII sans panique. Test `colors_of_the_suite` (T7), d'après D9.
4. Attribut répété (`repeat_attributes.iwb`) : l'objet est lu, la première valeur l'emporte, jamais « fichier endommagé ». Test `repeated_attribute_first_wins` (T7), d'après D16 (un attribut illisible ne fait sauter que son objet).
5. ZIP écrit sous Windows ou à la main : `Content.xml` en capitales, `images\a.PNG` avec barre inverse, chemin `C:\x.png` : le contenu est trouvé, l'image résolue, le chemin absolu refusé. Tests `C13 : boardSources accepte Content.xml et les barres inverses` (T10), `C13 : image trouvée sans tenir compte de la casse` (T5), `C13 : keepBoardPath refuse les chemins qui sortent` (T3), d'après D3 et S5.

---

<a id="tache-t1"></a>
### Tâche T1 — Réglage `opt-level = "z"` des crates tierces de `formats`, tailles avant/après

**Objectif.** Le module `formats` passe d'environ 3 100 845 o à environ 2 903 814 o (mesure DA1) par 22 blocs
`opt-level = "z"` sur les crates tierces qui ne servent qu'à lui (D2) ; le module principal ne bouge pas d'un octet.
Cette marge reçoit le lecteur et l'écrivain (T7, T9).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1` (toutes les commandes commencent par `cd` dans ce dossier).

**Fichiers.**
- Modifier : `Cargo.toml` (racine, après le bloc `[profile.release]`, lignes 12-18).
- Modifier : `docs/essais/taille-wasm.md` (section ajoutée à la fin).

**Interfaces.**
- Consomme : rien.
- Produit : le réglage de profil lu par toutes les tâches qui mesurent `formats` (T2, T6 à T9, T11, T12).

**Test et commande bornée.** Le test est la mesure de taille (rouge : 3 100 845 o > 2 950 000 o avant le réglage ;
vert : ≤ 2 950 000 o après), plus `cargo test -p roomboard-formats` vert (export PDF, `.xlsx`, conteneur, pixels :
tests à garder verts de la carte d'impact).

**Contraintes (recopiées).**
- GC1 — TDD : mesure rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : principal 1 572 864 o, `formats` 3 145 728 o (`scripts/verifier.sh` lignes 59 et 72). Aucun troisième module Wasm.
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC8 — Ne pas toucher `crates/roomboard-core/**`, `crates/roomboard-wasm/**`, `zone.rs`, `fill`, `c8-pot-zones-navigateur.mjs`, `data-zone-*`, `docs/audits/`. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un, jamais `git add -A`, `.`, ni `commit -a`.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Travailler dans ce seul worktree.

**Interdits.** Toucher `opt-level` de `roomboard-core`, `roomboard-formats`, `sha2`, `zip`, `yrs` (ils restent en `s`) ;
toucher `lto`, `codegen-units`, les plafonds de `verifier.sh`.

**Terminé quand.** Le module `formats` mesuré ≤ 2 950 000 o ; le module principal mesuré = 1 371 293 o (valeur de
`origin/main` 41342b0) ; `cargo test -p roomboard-formats` vert ; `docs/essais/taille-wasm.md` porte la section C13 ;
un commit.

**Étapes.**

- [ ] **Étape 1 : mesurer avant (rouge).**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 \
 && rm -rf /tmp/c13-T1-avant && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T1-avant \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && wc -c < /tmp/c13-T1-avant/roomboard_formats_wasm_bg.wasm
```

Attendu : `3100845` (au-dessus du seuil de 2 950 000 : rouge).

- [ ] **Étape 2 : ajouter les 22 blocs dans `Cargo.toml`, juste après la ligne `codegen-units = 1`.**

```toml

# C13 (D2, DA1) : crates tierces propres au module `formats` compilées en `z` (taille). `roomboard-core`,
# `roomboard-formats`, `sha2`, `zip` et `yrs` restent en `s` ; le module principal est inchangé à l'octet. Mesures :
# docs/essais/taille-wasm.md, section C13. Retour arrière : retirer ces blocs.
[profile.release.package.krilla]
opt-level = "z"
[profile.release.package.pdf-writer]
opt-level = "z"
[profile.release.package.skrifa]
opt-level = "z"
[profile.release.package.read-fonts]
opt-level = "z"
[profile.release.package.write-fonts]
opt-level = "z"
[profile.release.package.font-types]
opt-level = "z"
[profile.release.package.subsetter]
opt-level = "z"
[profile.release.package.rustybuzz]
opt-level = "z"
[profile.release.package.ttf-parser]
opt-level = "z"
[profile.release.package.calamine]
opt-level = "z"
[profile.release.package.encoding_rs]
opt-level = "z"
[profile.release.package.quick-xml]
opt-level = "z"
[profile.release.package.zune-jpeg]
opt-level = "z"
[profile.release.package.png]
opt-level = "z"
[profile.release.package.gif]
opt-level = "z"
[profile.release.package.image-webp]
opt-level = "z"
[profile.release.package.zopfli]
opt-level = "z"
[profile.release.package.tiny-skia-path]
opt-level = "z"
[profile.release.package.kurbo]
opt-level = "z"
[profile.release.package.fdeflate]
opt-level = "z"
[profile.release.package.miniz_oxide]
opt-level = "z"
[profile.release.package.xmp-writer]
opt-level = "z"
```

Si `cargo` affiche `profile package spec ... did not match any packages` pour un nom, ne pas le retirer : le noter dans
le rapport (le cadrage l'a mesuré présent).

- [ ] **Étape 3 : mesurer après (vert), les deux modules.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 \
 && rm -rf /tmp/c13-T1-apres && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T1-apres \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && wc -c < /tmp/c13-T1-apres/roomboard_formats_wasm_bg.wasm \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 \
 && rm -rf /tmp/c13-T1-principal && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T1-principal \
    target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && wc -c < /tmp/c13-T1-principal/roomboard_wasm_bg.wasm
```

Attendu : première valeur ≤ 2 950 000 (cadrage : 2 903 814) ; seconde valeur `1371293`.

- [ ] **Étape 4 : tests natifs à garder verts.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats 2>&1 | grep -E "^test result|golden_stream_g1|FAILED|error\[" | tail -8
```

Attendu : `test result: ok.` avec N ≥ 30 passés, ligne `golden_stream_g1_parses_to_one_red_rect ... ok`, aucun `FAILED`.

- [ ] **Étape 5 : écrire la section C13 à la fin de `docs/essais/taille-wasm.md`** (remplacer `<formats après>` par la
  valeur lue à l'étape 3, et `<écart>` par 3 100 845 − cette valeur).

```markdown

## C13 lot 1 (tableaux `.iwb`, `.ubz` : lecteur SVG dans `formats`, réglage `z`, D2, DA1)

| mesure | module principal | module formats |
|---|---|---|
| avant C13 (`origin/main` 41342b0, sortie de `verifier.sh`) | 1 371 293 o | 3 100 845 o |
| après T1 (22 crates tierces de `formats` en `opt-level = "z"`, sans lecteur) | 1 371 293 o | <formats après> o |

T1 : `formats` −<écart> o, principal inchangé à l'octet (aucune des 22 crates n'entre dans le module principal).
Mesure : `cargo build --target wasm32-unknown-unknown --release` puis `wasm-bindgen --target web --remove-name-section`.
Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o). Coût de vitesse du réglage : T11
(`docs/essais/c13-fidelite-iwb.md`), accepté jusqu'à 15 % (HU1-4).
```

- [ ] **Étape 6 : vérifier le format et commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T1 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo fmt --all --check && git add Cargo.toml && git add docs/essais/taille-wasm.md \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "build: compile formats-only third-party crates at opt-level z (C13 D2)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Les trois tailles (formats avant, formats après, principal après), la sortie `test result`, et la ligne
`Réutilisation : écart — aucun module de la liste n'est concerné par cette tâche`.

<a id="tache-t2"></a>
### Tâche T2 — Contrat BoardList (Rust) : types, codage, flux témoin W1, signatures

**Objectif.** Poser le module `roomboard_formats::board` : la forme typée d'un tableau (`Page`, `Item`, `Span`), le
codage en flux plat (`encode`) et sa lecture contrôlée (`parse`), le flux témoin W1, et les signatures de `read_svg`,
`write_iwb`, `write_ubz_pages`, `ubz_metadata`, `read_qt_html` (corps d'attente) pour que T6, T7, T8, T9 travaillent en
parallèle sur des fichiers disjoints.

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T2`.

**Fichiers.**
- Modifier : `crates/roomboard-formats/Cargo.toml` (dépendance `quick-xml`).
- Modifier : `crates/roomboard-formats/src/lib.rs` (`pub mod board;`).
- Créer : `crates/roomboard-formats/src/board.rs`.
- Créer : `crates/roomboard-formats/src/board/read.rs` (signature d'attente ; corps écrit par T7).
- Créer : `crates/roomboard-formats/src/board/write.rs` (signatures d'attente ; corps écrits par T9).
- Créer : `crates/roomboard-formats/src/board/qt_html.rs` (type `QtText` et signature d'attente ; corps écrit par T8).

**Interfaces.**
- Consomme : rien.
- Produit (exact, utilisé par T6, T7, T8, T9, T12) :
  - `pub struct BoardList { pub ops: Vec<f32>, pub texts: Vec<String>, pub warnings: Vec<String> }`
  - `pub enum Dialect { Iwb, Ubz }` ; `Dialect::parse(&str) -> Option<Dialect>` (`"iwb"`, `"ubz"`)
  - `pub enum BoardError { Broken(String), TooBig, BadList(String) }` ; `Display` : « fichier endommagé : {m} »,
    « fichier de tableau trop gros (plus de 100 000 objets) », « liste de tableau invalide : {m} »
  - `pub type Rgb = [u8; 3]`, `pub type Mat = [f32; 6]`, `pub const IDENTITY: Mat`
  - `pub enum ShapeKind { Rect, Ellipse, Line, Arrow }`
  - `pub struct Span { pub text: String, pub bold: bool, pub italic: bool, pub underline: bool, pub size: Option<f32>, pub color: Option<Rgb>, pub font: Option<String> }` (`Default`)
  - `pub enum Item { Shape { kind, m, x0, y0, x1, y1, color, width, fill: Option<Rgb> }, Stroke { m, color, width, points: Vec<[f32; 3]> }, Text { m, x, y, w, h, size, color, spans: Vec<Span> }, Image { m, x, y, w, h, href: String }, Group(Vec<Item>) }`
  - `pub struct Page { pub background: Option<Rgb>, pub items: Vec<Item> }` (`Default`)
  - `pub fn encode(pages: &[Page]) -> BoardList` ; `pub fn parse(list: &BoardList) -> Result<Vec<Page>, BoardError>`
  - `pub fn compose(a: &Mat, b: &Mat) -> Mat` (applique `b` puis `a`, comme `composeMatrix` de `core/shapes.ts`) ; `pub fn apply(m: &Mat, x: f32, y: f32) -> (f32, f32)`
  - constantes `PAGE_WIDTH = 1920.0`, `PAGE_HEIGHT = 1080.0`, `MAX_PAGES = 500`, `MAX_OBJECTS = 100_000`, codes `OP_*`, drapeaux `FLAG_*`
  - `pub fn read_svg(xml: &[u8], dialect: Dialect, first_page: u32) -> Result<BoardList, BoardError>` (écart au cadrage : `first_page` numérote les avertissements des pages `.ubz`, lues une par une)
  - `pub fn write_iwb(list: &BoardList) -> Result<String, BoardError>` ; `pub fn write_ubz_pages(list: &BoardList) -> Result<Vec<String>, BoardError>` ; `pub fn ubz_metadata(pages: usize) -> String`
  - `pub struct QtText { pub spans: Vec<Span>, pub size: Option<f32>, pub color: Option<Rgb>, pub reduced: bool }` ; `pub fn read_qt_html(html: &str) -> QtText`
- Réutilise : `crates/roomboard-formats/src/pdf.rs:22` — patron `DisplayList { ops: Vec<f32>, texts: Vec<String> }` et lecteur à curseur de `pdf.rs:127-190` (mêmes contrôles : flux coupé, nombre non fini, entier borné).
- Réutilise : aucun module existant pour « Lecteur SVG commun » — nouveau module `board` (DA2), créé ici (`board`, `svg`, `iwb`, `ubz` cherchés par le cadrage : rien).
- Réutilise : `quick-xml` 0.42 (MIT, déjà au `Cargo.lock` par `calamine`) — ajouté ici aux dépendances de `roomboard-formats` (`default-features = false`), appelé par T7.

**Patron à ne pas reprendre.** Un `Doc` ou une commande du cœur dans `formats` (DAU1 l'interdit : la page traduit), ou
une sérialisation `serde`/JSON (aucune `serde` ajoutée, D6). Référence du bon patron : `crates/roomboard-formats/src/pdf.rs:22-24`
(flux plat) et `crates/roomboard-formats/src/pdf.rs:127-190` (curseur qui contrôle chaque nombre avant usage).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T2 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats board:: 2>&1 | grep -E "^test board::|^test result|FAILED|error\[" | tail -15
```

Motif de preuve : `test result: ok. N passed` avec N ≥ 6, lignes `test board::tests::golden_w1_parses_to_the_expected_pages ... ok`
et `test board::tests::encode_of_w1_pages_gives_w1_back ... ok`.

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : principal 1 572 864 o, `formats` 3 145 728 o (`scripts/verifier.sh` lignes 59 et 72). Aucun troisième module Wasm.
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC8 — Ne pas toucher `crates/roomboard-core/**`, `crates/roomboard-wasm/**`, `zone.rs`, `fill`, `c8-pot-zones-navigateur.mjs`, `data-zone-*`, `docs/audits/`. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve hors `quick-xml` déjà relevé (D22) ; aucune AGPL/GPL/LGPL ; OpenBoard lu, jamais copié.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Travailler dans ce seul worktree.

**Interdits.** Écrire le lecteur, l'écrivain ou le lecteur Qt (T7, T9, T8) ; changer la table des codes ou W1 (le
contrat est figé par ce plan, T5 code le même flux en TypeScript).

**Terminé quand.** Les 6 tests passent ; `cargo clippy -p roomboard-formats --all-targets -- -D warnings` propre ;
`cargo fmt --all --check` propre ; taille notée ; un commit.

**Étapes.**

- [ ] **Étape 1 : dépendance et module.** Dans `crates/roomboard-formats/Cargo.toml`, section `[dependencies]`, ajouter
  après la ligne `krilla = …` :

```toml
quick-xml = { version = "0.42", default-features = false }
```

Dans `crates/roomboard-formats/src/lib.rs`, remplacer le commentaire de tête et la liste des modules par :

```rust
//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets ; première
//! feuille d'un classeur `.xlsx` en valeurs (C10b, U35) ; pages vectorielles en PDF par `krilla` (C12, PF22) ;
//! calculs de pixels des images (C5, U30) ; tableaux interactifs `.iwb` et `.ubz` en flux BoardList (C13, DA2). Rust
//! pur, testé en natif ; servis par le second module Wasm.
pub mod board;
pub mod container;
pub mod pdf;
pub mod pixels;
pub mod sheet;
```

- [ ] **Étape 2 : écrire les tests (rouges) à la fin de `board.rs`, puis le fichier entier.** Créer
  `crates/roomboard-formats/src/board.rs` :

```rust
//! Tableaux interactifs (C13, DA2) : flux plat « BoardList » entre la page et le module `formats`, dans les deux sens
//! (lecture d'un `.iwb` ou d'un `.ubz`, écriture d'une copie). Même patron que `pdf::DisplayList` (C12) : un flux de
//! nombres et un tableau de textes ; le flux témoin `W1` est joué ici et par `apps/web/src/app/board-io.test.ts`
//! (parité du codage, D6). Aucun `Doc` ici (DAU1) : la page traduit la liste en commandes du cœur. Table des codes :
//! `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
use std::collections::HashMap;
use std::fmt;

pub mod qt_html;
mod read;
mod write;

pub use read::read_svg;
pub use write::{ubz_metadata, write_iwb, write_ubz_pages};

pub const OP_PAGE: f32 = 1.0;
pub const OP_BACKGROUND: f32 = 2.0;
pub const OP_SHAPE: f32 = 3.0;
pub const OP_STROKE: f32 = 4.0;
pub const OP_TEXT: f32 = 5.0;
pub const OP_IMAGE: f32 = 6.0;
pub const OP_GROUP_BEGIN: f32 = 7.0;
pub const OP_GROUP_END: f32 = 8.0;
/// Drapeaux d'un segment de texte.
pub const FLAG_BOLD: u32 = 1;
pub const FLAG_ITALIC: u32 = 2;
pub const FLAG_UNDERLINE: u32 = 4;
/// Page RoomBoard : 1 920 de large (`PAGE_WIDTH` de `core/api.ts`), hauteur infinie, 1 080 par défaut (D8).
pub const PAGE_WIDTH: f32 = 1920.0;
pub const PAGE_HEIGHT: f32 = 1080.0;
/// Bornes (D16, U26) : pages ouvertes au plus (comme le PDF), objets par fichier au plus (au-delà : refus).
pub const MAX_PAGES: usize = 500;
pub const MAX_OBJECTS: usize = 100_000;
const MAX_POINTS: u32 = 1_000_000;
const MAX_SPANS: u32 = 10_000;
const MAX_INDEX: u32 = 16_777_216;

pub type Rgb = [u8; 3];
/// Matrice SVG `[a, b, c, d, e, f]` : x' = a·x + c·y + e, y' = b·x + d·y + f (ordre de `Matrix` de `core/api.ts`).
pub type Mat = [f32; 6];
pub const IDENTITY: Mat = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

/// Flux échangé avec la page ; `warnings` : avertissements en français de la lecture (vide à l'écriture).
#[derive(Debug, Clone, PartialEq, Default)]
pub struct BoardList {
    pub ops: Vec<f32>,
    pub texts: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dialect {
    /// `content.xml` d'un `.iwb` ZIP, ou `.iwb` en SVG brut (IWB/CFF).
    Iwb,
    /// Une page `pageNNN.svg` d'un `.ubz` (OpenBoard).
    Ubz,
}

impl Dialect {
    pub fn parse(s: &str) -> Option<Dialect> {
        match s {
            "iwb" => Some(Dialect::Iwb),
            "ubz" => Some(Dialect::Ubz),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum BoardError {
    /// XML mal formé, cadre invalide, racine inattendue (refus du fichier).
    Broken(String),
    /// Plus de `MAX_OBJECTS` objets dans un fichier.
    TooBig,
    /// Flux reçu de la page invalide (écriture).
    BadList(String),
}

impl fmt::Display for BoardError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BoardError::Broken(m) => write!(f, "fichier endommagé : {m}"),
            BoardError::TooBig => write!(f, "fichier de tableau trop gros (plus de 100 000 objets)"),
            BoardError::BadList(m) => write!(f, "liste de tableau invalide : {m}"),
        }
    }
}

impl std::error::Error for BoardError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShapeKind {
    Rect,
    Ellipse,
    Line,
    Arrow,
}

impl ShapeKind {
    fn code(self) -> f32 {
        match self {
            ShapeKind::Rect => 0.0,
            ShapeKind::Ellipse => 1.0,
            ShapeKind::Line => 2.0,
            ShapeKind::Arrow => 3.0,
        }
    }
    fn of(code: u32) -> Option<ShapeKind> {
        match code {
            0 => Some(ShapeKind::Rect),
            1 => Some(ShapeKind::Ellipse),
            2 => Some(ShapeKind::Line),
            3 => Some(ShapeKind::Arrow),
            _ => None,
        }
    }
}

/// Segment de texte ; `None` : la valeur de l'élément (taille, couleur) ou la police du socle.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct Span {
    pub text: String,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub font: Option<String>,
}

/// Objet d'une page, en coordonnées locales placées par `m`.
#[derive(Debug, Clone, PartialEq)]
pub enum Item {
    Shape { kind: ShapeKind, m: Mat, x0: f32, y0: f32, x1: f32, y1: f32, color: Rgb, width: f32, fill: Option<Rgb> },
    Stroke { m: Mat, color: Rgb, width: f32, points: Vec<[f32; 3]> },
    Text { m: Mat, x: f32, y: f32, w: f32, h: f32, size: f32, color: Rgb, spans: Vec<Span> },
    Image { m: Mat, x: f32, y: f32, w: f32, h: f32, href: String },
    Group(Vec<Item>),
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Page {
    pub background: Option<Rgb>,
    pub items: Vec<Item>,
}

/// `a ∘ b` : applique `b` puis `a` (`composeMatrix` de `core/shapes.ts`).
pub fn compose(a: &Mat, b: &Mat) -> Mat {
    [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
    ]
}

pub fn apply(m: &Mat, x: f32, y: f32) -> (f32, f32) {
    (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])
}

struct Encoder {
    ops: Vec<f32>,
    texts: Vec<String>,
    index: HashMap<String, usize>,
}

impl Encoder {
    /// Texte interné à sa première apparition (même règle que `encodeBoardList` de `board-io.ts`).
    fn text(&mut self, s: &str) -> f32 {
        if let Some(&k) = self.index.get(s) {
            return k as f32;
        }
        let k = self.texts.len();
        self.texts.push(s.to_string());
        self.index.insert(s.to_string(), k);
        k as f32
    }
    fn rgb(&mut self, c: Rgb) {
        self.ops.extend(c.iter().map(|&v| f32::from(v)));
    }
    fn item(&mut self, it: &Item) {
        match it {
            Item::Shape { kind, m, x0, y0, x1, y1, color, width, fill } => {
                self.ops.push(OP_SHAPE);
                self.ops.push(kind.code());
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x0, *y0, *x1, *y1]);
                self.rgb(*color);
                self.ops.push(*width);
                match fill {
                    Some(f) => {
                        self.ops.push(1.0);
                        self.rgb(*f);
                    }
                    None => self.ops.extend_from_slice(&[0.0, 0.0, 0.0, 0.0]),
                }
            }
            Item::Stroke { m, color, width, points } => {
                self.ops.push(OP_STROKE);
                self.ops.extend_from_slice(m);
                self.rgb(*color);
                self.ops.push(*width);
                self.ops.push(points.len() as f32);
                for p in points {
                    self.ops.extend_from_slice(p);
                }
            }
            Item::Text { m, x, y, w, h, size, color, spans } => {
                self.ops.push(OP_TEXT);
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x, *y, *w, *h, *size]);
                self.rgb(*color);
                self.ops.push(spans.len() as f32);
                for s in spans {
                    let t = self.text(&s.text);
                    let flags = u32::from(s.bold) * FLAG_BOLD + u32::from(s.italic) * FLAG_ITALIC + u32::from(s.underline) * FLAG_UNDERLINE;
                    self.ops.extend_from_slice(&[t, flags as f32, s.size.unwrap_or(0.0)]);
                    match s.color {
                        Some(c) => self.rgb(c),
                        None => self.ops.extend_from_slice(&[-1.0, -1.0, -1.0]),
                    }
                    let f = match &s.font {
                        Some(f) => self.text(f),
                        None => -1.0,
                    };
                    self.ops.push(f);
                }
            }
            Item::Image { m, x, y, w, h, href } => {
                self.ops.push(OP_IMAGE);
                self.ops.extend_from_slice(m);
                self.ops.extend_from_slice(&[*x, *y, *w, *h]);
                let k = self.text(href);
                self.ops.push(k);
            }
            Item::Group(items) => {
                self.ops.push(OP_GROUP_BEGIN);
                for i in items {
                    self.item(i);
                }
                self.ops.push(OP_GROUP_END);
            }
        }
    }
}

/// Flux d'un tableau (lecture d'un fichier) ; `warnings` vide, rempli par le lecteur.
pub fn encode(pages: &[Page]) -> BoardList {
    let mut e = Encoder { ops: Vec::new(), texts: Vec::new(), index: HashMap::new() };
    for p in pages {
        e.ops.push(OP_PAGE);
        if let Some(bg) = p.background {
            e.ops.push(OP_BACKGROUND);
            e.rgb(bg);
        }
        for it in &p.items {
            e.item(it);
        }
    }
    BoardList { ops: e.ops, texts: e.texts, warnings: Vec::new() }
}

fn bad(m: String) -> BoardError {
    BoardError::BadList(m)
}

struct Cursor<'a> {
    v: &'a [f32],
    i: usize,
    texts: &'a [String],
}

impl Cursor<'_> {
    fn done(&self) -> bool {
        self.i >= self.v.len()
    }
    fn num(&mut self) -> Result<f32, BoardError> {
        let x = *self.v.get(self.i).ok_or_else(|| bad(format!("flux coupé à {}", self.i)))?;
        self.i += 1;
        if x.is_finite() {
            Ok(x)
        } else {
            Err(bad(format!("nombre non fini à {}", self.i - 1)))
        }
    }
    fn int(&mut self, max: u32) -> Result<u32, BoardError> {
        let x = self.num()?;
        if x < 0.0 || x.fract() != 0.0 || x > max as f32 {
            return Err(bad(format!("entier de 0 à {max} attendu à {}", self.i - 1)));
        }
        Ok(x as u32)
    }
    fn mat(&mut self) -> Result<Mat, BoardError> {
        let mut m = [0.0; 6];
        for v in &mut m {
            *v = self.num()?;
        }
        Ok(m)
    }
    fn rgb(&mut self) -> Result<Rgb, BoardError> {
        Ok([self.int(255)? as u8, self.int(255)? as u8, self.int(255)? as u8])
    }
    /// −1, −1, −1 : absente.
    fn opt_rgb(&mut self) -> Result<Option<Rgb>, BoardError> {
        if self.v.get(self.i).is_some_and(|&r| r < 0.0) {
            self.num()?;
            self.num()?;
            self.num()?;
            return Ok(None);
        }
        Ok(Some(self.rgb()?))
    }
    fn text(&mut self) -> Result<String, BoardError> {
        let k = self.int(MAX_INDEX)? as usize;
        self.texts.get(k).cloned().ok_or_else(|| bad(format!("texte {k} absent")))
    }
    /// −1 : absent.
    fn opt_text(&mut self) -> Result<Option<String>, BoardError> {
        if self.v.get(self.i).is_some_and(|&k| k < 0.0) {
            self.num()?;
            return Ok(None);
        }
        Ok(Some(self.text()?))
    }
}

fn shape(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let code = c.int(3)?;
    let kind = ShapeKind::of(code).ok_or_else(|| bad(format!("forme inconnue {code}")))?;
    let m = c.mat()?;
    let (x0, y0, x1, y1) = (c.num()?, c.num()?, c.num()?, c.num()?);
    let color = c.rgb()?;
    let width = c.num()?;
    let fill = if c.int(1)? == 1 {
        Some(c.rgb()?)
    } else {
        c.num()?;
        c.num()?;
        c.num()?;
        None
    };
    Ok(Item::Shape { kind, m, x0, y0, x1, y1, color, width, fill })
}

fn stroke(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let color = c.rgb()?;
    let width = c.num()?;
    let n = c.int(MAX_POINTS)?;
    let mut points = Vec::with_capacity(n as usize);
    for _ in 0..n {
        points.push([c.num()?, c.num()?, c.num()?]);
    }
    Ok(Item::Stroke { m, color, width, points })
}

fn text(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let (x, y, w, h, size) = (c.num()?, c.num()?, c.num()?, c.num()?, c.num()?);
    let color = c.rgb()?;
    let n = c.int(MAX_SPANS)?;
    let mut spans = Vec::with_capacity(n as usize);
    for _ in 0..n {
        let text = c.text()?;
        let flags = c.int(7)?;
        let z = c.num()?;
        if z < 0.0 {
            return Err(bad(format!("taille de segment négative à {}", c.i - 1)));
        }
        let color = c.opt_rgb()?;
        let font = c.opt_text()?;
        spans.push(Span {
            text,
            bold: flags & FLAG_BOLD != 0,
            italic: flags & FLAG_ITALIC != 0,
            underline: flags & FLAG_UNDERLINE != 0,
            size: (z > 0.0).then_some(z),
            color,
            font,
        });
    }
    Ok(Item::Text { m, x, y, w, h, size, color, spans })
}

fn image(c: &mut Cursor<'_>) -> Result<Item, BoardError> {
    let m = c.mat()?;
    let (x, y, w, h) = (c.num()?, c.num()?, c.num()?, c.num()?);
    let href = c.text()?;
    Ok(Item::Image { m, x, y, w, h, href })
}

fn push(pages: &mut [Page], stack: &mut [Vec<Item>], item: Item) -> Result<(), BoardError> {
    if let Some(top) = stack.last_mut() {
        top.push(item);
        return Ok(());
    }
    pages.last_mut().ok_or_else(|| bad("objet avant la première page".to_string()))?.items.push(item);
    Ok(())
}

/// Flux contrôlé en entier avant tout usage (écriture d'une copie) ; tout défaut : `BadList`.
pub fn parse(list: &BoardList) -> Result<Vec<Page>, BoardError> {
    let mut c = Cursor { v: &list.ops, i: 0, texts: &list.texts };
    let mut pages: Vec<Page> = Vec::new();
    let mut stack: Vec<Vec<Item>> = Vec::new();
    while !c.done() {
        let at = c.i;
        match c.int(8)? {
            1 => {
                if !stack.is_empty() {
                    return Err(bad(format!("groupe ouvert à la page suivante ({at})")));
                }
                pages.push(Page::default());
            }
            2 => {
                let bg = c.rgb()?;
                pages.last_mut().ok_or_else(|| bad("fond avant la première page".to_string()))?.background = Some(bg);
            }
            3 => {
                let it = shape(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            4 => {
                let it = stroke(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            5 => {
                let it = text(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            6 => {
                let it = image(&mut c)?;
                push(&mut pages, &mut stack, it)?;
            }
            7 => {
                if pages.is_empty() {
                    return Err(bad("groupe avant la première page".to_string()));
                }
                stack.push(Vec::new());
            }
            8 => {
                let items = stack.pop().ok_or_else(|| bad(format!("fin de groupe sans début ({at})")))?;
                push(&mut pages, &mut stack, Item::Group(items))?;
            }
            code => return Err(bad(format!("code inconnu {code} à {at}"))),
        }
    }
    if !stack.is_empty() {
        return Err(bad("groupe non fermé".to_string()));
    }
    Ok(pages)
}

/// Flux témoin W1, partagé par les tests de ce module, de `read.rs`, de `write.rs` (et recopié dans `board-io.test.ts`).
#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;

    pub const W1_OPS: &[f32] = &[
        1.0, 2.0, 0.0, 0.0, 0.0, //
        3.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 10.0, 20.0, 110.0, 70.0, 255.0, 0.0, 0.0, 4.0, 1.0, 0.0, 0.0, 255.0, //
        4.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 128.0, 0.0, 3.0, 2.0, 0.0, 0.0, 1.0, 10.0, 10.0, 0.5, //
        5.0, 1.0, 0.0, 0.0, 1.0, 100.0, 200.0, 0.0, 0.0, 300.0, 50.0, 24.0, 0.0, 0.0, 0.0, 2.0, 0.0, 1.0, 0.0, -1.0, -1.0,
        -1.0, -1.0, 1.0, 0.0, 32.0, 255.0, 0.0, 0.0, 2.0, //
        6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 5.0, 5.0, 64.0, 32.0, 3.0, //
        7.0, //
        3.0, 2.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 50.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, //
        3.0, 3.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 10.0, 50.0, 10.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 0.0, //
        8.0, //
        1.0,
    ];

    pub fn w1_texts() -> Vec<String> {
        ["Bonjour ", "monde", "Liberation Sans", "images/a.png"].iter().map(|s| s.to_string()).collect()
    }

    pub fn w1_list() -> BoardList {
        BoardList { ops: W1_OPS.to_vec(), texts: w1_texts(), warnings: Vec::new() }
    }

    pub fn w1_pages() -> Vec<Page> {
        let black = [0, 0, 0];
        vec![
            Page {
                background: Some(black),
                items: vec![
                    Item::Shape { kind: ShapeKind::Rect, m: IDENTITY, x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0, color: [255, 0, 0], width: 4.0, fill: Some([0, 0, 255]) },
                    Item::Stroke { m: IDENTITY, color: [0, 128, 0], width: 3.0, points: vec![[0.0, 0.0, 1.0], [10.0, 10.0, 0.5]] },
                    Item::Text {
                        m: [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
                        x: 0.0,
                        y: 0.0,
                        w: 300.0,
                        h: 50.0,
                        size: 24.0,
                        color: black,
                        spans: vec![
                            Span { text: "Bonjour ".to_string(), bold: true, ..Span::default() },
                            Span { text: "monde".to_string(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".to_string()), ..Span::default() },
                        ],
                    },
                    Item::Image { m: IDENTITY, x: 5.0, y: 5.0, w: 64.0, h: 32.0, href: "images/a.png".to_string() },
                    Item::Group(vec![
                        Item::Shape { kind: ShapeKind::Line, m: IDENTITY, x0: 0.0, y0: 0.0, x1: 50.0, y1: 0.0, color: black, width: 2.0, fill: None },
                        Item::Shape { kind: ShapeKind::Arrow, m: IDENTITY, x0: 0.0, y0: 10.0, x1: 50.0, y1: 10.0, color: black, width: 2.0, fill: None },
                    ]),
                ],
            },
            Page::default(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;

    /// Flux témoin W1, joué aussi par `board-io.test.ts` (T5) : parité du codage (D6).
    #[test]
    fn golden_w1_parses_to_the_expected_pages() {
        assert_eq!(parse(&w1_list()).expect("W1"), w1_pages());
    }

    #[test]
    fn encode_of_w1_pages_gives_w1_back() {
        let l = encode(&w1_pages());
        assert_eq!(l.ops, W1_OPS.to_vec());
        assert_eq!(l.texts, w1_texts());
        assert!(l.warnings.is_empty());
    }

    #[test]
    fn bad_streams_are_bad_list() {
        let texts = w1_texts();
        for ops in [
            &[9.0][..],
            &[3.0, 0.0][..],
            &[1.0, 7.0][..],
            &[1.0, 8.0][..],
            &[1.0, 2.0, 256.0, 0.0, 0.0][..],
            &[1.0, 6.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 9.0][..],
            &[1.0, 4.0, 1.0, 0.0, 0.0, 1.0, 0.0, f32::NAN][..],
            &[1.0, 3.0, 7.0][..],
        ] {
            let l = BoardList { ops: ops.to_vec(), texts: texts.clone(), warnings: Vec::new() };
            assert!(matches!(parse(&l), Err(BoardError::BadList(_))), "{ops:?}");
        }
    }

    #[test]
    fn dialect_parse_knows_iwb_and_ubz_only() {
        assert_eq!(Dialect::parse("iwb"), Some(Dialect::Iwb));
        assert_eq!(Dialect::parse("ubz"), Some(Dialect::Ubz));
        assert_eq!(Dialect::parse("pdf"), None);
    }

    #[test]
    fn errors_display_in_french() {
        assert_eq!(BoardError::Broken("cadre de page invalide".into()).to_string(), "fichier endommagé : cadre de page invalide");
        assert_eq!(BoardError::TooBig.to_string(), "fichier de tableau trop gros (plus de 100 000 objets)");
        assert_eq!(BoardError::BadList("x".into()).to_string(), "liste de tableau invalide : x");
    }

    #[test]
    fn compose_applies_right_then_left() {
        let scale = [2.0, 0.0, 0.0, 2.0, 0.0, 0.0];
        let shift = [1.0, 0.0, 0.0, 1.0, 10.0, 5.0];
        assert_eq!(compose(&scale, &shift), [2.0, 0.0, 0.0, 2.0, 20.0, 10.0]);
        assert_eq!(apply(&compose(&scale, &shift), 1.0, 1.0), (22.0, 12.0));
    }
}
```

`rustfmt` reformatera les longues lignes (`cargo fmt --all`) : lancer `cargo fmt --all` avant le commit.

- [ ] **Étape 3 : les trois fichiers d'attente.** `crates/roomboard-formats/src/board/read.rs` :

```rust
//! Lecteur SVG commun (C13, D1, D8 à D16) : corps écrit par la tâche T7 du plan. Ce fichier ne porte que la signature,
//! pour que la liaison (T6) et l'écrivain (T9) compilent pendant que T7 travaille.
use super::{BoardError, BoardList, Dialect};

/// Lit un `content.xml` IWB, un `.iwb` en SVG brut ou une page `.ubz` ; `first_page` numérote les avertissements.
pub fn read_svg(_xml: &[u8], _dialect: Dialect, _first_page: u32) -> Result<BoardList, BoardError> {
    Err(BoardError::Broken("lecteur non branché".to_string()))
}
```

`crates/roomboard-formats/src/board/write.rs` :

```rust
//! Écrivain des copies `.iwb` et `.ubz` (C13, D17 à D19) : corps écrits par la tâche T9 du plan.
use super::{BoardError, BoardList};

pub fn write_iwb(_list: &BoardList) -> Result<String, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn write_ubz_pages(_list: &BoardList) -> Result<Vec<String>, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn ubz_metadata(_pages: usize) -> String {
    String::new()
}
```

`crates/roomboard-formats/src/board/qt_html.rs` :

```rust
//! Texte d'OpenBoard (C13, D11) : HTML de Qt réduit en segments ; corps écrit par la tâche T8 du plan.
use super::{Rgb, Span};

/// Texte lu : segments, taille et couleur du `body` (celles de l'élément), `reduced` si une mise en forme a été perdue.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct QtText {
    pub spans: Vec<Span>,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub reduced: bool,
}

pub fn read_qt_html(_html: &str) -> QtText {
    QtText::default()
}
```

- [ ] **Étape 4 : lancer les tests (verts).** Commande de la rubrique « Test et commande bornée ». Attendu : 6 passés.

- [ ] **Étape 5 : format, clippy, taille.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T2 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-formats --all-targets -- -D warnings 2>&1 | tail -3 \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf /tmp/c13-T2-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T2-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c13-T2-formats/roomboard_formats_wasm_bg.wasm
```

Attendu : clippy sans avertissement ; taille ≤ 3 145 728 (le module n'appelle pas encore `board`, la taille bouge peu).

- [ ] **Étape 6 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T2 && git add crates/roomboard-formats/Cargo.toml \
 && git add crates/roomboard-formats/src/lib.rs && git add crates/roomboard-formats/src/board.rs \
 && git add crates/roomboard-formats/src/board/read.rs && git add crates/roomboard-formats/src/board/write.rs \
 && git add crates/roomboard-formats/src/board/qt_html.rs && git add Cargo.lock \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(formats): BoardList contract for interactive whiteboards (C13 DA2)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add Cargo.lock` seulement s'il a changé : `quick-xml` y est déjà, le lien de `roomboard-formats` vers lui s'ajoute.)

**Rapport.** Sortie `test result`, sortie clippy, taille `formats`, et les lignes :
`Réutilisation : appelé crates/roomboard-formats/src/pdf.rs (patron DisplayList et curseur)`,
`Réutilisation : appelé quick-xml (dépendance ajoutée, usage en T7)`,
`Réutilisation : écart — lecteur SVG commun : nouveau module board, aucun existant`.

<a id="tache-t3"></a>
### Tâche T3 — Worker ZIP : mode `board` et filtre `keepBoardPath`

**Objectif.** Le Worker ZIP existant lit un `.iwb` ZIP ou un `.ubz` dans un nouveau mode `board` : seules les entrées
`content.xml`, `page<N>.svg` et les images (PNG, JPEG, GIF, WebP, BMP, SVG) sont décompressées ; chemins absolus,
`..`, `__MACOSX` et dossiers refusés ; vidéos, sons, Flash jamais décompressés (le lecteur les compte depuis le XML,
D15). Bornes réutilisées : 1 000 entrées, 256 Mio, entrée stockée incohérente refusée (D3, S5).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T3`.

**Fichiers.**
- Modifier : `apps/web/src/platform/zip-worker.ts` (après `keepPackPath`, ligne 25 ; interface `WorkerMessage`, ligne 95 ; branchement, ligne 116).
- Modifier : `apps/web/src/platform/zip-read.ts` (`createZipReader`, lignes 43-52).
- Tests : `apps/web/src/platform/zip-worker.test.ts`, `apps/web/src/platform/zip-read.test.ts`.

**Interfaces.**
- Consomme : `extensionOf(name: string): string` de `apps/web/src/platform/model3d-import.ts:58` ; `unzipEntries(data, keep, limits?, normalize?)` de `zip-worker.ts:42`.
- Produit :
  - `export function keepBoardPath(name: string): boolean` dans `zip-worker.ts`
  - `export const BOARD_ZIP_EXTENSIONS: readonly string[]` = `["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]`
  - message `{ op: "unzip", mode: "board", bytes }` accepté par le Worker
  - `createZipReader(spawn, timeoutMs?, mode?: "model3d" | "pack" | "board")` dans `zip-read.ts` (T12 l'appelle avec `"board"`)
- Réutilise : `apps/web/src/platform/zip-worker.ts:38` et `apps/web/src/platform/zip-read.ts:43` — `unzipEntries(data, keepBoardPath)` et `createZipReader(spawn, timeout, "board")` (étendus ; bornes `ZIP_MAX_ENTRIES`, `ZIP_MAX_BYTES`, `ZIP_MALFORMED_MESSAGE` inchangées).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T3 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 pnpm exec vitest run src/platform/zip-worker.test.ts src/platform/zip-read.test.ts 2>&1 | tail -8
```

Motif : `Tests  N passed` (N = anciens + 4 au moins), aucun `FAIL` ; `pnpm exec vitest run src/platform/zip-worker.test.ts -t "C13" 2>&1 | grep -c "✓"` ≥ 3.
Tests à garder verts (carte d'impact, effet de bord « Worker ZIP : un mode de plus ») : tous les tests existants de
`zip-worker.test.ts` et `zip-read.test.ts` (modes `model3d` et `pack`).

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Sécurité : aucun chemin ZIP qui sort (`../`, absolu), bornes U26 (1 000 entrées, 256 Mio) ; un test par cas.
- GC7 — Fichiers d'exemple de `~/telechargements-roomboard/` : jamais lus ni copiés ici ; les ZIP de test se fabriquent avec `fflate`.
- GC9 — Aucune dépendance neuve.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` d'abord.

**Interdits.** Changer les modes `model3d` et `pack`, les bornes, `normalizePath` ; décompresser une vidéo ou un son.

**Terminé quand.** Les tests neufs passent, les anciens restent verts, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Ajouter à `apps/web/src/platform/zip-worker.test.ts` (import : ajouter
  `keepBoardPath` à la ligne `import { keepPackPath, unzipEntries, zipStored } from "./zip-worker";`, et
  `ZIP_MALFORMED_MESSAGE` n'est pas nécessaire) :

```ts
describe("C13 : Worker ZIP des tableaux (mode board, D3)", () => {
  it("C13 : keepBoardPath garde content.xml, pageN.svg et les images", () => {
    for (const ok of ["content.xml", "Content.XML", "page001.svg", "page12.svg", "images/a.png", "images/b.JPG", "objects/c.jpeg", "d.gif", "e.webp", "f.bmp", "g.svg"]) {
      expect(keepBoardPath(ok), ok).toBe(true);
    }
  });

  it("C13 : keepBoardPath refuse les chemins qui sortent, __MACOSX, les dossiers, médias et autres", () => {
    for (const no of ["../evil.png", "images/../../evil.png", "/abs.png", "\\abs.png", "C:/x.png", "C:\\x.png", "__MACOSX/._a.png", "images/", "videos/film.mpg", "audios/son.mp3", "flash/a.swf", "images/a.emf", "metadata.rdf", "widgets/w.wgt/index.html", ""]) {
      expect(keepBoardPath(no), no).toBe(false);
    }
  });

  it("C13 : unzipEntries(keepBoardPath) ne rend ni ../evil.png ni /abs.png ni la vidéo (S5)", () => {
    const zip = zipSync({
      "content.xml": enc("<iwb/>"),
      "images/a.png": enc("png"),
      "../evil.png": enc("evil"),
      "/abs.png": enc("abs"),
      "videos/film.mpg": enc("mpg"),
    });
    expect(unzipEntries(zip, keepBoardPath).map((e) => e.path).sort()).toEqual(["content.xml", "images/a.png"]);
  });

  it("C13 : plus de 1 000 entrées : refus « ZIP trop gros » (U26)", () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 1001; i++) files[`images/i${i}.png`] = enc("x");
    expect(() => unzipEntries(zipSync(files), keepBoardPath)).toThrow(ZIP_TOO_BIG_MESSAGE);
  });
});
```

Ajouter à `apps/web/src/platform/zip-read.test.ts`, à la suite du test « C4 : createZipReader en mode pack… » :

```ts
  it("C13 : createZipReader en mode board envoie { op: \"unzip\", mode: \"board\" }", async () => {
    const posted: unknown[] = [];
    const read = createZipReader(() => fakeWorker((m) => { posted.push(m); return { entries: [{ path: "content.xml", bytes: new Uint8Array([60]) }] }; }), 1000, "board");
    const got = await read(new Blob([new Uint8Array([1])]));
    expect(posted[0]).toMatchObject({ op: "unzip", mode: "board" });
    expect(got.map((e) => e.path)).toEqual(["content.xml"]);
    expect(got[0]!.blob).toBeInstanceOf(Blob);
  });
```

Lancer la commande bornée : attendu `FAIL` (`keepBoardPath` absent ; `"board"` refusé par le type).

- [ ] **Étape 2 : `keepBoardPath` dans `zip-worker.ts`.** Ajouter `extensionOf` à l'import de `./model3d-import`, puis
  après `keepPackPath` :

```ts
/** C13 (D3, D12) : images qu'un tableau `.iwb` ou `.ubz` peut citer ; tout autre fichier n'est jamais décompressé. */
export const BOARD_ZIP_EXTENSIONS: readonly string[] = Object.freeze(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

/** C13 (D3) : `content.xml` (IWB), `page<N>.svg` (OpenBoard) et images ; chemin absolu, lettre de lecteur, `..`,
 *  `__MACOSX` et dossier refusés. Vidéos, sons, Flash et widgets ne sont pas décompressés : le lecteur les compte
 *  depuis le XML pour l'avertissement (D15). */
export function keepBoardPath(name: string): boolean {
  if (name === "" || name.endsWith("/") || name.endsWith("\\") || name.startsWith("/") || name.startsWith("\\") || /^[A-Za-z]:/.test(name)) return false;
  const segs = name.replace(/\\/g, "/").split("/");
  if (segs.includes("..") || segs[0] === "__MACOSX") return false;
  const lower = name.toLowerCase();
  if (lower === "content.xml" || /^page\d+\.svg$/.test(lower)) return true;
  return BOARD_ZIP_EXTENSIONS.includes(extensionOf(name));
}
```

- [ ] **Étape 3 : le mode dans le Worker.** Dans `zip-worker.ts`, changer le type du message et le branchement :

```ts
/** `{ bytes }` seul : lecture 3D (inchangée) ; `{ op: "unzip", mode: "pack" | "board", bytes }` ; `{ op: "zip", files }`. */
interface WorkerMessage {
  readonly op?: "unzip" | "zip";
  readonly mode?: "model3d" | "pack" | "board";
  readonly bytes?: Uint8Array;
  readonly files?: readonly ZipFile[];
}
```

et remplacer la ligne `const entries = d.mode === "pack" ? … : unzipModelEntries(data);` par :

```ts
      const entries =
        d.mode === "pack" ? unzipEntries(data, keepPackPath) : d.mode === "board" ? unzipEntries(data, keepBoardPath) : unzipModelEntries(data);
```

Compléter le commentaire de tête du fichier par la ligne :
` * C13 : tableaux `.iwb` et `.ubz` (lecture `mode: "board"`, `keepBoardPath`), mêmes bornes, chemins rendus tels quels.`

- [ ] **Étape 4 : le mode dans `zip-read.ts`.** Remplacer la signature de `createZipReader` :

```ts
/** Un Worker neuf par ZIP (`spawn`), le contenu transféré, arrêté après la réponse ou au bout de `timeoutMs`.
 *  `mode: "pack"` (C4) et `mode: "board"` (C13) gardent les chemins tels quels ; le message 3D reste `{ bytes }` seul. */
export function createZipReader(
  spawn: () => WorkerLike,
  timeoutMs = ZIP_WORKER_TIMEOUT_MS,
  mode: "model3d" | "pack" | "board" = "model3d",
): (blob: Blob) => Promise<ZipEntry[]> {
```

(le corps ne change pas : `mode === "model3d" ? { bytes } : { op: "unzip", mode, bytes }`).

- [ ] **Étape 5 : tests verts** (commande bornée) puis typage :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T3 && cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/ \
 && cd apps/web && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5
```

Attendu : aucune erreur. Les dossiers copiés sont ignorés par git : ne pas les ajouter.

- [ ] **Étape 6 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T3 && git add apps/web/src/platform/zip-worker.ts \
 && git add apps/web/src/platform/zip-worker.test.ts && git add apps/web/src/platform/zip-read.ts \
 && git add apps/web/src/platform/zip-read.test.ts \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(web): board mode of the ZIP worker with keepBoardPath (C13 D3)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sortie vitest (N), sortie `tsc`, ligne `Réutilisation : appelé apps/web/src/platform/zip-worker.ts (unzipEntries) et zip-read.ts (createZipReader, mode board)`.

<a id="tache-t4"></a>
### Tâche T4 — Entrées et sorties de fichiers : détection `.iwb`/`.ubz`, types, actions de barre

**Objectif.** Le registre `importFiles` reconnaît un `.iwb` (en-tête ZIP, ou en-tête XML `<?xml`/`<iwb`, BOM toléré)
et un `.ubz` (en-tête ZIP) et les passe à `openBoard` (D4, D5) ; « Importer » les propose ; deux types de fichiers
`IWB_TYPE`, `UBZ_TYPE` et deux actions de barre `export-iwb`, `export-ubz` existent (D17). Le câblage réel (amorce,
`App.tsx`) est fait par T12, l'ouverture par T10.

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T4`.

**Fichiers.**
- Modifier : `apps/web/src/platform/files.ts` (après `PDF_MIME`, ligne 69 ; `IMPORT_EXTENSIONS`, lignes 77-86).
- Modifier : `apps/web/src/platform/import.ts` (`ImportDeps`, lignes 56-63 ; gestionnaires après `pdfHandler`, ligne 268 ; registre, lignes 283-298).
- Modifier : `apps/web/src/platform/typed-files.ts` (après `PDF_TYPE`, ligne 40).
- Modifier : `apps/web/src/toolbar.ts` (ligne 108), `apps/web/src/toolbar-profiles.ts` (ligne 37), `apps/web/src/app/toolbar-host.ts` (lignes 36 et 51).
- Tests : `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/typed-files.test.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/app/toolbar-host.test.ts`.

**Interfaces.**
- Consomme : `hasZipMagic`, `ImportHandler`, `importerOf`, `ZIP_MAX_BYTES` (existants).
- Produit (utilisé par T10 et T12) :
  - `files.ts` : `export const IWB_EXTENSION = ".iwb"`, `export const UBZ_EXTENSION = ".ubz"`, `export const BOARD_ZIP_MIME = "application/zip"`
  - `import.ts` : `ImportDeps.openBoard?(file: { readonly name: string; readonly blob: Blob; readonly format: "iwb" | "ubz" }): Promise<boolean>` ; `export const BOARD_TOO_BIG_MESSAGE = "fichier de tableau trop gros (plus de 256 Mio)"` ; `export function hasXmlHead(head: Uint8Array): boolean` ; `export function isIwbName(name: string): boolean` ; `export function isUbzName(name: string): boolean` ; `export function boardHandler(format: "iwb" | "ubz", deps: { openBoard: NonNullable<ImportDeps["openBoard"]> }): ImportHandler`
  - `typed-files.ts` : `export const IWB_TYPE: FileType`, `export const UBZ_TYPE: FileType`
  - `toolbar-host.ts` : `HostTargets.exportBoard?(format: "iwb" | "ubz"): void` ; actions `"export-iwb"`, `"export-ubz"`
- Réutilise : `apps/web/src/platform/import.ts:283` — `ImportHandler { id, nature: "document", detect, limit, run }` dans `createImporter` ; `ImportDeps.openBoard?` (étendu).
- Réutilise : `apps/web/src/platform/import.ts:161` — `hasZipMagic(head)` dans la détection des deux gestionnaires.
- Réutilise : `apps/web/src/platform/typed-files.ts:10` — `FileType` ; `IWB_TYPE`, `UBZ_TYPE` ajoutés à côté de `PDF_TYPE` (étendu ; `createWebTypedFiles`, `createTauriTypedFiles` inchangés).
- Réutilise : `apps/web/src/toolbar.ts:108`, `apps/web/src/toolbar-profiles.ts:37`, `apps/web/src/app/toolbar-host.ts:51` — `action("export-iwb", …)`, `action("export-ubz", …)` (étendus).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T4 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 pnpm exec vitest run src/platform/import.test.ts src/platform/files.test.ts src/platform/typed-files.test.ts src/toolbar.test.ts src/toolbar-profiles.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -8 \
 && nice -n 10 pnpm exec vitest run -t "C13" 2>&1 | grep -E "Tests|FAIL" | tail -3
```

Motif : aucun `FAIL` ; la seconde commande rend `Tests  N passed` avec N ≥ 10. Puis la suite web entière
(`nice -n 10 pnpm exec vitest run 2>&1 | tail -5`) : aucun `FAIL` (effets de bord : registre `importFiles`,
`toolbar-profiles.test.ts`, profils et barres).

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Bornes U26 : 100 Mo par fichier web (`WEB_MAX_BYTES`, déjà contrôlé par `importFiles`), 256 Mio par tableau (`ZIP_MAX_BYTES`), contrôlés avant lecture ; un test par cas.
- GC9 — Aucune dépendance neuve.
- GC10 — Textes en français ; ni « IWB/CFF » ni « conforme » dans l'interface (libellés : extension `.iwb` seule).
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` d'abord ; avant `tsc`, copier `apps/web/src/wasm` et `apps/web/src/wasm-formats` du worktree du chantier (jamais commités).

**Interdits.** Toucher `workspace.ts`, `main.ts`, `App.tsx` (T10, T12) ; changer le nom du filtre `IMPORT_FILTER` ;
retirer `export-pdf`.

**Terminé quand.** Tests neufs verts, suite web verte, `tsc --noEmit` propre, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Ajouter à `apps/web/src/platform/import.test.ts` (ajouter à l'import de `./import` :
  `BOARD_TOO_BIG_MESSAGE, hasXmlHead, isIwbName, isUbzName`) :

```ts
describe("importFiles : tableaux .iwb et .ubz (C13, D4, D5)", () => {
  const ZIP = new Uint8Array([80, 75, 3, 4, 20, 0]);
  const XML = new TextEncoder().encode('<?xml version="1.0"?><iwb version="1.0">');
  const notify = () => vi.fn(async (_m: string) => undefined);
  const opener = (ok = true) => vi.fn(async (_f: { readonly name: string; readonly blob: Blob; readonly format: "iwb" | "ubz" }) => ok);

  it("C13 : .iwb ZIP ou XML, .ubz ZIP : openBoard(nom, blob, format), un onglet chacun (S1, S2, S3)", async () => {
    const openBoard = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openBoard }).importFiles([file("a.iwb", ZIP), file("b.iwb", XML), file("c.ubz", ZIP)]);
    expect(r).toEqual({ opened: ["a.iwb", "b.iwb", "c.ubz"], inserted: [], refused: [], failed: [] });
    expect(openBoard.mock.calls.map((c) => [c[0].name, c[0].format])).toEqual([["a.iwb", "iwb"], ["b.iwb", "iwb"], ["c.ubz", "ubz"]]);
    expect(new Uint8Array(await openBoard.mock.calls[1]![0].blob.arrayBuffer())).toEqual(XML);
    expect(n).not.toHaveBeenCalled();
  });

  it("C13 : hasXmlHead : <?xml, <iwb, BOM et blancs tolérés ; autre chose refusé", () => {
    const t = (s: string) => new TextEncoder().encode(s);
    expect([hasXmlHead(t("<?xml ")), hasXmlHead(t("<iwb>")), hasXmlHead(new Uint8Array([0xef, 0xbb, 0xbf, ...t(" \n<?xml")])), hasXmlHead(t("<svg>")), hasXmlHead(t("bonjour"))]).toEqual([true, true, true, false, false]);
  });

  it("C13 : noms : .iwb et .ubz en toutes casses ; « .iwb » seul ne compte pas", () => {
    expect([isIwbName("Cours.IWB"), isIwbName(".iwb"), isUbzName("x.ubz"), isUbzName("x.zip")]).toEqual([true, false, true, false]);
  });

  it("C13 : .iwb ni ZIP ni XML, .ubz XML : refusés (prochaine version), openBoard jamais appelé", async () => {
    const openBoard = opener();
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openBoard }).importFiles([file("faux.iwb", new Uint8Array([1, 2, 3])), file("faux.ubz", XML)]);
    expect(r.refused).toEqual(["faux.iwb", "faux.ubz"]);
    expect(openBoard).not.toHaveBeenCalled();
  });

  it("C13 : refus de openBoard (fichier endommagé) : failed, aucun message ajouté par l'importeur", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openBoard: opener(false) }).importFiles([file("abime.iwb", ZIP)]);
    expect(r.failed).toEqual(["abime.iwb"]);
    expect(n).not.toHaveBeenCalled();
  });

  it("C13 : coque : un .iwb de 300 Mio est refusé avant lecture, « fichier de tableau trop gros (plus de 256 Mio) » (D4)", async () => {
    const blob = vi.fn(async () => new Blob([ZIP]));
    const big: DroppedFile = { name: "gros.iwb", size: 300 * 1024 * 1024, mime: "", head: async () => ZIP, blob };
    const n = notify();
    const openBoard = opener();
    const r = await createImporter({ openDocument: async () => true, notify: n, openBoard }).importFiles([big]);
    expect(r.failed.concat(r.refused)).toEqual(["gros.iwb"]);
    expect([blob.mock.calls.length, openBoard.mock.calls.length]).toEqual([0, 0]);
    expect(n).toHaveBeenCalledWith(`gros.iwb : ${BOARD_TOO_BIG_MESSAGE}`);
  });

  it("C13 : web : un .iwb XML de 120 Mo est refusé avant lecture (100 Mo, S5)", async () => {
    const blob = vi.fn(async () => new Blob([XML]));
    const big: DroppedFile = { name: "gros.iwb", size: 120 * 1024 * 1024, mime: "", head: async () => XML, blob };
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n, openBoard: opener(), maxBytes: WEB_MAX_BYTES }).importFiles([big]);
    expect(r.refused).toEqual(["gros.iwb"]);
    expect(blob).not.toHaveBeenCalled();
    expect(n).toHaveBeenCalledWith("gros.iwb : fichier trop gros (plus de 100 Mo)");
  });

  it("C13 : sans openBoard (amorce partielle) : .iwb refusé comme avant", async () => {
    const n = notify();
    const r = await createImporter({ openDocument: async () => true, notify: n }).importFiles([file("Cours.iwb", ZIP)]);
    expect(r.refused).toEqual(["Cours.iwb"]);
    expect(n).toHaveBeenCalledWith(`Cours.iwb : ${LATER_FORMAT_MESSAGE}`);
  });
});
```

Si l'assertion `r.failed.concat(r.refused)` montre que `importFiles` range le dépassement de `limit` dans `failed`,
garder la forme `concat` (le commentaire F22 de `ImportHandler.limit` dit « compté en échec »).

Dans `apps/web/src/platform/files.test.ts`, test « filtre « Importer » … », remplacer la ligne
`"roomboard", "rbitem", "rbpack", "pdf",` par `"roomboard", "rbitem", "rbpack", "pdf", "iwb", "ubz",` et ajouter au
titre du test `, C13 .iwb et .ubz`.

Ajouter à `apps/web/src/platform/typed-files.test.ts` (import : ajouter `IWB_TYPE, UBZ_TYPE`) :

```ts
describe("C13 : copies au format .iwb et .ubz (D17)", () => {
  it("C13 : IWB_TYPE et UBZ_TYPE : extension, filtre sans « IWB/CFF », ZIP", () => {
    expect(IWB_TYPE).toEqual({ extension: ".iwb", mime: "application/zip", filter: { name: "Tableau .iwb", extensions: ["iwb"] }, accept: ".iwb" });
    expect(UBZ_TYPE).toEqual({ extension: ".ubz", mime: "application/zip", filter: { name: "Tableau OpenBoard .ubz", extensions: ["ubz"] }, accept: ".ubz" });
  });
  it("C13 : web : save télécharge la copie en application/zip", async () => {
    const download = vi.fn();
    expect(await createWebTypedFiles({ pickFile: vi.fn(), download }, IWB_TYPE).save("Cours.iwb", b(5))).toBe(true);
    expect(download).toHaveBeenCalledWith("Cours.iwb", b(5), "application/zip");
  });
});
```

Dans `apps/web/src/toolbar-profiles.test.ts`, remplacer le `describe("barre : Exporter en PDF (C12, PF19)", …)` par :

```ts
describe("barre : Exporter en PDF (C12, PF19) et copies au format (C13, D17)", () => {
  it("barre des pages, en bas : « Exporter en PDF… », puis les deux copies, en dernier dans defaut, simple et annotation ; rien dans la barre du haut", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      const bars = builtinProfile(id)!.toolbars;
      const pages = bars.find((b) => b.role === "pages")!;
      expect(pages.dock, id).toBe("bottom");
      const items = pages.groups.flatMap((g) => g.items);
      expect(items.slice(-3), id).toEqual([
        expect.objectContaining({ id: "export-pdf", kind: "action", action: "export-pdf", label: "Exporter en PDF…" }),
        expect.objectContaining({ id: "export-iwb", kind: "action", action: "export-iwb", label: "Enregistrer une copie au format .iwb…" }),
        expect.objectContaining({ id: "export-ubz", kind: "action", action: "export-ubz", label: "Enregistrer une copie au format .ubz…" }),
      ]);
      const others = bars.filter((b) => b.role !== "pages").flatMap((b) => b.groups.flatMap((g) => g.items));
      expect(others.some((i) => ["export-pdf", "export-iwb", "export-ubz"].includes(i.id)), id).toBe(false);
    }
  });
});
```

Ajouter à `apps/web/src/toolbar.test.ts`, à côté du test `ACTION_TABLE : export-pdf` :

```ts
  it("C13 : ACTION_TABLE : export-iwb et export-ubz, libellés sans « IWB/CFF »", () => {
    expect(ACTION_TABLE["export-iwb"]?.label).toBe("Enregistrer une copie au format .iwb…");
    expect(ACTION_TABLE["export-ubz"]?.label).toBe("Enregistrer une copie au format .ubz…");
  });
```

Ajouter à `apps/web/src/app/toolbar-host.test.ts`, après le `describe` « barre : Exporter en PDF » :

```ts
describe("barre : copies au format (C13, D17)", () => {
  it("C13 : export-iwb → exportBoard(\"iwb\") ; export-ubz → exportBoard(\"ubz\")", () => {
    const exportBoard = vi.fn();
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn(), exportBoard } as unknown as HostTargets;
    const host = createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!);
    host.runAction("export-iwb");
    host.runAction("export-ubz");
    expect(exportBoard.mock.calls).toEqual([["iwb"], ["ubz"]]);
  });
  it("C13 : sans exportBoard (hôte partiel) : rien, aucune erreur", () => {
    const t = { engine: () => ({}), runFile: vi.fn(), importFiles: vi.fn(), toggle: vi.fn(), insertPages: vi.fn(), selection: vi.fn() } as unknown as HostTargets;
    expect(() => createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!).runAction("export-iwb")).not.toThrow();
  });
});
```

Lancer la commande bornée : attendu `FAIL` (symboles absents).

- [ ] **Étape 2 : `files.ts`.** Après `export const PDF_MIME = "application/pdf";` :

```ts
/** C13 (D4, D17) : tableaux interactifs ; une copie `.iwb` ou `.ubz` est une archive ZIP (aucun type déposé). */
export const IWB_EXTENSION = ".iwb";
export const UBZ_EXTENSION = ".ubz";
export const BOARD_ZIP_MIME = "application/zip";
```

et dans `IMPORT_EXTENSIONS`, après `"pdf",` : `"iwb",` puis `"ubz",`. Compléter le commentaire de
`IMPORT_EXTENSIONS` : `… le PDF, les tableaux .iwb et .ubz (C13) et les images …`.

- [ ] **Étape 3 : `import.ts`.** Ajouter `IWB_EXTENSION, UBZ_EXTENSION` à l'import de `./files`. Dans `ImportDeps`,
  après `openPdf?` :

```ts
  /** C13 (D4, D5) : ouvre un tableau `.iwb` (ZIP ou XML) ou `.ubz` dans un nouvel onglet ; false si refusé (message
   *  déjà dit) ; absente : `.iwb` et `.ubz` refusés comme avant. */
  openBoard?(file: { readonly name: string; readonly blob: Blob; readonly format: "iwb" | "ubz" }): Promise<boolean>;
```

Après `pdfHandler` :

```ts
/** C13 (D4) : plafond d'un tableau, ZIP comme XML brut, aussi dans la coque où `maxBytes` est nul. */
export const BOARD_TOO_BIG_MESSAGE = "fichier de tableau trop gros (plus de 256 Mio)";

export function isIwbName(name: string): boolean {
  return hasExtension(name, IWB_EXTENSION);
}

export function isUbzName(name: string): boolean {
  return hasExtension(name, UBZ_EXTENSION);
}

/** C13 (D4) : en-tête XML d'un `.iwb` en SVG brut : `<?xml` ou `<iwb`, après un BOM UTF-8 et des blancs. */
export function hasXmlHead(head: Uint8Array): boolean {
  let i = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0;
  while (i < head.length && (head[i] === 0x20 || head[i] === 0x09 || head[i] === 0x0a || head[i] === 0x0d)) i++;
  const text = new TextDecoder("utf-8").decode(head.subarray(i, i + 5));
  return text === "<?xml" || text.startsWith("<iwb");
}

/** C13 (D4, D5) : `iwb` = nom `.iwb` et en-tête ZIP ou XML ; `ubz` = nom `.ubz` et en-tête ZIP. Document : nouvel onglet
 *  par `openBoard`, qui dit ses refus (endommagé, onglets pleins). */
export function boardHandler(format: "iwb" | "ubz", deps: { openBoard: NonNullable<ImportDeps["openBoard"]> }): ImportHandler {
  return {
    id: format,
    nature: "document",
    detect: format === "iwb" ? (head, name) => isIwbName(name) && (hasZipMagic(head) || hasXmlHead(head)) : (head, name) => isUbzName(name) && hasZipMagic(head),
    limit: { maxBytes: ZIP_MAX_BYTES, message: BOARD_TOO_BIG_MESSAGE },
    async run(f, ctx) {
      return (await deps.openBoard({ name: f.name, blob: ctx.blob, format })) ? "opened" : "failed";
    },
  };
}
```

Dans `createImporter`, après `const openPdf = deps.openPdf?.bind(deps);` : `const openBoard = deps.openBoard?.bind(deps);`
et dans le registre, après `...(openPdf ? [pdfHandler({ openPdf })] : []),` :

```ts
      ...(openBoard ? [boardHandler("iwb", { openBoard }), boardHandler("ubz", { openBoard })] : []), // C13 : avant `media`
```

Compléter le commentaire de tête du fichier par :
` * C13 (D4, D5) : `iwb` (nom + en-tête ZIP ou XML) et `ubz` (nom + en-tête ZIP), documents, ouverts par `openBoard`.`

- [ ] **Étape 4 : `typed-files.ts`.** Ajouter `BOARD_ZIP_MIME, IWB_EXTENSION, UBZ_EXTENSION` à l'import de `./files`,
  puis après `PDF_TYPE` :

```ts
/** C13 (D17, D21) : copies « Enregistrer une copie au format » ; le filtre ne nomme que l'extension (pas « IWB/CFF »). */
export const IWB_TYPE: FileType = {
  extension: IWB_EXTENSION,
  mime: BOARD_ZIP_MIME,
  filter: { name: "Tableau .iwb", extensions: [IWB_EXTENSION.slice(1)] },
  accept: IWB_EXTENSION,
};

export const UBZ_TYPE: FileType = {
  extension: UBZ_EXTENSION,
  mime: BOARD_ZIP_MIME,
  filter: { name: "Tableau OpenBoard .ubz", extensions: [UBZ_EXTENSION.slice(1)] },
  accept: UBZ_EXTENSION,
};
```

- [ ] **Étape 5 : barre.** `apps/web/src/toolbar.ts`, après la ligne `"export-pdf": { label: "Exporter en PDF…" },` :

```ts
  "export-iwb": { label: "Enregistrer une copie au format .iwb…" },
  "export-ubz": { label: "Enregistrer une copie au format .ubz…" },
```

`apps/web/src/toolbar-profiles.ts`, après `action("export-pdf", "Exporter en PDF…"),` :

```ts
        action("export-iwb", "Enregistrer une copie au format .iwb…"),
        action("export-ubz", "Enregistrer une copie au format .ubz…"),
```

`apps/web/src/app/toolbar-host.ts` : dans `HostTargets`, après `exportPdf?(): void;` :

```ts
  /** C13 (D17) : « Enregistrer une copie au format .iwb… » ou « … .ubz… » ; absent (hôte partiel) : sans effet. */
  exportBoard?(format: "iwb" | "ubz"): void;
```

et dans `ACTIONS`, après `"export-pdf": (t) => t.exportPdf?.(),` :

```ts
  "export-iwb": (t) => t.exportBoard?.("iwb"),
  "export-ubz": (t) => t.exportBoard?.("ubz"),
```

- [ ] **Étape 6 : tests verts, suite web, typage.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T4 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/ \
 && cd apps/web && nice -n 10 pnpm exec vitest run 2>&1 | tail -5 && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5
```

Attendu : `Tests  N passed`, aucun `FAIL`, `tsc` muet. Un test existant qui compte les actions de la barre des pages ou
les extensions de « Importer » (par exemple `host-repli.test.ts` « IMPORT_ACCEPT suit IMPORT_EXTENSIONS ») se met à jour
avec les nouvelles valeurs, jamais en retirant l'assertion.

- [ ] **Étape 7 : commiter** (un `git add` par fichier modifié : les 6 sources et les 6 tests de la rubrique Fichiers,
  plus tout test existant mis à jour à l'étape 6).

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T4 && for f in apps/web/src/platform/files.ts apps/web/src/platform/files.test.ts apps/web/src/platform/import.ts apps/web/src/platform/import.test.ts apps/web/src/platform/typed-files.ts apps/web/src/platform/typed-files.test.ts apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts; do git add "$f"; done \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(web): detect .iwb and .ubz, copy file types and toolbar actions (C13 D4 D17)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties vitest et `tsc`, la liste des tests existants mis à jour, et les lignes :
`Réutilisation : appelé apps/web/src/platform/import.ts (ImportHandler, createImporter)`,
`Réutilisation : appelé apps/web/src/platform/import.ts (hasZipMagic)`,
`Réutilisation : appelé apps/web/src/platform/typed-files.ts (FileType)`,
`Réutilisation : appelé toolbar.ts, toolbar-profiles.ts, app/toolbar-host.ts (action)`.

<a id="tache-t5"></a>
### Tâche T5 — `board-io.ts` : flux BoardList ↔ commandes du cœur, dans les deux sens

**Objectif.** Côté page, lire le flux BoardList (même contrôle que `board::parse` du Rust, flux témoin W1 commun),
construire le document importé par les commandes existantes sur un document jetable puis le recopier sans historique
(D7), avec les contrôles D8b ; et, à l'export, coder l'onglet en flux BoardList avec les fichiers d'images et les
avertissements de ce qui n'est pas écrit (D18).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T5`.

**Fichiers.**
- Créer : `apps/web/src/app/board-io.ts`.
- Créer : `apps/web/src/app/board-io.test.ts`.

**Interfaces.**
- Consomme : `CoreFactory.blank`, `CoreFactory.loadParts`, `CoreDocument.apply|pageIds|elementIds|element|page|points|bounds|asset|saveParts|free` (`apps/web/src/core/api.ts`) ; `applyMatrix`, `composeMatrix` (`apps/web/src/core/shapes.ts:81,86`) ; `IMAGE_MIME`, `ImageDecoder` (`apps/web/src/platform/image-import.ts:17,111`) ; `ImageKind` (`apps/web/src/platform/image-decode.ts:8`) ; `ZipFile` (`apps/web/src/platform/zip-read.ts:14`) ; `typed` (`apps/web/src/app/container-io.ts:67`).
- Produit (exact ; T10 et T12 l'appellent) :
  - `export type BoardFormat = "iwb" | "ubz"`
  - `export const BOARD_OP = { page: 1, background: 2, shape: 3, stroke: 4, text: 5, image: 6, groupBegin: 7, groupEnd: 8 } as const`
  - `export const BOARD_BAD_LIST_PREFIX = "liste de tableau invalide : "`
  - `export type BoardObject` (union `shape` | `stroke` | `text` | `image` | `group`, champs ci-dessous) ; `export interface BoardListPage { readonly background: string | null; readonly objects: readonly BoardObject[] }`
  - `export interface BoardListData { readonly ops: Float32Array; readonly texts: string[] }`
  - `export interface BoardPart { readonly ops: ArrayLike<number>; readonly texts: readonly string[]; readonly warnings: readonly string[] }`
  - `export interface BoardPorts { unzip(blob: Blob): Promise<readonly { readonly path: string; readonly blob: Blob }[]>; zip(files: readonly ZipFile[]): Promise<Uint8Array>; read(files: readonly Uint8Array[], format: BoardFormat): Promise<readonly BoardPart[]>; write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardFormat): Promise<readonly ZipFile[]> }`
  - `export function decodeBoardList(ops: ArrayLike<number>, texts: readonly string[]): BoardListPage[]` (lève `Error("liste de tableau invalide : …")`)
  - `export function encodeBoardList(pages: readonly BoardListPage[]): BoardListData`
  - `export interface BoardBuildDeps { makeAssets(): AssetStore; readonly decode: ImageDecoder; readonly now: string; readonly appVersion: string }`
  - `export async function buildBoardDocument(core: CoreFactory, pages: readonly BoardListPage[], media: ReadonlyMap<string, Blob>, deps: BoardBuildDeps): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }>`
  - `export async function boardListOf(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat): Promise<{ list: BoardListData; files: ZipFile[]; warnings: string[] }>` (écart au cadrage : asynchrone, pour lire les octets des images, et `format` pour l'avertissement des flèches `.ubz`)
  - `export function mediaOf(media: ReadonlyMap<string, Blob>, path: string): Blob | undefined`
  - `export const skippedMessage = (page: number, n: number): string`, `export const missingImagesMessage = (page: number, n: number): string`
- Réutilise : `apps/web/src/core/api.ts:362` et `:396` (`saveParts`, `loadParts`) ; `apps/web/src/app/workspace.ts:451` — `draft.saveParts(now, appVersion)` → `core.loadParts(manifest, ybin)` : document ouvert sans étape d'annulation.
- Réutilise : aucun module existant pour « BoardList ↔ commandes » — nouveau module `app/board-io.ts` (DA2), créé ici.
- Réutilise : `apps/web/src/core/asset-store.ts:16` — `assets.put(blob)` pour chaque image importée.
- Réutilise : `apps/web/src/app/container-io.ts:67` — `typed(blob, mime)` (importé, jamais recopié, D24).
- Réutilise : `apps/web/src/platform/image-import.ts` — `ImageDecoder` (taille source par le décodeur existant) et `IMAGE_MIME`.
- Réutilise : `apps/web/src/core/api.ts:437` — `PAGE_WIDTH` (seule source de la largeur de page, D24) pour « hors du cadre ».

**Patron à ne pas reprendre.** Appliquer les commandes sur le document d'un onglet ouvert : chaque objet deviendrait une
étape d'annulation et Ctrl+Z viderait le tableau importé. Le bon patron : document jetable puis copie
`saveParts` → `loadParts`, `apps/web/src/app/workspace.ts:451-452`. Autre piège : recalculer les points d'un trait en
coordonnées monde à l'export ; le cœur rend des points **locaux** placés par `transform` (`apps/web/src/core/api.ts:2`),
le flux les garde ainsi avec `m = transform`.

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T5 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 pnpm exec vitest run src/app/board-io.test.ts 2>&1 | tail -8
```

Motif : `Tests  N passed` avec N ≥ 11, aucun `FAIL` ; `pnpm exec vitest run src/app/board-io.test.ts -t "flux témoin W1" 2>&1 | grep -c "✓"` ≥ 2.
Test à garder vert (carte d'impact) : `apps/web/src/core/wasm-core.contract.test.ts` (aucune commande neuve) — lancer la
suite web entière à l'étape 6.

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Sécurité : un objet que le cœur refuserait (points vides, impairs ou non finis, coins non finis, épaisseur ≤ 0, matrice non inversible) est sauté et compté, jamais un échec du fichier (D8b) ; un test.
- GC6 — Aucune requête réseau : une image se résout seulement dans les entrées du ZIP (`media`), jamais par une adresse.
- GC7 — Fixtures fabriquées dans les tests ; aucun fichier de `~/telechargements-roomboard/`.
- GC8 — Aucune commande de cœur neuve ; `crates/roomboard-core/**` intouché ; l'élément `fill` du pot n'est que compté à l'export (jamais créé ni modifié).
- GC9 — Aucune dépendance neuve.
- GC10 — Textes en français.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` d'abord ; avant `tsc`, copier `apps/web/src/wasm` et `apps/web/src/wasm-formats` du worktree du chantier (jamais commités).

**Interdits.** Changer la table des codes ou W1 (contrat de T2) ; importer du DOM ; toucher `workspace.ts`.

**Terminé quand.** 12 tests verts, suite web verte, `tsc --noEmit` propre, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Créer `apps/web/src/app/board-io.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument, Matrix, TextSpan } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import { applyMatrix } from "../core/shapes";
import { boardListOf, buildBoardDocument, decodeBoardList, encodeBoardList, mediaOf, type BoardListPage, type BoardObject } from "./board-io";

const ID: Matrix = [1, 0, 0, 1, 0, 0];
/** Flux témoin W1, recopié de `crates/roomboard-formats/src/board.rs` (fixtures) : parité du codage (D6). */
const W1_OPS = [
  1,
  2, 0, 0, 0,
  3, 0, 1, 0, 0, 1, 0, 0, 10, 20, 110, 70, 255, 0, 0, 4, 1, 0, 0, 255,
  4, 1, 0, 0, 1, 0, 0, 0, 128, 0, 3, 2, 0, 0, 1, 10, 10, 0.5,
  5, 1, 0, 0, 1, 100, 200, 0, 0, 300, 50, 24, 0, 0, 0, 2, 0, 1, 0, -1, -1, -1, -1, 1, 0, 32, 255, 0, 0, 2,
  6, 1, 0, 0, 1, 0, 0, 5, 5, 64, 32, 3,
  7,
  3, 2, 1, 0, 0, 1, 0, 0, 0, 0, 50, 0, 0, 0, 0, 2, 0, 0, 0, 0,
  3, 3, 1, 0, 0, 1, 0, 0, 0, 10, 50, 10, 0, 0, 0, 2, 0, 0, 0, 0,
  8,
  1,
];
const W1_TEXTS = ["Bonjour ", "monde", "Liberation Sans", "images/a.png"];
const W1_SPANS: readonly TextSpan[] = [{ text: "Bonjour ", attrs: { bold: true } }, { text: "monde", attrs: { size: 32, color: "#ff0000", font: "Liberation Sans" } }];
const W1_PAGES: BoardListPage[] = [
  {
    background: "#000000",
    objects: [
      { kind: "shape", shape: "rect", m: ID, x0: 10, y0: 20, x1: 110, y1: 70, color: "#ff0000", width: 4, fill: "#0000ff" },
      { kind: "stroke", m: ID, color: "#008000", width: 3, points: [0, 0, 1, 10, 10, 0.5] },
      { kind: "text", m: [1, 0, 0, 1, 100, 200], x: 0, y: 0, boxWidth: 300, boxHeight: 50, size: 24, color: "#000000", spans: W1_SPANS },
      { kind: "image", m: ID, x: 5, y: 5, w: 64, h: 32, path: "images/a.png" },
      {
        kind: "group",
        children: [
          { kind: "shape", shape: "line", m: ID, x0: 0, y0: 0, x1: 50, y1: 0, color: "#000000", width: 2, fill: null },
          { kind: "shape", shape: "arrow", m: ID, x0: 0, y0: 10, x1: 50, y1: 10, color: "#000000", width: 2, fill: null },
        ],
      },
    ],
  },
  { background: null, objects: [] },
];

const fakeHasher = async (b: Blob): Promise<string> => {
  let h = 0;
  for (const x of new Uint8Array(await b.arrayBuffer())) h = (h * 31 + x) >>> 0;
  return h.toString(16).padStart(64, "0");
};
const decode = vi.fn(async (_b: Blob, _k: string) => ({ bitmap: { close() {} } as unknown as ImageBitmap, w: 64, h: 32 }));
const deps = () => ({ makeAssets: () => createAssetStore(fakeHasher), decode, now: "2026-11-21T00:00:00Z", appVersion: "0.1.0" });
const PNG = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])]);
const onePage = (objects: BoardObject[], background: string | null = null): BoardListPage[] => [{ background, objects }];
const viewsOf = (doc: CoreDocument) => doc.elementIds(doc.pageIds()[0]!).map((id) => doc.element(id)!);
type Shape = Extract<BoardObject, { kind: "shape" }>;
type Text = Extract<BoardObject, { kind: "text" }>;

describe("board-io : flux BoardList (C13, D6)", () => {
  it("C13 : flux témoin W1 : decodeBoardList rend les pages attendues (parité avec board.rs)", () => {
    expect(decodeBoardList(W1_OPS, W1_TEXTS)).toEqual(W1_PAGES);
  });

  it("C13 : flux témoin W1 : encodeBoardList(W1) rend les mêmes nombres et les mêmes textes", () => {
    const l = encodeBoardList(W1_PAGES);
    expect(Array.from(l.ops)).toEqual(W1_OPS);
    expect(l.texts).toEqual(W1_TEXTS);
  });

  it("C13 : flux invalides : « liste de tableau invalide : … » (mêmes cas que board.rs)", () => {
    for (const ops of [[9], [3, 0], [1, 7], [1, 8], [1, 2, 256, 0, 0], [1, 6, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 9], [1, 4, 1, 0, 0, 1, 0, Number.NaN], [1, 3, 7]]) {
      expect(() => decodeBoardList(ops, W1_TEXTS), JSON.stringify(ops)).toThrow(/^liste de tableau invalide : /);
    }
  });
});

describe("board-io : document importé (C13, D7, D8b)", () => {
  it("C13 : W1 construit : 2 pages, fond noir, 6 objets, ligne et flèche groupées, aucune étape d'annulation", async () => {
    const r = await buildBoardDocument(fakeCore, W1_PAGES, new Map([["images/a.png", PNG]]), deps());
    const doc = r.doc;
    expect(doc.pageIds()).toHaveLength(2);
    expect(doc.page(doc.pageIds()[0]!)?.background).toBe("#000000");
    const views = viewsOf(doc);
    expect(views.map((v) => v.kind)).toEqual(["shape", "stroke", "text", "image", "shape", "shape"]);
    expect(views[4]!.group).toBeDefined();
    expect(views[4]!.group).toEqual(views[5]!.group);
    expect(views[0]!.group).toBeUndefined();
    expect(doc.canUndo()).toBe(false);
    expect(r.warnings).toEqual([]);
    expect(doc.citedAssets()).toHaveLength(1);
    expect(r.assets.get(doc.citedAssets()[0]!.id)?.type).toBe("image/png");
  });

  it("C13 : texte : segments gardés, échelle uniforme repliée (taille 48, translation seule)", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "text", m: [2, 0, 0, 2, 10, 10], x: 0, y: 0, boxWidth: 100, boxHeight: 30, size: 24, color: "#000000", spans: W1_SPANS }]), new Map(), deps());
    const t = viewsOf(r.doc)[0]!;
    if (t.kind !== "text") throw new Error(t.kind);
    expect([t.text.size, t.text.boxWidth, t.text.boxHeight, t.transform]).toEqual([48, 200, 60, [1, 0, 0, 1, 10, 10]]);
    expect(t.text.spans).toEqual([{ text: "Bonjour ", attrs: { bold: true } }, { text: "monde", attrs: { size: 64, color: "#ff0000", font: "Liberation Sans" } }]);
  });

  it("C13 : trait : points placés par la matrice, épaisseur à l'échelle", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "stroke", m: [2, 0, 0, 2, 100, 0], color: "#000000", width: 3, points: [0, 0, 1, 10, 5, 0.5] }]), new Map(), deps());
    const s = viewsOf(r.doc)[0]!;
    if (s.kind !== "stroke") throw new Error(s.kind);
    const local = Array.from(r.doc.points(s.id)!);
    expect([...applyMatrix(s.transform, local[0]!, local[1]!), ...applyMatrix(s.transform, local[3]!, local[4]!), local[5], s.style.width]).toEqual([100, 0, 120, 10, 0.5, 6]);
  });

  it("C13 : D8b : épaisseur 0, coin non fini, taille 0 : sautés et comptés, le reste construit", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([
      { kind: "stroke", m: ID, color: "#000000", width: 0, points: [0, 0, 1] },
      { kind: "shape", shape: "rect", m: ID, x0: Number.NaN, y0: 0, x1: 1, y1: 1, color: "#000000", width: 1, fill: null },
      { kind: "text", m: ID, x: 0, y: 0, boxWidth: 10, boxHeight: 10, size: 0, color: "#000000", spans: [{ text: "a", attrs: {} }] },
      { kind: "shape", shape: "ellipse", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 1, fill: null },
    ]), new Map(), deps());
    expect(viewsOf(r.doc).map((v) => v.kind)).toEqual(["shape"]);
    expect(r.warnings).toEqual(["page 1 : 3 objets illisibles ignorés"]);
  });

  it("C13 : image absente de l'archive : sautée, « page 1 : 1 image absente de l'archive »", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "image", m: ID, x: 0, y: 0, w: 10, h: 10, path: "images/absente.png" }]), new Map(), deps());
    expect(viewsOf(r.doc)).toEqual([]);
    expect(r.warnings).toEqual(["page 1 : 1 image absente de l'archive"]);
  });

  it("C13 : image trouvée sans tenir compte de la casse ni des barres inverses (Review Focus 5)", async () => {
    const media = new Map([["images/A.PNG", PNG]]);
    expect(mediaOf(media, "images\\a.png")).toBe(PNG);
    expect(mediaOf(media, "./images/a.png")).toBe(PNG);
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "image", m: ID, x: 10, y: 20, w: 128, h: 64, path: "images/a.png" }]), media, deps());
    const v = viewsOf(r.doc)[0]!;
    if (v.kind !== "image") throw new Error(v.kind);
    expect([v.image.w, v.image.h, v.transform]).toEqual([64, 32, [2, 0, 0, 2, 10, 20]]);
  });

  it("C13 : groupe d'un seul objet lisible : aucun groupe (D13)", async () => {
    const r = await buildBoardDocument(fakeCore, onePage([{ kind: "group", children: [
      { kind: "shape", shape: "rect", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 1, fill: null },
      { kind: "shape", shape: "rect", m: ID, x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 0, fill: null },
    ] }]), new Map(), deps());
    expect(viewsOf(r.doc).map((v) => v.group)).toEqual([undefined]);
  });
});

describe("board-io : copie au format (C13, D18)", () => {
  it("C13 : boardListOf : copie de W1 : mêmes sortes, couleurs, segments, image images/<empreinte>.png, groupe", async () => {
    const built = await buildBoardDocument(fakeCore, W1_PAGES, new Map([["images/a.png", PNG]]), deps());
    const r = await boardListOf(built.doc, built.assets, "iwb");
    const back = decodeBoardList(r.list.ops, r.list.texts);
    expect(back).toHaveLength(2);
    expect(back[0]!.background).toBe("#000000");
    const objs = back[0]!.objects;
    expect(objs.map((o) => o.kind)).toEqual(["shape", "stroke", "text", "image", "group"]);
    const rect = objs[0] as Shape;
    expect([rect.shape, rect.color, rect.width, rect.fill, ...applyMatrix(rect.m, rect.x0, rect.y0), ...applyMatrix(rect.m, rect.x1, rect.y1)]).toEqual(["rect", "#ff0000", 4, "#0000ff", 10, 20, 110, 70]);
    const text = objs[2] as Text;
    expect([text.spans, applyMatrix(text.m, text.x, text.y), text.size]).toEqual([W1_SPANS, [100, 200], 24]);
    const img = objs[3] as Extract<BoardObject, { kind: "image" }>;
    expect(img.path).toMatch(/^images\/[0-9a-f]{64}\.png$/);
    expect(r.files.map((f) => f.path)).toEqual([img.path]);
    expect(r.files[0]!.bytes).toEqual(new Uint8Array(await PNG.arrayBuffer()));
    const group = objs[4] as Extract<BoardObject, { kind: "group" }>;
    expect(group.children.map((c) => (c as Shape).shape)).toEqual(["line", "arrow"]);
    expect(r.warnings).toEqual([]);
  });

  it("C13 : boardListOf : tableau non exporté, flèche écrite en ligne pour .ubz, objet hors du cadre", async () => {
    const draft = fakeCore.blank();
    const pid = draft.pageIds()[0]!;
    draft.apply({ type: "AddTable", page: pid, x: 0, y: 0, cols: 2, rows: 2, colWidth: 100, rowHeight: 40, color: "#000000", size: 24 });
    draft.apply({ type: "AddShape", page: pid, shape: "arrow", x0: 100, y0: 100, x1: 200, y1: 100, style: { color: "#000000", width: 2 }, fill: null });
    draft.apply({ type: "AddShape", page: pid, shape: "rect", x0: -10, y0: 10, x1: 20, y1: 40, style: { color: "#000000", width: 2 }, fill: null });
    const assets = createAssetStore(fakeHasher);
    const outside = "1 objet hors du cadre (coordonnées négatives ou au-delà de 1 920)";
    expect((await boardListOf(draft, assets, "ubz")).warnings).toEqual(["1 tableau non exporté", "1 flèche écrite en ligne (.ubz)", outside]);
    expect((await boardListOf(draft, assets, "iwb")).warnings).toEqual(["1 tableau non exporté", outside]);
  });
});
```

Lancer la commande bornée : attendu `FAIL` (module absent).

- [ ] **Étape 2 : le flux (décodage, codage).** Créer `apps/web/src/app/board-io.ts` :

```ts
/**
 * Tableaux interactifs côté page (C13, DA2, D6, D7, D8b, D18) : flux BoardList du module `formats` ↔ commandes du cœur.
 * Lecture : `decodeBoardList` contrôle le flux (même règle que `board::parse` du Rust, flux témoin W1 commun), puis
 * `buildBoardDocument` applique les commandes existantes sur un document jetable et rend une copie sans historique
 * (`saveParts` → `loadParts`, comme l'export PDF). Écriture : `boardListOf` lit l'onglet (vues du cœur, points locaux
 * placés par `transform`) et code le flux que `write_board_xml` écrit. Aucune commande de cœur neuve ; aucun DOM.
 * Table des codes : `docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md`, « Table des codes du flux BoardList ».
 */
import { DEFAULT_BACKGROUND, PAGE_WIDTH, type AssetRef, type Change, type Command, type CoreDocument, type CoreFactory, type ElementView, type Matrix, type ShapeKind, type TextSpan } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { applyMatrix, composeMatrix } from "../core/shapes";
import type { ImageKind } from "../platform/image-decode";
import { IMAGE_MIME, type ImageDecoder } from "../platform/image-import";
import type { ZipFile } from "../platform/zip-read";
import { typed } from "./container-io";

export type BoardFormat = "iwb" | "ubz";
export const BOARD_OP = { page: 1, background: 2, shape: 3, stroke: 4, text: 5, image: 6, groupBegin: 7, groupEnd: 8 } as const;
export const BOARD_BAD_LIST_PREFIX = "liste de tableau invalide : ";
const SHAPES: readonly ShapeKind[] = ["rect", "ellipse", "line", "arrow"];
const MAX_POINTS = 1_000_000;
const MAX_SPANS = 10_000;
const MAX_INDEX = 16_777_216;

export type BoardObject =
  | { readonly kind: "shape"; readonly shape: ShapeKind; readonly m: Matrix; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly color: string; readonly width: number; readonly fill: string | null }
  | { readonly kind: "stroke"; readonly m: Matrix; readonly color: string; readonly width: number; readonly points: readonly number[] }
  | { readonly kind: "text"; readonly m: Matrix; readonly x: number; readonly y: number; readonly boxWidth: number; readonly boxHeight: number; readonly size: number; readonly color: string; readonly spans: readonly TextSpan[] }
  | { readonly kind: "image"; readonly m: Matrix; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly path: string }
  | { readonly kind: "group"; readonly children: readonly BoardObject[] };

export interface BoardListPage {
  readonly background: string | null;
  readonly objects: readonly BoardObject[];
}
export interface BoardListData {
  readonly ops: Float32Array;
  readonly texts: string[];
}
/** Réponse du Worker des tableaux pour un fichier XML (`BoardReader`). */
export interface BoardPart {
  readonly ops: ArrayLike<number>;
  readonly texts: readonly string[];
  readonly warnings: readonly string[];
}
/** Ports de l'espace de travail (amorce : Worker ZIP en mode `board`, Worker jetable du module `formats`). */
export interface BoardPorts {
  unzip(blob: Blob): Promise<readonly { readonly path: string; readonly blob: Blob }[]>;
  zip(files: readonly ZipFile[]): Promise<Uint8Array>;
  read(files: readonly Uint8Array[], format: BoardFormat): Promise<readonly BoardPart[]>;
  write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardFormat): Promise<readonly ZipFile[]>;
}

const bad = (m: string): Error => new Error(`${BOARD_BAD_LIST_PREFIX}${m}`);
const hex2 = (v: number): string => v.toString(16).padStart(2, "0");
export const hexOf = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
/** `#rrggbb` (une couleur du cœur) ; toute autre forme : noir. */
export function rgbOf(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  return m === null ? [0, 0, 0] : [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

class Cursor {
  i = 0;
  constructor(
    private readonly v: ArrayLike<number>,
    private readonly texts: readonly string[],
  ) {}
  done(): boolean {
    return this.i >= this.v.length;
  }
  num(): number {
    if (this.i >= this.v.length) throw bad(`flux coupé à ${this.i}`);
    const x = this.v[this.i++]!;
    if (!Number.isFinite(x)) throw bad(`nombre non fini à ${this.i - 1}`);
    return x;
  }
  int(max: number): number {
    const x = this.num();
    if (x < 0 || !Number.isInteger(x) || x > max) throw bad(`entier de 0 à ${max} attendu à ${this.i - 1}`);
    return x;
  }
  mat(): Matrix {
    return [this.num(), this.num(), this.num(), this.num(), this.num(), this.num()];
  }
  rgb(): string {
    return hexOf(this.int(255), this.int(255), this.int(255));
  }
  /** −1, −1, −1 : absente. */
  optRgb(): string | undefined {
    if ((this.v[this.i] ?? 0) < 0) {
      this.num();
      this.num();
      this.num();
      return undefined;
    }
    return this.rgb();
  }
  text(): string {
    const k = this.int(MAX_INDEX);
    const t = this.texts[k];
    if (t === undefined) throw bad(`texte ${k} absent`);
    return t;
  }
  /** −1 : absent. */
  optText(): string | undefined {
    if ((this.v[this.i] ?? 0) < 0) {
      this.num();
      return undefined;
    }
    return this.text();
  }
  shape(): BoardObject {
    const k = this.int(3);
    const m = this.mat();
    const x0 = this.num();
    const y0 = this.num();
    const x1 = this.num();
    const y1 = this.num();
    const color = this.rgb();
    const width = this.num();
    let fill: string | null = null;
    if (this.int(1) === 1) {
      fill = this.rgb();
    } else {
      this.num();
      this.num();
      this.num();
    }
    return { kind: "shape", shape: SHAPES[k]!, m, x0, y0, x1, y1, color, width, fill };
  }
  stroke(): BoardObject {
    const m = this.mat();
    const color = this.rgb();
    const width = this.num();
    const n = this.int(MAX_POINTS);
    const points: number[] = [];
    for (let k = 0; k < 3 * n; k++) points.push(this.num());
    return { kind: "stroke", m, color, width, points };
  }
  textObject(): BoardObject {
    const m = this.mat();
    const x = this.num();
    const y = this.num();
    const boxWidth = this.num();
    const boxHeight = this.num();
    const size = this.num();
    const color = this.rgb();
    const n = this.int(MAX_SPANS);
    const spans: TextSpan[] = [];
    for (let k = 0; k < n; k++) {
      const text = this.text();
      const flags = this.int(7);
      const z = this.num();
      if (z < 0) throw bad(`taille de segment négative à ${this.i - 1}`);
      const c = this.optRgb();
      const font = this.optText();
      spans.push({
        text,
        attrs: {
          ...(flags & 1 ? { bold: true as const } : {}),
          ...(flags & 2 ? { italic: true as const } : {}),
          ...(flags & 4 ? { underline: true as const } : {}),
          ...(c !== undefined ? { color: c } : {}),
          ...(z > 0 ? { size: z } : {}),
          ...(font !== undefined ? { font } : {}),
        },
      });
    }
    return { kind: "text", m, x, y, boxWidth, boxHeight, size, color, spans };
  }
  image(): BoardObject {
    const m = this.mat();
    const x = this.num();
    const y = this.num();
    const w = this.num();
    const h = this.num();
    const path = this.text();
    return { kind: "image", m, x, y, w, h, path };
  }
}

/** Flux contrôlé en entier ; tout défaut lève `liste de tableau invalide : …` (règles de `board::parse`). */
export function decodeBoardList(ops: ArrayLike<number>, texts: readonly string[]): BoardListPage[] {
  const c = new Cursor(ops, texts);
  const pages: Array<{ background: string | null; objects: BoardObject[] }> = [];
  const stack: BoardObject[][] = [];
  const push = (o: BoardObject): void => {
    const top = stack.at(-1);
    if (top !== undefined) {
      top.push(o);
      return;
    }
    const page = pages.at(-1);
    if (page === undefined) throw bad("objet avant la première page");
    page.objects.push(o);
  };
  while (!c.done()) {
    const at = c.i;
    const code = c.int(8);
    switch (code) {
      case BOARD_OP.page:
        if (stack.length > 0) throw bad(`groupe ouvert à la page suivante (${at})`);
        pages.push({ background: null, objects: [] });
        break;
      case BOARD_OP.background: {
        const bg = c.rgb();
        const page = pages.at(-1);
        if (page === undefined) throw bad("fond avant la première page");
        page.background = bg;
        break;
      }
      case BOARD_OP.shape:
        push(c.shape());
        break;
      case BOARD_OP.stroke:
        push(c.stroke());
        break;
      case BOARD_OP.text:
        push(c.textObject());
        break;
      case BOARD_OP.image:
        push(c.image());
        break;
      case BOARD_OP.groupBegin:
        if (pages.length === 0) throw bad("groupe avant la première page");
        stack.push([]);
        break;
      case BOARD_OP.groupEnd: {
        const children = stack.pop();
        if (children === undefined) throw bad(`fin de groupe sans début (${at})`);
        push({ kind: "group", children });
        break;
      }
      default:
        throw bad(`code inconnu ${code} à ${at}`);
    }
  }
  if (stack.length > 0) throw bad("groupe non fermé");
  return pages;
}

/** Flux d'un tableau à écrire ; textes internés à leur première apparition (règle de `board::encode`). */
export function encodeBoardList(pages: readonly BoardListPage[]): BoardListData {
  const ops: number[] = [];
  const texts: string[] = [];
  const index = new Map<string, number>();
  const text = (s: string): number => {
    let k = index.get(s);
    if (k === undefined) {
      k = texts.length;
      texts.push(s);
      index.set(s, k);
    }
    return k;
  };
  const rgb = (color: string): void => {
    const [r, g, b] = rgbOf(color);
    ops.push(r, g, b);
  };
  const mat = (m: Matrix): void => {
    ops.push(m[0], m[1], m[2], m[3], m[4], m[5]);
  };
  const obj = (o: BoardObject): void => {
    switch (o.kind) {
      case "shape":
        ops.push(BOARD_OP.shape, SHAPES.indexOf(o.shape));
        mat(o.m);
        ops.push(o.x0, o.y0, o.x1, o.y1);
        rgb(o.color);
        ops.push(o.width);
        if (o.fill === null) {
          ops.push(0, 0, 0, 0);
        } else {
          ops.push(1);
          rgb(o.fill);
        }
        return;
      case "stroke":
        ops.push(BOARD_OP.stroke);
        mat(o.m);
        rgb(o.color);
        ops.push(o.width, o.points.length / 3);
        for (const v of o.points) ops.push(v);
        return;
      case "text":
        ops.push(BOARD_OP.text);
        mat(o.m);
        ops.push(o.x, o.y, o.boxWidth, o.boxHeight, o.size);
        rgb(o.color);
        ops.push(o.spans.length);
        for (const s of o.spans) {
          const t = text(s.text);
          const a = s.attrs;
          ops.push(t, (a.bold ? 1 : 0) + (a.italic ? 2 : 0) + (a.underline ? 4 : 0), a.size ?? 0);
          if (a.color === undefined) ops.push(-1, -1, -1);
          else rgb(a.color);
          ops.push(a.font === undefined ? -1 : text(a.font));
        }
        return;
      case "image": {
        ops.push(BOARD_OP.image);
        mat(o.m);
        const k = text(o.path);
        ops.push(o.x, o.y, o.w, o.h, k);
        return;
      }
      case "group":
        ops.push(BOARD_OP.groupBegin);
        for (const c of o.children) obj(c);
        ops.push(BOARD_OP.groupEnd);
        return;
    }
  };
  for (const p of pages) {
    ops.push(BOARD_OP.page);
    if (p.background !== null) {
      ops.push(BOARD_OP.background);
      rgb(p.background);
    }
    for (const o of p.objects) obj(o);
  }
  return { ops: Float32Array.from(ops), texts };
}
```

- [ ] **Étape 3 : la construction du document (suite du même fichier).**

```ts
export interface BoardBuildDeps {
  makeAssets(): AssetStore;
  readonly decode: ImageDecoder;
  /** Manifeste de la copie sans historique (`saveParts`). */
  readonly now: string;
  readonly appVersion: string;
}

export const skippedMessage = (page: number, n: number): string => `page ${page} : ${n} ${n > 1 ? "objets illisibles ignorés" : "objet illisible ignoré"}`;
export const missingImagesMessage = (page: number, n: number): string => `page ${page} : ${n} ${n > 1 ? "images absentes" : "image absente"} de l'archive`;

const IMAGE_KIND_OF_EXT: Readonly<Record<string, ImageKind>> = { png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp", bmp: "bmp", svg: "svg" };
const extOf = (path: string): string => {
  const b = path.slice(path.lastIndexOf("/") + 1);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1).toLowerCase() : "";
};
const normalPath = (path: string): string => path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");

/** Entrée du ZIP citée par `path` : à l'identique, sinon sans tenir compte de la casse (ZIP écrits sous Windows). */
export function mediaOf(media: ReadonlyMap<string, Blob>, path: string): Blob | undefined {
  const p = normalPath(path);
  const exact = media.get(p);
  if (exact !== undefined) return exact;
  const lower = p.toLowerCase();
  for (const [k, v] of media) if (normalPath(k).toLowerCase() === lower) return v;
  return undefined;
}

const finite = (...v: number[]): boolean => v.every((x) => Number.isFinite(x));
const positive = (x: number): boolean => Number.isFinite(x) && x > 0;
const det = (m: Matrix): number => m[0] * m[3] - m[1] * m[2];
/** Matrice que le cœur accepte (`valid_matrix` : six nombres finis, |dét| ≥ 1e-12). */
const validMatrix = (m: Matrix): boolean => finite(...m) && Math.abs(det(m)) >= 1e-12;
const isIdentity = (m: Matrix): boolean => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
/** Échelle uniforme positive sans rotation : repliée dans la géométrie (taille de texte, épaisseur lisibles à l'édition). */
const uniform = (m: Matrix): number | null => (m[1] === 0 && m[2] === 0 && m[0] > 0 && Math.abs(m[0] - m[3]) <= 1e-6 * m[0] ? m[0] : null);

interface PageNotes {
  skipped: number;
  missing: number;
}
interface Ctx {
  readonly draft: CoreDocument;
  readonly page: string;
  readonly media: ReadonlyMap<string, Blob>;
  readonly assets: AssetStore;
  readonly decode: ImageDecoder;
  readonly notes: PageNotes;
}

/** D8b : une commande refusée malgré les contrôles compte comme objet illisible, jamais comme un échec du fichier. */
function run(ctx: Ctx, cmd: Command): Change | null {
  try {
    return ctx.draft.apply(cmd);
  } catch {
    ctx.notes.skipped++;
    return null;
  }
}

/** Pose `cmd`, puis compose `m` (Transform : m ∘ placement de la commande) ; matrice refusée : objet retiré, compté. */
function placed(ctx: Ctx, cmd: Command, m: Matrix | null): string[] {
  const ch = run(ctx, cmd);
  if (ch === null) return [];
  const ids = [...ch.ids];
  if (m === null || isIdentity(m) || ids.length === 0) return ids;
  if (run(ctx, { type: "Transform", ids, matrix: m }) !== null) return ids;
  try {
    ctx.draft.apply({ type: "Delete", ids });
  } catch {
    // déjà absent
  }
  return [];
}

async function placeImage(ctx: Ctx, o: Extract<BoardObject, { kind: "image" }>): Promise<string[]> {
  const kind = IMAGE_KIND_OF_EXT[extOf(o.path)];
  const blob = mediaOf(ctx.media, o.path);
  if (kind === undefined || blob === undefined) {
    ctx.notes.missing++;
    return [];
  }
  if (!validMatrix(o.m) || !finite(o.x, o.y) || !positive(o.w) || !positive(o.h)) {
    ctx.notes.skipped++;
    return [];
  }
  const mime = IMAGE_MIME[kind];
  const file = typed(blob, mime);
  let w: number;
  let h: number;
  try {
    const d = await ctx.decode(file, kind);
    w = d.w;
    h = d.h;
    d.bitmap.close();
  } catch {
    ctx.notes.skipped++;
    return [];
  }
  if (!positive(w) || !positive(h)) {
    ctx.notes.skipped++;
    return [];
  }
  const id = await ctx.assets.put(file);
  const asset: AssetRef = { id, name: o.path.slice(o.path.lastIndexOf("/") + 1), mime, size: file.size };
  return placed(ctx, { type: "AddImage", page: ctx.page, asset, w, h, matrix: composeMatrix(o.m, [o.w / w, 0, 0, o.h / h, o.x, o.y]) }, null);
}

/** Ids écrits pour `o` (tous les objets d'un groupe) ; un groupe de deux unités au moins devient `Group` (D13). */
async function place(ctx: Ctx, o: BoardObject): Promise<string[]> {
  switch (o.kind) {
    case "group": {
      const ids: string[] = [];
      let units = 0;
      for (const c of o.children) {
        const got = await place(ctx, c);
        if (got.length > 0) {
          ids.push(...got);
          units++;
        }
      }
      if (units >= 2) {
        try {
          ctx.draft.apply({ type: "Group", ids });
        } catch {
          // groupe refusé : les objets restent, seuls
        }
      }
      return ids;
    }
    case "shape": {
      if (!validMatrix(o.m) || !finite(o.x0, o.y0, o.x1, o.y1) || !positive(o.width)) {
        ctx.notes.skipped++;
        return [];
      }
      const s = uniform(o.m);
      const at = (x: number, y: number): [number, number] => (s === null ? [x, y] : applyMatrix(o.m, x, y));
      const [x0, y0] = at(o.x0, o.y0);
      const [x1, y1] = at(o.x1, o.y1);
      const style = { color: o.color, width: s === null ? o.width : o.width * s };
      return placed(ctx, { type: "AddShape", page: ctx.page, shape: o.shape, x0, y0, x1, y1, style, fill: o.fill }, s === null ? o.m : null);
    }
    case "stroke": {
      const p = o.points;
      if (!validMatrix(o.m) || p.length === 0 || p.length % 3 !== 0 || !p.every((v) => Number.isFinite(v)) || !positive(o.width)) {
        ctx.notes.skipped++;
        return [];
      }
      const world = new Float32Array(p.length);
      for (let i = 0; i < p.length; i += 3) {
        const [x, y] = applyMatrix(o.m, p[i]!, p[i + 1]!);
        world[i] = x;
        world[i + 1] = y;
        world[i + 2] = p[i + 2]!;
      }
      const style = { color: o.color, width: o.width * Math.sqrt(Math.abs(det(o.m))) };
      return placed(ctx, { type: "CommitStroke", page: ctx.page, points: world, style }, null);
    }
    case "text": {
      const content = o.spans.map((sp) => sp.text).join("");
      if (content === "") return [];
      if (!validMatrix(o.m) || !finite(o.x, o.y) || !positive(o.size) || !positive(o.boxWidth) || !positive(o.boxHeight)) {
        ctx.notes.skipped++;
        return [];
      }
      const s = uniform(o.m);
      const k = s ?? 1;
      const [x, y] = s === null ? [o.x, o.y] : applyMatrix(o.m, o.x, o.y);
      const spans: TextSpan[] = o.spans.map((sp) => (s === null || sp.attrs.size === undefined ? sp : { text: sp.text, attrs: { ...sp.attrs, size: sp.attrs.size * k } }));
      const cmd: Command = { type: "SetText", page: ctx.page, id: null, x, y, content, color: o.color, size: o.size * k, boxWidth: o.boxWidth * k, boxHeight: o.boxHeight * k, spans };
      return placed(ctx, cmd, s === null ? o.m : null);
    }
    case "image":
      return placeImage(ctx, o);
  }
}

/** D7 : document jetable, commandes existantes, puis copie sans historique ; avertissements D8b et images absentes. */
export async function buildBoardDocument(
  core: CoreFactory,
  pages: readonly BoardListPage[],
  media: ReadonlyMap<string, Blob>,
  deps: BoardBuildDeps,
): Promise<{ doc: CoreDocument; assets: AssetStore; warnings: string[] }> {
  const assets = deps.makeAssets();
  const draft = core.blank();
  const warnings: string[] = [];
  try {
    let page = draft.pageIds()[0];
    if (page === undefined) throw new Error("document vierge sans page");
    for (const [i, p] of pages.entries()) {
      if (i > 0) {
        const prev: string = page;
        draft.apply({ type: "AddPage", after: prev });
        const ids = draft.pageIds();
        page = ids[ids.indexOf(prev) + 1] ?? prev;
      }
      const notes: PageNotes = { skipped: 0, missing: 0 };
      const ctx: Ctx = { draft, page, media, assets, decode: deps.decode, notes };
      if (p.background !== null) run(ctx, { type: "Fill", page, target: { kind: "background" }, color: p.background });
      for (const o of p.objects) await place(ctx, o);
      if (notes.skipped > 0) warnings.push(skippedMessage(i + 1, notes.skipped));
      if (notes.missing > 0) warnings.push(missingImagesMessage(i + 1, notes.missing));
    }
    const [manifest, ybin] = draft.saveParts(deps.now, deps.appVersion);
    return { doc: core.loadParts(manifest, ybin), assets, warnings };
  } finally {
    draft.free();
  }
}
```

- [ ] **Étape 4 : la copie au format (suite du même fichier).**

```ts
/** D18 : ce que la copie n'écrit pas, compté par sorte ; ordre des avertissements = ordre de cette table. */
const EXPORT_LABELS: ReadonlyArray<readonly [string, string, string]> = [
  ["table", "tableau non exporté", "tableaux non exportés"],
  ["media", "vidéo ou son non exporté", "vidéos ou sons non exportés"],
  ["model3d", "objet 3D non exporté", "objets 3D non exportés"],
  ["fill", "zone remplie au pot non exportée", "zones remplies au pot non exportées"],
  ["unknown", "objet inconnu non exporté", "objets inconnus non exportés"],
  ["backdrop", "fond PDF non exporté", "fonds PDF non exportés"],
  ["params", "réglage d'image non exporté (image d'origine écrite)", "réglages d'image non exportés (images d'origine écrites)"],
  ["arrow", "flèche écrite en ligne (.ubz)", "flèches écrites en lignes (.ubz)"],
  ["outside", "objet hors du cadre (coordonnées négatives ou au-delà de 1 920)", "objets hors du cadre (coordonnées négatives ou au-delà de 1 920)"],
];
const EXT_OF_MIME: Readonly<Record<string, string>> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp", "image/svg+xml": "svg" };
const PARAM_KEYS = ["crop", "flipX", "flipY", "quarterTurns", "brightness", "contrast", "transparent"] as const;

function objectOf(
  doc: CoreDocument,
  el: ElementView,
  assets: Pick<AssetStore, "get">,
  files: Map<string, Blob>,
  add: (key: string) => void,
  format: BoardFormat,
): BoardObject | null {
  const m = el.transform;
  switch (el.kind) {
    case "stroke": {
      const pts = doc.points(el.id);
      if (pts === null) {
        add("unknown");
        return null;
      }
      return { kind: "stroke", m, color: el.style.color, width: el.style.width, points: Array.from(pts) };
    }
    case "shape":
      if (format === "ubz" && el.shape.shape === "arrow") add("arrow");
      return { kind: "shape", shape: el.shape.shape, m, x0: 0, y0: 0, x1: el.shape.w, y1: el.shape.h, color: el.style.color, width: el.style.width, fill: el.shape.fill };
    case "text":
      return { kind: "text", m, x: 0, y: 0, boxWidth: el.text.boxWidth, boxHeight: el.text.boxHeight, size: el.text.size, color: el.style.color, spans: el.text.spans };
    case "image": {
      const blob = assets.get(el.image.asset);
      if (blob === undefined) {
        add("unknown");
        return null;
      }
      const mime = blob.type !== "" ? blob.type : (doc.asset(el.image.asset)?.mime ?? "");
      const path = `images/${el.image.asset}.${EXT_OF_MIME[mime] ?? "bin"}`;
      files.set(path, blob);
      if (PARAM_KEYS.some((k) => el.image[k] !== undefined)) add("params");
      return { kind: "image", m, x: 0, y: 0, w: el.image.w, h: el.image.h, path };
    }
    case "table":
    case "media":
    case "model3d":
    case "fill":
    case "unknown":
      add(el.kind);
      return null;
  }
}

/** D18 : onglet → flux BoardList, images `images/<empreinte>.<ext>` (triées) et avertissements ; groupes rebâtis depuis
 *  `element.group` (extérieur d'abord). */
export async function boardListOf(doc: CoreDocument, assets: Pick<AssetStore, "get">, format: BoardFormat): Promise<{ list: BoardListData; files: ZipFile[]; warnings: string[] }> {
  const counts = new Map<string, number>();
  const add = (key: string): void => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  const files = new Map<string, Blob>();
  const pages: BoardListPage[] = [];
  for (const pid of doc.pageIds()) {
    const view = doc.page(pid);
    if (view?.backdrop) add("backdrop");
    const root: BoardObject[] = [];
    const levels: BoardObject[][] = [root];
    const open: string[] = [];
    const close = (): void => {
      const children = levels.pop()!;
      open.pop();
      levels.at(-1)!.push({ kind: "group", children });
    };
    for (const id of doc.elementIds(pid)) {
      const el = doc.element(id);
      if (el === null) {
        add("unknown");
        continue;
      }
      const o = objectOf(doc, el, assets, files, add, format);
      if (o === null) continue;
      const path = el.group ?? [];
      let k = 0;
      while (k < open.length && k < path.length && open[k] === path[k]) k++;
      while (open.length > k) close();
      for (const g of path.slice(k)) {
        open.push(g);
        levels.push([]);
      }
      levels.at(-1)!.push(o);
      const b = doc.bounds([id]);
      if (b !== null && (b.x0 < 0 || b.y0 < 0 || b.x1 > PAGE_WIDTH)) add("outside");
    }
    while (open.length > 0) close();
    const bg = view?.background ?? DEFAULT_BACKGROUND;
    pages.push({ background: bg.toLowerCase() === DEFAULT_BACKGROUND ? null : bg, objects: root });
  }
  const zipFiles: ZipFile[] = [];
  for (const path of [...files.keys()].sort()) zipFiles.push({ path, bytes: new Uint8Array(await files.get(path)!.arrayBuffer()) });
  const warnings = EXPORT_LABELS.filter(([key]) => counts.has(key)).map(([key, one, many]) => {
    const n = counts.get(key)!;
    return `${n} ${n > 1 ? many : one}`;
  });
  return { list: encodeBoardList(pages), files: zipFiles, warnings };
}
```

- [ ] **Étape 5 : tests verts.** Commande bornée. Si `fakeCore` range différemment l'id de la page ajoutée ou
  l'échelle d'une image, corriger le **code** pour suivre le comportement du cœur (le faux cœur le reproduit), jamais
  les valeurs attendues des tests W1.

- [ ] **Étape 6 : suite web et typage.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T5 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/ \
 && cd apps/web && nice -n 10 pnpm exec vitest run 2>&1 | tail -5 && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5
```

Attendu : aucun `FAIL` (dont `wasm-core.contract.test.ts`), `tsc` muet.

- [ ] **Étape 7 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T5 && git add apps/web/src/app/board-io.ts && git add apps/web/src/app/board-io.test.ts \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(web): BoardList stream to core commands and back (C13 DA2 D7 D8b D18)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties vitest et `tsc`, tout écart au code ci-dessus et sa raison, et les lignes :
`Réutilisation : appelé core/api.ts (saveParts, loadParts) selon workspace.ts:451`,
`Réutilisation : écart — BoardList ↔ commandes : nouveau module app/board-io.ts`,
`Réutilisation : appelé core/asset-store.ts (put)`, `Réutilisation : appelé app/container-io.ts (typed)`,
`Réutilisation : appelé platform/image-import.ts (ImageDecoder, IMAGE_MIME)`, `Réutilisation : appelé core/api.ts (PAGE_WIDTH)`.

<a id="tache-t6"></a>
### Tâche T6 — Liaison Wasm `BoardReader` / `write_board_xml` et Worker jetable des tableaux

**Objectif.** Exposer le lecteur et l'écrivain du module `formats` à la page (patron `ContainerReader`,
`write_pdf_pages`) et les servir dans un Worker jetable par tâche (patron `sheet-worker.ts`, `pdf-vector-worker.ts`) :
une panique Wasm ne touche jamais l'instance qui enregistre le `.roomboard` (HR6).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T6`.

**Fichiers.**
- Modifier : `crates/roomboard-formats-wasm/src/lib.rs` (imports, lignes 7-11 ; ajout après `write_pdf_pages`, ligne 191 ; tests à la fin).
- Modifier : `apps/web/src/platform/container.ts` (après `hasPixels`, ligne 93).
- Créer : `apps/web/src/platform/board-worker.ts`, `apps/web/src/platform/board-reader.ts`, `apps/web/src/platform/board-reader.test.ts`.

**Interfaces.**
- Consomme : `roomboard_formats::board::{read_svg, write_iwb, write_ubz_pages, ubz_metadata, BoardList, Dialect}` (T2 ; corps réels de T7 et T9) ; `runOnce`, `WorkerLike` (`apps/web/src/platform/one-shot-worker.ts:18`) ; `loadFormatsModule` (`apps/web/src/platform/container-load.ts`) ; `ZipFile` (`apps/web/src/platform/zip-read.ts:14`).
- Produit :
  - Rust : `#[wasm_bindgen] pub struct BoardReader` ; `BoardReader::open_inner(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, String>` ; `open(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, JsError>` ; `ops() -> Vec<f32>`, `texts() -> Vec<String>`, `warnings() -> Vec<String>` ; `pub fn write_board_xml_inner(ops: &[f32], texts: Vec<String>, format: &str) -> Result<Vec<String>, String>` ; `#[wasm_bindgen] pub fn write_board_xml(ops: &[f32], texts: Vec<String>, format: &str) -> Result<Vec<String>, JsError>` (rend `[chemin, xml, chemin, xml, …]` : `content.xml` pour `iwb` ; `page001.svg`, `page002.svg`, …, puis `metadata.rdf` pour `ubz`).
  - TS `container.ts` : `export interface BoardBinding { ops(): Float32Array; texts(): string[]; warnings(): string[]; free(): void }` ; `export interface BoardFormatsBinding extends FormatsBinding { readonly BoardReader: { open(xml: Uint8Array, dialect: string, firstPage: number): BoardBinding }; write_board_xml(ops: Float32Array, texts: string[], format: string): string[] }` ; `export function hasBoardReader(m: FormatsBinding): m is BoardFormatsBinding`.
  - TS `board-reader.ts` : `export type BoardDialect = "iwb" | "ubz"` ; `BOARD_WORKER_TIMEOUT_MS = 60_000` ; `BOARD_FAILED_MESSAGE = "lecture du tableau interrompue"` ; `BOARD_WRITE_FAILED_MESSAGE = "écriture du tableau interrompue"` ; `BOARD_OBJECTS_MESSAGE` ; `export function boardErrorMessage(err: unknown, failure: string): string` ; `export interface BoardPart { readonly ops: Float32Array; readonly texts: readonly string[]; readonly warnings: readonly string[] }` ; `export function checkBoardParts(d: unknown): BoardPart[]` ; `export function checkBoardFiles(d: unknown): ZipFile[]` ; `export interface BoardCodec { read(files: readonly Uint8Array[], dialect: BoardDialect): Promise<BoardPart[]>; write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardDialect): Promise<ZipFile[]> }` ; `export function createBoardCodec(spawn: () => WorkerLike, timeoutMs?: number): BoardCodec` (T12 le branche ; son type répond par structure à `BoardPorts.read|write` de `app/board-io.ts`).
  - Messages du Worker : `{ op: "read", dialect, files: Uint8Array[] }` → `{ parts }` ou `{ error }` ; `{ op: "write", format, ops, texts }` → `{ files }` ou `{ error }`.
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:14` (`ContainerReader`) et `:137` (`write_pdf_pages`) — même forme `open_inner` / `open`, fonction `_inner` sans `JsValue` seule testée en natif (étendu).
- Réutilise : `apps/web/src/platform/one-shot-worker.ts:18`, `apps/web/src/platform/sheet-worker.ts`, `apps/web/src/platform/container-load.ts` — `runOnce(spawn, message, transfer, timeoutMs, check, failure)` et `loadFormatsModule()`.

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T6 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats-wasm board 2>&1 | grep -E "^test |^test result|FAILED|error\[" | tail -8 \
 && pnpm install --frozen-lockfile >/dev/null && cd apps/web && nice -n 10 pnpm exec vitest run src/platform/board-reader.test.ts 2>&1 | tail -6
```

Motif : Rust `test result: ok` avec N ≥ 3 et `board_reader_open_inner_refuses_unknown_dialect` présent ; vitest
`Tests  N passed` avec N ≥ 6. Tests à garder verts : tous ceux de `crates/roomboard-formats-wasm` (conteneur, PDF,
classeur, pixels) — `cargo test -p roomboard-formats-wasm 2>&1 | grep "^test result"`.

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : principal 1 572 864 o, `formats` 3 145 728 o ; aucun troisième module Wasm (la liaison va dans `roomboard-formats-wasm`).
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC5 — Une panique Wasm reste dans le Worker jetable (`runOnce` l'arrête), jamais dans l'instance de la page.
- GC8 — `crates/roomboard-core/**`, `crates/roomboard-wasm/**` intouchés. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` ; avant `tsc`, copier `apps/web/src/wasm` et `apps/web/src/wasm-formats` du worktree du chantier (jamais commités).

**Interdits.** Écrire le lecteur ou l'écrivain (T7, T9) ; câbler `main.ts` (T12) ; faire résoudre `board-worker.ts` ou
`src/wasm-formats/` par un test.

**Terminé quand.** Tests Rust et TS verts, clippy et `tsc` propres, taille notée, un commit.

**Étapes.**

- [ ] **Étape 1 : tests Rust rouges.** À la fin du module `tests` de `crates/roomboard-formats-wasm/src/lib.rs`
  (avant sa dernière accolade) :

```rust
    #[test]
    fn board_reader_open_inner_refuses_unknown_dialect() {
        let e = BoardReader::open_inner(b"<svg/>", "pdf", 1).err().expect("refus");
        assert_eq!(e, "format de tableau inconnu : pdf");
    }

    #[test]
    fn board_reader_open_inner_says_broken_files_in_french() {
        let e = BoardReader::open_inner(b"<iwb><svg:svg", "iwb", 1).err().expect("refus");
        assert!(e.starts_with("fichier endommagé : "), "{e}");
    }

    #[test]
    fn board_write_inner_refuses_bad_lists_and_unknown_formats() {
        let e = write_board_xml_inner(&[9.0], Vec::new(), "iwb").err().expect("refus");
        assert!(e.starts_with("liste de tableau invalide : "), "{e}");
        let e = write_board_xml_inner(&[1.0], Vec::new(), "pdf").err().expect("refus");
        assert_eq!(e, "format de tableau inconnu : pdf");
    }
```

- [ ] **Étape 2 : la liaison.** Ajouter aux imports : `use roomboard_formats::board::{self, BoardList, Dialect};`, puis
  après `write_pdf_pages` :

```rust
/// Tableau lu (C13, D1, D6) : flux BoardList d'un `content.xml`, d'un `.iwb` en SVG brut ou d'une page `.ubz`.
#[wasm_bindgen]
pub struct BoardReader {
    list: BoardList,
}

fn dialect_of(s: &str) -> Result<Dialect, String> {
    Dialect::parse(s).ok_or_else(|| format!("format de tableau inconnu : {s}"))
}

impl BoardReader {
    /// `board::read_svg` ; le message d'erreur est le `Display` de `BoardError`.
    pub fn open_inner(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, String> {
        let d = dialect_of(dialect)?;
        board::read_svg(xml, d, first_page).map(|list| BoardReader { list }).map_err(|e| e.to_string())
    }
}

#[wasm_bindgen]
impl BoardReader {
    /// Lève une Error : « fichier endommagé : … », « fichier de tableau trop gros (plus de 100 000 objets) »,
    /// « format de tableau inconnu : … ».
    pub fn open(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, JsError> {
        Self::open_inner(xml, dialect, first_page).map_err(|m| JsError::new(&m))
    }
    pub fn ops(&self) -> Vec<f32> {
        self.list.ops.clone()
    }
    pub fn texts(&self) -> Vec<String> {
        self.list.texts.clone()
    }
    pub fn warnings(&self) -> Vec<String> {
        self.list.warnings.clone()
    }
}

/// Copie au format (C13, D18) : `[chemin, xml, …]` ; `iwb` : `content.xml` ; `ubz` : `page001.svg`… puis `metadata.rdf`.
pub fn write_board_xml_inner(ops: &[f32], texts: Vec<String>, format: &str) -> Result<Vec<String>, String> {
    let d = dialect_of(format)?;
    let list = BoardList { ops: ops.to_vec(), texts, warnings: Vec::new() };
    match d {
        Dialect::Iwb => Ok(vec!["content.xml".to_string(), board::write_iwb(&list).map_err(|e| e.to_string())?]),
        Dialect::Ubz => {
            let pages = board::write_ubz_pages(&list).map_err(|e| e.to_string())?;
            let mut out = Vec::with_capacity(2 * pages.len() + 2);
            for (i, xml) in pages.iter().enumerate() {
                out.push(format!("page{:03}.svg", i + 1));
                out.push(xml.clone());
            }
            out.push("metadata.rdf".to_string());
            out.push(board::ubz_metadata(pages.len()));
            Ok(out)
        }
    }
}

/// Lève une Error au message de `BoardError` (« liste de tableau invalide : … ») ou « format de tableau inconnu : … ».
#[wasm_bindgen]
pub fn write_board_xml(ops: &[f32], texts: Vec<String>, format: &str) -> Result<Vec<String>, JsError> {
    write_board_xml_inner(ops, texts, format).map_err(|m| JsError::new(&m))
}
```

Compléter le commentaire de tête du fichier par la ligne :
`//! C13 (DA2) : tableaux `.iwb` et `.ubz` (`BoardReader`, `write_board_xml`), lus et écrits dans un Worker jetable.`

Le second test passe aussi avec le corps d'attente de `read_svg` (« fichier endommagé : lecteur non branché ») et avec
le vrai lecteur de T7 (« fichier endommagé : XML mal formé … »).

- [ ] **Étape 3 : tests TS rouges.** Créer `apps/web/src/platform/board-reader.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { BOARD_FAILED_MESSAGE, BOARD_OBJECTS_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardErrorMessage, checkBoardFiles, checkBoardParts, createBoardCodec } from "./board-reader";
import type { WorkerLike } from "./one-shot-worker";

function fakeWorker(reply: (m: unknown) => unknown, sent: unknown[] = [], transfers: Transferable[][] = []): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(m, t) {
      sent.push(m);
      transfers.push(t);
      queueMicrotask(() => w.onmessage?.({ data: reply(m) }));
    },
    terminate() {},
  };
  return w;
}

describe("Worker des tableaux (C13, D1, D6)", () => {
  it("C13 : read envoie { op: \"read\", dialect, files } transférés et rend les parties contrôlées", async () => {
    const sent: unknown[] = [];
    const transfers: Transferable[][] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: new Float32Array([1]), texts: [], warnings: ["page 1 : 1 vidéo non lue"] }] }), sent, transfers));
    const parts = await codec.read([new Uint8Array([60, 105])], "iwb");
    expect(sent[0]).toMatchObject({ op: "read", dialect: "iwb" });
    expect(transfers[0]).toHaveLength(1);
    expect(parts[0]!.warnings).toEqual(["page 1 : 1 vidéo non lue"]);
    expect(Array.from(parts[0]!.ops)).toEqual([1]);
  });

  it("C13 : write envoie { op: \"write\", format, ops, texts } et rend les fichiers en octets UTF-8", async () => {
    const sent: unknown[] = [];
    const codec = createBoardCodec(() => fakeWorker(() => ({ files: ["content.xml", "<iwb>é</iwb>"] }), sent));
    const files = await codec.write({ ops: new Float32Array([1]), texts: ["a"] }, "iwb");
    expect(sent[0]).toMatchObject({ op: "write", format: "iwb", texts: ["a"] });
    expect(files.map((f) => [f.path, new TextDecoder().decode(f.bytes)])).toEqual([["content.xml", "<iwb>é</iwb>"]]);
  });

  it("C13 : { error } du Worker rendu tel quel ; réponse mal formée : « lecture du tableau interrompue »", async () => {
    const broken = createBoardCodec(() => fakeWorker(() => ({ error: "fichier endommagé : XML mal formé" })));
    await expect(broken.read([new Uint8Array([1])], "iwb")).rejects.toThrow("fichier endommagé : XML mal formé");
    const odd = createBoardCodec(() => fakeWorker(() => ({ parts: [{ ops: [1], texts: [], warnings: [] }] })));
    await expect(odd.read([new Uint8Array([1])], "ubz")).rejects.toThrow(BOARD_FAILED_MESSAGE);
  });

  it("C13 : délai sans réponse : rejet, puis arrêt du Worker", async () => {
    let stopped = 0;
    const silent: WorkerLike = { onmessage: null, onerror: null, postMessage() {}, terminate() { stopped++; } };
    await expect(createBoardCodec(() => silent, 10).write({ ops: new Float32Array(), texts: [] }, "ubz")).rejects.toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(stopped).toBe(1);
  });

  it("C13 : boardErrorMessage garde les messages du module, remplace une panique Wasm", () => {
    expect(boardErrorMessage(new Error("fichier endommagé : cadre de page invalide"), BOARD_FAILED_MESSAGE)).toBe("fichier endommagé : cadre de page invalide");
    expect(boardErrorMessage(new Error(BOARD_OBJECTS_MESSAGE), BOARD_FAILED_MESSAGE)).toBe(BOARD_OBJECTS_MESSAGE);
    expect(boardErrorMessage(new Error("liste de tableau invalide : code inconnu 9 à 0"), BOARD_WRITE_FAILED_MESSAGE)).toBe("liste de tableau invalide : code inconnu 9 à 0");
    expect(boardErrorMessage(new Error("unreachable"), BOARD_FAILED_MESSAGE)).toBe(BOARD_FAILED_MESSAGE);
    expect(boardErrorMessage(42, BOARD_WRITE_FAILED_MESSAGE)).toBe(BOARD_WRITE_FAILED_MESSAGE);
  });

  it("C13 : checkBoardParts et checkBoardFiles refusent les formes inattendues", () => {
    expect(() => checkBoardParts({ parts: "x" })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardParts({ parts: [{ ops: new Float32Array(), texts: [1], warnings: [] }] })).toThrow(BOARD_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: ["content.xml"] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
    expect(() => checkBoardFiles({ files: [1, 2] })).toThrow(BOARD_WRITE_FAILED_MESSAGE);
  });
});
```

- [ ] **Étape 4 : `container.ts`.** Après `hasPixels` :

```ts
/** Forme du lecteur de tableaux généré par wasm-bindgen (`BoardReader` de `roomboard-formats-wasm`, C13). */
export interface BoardBinding {
  ops(): Float32Array;
  texts(): string[];
  warnings(): string[];
  free(): void;
}

/** Module `formats` avec les tableaux `.iwb` et `.ubz` (C13, DA2) : servi seulement dans `board-worker.ts`. */
export interface BoardFormatsBinding extends FormatsBinding {
  readonly BoardReader: { open(xml: Uint8Array, dialect: string, firstPage: number): BoardBinding };
  write_board_xml(ops: Float32Array, texts: string[], format: string): string[];
}

/** Vrai si le module chargé expose le lecteur et l'écrivain des tableaux (module construit après C13). */
export function hasBoardReader(m: FormatsBinding): m is BoardFormatsBinding {
  const b = m as Partial<BoardFormatsBinding>;
  return typeof b.BoardReader?.open === "function" && typeof b.write_board_xml === "function";
}
```

- [ ] **Étape 5 : `board-reader.ts`.**

```ts
/**
 * Lecture et écriture des tableaux `.iwb` et `.ubz` hors de l'instance qui enregistre (C13, D1, D6, DAB4) : un Worker
 * jetable par tâche (`runOnce`) charge sa propre instance du module `formats`, lit les XML en flux BoardList
 * (`BoardReader`) ou écrit les XML d'une copie (`write_board_xml`), répond, puis est arrêté — après la réponse, après
 * `onerror`, ou au bout de `BOARD_WORKER_TIMEOUT_MS`. Une panique Wasm revient en `BOARD_FAILED_MESSAGE` (ou
 * `BOARD_WRITE_FAILED_MESSAGE`) et ne touche jamais l'instance de la page (HR6). Créé par l'amorce (`main.ts`) : aucun
 * test ne résout `board-worker.ts` ni `src/wasm-formats/`.
 */
import { runOnce, type WorkerLike } from "./one-shot-worker";
import type { ZipFile } from "./zip-read";

export type BoardDialect = "iwb" | "ubz";
export const BOARD_WORKER_TIMEOUT_MS = 60_000;
export const BOARD_FAILED_MESSAGE = "lecture du tableau interrompue";
export const BOARD_WRITE_FAILED_MESSAGE = "écriture du tableau interrompue";
/** `BoardError::TooBig` (`board.rs`). */
export const BOARD_OBJECTS_MESSAGE = "fichier de tableau trop gros (plus de 100 000 objets)";
/** Débuts des messages de `BoardError` et de la liaison, rendus tels quels. */
const KNOWN_PREFIXES = ["fichier endommagé : ", "liste de tableau invalide : ", "format de tableau inconnu : "] as const;

/** Message rendu par le Worker : un message du module connu tel quel ; toute autre erreur (panique Wasm, module absent) : `failure`. */
export function boardErrorMessage(err: unknown, failure: string): string {
  const m = err instanceof Error ? err.message : typeof err === "string" ? err : null;
  if (m === null) return failure;
  return m === BOARD_OBJECTS_MESSAGE || KNOWN_PREFIXES.some((p) => m.startsWith(p)) ? m : failure;
}

export interface BoardPart {
  readonly ops: Float32Array;
  readonly texts: readonly string[];
  readonly warnings: readonly string[];
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** Réponse à `{ op: "read" }` : `{ error }` rendu tel quel ; toute autre forme que `{ parts: [{ ops, texts, warnings }] }` lève. */
export function checkBoardParts(d: unknown): BoardPart[] {
  const r = d as { parts?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  const parts = r?.parts;
  if (!Array.isArray(parts)) throw new Error(BOARD_FAILED_MESSAGE);
  return parts.map((p: unknown) => {
    const x = p as { ops?: unknown; texts?: unknown; warnings?: unknown } | null;
    const ops = x?.ops;
    const texts = x?.texts;
    const warnings = x?.warnings;
    if (!(ops instanceof Float32Array) || !isStrings(texts) || !isStrings(warnings)) throw new Error(BOARD_FAILED_MESSAGE);
    return { ops, texts, warnings };
  });
}

/** Réponse à `{ op: "write" }` : `[chemin, xml, …]` → fichiers en UTF-8 ; toute autre forme lève. */
export function checkBoardFiles(d: unknown): ZipFile[] {
  const r = d as { files?: unknown; error?: unknown } | null;
  if (typeof r?.error === "string") throw new Error(r.error);
  const files = r?.files;
  if (!isStrings(files) || files.length % 2 !== 0) throw new Error(BOARD_WRITE_FAILED_MESSAGE);
  const enc = new TextEncoder();
  const out: ZipFile[] = [];
  for (let i = 0; i < files.length; i += 2) out.push({ path: files[i]!, bytes: enc.encode(files[i + 1]!) });
  return out;
}

export interface BoardCodec {
  read(files: readonly Uint8Array[], dialect: BoardDialect): Promise<BoardPart[]>;
  write(list: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardDialect): Promise<ZipFile[]>;
}

/** Un Worker neuf par tâche, jamais gardé ; les octets sont copiés puis transférés (les tampons de l'appelant restent). */
export function createBoardCodec(spawn: () => WorkerLike, timeoutMs = BOARD_WORKER_TIMEOUT_MS): BoardCodec {
  return {
    read(files, dialect) {
      const copies = files.map((f) => f.slice());
      return runOnce(spawn, { op: "read", dialect, files: copies }, copies.map((c) => c.buffer as ArrayBuffer), timeoutMs, checkBoardParts, BOARD_FAILED_MESSAGE);
    },
    write(list, format) {
      const ops = list.ops.slice();
      return runOnce(spawn, { op: "write", format, ops, texts: [...list.texts] }, [ops.buffer as ArrayBuffer], timeoutMs, checkBoardFiles, BOARD_WRITE_FAILED_MESSAGE);
    },
  };
}
```

- [ ] **Étape 6 : `board-worker.ts`.**

```ts
/**
 * Entrée du Worker des tableaux (C13, D1, D6) : sa propre instance du module `formats`, une réponse `{ parts }`,
 * `{ files }` ou `{ error }`, puis arrêté par `runOnce` (`board-reader.ts`). Une panique Wasm arrive en `RuntimeError`
 * et devient le message d'échec (`boardErrorMessage`). Pages `.ubz` : une par fichier, numérotées dans l'ordre reçu
 * pour leurs avertissements. Créé par `main.ts`, jamais par un test.
 */
import { BOARD_FAILED_MESSAGE, BOARD_WRITE_FAILED_MESSAGE, boardErrorMessage, type BoardDialect } from "./board-reader";
import { hasBoardReader } from "./container";
import { loadFormatsModule } from "./container-load";

type Job =
  | { readonly op: "read"; readonly dialect: BoardDialect; readonly files: readonly Uint8Array[] }
  | { readonly op: "write"; readonly format: BoardDialect; readonly ops: Float32Array; readonly texts: string[] };

self.onmessage = async (e: MessageEvent<Job>): Promise<void> => {
  const j = e.data;
  try {
    const mod = await loadFormatsModule();
    if (!hasBoardReader(mod)) throw new Error("module des tableaux indisponible");
    if (j.op === "write") {
      self.postMessage({ files: mod.write_board_xml(j.ops, j.texts, j.format) });
      return;
    }
    const parts = j.files.map((xml, i) => {
      const r = mod.BoardReader.open(xml, j.dialect, j.dialect === "ubz" ? i + 1 : 1);
      try {
        return { ops: r.ops(), texts: r.texts(), warnings: r.warnings() };
      } finally {
        r.free();
      }
    });
    self.postMessage({ parts }, { transfer: parts.map((p) => p.ops.buffer as ArrayBuffer) });
  } catch (err) {
    self.postMessage({ error: boardErrorMessage(err, j.op === "write" ? BOARD_WRITE_FAILED_MESSAGE : BOARD_FAILED_MESSAGE) });
  }
};
```

- [ ] **Étape 7 : tests verts, clippy, typage, taille.** Commande bornée, puis :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T6 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo fmt --all --check && nice -n 10 cargo clippy -p roomboard-formats-wasm --all-targets -- -D warnings 2>&1 | tail -3 \
 && cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/ \
 && (cd apps/web && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5) \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf /tmp/c13-T6-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T6-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && wc -c < /tmp/c13-T6-formats/roomboard_formats_wasm_bg.wasm && grep -c "write_board_xml\|BoardReader" /tmp/c13-T6-formats/roomboard_formats_wasm.js
```

Attendu : clippy et `tsc` muets ; taille ≤ 3 145 728 ; le `grep -c` ≥ 2 (symboles présents dans le JS généré).
`tsc` vérifie `board-worker.ts` contre le `.d.ts` copié (ancien module, sans `BoardReader`) : le garde
`hasBoardReader` rend le typage indépendant de ce `.d.ts`.

- [ ] **Étape 8 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T6 && git add crates/roomboard-formats-wasm/src/lib.rs \
 && git add apps/web/src/platform/container.ts && git add apps/web/src/platform/board-reader.ts \
 && git add apps/web/src/platform/board-reader.test.ts && git add apps/web/src/platform/board-worker.ts \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat: wasm binding and one-shot worker for whiteboard files (C13 D1 D6)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties des tests, taille `formats`, résultat du `grep`, et les lignes :
`Réutilisation : appelé crates/roomboard-formats-wasm/src/lib.rs (patron ContainerReader, write_pdf_pages)`,
`Réutilisation : appelé platform/one-shot-worker.ts (runOnce) et platform/container-load.ts (loadFormatsModule)`.

<a id="tache-t7"></a>
### Tâche T7 — Lecteur SVG commun `read_svg` (IWB et pages OpenBoard)

**Objectif.** Remplacer le corps d'attente de `read_svg` (T2) par le lecteur : arbre `quick-xml` (aucune DTD ni entité
externe résolue), cadre et échelle (D8), formes (D9), polylignes et polygones (D10), texte (D11, HTML de Qt délégué à
`read_qt_html` de T8), images locales (D12), groupes `svg:g` et `iwb:group` (D13), fond (D14), avertissements par
sorte et par page (D15), sécurité et bornes (D16), trait à pression d'OpenBoard (HU1-1).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T7` (branche à jour de T1 et T2).

**Fichiers.**
- Modifier (remplacer en entier) : `crates/roomboard-formats/src/board/read.rs`.

**Interfaces.**
- Consomme (T2, `crates/roomboard-formats/src/board.rs`) : `BoardList`, `BoardError::{Broken, TooBig}`, `Dialect`, `Item`, `Page`, `Span`, `ShapeKind`, `Mat`, `Rgb`, `IDENTITY`, `MAX_OBJECTS`, `MAX_PAGES`, `PAGE_WIDTH`, `compose`, `apply`, `encode` ; `board::fixtures` (tests) ; `read_qt_html(html: &str) -> QtText` de `board/qt_html.rs` (corps de T8 ; le corps d'attente rend un texte vide) ; `crate::pdf::ASCENT` (0,905).
- Produit : `pub fn read_svg(xml: &[u8], dialect: Dialect, first_page: u32) -> Result<BoardList, BoardError>` (signature de T2, inchangée). Avertissements : `"page {p} : {n} {libellé}"`, ou `"{n} {libellé}"` pour le document entier ; `"500 premières pages importées sur {total}"` en tête au-delà de 500 pages.
- Réutilise : `quick-xml` (déjà lié par `calamine`) — `Reader::from_str(&str)`, `read_event()`, `Attribute::normalized_value(XmlVersion::Explicit1_0)`, `BytesRef::is_char_ref` / `resolve_char_ref`.

**Patron à ne pas reprendre.** (1) Faire échouer tout le fichier sur un attribut illisible (`normalized_value` rend
`Err` pour `&e;`) : D16 veut sauter **son objet** et le compter. (2) Résoudre ou suivre un `DOCTYPE` : il est seulement
compté. (3) Appliquer `iwb:element` et `iwb:group` en lisant les pages au fil de l'eau : ils viennent **après** les
pages dans les fichiers réels ; d'où l'arbre lu d'abord, puis le parcours. Référence du contrôle avant usage :
`crates/roomboard-formats/src/pdf.rs:193` (`parse` valide tout avant d'ouvrir une page).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T7 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats board::read 2>&1 | grep -E "^test |^test result|FAILED|panicked|error\[" | tail -25
```

Motif : `test result: ok` avec N ≥ 17 ; lignes `doctype_and_external_entity_are_never_resolved ... ok`,
`iwb_refs_after_pages_group_and_flags ... ok`, `text_whitespace_cdata_tbreak_and_baseline ... ok`,
`colors_of_the_suite ... ok`, `repeated_attribute_first_wins ... ok`. Tests à garder verts : `cargo test -p roomboard-formats 2>&1 | grep "^test result"` (PDF, classeur, conteneur, pixels, `board::tests`).

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : principal 1 572 864 o, `formats` 3 145 728 o ; aucun troisième module Wasm.
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC5 — Sécurité : aucun script exécuté (rien ne sort d'ici que la liste), aucune entité externe ni DTD résolue, bornes U26 (100 000 objets : refus ; 500 pages : les premières, avis) ; un test par cas.
- GC6 — Aucune adresse distante suivie : une image `http(s):`, `data:`, `file:`, absolue ou avec `..` devient un avertissement.
- GC7 — Fixtures écrites dans les tests ; les exemples de `~/telechargements-roomboard/` ne sont ni lus ni recopiés ici.
- GC8 — `crates/roomboard-core/**`, `crates/roomboard-wasm/**` intouchés. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve ; OpenBoard (GPL) lu pour comprendre, jamais copié.
- GC10 — Avertissements en français.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree.

**Interdits.** Toucher `board.rs`, `write.rs`, `qt_html.rs` (T2, T9, T8) ; ajouter une dépendance ; rendre du SVG ou du
HTML au navigateur.

**Terminé quand.** 18 tests verts, tous les tests du crate verts, clippy et fmt propres, taille notée (≤ 3 145 728 o
avec le réglage de T1), un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Écrire le module de tests (fin du fichier, ci-dessous) avec la signature d'attente
  encore en place : la commande bornée doit montrer `FAILED` (« lecteur non branché »).

- [ ] **Étape 2 : écrire `crates/roomboard-formats/src/board/read.rs` en entier.**

```rust
//! Lecteur SVG commun (C13, D1, D8 à D16) : `content.xml` IWB, `.iwb` en SVG brut, pages `pageNNN.svg` d'OpenBoard,
//! lus en flux BoardList. Deux temps : un arbre par `quick-xml` (aucune DTD ni entité externe résolue, D16), puis le
//! parcours des pages (cadre D8, formes D9, traits D10, texte D11, images D12, groupes D13, fond D14), car les
//! `iwb:element` et `iwb:group` suivent les pages. Ce qui n'est pas lu devient un avertissement par sorte et par page
//! (D15, U2). Aucun script, aucun attribut `on*` n'est rendu : seule la liste sort d'ici.
use std::collections::{BTreeMap, HashMap};

use quick_xml::events::{BytesStart, Event};
use quick_xml::{Reader, XmlVersion};

use super::qt_html::read_qt_html;
use super::{apply, compose, encode, BoardError, BoardList, Dialect, Item, Mat, Page, Rgb, ShapeKind, Span, IDENTITY, MAX_OBJECTS, MAX_PAGES, PAGE_WIDTH};
use crate::pdf::ASCENT;

const BLACK: Rgb = [0, 0, 0];
const DEFAULT_SIZE: f32 = 16.0;
const MAX_DEPTH: usize = 256;
const BAD_FRAME: &str = "cadre de page invalide";
/// Saut de ligne interne (`tbreak`) : jamais repris par la réduction des blancs.
const LINE: char = '\u{2028}';
const IMAGE_EXTS: [&str; 7] = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];
const AUDIO_EXTS: [&str; 5] = ["wav", "mp3", "ogg", "oga", "m4a"];

fn broken(m: &str) -> BoardError {
    BoardError::Broken(m.to_string())
}

/// Sortes d'avertissements (D15) ; l'ordre de l'énumération est l'ordre de la liste pour une même page.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Sort {
    Doctype,
    Entity,
    Metadata,
    Script,
    Video,
    Audio,
    Flash,
    Widget,
    Link,
    Locked,
    Revealer,
    Container,
    Replicate,
    Ruler,
    Compass,
    Curtain,
    Axes,
    Rounded,
    PolygonFill,
    TextAlign,
    TextReduced,
    RemoteImage,
    ImageFormat,
    HtmlObject,
    UnknownObject,
    BackgroundObject,
    Unreadable,
}

const LABELS: [(Sort, &str, &str); 27] = [
    (Sort::Doctype, "déclaration DOCTYPE ignorée", "déclarations DOCTYPE ignorées"),
    (Sort::Entity, "entité inconnue ignorée", "entités inconnues ignorées"),
    (Sort::Metadata, "bloc de métadonnées non lu", "blocs de métadonnées non lus"),
    (Sort::Script, "script ignoré", "scripts ignorés"),
    (Sort::Video, "vidéo non lue", "vidéos non lues"),
    (Sort::Audio, "son non lu", "sons non lus"),
    (Sort::Flash, "animation Flash non lue", "animations Flash non lues"),
    (Sort::Widget, "widget non lu", "widgets non lus"),
    (Sort::Link, "lien perdu (contenu lu)", "liens perdus (contenu lu)"),
    (Sort::Locked, "verrou non lu", "verrous non lus"),
    (Sort::Revealer, "révélateur non lu", "révélateurs non lus"),
    (Sort::Container, "conteneur non lu", "conteneurs non lus"),
    (Sort::Replicate, "duplicateur non lu", "duplicateurs non lus"),
    (Sort::Ruler, "règle non lue", "règles non lues"),
    (Sort::Compass, "compas non lu", "compas non lus"),
    (Sort::Curtain, "rideau non lu", "rideaux non lus"),
    (Sort::Axes, "repère d'axes non lu", "repères d'axes non lus"),
    (Sort::Rounded, "rectangle dont les coins arrondis ne sont pas lus", "rectangles dont les coins arrondis ne sont pas lus"),
    (Sort::PolygonFill, "remplissage de polygone non lu", "remplissages de polygones non lus"),
    (Sort::TextAlign, "alignement de texte non lu", "alignements de texte non lus"),
    (Sort::TextReduced, "mise en forme de texte réduite", "mises en forme de texte réduites"),
    (Sort::RemoteImage, "image distante ou hors de l'archive non chargée", "images distantes ou hors de l'archive non chargées"),
    (Sort::ImageFormat, "image d'un format non lu (EMF, WMF…)", "images d'un format non lu (EMF, WMF…)"),
    (Sort::HtmlObject, "objet HTML non lu", "objets HTML non lus"),
    (Sort::UnknownObject, "objet d'un type non lu", "objets d'un type non lu"),
    (Sort::BackgroundObject, "objet de fond gardé comme objet", "objets de fond gardés comme objets"),
    (Sort::Unreadable, "objet illisible ignoré", "objets illisibles ignorés"),
];

fn label(sort: Sort, n: u32) -> &'static str {
    let &(_, one, many) = LABELS.iter().find(|(s, _, _)| *s == sort).expect("chaque sorte a son libellé");
    if n == 1 {
        one
    } else {
        many
    }
}

/// Avertissements comptés par (page, sorte) ; page 0 : le document entier.
#[derive(Default)]
struct Notes {
    counts: BTreeMap<(u32, Sort), u32>,
}

impl Notes {
    fn add(&mut self, page: u32, sort: Sort) {
        *self.counts.entry((page, sort)).or_insert(0) += 1;
    }
    fn lines(&self) -> Vec<String> {
        self.counts
            .iter()
            .map(|(&(page, sort), &n)| if page == 0 { format!("{n} {}", label(sort, n)) } else { format!("page {page} : {n} {}", label(sort, n)) })
            .collect()
    }
}

#[derive(Debug, Default)]
struct Node {
    /// Nom local (sans préfixe) : `svg:rect` et `rect` se lisent pareil (Becta, 1EdTech, OpenBoard).
    name: String,
    /// Attributs par nom local ; un attribut répété garde sa première valeur.
    attrs: Vec<(String, String)>,
    /// Un attribut illisible (entité inconnue, attribut mal formé) : l'objet est sauté et compté (D16).
    bad: bool,
    children: Vec<Child>,
}

#[derive(Debug)]
enum Child {
    Node(Node),
    Text(String),
}

impl Node {
    fn attr(&self, k: &str) -> Option<&str> {
        self.attrs.iter().find(|(n, _)| n == k).map(|(_, v)| v.as_str())
    }
    fn nodes(&self) -> impl Iterator<Item = &Node> {
        self.children.iter().filter_map(|c| match c {
            Child::Node(n) => Some(n),
            Child::Text(_) => None,
        })
    }
}

fn node_of(e: &BytesStart<'_>) -> Node {
    let local = e.local_name();
    let name: &str = local.as_ref();
    let mut n = Node { name: name.to_string(), ..Node::default() };
    let mut attrs = e.attributes();
    attrs.with_checks(false);
    for a in attrs {
        let Ok(a) = a else {
            n.bad = true;
            continue;
        };
        let key_local = a.key.local_name();
        let key: &str = key_local.as_ref();
        let key = key.to_string();
        match a.normalized_value(XmlVersion::Explicit1_0) {
            Ok(v) => {
                if n.attr(&key).is_none() {
                    n.attrs.push((key, v.into_owned()));
                }
            }
            Err(_) => n.bad = true,
        }
    }
    n
}

fn add_child(stack: &mut [Node], child: Child) {
    if let Some(top) = stack.last_mut() {
        top.children.push(child);
    }
}

fn add_text(stack: &mut [Node], s: &str) {
    if s.is_empty() {
        return;
    }
    if let Some(top) = stack.last_mut() {
        if let Some(Child::Text(t)) = top.children.last_mut() {
            t.push_str(s);
        } else {
            top.children.push(Child::Text(s.to_string()));
        }
    }
}

fn predefined(name: &str) -> Option<&'static str> {
    match name {
        "lt" => Some("<"),
        "gt" => Some(">"),
        "amp" => Some("&"),
        "quot" => Some("\""),
        "apos" => Some("'"),
        _ => None,
    }
}

/// Arbre du document ; XML mal formé (balise fermée par une autre, comme `rectangle2.iwb`) : refus du fichier.
fn parse_tree(text: &str, notes: &mut Notes) -> Result<Node, BoardError> {
    let mut reader = Reader::from_str(text);
    let mut stack: Vec<Node> = vec![Node::default()];
    loop {
        match reader.read_event().map_err(|e| broken(&format!("XML mal formé ({e})")))? {
            Event::Start(e) => {
                if stack.len() > MAX_DEPTH {
                    return Err(broken("imbrication trop profonde"));
                }
                stack.push(node_of(&e));
            }
            Event::Empty(e) => {
                let n = node_of(&e);
                add_child(&mut stack, Child::Node(n));
            }
            Event::End(_) => {
                let n = stack.pop().ok_or_else(|| broken("balise fermante en trop"))?;
                if stack.is_empty() {
                    return Err(broken("balise fermante en trop"));
                }
                add_child(&mut stack, Child::Node(n));
            }
            Event::Text(t) => add_text(&mut stack, &t.xml10_content()),
            Event::CData(t) => add_text(&mut stack, &t.xml10_content()),
            Event::GeneralRef(r) => {
                if r.is_char_ref() {
                    match r.resolve_char_ref() {
                        Ok(Some(ch)) => add_text(&mut stack, ch.encode_utf8(&mut [0; 4])),
                        _ => notes.add(0, Sort::Entity),
                    }
                } else {
                    match predefined(&r.into_inner()) {
                        Some(s) => add_text(&mut stack, s),
                        None => notes.add(0, Sort::Entity),
                    }
                }
            }
            Event::DocType(_) => notes.add(0, Sort::Doctype),
            Event::Eof => break,
            _ => {}
        }
    }
    if stack.len() != 1 {
        return Err(broken("balise non fermée"));
    }
    let root = stack.pop().unwrap_or_default();
    root.children
        .into_iter()
        .find_map(|c| match c {
            Child::Node(n) => Some(n),
            Child::Text(_) => None,
        })
        .ok_or_else(|| broken("aucun élément"))
}

/// Cadre d'une page (D8) : `viewBox` (ou `viewbox`), sinon `0 0 width height`, sinon `0 0 1920 1080`.
struct Frame {
    x: f32,
    y: f32,
    w: f32,
    h: f32,
}

impl Frame {
    /// Échelle `1920 / largeur` et décalage `-x, -y` vers la page RoomBoard.
    fn base(&self) -> Mat {
        let s = PAGE_WIDTH / self.w;
        [s, 0.0, 0.0, s, -self.x * s, -self.y * s]
    }
}

fn frame_of(svg: &Node) -> Result<Frame, BoardError> {
    let f = if let Some(vb) = svg.attr("viewBox").or_else(|| svg.attr("viewbox")) {
        let v = numbers(vb).ok_or_else(|| broken(BAD_FRAME))?;
        if v.len() != 4 {
            return Err(broken(BAD_FRAME));
        }
        Frame { x: v[0], y: v[1], w: v[2], h: v[3] }
    } else if let (Some(w), Some(h)) = (svg.attr("width").and_then(length), svg.attr("height").and_then(length)) {
        Frame { x: 0.0, y: 0.0, w, h }
    } else {
        Frame { x: 0.0, y: 0.0, w: PAGE_WIDTH, h: super::PAGE_HEIGHT }
    };
    if f.w.is_finite() && f.h.is_finite() && f.x.is_finite() && f.y.is_finite() && f.w > 0.0 && f.h > 0.0 {
        Ok(f)
    } else {
        Err(broken(BAD_FRAME))
    }
}

/// Style hérité (SVG) : attributs et déclarations de `style="…"`.
#[derive(Debug, Clone, Default)]
struct Style {
    fill: Option<String>,
    fill_opacity: Option<String>,
    stroke: Option<String>,
    stroke_width: Option<String>,
    stroke_opacity: Option<String>,
    font_size: Option<String>,
    font_family: Option<String>,
    font_weight: Option<String>,
    font_style: Option<String>,
    text_decoration: Option<String>,
    text_align: Option<String>,
}

impl Style {
    fn set(&mut self, k: &str, v: &str) {
        let v = Some(v.trim().to_string());
        match k.trim() {
            "fill" => self.fill = v,
            "fill-opacity" => self.fill_opacity = v,
            "stroke" => self.stroke = v,
            "stroke-width" => self.stroke_width = v,
            "stroke-opacity" => self.stroke_opacity = v,
            "font-size" => self.font_size = v,
            "font-family" => self.font_family = v,
            "font-weight" => self.font_weight = v,
            "font-style" => self.font_style = v,
            "text-decoration" => self.text_decoration = v,
            "text-align" => self.text_align = v,
            _ => {}
        }
    }
    fn inherit(&self, n: &Node) -> Style {
        let mut s = self.clone();
        for (k, v) in &n.attrs {
            s.set(k, v);
        }
        if let Some(css) = n.attr("style") {
            for decl in css.split(';') {
                if let Some((k, v)) = decl.split_once(':') {
                    s.set(k, v);
                }
            }
        }
        s
    }
}

#[derive(Clone)]
struct Ctx {
    m: Mat,
    style: Style,
    no: u32,
    /// Enfant direct de la page (fond d'une page `.ubz`, D14).
    top: bool,
}

/// `iwb:element` (par `ref`) et `iwb:group` du document IWB, lus avant les pages.
#[derive(Default)]
struct Refs {
    attrs: HashMap<String, Vec<(String, String)>>,
    groups: Vec<Vec<String>>,
}

impl Refs {
    fn value(&self, id: &str, key: &str) -> Option<&str> {
        self.attrs.get(id)?.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
    }
    fn flag(&self, id: &str, key: &str) -> bool {
        self.value(id, key) == Some("true")
    }
}

fn add_ref(refs: &mut Refs, e: &Node) {
    if let Some(r) = e.attr("ref") {
        refs.attrs.entry(r.to_string()).or_default().extend(e.attrs.iter().filter(|(k, _)| k != "ref").cloned());
    }
}

fn refs_of(root: &Node, notes: &mut Notes) -> Refs {
    let mut refs = Refs::default();
    for n in root.nodes() {
        match n.name.as_str() {
            "element" => add_ref(&mut refs, n),
            "group" => {
                let mut ids = Vec::new();
                for e in n.nodes().filter(|e| e.name == "element") {
                    add_ref(&mut refs, e);
                    if let Some(r) = e.attr("ref") {
                        ids.push(r.to_string());
                    }
                }
                refs.groups.push(ids);
            }
            "meta" | "metadata" => notes.add(0, Sort::Metadata),
            _ => {}
        }
    }
    refs
}

fn pages_of<'a>(n: &'a Node, out: &mut Vec<&'a Node>) {
    for k in n.nodes() {
        match k.name.as_str() {
            "page" => out.push(k),
            "pageset" => pages_of(k, out),
            _ => {}
        }
    }
}

/// `iwb:group` : membres de premier niveau de la page, réunis à la place du premier (ordre de la page gardé).
fn group_top(out: &mut Vec<(Option<String>, Item)>, ids: &[String]) {
    let idx: Vec<usize> = out.iter().enumerate().filter(|(_, (id, _))| id.as_ref().is_some_and(|i| ids.contains(i))).map(|(k, _)| k).collect();
    if idx.len() < 2 {
        return;
    }
    let first = idx[0];
    let mut members: Vec<Item> = Vec::with_capacity(idx.len());
    for &k in idx.iter().rev() {
        members.push(out.remove(k).1);
    }
    members.reverse();
    out.insert(first, (None, Item::Group(members)));
}

/// Attribut absent : `default` ; présent mais illisible : l'objet est illisible.
struct Bad;
type Got = Result<Option<Item>, Bad>;
type Out = Vec<(Option<String>, Item)>;

fn f(n: &Node, k: &str, default: f32) -> Result<f32, Bad> {
    match n.attr(k) {
        None => Ok(default),
        Some(v) => length(v).ok_or(Bad),
    }
}

/// Premier nombre d'une liste (`x="10 20 30"` d'un texte), 0 si absent.
fn first(n: &Node, k: &str) -> Result<f32, Bad> {
    match n.attr(k) {
        None => Ok(0.0),
        Some(v) => numbers(v).and_then(|l| l.first().copied()).ok_or(Bad),
    }
}

fn numbers(s: &str) -> Option<Vec<f32>> {
    s.split(|c: char| c.is_whitespace() || c == ',')
        .filter(|t| !t.is_empty())
        .map(|t| t.parse::<f32>().ok().filter(|v| v.is_finite()))
        .collect()
}

/// Longueur en pixels : nombre nu ou `px` ; `pt` × 4/3 ; toute autre unité : illisible.
fn length(s: &str) -> Option<f32> {
    let s = s.trim();
    let (v, pt) = if let Some(n) = s.strip_suffix("px") {
        (n, false)
    } else if let Some(n) = s.strip_suffix("pt") {
        (n, true)
    } else {
        (s, false)
    };
    v.trim().parse::<f32>().ok().map(|x| if pt { x * 4.0 / 3.0 } else { x }).filter(|x| x.is_finite())
}

fn font_px(s: &str) -> Option<f32> {
    length(s).filter(|v| *v > 0.0)
}

fn family(s: &str) -> String {
    s.split(',').next().unwrap_or("").trim().trim_matches(|c| c == '\'' || c == '"').to_string()
}

fn is_bold(v: &str) -> bool {
    v == "bold" || v == "bolder" || v.parse::<u32>().is_ok_and(|w| w >= 600)
}

const NAMED: [(&str, Rgb); 22] = [
    ("black", [0, 0, 0]),
    ("white", [255, 255, 255]),
    ("red", [255, 0, 0]),
    ("green", [0, 128, 0]),
    ("blue", [0, 0, 255]),
    ("yellow", [255, 255, 0]),
    ("purple", [128, 0, 128]),
    ("pink", [255, 192, 203]),
    ("orange", [255, 165, 0]),
    ("grey", [128, 128, 128]),
    ("gray", [128, 128, 128]),
    ("brown", [165, 42, 42]),
    ("lime", [0, 255, 0]),
    ("aqua", [0, 255, 255]),
    ("cyan", [0, 255, 255]),
    ("fuchsia", [255, 0, 255]),
    ("magenta", [255, 0, 255]),
    ("maroon", [128, 0, 0]),
    ("navy", [0, 0, 128]),
    ("olive", [128, 128, 0]),
    ("silver", [192, 192, 192]),
    ("teal", [0, 128, 128]),
];

/// Couleur SVG : `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(r,g,b)` (entiers ou pourcentages), nom de base.
fn color_of(s: &str) -> Option<Rgb> {
    let s = s.trim();
    if let Some(h) = s.strip_prefix('#') {
        if !h.is_ascii() {
            return None;
        }
        return match h.len() {
            3 => {
                let d = |i: usize| u8::from_str_radix(&h[i..i + 1], 16).ok().map(|x| x * 17);
                Some([d(0)?, d(1)?, d(2)?])
            }
            6 | 8 => Some([u8::from_str_radix(&h[0..2], 16).ok()?, u8::from_str_radix(&h[2..4], 16).ok()?, u8::from_str_radix(&h[4..6], 16).ok()?]),
            _ => None,
        };
    }
    if let Some(inner) = s.strip_prefix("rgb(").and_then(|r| r.strip_suffix(')')) {
        let parts: Vec<&str> = inner.split(',').map(str::trim).collect();
        if parts.len() != 3 {
            return None;
        }
        let comp = |p: &str| -> Option<u8> {
            let v = match p.strip_suffix('%') {
                Some(pc) => pc.trim().parse::<f32>().ok()? * 2.55,
                None => p.parse::<f32>().ok()?,
            };
            v.is_finite().then(|| v.round().clamp(0.0, 255.0) as u8)
        };
        return Some([comp(parts[0])?, comp(parts[1])?, comp(parts[2])?]);
    }
    NAMED.iter().find(|(n, _)| n.eq_ignore_ascii_case(s)).map(|(_, c)| *c)
}

/// Remplissage SVG : absent = noir ; `none`, `transparent` ou opacité 0 : aucun.
fn fill_of(s: &Style) -> Option<Rgb> {
    if s.fill_opacity.as_deref().and_then(|o| o.parse::<f32>().ok()) == Some(0.0) {
        return None;
    }
    match s.fill.as_deref() {
        None => Some(BLACK),
        Some("none") | Some("transparent") => None,
        Some(v) => Some(color_of(v).unwrap_or(BLACK)),
    }
}

/// D9 : contour absent, `none`, d'épaisseur 0 ou d'opacité 0 → couleur du remplissage, épaisseur 1.
fn outline(s: &Style, fill: Option<Rgb>) -> (Rgb, f32) {
    let width = s.stroke_width.as_deref().and_then(length).unwrap_or(1.0);
    let hidden = s.stroke_opacity.as_deref().and_then(|o| o.parse::<f32>().ok()) == Some(0.0);
    match s.stroke.as_deref().filter(|v| *v != "none" && *v != "transparent").and_then(color_of) {
        Some(c) if !hidden && width > 0.0 => (c, width),
        _ => (fill.unwrap_or(BLACK), 1.0),
    }
}

fn rot(deg: f32) -> Mat {
    let (s, c) = deg.to_radians().sin_cos();
    [c, s, -s, c, 0.0, 0.0]
}

/// Attribut `transform` : `matrix`, `translate`, `scale`, `rotate` (avec centre), `skewX`, `skewY`, de gauche à droite.
fn parse_transform(s: &str) -> Option<Mat> {
    let mut m = IDENTITY;
    let mut rest = s.trim();
    while !rest.is_empty() {
        let open = rest.find('(')?;
        let close = rest.find(')')?;
        if close < open {
            return None;
        }
        let name = rest[..open].trim();
        let args = numbers(&rest[open + 1..close])?;
        let t: Mat = match (name, args.as_slice()) {
            ("matrix", [a, b, c, d, e, g]) => [*a, *b, *c, *d, *e, *g],
            ("translate", [x]) => [1.0, 0.0, 0.0, 1.0, *x, 0.0],
            ("translate", [x, y]) => [1.0, 0.0, 0.0, 1.0, *x, *y],
            ("scale", [k]) => [*k, 0.0, 0.0, *k, 0.0, 0.0],
            ("scale", [x, y]) => [*x, 0.0, 0.0, *y, 0.0, 0.0],
            ("rotate", [a]) => rot(*a),
            ("rotate", [a, cx, cy]) => compose(&compose(&[1.0, 0.0, 0.0, 1.0, *cx, *cy], &rot(*a)), &[1.0, 0.0, 0.0, 1.0, -cx, -cy]),
            ("skewX", [a]) => [1.0, 0.0, a.to_radians().tan(), 1.0, 0.0, 0.0],
            ("skewY", [a]) => [1.0, a.to_radians().tan(), 0.0, 1.0, 0.0, 0.0],
            _ => return None,
        };
        m = compose(&m, &t);
        rest = rest[close + 1..].trim_start_matches(|c: char| c == ',' || c.is_whitespace());
    }
    m.iter().all(|v| v.is_finite()).then_some(m)
}

fn transform_of(n: &Node) -> Option<Mat> {
    match n.attr("transform") {
        None => Some(IDENTITY),
        Some(t) => parse_transform(t),
    }
}

/// Image de l'archive : chemin relatif sans schéma (`http:`, `data:`, `file:`, `C:`), ni `/`, ni `..`, ni ancre.
fn is_local(href: &str) -> bool {
    let h = href.trim();
    if h.is_empty() || h.starts_with('/') || h.starts_with('\\') || h.starts_with('#') {
        return false;
    }
    if let Some(i) = h.find(':') {
        let scheme = &h[..i];
        if scheme.chars().next().is_some_and(|c| c.is_ascii_alphabetic()) && scheme.chars().all(|c| c.is_ascii_alphanumeric() || "+.-".contains(c)) {
            return false;
        }
    }
    !h.replace('\\', "/").split('/').any(|s| s == "..")
}

fn ext_of(href: &str) -> String {
    href.rsplit(['/', '\\']).next().and_then(|b| b.rsplit_once('.')).map(|(_, e)| e.to_ascii_lowercase()).unwrap_or_default()
}

fn normalize_href(href: &str) -> String {
    let mut h = href.trim().replace('\\', "/");
    while let Some(r) = h.strip_prefix("./") {
        h = r.to_string();
    }
    h
}

fn is_flash(n: &Node) -> bool {
    ext_of(n.attr("href").unwrap_or("")) == "swf" || n.attr("type").is_some_and(|t| t.contains("flash"))
}

/// Texte du premier descendant `name` (HTML de Qt dans `itemTextContent`, déjà désenveloppé du XML).
fn inner_text(n: &Node, name: &str) -> Option<String> {
    for k in n.nodes() {
        if k.name == name {
            return Some(
                k.children
                    .iter()
                    .filter_map(|c| match c {
                        Child::Text(t) => Some(t.as_str()),
                        Child::Node(_) => None,
                    })
                    .collect(),
            );
        }
        if let Some(t) = inner_text(k, name) {
            return Some(t);
        }
    }
    None
}

/// Mise en forme d'un segment ; `size`, `color` : seulement ceux d'un `tspan` (ceux de l'élément sont l'élément).
#[derive(Debug, Clone, Default, PartialEq)]
struct Look {
    bold: bool,
    italic: bool,
    underline: bool,
    size: Option<f32>,
    color: Option<Rgb>,
    font: Option<String>,
}

fn own_look(base: &Look, n: &Node) -> Look {
    let s = Style::default().inherit(n);
    let mut l = base.clone();
    if let Some(w) = &s.font_weight {
        l.bold = is_bold(w);
    }
    if let Some(v) = &s.font_style {
        l.italic = v == "italic" || v == "oblique";
    }
    if let Some(v) = &s.text_decoration {
        l.underline = v.contains("underline");
    }
    if let Some(v) = s.font_size.as_deref().and_then(font_px) {
        l.size = Some(v);
    }
    if let Some(v) = s.fill.as_deref().and_then(color_of) {
        l.color = Some(v);
    }
    if let Some(v) = &s.font_family {
        l.font = Some(family(v));
    }
    l
}

fn collect(n: &Node, look: usize, looks: &mut Vec<Look>, out: &mut Vec<(char, usize)>) {
    for c in &n.children {
        match c {
            Child::Text(t) => out.extend(t.chars().map(|ch| (ch, look))),
            Child::Node(k) => match k.name.as_str() {
                "tspan" => {
                    let l = own_look(&looks[look], k);
                    looks.push(l);
                    let idx = looks.len() - 1;
                    collect(k, idx, looks, out);
                }
                "tbreak" => out.push((LINE, look)),
                "a" => collect(k, look, looks, out),
                _ => {}
            },
        }
    }
}

/// Blancs XML réduits à une espace ; aucune espace en tête, en fin, ni autour d'un saut de ligne (sans `xml:space`).
fn squeeze(chars: Vec<(char, usize)>) -> Vec<(char, usize)> {
    let mut out: Vec<(char, usize)> = Vec::with_capacity(chars.len());
    for (ch, k) in chars {
        if ch == LINE {
            while matches!(out.last(), Some((' ', _))) {
                out.pop();
            }
            out.push((LINE, k));
            continue;
        }
        if ch.is_whitespace() {
            if !matches!(out.last(), None | Some((' ', _)) | Some((LINE, _))) {
                out.push((' ', k));
            }
            continue;
        }
        out.push((ch, k));
    }
    while matches!(out.last(), Some((' ', _))) {
        out.pop();
    }
    out
}

fn spans_of(chars: Vec<(char, usize)>, looks: &[Look], preserve: bool) -> Vec<Span> {
    let chars = if preserve { chars } else { squeeze(chars) };
    let mut spans: Vec<Span> = Vec::new();
    let mut last: Option<usize> = None;
    for (ch, k) in chars {
        let ch = if ch == LINE { '\n' } else { ch };
        let same = last.is_some_and(|l| looks[l] == looks[k]);
        match spans.last_mut() {
            Some(s) if same => s.text.push(ch),
            _ => {
                let l = &looks[k];
                spans.push(Span { text: ch.to_string(), bold: l.bold, italic: l.italic, underline: l.underline, size: l.size, color: l.color, font: l.font.clone() });
            }
        }
        last = Some(k);
    }
    spans
}

/// Boîte d'un texte sans largeur ni hauteur : 0,6 × taille par caractère de la plus longue ligne, 1,2 × taille par ligne.
fn estimate(spans: &[Span], size: f32) -> (f32, f32) {
    let text: String = spans.iter().map(|s| s.text.as_str()).collect();
    let lines: Vec<&str> = text.split('\n').collect();
    let longest = lines.iter().map(|l| l.chars().count()).max().unwrap_or(0) as f32;
    ((longest * size * 0.6).max(size), lines.len() as f32 * size * 1.2)
}

/// Trait à pression d'OpenBoard (HU1-1) : un `g` de quadrilatères ; ligne médiane, pression = largeur locale / maximale.
fn pressure_stroke(n: &Node, c: &Ctx) -> Option<Item> {
    let polys: Vec<&Node> = n.nodes().collect();
    if polys.is_empty() || polys.iter().any(|p| p.name != "polygon" || p.bad) {
        return None;
    }
    let mut quads: Vec<Vec<f32>> = Vec::with_capacity(polys.len());
    for p in &polys {
        let v = numbers(p.attr("points")?)?;
        if v.len() != 8 {
            return None;
        }
        quads.push(v);
    }
    let color = polys[0].attr("fill").or(c.style.fill.as_deref()).and_then(color_of).unwrap_or(BLACK);
    let mut pts: Vec<(f32, f32, f32)> = Vec::with_capacity(quads.len() + 1);
    for (i, q) in quads.iter().enumerate() {
        if i == 0 {
            pts.push(((q[0] + q[6]) / 2.0, (q[1] + q[7]) / 2.0, (q[0] - q[6]).hypot(q[1] - q[7])));
        }
        pts.push(((q[2] + q[4]) / 2.0, (q[3] + q[5]) / 2.0, (q[2] - q[4]).hypot(q[3] - q[5])));
    }
    let max = pts.iter().fold(0.0f32, |a, p| a.max(p.2));
    if max <= 0.0 || !max.is_finite() {
        return None;
    }
    Some(Item::Stroke { m: c.m, color, width: max, points: pts.iter().map(|&(x, y, w)| [x, y, w / max]).collect() })
}

fn ellipse(n: &Node, c: &Ctx) -> Got {
    let (cx, cy) = (f(n, "cx", 0.0)?, f(n, "cy", 0.0)?);
    let (rx, ry) = if n.name == "circle" {
        let r = f(n, "r", 0.0)?;
        (r, r)
    } else {
        (f(n, "rx", 0.0)?, f(n, "ry", 0.0)?)
    };
    if rx < 0.0 || ry < 0.0 {
        return Err(Bad);
    }
    let fill = fill_of(&c.style);
    let (color, width) = outline(&c.style, fill);
    Ok(Some(Item::Shape { kind: ShapeKind::Ellipse, m: c.m, x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry, color, width, fill }))
}

/// Éléments connus qui ne dessinent rien : `Some(Some(sorte))` à dire, `Some(None)` muets ; `None` : type inconnu.
fn ignored(n: &Node) -> Option<Option<Sort>> {
    Some(match n.name.as_str() {
        "video" => Some(if is_flash(n) { Sort::Flash } else { Sort::Video }),
        "audio" => Some(Sort::Audio),
        "script" => Some(Sort::Script),
        "ruler" => Some(Sort::Ruler),
        "compass" => Some(Sort::Compass),
        "curtain" => Some(Sort::Curtain),
        "axes" => Some(Sort::Axes),
        "object" | "embed" | "widget" | "w3cWidget" | "appleWidget" => Some(if is_flash(n) { Sort::Flash } else { Sort::Widget }),
        "metadata" | "meta" => Some(Sort::Metadata),
        "title" | "desc" | "defs" | "style" | "tbreak" | "tspan" | "page" | "pageset" => None,
        _ => return None,
    })
}

fn minmax(v: impl Iterator<Item = f32>) -> (f32, f32) {
    v.fold((f32::MAX, f32::MIN), |(lo, hi), x| (lo.min(x), hi.max(x)))
}

struct State<'a> {
    frame: &'a Frame,
    dialect: Dialect,
    refs: &'a Refs,
    notes: &'a mut Notes,
    objects: usize,
}

impl State<'_> {
    fn count(&mut self) -> Result<(), BoardError> {
        self.objects += 1;
        if self.objects > MAX_OBJECTS {
            Err(BoardError::TooBig)
        } else {
            Ok(())
        }
    }

    fn flags(&mut self, id: &str, no: u32) {
        for (key, sort) in [("locked", Sort::Locked), ("revealer", Sort::Revealer), ("container", Sort::Container), ("replicate", Sort::Replicate)] {
            if self.refs.flag(id, key) {
                self.notes.add(no, sort);
            }
        }
    }

    /// Rectangle qui couvre la page (tolérance 2 unités de page), dans les coordonnées RoomBoard.
    fn covers(&self, m: &Mat, x: f32, y: f32, w: f32, h: f32) -> bool {
        let pts = [apply(m, x, y), apply(m, x + w, y), apply(m, x, y + h), apply(m, x + w, y + h)];
        let (x0, x1) = minmax(pts.iter().map(|p| p.0));
        let (y0, y1) = minmax(pts.iter().map(|p| p.1));
        let page_h = self.frame.h * PAGE_WIDTH / self.frame.w;
        x0 <= 2.0 && y0 <= 2.0 && x1 >= PAGE_WIDTH - 2.0 && y1 >= page_h - 2.0
    }

    fn page(&mut self, node: &Node, base: &Style, no: u32) -> Result<Page, BoardError> {
        let ctx = Ctx { m: self.frame.base(), style: base.inherit(node), no, top: true };
        let mut out: Out = Vec::new();
        let mut background = None;
        self.children(node, &ctx, &mut out, &mut background)?;
        for ids in &self.refs.groups {
            group_top(&mut out, ids);
        }
        Ok(Page { background, items: out.into_iter().map(|(_, i)| i).collect() })
    }

    fn children(&mut self, n: &Node, c: &Ctx, out: &mut Out, bg: &mut Option<Rgb>) -> Result<(), BoardError> {
        for k in n.nodes() {
            self.element(k, c, out, bg)?;
        }
        Ok(())
    }

    fn element(&mut self, n: &Node, c: &Ctx, out: &mut Out, bg: &mut Option<Rgb>) -> Result<(), BoardError> {
        if n.bad {
            self.notes.add(c.no, Sort::Unreadable);
            return Ok(());
        }
        let Some(local) = transform_of(n) else {
            self.notes.add(c.no, Sort::Unreadable);
            return Ok(());
        };
        let ctx = Ctx { m: compose(&c.m, &local), style: c.style.inherit(n), no: c.no, top: c.top };
        let id = n.attr("id").map(str::to_string);
        if let Some(i) = &id {
            self.flags(i, c.no);
        }
        let got: Got = match n.name.as_str() {
            "g" => return self.group(n, &ctx, id, out, bg),
            "a" => {
                let href = n.attr("href").unwrap_or("");
                self.notes.add(c.no, if AUDIO_EXTS.contains(&ext_of(href).as_str()) { Sort::Audio } else { Sort::Link });
                return self.children(n, &ctx, out, bg);
            }
            "switch" => return self.children(n, &ctx, out, bg),
            "rect" => {
                let first_child = out.is_empty();
                self.rect(n, &ctx, id.as_deref(), first_child, bg)
            }
            "circle" | "ellipse" => ellipse(n, &ctx),
            "line" => self.line(n, &ctx, id.as_deref()),
            "polyline" | "polygon" => self.poly(n, &ctx),
            "text" | "textarea" => self.text(n, &ctx),
            "image" => self.image(n, &ctx, id.as_deref()),
            "foreignObject" => self.foreign(n, &ctx),
            _ => {
                match ignored(n) {
                    Some(Some(sort)) => self.notes.add(c.no, sort),
                    Some(None) => {}
                    None => self.notes.add(c.no, Sort::UnknownObject),
                }
                Ok(None)
            }
        };
        match got {
            Ok(Some(item)) => {
                self.count()?;
                out.push((id, item));
            }
            Ok(None) => {}
            Err(Bad) => self.notes.add(c.no, Sort::Unreadable),
        }
        Ok(())
    }

    fn group(&mut self, n: &Node, c: &Ctx, id: Option<String>, out: &mut Out, bg: &mut Option<Rgb>) -> Result<(), BoardError> {
        if self.dialect == Dialect::Ubz {
            if let Some(stroke) = pressure_stroke(n, c) {
                self.count()?;
                out.push((id, stroke));
                return Ok(());
            }
        }
        let inner_ctx = Ctx { top: false, ..c.clone() };
        let mut inner: Out = Vec::new();
        self.children(n, &inner_ctx, &mut inner, bg)?;
        match inner.len() {
            0 => {}
            1 => {
                if let Some((_, item)) = inner.pop() {
                    out.push((id, item));
                }
            }
            _ => out.push((id, Item::Group(inner.into_iter().map(|(_, i)| i).collect()))),
        }
        Ok(())
    }

    fn rect(&mut self, n: &Node, c: &Ctx, id: Option<&str>, first_child: bool, bg: &mut Option<Rgb>) -> Got {
        let (x, y, w, h) = (f(n, "x", 0.0)?, f(n, "y", 0.0)?, f(n, "width", 0.0)?, f(n, "height", 0.0)?);
        if w < 0.0 || h < 0.0 {
            return Err(Bad);
        }
        let fill = fill_of(&c.style);
        let wants_bg = match self.dialect {
            Dialect::Iwb => id.is_some_and(|i| self.refs.flag(i, "background")),
            Dialect::Ubz => c.top && first_child && bg.is_none() && fill.is_some(),
        };
        if wants_bg {
            if let Some(color) = fill.filter(|_| self.covers(&c.m, x, y, w, h)) {
                *bg = Some(color);
                return Ok(None);
            }
            if self.dialect == Dialect::Iwb {
                self.notes.add(c.no, Sort::BackgroundObject);
            }
        }
        if n.attr("rx").and_then(length).unwrap_or(0.0) > 0.0 || n.attr("ry").and_then(length).unwrap_or(0.0) > 0.0 {
            self.notes.add(c.no, Sort::Rounded);
        }
        let (color, width) = outline(&c.style, fill);
        Ok(Some(Item::Shape { kind: ShapeKind::Rect, m: c.m, x0: x, y0: y, x1: x + w, y1: y + h, color, width, fill }))
    }

    fn line(&mut self, n: &Node, c: &Ctx, id: Option<&str>) -> Got {
        let (x1, y1, x2, y2) = (f(n, "x1", 0.0)?, f(n, "y1", 0.0)?, f(n, "x2", 0.0)?, f(n, "y2", 0.0)?);
        let arrow = id.is_some_and(|i| self.refs.value(i, "stroke-lineshape-end") == Some("arrow"));
        let (color, width) = outline(&c.style, fill_of(&c.style));
        let kind = if arrow { ShapeKind::Arrow } else { ShapeKind::Line };
        Ok(Some(Item::Shape { kind, m: c.m, x0: x1, y0: y1, x1: x2, y1: y2, color, width, fill: None }))
    }

    fn poly(&mut self, n: &Node, c: &Ctx) -> Got {
        let v = numbers(n.attr("points").unwrap_or("")).ok_or(Bad)?;
        if v.len() < 2 {
            return Err(Bad);
        }
        let mut points: Vec<[f32; 3]> = v.chunks_exact(2).map(|p| [p[0], p[1], 1.0]).collect();
        let fill = fill_of(&c.style);
        if n.name == "polygon" {
            if let Some(&p) = points.first() {
                points.push(p);
            }
            if fill.is_some() {
                self.notes.add(c.no, Sort::PolygonFill);
            }
        }
        let (color, width) = outline(&c.style, fill);
        Ok(Some(Item::Stroke { m: c.m, color, width, points }))
    }

    fn text(&mut self, n: &Node, c: &Ctx) -> Got {
        let size = c.style.font_size.as_deref().and_then(font_px).unwrap_or(DEFAULT_SIZE);
        let color = c.style.fill.as_deref().and_then(color_of).unwrap_or(BLACK);
        if c.style.text_align.as_deref().is_some_and(|a| !matches!(a, "" | "start" | "left")) {
            self.notes.add(c.no, Sort::TextAlign);
        }
        let base = Look {
            bold: c.style.font_weight.as_deref().is_some_and(is_bold),
            italic: c.style.font_style.as_deref().is_some_and(|v| v == "italic" || v == "oblique"),
            underline: c.style.text_decoration.as_deref().is_some_and(|v| v.contains("underline")),
            size: None,
            color: None,
            font: c.style.font_family.as_deref().map(family),
        };
        let mut looks = vec![base];
        let mut chars = Vec::new();
        collect(n, 0, &mut looks, &mut chars);
        let spans = spans_of(chars, &looks, n.attr("space") == Some("preserve"));
        if spans.iter().all(|s| s.text.trim().is_empty()) {
            return Ok(None);
        }
        let (x, y) = (first(n, "x")?, first(n, "y")?);
        let top = if n.name == "text" { y - size * ASCENT } else { y };
        let (ew, eh) = estimate(&spans, size);
        let w = n.attr("width").and_then(length).filter(|v| *v > 0.0).unwrap_or(ew);
        let h = n.attr("height").and_then(length).filter(|v| *v > 0.0).unwrap_or(eh);
        Ok(Some(Item::Text { m: c.m, x, y: top, w, h, size, color, spans }))
    }

    fn image(&mut self, n: &Node, c: &Ctx, id: Option<&str>) -> Got {
        let href = n.attr("href").unwrap_or("").trim();
        if !is_local(href) {
            self.notes.add(c.no, Sort::RemoteImage);
            return Ok(None);
        }
        if !IMAGE_EXTS.contains(&ext_of(href).as_str()) {
            self.notes.add(c.no, Sort::ImageFormat);
            return Ok(None);
        }
        let (x, y, w, h) = (f(n, "x", 0.0)?, f(n, "y", 0.0)?, f(n, "width", 0.0)?, f(n, "height", 0.0)?);
        if w <= 0.0 || h <= 0.0 {
            return Err(Bad);
        }
        if id.is_some_and(|i| self.refs.flag(i, "background")) {
            self.notes.add(c.no, Sort::BackgroundObject);
        }
        Ok(Some(Item::Image { m: c.m, x, y, w, h, href: normalize_href(href) }))
    }

    /// Texte d'OpenBoard (`foreignObject ub:type="text"`, D11) ; tout autre `foreignObject` (HTML) : jamais rendu.
    fn foreign(&mut self, n: &Node, c: &Ctx) -> Got {
        if n.attr("type") != Some("text") {
            self.notes.add(c.no, Sort::HtmlObject);
            return Ok(None);
        }
        let html = n.attr("itemTextContent").map(str::to_string).or_else(|| inner_text(n, "itemTextContent")).unwrap_or_default();
        let qt = read_qt_html(&html);
        if qt.reduced {
            self.notes.add(c.no, Sort::TextReduced);
        }
        if qt.spans.iter().all(|s| s.text.trim().is_empty()) {
            return Ok(None);
        }
        let size = qt.size.unwrap_or(DEFAULT_SIZE);
        let (ew, eh) = estimate(&qt.spans, size);
        let (x, y) = (first(n, "x")?, first(n, "y")?);
        let w = n.attr("width").and_then(length).filter(|v| *v > 0.0).unwrap_or(ew);
        let h = n.attr("height").and_then(length).filter(|v| *v > 0.0).unwrap_or(eh);
        Ok(Some(Item::Text { m: c.m, x, y, w, h, size, color: qt.color.unwrap_or(BLACK), spans: qt.spans }))
    }
}

/// Lit un `content.xml` IWB, un `.iwb` en SVG brut (`dialect` Iwb) ou une page `pageNNN.svg` (Ubz) ; `first_page`
/// numérote les avertissements (1 pour un `.iwb` ; rang de la page pour un `.ubz`).
pub fn read_svg(xml: &[u8], dialect: Dialect, first_page: u32) -> Result<BoardList, BoardError> {
    let body = xml.strip_prefix(&[0xEF, 0xBB, 0xBF][..]).unwrap_or(xml);
    let text = std::str::from_utf8(body).map_err(|_| broken("texte non UTF-8"))?;
    let mut notes = Notes::default();
    let root = parse_tree(text, &mut notes)?;
    let svg: &Node = match root.name.as_str() {
        "svg" => &root,
        "iwb" => root.nodes().find(|n| n.name == "svg").ok_or_else(|| broken("aucune balise svg"))?,
        other => return Err(broken(&format!("racine inattendue <{other}>"))),
    };
    let frame = frame_of(svg)?;
    let refs = if root.name == "iwb" { refs_of(&root, &mut notes) } else { Refs::default() };
    let mut nodes: Vec<&Node> = Vec::new();
    pages_of(svg, &mut nodes);
    if nodes.is_empty() {
        nodes.push(svg);
    }
    let total = nodes.len();
    let base = Style::default().inherit(svg);
    let pages = {
        let mut st = State { frame: &frame, dialect, refs: &refs, notes: &mut notes, objects: 0 };
        let mut pages = Vec::with_capacity(total.min(MAX_PAGES));
        for (i, node) in nodes.iter().take(MAX_PAGES).enumerate() {
            pages.push(st.page(node, &base, first_page + i as u32)?);
        }
        pages
    };
    let mut list = encode(&pages);
    let mut warnings = Vec::new();
    if total > MAX_PAGES {
        warnings.push(format!("{MAX_PAGES} premières pages importées sur {total}"));
    }
    warnings.extend(notes.lines());
    list.warnings = warnings;
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::board::parse;

    const S2: Mat = [2.0, 0.0, 0.0, 2.0, 0.0, 0.0];

    fn iwb(body: &str, extra: &str) -> String {
        format!(
            r#"<?xml version="1.0" encoding="UTF-8"?><iwb xmlns:iwb="http://www.becta.org.uk/iwb" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0"><svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1">{body}</svg:page></svg:pageset></svg:svg>{extra}</iwb>"#
        )
    }

    fn read(xml: &str, dialect: Dialect, first_page: u32) -> (Vec<Page>, Vec<String>) {
        let l = read_svg(xml.as_bytes(), dialect, first_page).expect("lecture");
        (parse(&l).expect("liste"), l.warnings)
    }

    fn items(xml: &str) -> Vec<Item> {
        read(xml, Dialect::Iwb, 1).0.remove(0).items
    }

    #[test]
    fn shapes_are_read_in_page_units_with_viewbox_lowercase() {
        let body = r#"<svg:rect id="r" x="10" y="20" width="100" height="50" fill="red" stroke="black" stroke-width="2"/><svg:circle cx="50" cy="60" r="10" fill="none" stroke="blue"/><svg:line id="l" x1="0" y1="0" x2="30" y2="40" stroke="green" stroke-width="3"/><svg:polyline points="1,2 3,4 5,6" stroke="black" stroke-width="4" fill="none"/>"#;
        let got = items(&iwb(body, r#"<iwb:element ref="l" stroke-lineshape-end="arrow"/>"#));
        assert_eq!(
            got,
            vec![
                Item::Shape { kind: ShapeKind::Rect, m: S2, x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0, color: [0, 0, 0], width: 2.0, fill: Some([255, 0, 0]) },
                Item::Shape { kind: ShapeKind::Ellipse, m: S2, x0: 40.0, y0: 50.0, x1: 60.0, y1: 70.0, color: [0, 0, 255], width: 1.0, fill: None },
                Item::Shape { kind: ShapeKind::Arrow, m: S2, x0: 0.0, y0: 0.0, x1: 30.0, y1: 40.0, color: [0, 128, 0], width: 3.0, fill: None },
                Item::Stroke { m: S2, color: [0, 0, 0], width: 4.0, points: vec![[1.0, 2.0, 1.0], [3.0, 4.0, 1.0], [5.0, 6.0, 1.0]] },
            ]
        );
    }

    #[test]
    fn frame_rules_and_bad_frames() {
        let m_of = |attrs: &str| -> Result<Mat, String> {
            let xml = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" {attrs}><rect width="1" height="1"/></svg>"#);
            let l = read_svg(xml.as_bytes(), Dialect::Ubz, 1).map_err(|e| e.to_string())?;
            match &parse(&l).expect("liste")[0].items[0] {
                Item::Shape { m, .. } => Ok(*m),
                other => panic!("{other:?}"),
            }
        };
        assert_eq!(m_of(r#"width="800" height="600""#).expect("taille")[0], 2.4);
        assert_eq!(m_of("").expect("défaut"), IDENTITY);
        assert_eq!(m_of(r#"viewBox="10 20 960 540""#).expect("décalé"), [2.0, 0.0, 0.0, 2.0, -20.0, -40.0]);
        assert_eq!(m_of(r#"viewBox="0 0 0 600""#).err().expect("refus"), "fichier endommagé : cadre de page invalide");
        assert_eq!(m_of(r#"viewBox="0 0 abc 1""#).err().expect("refus"), "fichier endommagé : cadre de page invalide");
    }

    /// Review Focus 2 : forme de `7-11 Maths 3.iwb` (CDATA, espaces, `tbreak`, retour).
    #[test]
    fn text_whitespace_cdata_tbreak_and_baseline() {
        let body = "<svg:textarea x=\"10\" y=\"20\" width=\"300\" height=\"80\" font-size=\"30\" fill=\"rgb(128,0,128)\" font-weight=\"bold\"><![CDATA[Magic  Square]]>   <svg:tbreak/>\n    suite </svg:textarea><svg:text x=\"5\" y=\"100\" font-size=\"20\">Ligne</svg:text>";
        let got = items(&iwb(body, ""));
        assert_eq!(
            got[0],
            Item::Text { m: S2, x: 10.0, y: 20.0, w: 300.0, h: 80.0, size: 30.0, color: [128, 0, 128], spans: vec![Span { text: "Magic Square\nsuite".into(), bold: true, ..Span::default() }] }
        );
        match &got[1] {
            Item::Text { y, w, h, spans, .. } => {
                assert!((y - (100.0 - 20.0 * ASCENT)).abs() < 1e-4, "{y}");
                assert!((w - 60.0).abs() < 1e-3 && (h - 24.0).abs() < 1e-3, "{w} {h}");
                assert_eq!(spans, &vec![Span { text: "Ligne".into(), ..Span::default() }]);
            }
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn tspan_spans_keep_only_their_own_attributes() {
        let body = r##"<svg:textarea x="0" y="0" font-size="24" fill="black" xml:space="preserve"><svg:tspan font-weight="bold">Bonjour </svg:tspan><svg:tspan font-size="32" fill="#ff0000" font-family="'Liberation Sans', sans-serif">monde</svg:tspan></svg:textarea>"##;
        match &items(&iwb(body, ""))[0] {
            Item::Text { size, color, spans, .. } => {
                assert_eq!((*size, *color), (24.0, [0, 0, 0]));
                assert_eq!(
                    spans,
                    &vec![
                        Span { text: "Bonjour ".into(), bold: true, ..Span::default() },
                        Span { text: "monde".into(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".into()), ..Span::default() },
                    ]
                );
            }
            other => panic!("{other:?}"),
        }
    }

    /// Review Focus 1 : `iwb:group` et `iwb:element` après les pages.
    #[test]
    fn iwb_refs_after_pages_group_and_flags() {
        let body = r#"<svg:rect id="a" width="1" height="1"/><svg:rect id="b" width="1" height="1"/><svg:rect id="c" width="1" height="1"/>"#;
        let extra = r#"<iwb:group><iwb:element ref="a"/><iwb:element ref="b"/></iwb:group><iwb:element ref="c" locked="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        let it = &pages[0].items;
        assert_eq!(it.len(), 2);
        assert!(matches!(&it[0], Item::Group(g) if g.len() == 2));
        assert!(matches!(&it[1], Item::Shape { kind: ShapeKind::Rect, .. }));
        assert_eq!(warnings, vec!["page 1 : 1 verrou non lu".to_string()]);
    }

    #[test]
    fn svg_g_nested_groups_and_single_member_flattened() {
        let body = r#"<svg:g><svg:rect width="1" height="1"/><svg:g><svg:rect width="1" height="1"/><svg:rect width="1" height="1"/></svg:g></svg:g><svg:g transform="translate(10,0)"><svg:rect width="1" height="1"/></svg:g>"#;
        let got = items(&iwb(body, ""));
        assert_eq!(got.len(), 2);
        match &got[0] {
            Item::Group(g) => {
                assert!(matches!(&g[0], Item::Shape { .. }));
                assert!(matches!(&g[1], Item::Group(inner) if inner.len() == 2));
            }
            other => panic!("{other:?}"),
        }
        assert!(matches!(&got[1], Item::Shape { m, .. } if *m == [2.0, 0.0, 0.0, 2.0, 20.0, 0.0]));
    }

    #[test]
    fn background_iwb_flag_and_ubz_first_rect() {
        let body = r#"<svg:rect id="bg" x="0" y="0" width="960" height="540" fill="blue"/><svg:rect id="half" x="0" y="0" width="100" height="100" fill="red"/>"#;
        let extra = r#"<iwb:element ref="bg" background="true"/><iwb:element ref="half" background="true"/>"#;
        let (pages, warnings) = read(&iwb(body, extra), Dialect::Iwb, 1);
        assert_eq!(pages[0].background, Some([0, 0, 255]));
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(warnings, vec!["page 1 : 1 objet de fond gardé comme objet".to_string()]);
        let ubz = r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect x="0" y="0" width="1280" height="720" fill="#000000"/><rect x="0" y="0" width="1280" height="720" fill="#ffffff"/></svg>"##;
        let (pages, warnings) = read(ubz, Dialect::Ubz, 1);
        assert_eq!(pages[0].background, Some([0, 0, 0]));
        assert_eq!(pages[0].items.len(), 1);
        assert!(warnings.is_empty());
    }

    #[test]
    fn not_read_kinds_become_warnings_per_page() {
        let body = r##"<svg:video xlink:href="videos/a.mpg" x="0" y="0" width="10" height="10"/><svg:video xlink:href="flash/a.swf" x="0" y="0" width="10" height="10"/><svg:a xlink:href="audio/son.wav"><svg:rect width="5" height="5"/></svg:a><svg:a xlink:href="#cible"><svg:text x="0" y="20">lien</svg:text></svg:a><svg:script>alert(1)</svg:script><svg:rect width="5" height="5" rx="2" onload="alert(2)"/><svg:polygon points="0,0 10,0 5,5"/><svg:image xlink:href="http://exemple.invalid/x.png" x="0" y="0" width="5" height="5"/><svg:image xlink:href="data:image/png;base64,AAAA" x="0" y="0" width="5" height="5"/><svg:image xlink:href="images/x.emf" x="0" y="0" width="5" height="5"/><svg:foreignObject><div/></svg:foreignObject><svg:path d="M0 0 L10 10"/>"##;
        let l = read_svg(iwb(body, "").as_bytes(), Dialect::Iwb, 1).expect("lecture");
        assert_eq!(
            l.warnings,
            [
                "page 1 : 1 script ignoré",
                "page 1 : 1 vidéo non lue",
                "page 1 : 1 son non lu",
                "page 1 : 1 animation Flash non lue",
                "page 1 : 1 lien perdu (contenu lu)",
                "page 1 : 1 rectangle dont les coins arrondis ne sont pas lus",
                "page 1 : 1 remplissage de polygone non lu",
                "page 1 : 2 images distantes ou hors de l'archive non chargées",
                "page 1 : 1 image d'un format non lu (EMF, WMF…)",
                "page 1 : 1 objet HTML non lu",
                "page 1 : 1 objet d'un type non lu",
            ]
            .map(String::from)
        );
        assert_eq!(parse(&l).expect("liste")[0].items.len(), 4);
        assert!(!l.texts.iter().any(|t| t.contains("alert")));
    }

    /// S5 : DOCTYPE avec entité externe ; rien n'est lu du système de fichiers.
    #[test]
    fn doctype_and_external_entity_are_never_resolved() {
        let xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE iwb [<!ENTITY e SYSTEM \"file:///etc/passwd\">]>\n<iwb xmlns:svg=\"http://www.w3.org/2000/svg\" version=\"1.0\"><svg:svg viewbox=\"0 0 1920 1080\"><svg:pageset><svg:page><svg:text x=\"0\" y=\"40\">avant &e; après &#233;&amp;</svg:text></svg:page></svg:pageset></svg:svg></iwb>";
        let l = read_svg(xml.as_bytes(), Dialect::Iwb, 1).expect("lecture");
        assert_eq!(l.warnings, vec!["1 déclaration DOCTYPE ignorée".to_string(), "1 entité inconnue ignorée".to_string()]);
        match &parse(&l).expect("liste")[0].items[0] {
            Item::Text { spans, .. } => assert_eq!(spans[0].text, "avant après é&"),
            other => panic!("{other:?}"),
        }
        assert!(!l.texts.iter().any(|t| t.contains("root")));
    }

    #[test]
    fn unreadable_attribute_skips_its_object_only() {
        let (pages, warnings) = read(&iwb(r#"<svg:rect fill="&e;" width="1" height="1"/><svg:rect width="2" height="2"/>"#, ""), Dialect::Iwb, 1);
        assert_eq!(pages[0].items.len(), 1);
        assert_eq!(warnings, vec!["page 1 : 1 objet illisible ignoré".to_string()]);
    }

    /// Forme de `rectangle2.iwb` : `<svg:page>` fermé par `</svg:pageset>`.
    #[test]
    fn malformed_xml_is_refused() {
        let xml = r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset><svg:page><svg:rect/></svg:pageset></svg:svg></iwb>"#;
        let e = read_svg(xml.as_bytes(), Dialect::Iwb, 1).err().expect("refus").to_string();
        assert!(e.starts_with("fichier endommagé : XML mal formé"), "{e}");
    }

    #[test]
    fn first_500_pages_are_read_and_said() {
        let xml = format!(r#"<iwb xmlns:svg="http://www.w3.org/2000/svg"><svg:svg viewbox="0 0 10 10"><svg:pageset>{}</svg:pageset></svg:svg></iwb>"#, "<svg:page/>".repeat(501));
        let (pages, warnings) = read(&xml, Dialect::Iwb, 1);
        assert_eq!(pages.len(), 500);
        assert_eq!(warnings[0], "500 premières pages importées sur 501");
    }

    #[test]
    fn more_than_100000_objects_is_refused() {
        let xml = iwb(&r#"<svg:rect width="1" height="1"/>"#.repeat(100_001), "");
        assert!(matches!(read_svg(xml.as_bytes(), Dialect::Iwb, 1), Err(BoardError::TooBig)));
    }

    /// HU1-1 : trait à pression d'OpenBoard, outil, numéro de page reçu.
    #[test]
    fn ubz_pressure_stroke_and_tools_on_page_3() {
        let xml = r##"<svg xmlns="http://www.w3.org/2000/svg" xmlns:ub="http://uniboard.mnemis.com/document" viewBox="0 0 1920 1080"><g fill="#ffffff"><polygon points="100,100 200,100 200,110 100,110"/><polygon points="200,98 300,98 300,112 200,112"/></g><ub:ruler x="10" y="10" width="100" height="20"/></svg>"##;
        let (pages, warnings) = read(xml, Dialect::Ubz, 3);
        let k = 10.0f32 / 14.0;
        assert_eq!(pages[0].items, vec![Item::Stroke { m: IDENTITY, color: [255, 255, 255], width: 14.0, points: vec![[100.0, 105.0, k], [200.0, 105.0, k], [300.0, 105.0, 1.0]] }]);
        assert_eq!(warnings, vec!["page 3 : 1 règle non lue".to_string()]);
    }

    /// Review Focus 3.
    #[test]
    fn colors_of_the_suite() {
        assert_eq!(color_of("red"), Some([255, 0, 0]));
        assert_eq!(color_of("Grey"), Some([128, 128, 128]));
        assert_eq!(color_of("pink"), Some([255, 192, 203]));
        assert_eq!(color_of("rgb(0,255,0)"), Some([0, 255, 0]));
        assert_eq!(color_of("rgb(100%,0%,0%)"), Some([255, 0, 0]));
        assert_eq!(color_of("#f00"), Some([255, 0, 0]));
        assert_eq!(color_of("#ff0000"), Some([255, 0, 0]));
        assert_eq!(color_of("nonsense"), None);
        assert_eq!(color_of("#é00"), None);
    }

    /// Review Focus 4 : forme de `repeat_attributes.iwb`.
    #[test]
    fn repeated_attribute_first_wins() {
        assert!(matches!(&items(&iwb(r#"<svg:rect x="1" x="5" width="2" height="2"/>"#, ""))[0], Item::Shape { x0, .. } if *x0 == 1.0));
    }

    #[test]
    fn transforms_compose_left_to_right() {
        let r = parse_transform("rotate(180,-85,-85)").expect("rotation");
        for (a, b) in r.iter().zip([-1.0, 0.0, 0.0, -1.0, -170.0, -170.0]) {
            assert!((a - b).abs() < 1e-3, "{r:?}");
        }
        let t = parse_transform("rotate(90) translate(105,25)").expect("composée");
        for (a, b) in t.iter().zip([0.0, 1.0, -1.0, 0.0, -25.0, 105.0]) {
            assert!((a - b).abs() < 1e-3, "{t:?}");
        }
        assert_eq!(parse_transform("bogus(1)"), None);
        assert_eq!(parse_transform("translate(1,2"), None);
    }

    #[test]
    fn text_align_other_than_start_is_said() {
        let (_, warnings) = read(&iwb(r#"<svg:textarea x="0" y="0" text-align="center">a</svg:textarea>"#, ""), Dialect::Iwb, 1);
        assert_eq!(warnings, vec!["page 1 : 1 alignement de texte non lu".to_string()]);
    }
}
```

Si un nom de l'API de `quick-xml` 0.42 diffère (vérifier dans `~/.cargo/registry/src/*/quick-xml-0.42.0/src/`), garder
le comportement : `BytesCData` peut demander `into_inner()` au lieu de `xml10_content()` ; `LocalName` se lit par
`as_ref()` en `&str`.

- [ ] **Étape 3 : tests verts** (commande bornée), puis tous les tests du crate, format, clippy, taille :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T7 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats 2>&1 | grep -E "^test result|FAILED" | tail -5 \
 && nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-formats --all-targets -- -D warnings 2>&1 | tail -3 \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf /tmp/c13-T7-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T7-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c13-T7-formats/roomboard_formats_wasm_bg.wasm
```

Attendu : aucun `FAILED`, clippy muet ; taille ≤ 3 145 728 (le lecteur n'entre dans le module qu'appelé par la liaison
de T6 : si T6 n'est pas encore fusionnée, la taille ne le compte pas, le dire dans le rapport).

- [ ] **Étape 4 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T7 && git add crates/roomboard-formats/src/board/read.rs \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(formats): common SVG reader for .iwb and OpenBoard pages (C13 D1 D8-D16)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sortie des tests (liste des 18), clippy, taille, tout écart d'API `quick-xml` corrigé, et la ligne
`Réutilisation : appelé quick-xml (Reader::from_str, read_event, normalized_value)`.

<a id="tache-t8"></a>
### Tâche T8 — Texte d'OpenBoard : lecteur tolérant du HTML de Qt

**Objectif.** Remplacer le corps d'attente de `read_qt_html` (T2) : le HTML de Qt qu'OpenBoard range dans
`itemTextContent` (déjà désenveloppé du XML par T7) devient des segments `Span`, avec la taille et la couleur du `body`
(celles de l'élément) ; `<p>` et `<br>` en sauts de ligne ; `span`, `b`, `strong`, `i`, `em`, `u`, `font` et leur `style`
portent gras, italique, souligné, taille, couleur, police ; mise en forme fine (listes, tableaux, alignement) →
`reduced` (D11, HU2-6). Jamais `quick-xml` ici (DOCTYPE HTML, `&nbsp;`), aucune ressource externe lue.

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T8` (branche à jour de T1 et T2).

**Fichiers.**
- Modifier (remplacer en entier) : `crates/roomboard-formats/src/board/qt_html.rs`.

**Interfaces.**
- Consomme : `Span`, `Rgb` de `crates/roomboard-formats/src/board.rs` (T2).
- Produit : `pub struct QtText { pub spans: Vec<Span>, pub size: Option<f32>, pub color: Option<Rgb>, pub reduced: bool }` (forme de T2, inchangée) ; `pub fn read_qt_html(html: &str) -> QtText`. Règle de lecture que l'écrivain de T9 suit : `body style="font-size:Npx; color:#rrggbb;"` = élément ; chaque `<span style="…">` = segment ; `<br />` dans un `span` = saut de ligne de ce segment ; `font-weight:600` ou plus = gras ; `font-size` en `px` lu tel quel, en `pt` × 4/3.
- Réutilise : aucun module de la liste n'est concerné (HTML de Qt : lecteur propre exigé par D11 ; OpenBoard lu, jamais copié).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T8 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats board::qt_html 2>&1 | grep -E "^test |^test result|FAILED|error\[" | tail -12
```

Motif : `test result: ok` avec N ≥ 6, ligne `reads_the_shape_our_writer_emits ... ok`.

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables ; aucun troisième module Wasm.
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC5 — Aucun script exécuté : `<script>`, `<style>`, `<head>` sont sautés ; aucune entité externe résolue (seules `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` et les références numériques sont lues).
- GC8 — `crates/roomboard-core/**` intouché ; aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve ; le code d'OpenBoard (GPL, `UBSvgSubsetAdaptor.cpp`) n'est ni copié ni paraphrasé.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree.

**Interdits.** Toucher `read.rs`, `write.rs`, `board.rs` ; changer les champs de `QtText`.

**Terminé quand.** 6 tests verts, crate vert, clippy et fmt propres, taille notée, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Écrire le module de tests ci-dessous à la fin du fichier d'attente ; la commande
  bornée doit montrer `FAILED`.

- [ ] **Étape 2 : écrire `crates/roomboard-formats/src/board/qt_html.rs` en entier.**

```rust
//! Texte d'OpenBoard (C13, D11, HU2-6) : HTML de Qt (`itemTextContent`, déjà désenveloppé du XML) réduit en segments.
//! Petit lecteur tolérant, jamais `quick-xml` (ce HTML commence par `<!DOCTYPE HTML PUBLIC …>` et contient `&nbsp;`) :
//! DOCTYPE et commentaires muets ; `head`, `style`, `script`, `title` sautés ; `<p>` (à partir du second) et `<br>` en
//! sauts de ligne ; `span`, `b`, `strong`, `i`, `em`, `u`, `font` et leur `style` portent la mise en forme ; fins de
//! balise non contrôlées ; entités `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;` et numériques lues, toute autre
//! gardée telle quelle ; aucune ressource externe lue.
use super::{Rgb, Span};

/// Texte lu : segments, taille et couleur du `body` (celles de l'élément), `reduced` si une mise en forme a été perdue.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct QtText {
    pub spans: Vec<Span>,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub reduced: bool,
}

#[derive(Debug, Clone, Default, PartialEq)]
struct Look {
    bold: bool,
    italic: bool,
    underline: bool,
    size: Option<f32>,
    color: Option<Rgb>,
    font: Option<String>,
}

/// Indice du `>` qui ferme la balise ouverte en 0, hors guillemets ; longueur si absent.
fn tag_end(s: &str) -> usize {
    let mut quote: Option<char> = None;
    for (i, ch) in s.char_indices().skip(1) {
        match quote {
            Some(q) if ch == q => quote = None,
            Some(_) => {}
            None if ch == '"' || ch == '\'' => quote = Some(ch),
            None if ch == '>' => return i,
            None => {}
        }
    }
    s.len()
}

/// (fermante, nom en minuscules, reste des attributs).
fn split_tag(tag: &str) -> (bool, String, &str) {
    let t = tag.trim();
    let (closing, t) = match t.strip_prefix('/') {
        Some(r) => (true, r.trim_start()),
        None => (false, t),
    };
    let end = t.find(|c: char| c.is_whitespace() || c == '/').unwrap_or(t.len());
    (closing, t[..end].to_ascii_lowercase(), &t[end..])
}

/// Valeur d'un attribut (`clé="…"`, `clé='…'` ou nue), clé sans casse.
fn attr_value(attrs: &str, key: &str) -> Option<String> {
    let lower = attrs.to_ascii_lowercase();
    let mut from = 0;
    while let Some(k) = lower[from..].find(key) {
        let at = from + k;
        let before_ok = at == 0 || lower.as_bytes()[at - 1].is_ascii_whitespace();
        let rest = lower[at + key.len()..].trim_start();
        if before_ok && rest.starts_with('=') {
            let off = attrs.len() - rest.len() + 1;
            let v = attrs[off..].trim_start();
            let q = v.chars().next()?;
            if q == '"' || q == '\'' {
                return v[1..].find(q).map(|e| v[1..1 + e].to_string());
            }
            return Some(v.split_whitespace().next().unwrap_or("").to_string());
        }
        from = at + key.len();
    }
    None
}

fn size_px(v: &str) -> Option<f32> {
    let v = v.trim();
    let (n, pt) = if let Some(n) = v.strip_suffix("pt") {
        (n, true)
    } else if let Some(n) = v.strip_suffix("px") {
        (n, false)
    } else {
        (v, false)
    };
    n.trim().parse::<f32>().ok().map(|x| if pt { x * 4.0 / 3.0 } else { x }).filter(|x| x.is_finite() && *x > 0.0)
}

fn hex_color(v: &str) -> Option<Rgb> {
    let h = v.trim().strip_prefix('#')?;
    if !h.is_ascii() {
        return None;
    }
    match h.len() {
        6 => Some([u8::from_str_radix(&h[0..2], 16).ok()?, u8::from_str_radix(&h[2..4], 16).ok()?, u8::from_str_radix(&h[4..6], 16).ok()?]),
        3 => {
            let d = |i: usize| u8::from_str_radix(&h[i..i + 1], 16).ok().map(|x| x * 17);
            Some([d(0)?, d(1)?, d(2)?])
        }
        _ => None,
    }
}

/// `base` complété par le `style="…"` (et `color=` d'un `<font>`) de la balise.
fn styled(base: &Look, attrs: &str) -> Look {
    let mut l = base.clone();
    if let Some(css) = attr_value(attrs, "style") {
        for decl in css.split(';') {
            let Some((k, v)) = decl.split_once(':') else { continue };
            let v = v.trim();
            match k.trim().to_ascii_lowercase().as_str() {
                "font-weight" => l.bold = v == "bold" || v == "bolder" || v.parse::<u32>().is_ok_and(|w| w >= 600),
                "font-style" => l.italic = v == "italic" || v == "oblique",
                "text-decoration" => l.underline = v.contains("underline"),
                "font-size" => {
                    if let Some(z) = size_px(v) {
                        l.size = Some(z);
                    }
                }
                "color" => {
                    if let Some(c) = hex_color(v) {
                        l.color = Some(c);
                    }
                }
                "font-family" => {
                    let f = v.split(',').next().unwrap_or("").trim().trim_matches(|c| c == '\'' || c == '"');
                    if !f.is_empty() {
                        l.font = Some(f.to_string());
                    }
                }
                _ => {}
            }
        }
    }
    if let Some(c) = attr_value(attrs, "color").and_then(|v| hex_color(&v)) {
        l.color = Some(c);
    }
    l
}

fn tagged(name: &str, l: Look) -> Look {
    let mut l = l;
    match name {
        "b" | "strong" => l.bold = true,
        "i" | "em" => l.italic = true,
        "u" => l.underline = true,
        _ => {}
    }
    l
}

fn aligned(attrs: &str) -> bool {
    attr_value(attrs, "style").is_some_and(|css| {
        css.split(';')
            .filter_map(|d| d.split_once(':'))
            .any(|(k, v)| k.trim().eq_ignore_ascii_case("text-align") && !matches!(v.trim(), "" | "left" | "start"))
    })
}

fn entity(name: &str) -> Option<char> {
    match name {
        "nbsp" => Some(' '),
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        _ => {
            let n = name.strip_prefix('#')?;
            let code = match n.strip_prefix('x').or_else(|| n.strip_prefix('X')) {
                Some(h) => u32::from_str_radix(h, 16).ok()?,
                None => n.parse::<u32>().ok()?,
            };
            char::from_u32(code)
        }
    }
}

fn decode(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut rest = raw;
    while let Some(k) = rest.find('&') {
        out.push_str(&rest[..k]);
        let tail = &rest[k..];
        match tail.find(';').filter(|&e| e <= 12) {
            Some(e) => {
                match entity(&tail[1..e]) {
                    Some(ch) => out.push(ch),
                    None => out.push_str(&tail[..=e]),
                }
                rest = &tail[e + 1..];
            }
            None => {
                out.push('&');
                rest = &tail[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

fn push(out: &mut QtText, ch: char, l: &Look) {
    if let Some(s) = out.spans.last_mut() {
        if s.bold == l.bold && s.italic == l.italic && s.underline == l.underline && s.size == l.size && s.color == l.color && s.font == l.font {
            s.text.push(ch);
            return;
        }
    }
    out.spans.push(Span { text: ch.to_string(), bold: l.bold, italic: l.italic, underline: l.underline, size: l.size, color: l.color, font: l.font.clone() });
}

pub fn read_qt_html(html: &str) -> QtText {
    let mut out = QtText::default();
    let mut cur = Look::default();
    let mut stack: Vec<(String, Look)> = Vec::new();
    let mut paragraphs = 0usize;
    let mut skip: Option<String> = None;
    let mut rest = html;
    while !rest.is_empty() {
        if let Some(after) = rest.strip_prefix("<!--") {
            rest = after.find("-->").map_or("", |k| &after[k + 3..]);
            continue;
        }
        if rest.starts_with('<') {
            let end = tag_end(rest);
            let tag = &rest[1..end];
            rest = rest.get(end + 1..).unwrap_or("");
            let (closing, name, attrs) = split_tag(tag);
            if name.is_empty() || name.starts_with('!') || name.starts_with('?') {
                continue;
            }
            if let Some(s) = &skip {
                if closing && name == *s {
                    skip = None;
                }
                continue;
            }
            if closing {
                if let Some(k) = stack.iter().rposition(|(n, _)| *n == name) {
                    cur = stack[k].1.clone();
                    stack.truncate(k);
                }
                continue;
            }
            match name.as_str() {
                "head" | "style" | "script" | "title" => {
                    if !tag.trim_end().ends_with('/') {
                        skip = Some(name);
                    }
                }
                "body" => {
                    let l = styled(&Look::default(), attrs);
                    out.size = l.size;
                    out.color = l.color;
                    cur = Look { size: None, color: None, ..l };
                }
                "p" => {
                    if paragraphs > 0 {
                        push(&mut out, '\n', &cur);
                    }
                    paragraphs += 1;
                    if aligned(attrs) {
                        out.reduced = true;
                    }
                }
                "br" => push(&mut out, '\n', &cur),
                "span" | "b" | "strong" | "i" | "em" | "u" | "font" => {
                    let l = tagged(&name, styled(&cur, attrs));
                    stack.push((name, cur.clone()));
                    cur = l;
                }
                "table" | "ul" | "ol" | "li" | "img" | "a" | "hr" => out.reduced = true,
                _ => {}
            }
            continue;
        }
        let k = rest.find('<').unwrap_or(rest.len());
        let raw = &rest[..k];
        rest = &rest[k..];
        if skip.is_some() || (raw.trim().is_empty() && (raw.contains('\n') || paragraphs == 0)) {
            continue;
        }
        for ch in decode(raw).chars() {
            push(&mut out, ch, &cur);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const DOCTYPE: &str = r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">"#;

    /// Forme écrite par `write.rs` (T9) : le texte d'une copie `.ubz` se relit à l'identique.
    #[test]
    fn reads_the_shape_our_writer_emits() {
        let html = format!(
            r#"{DOCTYPE}<html><head><meta name="qrichtext" content="1" /></head><body style="font-size:24px; color:#000000;"><p><span style="font-weight:600;">Bonjour<br />à </span><span style="font-size:32px; color:#ff0000; font-family:'Liberation Sans';">monde</span></p></body></html>"#
        );
        let t = read_qt_html(&html);
        assert_eq!((t.size, t.color, t.reduced), (Some(24.0), Some([0, 0, 0]), false));
        assert_eq!(
            t.spans,
            vec![
                Span { text: "Bonjour\nà ".into(), bold: true, ..Span::default() },
                Span { text: "monde".into(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".into()), ..Span::default() },
            ]
        );
    }

    #[test]
    fn qt_layout_paragraphs_entities_and_points() {
        let html = format!("{DOCTYPE}\n<html><head><style type=\"text/css\">\np, li {{ white-space: pre-wrap; }}\n</style></head><body style=\" font-family:'Arial'; font-size:48pt; color:#ffffff;\">\n<p style=\" margin-top:0px;\">Ligne&nbsp;1 &amp; &#233;t&#xE9; &foo;</p>\n<p>Ligne 2</p></body></html>");
        let t = read_qt_html(&html);
        assert_eq!(t.size, Some(64.0));
        assert_eq!(t.color, Some([255, 255, 255]));
        let text: String = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(text, "Ligne 1 & été &foo;\nLigne 2");
        assert!(t.spans.iter().all(|s| s.font.as_deref() == Some("Arial")));
    }

    #[test]
    fn stray_and_missing_end_tags_are_tolerated() {
        let t = read_qt_html(r#"<body><span style="font-weight:600">a</b>b<i>c"#);
        let text: Vec<(&str, bool, bool)> = t.spans.iter().map(|s| (s.text.as_str(), s.bold, s.italic)).collect();
        assert_eq!(text, vec![("ab", true, false), ("c", true, true)]);
    }

    #[test]
    fn head_style_and_script_are_silent() {
        let t = read_qt_html("<html><head><title>T</title><script>alert(1)</script></head><body><p>vu</p><script>alert(2)</script></body></html>");
        let text: String = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(text, "vu");
    }

    #[test]
    fn lists_tables_and_alignment_mark_reduced() {
        assert!(read_qt_html("<body><ul><li>a</li></ul></body>").reduced);
        assert!(read_qt_html(r#"<body><p style="text-align:center;">a</p></body>"#).reduced);
        assert!(!read_qt_html("<body><p>a</p></body>").reduced);
    }

    #[test]
    fn plain_text_and_empty_html() {
        let t = read_qt_html("simple");
        assert_eq!(t.spans, vec![Span { text: "simple".into(), ..Span::default() }]);
        assert_eq!(read_qt_html(""), QtText::default());
    }
}
```

`plain_text_and_empty_html` : un texte sans balise (`paragraphs == 0`, non blanc) est lu ; c'est voulu (forme minimale).

- [ ] **Étape 3 : tests verts** (commande bornée), puis :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T8 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats 2>&1 | grep -E "^test result|FAILED" | tail -5 \
 && nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-formats --all-targets -- -D warnings 2>&1 | tail -3 \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf /tmp/c13-T8-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T8-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c13-T8-formats/roomboard_formats_wasm_bg.wasm
```

- [ ] **Étape 4 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T8 && git add crates/roomboard-formats/src/board/qt_html.rs \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(formats): tolerant reader of OpenBoard Qt rich text (C13 D11)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties des tests, clippy, taille, et la ligne `Réutilisation : écart — aucun module de la liste ne couvre le HTML de Qt (lecteur propre, D11)`.

<a id="tache-t9"></a>
### Tâche T9 — Écrivain des copies `.iwb` et `.ubz`, avis de tiers 1EdTech

**Objectif.** Remplacer les corps d'attente de `write_iwb`, `write_ubz_pages`, `ubz_metadata` (T2) : un flux BoardList
devient le `content.xml` d'un `.iwb` (racine `<iwb version="1.0">`, espace de la norme finale, D19) ou les pages
`pageNNN.svg` et le `metadata.rdf` d'un `.ubz` (`ub:version` 4.8.0) ; groupes en `g`, fond en premier `rect` (lus par
`read_svg`, D13, D14), cadre `viewBox="0 0 1920 H"` avec `H = max(1080, bas du contenu)` (D18). Ajouter l'attribution
1EdTech à `THIRD_PARTY_NOTICES.md` (D21).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T9` (branche à jour de T1 et T2).

**Fichiers.**
- Modifier (remplacer en entier) : `crates/roomboard-formats/src/board/write.rs`.
- Modifier : `THIRD_PARTY_NOTICES.md` (section ajoutée à la fin).

**Interfaces.**
- Consomme : `parse`, `apply`, `BoardList`, `BoardError`, `Item`, `Page`, `Rgb`, `Mat`, `ShapeKind`, `Span`, `PAGE_WIDTH`, `PAGE_HEIGHT` (T2) ; `board::fixtures::{w1_list, w1_pages}` et `board::encode` (tests).
- Produit (signatures de T2, inchangées) : `pub fn write_iwb(list: &BoardList) -> Result<String, BoardError>` ; `pub fn write_ubz_pages(list: &BoardList) -> Result<Vec<String>, BoardError>` ; `pub fn ubz_metadata(pages: usize) -> String` ; constantes `IWB_NS`, `UB_NS`, `UB_VERSION`. Forme écrite, relue par T7 et T8 : objets `rect`, `ellipse`, `line`, `polyline`, `textarea` (IWB, `xml:space="preserve"`, un `tspan` par segment, `tbreak` pour un saut de ligne) ou `foreignObject ub:type="text"` avec `itemTextContent` (`.ubz`, HTML de Qt), `image`, `g` ; identifiants `o1`, `o2`… dans l'ordre d'écriture ; matrice de translation seule repliée dans les coordonnées, toute autre écrite en `transform="matrix(a b c d e f)"` ; flèche IWB = `line` + `<iwb:element ref="…" stroke-lineshape-end="arrow"/>` ; flèche `.ubz` = `line` (l'avertissement est dit par T5).
- Réutilise : aucun module de la liste n'est concerné (écriture XML à la main : aucune crate neuve, D22).

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T9 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats board::write 2>&1 | grep -E "^test |^test result|FAILED|error\[" | tail -12
```

Motif : `test result: ok` avec N ≥ 7, ligne `iwb_of_w1_has_namespaces_pages_background_arrow_and_spans ... ok`.

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables ; aucun troisième module Wasm.
- GC4 — Taille du module `formats` mesurée (release wasm32 + `wasm-bindgen --remove-name-section`) et écrite dans le rapport.
- GC5 — Texte et attributs échappés (`&`, `<`, `>`, `"`, `'`), caractères de contrôle interdits en XML 1.0 retirés : une copie est toujours bien formée.
- GC8 — `crates/roomboard-core/**` intouché ; aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve ; OpenBoard lu, jamais copié.
- GC10 — Ni « IWB/CFF » ni « conforme » dans l'interface : les chaînes de norme vivent dans le `.wasm` et dans `THIRD_PARTY_NOTICES.md` seulement (D19, D21).
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree.

**Interdits.** Toucher `read.rs`, `qt_html.rs`, `board.rs` ; écrire le niveau R du `.ubz` (D20, hors lot) ; écrire des
vignettes `pageNNN.thumbnail.jpg` (HU2-3).

**Terminé quand.** 7 tests verts, crate vert, clippy et fmt propres, taille notée, avis de tiers ajouté, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges.** Écrire le module de tests ci-dessous à la fin du fichier d'attente ; la commande
  bornée doit montrer `FAILED` (« écrivain non branché »).

- [ ] **Étape 2 : écrire `crates/roomboard-formats/src/board/write.rs` en entier.**

```rust
//! Écrivain des copies (C13, D17 à D19, niveau E) : flux BoardList → `content.xml` IWB (racine `<iwb version="1.0">`,
//! espace de la norme finale ; lu par nom local, Becta et 1EdTech acceptés) ou pages `pageNNN.svg` et `metadata.rdf`
//! d'OpenBoard (`ub:version` 4.8.0). Groupes en `g` et fond en premier `rect` de la page (relus par `read_svg`, D13,
//! D14) ; cadre de 1 920 de large et `max(1080, bas du contenu)` de haut (D18). Les chaînes d'hôte ne vivent qu'ici,
//! dans le `.wasm` (D19).
use super::{apply, parse, BoardError, BoardList, Item, Mat, Page, Rgb, ShapeKind, Span, PAGE_HEIGHT, PAGE_WIDTH};

pub const IWB_NS: &str = "http://www.imsglobal.org/xsd/iwb_v1p0";
const SVG_NS: &str = "http://www.w3.org/2000/svg";
const XLINK_NS: &str = "http://www.w3.org/1999/xlink";
pub const UB_NS: &str = "http://uniboard.mnemis.com/document";
pub const UB_VERSION: &str = "4.8.0";
const QT_DOCTYPE: &str = r#"<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">"#;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
    Iwb,
    Ubz,
}

/// Nombre écrit au millième, sans zéro inutile ; −0 écrit 0.
fn num(v: f32) -> String {
    let r = (v * 1000.0).round() / 1000.0;
    if r == 0.0 {
        "0".to_string()
    } else {
        format!("{r}")
    }
}

fn hex(c: Rgb) -> String {
    format!("#{:02x}{:02x}{:02x}", c[0], c[1], c[2])
}

/// XML : texte et attributs ; caractères de contrôle (hors tabulation et retours) retirés.
fn esc(s: &str) -> String {
    let mut o = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '&' => o.push_str("&amp;"),
            '<' => o.push_str("&lt;"),
            '>' => o.push_str("&gt;"),
            '"' => o.push_str("&quot;"),
            '\'' => o.push_str("&apos;"),
            c if (c as u32) < 0x20 && !matches!(c, '\t' | '\n' | '\r') => {}
            c => o.push(c),
        }
    }
    o
}

/// HTML de Qt : texte d'un segment.
fn esc_html(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

/// Translation seule : repliée dans les coordonnées ; toute autre matrice : attribut `transform`.
fn place(m: &Mat) -> (String, f32, f32) {
    if m[0] == 1.0 && m[1] == 0.0 && m[2] == 0.0 && m[3] == 1.0 {
        (String::new(), m[4], m[5])
    } else {
        (format!(r#" transform="matrix({} {} {} {} {} {})""#, m[0], m[1], m[2], m[3], num(m[4]), num(m[5])), 0.0, 0.0)
    }
}

fn bottom(it: &Item) -> f32 {
    let lowest = |m: &Mat, pts: &[(f32, f32)]| pts.iter().map(|&(x, y)| apply(m, x, y).1).fold(f32::MIN, f32::max);
    match it {
        Item::Shape { m, x0, y0, x1, y1, .. } => lowest(m, &[(*x0, *y0), (*x1, *y0), (*x0, *y1), (*x1, *y1)]),
        Item::Stroke { m, points, .. } => points.iter().map(|q| apply(m, q[0], q[1]).1).fold(f32::MIN, f32::max),
        Item::Text { m, x, y, w, h, .. } | Item::Image { m, x, y, w, h, .. } => lowest(m, &[(*x, *y), (x + w, *y), (*x, y + h), (x + w, y + h)]),
        Item::Group(items) => items.iter().map(bottom).fold(f32::MIN, f32::max),
    }
}

/// D18 : hauteur du cadre, au moins 1 080.
fn frame_height(pages: &[Page]) -> f32 {
    pages.iter().flat_map(|p| p.items.iter()).map(bottom).fold(PAGE_HEIGHT, f32::max).ceil()
}

fn span_attrs(sp: &Span) -> String {
    let mut a = String::new();
    if sp.bold {
        a.push_str(r#" font-weight="bold""#);
    }
    if sp.italic {
        a.push_str(r#" font-style="italic""#);
    }
    if sp.underline {
        a.push_str(r#" text-decoration="underline""#);
    }
    if let Some(z) = sp.size {
        a.push_str(&format!(r#" font-size="{}""#, num(z)));
    }
    if let Some(c) = sp.color {
        a.push_str(&format!(r#" fill="{}""#, hex(c)));
    }
    if let Some(f) = &sp.font {
        a.push_str(&format!(r#" font-family="{}""#, esc(f)));
    }
    a
}

/// Texte d'une page `.ubz` : HTML de Qt que `read_qt_html` relit (taille et couleur au `body`, un `span` par segment,
/// `<br />` pour un saut de ligne).
fn qt_html_of(size: f32, color: Rgb, spans: &[Span]) -> String {
    let mut h = format!(r#"{QT_DOCTYPE}<html><head><meta name="qrichtext" content="1" /></head><body style="font-size:{}px; color:{};"><p>"#, num(size), hex(color));
    for sp in spans {
        let mut st = String::new();
        if sp.bold {
            st.push_str("font-weight:600; ");
        }
        if sp.italic {
            st.push_str("font-style:italic; ");
        }
        if sp.underline {
            st.push_str("text-decoration: underline; ");
        }
        if let Some(z) = sp.size {
            st.push_str(&format!("font-size:{}px; ", num(z)));
        }
        if let Some(c) = sp.color {
            st.push_str(&format!("color:{}; ", hex(c)));
        }
        if let Some(f) = &sp.font {
            st.push_str(&format!("font-family:'{}'; ", f.replace(['\'', '"'], "")));
        }
        let text = sp.text.split('\n').map(esc_html).collect::<Vec<_>>().join("<br />");
        h.push_str(&format!(r#"<span style="{}">{text}</span>"#, st.trim_end()));
    }
    h.push_str("</p></body></html>");
    h
}

struct Out {
    s: String,
    kind: Kind,
    next: u32,
    /// `iwb:element` écrits après le `svg` (fond, flèches).
    refs: Vec<String>,
}

impl Out {
    fn new(kind: Kind) -> Out {
        Out { s: String::new(), kind, next: 0, refs: Vec::new() }
    }
    fn p(&self) -> &'static str {
        if self.kind == Kind::Iwb {
            "svg:"
        } else {
            ""
        }
    }
    fn id(&mut self) -> String {
        self.next += 1;
        format!("o{}", self.next)
    }
    fn background(&mut self, bg: Rgb, h: f32) {
        let id = self.id();
        let p = self.p();
        self.s.push_str(&format!(r#"<{p}rect id="{id}" x="0" y="0" width="{}" height="{}" fill="{}" stroke="none"/>"#, num(PAGE_WIDTH), num(h), hex(bg)));
        self.s.push('\n');
        if self.kind == Kind::Iwb {
            self.refs.push(format!(r#"<iwb:element ref="{id}" background="true"/>"#));
        }
    }
    fn item(&mut self, it: &Item) {
        let p = self.p();
        match it {
            Item::Shape { kind, m, x0, y0, x1, y1, color, width, fill } => {
                let id = self.id();
                let (t, dx, dy) = place(m);
                let paint = format!(r#" stroke="{}" stroke-width="{}" fill="{}""#, hex(*color), num(*width), fill.map_or_else(|| "none".to_string(), hex));
                let body = match kind {
                    ShapeKind::Rect => format!(
                        r#"<{p}rect id="{id}" x="{}" y="{}" width="{}" height="{}"{paint}{t}/>"#,
                        num(x0.min(*x1) + dx),
                        num(y0.min(*y1) + dy),
                        num((x1 - x0).abs()),
                        num((y1 - y0).abs())
                    ),
                    ShapeKind::Ellipse => format!(
                        r#"<{p}ellipse id="{id}" cx="{}" cy="{}" rx="{}" ry="{}"{paint}{t}/>"#,
                        num((x0 + x1) / 2.0 + dx),
                        num((y0 + y1) / 2.0 + dy),
                        num((x1 - x0).abs() / 2.0),
                        num((y1 - y0).abs() / 2.0)
                    ),
                    ShapeKind::Line | ShapeKind::Arrow => {
                        format!(r#"<{p}line id="{id}" x1="{}" y1="{}" x2="{}" y2="{}"{paint}{t}/>"#, num(x0 + dx), num(y0 + dy), num(x1 + dx), num(y1 + dy))
                    }
                };
                self.s.push_str(&body);
                if *kind == ShapeKind::Arrow && self.kind == Kind::Iwb {
                    self.refs.push(format!(r#"<iwb:element ref="{id}" stroke-lineshape-end="arrow"/>"#));
                }
            }
            Item::Stroke { m, color, width, points } => {
                let id = self.id();
                let (t, dx, dy) = place(m);
                let pts: Vec<String> = points.iter().map(|q| format!("{},{}", num(q[0] + dx), num(q[1] + dy))).collect();
                self.s.push_str(&format!(
                    r#"<{p}polyline id="{id}" points="{}" stroke="{}" stroke-width="{}" fill="none" stroke-linecap="round" stroke-linejoin="round"{t}/>"#,
                    pts.join(" "),
                    hex(*color),
                    num(*width)
                ));
            }
            Item::Text { m, x, y, w, h, size, color, spans } => {
                let id = self.id();
                let (t, dx, dy) = place(m);
                let (x, y) = (num(x + dx), num(y + dy));
                if self.kind == Kind::Iwb {
                    let mut s = format!(
                        r#"<svg:textarea id="{id}" x="{x}" y="{y}" width="{}" height="{}" font-size="{}" fill="{}" xml:space="preserve"{t}>"#,
                        num(*w),
                        num(*h),
                        num(*size),
                        hex(*color)
                    );
                    for sp in spans {
                        s.push_str(&format!("<svg:tspan{}>", span_attrs(sp)));
                        for (k, part) in sp.text.split('\n').enumerate() {
                            if k > 0 {
                                s.push_str("<svg:tbreak/>");
                            }
                            s.push_str(&esc(part));
                        }
                        s.push_str("</svg:tspan>");
                    }
                    s.push_str("</svg:textarea>");
                    self.s.push_str(&s);
                } else {
                    self.s.push_str(&format!(
                        r#"<foreignObject id="{id}" ub:type="text" x="{x}" y="{y}" width="{}" height="{}"{t}><itemTextContent>{}</itemTextContent></foreignObject>"#,
                        num(*w),
                        num(*h),
                        esc(&qt_html_of(*size, *color, spans))
                    ));
                }
            }
            Item::Image { m, x, y, w, h, href } => {
                let id = self.id();
                let (t, dx, dy) = place(m);
                self.s.push_str(&format!(
                    r#"<{p}image id="{id}" x="{}" y="{}" width="{}" height="{}" preserveAspectRatio="none" xlink:href="{}"{t}/>"#,
                    num(x + dx),
                    num(y + dy),
                    num(*w),
                    num(*h),
                    esc(href)
                ));
            }
            Item::Group(items) => {
                let id = self.id();
                self.s.push_str(&format!(r#"<{p}g id="{id}">"#));
                for i in items {
                    self.item(i);
                }
                self.s.push_str(&format!("</{p}g>"));
            }
        }
    }
}

/// `content.xml` d'une copie `.iwb` (un seul cadre pour toutes les pages : le plus haut).
pub fn write_iwb(list: &BoardList) -> Result<String, BoardError> {
    let pages = parse(list)?;
    let h = num(frame_height(&pages));
    let hf = frame_height(&pages);
    let w = num(PAGE_WIDTH);
    let mut o = Out::new(Kind::Iwb);
    o.s.push_str(&format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<iwb xmlns=\"{IWB_NS}\" xmlns:iwb=\"{IWB_NS}\" xmlns:svg=\"{SVG_NS}\" xmlns:xlink=\"{XLINK_NS}\" version=\"1.0\">\n<svg:svg width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">\n<svg:pageset>\n"
    ));
    for (i, p) in pages.iter().enumerate() {
        o.s.push_str(&format!("<svg:page id=\"page{}\">\n", i + 1));
        if let Some(bg) = p.background {
            o.background(bg, hf);
        }
        for it in &p.items {
            o.item(it);
            o.s.push('\n');
        }
        o.s.push_str("</svg:page>\n");
    }
    o.s.push_str("</svg:pageset>\n</svg:svg>\n");
    for r in std::mem::take(&mut o.refs) {
        o.s.push_str(&r);
        o.s.push('\n');
    }
    o.s.push_str("</iwb>\n");
    Ok(o.s)
}

/// Pages `pageNNN.svg` d'une copie `.ubz`, une chaîne par page, dans l'ordre (cadre propre à chaque page).
pub fn write_ubz_pages(list: &BoardList) -> Result<Vec<String>, BoardError> {
    let pages = parse(list)?;
    Ok(pages
        .iter()
        .map(|p| {
            let hf = frame_height(std::slice::from_ref(p));
            let (w, h) = (num(PAGE_WIDTH), num(hf));
            let mut o = Out::new(Kind::Ubz);
            o.s.push_str(&format!(
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"{SVG_NS}\" xmlns:xlink=\"{XLINK_NS}\" xmlns:ub=\"{UB_NS}\" ub:version=\"{UB_VERSION}\" width=\"{w}\" height=\"{h}\" viewBox=\"0 0 {w} {h}\">\n"
            ));
            if let Some(bg) = p.background {
                o.background(bg, hf);
            }
            for it in &p.items {
                o.item(it);
                o.s.push('\n');
            }
            o.s.push_str("</svg>\n");
            o.s
        })
        .collect())
}

/// `metadata.rdf` d'une copie `.ubz`.
pub fn ubz_metadata(pages: usize) -> String {
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:ub=\"{UB_NS}\">\n <rdf:Description>\n  <dc:title>RoomBoard</dc:title>\n  <ub:version>{UB_VERSION}</ub:version>\n  <ub:pageCount>{pages}</ub:pageCount>\n </rdf:Description>\n</rdf:RDF>\n"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::board::fixtures::{w1_list, w1_pages};
    use crate::board::{encode, IDENTITY};

    fn well_formed(xml: &str) {
        let mut r = quick_xml::Reader::from_str(xml);
        loop {
            match r.read_event() {
                Ok(quick_xml::events::Event::Eof) => break,
                Ok(_) => {}
                Err(e) => panic!("XML mal formé : {e}\n{xml}"),
            }
        }
    }

    fn one_page(items: Vec<Item>) -> BoardList {
        encode(&[Page { background: None, items }])
    }

    #[test]
    fn iwb_of_w1_has_namespaces_pages_background_arrow_and_spans() {
        let xml = write_iwb(&w1_list()).expect("iwb");
        well_formed(&xml);
        for part in [
            r#"<iwb xmlns="http://www.imsglobal.org/xsd/iwb_v1p0""#,
            r#"version="1.0">"#,
            r#"viewBox="0 0 1920 1080""#,
            "<svg:pageset>",
            r#"<svg:page id="page1">"#,
            r#"<svg:page id="page2">"#,
            r#"<iwb:element ref="o1" background="true"/>"#,
            r#"<iwb:element ref="o8" stroke-lineshape-end="arrow"/>"#,
            r##"<svg:rect id="o2" x="10" y="20" width="100" height="50" stroke="#ff0000" stroke-width="4" fill="#0000ff"/>"##,
            r##"<svg:textarea id="o4" x="100" y="200" width="300" height="50" font-size="24" fill="#000000" xml:space="preserve">"##,
            r#"<svg:tspan font-weight="bold">Bonjour </svg:tspan>"#,
            r##"<svg:tspan font-size="32" fill="#ff0000" font-family="Liberation Sans">monde</svg:tspan>"##,
            r#"xlink:href="images/a.png""#,
            r#"<svg:g id="o6">"#,
        ] {
            assert!(xml.contains(part), "{part}\n{xml}");
        }
        assert_eq!(xml.matches("<svg:page ").count(), 2);
        assert_eq!(w1_pages().len(), 2);
    }

    #[test]
    fn frame_height_follows_the_lowest_object() {
        let list = one_page(vec![Item::Shape { kind: ShapeKind::Rect, m: IDENTITY, x0: 0.0, y0: 2900.0, x1: 10.0, y1: 2999.5, color: [0, 0, 0], width: 1.0, fill: None }]);
        assert!(write_iwb(&list).expect("iwb").contains(r#"viewBox="0 0 1920 3000""#));
        assert!(write_ubz_pages(&list).expect("ubz")[0].contains(r#"viewBox="0 0 1920 3000""#));
    }

    #[test]
    fn pure_translation_is_folded_other_matrices_kept() {
        let list = one_page(vec![
            Item::Image { m: [1.0, 0.0, 0.0, 1.0, 30.0, 40.0], x: 0.0, y: 0.0, w: 8.0, h: 8.0, href: "images/a.png".into() },
            Item::Image { m: [0.0, 1.0, -1.0, 0.0, 30.0, 40.0], x: 0.0, y: 0.0, w: 8.0, h: 8.0, href: "images/a.png".into() },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        assert!(xml.contains(r#"<svg:image id="o1" x="30" y="40" width="8" height="8""#), "{xml}");
        assert!(xml.contains(r#"transform="matrix(0 1 -1 0 30 40)""#), "{xml}");
    }

    #[test]
    fn ubz_pages_have_ub_namespace_background_first_and_qt_text() {
        let pages = write_ubz_pages(&w1_list()).expect("ubz");
        assert_eq!(pages.len(), 2);
        for p in &pages {
            well_formed(p);
            assert!(p.contains(r#"xmlns:ub="http://uniboard.mnemis.com/document""#) && p.contains(r#"ub:version="4.8.0""#));
        }
        let first = &pages[0];
        let rect = first.find("<rect").expect("fond");
        assert!(first[rect..].starts_with(r##"<rect id="o1" x="0" y="0" width="1920" height="1080" fill="#000000""##), "{first}");
        assert!(first.contains(r#"<foreignObject id="o4" ub:type="text" x="100" y="200" width="300" height="50"><itemTextContent>&lt;!DOCTYPE HTML"#), "{first}");
        assert!(first.contains("font-weight:600;&quot;&gt;Bonjour &lt;/span&gt;"), "{first}");
        assert!(!first.contains("iwb:element"));
    }

    #[test]
    fn text_and_attributes_are_escaped() {
        let list = one_page(vec![
            Item::Text { m: IDENTITY, x: 0.0, y: 0.0, w: 10.0, h: 10.0, size: 12.0, color: [0, 0, 0], spans: vec![Span { text: "a<b&c\"d'\u{1}e\nf".into(), font: Some("X\"Y".into()), ..Span::default() }] },
            Item::Image { m: IDENTITY, x: 0.0, y: 0.0, w: 1.0, h: 1.0, href: "images/a&b.png".into() },
        ]);
        let xml = write_iwb(&list).expect("iwb");
        well_formed(&xml);
        assert!(xml.contains("a&lt;b&amp;c&quot;d&apos;e<svg:tbreak/>f"), "{xml}");
        assert!(xml.contains(r#"font-family="X&quot;Y""#) && xml.contains(r#"xlink:href="images/a&amp;b.png""#));
        for p in write_ubz_pages(&list).expect("ubz") {
            well_formed(&p);
        }
    }

    #[test]
    fn bad_list_is_refused_before_writing() {
        let bad = BoardList { ops: vec![9.0], texts: Vec::new(), warnings: Vec::new() };
        assert!(matches!(write_iwb(&bad), Err(BoardError::BadList(_))));
        assert!(matches!(write_ubz_pages(&bad), Err(BoardError::BadList(_))));
    }

    #[test]
    fn ubz_metadata_names_version_and_page_count() {
        let m = ubz_metadata(2);
        well_formed(&m);
        assert!(m.contains("<ub:version>4.8.0</ub:version>") && m.contains("<ub:pageCount>2</ub:pageCount>"));
    }
}
```

Dans `write_iwb`, `h` (texte) et `hf` (nombre) portent la même hauteur ; garder les deux noms ou n'en garder qu'un, au
choix (clippy doit rester muet).

- [ ] **Étape 3 : tests verts** (commande bornée), crate entier, format, clippy, taille :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T9 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats 2>&1 | grep -E "^test result|FAILED" | tail -5 \
 && nice -n 10 cargo fmt --all && nice -n 10 cargo clippy -p roomboard-formats --all-targets -- -D warnings 2>&1 | tail -3 \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf /tmp/c13-T9-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir /tmp/c13-T9-formats \
    target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c13-T9-formats/roomboard_formats_wasm_bg.wasm
```

- [ ] **Étape 4 : avis de tiers (D21).** Ajouter à la fin de `THIRD_PARTY_NOTICES.md` :

```markdown

## Formats de tableaux interactifs (C13)

- **IWB/CFF** (Interactive Whiteboard Common File Format), version 1.0, © 1EdTech Consortium, Inc. (ex-IMS Global
  Learning Consortium) ; travaux initiaux de Becta. RoomBoard lit et écrit des fichiers `.iwb` au titre de la licence
  de spécification de 1EdTech (https://www.1edtech.org/standards/specification-license, § 3 : mise en œuvre sans
  redevance). RoomBoard ne revendique aucune conformité à la norme et n'emploie pas son nom dans son interface (§ 2c ;
  https://www.1edtech.org/about/legal/trademarks).
- **OpenBoard** `.ubz` : format lu et écrit d'après le comportement d'OpenBoard (GPL-3.0) ; aucun code d'OpenBoard
  n'est repris dans RoomBoard.
- Lecteur XML : `quick-xml` 0.42 (MIT), déjà relevé par `calamine` (`scripts/licences-acceptees.json`).
```

- [ ] **Étape 5 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T9 && git add crates/roomboard-formats/src/board/write.rs \
 && git add THIRD_PARTY_NOTICES.md \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(formats): .iwb and .ubz copy writer, 1EdTech attribution (C13 D18 D19 D21)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties des tests, clippy, taille, et la ligne `Réutilisation : écart — aucun module de la liste ne couvre l'écriture XML (écrite à la main, aucune crate neuve)`.

<a id="tache-t10"></a>
### Tâche T10 — Espace de travail : ouvrir un tableau, enregistrer une copie

**Objectif.** `workspace.openBoard` ouvre un `.iwb` (ZIP ou XML brut) ou un `.ubz` dans un nouvel onglet
`<nom>.roomboard`, cible nulle, sans étape d'annulation, avec un seul avis qui liste les avertissements (D5, D15) ;
`workspace.exportBoard("iwb" | "ubz")` écrit la copie de l'onglet actif (D17, D18). L'importeur reçoit `openBoard`.
Le câblage des vrais ports (amorce, boutons) est fait par T12.

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T10` (branche à jour de T4 et T5).

**Fichiers.**
- Créer : `apps/web/src/app/board-files.ts`, `apps/web/src/app/board-files.test.ts`.
- Modifier : `apps/web/src/app/workspace.ts` (imports, lignes 8-41 ; `WorkspaceDeps`, lignes 63-113 ; `Workspace`, lignes 115-160 ; importeur, lignes 352-366 ; méthodes après `exportPdf`, ligne 482).
- Modifier : `apps/web/src/app/workspace.test.ts` (`SetupOptions` et `setupWorkspace`, lignes 221-290 ; `describe` ajouté à la fin).

**Interfaces.**
- Consomme : de T5 (`apps/web/src/app/board-io.ts`) `BoardFormat`, `BoardPorts`, `decodeBoardList`, `encodeBoardList` (tests), `buildBoardDocument`, `boardListOf`, `BoardListPage` (tests) ; de T4 `hasZipMagic` (`platform/import.ts`), `ImportDeps.openBoard`, `ROOMBOARD_EXTENSION` (`platform/files.ts`) ; existants `decodeImage` (`platform/image-import.ts`), `TypedFiles` (`platform/typed-files.ts`), `PDF_MAX_PAGES` (`core/api.ts`), `addTab`, `say`, `full`, `makeAssets`, `missingOf`, `BUSY_MESSAGE`, `UNREAD_ASSETS_MESSAGE`, `TOO_MANY_TABS`, `APP_VERSION`, `messageOf`, `baseName`.
- Produit :
  - `board-files.ts` : `BOARD_NO_PAGE_MESSAGE = "tableau sans page"`, `IWB_NO_CONTENT_MESSAGE`, `UBZ_NO_PAGE_MESSAGE`, `UBZ_NOT_ZIP_MESSAGE` ; `export interface BoardSources { readonly xml: readonly Blob[]; readonly media: ReadonlyMap<string, Blob>; readonly total: number }` ; `export function boardSources(format: BoardFormat, entries: readonly { readonly path: string; readonly blob: Blob }[]): BoardSources` ; `boardFirstPagesMessage(total)`, `boardWarningsMessage(name, warnings)`, `boardSavedMessage(format, warnings)`, `boardTabName(name, format)`, `boardExportName(tabName, format)`.
  - `WorkspaceDeps` : `readonly board?: BoardPorts`, `readonly iwbFiles?: TypedFiles`, `readonly ubzFiles?: TypedFiles`.
  - `Workspace` : `openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardFormat }): Promise<boolean>` ; `exportBoard(format: BoardFormat): Promise<boolean>` (T12 les relie : `App.tsx` `exportBoard: (f) => void ws.exportBoard(f)`).
- Réutilise : `apps/web/src/app/workspace.ts:396` (`openPdf`) — `addTab(doc, { name, target: null }, assets)`, `say(…)`, `full()` / `TOO_MANY_TABS`, même forme d'échec « Ouverture impossible (nom) : … ».

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T10 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null && cd apps/web \
 && nice -n 10 pnpm exec vitest run src/app/board-files.test.ts src/app/workspace.test.ts -t "C13" 2>&1 | tail -6
```

Motif : `Tests  N passed` avec N ≥ 12, aucun `FAIL`, nom `C13 : .iwb ZIP ouvert` présent dans `--reporter=verbose`.
Tests à garder verts : tout `workspace.test.ts` (ouverture, PDF, export PDF) et la suite web entière (étape 6).

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC5 — Bornes : 500 premières pages d'un `.ubz` ouvertes avec un avis (comme le PDF) ; un test.
- GC6 — Aucune requête réseau : les images viennent des entrées du ZIP.
- GC7 — Fixtures fabriquées dans les tests.
- GC8 — Aucune commande de cœur neuve ; `crates/**` intouché.
- GC9 — Aucune dépendance neuve.
- GC10 — Messages en français ; ni « IWB/CFF » ni « conforme ».
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` ; avant `tsc`, copier `apps/web/src/wasm` et `apps/web/src/wasm-formats` du worktree du chantier (jamais commités).

**Interdits.** Toucher `main.ts`, `App.tsx` (T12), `board-io.ts` (T5), `import.ts` (T4) ; réécrire l'original
(`target: null` toujours) ; ouvrir le tableau dans l'onglet actif.

**Terminé quand.** 15 tests neufs verts, suite web verte, `tsc` propre, un commit.

**Étapes.**

- [ ] **Étape 1 : tests rouges de `board-files`.** Créer `apps/web/src/app/board-files.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  boardExportName, boardSavedMessage, boardSources, boardTabName, boardWarningsMessage, IWB_NO_CONTENT_MESSAGE, UBZ_NO_PAGE_MESSAGE,
} from "./board-files";

const blob = (s: string): Blob => new Blob([s]);
const text = (b: Blob): Promise<string> => b.text();

describe("board-files (C13, D3, D5)", () => {
  it("C13 : boardSources accepte Content.xml et les barres inverses (Review Focus 5)", async () => {
    const s = boardSources("iwb", [{ path: "Content.XML", blob: blob("<iwb/>") }, { path: "images\\a.PNG", blob: blob("png") }, { path: "./images/b.jpg", blob: blob("jpg") }]);
    expect(await text(s.xml[0]!)).toBe("<iwb/>");
    expect([...s.media.keys()]).toEqual(["images/a.PNG", "images/b.jpg"]);
    expect(s.total).toBe(1);
  });

  it("C13 : .iwb ZIP sans content.xml : « fichier endommagé : aucun content.xml dans ce .iwb »", () => {
    expect(() => boardSources("iwb", [{ path: "images/a.png", blob: blob("x") }])).toThrow(IWB_NO_CONTENT_MESSAGE);
  });

  it("C13 : .ubz : pages triées par numéro (page2 avant page10), 500 au plus, total gardé", async () => {
    const s = boardSources("ubz", [{ path: "page10.svg", blob: blob("10") }, { path: "page2.svg", blob: blob("2") }, { path: "images/x.png", blob: blob("x") }]);
    expect(await Promise.all(s.xml.map(text))).toEqual(["2", "10"]);
    expect([...s.media.keys()]).toEqual(["images/x.png"]);
    const many = boardSources("ubz", Array.from({ length: 501 }, (_, i) => ({ path: `page${String(i + 1).padStart(3, "0")}.svg`, blob: blob(String(i + 1)) })));
    expect([many.xml.length, many.total]).toEqual([500, 501]);
  });

  it("C13 : .ubz sans page : « fichier endommagé : aucune page pageNNN.svg dans ce .ubz »", () => {
    expect(() => boardSources("ubz", [{ path: "metadata.rdf", blob: blob("x") }])).toThrow(UBZ_NO_PAGE_MESSAGE);
  });

  it("C13 : noms : onglet « Cours.roomboard », copies « Cours.iwb » et « Sans titre.ubz »", () => {
    expect(boardTabName("Cours.IWB", "iwb")).toBe("Cours.roomboard");
    expect(boardTabName("OpenBoard.ubz", "ubz")).toBe("OpenBoard.roomboard");
    expect(boardExportName("Cours.roomboard", "iwb")).toBe("Cours.iwb");
    expect(boardExportName("Sans titre", "ubz")).toBe("Sans titre.ubz");
  });

  it("C13 : avis : un avertissement, plusieurs, copie enregistrée avec ou sans avertissement", () => {
    expect(boardWarningsMessage("a.iwb", ["page 1 : 1 vidéo non lue"])).toBe("a.iwb : ouvert avec 1 avertissement :\n- page 1 : 1 vidéo non lue");
    expect(boardWarningsMessage("a.ubz", ["x", "y"])).toBe("a.ubz : ouvert avec 2 avertissements :\n- x\n- y");
    expect(boardSavedMessage("iwb", [])).toBe("Copie enregistrée au format .iwb");
    expect(boardSavedMessage("ubz", ["1 flèche écrite en ligne (.ubz)"])).toBe("Copie enregistrée au format .ubz, avec 1 avertissement :\n- 1 flèche écrite en ligne (.ubz)");
  });
});
```

- [ ] **Étape 2 : `board-files.ts`.**

```ts
/**
 * Tableaux `.iwb` et `.ubz` côté espace de travail (C13, D3, D5, D16, D17) : choix des entrées d'une archive
 * (`content.xml` ou pages `pageNNN.svg` triées par numéro, images à côté), noms d'onglet et de copie, avis. Aucun DOM.
 */
import { PDF_MAX_PAGES } from "../core/api";
import { ROOMBOARD_EXTENSION } from "../platform/files";
import type { BoardFormat } from "./board-io";

export const BOARD_NO_PAGE_MESSAGE = "tableau sans page";
export const IWB_NO_CONTENT_MESSAGE = "fichier endommagé : aucun content.xml dans ce .iwb";
export const UBZ_NO_PAGE_MESSAGE = "fichier endommagé : aucune page pageNNN.svg dans ce .ubz";
export const UBZ_NOT_ZIP_MESSAGE = "fichier endommagé : un .ubz est une archive ZIP";

export interface BoardSources {
  readonly xml: readonly Blob[];
  readonly media: ReadonlyMap<string, Blob>;
  readonly total: number;
}

/** Entrées gardées par le Worker ZIP (`keepBoardPath`) → XML à lire (500 pages au plus) et images par chemin normalisé. */
export function boardSources(format: BoardFormat, entries: readonly { readonly path: string; readonly blob: Blob }[]): BoardSources {
  const media = new Map<string, Blob>();
  const pages: Array<{ n: number; blob: Blob }> = [];
  let content: Blob | null = null;
  for (const e of entries) {
    const path = e.path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
    const lower = path.toLowerCase();
    if (format === "iwb" && lower === "content.xml") {
      content = e.blob;
      continue;
    }
    const page = /^page(\d+)\.svg$/.exec(lower);
    if (format === "ubz" && page !== null) {
      pages.push({ n: Number(page[1]), blob: e.blob });
      continue;
    }
    media.set(path, e.blob);
  }
  if (format === "iwb") {
    if (content === null) throw new Error(IWB_NO_CONTENT_MESSAGE);
    return { xml: [content], media, total: 1 };
  }
  if (pages.length === 0) throw new Error(UBZ_NO_PAGE_MESSAGE);
  pages.sort((a, b) => a.n - b.n);
  return { xml: pages.slice(0, PDF_MAX_PAGES).map((p) => p.blob), media, total: pages.length };
}

const listOf = (warnings: readonly string[]): string => warnings.map((w) => `- ${w}`).join("\n");
const count = (n: number): string => `${n} avertissement${n > 1 ? "s" : ""}`;
const stem = (name: string, ext: string): string => (name.toLowerCase().endsWith(ext) && name.length > ext.length ? name.slice(0, -ext.length) : name);

/** D16 : même forme que `pdfFirstPagesMessage`, sans le nom (l'avis le porte). */
export const boardFirstPagesMessage = (total: number): string => `${PDF_MAX_PAGES} premières pages importées sur ${total}`;
/** D15 : un seul avis à l'ouverture, une ligne par avertissement. */
export const boardWarningsMessage = (name: string, warnings: readonly string[]): string => `${name} : ouvert avec ${count(warnings.length)} :\n${listOf(warnings)}`;
export const boardSavedMessage = (format: BoardFormat, warnings: readonly string[]): string =>
  warnings.length === 0 ? `Copie enregistrée au format .${format}` : `Copie enregistrée au format .${format}, avec ${count(warnings.length)} :\n${listOf(warnings)}`;
/** D5 : onglet `<nom>.roomboard`, jamais l'original. */
export const boardTabName = (name: string, format: BoardFormat): string => `${stem(name, `.${format}`)}${ROOMBOARD_EXTENSION}`;
export const boardExportName = (tabName: string, format: BoardFormat): string => `${stem(tabName, ROOMBOARD_EXTENSION)}.${format}`;
```

- [ ] **Étape 3 : tests rouges de l'espace de travail.** Dans `apps/web/src/app/workspace.test.ts` : ajouter aux imports

```ts
import type { ZipFile } from "../platform/zip-read";
import { encodeBoardList, type BoardFormat, type BoardListPage, type BoardPorts } from "./board-io";
```

ajouter à `SetupOptions` :

```ts
  readonly board?: WorkspaceDeps["board"];
  readonly iwbFiles?: WorkspaceDeps["iwbFiles"];
  readonly ubzFiles?: WorkspaceDeps["ubzFiles"];
```

et dans l'appel `createWorkspace({ … })` de `setupWorkspace`, après la ligne `...(o.thumbnail ? … : {}),` :

```ts
    ...(o.board ? { board: o.board } : {}),
    ...(o.iwbFiles ? { iwbFiles: o.iwbFiles } : {}),
    ...(o.ubzFiles ? { ubzFiles: o.ubzFiles } : {}),
```

puis ajouter à la fin du fichier :

```ts
describe("espace de travail : tableaux .iwb et .ubz (C13, D5, D15, D17)", () => {
  const rectPage = (): BoardListPage => ({ background: null, objects: [{ kind: "shape", shape: "rect", m: [1, 0, 0, 1, 0, 0], x0: 0, y0: 0, x1: 10, y1: 10, color: "#000000", width: 2, fill: null }] });
  const ZIP = new Uint8Array([80, 75, 3, 4, 0, 0]);
  function fakeBoard(o: { entries?: { path: string; blob: Blob }[]; warnings?: string[]; fail?: string } = {}) {
    const unzip = vi.fn(async (_b: Blob) => o.entries ?? [{ path: "content.xml", blob: new Blob(["<iwb/>"]) }]);
    const read = vi.fn(async (files: readonly Uint8Array[], _f: BoardFormat) => {
      if (o.fail !== undefined) throw new Error(o.fail);
      return files.map(() => ({ ...encodeBoardList([rectPage()]), warnings: o.warnings ?? [] }));
    });
    const write = vi.fn(async (_l: { readonly ops: Float32Array; readonly texts: readonly string[] }, format: BoardFormat): Promise<ZipFile[]> =>
      format === "iwb" ? [{ path: "content.xml", bytes: new Uint8Array([60]) }] : [{ path: "page001.svg", bytes: new Uint8Array([60]) }, { path: "metadata.rdf", bytes: new Uint8Array([60]) }]);
    const zip = vi.fn(async (_f: readonly ZipFile[]) => new Uint8Array([80, 75, 3, 4]));
    const ports: BoardPorts = { unzip, read, write, zip };
    return { ports, unzip, read, write, zip };
  }
  const typedFiles = () => ({ pick: vi.fn(async () => null), save: vi.fn(async (_n: string, _b: Uint8Array) => true) });
  const droppedOf = (name: string, bytes: Uint8Array): DroppedFile => ({ name, size: bytes.length, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]) });

  it("C13 : .iwb ZIP ouvert : nouvel onglet « Cours.roomboard », sans annulation, cible nulle, un seul avis (S1)", async () => {
    const b = fakeBoard({ warnings: ["page 1 : 1 vidéo non lue"] });
    const ws = await setupWorkspace({ board: b.ports });
    expect(await ws.openBoard({ name: "Cours.iwb", blob: new Blob([ZIP]), format: "iwb" })).toBe(true);
    expect(ws.tabs.list()).toHaveLength(2);
    const tab = ws.active();
    const doc = tab.board.doc;
    expect([tab.files.name(), tab.files.isDirty(), doc.canUndo(), doc.elementIds(doc.pageIds()[0]!).length]).toEqual(["Cours.roomboard", false, false, 1]);
    expect(b.read.mock.calls[0]![1]).toBe("iwb");
    expect(new TextDecoder().decode(b.read.mock.calls[0]![0][0])).toBe("<iwb/>");
    expect(shell.notify).toHaveBeenCalledTimes(1);
    expect(shell.notify).toHaveBeenCalledWith("Cours.iwb : ouvert avec 1 avertissement :\n- page 1 : 1 vidéo non lue");
    expect(await ws.active().files.run("save")).toBe(true);
    expect(host.save.mock.calls[0]?.[1]).toEqual({ kind: "ask", name: "Cours.roomboard" });
  });

  it("C13 : .iwb XML brut : lu tel quel, sans unzip, aucun avis sans avertissement (S2)", async () => {
    const b = fakeBoard();
    const ws = await setupWorkspace({ board: b.ports });
    expect(await ws.openBoard({ name: "brut.iwb", blob: new Blob(['<?xml version="1.0"?><iwb/>']), format: "iwb" })).toBe(true);
    expect(b.unzip).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(b.read.mock.calls[0]![0][0])).toBe('<?xml version="1.0"?><iwb/>');
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("C13 : .ubz : pages triées, 501 pages : 500 lues et « 500 premières pages importées sur 501 » (S3, D16)", async () => {
    const entries = Array.from({ length: 501 }, (_, i) => ({ path: `page${i + 1}.svg`, blob: new Blob([String(i + 1)]) })).reverse();
    const b = fakeBoard({ entries });
    const ws = await setupWorkspace({ board: b.ports });
    expect(await ws.openBoard({ name: "OpenBoard.ubz", blob: new Blob([ZIP]), format: "ubz" })).toBe(true);
    const files = b.read.mock.calls[0]![0];
    expect([files.length, new TextDecoder().decode(files[0]), new TextDecoder().decode(files[1])]).toEqual([500, "1", "2"]);
    expect(ws.active().board.doc.pageIds()).toHaveLength(500);
    expect(shell.notify).toHaveBeenCalledWith("OpenBoard.ubz : ouvert avec 1 avertissement :\n- 500 premières pages importées sur 501");
  });

  it("C13 : fichier endommagé : « Ouverture impossible (abime.iwb) : fichier endommagé : XML mal formé », aucun onglet (S5)", async () => {
    const ws = await setupWorkspace({ board: fakeBoard({ fail: "fichier endommagé : XML mal formé" }).ports });
    expect(await ws.openBoard({ name: "abime.iwb", blob: new Blob([ZIP]), format: "iwb" })).toBe(false);
    expect(ws.tabs.list()).toHaveLength(1);
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (abime.iwb) : fichier endommagé : XML mal formé");
  });

  it("C13 : .ubz sans en-tête ZIP : refusé, « un .ubz est une archive ZIP »", async () => {
    const b = fakeBoard();
    const ws = await setupWorkspace({ board: b.ports });
    expect(await ws.openBoard({ name: "faux.ubz", blob: new Blob(["<svg/>"]), format: "ubz" })).toBe(false);
    expect(b.read).not.toHaveBeenCalled();
    expect(shell.notify).toHaveBeenCalledWith("Ouverture impossible (faux.ubz) : fichier endommagé : un .ubz est une archive ZIP");
  });

  it("C13 : onglets pleins : « trop d'onglets », rien n'est lu", async () => {
    const b = fakeBoard();
    const ws = await setupWorkspace({ board: b.ports });
    for (let i = ws.tabs.list().length; i < MAX_TABS; i++) await ws.newBlank();
    expect(await ws.openBoard({ name: "Cours.iwb", blob: new Blob([ZIP]), format: "iwb" })).toBe(false);
    expect(b.unzip).not.toHaveBeenCalled();
    expect(shell.notify).toHaveBeenCalledWith(TOO_MANY_TABS);
  });

  it("C13 : un .iwb déposé passe par openBoard (registre de T4)", async () => {
    const b = fakeBoard();
    const ws = await setupWorkspace({ board: b.ports });
    const r = await ws.importFiles([droppedOf("Cours.iwb", ZIP)]);
    expect(r.opened).toEqual(["Cours.iwb"]);
    expect(b.unzip).toHaveBeenCalledTimes(1);
  });

  it("C13 : copie .iwb : write, puis zip (content.xml d'abord), nom « Cours.iwb », « Copie enregistrée au format .iwb » (S4)", async () => {
    const b = fakeBoard();
    const iwbFiles = typedFiles();
    const ws = await setupWorkspace({ board: b.ports, iwbFiles });
    await ws.openBoard({ name: "Cours.iwb", blob: new Blob([ZIP]), format: "iwb" });
    expect(await ws.exportBoard("iwb")).toBe(true);
    expect(b.write.mock.calls[0]![1]).toBe("iwb");
    expect(b.write.mock.calls[0]![0].ops).toBeInstanceOf(Float32Array);
    expect(b.zip.mock.calls[0]![0].map((f) => f.path)).toEqual(["content.xml"]);
    expect(iwbFiles.save).toHaveBeenCalledWith("Cours.iwb", new Uint8Array([80, 75, 3, 4]));
    expect(shell.notify).toHaveBeenLastCalledWith("Copie enregistrée au format .iwb");
  });

  it("C13 : copie .ubz : page001.svg et metadata.rdf, nom « Cours.ubz » (S4)", async () => {
    const b = fakeBoard();
    const ubzFiles = typedFiles();
    const ws = await setupWorkspace({ board: b.ports, ubzFiles });
    await ws.openBoard({ name: "Cours.iwb", blob: new Blob([ZIP]), format: "iwb" });
    expect(await ws.exportBoard("ubz")).toBe(true);
    expect(b.zip.mock.calls[0]![0].map((f) => f.path)).toEqual(["page001.svg", "metadata.rdf"]);
    expect(ubzFiles.save.mock.calls[0]![0]).toBe("Cours.ubz");
  });

  it("C13 : sans ports ou sans fichiers typés : exportBoard rend faux, aucun avis", async () => {
    const ws = await setupWorkspace({ board: fakeBoard().ports });
    expect(await ws.exportBoard("iwb")).toBe(false);
    const bare = await setupWorkspace({ iwbFiles: typedFiles() });
    expect(await bare.exportBoard("iwb")).toBe(false);
    expect(await bare.openBoard({ name: "x.iwb", blob: new Blob([ZIP]), format: "iwb" })).toBe(false);
    expect(shell.notify).not.toHaveBeenCalled();
  });
});
```

`MAX_TABS`, `TOO_MANY_TABS`, `DroppedFile`, `shell`, `host` sont déjà importés ou déclarés en tête du fichier. Lancer la
commande bornée : attendu `FAIL` (`openBoard` absent).

- [ ] **Étape 4 : `workspace.ts`.** Imports : remplacer `import type { ImageDecoder, ImageTarget } from "../platform/image-import";`
  par `import { decodeImage, type ImageDecoder, type ImageTarget } from "../platform/image-import";` ; remplacer
  `import { createImporter, WEB_MAX_BYTES, type ImportReport } from "../platform/import";` par
  `import { createImporter, hasZipMagic, WEB_MAX_BYTES, type ImportReport } from "../platform/import";` ; ajouter :

```ts
import { boardListOf, buildBoardDocument, decodeBoardList, type BoardFormat, type BoardPorts } from "./board-io";
import { BOARD_NO_PAGE_MESSAGE, boardExportName, boardFirstPagesMessage, boardSavedMessage, boardSources, boardTabName, boardWarningsMessage, UBZ_NOT_ZIP_MESSAGE, type BoardSources } from "./board-files";
```

Dans `WorkspaceDeps`, après `importPack?(…)` :

```ts
  /** C13 (D3, D6) : ZIP (Worker ZIP, mode `board`) et XML (Worker jetable du module `formats`) ; absent : `.iwb`, `.ubz` refusés. */
  readonly board?: BoardPorts;
  /** C13 (D17) : écriture des copies (`IWB_TYPE`, `UBZ_TYPE`) ; absentes : « Enregistrer une copie au format … » sans effet. */
  readonly iwbFiles?: TypedFiles;
  readonly ubzFiles?: TypedFiles;
```

Dans `Workspace`, après `exportPdf(): Promise<boolean>;` :

```ts
  /** C13 (D5, Q1) : tableau `.iwb` (ZIP ou XML) ou `.ubz` dans un nouvel onglet ; faux si refusé (avis déjà dit). */
  openBoard(file: { readonly name: string; readonly blob: Blob; readonly format: BoardFormat }): Promise<boolean>;
  /** C13 (D17, D18) : copie de l'onglet actif au format ; faux sans port, refusé ou boîte annulée. */
  exportBoard(format: BoardFormat): Promise<boolean>;
```

Dans l'appel `createImporter({ … })`, après la ligne `...(deps.pdf ? { openPdf: … } : {}),` :

```ts
    ...(deps.board ? { openBoard: (f: { readonly name: string; readonly blob: Blob; readonly format: BoardFormat }) => ws.openBoard(f) } : {}),
```

Dans l'objet `ws`, après la méthode `exportPdf` :

```ts
    async openBoard(file) {
      const name = baseName(file.name);
      const board = deps.board;
      if (board === undefined) return false;
      if (full()) {
        await say(TOO_MANY_TABS);
        return false;
      }
      try {
        const head = new Uint8Array(await file.blob.slice(0, 4).arrayBuffer());
        let src: BoardSources;
        if (hasZipMagic(head)) src = boardSources(file.format, await board.unzip(file.blob));
        else if (file.format === "iwb") src = { xml: [file.blob], media: new Map(), total: 1 };
        else throw new Error(UBZ_NOT_ZIP_MESSAGE);
        const xml = await Promise.all(src.xml.map(async (b) => new Uint8Array(await b.arrayBuffer())));
        const parts = await board.read(xml, file.format);
        const pages = parts.flatMap((p) => decodeBoardList(p.ops, p.texts));
        if (pages.length === 0) {
          await say(`Ouverture impossible (${name}) : ${BOARD_NO_PAGE_MESSAGE}`);
          return false;
        }
        const built = await buildBoardDocument(core, pages, src.media, {
          makeAssets,
          decode: deps.decode ?? ((b, k) => decodeImage(b, k)),
          now: deps.now(),
          appVersion: APP_VERSION,
        });
        const warnings = [...(src.total > PDF_MAX_PAGES ? [boardFirstPagesMessage(src.total)] : []), ...parts.flatMap((p) => p.warnings), ...built.warnings];
        if ((await addTab(built.doc, { name: boardTabName(name, file.format), target: null }, built.assets)) === null) return false;
        if (warnings.length > 0) await say(boardWarningsMessage(name, warnings));
        return true;
      } catch (e) {
        await say(`Ouverture impossible (${name}) : ${messageOf(e)}`);
        return false;
      }
    },
    async exportBoard(format) {
      const board = deps.board;
      const files = format === "iwb" ? deps.iwbFiles : deps.ubzFiles;
      if (board === undefined || files === undefined) return false;
      if (exporting) {
        await say(BUSY_MESSAGE);
        return false;
      }
      const tab = ws.active(); // onglet montré à l'appel (R3)
      if (missingOf(tab.board.doc, tab.assets).length > 0) {
        await say(UNREAD_ASSETS_MESSAGE);
        return false;
      }
      exporting = true;
      let doc: CoreDocument | null = null;
      try {
        // Copie prise au départ (comme l'export PDF, DAPF3) : fermer l'onglet pendant l'écriture ne la libère pas.
        const [manifest, ybin] = tab.board.doc.saveParts(deps.now(), APP_VERSION);
        doc = core.loadParts(manifest, ybin);
        const r = await boardListOf(doc, tab.assets, format);
        const xml = await board.write(r.list, format);
        const bytes = await board.zip([...xml, ...r.files]);
        const saved = await files.save(boardExportName(tab.files.name(), format), bytes);
        if (saved) await say(boardSavedMessage(format, r.warnings));
        return saved;
      } catch (e) {
        await say(`Export impossible : ${messageOf(e)}`);
        return false;
      } finally {
        exporting = false;
        doc?.free();
      }
    },
```

Compléter le commentaire de tête du fichier par :
` * C13 (D5, D17) : `openBoard` ouvre un `.iwb` ou un `.ubz` dans un nouvel onglet ; `exportBoard` écrit une copie au format.`

- [ ] **Étape 5 : tests verts** (commande bornée).

- [ ] **Étape 6 : suite web, typage.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T10 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && cp -r ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz/apps/web/src/wasm-formats apps/web/src/ \
 && cd apps/web && nice -n 10 pnpm exec vitest run 2>&1 | tail -5 && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5
```

Attendu : aucun `FAIL`, `tsc` muet.

- [ ] **Étape 7 : commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T10 && git add apps/web/src/app/board-files.ts && git add apps/web/src/app/board-files.test.ts \
 && git add apps/web/src/app/workspace.ts && git add apps/web/src/app/workspace.test.ts \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat(web): open .iwb/.ubz in a new tab, save a copy in either format (C13 D5 D17)" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Rapport.** Sorties vitest et `tsc`, et la ligne `Réutilisation : appelé app/workspace.ts (patron openPdf : addTab, say, full)`.

<a id="tache-t11"></a>
### Tâche T11 — Mesures hors dépôt : fidélité sur les exemples, vitesse du réglage `z`

**Objectif.** Mesurer ce que le lecteur lit des 55 `.iwb` réels de `~/telechargements-roomboard/iwb/` (5 leçons, 50
fichiers de la suite de test) — tableau fichier / forme / pages / objets lus / avertissements / résultat — par un
exemple Cargo **jamais commité** ; vérifier que `7-11 Maths 3.iwb` donne 3 pages (S2, CR1) ; mesurer le coût de vitesse du
réglage `z` dans le navigateur (HU1-4 : export PDF de `c12-pdf-navigateur.mjs`, lecture `.xlsx` de
`c10b-tableau-navigateur.mjs`, accepté jusqu'à 15 %). Résultats dans `docs/essais/c13-fidelite-iwb.md`, sans aucun
contenu des fichiers source.

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11` (branche à jour de T1 et T7).

**Fichiers.**
- Créer : `docs/essais/c13-fidelite-iwb.md` (seul fichier commité).
- Temporaires, jamais commités : `crates/roomboard-formats/examples/fidelite.rs` (retiré à l'étape 5), `/tmp/c13-fidelite/` (XML extraits, tableau), copie `/tmp/c13-T11-Cargo.toml`.

**Interfaces.**
- Consomme : `roomboard_formats::board::{read_svg, parse, Dialect, Item}` (T2, T7) ; les 22 blocs `opt-level = "z"` de `Cargo.toml` (T1).
- Produit : `docs/essais/c13-fidelite-iwb.md` (lu par l'orchestrateur pour le fichier d'état, section « Fidélité sur les exemples »).
- Réutilise : aucun module de la liste n'est concerné (mesure hors dépôt).

**Test et commande bornée.** La « preuve » est le tableau : 55 lignes de données, la ligne `7-11 Maths 3.iwb` à
`3` pages ; `git -C ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11 status --porcelain` ne montre que
`docs/essais/c13-fidelite-iwb.md`.

**Contraintes (recopiées).**
- GC1 — Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables ; la variante sans `z` de l'étape 6 n'est jamais commitée ni servie.
- GC7 — Fichiers d'exemple : lecture seule ; jamais copiés dans le dépôt ni commités ; le document écrit ne contient ni texte ni image des fichiers (noms, nombres et avertissements seulement). Les XML extraits vont dans `/tmp/c13-fidelite/`, jamais exécutés.
- GC8 — `crates/roomboard-core/**` intouché ; aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve.
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` avant le build web.

**Interdits.** Corriger le lecteur ici (un défaut trouvé est écrit dans le rapport et dans le document, la correction
revient à T12 ou à l'orchestrateur) ; commiter `examples/` ou un fichier de `/tmp` ; changer `Cargo.toml` dans le commit.

**Terminé quand.** Le document existe avec les deux tableaux (fidélité, vitesse), l'exemple est retiré, un commit.

**Étapes.**

- [ ] **Étape 1 : l'exemple temporaire.** Créer `crates/roomboard-formats/examples/fidelite.rs` :

```rust
//! Mesure de fidélité C13 (T11), hors dépôt : jamais commité. Arguments : `<nom>=<chemin du XML>=<forme>`.
use roomboard_formats::board::{parse, read_svg, Dialect, Item};

fn count(items: &[Item]) -> usize {
    items.iter().map(|i| match i {
        Item::Group(c) => count(c),
        _ => 1,
    }).sum()
}

fn main() {
    println!("| fichier | forme | pages | objets lus | avertissements | résultat |");
    println!("|---|---|---|---|---|---|");
    let mut notes = Vec::new();
    for arg in std::env::args().skip(1) {
        let mut parts = arg.splitn(3, '=');
        let (name, path, form) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""), parts.next().unwrap_or("SVG"));
        let bytes = std::fs::read(path).unwrap_or_default();
        match read_svg(&bytes, Dialect::Iwb, 1).and_then(|l| parse(&l).map(|p| (p, l.warnings))) {
            Ok((pages, warnings)) => {
                let objects: usize = pages.iter().map(|p| count(&p.items)).sum();
                println!("| {name} | {form} | {} | {objects} | {} | lu |", pages.len(), warnings.len());
                if !warnings.is_empty() {
                    notes.push(format!("- `{name}` : {}", warnings.join(" ; ")));
                }
            }
            Err(e) => println!("| {name} | {form} | — | — | — | refusé : {e} |"),
        }
    }
    println!("\n### Avertissements par fichier\n");
    for n in notes {
        println!("{n}");
    }
}
```

- [ ] **Étape 2 : extraire les XML (lecture seule) et lancer la mesure.**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && rm -rf /tmp/c13-fidelite && mkdir -p /tmp/c13-fidelite && args=() \
 && for f in ~/telechargements-roomboard/iwb/lecons/*.iwb ~/telechargements-roomboard/iwb/suite-test/*.iwb; do \
      b=$(basename "$f"); out="/tmp/c13-fidelite/$(printf '%s' "$b" | tr ' /' '__').xml"; \
      if [ "$(head -c 2 "$f")" = "PK" ]; then unzip -Cp "$f" content.xml > "$out" 2>/dev/null || : > "$out"; form=ZIP; else cp "$f" "$out"; form=SVG; fi; \
      args+=("$b=$out=$form"); done \
 && cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11 \
 && nice -n 10 cargo run -q -p roomboard-formats --example fidelite -- "${args[@]}" > /tmp/c13-fidelite/tableau.md \
 && grep -c "^| .*\.iwb |" /tmp/c13-fidelite/tableau.md && grep "7-11 Maths 3" /tmp/c13-fidelite/tableau.md
```

Attendu : `55`, puis une ligne `| 7-11 Maths 3.iwb | SVG | 3 | … | lu |`. Si elle n'a pas 3 pages, ne pas toucher au
lecteur : le noter (défaut pour T12).

- [ ] **Étape 3 : vitesse avec `z` (état de la branche).** Construire les deux modules et l'application, puis trois
  passages de chaque essai (durée totale du script, en millisecondes) :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf apps/web/src/wasm-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 \
 && for s in c12-pdf-navigateur c10b-tableau-navigateur; do for i in 1 2 3; do t0=$(date +%s%N); node scripts/essais/$s.mjs > /tmp/c13-T11-$s-z-$i.log 2>&1; rc=$?; t1=$(date +%s%N); echo "z $s $i code=$rc $(( (t1 - t0) / 1000000 )) ms"; done; done | tee /tmp/c13-T11-z.txt
```

Attendu : six lignes, chacune `code=0`.

- [ ] **Étape 4 : vitesse sans `z` (variante locale, jamais commitée).**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && cp Cargo.toml /tmp/c13-T11-Cargo.toml && sed -i '/^\[profile\.release\.package\./,+1d' Cargo.toml \
 && ! grep -q 'opt-level = "z"' Cargo.toml \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf apps/web/src/wasm-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 \
 && for s in c12-pdf-navigateur c10b-tableau-navigateur; do for i in 1 2 3; do t0=$(date +%s%N); node scripts/essais/$s.mjs > /tmp/c13-T11-$s-s-$i.log 2>&1; rc=$?; t1=$(date +%s%N); echo "s $s $i code=$rc $(( (t1 - t0) / 1000000 )) ms"; done; done | tee /tmp/c13-T11-s.txt \
 ; cp /tmp/c13-T11-Cargo.toml Cargo.toml && git diff --exit-code Cargo.toml && echo "Cargo.toml rendu"
```

Attendu : six lignes `code=0`, puis `Cargo.toml rendu` (le fichier est revenu à l'état de la branche). La mesure court
peut-être en même temps que T12 sur la VM : noter la charge (`uptime`) avant chaque série dans le document.

- [ ] **Étape 5 : retirer l'exemple, écrire le document.** `rm crates/roomboard-formats/examples/fidelite.rs` (et le
  dossier `examples/` s'il est vide), puis créer `docs/essais/c13-fidelite-iwb.md` avec : un titre `# C13 lot 1 :
  fidélité de lecture des .iwb et coût du réglage z` ; un paragraphe de méthode (exemple Cargo hors dépôt, `read_svg`
  natif, `content.xml` extrait des ZIP par `unzip -Cp`, images non résolues en natif, fichiers source jamais copiés) ;
  la sortie `/tmp/c13-fidelite/tableau.md` collée telle quelle ; une ligne de synthèse (`N lus, M refusés`, dont
  `rectangle2.iwb` refusé attendu, CR5) ; la phrase « `7-11 Maths 3.iwb` : K pages (attendu 3, S2) » ; un tableau
  vitesse :

```markdown
| essai | `z` (médiane de 3, ms) | sans `z` (médiane de 3, ms) | écart |
|---|---|---|---|
| c12-pdf-navigateur.mjs (export PDF vectoriel) | <médiane z> | <médiane s> | <écart en %> |
| c10b-tableau-navigateur.mjs (lecture .xlsx) | <médiane z> | <médiane s> | <écart en %> |
```

suivi de la charge relevée (`uptime`) et du verdict HU1-4 (« ≤ 15 % : tenu » ou « > 15 % : à trancher par
l'orchestrateur », sans rien changer).

- [ ] **Étape 6 : vérifier et commiter.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T11 && git status --porcelain && git add docs/essais/c13-fidelite-iwb.md \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "docs(essais): C13 reading fidelity on sample .iwb files and opt-level z speed cost" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git status --porcelain` avant l'ajout ne doit montrer que `?? docs/essais/c13-fidelite-iwb.md` (les sorties Wasm et
`dist` sont ignorées par git).

**Rapport.** Le tableau de fidélité (copie), la ligne `7-11 Maths 3.iwb`, les six mesures de chaque série et les
médianes, le verdict HU1-4, tout défaut de lecture repéré, et la ligne `Réutilisation : écart — aucun module de la liste n'est concerné (mesure hors dépôt)`.

<a id="tache-t12"></a>
### Tâche T12 — Câblage, essai navigateur C13, aller-retour natif, capture, tailles finales

**Objectif.** Brancher les vrais ports (Worker ZIP en mode `board`, Worker des tableaux, fichiers typés `.iwb`/`.ubz`,
boutons), prouver l'aller-retour natif `read_svg(write(l))`, écrire l'essai Playwright du brief et le brancher dans
`verifier.sh --e2e`, produire la capture d'une leçon `.iwb` réelle, noter les tailles finales des deux modules. Cette
tâche corrige au besoin les défauts que l'essai révèle dans les fichiers des tâches précédentes (liste « correctifs
permis »).

**Worktree.** `~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12` (branche à jour de T1 à T10).

**Fichiers.**
- Modifier : `apps/web/src/main.ts` (imports, lignes 22, 35, 38 ; Workers, après la ligne 175 ; `createWorkspace`, lignes 249-290 ; fichiers typés, après la ligne 86).
- Modifier : `apps/web/src/ui/App.tsx` (ligne 251).
- Modifier : `scripts/verifier.sh` (bloc `--e2e`, après la ligne `echo "C4 bibliothèque : OK"`) ; `scripts/tests/verifier-e2e.test.sh` (liste des essais, ligne 13).
- Créer : `scripts/essais/c13-tableaux-navigateur.mjs`, `crates/roomboard-formats/tests/board_roundtrip.rs`, `docs/essais/c13-iwb-lecon.png`.
- Modifier : `docs/essais/taille-wasm.md` (ligne finale de la section C13).
- Correctifs permis (seulement si l'essai ou l'aller-retour échoue à cause d'eux, chaque correctif avec un test qui le prouve) : `crates/roomboard-formats/src/board/read.rs`, `crates/roomboard-formats/src/board/write.rs`, `crates/roomboard-formats/src/board/qt_html.rs`, `apps/web/src/app/board-io.ts`, `apps/web/src/app/board-files.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/platform/board-reader.ts`.

**Interfaces.**
- Consomme : `createZipReader(spawn, timeout, "board")`, `createZipWriter(spawn)` (T3, `platform/zip-read.ts`) ; `createBoardCodec(spawn)` (T6, `platform/board-reader.ts`) ; `IWB_TYPE`, `UBZ_TYPE` (T4) ; `WorkspaceDeps.board|iwbFiles|ubzFiles`, `Workspace.exportBoard` (T10) ; `HostTargets.exportBoard` (T4) ; `encode`, `parse`, `read_svg`, `write_iwb`, `write_ubz_pages` (T2, T7, T9) ; boutons `button[data-item="export-iwb"]`, `button[data-item="export-ubz"]` (T4) ; marques `#stage[data-page|data-elements|data-selection|data-units|data-grouped|data-bounds|data-camera]`, `#texte-edition` (existantes).
- Produit : l'application qui ouvre et écrit les tableaux ; `scripts/essais/c13-tableaux-navigateur.mjs` (codes 0 / 1 / 2, option `--captures <leçon.iwb>`).
- Réutilise : `apps/web/src/platform/zip-worker.ts:31`, `apps/web/src/platform/zip-read.ts:55` — `createZipWriter(spawnZipWorker)` pour emballer la copie (`zipStored`, date fixe).
- Réutilise : `scripts/essais/c15-3d-navigateur.mjs:111` — patron `page.on("request", …)` / `context.route` qui compte les requêtes hors de 127.0.0.1.
- Réutilise : `scripts/essais/commun.mjs`, `scripts/essais/c4-bibliotheque-navigateur.mjs:122` — `serve`, `coqueCsp`, `dropFile`, `stageBox(page, 640)`, `stageMouse`, `item`, `TAB`, `VIEWPORT`, `solidPng`, `frames`, `inkIn`, mesure de scène ≥ 640 px.

**Test et commande bornée.**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo test -p roomboard-formats --test board_roundtrip 2>&1 | grep -E "^test |^test result|FAILED" | tail -5 \
 && nice -n 10 bash scripts/verifier.sh --e2e > /tmp/c13-T12-verifier.out 2>&1; echo "code $?"; \
    grep -E "module Wasm :|module formats :|^ok — (S|D)|C13 tableaux|verifier.sh :|ÉCHEC|FAIL |test result: FAILED|error\[" /tmp/c13-T12-verifier.out | tail -60
```

Motif : `board_roundtrip` `test result: ok` avec N ≥ 2 ; `code 0` ; lignes `C13 tableaux : OK`, `verifier.sh : e2e OK`,
`verifier.sh : OK` ; `module Wasm : N octets` avec N ≤ 1 572 864 et `module formats : N octets` avec N ≤ 3 145 728 ;
aucun `ÉCHEC`. Tests à garder verts (carte d'impact) : tous les essais de `--e2e`, dont `c12-pdf-navigateur.mjs`,
`c10b-tableau-navigateur.mjs` (effet de bord du réglage `z`), `c4-bibliotheque-navigateur.mjs`,
`c1-profils-navigateur.mjs` (barre des pages) ; `scripts/controle-hors-ligne.mjs` ; `cargo test --workspace`
(dont `compat_c3` sur `socle-v1.roomboard`).

**Preuve visuelle.** Lectures d'abord, dans la sortie de l'essai : `data-page="1/3"` et `data-elements` de la leçon
`7-11 Maths 3.iwb` (ligne `capture : …`) ; puis la capture `docs/essais/c13-iwb-lecon.png`, à décrire dans le rapport
(la page 1 de la leçon : fond violet clair, titre « Magic Square », carré de chiffres).

**Contraintes (recopiées).**
- GC1 — TDD : test rouge d'abord. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC2 — `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC3 — Plafonds intouchables : principal 1 572 864 o, `formats` 3 145 728 o (`scripts/verifier.sh` lignes 59 et 72, jamais changées). Aucun troisième module Wasm.
- GC4 — Tailles des deux modules lues dans la sortie de `verifier.sh` et écrites dans le rapport et dans `docs/essais/taille-wasm.md`.
- GC5 — Sécurité prouvée dans l'essai : script et `onload` jamais exécutés, entité externe et DOCTYPE dits, image distante non chargée.
- GC6 — Aucune requête hors de 127.0.0.1 pendant tout l'essai (`context.route` les compte et les coupe) ; zéro attendu.
- GC7 — L'essai `--e2e` n'utilise que des fichiers générés dans le script ; la leçon réelle n'est lue que par `--captures <chemin>`, jamais copiée ni commitée ; seule la capture PNG est commitée.
- GC8 — Ne pas toucher : `crates/roomboard-core/src/zone.rs`, l'élément `fill` du pot, `scripts/essais/c8-pot-zones-navigateur.mjs`, les marques `data-zone-*`, `docs/audits/`, `crates/roomboard-core/**`, `crates/roomboard-wasm/**`. Aucun build Tauri ni Android.
- GC9 — Aucune dépendance neuve.
- GC10 — Interface en français ; ni « IWB/CFF » ni « conforme ».
- GC11 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un, jamais `git add -A`, `.`, ni `commit -a`.
- GC12 — Sous-agents et relecteurs au premier plan (`run_in_background: false`).
- GC13 — Ce seul worktree ; `pnpm install --frozen-lockfile` (fait par `verifier.sh`).

**Interdits.** Passer une option de capture dans `verifier.sh` ; relever un délai d'attente de l'essai ; changer un
plafond ; corriger un fichier hors de la liste « correctifs permis » (le signaler au rapport) ; commiter un fichier de
`~/telechargements-roomboard/`.

**Terminé quand.** `verifier.sh --e2e` code 0 avec `C13 tableaux : OK` ; `board_roundtrip` vert ; capture écrite ;
tailles notées ; commits faits.

**Étapes.**

- [ ] **Étape 1 : aller-retour natif (rouge si l'écrivain ou le lecteur dérivent).** Créer
  `crates/roomboard-formats/tests/board_roundtrip.rs` :

```rust
//! Aller-retour natif des copies C13 (DA2, S4) : `read_svg(write(l))` rend les mêmes pages, à la pression des traits
//! près (l'écriture la rend constante, HU2-2), à la translation près (repliée dans les coordonnées à l'écriture) et à
//! la flèche près pour le `.ubz` (écrite en ligne).
use roomboard_formats::board::{encode, parse, read_svg, write_iwb, write_ubz_pages, Dialect, Item, Page, ShapeKind, Span, IDENTITY};

fn w1_pages() -> Vec<Page> {
    let black = [0, 0, 0];
    vec![
        Page {
            background: Some(black),
            items: vec![
                Item::Shape { kind: ShapeKind::Rect, m: IDENTITY, x0: 10.0, y0: 20.0, x1: 110.0, y1: 70.0, color: [255, 0, 0], width: 4.0, fill: Some([0, 0, 255]) },
                Item::Stroke { m: IDENTITY, color: [0, 128, 0], width: 3.0, points: vec![[0.0, 0.0, 1.0], [10.0, 10.0, 0.5]] },
                Item::Text {
                    m: [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
                    x: 0.0,
                    y: 0.0,
                    w: 300.0,
                    h: 50.0,
                    size: 24.0,
                    color: black,
                    spans: vec![
                        Span { text: "Bonjour ".to_string(), bold: true, ..Span::default() },
                        Span { text: "monde".to_string(), size: Some(32.0), color: Some([255, 0, 0]), font: Some("Liberation Sans".to_string()), ..Span::default() },
                    ],
                },
                Item::Image { m: IDENTITY, x: 5.0, y: 5.0, w: 64.0, h: 32.0, href: "images/a.png".to_string() },
                Item::Group(vec![
                    Item::Shape { kind: ShapeKind::Line, m: IDENTITY, x0: 0.0, y0: 0.0, x1: 50.0, y1: 0.0, color: black, width: 2.0, fill: None },
                    Item::Shape { kind: ShapeKind::Arrow, m: IDENTITY, x0: 0.0, y0: 10.0, x1: 50.0, y1: 10.0, color: black, width: 2.0, fill: None },
                ]),
            ],
        },
        Page::default(),
    ]
}

/// Forme comparable : translation repliée, pression 1, flèche en ligne pour le `.ubz`.
fn canon(it: &Item, ubz: bool) -> Item {
    let tr = |m: &[f32; 6]| m[0] == 1.0 && m[1] == 0.0 && m[2] == 0.0 && m[3] == 1.0;
    match it.clone() {
        Item::Shape { kind, m, x0, y0, x1, y1, color, width, fill } if tr(&m) => {
            let kind = if ubz && kind == ShapeKind::Arrow { ShapeKind::Line } else { kind };
            Item::Shape { kind, m: IDENTITY, x0: x0 + m[4], y0: y0 + m[5], x1: x1 + m[4], y1: y1 + m[5], color, width, fill }
        }
        Item::Stroke { m, color, width, points } if tr(&m) => Item::Stroke { m: IDENTITY, color, width, points: points.iter().map(|p| [p[0] + m[4], p[1] + m[5], 1.0]).collect() },
        Item::Text { m, x, y, w, h, size, color, spans } if tr(&m) => Item::Text { m: IDENTITY, x: x + m[4], y: y + m[5], w, h, size, color, spans },
        Item::Image { m, x, y, w, h, href } if tr(&m) => Item::Image { m: IDENTITY, x: x + m[4], y: y + m[5], w, h, href },
        Item::Group(items) => Item::Group(items.iter().map(|i| canon(i, ubz)).collect()),
        other => other,
    }
}

fn canon_pages(pages: &[Page], ubz: bool) -> Vec<Page> {
    pages.iter().map(|p| Page { background: p.background, items: p.items.iter().map(|i| canon(i, ubz)).collect() }).collect()
}

#[test]
fn iwb_copy_reads_back_as_w1() {
    let xml = write_iwb(&encode(&w1_pages())).expect("écriture");
    let back = parse(&read_svg(xml.as_bytes(), Dialect::Iwb, 1).expect("lecture")).expect("liste");
    assert_eq!(canon_pages(&back, false), canon_pages(&w1_pages(), false));
}

#[test]
fn ubz_copy_reads_back_as_w1_with_arrow_as_line() {
    let pages = write_ubz_pages(&encode(&w1_pages())).expect("écriture");
    let mut back = Vec::new();
    for (i, xml) in pages.iter().enumerate() {
        back.extend(parse(&read_svg(xml.as_bytes(), Dialect::Ubz, i as u32 + 1).expect("lecture")).expect("liste"));
    }
    assert_eq!(canon_pages(&back, true), canon_pages(&w1_pages(), true));
}

#[test]
fn escaped_text_survives_both_formats() {
    let text = "a<b&c\"d'e\nf";
    let pages = vec![Page { background: None, items: vec![Item::Text { m: IDENTITY, x: 1.0, y: 2.0, w: 50.0, h: 20.0, size: 12.0, color: [0, 0, 0], spans: vec![Span { text: text.into(), ..Span::default() }] }] }];
    let iwb = parse(&read_svg(write_iwb(&encode(&pages)).expect("iwb").as_bytes(), Dialect::Iwb, 1).expect("lecture")).expect("liste");
    let ubz = parse(&read_svg(write_ubz_pages(&encode(&pages)).expect("ubz")[0].as_bytes(), Dialect::Ubz, 1).expect("lecture")).expect("liste");
    for got in [&iwb, &ubz] {
        match &got[0].items[0] {
            Item::Text { spans, .. } => assert_eq!(spans.iter().map(|s| s.text.as_str()).collect::<String>(), text),
            other => panic!("{other:?}"),
        }
    }
}
```

Lancer `nice -n 10 cargo test -p roomboard-formats --test board_roundtrip 2>&1 | tail -15`. Un échec désigne le
lecteur (T7), le lecteur Qt (T8) ou l'écrivain (T9) : corriger dans le fichier fautif, avec un test unitaire de plus
dans ce fichier qui reproduit le cas, puis relancer.

- [ ] **Étape 2 : câbler l'amorce.** Dans `apps/web/src/main.ts` : à la ligne
  `import { createTauriTypedFiles, createWebTypedFiles, PDF_TYPE, RBITEM_TYPE, RBPACK_TYPE } from "./platform/typed-files";`
  ajouter `IWB_TYPE` et `UBZ_TYPE` ; ajouter `import { createBoardCodec } from "./platform/board-reader";`. Après la
  définition de `pdfFiles` (ligne 86) :

```ts
  // Tableaux (C13, D17) : copies « Enregistrer une copie au format .iwb / .ubz » ; web : téléchargement, coque : boîte native.
  const iwbFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), IWB_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, IWB_TYPE);
  const ubzFiles =
    ports === null ? createWebTypedFiles(browserFallbackDeps(document, URL), UBZ_TYPE) : createTauriTypedFiles(ports.dialog, ports.fs, UBZ_TYPE);
```

Après `const sheets = createSheetReader(spawnSheetWorker);` :

```ts
  // Tableaux (C13, D1, D3, D6) : XML lu et écrit par un Worker jetable du module `formats` ; ZIP par le Worker ZIP (mode board).
  const spawnBoardWorker = (): WorkerLike => asWorkerLike(new Worker(new URL("./platform/board-worker.ts", import.meta.url), { type: "module" }));
  const boards = createBoardCodec(spawnBoardWorker);
```

Dans l'appel `createWorkspace({ … })`, après `pdfFiles,` :

```ts
    board: {
      unzip: createZipReader(spawnZipWorker, undefined, "board"),
      zip: createZipWriter(spawnZipWorker),
      read: (files, format) => boards.read(files, format),
      write: (list, format) => boards.write(list, format),
    },
    iwbFiles,
    ubzFiles,
```

Dans `apps/web/src/ui/App.tsx`, après `exportPdf: () => void ws.exportPdf(),` :

```tsx
      exportBoard: (format) => void ws.exportBoard(format),
```

Vérifier : `cd apps/web && nice -n 10 pnpm exec tsc --noEmit 2>&1 | tail -5` (après le build Wasm de l'étape 6, ou avec
les sorties copiées du worktree du chantier) : muet.

- [ ] **Étape 3 : l'essai navigateur.** Créer `scripts/essais/c13-tableaux-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C13 lot 1 au navigateur (S1 à S5 du cadrage usage-c13-lot1-svg-iwb-ubz) : déposer un .iwb ZIP et un .iwb SVG
// brut générés ici, voir les pages et les avertissements ; déposer un .ubz généré et l'éditer ; « Enregistrer une copie
// au format » .iwb puis .ubz, rouvrir chaque copie, retrouver les objets et réécrire la même copie ; enregistrer en
// .roomboard puis rouvrir ; socle-v1.roomboard (d'avant C13) s'ouvre ; fichier hostile : rien n'est exécuté ni chargé.
// Application construite servie avec la CSP de la coque, Chromium headless, repli (`?fichiers=repli`), heure figée ;
// toute requête hors de 127.0.0.1 est comptée et coupée. Code : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c13-tableaux-navigateur.mjs [--captures <leçon.iwb>] (docs/essais/c13-iwb-lecon.png ;
// la leçon, hors dépôt, n'est jamais copiée).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C13 tableaux";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
const { zipSync, unzipSync } = createRequire(join(ROOT, "apps", "web", "package.json"))("fflate");
const enc = (s) => Buffer.from(s, "utf8");
const IWB_HEAD = '<?xml version="1.0" encoding="UTF-8"?><iwb xmlns:iwb="http://www.becta.org.uk/iwb" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0">';

/** S1 : .iwb ZIP (viewbox 960 × 540, échelle 2) : 8 objets lus, une vidéo non lue. */
function iwbZip() {
  const xml = `${IWB_HEAD}
 <svg:svg viewbox="0 0 960 540"><svg:pageset><svg:page id="p1">
  <svg:rect id="r1" x="20" y="20" width="100" height="60" fill="red" stroke="black" stroke-width="2"/>
  <svg:ellipse id="e1" cx="200" cy="50" rx="40" ry="25" fill="none" stroke="blue" stroke-width="3"/>
  <svg:line id="l1" x1="20" y1="120" x2="220" y2="120" stroke="black" stroke-width="2"/>
  <svg:polyline id="pl1" points="20,160 60,180 100,150 140,175" stroke="green" stroke-width="4" fill="none"/>
  <svg:textarea id="t1" x="300" y="20" width="300" height="80" font-size="24" fill="black" font-weight="bold">Bonjour<svg:tbreak/>le monde</svg:textarea>
  <svg:image id="i1" xlink:href="images/carre.png" x="300" y="150" width="64" height="64"/>
  <svg:rect id="g1" x="40" y="250" width="40" height="40" fill="blue"/>
  <svg:rect id="g2" x="100" y="250" width="40" height="40" fill="blue"/>
  <svg:video id="v1" xlink:href="videos/film.mpg" x="450" y="250" width="160" height="120"/>
 </svg:page></svg:pageset></svg:svg>
 <iwb:element ref="l1" stroke-lineshape-end="arrow"/>
 <iwb:group><iwb:element ref="g1"/><iwb:element ref="g2"/></iwb:group>
</iwb>`;
  return Buffer.from(zipSync({ "content.xml": enc(xml), "images/carre.png": solidPng(8, 8, [255, 128, 0]), "videos/film.mpg": enc("mpg") }));
}

/** S2 : .iwb SVG brut de 3 pages, 2 objets par page. */
const iwbRaw3 = () =>
  `${IWB_HEAD}<svg:svg viewbox="0 0 800 600"><svg:pageset>${[1, 2, 3]
    .map((n) => `<svg:page id="page${n}"><svg:text x="10" y="40" font-size="30">Page ${n}</svg:text><svg:rect x="10" y="100" width="${50 * n}" height="40" fill="green"/></svg:page>`)
    .join("")}</svg:pageset></svg:svg></iwb>`;

/** S3 : .ubz (fond noir, trait à pression, polyligne, texte OpenBoard, image, règle) : 4 objets. */
function ubzZip() {
  const html = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd"><html><body style="font-size:32pt; color:#ffffff;"><p>Texte OpenBoard</p></body></html>';
  const esc = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const page = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ub="http://uniboard.mnemis.com/document" ub:version="4.8.0" viewBox="0 0 1280 720" width="1280" height="720">
 <rect x="0" y="0" width="1280" height="720" fill="#000000"/>
 <g fill="#ffffff"><polygon points="100,100 200,100 200,110 100,110"/><polygon points="200,98 300,98 300,112 200,112"/></g>
 <polyline points="100,200 200,250 300,200" stroke="#ffff00" stroke-width="5" fill="none"/>
 <foreignObject ub:type="text" x="400" y="100" width="400" height="80"><itemTextContent>${esc}</itemTextContent></foreignObject>
 <image xlink:href="images/photo.png" x="400" y="300" width="128" height="128"/>
 <ub:ruler x="10" y="600" width="400" height="60"/>
</svg>`;
  return Buffer.from(zipSync({ "page001.svg": enc(page), "images/photo.png": solidPng(16, 16, [0, 128, 255]), "metadata.rdf": enc("<rdf/>") }));
}

/** S5 : DOCTYPE à entité externe, script, onload, image distante : 2 objets lus, rien d'exécuté ni chargé. */
const hostileIwb = () => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE iwb [<!ENTITY e SYSTEM "file:///etc/passwd">]>
<iwb xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0"><svg:svg viewbox="0 0 800 600"><svg:pageset><svg:page id="p1">
<svg:text x="10" y="40">avant &e; après</svg:text>
<svg:script>window.__pwned = 1</svg:script>
<svg:rect x="10" y="100" width="50" height="50" fill="red" onload="window.__pwned = 2"/>
<svg:image xlink:href="http://exemple.invalid/x.png" x="100" y="100" width="50" height="50"/>
</svg:page></svg:pageset></svg:svg></iwb>`;

const NUMERIC = ["x", "y", "width", "height", "cx", "cy", "rx", "ry", "x1", "y1", "x2", "y2", "stroke-width", "font-size"];
function tagsOf(xml) {
  const out = [];
  for (const m of xml.matchAll(/<((?:svg:)?(?:rect|ellipse|line|polyline|textarea|tspan|image|g|foreignObject))\b([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    out.push({ tag: m[1], attrs });
  }
  return out;
}
const textsOf = (xml) => [...xml.matchAll(/<(?:svg:)?tspan\b[^>]*>([\s\S]*?)<\/(?:svg:)?tspan>/g), ...xml.matchAll(/<itemTextContent>([\s\S]*?)<\/itemTextContent>/g)].map((m) => m[1]);
/** S4 : la copie réécrite après réouverture est la même : balises, formes à 1 px, traits à 2 px, textes et segments. */
function sameDrawing(a, b, label) {
  const ta = tagsOf(a);
  const tb = tagsOf(b);
  if (ta.length !== tb.length) throw new Echec(`${label} : ${ta.length} balises avant, ${tb.length} après`);
  ta.forEach((x, i) => {
    const y = tb[i];
    if (x.tag !== y.tag) throw new Echec(`${label} : balise ${i} ${x.tag} devenue ${y.tag}`);
    for (const k of NUMERIC) {
      if (k in x.attrs && Math.abs(Number(x.attrs[k]) - Number(y.attrs[k])) > 1) throw new Echec(`${label} : ${x.tag} ${k} ${x.attrs[k]} → ${y.attrs[k]} (plus de 1 px)`);
    }
    if ("points" in x.attrs) {
      const p = x.attrs.points.split(/[\s,]+/).map(Number);
      const q = (y.attrs.points ?? "").split(/[\s,]+/).map(Number);
      if (p.length !== q.length || p.some((v, k) => Math.abs(v - q[k]) > 2)) throw new Echec(`${label} : trait ${i} déplacé de plus de 2 px`);
    }
    for (const k of ["fill", "stroke", "xlink:href", "transform", "font-weight"]) {
      if (x.attrs[k] !== y.attrs[k]) throw new Echec(`${label} : ${x.tag} ${k} « ${x.attrs[k]} » → « ${y.attrs[k]} »`);
    }
  });
  if (JSON.stringify(textsOf(a)) !== JSON.stringify(textsOf(b))) throw new Echec(`${label} : textes ou segments changés`);
  console.log(`ok — S4 : ${label} rouvert puis réécrit : ${ta.length} balises, formes à 1 px, traits à 2 px, textes et segments identiques`);
}

async function scenario(page, url, { tmp, lesson }) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    return d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page.waitForFunction(([n, v]) => document.querySelector("#stage")?.getAttribute(n) === v, [name, v], { timeout: 30000 }).catch(async () => {
      throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} » ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    });
  const tabs = () => page.locator(TAB).count();
  const waitTabs = (n) =>
    page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, n, { timeout: 30000 }).catch(async () => {
      throw new Echec(`onglets attendus ${n}, lus ${await tabs()} ; avis : ${JSON.stringify(dialogs)} ; erreurs : ${errors.join(" | ")}`);
    });
  const waitDialog = async (part) => {
    for (let i = 0; i < 100; i++) {
      if (dialogs.some((d) => d.includes(part))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`avis attendu « ${part} », reçus : ${JSON.stringify(dialogs)}`);
  };
  const download = async (click, name) => {
    const dl = page.waitForEvent("download");
    await click();
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const toStage = async (x, y) => {
    const c = await camera();
    return [x * c.zoom + c.tx, y * c.zoom + c.ty];
  };
  const clickWorld = async (x, y) => mouse.click(...(await toStage(x, y)));
  const drop = async (name, bytes, elements, pages = "1/1") => {
    const n = await tabs();
    await dropFile(page, "#stage", name, bytes, "");
    await waitTabs(n + 1);
    await waitAttr("data-page", pages);
    await waitAttr("data-elements", String(elements));
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  check((await page.isVisible(item("export-iwb"))) && (await page.isVisible(item("export-ubz"))), "D17 : « Enregistrer une copie au format .iwb… » et « … .ubz… » dans la barre des pages");
  const box0 = await stageBox(page, 640);
  check(box0.width >= 640, `S4 : scène de ${Math.round(box0.width)} × ${Math.round(box0.height)} px (≥ 640) avec les deux actions`);

  // S1 : .iwb ZIP.
  await drop("lecon.iwb", iwbZip(), 8);
  await waitDialog("page 1 : 1 vidéo non lue");
  check(true, 'S1 : .iwb ZIP : nouvel onglet, data-elements="8", avis « page 1 : 1 vidéo non lue »');
  const box1 = await stageBox(page, 640);
  check(box1.width >= 640, `S4 : après l'import et l'avis, scène de ${Math.round(box1.width)} × ${Math.round(box1.height)} px`);
  await page.click(item("select"));
  await clickWorld(120, 540);
  await waitAttr("data-selection", "2");
  check((await attr("data-units")) === "1" && (await attr("data-grouped")) === "1", "S1 : un clic sur le groupe prend ses deux rectangles (data-units=1, data-grouped=1)");
  const x0 = Number(((await attr("data-bounds")) ?? "").split(",")[0]);
  const [gx, gy] = await toStage(120, 540);
  await mouse.move(gx, gy);
  await mouse.down();
  await mouse.move(gx + 60, gy, { steps: 6 });
  await mouse.up();
  await fr();
  const { zoom } = await camera();
  const x1 = Number(((await attr("data-bounds")) ?? "").split(",")[0]);
  check(Math.abs(x1 - x0 - 60 / zoom) < 2 && (await attr("data-selection")) === "2", `S1 : le groupe se déplace d'un bloc (${x0} → ${x1})`);
  await page.keyboard.press("Control+z");
  await fr();
  await page.click(item("text"));
  await clickWorld(620, 60);
  await page.waitForSelector("#texte-edition", { state: "visible", timeout: 5000 });
  const content = await page.$eval("#texte-edition", (a) => ("value" in a ? a.value : a.textContent) ?? "");
  check(content.includes("Bonjour") && content.includes("le monde"), "S1 : le texte importé s'ouvre dans la zone de saisie (éditable)");
  await page.keyboard.press("Escape");
  await page.click(item("select"));
  await fr();

  // S4 : copies .iwb puis .ubz de cet onglet ; chaque copie rouverte puis réécrite à l'identique.
  const iwbCopy = await download(() => page.click(item("export-iwb")), "copie.iwb");
  await waitDialog("Copie enregistrée au format .iwb");
  const ubzCopy = await download(() => page.click(item("export-ubz")), "copie.ubz");
  await waitDialog("Copie enregistrée au format .ubz");
  const a = unzipSync(await readFile(iwbCopy));
  check(Object.keys(a)[0] === "content.xml" && Object.keys(a).some((k) => /^images\/[0-9a-f]{64}\.png$/.test(k)), "S4 : copie .iwb : content.xml d'abord, puis images/<empreinte>.png");
  const xmlA = Buffer.from(a["content.xml"]).toString("utf8");
  check(xmlA.includes('xmlns="http://www.imsglobal.org/xsd/iwb_v1p0"') && xmlA.includes('version="1.0"'), "D19 : racine <iwb version=\"1.0\"> dans l'espace de la norme finale");
  const b = unzipSync(await readFile(ubzCopy));
  check("page001.svg" in b && "metadata.rdf" in b, "S4 : copie .ubz : page001.svg et metadata.rdf");
  for (const [file, name, fmt] of [[iwbCopy, "copie.iwb", "iwb"], [ubzCopy, "copie.ubz", "ubz"]]) {
    await drop(name, await readFile(file), 8);
    await clickWorld(120, 540);
    await waitAttr("data-selection", "2");
    check((await attr("data-units")) === "1", `S4 : ${name} rouvert : 8 objets, le groupe tient`);
    const again = await download(() => page.click(item(`export-${fmt}`)), `again.${fmt}`);
    const key = fmt === "iwb" ? "content.xml" : "page001.svg";
    sameDrawing(Buffer.from(unzipSync(await readFile(file))[key]).toString("utf8"), Buffer.from(unzipSync(await readFile(again))[key]).toString("utf8"), name);
  }
  const saved = await download(() => page.keyboard.press("Control+s"), "copie.roomboard");
  await drop("copie.roomboard", await readFile(saved), 8);
  check(true, "S4 : enregistré en .roomboard puis rouvert : 8 objets");

  // S3 : .ubz déposé et édité.
  await drop("openboard.ubz", ubzZip(), 4);
  await waitDialog("page 1 : 1 règle non lue");
  const c = await camera();
  const black = await inkIn(page, [100 * c.zoom + c.tx, 600 * c.zoom + c.ty, 120 * c.zoom + c.tx, 620 * c.zoom + c.ty], { rgb: [0, 0, 0], tol: 30 });
  check(black > 50, `S3 : .ubz : 4 objets, fond noir (${black} pixels noirs), avis « règle non lue »`);
  await page.click(item("pen"));
  await mouse.move(200, 500);
  await mouse.down();
  await mouse.move(250, 510, { steps: 5 });
  await mouse.move(300, 520, { steps: 5 });
  await mouse.up();
  await waitAttr("data-elements", "5");
  check(true, "S3 : un trait ajouté sur la page 1 (data-elements=5)");
  await page.click(item("select"));

  // S2 : .iwb SVG brut de 3 pages.
  await drop("brut.iwb", enc(iwbRaw3()), 2, "1/3");
  check(true, 'S2 : .iwb SVG brut de 3 pages : data-page="1/3", 2 objets');

  // S5 : fichier hostile.
  const before = dialogs.length;
  await drop("hostile.iwb", enc(hostileIwb()), 2);
  await waitDialog("image distante");
  const said = dialogs.slice(before).join("\n");
  check(said.includes("1 script ignoré") && said.includes("1 entité inconnue ignorée") && said.includes("1 déclaration DOCTYPE ignorée"), "S5 : script, entité externe et DOCTYPE dits, jamais lus");
  check((await page.evaluate(() => window.__pwned)) === undefined, "S5 : ni le script ni onload n'ont tourné (window.__pwned absent)");

  // S4 : fichier d'avant C13.
  const n = await tabs();
  await dropFile(page, "#stage", "socle-v1.roomboard", await readFile(SOCLE), "application/x-roomboard");
  await waitTabs(n + 1);
  check(!dialogs.some((d) => d.startsWith("Ouverture impossible")), "S4 : socle-v1.roomboard (d'avant C13) s'ouvre comme avant");

  if (lesson !== null) {
    const before = await tabs();
    await dropFile(page, "#stage", basename(lesson), await readFile(lesson), "");
    await waitTabs(before + 1);
    await waitAttr("data-page", "1/3");
    await fr();
    const path = join(ROOT, "docs", "essais", "c13-iwb-lecon.png");
    await page.screenshot({ path });
    console.log(`capture : ${path} (${basename(lesson)}, data-page="${await attr("data-page")}", data-elements=${await attr("data-elements")})`);
  }
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  const k = process.argv.indexOf("--captures");
  const lesson = k >= 0 ? (process.argv[k + 1] ?? null) : null;
  if (k >= 0 && (lesson === null || !existsSync(lesson))) {
    console.error(`${LABEL} : ÉCHEC — --captures attend le chemin d'une leçon .iwb existante`);
    return 1;
  }
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c13-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { tmp, lesson });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log("ok — S5 : zéro requête hors de 127.0.0.1 pendant tout l'essai");
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
```

Dans la branche `--captures`, aucun nombre d'objets n'est attendu (la leçon réelle n'est pas une fixture) : seul
`data-page="1/3"` l'est (S2). Les positions monde des clics (groupe en (120, 540), texte en (620, 60), zone vide en (100, 600) de la page `.ubz`)
découlent des fixtures : viewbox 960 × 540 à l'échelle 2, et 1 280 × 720 à l'échelle 1,5.

- [ ] **Étape 4 : brancher l'essai.** Dans `scripts/verifier.sh`, après la ligne `  echo "C4 bibliothèque : OK"` :

```bash
  node scripts/essais/c13-tableaux-navigateur.mjs
  echo "C13 tableaux : OK"
```

Dans `scripts/tests/verifier-e2e.test.sh`, ajouter `c13-tableaux-navigateur` à la fin de la liste de la boucle
`for s in … c4-bibliotheque-navigateur; do`.

- [ ] **Étape 5 : construire et jouer l'essai seul** (rouge tant qu'un maillon manque) :

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12 && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && pnpm install --frozen-lockfile >/dev/null \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf apps/web/src/wasm && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && nice -n 10 cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 \
 && rm -rf apps/web/src/wasm-formats && nice -n 10 wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm \
 && nice -n 10 pnpm --filter @roomboard/web build 2>&1 | tail -2 \
 && node scripts/essais/c13-tableaux-navigateur.mjs 2>&1 | tail -40
```

Attendu à la fin : `C13 tableaux : OK`. Un échec se corrige dans le fichier fautif (liste « correctifs permis »), avec
un test unitaire qui reproduit le cas dans la suite de ce fichier.

- [ ] **Étape 6 : suite complète.** La commande bornée de la rubrique « Test et commande bornée » (`verifier.sh --e2e`).
  Attendu : `code 0`, `C13 tableaux : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK`, les deux tailles sous plafond.

- [ ] **Étape 7 : capture de la leçon réelle (hors `verifier.sh`, S2).**

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12 \
 && node scripts/essais/c13-tableaux-navigateur.mjs --captures "$HOME/telechargements-roomboard/iwb/lecons/7-11 Maths 3.iwb" 2>&1 | grep -E "capture :|C13 tableaux" \
 && file docs/essais/c13-iwb-lecon.png
```

Attendu : `capture : …/docs/essais/c13-iwb-lecon.png (7-11 Maths 3.iwb, data-page="1/3", data-elements=N)`,
`C13 tableaux : OK`, `PNG image data, 1280 x 900`. Ouvrir l'image (outil Read) et la décrire dans le rapport.

- [ ] **Étape 8 : tailles finales.** Ajouter à la section C13 de `docs/essais/taille-wasm.md` (valeurs lues dans
  `/tmp/c13-T12-verifier.out`, lignes `module Wasm :` et `module formats :`) :

```markdown
| final C13 lot 1 (lecteur, écrivain, liaison ; build de `verifier.sh --e2e`) | <principal> o | <formats> o |

Final : principal <écart principal> o depuis 1 371 293 o (attendu 0 : aucune ligne du module principal ne change) ;
`formats` <écart formats> o depuis 3 100 845 o, marge restante <3 145 728 − formats> o sous le plafond.
```

- [ ] **Étape 9 : commiter** (deux commits : code et essai, puis preuves).

```bash
cd ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T12 && git add apps/web/src/main.ts && git add apps/web/src/ui/App.tsx \
 && git add scripts/essais/c13-tableaux-navigateur.mjs && git add scripts/verifier.sh && git add scripts/tests/verifier-e2e.test.sh \
 && git add crates/roomboard-formats/tests/board_roundtrip.rs \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "feat: wire whiteboard import and copies, C13 browser check in verifier --e2e" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" \
 && git add docs/essais/c13-iwb-lecon.png && git add docs/essais/taille-wasm.md \
 && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" \
    -m "docs(essais): C13 imported lesson capture and final Wasm sizes" \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Chaque fichier corrigé de la liste « correctifs permis » s'ajoute un par un au premier commit (`git add <fichier>`).

**Rapport.** La sortie bornée de `verifier.sh --e2e` (lignes `ok — S…`, `C13 tableaux : OK`, tailles), la sortie de
`board_roundtrip`, la ligne `capture :` et la description de l'image, les tailles finales, chaque correctif fait hors
des fichiers propres à T12 (fichier, cause, test ajouté), et les lignes :
`Réutilisation : appelé platform/zip-read.ts (createZipWriter, createZipReader mode board)`,
`Réutilisation : appelé scripts/essais/c15-3d-navigateur.mjs (patron des requêtes hors origine)`,
`Réutilisation : appelé scripts/essais/commun.mjs (serve, dropFile, stageBox, stageMouse, item, solidPng, inkIn)`.
