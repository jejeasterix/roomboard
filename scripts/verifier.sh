#!/usr/bin/env bash
# Vérification complète de RoomBoard. src-tauri est exclu du workspace Cargo
# (build ~7,5 Go de RAM) : il n'est ni dans clippy ni dans cargo test ici, sa CSP est contrôlée.
set -euo pipefail
cd "$(dirname "$0")/.."

# --e2e : joue aussi les essais Playwright (Chromium, VM) ; sans lui, aucun navigateur n'est lancé.
E2E=0
for a in "$@"; do
  case "$a" in
    --e2e) E2E=1 ;;
    *) echo "verifier.sh : option inconnue $a" >&2; exit 2 ;;
  esac
done

WASM_OUT=apps/web/src/wasm
FORMATS_OUT=apps/web/src/wasm-formats

cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
# Le cœur seul, sans la fonctionnalité `zone` que `roomboard-wasm` active (resolver 2 l'unifie dans le workspace).
cargo clippy -p roomboard-core --all-targets -- -D warnings
cargo test -p roomboard-core

bash scripts/tests/controle-wasm-bindgen.test.sh
bash scripts/controle-wasm-bindgen.sh Cargo.lock
bash scripts/tests/controle-hors-ligne.test.sh
bash scripts/tests/verifier-e2e.test.sh
bash scripts/tests/controle-icones.test.sh
bash scripts/tests/coque-csp.test.sh
node --test scripts/tests/avis.test.mjs
node --test scripts/tests/nettete.test.mjs
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release
rm -rf "$WASM_OUT"
# --remove-name-section : ~510 Ko de noms de fonctions en moins (OD55, docs/essais/taille-wasm.md).
wasm-bindgen --target web --remove-name-section --out-dir "$WASM_OUT" \
  target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
# Second module (R8, R9) : conteneur avec assets, chargé par la page au premier besoin ; 3 Mio au plus.
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
rm -rf "$FORMATS_OUT"
wasm-bindgen --target web --remove-name-section --out-dir "$FORMATS_OUT" \
  target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm

pnpm install --frozen-lockfile
# Marge du module formats (OE71, docs/essais/taille-wasm.md) : wasm-opt -Oz du paquet npm `binaryen` (Apache-2.0),
# après wasm-bindgen, comme le fait wasm-pack ; la colle JS reste celle de wasm-bindgen. Le module principal n'y passe pas.
pnpm exec wasm-opt -Oz "$FORMATS_OUT/roomboard_formats_wasm_bg.wasm" -o "$FORMATS_OUT/roomboard_formats_wasm_bg.wasm"
# Licences des dépendances (U39, R21) : après pnpm install, sur le node_modules réel.
bash scripts/tests/controle-licences.test.sh
node scripts/controle-licences.mjs
# cli-lot4 (D53, D55) : binaire de conversion Office, construit AVANT `pnpm -r test` (les tests de la CLI le lancent).
nice -n 10 cargo build -p roomboard-shell --bin roomboard-office -j 4
# Contrat du vrai module (D33) : exigé ici, il échoue au lieu de se sauter si le .wasm manque. cli-partage (D10) : 3 workers vitest par processus, sauf valeur donnée.
ROOMBOARD_WASM_REQUIRED=1 VITEST_MAX_WORKERS="${VITEST_MAX_WORKERS:-3}" pnpm -r test
pnpm --filter @roomboard/web build

# Taille du module que la page charge (H2-13) : l'asset émis par vite, copie de la sortie de wasm-bindgen.
mapfile -t wasm_page < <(find apps/web/dist/assets -name 'roomboard_wasm_bg*.wasm')
if [ "${#wasm_page[@]}" -ne 1 ]; then
  echo "verifier.sh : un seul module Wasm attendu dans apps/web/dist/assets (${#wasm_page[@]} trouvés)" >&2
  exit 1
fi
taille=$(wc -c < "${wasm_page[0]}" | tr -d ' ')
echo "module Wasm : $taille octets (${wasm_page[0]})"
if [ "$taille" -gt 1572864 ]; then
  echo "verifier.sh : module Wasm trop gros ($taille octets > 1,5 Mo, H2-13)" >&2
  exit 1
fi

# Taille du second module (R9) : l'asset émis par vite (chargé au premier besoin), 3 Mio au plus.
mapfile -t wasm_formats < <(find apps/web/dist/assets -name 'roomboard_formats_wasm_bg*.wasm')
if [ "${#wasm_formats[@]}" -ne 1 ]; then
  echo "verifier.sh : un seul module formats attendu dans apps/web/dist/assets (${#wasm_formats[@]} trouvés)" >&2
  exit 1
fi
taille_formats=$(wc -c < "${wasm_formats[0]}" | tr -d ' ')
echo "module formats : $taille_formats octets (${wasm_formats[0]})"
if [ "$taille_formats" -gt 3145728 ]; then
  echo "verifier.sh : module formats trop gros ($taille_formats octets > 3 Mio, R9)" >&2
  exit 1
