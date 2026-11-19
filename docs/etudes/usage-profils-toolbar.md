# Étude — Profils et configuration de la barre d'outils

Date : 2026-11-19. Statut : étude, aucun code de produit. Complète `docs/etudes/usage-annotation-bureau.md` (annotation de bureau, zone de dépôt).

Demande de Jérôme, mot pour mot : « La configuration de la toolbar (outils, tailles, emplacement) », « Configuration des profils (interface, outils, etc...) » et « Un profils pourra permettre le démarrage par défaut en mode annotation de bureau. » Il a acté que des fonctions seront impossibles sur Android, iPad et web : cette étude dit seulement où elles manquent.

## Conclusions

1. Un profil RoomBoard est un **fichier JSON versionné** à quatre blocs (interface, barres, comportement, plateforme), stocké dans les réglages de l'application, exportable en `.roomboard-profil` (extension proposée), avec les clés inconnues conservées à la réécriture.
2. La barre est déjà une donnée (D22, DA10) ; il manque pour la suite : une **liste de barres** (pas une seule), un **emplacement**, des **tailles**, des **préréglages par outil**, et un champ **`schema`** dès la première version.
3. Les capacités masquent ce qui manque (D22) : le même profil marche sur iPad ; un outil absent est masqué, et le profil le garde pour la prochaine machine.
4. Le changement de profil à chaud est une simple substitution d'un signal SolidJS ; il n'exige aucune relance si le modèle du lot 5b est pur.
5. Le lot 5b refait tout s'il pose une barre unique, un identifiant d'outil en dur dans l'interface ou des réglages sans version : voir « À prendre dès le lot 5b ».

## Sources

### Fichiers du dépôt lus

- `apps/web/src/toolbar.ts` (24 lignes) : `ToolId = "pen" | "eraser" | "select"`, `ToolDef { id, label }`, liste plate `toolbar`, `validateToolbar` (doublon, libellé vide). Aucune icône, aucune option, aucun groupe, aucun emplacement.
- `docs/plans/socle-cadrage.md` : D21 (SolidJS seulement dans `apps/web/src/ui/`), D22 (étend `toolbar.ts` : `ToolItem`, `ToolbarProfile`, `parseToolbarProfile`, outil refusé par la table des capacités masqué, « le profil choisi se garde dans les réglages de l'application (pas dans le document) »), D23 (capacités : `Platform` + `Capabilities`, exposée par Wasm, « aucun champ au socle 0.1 »), D24 (manifeste `formatVersion`, `schema`), D26 (`FileHost`), D27 (une fenêtre = une page = un document ; *correction du cadrage d'usage, 2026-11-19 : D27 ne parle pas de `localStorage`, c'est la carte d'impact du socle, § « Persistance et format », `socle-cadrage.md:134`, qui le suppose*), DA10 (formes exactes des types), lot 5 dans `docs/plans/socle-PLAN.md`.
- `apps/desktop/src-tauri/tauri.conf.json`, `capabilities/default.json` : une seule fenêtre.

### Acquis ActCraft (`~/projets/actcraft`, lecture seule)

ActCraft a un système de profils complet, déjà éprouvé ; il sert de référence de conception (pas de code à reprendre : C++/Qt, abandonné) :

