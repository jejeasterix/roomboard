#!/usr/bin/env bash
# Test de l'option --e2e de scripts/verifier.sh (T96) : option inconnue refusée tout de suite (code 2),
# --e2e déclarée, jamais de capture demandée, aucun navigateur sans --e2e.
set -uo pipefail
cd "$(dirname "$0")/../.."
fail=0
ko() { echo "ECHEC : $1" >&2; fail=1; }

out=$(bash scripts/verifier.sh --inconnu 2>&1); rc=$?
[ "$rc" -eq 2 ] || ko "verifier.sh --inconnu doit rendre 2 (rendu $rc)"
echo "$out" | grep -q "option inconnue --inconnu" || ko "message « option inconnue » absent"
grep -q -- '--e2e' scripts/verifier.sh || ko "verifier.sh ne déclare pas --e2e"
for s in s2-navigateur s34-navigateur fichiers-navigateur s5b-navigateur c2-image-navigateur c1-profils-navigateur c10a-tableau-navigateur c10b-tableau-navigateur c3-groupes-navigateur c12-pdf-navigateur c9-grille-navigateur c7b-texte-riche-navigateur c6a-pot-navigateur c5-image-navigateur c14-media-navigateur c6b-pot-image-navigateur c15-3d-navigateur c8-pot-zones-navigateur c4-bibliotheque-navigateur c13-tableaux-navigateur; do
  grep -q "scripts/essais/$s.mjs" scripts/verifier.sh || ko "$s absent de verifier.sh"
done
# C16 : ligne à part (la liste ci-dessus est partagée avec d'autres chantiers, O33).
grep -q "scripts/essais/c16-office-navigateur.mjs" scripts/verifier.sh || ko "c16-office-navigateur absent de verifier.sh"
# C11a : ligne à part, comme C16.
grep -q "scripts/essais/c11a-annotation-navigateur.mjs" scripts/verifier.sh || ko "c11a-annotation-navigateur absent de verifier.sh"
if grep -E 'essais/.*-navigateur\.mjs.*--captures?' scripts/verifier.sh >/dev/null; then ko "--e2e ne doit passer aucune option de capture"; fi
# Les essais ne sont lancés que dans le bloc --e2e.
awk '/essais\/.*-navigateur\.mjs/ && !in_e2e {print "hors bloc e2e : " $0; bad=1} /if \[ "\$E2E" = 1 \]/ {in_e2e=1} /^fi/ {in_e2e=0} END {exit bad}' scripts/verifier.sh >&2 || ko "un essai navigateur est lancé hors du bloc --e2e"
[ "$fail" -eq 0 ] && echo "verifier-e2e.test.sh : OK"
exit "$fail"
