# Taille du module Wasm (OD55, 2026-11-20)

Plafond H2-13 inchangé : 1 572 864 octets (`scripts/verifier.sh`).
Départ : `main` à `f2f3f8c` (après C7), profil `opt-level = "s"`, `lto = true`.

Mesure : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release`,
puis `wasm-bindgen --target web`, taille de `roomboard_wasm_bg.wasm`
(vite copie ce fichier tel quel dans `apps/web/dist/assets`).
Chaque piste du profil est essayée par la variable `CARGO_PROFILE_RELEASE_*` correspondante.

## Pistes seules (contre le départ)

| Piste | Taille (octets) | Gain (octets) | Gardée | Pourquoi |
|---|---:|---:|---|---|
| Départ (`s`, `lto`) | 1 536 002 | — | — | référence |
| `wasm-bindgen --remove-name-section` | 947 711 | 588 291 | oui | retire la section `name` (noms des fonctions) ; colle JS inchangée |
| `strip = true` (profil) | 945 660 | 590 342 | non | retire aussi `target_features` : wasm-bindgen ne voit plus `multivalue` et produit une autre colle JS (retours par pointeur, 48 846 → 63 234 octets) ; touche aussi les builds natifs |
| `strip = "debuginfo"` | 1 536 002 | 0 | non | aucune section de débogage dans le module release |
| `codegen-units = 1` | 1 406 705 | 129 297 | oui | 78 202 octets de noms en moins, 44 465 octets de code en moins |
| `codegen-units = 1` pour le seul paquet `roomboard-wasm` | 946 320 (avec `--remove-name-section`) | 1 391 (contre `--remove-name-section` seul) | non | sur `roomboard-wasm` seul : sans effet ; non mesuré sur `roomboard-core` |
| `panic = "abort"` | 1 532 932 | 3 070 | non | il coûte 1 506 octets une fois `strip` et `codegen-units = 1` appliqués |
| `opt-level = "z"` | 1 774 946 | −238 944 | non | plus gros seul ; voir les combinaisons |
| `wasm-bindgen --remove-producers-section` | — | 115 (sur le retenu) | non | gain négligeable |
| `wasm-opt -Oz` | — | — | non | binaryen absent de la VM et du dépôt ; aucune installation (consigne OD55) |

## Combinaisons

| Profil | Taille (octets) | Gain contre le départ |
|---|---:|---:|
| `codegen-units = 1` + `--remove-name-section` (**retenu**) | 896 616 | 639 386 (−41,6 %) |
| `codegen-units = 1` + `strip = true` | 895 381 | 640 621 |
| `codegen-units = 1` + `strip = true` + `panic = "abort"` | 896 887 | 639 115 |
| `codegen-units = 1` + `strip = true` + `opt-level = "z"` | 822 924 | 713 078 |

Marge sous le plafond avec le profil retenu : 676 248 octets.

`opt-level = "z"` gagnerait encore environ 72 Ko, mais il réduit les optimisations de vitesse
du cœur, et ce coût n'est pas mesuré ici. La marge suffit : la piste est écartée pour l'instant,
à reprendre si la marge redevient courte, avec une mesure du banc (`apps/web/src/app/banc.ts`).

## Ce que le retrait de la section `name` change

- Les messages d'erreur du cœur (`JsError`) restent lisibles : ce sont des données, pas des
  symboles. Les tests de contrat du vrai module le vérifient (`wasm-core.contract.test.ts`,
  par exemple `toThrow(/^page inconnue : inconnue$/)`), sous `ROOMBOARD_WASM_REQUIRED=1`.
- Une panique Rust donne `RuntimeError: unreachable` comme avant (aucun hook de panique),
  mais la pile d'appels du navigateur montre `wasm-function[N]` au lieu du nom Rust.
  Pour déboguer, lancer `wasm-bindgen` sans `--remove-name-section`.
- `codegen-units = 1` vaut aussi pour les builds natifs en release, dont les mesures de coût
  lancées à la main (`--ignored`) : comparer leurs chiffres à ceux d'avant OD55 avec prudence.

`scripts/verifier.sh` : OK, `module Wasm : 896616 octets`.

## C8 (zone fermée du pot, `i_overlay` derrière la fonctionnalité `zone`)

| mesure | module principal | module formats |
|---|---|---|
| avant C8 (main 94976f0, remesuré dans le worktree T1) | 1 145 044 o | 3 100 344 o |
| après la tâche T1 (`i_overlay` 9.2.0, `zone.rs`) | 1 350 143 o | 3 100 344 o |
| après la tâche T9 (porte S6 : dilatation au marquage, piles de suites ; branche T1 à T6 et T8) | 1 373 557 o | non remesuré (sans `zone`) |
| après la tâche T11 (porte S6 : balayages à huit cellules, rangement des suites par ligne ; branche T1 à T6, T8 à T10) | 1 364 322 o | non remesuré (sans `zone`) |

Écart du module principal : +219 278 o depuis avant C8 (T11 : −9 235 o sur T9). Mesure : `cargo build --target wasm32-unknown-unknown --release`, puis
`wasm-bindgen --target web --remove-name-section`, comme `scripts/verifier.sh` (l'asset de vite en est la copie).
Garde-fou du cadrage (Q5, HC8-9) : 1 420 000 o ; plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).
`roomboard-formats` ne reçoit pas la fonctionnalité `zone` (DA-Z1) : son module est inchangé à l'octet.

## C4 (bibliothèque : `kind: "grid"`, ressources généralisées)

| mesure | module principal | module formats |
|---|---|---|
| avant C4 (main 443edd4) | 1 362 599 o | 3 100 344 o |
| après la tâche T1 (`KIND_GRID`, `WrongKind { found }`, `save_resource*`) | 1 364 082 o | 3 100 845 o |
| après la tâche T10 (coque, hors Wasm ; mesurée sur le dossier de build partagé pendant que T1 y compilait, d'où le formats de T1) | 1 362 599 o | 3 100 845 o |
| après la tâche T2 (pont Wasm des grilles) | 1 369 494 o | 3 100 845 o |

Écarts de T1 : principal +1 483 o, formats +501 o (les deux messages neufs, grille et paquet, et la ligne `KIND_GRID` de
`check_manifest`, présents dans chacun des deux modules mesurés). Garde-fou du cadrage (H2-5) : principal < +20 Ko,
`formats` < +1 Ko ; plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o). Même mesure que C8
(`cargo build --target wasm32-unknown-unknown --release`, puis `wasm-bindgen --target web --remove-name-section`).

T2 : principal +5 412 o sur T1 (+6 895 o sur l'avant C4, sous les +20 Ko du garde-fou), `formats` inchangé (T2 ne touche pas son crate). Mesuré avec `CARGO_TARGET_DIR` partagé, symboles `save_grid` vérifiés dans le JS généré.

| après C4 (branche complète, T15, build de `verifier.sh`) | 1 369 494 o | 3 100 845 o |

Écart du module principal : +6 895 o depuis avant C4 ; `formats` : +501 o (ligne `KIND_GRID` de `check_manifest` et message de `WrongKind`). Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).

| final C4 (tête 6975138, après les correctifs T17 à T20, build de `verifier.sh --e2e`) | 1 368 840 o | 3 100 845 o |

Final : principal +6 241 o depuis avant C4 (T17 a simplifié `load_with_manifest` et `load_parts`), `formats` +501 o. Plafonds inchangés.

| OE23 T2 (`element_ids_of_kind`, sortie de `wasm-bindgen --remove-name-section`) | 1 370 577 o | 3 100 845 o (lue dans la sortie de `verifier.sh` à la clôture, crate non touché) |

OE23 T2 : principal +1 737 o depuis 1 368 840 o (final C4). Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).

OE23 final (T6 `ids_where` partagé, sortie de `verifier.sh` sur 3f7c157) : principal 1 371 293 o (+2 453 o depuis 1 368 840 o), `formats` 3 100 845 o (inchangé). Plafonds inchangés (1 572 864 o, 3 145 728 o).

## C13 lot 1 (tableaux `.iwb`, `.ubz` : lecteur SVG dans `formats`, réglage `z`, D2, DA1)

| mesure | module principal | module formats |
|---|---|---|
| avant C13 (`origin/main` 41342b0, sortie de `verifier.sh`) | 1 371 293 o | 3 100 845 o |
| après T1 (22 crates tierces de `formats` en `opt-level = "z"`, sans lecteur) | 1 371 293 o | 2 903 814 o |
| final C13 lot 1 (lecteur, écrivain, liaison ; build de `verifier.sh --e2e`) | 1 371 293 o | 3 024 532 o |
| C13 lot 1 fusionné avec `origin/main` bea54d7 (C16 Office, PR #29 ; sortie de `verifier.sh --e2e` sur 5848edb) | 1 374 141 o | 3 024 532 o |

T1 : `formats` −197 031 o, principal inchangé à l'octet (aucune des 22 crates n'entre dans le module principal).
Mesure : `cargo build --target wasm32-unknown-unknown --release` puis `wasm-bindgen --target web --remove-name-section`.
Plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o). Coût de vitesse du réglage : T11
(`docs/essais/c13-fidelite-iwb.md`), accepté jusqu'à 15 % (HU1-4).

Final : principal 0 o depuis 1 371 293 o (aucune ligne du module principal ne change) ; `formats` -76 313 o depuis
3 100 845 o (3 024 532 o, sortie de `verifier.sh --e2e` sur la tête finale de T15), marge restante 121 196 o sous le plafond
(3 145 728 o) ; principal 1 371 293 o (plafond 1 572 864 o).

Après la fusion d'`origin/main` (C16) : le principal passe à 1 374 141 o par C16 seul (+2 848 o, marge 198 723 o) ; `formats` reste à 3 024 532 o (marge 121 196 o). Plafonds inchangés (1 572 864 o, 3 145 728 o).

## C13 lots 2 et 3 (`.notebook`, `.olf`, `.flipchart`)

| mesure | module principal | module formats |
|---|---|---|
| avant C13 lots 2-3 (`origin/main` 3b73c27, sortie de `verifier.sh --e2e` de référence) | 1 374 141 o | 3 024 532 o |
| C13 lot 2 avant les correctifs de fin de lot (sortie de `verifier.sh --e2e` de T9) | 1 374 141 o | 3 033 889 o |
| final C13 lot 2 (sortie de `verifier.sh --e2e` sur e0fc4cb, après T18 : comptage des feuilles, bornes de `path`) | 1 374 141 o | 3 037 458 o |
| final C13 lot 3 (sortie de `verifier.sh --e2e` sur la tête fusionnée de T17, avec T23 et T24) | 1 374 141 o | 3 118 370 o |

Budget (N17) : lot 2 ≤ 20 Ko (formats ≤ 3 045 012 o), lot 3 ≤ 80 Ko (≤ 3 125 012 o), marge finale ≥ 20 Ko. Principal inchangé à l'octet.

Final lot 3 : principal inchangé à l'octet (1 374 141 o, marge 198 723 o) ; `formats` +80 912 o depuis 3 037 458 o, soit
3 118 370 o, marge 27 358 o sous le plafond de 3 145 728 o (≥ 20 Ko) et 6 642 o sous le budget de lot 3 (3 125 012 o).
Plafonds inchangés.

## OE71 (marge du module formats, 2026-11-23)

Départ : `origin/main` 0566cef. Module formats 3 118 426 o (marge 27 302 o sous 3 145 728 o) ; principal 1 374 398 o.
Cible : marge d'au moins 100 Ko, soit 3 045 728 o au plus. Plafonds de `scripts/verifier.sh` inchangés.
Mesure : `cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release`, puis
`wasm-bindgen --target web --remove-name-section` ; chaque réglage du profil est essayé par la variable
`CARGO_PROFILE_RELEASE_*` dans un dossier de build à part (`/tmp`).

### Part de chaque crate (code, section `name` gardée pour la lecture)

Section de code 2 493 913 o, section de données 609 248 o. Code par crate (fonctions génériques comptées dans la crate
de leur définition) : `read_fonts` 382 523, `skrifa` 282 570, `core` 248 586, `alloc` 203 397, `roomboard_formats`
150 161, `ttf_parser` 148 825, `krilla` 128 232, `rustybuzz` 112 010, `calamine` 78 379, `hashbrown` 77 535, `zip`
71 570, `zlib_rs` 52 472, `png` 42 654, `encoding_rs` 37 506, `write_fonts` 37 426, `subsetter` 37 126, `zopfli`
32 994, `pdf_writer` 32 732, `quick_xml` 31 443, le reste sous 25 000 o. Les deux piles de polices font 37 % du code :
`skrifa` et `read_fonts` sont une dépendance fixe de `krilla` ; `rustybuzz` et `ttf_parser` (environ 261 Ko, 10 %)
viennent de sa fonctionnalité `simple-text`, qui sert au texte des PDF. `twiggy` et `cargo bloat` sont absents de la VM : décompte par un script hors dépôt qui lit les sections
`code` et `name`.

### Réglages

| Réglage | Module formats (o) | Gain (o) | Module principal (o) | Gardé | Pourquoi |
|---|---:|---:|---:|---|---|
| Départ | 3 118 426 | — | 1 374 398 | — | référence |
| `wasm-opt -Oz` (paquet npm `binaryen` 132.0.0, Apache-2.0), après `wasm-bindgen` | 2 794 511 | 323 915 | 1 374 398 (n'y passe pas) | **oui** | marge 351 217 o ; banc sans perte de vitesse (ci-dessous) |
| `wasm-opt -Os` | 2 814 230 | 304 196 | — | non | moins bon que `-Oz` |
| `panic = "abort"` | 3 119 361 | −935 | — | non | plus gros ; `wasm32-unknown-unknown` ne déroule déjà pas la pile |
| `opt-level = "z"` sur tout le module formats (profil à part) | 3 057 664 | 60 762 | — | non | cible non tenue seul ; coût de vitesse sur le cœur non mesuré |
| `opt-level = "z"` + `wasm-opt -Oz` | 2 715 283 | 403 143 | — | non | 79 228 o de plus que `-Oz` seul, mais coût de vitesse du cœur non mesuré ; réserve pour plus tard |
| `lto = "fat"` | — | 0 | — | déjà là | `lto = true` vaut `"fat"` |
| `codegen-units = 1` | — | 0 | — | déjà là | posé pour tout le workspace (OD55) |
| fonctionnalités Cargo de `krilla`, `calamine`, `quick-xml`, `zip` | — | — | — | non | celles en trop (`skrifa/autohint_shaping`, `subsetter/variable-fonts`, `quick-xml/encoding`, `zip/deflate-zopfli`) sont posées par `krilla` et `calamine` eux-mêmes ; aucun réglage de notre côté ne les retire |

`wasm-opt` tourne dans `scripts/verifier.sh` après `pnpm install --frozen-lockfile`, sur
`apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm`, avant les tests du vrai module et le build de vite.
La colle JS reste celle de `wasm-bindgen` (mêmes exports) ; `-Oz` lit les fonctionnalités Wasm dans la section
`target_features`. Durée : environ 1 min 35 s de plus par vérification. Le module principal n’y passait pas avant OG23 (voir plus bas).
Les recettes de l'installeur (`docs/essais/coque-windows.md`, `docs/essais/coque-macos.md`) lancent le même
`wasm-opt` : sans lui, l'installeur livrerait le module non optimisé, que `verifier.sh` ne mesure pas.

### Banc de vitesse (Node, hors dépôt, 5 passages, médianes en ms, deux séries)

| essai | départ | `wasm-opt -Oz` |
|---|---:|---:|
| lecture `.iwb` de 60 pages × 450 objets | 227 ; 223 | 216 ; 216 |
| écriture `.iwb` de ces pages | 410 ; 408 | 391 ; 391 |
| 200 lectures de `valeurs.xlsx` | 407 ; 398 | 385 ; 384 |
| `image_adjust` 2000 × 2000, 5 fois | 32 ; 32 | 32 ; 32 |
| `image_flood_fill` 2000 × 2000, 3 fois | 693 ; 686 | 684 ; 678 |

Charge de la VM (`uptime`, 1 min) : 6,5. Aucun essai n'est plus lent. L'export PDF (`write_pdf_pages`) n'est pas
chronométré ici ; ses tests et ses essais e2e passent sur le module optimisé.

`scripts/verifier.sh --e2e` : OK sur la branche, essais de fidélité de C13 compris (`C13 tableaux : OK`) ;
`module Wasm : 1374398 octets`, `module formats : 2794511 octets`. Marge du module formats : 351 217 o
(cible : 100 Ko). Plafonds inchangés (1 572 864 o, 3 145 728 o).

## OG23 (module principal passé à `wasm-opt -Oz`, 2026-11-28)

Après la fusion d'OG12 (flèches, liaisons), d'OG26 (tableau, lots A et B) et d'OG23 (Arrange, pression, glisser une
copie), le module principal sorti de `wasm-bindgen --remove-name-section` pesait **1 598 137 o**, au-dessus du plafond
H2-13 (1 572 864 o). `main` seul était à 1 571 221 o (marge 1 643 o).

| réglage | module principal | gain |
|---|---:|---:|
| départ (profil `s`, `lto`, `codegen-units = 1`, sans section `name`) | 1 598 137 | — |
| `wasm-opt -Oz` (paquet npm `binaryen` 132.0.0, Apache-2.0), après `wasm-bindgen` | 1 456 551 | 141 586 (−8,9 %) |

Décision prise par l'agent (OG23) : le module principal passe par le même `wasm-opt -Oz` que le module `formats`
(OE71), dans `scripts/verifier.sh` et dans les recettes de l'installeur (`coque-windows.md`, `coque-macos.md`).
Plafond inchangé. Marge : 116 313 o.

Banc de vitesse du chemin de l'encre (`StrokeBuilder`, contours, gomme) sur le module optimisé : fait par OG28
(section suivante). Le banc d'OE71 sur `formats` n'a montré aucune perte. Les essais e2e du stylo et de la gomme passent sur le module
optimisé. Repli : retirer la ligne de `scripts/verifier.sh` ; il faut alors retirer d'abord 25 273 o de code.

## OG28 (banc de `-Oz` sur le module principal, pistes de marge, 2026-11-28)

Cible d'OG28 : 150 Ko de marge sous le plafond du module principal. OG23 a déjà posé `-Oz` (section au-dessus) ;
OG28 ajoute le banc de vitesse et mesure d'autres réglages. `scripts/verifier.sh`, les recettes de l'installeur et les
plafonds ne changent pas. Module principal sur `main` e2ac468 : 1 598 137 o en sortie de `wasm-bindgen`, 1 456 551 o
après `-Oz` (marge 116 313 o) ; module formats inchangé.

Mesure : comme OE71, mais sur `roomboard-wasm`, chaque réglage passé par
`cargo --config 'profile.release.package.<crate>.opt-level="z"'`, dans un dossier de build à part (`~/.cache/tmp`).

### Réglages

Mesurés sur edf0200 (avant OG23), où `-Oz` seul donne 1 431 220 o (marge 141 644 o). Aucun n'est gardé.

| Réglage | Module principal (o) | Pourquoi |
|---|---:|---|
| `wasm-opt -Os`, `-O3`, `-O2` | 1 439 578 à 1 461 861 | moins bons que `-Oz` |
| `wasm-opt -Oz --converge` | 1 430 358 | 862 o de moins seulement, pour une passe bien plus longue |
| `-Oz` + `--merge-similar-functions`, `--gufa-optimizing`, `--dae-optimizing`, `-O4` | 1 431 220 à 1 445 133 | aucun gain |
| `opt-level = "z"` sur `roomboard-core`, + `-Oz` | 1 339 462 | banc : pot sur zone +12 à +52 %, tracé +3 à +11 % |
| `z` sur `roomboard-core` et `roomboard-wasm`, + `-Oz` | 1 304 563 | mêmes pertes que la ligne au-dessus |
| `z` sur `roomboard-core`, `roomboard-wasm` et `yrs`, + `-Oz` | 1 251 948 | pertes des deux lignes voisines ; pas de banc |
| `z` sur `yrs` seul, + `-Oz` | 1 388 860 | banc : lecture +29 à +31 %, gomme +8 à +22 %, ajout de traits et enregistrement +7 à +9 % |
| `z` sur `serde_json`, `zip`, `zlib-rs`, `flate2`, `serde-wasm-bindgen`, + `-Oz` | 1 429 458 | 1 762 o de moins seulement |

Cible non tenue : 116 313 o sur `main`. Gagner plus demande `opt-level = "z"` sur `roomboard-core` ou `yrs`, que le
banc refuse (perte au-delà de 5 %). OG12, OG26 et OG23 ont ajouté 26 916 o à eux trois : à ce rythme, la marge tient
environ quatre lots de cette taille. Suite : chercher la place dans le code Rust. Deux pistes : le décompte par crate du
module principal (fait pour `formats` seul, par OE71) ; sortir les chemins chauds (contours, `fill_zone`) dans une crate
à part, pour passer le reste de `roomboard-core` en `z` (environ 92 Ko), puis rejouer le banc.

### Banc de vitesse (Node, 5 passages, médianes en ms, deux séries)

Script hors dépôt, qui charge le module par `initSync`, comme les tests du vrai module. Essais : 2 000 traits de 120
points par `StrokeBuilder` (contour freedraw) ; 1 500 traits par `commit_stroke`, puis `save` ; `load` de ce fichier ;
100 `hit_test` et 100 `ids_in_rect` sur ces 1 500 traits ; 5 passages de gomme (`erase`), puis 5 `undo` ; `fill_zone`
sur la figure du banc S6 (`zone-s6-banc.test.ts`), puis `undo`.

Module de `main` e2ac468, ce que `verifier.sh` livre (charge de la VM, `uptime` 1 min : 1,2) :

| essai | sans `wasm-opt` | `-Oz` |
|---|---:|---:|
| `StrokeBuilder` | 353 ; 352 | 355 ; 347 |
| `commit_stroke` + `save` | 109 ; 109 | 106 ; 105 |
| `load` | 22 ; 22 | 21 ; 21 |
| `hit_test` + `ids_in_rect` | 1 996 ; 1 988 | 1 878 ; 1 875 |
| `erase` + `undo` | 178 ; 179 | 176 ; 178 |
| `fill_zone` S6 + `undo` | 19 ; 19 | 19 ; 19 |

Pire écart : +1 % (`fill_zone`, 19,3 contre 19,1 ms), sous le bruit et sous le seuil de 5 %. `-Oz` est gardé.

`z` sur `roomboard-core`, module d'edf0200 (charge 7,9 à 6,8, puis 5,7 à 4,4) :

| essai | départ | `-Oz` | `z` `roomboard-core` + `-Oz` |
|---|---:|---:|---:|
| `StrokeBuilder` | 381 ; 354 | 367 ; 350 | 393 ; 392 |
| `commit_stroke` + `save` | 134 ; 108 | 114 ; 106 | 108 ; 107 |
| `load` | 25 ; 22 | 24 ; 21 | 21 ; 21 |
| `hit_test` + `ids_in_rect` | 2 292 ; 2 035 | 2 126 ; 1 893 | 2 160 ; 2 120 |
| `erase` + `undo` | 204 ; 180 | 189 ; 179 | 195 ; 194 |
| `fill_zone` S6 + `undo` | 26 ; 19 | 20 ; 20 | 29 ; 29 |

`z` sur `yrs`, module d'edf0200 (charge 2,5 à 1,4) :

| essai | départ | `-Oz` | `z` `yrs` + `-Oz` |
|---|---:|---:|---:|
| `StrokeBuilder` | 352 ; 352 | 348 ; 349 | 351 ; 347 |
| `commit_stroke` + `save` | 109 ; 110 | 106 ; 105 | 118 ; 117 |
| `load` | 22 ; 22 | 21 ; 21 | 28 ; 28 |
| `hit_test` + `ids_in_rect` | 1 972 ; 1 974 | 1 886 ; 1 840 | 1 903 ; 1 951 |
| `erase` + `undo` | 189 ; 175 | 178 ; 173 | 204 ; 214 |
| `fill_zone` S6 + `undo` | 19 ; 19 | 20 ; 20 | 19 ; 20 |

## OG35 (marge du module principal trouvée dans le code Rust, 2026-11-28)

Cible : au moins 150 Ko de marge sous le plafond H2-13 (1 572 864 o), sans relever le plafond, sans `opt-level = "z"`
et sans perte de vitesse au-delà de +3 %. Départ : `main` 161cf73, module principal 1 456 551 o après `-Oz` (marge
116 313 o) ; module formats 2 795 907 o (inchangé : aucun de ses crates n'est touché, sauf `roomboard-core` par
`format/mod.rs`, voir plus bas).

Mesure : comme `scripts/verifier.sh` (`cargo build --release`, `wasm-bindgen --remove-name-section`, `wasm-opt -Oz`).
Décompte : un second module gardé avec sa section `name` (`wasm-bindgen` sans `--remove-name-section`, puis
`wasm-opt -Oz -g`), lu par deux scripts hors dépôt : taille de chaque fonction, et arbre de domination du graphe
d'appels tiré de `wasm-dis` (l'équivalent de `twiggy dominators`, absent de la VM).

### Où va la place (départ)

Code 1 336 263 o, données 106 071 o. Par crate (fonctions génériques comptées dans la crate de leur définition) :
`roomboard_core` 339 666, `core` 212 752, `yrs` 184 475, fonctions exportées (`*_shim` de wasm-bindgen, où le corps
de chaque méthode est inliné) 178 812, `alloc` 70 649, `zip` 68 088, `i_overlay` 39 462, `hashbrown` 38 568,
`zlib_rs` 31 573, `serde_json` 26 161, le reste sous 14 000 o. Taille retenue (domination) : `Document::apply`
432 380 o, dont `cmd_fill` 184 355 (pot sur zone, `i_overlay` 146 971) ; `format::open` 90 247 (lecture du zip).

Deux postes recopiés plutôt que partagés :

- le chemin d'erreur `JsError::new(&e.to_string())` de `cmd_err`, `fmt_err` et `to_js`, inliné dans chacun des
  105 exports ;
- les tris : chaque `sort_by` d'un type ou d'une fermeture neuve recopie tout l'algorithme (tri stable : `drift`,
  `quicksort`, `smallsort`, 2 à 8 Ko). Les tris instanciés depuis notre code pesaient environ 41 Ko.

### Changements gardés (un à la fois)

| pas | changement | module principal (o) | gain (o) |
|---|---|---:|---:|
| départ | `main` 161cf73 | 1 456 551 | — |
| 1 | `format/mod.rs` : message fixe pour l'échec d'écriture d'une archive en mémoire (`zip_err`, `io_err`), erreur d'entrée-sortie gardée brute dans `read_entry` | 1 456 018 | 533 |
| 2 | `roomboard-wasm` : `cmd_err` et `fmt_err` en `#[inline(never)]` | 1 446 948 | 9 070 |
| 3 | `roomboard-wasm` : erreur de `to_js` dans `ser_err`, `#[inline(never)]` | 1 445 527 | 1 421 |
| 4 | `roomboard-core/src/order.rs` : un seul tri stable d'indices (`sorted_indices`, `sort_stable_by`) pour les tris des commandes (Distribuer, `reinsert_kept`, `find_unique`, Grouper, Restack, suppression par indices) | 1 422 841 | 22 686 |
| 5 | `roomboard-wasm` : `change_js` unique pour les 49 exports qui rendent un `Change` | 1 416 848 | 5 993 |
| fusion | `origin/main` 0e683c75 (OG33, outils lot 2 : +9 197 o sur `main`, 1 465 748 o) | 1 426 752 | — |
| 6 | `order::string_set` (un `BTreeSet<String>` rempli par `insert`, sans le tri de `collect`) et les quatre `sort()` de `String` par `sort_stable_by` ; `change_js` pour l'export neuf d'OG33 (`shape_to_polygon`) | 1 418 253 | 8 499 |

