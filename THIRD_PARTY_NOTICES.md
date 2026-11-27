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

## Code repris d'ActCraft (C13, lecteur `.flipchart`)

Le lecteur de paperboards ActivInspire reprend, réécrits en Rust et en TypeScript, des morceaux d'ActCraft : le conteneur
« Bamboo » (`formats/src/bamboo.cpp` → `apps/web/src/platform/bamboo.ts`), l'index « culm », le flux d'objets
(`formats/src/objectstream.cpp`), les numéros de genres et de propriétés (`formats/src/flipchartids.h`) et la lecture du
document (`formats/src/flipchart.cpp`) →
`crates/roomboard-formats/src/flipchart/` (`index.rs`, `stream.rs`, `ids.rs`, `read.rs`) ; l'écrivain de test
`tests/support/flipchartwriter.h` devient la fabrique `scripts/essais/fabriques/flipchart.mjs`. ActCraft est publié sous
GPL-3.0-only ; son auteur, seul, est aussi celui de RoomBoard (jejeasterix, titulaire des droits ; seul auteur des fichiers
cités, état lu : ActCraft `29d551ae`). Exception de licence
U39 sur le précédent C9 ci-dessus ; reprise sous la licence de RoomBoard (PolyForm Shield) à confirmer par l'auteur
(HU1-6). Aucune dépendance n'est ajoutée ; aucun fichier réel n'est copié dans le dépôt, les exemples servent seulement
à mesurer la fidélité (`docs/essais/c13-fidelite-lots2-3.md`).

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
(`standard_fonts/LICENSE_LIBERATION`, licence Red Hat de Liberation 1.07.4 : GNU General Public License v2 avec
exception de police), polices Foxit (`standard_fonts/LICENSE_FOXIT`,
licence de type BSD), tables de caractères Adobe (`cmaps/LICENSE`, BSD-3-Clause), modules `wasm/` : OpenJPEG
(`LICENSE_OPENJPEG`, BSD-2-Clause), JBIG2 de PDFium (`LICENSE_JBIG2`, BSD-3-Clause), qcms (`LICENSE_QCMS`, MIT), et
leurs enveloppes Mozilla (`LICENSE_PDFJS_*`, Apache-2.0). Le module QuickJS (script des formulaires PDF) n'est pas
copié. Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0),
GPL-2.0 avec exception de police (texte complet dans `standard_fonts/LICENSE_LIBERATION`).

La CLI (`apps/cli`) ne copie pas ces polices : elle les lit à l'exécution dans le paquet `pdfjs-dist` installé et les
embarque dans les PDF annotés qu'elle écrit, sous l'exception de police (cadrage cli-lot3, D48). Remplacer Liberation
par une police sous OFL dans la page et la CLI reste à décider.

## Paquets npm de l'application (C15, objets 3D)

`three` est chargé par import dynamique au premier objet 3D (`apps/web/src/platform/model-view-three.ts`), jamais au
démarrage ; `fflate` ne sert qu'au Worker de lecture des ZIP (`apps/web/src/platform/zip-worker.ts`).

| paquet | version | licence | dépôt |
|---|---|---|---|
| three | 0.187.0 | MIT | https://github.com/mrdoob/three.js |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |

`@types/three` (0.187.0, MIT) ne sert qu'à la compilation et n'entre pas dans `dist`.

## Paquets npm de l'application (OG11, rendu « dessiné à la main »)

`roughjs` calcule le tracé des styles Artiste et Caricaturiste (`apps/web/src/engine/render/sketch.ts`) par
`rough.generator()` seul, sans DOM ; ses opérations sont rejouées sur le contexte de l'écran ou de l'export. Poids
mesuré au chantier personnalisation-2 (T8) : `assets/index-*.js` passe de 172 445 à 182 423 octets gzip (+9 978).

| paquet | version | licence | dépôt |
|---|---|---|---|
| roughjs | 4.6.6 | MIT | https://github.com/pshihn/rough |
| hachure-fill | 0.5.2 | MIT | https://github.com/pshihn/hachure-fill |
| path-data-parser | 0.1.0 | MIT | https://github.com/pshihn/path-data-parser |
| points-on-curve | 0.2.0 | MIT | https://github.com/pshihn/bezier-points |
| points-on-path | 0.2.1 | MIT | https://github.com/pshihn/points-on-path |

