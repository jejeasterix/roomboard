# État — gomme-et-barre-objet

Statut : en cours
Gabarit : chantier (provisoire : 2 lots, gomme puis barre d'objet)
Objectif : Une seule gomme dont l'effet dépend de l'objet touché (trait coupé, objet effacé, contenu du tableau seulement), et une barre d'objet discrète en icônes, attachée à la sélection.
Avancement : 6/10 tâches terminées (T1, T2, T3 fusionnées ; T5, T6, T8 vertes, en attente de la fusion de L1)
Étage : 3 (vague L1-3 / L2-2) — depuis 2026-11-28 08:05
Lot : 1 « gomme » — 0/? tâches terminées — depuis 2026-11-28 07:05
Tâche : T4 — essai gomme-objets et captures (VM) — depuis 2026-11-28 08:38 ; T7 — ObjectBar — depuis 2026-11-28 08:38
Questions à Jérôme : —
Worktree : /Users/jeromedenis/projets/roomboard-wt/gomme-et-barre-objet   Branche : feat/gomme-et-barre-objet   Base : origin/main @ 161cf734
Branche principale locale au lancement : 161cf734
Cadrage : docs/plans/gomme-et-barre-objet-cadrage.md   Plan(s) : docs/plans/gomme-et-barre-objet-PLAN.md
Machine : Mac (code TS, tests TS) ; VM `~/.cache/tmp/og41-wt` (Wasm, verifier.sh --e2e), cible Cargo par lien `target` → `~/.cache/tmp/og41-target` (lien à retirer à la fin)
pnpm sur le Mac : `npx -y pnpm@12.18.0` (corepack refuse sa clé de signature)

## Référence
Rapide (Mac, @roomboard/web, Wasm de la VM) : 4742 passés, 1 rouge déjà sur main au Mac (profile-actions « fichier hostile imbriqué », rejoué : rouge stable, propre au Node 26 du Mac)
Complète (origin/main, VM, verifier.sh --e2e) : Rust, Wasm, CLI 290/291 ; seul rouge cli pdf-node.test.ts sur un délai de 5 s sous charge, rejoué une fois : 18/18 vert
Tailles Wasm avant : principal 1 456 551 o · formats 2 795 907 o (confirmées sur la VM, 07:02)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 9 importantes corrigées) · relecture plan 1/3 (L1 : 2 bloquants corrigés ; L2 : 1 bloquant corrigé) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | fichiers touchés | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------------------|----------|------|--------|---------------------|----------------|
| T1 | — | eraser-mode retiré (25 fichiers) | --T1 (retiré) | terminée | 1/3 | a1d198e6 | toolbar/table/cell-menu 143 verts ; suite 4744 |
| T3 | — | cell-menu, table | --T3 (retiré) | terminée | 1/3 | c34265b4 | idem |
| T2 | T1 | eraser.ts, tool.ts, engine.ts, tests, s2 | --T2 (retiré) | terminée (revue immédiate : 0 bloquant, correctifs faits) | 1/3 | 29e053cb | eraser+engine 243 verts ; suite 4756 |
| T4 | T1-T3 | essai gomme-objets, verifier.sh, captures | (partagé) + VM | en cours | 1/3 | — | — |
| T5 | — | overlay.ts, handles.ts, engine.ts | --T5 | verte, non fusionnée | 1/3 | 350bba66 | rapport : 238 verts ; suite 4754 ; à rejouer |
| T6 | — | island-place.ts | --T6 | verte, non fusionnée | 1/3 | 22a621a7 | rapport : 57 verts ; à rejouer |
| T7 | T6 | ObjectBar… | --T7 (depuis T6) | en cours | 1/3 | — | — |
| T8 | — | Island.tsx, OptionsPanel.tsx | --T8 | verte, à fusionner seulement avec T9 | 1/3 | 7610dbcb | rapport : 114 verts ; à rejouer |
| T9 | T5,T7,T8 | montage | — | à faire | 0/3 | — | — |
| T10 | T9 | essai barre-objet, captures | — | à faire | 0/3 | — | — |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK sur la tête poussée · scénarios réussis · captures 2x · PR fusionnée par merge local --no-ff et push

## Hypothèses à revoir
17 hypothèses (10 de niveau 1 : H1, H17, H2, H3, H4, H8, H16, H9, H10, H13), détail au cadrage. Scénarios S1…S8 : S1 trait coupé · S2 objets effacés · S3 tableau épargné · S4 paume et stylet · S5 barre collée suit · S6 barre dessous et obstacles · S7 grouper/… · S8 supprimer tableau, coller. 33 décisions, 16+ modules à réutiliser.

## Hors périmètre
—

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- corepack du Mac : « Cannot find matching keyid » ; repli `npx -y pnpm@12.18.0`.
- Prémisse démentie : pas deux outils gomme mais l'outil + l'action `eraser-mode` ; sur main la gomme n'efface que des traits.
- Conflits probables : OG33 (`feat/personnalisation-2-outils-lot2b` : Toolbar, shortcuts, handles, overlay, engine, keys, icons), OG32 (table.ts, cell-menu.ts), OG39 (rb.css).
- verifier.sh lit `target/wasm32-…` en dur : CARGO_TARGET_DIR propre impossible, remplacé par un lien `target`.

## Notes du coffre à poser
—

## Constats d'architecture
- écart · overlay/handles · T5 exporte MOVE_REACH_*_PX et lit `paintedOverlay` au lieu de `selectTool.live()` (justifié : l'écran peint l'éditeur de points).
- perf · eraser · `bounds(ids)` rend l'union : une requête groupée de boîtes par id côté Rust réduirait le coût (H14, hors périmètre).
