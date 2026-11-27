# Essai S5 — coque RoomBoard sous Windows (lot 5a)

Pour : la file d'attente du PC (non bloquant, D34). Durée : 30 min, dont 15 de build.
Ce qui est essayé : ouvrir, enregistrer, fermer dans la coque (WebView2), puis la même chose dans Edge avec la
File System Access API. Formes et texte (lot 4) : seulement si le lot 4 est fusionné.

## 1. Prérequis
- Rust stable (`rustup`), puis `rustup target add wasm32-unknown-unknown`.
- `cargo install wasm-bindgen-cli --version 0.2.130 --locked` (la version doit égaler `Cargo.lock`).
- Node 22 et pnpm (`corepack enable`).
- Visual Studio Build Tools (C++), WebView2 (présent sous Windows 11).

## 2. Construire (PowerShell)
```powershell
git clone https://github.com/jejeasterix/roomboard.git
Set-Location roomboard
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
`apps\desktop\src-tauri\target\release\bundle\`. Lancer `apps\desktop\src-tauri\target\release\roomboard-desktop.exe`.

## 3. Parcours dans la coque
| # | geste | attendu |
|---|---|---|
| 1 | tracer un trait au stylet | trait visible ; titre de la fenêtre `• Sans titre.roomboard — RoomBoard` |
| 2 | gommer en travers | trait coupé |
| 3 | Ctrl+Maj+S | boîte Windows « Enregistrer sous », nom proposé `Sans titre.roomboard` ; choisir `Documents\essai-5a.roomboard` |
| 4 | — | titre `essai-5a.roomboard — RoomBoard` (sans `•`) |
| 5 | tracer, puis Ctrl+S | aucune boîte ; l'heure de modification du fichier change dans l'Explorateur |
| 6 | tracer, puis fermer par ✕ | question « Le document a des modifications non enregistrées. Les abandonner ? » ; répondre **Non** : la fenêtre reste |
| 7 | Alt+F4, répondre **Oui** | la fenêtre se ferme |
| 8 | relancer, Ctrl+O, choisir `essai-5a.roomboard` | les traits enregistrés au geste 5 reviennent, aux mêmes places |
| 9 | tracer, Ctrl+S | **aucune boîte** (fichier rouvert, chemin gardé) ; l'heure de modification change |
| 10 | tracer, fermer par ✕ | la question revient ; **Non** : la fenêtre reste |
| 11 | Ctrl+O sur `faux.roomboard` (le créer d'abord : `Set-Content -Path "$env:USERPROFILE\Documents\faux.roomboard" -Value "pas un zip"` sous PowerShell) | message « Ouverture impossible (faux.roomboard) : … » ; document inchangé |
| 12 | tracer un trait, puis Ctrl+N | question « Le document a des modifications non enregistrées. Les abandonner ? » ; **Non** : le trait reste ; Ctrl+N de nouveau, **Oui** : page vide, titre `Sans titre.roomboard — RoomBoard` |
| 13 | fermer la coque, couper le réseau (Wi-Fi coupé, câble débranché), relancer | la coque démarre, la page s'affiche, on trace et on enregistre (Ctrl+S) sans erreur ni écran blanc ; noter tout message |

## 4. Même parcours dans Edge (File System Access)
```powershell
pnpm --filter @roomboard/web build
pnpm --filter @roomboard/web exec vite preview --port 4173
```
Ouvrir `http://localhost:4173/` dans Edge. Gestes 1 à 5 : Ctrl+S ouvre la boîte d'Edge la première fois, puis réécrit
le même fichier sans boîte. F5, Ctrl+O, choisir le fichier : les traits reviennent ; Ctrl+S ensuite : au plus une
demande d'autorisation d'Edge (« Enregistrer les modifications ? »), pas de nouvelle boîte. Fermer l'onglet avec un
trait non enregistré : Edge demande.

## 5. À rapporter
Pour chaque geste : conforme / écart (une ligne). Captures : `coque-windows-lot5a-question.png` (geste 6),
`coque-windows-lot5a-rouvert.png` (geste 8). Version de WebView2 (`edge://version` dans Edge, ou les paramètres
Windows) et modèle du stylet.

## 6. Lot 5b — dépôt, association, fichier au lancement
Seulement si le lot 5b est fusionné (onglets). Préparer `essai-5a.roomboard` (§ 3, geste 3) et un dossier
`Documents\depot-5b` qui contient une copie `copie.roomboard`. L'association n'existe qu'une fois installé : lancer
l'installeur de `apps\desktop\src-tauri\target\release\bundle\` (msi ou nsis).

