# État — usage-c9-editeur

Statut : en cours
Gabarit : courte
Objectif : Régler la grille de la page dans le panneau (type parmi les six, pas, couleur, épaisseur, magnétisme) avec un aperçu direct, sans ralentir l'affichage quand les points sont nombreux.
Avancement : 9/9 tâches terminées
Étage : 4 — depuis 2026-11-20 11:25
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c9-editeur   Branche : feat/usage-c9-editeur   Base : origin/main @ 8247215, puis fusion de origin/main @ 07cb1d5 (PR 15, C10a)
Cadrage : docs/plans/usage-c9-editeur-cadrage.md   Plan(s) : docs/plans/usage-c9-editeur-PLAN.md

## Référence
Complète (origin/main 8247215, scripts/verifier.sh --e2e) : OK (web 1160 tests). Après fusion de C10a (417f313) : verifier.sh OK (web 1296).

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
| id | dépend | état | commit vert | preuve rejouée |
|----|--------|------|-------------|----------------|
| T1 | — | terminée | 61dbd82 | cargo test ok (244→251), web 1160→1173, tsc 0 |
| T2 | T1 | terminée | 73480de | vitest web complet 1332, « S4 : dix images… un seul appel au cœur » |
| T3 | T2 | terminée | 20c0197 | idem, « setGridPreview → gridLinesOf… », « switchTo coupe l'aperçu » |
| T4 | T1 | terminée | c2feb60 | 34 tests (grid-edit, GridPanel, ProfileEditor), tsc 0 |
| T5 | T3, T4 | terminée | a9f9c63 | web 1341, bloc « App — grille » 7 tests, build web OK |
| T6 | T5 | terminée | 5171eae | verifier.sh --e2e : « C9 grille : OK », S5b, C1, C10a OK |
| T7 | relecture | terminée | a266949 | correctifs cache marge nulle (major), parité vrai module, motif × épaisseur ; web 1350 |
| T8 | relecture | terminée | 3cc5f4e | correctifs pas E5, grille vide G5, épaisseurs PC8, essai onglet, capture à 1 px ; 2 simplifications |
| T9 | relecture | terminée | 15b9414 | amendement E3, compte strict, brouillon initial unique |

## Terminé quand
toutes les tâches terminées · cache des lignes prouvé par un test (compte des appels) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture dans docs/essais/ · PR mergée par fusion locale --no-ff puis push sans --force

## Scénarios et captures
S1 Playwright (scripts/essais/c9-grille-navigateur.mjs) — réussi : aperçu sans écriture, Fermer sans appliquer, CR3 autre onglet, Appliquer = une étape, Annuler/Rétablir de la barre, rouvert : Carreaux, pas 80, épaisseur 3, magnétisme.
S2 Vitest (grid-edit, GridPanel, App) — réussi. S3 cargo test + contrat TS (lineWidth, fixture PR 12) — réussi. S4 cache (compte d'appels, parité vrai module) — réussi. S5 verifier.sh --e2e — réussi.
Capture docs/essais/c9-editeur-grille.png : panneau Grille ouvert en haut à gauche (Seyès, pas 30,24, épaisseur 1 px, magnétisme) ; aperçu Seyès sur toute la page, lignes fines visibles ; barre sur deux lignes avec « Grille » enfoncé.

## Choix tranchés seul
- Cadrage autonome sans question (consigne de Jérôme du 2026-11-19).
- Épaisseur : champ `lineWidth` par niveau, px CSS d'écran 1 à 8, défaut 1 (absent du modèle de la PR 12) ; amendement de U31 écrit.
- Seuils de saut multipliés par l'épaisseur (une grille épaisse au zoom faible ne devient pas un aplat).
- Cache : garde les lignes d'un rectangle élargi autour de la vue (le défilement change aussi les lignes), marge nulle = vue exacte seulement.
- Aperçu par une lecture à part (`gridLinesOf`), pas par SetGrid : une séance = une étape d'annulation (U31).
- Seul le premier niveau de la grille est réglable ; un seul pas X = Y ; « appliquer à toutes les pages » reporté.
- Bouton « Fermer sans appliquer » (évite la confusion avec « Annuler » de la barre).
- Bouton « Grille » dans les profils `defaut` et `annotation`, pas dans `simple`.
- Fusion de origin/main (pas de rebase) pour intégrer C10a ; T2 et T3 au même agent ; pas de revue immédiate par tâche (double relecture de fin à la place) ; bloquants de la relecture du plan passés dans les prompts.
- EDGE_EPS gardé à 1e-6 absolu (commentaire corrigé, écart sous le pixel).

## Hypothèses à revoir (niveau 1 d'abord)
HE1 épaisseur en px CSS · HE2 premier niveau seul réglable · HE3 un seul pas, remis au défaut du type au changement de type · HE4 choix visuels du panneau · HE8 « toutes les pages » reporté.

## Hors périmètre
- Grille comme ressource (C4).

## Pièges trouvés
- main a bougé pendant T1 (PR 15, C10a) : fusion de origin/main, 3 conflits d'ajouts gardés des deux côtés.
- Un worktree neuf a un apps/web/src/wasm ancien ou absent : le régénérer avant tsc/vitest.
- Une commande lancée en fond par un sous-agent au premier plan meurt à la fin de son tour : l'orchestrateur lance lui-même verifier.sh --e2e.

## Portes
ouvertes : — · passées : — (pas de porte avant merge, aucune release)
