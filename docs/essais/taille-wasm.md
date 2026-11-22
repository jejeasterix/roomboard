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

Budget (N17) : lot 2 ≤ 20 Ko (formats ≤ 3 045 012 o), lot 3 ≤ 80 Ko (≤ 3 125 012 o), marge finale ≥ 20 Ko. Principal inchangé à l'octet.
