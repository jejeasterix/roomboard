# Essai S5 — coque RoomBoard sous macOS (lot 5a)

Pour : Jérôme, sur le Mac, hors agent (non bloquant, D34). Durée : 30 min, dont 15 de build.
Ce qui est essayé : ouvrir, enregistrer, fermer dans la coque (WebKit), puis la même chose dans Chrome avec la
File System Access API. Formes et texte (lot 4) : seulement si le lot 4 est fusionné.

## 1. Prérequis
- Rust stable (`rustup`), puis `rustup target add wasm32-unknown-unknown`.
- `cargo install wasm-bindgen-cli --version 0.2.130 --locked` (la version doit égaler `Cargo.lock`).
- Node 22 et pnpm (`corepack enable`).
- `xcode-select --install`.

## 2. Construire (Terminal, zsh)
```sh
git clone https://github.com/jejeasterix/roomboard.git
cd roomboard
git checkout main
pnpm install --frozen-lockfile
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm -o apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
pnpm exec wasm-opt -Oz apps/web/src/wasm/roomboard_wasm_bg.wasm -o apps/web/src/wasm/roomboard_wasm_bg.wasm
pnpm --filter @roomboard/desktop tauri build
```
Les deux modules Wasm (cœur, puis `formats`) sont construits comme dans `scripts/verifier.sh`, `wasm-opt -Oz` du module `formats` compris (OE71) : sans le second,
`tsc --noEmit` du `beforeBuildCommand` échoue sur `../wasm-formats/roomboard_formats_wasm` (TS2307).
Attendu : la sortie montre `Running beforeBuildCommand`, puis un installeur sous
`apps/desktop/src-tauri/target/release/bundle/`. Lancer par `open apps/desktop/src-tauri/target/release/bundle/macos/RoomBoard.app`.

