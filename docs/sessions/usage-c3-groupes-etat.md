# État — usage-c3-groupes

Statut : en cours
Gabarit : chantier
Objectif : On groupe et dégroupe des objets, on copie et colle une sélection (interne et système, avec repli JSON), on exporte la sélection en `.rbitem` et on insère un fragment ou les pages d'un document.
Avancement : 15/16 tâches terminées
Étage : 3 (vague 4) — depuis 2026-11-20 15:59
Lot : —
Tâche : T16 — essai navigateur C3 dans verifier.sh --e2e, deux captures — depuis 2026-11-20 15:59
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c3-groupes   Branche : feat/usage-c3-groupes   Base : origin/main @ 98bf320
Branche principale locale au lancement : 98bf320
Cadrage : docs/plans/usage-c3-groupes-cadrage.md   Plan(s) : docs/plans/usage-c3-groupes-PLAN.md

## Référence
Rapide : couverte par la complète
Complète (origin/main 98bf320, verifier.sh --e2e) : OK (code 0)
Intégration : origin/main 28ba886 (C10b, PR #18) fusionné dans la branche en afe8eaf, 8 conflits résolus en gardant les deux côtés

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 4 majeurs corrigés dans les briefs) · relecture plan 1/3 (partielle, arrêtée à 60 tours ; 2 majeurs repris dans T13-T15) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan : 16 tâches, 4 vagues. Fusionnées dans feat/usage-c3-groupes, preuves rejouées :
V1 T1-T10 → rejeu cargo workspace 473 ok / 0 échec, vitest 1668/1668 (après fusion d'origin/main) · V2 T11-T14 → cargo core+wasm 426 ok · T15 (12e9723) → verifier.sh complet en cours.
Choix d'orchestration : vague 1 de 10 tâches en parallèle (VM 8 cœurs, 27 Go libres) ; relecture du plan en parallèle de la vague 1 ; corrections de la contre-relecture passées dans les briefs au lieu d'un second tour du cadreur (borne de 4 h).

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture d'un groupe sélectionné et d'un collage dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et poussée

## Scénarios et captures
S1 grouper, déplacer, dégrouper · S2 copier puis coller (système et interne) · S3 exporter puis déposer deux fois · S4 insérer les pages d'un document ; déposé, il s'ouvre dans un nouvel onglet · S5 enregistrer, rouvrir, mêmes octets, kind inconnu refusé

## Hypothèses à revoir (niveau 1 d'abord)
Cadrage : 15 décisions Z1-Z15, 15 hypothèses (7 de niveau 1), 5 DA, 26 lignes « Modules à réutiliser ».
Choix de l'orchestrateur : Group partiel étendu au groupe extérieur entier ; Ungroup partiel retire le niveau extérieur aux seuls ids nommés ; WrongKind au chargement, pas à l'ouverture ; images manquantes : copier/exporter refusent avec avis, coller/déposer refusent si unread ; placement sur bornes réelles ; .rbitem collé depuis l'explorateur ignoré ; group_reload_keeps_bytes stable à partir du premier rechargement pour un groupe imbriqué (yrs purge l'ancienne valeur).

## Hors périmètre
- Ressources (C4), formats C11b et C13.
- Presse-papiers à format propre de la coque et association .rbitem construite : build Tauri exclu (essai Windows/macOS).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Chantier parallèle OD80 (C10b, `feat/usage-c10b-tableau`) : collage d'un `<table>` HTML ; un seul point d'entrée du collage.

## Constats d'architecture
—
