# État — usage-c10a-tableau

Statut : en cours — fusion
Gabarit : chantier (12 tâches du plan + 4 correctives, confirmé à l'étage 2)
Objectif : Dans RoomBoard, créer un tableau par une grille de choix, écrire dans ses cellules au clavier (Tab), insérer et supprimer lignes et colonnes, uniformiser les tailles, choisir une couleur, et le retrouver en rouvrant le `.roomboard`.
Avancement : 16/16 tâches terminées
Étage : 4 — depuis 2026-11-20 09:52
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c10a-tableau   Branche : feat/usage-c10a-tableau   Base : origin/main @ 8247215
Branche principale locale au lancement : 8247215 · point de retour origin/main : 8247215
Cadrage : docs/plans/usage-c10a-tableau-cadrage.md   Plan(s) : docs/plans/usage-c10a-tableau-PLAN.md
Lancement : 2026-11-20 08:04 · repli (push + état) au plus tard 12:54 · arrêt ferme 13:04
Mode : ouvrier CLI autonome (OD71) — aucune question à Jérôme, choix tranchés et consignés.

## Référence
verifier.sh OK sur origin/main 8247215 (rapide = complète, worktree neuf) · core 244 (2 ignorés) · web 1176 · module Wasm 917 469 o — /tmp/c10a-ref.log
Fin : verifier.sh --e2e OK sur 01ff30e · core 269 (2 ignorés, déjà là) · web 1283 / 79 fichiers · e2e « C10a tableau : OK », C1, C2, S3/S4, 5a, S5b OK · module Wasm 950 471 o (sous 1 400 000 : pas de mesure OD55) — /tmp/c10a-fin3.log

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; 1 important : module Wasm reconstruit par l'orchestrateur après T6) · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Plan : 64638c9. Vague 1 : T1, T3, T4, T5 · vague 2 : T2, T7, T8, T9 · vague 3 : T6, T10, T11, T8b · vague 4 : T12 · correctifs : T13+T14 (tour 1), T15 (tour 2).
| id | worktree | sub | état | essais | preuve rejouée |
|----|----------|-----|------|--------|----------------|
| T1 cœur vue + repli inconnu | --T1 | concepteur-critique | terminée | 1/3 | cargo core 251 ok |
| T3 contrat TS + fausse liaison | --T3 | concepteur-critique | terminée | 1/3 | vitest 1208 ok, tsc 0 (après vague 1) |
| T4 contrat moteur + géométrie | --T4 | implementeur-tdd | terminée | 1/3 | idem |
| T5 porte IME, saisie, grille | --T5 | implementeur-tdd | terminée | 1/3 | idem |
| T2 six commandes, fixture | --T2 | implementeur-tdd | terminée | 1/3 | cargo core 263 ok |
| T7 rendu (paintText) | --T7 | implementeur-tdd | terminée | 1/3 | vitest 1252/1253 (échec C1 → T8b) |
| T8 barre, rangée, pastilles | --T8 | implementeur-tdd | terminée | 1/3 | idem |
| T9 outil Tableau | --T9 | concepteur-critique | terminée | 1/3 | idem |
| T6 liaison Wasm | --T6 | implementeur-tdd | terminée | 1/3 | WASM_REQUIRED vitest 1274 ok |
| T10 reste OD56 head(4096) | --T10 | implementeur-tdd | terminée | 1/3 | idem |
| T11 branchement session | --T11 | implementeur-tdd | terminée | 1/3 | idem |
| T8b catalogue des profils (intégration) | --T8b | implementeur-tdd | terminée | 1/3 | idem |
| T12 essai e2e S1 + capture | --T12 | concepteur-critique | terminée | 1/3 | verifier.sh --e2e OK (0512229) |
| T13 correctifs Rust (f32, ids « : ») | --T13 | concepteur-critique | terminée | 1/3 | verifier.sh --e2e OK (819fc94) |
| T14 correctifs web (grille, IME, uniformiser) | --T14 | concepteur-critique | terminée | 1/3 | idem |
| T15 correctifs tour 2 (insertion f32, parité, Ctrl+S) | --T15 | concepteur-critique | terminée | 1/3 | verifier.sh --e2e OK (01ff30e) |

## Restes à prendre (brief OD71)
- OD56 lecture d'en-tête : FAIT (T10) — import.ts lit head(4096) avant détection, blob() seulement si reconnu ; tests « S5 : non reconnu, head(4096) une fois, blob() jamais » et « head(4096) : un seul read_granted_file ».
- OD56 branches : FAIT — 12/12 feat/usage-c2-depot--T<n> fusionnées dans origin/main, supprimées en local (git branch -d) ; aucune n'existait sur origin (rien à supprimer à distance).
- OD55 : non déclenché — module 950 471 o < 1 400 000 o.

## Choix tranchés seul
- 4 × 3 = 4 colonnes × 3 lignes (HC10-1).
- Tab dans la dernière cellule ajoute une ligne ; inerte à 64 (HC10-2, HC10-9).
- S1 joue S11 (insérer une colonne) ET le brief (insérer une ligne) : 4×3 → 5×3 → 5×4.
- Actions du tableau hors du catalogue de l'éditeur de profils (contextuelles) — écart au cadrage consigné (HC10-13).
- Tableau mal formé = cadre « inconnu » (jamais invisible).
- Clic hors du tableau pendant la saisie : valide seulement. Suppr sur cellule active vide la cellule.
- Géométrie bornée en f32 (AddTable, SetTableSizes, SetTableCell, InsertTableLine), ids à « : » illisibles.
- Grille de choix : bornée à la scène, consomme Retour arrière/Suppr/Échap/Espace, laisse passer Ctrl/Méta.

## Cadrage
15 décisions T1-T15, 6 DAC, 17 hypothèses (7 de niveau 1). Scénarios : S1 geste S11 e2e · S2 clavier · S3 tailles, uniformiser, couleur, rechargement · S4 kind inconnu gardé octet pour octet · S5 fichier non reconnu refusé après 4 096 o.

## Rapport
- Scénarios : S1 joué par verifier.sh --e2e (« C10a tableau : OK » ; lectures 4x3@0,0…2,3 → 5x3 → 5x4 → rouvert « Lundi/Mardi/Mercredi »). S2, S3, S4, S5 couverts par tests unitaires et de contrat (vrai module Wasm). Capture docs/essais/c10a-tableau-4x3.png : 4 × 3 rempli (Lundi…Sciences), cellule active en tirets, rangée « + Ligne … Uniformiser » et six pastilles.
- Hypothèses niveau 1 à l'essai : HC10-1, HC10-2, HC10-3, HC10-4 (240 × 64, texte 36), HC10-5 (palette), HC10-6, HC10-7 (noms des clés, réversibles jusqu'à la 1re release).
- Double relecture finale : 0 blocker ; 4 major corrigés (T13, T14), puis 1 major du tour 2 corrigé (T15). Simplifications appliquées dans T13/T14.
- Hors périmètre consigné, non corrigé : collaboration Yrs (1re écriture concurrente dans une cellule absente : une écriture perdue ; cellule orpheline après suppression concurrente) — à trancher avant de brancher la collaboration. La barre passe sur trois lignes avec la rangée du tableau à 1 280 px (scène 658 px ≥ 640, HC10-15). Échap avec Ctrl/Méta ne ferme plus la grille.
- Constats d'architecture : 1 fermé (files.ts head(n)), 1 ajouté (scripts/essais coqueCsp ×3) ; toolbar-host.ts:45 reste ouvert (toolbar.ts:634). Aucune zone à 3 constats : pas d'audit à proposer.
- Release : non due (aucune release, aucun tag : brief).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · S11 (partie C10a) réussi en Playwright · capture 4 × 3 dans docs/essais/ · fusion locale --no-ff poussée

## Hypothèses à revoir
Voir cadrage § 4 (HC10-1 à HC10-17).