| # | geste | attendu |
|---|---|---|
| 5b-1 | tracer un trait, puis déposer `essai-5a.roomboard` depuis l'Explorateur sur la fenêtre | un nouvel onglet s'ouvre avec les traits du fichier ; l'onglet d'origine garde son trait |
| 5b-2 | déposer le dossier `depot-5b` | rien ne s'ouvre, aucun onglet neuf ; aucun fichier du dossier n'est lu (la coque n'accorde jamais un dossier) |
| 5b-3 | déposer une image (`.png`) | message « format pris en charge dans une prochaine version » ; aucun onglet neuf |
| 5b-4 | RoomBoard fermé, double-clic sur `essai-5a.roomboard` dans l'Explorateur | RoomBoard démarre et ouvre le fichier dans un onglet ; l'icône du fichier est « Document RoomBoard » |
| 5b-5 | PowerShell : `& "$env:LOCALAPPDATA\Programs\RoomBoard\roomboard-desktop.exe" "$env:USERPROFILE\Documents\essai-5a.roomboard"` (adapter le chemin d'installation) | même chose que 5b-4 (fichier passé au lancement) |
| 5b-6 | Alt+F4 avec un onglet modifié | comme au lot 5a (question) ; Windows ne garde rien de plus à la sortie |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-windows-lot5b-depot.png` (geste 5b-1).

## 7. Profils (C1) — export, import, remise à zéro, annotation au démarrage
Seulement si C1 est fusionné. Aucun build de plus que celui du § 2.

| # | geste | attendu |
|---|---|---|
| C1-1 | Profil → Modifier… : barre d'outils « À gauche », taille « Grands » ; « Enregistrer comme nouveau » sous le nom `CM1` | la barre passe à gauche en grands boutons **dès le choix, avant tout enregistrement** (aperçu en direct, panneau à droite) ; le menu Profil montre « CM1 » coché |
| C1-2 | Profil → Exporter… | boîte native « Enregistrer » filtrée sur « Profil RoomBoard » (`rbprofile`), nom proposé `cm1.rbprofile` ; le fichier est écrit à l'endroit choisi |
| C1-3 | Profil → Tout remettre à zéro, confirmer | question native ; puis « Par défaut », barre en haut, « CM1 » absent du menu |
| C1-4 | Profil → Importer… et choisir `cm1.rbprofile` | boîte native « Ouvrir » filtrée sur `rbprofile` ; « CM1 » revient, actif, barre à gauche en grand |
| C1-5 | choisir « Annotation au démarrage », fermer RoomBoard (Alt+F4), relancer | la coque démarre sur le tableau ordinaire, aucun message (la fenêtre d'annotation arrive avec C11a) |
| C1-6 | choisir « Par défaut » ; Profil → Modifier… : taille « Petits », Enregistrer ; fermer RoomBoard (Alt+F4), relancer ; puis Profil → Remettre à zéro ce profil | après la relance : « Par défaut » toujours actif, en petits boutons ; après la remise à zéro : boutons moyens, « Remettre à zéro ce profil » grisé |
| C1-7 | Profil → Modifier… : tirer au doigt (écran tactile) la poignée d'un outil de la liste, vers le haut, puis la lâcher ; recommencer à la souris | la ligne suit le doigt, les autres s'écartent ; au lâcher la barre change ; la scène ne reçoit aucun trait ni dépôt (U24 : glisser-déposer natif de la coque) ; un toucher de la poignée sans glisser fait paraître « Monter » et « Descendre » sur cette ligne |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-windows-c1-export.png` (geste C1-2).

## 8. Office (C16) — conversion, « Modifier dans l'application d'origine », réimport (R2, file d'attente du PC)

Coque construite comme au § 2. Fichiers d'essai : `crates/roomboard-shell/tests/fixtures/cours.docx`, `notes.xlsx`,
`diapos.pptx` (2 diapositives). Premier essai de compilation de `main.rs` et `office/com.rs` (HO2-11).

| geste | action | attendu |
|---|---|---|
| C16-1 | LibreOffice installé : déposer `cours.docx`, `notes.xlsx`, `diapos.pptx` | trois onglets `cours.roomboard`, `notes.roomboard`, `diapos.roomboard` (2 pages) ; curseur d'attente pendant chaque conversion |
| C16-2 | page 1 de `diapos.roomboard` → « Modifier dans l'application d'origine » | Impress ouvre la copie ; avec Office : PowerPoint en mode protégé (« Activer la modification », HO1-7) |
| C16-3 | modifier, enregistrer, revenir à RoomBoard | « diapos.pptx a été modifié. Le réimporter dans un nouvel onglet ? » ; Oui : un onglet de plus, l'ancien intact ; second enregistrement : la question revient |
| C16-4 | désinstaller LibreOffice (ou le retirer du PATH et de `%ProgramFiles%`), Office seul, relancer | mêmes conversions par Word, Excel, PowerPoint (COM), aucune fenêtre Office visible ; une instance de PowerPoint ouverte avant reste ouverte |
| C16-5 | délai : `.pptx` protégé par mot de passe | après 120 s : « <nom> : conversion trop longue (plus de 120 s) » ; Gestionnaire des tâches : aucun `soffice.bin` ni `POWERPNT.EXE` lancé par RoomBoard restant |
| C16-6 | ni LibreOffice ni Office, relancer | `cours.docx` : « cours.docx : installez LibreOffice ou Microsoft Office » ; `notes.xlsx` : un tableau et « notes.xlsx : importé en valeurs ; installez LibreOffice ou Microsoft Office pour ses pages » ; bouton « Modifier… » absent |
| C16-7 | chemins `\\?\` (issus de `canonicalize`) : convertir un fichier déposé avec LibreOffice, puis avec Office seul | `--outdir`, l'entrée de `soffice` et `Documents.Open` / `Workbooks.Open` / `Presentations.Open` acceptent le préfixe `\\?\` ; sinon noter l'application et le message |
| C16-8 | Office seul, Word seul installé : déposer `notes.xlsx` | « installez LibreOffice ou Microsoft Office » (repli en valeurs), pas une erreur de conversion |
| C16-9 | Office seul : laisser un Word et un Excel ouverts, convertir `cours.docx` et `notes.xlsx` | l'instance de l'utilisateur reste ouverte ; aucun `WINWORD.EXE` / `EXCEL.EXE` caché restant après la conversion |

Rapporter chaque geste : conforme / écart (une ligne). Capture : `coque-windows-c16-modifier.png` (geste C16-2).
