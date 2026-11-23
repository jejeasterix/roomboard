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
# Mineur C14 : chaque commande de la coque (generate_handler de main.rs) est nommée, en mot entier, dans la description
# d'une capacité. Commentaires retirés, chemin de module réduit à son dernier segment ; une entrée illisible échoue.
out=$(node -e '
const fs = require("fs");
const [main, dir] = process.argv.slice(1);
const m = /generate_handler!\[([^\]]*)\]/.exec(fs.readFileSync(main, "utf8"));
if (!m) { console.log("aucun generate_handler dans main.rs"); process.exit(1); }
const body = m[1].replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const items = body.split(",").map((x) => x.trim()).filter((x) => x !== "");
const descs = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(dir + "/" + f, "utf8")).description ?? "");
const bad = [];
for (const it of items) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)*$/.test(it)) { bad.push("entrée illisible : " + it); continue; }
  const c = it.split("::").pop();
  if (!descs.some((d) => new RegExp("(^|[^A-Za-z0-9_])" + c + "([^A-Za-z0-9_]|$)").test(d))) bad.push("commande " + c + " absente des descriptions");
}
if (items.length === 0) bad.push("aucune commande lue dans generate_handler");
console.log(bad.join("\n"));
process.exit(bad.length === 0 ? 0 : 1);
' apps/desktop/src-tauri/src/main.rs apps/desktop/src-tauri/capabilities 2>&1) || ko "capacités de la coque : $out"
[ "$fail" -eq 0 ] && echo "coque-csp.test.sh : OK"
exit "$fail"
