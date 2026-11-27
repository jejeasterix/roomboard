# Cadrage — personnalisation-1b : fonds de page, pack livré, « Mes fonds » et recherche (OG5)

Cadrage autonome (aucune question n'a pu parvenir à Jérôme) : chaque choix est tranché ici, avec sa source ou sa raison.
Base : `origin/main` @ `45484db`. Brief : `~/.cache/tmp/og5-brief/demande.md` (hors dépôt).

## 1. Demande et gabarit

**Demande** : un bouton « Fonds » de la barre d'outils principale ouvre une fenêtre (sections, thèmes, miniatures,
recherche locale française tolérante aux fautes) qui applique à la page montrée, ou à toutes les pages, en une étape
d'annulation, un fond du pack livré (≈ 150 à 200 fonds, 30 Mo au plus, dessinés ou CC0) ou de « Mes fonds » (image
déposée, page, grille), pilotable par la CLI, sans aucune trace de service extérieur dans l'interface.

**Gabarit** : `chantier` (40 questions au plus ; 37 consommées, § 2). Cible d'exécution : ≈ 4 h de sous-agents,
**11 tâches** (estimation du § 5, DA7).

Citations de Jérôme (2026-11-27, mot pour mot, reprises du brief) : « Comme my viewboard ajoute un bouton affichant une
modal avec un ensemble consequent de background possible. Créer toi même tous ces background, télécharge des background
de type image que tu juge pertinent en t'inspirant de se que fait Myviewboard, prevoit une section "Mes background" que
les utlisateur pourront remplir soit par glisse deposé d'image, soit depuis ce qu'il auront construit dans roomboard sur
une page ou depuis la construction d'une grille dans roomboard. tu rangera tout ca dans des section et themes, avec une
barre de recherche inetligente. » ; « Je ne veux pas que l'interface trahisse la presence d'un service extérieur » ;
« L'ensemble de nos actions doit toujours prendre en compte l'utlisation tactile first et clavier second » ;
« particulierement intransigent sur la neteté des logos, icons, images etc... Les trait doivent etre fin et moderne ».

## 2. Décisions

Ordre : modèle de données d'abord (Q1-Q6), puis pack (Q7-Q14), recherche (Q15-Q17), Mes fonds (Q18-Q22), interface
(Q23-Q30), CLI et contrôles (Q31-Q34), puis les points ajoutés par la contre-relecture du tour 1 (Q35-Q37). « réversible ? » : oui = se défait sans migration de fichiers utilisateur.

