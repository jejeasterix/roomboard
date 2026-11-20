# État — usage-c14-media

Statut : en cours
Étage : 3 — depuis 2026-11-20 19:27
Vague : 2 (T7-T10) — depuis 2026-11-20 20:17
Gabarit : chantier (11 tâches, un lot)
Objectif : Une vidéo ou un son déposé devient un élément `media` sur la page montrée : lecture dans la page avec les commandes RoomBoard, rognage du début et de la fin, boucle et volume ; inclus dans le `.roomboard` jusqu'à 50 Mo, lié en coque au-delà, refusé sur le web au-delà de 100 Mo.
Avancement : 6/11 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c14-media   Branche : feat/usage-c14-media   Base : origin/main @ 9549785
Branche principale locale au lancement : 9549785
Cadrage : docs/plans/usage-c14-media-cadrage.md   Plan(s) : docs/plans/usage-c14-media-PLAN.md
Mode : autonome (ouvrier CLI OD87, aucune question à Jérôme : choix tranchés seuls et écrits)

## Référence
Complète (origin/main @ 9549785, verifier.sh --e2e) : OK · module principal 1 084 202 o · formats 3 092 294 o · scène pot 706 px

## Compteurs
contre-relecture cadrage 0/2 (fondue dans la relecture du plan, voir choix) · relecture plan 1/3 (1 bloquant R1 + 9 corrections, portées par T7-T11 : docs/plans/usage-c14-media-relecture-plan.md) · vagues sans progrès 0/2

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
| T7 rendu | en cours | 1/3 | — | — |
| T8 import | en cours | 1/3 | — | — |
| T9 session+barre | en cours | 1/3 | — | — |
| T10 persistance | en cours | 1/3 | — | — |

## Choix tranchés seul
- Contre-relecture du cadrage fondue dans une relecture plan + cadrage, lancée en parallèle de la vague 1 (borne de 4 h) ; ses constats corrigent T7-T11 ou passent en correctifs.
- Essai e2e : vidéo WebM (MediaRecorder) et son WAV écrit à la main, générés dans le test (Chromium Linux sans H.264).

## Terminé quand
Élément `media` du cœur, importeur navigateur (octets magiques), image dans le canvas pendant la lecture et `poster` sinon, commandes (lecture, pause, rognage, boucle, volume), inclus ou lié selon U26, message MKV/AVI, CSP de la coque, aller-retour `.roomboard`, compatibilité avant C14 · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste média (déposer vidéo et son générés, lire, rogner, boucle, enregistrer, rouvrir, média dans le fichier) · capture d'une vidéo en lecture dans docs/essais/ · scène ≥ 640 px mesurée · plafonds Wasm inchangés, `formats` non touché · PR fusionnée par fusion locale --no-ff et push sans --force

## Choix tranchés seul (suite)
- Revue immédiate des tâches `concepteur-critique` (T1, T5, T8, T10) remplacée par la double relecture de fin (borne de 4 h).
- `scripts/licences-acceptees.json` : 2 exceptions ajoutées par T2 (`roomboard-shell`, crate du dépôt ; `target-lexicon`, Apache-2.0 WITH LLVM-exception, permissive) : `controle-licences.mjs` échouait déjà sur la base lancé seul.
- `fake-core.test.ts` touché hors liste par T1 (une ligne `media:`), nécessaire au test I3.

## Pièges trouvés
- Trois agents (T1, T3, T5) attendaient une commande de fond finie sans être réveillés (≈ 30 min perdues) : relancés par message.
- Prémisses démenties (cadreur) : pas de `apps/web/src/import/` (registre dans `platform/import.ts`) ; CSP : `controle-hors-ligne.mjs` refuse `asset:`, feature `protocol-asset` + `Cargo.lock` de la coque ; vidéo liée bloquerait l'enregistrement (`missingOf`, R30) ; empreinte de 300 Mo calculée par la coque ; `FileHost.save` doit recevoir la cible ; WebM de MediaRecorder a une durée `Infinity`.
- Fichiers communs avec OD86 : element.rs, commands.rs, query.rs, lib.rs, document.rs, roomboard-wasm/src/lib.rs, api.ts, wasm-core.ts, fake-core.ts, wasm-core.contract.test.ts, canvas2d.ts et test, board-session.ts, App.tsx, rb.css, verifier.sh.
- OD86 (C5, feat/usage-c5-image) tourne en même temps : élément image, barre, panneau, module formats. Ne pas toucher sa branche.

## Portes
ouvertes : — · passées : —
