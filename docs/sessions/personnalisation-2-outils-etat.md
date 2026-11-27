# État — personnalisation-2-outils

Statut : en cours
Gabarit : lots (lot 1 : 12 tâches ; lot 2 : 10 tâches, hors du temps)
Objectif : Chaque outil commun avec Excalidraw (sélection, main, formes, flèche, ligne, crayon, texte, image, gomme) se comporte comme dans Excalidraw, au doigt d'abord puis au clavier, avec des connecteurs liés aux objets façon carte mentale et une fiche de vérification par outil.
Avancement : 0/2 lots clos
Étage : 3 (vague 3) — depuis 2026-11-27 19:58
Lot : 1 « flèche et ligne » — 12/12 tâches terminées + correctifs C1, C2, C3 — depuis 2026-11-27 19:58
Tâche : intégration d'origin/main (f6f3f43f) — depuis 2026-11-27 21:37
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
| T1 cœur modèle | — | terminée | 1/3 | 72b85cb6 |
| T2 contrat TS | — | terminée | 1/3 | eae4137e |
| T3 entrées | — | terminée | 1/3 | 248c57f7 |
| T4 cœur liaisons | T1 | terminée | 1/3 | 36341835 |
| T5 faux cœur | T2 | terminée | 1/3 | fbc5eab0 |
| T6 rendu | T2 | terminée | 1/3 | 4226a399 |
| T7 panneau | T2,T3 | terminée | 1/3 | 776d0ee5 |
| T8 formes/sélection | T2,T3 | terminée | 1/3 | 60db00f9 |
| T9 modifier les points | T2,T3 | terminée | 1/3 | 99237b86 |
| T10 pont Wasm, CLI | T1,T4,T5 | terminée | 1/3 | 8f26c19e |
| T11 moteur | T3,T7,T8,T9 | terminée | 1/3 | 77a33f17 |
| T12 essai, fiche, captures | T6,T10,T11 | terminée | 1/3 | c27b1401 |

| C1 relecture cœur (coudée routée, autre page refusée, suivi style/tableau, normale tournée, copie sans lien) | — | terminée | 1/3 | 90ca4651 |
| C2 relecture outils (double toucher sur poignées, dragLine partagé, doigts tardifs comptés, survol, surlignage) | — | terminée | 1/3 | e870f162 |
| C3 points choisis republiés, tableaux suivis, essai durci | — | terminée | 1/3 | fdb5a6cf |

Rejeux : V2 fleches 17/17 ; V3 contrat 494/494, CLI : OK ; après C1+C2 web 4370/4370, fleches 25 ; C3 fleches 27, Wasm 1 513 466 o, outils-excalidraw : OK sans ÉCART.
Double relecture (d00d35c6) : 0 bloquant ; 3 major corrigés (C1, C2) ; minors corrigés sauf : pointe d'AddLinked neutre (écart n° 27 écrit), bind_box ≈ element_geom (constat d'architecture).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · scénarios réussis · PR fusionnée par merge --no-ff local et poussée

## Hypothèses à revoir
13 hypothèses (7 de niveau 1), cadrage § 4. Scénarios S1 relier+déplacer+annuler au doigt · S2 courber · S3 carte mentale « + » · S4 souris+clavier · S5 CLI · S6 ligne au doigt. 18 lignes « Modules à réutiliser ».

## Hors périmètre
- panneau d'options et menu ☰ (OG11), barre latérale et pages (OG4), fonds (OG5)

## Portes
ouvertes : — · passées : — (mode autonome, Jérôme injoignable pendant le tour)

## Pièges trouvés
- Rejeu V1 (67d2acb7) : fleches 7/7 dont old_file_keeps_bytes ; default_line_writes_no_new_keys ok ; tsc ok ; web 4244/4245, rouge attendu contrat D38 l. 3943 (roundness ligne applicable), corrigé par T5+T10. Wasm principal 1 466 515 o.
- main locale a bougé pendant le tour (59b75db0 → fbcc4a17) : autre ouvrier, sans effet sur la branche.
- T2 avait signé ses commits « Sonnet 5.5 » : trailer réécrit en Opus 5.5 avant fusion (branche locale).
- Prémisses démenties : pas de losange (lot 2) ; FORMAT_LOTS inchangé ; pas de rotation ni de groupement de commandes dans le cœur ; Ctrl+flèche déjà pris (rangement OG14) → Alt+Maj+flèche.
- Voisins : OG23 (panneau, rb.css, select.ts, keys.ts), gomme-surface-contact (router.ts), OG24 PR 68 (engine.ts, keys.ts, rb.css, verifier.sh), personnalisation-3-tableau (commands.rs, wasm lib.rs, cli-essai.mjs).
- Test CLI office-node.test.ts:118 instable sous charge (dossier temporaire partagé) : vert rejoué seul.
- CARGO_TARGET_DIR partagé entre worktrees : chaque commande l'exporte vers ./target du worktree.

## Notes du coffre à poser
(à l'étage 4)

## Constats d'architecture
duplication · cœur linéaire · crates/roomboard-core/src/linear.rs:193 · bind_box refait l'aiguillage par type de query.rs:164 element_geom (sorties différentes, pas net)