Mentions de copyright, relevées dans le fichier `LICENSE` de chaque paquet de `node_modules` :

| paquet | mention |
|---|---|
| roughjs | Copyright (c) 2019 Preet Shihn |
| hachure-fill | Copyright (c) 2023 Preet Shihn |
| path-data-parser | Copyright (c) 2020 Preet Shihn |
| points-on-curve | Copyright (c) 2020 Preet Shihn |
| points-on-path | Copyright (c) 2020 Preet |

## Texte de licence : roughjs 4.6.6 (MIT ; hachure-fill, path-data-parser, points-on-curve, points-on-path : même licence, mentions ci-dessus)

```
MIT License

Copyright (c) 2019 Preet Shihn

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

## Code adapté d'Excalidraw (OG11, MIT)

Comportement copié d'Excalidraw (https://github.com/excalidraw/excalidraw, MIT, Copyright (c) 2020 Excalidraw), mention
MIT en tête de chaque fichier :

- `apps/web/src/engine/render/sketch.ts` : options roughjs (`generateRoughOptions`, tirets sans multi-trait,
  `packages/element/src/shape.ts`), rectangle arrondi en chemin (`shape.ts`), rayon adaptatif des angles
  (`packages/element/src/utils.ts`) ;
- `apps/web/src/ui/tool-options.ts` (T6) : valeur commune ou mixte d'un réglage sur la sélection, adaptée de
  `getFormValue` (`packages/excalidraw/actions/actionProperties.tsx`) ;
- `apps/web/src/ui/ColorPicker.tsx`, `apps/web/src/ui/open-color.ts` (T16) : sélecteur de couleur
  (`packages/excalidraw/components/ColorPicker/`) et palette (`packages/common/src/colors.ts`) ; les teintes viennent
  d'open-color (https://github.com/yeun/open-color, MIT, Copyright (c) 2016 heeyeun) et `bronze` de Radix Colors (MIT).

Texte : MIT (https://opensource.org/licenses/MIT), identique à celui de roughjs ci-dessus, titulaire « Excalidraw ».

## Crate `roomboard-formats` (C12, PDF vectoriel par krilla)

Crates apportés par `krilla` 0.8 (features `simple-text` et `raster-images` seules, sans les features par défaut) et
absents de l'arbre de `roomboard-core` comme des sections C2 et C10b (`cargo tree -e normal` et
`-e normal,build --target all`). Licences lues dans `cargo metadata`. `krilla` n'entre que dans le module `formats`,
jamais dans le module principal.

| crate | version | licence | dépôt |
|---|---|---|---|
| adler2 | 2.0.1 | 0BSD OR MIT OR Apache-2.0 | https://github.com/oyvindln/adler2 |
| arrayref | 0.3.9 | BSD-2-Clause | https://github.com/droundy/arrayref |
| arrayvec | 0.7.8 | MIT OR Apache-2.0 | https://github.com/bluss/arrayvec |
| autocfg | 1.5.1 | Apache-2.0 OR MIT | https://github.com/cuviper/autocfg |
| base64 | 0.22.1 | MIT OR Apache-2.0 | https://github.com/marshallpierce/rust-base64 |
| bitflags | 2.13.2 | MIT OR Apache-2.0 | https://github.com/bitflags/bitflags |
| bumpalo | 3.20.4 | MIT OR Apache-2.0 | https://github.com/fitzgen/bumpalo |
| bytemuck | 1.25.2 | Zlib OR Apache-2.0 OR MIT | https://github.com/Lokathor/bytemuck |
| bytemuck_derive | 1.12.1 | Zlib OR Apache-2.0 OR MIT | https://github.com/Lokathor/bytemuck |
| byteorder-lite | 0.1.0 | Unlicense OR MIT | https://github.com/image-rs/byteorder-lite |
| color_quant | 1.1.0 | MIT | https://github.com/image-rs/color_quant.git |
| core_maths | 0.1.1 | MIT | https://github.com/robertbastian/core_maths |
| fdeflate | 0.3.7 | MIT OR Apache-2.0 | https://github.com/image-rs/fdeflate |
| float-cmp | 0.9.0 | MIT | https://github.com/mikedilger/float-cmp |
| font-types | 0.11.3 | MIT OR Apache-2.0 | https://github.com/googlefonts/fontations |
| gif | 0.14.2 | MIT OR Apache-2.0 | https://github.com/image-rs/image-gif |
| image-webp | 0.2.4 | MIT OR Apache-2.0 | https://github.com/image-rs/image-webp |
| imagesize | 0.14.0 | MIT | https://github.com/Roughsketch/imagesize |
| krilla | 0.8.2 | MIT OR Apache-2.0 | https://github.com/LaurenzV/krilla |
| kurbo | 0.13.1 | Apache-2.0 OR MIT | https://github.com/linebender/kurbo |
| libm | 0.2.16 | MIT | https://github.com/rust-lang/compiler-builtins |
| miniz_oxide | 0.8.9 | MIT OR Zlib OR Apache-2.0 | https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide |
| miniz_oxide | 0.9.1 | MIT OR Zlib OR Apache-2.0 | https://github.com/Frommi/miniz_oxide/tree/master/miniz_oxide |
| num-traits | 0.2.19 | MIT OR Apache-2.0 | https://github.com/rust-num/num-traits |
| pdf-writer | 0.15.0 | MIT OR Apache-2.0 | https://github.com/typst/pdf-writer |
| png | 0.18.1 | MIT OR Apache-2.0 | https://github.com/image-rs/image-png |
| polycool | 0.4.0 | MIT OR Apache-2.0 | https://github.com/linebender/kurbo |
| quick-error | 2.0.1 | MIT/Apache-2.0 | http://github.com/tailhook/quick-error |
| read-fonts | 0.39.2 | MIT OR Apache-2.0 | https://github.com/googlefonts/fontations |
| rustc-hash | 2.1.3 | Apache-2.0 OR MIT | https://github.com/rust-lang/rustc-hash |
| rustybuzz | 0.20.1 | MIT | https://github.com/harfbuzz/rustybuzz |
| ryu | 1.0.23 | Apache-2.0 OR BSL-1.0 | https://github.com/dtolnay/ryu |
| siphasher | 1.0.4 | MIT OR Apache-2.0 | https://github.com/jedisct1/rust-siphash |
| skrifa | 0.42.1 | MIT OR Apache-2.0 | https://github.com/googlefonts/fontations |
| stable_deref_trait | 1.2.1 | MIT OR Apache-2.0 | https://github.com/storyyeller/stable_deref_trait |
| strict-num | 0.1.1 | MIT | https://github.com/RazrFalcon/strict-num |
| subsetter | 0.2.6 | MIT OR Apache-2.0 | https://github.com/typst/subsetter |
| synstructure | 0.14.0 | MIT | https://github.com/mystor/synstructure |
| tiny-skia-path | 0.12.0 | BSD-3-Clause | https://github.com/linebender/tiny-skia/tree/master/path |
| ttf-parser | 0.25.1 | MIT OR Apache-2.0 | https://github.com/harfbuzz/ttf-parser |
| unicode-bidi-mirroring | 0.4.0 | MIT/Apache-2.0 | https://github.com/RazrFalcon/unicode-bidi-mirroring |
| unicode-ccc | 0.4.0 | MIT/Apache-2.0 | https://github.com/RazrFalcon/unicode-ccc |
| unicode-properties | 0.1.5 | (MIT OR Apache-2.0) AND Unicode-3.0 | https://github.com/unicode-rs/unicode-properties |
| unicode-script | 0.5.9 | MIT OR Apache-2.0 | https://github.com/unicode-rs/unicode-script |
| weezl | 0.1.12 | MIT OR Apache-2.0 | https://github.com/image-rs/weezl |
| write-fonts | 0.48.1 | MIT OR Apache-2.0 | https://github.com/googlefonts/fontations |
| xmp-writer | 0.3.3 | MIT OR Apache-2.0 | https://github.com/typst/xmp-writer |
| yoke | 0.8.4 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| yoke-derive | 0.8.4 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| zerofrom | 0.1.8 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| zerofrom-derive | 0.1.8 | Unicode-3.0 | https://github.com/unicode-org/icu4x |
| zune-core | 0.5.3 | MIT OR Apache-2.0 OR Zlib | https://github.com/etemesi254/zune-image |
| zune-jpeg | 0.5.15 | MIT OR Apache-2.0 OR Zlib | https://github.com/etemesi254/zune-image/tree/dev/crates/zune-jpeg |

Police de test `crates/roomboard-formats/tests/fixtures/LiberationSans-Regular.ttf` : copie de
`pdfjs-dist/standard_fonts/` (Liberation Sans, licence Red Hat 1.07.4 : GNU General Public License v2 avec exception
de police), texte joint à côté
(`tests/fixtures/LICENSE_LIBERATION`). Textes : MIT (https://opensource.org/licenses/MIT), Apache-2.0
(https://www.apache.org/licenses/LICENSE-2.0), BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause),
BSD-3-Clause (https://opensource.org/licenses/BSD-3-Clause), Zlib (https://opensource.org/licenses/Zlib),
Unicode-3.0 (https://www.unicode.org/license.txt), BSL-1.0 (https://www.boost.org/LICENSE_1_0.txt), GPL-2.0 avec
exception de police (`tests/fixtures/LICENSE_LIBERATION`).

## Coque Tauri (C14, protocole d'assets)

Feature `protocol-asset` de `tauri` (`apps/desktop/src-tauri/Cargo.toml`) : elle ajoute au verrou de `src-tauri` une seule crate, `http-range`. La coque (`roomboard-shell`) ajoute aussi `sha2` pour l'empreinte des vidéos liées (déjà relevé plus haut).

| crate | version | licence | dépôt |
|---|---|---|---|
| http-range | 0.1.6 | MIT | https://github.com/bancek/rust-http-range |
| sha2 (`roomboard-shell`) | 0.10.9 | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |

## Texte de licence : http-range 0.1.6 (MIT)

```
MIT License