fi

# CLI (cadrage cli, D14) : construite, puis essayée de bout en bout sur des fichiers temporaires. Hors du bloc --e2e :
# aucun navigateur. Après les modules Wasm et pnpm install ; un module absent fait échouer l'essai.
# cli-lot4 (D53, D55) : binaire de conversion Office lu par la CLI dans target/debug/ (construit plus haut, avant les
# tests Vitest qui le lancent).
pnpm --filter @roomboard/cli build
node scripts/essais/cli-essai.mjs

# Hors ligne (cadrage D27) : aucun hôte distant dans l'application construite, CSP stricte de la coque.
node scripts/controle-hors-ligne.mjs apps/web/dist apps/desktop/src-tauri/tauri.conf.json
# Icônes de l'installeur (OD47) : chaque fichier de bundle.icon existe, dont un .ico (bundle Windows).
node scripts/controle-icones.mjs apps/desktop/src-tauri/tauri.conf.json

# Banc du stylet (cadrage D29) : un seul fichier HTML, aucune ressource externe (ouvrable en file://).
pnpm --filter @roomboard/web build:proto
proto=apps/web/dist-proto/proto-stylet.html
if [ "$(find apps/web/dist-proto -type f | wc -l)" -ne 1 ] || [ ! -f "$proto" ]; then
  echo "verifier.sh : dist-proto doit contenir le seul fichier $proto" >&2
  exit 1
fi
if grep -Eq '<script[^>]*\ssrc=|<link[^>]*stylesheet' "$proto"; then
  echo "verifier.sh : le prototype charge une ressource externe" >&2
  exit 1
fi
echo "verifier.sh : prototype en fichier unique OK"
if [ "$E2E" = 1 ]; then
  # Aucune option de capture : un verifier.sh --e2e ne réécrit jamais une capture commitée.
  node scripts/essais/s2-navigateur.mjs
  node scripts/essais/s2-navigateur.mjs --lot3b
  node scripts/essais/s34-navigateur.mjs
  node scripts/essais/fichiers-navigateur.mjs
  node scripts/essais/s5b-navigateur.mjs
  node scripts/essais/c2-image-navigateur.mjs
  node scripts/essais/c1-profils-navigateur.mjs
  node scripts/essais/c10a-tableau-navigateur.mjs
  node scripts/essais/c10b-tableau-navigateur.mjs
  node scripts/essais/c9-grille-navigateur.mjs
  node scripts/essais/c7b-texte-riche-navigateur.mjs
  node scripts/essais/c3-groupes-navigateur.mjs
  node scripts/essais/c12-pdf-navigateur.mjs
  node scripts/essais/c16-office-navigateur.mjs
  echo "C16 Office : OK"
  node scripts/essais/c6a-pot-navigateur.mjs
  node scripts/essais/c5-image-navigateur.mjs
  node scripts/essais/c14-media-navigateur.mjs
  echo "C14 média : OK"
  node scripts/essais/c6b-pot-image-navigateur.mjs
  node scripts/essais/c15-3d-navigateur.mjs
  echo "C15 3D : OK"
  node scripts/essais/c8-pot-zones-navigateur.mjs
  echo "C8 pot zones : OK"
  node scripts/essais/c4-bibliotheque-navigateur.mjs
  echo "C4 bibliothèque : OK"
  node scripts/essais/c13-tableaux-navigateur.mjs
  echo "C13 tableaux : OK"
  node scripts/essais/c11a-annotation-navigateur.mjs
  echo "C11a annotation : OK"
  node scripts/essais/c11b-capture-navigateur.mjs
  echo "C11b capture : OK"
  node scripts/essais/design-l1-navigateur.mjs
  echo "design L1 : OK"
  node scripts/essais/design-l4-navigateur.mjs
  echo "design L4 : OK"
  node scripts/essais/personnalisation-2-navigateur.mjs
  echo "personnalisation-2 : OK"
  node scripts/essais/outils-excalidraw-navigateur.mjs
  echo "outils-excalidraw : OK"
  node scripts/essais/design-l3-navigateur.mjs
  echo "design L3 : OK"
  node scripts/essais/personnalisation-1a-navigateur.mjs
  echo "personnalisation 1a : OK"
  node scripts/essais/design-l2-navigateur.mjs
  echo "design L2 : OK"
  node scripts/essais/fonds-navigateur.mjs
  echo "personnalisation 1b fonds : OK"
  node scripts/essais/restes-personnalisation-1-navigateur.mjs
  echo "restes personnalisation 1 : OK"
  node scripts/essais/gomme-trait-epais-navigateur.mjs
  echo "verifier.sh : e2e OK"
fi
echo "verifier.sh : OK"
