# État — usage-c2-depot

Statut : en cours
Gabarit : chantier
Avancement : 12/12 tâches terminées
Objectif : Le reste de C2 est fusionné dans `main` : on peut déposer, coller ou importer une image sur la page ; elle s'affiche, se déplace, s'enregistre dans le `.roomboard` et se rouvre ; un `.roomboard` déposé s'ouvre dans un nouvel onglet ; `scripts/verifier.sh : OK`.
Étage : 4 (PR et fusion locale) — depuis 2026-11-20 07:45
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
contre-relecture cadrage 1/2 (0 bloquant, 6 importants corrigés ; coupes : Worker → codec dans la page, fond non dessiné, en-têtes PNG/JPEG) · relecture plan 1/3 (1 bloquant workspace.test plainFile : repli blob.slice dans T3 ; FSA pick sans lecture : T5 dd40d2b ; lecture complète par la coque d'un fichier non reconnu : hypothèse à revoir) · double relecture de fin 2 tours (tour 1 : conformité 0 bloquant 1 important, qualité 1 bloquant (Blob adossé au disque) → T11 ; tour 2 : 0 bloquant, 3 importants → T12) · revue immédiate T2 non faite (temps), T7 0 bloquant (mineurs → T10) · vagues sans progrès 0/2

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
| T9 essai navigateur | T6-T8 | --T9 | terminée | 1/3 | 24825f4 | verifier.sh --e2e OK sur b87b31c (C2 image : OK) |
| T10 correctifs revue T7 | T7 | --T10 | terminée | 1/1 | 50e650c | workspace 37 ok |
| T11 correctifs relecture finale | T1-T10 | --T11 | terminée | 1/1 | 59e5ae8 | verifier.sh --e2e OK sur b87b31c |
| T12 correctifs second tour | T11, T9 | --T12 | terminée | 1/1 | 310b18e | import 46 ok ; verifier.sh --e2e final |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh (et --e2e si geste ajouté) OK · capture dans docs/essais/ · PR ouverte avec ## Preuve · fusion locale --no-ff dans main poussée sans --force

## Rapport
- verifier.sh --e2e : OK sur b87b31c (/tmp/c2d-final.log) : web 1037 tests, licences 74 crates + 135 npm (1 exception : caniuse-lite CC-BY-4.0), module Wasm 917 469 o (budget 1 572 864 inchangé), module formats 385 454 o, S5b OK, C2 image OK. Rejeu final sur bd9ed22 : /tmp/c2d-final2.log.
- Scénarios (essai navigateur c2-image-navigateur.mjs) : S1 dépôt + Ctrl+Z/Ctrl+Y ; S2 déplacement et poignée ; S3 assets/<sha256>.png = PNG déposé, pixels sombres rouverts, mêmes octets sur deux enregistrements du même onglet (après réouverture seul document.ybin diffère : encodage yrs) ; S4 .roomboard déposé → nouvel onglet avec l'image ; S5 collage, Importer, .tif et > 100 Mo refusés.
- Capture docs/essais/c2-image-deposee.png : onglet « image.roomboard » rouvert, rectangle sombre (l'image déposée, redimensionnée) sur la page blanche, bouton « Importer » dans la barre.
- Coupes tranchées par l'orchestrateur : Worker remplacé par un codec dans la page (import() paresseux) en attendant un essai WebView ; fond (backdrop) non dessiné (C4/C11b) ; en-têtes lus pour PNG et JPEG seulement.
- Hypothèses niveau 1 (cadrage) : HR6 mémoire du codec gardée jusqu'au rechargement ; HR17 onglet ouvert sans images refuse Enregistrer ; point et taille d'insertion ; Importer de la coque par dialog + fs (non essayé sans build Tauri) ; crates de src-tauri non contrôlés (HR11).
- Constats d'architecture : 2 écrits (apps/web/src/app 1, apps/web/src/platform 1), aucune zone à proposer.
- Hors périmètre consigné : cache des bitmaps sans éviction ; WKWebView et imageOrientation non essayés ; Unlicense / MIT-0 acceptés seuls par controle-licences (permissifs, U39 interdit seulement le copyleft).
- Release : non due (brief OD56 : aucune release, aucun tag).

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
