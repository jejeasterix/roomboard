# Plan maître — socle (RoomBoard 0.1)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (39 décisions D1-D39, DA1-DA10, scénarios S1-S5).
**Gabarit :** lots. Un plan détaillé par lot : `docs/plans/socle-lot<N>-PLAN.md`. Les lots s'exécutent l'un après
l'autre, sauf les lots 2 et 3 qui peuvent se chevaucher (D36 : le lot 3 avance sur une fausse liaison tant que le
lot 2 n'a pas figé l'interface Wasm).

## Risque n° 1 : latence et pression du stylet dans une WebView

Le socle parie que l'encre tracée dans une page web (WebView2 sous Windows, WKWebView sous macOS, WebKitGTK sous
Linux) suit la pointe du stylet et rend la pression. Le lot 1 existe pour mesurer ce pari avant d'écrire le moteur :
`proto-stylet.html`, fichier unique ouvert dans le navigateur de l'ENI cet après-midi (essai OB87, S1), avec Jérôme.

Verdict : le ressenti de Jérôme (« le trait suit la pointe ») ; les nombres du JSON sont consignés, pas une porte
(D31 : repères pression qui varie, ≥ 100 Hz fusionnés, retard interne p95 ≤ 17 ms, < 2 % d'images > 25 ms).

**Si l'essai réussit** : rien ne change ; le lot 3 reprend `sampler.ts` tel quel et rejoue le banc avec la géométrie
du produit (`freedraw`).

**Si l'essai échoue** (renvoi à DA9 du cadrage) :

| constat | ce qui change dans le plan | lots touchés |
|---|---|---|
| retard ou saccades avec une bascule éteinte | rejouer avec fusionnés + prédits + `pointerrawupdate` + `desynchronized` (échelon 1, déjà dans le prototype) ; rien à planifier | aucun |
| `getPredictedEvents` absent (WebKit) et retard visible | tâche ajoutée au lot 3 : prédiction linéaire en TS dans `src/engine/input/` (échelon 2) | 3 |
| retard visible même avec l'échelon 1 sous Chromium Windows | tâche ajoutée au lot 3 : traînée déléguée `navigator.ink` dans le moteur (échelon 3, déjà mesurable par la bascule du prototype) | 3 |
| durée d'image > 25 ms fréquente (le canvas 2D ne tient pas l'image) | le lot 3 livre `Renderer` en WebGL2 pour le canvas d'interaction au lieu du Canvas 2D (échelon 4, DA2 : seule l'implémentation change) | 3 |
| bon dans Edge, mauvais dans WebView2 (mesure par la file du PC) | tâche ajoutée au lot 5 : `additionalBrowserArgs` de WebView2 dans la coque (échelon 5) | 5 |
| aucun échelon 1-5 ne suffit | **arrêt de la chaîne et question à Jérôme** : l'échelon 6 (encre vive native dans la coque) contredit sa règle « le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif » ; aucun agent ne le prend | 3, 5 suspendus |
| pression absente ou figée à 0 / 0,5 | rien : pression détectée à l'exécution, trait à largeur constante (D8) | aucun |
| paume ou appui long qui coupent le trait | réglages de D39 / D18 revus dans `sampler.ts` au lot 3 | 3 |

Dans tous les cas le lot 2 (cœur Rust, format, historique) ne change pas : les échelons 1 à 5 ne touchent que
`apps/web/src/engine/input` et `apps/web/src/engine/render` (DA9). Le lot 2 peut donc démarrer avant le verdict.

## Les 5 lots

| lot | plan | but | dépend de | scénarios | état du plan |
|---|---|---|---|---|---|
| 1 — Stylet mesurable | `socle-lot1-PLAN.md` | prototype `proto-stylet.html` en fichier unique, `sampler.ts` (D39) et statistiques (D30) testés, fiche d'essai ENI, contrôle de version `wasm-bindgen` dans `verifier.sh` (D9) | squelette (fusionné) | S1 | détaillé |
| 2 — Cœur du document | `socle-lot2-PLAN.md` | schéma Yrs D2, `Document::blank` (D37), `ink` (contour, collision, gomme, `StrokeBuilder`), commandes, `History` (DA6), `format` ZIP (DA3), liaison Wasm DA5, tests de contrat vitest sur le vrai `.wasm` | squelette Rust (fusionné) | S2, S3 au niveau du cœur | à écrire |
| 3 — Moteur d'interaction | `socle-lot3-PLAN.md` | caméra, `Renderer` Canvas 2D à deux canvas, routeur d'entrées D18, encre vive D20, stylo et gomme avec aperçus D38, annuler / rétablir au clavier, banc du lot 1 rejoué avec la géométrie du produit | lot 1 (sampler) ; lot 2 (interface Wasm figée au début du lot 2) | S2 au navigateur | fait (OC65, 2026-11-17, avant le verdict ENI ; barre DOM minimale dans `main.ts` pour l'essai) |
| 3b — Fin du moteur | `socle-lot3b-PLAN.md` | reste de D17 (espace + glisser, bouton du milieu, outil main, caméra par page), gomme d'objet et réglage « doigt déplace la vue » dans la barre, paume réglable, échelons 2 à 4 de DA9 derrière des réglages réversibles (`engine/settings.ts`, `?echelons=`), défauts fondés sur les mesures S1, OC56 et OC66 (décision de Jérôme, 2026-11-19 : « oui fait le avancé en autonomie même si je n'ai pas fais les tests »), vérifié par l'essai ENI du 2026-11-21 ; mesure de la copie du contour au-delà de 2 000 points ; constats du banc et de `frameDurations()` | lot 3 | S2 | fait (T30-T44, PR 2, 2026-11-19) |
| 4 — Outils d'édition | `socle-lot4-PLAN.md` | sélection, déplacer, redimensionner, formes, texte (IME), pages | lot 3 | S3, S4 | à écrire |
| 5 — Interface et coque | `socle-lot5-PLAN.md` | application SolidJS (DA1), barre d'outils en profils (DA10), barre des pages, `FileHost` (DA8), coque Tauri (dialogues, fichiers, fermeture, CSP), Playwright `--e2e`, build Tauri Linux, fiches d'essai Windows et macOS | lots 3 et 4 | S2 à S5 ; porte visuelle | à écrire |

