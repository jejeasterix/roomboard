# Cadrage — usage-c1-profils (C1 : profils et barre configurable)

Cadré en mode autonome le 2026-11-20 (étage 1, cadreur), sans question posée à Jérôme. Ce cadrage court **cite** U10 à
U15 (`docs/plans/usage-cadrage.md:63-68`, rang 2, fusionné), DAU7 et DAU8 (`:383-394`), D22 et D39
(`docs/plans/socle-cadrage.md:49`, `:66`) et les choix tranchés du lot 5b (`docs/plans/socle-lot5b-PLAN.md:135-161`,
CL5b-9 à CL5b-19) sans les refaire ; il ne tranche que les détails de C1 (P1 à P32). Base : `origin/main` `3057e29`.
Aucun graphe graphify pour RoomBoard (`~/.cache/graphes/` n'a que `claude-config`, `roomflow2`, `roomflow2-web`) :
recherche texte seule. Coffre (`~/SecondBrain`, recherche non dégradée) : aucune décision ni piège RoomBoard sur les
profils dans `02_Decisions` ni `04_Pieges` ; ActCraft (lot 6 « profils », journal du 2026-11-05) est déjà cité par
l'étude `docs/etudes/usage-profils-toolbar.md`. Jérôme, mot pour mot : « Continue d'avancer autant que possible suivant
notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu. » : aucune porte
visuelle ne bloque ce chantier, les choix visuels sont listés pour l'essai (§ 4).

## 1. Demande et gabarit

**Demande.** On choisit un profil, on modifie sa barre (emplacement, taille des boutons, outils montrés ou masqués et
leur ordre, préréglages par outil), on l'exporte et l'importe en `.rbprofile`, et on remet à zéro ; un profil fourni
« Annotation au démarrage » demande `startMode: "desktop-annotation"`, rabattu sans bruit sur `board` là où la capacité
manque (« Un profils pourra permettre le démarrage par défaut en mode annotation de bureau », U14) ; ligne C1 de
`usage-cadrage.md:544`.

**Gabarit.** `chantier`, cadrage court : budget 40 questions, 33 consommées (P1 à P33).

**Contre-relecture, tour 1 (2026-11-20).** Dix arbitrages de l'orchestrateur et ses mineures sont intégrés ; chaque
point qu'ils changent porte « prise par l'orchestrateur, réversible » dans sa colonne source (P3, P6, P10, P15, P17,
P19, P20, P24, P26, P28, P30, P33, S1, S2, S4, HC1-2, HC1-6, HC2-4, HC2-6, HC2-12, fiches de la coque).

## 2. Décisions

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| P1 | Point de départ | C1 **étend** le modèle posé au lot 5b, il ne le refait pas : `parseProfile`, `serializeProfile`, `visibleItems`, `resetPresets`, `resetItemOptions` (`toolbar.ts:365-526`), `ProfileStore` (`profile-store.ts:12-21`), `ActiveProfile` (`ui/active-profile.ts:6-11`), `ToolbarHost` (`app/toolbar-host.ts:7-12`), `layoutFor` (`ui/layout.ts:8`), jetons CSS (`ui/rb.css:1-12`). | U11-U15 ; DAU7 ; brief | oui |
| P2 | Masquer un élément | Nouveau champ connu `ToolItem.hidden?: boolean` (écrit seulement s'il est vrai) ; `visibleItems` saute un élément caché ; l'éditeur montre tous les éléments, cachés compris. Masquer ne supprime pas : l'ordre, l'`id` et les `options` restent (D22 : « masqué, pas supprimé »). | D22 ; U12 (`id` stable) ; HC1-4 | oui jusqu'à la release (HC1-4) |
| P3 | Origine d'un profil | Nouveau champ connu de tête `basedOn?: string` (id du profil livré dont il dérive), écrit par « Enregistrer comme nouveau ». **Origine** (`originOf`) dans cet ordre : le profil livré de même `id` (copie d'un livré, par exemple la copie de `simple`) ; sinon le livré nommé par `basedOn` ; sinon `defaut`. Test : la copie de `simple` a pour origine `simple`, même avec un `basedOn` différent. | U12 (deux remises à zéro, qui exigent une origine) ; `toolbar.ts:514` (`resetPresets(p, tool, from)`) ; HC1-4 ; ordre : prise par l'orchestrateur, réversible | oui jusqu'à la release (HC1-4) |
| P4 | Version mineure | `PROFILE_MINOR` passe de 0 à 1 (champs `hidden`, `basedOn`) ; un profil écrit par l'éditeur ou par l'import porte `minor: max(p.minor, PROFILE_MINOR)`. `schema` reste 1. | U11 (mineure lue, clés conservées) ; `toolbar.ts:14`, `:445` | oui (HC1-4) |
| P5 | Profil livré modifié | U11 appliqué : une copie utilisateur de **même `id`** remplace le livré dans `list()` et `get()` (même place dans la liste) ; « Remettre à zéro ce profil » (P6) la retire. Le lot 5b l'annonçait (« une copie utilisateur de même `id` les remplacera (U11, T89) », `toolbar-profiles.ts:3`) ; le refus actuel (`profile-store.ts:62-63`, `:77-79`) était la règle d'un lot sans éditeur. | U11 ; `toolbar-profiles.ts:3` | oui |
| P6 | Remises à zéro | **Remise n° 1 du brief — « Remettre à zéro le profil courant »** (menu Profil), valable pour tout profil : copie d'un livré → la copie est retirée (retour à l'origine, U11) ; profil de l'utilisateur → barres, taille des boutons, préréglages et `behavior` reviennent à ceux de son origine (P3), `id` et nom gardés ; profil livré sans copie → rien à faire (entrée grisée). **Remise n° 2 du brief — « Tout remettre à zéro »** (menu Profil, après confirmation) : retire tous les profils de l'utilisateur et toutes les copies des livrés, profil actif → `defaut`. Les deux remises de U12 restent, en boutons de l'éditeur sur le brouillon : **« Rétablir les barres »** (barres et taille des boutons de l'origine) et **« Rétablir les préréglages »** (tous les outils). | brief (« le profil courant, tous les profils ») ; U11 ; U12 ; HC1-3 ; prise par l'orchestrateur, réversible | oui, sauf « Tout remettre à zéro » (efface, d'où la confirmation) |
| P7 | Stockage | Inchangé : `ProfileStore` sur `localStorage` (clés `roomboard.profils`, `roomboard.profil-actif`, `profile-store.ts:9-10`), le même dans la WebView de la coque ; aucun composant n'appelle `localStorage`. | D22 ; `socle-cadrage.md:134` ; usage § 8 point 7 ; brief | oui |
| P8 | Profil et document | Le profil ne va jamais dans le `.roomboard`. | D22 | oui |
| P9 | Profils fournis | Trois : `defaut`, `simple` (inchangés), et **`annotation`** « Annotation au démarrage » : barres et préréglages de `defaut`, `behavior.startMode: "desktop-annotation"`. Ses barres viennent de la même fonction que `defaut` (une seule source : le bouton « Importer » d'OD56 y arrive aussi). | brief ; U14 ; CL5b-9 ; HC2-1 | oui |
| P10 | Mode de démarrage | `resolveStartMode(p, caps)` rend `{ mode: StartMode; fellBack: boolean }` : `desktop-annotation` si le profil le demande **et** `caps.desktopAnnotation`, sinon `board` (`fellBack` vrai si le profil demandait autre chose). Au montage, l'application appelle **une fois** `host.setMode(mode)` ; repli sans message pour l'utilisateur. `setMode("board")` local ne fait rien et n'avertit pas ; `setMode("desktop-annotation")` local reste un point d'accroche de C11a (`console.info`, aucun effet). | U14 ; U10 ; `toolbar.ts:492-498` ; `toolbar-host.ts:53-55` ; `board` muet : prise par l'orchestrateur, réversible | oui |
| P11 | Changement à chaud | Choisir un autre profil ne change ni le mode (U14 : « à chaque démarrage ») ni l'outil courant (CL5b-19 : « l'outil courant reste jusqu'au prochain choix ») ; aucun `setTool`. Le moteur ne lit jamais le profil. | U14 ; U15 ; CL5b-19 ; D39 | oui |
| P12 | Taille des boutons | Un seul jeton par profil, `interface.buttonSize` `s \| m \| l`, servi par `--rb-btn-*` ; aucune taille par barre. | U11 ; U12 ; `rb.css:2-4`, `:9-11` | oui |
| P13 | Emplacement d'une barre | Choix parmi `top`, `bottom`, `left`, `right`, `floating` pour **chaque** barre (outils et pages). `floating` garde la place actuelle (coin haut droit de la scène, `rb.css:27`) : ni position ni taille réglables dans C1. | U12 ; CL5b-10 ; HC2-2 | oui |
| P14 | Ordre des éléments | Boutons « Monter » et « Descendre » sur chaque ligne de l'éditeur (clic, clavier) ; un élément qui passe la frontière d'un groupe entre dans le groupe voisin. Aucun glisser HTML5 ; aucun glisser au pointeur dans C1. | U12 (« jamais au glisser HTML5 ») ; U24 ; `socle-lot5b-PLAN.md:171` ; HC1-5 | oui |
| P15 | Ajouter un élément absent | Catalogue d'une barre de rôle `tools` = `TOOL_TABLE` et `ACTION_TABLE` (`toolbar.ts:80`, `:93`) ; d'une barre de rôle `pages` = `ACTION_TABLE` seule (aucun outil) ; moins ce que la barre a déjà. L'élément ajouté va en fin de barre ; son `id` = l'id de l'outil ou de l'action s'il est libre dans tout le profil, sinon `<id>-<n>` (premier libre). Pas de suppression : masquer suffit (P2). | U12 ; `toolbar.ts:228` (doublon) ; HC2-9 ; barre `pages` : prise par l'orchestrateur, réversible | oui |
| P16 | Élément inconnu dans l'éditeur | Outil, action ou capacité inconnus (profil plus récent) : ligne grisée « inconnu (version plus récente) », déplaçable, jamais réécrite autrement que telle quelle. | U13 | oui |
| P17 | Préréglages modifiables | Table par outil des champs que le moteur applique : `pen` → `color`, `width` (seul `setPenStyle` existe, `engine.ts:446`). Pour le stylo : ajouter (en fin de liste), retirer, renommer, couleur (`<input type=color>`), épaisseur (nombre > 0) ; **ordre fixe** (pas de Monter / Descendre pour les préréglages). Les préréglages des autres outils sont gardés tels quels, non montrés. | U11 ; U12 ; `toolbar-host.ts:41-48` ; HC2-3 ; ordre fixe : prise par l'orchestrateur, réversible | oui |
| P18 | Rangée contextuelle | Les préréglages de l'outil actif s'affichent en fin de la barre de rôle `tools` (après un séparateur), boutons `data-preset="<id>"` (jamais `data-item`) ; clic = `host.setTool(tool, presetId)`. Rien pour un outil sans préréglage. Sans elle, un préréglage ajouté ne se voit nulle part (le lot 5b n'en montre aucun). | U12 (« rangée contextuelle dérivée des préréglages de l'outil actif ») ; `Toolbar.tsx:43-52` ; HC1-1 | oui |
| P19 | Préréglage enfoncé | **Aucun état enfoncé** pour les boutons de préréglage dans C1 (non indispensable : le trait suivant montre la couleur) ; aucun signal ajouté, aucune enveloppe de l'hôte dans `App`. | usage § 8 point 17 ; `item-state.ts:3-10` ; HC2-6 ; prise par l'orchestrateur, réversible | oui |
| P20 | Forme de l'éditeur | Panneau passager `rb-popover` (comme les réglages), trois sections : **Général** (nom, démarrage, taille des boutons), **Barres** (par barre : emplacement, éléments), **Préréglages** (stylo). Travail sur un **brouillon**, **sans aperçu en direct** : les barres ne changent qu'à « Enregistrer » (ou « Enregistrer comme nouveau »), qui applique le brouillon et le rend actif. Fermer l'éditeur ou ouvrir un autre panneau **abandonne le brouillon sans confirmation**. | étude § « Acquis ActCraft » (`ProfileEditor.qml`) ; CL5b-10 ; HC1-2 ; prise par l'orchestrateur, réversible | oui |
| P21 | Ouvrir l'éditeur | Depuis le menu « Profil » existant (action `profiles`) : **aucune action nouvelle** dans `ACTION_TABLE` (fichier partagé avec OD56). | `toolbar.ts:107` ; `toolbar-host.ts:36` ; carte d'impact § Chantiers | oui |
| P22 | Sélecteur | `ProfileMenu` étendu : les `menuitemradio` `data-profile` restent (essai s5b), suivis de « Modifier… », « Importer… », « Exporter… », « Remettre à zéro ce profil » (P6, remise n° 1 ; grisée pour un livré sans copie), « Supprimer » (profil de l'utilisateur seulement), « Tout remettre à zéro » (P6, remise n° 2). | CL5b-9 ; CL5b-11 ; `ProfileMenu.tsx:10-28` ; `s5b-navigateur.mjs:76-77` | oui |
| P23 | Fichier exporté | `JSON.stringify(serializeProfile(p), null, 2)`, `format: "roomboard-profile"`, type `application/vnd.roomboard.profile+json`, nom `<slug du libellé>.rbprofile` (`Par défaut` → `par-defaut.rbprofile`). Un livré s'exporte aussi. | U8 ; U11 ; HC2-10 | oui jusqu'à la release (HU1-1) |
| P24 | Import | Texte → `profileFromText` (`JSON.parse`, échec = erreur lisible, puis `parseProfile` et la garantie de P33) : erreurs → `ShellPort.notify` (dont « mettez RoomBoard à jour »), avertissements → `console.warn` (U13 : « avertissement dans le journal »). Décision d'import en **fonction pure** `planImport(p, existing, builtinIds)` de `profile-file.ts` (DAC1-3), testée : id libre → `{ kind: "add" }` ; id pris (livré ou utilisateur) → `{ kind: "confirm", message: "Remplacer le profil « <libellé existant> » ?" }`. Oui = remplace (copie de même id pour un livré, P5) ; **Annuler = rien n'est importé**. Le profil importé devient actif. Import et export restent hors de `ProfileStore` (écart à U11, HC2-12). | U11 ; U13 ; HC2-4 ; prise par l'orchestrateur, réversible | oui |
| P25 | Choisir et écrire le fichier | Port neuf `ProfileFiles` (DAC1-3) : web (Chromium FSA ou repli, iPad) = `browserFallbackDeps().pickFile(accept)` et `.download(name, bytes, mime)` (`host-repli.ts:65`, `:79`, `:121`) ; coque = `TauriDialog.open/save` avec le filtre `rbprofile` puis `TauriFs.readFile/writeFile` (`host-tauri.ts:23-33`, `:196`). Permissions déjà là (`capabilities/default.json` : `dialog:allow-open`, `dialog:allow-save`, `fs:allow-read-file`, `fs:allow-write-file`). | étude § « Ce qui marche sur iPad » (`<input type=file>`, téléchargement / dialogues natifs) ; D26 ; HC2-7 | oui |
| P26 | `.rbprofile` déposé ou passé au lancement | Hors C1 et **non attribué** : aucun chantier ne le prend aujourd'hui, C1 ne prévoit aucune entrée `profile` dans un registre d'importeurs ; un `.rbprofile` déposé garde le refus actuel (« format pris en charge dans une prochaine version », `platform/import.ts:8`). C1 n'écrit rien dans `platform/import.ts`. Le chantier qui le prendra appellera `profileFromText` et `planImport`. | U25 (« proposé à l'import ») ; HC2-5 ; prise par l'orchestrateur, réversible | oui |
| P27 | Association `.rbprofile` au système, profil par utilisateur du système | Hors C1. | brief ; `usage-cadrage.md:544` (« manquent ») | oui |
| P28 | Identifiant d'un nouveau profil | « Enregistrer comme nouveau » propose le nom « <nom> (copie) » dans un champ modifiable ; id = slug du nom (`[a-z0-9-]`, accents retirés, vide → `profil`), rendu unique par `uniqueId(base, taken)` (`<slug>-<n>`, premier libre), jamais l'id d'un livré ; nom vide refusé. | U11 ; `toolbar.ts:388` (libellé non vide) ; HC2-11 ; « (copie) » : prise par l'orchestrateur, réversible | oui |
| P29 | Essai e2e | Nouveau `scripts/essais/c1-profils-navigateur.mjs` (Playwright Chromium, `?fichiers=repli`) qui joue S1 et S2 ; `--captures` écrit `docs/essais/c1-editeur.png` et `docs/essais/c1-barre-gauche-l.png` ; ajouté au bloc `--e2e` de `verifier.sh` sans option de capture et à la liste de `verifier-e2e.test.sh:13`. | brief ; `verifier.sh:68-75` ; `verifier-e2e.test.sh:13-16` | oui |
| P30 | Exemples de profils | Fichiers d'exemple dans `apps/web/src/fixtures/profils/` : `1.2-outil-inconnu.rbprofile` (mineure 2, plus récente que la 1 de C1 ; outil, action et capacité inconnus, clés inconnues à chaque niveau), `2.0-majeure.rbprofile` ; lus par les tests et par l'e2e. | étude § « Schéma versionné » (`fixtures/`) ; patron `src/core/fixtures/element-inconnu.fake.json` ; HC2-8 ; 1.2 : prise par l'orchestrateur, réversible | oui |
| P31 | Dépendances | Aucune dépendance nouvelle (dépôt public, PolyForm Shield, pas de GPL) : SolidJS 1.9.20 figé, éléments HTML natifs. Aucun build Tauri. | brief ; CL5b-17 ; profil (un seul build Tauri, ici aucun) | oui |
| P32 | Constats d'architecture | Aucun constat ouvert dans les zones de C1 (les quatre visent `core/` et `crates/`) ; aucune zone « à fermer ». `toolbar.ts` (526 lignes) ne reçoit que les champs du modèle : les opérations d'édition vont dans un module neuf (DAC1-1). | `docs/architecture-constats.md` | oui |
| P33 | Jamais enfermé hors du menu Profil | L'action `profiles` **ne peut pas être masquée** : l'éditeur la montre grisée, sans case « montrer » (elle reste déplaçable). `parseProfile` garantit l'accès : si aucun élément `action: "profiles"` visible n'existe dans une barre de rôle `tools`, il en ajoute un en fin de la première barre `tools` (id `profiles`, ou `profiles-<n>` s'il est pris) et pousse l'avertissement « accès au menu Profil ajouté » ; un `hidden: true` sur cet élément est ignoré (avertissement) ; sans barre `tools`, il ajoute une barre `outils` (`role: "tools"`, `dock: "top"`) qui le porte. L'import passe par `parseProfile` et hérite de la règle. Tests unitaires : profil sans `profiles`, `profiles` caché, profil sans barre `tools`. | prise par l'orchestrateur, réversible (contre-relecture tour 1, bloquant) ; HC1-6 | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites (modèle, stockage et fichiers, interface,
amorce, coque, essais et tests). Chemins de `apps/web/src/` sauf mention ; lignes de `origin/main` `3057e29`.

### Modèle du profil

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.ts:14` `PROFILE_MINOR` | oui | 0 → 1 (P4) | V |
| `toolbar.ts:35-46` `ToolItem` | oui | `hidden?` (P2) | V |
| `toolbar.ts:64-74` `Profile` | oui | `basedOn?` (P3) | V |
| `toolbar.ts:130`, `:138` `PROFILE_KEYS`, `ITEM_KEYS` | oui | clés connues `basedOn`, `hidden` | V |
| `toolbar.ts:221-257` `parseItem` | oui | lit `hidden` (booléen, sinon erreur) | V |
| `toolbar.ts:365-410` `parseProfile` | oui | lit `basedOn` (chaîne non vide facultative) ; garantit l'accès `profiles` (P33) | V |
| `toolbar.ts:414-460` `serializeItem`, `serializeProfile` | oui | écrit `hidden` si vrai, `basedOn` si présent | V |
| `toolbar.ts:476-486` `visibleItems` | oui | saute `hidden` | V |
| `toolbar.ts:492-498` `resolveStartMode` | oui | capacité lue (P10) | V |
| `toolbar.ts:501-526` `resetItemOptions`, `resetPresets` | non | réutilisés par les remises à zéro | V |
| `toolbar.ts:80-117` `TOOL_TABLE`, `ACTION_TABLE`, `isKnown*` | non | lus par le catalogue (P15) ; aucune action nouvelle (P21) | V |
| `toolbar.ts:16-33` `DOCKS`, `BUTTON_SIZES`, `START_MODES`, `CAPABILITY_KEYS` | non | lus par l'éditeur | V |
| `profile-edit.ts` (nouveau) | oui | opérations pures d'édition (DAC1-1) | S |
| `profile-file.ts` (nouveau) | oui | texte ↔ profil, nom de fichier, slug, `uniqueId`, `planImport` (DAC1-3) | S |
| `toolbar-profiles.ts:3` | oui | commentaire : la copie remplace (P5) | V |
| `toolbar-profiles.ts:45-68`, `:100-104` | oui | barres de `defaut` en fonction partagée, profil `annotation`, `BUILTIN_PROFILES` à trois (P9) | V |
| `toolbar-profiles.ts:70-91` `SIMPLE_PROFILE_JSON` | non | inchangé | V |
| `runtime-capabilities.ts:14-24` | non | `desktopAnnotation` déjà publié ; correction Wayland = C11a (U20) | V |

### Stockage et fichiers

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `profile-store.ts:12-21` `ProfileStore` | oui | `isBuiltin`, `hasOverride`, `revert`, `resetAll` ; `isReadOnly` retiré (DAC1-2) ; import et export restent dehors (HC2-12) | V |
| `profile-store.ts:58-72` lecture du stockage | oui | une entrée d'id livré devient une copie (P5) | V |
| `profile-store.ts:75-105` `persist`, `guard`, `save`, `remove` | oui | `save` d'un id livré permis ; `remove` d'un id livré = refus (passer par `revert`) | V |
| `profile-store.ts:108-114` `browserKeyValue` | non | réutilisé | V |
| `platform/host-repli.ts:65-125` `browserFallbackDeps` (`pickFile`, `download`) | non | réutilisé par `ProfileFiles` web (P25) ; **modifié par OD56** (`pick`) | V |
| `platform/host-tauri.ts:23-33`, `:196` `TauriDialog`, `TauriFs`, `loadTauriPorts` | non | réutilisés par `ProfileFiles` coque ; **modifié par OD56** (`pick`) | V |
| `platform/files.ts:6-9`, `:71-77` `ShellPort` | non | `confirm`, `notify` réutilisés ; extension `.roomboard` inchangée | V |
| `platform/import.ts:32-66` `createImporter` | non | `.rbprofile` déposé hors C1 (P26) ; **réécrit par OD56** | V |
| `localStorage` `roomboard.profils`, `roomboard.profil-actif` | oui | contenu : copies de livrés, champs `hidden`, `basedOn`, `minor: 1` | V |
| fichier `.rbprofile` (nouveau sur disque) | oui | P23 | S |

### Interface

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `ui/active-profile.ts:6-30` `ActiveProfile` | oui | `profiles()` en signal, `refresh()` (DAC1-2) ; aucun aperçu (P20) | V |
| `ui/ProfileMenu.tsx:10-28` | oui | sélecteur étendu (P22) | V |
| `ui/ProfileEditor.tsx` (nouveau) | oui | l'éditeur (P20) | S |
| `ui/Toolbar.tsx:43-52`, `:58-74` | oui | rangée contextuelle pour `role: "tools"` (P18) | V |
| `ui/item-state.ts:3-10`, `:41-43` | non | `pressed` des outils inchangé ; aucun état enfoncé de préréglage (P19) | V |
| `app/stage-tags.ts` | non | non touché (consigne de la contre-relecture) | V |
| `ui/PagesBar.tsx` | non | suit déjà `dock` et `size` ; ses éléments masqués passent par `visibleItems` | V |
| `ui/layout.ts:8-23` `layoutFor` | non | gère déjà les cinq emplacements | V |
| `ui/App.tsx:100-108` hôte local | oui | `host.setMode(resolveStartMode(...).mode)` une fois au montage (P10) ; aucune enveloppe (P19) | V |
| `ui/App.tsx:110-114` profil, taille, barres | non | lisent `props.active.profile()`, mis à jour par « Enregistrer » | V |
| `ui/App.tsx:177-188` menu des profils | oui | panneau « profiles » → menu ou éditeur ; changer de panneau abandonne le brouillon (P20) | V |
| `ui/App.tsx:26-37` `AppProps` | oui | `profileFiles: ProfileFiles` | V |
| `ui/rb.css` | oui | styles de l'éditeur et de la rangée (jetons existants, aucune taille en pixels dans les composants) | V |
| `ui/SettingsPanel.tsx`, `ui/TabsBar.tsx` | non | sans lien | V |
| `app/toolbar-host.ts:39-56` `createLocalToolbarHost` | oui | `setMode("board")` muet, `setMode("desktop-annotation")` : `console.info` C11a (P10) | V |
| `app/toolbar-host.ts:22-37` `ACTIONS` | non | aucune action nouvelle (P21) ; **modifié par OD56** (`file-import`) | V |
| `engine/engine.ts:446` `setPenStyle` | non | appelé par `setTool(tool, preset)` comme au lot 5b | V |

### Amorce et coque

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `main.ts:51` `loadTauriPorts()` | oui | `dialog` et `fs` gardés pour `ProfileFiles` (aujourd'hui seul `ipc` est pris) | V |
| `main.ts:64-68` magasin, profil actif | oui | `ProfileFiles` créé, passé à `mountApp` | V |
| `main.ts:99-110` `mountApp` | oui | prop `profileFiles` | V |
| `apps/desktop/src-tauri/capabilities/default.json` | non | permissions de dialogue et de fichiers déjà là | V |
| `apps/desktop/src-tauri/tauri.conf.json` (association) | non | association `.rbprofile` hors C1 (P27) | V |
| `crates/roomboard-core/src/capabilities.rs:14-29` | non | table statique gardée (U10, D23) | V |

### Essais et tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `toolbar.test.ts:139-140` (`resolveStartMode` toujours `board`) | oui | `desktop-annotation` rendu avec la capacité | V |
| `toolbar.test.ts` (reste : versions, clés inconnues, doublons) | oui (ajouts) | anciens tests gardés verts ; ajouts `hidden`, `basedOn`, mineure 1, accès `profiles` garanti (P33 : absent, caché, sans barre `tools`) | V |
| `profile-store.test.ts:32` « profil defaut en lecture seule » | oui | devient « copie de defaut, revenir à l'origine » (P5) | V |
| `profile-store.test.ts:85` « profil livré présent dans le stockage : ignoré » | oui | devient « copie lue » | V |
| `toolbar-profiles.test.ts:10` « defaut et simple sont valides » | oui | trois profils ; `annotation` valide, `startMode` | V |
| `toolbar-profiles.test.ts:18-38` (inventaire, liste, simple, figés) | non | à garder vert | V |
| `app/toolbar-host.test.ts:78` `setMode` | oui | `board` : rien, aucun avertissement ; `desktop-annotation` : message C11a | V |
| `app/toolbar-host.test.ts:41` « chaque action d'ACTION_TABLE a son entrée » | non | à garder vert (aucune action nouvelle) | V |
| `ui/active-profile.test.ts:22-62` | oui | `startMode` avec capacité ; liste en signal ; `refresh` | V |
| `ui/ProfileMenu.test.tsx:14-39` | oui | entrées nouvelles ; les trois tests gardés | V |
| `ui/Toolbar.test.tsx:84-140` | oui | rangée contextuelle ; un clic sur un préréglage appelle `setTool("pen", id)` (couleur et épaisseur vérifiées ici et dans `toolbar-host.test.ts`, pas à l'e2e) ; « outil inconnu : bouton absent » et attributs gardés | V |
| `ui/App.test.tsx` | oui | ajouts : `setMode` au montage, panneau éditeur, « Enregistrer » applique, changer de panneau abandonne le brouillon | V |
| `ui/App.test.tsx:259` « changer de profil : barre à gauche… » | non | à garder vert | V |
| `ui/layout.test.ts`, `ui/item-state.test.ts`, `ui/PagesBar.test.tsx` | non | à garder verts | V |
| `profile-edit.test.ts`, `profile-file.test.ts`, `ui/ProfileEditor.test.tsx` (nouveaux) | oui | logique pure et composant | S |
| `scripts/essais/s5b-navigateur.mjs:76-134`, `:283-288` | non | à garder vert : `[data-profile]`, neuf outils sous `defaut`, trois sous `simple` (`button[data-item]` seulement : la rangée utilise `data-preset`) | V |
| `scripts/essais/c1-profils-navigateur.mjs` (nouveau) | oui | P29 | S |
| `scripts/verifier.sh:68-75` bloc `--e2e` | oui | une ligne | V |
| `scripts/tests/verifier-e2e.test.sh:13` | oui | `c1-profils-navigateur` dans la liste | V |
| `docs/essais/c1-editeur.png`, `docs/essais/c1-barre-gauche-l.png` (nouveaux) | oui | captures demandées | S |
| `docs/essais/s5b-*.png` | non | non réécrites | V |
| `docs/essais/coque-windows.md`, `docs/essais/coque-macos.md` | oui | section courte « Profils (C1) » à jouer à la main : Profil → Exporter (boîte native, filtre `rbprofile`, fichier écrit), « Tout remettre à zéro », Importer (boîte native) : barre retrouvée ; profil « Annotation au démarrage », relancer : tableau, aucun message (C11a absent) ; prise par l'orchestrateur, réversible | V |

### Effets de bord sur l'existant

- Un profil stocké d'id livré n'est plus écarté : il remplace le livré (P5). Couvert par `profile-store.test.ts`
  (« copie de defaut lue au démarrage », « revenir à l'origine rend le livré »).
- `save(defaut)` ne lève plus ; `remove(defaut)` lève toujours (« passer par revert »). Couvert par
  `profile-store.test.ts`.
- `resolveStartMode` rend `desktop-annotation` quand la capacité est vraie (coque Windows, macOS, Linux) ; tant que
  C11a manque, `setMode` local ne fait rien : la coque démarre en tableau. Couvert par `toolbar.test.ts` et
  `toolbar-host.test.ts` (« setMode desktop-annotation : aucun effet, message C11a »).
- Les profils écrits portent `minor: 1` : `main` d'avant C1 les lirait avec un avertissement (aucune release, aucun
  profil dans la nature). Couvert par `toolbar.test.ts` (« écriture en 1.1 »).
- La barre d'outils gagne la rangée des préréglages du stylo quand le stylo est actif (trois boutons de plus sous
  `defaut` et `simple`). Couvert par `Toolbar.test.tsx` et par `s5b-navigateur.mjs` (aucun bouton sur la scène).
- Le menu Profil gagne des entrées sous les profils. Couvert par `ProfileMenu.test.tsx` et `s5b-navigateur.mjs:76-77`.
- Le profil `annotation` apparaît dans le menu. Couvert par `toolbar-profiles.test.ts`.
- Un profil stocké ou importé sans accès au menu Profil en reçoit un (P33) : la barre change à la lecture. Couvert par
  `toolbar.test.ts` (« accès profiles ajouté », « profiles caché : montré », « sans barre tools : barre outils
  ajoutée ») ; les livrés l'ont déjà (aucun avertissement, `toolbar-profiles.test.ts:10`).
- `setMode("board")` n'avertit plus dans la console. Couvert par `toolbar-host.test.ts`.

### Chantiers en cours

- **OD56 `feat/usage-c2-depot`** (`~/projets/roomboard-wt/usage-c2-depot`) : branche sans commit au-delà d'`origin/main`
  (en retard de 39), pas de branche distante, seul son cadrage non suivi existe : `git diff` impossible, fichiers lus dans
  `docs/plans/usage-c2-depot-cadrage.md` (carte d'impact). **Fichiers partagés avec C1** : `apps/web/src/toolbar.ts`
  (OD56 : `file-import` dans `ACTION_TABLE` ; C1 : modèle, lignes différentes), `apps/web/src/toolbar-profiles.ts`
  (OD56 : bouton « Importer » ligne 60 ; C1 : fonction partagée et profil `annotation` — conflit sûr, une ligne à
  reporter), `apps/web/src/ui/App.tsx` (OD56 : cible `pick` l. 103-104 ; C1 : l. 100-108 et 177-188 — conflit
  probable), `apps/web/src/main.ts` (OD56 : `paste` ; C1 : `ProfileFiles`), `scripts/verifier.sh` et
  `scripts/tests/verifier-e2e.test.sh:13` (chacun une ligne d'essai), `apps/web/src/toolbar*.test.ts`,
  `apps/web/src/ui/Toolbar.test.tsx`. **Lus par C1, modifiés par OD56** : `platform/host-repli.ts`,
  `platform/host-tauri.ts`, `app/toolbar-host.ts` (`ACTIONS`), `platform/import.ts`. Règle : C1 ne modifie pas ces
  quatre-là, hormis `toolbar-host.ts:53-55` (`setMode`, hors des lignes d'OD56). Au rebase sur OD56 fusionnée, C1
  adapte `platform/profile-files.ts` si `browserFallbackDeps`, `pickFile`, `download`, `TauriDialog` ou `TauriFs`
  changent de forme (prise par l'orchestrateur, réversible).
- Aucune PR ouverte (`gh pr list`). Autres worktrees : `~/projets/roomboard` (`main`, propre). Aucune autre machine
  donnée par l'orchestrateur.

### Termes cherchés

- Graphe : aucun (`~/.cache/graphes/roomboard` absent).
- Texte (`grep -rn`, `apps/web/src`, `scripts/essais`, `docs/plans`) : `parseProfile`, `ToolbarHost`, `ProfileStore`,
  `startMode`, `resolveStartMode`, `preset`, `setPenStyle`, `rbprofile`, `roomboard.profil`, `data-profile`,
  `isReadOnly`, `lecture seule`, `profil livré`, `copie utilisateur`, `filechooser`, `waitForEvent`, `download`,
  `pickFile`, `loadTauriPorts`, `ACTION_TABLE`, `U1[0-5]`, `DA10`, `D22`, `D39`, `T89`, `CL5b-`.
- Coffre : `chercher.js "roomboard profils barre configurable rbprofile" 8`, `"roomboard toolbar éditeur profils
  localStorage" 6`, `"roomboard" 8`, `"tauri webview téléchargement fichier export download" 5`.
- Autre chantier : `git worktree list`, `gh pr list --state open`, `git diff origin/main...origin/feat/usage-c2-depot`
  (révision inconnue), `git -C ~/projets/roomboard-wt/usage-c2-depot log origin/main..HEAD` (vide).

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| Lire et valider un profil, clés inconnues | `toolbar.ts:365` `parseProfile` | `parseProfile(json: unknown): ParsedProfile` + champs `hidden`, `basedOn` | étendre |
| Écrire un profil | `toolbar.ts:440` `serializeProfile` | `serializeProfile(p: Profile): Record<string, unknown>` + `hidden`, `basedOn` | étendre |
| Éléments affichés | `toolbar.ts:476` `visibleItems` | `visibleItems(bar, caps): ToolItem[]`, saute `hidden` | étendre |
| Mode de démarrage | `toolbar.ts:492` `resolveStartMode` | `resolveStartMode(p, caps): { mode: StartMode; fellBack: boolean }` | étendre |
| Rétablir les préréglages | `toolbar.ts:514` `resetPresets` | `resetPresets(p, tool, from)` appelé pour chaque outil de `p` et de `from` | réutiliser |
| Catalogue des outils et actions | `toolbar.ts:80`, `:93`, `:111`, `:115` | `TOOL_TABLE`, `ACTION_TABLE`, `isKnownTool`, `isKnownAction` | réutiliser |
| Profils fournis | `toolbar-profiles.ts:45-104` | `BUILTIN_PROFILES`, `builtinProfile(id)` ; `ANNOTATION_PROFILE_ID = "annotation"` | étendre |
| Stocker, copier un livré, effacer | `profile-store.ts:12` `ProfileStore` | voir DAC1-2 | étendre |
| Profil actif, liste réactive | `ui/active-profile.ts:6` `ActiveProfile` | voir DAC1-2 | étendre |
| Opérations d'édition (emplacement, taille, masquer, ordre, ajouter, préréglages, rétablir barres) | aucun (termes `moveItem`, `setDock`, `hidden`, `addPreset`, `resetToolbars`, `edit` : rien hors `resetPresets`, `resetItemOptions`) | voir DAC1-1 | nouveau module `profile-edit.ts` |
| Texte ↔ profil, nom de fichier, slug, id unique, décision d'import | aucun (termes `slug`, `rbprofile`, `JSON.stringify(serialize`, `fileName`, `uniqueId`, `collision`, `import` dans `profile-store.ts` : rien) ; `parseProfile`, `serializeProfile` appelés | voir DAC1-3 | nouveau module `profile-file.ts` |
| Garantir l'accès au menu Profil | `toolbar.ts:365` `parseProfile` (avertissements déjà rassemblés dans `ctx.warnings`) | même sortie `ParsedProfile`, avertissement « accès au menu Profil ajouté » | étendre (P33) |
| Choisir un fichier, écrire un fichier (web) | `platform/host-repli.ts:65` `browserFallbackDeps` | `pickFile(accept): Promise<PickedFile \| null>`, `download(name, bytes, mime)` | réutiliser |
| Choisir, lire, écrire un fichier (coque) | `platform/host-tauri.ts:23-33`, `:196` | `TauriDialog.open({ multiple: false, directory: false, filters })`, `TauriDialog.save({ defaultPath, filters })`, `TauriFs.readFile`, `TauriFs.writeFile`, `loadTauriPorts()` | réutiliser |
| Port de fichiers de profil | aucun (`FileHost` ne vise que `.roomboard`, `files.ts:9`, `:60` ; OD56 lui ajoute `pick()` multiple) | voir DAC1-3 | nouveau module `platform/profile-files.ts` |
| Confirmer, annoncer | `platform/files.ts:71` `ShellPort` | `confirm(message)`, `notify(message)` | réutiliser |
| Appliquer un préréglage au moteur | `app/toolbar-host.ts:41` `setTool(tool, preset?)` | appelé tel quel par la rangée | réutiliser |
| Appliquer le mode de démarrage | `app/toolbar-host.ts:53` `setMode(mode)` | appelé une fois au montage | étendre (message C11a) |
| Rendu d'une barre, emplacement, taille | `ui/Toolbar.tsx:58`, `ui/layout.ts:8`, `ui/rb.css:1-12` | `Toolbar` reçoit `presets` et `activePreset` ; `layoutFor`, `--rb-btn-*` inchangés | étendre / réutiliser |
| Menu des profils | `ui/ProfileMenu.tsx:10` | `ProfileMenuProps` + `edit()`, `importFile()`, `exportActive()`, `resetCurrent()`, `remove()`, `resetAll()`, `canResetCurrent`, `canRemove` | étendre |
| Panneau passager | `ui/rb.css:28` `.rb-popover`, `ui/App.tsx:163-188` | même panneau, `Panel = "settings" \| "profiles" \| "editor"` | réutiliser |
| Glisser au navigateur, téléchargement, `filechooser` | `scripts/essais/commun.mjs`, `fichiers-navigateur.mjs:206-250` | mêmes aides Playwright | réutiliser |

## 4. Hypothèses à revoir

### Niveau 1 — difficiles à défaire ou visibles des utilisateurs

- **HC1-1** Rangée contextuelle des préréglages **dans** la barre d'outils, en fin de barre après un séparateur, pour
  l'outil actif seulement (P18). Autre choix : une barre `role: "presets"` à part. Choix visuel, à la porte de fin.
- **HC1-2** Éditeur en panneau passager à trois sections, sur un brouillon **sans aperçu en direct** : « Enregistrer »
  applique ; fermer ou changer de panneau abandonne le brouillon sans confirmation (P20 ; prise par l'orchestrateur,
  réversible). Design : celui du projet (`rb.css`, panneau des réglages), principes `impeccable` (cibles
  ≥ `--rb-btn-m`, libellés en clair, aucune icône seule). Choix visuel, à la porte de fin.
- **HC1-3** Remises à zéro (P6) : n° 1 du brief « Remettre à zéro ce profil » (copie retirée, ou profil de
  l'utilisateur ramené à son origine, `id` et nom gardés) ; n° 2 du brief « Tout remettre à zéro » (après
  confirmation, efface) ; plus les deux boutons de U12 dans l'éditeur (barres, préréglages).
- **HC1-4** Champs nouveaux du format échangé : `hidden` (élément), `basedOn` (profil), `minor: 1` (P2-P4). Réversibles
  tant qu'aucune release n'a publié de `.rbprofile` (HU1-1) ; ensuite, une migration.
- **HC1-5** Réordonner les éléments de barre par « Monter » / « Descendre », sans glisser (P14) ; les préréglages ont
  un ordre fixe (P17). Glisser au pointeur : plus tard, sans changer le modèle.
- **HC1-6** L'action `profiles` n'est jamais masquable, et la lecture d'un profil l'ajoute si elle manque (P33 ; prise
  par l'orchestrateur, réversible) : un profil importé peut gagner un bouton qu'il n'avait pas.

### Niveau 2

- **HC2-1** Profil `annotation` = barres et préréglages de `defaut` (P9) ; pas de barre réduite façon ActCraft avant
  C11a.
- **HC2-2** `floating` proposé sans position ni taille réglables (P13).
- **HC2-3** Préréglages modifiables : stylo seul (P17) ; une table par outil accueillera gomme, texte, formes quand le
  moteur saura les appliquer.
- **HC2-4** Import d'un id pris : confirmation « Remplacer » ; Annuler n'importe rien ; le profil importé devient
  actif (P24 ; prise par l'orchestrateur, réversible).
- **HC2-5** `.rbprofile` déposé ou passé au lancement : non attribué, refus actuel gardé (P26).
- **HC2-6** Aucun état enfoncé pour les préréglages (P19 ; prise par l'orchestrateur, réversible) ; le style du stylo
  reste propre à l'onglet, comme au lot 5b.
- **HC2-7** Chemin de la coque (dialogues natifs) testé par faux ports seulement : aucun build Tauri ; essai à la fiche
  de la coque (Windows par la file du PC, macOS par Jérôme).
- **HC2-8** Emplacement des exemples : `apps/web/src/fixtures/profils/` (P30).
- **HC2-9** Pas de suppression d'élément dans l'éditeur ; id d'un élément ajouté = id de l'outil s'il est libre (P15).
- **HC2-10** Nom du fichier exporté = slug du libellé (P23).
- **HC2-11** « Enregistrer comme nouveau » propose « <nom> (copie) » ; id = slug unique du nom (P28).
- **HC2-12** Écart à U11 : import et export ne sont pas des méthodes de `ProfileStore` (U11 les y liste) mais des
  fonctions pures de `profile-file.ts` et le port `ProfileFiles` ; le magasin reste sans fichier ni boîte (P24,
  DAC1-3 ; prise par l'orchestrateur, réversible).

## 5. Décisions d'architecture

**DAC1-1 — Opérations d'édition pures dans `profile-edit.ts`.**
Contexte : l'éditeur change emplacement, taille, éléments, préréglages ; `toolbar.ts` fait déjà 526 lignes.
Décision : fonctions pures `Profile → Profile`, sans DOM, qui gardent `rest` à chaque niveau : `setLabel(p, label)`, `setStartMode(p, mode)`, `setButtonSize(p, size)`, `setDock(p, barId, dock)`, `setHidden(p, itemId, hidden)`, `moveItem(p, barId, itemId, delta: -1 | 1)`, `catalog(p, barId): CatalogEntry[]`, `addItem(p, barId, entry)`, `presetFields(tool): readonly PresetField[]`, `addPreset(p, tool)`, `updatePreset(p, tool, id, patch)`, `removePreset(p, tool, id)`, `resetToolbars(p, from)`, `resetAllPresets(p, from)`, `resetToOrigin(p, from)` (barres, taille, préréglages, `behavior` de `from` ; `id`, nom, `basedOn` gardés), `originOf(p, builtins): Profile` (livré de même `id`, puis `basedOn`, puis `defaut`), `canHide(item)` (faux pour `action: "profiles"`).
Conséquences : chaque geste de l'éditeur se teste sans interface, clés inconnues comprises ; le composant ne fait qu'appeler ces fonctions.

**DAC1-2 — `ProfileStore` et `ActiveProfile` étendus (copie par-dessus un livré).**
Contexte : U11 (copie de même id, retour à l'origine), import, deux remises à zéro du brief, liste qui change.
Décision : `ProfileStore` = `list`, `get`, `isBuiltin(id)`, `hasOverride(id)`, `save(p)` (livré permis = copie), `remove(id)` (utilisateur seulement), `revert(id)` (retire la copie), `resetAll()` (efface les deux clés), `activeId`, `setActive`, `warnings`. `ActiveProfile` + `profiles: Accessor<readonly Profile[]>`, `refresh()` ; aucun aperçu (P20).
Conséquences : aucun composant n'écrit le stockage ; le brouillon de l'éditeur vit dans le composant ; `isReadOnly` disparaît (seul `profile-store.ts` l'utilise).

**DAC1-3 — Fichiers de profil : `profile-file.ts` (pur) et port `ProfileFiles`.**
Contexte : export et import en `.rbprofile` sur le web, l'iPad et la coque ; `FileHost` ne vise que `.roomboard` et OD56 le modifie.
Décision : `profile-file.ts` (pur) : `profileToFile(p): { name: string; text: string }`, `profileFromText(text): ParsedProfile`, `slug(label): string`, `uniqueId(base: string, taken: ReadonlySet<string>): string`, `planImport(p: Profile, existing: readonly Profile[], builtinIds: ReadonlySet<string>): { kind: "add" } | { kind: "confirm"; message: string }`, `PROFILE_EXTENSION = ".rbprofile"`, `PROFILE_MIME = "application/vnd.roomboard.profile+json"`. `platform/profile-files.ts` : `interface ProfileFiles { pick(): Promise<{ name: string; text: string } | null>; save(name: string, text: string): Promise<boolean> }`, `createWebProfileFiles(deps: Pick<FallbackDeps, "pickFile" | "download">)`, `createTauriProfileFiles(dialog: TauriDialog, fs: TauriFs)`.
Conséquences : aucun changement à `FileHost` ni aux hôtes d'OD56 (au rebase, `profile-files.ts` suit leur forme) ; un futur dépôt de `.rbprofile` appellera `profileFromText` et `planImport` ; écart à U11 noté (HC2-12).

## 6. Scénarios d'acceptation

- **S1** (e2e, `c1-profils-navigateur.mjs`) Choisir `simple`, puis revenir à `defaut` ; Profil → « Modifier… » : barre
  d'outils à gauche, boutons en grand, masquer la gomme (la case de « Profil » est grisée), ajouter deux couleurs au
  stylo ; les barres n'ont pas bougé tant que rien n'est enregistré ; « Enregistrer comme nouveau » (nom proposé « Par
  défaut (copie) », remplacé par « CM1 ») ; la barre passe à gauche ; recharger : la barre `outils` est à gauche,
  `data-size="l"`, sans `eraser`, `cm1` actif, stylo actif : cinq boutons `data-preset`. Exporter : `cm1.rbprofile`
  téléchargé. « Tout remettre à zéro » : `defaut`, barre en haut, `cm1` absent du menu. Importer `cm1.rbprofile` : `cm1`
  revient, actif, barre à gauche en grand, sans gomme. Captures `c1-editeur.png` (éditeur ouvert sur la section Barres)
  et `c1-barre-gauche-l.png`.
- **S2** (e2e et tests) Importer `1.2-outil-inconnu.rbprofile` : le profil s'ouvre, l'élément inconnu n'est pas dans la
  barre, il est grisé dans l'éditeur ; le réexporter : l'élément et les clés inconnues sont toujours là. Importer
  `2.0-majeure.rbprofile` : refus, message « mettez RoomBoard à jour », profil actif inchangé. Réimporter `cm1` alors
  qu'il existe : « Remplacer le profil « CM1 » ? » ; Annuler : rien ne change.
- **S3** (tests, puis essai manuel) Modifier `defaut` (taille `s`) et « Enregistrer » : le menu montre toujours « Par
  défaut », en petits boutons ; recharger : toujours en petit ; « Remettre à zéro ce profil » : taille `m`, la copie a
  disparu du stockage. Même chose pour une copie de `simple` : elle revient à `simple`. Sous `cm1` (basé sur `defaut`) :
  « Remettre à zéro ce profil » rend barres, préréglages et démarrage de `defaut`, nom « CM1 » et id `cm1` gardés.
- **S4** (tests unitaires et de composant, pas d'e2e) Stylo actif sous `cm1` : la rangée montre cinq préréglages ; un
  clic sur le quatrième appelle `setTool("pen", <id>)` et `setPenStyle` reçoit sa couleur et son épaisseur ; Main
  active : la rangée disparaît. Dans l'éditeur, « Rétablir les préréglages » : trois couleurs ; « Rétablir les
  barres » : barre en haut, taille `m`, gomme revenue.
- **S5** (tests ; coque à la fiche) Choisir « Annotation au démarrage », recharger au navigateur : tableau ordinaire,
  aucun message à l'écran (`resolveStartMode` rend `board`, `fellBack` vrai). Avec `desktopAnnotation` vrai (test, coque
  Windows ou macOS) : `setMode("desktop-annotation")` appelé une fois au démarrage, sans effet tant que C11a manque.

## 7. Hors périmètre

- Association `.rbprofile` au système ; profil par utilisateur du système (brief, P27).
- Fenêtre d'annotation, bascule, correction Wayland de la capacité (C11a, U16-U20).
- `.rbprofile` déposé ou passé au lancement (non attribué, P26).
- Position et taille d'une barre flottante ; glisser pour réordonner (HC2-2, HC1-5).
- Langue, thème, page et fond par défaut, bloc `platform` du profil (U11) : gardés en clés inconnues, sans éditeur.
- Préréglages de la gomme, du texte, des formes (HC2-3).
- Fichiers d'OD56 : `platform/host-repli.ts`, `platform/host-tauri.ts`, `platform/import.ts`, `ACTIONS` de
  `app/toolbar-host.ts` (lus seulement).
- Build Tauri, essais Windows, macOS, iPad (fiches, plus tard).

## 8. Portes immédiates

Aucune.
