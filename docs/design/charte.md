# Charte de RoomBoard — jetons relevés de RoomFlow

RoomBoard reprend la charte de RoomFlow (Jérôme, 2026-11-24 : « Reprend la charte de roomflow pour les couleurs »).
Chaque valeur ci-dessous cite son fichier et sa ligne. Aucune couleur n'est inventée : une couleur absente de cette page
n'entre pas dans l'interface.

Sources, lues par `git show` sans toucher aux copies de travail :

- **rf2** : `roomflow2`, `origin/master` à `ddaba7ca`, dossier `RoomFlow2.App/Themes/` sauf mention ;
- **web** : `roomflow2-web`, `origin/master` à `07cc047c`, fichier `src/index.css`.

Les deux dépôts donnent les mêmes valeurs pour les couleurs communes (le web cite RF1, la même charte).

## Couleurs

| Jeton RoomBoard (maquettes) | Valeur | Source rf2 | Source web | Rôle dans RoomBoard |
|---|---|---|---|---|
| `--rf-violet-600` | `#6044EB` | `Tokens.Base.xaml:12` `RF.Base.Violet600Color` = `RF.Accent.Brush` (`Tokens.Semantic.xaml:34`) | `--color-primary` (l. 5) | accent : action principale (« Envoyer au tableau »), contour de l'élément choisi, cadre de l'annotation |
| `--rf-violet-700` | `#4F35C4` | `Tokens.Base.xaml:13` = `RF.Accent.HoverBrush` (`Tokens.Semantic.xaml:35`) | `--color-primary-hover` (l. 6) | icône et texte de l'outil actif, liens d'action |
| `--rf-violet-400` | `#8B6FEF` | `Tokens.Base.xaml:14` = `RF.Nav.AccentBrush` (`Tokens.Semantic.xaml:54`) | — | accent sur fond sombre (réservé, thème sombre) |
| `--rf-violet-100` | `#EDE8FD` | `Tokens.Base.xaml:15` = `RF.Accent.SubtleBrush` (`Tokens.Semantic.xaml:36`) | `--color-primary-light` (l. 7) | fond de l'outil actif, de l'onglet montré, du choix retenu |
| `--rf-navy-900` | `#0D1B2A` | `Tokens.Base.xaml:18` | — | bas du dégradé du bureau neutre (maquettes 00 et 02 seulement) |
| `--rf-navy-700` | `#1E3355` | `Tokens.Base.xaml:20` | — | haut du dégradé du bureau neutre |
| `--rf-navy-500` | `#182946` | `Tokens.Base.xaml:22` = `RF.Text.HeadingBrush` (`Tokens.Semantic.xaml:29`), `RF.Studio.TextBrush` (`Tokens.Studio.xaml:23`) | `--color-text-heading`, `--color-bg-sidebar` (l. 32, 22) | icônes au repos, titres, infobulle |
| `--rf-gray-50` | `#F5F5F8` | `Tokens.Base.xaml:26` = `RF.App.BackgroundBrush` (`Tokens.Semantic.xaml:21`), `RF.Studio.CanvasBrush` (`Tokens.Studio.xaml:12`) | `--color-bg-body` (l. 20) | fond autour de la page, survol |
| `--rf-gray-100` | `#FAFAFE` | `Tokens.Base.xaml:27` = `RF.Surface.RowHoverBrush` (`Tokens.Semantic.xaml:24`) | `--color-bg-table-row-hover` (l. 26) | ligne d'outil masqué dans l'éditeur |
| `--rf-gray-300` | `#E0E0E8` | `Tokens.Base.xaml:28` = `RF.Border.Brush` (`Tokens.Semantic.xaml:33`) | `--color-border` (l. 44) | filets, séparateurs, contour des îlots |
| `--rf-gray-500` | `#888888` | `Tokens.Base.xaml:29` = `RF.Text.SecondaryBrush` (`Tokens.Semantic.xaml:28`) | `--color-text-muted` (l. 31) | icône désactivée, poignée ; jamais du texte (3,5:1 sur blanc) |
| `--rf-text-muted-aa` | `#6B7280` | — | `--color-text-muted-aa` (l. 34) | texte secondaire (4,8:1 sur blanc) |
| `--rf-gray-800` | `#333333` | `Tokens.Base.xaml:30` = `RF.Text.PrimaryBrush` (`Tokens.Semantic.xaml:27`) | `--color-text-main` (l. 30) | texte courant |
| `--rf-white` | `#FFFFFF` | `Tokens.Base.xaml:31` = `RF.Surface.Brush` (`Tokens.Semantic.xaml:22`) | `--color-bg-card` (l. 21) | îlots, panneaux, page |
| `--rf-success` | `#27AE60` | `Tokens.Base.xaml:36` = `RF.Status.SuccessBrush` (`Tokens.Semantic.xaml:58`) | `--color-success` (l. 47) | pastille « envoyé », « enregistré » |
| `--rf-danger` | `#E74C3C` | `Tokens.Base.xaml:44` = `RF.Status.DangerBrush` (`Tokens.Semantic.xaml:60`) | `--color-danger` (l. 49) | erreurs (pas dans les maquettes) |

