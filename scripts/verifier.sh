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

bash scripts/tests/controle-wasm-bindgen.test.sh
bash scripts/controle-wasm-bindgen.sh Cargo.lock
bash scripts/tests/controle-hors-ligne.test.sh
bash scripts/tests/verifier-e2e.test.sh
bash scripts/tests/controle-icones.test.sh
bash scripts/tests/coque-csp.test.sh
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
# Licences des dépendances (U39, R21) : après pnpm install, sur le node_modules réel.
bash scripts/tests/controle-licences.test.sh
node scripts/controle-licences.mjs
# Contrat du vrai module (D33) : exigé ici, il échoue au lieu de se sauter si le .wasm manque.
ROOMBOARD_WASM_REQUIRED=1 pnpm -r test
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
  node scripts/essais/c9-grille-navigateur.mjs
  echo "verifier.sh : e2e OK"
fi
echo "verifier.sh : OK"
