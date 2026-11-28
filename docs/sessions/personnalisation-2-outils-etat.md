# État — personnalisation-2-outils

Statut : arrêté (borne de temps d'OG33) — lot 1 (PR #71) et lot 2a (PR #76) fusionnés ; lot 2b M1-M3 fusionné par sa PR ; M4 (B9, B10) non lancé
Gabarit : lots (lot 1 : 12 tâches ; lot 2 : 10 tâches, hors du temps)
Objectif : Chaque outil commun avec Excalidraw (sélection, main, formes, flèche, ligne, crayon, texte, image, gomme) se comporte comme dans Excalidraw, au doigt d'abord puis au clavier, avec des connecteurs liés aux objets façon carte mentale et une fiche de vérification par outil.
Avancement : 2/3 lots clos (lot 1, lot 2a) ; lot 2b : 10/12 tâches (M1-M3 + C5, C6), M4 restant
Étage : 4 — depuis 2026-11-28 10:20 (OG33)
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2-outils-lot2b   Branche : feat/personnalisation-2-outils-lot2b   Base : origin/main @ 0e683c75
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/personnalisation-2-outils-cadrage.md   Plan(s) : docs/plans/personnalisation-2-outils-PLAN.md
Arrêt ferme : 2026-11-28 12:42 (OG33, lancement 06:12 + 6 h 30) ; pousser et écrire l'état à 12:32.

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

## Prochaine tâche exacte (lot 2a : faite par OG33, PR #76 fusionnée, main 0e683c75 ; écart nudgeKey corrigé 22367cb8)
Suite : M4 du lot 2b, tâches B9 puis B10 du plan LOT2B (depuis origin/main).

### Ancienne consigne (lot 2a)
1. Dans un worktree de `feat/personnalisation-2-outils-lot2` (tête e635bbe5 = d4bd6591 vérifié + fusion d'origin/main e2ac4680, OG23 et OG26) : `git fetch` ; si main a bougé, fusionner origin/main ; puis `scripts/verifier.sh --e2e` (verifier.sh OK sur d4bd6591 avant la fusion ; après la fusion, seules la suite web 4803/4803, formes, fleches, tsc et fmt ont tourné).
2. Corriger l'écart né de la fusion : le pas aux flèches d'OG23 (`nudgeKey`) déplace aussi pendant « Modifier les points » (le lot 2a l'excluait) ; test puis exclusion.
3. OK → PR #76 `gh pr ready`, fusion locale `git merge --no-ff` dans un worktree détaché d'origin/main, `git push origin HEAD:main`, sans --force.

## Lot 2b (OG33, 2026-11-28 ; plan docs/plans/personnalisation-2-outils-LOT2B-PLAN.md, branche feat/personnalisation-2-outils-lot2b)
Plan e483de20, relu (0 bloquant, 3 majeurs et 5 mineurs corrigés au plan, 91f5be32). Morceaux M1 (B1, B2), M2 (B3, B4, B5), M3 (B6, B7, B8) ; M4 (B9 pointes losange, B10 Alt+flèche) non lancé (temps, file de suites de la VM saturée).
| id | état | commit vert |
|---|---|---|
| B1 rangée Formes, lettres des infobulles, essai M1 | terminée | b43e62fe |
| B2 message BadFill | terminée | b0686aa0 |
| B3 commande Rotate (cœur, pont, faux cœur, CLI) | terminée (2 relances de tours) | 9f5ef377 |
| B4 poignée de rotation, Maj 15°, Alt+T | terminée (1 relance de tours) | bf39f9c3 |
| B5 essai M2, captures, fiche | terminée | 57a807bb |
| B6 SetShapeLabel (cœur, pont, faux cœur, CLI) | terminée (1 relance ; commit wip du filet 0f36f4fb gardé, sans trailer) | 96578f95 |
| B7 texte dans une forme | terminée | 08a1bdd1 |
| B8 essai M3, captures, fiche | terminée | a8424ff9 |
| C5 relecture : texte sans l'échelle de la forme, Entrée sur forme étroite, rotation quasi nulle | terminée | 2cc24827 |
| C6 double toucher seulement sur un objet déjà choisi (essai C3) | terminée | 4f1758e1 |
| B9, B10 (M4) | non lancées | — |
Double relecture (fa36b953) : 0 bloquant ; 2 majeurs et 2 mineurs corrigés (C5). verifier.sh --e2e : 1er passage C3 groupes en ÉCHEC reproductible (double toucher après Échap) → C6.
Pièges du lot 2b :
- File de suites de la VM saturée (charge 21 sur 8 cœurs) : 20 à 30 min d'attente de jeton par verifier.sh ; tests CLI pdf/3D/convert tombés sur délai de hook sous charge, verts rejoués seuls (29/29, 12/12).
- C8 pot zones : deux mesures identiques par hasard (50.0), vert rejoué seul (déjà vu au lot 2a).
- Agents arrêtés à 40 tours (concepteur-critique) : relancés par message, travail gardé.
- `attendre-fond` ne solde pas une tâche de fond tuée dans un sous-agent (outillage, hors dépôt).

## Lot 2b (consigne d'OG12)
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
