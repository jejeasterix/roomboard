# État — usage-c2-coeur

Statut : en cours
Gabarit : chantier
Avancement : 12/12 tâches terminées
Objectif : Le document RoomBoard sait porter des images et un fond de page (assets dans le `.roomboard`, élément image, `backdrop`, `kind` inconnu toléré), côté cœur Rust, liaison Wasm et stockage `AssetStore` de la page, sans interface, fusionné dans `main` avant C7 et C9.
Étage : 4 (PR et fusion locale) — depuis 2026-11-20 03:25
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c2-coeur   Branche : feat/usage-c2-coeur   Base : origin/main @ cacd2e3 (rebasée à 02:35 : lot 5b fusionné, PR #7)
Branche principale locale au lancement : d71eda3
Cadrage : docs/plans/usage-c2-coeur-cadrage.md   Plan(s) : docs/plans/usage-c2-coeur-PLAN.md
Arrêt ferme : 2026-11-20 05:35 (mise à l'abri à 05:25)
Brief : OD36 (ouvrier CLI, nuit, Jérôme dort : choix tranchés seuls et écrits)

## Référence
Rapide (worktree neuf) : —
Tête a08f026 (9 tâches) : verifier.sh OK, web 810 tests, module Wasm 1 480 131 o (/tmp/c2-verifier-a08f026.log)
Complète (origin/main d71eda3, verifier.sh) : OK (/tmp/usage-c2-ref.log)

## Compteurs
double relecture fin de lot 1 tour (4 relecteurs : conformité, qualité cœur, qualité formats+wasm, qualité page ; 0 blocker, 0 major) · correctifs de fin 1/2 (T10, T11) · contre-relecture cadrage 1/2 (1 bloquant, 6 importants, corrigés 2fa434b) · relecture plan 1/3 (0 bloquant ; I1 : option b, build web et verifier.sh rouges de T5 à T8, aucune vérification d'intégration avant T8) · vagues sans progrès 0/2

## Tâches
| id | dépend | worktree | état | essais | commit vert | preuve rejouée |
|----|--------|----------|------|--------|-------------|----------------|
| T1 fixture socle | — | --T1 | terminée | 1/3 | 2b909cf | compat_socle 2/2 |
| T2 format parts | — | --T2 | terminée | 1/3 | b159dad | format:: 23 ok, newer_format_version_without_document_is_newer |
| T3 asset, image, inconnu | — | --T3 | terminée | 1/3 | f86ba10 | roomboard-core 163+14 ok, element_inconnu 4 |
| T4 AssetStore | — | --T4 | terminée | 1/3 | 438777b | asset-store 7 ok |
| T5 contrat TS, fausse liaison | — | --T5 | terminée | 1/3 | ecc9a5f | web 766 ok (fake), bloc contrat C2 |
| T6 cœur assets, image, fond | T1,T3 | --T6 | terminée | 1/3 | ab6c6c2 | workspace 0 échec, undo_add_image…, set_backdrop_scales_to_page_width |
| T7 crate roomboard-formats | T1,T2,T3 | --T7 | terminée | 1/3 | 8fba14d | formats 14, socle_fixture_hash_is_pinned, sha2 absent du wasm |
| T8 liaison Wasm, wasm-core.ts | T2,T5,T6 | --T8 | terminée | 1/3 | 1a641d9 | agent : web 810 avec wasm, module 1 480 131 o ; rejeu = verifier.sh |
| T9 scénarios conteneur | T6,T7 | --T9 | terminée | 1/3 | 615c591 | scenarios 4 + 1 ignoré (essai réel 11 images OK) |
| T10 correctifs mineurs Rust | T1-T9 | --T10 | terminée | 1/3 | e8047c1 | workspace 253 ok, 8 constats minor |
| T11 correctifs mineurs page | T1-T9 | --T11 | terminée | 1/3 | eba7cc8 | web 814 ok avec wasm |
| T12 simplification du lot | T10,T11 | --T12 | terminée | 1/1 | 4534b02 | diff des tests vide, verifier.sh OK |
Plan : 9 tâches, 3 vagues (T1-T5 · T6,T7 · T8,T9), puis correctifs de relecture T10, T11 et simplification T12.

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh OK · PR ouverte avec ## Preuve · fusion locale --no-ff dans main poussée sans --force

## Rapport
- verifier.sh : OK sur 30976b5 (/tmp/c2-verifier-30976b5.log) : cœur 181 + 15, formats 19 + 4 (1 ignoré : essai réel), shell 12, wasm 22, web 814 avec le vrai module.
- Module Wasm : 1 413 052 o (référence d71eda3) → 1 480 983 o (+67 931) ; marge restante sous 1 572 864 : 91 881 o, à partager avec C7 et C9.
- Scénarios : S1 (aller-retour image, octets stables), S2 (même asset deux fois), S3 (fond calé sur la largeur), S4 (kind inconnu gardé), S5 (fichier du socle à l'identique, empreinte 63cf8219… figée) : réussis par tests.
- Essai réel : 11 images de ~/telechargements-roomboard/images (PNG, JPEG EXIF, WebP, SVG, HEIC, AVIF) → fichier de 6 393 119 o, aller-retour octet pour octet (/tmp/c2-essai-reel.log).
- Hypothèses niveau 1 : HK1 fit "width" (U6 disait "contain") ; HK2 balayage générique des assets cités ; HK3 asset à empreinte fausse ignoré avec avertissement ; HK4 AssetStore = octets seuls.
- Décisions d'architecture (agent) : DAK1 crate roomboard-formats sans liaison Wasm ; DAK2 assets cités par parcours de tout le document ; DAK3 AssetStore octets seuls, hasher injecté ; DAK4 le cœur calcule la place du fond.
- Simplification T12 : 4 constats sur 5 appliqués ; non appliqués : finitePositive en double (TS), alias c2Factories (fichier de test).
- Constats d'architecture : 3 écrits (apps/web/src/core 2, crates/roomboard-core 1), aucune zone à proposer.
- Release : non due (aucune release, aucun tag : brief OD36).
- Réponses Q1, Q3, Q5 déjà reportées au § 11 de usage-cadrage.md par le lot 5b : rien refait.

## Hors périmètre
- format::read_entry du cœur lit manifest.json et document.ybin sans borne de taille (même défaut que celui corrigé dans le conteneur, T10).
- collect_out (cited_assets) récursif sans borne de profondeur ; Y.Xml et sous-documents non balayés.
- Contrôle scripté des licences et son appel par verifier.sh (U39, HK5) : partie « reste » de C2.
- Interface, dépôt de fichiers, main.ts, composants, verifier.sh (lot 5b, OD33, feat/socle-lot5b).
- roomboard-prive ; branches et worktrees du lot 5b.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Lot 5b fusionné dans main (cacd2e3) pendant la vague 1 : branche du chantier rebasée, tâches rebasées par --onto 125f365. Seul conflit possible : Cargo.toml members (roomboard-shell).
- Régénération de element-inconnu.roomboard : seulement avec --test-threads=1 (écriture concurrente).
- Choix orchestrateur : pas de revue immédiate par tâche concepteur-critique (T5-T8) ; couverte par la double relecture de fin (temps de nuit borné).
