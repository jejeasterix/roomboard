#!/usr/bin/env bash
# Test de coqueCsp (C7b, R22) : exportée par scripts/essais/commun.mjs, CSP de la coque, une seule copie dans
# scripts/essais.
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
ko() { echo "ECHEC : $1" >&2; fail=1; }
csp=$(node --input-type=module -e 'import { coqueCsp } from "./scripts/essais/commun.mjs"; console.log(coqueCsp());' 2>&1) || ko "coqueCsp non exportée : $csp"
echo "$csp" | grep -q "style-src 'self' 'unsafe-inline'" || ko "style-src de la coque absent : $csp"
echo "$csp" | grep -q "script-src 'self' 'wasm-unsafe-eval'" || ko "script-src de la coque absent : $csp"
echo "$csp" | grep -q "media-src 'self' blob:" || ko "media-src de la coque absent : $csp"
echo "$csp" | grep -q "connect-src 'self' ipc: http://ipc.localhost blob:" || ko "connect-src blob: de la coque absent : $csp"
n=$(grep -l "function coqueCsp" scripts/essais/*.mjs | wc -l)
[ "$n" -eq 1 ] || ko "coqueCsp définie dans $n fichiers (une seule copie attendue, commun.mjs)"
# Mineur C14 : chaque commande de la coque (generate_handler de main.rs) est nommée dans la description d'une capacité.
caps=apps/desktop/src-tauri/capabilities
cmds=$(sed -n '/generate_handler!\[/,/\])/p' apps/desktop/src-tauri/src/main.rs | grep -oE '^ *[a-z_]+,?$' | tr -d ' ,')
[ -n "$cmds" ] || ko "aucune commande lue dans generate_handler de main.rs"
for c in $cmds; do
  node -e 'const fs=require("fs");const [d,c]=process.argv.slice(1);process.exit(fs.readdirSync(d).some(f=>JSON.parse(fs.readFileSync(d+"/"+f,"utf8")).description.includes(c))?0:1)' "$caps" "$c" \
    || ko "commande $c absente des descriptions de $caps"
done
[ "$fail" -eq 0 ] && echo "coque-csp.test.sh : OK"
exit "$fail"