Copyright (c) 2016 Luka Zakrajšek

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

## Crate `roomboard-core` (C8, zone fermée du pot)

Crates apportés par `i_overlay`, derrière la fonctionnalité `zone` du cœur, activée par `roomboard-wasm` seul
(`roomboard-formats` ne la reçoit pas). Relevé : `cargo tree -p roomboard-core --features zone -e normal` ; licences
et dépôts lus dans `cargo metadata --features roomboard-core/zone`.

| crate | version | licence | dépôt |
|---|---|---|---|
| i_overlay | 9.2.0 | MIT OR Apache-2.0 (MIT retenue) | https://github.com/iShape-Rust/iOverlay |
| i_float | 5.0.0 | MIT | https://github.com/iShape-Rust/iFloat |
| i_shape | 5.0.0 | MIT | https://github.com/iShape-Rust/i_shape |
| i_tree | 0.20.0 | MIT | https://github.com/iShape-Rust/iTree |
| i_key_sort | 0.12.0 | MIT | https://github.com/iShape-Rust/iKeySort |

`libm` 0.2.16 (MIT) est déjà listé plus haut. `i_float`, `i_shape` et `i_tree` livrent leur fichier LICENSE (texte
ci-dessous, ligne de copyright reproduite mot pour mot : « Copyright (c) 2023 iShape-Rust » pour `i_float` et `i_shape`,
« Copyright (c) 2024 iShape-Rust » pour `i_tree`). `i_overlay` et `i_key_sort` n'en livrent pas dans leur paquet
(auteur déclaré : Nail Sharipov, du même groupe iShape-Rust) : le même texte MIT s'applique, avec la ligne de 2023.

