# Avis de tiers

Dépendances tierces ajoutées par les chantiers d'usage (U39). Relevé : `cargo metadata` sur `Cargo.lock`.
Le contrôle scripté des licences et son appel par `scripts/verifier.sh` viennent avec la partie « reste » de C2 (HK5).

## Crate `roomboard-formats` (C2, empreinte SHA-256 des assets)

Crates apportés par `sha2` et absents de l'arbre de `roomboard-core` (`cargo tree -e normal,build --target all`).

| crate | version | licence | dépôt |
|---|---|---|---|
| sha2 | 0.10.9 | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |
| digest | 0.10.7 | MIT OR Apache-2.0 | https://github.com/RustCrypto/traits |
| crypto-common | 0.1.7 | MIT OR Apache-2.0 | https://github.com/RustCrypto/traits |
| block-buffer | 0.10.4 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| cpufeatures | 0.2.17 | MIT OR Apache-2.0 | https://github.com/RustCrypto/utils |
| generic-array | 0.14.7 | MIT | https://github.com/fizyk20/generic-array |
| typenum | 1.20.1 | MIT OR Apache-2.0 | https://github.com/paholg/typenum |
| version_check | 0.9.5 | MIT/Apache-2.0 | https://github.com/SergioBenitez/version_check |
| cfg-if | 1.0.5 | MIT OR Apache-2.0 | https://github.com/rust-lang/cfg-if |
| libc | 0.2.191 | MIT OR Apache-2.0 | https://github.com/rust-lang/libc |

Textes des licences : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0).

## Texte de licence : generic-array 0.14.7 (MIT)

La licence MIT exige de conserver la mention de copyright et le texte.

```text
The MIT License (MIT)

Copyright (c) 2015 Bartłomiej Kamiński

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Code repris d'ActCraft (C9, accroche de la grille)

`crates/roomboard-core/src/grid.rs` reprend, réécrites en Rust, trois fonctions d'ActCraft (`core/src/gridsnap.cpp`) :
`nearestGridPoint` (niveau le plus proche, sans seuil), `snapAxis` (ligne la plus proche, bornée à la première ligne
`≥ 0` ; la borne de la dernière ligne `≤ largeur` est propre à RoomBoard) et `nearestLatticePoint` (sommet du réseau le
plus proche). ActCraft est publié sous GPL-3.0-only ; son auteur, seul, est aussi celui de RoomBoard et reprend ce code
sous PolyForm Shield (décision 0246). Aucune dépendance n'est ajoutée.
