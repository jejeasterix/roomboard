#!/usr/bin/env bash
# Test du contrôle hors ligne (cadrage D27). Faux dist et faux tauri.conf.json dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-hors-ligne.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

mkdir -p "$tmp/propre/assets" "$tmp/vide"
cat > "$tmp/propre/index.html" <<'EOT'
<!doctype html><svg xmlns="http://www.w3.org/2000/svg"></svg><script type="module" src="./assets/index.js"></script>
EOT
cat > "$tmp/propre/assets/index.js" <<'EOT'
fetch("http://ipc.localhost/plugin%3Adialog%7Copen"); const u = "http://" + p + ".localhost/"; const l = "http://127.0.0.1:4173/";
EOT
cp -r "$tmp/propre" "$tmp/distant"
echo '@import url("https://fonts.googleapis.com/css2?family=Inter");' > "$tmp/distant/assets/style.css"
cat > "$tmp/bonne.json" <<'EOT'
{ "app": { "security": { "csp": {
  "default-src": "'self'",
  "script-src": "'self' 'wasm-unsafe-eval'",
  "connect-src": "'self' ipc: http://ipc.localhost"
} } }, "plugins": { "fs": { "scopeDroppedPaths": false } } }
EOT
cat > "$tmp/nulle.json" <<'EOT'
{ "app": { "security": { "csp": null } } }
EOT
cat > "$tmp/sans-wasm.json" <<'EOT'
{ "app": { "security": { "csp": { "default-src": "'self'", "script-src": "'self'" } } } }
EOT
cat > "$tmp/distante.json" <<'EOT'
{ "app": { "security": { "csp": { "default-src": "'self'", "script-src": "'self' 'wasm-unsafe-eval'", "img-src": "'self' https://cdn.example.com" } } } }
EOT

# 1. dist propre (espace de noms SVG, IPC Tauri, 127.0.0.1) et bonne CSP → 0
node "$script" "$tmp/propre" "$tmp/bonne.json" > "$tmp/out" 2>&1 || echec "cas 1 : refusé ($(cat "$tmp/out"))"
grep -q "controle-hors-ligne : OK" "$tmp/out" || echec "cas 1 : ligne OK absente"
cas=$((cas + 1))
# 2. police distante → 1, l'hôte est nommé
if node "$script" "$tmp/distant" "$tmp/bonne.json" > "$tmp/out" 2>&1; then echec "cas 2 : police distante acceptée"; fi
grep -q "fonts.googleapis.com" "$tmp/out" || echec "cas 2 : hôte non nommé"
cas=$((cas + 1))
# 3. csp null → 1
if node "$script" "$tmp/propre" "$tmp/nulle.json" > "$tmp/out" 2>&1; then echec "cas 3 : csp null acceptée"; fi
grep -q "objet de directives attendu" "$tmp/out" || echec "cas 3 : message absent"
cas=$((cas + 1))
# 4. script-src sans 'wasm-unsafe-eval' → 1
if node "$script" "$tmp/propre" "$tmp/sans-wasm.json" > "$tmp/out" 2>&1; then echec "cas 4 : sans wasm-unsafe-eval accepté"; fi
grep -q "wasm-unsafe-eval" "$tmp/out" || echec "cas 4 : message absent"
cas=$((cas + 1))
# 5. source distante dans la CSP → 1
if node "$script" "$tmp/propre" "$tmp/distante.json" > "$tmp/out" 2>&1; then echec "cas 5 : CSP distante acceptée"; fi
grep -q "cdn.example.com" "$tmp/out" || echec "cas 5 : hôte non nommé"
cas=$((cas + 1))
# 6. dist sans fichier texte (build absent) → 1
if node "$script" "$tmp/vide" "$tmp/bonne.json" > "$tmp/out" 2>&1; then echec "cas 6 : dist vide accepté"; fi
grep -q "aucun fichier texte" "$tmp/out" || echec "cas 6 : message absent"
cas=$((cas + 1))

