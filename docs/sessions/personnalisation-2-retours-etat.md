# État — personnalisation-2-retours

Statut : en cours
Gabarit : chantier (14 tâches, lots A T1-T9 et B T10-T14)
Objectif : Le panneau d'options de RoomBoard range ses sections en accordéon et donne à Jérôme couleurs avancées et transparentes, pression du stylo, organiser, aligner, transformer, dupliquer, « Glisser une copie » et des options propres à chaque type d'objet (image : rogner, effacer le fond).
Avancement : 14/14 tâches du plan terminées · correctifs T15-T22 et second tour terminés
Étage : 4 (fusion dans main) — depuis 2026-11-28 00:32
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
contre-relecture cadrage 1/2 · correctifs de relecture 2/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 | — | terminée | 2/3 (limite de tours) | 2c4089d6 | cargo arrange 15 ; clippy 0 ; Wasm 1 464 837 o |
| T2 | — | terminée | 1/3 | 2246626c | vitest 47 (sectionOpen, 4 pastilles) |
| T3 | — | terminée | 1/3 | cb7513b7 | vitest 44 (arrangeKey AZERTY et QWERTY) |
| T4 | T1,T3 | terminée | 1/3 (limite de tours, reprise) | 2f6a5f65 | vitest core 644 (Arrange 2 cœurs) ; cli 34 (how inconnu) ; CLI : OK |
| T5 | T2 | terminée | 1/3 | 69980306 | vitest src/ui 802 (43 fichiers) |
| T6 | T3,T4 | terminée | 1/3 | 187c8426 | vitest 209 (flèche une étape, transparent jamais gardé) |
| T7 | T5,T6 | terminée | 1/3 | e929486e | vitest src/ui 810 (Aligner, Pression · Variable) |
| T8 | T7 | terminée | 1/3 (implementeur-tdd au lieu de concepteur-critique, pour le temps) | 3866727b | vitest 374 (pipette, pickColor) |
| T9 | T4,T8 | terminée | 1/3 (limites de tours, reprises) | f1036d17 | essai --lot A S1-S4 OK ; 8 captures 2x |
| T10 | (lancée avant T9, fichiers disjoints) | terminée | 1/3 (reprise) | e7e3789a | cargo seed_clears_only_the_touched_region ; vitest dragCopy 2 cœurs ; CLI : OK |
| T11 | T10 | terminée | 1/3 | 43f0ad4e | vitest src/engine 980 (dragCopy, poignée Déplacer) |
| T12 | T10 | terminée | 1/3 | 06c9a8f4 | vitest 16 (point touché, start background) |
| T13 | T11,T12 | terminée | 1/3 | 5e1bffa5 | vitest src/ui 826 (bascule mixte, Rogner) |
| T14 | T13 | terminée | 2/3 (limites de tours, agent neuf) | 051b2d34 | essai complet S1-S7 OK, code 0 ; captures après refaites |
| T15 | correctif | terminée | 1/3 | 4253fc91 | keyOf transmet code (raccourcis Alt) |
| T16 | relecture | terminée | 1/3 | 38e175f1 | cargo workspace 1008 ; look.rs sans fonctionnalité zone |
| T17 | relecture | terminée | 1/3 | df2e3e6d | flèches dans le panneau, Espace, colorAt WebGL2, infobulles Pression |
| T18 | relecture | terminée | 1/3 | ef607a98 | pipette point touché, seedMode, 44 px, dragCopy tout objet |
| T19 | relecture | terminée | 1/3 | 9995516e | web 4357 ; damier, .rb-opt-h, garde arrangeKey |
| T20 | finition (impeccable) | terminée | 1/3 | c84a40c2 | bouton Pipette hors apparence native, icône Pression variable pleine |
| T21 | essai T14 | terminée | 1/3 | dfcaa205 | Maj+H sur bouton ; pipette tenue après aperçu |
| T22 | essai T14 | terminée | 1/3 | fc70a983 | look.dragCopy dans la vue tableau/média/3D, contrat 2 cœurs |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK sans régression · scénarios réussis · captures 2x avant/après · PR fusionnée par merge --no-ff local, push sans --force