- `actions/src/profile.cpp`, `actions/include/actcraft/actions/profile.h` : format `"actcraft-profile/1"` ; la version **majeure** décide (« `/1`, `/1.4` » acceptés, « `/10`, `/2` » refusés, l. 74-81) ; clés de premier niveau connues listées, **tout le reste va dans `unknownKeys` et est réécrit tel quel** (profile.h l. 69) : un profil plus récent survit à un aller-retour dans une version plus ancienne.
- `actions/data/profiles/*.json` : cinq profils fournis (`en-classe`, `preparation`, `calcul-geometrie`, `lecture-ecriture`, `son-image`) ; blocs `palette` (`dock`: left / right / top / bottom / floating, `collapsed`, `pinned`, `swatches`), `browsers` (côté, largeur, panneau courant), `icon-pixels`, `fit-page`, `trash-visible`, `pinned` (liste des commandes épinglées), `extra-colors`, `recent-tools` (borné à 8), `shortcut-objects`, `launchers`, `settings`.
- `actions/src/profilestore.cpp` : profils fournis en **lecture seule** ; une copie utilisateur avec le même identifiant les remplace ; « Revenir à l'origine » retire la copie ; fichiers `<id>.json` dans un dossier utilisateur ; liste des noms réservés Windows (`con.json` interdit) ; lecture en couches (`readLayeredFile`, `layout.cpp`) : fichier utilisateur sur fichier fourni.
- `ui/qml/ProfileEditor.qml`, `ProfileChooser.qml`, `profilecontroller.cpp` : éditeur à quatre onglets (Format, Commandes, Raccourcis vers des programmes, Paramètres), boutons Importer, Exporter, Enregistrer, Enregistrer sous, Supprimer, Revenir à l'origine ; sélecteur de profil dans la barre d'outils.
- `ui/help/profils.html` : texte d'aide qui décrit ce qui précède ; « mode conception » (F2) pour organiser l'interface.
- Garde juridique à reprendre : `docs/specs/2026-10-14-livraison-complete-cadrage.md` (l. 120-123) interdit les icônes, textes d'aide, marques et données extraites d'ActivInspire. RoomBoard décrit les **fonctions**, pas les fichiers ni les noms de Promethean.

### Pages web consultées

- Promethean / établissements, ActivInspire : recherches « Edit Profiles », « Toolbox » ; pages de formation non ouvertes (la page `help.knoxschools.org` demande une connexion). Ce qui suit pour ActivInspire vient des résumés de recherche.
- SMART Notebook : https://support.smarttech.com/docs/software/notebook/current/en/getting-started/learn-the-interface.cshtml (lue) ; https://onlinehelp.smarttech.com/english/windows/help/notebook/10_0_0/NBMovingNotebookSoftwareToolbar.htm et https://onlinehelp.smarttech.com/english/mac/help/notebook/10_0_0/NBCustomizingNotebookToolbar.htm (titres vus dans les résultats, non lus).

## Ce que proposent ActivInspire et SMART

### ActivInspire

Relevé dans des résumés de recherche (supports de formation d'établissements ; non vérifié sur une installation) :

- « Edit Profiles » s'ouvre par le menu Edit, Ctrl+J, ou View > Customise (Ctrl+U).
- Onglet **Layout** : taille des icônes de la boîte à outils (curseur), position de la boîte à outils, du navigateur, de la barre de menus et des onglets de document. Appliquer ferme la fenêtre d'édition.
- Onglet **Commands** : ajouter, retirer, ordonner les icônes de la boîte à outils principale et des « poignées de marquee » (Move Up, Move Down).
- Boîte à outils déplaçable à la main (zone grise du haut) ou ancrée (« Dock the Toolbox ») ; flottante possible.
- Profils stockés comme fichiers dans un dossier « My Profiles » du dossier de ressources de l'application ; un profil par utilisateur.
- **Non retrouvé** : l'extension `.ActivInspireProfile` citée dans la demande (la recherche n'a rien donné pour ce nom). Aucune structure de fichier lue. Ne pas s'y aligner.

### SMART Notebook

Vérifié (page « Learn the interface ») :

- Boîte de dialogue « Customize Toolbar » (bouton « Customize the toolbar » ou clic droit sur la barre) : **ajouter, retirer, réordonner** des boutons, par panneau (Actions, Tools) ; un bouton peut s'étendre sur plusieurs lignes (déconseillé sur petit écran).
- « Restore Default Toolbar » (boutons) et « Restore Default Tool Properties » (réglages enregistrés des outils) : **deux remises à zéro distinctes**.
- Position : en haut par défaut ; « Move toolbar to top/bottom of window » la met en bas, utile quand les élèves n'atteignent pas le haut.
- Rangée contextuelle : choisir un outil (Pens) fait apparaître une rangée de boutons liés à cet outil (types de stylos, épaisseurs).
- Panneau d'extensions à droite du panneau Actions ; onglets (Page Sorter, Gallery, Attachments, Properties, Add-ons) : leur emplacement n'est pas dit.

À retenir de SMART : haut / bas seulement, mais **deux remises à zéro** (barre, propriétés des outils) et la **rangée contextuelle** par outil. À retenir d'ActCraft : cinq positions (`left`, `right`, `top`, `bottom`, `floating`), profils fournis en lecture seule, import / export, version majeure et clés inconnues conservées.

## Ce qui existe dans RoomBoard aujourd'hui (vérifié)

