#!/usr/bin/env bash
# Test du contrôle de version wasm-bindgen (cadrage D9). Faux Cargo.lock et fausse CLI dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-wasm-bindgen.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/vide"

cat > "$tmp/Cargo.lock" <<'EOT'
[[package]]
name = "wasm-bindgen"
version = "0.2.130"
source = "registry+https://github.com/rust-lang/crates.io-index"

[[package]]
name = "wasm-bindgen-backend"
version = "0.2.999"
EOT
printf '[[package]]\nname = "yrs"\nversion = "0.28.1"\n' > "$tmp/sans.lock"

fausse_cli() {
  printf '#!/usr/bin/env bash\necho "wasm-bindgen %s"\n' "$1" > "$tmp/bin/wasm-bindgen"
  chmod +x "$tmp/bin/wasm-bindgen"
}

echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

# 1. versions identiques → 0
fausse_cli 0.2.130
PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1 || echec "versions identiques refusées"
grep -q "0.2.130 (identique à Cargo.lock)" "$tmp/out" || echec "message de réussite absent"
cas=$((cas + 1))

# 2. versions différentes → 1, commande d'installation dans le message
fausse_cli 0.2.100
if PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1; then echec "versions différentes acceptées"; fi
grep -q "cargo install wasm-bindgen-cli --version 0.2.130 --locked" "$tmp/out" || echec "commande d'installation absente"
grep -q "0.2.100" "$tmp/out" || echec "version trouvée absente du message"
cas=$((cas + 1))

# 3. wasm-bindgen absent du verrou → 1
fausse_cli 0.2.130
if PATH="$tmp/bin:/usr/bin:/bin" bash "$script" "$tmp/sans.lock" > "$tmp/out" 2>&1; then echec "verrou sans wasm-bindgen accepté"; fi
grep -q "absent de" "$tmp/out" || echec "message « absent de » manquant"
cas=$((cas + 1))

# 4. CLI absente → 1
if PATH="$tmp/vide:/usr/bin:/bin" bash "$script" "$tmp/Cargo.lock" > "$tmp/out" 2>&1; then
  if command -v wasm-bindgen > /dev/null 2>&1 && [ "$(PATH="$tmp/vide:/usr/bin:/bin" command -v wasm-bindgen || true)" != "" ]; then
    echo "note : une CLI wasm-bindgen existe dans /usr/bin ou /bin, cas 4 non jouable" >&2
  else
    echec "CLI absente acceptée"
  fi
else
  grep -q "cargo install wasm-bindgen-cli --version 0.2.130 --locked" "$tmp/out" || echec "commande d'installation absente (CLI absente)"
fi
cas=$((cas + 1))

echo "controle-wasm-bindgen.test.sh : $cas cas OK"