conf() { # nom, directives JSON supplémentaires
  cat > "$tmp/$1.json" <<EOT
{ "app": { "security": { "csp": { "default-src": "'self'", $2 } } }, "plugins": { "fs": { "scopeDroppedPaths": false } } }
EOT
}
S="'self'"; W="'wasm-unsafe-eval'"
conf hote-nu "\"script-src\": \"$S $W\", \"connect-src\": \"$S api.example.com *.example.com\""
conf script-data "\"script-src\": \"$S $W data: blob:\""
conf script-elem "\"script-src\": \"$S $W\", \"script-src-elem\": \"'unsafe-inline'\""
conf ipc-ailleurs "\"script-src\": \"$S $W\", \"img-src\": \"$S ipc:\""
conf locaux "\"script-src\": \"$S $W\", \"connect-src\": \"$S ipc: http://ipc.localhost *.localhost 127.0.0.1 localhost:1420\", \"img-src\": \"$S data: blob:\""
cp -r "$tmp/propre" "$tmp/proto"
echo '@import url(//fonts.googleapis.com/css2?family=Inter);' > "$tmp/proto/assets/style.css"
cp -r "$tmp/propre" "$tmp/majuscules"
echo 'const u = "HTTPS://CDN.EXAMPLE.COM/x.js";' > "$tmp/majuscules/assets/b.js"
cp -r "$tmp/propre" "$tmp/nip"
echo 'const u = "https://127.0.0.1.nip.io/x";' > "$tmp/nip/assets/c.js"

refuse() { # nom dist conf motif
  if node "$script" "$2" "$3" > "$tmp/out" 2>&1; then echec "cas $1 : accepté"; fi
  grep -q -- "$4" "$tmp/out" || echec "cas $1 : message sans « $4 » ($(cat "$tmp/out"))"
  cas=$((cas + 1))
}
# 7. hôte nu dans la CSP (sans schéma) → 1
refuse 7 "$tmp/propre" "$tmp/hote-nu.json" "api.example.com"
# 8. script-src avec data: blob: → 1 ; script-src-elem 'unsafe-inline' → 1
refuse 8 "$tmp/propre" "$tmp/script-data.json" "script-src"
refuse 9 "$tmp/propre" "$tmp/script-elem.json" "script-src-elem"
# 10. ipc: hors connect-src → 1
refuse 10 "$tmp/propre" "$tmp/ipc-ailleurs.json" "img-src"
# 11. sources locales (ipc:, *.localhost, 127.0.0.1, localhost:port, data:/blob: en img-src) → 0
node "$script" "$tmp/propre" "$tmp/locaux.json" > "$tmp/out" 2>&1 || echec "cas 11 : refusé ($(cat "$tmp/out"))"
cas=$((cas + 1))
# 12-14. dist : //hôte, majuscules, 127.0.0.1.nip.io → 1
refuse 12 "$tmp/proto" "$tmp/bonne.json" "fonts.googleapis.com"
refuse 13 "$tmp/majuscules" "$tmp/bonne.json" "cdn.example.com"
refuse 14 "$tmp/nip" "$tmp/bonne.json" "127.0.0.1.nip.io"

# 15-16. portée fs des dépôts (tauri-plugin-fs, scopeDroppedPaths vrai par défaut : un dossier déposé devient
# lisible et inscriptible par la page) : absente → 1 ; vraie → 1
node -e 'const f=require("fs"); const c=JSON.parse(f.readFileSync(process.argv[1])); delete c.plugins; f.writeFileSync(process.argv[2], JSON.stringify(c))' "$tmp/bonne.json" "$tmp/sans-portee.json"
node -e 'const f=require("fs"); const c=JSON.parse(f.readFileSync(process.argv[1])); c.plugins.fs.scopeDroppedPaths=true; f.writeFileSync(process.argv[2], JSON.stringify(c))' "$tmp/bonne.json" "$tmp/portee-vraie.json"
refuse 15 "$tmp/propre" "$tmp/sans-portee.json" "scopeDroppedPaths"
refuse 16 "$tmp/propre" "$tmp/portee-vraie.json" "scopeDroppedPaths"

