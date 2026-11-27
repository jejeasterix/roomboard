# État — personnalisation-2-outils

Statut : clos
Gabarit : lots (lot 1 : 12 tâches ; lot 2 : 10 tâches, hors du temps)
Objectif : Chaque outil commun avec Excalidraw (sélection, main, formes, flèche, ligne, crayon, texte, image, gomme) se comporte comme dans Excalidraw, au doigt d'abord puis au clavier, avec des connecteurs liés aux objets façon carte mentale et une fiche de vérification par outil.
Avancement : 2/2 lots clos (lot 1 PR #71 ; lot 2a, PR suivante) ; lot 2b au périmètre, non commencé
Étage : 4 — depuis 2026-11-27 23:05
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

## Conditions de merge (lot 1)
Point de retour origin/main f6f3f43f · double relecture faite, 0 bloquant ouvert · aucune tâche bloquée · verifier.sh --e2e OK sur f8028fc0 (cargo 1597, web 4470, cli 284 ; réf. 1523/4218/284) · aucun test retiré ni sauté · scénarios S1-S6 réussis (outils-excalidraw : OK, CLI : OK) · CLI vérifiée (cli-essai.mjs) · pas de CI GitHub (profil) · PR #71.
Écart de chaîne : plan du lot 2a non relu avant exécution (temps) ; la double relecture de fin de lot 2a en tient lieu.

## Lot 2a (plan docs/plans/personnalisation-2-outils-LOT2-PLAN.md, branche feat/personnalisation-2-outils-lot2)
| id | état | commit vert |
|---|---|---|
| L1 cœur losange, ligne fermée, ShapeToPolygon | terminée | 4562c6f7 |
| L2 contrat TS, faux cœur, CLI | terminée | 0fc64280 |
| L3 rendu et export | terminée | 63856772 |
| L4 outil Losange, entrée des formes | terminée | df5b349e |
| L5 éditeur et panneau des lignes fermées | terminée | 2dde42d9 |
| L6a pont Wasm, contrat, CLI | terminée | caddd430 |
| L6b essai navigateur S7-S9, fiche, captures | terminée | 89379fa3 |
| L7 aperçu fermé | terminée | 219e0e8a |
| L8 flèches du clavier, lettres des outils | terminée | 120828c4 |
| C4a pot dans une ligne fermée, avis d'export, simplifications cœur | terminée | 2ade6b52 |
| C4b conversion par bouton et Ctrl+Entrée seulement, annulation par lots, aperçu, simplifications | terminée | 517ba3b6 |
Rejeux : V1 formes 9 fleches 27 web 4485 ; V2 web 4506 ; L6a+L7 web 4515 contrat 516 CLI OK ; L6b+L8 web 4525 ; C4 web 4534, fmt ok.
Double relecture (9d8ac349) : 0 bloquant ; 5 major corrigés (C4a, C4b) ; décision : double toucher sur une forme ne convertit pas (réservé au texte dans une forme, lot 2b).

Lot 2a : correctif barre (losange hors de la barre par défaut, 078bdcf0, f97bbae0) et essai (6347b69d, d4bd6591). verifier.sh --e2e OK sur d4bd6591 : cargo 1618, web 4535, cli 284, Wasm 1 523 873 o, formats 2 794 527 o.

## Prochaine tâche (lot 2b)
Écrire `docs/plans/personnalisation-2-outils-LOT2B-PLAN.md` depuis la section « Lot 2b (hors de ce plan) » du plan du lot 2a : losange dans la barre par défaut (menu « formes »), rotation, texte dans une forme (double toucher), îlot Modificateurs, Alt-glisser, segments fixes des coudées, étiquettes sur flèche, navigation Alt+flèche, pointes losange et cardinalité, lettres dans les infobulles, message BAD_FILL.

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · scénarios réussis · PR fusionnée par merge --no-ff local et poussée

## Hypothèses à revoir
13 hypothèses (7 de niveau 1), cadrage § 4. Scénarios S1 relier+déplacer+annuler au doigt · S2 courber · S3 carte mentale « + » · S4 souris+clavier · S5 CLI · S6 ligne au doigt. 18 lignes « Modules à réutiliser ».

## Hors périmètre
- panneau d'options et menu ☰ (OG11), barre latérale et pages (OG4), fonds (OG5)

## Portes
ouvertes : — · passées : — (mode autonome, Jérôme injoignable pendant le tour)

## Pièges trouvés
- `constats.cjs ajouter` a remplacé la ligne d'un autre chantier qui visait le même fichier (fake-core.ts) au lieu d'ajouter : relire le diff de docs/architecture-constats.md après chaque ajout (outillage, hors dépôt).
- verifier.sh --e2e du lot 2a (9e047bc9) : C8 pot zones S6 « data-zone-ms inchangé (31.0) » ; rejoué seul : OK (médiane 30 ms). Deux mesures identiques par hasard ; verifier.sh rejoué entier.
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
