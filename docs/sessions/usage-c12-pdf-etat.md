# État — usage-c12-pdf

Statut : en cours
Gabarit : chantier
Objectif : Un PDF déposé ou importé devient un document dont chaque page est une page RoomBoard à fond `pdf-page` ; on annote par-dessus, et on exporte les pages RoomBoard en PDF vectoriel et le PDF annoté (texte et vecteurs d'origine conservés).
Avancement : 11/13 tâches terminées
Étage : 3 (vague 5) — depuis 2026-11-20 17:30
Tâche : T10, T13 — vague 5 — depuis 2026-11-20 17:51
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c12-pdf   Branche : feat/usage-c12-pdf   Base : origin/main @ 1a756bd
Branche principale locale au lancement : 1a756bd
Cadrage : docs/plans/usage-c12-pdf-cadrage.md   Plan(s) : docs/plans/usage-c12-pdf-PLAN.md

## Référence
Complète (origin/main @ 1a756bd, verifier.sh --e2e) : OK · module principal 1 074 713 o · formats 859 580 o

## Compteurs
contre-relecture cadrage 1/2 (8 à corriger, 0 bloquant ; corrections portées dans les briefs et le plan) · relecture plan 0/3 (sautée, voir choix) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table complète : docs/plans/usage-c12-pdf-PLAN.md (9f20988, 13 tâches, 39 lignes Réutilise ; lot a : T1-T6, T8, T9 ; lot b : T7, T10 ; lot c : T11-T13).
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 cœur backdrop.page | terminée | 1/3 | a2580d5 | cargo core 344 ok, wasm 1 078 179 o |
| T3 pdf.js | terminée | 1/3 | 0860b09 | pdf-render 8/8, licences OK |
| T4 tuiles | terminée | 1/3 | 77fb86b | pdf-tiles 13/13, tsc 0 |
| T6 surfaces | terminée | 1/3 | 2bb6f72 | 535/535 |
| T2 contrat TS | terminée | 1/3 | 4cdb361 | src/core 373/373 |
| fusion origin/main (C6a) | terminée | — | 694cc93 | cargo 0 échec, web 1 885/1 885, tsc 0, wasm 1 084 202 o |
| T5 rendu du fond | terminée | 1/3 | cdaa6f6 | src/engine 651/651, tsc 0 |
| T7 export annoté | terminée | 1/3 | bfce30c | pdf-export+overlay 18/18, tsc 0 ; revue : contrat ≠ plan 9f20988 (code fait foi), défauts du repli confiés à T9 |
| T8 espace de travail | terminée | 1/3 | 6f8631d | src/app+src/ui 443/443 |
| T12 enregistreur | terminée | 1/3 | 3c6a0fe | record-ctx 10/10 (attribution corrigée) |
| T9 branchement | terminée | 1/3 | 02e68e1 | pnpm -r test 1 947/1 947, hors ligne OK, aucun .mjs ; corrige 4 défauts du repli (pdf-export) |
| T11 krilla | terminée | 1/3 | 64a3947 | formats 53 tests (10 pdf), clippy/fmt 0, module formats 3 092 294 o (plafond 3 145 728) |
| T10 essai e2e | en cours | 1/3 | — | — |
| T13 vectoriel | en cours | 1/3 | — | — |

## Terminé quand
(a) importeur PDF + backdrop pdf-page, (b) export PDF annoté, (c) export vectoriel krilla · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste PDF (3 pages, annoter, exporter annoté, relire, enregistrer, rouvrir) · capture d'un PDF annoté dans docs/essais/ · PR mergée par fusion locale --no-ff et push sans --force

## Hypothèses à revoir
17 au cadrage, dont 7 de niveau 1 (cadrage § hypothèses). Scénarios S1 (geste e2e complet), S2 (chiffré, >500 pages, 120 Mo), S3 (net à 400 %, Ctrl+Z), S4 (compatibilité, insertion, octets stables), S5 (vectoriel krilla).

## Hors périmètre
—

## Portes
ouvertes : — · passées : — (profil « Porte avant merge : non » ; aucune release)

## Pièges trouvés
- T7 construit sur le plan 2e1b9be, avant la révision 9f20988 : le contrat du code (rasterPage, alive, rasterized, null) fait foi ; T9 et T13 s'y alignent.
- T12 avait signé « Claude Sonnet 5.5 » : messages corrigés par rebase local avant fusion ; brief commun précisé.
- main a bougé pendant le chantier : C6a fusionné (0dd7f1a). À intégrer dans feat/usage-c12-pdf avant la clôture.
- OD84 (C6a pot, feat/usage-c6a-pot) tourne en même temps : barre et cible du pointeur. Intégrer origin/main avant fusion.

## Choix tranchés seul
- Cadrage autonome (Jérôme absent, brief OD85 : « tranche seul »).
- Contre-relecture du cadrage et rédaction du plan menées en parallèle ; corrections du cadrage portées dans le plan et les briefs, pas réécrites dans le cadrage (borne de 4 h).
- Relecture du plan sautée : la vague 1 part sur les sections écrites ; la double relecture de fin reste.
- PF20 : PDF lisible par pdf.js mais refusé par pdf-lib → page sortie en image sous l'annotation, avec avis.
- Places du jeton : 4 par sujet.
- Q1 de Jérôme : un fichier déposé ou ouvert s'ouvre dans un nouvel onglet, sans menu.

## Constats d'architecture
—

## Notes du coffre à poser
—
