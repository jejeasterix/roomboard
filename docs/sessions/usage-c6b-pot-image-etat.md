# État — usage-c6b-pot-image

Statut : en cours
Gabarit : chantier (9 tâches estimées ; cadrage fait au budget « courte », jugé suffisant : 26 décisions)
Objectif : Le pot de peinture remplit ou efface une zone d'une image par diffusion 4-connexe avec une tolérance réglable, chaque clic est annulable, et « Rétablir l'original » rend l'image d'avant tout remplissage.
Avancement : —
Étage : 2 — depuis 2026-11-21 05:20
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image   Branche : feat/usage-c6b-pot-image   Base : origin/main @ 458a90d
Branche principale locale au lancement : 458a90d
Cadrage : docs/plans/usage-c6b-pot-image-cadrage.md   Plan(s) : docs/plans/usage-c6b-pot-image-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD91), aucune question à Jérôme pendant le tour.

## Référence
Rapide : couverte par la complète
Complète (origin/main @ 458a90d, verifier.sh --e2e) : OK · web 112 fichiers, 2213 tests · module Wasm 1 119 330 o · module formats 3 099 350 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · scénarios réussis · capture dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Scénarios et captures
S1 essai Playwright complet · S2 cœur (champs, sourceAsset, restauration, métadonnées) · S3 pixels.rs · S4 fichier d'avant C6b · S5 file, péremption, erreurs, budget (a–h)
Cadrage : 26 décisions, 18 hypothèses (8 de niveau 1), 24 lignes de modules à réutiliser.

## Hypothèses à revoir
—

## Hors périmètre
- P2 (mot par mot), P3 (zone fermée par plusieurs objets, `kind: "fill"`, C8), rotation libre.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : `flood_fill` ne compare que le RVB et n'efface pas (à étendre) ; essai C6a `c6a-pot-navigateur.mjs:284-303` repose sur « clic image → fond » (à réécrire) ; aucune fixture C5.
- Chantier parallèle OD90 (C15 3D) : conflits probables `element.rs`, `commands.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`, `wasm-core.ts`, `fake-core.ts`, `image-cache.ts`, `board-session.ts`, `fill-target.ts`, `verifier.sh`, `commun.mjs`.

## Notes du coffre à poser
—
