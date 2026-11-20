# État — usage-c14-media

Statut : clos
Étage : 4 — clos le 2026-11-20 21:35
Gabarit : chantier (11 tâches, un lot)
Objectif : Une vidéo ou un son déposé devient un élément `media` sur la page montrée : lecture dans la page avec les commandes RoomBoard, rognage du début et de la fin, boucle et volume ; inclus dans le `.roomboard` jusqu'à 50 Mo, lié en coque au-delà, refusé sur le web au-delà de 100 Mo.
Avancement : 13/13 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c14-media   Branche : feat/usage-c14-media   Base : origin/main @ 9549785, puis origin/main @ d4596f7 (C5) fusionné en a2d11ff
Branche principale locale au lancement : 9549785
Cadrage : docs/plans/usage-c14-media-cadrage.md   Plan(s) : docs/plans/usage-c14-media-PLAN.md
Mode : autonome (ouvrier CLI OD87, aucune question à Jérôme : choix tranchés seuls et écrits)

## Référence
Complète (origin/main @ 9549785, verifier.sh --e2e) : OK · module principal 1 084 202 o · formats 3 092 294 o · scène pot 706 px

## Compteurs
contre-relecture cadrage 0/2 (fondue dans la relecture du plan, voir choix) · relecture plan 1/3 (1 bloquant R1 + 9 corrections, portées par T7-T11 : docs/plans/usage-c14-media-relecture-plan.md) · vagues sans progrès 0/2 · double relecture 4 relecteurs (conformité A/B, qualité A/B) : 0 bloquant, 7 major · correctifs de fin 2/2 (T12, T13)

## Tâches
Table complète : docs/plans/usage-c14-media-PLAN.md (745c669, 11 tâches, 31 lignes Réutilise ; V1 T1-T6, V2 T7-T10, V3 T11).
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 cœur media | terminée | 1/3 | 68c676c | core+wasm 0 échec (10 media + every_known_kind), src/core 415/415 (15 contrat C14), tsc 0, wasm 1 105 641 o |
| T2 coque | terminée | 1/3 | 0a43fe8 | shell 16/16, hors-ligne 23 cas, coque-csp OK, licences OK (2 exceptions ajoutées, voir choix), http-range=1 |
| T3 détection | terminée | 1/3 | 99a4c63 | 55/55 (sniffMedia 18 cas, probeMedia 7) |
| T4 liens | terminée | 1/3 | 5986c29 | platform+core+app 399/399, tsc 0 |
| T5 lecteurs | terminée | 1/3 | b86f04b | 79/79 (lecteurs C14 15), tsc 0 |
| T6 barre | terminée | 1/3 | 1b818d0 | src/ui 184/184 (MediaBar 9) |
| fusion vague 1 | — | — | 6546a15 | web 2 041/2 041, tsc 0 |
| fusion origin/main (C5) | terminée | — | a2d11ff | cargo 561/0, web 2 148/2 148, tsc 0, wasm 1 119 330 o, formats 3 099 350 o |
| T7 rendu | terminée | 1/3 | e1d9349 | src/engine 669/669 (C14 8) ; conflit C5 résolu en 5bb6e13 |
| T8 import | terminée | 1/3 | c9134c2 | 102/102 (C14 27, R1 R3 R4 R5) |
| T9 session+barre | terminée | 1/3 | 064deff | src/ui+app 493/493 (C14 16) ; conflit C5 résolu en 988bd70 |
| T10 persistance | terminée | 1/3 | 492dea2 | src/app 308/308 (C14 15, R1 R2 R9) |
| T11 essai e2e | terminée | 1/3 | 2e17d28 | essai C14 : OK ; scène 706 px ; capture |
| vérification 1 | — | — | aad3b53 | verifier.sh --e2e OK |
| T12 correctifs relecture | terminée | 1/3 | 99c6021 | web 2 210/2 210, hors-ligne 24 cas |
| T13 correctifs tour 2 | terminée | 1/3 | 6100b6b | web 2 213/2 213, tsc 0 |
| vérification 2 | — | — | 28ecaa1 | verifier.sh --e2e OK (C14 média : OK), cargo 0 échec, web 2 213/2 213, principal 1 119 330 o, formats 3 099 350 o, scène 706 px |

