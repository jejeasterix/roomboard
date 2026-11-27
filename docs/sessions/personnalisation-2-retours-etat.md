# État — personnalisation-2-retours

Statut : en cours
Gabarit : chantier (14 tâches, lots A T1-T9 et B T10-T14)
Objectif : Le panneau d'options de RoomBoard range ses sections en accordéon et donne à Jérôme couleurs avancées et transparentes, pression du stylo, organiser, aligner, transformer, dupliquer, « Glisser une copie » et des options propres à chaque type d'objet (image : rogner, effacer le fond).
Avancement : 3/14 tâches terminées
Étage : 3 (vague 2) — depuis 2026-11-27 19:40
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-2-retours   Branche : feat/personnalisation-2-retours   Base : origin/main @ cddbde49
Branche principale locale au lancement : cddbde49
Cadrage : docs/plans/personnalisation-2-retours-cadrage.md   Plan(s) : docs/plans/personnalisation-2-retours-PLAN.md

## Référence
Complète (origin/main cddbde49, verifier.sh --e2e) : OK · cargo 1523 · web 4218 (200 fichiers) · cli 284 · essais « ok — » 1639
Tailles Wasm avant : principal 1 440 761 o · formats 2 794 527 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 | — | preuve en rejeu | 2/3 (limite de tours) | 2c4089d6 | clippy 0 ; Wasm principal 1 464 837 o |
| T2 | — | terminée | 1/3 | 2246626c | vitest 47 (sectionOpen, 4 pastilles) |
| T3 | — | terminée | 1/3 | cb7513b7 | vitest 44 (arrangeKey AZERTY et QWERTY) |
| T4 | T1,T3 | à faire | | | |
| T5 | T2 | terminée | 1/3 | 69980306 | vitest src/ui 802 (43 fichiers) |
| T6 | T3,T4 | à faire | | | |
| T7 | T5,T6 | à faire | | | |
| T8 | T7 | à faire (coupée en premier si le temps manque) | | | |
| T9 | T4,T8 | à faire | | | |
| T10–T14 | lot B | à faire | | | |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK sans régression · scénarios réussis · captures 2x avant/après · PR fusionnée par merge --no-ff local, push sans --force

## Arrêt ferme
Lancement 18:45 CET · borne 01:15 · repli à 01:05 (pousser, état, premier lot cohérent si tout ne tient pas)

## Hypothèses à revoir
- Enveloppe Wasm du chantier (cadrage : +20 000 o) portée à +32 000 o (≤ 1 472 761 o) : T1 seul fait +24 076 o ; le plafond fixe de 1 572 864 o reste intact. Prise par l'orchestrateur.
- Contre-relecture du cadrage : un seul tour (aucun bloquant au tour 1), pour le temps.
- Relecture du plan : un tour, lancée en parallèle de la vague 1 (aucun défaut ne touchait T1 et T3 ; B1 corrigé avant T5).

## Hors périmètre
- Édition des points des formes et des flèches, connecteurs (OG12) : section réservée dans l'accordéon.

## Portes
ouvertes : — · passées : —
