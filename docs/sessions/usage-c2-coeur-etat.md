# État — usage-c2-coeur

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Le document RoomBoard sait porter des images et un fond de page (assets dans le `.roomboard`, élément image, `backdrop`, `kind` inconnu toléré), côté cœur Rust, liaison Wasm et stockage `AssetStore` de la page, sans interface, fusionné dans `main` avant C7 et C9.
Étage : 1 — depuis 2026-11-20 01:40
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c2-coeur   Branche : feat/usage-c2-coeur   Base : origin/main @ d71eda3
Branche principale locale au lancement : d71eda3
Cadrage : docs/plans/usage-c2-coeur-cadrage.md   Plan(s) : docs/plans/usage-c2-coeur-PLAN.md
Arrêt ferme : 2026-11-20 05:35 (mise à l'abri à 05:25)
Brief : OD36 (ouvrier CLI, nuit, Jérôme dort : choix tranchés seuls et écrits)

## Référence
Rapide (worktree neuf) : —
Complète (origin/main, verifier.sh, tâche de fond) : en cours (/tmp/usage-c2-ref.log)

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · PR ouverte avec ## Preuve · fusion locale --no-ff dans main poussée sans --force

## Hors périmètre
- Interface, dépôt de fichiers, main.ts, composants, verifier.sh (lot 5b, OD33, feat/socle-lot5b).
- roomboard-prive ; branches et worktrees du lot 5b.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Lot 5b en cours sur feat/socle-lot5b (+ --T95, --T99) : interface, barre, verifier.sh. Rebase possible avant fusion.
