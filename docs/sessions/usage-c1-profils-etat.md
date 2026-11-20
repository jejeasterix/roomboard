# État — usage-c1-profils

Statut : clos
Gabarit : chantier (provisoire)
Objectif : On choisit un profil, on modifie sa barre (emplacement, taille des boutons, outils, préréglages), on l'exporte et l'importe en `.rbprofile`, et on remet à zéro.
Avancement : 12/12 tâches terminées
Étage : 4 — clos le 2026-11-20 08:10
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c1-profils   Branche : feat/usage-c1-profils   Base : origin/main @ 3057e29
Branche principale locale au lancement : 3057e29
Cadrage : docs/plans/usage-c1-profils-cadrage.md   Plan(s) : docs/plans/usage-c1-profils-PLAN.md

## Référence
Rapide et complète (origin/main 3057e29) : `verifier.sh --e2e` OK · apps/web 937 tests · e2e OK

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Vagues : {T1,T2,T4} · {T3,T5,T6} · {T7,T8} · T9 · T10. Table complète en tête du plan.
| id | état | preuve rejouée (sur la branche du chantier fusionnée) |
|----|------|------------------------------------------------------|
| T1 | terminée (1/3) | vague 1 : 963 tests web, tsc 0 ; noms attendus vus |
| T2 | terminée (1/3) | idem |
| T4 | terminée (1/3) | idem |
| T3 | terminée (1/3) | vague 2 : 998 tests, tsc 0 |
| T5 | terminée (1/3) | idem |
| T6 | terminée (1/3) | idem |
| T7 | terminée (1/3) | vague 3 : 1029 tests, tsc 0 |
| T8 | terminée (1/3) | idem |
| T9 | terminée (1/3) | 1038 tests, tsc 0, build OK |
| T10 | terminée (1/3) + correctif barre verticale en colonnes | verifier.sh --e2e OK (C1 : OK) |
| T11 | terminée (correctifs relecture tour 1 : 2 major, 4 minor, 3 simplifications) | 1052 tests, e2e OK |
| T12 | terminée (correctifs relecture tour 2 : 4 minor) | 1059 tests |
Choix de l'orchestrateur : revue immédiate des tâches `concepteur-critique` (T1, T2) reportée à la double relecture de fin (temps).

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh` OK (et `--e2e`) · captures de l'éditeur et de la barre à gauche en grands boutons dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et poussée

## Hypothèses à revoir (niveau 1 d'abord)
18 hypothèses dont 6 de niveau 1 (HC1-1…HC1-6), dans le cadrage. 33 décisions P1-P33. Scénarios : S1 e2e (profil, barre à gauche grands boutons, export, remise à zéro, réimport, captures) · S2 version 1.2 et outil inconnu, 2.0 refusé · S3 modifier `defaut` puis revenir à l'origine · S4 préréglages (unitaire/composant) · S5 annotation au démarrage, repli `board`.

## Hors périmètre
- association `.rbprofile` au système ; profil par utilisateur du système ; fenêtre d'annotation (C11a).

## Portes
ouvertes : — · passées : merge par fusion locale `--no-ff` dans `main` (7da4e99, PR 14), sans porte (profil : porte avant merge non) ; aucune release

## Pièges trouvés
- Prémisses démenties : stockage écartait la copie d'un livré ; aucun préréglage affiché ; `resolveStartMode` rend toujours `board` ; pas de graphe graphify RoomBoard.
- OD56 partage `toolbar.ts`, `toolbar-profiles.ts`, `ui/App.tsx`, `main.ts`, `verifier.sh`, `verifier-e2e.test.sh`, tests toolbar : relire au rebase ; adapter `platform/profile-files.ts`.
- Modules à réutiliser : 21 lignes.

## Rapport
- Fusion de `origin/main` @ d7cff0e (PR 13, OD56) dans la branche : conflits `main.ts`, `toolbar-profiles.ts` (bouton « Importer » ajouté à `defaultToolbars()`), `verifier.sh`, `verifier-e2e.test.sh` résolus en gardant les deux.
- Preuve finale sur 55a485b : `scripts/verifier.sh --e2e` → 1160 tests web, S5b, C2 image, C1 : OK, « verifier.sh : e2e OK », « verifier.sh : OK », code 0.
- Scénarios : S1, S2, S5 (navigateur) par l'e2e C1 ; S3, S4 par tests unitaires et de composant ; parties coque en fiches manuelles (C1-1…C1-6, Windows et macOS).
- Captures : `docs/essais/c1-editeur.png` (éditeur en haut : nom, démarrage, Grands, À gauche, Gomme décochée) ; `docs/essais/c1-barre-gauche-l.png` (barre à gauche en grands boutons, trois colonnes, sans gomme, préréglages visibles, scène non recouverte).
- Double relecture : aucun blocker ; tous les major et minor corrigés en deux tours (T11, T12).
- Hypothèses niveau 1 (cadrage) : HC1-1 rangée des préréglages dans la barre ; HC1-2 éditeur en panneau sur brouillon, sans aperçu ; HC1-3 quatre remises à zéro (ce profil, tout, barres, préréglages) ; HC1-4 champs `hidden`, `basedOn`, `minor: 1` ; HC1-5 ordre par Monter/Descendre ; HC1-6 action Profil non masquable, ajoutée si absente. Plan : PC4 pas de préréglage « enfoncé », PC6 case Profil grisée.
- Constat d'architecture écrit (1) : lecture des préréglages encore manuelle dans `toolbar-host.ts:45` et `toolbar.ts:607`.
- Hors périmètre : association `.rbprofile` au système ; profil par utilisateur ; fenêtre d'annotation (C11a) ; barre verticale multi-colonnes jamais vue sous WebKit (fiche macOS C1-1) ; « Monter » qui franchit un séparateur demande parfois deux clics (P14).
- Release : non (aucune demandée, interdite par le brief).
- Choix de l'orchestrateur : revue immédiate de T1/T2 remplacée par la double relecture de fin ; contre-relecture du cadrage en un tour.
