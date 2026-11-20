#!/usr/bin/env bash
# Test du contrôle des icônes de l'installeur (OD47). Faux tauri.conf.json dans un dossier temporaire,
# puis la vraie configuration de la coque.
set -euo pipefail
racine="$(cd "$(dirname "$0")/../.." && pwd)"
script="$racine/scripts/controle-icones.mjs"
vraies="$racine/apps/desktop/src-tauri/icons"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echec() { echo "ÉCHEC : $1" >&2; exit 1; }
cas=0
mkdir -p "$tmp/icons"
cp "$vraies/32x32.png" "$vraies/icon.ico" "$tmp/icons/"
# ICO à une seule image de 16 px : en-tête valide, tailles manquantes.
printf '\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x20\x00\x00\x00\x00\x00\x16\x00\x00\x00' > "$tmp/icons/petit.ico"
printf 'pas une icone' > "$tmp/icons/faux.ico"
ecrire() { printf '{ "bundle": { "icon": %s } }\n' "$2" > "$tmp/$1.json"; }
ecrire bonne '["icons/32x32.png", "icons/icon.ico"]'
ecrire sans-ico '["icons/32x32.png"]'
ecrire absente '["icons/32x32.png", "icons/icon.ico", "icons/manque.png"]'
ecrire petit '["icons/petit.ico"]'
ecrire faux '["icons/faux.ico"]'
ecrire vide '[]'

attendu_ok() { node "$script" "$tmp/$1.json" > "$tmp/out" 2>&1 || echec "$1 : refusé ($(cat "$tmp/out"))"; cas=$((cas + 1)); }
attendu_ko() {
  if node "$script" "$tmp/$1.json" > "$tmp/out" 2>&1; then echec "$1 : accepté"; fi
  grep -q "$2" "$tmp/out" || echec "$1 : message « $2 » absent ($(cat "$tmp/out"))"
  cas=$((cas + 1))
}
attendu_ok bonne
attendu_ko sans-ico "aucun .ico"
attendu_ko absente "fichier absent : icons/manque.png"
attendu_ko petit "taille 256 px absente"
attendu_ko faux "en-tête ICO invalide"
attendu_ko vide "absent ou vide"
# La vraie configuration de la coque.
node "$script" "$racine/apps/desktop/src-tauri/tauri.conf.json" > "$tmp/out" 2>&1 \
  || echec "tauri.conf.json de la coque refusé ($(cat "$tmp/out"))"
cas=$((cas + 1))
echo "controle-icones.test : $cas cas OK"
