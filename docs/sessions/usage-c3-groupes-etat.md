# État — usage-c3-groupes

Statut : en cours
Gabarit : chantier
Objectif : On groupe et dégroupe des objets, on copie et colle une sélection (interne et système, avec repli JSON), on exporte la sélection en `.rbitem` et on insère un fragment ou les pages d'un document.
Avancement : 19/19 tâches terminées
Étage : 4 — depuis 2026-11-20 16:25
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c3-groupes   Branche : feat/usage-c3-groupes   Base : origin/main @ 98bf320
Branche principale locale au lancement : 98bf320
Cadrage : docs/plans/usage-c3-groupes-cadrage.md   Plan(s) : docs/plans/usage-c3-groupes-PLAN.md

## Référence
Rapide : couverte par la complète
Complète (origin/main 98bf320, verifier.sh --e2e) : OK (code 0)
Intégration : origin/main 28ba886 (C10b, PR #18) fusionné dans la branche en afe8eaf, 8 conflits résolus en gardant les deux côtés

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 4 majeurs corrigés dans les briefs) · relecture plan 1/3 (partielle, arrêtée à 60 tours ; 2 majeurs repris dans T13-T15) · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Plan : 16 tâches, 4 vagues. Fusionnées dans feat/usage-c3-groupes, preuves rejouées :
V1 T1-T10 → rejeu cargo workspace 473 ok / 0 échec, vitest 1668/1668 (après fusion d'origin/main) · V2 T11-T14 → cargo core+wasm 426 ok · T15 (12e9723) → verifier.sh OK · T16 essai Playwright · T17 correctifs Rust · T18 correctifs web (71d1d3e → verifier.sh --e2e OK) · T19 correctif bloquant insertPages + essai durci (ca50dae).
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
— (passés dans docs/architecture-constats.md : 2 ajoutés en apps/web/src/platform ; zone crates/roomboard-core à 3 ouverts : audit proposé)

## Rapport
- Scénarios : S1 (grouper, Δx et Δy des deux objets, Dégrouper puis annuler) · S2 (vrai Ctrl+C : presse-papiers système porte l'enveloppe ; collage par ClipboardEvent puis bouton Coller interne, décalage 24 px, annulation) · S3 (export « Sélection.rbitem » lu dans a.download, redéposé) · S5 (enregistré, rouvert, groupe gardé) : réussis dans c3-groupes-navigateur.mjs. S4 (insérer des pages, avec image) : tests unitaires et contrat ; Q1 : .roomboard déposé = nouvel onglet (workspace.test).
- Captures : docs/essais/c3-groupe-selectionne.png (deux rectangles et un trait dans une seule boîte, Dégrouper actif) ; docs/essais/c3-collage.png (copie collée décalée de 24 px, sélectionnée, Coller actif).
- Double relecture : tour 1 (4 relecteurs) 0 bloquant, 5 majeurs corrigés en T17/T18 ; tour 2 : 1 bloquant introduit par T18 (insertPages sans adoption des images), corrigé en T19 avec test.
- Mineurs non corrigés : ordre de deux écritures système rapprochées (Ctrl+V peut lire l'ancienne) ; booléen de pasteItems ignoré par handlePaste ; adopt() adopte les images de toutes les pages d'un fragment (sans effet visible) ; double avis en repli pour insertPages (antérieur) ; S2 sans image ni nouvel onglet dans l'essai.
- Wasm : 1 074 713 octets sur ca50dae (plafond 1 572 864 inchangé).
- Release : non due (aucune release, aucun tag).

## Notes du coffre à poser
Chemin : `00_Journal/2026-11-20-roomboard-usage-c3-groupes-clos.md`
```markdown
---
id: 2026-11-20-roomboard-usage-c3-groupes-clos
type: journal
summary: "RoomBoard usage C3 clos : groupes (champ group), fragments .rbitem (kind du manifeste), copier/coller interne et système (enveloppe JSON roomboard-items/1), export de la sélection, insertion de fragment et de pages par recopie profonde ; PR 19."
created: 2026-11-20
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c3-groupes-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C3 groupes, fragments et presse-papiers, clos (OD83)

- Livré : `group` en chemin d'ids, Grouper / Dégrouper (Ctrl+G, Ctrl+Maj+G), sélection et déplacement par groupe ; `kind` du manifeste (absent = document, mêmes octets) ; `.rbitem` ; `copy.rs` : recopie profonde par `AsPrelim` (yrs 0.28.1), une transaction = une étape ; rangée « Sélection » ; 19 tâches, essai `c3-groupes-navigateur.mjs`.
- Collage : point d'entrée unique `handlePaste` (`platform/paste.ts`), ordre objets → `<table>` (C10b) → images ; OD80 fusionné pendant le chantier, intégré par fusion d'origin/main.
- Pièges : un sous-agent qui lance une commande en fond et finit son tour la perd (tuée) ; vitest ignore les filtres passés après `pnpm test --` ; Chromium sans écran nomme « download » un téléchargement non ASCII (lire `a.download`).
- Relectures : 5 majeurs corrigés, 1 bloquant introduit par un correctif (insertPages sans adoption des images) corrigé avec test.
- Hors périmètre : presse-papiers propre et association `.rbitem` de la coque construite (build Tauri exclu).
```
