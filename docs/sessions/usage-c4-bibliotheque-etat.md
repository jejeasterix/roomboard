# État — usage-c4-bibliotheque

Statut : en cours
Gabarit : chantier (15 tâches, confirmé à l'étage 2)
Objectif : Un panneau « Bibliothèque » montre « Mes ressources » et « Ressources partagées », en dossiers, avec recherche par nom et mot-clé et une vignette par ressource ; on ajoute une ressource depuis la sélection (`.rbitem`, U9) ou depuis la grille d'une page (`kind: "grid"`, U31), on la glisse sur la page (insertion en une étape d'annulation), on exporte un dossier en `.rbpack` et on l'importe ailleurs avec les mêmes ressources.
Avancement : 0/15 tâches terminées
Étage : 3 — depuis 2026-11-21 10:36
Tâche : T1, T3, T5, T6, T7, T9, T11, T12 (vague 1) — depuis 2026-11-21 10:36
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque   Branche : feat/usage-c4-bibliotheque   Base : origin/main @ 443edd4
Branche principale locale au lancement : 443edd4
Cadrage : docs/plans/usage-c4-bibliotheque-cadrage.md   Plan(s) : docs/plans/usage-c4-bibliotheque-PLAN.md
Mode : autonome, ouvrier CLI sur la VM, aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible… », 2026-11-19). Arrêt ferme : 2026-11-21 13:54 (pousser avant 13:44).

## Référence
Avant (origin/main @ 443edd4, reprise de la référence finale de C8 sur f417fbc, seuls des commits de documentation depuis) : verifier.sh --e2e OK · web 124 fichiers, 2445 tests · module Wasm principal 1 362 599 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728) · scène 662 px Pot actif. Suite complète non rejouée au lancement : VM chargée (charge 16,9 sur 8 cœurs), une seule place.

## Compteurs
contre-relecture cadrage 1/2 (B1 unknownKindMessage, I1–I3, M1–M9 intégrés : D23–D32, H1-7) · relecture plan 1/3 (aucun bloquant ; 3 importants et 7 mineurs sur T13, T14, T15, transmis dans leurs prompts, /tmp/c4-corrections-plan.txt) · vagues sans progrès 0/2

## Tâches
Vagues : V1 = T1, T3, T5, T6, T7, T9, T11, T12 · V2 = T2, T4, T8 · V3 = T10, T13 · V4 = T14 · V5 = T15. Worktrees : ~/projets/roomboard-wt/usage-c4-bibliotheque--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 cœur kind grid, WrongKind found | — | en cours | 1/3 | — | — |
| T2 pont Wasm | T1, T3 | à faire | 0/3 | — | — |
| T3 API TS du cœur, faux cœur | — | en cours | 1/3 | — | — |
| T4 ContainerIO, insertResource | T3 | à faire | 0/3 | — | — |
| T5 vignette | — | en cours | 1/3 | — | — |
| T6 LibraryFiles (mémoire, IndexedDB, plugin-fs) | — | en cours | 1/3 | — | — |
| T7 paquet .rbpack, Worker ZIP | — | en cours | 1/3 | — | — |
| T8 ResourceLibrary | T6, T7 | à faire | 0/3 | — | — |
| T9 importeur .rbpack | — | en cours | 1/3 | — | — |
| T10 coque : association, capacités | — | à faire | 0/3 | — | — |
| T11 action Bibliothèque | — | en cours | 1/3 | — | — |
| T12 glisser Pointer Events | — | en cours | 1/3 | — | — |
| T13 LibraryPanel | T8, T12 | à faire | 0/3 | — | — |
| T14 branchement | T2, T4, T5, T8, T9, T11, T13 | à faire | 0/3 | — | — |
| T15 essai navigateur, capture, tailles | toutes | à faire | 0/3 | — | — |

## Scénarios et captures

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright C4 du brief réussi · capture du panneau « Bibliothèque » dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 09:54 lancement, worktree depuis origin/main @ 443edd4.

- 2026-11-21 10:05 cadrage écrit (ee2d628) : 22 décisions, 13 hypothèses dont 6 de niveau 1, 4 DA, S1–S5 ; stockage web IndexedDB.
- 2026-11-21 10:33 contre-relecture 1/2 intégrée (20e2a63, 3b06a06) ; plan 15 tâches, 38 lignes `Réutilise :`.
- 2026-11-21 10:36 vague 1 lancée (8 tâches) et relecture du plan 1/3 en parallèle.

## Pièges trouvés
- Prémisses démenties (cadrage) : `formats` gagne quelques dizaines d'octets (`kind: "grid"` lu par le même code que le cœur) ; mots-clés et vignette hors du `.rbitem` (écart à U9, compagnon) ; glisser HTML5 risqué en coque Windows (`dragDropEnabled: true`) → Pointer Events ; portée du dossier partagé perdue au redémarrage de la coque (H1-5) ; fonds de page en ressource hors périmètre.
- Chantiers en cours sur les mêmes fichiers : aucun.