## Texte de licence : i_float 5.0.0, i_shape 5.0.0 (MIT) ; i_overlay 9.2.0, i_key_sort 0.12.0 (même texte, sans fichier)

```text
MIT License

Copyright (c) 2023 iShape-Rust

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

## Texte de licence : i_tree 0.20.0 (MIT)

```text
MIT License

Copyright (c) 2024 iShape-Rust

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

## Formats de tableaux interactifs (C13)

- **IWB/CFF** (Interactive Whiteboard Common File Format), version 1.0, © 1EdTech Consortium, Inc. (ex-IMS Global
  Learning Consortium) ; travaux initiaux de Becta. RoomBoard lit et écrit des fichiers `.iwb` au titre de la licence
  de spécification de 1EdTech (https://www.1edtech.org/standards/specification-license, § 3 : mise en œuvre sans
  redevance). RoomBoard ne revendique aucune conformité à la norme et n'emploie pas son nom dans son interface (§ 2c ;
  https://www.1edtech.org/about/legal/trademarks).
- **OpenBoard** `.ubz` : format lu et écrit d'après le comportement d'OpenBoard (GPL-3.0) ; aucun code d'OpenBoard
  n'est repris dans RoomBoard.
- Lecteur XML : `quick-xml` 0.42 (MIT), déjà relevé par `calamine` (`scripts/licences-acceptees.json`).