Couleurs de portée (`RoomFlow2.App/Converters/ScopeColors.cs:10-16`) : Tous `#6044EB`, Officiel `#2D7DD2`, Entreprise
`#27AE60`, Personnel `#E08585`, Communauté `#7C3AED`, Pictogramme `#EAB308`. RoomBoard ne les emploie pas encore ; elles
serviront si la bibliothèque (C4) range des ressources par portée.

**Hors charte, contenu de la page** : les couleurs d'encre et de remplissage des maquettes sont les préréglages du profil
fourni, pas des couleurs d'interface : noir `#000000`, rouge `#dc2626`, bleu `#1d4ed8`
(`apps/web/src/toolbar-profiles.ts:62-64`) ; bleu de remplissage `#bfdbfe` (`apps/web/src/toolbar.ts:159`).

## Ombres

| Jeton | Valeur web (l.) | Équivalent rf2 (`Tokens.Semantic.xaml`) | Usage |
|---|---|---|---|
| `--rf-shadow-card` | `0 2px 8px rgba(24, 41, 70, 0.08)` (l. 63) | `RF.Shadow.Card` (l. 105-106) | page, infobulle |
| `--rf-shadow-hover` | `0 6px 16px rgba(24, 41, 70, 0.12)` (l. 64) | `RF.Shadow.Hover` (l. 107-108) | îlots flottants (barre, onglets, pages) |
| `--rf-shadow-modal` | `0 13px 27px rgba(24, 41, 70, 0.15)` (l. 65) | `RF.Shadow.Modal` (l. 109-110) | menu, panneau des profils |

Teinte : `rgba(24, 41, 70)` = `#182946`, l'ombre « teintée navy, signature RF » (`Tokens.Semantic.xaml:104`). Les îlots
ajoutent un filet `0 0 0 1px #E0E0E8` (`RF.Border.Brush`) sous l'ombre, pour tenir sur un fond clair comme sur un bureau.

## Rayons et espacements

- Rayons (`Tokens.Semantic.xaml:99-102`) : SM 4, MD 6, LG 8, XL 12 ; web `--radius-*` (l. 68-72, même suite, plus
  `--radius-pill`). RoomBoard : bouton LG 8, îlot et panneau XL 12, infobulle MD 6, page SM 4.
- Espacements (`Tokens.Semantic.xaml:91-96`) : XS 4, SM 8, MD 16, LG 24, XL 32, XXL 48 ; web `--spacing-*` (l. 54-59).
  RoomBoard : 4 entre deux boutons d'un îlot, 16 entre un îlot et le bord de l'écran, 24 et 32 dans les panneaux.

## Typographie

