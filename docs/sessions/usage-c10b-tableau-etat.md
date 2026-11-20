# État — usage-c10b-tableau

Statut : en cours
Gabarit : chantier
Objectif : On fusionne et on divise des cellules d'un tableau, on pose un ombrage révélable sur une cellule, on colle un tableau HTML qui devient un tableau RoomBoard, et on importe un fichier Excel en valeurs.
Avancement : 14/14 tâches terminées
Étage : 4 — depuis 2026-11-20 15:15
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c10b-tableau   Branche : feat/usage-c10b-tableau   Base : origin/main @ 425d617, puis origin/main @ 98bf320 (C7b) fusionné en c4db861
Branche principale locale au lancement : 425d617
Cadrage : docs/plans/usage-c10b-tableau-cadrage.md   Plan(s) : docs/plans/usage-c10b-tableau-PLAN.md

## Référence
Complète (origin/main @ 425d617) : verifier.sh OK · module principal 953 883 o · formats 385 454 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 cœur zones, ImportTable | terminée | 1/3 | 96234a8 | core 281 ok |
| T2 cœur fusionner/diviser/ombrer | terminée | 1/3 | 4172e0e | core 292 ok, wasm table ok |
| T3 formats .xlsx (calamine) | terminée | 1/3 | b75d6be | sheet 10 ok + essai réel ~/telechargements-roomboard ok |
| T4 contrat TS | terminée | 1/3 | 021ede1 | src/core 261/261 (wasm reconstruit) |
| T5 collage HTML | terminée | 1/3 | c2c3985 | 15 ok |
| T6 géométrie zones | terminée | 1/3 | ba4f9bd | 103 ok |
| T7 liaison Wasm | terminée | 1/3 | 31b5e0b | web 1 456/1 456 |
| T8 outil Tableau | terminée | 1/3 | ab99fea | 117 ok |
| T9 dessin, révélation | terminée | 1/3 | cda13f8 | 84 ok |
| T10 import Worker | terminée | 1/3 | 045be2b | platform 226 ok |
| T11 branchement | terminée | 1/3 | 2cd2958 | web 1 456/1 456, tsc 0 |
| T12 essai navigateur | terminée | 1/3 | fe908dd | verifier.sh --e2e OK, capture |
| T13 correctifs de relecture | terminée | 1/3 | 75a8eef | web 1 470/1 470 |
| T14 simplification du lot | terminée | 1/1 | caa6f23 | web 1 470, diff des tests vide |
| fusion origin/main (C7b) + barre | terminée | — | 129a232 | cargo 0 échec, web 1 574/1 574, verifier.sh --e2e OK |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture tableau fusionné + ombrage dans docs/essais/ · PR mergée par fusion locale --no-ff et push sans --force

## Scénarios et captures
S1 à S4 joués par `scripts/essais/c10b-tableau-navigateur.mjs` dans `verifier.sh --e2e` (sha 129a232) : C10b tableau : OK. S5 (cas du cœur) : tests Rust et vitest.
Capture `docs/essais/c10b-tableau-fusion-ombrage.png` : tableau 4 × 3, « Lundi » fusionné sur deux colonnes sans trait intérieur ; troisième colonne ombrée, hachures bleu-gris ; barre à trois lignes.

## Hypothèses à revoir (niveau 1 d'abord)
HB-1 à HB-12 de niveau 1 (cadrage § hypothèses) ; HB-13 plafonds (2 000 caractères sans source ; somme décompressée 256 Mio choisie en T13) ; HB-23 Worker sous la CSP de la coque non essayé ; HB-24 seuil de 8 px au doigt à essayer.

## Hors périmètre
- Objets dans une cellule ; Word/PowerPoint (C16) ; formules et mise en forme Excel ; `.xls`/`.ods`/`.csv`.
- `cellRect`/`cellInnerBox` appellent encore `mergeAt` par cellule (coût à un 64 × 64 très fusionné, non mesuré).

## Portes
ouvertes : — · passées : — (aucune porte avant merge au profil ; aucune release)

## Pièges trouvés
- Sur la VM, la notification de fin d'une commande de fond n'a pas réveillé plusieurs agents (T1, T4, T12) : briefs passés au premier plan.
- Le `.wasm` copié dans un worktree de tâche est celui de la référence : le contrat sur vrai module exige une reconstruction après une tâche du cœur.
- T3 : `zip` pris par `roomboard_core::format::zip` (un test du conteneur interdit une dépendance propre).
- C7b + C10b ensemble : la barre passait sur 4 lignes (scène 610 px < 640). Correction : boutons des rangées Tableau et Format resserrés (`rb.css`), « Retirer l'ombrage » → « Désombrer » ; scène 658 px.

## Choix tranchés seul
- Cadrage autonome ; un tour de contre-relecture, un tour de relecture du plan (budget de 5 h).
- Places du jeton : 5 par sujet.
- T13 : somme décompressée bornée à 256 Mio ; délai d'arrêt du Worker de 60 s.
- Intégration de main par fusion (la branche était poussée : pas de rebase forcé).
- Barre : resserrement CSS + libellé « Désombrer » plutôt que masquer la rangée Format (DAR4 de C7b l'interdit).

## Constats d'architecture
—  (les deux constats notés en route sont corrigés par T14)