Gain total contre `main` 0e683c75 : 47 495 o (−3,2 %). Marge : 154 611 o (cible : 153 600 o, 150 Kio).

Pas 1 : `ZipError` et `io::Error` ne peuvent pas échouer en écrivant dans un `Vec` ; le texte devient
« document RoomBoard endommagé : écriture de l'archive impossible ». Leur `Display` reste lié par une table de
fonctions (`dyn Error` dans le lecteur du zip) : le gain est petit, gardé parce qu'il ne coûte rien.
Pas 4 : `sorted_indices` trie une permutation `0..n` par une fermeture `&dyn Fn` ; `sort_stable_by` la rejoue sur
le `Vec`. L'ordre est celui de `sort_by` (stable), testé contre lui (`order::tests`). Les ids ne passent plus par un
`BTreeSet<&String>` mais par `sorted_unique` (même ordre trié, mêmes doublons retirés). Les tris du pot sur zone
(`zone.rs`), chemin chaud, n'y passent pas.

### Banc de vitesse (Node, médianes et minimums en ms)

Script hors dépôt sur le patron d'OG28 (`initSync`, mêmes essais, plus 1 500 `element` + `outline` et 300
`add_shape`) ; les deux modules tournent en alternance dans le même processus, pour subir la même charge.
Modules : `main` 0e683c75 et la branche (pas 6), tous deux après `-Oz`. 15 passages, charge de la VM 10,8 à 14,7.

