# État — usage-c12-pdf

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : Un PDF déposé ou importé devient un document dont chaque page est une page RoomBoard à fond `pdf-page` ; on annote par-dessus, et on exporte les pages RoomBoard en PDF vectoriel et le PDF annoté (texte et vecteurs d'origine conservés).
Avancement : —
Étage : 1 — depuis 2026-11-20 16:35
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c12-pdf   Branche : feat/usage-c12-pdf   Base : origin/main @ 1a756bd
Branche principale locale au lancement : 1a756bd
Cadrage : docs/plans/usage-c12-pdf-cadrage.md   Plan(s) : docs/plans/usage-c12-pdf-PLAN.md

## Référence
Complète (origin/main @ 1a756bd, verifier.sh --e2e) : en cours

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
—

## Terminé quand
(a) importeur PDF + backdrop pdf-page, (b) export PDF annoté, (c) export vectoriel krilla · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste PDF (3 pages, annoter, exporter annoté, relire, enregistrer, rouvrir) · capture d'un PDF annoté dans docs/essais/ · PR mergée par fusion locale --no-ff et push sans --force

## Hypothèses à revoir
—

## Hors périmètre
—

## Portes
ouvertes : — · passées : — (profil « Porte avant merge : non » ; aucune release)

## Pièges trouvés
- OD84 (C6a pot, feat/usage-c6a-pot) tourne en même temps : barre et cible du pointeur. Intégrer origin/main avant fusion.

## Choix tranchés seul
- Cadrage autonome (Jérôme absent, brief OD85 : « tranche seul »).
- Q1 de Jérôme : un fichier déposé ou ouvert s'ouvre dans un nouvel onglet, sans menu.

## Constats d'architecture
—

## Notes du coffre à poser
—
