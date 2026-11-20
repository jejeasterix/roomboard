# État — usage-c2-coeur

Statut : en cours
Gabarit : chantier
Avancement : 4/9 tâches terminées
Objectif : Le document RoomBoard sait porter des images et un fond de page (assets dans le `.roomboard`, élément image, `backdrop`, `kind` inconnu toléré), côté cœur Rust, liaison Wasm et stockage `AssetStore` de la page, sans interface, fusionné dans `main` avant C7 et C9.
Étage : 3 (vague 2) — depuis 2026-11-20 02:45
Tâche : T5 (vague 1), T6, T7 (vague 2) — depuis 2026-11-20 02:45
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c2-coeur   Branche : feat/usage-c2-coeur   Base : origin/main @ cacd2e3 (rebasée à 02:35 : lot 5b fusionné, PR #7)
Branche principale locale au lancement : d71eda3
Cadrage : docs/plans/usage-c2-coeur-cadrage.md   Plan(s) : docs/plans/usage-c2-coeur-PLAN.md
Arrêt ferme : 2026-11-20 05:35 (mise à l'abri à 05:25)
Brief : OD36 (ouvrier CLI, nuit, Jérôme dort : choix tranchés seuls et écrits)

## Référence
Rapide (worktree neuf) : —
Complète (origin/main d71eda3, verifier.sh) : OK (/tmp/usage-c2-ref.log)

## Compteurs
contre-relecture cadrage 1/2 (1 bloquant, 6 importants, corrigés 2fa434b) · relecture plan 1/3 (0 bloquant ; I1 : option b, build web et verifier.sh rouges de T5 à T8, aucune vérification d'intégration avant T8) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | worktree | état | essais | commit vert | preuve rejouée |
|----|--------|----------|------|--------|-------------|----------------|
| T1 fixture socle | — | --T1 | terminée | 1/3 | 2b909cf | compat_socle 2/2 |
| T2 format parts | — | --T2 | terminée | 1/3 | b159dad | format:: 23 ok, newer_format_version_without_document_is_newer |
| T3 asset, image, inconnu | — | --T3 | terminée | 1/3 | f86ba10 | roomboard-core 163+14 ok, element_inconnu 4 |
| T4 AssetStore | — | --T4 | terminée | 1/3 | 438777b | asset-store 7 ok |
| T5 contrat TS, fausse liaison | — | --T5 | en cours | 1/3 | — | — |
| T6 cœur assets, image, fond | T1,T3 | --T6 | en cours | 1/3 | — | — |
| T7 crate roomboard-formats | T1,T2,T3 | --T7 | en cours | 1/3 | — | — |
| T8 liaison Wasm, wasm-core.ts | T2,T5,T6 | — | à venir | 0/3 | — | — |
| T9 scénarios conteneur | T6,T7 | — | à venir | 0/3 | — | — |
Plan : 9 tâches, 3 vagues (T1-T5 · T6,T7 · T8,T9).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · PR ouverte avec ## Preuve · fusion locale --no-ff dans main poussée sans --force

## Hors périmètre
- Interface, dépôt de fichiers, main.ts, composants, verifier.sh (lot 5b, OD33, feat/socle-lot5b).
- roomboard-prive ; branches et worktrees du lot 5b.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Lot 5b fusionné dans main (cacd2e3) pendant la vague 1 : branche du chantier rebasée, tâches rebasées par --onto 125f365. Seul conflit possible : Cargo.toml members (roomboard-shell).
- Régénération de element-inconnu.roomboard : seulement avec --test-threads=1 (écriture concurrente).
- Choix orchestrateur : pas de revue immédiate par tâche concepteur-critique (T5-T8) ; couverte par la double relecture de fin (temps de nuit borné).
