# État — cli-lot3

Statut : en cours
Gabarit : chantier (7 tâches, confirmé à l'étage 2)
Objectif : La CLI de RoomBoard lit un PDF en onglet avec ses pages en fond, écrit un PDF annoté depuis un `.roomboard`, et convertit vers et depuis le PDF.
Avancement : 7/7 tâches terminées
Étage : 3 (fin de lot : suite complète et double relecture) — depuis 2026-11-24 04:09
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot3   Branche : feat/cli-lot3   Base : origin/main @ 48118ae
Branche principale locale au lancement : 48118ae
Cadrage : docs/plans/cli-lot3-cadrage.md   Plan(s) : docs/plans/cli-lot3-PLAN.md
Mode : autonome (ouvrier CLI OF8, aucune question à Jérôme : choix tranchés seul et consignés)
Arrêt ferme : 2026-11-24 07:05 (lancement 02:35 + 4 h 30) ; point d'arrêt à 06:55

## Référence
Rapide : —
Complète (worktree neuf @ 48118ae, `verifier.sh --e2e`, 682 s) : CODE=0, `verifier.sh : e2e OK`

## Tailles Wasm avant
principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728), mesurés sur la référence

## Compteurs
contre-relecture cadrage 1/2 (1 bloquant, 3 majeurs, 7 mineurs, corrigés) · relecture plan 1/3 (0 bloquant, 1 majeur, 3 mineurs) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Vagues : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 (après T2, T3) ; 3 = T5 ; 4 = T6 ; 5 = T7. Toutes `isolé` (`~/projets/roomboard-wt/cli-lot3--T<n>`, branche `feat/cli-lot3--T<n>`).
| id | dépend | subagent | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 | — | concepteur-critique | terminée | 1/3 | 4b7e331 (fusion f78ae90) | web 8 fichiers 237 tests (avec T2, T3), tsc 0 |
| T2 | — | concepteur-critique | terminée | 1/3 | 8a0b815 (fusion 8fd67d4) | idem ; `pdfJobReply` 4, `pdfjsBinding` 2, `vectorPainter` 2 |
| T3 | — | implementeur-tdd | terminée | 1/3 | 64d62f3 (fusion aa9e12d) | `fabrique-pdf` 2 ; « Open Font License » 0 |
| T4 | T2, T3 | concepteur-critique | terminée | 1/3 | fc4744a | cli 163 tests, tsc 0 ; `controle-licences : OK` (rapport) |
| T5 | T1, T3, T4 | implementeur-tdd | terminée | 1/3 | 079392b | cli 171 tests, `-t S1` 8, tsc 0 |
| T6 | T5 | concepteur-critique | terminée | 1/3 (arrêtée à 40 tours, travail commité, rapport demandé) | 0d8eee2 | cli 182 tests, `-t "S2 à S4"` 11, tsc 0 |
| T7 | T6 | concepteur-critique | terminée | 1/3 | 6e4f5d1 (fusion d46a9a8) | `cli-essai.mjs` 89 contrôles `CLI : OK` |

## Terminé quand
toutes les tâches terminées · PDF « couvert » dans `FORMAT_LOTS` avec ses tests et des contrôles dans `scripts/essais/cli-essai.mjs` (page comptée, texte retrouvé, fond présent) · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF8).
- Contre-relecture du cadrage : un seul tour (bloquant levé par une décision de l'agent, D48), faute de temps.
- B1 licence : les polices Liberation de `pdfjs-dist` sont sous GPL v2 avec exception de police (vérifié dans `LICENSE_LIBERATION`), pas OFL comme le disait `THIRD_PARTY_NOTICES.md`. Choix : la CLI les lit à l'exécution dans `pdfjs-dist` installé, sans copie ; la notice est corrigée ; le passage à une police OFL reste à Jérôme.
- Relecture du plan : correctifs passés dans les briefs des tâches au lieu d'un 2e tour du planificateur (gain de temps) : T5 construit la CLI et prouve pdf.js dans le fichier et stderr vide ; T6 filtre `-t "S2 à S4"` ≥ 11 ; G6 (aucune dépendance ajoutée) rappelée à T5 et T6 ; numéros de ligne de `formats.ts` : `.pdf` l. 54, `LOT_LIVRE` l. 11, `exportBlocked` l. 101-104.
- T7 confiée à `concepteur-critique` (au lieu d'`implementeur-tdd`) avec la cause racine trouvée par T5 et T6 : l'`await` de premier niveau de `bin.ts` plaçait les `import()` inlinés de pdf.js et pdf-lib après lui dans le fichier construit. Corrigé dans `bin.ts` ; les imports d'effet de bord de `session.ts` (dont `../../web/node_modules/pdf-lib`) retirés.
- Essai T7 : une seule annotation `SetText` « Note CLI » (le plan prévoyait aussi un `AddShape`) : la superposition `/Form` en page 2 est contrôlée.
- Reste d'OF5 fait à l'étage 0 : `__PR__` → `45`, `__MAIN__` → `48118ae` dans `docs/sessions/cli-lot2-etat.md`.

## Hors périmètre
- Lot 4 (Office, médias, 3D, autres images).

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
(à l'étage 4)
