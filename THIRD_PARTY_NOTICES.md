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

Textes des licences : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0).