- Famille (`Tokens.Semantic.xaml:77`) : Inter, puis Segoe UI Variable Display, Segoe UI ; web `--font-sans` (l. 2) : Inter,
  puis la police du système. Fichiers : `RoomFlow2.App/Assets/Fonts/Inter-{Regular,Medium,SemiBold,Bold}.ttf`
  (licence OFL, à vérifier dans le dépôt avant de l'embarquer, question Q6 du cadrage).
- Tailles (`Tokens.Semantic.xaml:78-85`) : 12, 13, 14, 15, 16, 18, 20, 28. RoomBoard : 16 pour les menus et les listes
  (lisible à 3 m sur un écran de 75 pouces en 4K à 200 %), 14 pour l'infobulle et les notes, 20 pour le titre d'un panneau.
- Graisses : 400, 500 (libellés), 600 (titres, élément choisi).

Le détecteur d'impeccable signale Inter comme « police trop vue ». Écarté : la police vient de la charte, que Jérôme a
demandé de reprendre.

## Icônes

- **Bibliothèque** : Lucide (ISC), standard de RoomFlow (`Tokens.LucideIcons.xaml`, 49 géométries, « contours,
  viewBox 24×24 », l. 3). Les maquettes citent `lucide-icons/lucide` à `7981a0798a`.
- **Trait** : RoomFlow trace ses icônes à 2 (`Tokens.StudioControls.xaml:217`, `StrokeThickness="2"`). RoomBoard passe à
  **1,5**, plus fin, comme Excalidraw (1,25 à 1,5 sur ses icônes de 20). Voir D-DS4 du cadrage.
- **Taille** : 24 px dans tous les boutons. 20 px seulement si une taille de bouton l'exige, et jamais avec un trait
  calé sur la grille (voir D-DS4).
- **Calage sur la grille** : `viewBox="-0.25 -0.25 24 24"`. À `devicePixelRatio` 2, chaque trait vertical ou horizontal
  de Lucide fait alors 3 pixels pleins, sans pixel de bord à demi-teinte (mesure dans la PR).
- **Icônes dessinées pour RoomBoard** (même grille, même trait) : `annotate` (l'écran de Lucide `monitor` et un trait
  d'encre dedans), `eraser-part` (la gomme de Lucide, base en pointillés), `line` (segment diagonal), `row-remove` et `col-remove` (deux blocs séparés d'un trait, rangée et colonne retirées).

## Logos existants

| Logo | Où | État |
|---|---|---|
| Icône de la coque RoomBoard | `apps/desktop/src-tauri/icons/` (`icon.png` 512 px, `.ico`, `.icns`, tailles Windows) ; sources `docs/design/icone/` | « B · Tableau plein » (Q1, choix de Jérôme du 2026-11-26, design L5) : tuile `#182946`, hexagone et flèche `#6044EB` de l'icône RoomFlow, page blanche `#FFFFFF` ; sans flèche à 16 à 32 px ; chaque taille rendue depuis son SVG calé |
| Icône de l'application RoomFlow | rf2 `RoomFlow2.App/Assets/Logos/roomflow-app-icon.svg` | hexagone et flèche `#6044EB` sur pastille `#182946`, rayon 22 % ; repris tel quel dans le menu de la maquette 01 |
| Hexagone RoomFlow | rf2 `Assets/Logos/roomflow-hex.svg` | marque seule, deux tracés |
| Logos des produits | rf2 `Assets/Logos/roomflow-{docs,library,manager,studio,tools}-{icon,dark}.svg` ; web `public/logos/roomflow-*-{dark,light}.svg` | une famille : même hexagone, un motif par produit |

Aucun dessin de marque n'est créé : l'icône RoomBoard reprend l'hexagone et la flèche de la famille RoomFlow (Q1 du
cadrage), avec un tableau blanc au centre. Méthode et contrôle de netteté : `docs/design/icone/LISEZMOI.md`.