Chaque scénario a son lot : S1 → lot 1 ; S2 → lots 2, 3, 5 ; S3 → lots 2, 4, 5 ; S4 → lots 4, 5 ; S5 → lot 5.

## Tests automatiques de la VM, par lot

Une seule commande de preuve pour tout le chantier : `cd <worktree> && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
(motif de réussite `verifier.sh : OK` ; motifs d'échec `test result: FAILED`, `error[`, `FAIL `, code non nul).

| lot | ce que `verifier.sh` prouve à la fin du lot |
|---|---|
| 1 | vitest de `sampler.ts`, des statistiques, de la polyligne, de la boucle d'image et de l'enregistreur ; test shell du contrôle `wasm-bindgen` ; `build:proto` produit un seul fichier sans ressource externe |
| 2 | `cargo test` du cœur (schéma, `blank`, gomme, historique, format aller-retour, migration) ; vitest de contrat sur le vrai `.wasm` ; wasm32 compile avec `zip` (H2-8) ; taille du `.wasm` ≤ 1,5 Mo (H2-13) |
| 3 | vitest du moteur (caméra, routeur, outils sur faux contexte 2D, encre vive) |
| 4 | vitest des outils d'édition ; `cargo test` des commandes `Transform`, `AddShape`, `SetText`, pages |
| 5 | `verifier.sh --e2e` : Playwright Chromium S2, S3, S4 (hôte de fichiers de repli forcé) ; WebKit essayé (H2-10) ; build Tauri Linux (un seul à la fois) |

## Essais de plateforme, par lot (hors tests de la VM)

Règles pour tous les lots : **Windows** par la file d'attente du PC (`ordre-pc.cjs confier`), jamais bloquant pour la
chaîne : le lot se finalise sans attendre la réponse, elle est consignée quand elle arrive. **macOS** sur le Mac, par
Jérôme, hors agent : fiche fournie, aucun agent n'attend. **Android** : « en attente de KVM », aucun build, aucun essai.
Fiches dans `docs/essais/`.

| lot | ENI (Jérôme) | Windows (file du PC, non bloquant) | macOS (Mac, hors agent) | Android |
|---|---|---|---|---|
| 1 | **S1 cet après-midi** : `proto-stylet.html` dans Edge / Chrome de l'ENI, fiche `docs/essais/eni-stylet.md`, JSON rapporté | ouvrir `proto-stylet.html` dans Edge du PC, exporter le JSON (agent utilisateur, prise en charge détectée, souris) | ouvrir `proto-stylet.html` dans Safari : prise en charge WebKit (`getPredictedEvents`, `desynchronized`), trackpad ; facultatif | en attente de KVM |
| 2 | aucun | facultatif : `cargo test -p roomboard-core` sur le PC (cœur portable) | aucun | en attente de KVM |
| 3 | second essai : application web (moteur + géométrie du produit) et banc rejoué, comparé au JSON du lot 1 | application web dans Edge du PC ; si possible mesure dans WebView2 (coque de développement) | application web dans Safari | en attente de KVM |
| 4 | facultatif : sélection et formes au stylet | aucun | S4 sous WebKit si Playwright WebKit ne s'installe pas sur la VM (H2-10) | en attente de KVM |
| 5 | S5 sur l'ENI si une coque Windows existe | **S5** : build Tauri Windows et parcours au stylet (dialogues natifs, fermeture) | **S5** : build Tauri macOS par Jérôme, parcours, boîte native | en attente de KVM |

## Contraintes globales (recopiées dans chaque section de tâche)

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un.
- Pas de `--force` (ni push forcé, ni autre).
- Aucun workflow GitHub Actions (`.github/workflows/` non touché, D35).
- Un seul build Tauri à la fois sur la VM ; aucun build Android.
- Tests : `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH`.
- Sous-agents relecteurs lancés au premier plan (`run_in_background: false`).