## Choix tranchés seul
- Contre-relecture du cadrage fondue dans une relecture plan + cadrage, lancée en parallèle de la vague 1 (borne de 4 h) ; ses constats corrigent T7-T11 ou passent en correctifs.
- Essai e2e : vidéo WebM (MediaRecorder) et son WAV écrit à la main, générés dans le test (Chromium Linux sans H.264).

## Terminé quand
Élément `media` du cœur, importeur navigateur (octets magiques), image dans le canvas pendant la lecture et `poster` sinon, commandes (lecture, pause, rognage, boucle, volume), inclus ou lié selon U26, message MKV/AVI, CSP de la coque, aller-retour `.roomboard`, compatibilité avant C14 · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste média (déposer vidéo et son générés, lire, rogner, boucle, enregistrer, rouvrir, média dans le fichier) · capture d'une vidéo en lecture dans docs/essais/ · scène ≥ 640 px mesurée · plafonds Wasm inchangés, `formats` non touché · PR fusionnée par fusion locale --no-ff et push sans --force — fait : PR #23, main 858fd82 ; verifier.sh --e2e OK sur 28ecaa1

## Choix tranchés seul (suite)
- Revue immédiate des tâches `concepteur-critique` (T1, T5, T8, T10) remplacée par la double relecture de fin (borne de 4 h).
- `scripts/licences-acceptees.json` : 2 exceptions ajoutées par T2 (`roomboard-shell`, crate du dépôt ; `target-lexicon`, Apache-2.0 WITH LLVM-exception, permissive) : `controle-licences.mjs` échouait déjà sur la base lancé seul.
- `fake-core.test.ts` touché hors liste par T1 (une ligne `media:`), nécessaire au test I3.

## Captures
`docs/essais/c14-media-lecture.png` : vidéo WebM générée (rectangle vert) sélectionnée et en lecture sur la page ; barre du média flottante en bas (Pause, position, Début ici, Fin ici, Tout garder, Boucle, volume) ; barres d'outils et de pages autour, scène 706 px.

## Hors périmètre / restes
- Essai réel en coque (Tauri non construit) : vidéo liée > 50 Mo, protocole d'assets, `link_media`/`relink_media` (H1-7, H1-4).
- MP4/H.264 (S16 parent, 20 Mo) non joué : Chromium Linux sans H.264, WebM à la place.
- Minors non corrigés : `write_asset_meta` dupliqué par `insert_media_asset_meta` (simplification) ; ordre BadMedia/BadAsset du vrai module ≠ fausse liaison pour une entrée que TS interdit ; hachage synchrone dans `link_media` ; `MEDIA_EXTENSIONS` Rust/TS sans test de parité ; `relink_media` accorde sans consentement un chemin de média de taille connue (conforme M29) ; « Insérer les pages » : relink inutile avant `dropLinked`, deux avis sur le web ; `aria-valuetext` absent du curseur de position ; description de `capabilities/default.json` non complétée ; peintres d'export sans test de câblage dans `main.ts`.
- Compatibilité inverse : une version d'avant C14 compte un asset lié comme absent et refuse d'enregistrer (R30).

## Pièges trouvés
- Trois agents (T1, T3, T5) attendaient une commande de fond finie sans être réveillés (≈ 30 min perdues) : relancés par message.
- Prémisses démenties (cadreur) : pas de `apps/web/src/import/` (registre dans `platform/import.ts`) ; CSP : `controle-hors-ligne.mjs` refuse `asset:`, feature `protocol-asset` + `Cargo.lock` de la coque ; vidéo liée bloquerait l'enregistrement (`missingOf`, R30) ; empreinte de 300 Mo calculée par la coque ; `FileHost.save` doit recevoir la cible ; WebM de MediaRecorder a une durée `Infinity`.
- Fichiers communs avec OD86 : element.rs, commands.rs, query.rs, lib.rs, document.rs, roomboard-wasm/src/lib.rs, api.ts, wasm-core.ts, fake-core.ts, wasm-core.contract.test.ts, canvas2d.ts et test, board-session.ts, App.tsx, rb.css, verifier.sh.
- OD86 (C5, feat/usage-c5-image) tourne en même temps : élément image, barre, panneau, module formats. Ne pas toucher sa branche.

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