`toolbar.ts` est une liste plate de trois outils (`pen`, `eraser`, `select`). D22 / DA10 le transforment au lot 5 en `ToolbarProfile = { id, label, groups: { id, items: ToolItem[] }[] }`, avec `ToolItem { id, tool, icon, label, options? }`, `parseToolbarProfile(json)`, `defaultProfile`, `visibleItems(profile, caps)`. L'éditeur de profils « viendra plus tard » (DA10). Ce qui **manque pour la demande de Jérôme** : emplacement, taille des boutons, langue, thème, barres multiples, préréglages (couleurs, épaisseurs), comportement de démarrage, version de schéma, stockage et échange.

## Modèle proposé

### Un profil, quatre blocs

```
{
  "format": "roomboard-profile",
  "schema": 1,
  "id": "en-classe",
  "label": "Faire la classe",
  "interface":  { "locale": "fr", "theme": "auto", "buttonSize": "m", "pageBar": { "dock": "bottom" } },
  "toolbars":   [ { "id": "principale", "dock": "left", "groups": [ … ] } ],
  "presets":    { "pen": { "colors": ["#000000", …], "widths": [2, 4, 8], "active": 1 } },
  "behavior":   { "startMode": "board" | "desktop-annotation", "startPage": "blank", "background": "white" },
  "platform":   { "ipad": { "toolbars": { … } } }
}
```

Forme indicative, non figée : le but est de fixer le découpage, pas les noms.

