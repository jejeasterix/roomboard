# État — usage-c14-media

Statut : en cours
Étage : 1 — depuis 2026-11-20 18:40
Gabarit : chantier (provisoire)
Objectif : Une vidéo ou un son déposé devient un élément `media` sur la page montrée : lecture dans la page avec les commandes RoomBoard, rognage du début et de la fin, boucle et volume ; inclus dans le `.roomboard` jusqu'à 50 Mo, lié en coque au-delà, refusé sur le web au-delà de 100 Mo.
Avancement : 0/0 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c14-media   Branche : feat/usage-c14-media   Base : origin/main @ 9549785
Branche principale locale au lancement : 9549785
Cadrage : docs/plans/usage-c14-media-cadrage.md   Plan(s) : docs/plans/usage-c14-media-PLAN.md
Mode : autonome (ouvrier CLI OD87, aucune question à Jérôme : choix tranchés seuls et écrits)

## Référence
Complète (origin/main @ 9549785, verifier.sh --e2e) : en cours

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2

## Tâches
—

## Terminé quand
Élément `media` du cœur, importeur navigateur (octets magiques), image dans le canvas pendant la lecture et `poster` sinon, commandes (lecture, pause, rognage, boucle, volume), inclus ou lié selon U26, message MKV/AVI, CSP de la coque, aller-retour `.roomboard`, compatibilité avant C14 · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste média (déposer vidéo et son générés, lire, rogner, boucle, enregistrer, rouvrir, média dans le fichier) · capture d'une vidéo en lecture dans docs/essais/ · scène ≥ 640 px mesurée · plafonds Wasm inchangés, `formats` non touché · PR fusionnée par fusion locale --no-ff et push sans --force

## Pièges trouvés
- OD86 (C5, feat/usage-c5-image) tourne en même temps : élément image, barre, panneau, module formats. Ne pas toucher sa branche.

## Portes
ouvertes : — · passées : —
