#!/usr/bin/env bash
# Compare la CLI wasm-bindgen à la version de wasm-bindgen verrouillée dans Cargo.lock (cadrage D9).
# Usage : scripts/controle-wasm-bindgen.sh [chemin/Cargo.lock]
set -euo pipefail
verrou="${1:-Cargo.lock}"

attendue="$(awk '$0 == "name = \"wasm-bindgen\"" { getline; gsub(/version = |"/, ""); print; exit }' "$verrou")"
if [ -z "$attendue" ]; then
  echo "controle-wasm-bindgen : wasm-bindgen absent de $verrou" >&2
  exit 1
fi

installer="cargo install wasm-bindgen-cli --version $attendue --locked"
if ! command -v wasm-bindgen > /dev/null 2>&1; then
  echo "controle-wasm-bindgen : CLI wasm-bindgen introuvable (attendue $attendue). Installer : $installer" >&2
  exit 1
fi

trouvee="$(wasm-bindgen --version | awk '{ print $2 }')"
if [ "$trouvee" != "$attendue" ]; then
  echo "controle-wasm-bindgen : CLI wasm-bindgen $trouvee, Cargo.lock $attendue. Installer : $installer" >&2
  exit 1
fi
echo "controle-wasm-bindgen : $trouvee (identique à Cargo.lock)"
