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
wasm-bindgen --target web --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm
pnpm --filter @roomboard/desktop tauri build
```
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