### 1. `00_Journal/2026-11-20-roomboard-usage-c14-media-clos.md`

```markdown
---
id: 2026-11-20-roomboard-usage-c14-media-clos
type: journal
summary: "RoomBoard usage C14 vidéo et son clos : élément media (rognage, boucle, volume, une étape par réglage), lecture dans le canvas, inclus jusqu'à 50 Mo, lié en coque au-delà, refus web > 100 Mo, MKV/AVI refusés ; PR 23 fusionnée."
created: 2026-11-20
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c14-media-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C14 vidéo et son, clos (OD87)

- 13 tâches (11 du plan, 2 de correctifs), 3 vagues ; `origin/main` (C5) intégré en cours de route par fusion.
- Élément `media` du cœur (U37) ; importeur navigateur par octets magiques ; lecteurs `<video>`/`<audio>` hors du cœur, image dessinée dans le canvas ; barre flottante (scène 706 px).
- Vidéo liée en coque : empreinte calculée en Rust, chemin relatif écrit à l'enregistrement, CSP `media-src 'self' blob: asset: http://asset.localhost`, protocole d'assets à portée vide. Non construit (aucun build Tauri) : essai réel en coque à faire.
- Essai e2e : WebM (MediaRecorder) et WAV générés dans la page, Chromium Linux sans H.264.
- Tailles : module principal 1 119 330 o (plafond 1 572 864), formats 3 099 350 o (inchangé par C14).
- Décision : [[NNNN-roomboard-media-lie-en-coque-lecteurs-hors-coeur]].
```

### 2. `02_Decisions/NNNN-roomboard-media-lie-en-coque-lecteurs-hors-coeur.md`

```markdown
---
id: NNNN-roomboard-media-lie-en-coque-lecteurs-hors-coeur
type: decision
summary: "RoomBoard : un média est un élément media du cœur (réglages d'un bloc, une étape par réglage), lu par des lecteurs de la page hors du cœur et dessiné dans le canvas ; au-delà de 50 Mo en coque il est lié (empreinte Rust, chemin relatif, protocole d'assets) ; prise par l'agent."
created: 2026-11-20
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c14-media-cadrage.md § DAM1 à DAM5, dépôt jejeasterix/roomboard"
---

# RoomBoard — médias : lecteurs hors du cœur, vidéo liée en coque (prise par l'agent)

- DAM1 : `kind: "media"` dans le cœur ; `SetMedia` remplace les réglages d'un bloc, une étape d'annulation par réglage, valeurs neutres retirées.
- DAM2 : vidéo liée en coque seulement : empreinte calculée par la coque en Rust (Web Crypto n'est pas incrémental), reconnue à la réouverture par sa taille, chemin relatif réécrit hors historique à l'enregistrement.
- DAM3 : lecteurs `<video>`/`<audio>` par onglet, créés au premier geste, port `MediaFrames` en lecture seule pour le rendu ; poster tant que non lancé.
- DAM4 : branche « lien » dans `importFiles`, avant toute lecture du fichier.
- DAM5 : barre de commandes flottante, aucune rangée permanente (scène ≥ 640 px).
```

### 3. Fiche `01_Projets/roomboard.md`, ligne « Vague 2 en cours »

Remplacer « C5 édition d'image en cours. » par : « C5 édition d'image clos ; C14 vidéo et son (élément media, lecture dans le canvas, lien en coque) clos (PR 23, `main` 858fd82) — voir [[2026-11-20-roomboard-usage-c14-media-clos]] et [[NNNN-roomboard-media-lie-en-coque-lecteurs-hors-coeur]]. »
