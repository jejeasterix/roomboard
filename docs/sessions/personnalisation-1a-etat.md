# État — personnalisation-1a

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Jérôme choisit pour chaque page un mode Page (cadre 16:9 comme PowerPoint) ou Infini, gère ses pages et les calques des objets dans une barre latérale repliable, et navigue de page en page depuis la barre d'outils principale.
Avancement : 7/14 tâches terminées
Étage : 3 (vague 3) — depuis 2026-11-27 09:02
Tâche : T7 — grille du cœur et CLI — depuis 09:18 ; T9 — rendus et miniatures — depuis 09:18 ; T11 — essais adaptés (en attente de T10) — depuis 09:18
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
| T7, T9 | en cours | — | — |
| T11 | commit dffe795, essais à rejouer après T10 | — | — |
| T10, T12, T13, T14 | à faire | — | — |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · captures 2x avant/après · PR fusionnée par `git merge --no-ff` et poussée

## Cadrage
23 hypothèses (10 de niveau 1) · 25 lignes « Modules à réutiliser ou à étendre » · deux lots : lot 1 (mode, barre latérale Pages, navigation, profils) ~11 tâches ; lot 2 (Restack, onglet Calques) ~2 tâches.
S1 Mode de page au doigt · S2 Barre latérale Pages au doigt · S3 Navigation dans la barre principale · S4 Calques au doigt (lot 2) · S5 Au clavier

## Pièges trouvés
- Prémisse démentie : seule la barre d'outils se déplace et se replie ; aucune position par défaut dans le profil.
- Prémisse démentie : la page actuelle est à hauteur libre (modèle ActivInspire), pas un cadre 16:9.
- Chantier voisin `personnalisation-1b` (OG5) sur toolbar-profiles.ts, actions, icons.ts, App.tsx, rb.css, commands.rs, api.ts, fake-core.ts, ops.ts, cli-essai.mjs, THIRD_PARTY_NOTICES.md : relire avant le rebase.

## Hors périmètre
- fonds de page et bibliothèque (OG5) · outil frame (plus tard)

## Notes du coffre à poser
(à l'étage 4)
