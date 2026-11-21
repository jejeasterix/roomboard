# État — usage-c15-3d

Statut : en cours
Étage : 2 — depuis 2026-11-21 05:00
Gabarit : chantier (provisoire, ≈ 10 tâches)
Objectif : Un fichier glTF / GLB, OBJ + MTL, STL ou PLY déposé devient un élément `model3d` sur la page montrée : tourné à l'orbite quand il est sélectionné, instantané image sinon ; le modèle et ses fichiers liés sont inclus dans le `.roomboard`.
Avancement : 0 tâche
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c15-3d   Branche : feat/usage-c15-3d   Base : origin/main @ 458a90d
Branche principale locale au lancement : 458a90d
Cadrage : docs/plans/usage-c15-3d-cadrage.md   Plan(s) : docs/plans/usage-c15-3d-PLAN.md
Mode : autonome (ouvrier CLI OD90, aucune question à Jérôme : choix tranchés seuls et écrits)

## Référence
Complète (origin/main @ 458a90d, verifier.sh --e2e) : OK · module principal 1 119 330 o · formats 3 099 350 o · scène 706 px

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2

## Tâches
—

## Choix tranchés seul
- Cadrage : 39 décisions, 13 hypothèses (7 niveau 1), 5 décisions d'architecture, scénarios S1-S5, 16 modules à réutiliser (6 nouveaux) ; commit 05e075f.
- Contre-relecture du cadrage fondue dans la relecture du plan + cadrage (borne de 4 h, comme C14).
- Lancement en ouvrier CLI : pas de question du lancement (mode autonome imposé par le brief OD90).

## Terminé quand
Élément `model3d` du cœur (asset principal et liés, caméra d'orbite, `transform`, une étape d'annulation par orbite validée), géométrie de collision, importeur navigateur (octets magiques puis extension, regroupement des fichiers d'un même dépôt ou d'un ZIP), `three` chargé à la demande, un seul `WebGLRenderer` partagé, instantané image hors sélection, avertissement `.obj` seul et modèle compressé non décodable, contrôle hors ligne vert, aller-retour `.roomboard`, compatibilité avant C15 · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste 3D (GLB généré, orbite, instantané, OBJ + MTL, `.obj` seul, enregistrer, rouvrir, assets dans le fichier) · capture d'un objet 3D tourné dans docs/essais/ · scène ≥ 640 px mesurée · plafond Wasm inchangé, `formats` non grossi · PR fusionnée par fusion locale --no-ff et push sans --force

## Captures
—

## Hors périmètre / restes
- Édition du maillage, 3MF, FBX (hors périmètre C15).

## Pièges trouvés
- Prémisses démenties (cadreur) : `formats` n'a pas de lecteur ZIP générique (fflate en JS, Worker jetable) ; les chargeurs three font `fetch(blob:)` → `blob:` dans `connect-src` de la coque ; faux hôte `i.test` de three pour le contrôle hors ligne ; `importFiles` traite chaque fichier seul (pré-passe de regroupement) ; Draco/KTX2 demandent des Workers `blob:` → refusés avec message.
- Fichiers communs probables avec C14 : element.rs, document.rs, query.rs, commands.rs, lib.rs, roomboard-wasm/src/lib.rs, api.ts, wasm-core.ts, fake-core.ts, test de contrat, canvas2d.ts, board-session.ts, App.tsx, verifier.sh, commun.mjs.

## Portes
ouvertes : — · passées : —
