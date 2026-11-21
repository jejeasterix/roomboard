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

Écart du module principal : +205 099 o. Mesure : `cargo build --target wasm32-unknown-unknown --release`, puis
`wasm-bindgen --target web --remove-name-section`, comme `scripts/verifier.sh` (l'asset de vite en est la copie).
Garde-fou du cadrage (Q5, HC8-9) : 1 420 000 o ; plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).
`roomboard-formats` ne reçoit pas la fonctionnalité `zone` (DA-Z1) : son module est inchangé à l'octet.
