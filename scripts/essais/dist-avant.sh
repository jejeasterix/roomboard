#!/usr/bin/env bash
# OG33 (lot 2b) : application de la base du morceau (merge-base HEAD origin/main) dans <dossier>, pour les captures
# « avant » : worktree détaché sous /tmp, modules Wasm recopiés du worktree courant (ajouts seulement), build web seul.
set -euo pipefail
dest=${1:?usage : dist-avant.sh <dossier>}
cd "$(dirname "$0")/../.."
base=$(git merge-base HEAD origin/main)
wt=$(mktemp -d /tmp/og33-avant-XXXXXX)
git worktree add --detach "$wt" "$base" >/dev/null
trap 'rm -rf "$wt"; git worktree prune' EXIT
cp -r apps/web/src/wasm apps/web/src/wasm-formats "$wt/apps/web/src/"
(cd "$wt" && pnpm install --frozen-lockfile --prefer-offline >/dev/null && nice -n 10 pnpm --filter @roomboard/web build >/dev/null)
rm -rf "$dest" && cp -r "$wt/apps/web/dist" "$dest"
echo "dist-avant : $dest (base $base)"
