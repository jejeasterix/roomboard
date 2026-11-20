# État — usage-c7b-texte-riche

Statut : en cours
Gabarit : chantier
Objectif : On écrit dans un texte et dans les cellules d'un tableau avec une saisie riche qui respecte l'IME, et une barre pose gras, italique, souligné, taille et couleur sur la sélection.
Avancement : 16/16 tâches terminées
Étage : 4 — depuis 2026-11-20 14:18
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c7b-texte-riche   Branche : feat/usage-c7b-texte-riche   Base : origin/main @ 425d617
Branche principale locale au lancement : 425d617
Cadrage : docs/plans/usage-c7b-texte-riche-cadrage.md   Plan(s) : docs/plans/usage-c7b-texte-riche-PLAN.md

## Référence
Rapide : couverte par la complète
Complète (origin/main 425d617, verifier.sh --e2e) : OK (code 0)

## Compteurs
contre-relecture cadrage 1/2 (aucune bloquante, 11 corrigées) · relecture plan 1/3 (partielle, T5-T11 tiennent ; critère T10 corrigé dans le brief ; T12-T15 non couverts) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan : 15 tâches, 6 vagues. Fusionnées dans feat/usage-c7b-texte-riche, preuves rejouées par l'orchestrateur :
T1 (core 314 ok) · T2 (23) · T3 (8) · T4 (coque-csp OK) · T5 (core 324 ok) · T6 (core TS 268) · T7 (16) · T8 (184) · T9 (44) · T10 (31) · T11 (211) · T13 (app+ui 335, tsc vide) · T15 (check( 64/58/12 inchangés)
T12 (wasm spans 5, src/core réel 280) · T14 (essai C7b 43 ok, 2 captures) · T16 correctif + simplification (core, wasm, src/core+src/app 458, tsc vide).
Choix d'orchestration : relecture du plan menée en parallèle de la vague 1 (borne de 5 h) ; revues immédiates des tâches concepteur-critique remplacées par la double relecture de fin.

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · captures dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et poussée

## Scénarios et captures
S1 texte et cellule mis en forme, enregistrés, rouverts · S2 annulation en une étape · S3 IME (dont Ctrl+B puis composition) · S4 collage texte simple · S5 compatibilité socle et écritures concurrentes (reste OD71) · S6 mise en forme seule dans une cellule existante
Cadrage : 26 décisions, 13 hypothèses (6 de niveau 1), 24 lignes « Modules à réutiliser » (3 nouveaux).

## Hypothèses à revoir (niveau 1 d'abord)
HC7b-1 `<textarea>` retiré partout (texte et cellules) : U27 le gardait pour le texte simple, DAC3 plus récente prévoit le remplacement · HC7b-2 annulation en deux temps (historique local pendant la saisie, une seule commande à la validation) · HC7b-3 barre : rangée « Format » (G, I, S, 24/36/48/72, Défaut, Noir, Rouge, Bleu, Vert), visible selon l'outil, grisée hors séance · HC7b-4 Ctrl/Cmd+B/I/U · HC7b-5 format en attente au curseur · HC7b-6 collage en texte simple seulement, dépôt refusé dans la zone. Niveau 2 : voir le cadrage (7 autres).

## Hors périmètre
- IME réelle par plateforme (iPad, Android) : essai de Jérôme.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : cellules pas riches côté vue/rendu ; FormatText après SetText = plusieurs étapes d'annulation (d'où champ `spans`) ; s34, s5b, c10a lisent le textarea.
- Chantier parallèle OD80 (C10b) sur table.rs, commands.rs, lib.rs, api.ts, fake-core.ts, wasm-core.ts, table-geom.ts, table-paint.ts, canvas2d.ts, tools/table.ts : à relire avant le rebase (ajouter `spans: None` à ses SetTableCell).

## Constats d'architecture
— (passés dans docs/architecture-constats.md : 1 fermé coqueCsp, 1 ajouté CellTextBox ; zone crates/roomboard-core à 3 ouverts : audit proposé)

## Rapport
- Scénarios : S1 (essai C7b : texte « Le chat noir », chat gras rouge par la barre ; cellule « aa » + Ctrl+B + « a » ; Total gras ; Ctrl+S, Ctrl+O, relus identiques) · S2 (Ctrl+Z en une étape dans la zone puis hors zone) · S3 (CDP imeSetComposition, Ctrl+B puis « に ») · S4 (collage text/html+text/plain : seul « xy » simple, Ctrl+Z en une étape) · S5 (tests cœur, mêmes octets avec segments sans attribut) · S6 (SetText/SetTableCell format seul, une étape) : réussis.
- Captures : docs/essais/c7b-texte-riche.png (« Le chat noir », chat gras rouge, rangée Format grisée hors séance) ; docs/essais/c7b-cellule-riche.png (cellule « aにaaTotal », « にa » et « Total » gras, rangée Format active).
- Reste OD71 mesuré : première écriture concurrente dans une cellule absente : une seule reste (« Lundi » gardé, « Mardi » perdu, dans les deux ordres) ; deux mises en forme de mots différents restent ; deux frappes dans un même texte restent. Non tranché (changerait le modèle de cellule).
- Double relecture : 0 blocker, 0 major. Corrigé en T16 : domaine de size (1e39 bloquait toute frappe) + 5 simplifications. Mineurs non corrigés : essai sans noOverlap ni mesure de #stage à l'ouverture de la cellule ; S3 « にほん » sur texte gras rouge joué seulement en unitaire ; rich-dom offsetOf compte mal un <br> de fin de bloc créé par le navigateur (cas rare) ; changed() publié deux fois par frappe ; repli beforeinput insertFromPaste sans test ; branche table.rs:435 sans test ; differing alloue par caractère.
- La rangée Format passe sur une 3e ligne à l'outil Texte (scène 706 → 658 px, ≥ 640) ; immobile pendant la séance.
- Release : non due (aucune release sans go, aucun tag).
