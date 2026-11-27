# État — personnalisation-2-outils

Statut : en cours
Gabarit : lots (provisoire)
Objectif : Chaque outil commun avec Excalidraw (sélection, main, formes, flèche, ligne, crayon, texte, image, gomme) se comporte comme dans Excalidraw, au doigt d'abord puis au clavier, avec des connecteurs liés aux objets façon carte mentale et une fiche de vérification par outil.
Avancement : —
Étage : 2 — depuis 2026-11-27 19:20
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2-outils   Branche : feat/personnalisation-2-outils   Base : origin/main @ cddbde49
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/personnalisation-2-outils-cadrage.md   Plan(s) : docs/plans/personnalisation-2-outils-PLAN.md
Arrêt ferme : 2026-11-28 01:15 (lancement 18:45 + 6 h 30) ; pousser et écrire l'état à 01:05.

## Référence
Rapide : en cours
Complète (verifier.sh --e2e sur cddbde49) : en cours, ~/.cache/tmp/og12-ref/verifier.log
Wasm à 45484db (brief) : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · scénarios réussis · PR fusionnée par merge --no-ff local et poussée

## Hypothèses à revoir
13 hypothèses (7 de niveau 1), cadrage § 4. Scénarios S1 relier+déplacer+annuler au doigt · S2 courber · S3 carte mentale « + » · S4 souris+clavier · S5 CLI · S6 ligne au doigt. 18 lignes « Modules à réutiliser ».

## Hors périmètre
- panneau d'options et menu ☰ (OG11), barre latérale et pages (OG4), fonds (OG5)

## Portes
ouvertes : — · passées : — (mode autonome, Jérôme injoignable pendant le tour)

## Pièges trouvés
- Prémisses démenties : pas de losange (lot 2) ; FORMAT_LOTS inchangé ; pas de rotation ni de groupement de commandes dans le cœur ; Ctrl+flèche déjà pris (rangement OG14) → Alt+Maj+flèche.
- Voisins : OG23 (panneau, rb.css, select.ts, keys.ts), gomme-surface-contact (router.ts), OG24 PR 68 (engine.ts, keys.ts, rb.css, verifier.sh), personnalisation-3-tableau (commands.rs, wasm lib.rs, cli-essai.mjs).
- Test CLI office-node.test.ts:118 instable sous charge (dossier temporaire partagé) : vert rejoué seul.
- CARGO_TARGET_DIR partagé entre worktrees : chaque commande l'exporte vers ./target du worktree.

## Notes du coffre à poser
(à l'étage 4)
