# Avis de tiers

Dépendances tierces ajoutées par les chantiers d'usage (U39). Relevé : `cargo metadata` sur `Cargo.lock`.
Contrôle scripté : `scripts/controle-licences.mjs` (crates et paquets npm, développement compris), appelé par `scripts/verifier.sh` après `pnpm install` ; exceptions écrites une fois dans `scripts/licences-acceptees.json` (`caniuse-lite`, CC-BY-4.0, données de build).

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

## Crate `roomboard-formats` (C10b, lecture des classeurs .xlsx)

Crates apportés par `calamine` 0.38 (lecteur `Xlsx`, sans `chrono`) et absents de l'arbre de `roomboard-core`. `zopfli` vient de la feature `deflate` de `zip` qu'exige `calamine` ; inutilisé, éliminé à l'édition des liens.

| crate | version | licence | dépôt |
|---|---|---|---|
| atoi_simd | 0.18.1 | MIT OR Apache-2.0 | https://github.com/RoDmitry/atoi_simd |
| byteorder | 1.5.0 | Unlicense OR MIT | https://github.com/BurntSushi/byteorder |
| calamine | 0.38.0 | MIT | https://github.com/tafia/calamine |
| codepage | 0.1.3 | Apache-2.0 OR MIT | https://github.com/hsivonen/codepage |
| core_detect | 1.0.0 | MIT/Apache-2.0 | https://github.com/thomcc/core_detect |
| debug_unsafe | 0.1.4 | MIT OR Apache-2.0 | https://github.com/RoDmitry/debug_unsafe |
| encoding_rs | 0.8.44 | (Apache-2.0 OR MIT) AND BSD-3-Clause | https://github.com/hsivonen/encoding_rs |
| fast-float2 | 0.2.4 | MIT OR Apache-2.0 | https://github.com/Alexhuszagh/fast-float-rust |
| log | 0.4.35 | MIT OR Apache-2.0 | https://github.com/rust-lang/log |
| multiversion_no_op | 1.0.0 | Apache-2.0 OR MIT | https://github.com/hsivonen/multiversion_no_op |
| quick-xml | 0.42.0 | MIT | https://github.com/tafia/quick-xml |
| simd-adler32 | 0.3.10 | MIT | https://github.com/mcountryman/simd-adler32 |
| simdutf8 | 0.1.5 | MIT OR Apache-2.0 | https://github.com/rusticstuff/simdutf8 |
| zopfli | 0.8.4 | Apache-2.0 | https://github.com/zopfli-rs/zopfli |

## Texte de licence : calamine 0.38.0 (MIT)

```text
The MIT License (MIT)

Copyright (c) 2016 Johann Tuffe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:


The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.


THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Texte de licence : quick-xml 0.42.0 (MIT)

```text
The MIT License (MIT)

Copyright (c) 2016 Johann Tuffe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:


The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.


THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Texte de licence : simd-adler32 0.3.10 (MIT)

```text
MIT License

Copyright (c) [2021] [Marvin Countryman]

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

## Texte de licence : encoding_rs (données) 0.8.44 (BSD-3-Clause)

```text
Copyright © WHATWG (Apple, Google, Mozilla, Microsoft).

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Code repris d'ActCraft (C9, accroche de la grille)

`crates/roomboard-core/src/grid.rs` reprend, réécrites en Rust, trois fonctions d'ActCraft (`core/src/gridsnap.cpp`) :
`nearestGridPoint` (niveau le plus proche, sans seuil), `snapAxis` (ligne la plus proche, bornée à la première ligne
`≥ 0` ; la borne de la dernière ligne `≤ largeur` est propre à RoomBoard) et `nearestLatticePoint` (sommet du réseau le
plus proche). ActCraft est publié sous GPL-3.0-only ; son auteur, seul, est aussi celui de RoomBoard et reprend ce code
sous PolyForm Shield (décision 0246). Auteur : jejeasterix (seul auteur de `core/src/gridsnap.cpp`, état lu :
ActCraft `d9bf289f`). Aucune dépendance n'est ajoutée.

## Paquets npm de l'application (C12, PDF)

Chargés par import dynamique au premier PDF (`apps/web/src/platform/pdf-load.ts`), jamais au démarrage.

| paquet | version | licence | dépôt |
|---|---|---|---|
| pdfjs-dist | 6.5.438 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| pdf-lib | 1.17.1 | MIT | https://github.com/Hopding/pdf-lib |
| @pdf-lib/standard-fonts | 1.0.0 | MIT | https://github.com/Hopding/standard-fonts |
| @pdf-lib/upng | 1.0.1 | MIT | https://github.com/Hopding/upng |
| pako | 1.0.11 | MIT AND Zlib | https://github.com/nodeca/pako |
| tslib | 1.14.1 | 0BSD | https://github.com/microsoft/tslib |

`@napi-rs/canvas` (dépendance facultative de `pdfjs-dist`, MIT) peut être installé par `pnpm` ; il ne sert qu'à Node
et n'entre pas dans `dist`.

Ressources de `pdfjs-dist` copiées dans `dist/pdfjs/` avec leurs textes de licence : polices Liberation Sans
(`standard_fonts/LICENSE_LIBERATION`, SIL Open Font License 1.1), polices Foxit (`standard_fonts/LICENSE_FOXIT`,
licence de type BSD), tables de caractères Adobe (`cmaps/LICENSE`, BSD-3-Clause), modules `wasm/` : OpenJPEG
(`LICENSE_OPENJPEG`, BSD-2-Clause), JBIG2 de PDFium (`LICENSE_JBIG2`, BSD-3-Clause), qcms (`LICENSE_QCMS`, MIT), et
leurs enveloppes Mozilla (`LICENSE_PDFJS_*`, Apache-2.0). Le module QuickJS (script des formulaires PDF) n'est pas
copié. Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0),
OFL-1.1 (https://openfontlicense.org).
