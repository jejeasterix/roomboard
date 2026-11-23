# État — usage-c11a-annotation

Statut : en cours
Gabarit : chantier
Objectif : En coque (Windows, macOS, Linux X11), Jérôme annote par-dessus son bureau vivant dans une fenêtre transparente, avec la barre d'outils seule cliquable, une bascule dessin / souris, un démarrage direct en annotation et une zone de dépôt qui insère des pages.
Avancement : 3/10 tâches terminées
Étage : 3 (vague 2) — depuis 2026-11-23 08:13
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
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table : `docs/plans/usage-c11a-annotation-PLAN.md` lignes 5-16. Vagues : 1 = T1, T2, T3 · 2 = T4…T8 · 3 = T9, T10.
| id | état | essais | commit | preuve rejouée |
|----|------|--------|--------|----------------|
| T1 | terminée | 1/3 | e116c38 | cargo test annotation : 13 passed, `relance_memes_arguments_et_gdk_x11` |
| T2 | terminée | 1/3 | ea4050a | Vitest 5 fichiers 128 passed, tsc 0 ; `toolbar-host.test.ts` rouge attendu, corrigé par T8 |
| T3 | terminée | 1/3 | e04e49c | Vitest platform+tabs 675 passed ; test `ANNOTATION_NOT_YET` réécrit (prévu au cadrage) |
| T4…T10 | à faire | — | — | — |

Relecture du plan tour 1 (sans bloquant) : corrections portées dans les prompts des tâches (pas de nouvelle passe du planificateur, pour le temps) — T4/T7 littéraux `DroppedFile` complets (`head`, `blob`) ; T6 `poll` annulé après l'`await` + test ; T10 vrai cœur ou écart déclaré + mutation ; T6 symptôme de la gomme sur fond transparent dans la fiche C11a-2 (T5) ; écart `collect/leave/place` déclaré au rapport.
Vague 2 à 5 tâches en parallèle (choix : le jeton borne les suites à 3).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par fusion locale `--no-ff` puis push sans force

## Cadrage
Corrigé après contre-relecture tour 1 (1 bloquant : charge JSON de `emitTo` → base64 ; 7 à corriger ; coupes : pas de machine Rust, sondage du curseur depuis la page). Hypothèses HC11-1…7 (niveau 1). Scénarios : S1 web sans annotation · S2 faux hôte, bascule, aller-retour `.roomboard` · S3 dépôt sur la zone · S4 cargo test + Vitest · S5 en coque (essais de Jérôme).

## Pièges trouvés
- Prémisse démentie : U22 (menu « Insérer ses pages / Ouvrir », on reste en annotation) est amendé par Q2 de Jérôme (2026-11-20) : le dépôt sur la barre quitte l'annotation, un document s'ouvre en nouvel onglet (Q1).
- Charge d'un événement Tauri = JSON : un `Uint8Array` y devient un objet ; le document voyage en base64.
- Chantiers en cours sur les mêmes fichiers : aucun.

## Hors périmètre
- C11b (bureau figé, capture, « Envoyer au tableau »)
- Essais réels en coque (Windows, macOS, X11, stylet, mesure DAU8) : séances de Jérôme

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
(à l'étage 4)
