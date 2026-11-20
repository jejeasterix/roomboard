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
n=$(grep -l "function coqueCsp" scripts/essais/*.mjs | wc -l)
[ "$n" -eq 1 ] || ko "coqueCsp définie dans $n fichiers (une seule copie attendue, commun.mjs)"
[ "$fail" -eq 0 ] && echo "coque-csp.test.sh : OK"
exit "$fail"