## Coque (C16, conversion Office)

Crates ajoutées à `roomboard-shell` (et donc à `apps/desktop/src-tauri`). LibreOffice et Microsoft Office sont des
programmes externes, lancés comme processus (LibreOffice) ou appelés par COM (Office) ; ils ne sont ni liés ni
distribués.

| crate | version | licence | dépôt | cible |
|---|---|---|---|---|
| open | 5.4.5 | MIT | https://github.com/Byron/open-rs | toutes |
| is-wsl | 0.4.0 | MIT | https://github.com/TheLarkInn/is-wsl | Linux |
| is-docker | 0.2.0 | MIT | https://github.com/TheLarkInn/is-docker | Linux |
| dunce | 1.0.5 | CC0-1.0 OR MIT-0 OR Apache-2.0 | https://gitlab.com/kornelski/dunce | Windows |
| windows (et `windows-*` tirées) | 0.62.2 | MIT OR Apache-2.0 | https://github.com/microsoft/windows-rs | Windows |
| libc | 0.2.191 | MIT OR Apache-2.0 | https://github.com/rust-lang/libc | Unix |

## Texte de licence : open 5.4.5 (MIT)

```text
The MIT License (MIT)
=====================

Copyright © `2015` `Sebastian Thiel`

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the “Software”), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```

## Texte de licence : is-wsl 0.4.0, is-docker 0.2.0 (MIT, même texte)

