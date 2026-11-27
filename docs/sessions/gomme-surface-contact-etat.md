# État — gomme-surface-contact

Statut : en cours — PR
Gabarit : chantier
Objectif : Une paume, un poing ou plusieurs doigts serrés posés sur le tableau passent tout seuls à une gomme de la taille du contact, puis l'outil d'avant revient au lever.
Avancement : 12/12 tâches terminées
Étage : 4 — depuis 2026-11-27 20:20
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/gomme-surface-contact   Branche : feat/gomme-surface-contact   Base : origin/main @ 53a14b6e
Branche principale locale au lancement : 59b75db0
Cadrage : docs/plans/gomme-surface-contact-cadrage.md   Plan(s) : docs/plans/gomme-surface-contact-PLAN.md

## Référence
Complète (origin/main @ 53a14b6e, `verifier.sh --e2e`) : OK — cargo 1495 · web 4043 (195 fichiers) · CLI 282 · e2e OK
Wasm à 53a14b6e : principal 1 429 754 o (plafond 1 572 864) · formats 2 794 527 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | worktree | subagent | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|----------|------|--------|---------------------|----------------|
| T1 | — | partagé | implementeur-tdd | terminée | 1/3 | 7a680d53 | contact 7 OG25 |
| T2 | T1 | partagé | implementeur-tdd | terminée | 1/3 | 24eaef29 | sampler 32 |
| T3 | — | --T3 | implementeur-tdd | terminée | 1/3 | 7d521e57 | 191 (7 OG25) |
| T4 | T1,T2,T3 | partagé | concepteur-critique | terminée | 1/3 | 6c9d4cea | router 51 (23 OG25) |
| T5 | — | --T5 | implementeur-tdd | terminée | 1/3 | 2252e0de | 28 (7 OG25) |
| T6 | T3,T4,T5 | partagé | implementeur-tdd | terminée | 1/3 | d32a9ef7 | board-session 67 |
| T7 | T5,T6 | partagé | implementeur-tdd | terminée | 1/3 | 1ce88ab6 | 101 (4 OG25) |
| T8 | T5 | partagé | implementeur-tdd | terminée | 1/3 | ede73c90 | 160 (6 OG25) |
| T9 | T1-T8 | partagé | implementeur-tdd | terminée | 1/3 | 05e8a72e | essai 52 ok, verifier e2e OK |
| T10 | relecture 3.8 | --T10 | implementeur-tdd | terminée | 1/3 | cd987e58/aab373de | 1079 tests ciblés, essai OK |
| T11 | T10 (simplification) | --T10 | implementeur-tdd | terminée | 1/1 | eb44b2c6 | aucun test modifié |
| T12 | relecture correctifs | --T12 | concepteur-critique | terminée | 1/3 | 68b3aa43 | engine/input 180, essai 52 ok |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `verifier.sh --e2e` OK · scénarios S1…Sn réussis · PR fusionnée dans main par fusion locale `--no-ff`

## Hypothèses à revoir
- (revue T4) une paume posée loin d'un trait au doigt en cours (autre personne) avorte ce trait et ouvre la gomme au centre du groupe : pas de distance pour un contact large (déc. 12). Réversible.

## Rapport
- Référence complète à 53a14b6e : cargo 1495 · web 4043 · CLI 282 · e2e OK.
- v1 (6d53ccdc) : verifier.sh --e2e OK. v2 (73cf116d, avec main b0b8dbdd) : OK — cargo 1523 · web 4293 · CLI 284. v3 : voir PR.
- Relectures : cadrage (3 bloquants corrigés), plan (1), revue T4 (2 minor corrigés), fin de lot 3 relecteurs (2 major, 8 minor, 2 simplifications), correctifs tour 1 (3 major corrigés en T12), tour 2 = T12.
- Amendements A-1 à A-6 écrits au cadrage.

## Hors périmètre
- Essai sur un vrai écran tactile (pas sur la VM).

## Portes
ouvertes : — · passées : —
