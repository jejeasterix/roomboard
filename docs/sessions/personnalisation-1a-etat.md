# État — personnalisation-1a

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Jérôme choisit pour chaque page un mode Page (cadre 16:9 comme PowerPoint) ou Infini, gère ses pages et les calques des objets dans une barre latérale repliable, et navigue de page en page depuis la barre d'outils principale.
Étage : 2 — depuis 2026-11-27 08:38
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
contre-relecture cadrage 1/2 (2 bloquants corrigés) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à l'étage 2)

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