# 17-18. dépôt coupé sur la fenêtre main (le dépôt passe par la coque, CL5b-13) : label "main" → 1 ; label absent
# (Tauri le nomme "main") → 1
node -e 'const f=require("fs"); const c=JSON.parse(f.readFileSync(process.argv[1])); c.app.windows=[{label:"main",dragDropEnabled:false}]; f.writeFileSync(process.argv[2], JSON.stringify(c))' "$tmp/bonne.json" "$tmp/depot-coupe.json"
node -e 'const f=require("fs"); const c=JSON.parse(f.readFileSync(process.argv[1])); c.app.windows=[{title:"RoomBoard",dragDropEnabled:false}]; f.writeFileSync(process.argv[2], JSON.stringify(c))' "$tmp/bonne.json" "$tmp/depot-coupe-implicite.json"
refuse 17 "$tmp/propre" "$tmp/depot-coupe.json" "dragDropEnabled"
refuse 18 "$tmp/propre" "$tmp/depot-coupe-implicite.json" "dragDropEnabled"

# 19-23. média lié (C14, M27-M29) : `asset:` admis dans media-src seulement ; protocole d'assets à portée vide et
# feature `protocol-asset` d'accord (le Cargo.toml voisin de la configuration).
conf asset-img "\"script-src\": \"$S $W\", \"img-src\": \"$S asset:\""
refuse 19 "$tmp/propre" "$tmp/asset-img.json" "img-src"
mkdir -p "$tmp/coque"
cat > "$tmp/coque/tauri.conf.json" <<EOT
{ "app": { "security": { "csp": { "default-src": "'self'", "script-src": "'self' 'wasm-unsafe-eval'",
  "media-src": "'self' blob: asset: http://asset.localhost" }, "assetProtocol": { "enable": true, "scope": [] } } },
  "plugins": { "fs": { "scopeDroppedPaths": false } } }
EOT
cat > "$tmp/coque/Cargo.toml" <<'EOT'
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
EOT
node "$script" "$tmp/propre" "$tmp/coque/tauri.conf.json" > "$tmp/out" 2>&1 || echec "cas 20 : refusé ($(cat "$tmp/out"))"
cas=$((cas + 1))
mkdir -p "$tmp/coque-portee" "$tmp/coque-sans"
sed 's|"scope": \[\]|"scope": ["$HOME/**"]|' "$tmp/coque/tauri.conf.json" > "$tmp/coque-portee/tauri.conf.json"
cp "$tmp/coque/Cargo.toml" "$tmp/coque-portee/Cargo.toml"
refuse 21 "$tmp/propre" "$tmp/coque-portee/tauri.conf.json" "scope"
cp "$tmp/coque/tauri.conf.json" "$tmp/coque-sans/tauri.conf.json"
printf '[dependencies]\ntauri = { version = "2", features = [] }\n' > "$tmp/coque-sans/Cargo.toml"
refuse 22 "$tmp/propre" "$tmp/coque-sans/tauri.conf.json" "protocol-asset"
# 24. `http://asset.localhost` (forme Windows et Android de `asset:`) admis dans media-src seulement, comme `asset:`
conf asset-host-img "\"script-src\": \"$S $W\", \"img-src\": \"$S http://asset.localhost\""
refuse 24 "$tmp/propre" "$tmp/asset-host-img.json" "asset.localhost"
# 25. `blob:` admis dans connect-src (C15, X28) : three lit ses textures et ses tampons par fetch(blob:).
conf blob-connect "\"script-src\": \"$S $W\", \"connect-src\": \"$S ipc: http://ipc.localhost blob:\""
node "$script" "$tmp/propre" "$tmp/blob-connect.json" > "$tmp/out" 2>&1 || echec "cas 25 : blob: refusé dans connect-src ($(cat "$tmp/out"))"
cas=$((cas + 1))
# 26. faux hôte `i.test` de three (/^https?:\/\//i.test, LoaderUtils.js) : admis, jamais chargé (C15, X29).
mkdir -p "$tmp/three-dist" && cp -r "$tmp/propre/." "$tmp/three-dist/"
printf 'const r=/^https?:\\/\\//i.test(u);\n' > "$tmp/three-dist/three-essai.js"
node "$script" "$tmp/three-dist" "$tmp/bonne.json" > "$tmp/out" 2>&1 || echec "cas 26 : i.test de three refusé ($(cat "$tmp/out"))"
cas=$((cas + 1))
node "$script" "$tmp/propre" "$racine/apps/desktop/src-tauri/tauri.conf.json" > "$tmp/out" 2>&1 || echec "cas 23 : vraie configuration refusée ($(cat "$tmp/out"))"
cas=$((cas + 1))

echo "controle-hors-ligne.test.sh : $cas cas OK"
