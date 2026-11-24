# État — design-l1

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Donner à RoomBoard les couleurs de la charte RoomFlow, des icônes Lucide nettes et fines sur des boutons à icône avec infobulle, et des tailles de bouton S 44, M 48, L 64.
Avancement : 6/6 tâches terminées
Étage : 4 — depuis 2026-11-24 21:10
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l1   Branche : feat/design-l1   Base : origin/main @ 37f22a5 (rebasé à 21:08 ; PR #52 et #53 fusionnées, Rust ink)
Branche principale locale au lancement : 5a34c9b
Cadrage : docs/plans/design-l1-cadrage.md   Plan(s) : docs/plans/design-l1-PLAN.md

## Référence
Complète (origin/main @ 5a34c9b, verifier.sh --e2e) : OK — cargo 1348 réussis (8 ignorés) · web 3233 · cli 263 · e2e OK
Wasm avant (mesuré) : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
| id | dépend | fichiers touchés | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------------------|----------|------|--------|---------------------|----------------|
| T1 | — | ui/icons.ts(+test), THIRD_PARTY_NOTICES.md | partagé | terminée | 1/3 | 55bc29c | icons.test 9/9 |
| T2 | T1 | ui/tooltip.ts, ui/IconButton.tsx (+tests) | partagé | terminée | 1/3 | 55bc29c | icons.test 9/9 |
| T3 | T2 | ui/item-state.ts, ui/Toolbar.tsx (+tests) | partagé | terminée | 1/3 | fa0f96f | tooltip+IconButton 30/30 |
| T4 | T3 | ui/rb.css, ui/rb-css.test.ts, c7b:309 | partagé | terminée | 1/3 | c075993 | src/ui 307, tsc 0 |
| T5 | T4 | essais/nettete.mjs, design-l1-navigateur.mjs, commun.mjs, verifier.sh (+tests) | partagé | terminée | 1/3 | abff341 | src/ui 314, c7b OK (scène Tableau 642 px) |
| T6 | T5 | docs/essais/design-l1-*.png | partagé | terminée | 1/3 | d34a94f | node --test 8, design L1 : OK (0 intermédiaire, 0 frange, contre-épreuve 4) |

Corrections de la relecture du plan (passées aux briefs, plan non réécrit) : T2 commentaire sans le mot innerHTML ; T2 infobulle au focus seulement si :focus-visible (byPointer en repli happy-dom) ; T4 commande bornée par grep ; T6 avant = merge-base, tailles relevées non figées.

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · contrôle de netteté § 10 (0 pixel intermédiaire au bord du Rectangle, 0 frange colorée) · captures avant/après 2x dans la PR · PR fusionnée par merge local --no-ff

## Hypothèses à revoir
13 au cadrage (7 de niveau 1) : H1 délais infobulle, H2 Enregistrer/Enregistrer sous même icône, H3 pastilles sans texte, H4 10 icônes sans maquette, H5 icône bascule Souris/Dessin, H12 appui long WebView2 non vérifié, H13 eraser-mode garde eraser-part.

## Hors périmètre
- L2 îlots flottants, L3 éditeur de profils, L4 barre d'annotation, L5 icône de l'app ; mise en page des barres inchangée.

## Portes
ouvertes : — · passées : —

## Double relecture (21:10)
Code : 0 bloquant, 0 important, 4 mineurs corrigés (infobulle clavier après tap sous WebKit, icône inconnue → texte, border-color mort, écoute d'erreurs pendant l'appui long). Design : 0 bloquant, 0 important ; corrigés : texte grisé en gris AA (charte), charte et cadrage listent 5 icônes dessinées ; infobulle d'un bouton grisé mesurée dans Chromium (OK). Laissés (hors lot, cités dans la PR) : filet #52525b des pastilles, infobulle sous le bouton même en barre verticale, boutons de la barre des pages sans fond jusqu'à L2.

## Pièges trouvés
- tsc rouge (push_ahead) après rebase : paquet Wasm de apps/web/src/wasm à reconstruire quand origin/main change le Rust.
- Prémisses démenties : boutons de barre sans aria-label ; nombre de rangées change (scène outil Tableau 642 px mesurée) ; c7b:309 retouché en forme.

## Notes du coffre à poser
Voir la description de la PR (journal, décision NNNN-roomboard-design-bouton-icone-infobulle, segment de la ligne 21 de la fiche).