| # | point | décision | source | réversible ? |
|---|---|---|---|---|
| Q1 | Qu'est-ce qu'un « fond » ? | **L'aspect complet de la page** : une couleur de page (`background`), une grille (`grid`, U31) ou aucune, une image (`backdrop` `image`, U6) ou aucune. Appliquer un fond remplace les trois ; « Blanc (aucun fond) » remet blanc, sans grille ni image. Aucun nouveau champ de page, aucun nouveau genre de `backdrop`. Exception en Q35 : une page PDF garde sa page. | demande (« fonds de page par la propriété `backdrop` (U6) et la grille (U31) déjà présentes ») ; `element.rs:40-49` (`PageView` : `background`, `backdrop`, `grid`) ; `fill.rs:84` (couleur de page déjà écrite par le pot) | oui (H1-1) |
| Q2 | Une étape d'annulation pour trois propriétés et N pages | **Le cœur bouge, une seule commande neuve** `ApplyBackground { pages, color, backdrop, grid }`, une transaction `"local"` = une étape, aucune étape si rien ne change (D38). Raison : l'historique ne fusionne jamais deux transactions (`history.rs:20-27`, `capture_timeout_millis: 0`, horloge `|| 0`) et chaque commande existante ouvre la sienne (`commands.rs:1139`, `:1550`) ; aucune commande n'écrit plusieurs pages. Sans elle, « toutes les pages » = 3 × N étapes. | `history.rs:20-27` ; `commands.rs:87-104`, `:1098-1165`, `:1517-1555` ; demande (« une étape d'annulation », « appliquer à toutes les pages ») ; consigne de l'orchestrateur (« préfère réutiliser `backdrop` et la grille… si le cœur doit bouger, dis pourquoi »), pas une phrase de Jérôme | oui (DA1) |
| Q3 | Où vit la commande dans le cœur | Fichier neuf `crates/roomboard-core/src/page_look.rs` (`impl Document`, comme `fill.rs`) ; `commands.rs` ne reçoit que la variante et la ligne de dispatch ; l'écriture du fond de `cmd_set_backdrop` (`:1135-1161` : insertion du `Y.Map`, `insert_asset_meta`, et le cas « même fond, métadonnée d'asset absente ») devient une **méthode de `Document`** `write_backdrop(&self, txn, page_map, input, same)` appelée par les deux ; la grille passe par `grid::write` (`grid.rs:155`) et `grid::validate` (`grid.rs:190`) existants. | localité ; patron `fill.rs` ; `commands.rs:1129-1161` ; chantier voisin 1a qui touchera aussi `commands.rs` | oui |
| Q4 | Contrôles de `ApplyBackground` | Avant toute transaction : `pages` non vide et sans doublon (sinon `UnknownPage`), chaque page connue, `valid_asset` + `w`, `h` finis > 0 + `fit == "width"` (`BadImage`/`BadAsset`, comme `cmd_set_backdrop`), `grid::validate`, couleur non vide (même règle que le pot sur le fond). Comparaison « même valeur » page par page avec les lectures existantes (`read_backdrop`, `grid::read`, clé `background`) ; seules les pages qui changent sont écrites et rendues dans `Change.pages` ; une page à fond `pdf-page` ne reçoit que couleur et grille (Q35). | `commands.rs:540-546`, `:1103-1110`, `:1121-1134` ; `grid.rs:107` ; D38 | oui |
| Q5 | Pont et doubles | `roomboard-wasm` : `apply_background(pages, color, asset_id?, name?, mime?, size?, w?, h?, grid…)` en arguments plats, au patron de `set_backdrop` (`lib.rs:878`) et `set_grid` (`lib.rs:908`, `grid_input` `:422`) ; `core/api.ts` : `{ type: "ApplyBackground"; pages: readonly string[]; color: string; backdrop: BackdropInput \| null; grid: GridInput \| null }` ; `wasm-core.ts` et `fake-core.ts` à parité (test de contrat). | `api.ts:121`, `:133` ; `wasm-core.ts:567-580` ; `fake-core.ts:964`, `:1002` ; test `core/wasm-core.contract.test.ts` | oui |
| Q6 | Wasm et plafonds | Seul le module principal grossit (attendu < +20 Ko, 1 375 581 o → < 1 400 000 o, plafond 1 572 864 o inchangé) ; `formats` inchangé (aucun format neuf). Le pack n'entre jamais dans le Wasm. | brief (plafonds) ; `scripts/verifier.sh:36-75` | oui |
| Q7 | Sections (inspirées de MyViewBoard, sans ses images) | Cinq sections, dans cet ordre : **Mes fonds**, **Couleurs**, **Lignes et grilles**, **Modèles de cours**, **Images**. MyViewBoard range ses fonds en couleur (unie ou dégradé), fonds préinstallés, images de l'utilisateur et « Originals » filtrés par matière (Math…) ; RoomBoard en reprend les familles, en mots seulement. | ViewSonic, « Background Management » (base de connaissance myViewBoard, lue par recherche le 2026-11-27) ; demande (« sections et thèmes ») | oui |
| Q8 | Thèmes | Couleurs : *Claires*, *Sombres*, *Dégradés*. Lignes et grilles : *Lignages*, *Quadrillages*, *Seyès*, *Points*, *Isométrique*, *Portées*. Modèles de cours : *Organisation*, *Réflexion*, *Mathématiques*, *Écriture*, *Sport*. Images : *Nature*, *Mer et ciel*, *Matières*, *Saisons*, *Abstrait*. Mes fonds : aucun thème (le plus récent d'abord). | Q7 ; `grid-edit.ts:46-54` (six types de grille du cœur) | oui |
| Q9 | Fonds dessinés : forme | **Procéduraux, sans fichier image** : un module TypeScript de descripteurs. Couleurs unies = couleur seule ; lignages, quadrillages, Seyès, points, isométrique, portées = **grille vectorielle du cœur** (nette à tout zoom) + couleur ; dégradés et modèles de cours = **SVG écrit par une fonction pure** au moment d'appliquer (3840 × 2160 px, `viewBox` 1920 × 1080), posé en `backdrop` `image/svg+xml`. Le code est le générateur : reproductible, 0 octet dans le pack. **Écart assumé avec la lettre** de la demande (« en WebP avec miniatures ») : le WebP vaut pour les photos ; les dessinés sont en grille ou en SVG, avec leurs miniatures (Q29), parce qu'un lignage rastérisé en WebP serait flou au zoom. Choix de l'agent, fondé sur l'exigence de netteté de Jérôme. | Jérôme (« particulierement intransigent sur la neteté… Les trait doivent etre fin et moderne ») ; consigne de l'orchestrateur (fonds SVG ou procéduraux admis), pas une phrase de Jérôme ; `container.rs:26` (SVG accepté dans `assets/`) ; `image-decode.ts:11` (`DISPLAY_MAX` 4096 ≥ 3840) | oui |
| Q10 | Fonds dessinés : nombre | **≥ 110, surtout en variantes peu coûteuses** : Couleurs ≈ 44 (28 unies claires et sombres, 16 dégradés SVG d'une même fonction) ; Lignes et grilles ≈ 54 (six types du cœur × espacements × couleurs de page et de trait, descripteurs seuls) ; Modèles de cours **≈ 12 SVG** (semainier, calendrier, frise, Venn 2, tableau en T, SVA, carte mentale, repère, droite graduée, en-tête de fiche, terrain de football, terrain de basket). Plancher **testé sur le total** (≥ 150 avec les photos), jamais par catégorie. | demande (« couleurs unies, dégradés, lignages, quadrillages, Seyès, portées, modèles de cours… ») ; budget de 4 h (contre-relecture tour 1) | oui |
| Q11 | Images CC0 : nombre, taille, poids | **40 à 50 photos**, WebP 2560 × 1440 (recadrage 16:9 centré), qualité réglée par image pour tenir ≤ 400 Ko, miniature WebP 480 × 270 ≤ 25 Ko. Poids au pire : 50 × (400 + 25) Ko = 21,25 Mo ≤ 28 Mo visés, **30 Mo (31 457 280 o) imposés par un test**. Total des fonds : 150 à 200 (test, Q10). 2560 et non 1920 : la page fait 1920 px CSS et l'écran de classe est à 200 % (design-cadrage § 11) ; 3840 (≈ 800 Ko) ne tiendrait qu'avec ≈ 35 photos. | demande (« 30 Mo au plus, ≈ 150 à 200 fonds », « WebP avec miniatures ») ; `docs/plans/design-cadrage.md:229` | oui (H1-3) |
| Q12 | Sources candidates des photos | Dans cet ordre : (1) **Poly Haven** (textures : bois, papier, liège, pierre, tissu, brique, béton ; page de chaque asset qui affiche « CC0 ») ; (2) **Wikimedia Commons**, fichiers dont la page porte le modèle CC0 (`LicenseShortName` = « CC0 » lu par l'API `imageinfo`/`extmetadata` **de chaque fichier**, puis la page relue) ; (3) **Openverse** filtré `license=cc0`, chaque résultat vérifié sur sa page d'origine (`foreign_landing_url`). Exclus : Unsplash, Pixabay, Pexels, toute image du domaine public sans CC0 (NASA, PD-old), toute image avec personne reconnaissable, marque, logo ou texte lisible. | brief (sources citées, exclusions, « licence lue, pas déduite du site ») | oui (H1-4) |
| Q13 | Fichier de sources et notices | `apps/web/backgrounds/SOURCES.json` (hors du dossier servi, donc hors du `dist` et du contrôle hors ligne) : par photo `id`, `page` (URL de la page source), `fichier` (URL téléchargée), `auteur`, `licence: "CC0-1.0"`, `preuve` (texte de licence lu), `lu_le` (date), `retouche` (« recadrage 16:9, WebP qN, métadonnées retirées »). `THIRD_PARTY_NOTICES.md` gagne une section « Pack de fonds (images CC0) » : sources, renvoi au fichier, aucune obligation d'attribution. | demande (« provenances et licences vont seulement dans `THIRD_PARTY_NOTICES.md` et un fichier de sources ») ; `scripts/controle-hors-ligne.mjs:1-12` (le dist ne doit citer aucun hôte) | oui |
| Q14 | Forme du pack dans le dépôt et la coque | Fichiers : `apps/web/public/backgrounds/photos/<id>.webp` et `apps/web/public/backgrounds/thumbs/<id>.webp` (dossier `public/` de Vite : copié tel quel dans `dist/`, servi en développement ; la coque l'embarque par `frontendDist`, donc **hors ligne**). Catalogue des photos : module généré `apps/web/src/backgrounds/photos.ts` (id, section, thème, libellé, mots-clés, couleur de page, `w`, `h`, fichiers), sans aucune provenance. Chargement à la demande : le catalogue (dessinés + photos) est un **import dynamique** à la première ouverture de la fenêtre ; une miniature se charge quand sa carte devient visible (`loading="lazy"`), la photo pleine seulement quand on l'applique. Métadonnées EXIF/XMP retirées (`ffmpeg -map_metadata -1`). | `apps/desktop/src-tauri/tauri.conf.json:7` ; `vite.config.ts` (`base: "./"`, patron des ressources `pdfjs`) ; `main.ts:222` (patron d'import dynamique) | oui (H2-1) |
| Q15 | Recherche : moteur | **Module maison, aucune dépendance** (`apps/web/src/backgrounds/search.ts`) : normalisation de `normalizeSearch` (`library.ts:90`, réutilisée), découpe en mots, pluriels simples (s, x, -aux→-al), dictionnaire de synonymes français écrit à la main (≈ 80 groupes : mer/océan/plage, carreaux/quadrillage/grille, Seyès/grands carreaux/cahier, portée/musique/solfège, ardoise/tableau noir/craie, foot/football/terrain…), tolérance aux fautes par distance de Damerau-Levenshtein bornée (1 pour 4 à 7 lettres, 2 au-delà), préfixe pour la frappe en cours. ≈ 200 entrées : parcours complet < 2 ms. | demande (« mots-clés et synonymes français, tolérante aux fautes, hors ligne, sans IA ni réseau ») ; Fuse.js et MiniSearch écartés : permissifs, mais ni synonymes ni français, et 200 entrées n'en ont pas besoin | oui |
| Q16 | Recherche : portée et rang | Cherche dans toutes les sections à la fois (Mes fonds compris, sur leur nom) ; rang : mot exact > préfixe > synonyme > faute ; la saisie remplace la vue de la section par une liste « Résultats » ; champ vide = retour à la section. Aucun résultat : « Aucun fond ne correspond » + suggestion du synonyme le plus proche. | demande (« barre de recherche intelligente ») | oui |
| Q17 | Mots-clés des photos | Écrits à la main par la tâche du pack (5 à 10 mots français par photo, couleur dominante comprise) ; jamais le nom ni le titre d'origine de la source. | Q13 (aucune trace) | oui |
| Q18 | Rangement de « Mes fonds » | **Bibliothèque de l'appareil, troisième racine** de `LibraryFiles` : `LibraryRoot` gagne `"backgrounds"` ; web : même base IndexedDB `roomboard-bibliotheque`, clés `backgrounds/<chemin>` (aucun changement de version) ; coque : `Documents/RoomBoard/Fonds`, portée ajoutée à `capabilities/default.json`. Un module neuf `app/my-backgrounds.ts` tient l'index ; **pas** `ResourceLibrary` (C4) : un fond n'est pas un `.rbitem` (U8 n'a pas de `kind` fond, C4 l'a laissé hors périmètre). Jamais dans le document. | `library-files.ts:10`, `:120-129` (clé `${root}/${path}`) ; `main.ts:321-330` ; `default.json:20` ; `docs/plans/usage-c4-bibliotheque-cadrage.md:306-307` ; demande | oui (DA4) |
| Q19 | Forme d'une entrée de Mes fonds | `<nom>.json` (`format: "roomboard-background"`, `schema: 1`, `name`, `created`, `origin` ∈ `image`/`page`/`grid`, `color`, `grid` ou null, `image` : `{ file, mime, w, h }` ou null) ; fichier image à côté (`<nom>.<ext>`) ; miniature `<nom>.thumb.png`. Nom de fichier par `fileNameOf` (`library.ts:94`, réutilisé), suffixe `-2`, `-3` en cas de doublon. Clés inconnues gardées à la relecture. | patron du compagnon C4 (coffre 0263) ; constat ouvert `library.ts:76` (ne pas écrire un troisième slug) | oui |
| Q20 | « Faire de cette page un fond » : vectoriel ou image | **Image** : PNG du **cadre de la page** (0, 0, largeur × hauteur de `PageView`, soit 1920 × 1080 aujourd'hui) rendu à l'échelle 2 (3840 × 2160) — couleur de page, fond image existant, grille et objets, par le même peintre que l'écran (`paintContent`). Perdu : ce qui dépasse le cadre (la page a une hauteur sans fin, `engine/page.ts:3`) et un fond `pdf-page` ; avis « objets hors du cadre non repris » s'il y en a (`doc.bounds`). Raison : un fond vectoriel exigerait un nouveau genre de `backdrop` dans le cœur (fragment non sélectionnable), son rendu, son export et sa CLI ; l'image réutilise `backdrop` tel quel, reste nette à l'échelle 1 sur un écran à 200 %, et la page d'origine reste modifiable. | `thumbnail.ts:30-52` (rendu d'une page par `paintContent`) ; `canvas2d.ts:401-424`, `:430` ; `engine/page.ts:3-5` ; DAU6 | oui (H1-5) |
| Q21 | « Faire de cette grille un fond » | Bouton « Enregistrer comme fond » dans le panneau Grille, à côté d'« Appliquer » : enregistre la grille du **brouillon** et la couleur de la page montrée, sans image (vectoriel) ; n'écrit rien dans le document. | `GridPanel.tsx:125-131` ; demande | oui |
| Q22 | Image déposée | Fenêtre ouverte : **tout fichier déposé** sur la fenêtre de l'application va à Mes fonds (dérivation dans `workspace.ts`, au patron de l'annotation, `:922-925`) ; images seules (`sniffImage`, `probeSize`) ; autre type : avis « seules les images deviennent des fonds ». Plus un bouton « Importer une image… » (boîte `host.pick()`), parce qu'au doigt on ne glisse pas de fichier. Octets gardés tels quels ; 100 Mpx au plus (`MAX_PIXELS`). | `workspace.ts:922-929` ; `mount.ts:70-71` (dépôt web sur tout le document) ; U24 ; `image-import.ts:52`, `:102` ; Jérôme (tactile d'abord) | oui |
| Q23 | Place du bouton « Fonds » | Action `backgrounds`, libellé « Fonds », dans la barre `outils` des trois profils fournis : `defaut` et `annotation`, groupe neuf `page` (`sep-fonds`, puis l'action) entre `edition` et `bureau` ; `simple`, en fin du groupe `vue` avant « Annotation du bureau ». Identifiant de séparateur `sep-fonds` (jamais `sep-7`, que 1a pourrait prendre). | demande (« barre d'outils principale (profils fournis) ») ; `toolbar-profiles.ts:144-153`, `:188` | oui |
| Q24 | Icône | Lucide `wallpaper` (écran et paysage : « fond d'écran »), 24 px, trait 1,5, calage `ICON_VIEWBOX` ; plus Lucide `search` pour le champ et `image-plus` pour « Importer une image… ». Tracés recopiés de Lucide au commit de `icons.ts` (ISC, mention existante). | `icons.ts:1-11` ; design-cadrage D-DS4 | oui (H2-2, porte visuelle) |
| Q25 | Forme de la fenêtre | **Fenêtre modale centrée** (`role="dialog"`, `aria-modal`), voile `rgba(13, 27, 42, 0.32)`, îlot blanc rayon 12, ombre `--rf-shadow-modal`, 1200 × 760 au plus (92 vw × 88 vh) : rail des sections à gauche (rangées de 48 px, icône + libellé), en haut champ de recherche (48 px) et bouton Fermer (48 px), puces des thèmes (44 px), grille de cartes 16:9 (≥ 192 px de large, libellé dessous), pied : interrupteur « Toutes les pages » (cible de 48 px de haut, libellé compris, `role="switch"`). Rail et puces **étendent `RadioChoices`** (`ui/RadioChoices.tsx:31-77` : `radiogroup`, flèches, tabindex itinérant) par deux nouveaux `look` (`rail`, `chips`) au lieu d'en refaire un. Styles dans un fichier neuf `ui/backgrounds.css` sur les jetons de `rb.css`. | demande (« fenêtre (comme MyViewBoard) ») ; design-cadrage D-DS2, D-DS3, D-DS5 ; `rb.css:4-37` ; `RadioChoices.tsx:31-77` | oui (porte visuelle) |
| Q26 | Toucher un fond | Un toucher **applique et ferme** la fenêtre ; à la page montrée, ou à toutes si l'interrupteur « Toutes les pages » est mis (non gardé d'une ouverture à l'autre). Avis d'information « Fond appliqué à N pages » quand N > 1. Annuler (îlot historique ou Ctrl+Z) défait tout en une fois. | demande (« toucher un fond l'applique… avec appliquer à toutes les pages ») ; MyViewBoard (page courante ou toutes, Q7) | oui (H1-2) |
| Q27 | Geste tactile | Aucun geste caché : toucher = appliquer ; défilement natif de la grille (`touch-action: pan-y`, un toucher qui a défilé n'applique pas, `click` du navigateur) ; supprimer une entrée de Mes fonds par un bouton « × » visible de 44 px, avec confirmation ; pas d'appui long. Glisser (rail, puces) aux événements de pointeur, jamais au glisser HTML5. | Jérôme (tactile d'abord) ; U12, U24 ; patron `LibraryPanel.tsx:78-82` | oui |
| Q28 | Raccourcis clavier | **Ctrl+Maj+F** (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre, hors champ de saisie (fonction pure `appShortcut` dans `engine/input/keys.ts`, écoutée par `App.tsx`, pas par le moteur). Dans la fenêtre : le focus va au champ de recherche ; Tab : recherche → sections → thèmes → cartes → « Toutes les pages » → Fermer ; flèches dans le rail et les puces (`RadioChoices`) et dans la grille (tabindex itinérant), Début/Fin ; **Entrée** applique à la page, **Maj+Entrée** à toutes les pages ; Échap ferme et rend le focus au bouton « Fonds ». **Les touches du moteur restent à la fenêtre** : `main.ts:420-424` envoie chaque `keydown` au moteur (Suppr/Retour arrière suppriment la sélection, `engine.ts:686-693` ; Espace fait la main) ; la fenêtre arrête leur propagation sans Ctrl ni Méta, au patron de `MenuBar.tsx:105-108` avec `ENGINE_KEYS` (`app/table-picker.ts:41`) ; Ctrl+Z remonte. Le raccourci est écrit dans l'infobulle. | Jérôme (« clavier second ») ; brief (« chaque geste a son raccourci ») ; `keys.ts:16-36` ; `main.ts:420-424` ; `engine.ts:686-693` ; `MenuBar.tsx:105-108` ; `table-picker.ts:41` ; D-DS12 | oui (H2-3) |
| Q29 | Miniatures | Couleurs : pastille CSS (aucun rendu) ; SVG (dégradés, modèles) : le SVG lui-même en `<img>` (vectoriel, net à tout `devicePixelRatio`) ; grilles et Mes fonds « grille » : rendu **à l'exécution** par `renderPageImage` sur un document temporaire (480 × 270, deux fois la carte), à la demande et gardé pour la session ; photos : miniatures WebP livrées ; Mes fonds : miniature PNG enregistrée à l'ajout. | Jérôme (netteté) ; `thumbnail.ts:30` | oui |
| Q30 | Fond sur une page en mode Infini (OG4) | **Fixe** : l'image reste ancrée à l'origine de la page, à la largeur de la page (règle actuelle du cœur, `element.rs:426-450`), sans répétition ; la couleur de page du fond couvre le reste ; les fonds de lignes et de grilles, vectoriels, couvrent déjà toute la page visible. Raison : une photo ne se répète pas sans couture, la règle est déjà celle du cœur, et ce qui doit couvrir l'infini est une grille. Chaque photo porte une couleur de page tirée de son bord (mesurée par le producteur). | `element.rs:426-450` ; `engine/page.ts:3-5` (largeur fixe, hauteur sans fin) ; `canvas2d.ts:372-382` | oui (H1-6) |
| Q31 | Voyage dans le document | Un fond appliqué met l'image dans le magasin `assets` de l'onglet (`AssetStore.put`, empreinte SHA-256), puis `ApplyBackground` ; l'enregistrement l'écrit dans `assets/<sha256>.<ext>` (U4), dédoublonné : un même fond sur 30 pages = un seul fichier. Couleur et grille sont des propriétés de page. Rien de Mes fonds n'entre dans le document au-delà du fond appliqué. | U4 (`usage-cadrage.md:57`) ; `workspace.ts:482-486` (`putCapture`, même patron) ; `container-io.ts:76` (`typed`) | oui |
| Q32 | CLI | Commande neuve `roomboard backgrounds [--search <texte>] [--section <id>]` : une ligne JSON par fond du pack (`id`, `section`, `theme`, `label`, `kind`) ; opération neuve `{"op":"background","id":"<id>"}` ou `{"op":"background","file":"<image>"}` dans `run` et `apply`, avec **`"page": "<id>"`** (références `$page:i` acceptées ; absente : la première page, convention `pageOf`) **ou `"pages": "all"`** (les deux ensemble : code 2) — la CLI n'a pas de page montrée ; et la commande du cœur `{"type":"ApplyBackground",…}` par `COMMAND_TYPES`. Codes : 0 ; 1 id inconnu, page inconnue ou refus du cœur ; 2 usage ; 3 image dont l'en-tête est illisible. Mes fonds n'a pas de commande (bibliothèque de l'appareil, pas du document). Pack lu sur disque dans `apps/web/public/backgrounds/` à côté de la CLI construite. | profil § CLI (D15, codes de sortie) ; `apps/cli/src/state.ts:9-15` (`pageOf`) ; `ops.ts:12-22`, `:33-38` (`$page:i`) ; `session.ts:293-345` ; `main.ts:34-45` | oui |
| Q33 | Aucune trace de service extérieur | Test de vitest qui parcourt le catalogue (libellés, mots-clés, noms de fichiers) et le texte des composants de la fenêtre : aucun de « polyhaven », « poly haven », « wikimedia », « commons », « openverse », « flickr », « unsplash », « pixabay », « pexels », « http », « www. » ; test qui lit chaque WebP du pack : aucun bloc `EXIF` ni `XMP ` ; essai e2e qui relit le texte visible de la fenêtre ouverte. Le contrôle hors ligne existant passe sur le `dist` (aucune URL). | demande ; `scripts/controle-hors-ligne.mjs:12-25` | oui |
| Q34 | Producteur des photos | Script `scripts/fonds/produire-photos.mjs` (joué à la main, réseau, jamais par `verifier.sh`) : lit `SOURCES.json`, télécharge dans `~/telechargements-roomboard/fonds/` (hors dépôt), recadre et encode par `ffmpeg` (libwebp présent sur la VM), retire les métadonnées, mesure la couleur du bord, écrit les WebP et `photos.ts`. Aucune dépendance npm ajoutée. Les icônes Lucide se lisent par `gh api` (lecture, comme L1), aucun autre téléchargement. | brief (« téléchargements permis… images CC0… aucun autre fichier ») ; `ffmpeg -encoders` (libwebp, V sur la VM) | oui |
| Q35 | Pages à fond PDF ou à capture | Une page dont le `backdrop` est `pdf-page` (page PDF importée, `document.rs:175-185` ; C16) **garde son fond** : `ApplyBackground` n'y écrit que la couleur et la grille (règle du cœur, donc la même pour l'interface et la CLI) ; l'interface compte ces pages avant et dit « N pages PDF gardent leur page : couleur et grille seulement ». Un fond `image` venu d'une capture (C11b, `desktop-page.ts:33`) **est remplacé** comme tout fond image : rien ne le distingue dans le cœur (le nom d'asset n'est pas un contrat), l'utilisateur l'a choisi en connaissance, et Annuler le rend. | contre-relecture tour 1 (recommandation) ; `document.rs:175-185` ; `desktop-page.ts:33` ; coffre 0276 | oui (H1-9) |
| Q36 | Bouton « Cette page » | Dans la section Mes fonds, rangée d'actions en tête, trois boutons de 48 px icône + libellé : « Importer une image… » (`image-plus`), « Cette page » (`file-plus`, existant), et la zone « Déposez une image ici » (pointillés, texte seulement). L'entrée prend le nom « Page N — JJ/MM HH:MM » (N = rang de la page montrée) ; une image déposée prend son nom de fichier sans extension ; une grille, « Grille <type> — JJ/MM HH:MM ». **Nom non modifiable** dans ce chantier (H2-5). | demande (trois entrées) ; `icons.ts` (`file-plus`) ; Q19 | oui |
| Q37 | Sortie hors ligne prouvée | L'essai e2e sert le `dist` sous la CSP de la coque (`coqueCsp()`, `scripts/essais/commun.mjs:204-210`) et relève toute requête vers un autre hôte : le pack se charge sous la CSP réelle, sans réseau. | `commun.mjs:204-210` ; `controle-hors-ligne.mjs` | oui |

## 3. Carte d'impact

Le profil n'a pas de ligne « Surfaces d'impact » : rubriques déduites du graphe et de la recherche texte, plus les zones
nommées par le brief. Graphe : `~/.cache/graphes/roomboard/graphify-out/graph.json` (26 nov. 09:53, 12 654 nœuds) ;
sa requête large a rendu surtout du bruit (essais, `board.rs`) : la recherche texte l'a complétée partout.

### 3.1 Cœur Rust et pont Wasm

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `crates/roomboard-core/src/commands.rs:87-104` (enum `Command`) | oui | variante `ApplyBackground` | V |
| `crates/roomboard-core/src/commands.rs:672-682` (dispatch) | oui | une ligne vers `page_look.rs` | V |
| `crates/roomboard-core/src/commands.rs:1098-1165` (`cmd_set_backdrop`) | oui | écriture extraite en `write_backdrop`, comportement inchangé (tests `set_backdrop_*` `:2720-2930` verts) | V |
| `crates/roomboard-core/src/commands.rs:1517-1555` (`cmd_set_grid`) | non | `grid::write` / `grid::validate` réutilisés sans changement | V |
| `crates/roomboard-core/src/page_look.rs` (neuf) | oui | `cmd_apply_background` + tests (une étape, N pages, D38, refus sans transaction, annuler/rétablir, rechargement à octets égaux) | S |
| `crates/roomboard-core/src/fill.rs:84-89` (clé `background`) | non | même clé et même défaut écrits par la commande neuve | V |
| `crates/roomboard-core/src/element.rs:426-450` (`backdrop_view`) | non | règle « largeur de page » gardée (Q30) | V |
| `crates/roomboard-core/src/history.rs:20-27` | non | raison de Q2 | V |
| `crates/roomboard-core/src/grid.rs:107`, `:155`, `:190` | non | lus et appelés | V |
| `crates/roomboard-core/src/lib.rs` (déclaration des modules) | oui | `mod page_look;` | S |
| `crates/roomboard-wasm/src/lib.rs:878-905`, `:908-920`, `:422`, `:1695` | oui | `apply_background` à côté de `set_backdrop` / `set_grid` | V |
| `crates/roomboard-formats/*` | non | aucun format neuf ; plafond `formats` inchangé | V |
| `crates/roomboard-shell/src/lib.rs:401-447` (test `capabilities_grant_library_folder_only`) | oui, test mis à jour | il exige la portée fs exacte `RoomBoard/Ressources` et `/**` : il reçoit `RoomBoard/Fonds` et `/**`, et reste la couverture de cette portée | V |
| `crates/roomboard-shell/src/*` (autres), `apps/desktop/src-tauri/src/*` | non | aucune commande de coque neuve | V |

### 3.2 Interface web : cœur TS, application, plateforme

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/core/api.ts:121`, `:133` (union `Command`) | oui | type `ApplyBackground` | V |
| `apps/web/src/core/api.ts:145` (constat ouvert PAGE_WIDTH) | non | à ne pas aggraver : la commande prend la taille de `PageView` | V |
| `apps/web/src/core/wasm-core.ts:567-580` | oui | branche `ApplyBackground` | V |
| `apps/web/src/core/fake-core.ts:964-980`, `:1002`, `:178` | oui | double à parité | V |
| `apps/web/src/core/asset-store.ts:13` | non | `put` appelé | V |
| `apps/web/src/app/thumbnail.ts:30-52` | oui | `renderPageImage` (page entière, fond compris, à l'échelle donnée) à côté de `renderThumbnail` | V |
| `apps/web/src/app/pdf-overlay.ts` (`loadImageSource`, `ContentPainter`) | non | réutilisés | V |
| `apps/web/src/app/backgrounds-apply.ts` (neuf) | oui | résolution d'un fond en `BackgroundSource`, puis `AssetStore.put` + `ApplyBackground` | S |
| `apps/web/src/app/my-backgrounds.ts` (neuf) | oui | index et entrées de Mes fonds | S |
| `apps/web/src/backgrounds/catalog.ts`, `drawn.ts`, `svg.ts`, `photos.ts`, `search.ts` (neufs) | oui | sections, descripteurs, SVG procéduraux, catalogue généré, recherche | S |
| `apps/web/src/app/library.ts:76` (`ROOT_LABELS`), `:90`, `:94` | oui | libellé de la racine `backgrounds` ; `normalizeSearch`, `fileNameOf` réutilisés | V |
| `apps/web/src/platform/library-files.ts:10` (`LibraryRoot`) | oui | `"backgrounds"` ; `clearable` inchangé | V |
| `apps/web/src/platform/library-files.ts:120-129`, `:193` | non | fabriques appelées avec la racine neuve | V |
| `apps/web/src/main.ts:321-350` | oui | troisième `LibraryFiles` (IndexedDB, coque `RoomBoard/Fonds`, mémoire en repli) | V |
| `apps/web/src/app/workspace.ts:922-929` (`host.onDrop`) | oui | dérivation des dépôts vers Mes fonds quand la fenêtre est ouverte | V |
| `apps/web/src/app/workspace.ts:482-486` (`putCapture`) | non | patron suivi | V |
| `apps/web/src/app/container-io.ts:76` (`typed`) | non | réutilisé pour typer les Blob du pack | V |
| `apps/web/src/platform/image-import.ts:52`, `:102`, `:137` | non | `sniffImage`, `probeSize`, `decodeImage` réutilisés | V |
| `apps/web/src/app/toolbar-host.ts:42`, `:94-95` | oui | `toggle("backgrounds")` | V |
| `apps/web/src/toolbar.ts:99-140` (`ACTION_TABLE`) | oui | `backgrounds: { label: "Fonds" }` | V |
| `apps/web/src/toolbar.ts:639` (`ACTION_REQUIRES`) | non | aucune capacité exigée | V |
| `apps/web/src/toolbar-profiles.ts:144-153`, `:177-190` | oui | bouton dans les trois profils fournis (Q23) | V |
| `apps/web/src/engine/input/keys.ts:16-36` | oui | `appShortcut` (Ctrl+Maj+F) | V |
| `apps/web/src/engine/engine.ts:663` | non | le moteur ne voit pas le raccourci | V |
| `apps/web/src/engine/render/canvas2d.ts:372-424` | non | rendu du fond image et de la couleur inchangé | V |
| `apps/web/src/grid-edit.ts:46-62` | non | `toGrid`, `draftOf` réutilisés | V |

### 3.3 Affichage (composants, styles, icônes)

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/ui/App.tsx:79`, `:86`, `:575-605` | oui | panneau `backgrounds`, montage de la fenêtre, écoute du raccourci | V |
| `apps/web/src/ui/BackgroundsDialog.tsx` (neuf) | oui | la fenêtre | S |
| `apps/web/src/ui/backgrounds.css` (neuf) | oui | styles de la fenêtre sur les jetons | S |
| `apps/web/src/ui/RadioChoices.tsx:31-77` | oui | deux `look` neufs (`rail`, `chips`) pour les sections et les thèmes | V |
| `apps/web/src/ui/MenuBar.tsx:105-108`, `apps/web/src/app/table-picker.ts:41` (`ENGINE_KEYS`) | non | patron et ensemble réutilisés | V |
| `apps/web/src/main.ts:420-424` (`keydown` vers le moteur) | non | raison de l'arrêt de propagation (Q28) | V |
| `apps/web/src/ui/GridPanel.tsx:30-37`, `:124-131` | oui | prop `saveAsBackground` et bouton « Enregistrer comme fond » | V |
| `apps/web/src/ui/icons.ts:14`, `:112-150` | oui | `wallpaper`, `search`, `image-plus` ; `ACTION_ICONS.backgrounds` | V |
| `apps/web/src/ui/rb.css:1-60` | non | jetons lus, fichier non modifié (conflit évité avec 1a) | V |
| `apps/web/src/ui/LibraryPanel.tsx:33-82` | non | patron de carte (vignette, URL révoquée, ×) repris, composant non modifié | V |
| `apps/web/src/ui/item-state.ts:54` (`ACTION_STATE`) | non | pas d'état pressé (S : la Bibliothèque n'en a pas) | S |
| `apps/web/src/ui/PagesBar.tsx`, `Toolbar.tsx`, `Island.tsx`, `layout.ts` | non | rendu des barres générique ; chantier 1a | V |
| `apps/web/src/ui/Toasts.tsx` | non | avis d'information existant | S |

### 3.4 Persistance et coque

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| document `.roomboard` (`assets/`, `document.ybin`) | oui (contenu) | fond = propriétés de page + asset cité ; format, `schema` et `formatVersion` inchangés | V |
| IndexedDB `roomboard-bibliotheque` | oui (contenu) | clés `backgrounds/…`, version 2 inchangée | V |
| `apps/desktop/src-tauri/capabilities/default.json:4`, `:20` | oui | portée `$DOCUMENT/RoomBoard/Fonds` et `/**`, description complétée | V |
| `apps/desktop/src-tauri/tauri.conf.json:7`, `:13` (CSP) | non | `frontendDist` embarque le pack ; `fetch` de même origine déjà permis (S) | V |
| `.rbprofile` (format) | non | seules les valeurs des profils fournis changent | V |

### 3.5 Export et autres formats

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/app/pdf-export.ts:125-133` | non | l'export PDF n'écrit ni couleur de page ni fond image (limite existante, § 7) | V |
| `apps/web/src/app/board-io.ts:264`, `:359` | non | `.iwb`/`.ubz` : fond compté « non exporté » (avis existant) | V |
| `apps/web/src/app/desktop-page.ts:33` | non | `SetBackdrop` gardé pour C11b | V |

### 3.6 CLI

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/cli/src/ops.ts:12-20` (`COMMAND_TYPES`, contrôle `ALL_COMMANDS`) | oui | `ApplyBackground` (sinon `tsc` casse) | V |
| `apps/cli/src/ops.ts:22` (`CLI_OPS`) | oui | `background` | V |
| `apps/cli/src/session.ts:293-345` (`runCli`) | oui | branche `background` | V |
| `apps/cli/src/state.ts:9-15` (`pageOf`) | non | réutilisé pour `page` (Q32) | V |
| `apps/cli/src/main.ts:34-45` (`USAGE`), table des commandes | oui | `backgrounds` | V |
| `apps/cli/src/backgrounds.ts` (neuf) | oui | lecture du pack sur disque, liste et recherche | S |
| `apps/cli/src/formats.ts:81` (`FORMAT_LOTS`) | non | aucun format neuf (D15 : ligne inchangée) | V |
| `scripts/essais/cli-essai.mjs` | oui | `backgrounds --search`, `apply … background` (D15) | V |

### 3.7 Livraison, taille, licences

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/public/backgrounds/` (neuf) | oui | ≤ 30 Mo de WebP | S |
| `apps/web/backgrounds/SOURCES.json` (neuf) | oui | provenances (hors `dist`) | S |
| `scripts/fonds/produire-photos.mjs` (neuf) | oui | producteur reproductible | S |
| `THIRD_PARTY_NOTICES.md` (589 lignes, sections `##`) | oui | section « Pack de fonds (images CC0) » ; tracés Lucide ajoutés à la mention existante | V |
| `scripts/controle-hors-ligne.mjs` | non | doit rester vert sur le `dist` agrandi | V |
| `scripts/controle-licences.mjs` | non | aucune dépendance ajoutée | V |
| `scripts/verifier.sh:36-75` (plafonds Wasm) | non | plafonds ni baissés ni relevés | V |
| `scripts/verifier.sh:109-150` (bloc `--e2e`) | oui | ligne `node scripts/essais/fonds-navigateur.mjs` | V |
| `scripts/tests/verifier-e2e.test.sh:13-31` | oui | ligne à part pour `fonds-navigateur` (patron C11b, design L1-L4) | V |

### 3.8 Tests

| endroit (chemin:ligne) | touché ? | pourquoi | V/S |
|---|---|---|---|
| `apps/web/src/toolbar-profiles.test.ts:233`, `:244` | oui | listes figées de la barre `outils` (defaut, annotation, simple) : ajout de `sep-fonds`, `backgrounds` | V |
| `apps/web/src/toolbar-profiles.test.ts:240-256` (menu, panneaux, pages, rôles, ids uniques) | non | à garder vert | V |
| `apps/web/src/core/wasm-core.contract.test.ts` | oui | cas `ApplyBackground` à parité | V |
| `crates/roomboard-core/src/commands.rs:2708-2930` (tests `set_backdrop_*`) | non | à garder vert après l'extraction de `write_backdrop` | V |
| `crates/roomboard-core/src/commands.rs:3294-3680` (tests de grille) | non | à garder vert | V |
| `apps/web/src/ui/GridPanel.test.tsx`, `LibraryPanel.test.tsx`, `App.test.tsx` | oui (GridPanel) / non | bouton neuf ; le reste à garder vert | V |
| `apps/web/src/platform/library-files.test.ts`, `app/library.test.ts` | non | à garder vert (racines `mine`, `shared`) | V |
| `apps/web/src/ui/icons.test.ts:45` | non | chaque action a une icône (L1) : couvre `backgrounds` | V |
| `apps/web/src/ui/rb-css.test.ts` | non | `rb.css` non modifié | V |
| `apps/cli/src/*.test.ts`, `scripts/essais/cli-essai.mjs` | oui | tests de `backgrounds` et de l'opération | V |
| `scripts/essais/design-l2-navigateur.mjs:476-510` (S6 1024 et 768) | non | à garder vert : l'îlot d'outils gagne ≈ 56 px ; à 768 il est déjà borné à 736 et défile (`annotation=faux`) ; à 1024 il tient (≈ 790 px, S) | V |
| `scripts/essais/design-l1-navigateur.mjs`, `design-l3-navigateur.mjs`, `design-l4-navigateur.mjs`, `s5b-navigateur.mjs`, `c4-bibliotheque-navigateur.mjs`, `c9-grille-navigateur.mjs`, `c11b-capture-navigateur.mjs` | non | sélecteurs `data-item` inchangés, à garder verts sans réécriture | V |
| `scripts/essais/fonds-navigateur.mjs` (neuf) | oui | S1 à S5 | S |
| tests neufs : `backgrounds/*.test.ts`, `app/backgrounds-apply.test.ts`, `app/my-backgrounds.test.ts`, `ui/BackgroundsDialog.test.tsx`, `backgrounds/pack.test.ts` | oui | recherche, catalogue (150-200, ids uniques), poids ≤ 30 Mo, sources CC0, aucune trace, aucune métadonnée | S |

### 3.9 Documents (sources lues)

| endroit | touché ? | pourquoi | V/S |
|---|---|---|---|
| `docs/plans/design-cadrage.md` (§ 4, 5, 10), `docs/design/charte.md`, `docs/design/maquettes/` | non | îlots, jetons, netteté § 10 suivis | V |
| `docs/plans/usage-cadrage.md:57` (U4), `:59` (U6), `:62` (U9), `:64-65` (U11-U12), `:77` (U24), `:84` (U31), `:376-380` (DAU6) | non | appliqués | V |
| `docs/plans/usage-c1-profils-cadrage.md`, `usage-c9-editeur-cadrage.md`, `usage-c11a-annotation-cadrage.md`, `usage-c4-bibliotheque-cadrage.md:306-307` | non | profils, panneau Grille, annotation, hors périmètre C4 repris | V |
| `docs/essais/c11a-coque.md`, `c11b-coque.md` | oui | une ligne d'essai en coque : Mes fonds dans `Documents/RoomBoard/Fonds`, dépôt d'une image fenêtre ouverte | S |

### Effets de bord sur l'existant

- La barre `outils` des trois profils fournis gagne un séparateur et un bouton : `toolbar-profiles.test.ts:233` et `:244`
  sont mis à jour (seule réécriture de test assumée : la demande change ces listes) ; couverts par ces tests réécrits et
  par `design-l2-navigateur.mjs` S6, gardé vert sans réécriture.
- `cmd_set_backdrop` passe par `write_backdrop` : mêmes octets, même règle D38 ; couvert par les tests
  `set_backdrop_*` (`commands.rs:2720-2930`) et `image_and_backdrop_reload_keep_bytes` (`:2905`).
- `LibraryRoot` s'élargit : `ROOT_LABELS` reçoit « Mes fonds » ; le panneau Bibliothèque ne liste que les racines qu'on
  lui passe (`mine`, `shared`) ; couvert par `library.test.ts`, `LibraryPanel.test.tsx` et l'essai `c4-bibliotheque`.
- Fenêtre des fonds ouverte, un fichier déposé n'est plus importé dans la page mais ajouté à Mes fonds ; fenêtre fermée,
  rien ne change ; couvert par un test de `workspace.test.ts` (dérivation posée, puis retirée) et par S3.
- La coque peut écrire sous `Documents/RoomBoard/Fonds` ; couvert par le test `capabilities_grant_library_folder_only`
  (`crates/roomboard-shell/src/lib.rs:401-447`, mis à jour) et la ligne de `c11a-coque.md` (essai manuel en coque) ; le
  contrôle hors ligne ne lit pas les portées fs.
- « Toutes les pages » sur un document issu d'un PDF : les pages PDF gardent leur page (Q35) ; couvert par un test de
  `page_look.rs` (page `pdf-page` : fond intact, couleur et grille écrites, une étape) et par S2.
- Dans la fenêtre ouverte, Suppr, Retour arrière, Échap et Espace n'atteignent plus le moteur ; couvert par
  `BackgroundsDialog.test.tsx` et S5.
- Le `dist` grossit de ≤ 30 Mo et l'installeur d'autant ; couvert par `pack.test.ts` (plafond) et le contrôle hors ligne.
- Ctrl+Maj+F devient pris par l'application (hors champ de saisie) ; couvert par `keys.test.ts`.

### Chantiers en cours

- `~/projets/roomboard-wt/personnalisation-1a` (OG4 : mode de page, barre latérale, barre des pages ; branche
  `feat/personnalisation-1a` @ `45484db`, **aucun commit** à `origin/main..HEAD`, aucun cadrage écrit à 2026-11-27). Fichiers
  probablement communs (S, d'après son objectif) : `toolbar-profiles.ts` et son test (navigation dans la barre principale),
  `toolbar.ts` (`ACTION_TABLE`), `ui/icons.ts`, `ui/App.tsx`, `toolbar-host.ts`, `commands.rs` (enum et dispatch d'une
  commande de mode de page), `roomboard-wasm/src/lib.rs`, `core/api.ts`, `wasm-core.ts`, `fake-core.ts`, `apps/cli/src/ops.ts`,
  `scripts/verifier.sh`. Parades : code du cœur dans `page_look.rs`, styles dans `backgrounds.css` (pas `rb.css`),
  séparateur `sep-fonds`, groupe propre `page` ; le second à fusionner résout des ajouts voisins (garder les deux).
  Point de rencontre à revoir : un fond sur une page portrait de 1a ne couvre que le haut (Q30, H1-6).
- PR ouvertes du dépôt (`gh pr list`) : aucune.

### Termes cherchés

- Graphe : `graphify query "où le fond de page backdrop est posé et dessiné côté web (setBackdrop, image-cache, canvas2d)"`
  (bruit : essais, `board.rs`).
- Texte : `backdrop` (crates, `apps/web/src`), `setBackdrop|clearBackdrop|set_backdrop`, `SetBackdrop|BackdropInput|SetGrid|InsertPages`,
  `Batch|batch|capture_timeout|UndoManager` (aucune commande de lot), `FillTarget|Background`, `valid_asset`,
  `image/webp|image/svg`, `loadSvg`, `DISPLAY_MAX`, `ACTION_TABLE|TOOL_TABLE|library|grid`, `ACTION_ICONS`,
  `toggle(panel`, `type Panel`, `keyAction`, `shortcut|SHORTCUT` (aucune table de raccourcis), `LibraryRoot`,
  `createIdbLibraryFiles|createTauriLibraryFiles|createMemoryLibraryFiles`, `RoomBoard/Ressources`, `default.json`,
  `dropzone|elementFromPoint|onDrop`, `dropTarget`, `putCapture`, `typed`, `normalizeSearch|fileNameOf`,
  `renderThumbnail`, `PAGE_HEIGHT`, `visiblePageRect`, `COMMAND_TYPES|CLI_OPS|FORMAT_LOTS`, `data-item`,
  `box(page, TOOLS)`, `flat(id, "outils")`, `THIRD_PARTY`, `capabilities_grant_library_folder_only`, `addEventListener("keydown"`, `ENGINE_KEYS`,
  `stopPropagation`, `RadioChoices`, `pageOf`, `PDF_PAGE_KIND`, `coqueCsp`, `verifier-e2e.test.sh`, `fuse|minisearch|levenshtein` (aucun), `myViewBoard` (coffre :
  seulement le lecteur `.olf`).
- Coffre : `roomboard fond de page backdrop bibliothèque`, `roomboard personnalisation fonds myviewboard`,
  `roomboard piège bibliothèque IndexedDB plugin-fs`, `roomboard design cadrage icônes netteté` ; décisions lues 0263,
  0276, 0302.

### Modules à réutiliser ou à étendre

| besoin du chantier | module existant (chemin:ligne) | interface appelée ou étendue | décision |
|---|---|---|---|
| écrire un fond image sur une page | `crates/roomboard-core/src/commands.rs:1098`, `:1135-1161` | méthode `Document::write_backdrop(&self, txn: &mut TransactionMut, page: &MapRef, input: Option<&BackdropInput>, same: bool)` extraite de `cmd_set_backdrop` (Y.Map, `insert_asset_meta`, métadonnée absente) | étendre |
| écrire et valider une grille | `crates/roomboard-core/src/grid.rs:155`, `:190`, `:107` | `grid::write(txn, page, Option<&GridInput>)`, `grid::validate(&GridInput)`, `grid::read(txn, page)` | réutiliser |
| écrire la couleur de page | `crates/roomboard-core/src/fill.rs:84-89` | clé `"background"`, `DEFAULT_BACKGROUND` | réutiliser |
| couleur, grille, fond de N pages en une étape | aucun (termes : `Batch`, `batch`, `capture_timeout`, `InsertPages`) | `Command::ApplyBackground { pages: Vec<String>, color: String, backdrop: Option<BackdropInput>, grid: Option<GridInput> }` → `Change { pages: <pages changées> }` (DA1) | nouveau module (`page_look.rs`) |
| commande côté page | `apps/web/src/core/api.ts:121-133`, `wasm-core.ts:567`, `fake-core.ts:964` | `{ type: "ApplyBackground"; pages: readonly string[]; color: string; backdrop: BackdropInput \| null; grid: GridInput \| null }` | étendre |
| mettre un Blob au magasin du document | `apps/web/src/core/asset-store.ts` (`AssetStore.put`), `app/container-io.ts:76` | `assets.put(typed(blob, mime)) → id` | réutiliser |
| rendre une page en image (page → fond, miniatures de grilles) | `apps/web/src/app/thumbnail.ts:30` | `renderPageImage(doc: CoreDocument, assets: AssetStore, pageId: string, scale: number, deps: ThumbDeps): Promise<Blob \| null>` (couleur, fond image, puis `paintContent`) | étendre |
| décoder et mesurer une image déposée | `apps/web/src/platform/image-import.ts:52`, `:102`, `:137` | `sniffImage(head, name)`, `probeSize(blob, kind)`, `decodeImage(blob, kind, max)` | réutiliser |
| normaliser une recherche, nommer un fichier | `apps/web/src/app/library.ts:90`, `:94` | `normalizeSearch(s)`, `fileNameOf(name)` | réutiliser |
| stocker Mes fonds sur l'appareil | `apps/web/src/platform/library-files.ts:10`, `:61`, `:120`, `:193` | `LibraryRoot` + `"backgrounds"` ; `createIdbLibraryFiles(indexedDB, "backgrounds")`, `createTauriLibraryFiles(fs, "<Documents>/RoomBoard/Fonds", "backgrounds")`, `createMemoryLibraryFiles("backgrounds")` | étendre |
| index et entrées de Mes fonds | aucun (termes : `ResourceLibrary`, `.rbitem`, `PackItemKind` : modèle de fragments, inadapté, Q18) | `createMyBackgrounds(files: LibraryFiles, deps: { now(): string; probe(blob: Blob, name: string): Promise<{ mime: string; w: number; h: number } \| null>; thumbnail(src: BackgroundSource): Promise<Blob \| null> }): MyBackgrounds` avec `list()`, `addImage(blob, name)`, `addSource(src, name, origin)`, `read(entry): Promise<BackgroundSource>`, `thumbnail(entry)`, `remove(entry)` (DA4) | nouveau module (`app/my-backgrounds.ts`) |
| catalogue, sections, fonds dessinés | aucun (termes : `background`, `fond`, `catalog`) ; `grid-edit.ts:46-62` pour les types | `SECTIONS`, `loadPack(): Promise<readonly PackBackground[]>` (import dynamique), `svgOf(id): string` (DA3) | nouveau module (`backgrounds/`) |
| recherche tolérante | aucun (termes : `fuse`, `minisearch`, `levenshtein`, `synonym`) ; `library.ts:90` | `createBackgroundSearch(docs: readonly { id: string; label: string; keywords: readonly string[] }[]): { search(q: string): readonly string[] }` (DA5) | nouveau module (`backgrounds/search.ts`) |
| appliquer un fond à l'onglet | `app/workspace.ts:482-486` (patron `putCapture`), `engine.run` | `applyBackground(target: { run(cmd: Command): unknown; readonly assets: AssetStore; pageIds(): readonly string[] }, src: BackgroundSource, pages: "current" \| "all", current: string): Promise<boolean>` ; `resolvePack(b: PackBackground, files: { read(file: string): Promise<Blob> }): Promise<BackgroundSource>` | nouveau module (`app/backgrounds-apply.ts`), appelé par l'interface et la CLI |
| dériver un dépôt de fichiers | `app/workspace.ts:922-929` | `Workspace.setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) \| null): void` | étendre |
| ouvrir un panneau depuis une action | `app/toolbar-host.ts:42`, `:94-95` ; `ui/App.tsx:79`, `:311` | `toggle("backgrounds")`, `Panel` + `"backgrounds"` | étendre |
| raccourci de l'application | `engine/input/keys.ts:16-36` | `appShortcut(e: KeyLike): "backgrounds" \| null` (réutilise `inEditable`, `KeyLike`) | étendre |
| sections et thèmes au doigt et aux flèches | `apps/web/src/ui/RadioChoices.tsx:31-77` | `RadioChoices` + `look: "rail" \| "chips"` | étendre |
| garder les touches du moteur dans la fenêtre | `apps/web/src/app/table-picker.ts:41`, `ui/MenuBar.tsx:105-108` | `if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation()` | réutiliser |
| page visée par la CLI | `apps/cli/src/state.ts:9-15` | `pageOf(tab, page)` ; `pages: "all"` → `doc.pageIds()` | réutiliser |
| ne pas écraser une page PDF | `crates/roomboard-core/src/element.rs:397` (`read_backdrop`), `PDF_PAGE_KIND` | lecture du `kind` avant écriture, dans `cmd_apply_background` | réutiliser |
| carte à vignette, URL révoquée, bouton × | `ui/LibraryPanel.tsx:33-82` | patron recopié dans `BackgroundsDialog` (même cycle de vie) ; composant non modifié | réutiliser (patron) |
| icône d'action | `ui/icons.ts:14`, `:112` | `ICONS.wallpaper`, `ICONS.search`, `ICONS["image-plus"]`, `ACTION_ICONS.backgrounds` | étendre |
| CLI : commande du cœur, opération, commande | `apps/cli/src/ops.ts:12-22`, `session.ts:293`, `main.ts:34` | `COMMAND_TYPES` + `"ApplyBackground"`, `CLI_OPS` + `"background"`, `USAGE.backgrounds` ; `applyBackground` / `resolvePack` du web | étendre |

## 4. Hypothèses à revoir

**Niveau 1 — difficiles à défaire ou visibles des utilisateurs**

- **H1-1** (Q1) Un fond remplace couleur, grille et image d'un coup : appliquer une photo retire le Seyès posé avant.
  Alternative : un fond n'écrit que ce qu'il définit. Défaut choisi : prévisible, et « Blanc (aucun fond) » remet tout.
- **H1-2** (Q26) Toucher applique et ferme la fenêtre ; l'essai d'un autre fond demande de la rouvrir. Alternative :
  fenêtre gardée ouverte (aperçu en direct).
- **H1-3** (Q11) Photos en 2560 × 1440 (40 à 50) plutôt que 3840 × 2160 (≈ 35) : légère douceur sur un écran 4K à 200 %.
  À juger à la porte visuelle sur un vrai écran de classe.
- **H1-4** (Q12) La vérification de licence d'une photo Wikimedia se fait par l'API de sa page (`extmetadata`) **puis**
  la relecture de sa page ; une page Poly Haven est lue telle que le site la sert. Si une page ne montre pas « CC0 » en
  clair, la photo est écartée (jamais déduite du site).
- **H1-5** (Q20) « Faire de cette page un fond » fige la page en image (3840 × 2160) : nette à l'échelle 1, douce au
  zoom ; un fond `pdf-page` n'est pas repris.
- **H1-6** (Q30) Mode Infini : fond image fixe, non répété ; sur une page portrait (1a), une photo 16:9 ne couvre que le
  haut, la couleur de page fait le reste. Un `fit: "cover"` demanderait le cœur (K6) : plus tard.
- **H1-7** (Q24) Icône Lucide `wallpaper` pour « Fonds » (porte visuelle).
- **H1-9** (Q35) Une page PDF garde sa page sous « Toutes les pages » ; une capture du bureau (C11b) est remplacée.
- **H1-8** (Q10) Fonds sombres (tableau noir, vert, bleu nuit) : l'encre noire des préréglages s'y voit mal ; aucun
  changement automatique de couleur d'encre.

**Niveau 2 — les autres**

- **H2-1** (Q14) `fetch` relatif au document sous le protocole de la coque (`tauri://`, WebView2, WKWebView) sert les
  WebP de `frontendDist` : supposé, à vérifier à l'essai en coque (`c11a-coque.md`).
- **H2-2** Les tracés Lucide se lisent par `gh api` au commit de `icons.ts` (lecture, pas téléchargement de fichier).
- **H2-3** (Q28) Ctrl+Maj+F n'est pris ni par Chromium ni par les WebView des trois systèmes.
- **H2-4** La couleur de page d'une photo est la moyenne de sa dernière rangée de pixels (mesurée au producteur).
- **H2-5** (Q36) Mes fonds n'a ni renommage, ni dossiers, ni mots-clés (recherche sur le nom seul).
- **H2-6** Une image déposée garde ses octets d'origine ; une image de 30 Mo entre telle quelle dans le document où on
  l'applique.
- **H2-7** Les miniatures des grilles sont rendues à la première ouverture de leur section (≈ 30 rendus de 480 × 270)
  et gardées pour la session ; durée non mesurée sur iPad.
- **H2-8** Le bouton est aussi dans le profil `simple` (barre verticale de grands boutons, un bouton de plus).
- **H2-9** L'îlot d'outils de `defaut` tient encore en entier à 1024 px de large (≈ 790 px) : supposé, mesuré par
  `design-l2` S6.

## 5. Décisions d'architecture

**DA1 — Une commande du cœur pour l'aspect de la page.**
Contexte : une étape d'annulation = une transaction locale ; trois propriétés sur N pages ne tiennent dans aucune commande.
Décision : `ApplyBackground { pages, color, backdrop, grid }` dans `page_look.rs`, une transaction, seules les pages qui
changent écrites ; réutilise `grid::write`, `write_backdrop`, la clé `background`.
Conséquences : `+` < 20 Ko au module principal ; une page `pdf-page` ne perd jamais sa page (Q35) ; un genre de commande de plus pour la CLI, le double et le contrat ;
aucun champ de page neuf, donc aucun changement de format.

**DA2 — Le pack hors du Wasm, servi comme fichiers statiques.**
Contexte : ≤ 30 Mo, hors ligne, à la demande, web et coque.
Décision : WebP dans `apps/web/public/backgrounds/`, catalogue TypeScript chargé par import dynamique, photo pleine lue
seulement à l'application ; provenances dans `apps/web/backgrounds/SOURCES.json`, jamais servies.
Conséquences : installeur +≤ 30 Mo ; dépôt public alourdi d'autant (une fois) ; la CLI lit les mêmes fichiers sur disque.

**DA3 — Fonds dessinés procéduraux.**
Contexte : netteté exigée ; dizaines de lignages et modèles ; poids du pack.
Décision : grilles du cœur (vectorielles) et SVG écrits par des fonctions pures (`backgrounds/svg.ts`), rendus en
3840 × 2160 ; aucune image produite pour eux.
Conséquences : 0 octet de pack ; un SVG appliqué entre dans `assets/` (quelques Ko) ; changer un modèle change son
empreinte (deux versions coexistent dans d'anciens documents, sans gêne).

**DA4 — Mes fonds : troisième racine de la bibliothèque de l'appareil.**
Contexte : rangé sur l'appareil, jamais dans le document ; C4 tient déjà IndexedDB et `plugin-fs`.
Décision : `LibraryRoot` + `"backgrounds"` (IndexedDB même base, coque `Documents/RoomBoard/Fonds`), index propre
`createMyBackgrounds` ; entrée = compagnon JSON + image + miniature.
Conséquences : aucune migration ; pas de `.rbpack` pour les fonds (plus tard si demandé) ; une portée fs de plus en coque.

**DA5 — Recherche maison.**
Contexte : français, synonymes, fautes, hors ligne, ≈ 200 entrées.
Décision : normalisation partagée, synonymes écrits à la main, Damerau-Levenshtein bornée, préfixe ; aucune dépendance.
Conséquences : ≈ 200 lignes testables seules ; le dictionnaire de synonymes s'enrichit sans code.

**DA6 — Une fenêtre modale à part, sans toucher `rb.css`.**
Contexte : « comme MyViewBoard » ; le chantier 1a remanie barres et barre latérale.
Décision : `BackgroundsDialog.tsx` + `backgrounds.css` sur les jetons existants ; ouverture par l'action `backgrounds`
(`toggle`) et Ctrl+Maj+F.
Conséquences : conflits de fusion limités ; la fenêtre suit la charte par les variables, pas par des règles copiées.

**DA7 — Découpage en 11 tâches (≈ 4 h).**
Contexte : 4 h d'exécution ; la recherche des photos et la preuve de leur licence sont le plus long et le plus incertain.
Décision : vague 1 (parallèle) : T1 cœur + pont + doubles (Q35 compris) ; T2 catalogue et fonds dessinés (≥ 110, dont
≈ 12 modèles SVG) ; T3 recherche ; T4a photos, **sources et preuves de licence** (`SOURCES.json`, 40 à 50 entrées
vérifiées, aucune image encodée) ; T5 Mes fonds (racine, module, câblage, capacité et son test Rust). Vague 2 : T4b
**encodage WebP + miniatures** (producteur, `photos.ts`, notices, tests du pack : poids, total ≥ 150, CC0, aucune trace) ;
T6 application (`backgrounds-apply`, `renderPageImage`) ; T7 fenêtre (`RadioChoices` étendu, touches gardées) ; T8
intégration (action, icônes, profils, raccourci, dérivation du dépôt, panneau Grille). Vague 3 : T9 CLI ; T10 essai e2e
S1-S5 sous `coqueCsp()`, `verifier.sh` et `verifier-e2e.test.sh`, captures 2x, netteté § 10.
Conséquences : T4a peut rendre moins de 50 photos sans bloquer (le plancher de 150 tient par les dessinés) ; T4b et T7
portent la porte visuelle.

## 6. Scénarios d'acceptation

Joués par `scripts/essais/fonds-navigateur.mjs` (Chromium de Playwright, contexte `hasTouch`, 1920 × 1080 à 2x),
dans `verifier.sh --e2e`. Au doigt d'abord (`tap`), puis au clavier. Le `dist` est servi sous la CSP de la coque
(`coqueCsp()`, `scripts/essais/commun.mjs:204-210`) et toute requête vers un autre hôte fait échouer l'essai : preuve du
chargement hors ligne sous la CSP réelle (Q37).

- **S1 — Au doigt, un Seyès sur la page, puis annuler.** Ouvrir l'application, toucher « Fonds » dans la barre d'outils :
  la fenêtre s'ouvre sur « Couleurs ». Toucher la section « Lignes et grilles », puis la carte « Seyès 8 mm » : la
  fenêtre se ferme, la page montre la grille Seyès sur fond crème. Toucher « Annuler » une fois : la page redevient
  blanche, sans grille.
- **S2 — Au doigt, recherche tolérante et toutes les pages.** Document de trois pages. Ouvrir « Fonds », taper « ocean »
  puis « oséan » (faute) : les photos de mer apparaissent dans les deux cas ; taper « tableau noir » : la couleur
  « Ardoise » sort. Mettre « Toutes les pages », toucher une photo de mer : les trois pages ont ce fond (un seul asset au
  magasin) et l'avis « Fond appliqué à 3 pages » s'affiche ; un seul « Annuler » rend les trois pages blanches. Le texte
  visible de la fenêtre ne contient aucun nom de site ni « http ». Puis importer un PDF de deux pages (fabrique des
  essais), « Toutes les pages » + « Quadrillage 5 mm » : les pages PDF gardent leur page et reçoivent le quadrillage,
  l'avis le dit ; un « Annuler » les rend telles quelles.
- **S3 — Au doigt, les trois entrées de « Mes fonds ».** Tracer deux traits sur la page ; « Fonds » → « Mes fonds » →
  « Cette page » : une carte apparaît. Fermer, ouvrir « Grille » dans le menu, choisir « Points », toucher « Enregistrer
  comme fond » : une deuxième carte. Rouvrir « Fonds », déposer un PNG sur la fenêtre : une troisième carte, et la page
  n'a reçu aucune image. Recharger l'application : les trois cartes sont là ; le document ne contient aucun fond tant
  qu'aucun n'est appliqué.
- **S4 — Le fond voyage avec le document, et la CLI le pilote.** Ajouter une page, appliquer depuis « Mes fonds » la carte
  « Cette page », enregistrer en `.roomboard`, fermer l'onglet, rouvrir le fichier : la deuxième page montre toujours
  l'image (asset présent dans `assets/`). Puis `roomboard backgrounds --search seyes` liste `seyes-8mm` ; `roomboard
  apply <copie>.roomboard '{"op":"background","id":"seyes-8mm","pages":"all"}' --out <sortie>.roomboard` rend le code
  0 et `state` montre la grille `seyes` sur chaque page ; `{"op":"background","id":"ardoise","page":"$page:1"}` ne
  change que la deuxième page ; `page` et `pages` ensemble rendent le code 2.
- **S5 — Au clavier seul.** Poser un rectangle et le laisser sélectionné. Ctrl+Maj+F ouvre la fenêtre, le focus est dans la recherche ; taper « portee » (sans
  accent) ; Tab jusqu'aux cartes, flèche droite, Maj+Entrée : la portée est sur toutes les pages, la fenêtre fermée et
  le focus revenu au bouton « Fonds » ; Ctrl+Z défait tout ; Ctrl+Maj+F, Suppr et Espace dans la fenêtre, puis Échap : la fenêtre se ferme, le rectangle est
  toujours là et toujours sélectionné, rien n'a changé.

## 7. Hors périmètre

- Mode de page, barre latérale, barre des pages, outil frame (OG4, chantier `personnalisation-1a`).
- Répétition d'un fond image en mode Infini, `fit: "cover"` ou « remplir » pour les pages portrait (cœur, K6).
- Export du fond image et de la couleur de page vers PDF, `.iwb`, `.ubz` (limite existante : `pdf-export.ts:125-133`,
  `board-io.ts:264`).
- Mes fonds : renommage, dossiers, mots-clés, paquet `.rbpack` des fonds, partage, commande CLI ; fonds dans
  « Ressources partagées ».
- Fond vectoriel tiré d'une page (nouveau genre de `backdrop`).
- Changement automatique de la couleur d'encre sur un fond sombre.
- Glisser un fond de la fenêtre vers une page précise ; aperçu en direct avant d'appliquer.
- Fonds du chantier voisin s'ils touchent un autre dépôt : aucun (tout est dans `roomboard`).
- Build Tauri et essais en coque réelle (Windows, macOS, Linux) : ligne ajoutée aux fiches `c11a-coque.md`, jouée plus
  tard sur le PC et le Mac.
- Constats ouverts des zones touchées, non aggravés et non fermés : `core/api.ts:145`, `app/library.ts:76`
  (`fileNameOf` réutilisé, aucun troisième slug), `app/workspace.ts:151`, `ui/rb.css:203`.

## 8. Portes immédiates

Aucune.
