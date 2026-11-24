# État — cli-lot2

Statut : en cours
Gabarit : chantier (9 tâches, confirmé à l'étage 2)
Objectif : La CLI de RoomBoard insère un fragment `.rbitem`, lit et écrit les tableaux blancs et les paquets `.rbpack`, et convertit un fichier d'un format à l'autre.
Avancement : 6/9 tâches terminées
Étage : 3 (vague 3) — depuis 2026-11-24 01:27
Lot : —
Tâche : T6 — CLI lecture des cinq tableaux — depuis 2026-11-24 01:28
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot2   Branche : feat/cli-lot2   Base : origin/main @ 3b3c88a
Branche principale locale au lancement : 3b3c88a
Cadrage : docs/plans/cli-lot2-cadrage.md   Plan(s) : docs/plans/cli-lot2-PLAN.md
Mode : autonome (ouvrier CLI OF5, aucune question à Jérôme : choix tranchés seul et consignés)

## Référence
Rapide : — (le build de référence est la suite complète ci-dessous)
Complète (origin/main @ 3b3c88a, `verifier.sh --e2e`, 14 min 22 s) : CODE=0, `verifier.sh : e2e OK` ; cli 84 tests, web 3097 tests, cargo tout vert

## Tailles Wasm avant
module principal 1 374 215 o (plafond 1 572 864) · module formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 2 majeurs, 9 mineurs renvoyés au cadreur) · relecture plan 1/3 (relecteur arrêté à sa limite après T1-T8 relues : aucun bloquant, 2 mineurs) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Vagues : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 ∥ T5 ∥ T8 ; 3 = T6 ; 4 = T7 ; 5 = T9. Toutes `isolé` (`~/projets/roomboard-wt/cli-lot2--T<n>`, branche `feat/cli-lot2--T<n>`).
| id | dépend | subagent | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 | — | implementeur-tdd | terminée | 1/3 | e196dc0 (fusion 1ffeabe) | web fragments+workspace 202 tests, `encodeIds` 3 tests |
| T2 | — | concepteur-critique | terminée | 1/3 | ac5c8da (fusion 6d01d19) | web 4 fichiers 73 tests ; `-t inlineWorker|boardJobReply|zipJobReply` 21 ; relecture immédiate : 0 bloquant, 2 mineurs |
| T3 | — | implementeur-tdd | terminée | 1/3 | 4db0311 (fusion f85b8b4) | fabriques 12 tests ; `node --check` c13 OK |
| T4 | T1, T2 | implementeur-tdd | terminée | 1/3 | 2ada481 (fusion c84e5ae) | web 6 fichiers 358 tests ; suite web 3126 (rapport) |
| T5 | T1 | implementeur-tdd | terminée | 1/3 | 3b8fabe | cli 93 tests, `-t S1` 6 tests |
| T8 | T2 | implementeur-tdd | terminée | 1/3 | 62e3e93 (fusion b3de80e) | cli `library.test.ts` 4 tests |
| T6 | T3, T4, T5 | concepteur-critique | en cours | 1/3 | — | — |
| T7 | T6 | implementeur-tdd | à faire | 0/3 | — | — |
| T9 | T7, T8 | implementeur-tdd | à faire | 0/3 | — | — |

## Scénarios
S1 insérer un `.rbitem` (tableau existant et neuf) · S2 lire les cinq tableaux blancs, jamais réécrits à leur chemin · S3 écrire puis relire `.iwb`/`.ubz`, `.pdf` en code 3 · S4 aller-retour `.rbpack` par `library` · S5 `cli-essai.mjs` : `CLI : OK`

## Terminé quand
toutes les tâches terminées · chaque format du lot 2 « couvert » dans `FORMAT_LOTS` avec ses tests et un contrôle dans `scripts/essais/cli-essai.mjs` · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF5).
- Contre-relecture du cadrage : un seul tour (aucun bloquant au tour 1, corrections faites) ; plan relu en un tour partiel, faute de temps (arrêt ferme 04:49).
- Phase 0 (3.1) : les preuves portent sur des tests que les tâches écrivent ; jugées en 3.6 (N ≥ 1, nom attendu).
- Mineurs du plan acceptés : `importer.ts:287` → ligne réelle 100 ; preuve T4 rejouée sur ses 6 fichiers de test.

## Pièges trouvés
- Les sous-agents `implementeur-tdd` signent `Co-Authored-By: Claude Sonnet 5.5` (rappel d'attribution de leur modèle) ; le brief exige `Claude Opus 5.5` : messages réécrits sur la branche locale non poussée (`git filter-branch --msg-filter`), consigne ajoutée aux prompts.
- Relecture T2, mineur 1 (plausible, code déplacé tel quel) : `partOf` (`board-reader.ts:144-150`) libère dans un `finally` ; une panique pendant `ops()` peut devenir l'erreur « borrowed » de `free()` et masquer la `RuntimeError` → transmis à T6 (D29).
- Relecture T2, mineur 2 : pas de test « `postMessage` qui lève » pour la coquille `board-worker.ts` (le code est correct) → consigné.

## Hors périmètre
- `roomboard-prive`
- Lots 3 (PDF) et 4 (Office, médias, 3D, autres images)

## Portes
ouvertes : — · passées : —
