# État — design-l4

Statut : en cours
Gabarit : chantier (9 tâches ; cadrage fait sous la borne courte, complet, non rouvert)
Objectif : Donner à RoomBoard une barre d'annotation propre à chaque profil, une bascule Dessin / Souris qui montre l'état présent, un bouton « nouvel onglet », l'avis « envoyé au tableau » et un cadre violet désactivable, aux jetons et icônes du lot L1.
Avancement : 9/9 tâches terminées
Étage : 4 — depuis 2026-11-25 10:30
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l4   Branche : feat/design-l4   Base : origin/main @ 136cbbb
Branche principale locale au lancement : 136cbbb
Cadrage : docs/plans/design-l4-cadrage.md   Plan(s) : docs/plans/design-l4-PLAN.md

## Référence
Complète (origin/main @ 136cbbb, verifier.sh --e2e) : OK — cargo 1356 (8 ignorés) · web 3294 · cli 263 · e2e OK
Wasm avant : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — mesurés à la référence

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | fichiers (abrégés) | worktree | état | essais | commit vert | preuve rejouée |
|----|--------|--------------------|----------|------|--------|-------------|----------------|
| T1 | — | toolbar.ts, profil figé avant L4 | isolé | terminée | 1/3 | d4dd25c | vague 1 : 11 fichiers 285 tests, tsc 0 |
| T2 | — | annotation.ts, port, fake, tauri, page, frame | isolé | terminée | 1/3 | ecdef03 | idem ; revue immédiate 0 bloquant |
| T3 | — | device-settings.ts, SettingsPanel | isolé | terminée | 1/3 | cb136f2 | idem |
| T4 | T2 | ui/toast.ts, Toasts.tsx, port | isolé | terminée | 1/3 | 67e1c06 | vague 2 : 8 fichiers 105 tests, tsc 0 |
| T5 | T1,T2 | PointerSwitch, Toolbar, icons (48), rb.css | isolé | terminée | 1/3 | c2defd9 | idem ; revue immédiate 0 bloquant, 5 mineurs |
| T6 | T1,T2,T5 | profils, App, main, ProfileEditor | isolé | terminée | 1/3 | 49377e9 | suite web 3357, 0 échec |
| T7 | T3,T4,T6 | App, main, rb.css (+ mineurs T5) | isolé | terminée | 1/3 | 900a79e | App+rb-css 73 |
| T8 | T7 | essai design-l4, c11a/c11b, verifier.sh, fiches | isolé | terminée | 1/3 | 9b1a1fd | verifier --e2e (rejeu) |
| T9 | T8 | 7 PNG docs/essais/design-l4-* | isolé | terminée | 1/3 | ef711f3 | PNG lus |

Corrections des relectures passées aux briefs : T4 largeur de bordure ; T6 titres « design-l4 T6 : », profile-edit.test.ts:78 ; T7 box-sizing du bandeau, focus des boutons pleins, survol du segment ; T8 rouge vu sur la base 136cbbb.

Fin de lot : correctif 1 (499fbde, 8bd639b ; simplification 6305daa, aucun test touché) ; correctif 2 (b598c0a : régression C5 du liseré des pastilles, géométrie d'avant rendue, couleur aux jetons).

## Rapport
- verifier.sh --e2e sur b598c0a : OK (journal ~/.cache/tmp/of48-rej/verifier-3.log) — cargo 1356 (8 ignorés, 0 échec) · web 3370 (réf. 3294) · cli 263 (réf. 263) · C1, C11a, C11b, design L1, design L4 : OK.
- Wasm après : principal 1 375 581 o · formats 2 794 511 o (inchangés).
- Netteté § 10 : bord du Rectangle 0 pixel intermédiaire ; 0 frange (segment, Envoyer, zone, pastille, bandeau, page N) ; calage 15 icônes barre d'annotation, 1 bandeau ; contre-épreuve 4 pixels intermédiaires.
- Scénarios S1 à S6 : réussis (essai design-l4 + vitest « design-l4 T6 : » 11 tests). Captures : docs/essais/design-l4-*.png (refaites après le correctif des pastilles).
- Double relecture (conformité, qualité A, qualité B, rendu impeccable) : 0 bloquant ; relecture du correctif 1 : 2 majeurs corrigés au correctif 2 ; constats d'architecture : 2 écrits (apps/web/src/ui, apps/web/src).
- Release due : non (aucune release sans go ; pas de tag). CLI non touchée. Graphe : pas de graphify-out dans le dépôt.
- Conditions de merge : origin/main @ 136cbbb (point de retour) · aucun bloquant ouvert · aucune tâche bloquée · aucune baisse de suite · aucun test retiré ni sauté · scénarios réussis · CI : aucune dans ce dépôt (pas de .github) · fusion locale --no-ff demandée par le brief OF48.

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · tests : barre d'annotation en annotation, première barre sinon · ligne C11b-1 « cadre absent de l'image envoyée » · recadrages 100 % comparés à la maquette 02, écarts justifiés · contrôle de netteté § 10 · liste des gestes c11a à rejouer en coque · PR fusionnée par merge local --no-ff

## Hypothèses à revoir
19 au cadrage (niveau 1 : H1 Stylo dans la barre d'annotation, data-item sur le segment inactif, H3 bouton accolé « plus », cadre autour de la zone d'annotation, bandeau 4 s, Dessin revient au dernier outil, barre du tableau perd Souris et Écran suivant, H8 pastilles en fin de barre, H9 sortie par l'icône annotate, H12 Simple à deux colonnes sous 960 px de haut, H18 profil exporté lu par une version d'avant L4, H19 gomme partielle gardée).
Scénarios : S1 barre d'annotation · S2 profil sans elle · S3 cadre désactivable · S4 envoi (bandeau, bouton accolé) · S5 netteté · S6 profil Simple en colonne.

## Hors périmètre
- L2 îlots flottants, L3 éditeur de profils en panneau, L5 icône de l'app.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties (cadrage) : essais c11a/c11b à retoucher en forme (ids uniques, avis modal devenu bandeau) ; settings du moteur non persistés → device-settings.ts sur localStorage ; « première barre » = première barre tools, aussi dans main.ts.
- CARGO_TARGET_DIR partagé entre worktrees : chaque commande cargo du chantier pose CARGO_TARGET_DIR=<worktree>/target.

## Notes du coffre à poser
4 notes (journal, deux décisions NNNN, segment de la ligne 21 de la fiche) : texte complet dans la description de la PR.
