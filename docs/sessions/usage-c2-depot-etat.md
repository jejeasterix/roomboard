# État — usage-c2-depot

Statut : en cours
Gabarit : chantier
Avancement : 9/10 tâches terminées
Objectif : Le reste de C2 est fusionné dans `main` : on peut déposer, coller ou importer une image sur la page ; elle s'affiche, se déplace, s'enregistre dans le `.roomboard` et se rouvre ; un `.roomboard` déposé s'ouvre dans un nouvel onglet ; `scripts/verifier.sh : OK`.
Étage : 3 — depuis 2026-11-20 06:40
Tâche : T9 — essai navigateur C2, capture — depuis 2026-11-20 07:13
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c2-depot   Branche : feat/usage-c2-depot   Base : origin/main @ 3057e29 (avancée en ff à 06:00 : C9 fusionné, PR #12)
Branche principale locale au lancement : 783aaff
Cadrage : docs/plans/usage-c2-depot-cadrage.md   Plan(s) : docs/plans/usage-c2-depot-PLAN.md
Arrêt ferme : 2026-11-20 10:38 (mise à l'abri à 10:28)
Brief : OD56 (ouvrier CLI, nuit, Jérôme dort : choix tranchés seuls et écrits ; mode de cadrage autonome)

## Référence
Complète (origin/main 783aaff, verifier.sh) : OK (/tmp/c2d-ref.log)
Vague 1 (e1b245b, T2-T5) : verifier.sh OK, web 1012, module formats 395 193 o (/tmp/c2d-v1.log)
Vague 2 (25122db, T1-T8) : verifier.sh OK (/tmp/c2d-v2.log)

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 6 importants corrigés ; coupes : Worker → codec dans la page, fond non dessiné, en-têtes PNG/JPEG) · relecture plan 1/3 (1 bloquant workspace.test plainFile : repli blob.slice dans T3 ; FSA pick sans lecture : T5 dd40d2b ; lecture complète par la coque d'un fichier non reconnu : hypothèse à revoir) · revue immédiate T2 non faite (temps), T7 0 bloquant (mineurs → T10) · vagues sans progrès 0/2

## Tâches
| id | dépend | worktree | état | essais | commit vert | preuve rejouée |
|----|--------|----------|------|--------|-------------|----------------|
| T1 lecture bornée | — | --T1 | terminée | 1/3 | 8788306 | core format 27 ok, oversized_document_is_corrupt |
| T2 second module Wasm | — | --T2 | terminée | 1/3 | 7e34add | verifier.sh v1 OK, module formats 395 193 o |
| T3 registre d'import | — | --T3 | terminée | 1/3 | 8355312 | verifier.sh v1 OK |
| T4 rendu des images | — | --T4 | terminée | 1/3 | c35f5f9 | verifier.sh v1 OK |
| T5 hôtes, contrôleur | — | --T5 | terminée | 1/3 | dd40d2b | verifier.sh v1 OK |
| T6 licences | T2 | --T6 | terminée | 1/3 | 8524c2e | controle-licences 10 cas OK, 74 crates 135 npm |
| T7 espace de travail | T2-T5 | --T7 | terminée | 1/3 | f476f7a | verifier.sh v2 OK ; revue 0 bloquant |
| T8 barre Importer | T5 | --T8 | terminée | 1/3 | 9a02945 | verifier.sh v2 OK |
| T9 essai navigateur | T6-T8 | --T9 | en cours | 1/3 | — | — |
| T10 correctifs revue T7 | T7 | --T10 | terminée | 1/1 | 50e650c | workspace 37 ok |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh (et --e2e si geste ajouté) OK · capture dans docs/essais/ · PR ouverte avec ## Preuve · fusion locale --no-ff dans main poussée sans --force

## Hors périmètre
- C9 (feat/usage-c9-grille, OD48) : ni sa branche ni son worktree.
- roomboard-prive ; build Tauri ; build Android.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Agent qui attend la notification du jeton puis ne se réveille pas (T1, T8) : relance par SendMessage.
- tsc --noEmit échoue (TS2307) tant que les modules Wasm ne sont pas construits dans le worktree : normal hors verifier.sh.

## Hypothèses à revoir (orchestrateur)
- HO1 : dans la coque, un fichier non reconnu déposé est lu en entier avant d'être refusé (relecture du plan, important 1) ; borne : aucune ; à revoir avec un `head(n)` sur `DroppedFile`.
- HO2 : revue immédiate de T2 (concepteur-critique) remplacée par la double relecture de fin (temps de nuit borné).
