# État — usage-c7b-texte-riche

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : On écrit dans un texte et dans les cellules d'un tableau avec une saisie riche qui respecte l'IME, et une barre pose gras, italique, souligné, taille et couleur sur la sélection.
Avancement : —
Étage : 2 — depuis 2026-11-20 12:20
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
contre-relecture cadrage 1/2 (aucune bloquante, 11 corrigées) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
—

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · captures dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et poussée

## Scénarios et captures
S1 texte et cellule mis en forme, enregistrés, rouverts · S2 annulation en une étape · S3 IME (dont Ctrl+B puis composition) · S4 collage texte simple · S5 compatibilité socle et écritures concurrentes (reste OD71) · S6 mise en forme seule dans une cellule existante
Cadrage : 26 décisions, 13 hypothèses (6 de niveau 1), 24 lignes « Modules à réutiliser » (3 nouveaux).

## Hypothèses à revoir (niveau 1 d'abord)
—

## Hors périmètre
- IME réelle par plateforme (iPad, Android) : essai de Jérôme.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : cellules pas riches côté vue/rendu ; FormatText après SetText = plusieurs étapes d'annulation (d'où champ `spans`) ; s34, s5b, c10a lisent le textarea.
- Chantier parallèle OD80 (C10b) sur table.rs, commands.rs, lib.rs, api.ts, fake-core.ts, wasm-core.ts, table-geom.ts, table-paint.ts, canvas2d.ts, tools/table.ts : à relire avant le rebase (ajouter `spans: None` à ses SetTableCell).

## Constats d'architecture
—
