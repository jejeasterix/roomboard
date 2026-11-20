# État — usage-c6a-pot

Statut : en cours
Gabarit : chantier
Objectif : L'outil Pot (couleur choisie, puis clic) colore la cible de U28 — forme (contour près du bord, sinon intérieur), trait, mot sous le pointeur dans un texte ou une cellule, fond de la page si rien n'est touché — et une coloration s'annule en une étape.
Avancement : 10/10 tâches terminées
Étage : 4 — depuis 2026-11-20 17:15
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c6a-pot   Branche : feat/usage-c6a-pot   Base : origin/main @ 28ba886, puis origin/main @ 1a756bd (C3) fusionné en 8a379aa
Branche principale locale au lancement : 28ba886
Cadrage : docs/plans/usage-c6a-pot-cadrage.md   Plan(s) : docs/plans/usage-c6a-pot-PLAN.md
Lancement : 2026-11-20 15:33 · arrêt ferme 19:33 (bilan à 19:23)

## Référence
Complète (origin/main @ 28ba886) : `verifier.sh --e2e` OK (e2e OK)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
| id | dépend | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|---|
| T1 cœur Fill, edge_hit, Wasm | — | terminée | 1/3 (relancé : notification perdue) | 4e186a2 | cargo 0 échec, pot 11 ok |
| T2 contrat TS | — | terminée | 1/3 | ea5c9e2 | web 1 608 ok (8 × vrai module, attendus avant T1) |
| T3 fond rendu, moteur | — | terminée | 1/3 | 60c2e1c | idem |
| T4 offsetAt, wordAt | — | terminée | 1/3 | 85dd1a7 | idem |
| T5 contrat vrai module | T1,T2 | terminée | 1/3 | f70743f | suite complète finale |
| T6 cible, outil Pot | T2,T3,T4 | terminée | 1/3 | afed757 | web 1 652 ok |
| T7 barre, profils | T3 | terminée | 1/3 | fdc67b5 | idem |
| T8 essai navigateur | T5,T6,T7 | terminée | 1/3 | da858a6 | verifier.sh --e2e OK (rejoué, 17:00) |
| fusion origin/main (C3) + D25 | — | terminée | — | 7fde08e | verifier.sh --e2e OK (rejoué, 17:00) |
| T9 correctifs de relecture | T1–T8 | terminée | 1/3 | 7b58243 | vitest 1 839/1 839, suite complète finale |
| T10 simplification du lot | T9 | terminée | 1/1 | 389f6d5 | diff des tests vide, suite complète finale |

## Terminé quand
(fait : tâches, double relecture sans bloquant, verifier.sh --e2e OK sur e3f5ded, capture, scène 706 px ; reste : PR, fusion locale, push)
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture forme + contour + mot colorés dans docs/essais/ · scène ≥ 640 px mesurée par un test · PR mergée par fusion locale --no-ff et push sans --force

## Scénarios et captures
S1 à S5 joués par `scripts/essais/c6a-pot-navigateur.mjs` dans `verifier.sh --e2e` : « C6a pot : OK ». Scène 706 px, Pot actif, rangée ouverte (C10a/C10b : 658 px).
Capture `docs/essais/c6a-pot.png` : fond bleu ; rectangle jaune au contour rouge ; trait rouge ; « chat » rouge dans « Le gros chat noir » ; « matin » rouge dans la cellule « Lundi matin », cellule voisine remplie de rouge ; rangée du pot (Rouge … Aucune).
S1 remplir un rectangle, annuler, rétablir · S2 contour près du bord, trait, « Aucune » · S3 mot d'un texte (et hors mot = texte entier), mot d'une cellule, cellule vide · S4 fond de page ; image → fond (C6b absent) · S5 aller-retour .roomboard, fichier d'avant C6a, scène ≥ 640 px, capture

## Hypothèses à revoir (niveau 1 d'abord)
13 hypothèses dont 5 de niveau 1 (cadrage § 4) : HC6-1 clic hors mot dans un texte = texte entier ; HC6-2 cellule hors mot = remplissage de la cellule ; HC6-3 « Aucune » retire la couleur ; HC6-4 couleurs du pot = presets.fill sinon liste figée, sans toucher au stylo ; HC6-7 Pot dans defaut et annotation, pas simple. Niveau 2 : HC6-5, 6, 8 à 13. HC6-9 (groupe) levée : C3 fusionné, test écrit.
 24 lignes « Modules à réutiliser ou à étendre ».

## Hors périmètre
- P1 sur image (C6b, attend C5) ; P3 zones fermées par plusieurs objets (C8) : le pot passe à l'étape suivante de la cible (fond de la page).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- T1 : la notification de fin d'une construction en fond n'a pas réveillé l'agent (comme C10b) ; relancé au premier plan.
- Prémisses démenties : FormatText ne vise pas une cellule (mot d'une cellule par SetTableCell) ; aucune commande ne change fill/color/background d'un objet posé (→ commande Fill) ; le rendu peint un fond constant (canvas2d.ts:201, :439, webgl2.ts:384).
- Fichiers communs probables avec C3 : commands.rs, lib.rs (core, wasm), api.ts, fake-core.ts, wasm-core.ts, engine.ts, toolbar*.ts, toolbar-host.ts, verifier.sh.
- OD83 (C3 groupes, `feat/usage-c3-groupes`) tourne en même temps : sélection et collage. Intégrer origin/main avant la fusion.

## Rapport
- Décisions d'architecture DA1 à DA4 (cadrage § 5) : commande Fill à cible extensible, edge_hit dans le cœur, fill-target.ts côté page, fond peint par le rendu.
- Simplifications appliquées (T10) : fillChoices passe par presetsOf ; branche morte similarity_scale retirée de edge_hit (cœur et fausse liaison).
- Constats : c9 paintedIn fermé ; 1 ajouté (fake-core edgeHit) ; zone crates/roomboard-core à 3 constats ouverts : un audit de cette zone est proposé (pas lancé).
- Release : non due (brief : aucune release, aucun tag). Pas de CI GitHub (brief).

## Notes du coffre à poser
3 notes (journal, décision, ligne de fiche) : texte complet dans la description de la PR.

## Choix tranchés seul
- Mode du cadrage : autonome (brief de Jérôme, 2026-11-19 : « Aucune question ne lui parvient pendant ton tour : tranche seul »).
- Un objet groupé se colore seul : le pot vise l'élément, pas le groupe.
- Relecture du plan menée en parallèle de la vague 1 (temps) : aucun bloquant ; ses constats mineurs passés aux briefs de T5 à T8.
- PC7 : retirer le dernier préréglage du pot retire la clé `presets.fill` (retour aux couleurs figées) ; le stylo garde sa clé vide.
- T5 et T8 lancées en parallèle (fichiers disjoints ; `verifier.sh` reconstruit le module).
- `origin/main` (C3) intégré par une fusion, pas un rebase : la branche porte des fusions de tâches.
- Bande de tolérance hors de la boîte d'un texte ou d'un tableau : le point est ramené dans la boîte, puis règle ordinaire (HC6-12).
