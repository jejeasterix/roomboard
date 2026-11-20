# Constats d'architecture

Constats que la chaîne nouvelle-feature n'a pas corrigés, une ligne chacun. Écrit par `scripts/chaine/constats.cjs` à la
clôture d'un chantier ; lu en premier par `audit-architecture`. Ne pas éditer à la main.

| date | chantier | zone | nature | fichier:ligne | constat | statut |
|---|---|---|---|---|---|---|
| 2026-11-20 | usage-c2-coeur | apps/web/src/core | duplication | apps/web/src/core/api.ts:145 | PAGE_WIDTH, PAGE_HEIGHT et le blanc du fond refont engine/page.ts (PAGE_WIDTH, PAGE_HEIGHT, PAGE_BACKGROUND) ; core n'importe pas engine. | ouvert |
| 2026-11-20 | usage-c2-coeur | apps/web/src/core | duplication | apps/web/src/core/fake-core.ts:73 | finitePositive existe dans fake-core.ts et wasm-core.ts, sans module commun. | ouvert |
| 2026-11-20 | usage-c2-coeur | crates/roomboard-core | duplication | crates/roomboard-core/src/element.rs:25 | KNOWN_KINDS double le match de document.rs (element) et l'ordre des lecteurs de query.rs ; un kind ajouté d'un seul côté devient une boîte inconnue. | ouvert |
