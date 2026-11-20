# Constats d'architecture

Constats que la chaîne nouvelle-feature n'a pas corrigés, une ligne chacun. Écrit par `scripts/chaine/constats.cjs` à la
clôture d'un chantier ; lu en premier par `audit-architecture`. Ne pas éditer à la main.

| date | chantier | zone | nature | fichier:ligne | constat | statut |
|---|---|---|---|---|---|---|
| 2026-11-20 | usage-c2-coeur | apps/web/src/core | duplication | apps/web/src/core/api.ts:145 | PAGE_WIDTH, PAGE_HEIGHT et le blanc du fond refont engine/page.ts (PAGE_WIDTH, PAGE_HEIGHT, PAGE_BACKGROUND) ; core n'importe pas engine. | ouvert |
| 2026-11-20 | usage-c6a-pot | apps/web/src/core | duplication | apps/web/src/core/fake-core.ts:1081 | edgeHit refait la boucle applyMatrix de worldPolygon et la distance aux arêtes de polygonHit (pas substituables : élargissement et test « dedans ») ; extraire toWorld et edgeDistance. | ouvert |
| 2026-11-20 | usage-c5-image | crates/roomboard-core | duplication | crates/roomboard-core/src/element.rs:66 | ImageView recopie les 7 champs d'ImageParams avec deux projections écrites à la main (read_image, params()) ; serde(flatten) n'est pas sûr (to_js rendrait une Map JS). | ouvert |
| 2026-11-20 | usage-c9-grille | crates/roomboard-core | duplication | crates/roomboard-core/src/query.rs:233 | snap_box recopie la boucle d'union de bounds (:211) ; seule la règle de contour des formes diffère (aide commune recevant la fonction de contour). | ouvert |
| 2026-11-20 | usage-c2-depot | apps/web/src/app | duplication | apps/web/src/app/workspace.ts:151 | La remise du type d'un Blob est écrite deux fois (typed dans workspace.ts, et image-import.ts) : une fonction partagée suffirait. | ouvert |
| 2026-11-20 | usage-c2-depot | apps/web/src/platform | peu-profond | apps/web/src/platform/files.ts:49 | DroppedFile n'offre que blob() : la coque lit un fichier non reconnu en entier avant de le refuser ; un head(n) le rendrait plus profond (HO1). | fermé 2026-11-20 usage-c10a-tableau |
| 2026-11-20 | usage-c1-profils | apps/web/src | duplication | apps/web/src/app/toolbar-host.ts:45 | Lecture des préréglages d'un outil encore écrite à la main (toolbar-host.ts:45, toolbar.ts:607) au lieu de presetsOf. | ouvert |
| 2026-11-20 | usage-c10a-tableau | scripts/essais | duplication | scripts/essais/c10a-tableau-navigateur.mjs:27 | coqueCsp() existe en trois copies (c10a-tableau, c2-image, fichiers-navigateur) : à exporter de commun.mjs. | fermé 2026-11-20 usage-c7b-texte-riche |
| 2026-11-20 | usage-c9-editeur | crates/roomboard-core | peu-profond | crates/roomboard-core/src/document.rs:554 | grid_lines jette la largeur lue par page_grid puis grid_lines_of la relit (deuxième transaction et find_page) : une aide commune qui rend la grille lue éviterait la double lecture. | ouvert |
| 2026-11-20 | usage-c9-editeur | scripts/essais | duplication | scripts/essais/c9-grille-navigateur.mjs:1 | paintedIn recopie inkIn de commun.mjs avec un autre seuil (décidé par le cadrage) : un inkIn paramétré par seuil dans commun.mjs suffirait. | fermé 2026-11-20 usage-c6a-pot |
| 2026-11-20 | usage-c7b-texte-riche | apps/web/src/engine | duplication | apps/web/src/engine/render/table-paint.ts:11 | CellTextBox porte text et spans alors que le rendu ne lit plus que spans (canvas2d.ts:367-373) : le doublon peut diverger. | ouvert |
| 2026-11-20 | usage-c3-groupes | apps/web/src/platform | peu-profond | apps/web/src/platform/image-import.ts:244 | ImageTarget reçoit aussi les tableaux et les fragments : son nom ne dit plus son rôle (cible d'import). | ouvert |
| 2026-11-20 | usage-c3-groupes | apps/web/src/platform | couture | apps/web/src/platform/clipboard.ts:7 | Import circulaire clipboard.ts <-> paste.ts (isEditable / fromEnvelope) ; déplacer isEditable dans un module à part. | ouvert |
| 2026-11-20 | usage-c12-pdf | apps/web/src/app | peu-profond | apps/web/src/app/workspace.ts:379 | La table blobs de l'export PDF garde un Blob par asset alors que AssetStore rend déjà la même instance (asset-store.ts:45) : lire le magasin suffirait. | ouvert |
