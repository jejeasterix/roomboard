# État — usage-c11a-annotation

Statut : en cours
Gabarit : chantier
Objectif : En coque (Windows, macOS, Linux X11), Jérôme annote par-dessus son bureau vivant dans une fenêtre transparente, avec la barre d'outils seule cliquable, une bascule dessin / souris, un démarrage direct en annotation et une zone de dépôt qui insère des pages.
Avancement : 0/? tâches terminées
Étage : 1 — depuis 2026-11-23 07:06
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c11a-annotation   Branche : feat/usage-c11a-annotation   Base : origin/main @ 6c97661
Branche principale locale au lancement : 6c97661
Cadrage : docs/plans/usage-c11a-annotation-cadrage.md   Plan(s) : docs/plans/usage-c11a-annotation-PLAN.md

## Mandat
Jérôme, 2026-11-23 vers 07:00 : « Go c11 ». Mandat du 2026-11-19 : « Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu ». Ouvrier CLI : aucune question ne parvient, choix tranchés seuls et écrits. Arrêt ferme : 2026-11-23 11:34 (pousser et mettre l'état à jour à 11:24).

## Référence
Tailles avant : module principal 1 374 398 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)
Complète (origin/main @ 6c97661, verifier.sh --e2e) : vert, sauf C8 pot zones (data-zone-ms inchangé) au premier passage ; rejoué seul : OK (délai sous charge). C4 et C13 rejoués : OK. Tailles mesurées : 1 374 398 o et 2 794 511 o.

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à l'étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par fusion locale `--no-ff` puis push sans force

## Hors périmètre
- C11b (bureau figé, capture, « Envoyer au tableau »)
- Essais réels en coque (Windows, macOS, X11, stylet, mesure DAU8) : séances de Jérôme

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
(à l'étage 4)
