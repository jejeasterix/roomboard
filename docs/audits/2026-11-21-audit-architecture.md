# Audit d'architecture — 2026-11-21

Cinq candidats couvrent les 14 constats ouverts des trois zones à 4 constats ou plus (`crates/roomboard-core` 5, `apps/web/src/app` 5, `apps/web/src/platform` 4).
Le plus rentable : alléger la lecture d'un élément par le pont Wasm (kind sans vue, fill sans anneaux), qui touche un coût réel à chaque version du document.
Rapport seul : aucun code modifié, aucun candidat cadré ; le choix revient à Jérôme.

Les 3 premiers candidats :

1. **A — Vue légère d'un élément** (cœur + pont + `app/`) : `courte`, Fort, ferme 3 constats.
2. **B — Utilitaires feuilles : Blob, noms de fichiers, cycles d'import** (`app/` + `platform/`) : `courte`, Fort, ferme 4 constats.
3. **C — Un module de géométrie dans le cœur** (`crates/roomboard-core`) : `courte`, Fort, ferme 2 constats et pose le test de parité qui manque.

Note de clôture (OE23, PR #28) : le chantier `restes-od94-porte-s6` a déjà posé `elementIdsOfKind` (kind sans vue) et fermé le constat `zone-marks.ts:56` ; il reste au candidat A le `fill` sans anneaux et les réglages d'`ImageView`.

Page HTML : [`2026-11-21-audit-architecture.html`](2026-11-21-audit-architecture.html) (autonome, sans ressource distante).

---

## Méthode et périmètre

- Skill `audit-architecture`, étapes 1 à 3, arrêt au rapport (pas d'étape 4 « choix », ni 5 « cadrage », ni 6 « demande »).
- Zones : `node ~/.claude/scripts/chaine/constats.cjs compter`, lancé dans le worktree, rend `aProposer` = `crates/roomboard-core` (5), `apps/web/src/app` (5), `apps/web/src/platform` (4), comme attendu.
- Sources lues : `docs/architecture-constats.md`, `docs/sessions/usage-c8-pot-zones-etat.md` (§ Rapport), `docs/sessions/usage-c4-bibliotheque-etat.md` (§ Rapport), `docs/plans/usage-cadrage.md`, coffre (`chercher.js`, lecture seule : décisions 0254, 0263, piège `roomboard-mesure-performance-inclut-le-rendu-synchrone`).
- Points chauds (3 derniers mois) : `commands.rs` 45 modifications, `document.rs` 30, `query.rs` 29, `board-session.ts` 21, `workspace.ts` 20, `import.ts` 17.
- Exploration par trois sous-agents `Explore` (un par zone). Emplacements marqués **(v)** : revérifiés à la main sur la tête du worktree ; les autres viennent de l'exploration.
- Écart assumé au skill : rapport et page dans `docs/audits/` (brief de l'orchestrateur) au lieu du dossier temporaire ; page sans Tailwind ni Mermaid par CDN (schémas en SVG inline).

## Correspondance constats → candidats

| Constat ouvert | Zone | Candidat |
|---|---|---|
| `zone-marks.ts:56` recompte des fill par la vue complète | app | A |
| `document.rs:423` `read_fill` alloue les anneaux pour color, w, h | cœur | A |
| `element.rs:66` `ImageView` recopie `ImageParams` | cœur | A |
| `workspace.ts:151` remise du type d'un Blob en double | app | B |
| `workspace.ts:379` table `blobs` de l'export PDF | app | B |
| `library.ts:76` `fileNameOf` refait `slug` | app | B |
| `clipboard.ts:7` cycle `clipboard.ts` ↔ `paste.ts` | platform | B |
| `query.rs:233` `snap_box` recopie la boucle de `bounds` | cœur | C |
| `zone.rs:127` union et contour refaits hors de `query.rs` | cœur | C |
| `zip-read.ts:39` Blob reconvertis en octets, mode positionnel | platform | D |
| `library-files.ts:21` `remove("")` = `clear()` | platform | D |
| `format/mod.rs:369` kind de ressource en `&'static str` | cœur | D |
| `fragments.ts:139` « même grille » par `JSON.stringify` | app | D |
| `image-import.ts:244` `ImageTarget` sert à tout l'import | platform | E |

Hors des trois zones : `toolbar-host.ts:45` (zone `apps/web/src`) est **infirmé pour `app/`** : `toolbar-host.ts:83` passe déjà par `presetsOf` ; reste `toolbar.ts:666` (`Object.hasOwn(from.presets, tool)`). À requalifier à son emplacement.

---

## A — Vue légère d'un élément

- **Zone** : `crates/roomboard-core`, `crates/roomboard-wasm`, `apps/web/src/core`, `apps/web/src/app`.
- **Fichiers** : `apps/web/src/app/zone-marks.ts:62` **(v)**, `apps/web/src/app/board-session.ts:266`, `:278`, `:541`, `apps/web/src/app/fragments.ts:86`, `apps/web/src/core/api.ts:334` **(v)**, `apps/web/src/core/fake-core.ts`, `crates/roomboard-wasm/src/lib.rs`, `crates/roomboard-core/src/document.rs:420-432` **(v)**, `crates/roomboard-core/src/fill_element.rs:38`, `crates/roomboard-core/src/element.rs:66` **(v)**, `:99`, `:332-357`.
- **Friction** :
  - Constat `zone-marks.ts:56` (usage-c8-pot-zones) : pour compter les `fill` d'une page, `doc.elementIds(page).filter((id) => doc.element(id)?.kind === "fill")` construit la vue complète de chaque élément et la fait traverser le pont, pour un seul champ. Ce code n'est pas réservé à l'essai : `board-session.ts:637` l'appelle à chaque changement de version. Le piège du coffre mesure ~32 ms sur 63 au cas S6.
  - Constat `document.rs:423` (usage-c8-pot-zones) : la vue d'un `fill` passe par `read_fill`, qui lit tous les anneaux pour ne rendre que `color`, `w`, `h`.
  - Constat `element.rs:66` (usage-c5-image) : `ImageView` recopie les champs d'`ImageParams`, avec deux projections à la main (`read_image`, `params()`).
  - Racine commune : l'interface du document n'a qu'une lecture, la vue complète. Un appelant qui veut le kind, ou une vue qui veut trois champs, paie la lecture entière.
- **Test de suppression** : si on supprimait `ImageView` au profit d'`ImageParams` enveloppé, la complexité ne se disperserait pas ; elle disparaîtrait. `ImageView` est peu profond.
- **Proposition** : une lecture du kind seul, exposée par le cœur, le pont et le faux cœur, utilisée là où seul le kind compte ; une lecture de `fill` qui s'arrête aux champs de la vue ; `ImageView` qui contient les réglages au lieu de les recopier (volet à confirmer : `serde(flatten)` rendrait une `Map` JS par `to_js`, il faut une autre forme).
- **Gain** : coût du recompte des `fill` ramené à un appel léger par élément ; une seule définition des réglages d'image ; tests de contrat fake/vrai qui gagnent un cas simple.
- **Risque** : faible. Contrat `describe.each` fake/vrai cœur à tenir (`docs/plans/usage-cadrage.md:132`) ; module principal à 1 368 840 o pour un budget de 1,5 Mo (marge ~200 Ko, coût d'un accesseur négligeable) ; volet `ImageView` : forme sérialisée à garder identique.
- **Effort** : `courte` (5 à 8 fichiers, Rust et TS). Force : **Fort** (volet `ImageView` : À explorer).

## B — Utilitaires feuilles : Blob, noms de fichiers, cycles d'import

- **Zone** : `apps/web/src/app`, `apps/web/src/platform`.
- **Fichiers** : `apps/web/src/app/container-io.ts:67` **(v)**, `apps/web/src/app/workspace.ts:420`, `:457-464` **(v)**, `apps/web/src/platform/image-import.ts:213` **(v)**, `apps/web/src/platform/media-import.ts:276`, `:360` **(v)**, `apps/web/src/app/library.ts:94-101` **(v)**, `apps/web/src/profile-file.ts:17` **(v)**, `apps/web/src/platform/host-tauri.ts:56`, `apps/web/src/platform/clipboard.ts:7` et `paste.ts:4` **(v)**, `apps/web/src/platform/controller.ts:83`.
- **Friction** :
  - Constat `workspace.ts:151` (usage-c2-depot) : la règle « remettre le type d'un Blob s'il diffère » existe dans `typed` (`container-io.ts:67`, qui n'est pas un sujet de conteneur) et est réécrite en ligne dans `image-import.ts:213`, `media-import.ts:276` et `:360`.
  - Constat `workspace.ts:379` (usage-c12-pdf) : la `Map` `blobs` de l'export PDF (désormais `workspace.ts:457`) garde un Blob par asset alors que `AssetStore.get` rend déjà la même instance.
  - Constat `library.ts:76` (usage-c4-bibliotheque) : `fileNameOf` (`library.ts:94`) refait `slug` (`profile-file.ts:17`) avec un autre repli (« ressource » au lieu de « profil ») et une coupe à 80 caractères ; `normalizeSearch` refait la même normalisation des accents.
  - Constat `clipboard.ts:7` (usage-c3-groupes) : `clipboard.ts` importe `isEditable` de `paste.ts`, qui importe `fromEnvelope` de `clipboard.ts`.
  - Relevés par l'exploration, même nature : `baseName`, utilitaire de chemin, vit dans l'hôte `host-tauri.ts:56` et est importé par `app/` et `typed-files.ts` ; `messageOf` vit dans `controller.ts:83` et sert à cinq modules d'import.
- **Test de suppression** : ces fonctions sont utiles (les supprimer disperserait la règle chez 4 à 7 appelants), mais elles logent dans un module qui n'a rien à voir. Le défaut est de localité, pas de profondeur.
- **Proposition** : un ou deux modules feuilles sans dépendance (types de Blob et noms de fichiers ; petits utilitaires d'entrée), où vivent `typed`, `slug` paramétré par repli et longueur, `baseName`, `isEditable`, `messageOf` ; suppression de la `Map` redondante de l'export PDF.
- **Gain** : une règle par sujet ; le cycle `clipboard`/`paste` disparaît ; `app/` ne dépend plus d'un hôte pour une fonction générique.
- **Risque** : faible. Comportement identique attendu ; seul point d'attention, le commentaire DAPF3 de `workspace.ts:454-457` (copie prise au départ) : vérifier que `tab.assets` reste valide pendant l'export après la fermeture de l'onglet avant de retirer la `Map`.
- **Effort** : `courte` (7 à 9 fichiers, TS seul). Force : **Fort**.

## C — Un module de géométrie dans le cœur

- **Zone** : `crates/roomboard-core`.
- **Fichiers** : `crates/roomboard-core/src/query.rs:32` (`Bounds::union`, privée) **(v)**, `:77` `world_bounds` **(v)**, `:162` `element_geom` (privée) **(v)**, `:323` `bounds` et `:342` `snap_box` **(v)**, `crates/roomboard-core/src/zone.rs:12` (importe `read_shape`, `read_stroke` de `commands.rs`) **(v)**, `:127` `walls_bounds` **(v)**, `:843` `wall_of` **(v)**, `crates/roomboard-core/src/fill_element.rs:86-96`, `crates/roomboard-core/src/shape.rs:315-318`, `crates/roomboard-core/src/commands.rs:380`, `:403`, `:426` **(v)**.
- **Friction** :
  - Constat `query.rs:233` (usage-c9-grille ; ligne à jour : `:342`) : `snap_box` recopie la boucle d'union de `bounds` (`:323`) ; seule la règle de contour d'une forme diffère.
  - Constat `zone.rs:127` (usage-c8-pot-zones) : `walls_bounds` refait l'union de `Bounds::union` parce qu'elle est privée ; `wall_of` refait la cascade `read_stroke` / `read_shape` / `read_fill` d'`element_geom`.
  - Relevés par l'exploration : deux autres boucles min/max (`fill_element.rs:86-96`, `shape.rs:315-318`) ; les lectures `read_stroke`, `read_shape`, `read_text` vivent dans `commands.rs` et sont importées à rebours par `query.rs` et `zone.rs`.
  - Aucun test ne vérifie que `wall_of` et `element_geom` donnent le même contour : les deux copies peuvent diverger sans alerte, alors que le pot (C8) repose sur `wall_of`.
- **Test de suppression** : supprimer `element_geom` disperserait la complexité chez tous ses appelants : il est profond (petite interface `Geom`, gros contenu). Le défaut est qu'il est privé et logé dans `query.rs`, donc recopié ailleurs.
- **Proposition** : sortir la géométrie d'un élément (union de boîtes, boîte monde, contour par kind, lectures typées des traits, formes et textes) dans un module à elle, utilisé par `query.rs`, `zone.rs`, `fill_element.rs` ; `snap_box` et `bounds` partagent la boucle et ne diffèrent que par la règle de contour ; un test de parité entre contour de mur et contour de requête.
- **Gain** : localité (un concept, un fichier) ; les lectures typées quittent `commands.rs` ; la géométrie se teste sans monter un `Document` complet.
- **Risque** : moyen-faible. Ne pas changer les contours voulus différents (HC8-1 : image et texte ferment par leur boîte ; HG6 : accroche sans épaisseur du trait) ; porte S6 (≤ 50 ms, marge mince, HC8-12) à remesurer.
- **Effort** : `courte` (5 à 6 fichiers Rust). Force : **Fort**.

## D — Bibliothèque : octets de bout en bout et interfaces sans sens caché

- **Zone** : `apps/web/src/platform`, `apps/web/src/app`, `crates/roomboard-core`.
- **Fichiers** : `apps/web/src/platform/zip-read.ts:39-52` **(v)**, `apps/web/src/app/library.ts:118` (`bytesOf`) **(v)**, `apps/web/src/platform/library-files.ts:21`, `:33` **(v)**, `crates/roomboard-core/src/format/mod.rs:25-27`, `:368-379` **(v)**, `:267`, `:281`, `apps/web/src/app/fragments.ts:139` **(v)**, `crates/roomboard-core/src/commands.rs:1530` **(v)**.
- **Friction** :
  - Constat `zip-read.ts:39` (usage-c4-bibliotheque) : en mode `pack`, `createZipReader` rend des Blob que `library.ts` reconvertit en octets (deux copies par entrée, jusqu'à 256 Mio, risque iPad H2-7) ; `mode` est le 3e paramètre positionnel, derrière `timeoutMs`.
  - Constat `library-files.ts:21` (usage-c4-bibliotheque) : `remove("")` vaut `clear()` ; la chaîne vide a un sens caché, et `clear` est refusé sur « shared » alors que `remove("")` y délègue.
  - Constat `format/mod.rs:369` (usage-c4-bibliotheque) : le kind d'une ressource est un `&'static str` filtré par un `match` à deux bras ; une erreur de programmation sort en « fichier endommagé ».
  - Constat `fragments.ts:139` (usage-c4-bibliotheque) : `placeGrid` compare les grilles par `JSON.stringify` ; or le vrai cœur rend déjà `unchanged` pour une grille identique (`commands.rs:1530`) et le faux cœur a `sameGrid` (`fake-core.ts:1985`). La règle D38 existe donc trois fois.
- **Test de suppression** : `remove("")` supprimé, la complexité est absorbée par `clear()` ; le test `JSON.stringify` supprimé, le cœur tient déjà la règle. Ces modules sont peu profonds.
- **Proposition** : un lecteur ZIP « paquet » qui rend des octets, avec ses options nommées ; une seule porte pour vider une racine ; un kind de ressource fermé (enum) ; `placeGrid` qui s'en remet au cœur.
- **Gain** : une copie mémoire de moins par entrée de paquet ; interfaces lisibles sans commentaire ; une règle D38 au lieu de trois.
- **Risque** : faible. Le volet Rust touche le module `formats` (45 Ko de marge, décision 0263 : rester en TS côté paquet ; une enum ne change pas cela). Vérifier que `placeGrid` rend toujours « inserted » sur grille identique quand le cœur répond `unchanged`.
- **Effort** : `courte` (6 à 7 fichiers). Force : **Fort** (copie mémoire) / **À explorer** (gain réel sur iPad non mesuré).

## E — Le contexte d'import et un registre qui se décrit lui-même

- **Zone** : `apps/web/src/platform`.
- **Fichiers** : `apps/web/src/platform/image-import.ts:180` (`ImageTarget`), `apps/web/src/platform/media-import.ts:9`, `:266`, `apps/web/src/platform/table-insert.ts:16`, `:48`, `apps/web/src/platform/model3d-handlers.ts:12-13` **(v)**, `apps/web/src/platform/import.ts:21` **(v)**, `:53-60`, `:155-244`, `:261-290`, `apps/web/src/platform/files.ts:71-87`, `apps/web/src/platform/host-fsa.ts:44-52`, `apps/web/src/app/workspace.ts:351`.
- **Friction** :
  - Constat `image-import.ts:244` (usage-c3-groupes ; type défini à `:180`) : `ImageTarget` est le contexte de pose de tout l'import (médias, tableaux, 3D, fragments) mais vit dans le module image.
  - Relevés par l'exploration : ajouter un type importable touche 5 à 7 fichiers (extensions dans `files.ts`, MIME à la main dans `host-fsa.ts`, ordre implicite du registre commenté dans `import.ts:278-286`, champ optionnel dans `ImportDeps`) ; quatre gestionnaires (`rbitem`, `rbpack`, `sheet`, `pdf`) sont écrits dans `import.ts` au lieu d'un module chacun ; cycle `import.ts` ↔ `model3d-handlers.ts` (`hasZipMagic` et types).
- **Test de suppression** : l'aiguilleur `importerOf` est profond (un registre, une détection d'en-tête) ; le garder. C'est la description de chaque type (extensions, MIME, détecteur) qui est dispersée et qu'il faut regrouper par gestionnaire.
- **Proposition** : un module « cible de pose » nommé pour ce qu'il est ; chaque gestionnaire porte ses extensions, ses MIME et sa priorité ; listes de `files.ts` et de `host-fsa.ts` dérivées du registre ; gestionnaires sortis de `import.ts`.
- **Gain** : ajouter un type importable devient un fichier plus une ligne de registre ; cycle cassé ; `import.test.ts` (1024 lignes) peut se répartir par gestionnaire.
- **Risque** : moyen. Ordre de détection (image avant sheet, etc.) à préserver ; filtres du sélecteur par hôte (FSA, repli, Tauri) à garder identiques ; large surface de tests.
- **Effort** : `chantier` (8 à 10 fichiers). Force : **À explorer**.

---

## Non retenus comme candidats (à surveiller)

- **`workspace.ts` (674 l.) et `board-session.ts` (769 l.) fourre-tout** : cinq et sept responsabilités relevées (onglets, PDF, presse-papiers ; rendu, médias, 3D, entrées, zoom), interfaces d'une vingtaine de dépendances, tests de 1485 et 1277 lignes. Aucun constat ouvert ne les vise ; découpage coûteux, à faire par morceaux (d'abord orbite 3D `board-session.ts:487-663`). Pas classé faute de friction consignée.
- **Ajout d'une commande ou d'un kind** : `Command` (`commands.rs:30`), `apply` (`:615`), pont `roomboard-wasm/src/lib.rs` (3627 l.), `api.ts`, `fake-core.ts`. C'est le contrat fake/vrai décidé (`docs/plans/usage-cadrage.md:132`) : pas rouvert sans friction nommée. Un kind fermé (`enum Kind`) au lieu des littéraux (`element.rs:31`) est une piste, sans constat.
- **Zones à moins de 4 constats** (`apps/web/src/core` 2, `apps/web/src/engine` 1, `apps/web/src` 1) : non auditées.

## Ma recommandation

Commencer par **A** : c'est le seul candidat dont le gain se mesure chez l'utilisateur (recompte à chaque version, ~32 ms au cas S6), il est court, et il pose une lecture légère dont C et les futurs chantiers profiteront. **B** suit naturellement : sans risque, TS seul, quatre constats. Si l'on préfère d'abord fiabiliser le pot tout juste livré, **C** passe devant, pour son test de parité `wall_of` / `element_geom`.

## Non couvert

- Aucun build ni test lancé ; gains de performance non mesurés (le seul chiffre est celui du coffre).
- Non relu : `hit_test_path`, l'intérieur de `format/mod.rs` au-delà de la ligne 380, `controller.ts`, `container.ts`, les Workers (`media-players.ts`, `pixel-runner.ts`).
- Zones hors des trois visées, et la coque Tauri.
