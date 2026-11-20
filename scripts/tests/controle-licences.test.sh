#!/usr/bin/env bash
# Test du contrôle des licences (U39, R21) : relevés cargo et npm fabriqués dans un dossier temporaire.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-licences.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0

# Relevé cargo : un membre du workspace (exclu) et des crates tiers.
cargo_json() { # $1 fichier, puis paires nom=licence
  local f="$1"; shift
  local pk='{"id":"ws 0.1.0","name":"roomboard-core","version":"0.1.0","license":"LicenseRef-PolyForm-Shield-1.0.0"}'
  for p in "$@"; do pk="$pk,{\"id\":\"${p%%=*} 1.0.0\",\"name\":\"${p%%=*}\",\"version\":\"1.0.0\",\"license\":\"${p#*=}\"}"; done
  echo "{\"workspace_members\":[\"ws 0.1.0\"],\"packages\":[$pk]}" > "$f"
}
npm_pkg() { # $1 racine, $2 nom, $3 licence (vide : champ absent) ; entrée à la pnpm : @x/y → @x+y@1.0.0
  local e="${2/\//+}@1.0.0"
  local d="$1/$e/node_modules/$2"
  mkdir -p "$d"
  if [ -n "$3" ]; then echo "{\"name\":\"$2\",\"version\":\"1.0.0\",\"license\":\"$3\"}" > "$d/package.json"
  else echo "{\"name\":\"$2\",\"version\":\"1.0.0\"}" > "$d/package.json"; fi
}
vide='{"npm":{},"cargo":{}}'
echo "$vide" > "$tmp/aucune.json"
mkdir -p "$tmp/npm-ok"
npm_pkg "$tmp/npm-ok" solid-js MIT
npm_pkg "$tmp/npm-ok" @x/y ISC
run() { node "$script" --exceptions "${EXC:-$tmp/aucune.json}" "$@" > "$tmp/out" 2>&1; }

# 1. Expressions permises (OR, /, AND entre parenthèses), membre du workspace exclu → 0
cargo_json "$tmp/ok.json" a="MIT OR Apache-2.0" b="MIT/Apache-2.0" c="(MIT OR Apache-2.0) AND Unicode-3.0" d="Zlib"
run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-ok" || echec "cas 1 : refusé ($(cat "$tmp/out"))"
grep -q "controle-licences : OK" "$tmp/out" || echec "cas 1 : ligne OK absente"
grep -q "licences : 4 crates, 2 paquets npm" "$tmp/out" || echec "cas 1 : décompte faux ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 2. GPL seule → 1, le crate est nommé
cargo_json "$tmp/gpl.json" mauvais="GPL-3.0-only"
if run --cargo-json "$tmp/gpl.json" --npm-root "$tmp/npm-ok"; then echec "cas 2 : GPL acceptée"; fi
grep -q "ÉCART cargo mauvais 1.0.0 : GPL-3.0-only" "$tmp/out" || echec "cas 2 : écart non nommé ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 3. LGPL en alternative d'une licence permise → 0
cargo_json "$tmp/alt.json" r="MIT OR Apache-2.0 OR LGPL-2.1-or-later"
run --cargo-json "$tmp/alt.json" --npm-root "$tmp/npm-ok" || echec "cas 3 : alternative refusée"
cas=$((cas + 1))

# 4. LGPL liée par AND → 1
cargo_json "$tmp/and.json" s="LGPL-2.1-or-later AND MIT"
if run --cargo-json "$tmp/and.json" --npm-root "$tmp/npm-ok"; then echec "cas 4 : AND LGPL accepté"; fi
cas=$((cas + 1))

# 5. Relevé npm vide → 1
mkdir -p "$tmp/npm-vide"
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-vide"; then echec "cas 5 : relevé vide accepté"; fi
grep -q "relevé npm vide" "$tmp/out" || echec "cas 5 : message absent"
cas=$((cas + 1))

# 6. Un lien vers un paquet GPL n'est pas relevé → 0
mkdir -p "$tmp/ailleurs/gpl-pkg" "$tmp/npm-ok/lien@1.0.0/node_modules"
echo '{"name":"gpl-pkg","version":"1.0.0","license":"GPL-3.0-only"}' > "$tmp/ailleurs/gpl-pkg/package.json"
ln -s "$tmp/ailleurs/gpl-pkg" "$tmp/npm-ok/lien@1.0.0/node_modules/gpl-pkg"
run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-ok" || echec "cas 6 : lien relevé ($(cat "$tmp/out"))"
cas=$((cas + 1))

# 7. CC-BY-4.0 : refusée sans exception, acceptée avec l'exception écrite
mkdir -p "$tmp/npm-cc"
npm_pkg "$tmp/npm-cc" caniuse-lite CC-BY-4.0
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-cc"; then echec "cas 7 : CC-BY-4.0 acceptée sans exception"; fi
echo '{"npm":{"caniuse-lite":{"licence":"CC-BY-4.0","raison":"données de build"}},"cargo":{}}' > "$tmp/exc.json"
EXC="$tmp/exc.json" run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-cc" || echec "cas 7 : exception ignorée"
cas=$((cas + 1))

# 8. WITH gardé tel quel : seule → 1 ; en alternative de MIT → 0
cargo_json "$tmp/with.json" w="Apache-2.0 WITH LLVM-exception"
if run --cargo-json "$tmp/with.json" --npm-root "$tmp/npm-ok"; then echec "cas 8 : WITH seule acceptée"; fi
cargo_json "$tmp/with-or.json" w="Apache-2.0 WITH LLVM-exception OR MIT"
run --cargo-json "$tmp/with-or.json" --npm-root "$tmp/npm-ok" || echec "cas 8 : WITH OR MIT refusée"
cas=$((cas + 1))

# 9. Licence absente (paquet npm) → 1
mkdir -p "$tmp/npm-sans"
npm_pkg "$tmp/npm-sans" muet ""
if run --cargo-json "$tmp/ok.json" --npm-root "$tmp/npm-sans"; then echec "cas 9 : licence absente acceptée"; fi
grep -q "ÉCART npm muet 1.0.0 : licence absente" "$tmp/out" || echec "cas 9 : écart non nommé"
cas=$((cas + 1))

# 10. Option inconnue → 2
set +e; node "$script" --inconnue > "$tmp/out" 2>&1; rc=$?; set -e
[ "$rc" -eq 2 ] || echec "cas 10 : code $rc au lieu de 2"
cas=$((cas + 1))

# 11. Membre du workspace principal vu comme dépendance dans le relevé de src-tauri → exclu (0) ; un tiers GPL du second relevé → 1
echo '{"workspace_members":["ws 0.1.0"],"packages":[{"id":"ws 0.1.0","name":"roomboard-core","version":"0.1.0","license":"LicenseRef-PolyForm-Shield-1.0.0"}]}' > "$tmp/ws1.json"
echo '{"workspace_members":["app 0.1.0"],"packages":[{"id":"app 0.1.0","name":"app","version":"0.1.0","license":"LicenseRef-PolyForm-Shield-1.0.0"},{"id":"dep ws","name":"roomboard-core","version":"0.1.0","license":"LicenseRef-PolyForm-Shield-1.0.0"}]}' > "$tmp/ws2.json"
run --cargo-json "$tmp/ws1.json" --cargo-json "$tmp/ws2.json" --npm-root "$tmp/npm-ok" || echec "cas 11 : membre du premier workspace refusé ($(cat "$tmp/out"))"
cas=$((cas + 1))

echo "controle-licences.test.sh : OK ($cas cas)"