| essai | `main` médiane | branche médiane | écart | `main` min | branche min | écart |
|---|---:|---:|---:|---:|---:|---:|
| `StrokeBuilder` (2 000 traits) | 262,7 | 250,0 | −4,8 % | 221,4 | 220,5 | −0,4 % |
| `commit_stroke` × 1 500 + `save` | 239,7 | 204,1 | −14,8 % | 197,5 | 196,7 | −0,4 % |
| `load` | 36,3 | 36,6 | +0,7 % | 33,2 | 32,9 | −1,0 % |
| `hit_test` + `ids_in_rect` × 30 | 1 098,9 | 1 073,1 | −2,3 % | 993,8 | 1 008,7 | +1,5 % |
| `element` + `outline` × 1 500 | 849,5 | 842,1 | −0,9 % | 740,1 | 747,6 | +1,0 % |
| `erase` × 2 + `undo` × 2 | 869,7 | 885,0 | +1,8 % | 793,9 | 790,8 | −0,4 % |
| `fill_zone` S6 + `undo` | 20,5 | 20,6 | +0,2 % | 19,4 | 19,3 | −0,5 % |
| `add_shape` × 300 | 24,5 | 23,5 | −4,1 % | 21,1 | 20,9 | −0,7 % |

Pire écart : +1,8 % (médiane de `erase`), +1,5 % (minimum de `hit_test`), sous le seuil de +3 % ; aucun de ces deux
chemins n'est touché par OG35. Sous une charge de 13 à 25, les séries plus courtes donnaient ±10 à ±25 % dans les
deux sens : seule la série longue est retenue. Les tris déplacés (Distribuer, Grouper, Restack) portent sur la
sélection : quelques dizaines d'éléments, hors banc.