- **Interface** : langue (au socle, français seulement ; le champ existe), thème (clair, sombre, automatique), taille des boutons (petit / moyen / grand plutôt que des pixels : la taille réelle dépend du stylet et de l'écran ; valeur numérique possible en option), emplacement de la barre des pages (D16 : « 3 / 7 »).
- **Barres** (`toolbars`) : **une liste**, pas une seule barre. Chaque barre a un `dock` (`top`, `bottom`, `left`, `right`, `floating` avec position et taille), des groupes d'éléments, un état replié. Barres multiples : oui en donnée (ActCraft avait palette, navigateurs, clavier ; SMART a Actions et Tools), une seule affichée au socle. Cinq emplacements comme ActCraft : le coût du modèle est nul, celui de l'interface est dans la barre flottante (hors socle).
- **Outils et préréglages** : `ToolItem.options` (DA10) porte la configuration de l'outil ; les préréglages (couleurs, épaisseurs, tailles de gomme, taille de texte) sont séparés des éléments de barre : un outil unique, des préréglages partagés par toutes les barres. La rangée contextuelle de SMART se déduit des préréglages de l'outil actif.
- **Comportement** : mode de démarrage (`board` ou `desktop-annotation`), page par défaut, fond par défaut. `desktop-annotation` est une **intention**, pas une promesse : si la capacité manque, repli sur `board` (voir « Plateformes »). C'est le point où l'étude d'annotation s'accroche.
- **Plateforme** : un bloc facultatif de surcharges par plateforme ou par catégorie d'appareil. Au socle, rien : la table des capacités suffit à masquer.

### Ce qui ne va pas dans le profil

Le document (`.roomboard`, D24) ne contient pas le profil (D22 : « pas dans le document »). Les réglages propres à un appareil (taille de fenêtre, dernier fichier, autorisations système, position de fenêtre flottante par écran) ne vont pas non plus dans un profil échangeable : ils vont dans les réglages de l'application.

### Stockage

| Option | Description | Avantages | Limites |
|---|---|---|---|
| A. Un seul objet `localStorage` | tous les profils dans une clé | Marche partout, sans coque (D27) | ~5 Mo de limite ; effaçable par le navigateur ; Safari (iPad) peut purger le stockage d'un site peu utilisé (supposé, non lu) |
| B. IndexedDB (web) / fichiers dans le dossier de l'application (Tauri) derrière une interface `ProfileStore` | un profil = un enregistrement ou un fichier `<id>.json` | Comme ActCraft ; copie dans un dossier synchronisé possible ; robuste | Deux implémentations à tester ; calquer `FileHost` (D26) |
| C. Fichier de profil dans le dossier du document | profil voyageur avec le document | Facile à partager | Contredit D22 ; mélange appareil et document |

Recommandation : B pour le principe (interface `ProfileStore`), A comme première implémentation si le lot 5 doit rester court : D22 et la carte d'impact du socle (`socle-cadrage.md:134`, supposé) prévoient déjà `localStorage`. L'essentiel est que l'**interface** soit posée dès le lot 5b.

### Fichier exportable

Extension proposée `.roomboard-profil` (contenu JSON, type `application/vnd.roomboard.profile+json`) : lisible, diffable, distinct de `.roomboard` (conteneur ZIP du document). Alternative : `.roomboard.json`, qui n'exige aucune association de fichier. Association de l'extension par la coque (le plan note déjà celle de `.roomboard`, lot 5). Sur iPad : l'import passe par `<input type=file>` (D26, repli) ; l'export par téléchargement. Import : jamais d'exécution, validation par `parseProfile`, refus de la version majeure supérieure avec un message qui dit « mettez RoomBoard à jour ».

### Changement de profil à chaud

Dans le modèle du lot 5b (SolidJS, D21) : le profil actif est un signal ; la barre, la barre des pages et les réglages d'interface en dérivent. Changer de profil remplace la valeur ; aucune relance. Quatre exigences : (1) le moteur ne lit jamais le profil, il reçoit des commandes (`setTool`, `setPreset`) : un changement de profil déclenche au plus un `setTool` ; (2) un geste en cours n'est pas interrompu (attendre le relâché : D39) ; (3) le profil ne contient aucune donnée du document ; (4) mémoriser le profil par appareil, pas par document. Profil par utilisateur (ActivInspire) : un sélecteur dans la barre ou le menu ; l'identité d'utilisateur est sans objet au socle (aucun compte).

### Plateformes et capacités

Un profil décrit ce qu'on **veut** ; la table des capacités (D23) dit ce qui est **possible**. La règle D22 tient : un élément dont l'outil n'est pas disponible est masqué, pas supprimé du profil. Ainsi un même profil importé sur l'iPad masque « Annotation de bureau », et le même fichier sur Windows l'affiche. Conséquences :

- un profil peut déclarer `requires: ["desktopAnnotation"]` par élément ou par comportement ; l'absence masque l'élément ou rabat le comportement (`startMode` → `board`) ;
- les capacités sont de deux espèces : **statiques** (plateforme : coque, web, iPad ; connues au démarrage) et **dynamiques** (pression détectée à l'exécution, D23) ; `visibleItems(profile, caps)` doit accepter une valeur qui change ;
- un profil par catégorie d'appareil existe en donnée par `platform` : utile pour l'iPad (boutons plus gros, barre en bas) sans dupliquer le profil entier ;
- fonctions impossibles, constat seulement : annotation de bureau (web, iPad, Android) ; zone de dépôt de fichiers vers le canvas par chemin (web : fichiers sans chemin) ; démarrage dans un mode particulier de fenêtre (web) ; association de fichier `.roomboard-profil` (web).

### Schéma versionné et migration

- Deux nombres : `format` (nom stable) et `schema` (entier). D24 fait déjà `formatVersion` et `schema` pour le document : **même logique**, mêmes mots.
- Règle (reprise d'ActCraft) : la version **majeure** inconnue est refusée avec un message ; une version mineure plus récente est lue, ses clés inconnues **conservées** (`unknown`) et réécrites telles quelles.
- Migration : une fonction pure par saut (`migrate1to2`), enchaînées ; testée par fichiers d'exemple de chaque version conservés dans le dépôt (`apps/web/src/profile/fixtures/`).
- Profils fournis : intégrés au code (lecture seule), copie utilisateur par-dessus, « revenir à l'origine » retire la copie : c'est le modèle d'ActCraft.
- `parseToolbarProfile` (DA10) devient un cas particulier de `parseProfile` : mêmes contrôles (doublon, libellé vide, outil inconnu) étendus aux barres et à la plateforme.
- **Outil inconnu à la lecture** (profil venu d'une version plus récente) : ne pas rejeter tout le profil ; garder l'élément, ne pas l'afficher, le réécrire tel quel. Différent de DA10 qui prévoit « outil inconnu » comme erreur : à trancher (question ouverte 5).

## À prendre dès le lot 5b

Le lot 5b (SolidJS, barre en profils, barre des pages) est le moment où le modèle se fige. Ce qu'il doit poser pour ne pas être refait :

1. **`schema` et `format` dans le profil, dès la première écriture**, et un `parseProfile` qui refuse la version majeure inconnue et conserve les clés inconnues. Sans cela, tout profil enregistré par le lot 5b devient illisible à la première évolution.
2. **Une liste de barres** : `toolbars: ToolbarProfile[]` (ou `bars`) et non un `ToolbarProfile` unique ; au socle une seule barre affichée, mais la donnée est une liste. Même chose pour la barre des pages : un emplacement (`dock`) lisible.
3. **Un `dock` par barre** (`top | bottom | left | right | floating`), même si seul `bottom` ou `left` est dessiné ; le CSS de la barre en dérive (orientation, ordre, taille de bouton).
4. **`ToolId` ouvert** : une chaîne validée par la table des outils, pas une union figée à trois valeurs. `ToolId` étendu (D22) ; ajouter `desktopAnnotation` plus tard ne casse pas le code. Aucun `switch` sur l'identifiant dans les composants.
5. **Capacités en entrée de la barre** : `visibleItems(profile, caps)` reçoit des capacités qui peuvent changer (signal), y compris la capacité `desktopAnnotation` (étude jumelle). *Correction du cadrage d'usage (2026-11-19) : le champ existe déjà* (`crates/roomboard-core/src/capabilities.rs:16`, `desktop_annotation`, avec `multi_window`, exposés par `capabilities(platform)` de la liaison Wasm) ; il est **statique** et vaut `true` sous Linux, ce qui est faux sous Wayland natif : la coque doit le corriger à l'exécution (cadrage d'usage, U10).
6. **Préréglages séparés des éléments de barre** (`presets` par outil) et `ToolItem.options` réservé à la configuration de l'élément ; sinon couleurs et épaisseurs sont dupliquées par barre.
7. **Taille de bouton en jeton** (`s | m | l`) servi par une variable CSS ; aucune dimension en pixels écrite dans les composants (la cible tactile compte pour le stylet et le doigt).
8. **`ProfileStore` en interface** (lecture, écriture, liste, suppression, import, export), avec une première implémentation `localStorage` ; le composant n'appelle jamais `localStorage` directement.
9. **Le profil actif est un signal** (contexte SolidJS) lu par la barre et par la barre des pages ; le moteur reçoit des commandes, jamais le profil. Cela rend le changement à chaud gratuit.
10. **Barre séparable** : le composant de barre ne suppose pas d'être dans la même page que le canvas. Elle communique par une interface (`ToolbarHost` : `setTool`, `openFiles`, `setMode`) dont l'implémentation locale est un appel direct, et dont l'implémentation de la coque pourra être un message entre deux fenêtres Tauri (annotation de bureau). C'est la condition pour que la barre vive dans sa propre fenêtre sans refonte.
11. **Zone de dépôt comme élément de barre** : un `ToolItem` de nature « zone » (pas un outil), sans identifiant d'outil, masqué hors capacité de dépôt par chemin ; prévoir le type d'élément (`kind: "tool" | "action" | "dropzone"`).
12. **Ne pas utiliser le glisser-déposer HTML5** pour réordonner les éléments : sous Windows, le gestionnaire de dépôt de Tauri le désactive dans la fenêtre (voir étude jumelle) ; utiliser les événements de pointeur.
13. **Deux remises à zéro** (barre, préréglages), comme SMART : le modèle sépare déjà les deux.
14. **Identifiants d'éléments stables** (`id` unique et jamais réutilisé) : l'import, l'ordre et la migration en dépendent ; D22 garde le contrôle de doublon.
15. **Profil `defaut` en lecture seule** intégré au code et utilisable sans stockage (premier démarrage, stockage purgé, profil corrompu).

Tests à poser dès le lot 5b (pure logique, sans interface, comme le veut DA10) : analyse d'un profil valide, d'un profil de version majeure supérieure (refus), d'une version mineure supérieure (clés conservées), d'un outil inconnu, d'une capacité absente (élément masqué), d'un aller-retour exporter / importer.

## Ce qui marche sur iPad (web) / ce qui demande la coque

| Fonction | Web (iPad compris) | Coque Tauri |
|---|---|---|
| Profils, barre configurable, tailles, emplacement | Oui : tout est donnée et CSS | Oui |
| Stockage | `localStorage` ou IndexedDB, avec risque de purge par le navigateur (supposé) | Même stockage dans la WebView, ou fichiers du dossier de l'application |
| Import / export de profil | `<input type=file>` et téléchargement | Dialogues natifs (D26), association de l'extension |
| Barre dans sa propre fenêtre | Manque (une page = une fenêtre) | Oui (annotation de bureau) |
| Démarrage en annotation de bureau | Manque ; repli sur le tableau | Oui |
| Zone de dépôt de fichiers dans la barre | Dépôt sur la page seulement, sans chemin | Oui, avec chemins, par la fenêtre barre |
| Langue, thème | Oui | Oui ; thème « automatique » selon `prefers-color-scheme` partout |
| Profil par utilisateur du système | Manque (pas de compte) | Dossier utilisateur du système |

## Vérifié

- État actuel de `toolbar.ts` et ce que décident D22, D23, D24, D27 et DA10 (lus).
- Fonctionnalités de SMART Notebook : personnalisation (ajouter, retirer, réordonner), position haut / bas, deux remises à zéro, rangée contextuelle (page « Learn the interface »).
- Le système de profils d'ActCraft (format, clés, versions, stockage, éditeur, fichiers fournis), avec chemins.
- Interdiction de reprendre des ressources de Promethean (cadrage d'ActCraft, l. 120-123).

## Supposé

- Fonctions d'ActivInspire (onglets Layout et Commands, taille d'icônes, ancrage) : résumés de supports de formation, pas de l'application ni de sa documentation officielle.
- L'extension `.ActivInspireProfile` : non retrouvée ; stockage « My Profiles » : relevé indirectement.
- Taille des boutons en trois jetons suffisante ; cinq emplacements suffisants ; barres multiples utiles à ce stade.
- Purge de `localStorage` par Safari sur iPad ; limites de taille.
- Extension `.roomboard-profil` et type MIME : propositions, aucune vérification de conflit.
- Association de fichier par Tauri pour une seconde extension.
- Une barre dans une autre fenêtre Tauri se pilote bien par une interface de messages (non essayé).

## Recommandation pour RoomBoard

Options :

1. **Profil JSON versionné à quatre blocs, barres en liste, `ProfileStore` en interface, `localStorage` au début, export `.roomboard-profil` (recommandée).** Reprend ce qu'ActCraft a éprouvé (versions, clés inconnues, fournis en lecture seule, copie utilisateur) et ce que SMART apporte (deux remises à zéro, rangée contextuelle). Les décisions D22 et DA10 sont étendues, pas contredites.
2. **Barre unique, profil minimal au lot 5b, le reste plus tard.** Rapide, mais le lot 5b refera le modèle (barre en liste, `schema`, `dock`, préréglages) au lot suivant ; les profils enregistrés d'ici là demanderont une migration.
3. **Éditeur graphique complet d'abord (comme l'éditeur d'ActCraft à quatre onglets).** Coûteux, inutile avant que le modèle soit stable ; DA10 le reporte déjà. À prévoir après l'option 1.

Ordre conseillé : modèle et `parseProfile` (lot 5b) → barre et barre des pages dérivées du profil (lot 5b) → export et import → éditeur (après le socle) → annotation de bureau (coque, étude jumelle).

## Questions ouvertes

1. Combien de barres à l'écran au socle : une seule, ou barre d'outils + barre des pages comme deux entrées de la liste ?
2. Taille des boutons : trois jetons, ou une valeur numérique libre (ActivInspire a un curseur) ?
3. Un profil porte-t-il des raccourcis clavier ? ActCraft les avait ; le socle n'en parle pas.
4. Profil par utilisateur : seulement un choix sur l'appareil, ou un jour synchronisé (compte RoomFlow, hors socle) ?
5. Un outil inconnu dans un profil : erreur (DA10 actuel) ou élément conservé et masqué (proposé ici) ?
6. Extension d'export : `.roomboard-profil` ou `.roomboard.json` ? Et l'association de fichier sur le bureau, au lot 5 ou plus tard ?
7. Profils fournis : lesquels, et en combien (ActCraft en a cinq) ? Un seul `defaut` au socle ?
8. Le profil peut-il imposer le mode `desktop-annotation` seulement au premier démarrage, ou à chaque démarrage ?
9. Le profil par plateforme est-il une section du même profil (proposé) ou un profil distinct choisi automatiquement ?
