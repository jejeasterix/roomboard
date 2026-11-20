# Taille du module Wasm (OD55, 2026-11-20)

Plafond H2-13 inchangé : 1 572 864 octets (`scripts/verifier.sh`).
Départ : `main` à `f2f3f8c` (après C7), profil `opt-level = "s"`, `lto = true`.

Mesure : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release`,
puis `wasm-bindgen --target web`, taille de `roomboard_wasm_bg.wasm`
(vite copie ce fichier tel quel dans `apps/web/dist/assets`).
Chaque piste est essayée par la variable `CARGO_PROFILE_RELEASE_*` correspondante.

## Pistes seules (contre le départ)

| Piste | Taille (octets) | Gain (octets) | Gardée | Pourquoi |
|---|---:|---:|---|---|
| Départ (`s`, `lto`) | 1 536 002 | — | — | référence |
| `strip = "debuginfo"` | 1 536 002 | 0 | non | aucune section de débogage dans le module release |
| `strip = true` | 945 660 | 590 342 | oui | retire la section `name` (noms des fonctions) ; les chaînes des messages d'erreur restent |
| `codegen-units = 1` | 1 406 705 | 129 297 | oui | meilleure élimination du code par LTO |
| `panic = "abort"` | 1 532 932 | 3 070 | non | voir les combinaisons : il coûte 1 506 octets une fois les deux pistes gardées appliquées |
| `opt-level = "z"` | 1 774 946 | −238 944 | non | plus gros seul (moins d'inlining, plus de noms dans la section `name`) |
| `wasm-opt -Oz` | — | — | non | binaryen absent de la VM et du dépôt ; aucune installation (consigne OD55) |

## Combinaisons

| Profil | Taille (octets) | Gain contre le départ |
|---|---:|---:|
| `strip = true` + `codegen-units = 1` (**retenu**) | 895 381 | 640 621 (−41,7 %) |
| retenu + `panic = "abort"` | 896 887 | 639 115 |
| retenu + `opt-level = "z"` | 822 924 | 713 078 |

`opt-level = "z"` gagne encore 72 457 octets sur le profil retenu, mais il réduit les
optimisations de vitesse du cœur, et ce coût n'est pas mesuré ici. La marge sous le plafond
est déjà de 677 483 octets : la piste est écartée pour l'instant, à reprendre si la marge
redevient courte, avec une mesure du banc (`apps/web/src/app/banc.ts`).

## Ce que le retrait de la section `name` change

- Les messages d'erreur du cœur restent lisibles : ce sont des données, pas des symboles.
  Les tests de contrat du vrai module le vérifient (`wasm-core.contract.test.ts`,
  par exemple `toThrow(/^page inconnue : inconnue$/)`), sous `ROOMBOARD_WASM_REQUIRED=1`.
- Une pile d'appels du navigateur montre `wasm-function[N]` au lieu du nom Rust.
  Pour déboguer, construire sans `strip` : `CARGO_PROFILE_RELEASE_STRIP=none`.

`scripts/verifier.sh` : OK, `module Wasm : 895381 octets`.
