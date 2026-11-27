# État — personnalisation-2-outils

Statut : en cours
Gabarit : lots (lot 1 : 12 tâches ; lot 2 : 10 tâches, hors du temps)
Objectif : Chaque outil commun avec Excalidraw (sélection, main, formes, flèche, ligne, crayon, texte, image, gomme) se comporte comme dans Excalidraw, au doigt d'abord puis au clavier, avec des connecteurs liés aux objets façon carte mentale et une fiche de vérification par outil.
Avancement : 0/2 lots clos
Étage : 3 (vague 1) — depuis 2026-11-27 19:58
Lot : 1 « flèche et ligne » — 0/12 tâches terminées — depuis 2026-11-27 19:58
Tâche : T1, T2, T3 — vague 1 — depuis 2026-11-27 19:58
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2-outils   Branche : feat/personnalisation-2-outils   Base : origin/main @ cddbde49
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/personnalisation-2-outils-cadrage.md   Plan(s) : docs/plans/personnalisation-2-outils-PLAN.md
Arrêt ferme : 2026-11-28 01:15 (lancement 18:45 + 6 h 30) ; pousser et écrire l'état à 01:05.

## Référence
Complète (verifier.sh --e2e sur cddbde49, 2e passage) : OK · cargo 1523 · web 4218 · cli 284 · Wasm principal 1 440 761 o · formats 2 794 527 o
Wasm à 45484db (brief) : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan 3428e8b7. Vagues : V1 T1∥T2∥T3 · V2 T4∥T5∥T6∥T7∥T8∥T9 · V3 T10∥T11 · V4 T12. Worktrees ~/projets/roomboard-wt/personnalisation-2-outils--T<n>.
| id | dépend | état | essais | commit vert |
|---|---|---|---|---|
| T1 cœur modèle | — | en cours | 1/3 | — |
| T2 contrat TS | — | en cours | 1/3 | — |
| T3 entrées | — | en cours | 1/3 | — |
| T4 cœur liaisons | T1 | à faire | 0/3 | — |
| T5 faux cœur | T2 | à faire | 0/3 | — |
| T6 rendu | T2 | à faire | 0/3 | — |
| T7 panneau | T2,T3 | à faire | 0/3 | — |
| T8 formes/sélection | T2,T3 | à faire | 0/3 | — |
| T9 modifier les points | T2,T3 | à faire | 0/3 | — |
| T10 pont Wasm, CLI | T1,T4,T5 | à faire | 0/3 | — |
| T11 moteur | T3,T7,T8,T9 | à faire | 0/3 | — |
| T12 essai, fiche, captures | T6,T10,T11 | à faire | 0/3 | — |

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