### Essais écartés

| essai | module principal (o) | pourquoi |
|---|---:|---|
| tris de `Vec<String>` par `sort_stable_by`, seuls | +686 sur le pas 4 | le tri des `String` reste instancié par `BTreeSet::from_iter`, qui trie avant de construire ; repris au pas 6 avec `string_set` |
| `-C llvm-args=-inline-threshold=50` (cible wasm, sur `main`) | 1 447 093 | réglage global, chemins chauds compris ; pas de banc |
| `-C llvm-args=-inline-threshold=25` | 1 428 351 | −28 Ko, mais même défaut ; réserve, à passer au banc avant tout usage |
| `--remap-path-prefix` du registre Cargo | non construit | environ 6 Ko de chemins de paniques ; chemin propre à chaque machine, et les recettes de l'installeur devraient le reprendre |
| remplacer le crate `zip` | non construit | environ 60 Ko, mais `pub use zip` et `Opened.archive` le sortent du cœur (`roomboard-formats`, coque) |
| doublons `::<Transaction>` / `::<TransactionMut>` | — | 12 640 o au total, dont 3 523 o dans notre code : trop peu |

### Où reste la place

- `i_overlay` (147 Ko sous `cmd_fill`) et `yrs` (184 Ko) : seul `opt-level = "z"` les réduit, refusé par le banc d'OG28.
- Le lecteur et l'écrivain `zip` (68 Ko et `zlib_rs` 31 Ko) : un conteneur propre, en lecture et en écriture, ferait
  gagner environ 60 Ko, mais demande de changer l'interface de `format` pour `roomboard-formats` et la coque.
- Les exports : 168 Ko après OG35, surtout la colle de wasm-bindgen (conversion des `Option<String>`, libération).
  Des exports à moins d'arguments (un objet au lieu de 28 paramètres) la réduiraient ; changement d'API côté TS.