```text
MIT License

Copyright (c) 2023 Sean Larkin

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

## Icônes Lucide (ISC), design L1, L2, L3 et L4

Tracés repris de Lucide (https://github.com/lucide-icons/lucide), commit `7981a0798a`, sans paquet npm : ils sont
recopiés dans `apps/web/src/ui/icons.ts`.

- Repris des maquettes `docs/design/maquettes/01-tableau.html` (tracés Lucide au même commit), noms RoomBoard :
  `pen`, `eraser`, `hand`, `select`, `rect`, `ellipse`, `arrow`, `text`, `table`, `fill`, `undo`, `redo`, `prev`,
  `next`, `plus`, `trash`, `file-import`, `pdf`, `export`, `fit`, `file-new`, `file-open`, `save`, `settings`,
  `profile`, `grid`, `library`, `pointer`, `screen`, `freeze`, `board`, `reset`.
- Lus au commit par `gh api`, noms Lucide : `square-arrow-up-right-exit`, `pen-line`, `between-horizontal-start`,
  `between-vertical-start`, `columns-3`, `table-cells-merge`, `table-cells-split`, `droplet`, `droplet-off`.
- Dessinées pour RoomBoard dans le même style (grille de 24, trait 1,5) : `annotate`, `eraser-part`, `line`,
  `row-remove`, `col-remove`.
- Lue dans Lucide au même commit (design L2, correctif T12) : `file-plus` (Lucide `file-plus`), pour « Insérer des pages… ».
- Reprises de la maquette `docs/design/maquettes/02-annotation-bureau.html` (design L4, tracés Lucide au même commit),
  noms RoomBoard : `check` (Lucide `check`), `drop` (Lucide `file-down`).
- Reprises de la maquette `docs/design/maquettes/03-profils.html` (design L3, tracés Lucide au même commit), noms
  RoomBoard : `close` (Lucide `x`), `grip` (Lucide `grip-vertical`), `hidden` (Lucide `eye-off`),
  `dock-top` (Lucide `panel-top`), `dock-bottom` (Lucide `panel-bottom`), `dock-left` (Lucide `panel-left`),
  `dock-right` (Lucide `panel-right`), `dock-float` (Lucide `app-window`), `import` (Lucide `upload`),
  `down` (Lucide `chevron-down`).
- Reprises de la maquette `docs/design/maquettes/01-tableau.html` (design L2, tracés Lucide au même commit), noms
  RoomBoard : `menu` (Lucide `menu`), `collapse` (Lucide `chevron-up`).
- Lus au commit par `gh api` (personnalisation-1a, lot 1), recopiés tels quels, noms RoomBoard identiques aux noms Lucide :
  `copy` (Dupliquer la page), `rectangle-horizontal`, `rectangle-vertical`,
  `infinity`, `rows-2`, `rows-3`, `rows-4`. L'onglet Pages de la barre latérale et `page-number` réutilisent `dock-left` (même tracé que Lucide `panel-left`).
- Lus au commit par `gh api` (personnalisation-1a, lot 2, onglet Calques), recopiés tels quels, noms RoomBoard identiques aux
  noms Lucide : `layers` (onglet Calques), `bring-to-front` (Premier plan), `send-to-back` (Arrière-plan).
- Lues dans Lucide au même commit par `gh api` (personnalisation 1b), noms Lucide : `wallpaper` (bouton « Fonds »),
  `search` et `image-plus` (fenêtre des fonds).
- Panneau d'options lot 2 (OG11), lus au même commit, noms Lucide : `chevron-up`, `chevron-down` (Avancer, Reculer ; Premier plan et Arrière-plan
  reprennent `bring-to-front` et `send-to-back` d'OG4), `align-left`, `align-center`, `align-right`. Dessinées pour RoomBoard (grille de 24, trait 1,5) :
  `fill-solid`, `fill-hachure`, `fill-cross`, `head-none`, `head-arrow`, `head-triangle`, `head-triangle-outline`.

Licence de Lucide (ISC), qui contient la licence MIT de Feather (Cole Bemis) pour les icônes qui en dérivent,
recopiée de `LICENSE` au commit `7981a0798a` :

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

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

## Pack de fonds (images CC0), personnalisation 1b

Photos du pack de fonds (`apps/web/public/backgrounds/photos/`, miniatures dans `apps/web/public/backgrounds/thumbs/`) :
toutes sous CC0 1.0 (dédicace au domaine public), aucune obligation d'attribution. La licence de chaque image a été lue
sur sa page source, jamais déduite du site ; page, fichier d'origine, auteur, texte de licence lu et date de lecture de
chacune sont dans `apps/web/backgrounds/SOURCES.json`, hors de l'application construite.

Sources retenues : Poly Haven (polyhaven.com, textures), Wikimedia Commons (fichiers au modèle CC0).

Retouche : recadrage 16:9 centré, 2560 × 1440 (ou 1920 × 1080 quand l'image ne tient pas sous 400 Ko), WebP, métadonnées EXIF et XMP retirées ; miniatures 480 × 270.

Fonds dessinés (couleurs, dégradés, lignes et grilles, modèles de cours) : écrits pour RoomBoard
(`apps/web/src/backgrounds/`), aucune source extérieure.

## Icône de l'application (design L5)

Les fichiers d'icône de `apps/desktop/src-tauri/icons/`, leurs sources `docs/design/icone/` (SVG et tracés de
`gen.mjs`) et les planches `docs/essais/design-l5-icone-*.png` reprennent l'hexagone et la flèche de l'icône RoomFlow (`roomflow-app-icon.svg`), marque de l'auteur
(jejeasterix). Ils sont la marque de l'auteur et restent hors de la licence PolyForm Shield 1.0.0 du code (`LICENSE`) : leur
présence dans ce dépôt n'accorde aucun droit sur la marque. Aucune dépendance n'est ajoutée.
