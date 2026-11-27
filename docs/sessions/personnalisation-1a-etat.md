# État — personnalisation-1a

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Jérôme choisit pour chaque page un mode Page (cadre 16:9 comme PowerPoint) ou Infini, gère ses pages et les calques des objets dans une barre latérale repliable, et navigue de page en page depuis la barre d'outils principale.
Avancement : 19/20 tâches terminées (T21 essais restants en cours)
Étage : 3 (vague 6) — depuis 2026-11-27 10:15
Tâche : T21 — essais e2e restants (îlot d'outils abaissé à 1280 px) — depuis 11:52
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-1a   Branche : feat/personnalisation-1a   Base : origin/main @ 45484db
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-1a-cadrage.md   Plan(s) : docs/plans/personnalisation-1a-PLAN.md
Mode : ouvrier CLI, cadrage autonome (aucune question ne parvient à Jérôme pendant le tour, brief OG4).
Arrêt ferme : 2026-11-27 14:33 (lancement 08:03 + 6 h 30) ; poussée de sauvegarde à 14:23.

## Référence
Rapide : —  (couverte par la complète)
Complète (origin/main @ 45484db, `scripts/verifier.sh --e2e`) : OK · cargo 1356 tests (« test result », core compté deux fois) · cli 263 · web 3628 · e2e 1204 lignes « ok — » · Wasm principal 1 375 581 o · formats 2 794 511 o
Tailles Wasm à 45484db (brief) : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (2 bloquants corrigés) · relecture plan 1/3 (1 bloquant T2 traité : rouges attendus jusqu'à T6/T8) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan : docs/plans/personnalisation-1a-PLAN.md (table en tête, 14 tâches, 6 vagues).
| id | état | dernier commit vert | preuve rejouée |
|----|------|---------------------|----------------|
| T1 | terminée | 87bb6e9 | core 410 lib ; page_mode/move_page/duplicate_page verts |
| T2 | terminée | e719eb8 | vitest 139 (4 fichiers) |
| T3 | terminée | 1e0382e | vitest 117 (4 fichiers) |
| T4 | terminée | 335af16 | wasm 56 ; fake-core+contrat 467/469 (2 C9 → T7) ; Wasm 1 390 008 o |
| T5 | terminée | 332dcad | vitest 112 |
| T6 | terminée | f0a7ba6 | vitest 130 ; controle-icones OK |
| T8 | terminée | 4676c28 | vitest 430 ; tsc 0 |
| T7 | terminée | 42231b7 | core 415 ; grid_clip 5 ; contrat 393 (vrai module) ; CLI 265 ; CLI : OK ; Wasm 1 391 619 o |
| T9 | terminée | b4da390 | vitest 346 |
| T10 | terminée | ced2d9c | vitest 434 ; tsc 0 |
| T13 | terminée | fbe8b13 | restack 6 ; wasm 57 ; CLI : OK ; Wasm 1 403 655 o |
| T15 (correctif) | terminée | 200a0ab | web complet 3714/3714 ; fmt et clippy propres |
| T14 | terminée | b537512 | vitest 383/385 (2 Toolbar.test → T16) |
| T11 | fusionnée (aides d'essais) | d3fe937 | essais rouges : défaut de placement de l'app → T16 |
| T16 (correctif) | terminée | 0bfae96 | web 3741 ; 13/15 essais |
| T12 | terminée | 29468b0 | essai personnalisation-1a OK (88 contrôles) ; captures |
| T17 | terminée | b7e85cb | web 3746 ; c3, s5b, design-l1/l2, 1a OK |
| T18 (relecture A) | terminée | 5d2ed2e | contrat T18 405 (vrai module) ; engine 133 |
| T19 (relecture B) | terminée | 758ee1e | web 3767 ; essais 1a, l2, c13, s5b, l1 OK |
| T20 (miniature portrait) | terminée | 07cd079 | vitest 208 |
| T21 (essais restants) | en cours | — | verifier --e2e n°1 : rouge à c10a (îlot d'outils abaissé) |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · captures 2x avant/après · PR fusionnée par `git merge --no-ff` et poussée

## Cadrage
23 hypothèses (10 de niveau 1) · 25 lignes « Modules à réutiliser ou à étendre » · deux lots : lot 1 (mode, barre latérale Pages, navigation, profils) ~11 tâches ; lot 2 (Restack, onglet Calques) ~2 tâches.
S1 Mode de page au doigt · S2 Barre latérale Pages au doigt · S3 Navigation dans la barre principale · S4 Calques au doigt (lot 2) · S5 Au clavier

## Pièges trouvés
- Prémisse démentie : seule la barre d'outils se déplace et se replie ; aucune position par défaut dans le profil.
- Prémisse démentie : la page actuelle est à hauteur libre (modèle ActivInspire), pas un cadre 16:9.
- Chantier voisin `personnalisation-1b` (OG5) sur toolbar-profiles.ts, actions, icons.ts, App.tsx, rb.css, commands.rs, api.ts, fake-core.ts, ops.ts, cli-essai.mjs, THIRD_PARTY_NOTICES.md : relire avant le rebase.

## Relectures
Double relecture (A cœur/moteur, B interface/essais) : aucun bloquant ; importants corrigés par T18 et T19.
Critique impeccable (dégradée, un seul contexte, lanceur sans droit d'exécution) : miniature portrait → T20.

## Hypothèses à revoir (niveau 1)
- À 1280 px de large, l'îlot d'outils (941 px avec Précédente / numéro / Suivante) passe sous la rangée du haut (règle L2-30) ; essais c3, c10a, c10b, c7b, c6a cliquent désormais sous les îlots.
- Barre latérale repliée au départ (bande verticale à gauche) dans les trois profils fournis.
- Portrait 1920 × 3413 (précédent PF4), pas 1080 × 1920.

## Hors périmètre
- fonds de page et bibliothèque (OG5) · outil frame (plus tard)

## Notes du coffre à poser
(à l'étage 4)