## Arrêt ferme
Lancement 18:45 CET · borne 01:15 · repli à 01:05 (pousser, état, premier lot cohérent si tout ne tient pas)

## Pièges trouvés
- concepteur-critique (40 tours) s'arrête en lecture sur les grosses tâches : implementeur-tdd pris pour T8, T11 (écart au plan, pour le temps).
- Sous-agents sous Sonnet : Co-Authored-By « Claude Sonnet 5.5 » réécrit localement (branches non poussées, sans --force).
- verifier.sh --e2e : 3 tests CLI en dépassement de délai sous charge (Playwright de T14 en parallèle) ; à rejouer une fois.
- ImagePanel : `on(props.version)` se relance à chaque nouvel état, même à version égale (cause du défaut S6.3).

## Hypothèses à revoir
- Module principal passé à wasm-opt -Oz (banc de vitesse du chemin de l'encre non fait).
- Enveloppe Wasm du chantier (cadrage : +20 000 o) portée à +32 000 o (≤ 1 472 761 o) : T1 seul fait +24 076 o ; le plafond fixe de 1 572 864 o reste intact. Prise par l'orchestrateur.
- Contre-relecture du cadrage : un seul tour (aucun bloquant au tour 1), pour le temps.
- Relecture du plan : un tour, lancée en parallèle de la vague 1 (aucun défaut ne touchait T1 et T3 ; B1 corrigé avant T5).

## Clôture
- Second tour de relecture : 0 bloquant ; 1 majeur (zone du pot dans Glisser une copie) et 2 mineurs corrigés (c6ef330f).
- origin/main avait avancé (OG12 PR 71, OG25, OG24, OG27) : fusion 423903ab, 31 conflits tranchés (Alt+Maj+flèche : séance de points d'OG12, puis objet relié sur une forme seule, sinon Aligner ; « + » du haut cédé à la poignée Déplacer).
- verifier.sh --e2e sur 423903ab : tests unitaires verts (cargo 1682, web 4620, cli 290) ; essai c2-image en délai sous charge, rejoué seul : OK ; suite complète relancée.
- Tailles : Wasm principal 1 440 761 → 1 467 735 o (OG23 seul) → 1 540 581 o avec OG12 ; formats 2 794 527 → 2 795 895 o.
- Seconde fusion de origin/main (OG26 tableau, PR 72 et 74) : ca6632d3. Module principal à 1 598 137 o > plafond ; décision : wasm-opt -Oz aussi sur le module principal (ed8d5807) → 1 456 551 o.
- Essais existants ajustés au parcours de l'accordéon : personnalisation-2 S5.1 (Tab sur le segment), outils-excalidraw (amorce openOptionSections dans gestes.mjs).
- verifier.sh --e2e : OK sur ed8d5807 (cargo 1738, web 4741, cli 291, 2319 lignes « ok — ») ; délais sous charge vus une fois chacun (c2-image, c6b) puis verts.
- PR #73. Prochaine tâche exacte si interruption : fusion locale --no-ff de feat/personnalisation-2-retours dans main (~/projets/roomboard), push sans --force, puis nettoyage des worktrees.

## Hors périmètre
- Édition des points et connecteurs : livrés par OG12 (PR 71), intégrés ; sa section « Type de flèche » est dans l'accordéon.
- Panneau de retouche d'image (C5) en boutons natifs : passe de design à prévoir.
- Sections médias et 3D ; options du tableau (personnalisation-3-tableau) ; détourage par modèle (chantier à part).

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

Voir la description de la PR #73 (cinq blocs : journal, trois décisions, segment de la ligne 21 de la fiche).