## 3. Parcours dans la coque
| # | geste | attendu |
|---|---|---|
| 1 | tracer un trait à la souris ou au pavé tactile | trait visible ; titre de la fenêtre `• Sans titre.roomboard — RoomBoard` |
| 2 | gommer en travers | trait coupé |
| 3 | Cmd+Maj+S | boîte macOS « Enregistrer », nom proposé `Sans titre.roomboard` ; choisir `Documents/essai-5a.roomboard` |
| 4 | — | titre `essai-5a.roomboard — RoomBoard` (sans `•`) |
| 5 | tracer, puis Cmd+S | aucune boîte ; l'heure de modification du fichier change dans le Finder |
| 6 | tracer, puis fermer par le bouton rouge | question « Le document a des modifications non enregistrées. Les abandonner ? » ; répondre **Non** : la fenêtre reste |
| 7a | fermer par le bouton rouge, répondre **Oui** | la fenêtre se ferme |
| 7b | Cmd+Q avec un trait non enregistré | **attendu connu** : l'application quitte sans demander (Cmd+Q ne passe pas par la fermeture de la fenêtre) ; noter ce qui se passe |
| 8 | relancer, Cmd+O, choisir `essai-5a.roomboard` | les traits enregistrés au geste 5 reviennent, aux mêmes places |
| 9 | tracer, Cmd+S | **aucune boîte** (fichier rouvert, chemin gardé) ; l'heure de modification change |
| 10 | tracer, fermer par le bouton rouge | la question revient ; **Non** : la fenêtre reste |
| 11 | Cmd+O sur `faux.roomboard` (le créer d'abord : `printf 'pas un zip' > ~/Documents/faux.roomboard` sous zsh) | message « Ouverture impossible (faux.roomboard) : … » ; document inchangé |
| 12 | tracer un trait, puis Cmd+N | question « Le document a des modifications non enregistrées. Les abandonner ? » ; **Non** : le trait reste ; Cmd+N de nouveau, **Oui** : page vide, titre `Sans titre.roomboard — RoomBoard` |
| 13 | fermer la coque, couper le réseau (Wi-Fi coupé), relancer | la coque démarre, la page s'affiche, on trace et on enregistre (Cmd+S) sans erreur ni écran blanc ; noter tout message |

## 4. Même parcours dans Chrome (File System Access), puis Safari
```sh
pnpm --filter @roomboard/web build
pnpm --filter @roomboard/web exec vite preview --port 4173
```
Ouvrir `http://localhost:4173/` dans Chrome. Gestes 1 à 5 : Cmd+S ouvre la boîte de Chrome la première fois, puis réécrit
le même fichier sans boîte. F5, Cmd+O, choisir le fichier : les traits reviennent ; Cmd+S ensuite : au plus une
demande d'autorisation de Chrome (« Enregistrer les modifications ? »), pas de nouvelle boîte. Fermer l'onglet avec un
trait non enregistré : Chrome demande.

Safari : le repli s'applique. Cmd+S télécharge `Sans titre.roomboard` dans Téléchargements, Cmd+O ouvre le sélecteur de fichiers.

## 5. À rapporter
Pour chaque geste : conforme / écart (une ligne). Captures : `coque-macos-lot5a-question.png` (geste 6),
`coque-macos-lot5a-rouvert.png` (geste 8). Version de macOS (menu Pomme > À propos de ce Mac) et de Safari/WebKit
(Safari > À propos de Safari), version de Chrome (`chrome://version`), et le dispositif de pointage (souris ou pavé tactile).

## 6. Lot 5b — dépôt, association, fichier au lancement, Cmd+Q
Seulement si le lot 5b est fusionné (onglets). Préparer `essai-5a.roomboard` (§ 3, geste 3) et un dossier
`~/Documents/depot-5b` qui contient une copie `copie.roomboard`. L'association n'existe qu'une fois l'application
copiée dans Applications : `cp -R apps/desktop/src-tauri/target/release/bundle/macos/RoomBoard.app /Applications/`,
puis la lancer une fois par le Finder.

| # | geste | attendu |
|---|---|---|
| 5b-1 | tracer un trait, puis déposer `essai-5a.roomboard` depuis le Finder sur la fenêtre | un nouvel onglet s'ouvre avec les traits du fichier ; l'onglet d'origine garde son trait |
| 5b-2 | déposer le dossier `depot-5b` | rien ne s'ouvre, aucun onglet neuf ; aucun fichier du dossier n'est lu (la coque n'accorde jamais un dossier) |
| 5b-3 | déposer une image (`.png`) | message « format pris en charge dans une prochaine version » ; aucun onglet neuf |
| 5b-4 | RoomBoard quitté, double-clic sur `essai-5a.roomboard` dans le Finder | RoomBoard démarre et ouvre le fichier dans un onglet (Finder : « Ouvrir avec » propose RoomBoard) |
| 5b-5 | RoomBoard ouvert, double-clic sur `copie.roomboard` | le fichier s'ouvre dans un nouvel onglet de la même fenêtre |
| 5b-6 | tracer un trait (onglet modifié), Cmd+Q | question avant de quitter ; « Annuler » : l'application reste, le trait aussi |
| 5b-7 | Cmd+Q de nouveau, confirmer | l'application quitte |
| 5b-8 | relancer, ne rien modifier, Cmd+Q | l'application quitte sans question |
| 5b-9 | fermer la fenêtre par le bouton rouge (document propre), puis Cmd+Q si l'application reste dans le Dock | l'application quitte sans question (sans fenêtre, la sortie n'est pas retenue) ; noter si elle reste dans le Dock |

Le geste 5b-6 remplace l'« attendu connu » du geste 7b (lot 5a). Rapporter chaque geste : conforme / écart (une ligne).
Captures : `coque-macos-lot5b-depot.png` (geste 5b-1), `coque-macos-lot5b-cmdq.png` (geste 5b-6).

## 7. Profils (C1) — export, import, remise à zéro, annotation au démarrage
Seulement si C1 est fusionné. Aucun build de plus que celui du § 2.

| # | geste | attendu |
|---|---|---|
| C1-1 | Profil → Modifier… : barre d'outils « À gauche », taille « Grands » ; « Enregistrer comme nouveau » sous le nom `CM1` | la barre passe à gauche en grands boutons **dès le choix, avant tout enregistrement** (aperçu en direct, panneau à droite), **tous les boutons visibles, répartis en colonnes** (barre verticale multi-colonnes, jamais vue sous WebKit) ; le menu Profil montre « CM1 » coché |
| C1-2 | Profil → Exporter… | boîte native « Enregistrer » filtrée sur « Profil RoomBoard » (`rbprofile`), nom proposé `cm1.rbprofile` ; le fichier est écrit à l'endroit choisi |
| C1-3 | Profil → Tout remettre à zéro, confirmer | question native ; puis « Par défaut », barre en haut, « CM1 » absent du menu |
| C1-4 | Profil → Importer… et choisir `cm1.rbprofile` | boîte native « Ouvrir » filtrée sur `rbprofile` ; « CM1 » revient, actif, barre à gauche en grand |
| C1-5 | choisir « Annotation au démarrage », fermer RoomBoard (Cmd+Q), relancer | la coque démarre sur le tableau ordinaire, aucun message (la fenêtre d'annotation arrive avec C11a) |
| C1-6 | choisir « Par défaut » ; Profil → Modifier… : taille « Petits », Enregistrer ; fermer RoomBoard (Cmd+Q), relancer ; puis Profil → Remettre à zéro ce profil | après la relance : « Par défaut » toujours actif, en petits boutons ; après la remise à zéro : boutons moyens, « Remettre à zéro ce profil » grisé |
| C1-7 | Profil → Modifier… : tirer la poignée d'un outil de la liste au trackpad, vers le haut, puis la lâcher ; recommencer à la souris | la ligne suit le pointeur, les autres s'écartent ; au lâcher la barre change ; la scène ne reçoit aucun trait ni dépôt (U24 : glisser-déposer natif de la coque) ; un clic de la poignée sans glisser fait paraître « Monter » et « Descendre » sur cette ligne |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-macos-c1-export.png` (geste C1-2).

## 8. Office (C16) — LibreOffice.app (R3)

| geste | action | attendu |
|---|---|---|
| C16-1 | `LibreOffice.app` dans `/Applications`, RoomBoard lancé du Finder (PATH minimal) ; déposer `diapos.pptx` | onglet `diapos.roomboard` de 2 pages (chemin connu `/Applications/LibreOffice.app/Contents/MacOS/soffice`) |
| C16-2 | « Modifier dans l'application d'origine », enregistrer dans Impress | la question de réimport arrive ; Oui : nouvel onglet |
| C16-3 | `LibreOffice.app` déplacé hors d'`/Applications` et de `~/Applications`, relancer | « <nom> : installez LibreOffice ou Microsoft Office » |

Rapporter chaque geste : conforme / écart (une ligne).
