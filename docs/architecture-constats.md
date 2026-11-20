# Constats d'architecture

Constats que la chaîne nouvelle-feature n'a pas corrigés, une ligne chacun. Écrit par `scripts/chaine/constats.cjs` à la
clôture d'un chantier ; lu en premier par `audit-architecture`. Ne pas éditer à la main.

| date | chantier | zone | nature | fichier:ligne | constat | statut |
|---|---|---|---|---|---|---|
| 2026-11-20 | usage-c2-coeur | apps/web/src/core | duplication | apps/web/src/core/api.ts:145 | PAGE_WIDTH, PAGE_HEIGHT et le blanc du fond refont engine/page.ts (PAGE_WIDTH, PAGE_HEIGHT, PAGE_BACKGROUND) ; core n'importe pas engine. | ouvert |
| 2026-11-20 | usage-c2-coeur | apps/web/src/core | duplication | apps/web/src/core/fake-core.ts:73 | finitePositive existe dans fake-core.ts et wasm-core.ts, sans module commun. | ouvert |
| 2026-11-20 | usage-c2-coeur | crates/roomboard-core | duplication | crates/roomboard-core/src/element.rs:25 | KNOWN_KINDS double le match de document.rs (element) et l'ordre des lecteurs de query.rs ; un kind ajouté d'un seul côté devient une boîte inconnue. | ouvert |
| 2026-11-20 | usage-c9-grille | crates/roomboard-core | duplication | crates/roomboard-core/src/query.rs:233 | snap_box recopie la boucle d'union de bounds (:211) ; seule la règle de contour des formes diffère (aide commune recevant la fonction de contour). | ouvert |
| 2026-11-20 | usage-c2-depot | apps/web/src/app | duplication | apps/web/src/app/workspace.ts:151 | La remise du type d'un Blob est écrite deux fois (typed dans workspace.ts, et image-import.ts) : une fonction partagée suffirait. | ouvert |
| 2026-11-20 | usage-c2-depot | apps/web/src/platform | peu-profond | apps/web/src/platform/files.ts:49 | DroppedFile n'offre que blob() : la coque lit un fichier non reconnu en entier avant de le refuser ; un head(n) le rendrait plus profond (HO1). | fermé 2026-11-20 usage-c10a-tableau |
| 2026-11-20 | usage-c1-profils | apps/web/src | duplication | apps/web/src/app/toolbar-host.ts:45 | Lecture des préréglages d'un outil encore écrite à la main (toolbar-host.ts:45, toolbar.ts:607) au lieu de presetsOf. | ouvert |
| 2026-11-20 | usage-c10a-tableau | scripts/essais | duplication | scripts/essais/c10a-tableau-navigateur.mjs:27 | coqueCsp() existe en trois copies (c10a-tableau, c2-image, fichiers-navigateur) : à exporter de commun.mjs. | ouvert |
| 2026-11-20 | usage-c9-editeur | crates/roomboard-core | peu-profond | crates/roomboard-core/src/document.rs:554 | grid_lines jette la largeur lue par page_grid puis grid_lines_of la relit (deuxième transaction et find_page) : une aide commune qui rend la grille lue éviterait la double lecture. | ouvert |
| 2026-11-20 | usage-c9-editeur | scripts/essais | duplication | scripts/essais/c9-grille-navigateur.mjs:1 | paintedIn recopie inkIn de commun.mjs avec un autre seuil (décidé par le cadrage) : un inkIn paramétré par seuil dans commun.mjs suffirait. | ouvert |
