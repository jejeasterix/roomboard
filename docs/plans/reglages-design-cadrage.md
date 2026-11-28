# Cadrage — panneau Réglages au design des îlots (OG39)

## 1. Demande

Jérôme, mot pour mot : « Homogénéité du panneau réglage > go ». Le panneau Réglages (`apps/web/src/ui/SettingsPanel.tsx`)
gardait une rangée de boutons gris natifs (capture `docs/design/captures/reglages-design/avant-clair.png`), hors du
design des îlots. Il prend le design du reste de l'app. Mêmes réglages, mêmes raccourcis, mêmes valeurs enregistrées.

## 2. Décisions (tranchées seul, aucune question ne parvient à Jérôme pendant le tour)

| # | Décision | Raison |
|---|---|---|
| R1 | Trois sections titrées : « Stylet et doigt » (`hand`), « Rendu de l'encre » (`pen-line`), « Annotation » (`annotate`). | Regrouper par ce que l'enseignant règle ; titres en 14 px graisse 500 comme les en-têtes du panneau d'options (OG23). Icônes déjà présentes dans `icons.ts` (lot L1) : aucune icône ajoutée, aucun conflit avec OG33. |
| R2 | Une rangée de 44 px au moins par réglage, nom à gauche, valeur en pastille grise à droite ; un appui passe à la valeur suivante. | Garde le bouton unique par réglage (`button[data-reglage]`) : essais et tests inchangés sur le fond, aucun geste nouveau à apprendre. Des segments auraient multiplié les cibles et changé les sélecteurs des essais. |
| R3 | Interrupteur (`role="switch"`, `aria-checked`) pour les deux réglages oui / non : gomme automatique à la paume, cadre de l'annotation. | Le geste reste le même (un appui), l'état se lit d'un coup d'œil. Aspect repris de l'interrupteur de la fenêtre des fonds, recopié dans `settings.css` (consigne : ne pas modifier le composant d'un autre panneau). |
| R4 | Le texte complet de chaque bouton reste celui d'avant (« Gomme automatique à la paume : active ») ; le séparateur « : » n'est pas montré ; la valeur d'un interrupteur n'est ni montrée ni lue (`aria-hidden`), `aria-checked` dit l'état. | Les essais (`gomme-paume`, `design-l4`) et l'avis de Ctrl+Maj+H lisent ce texte. |
| R5 | É3 et É4 portent l'icône `reset` en tête de rangée (après le nom, elle tombait sur une demi-colonne de pixels : floue, essai S3) et une note visible « Recharge la page : le dessin en cours est perdu » (`aria-describedby`). | Le `title` seul ne se voit pas au toucher. |
| R6 | Feuille à part, `apps/web/src/ui/settings.css`, importée par le composant (comme `backgrounds.css`) ; jetons `--rf-*` seulement, aucune couleur écrite en dur. | Pas de conflit avec les autres chantiers qui touchent `rb.css`. Les deux anciennes règles du panneau quittent `rb.css`. |
| R7 | Notes du démarrage en `--rf-danger-text` (5,44:1), masquées quand il n'y en a pas ; diagnostic WebGL2 en texte secondaire au pied du panneau. | L'ancien ambre `#b45309` était hors des jetons. |
| R8 | Clavier : Tab mène de rangée en rangée, Entrée agit. Espace reste au geste « Espace + glisser » (déplacer la vue) de toute l'app ; aucun raccourci global ajouté. Ctrl+Maj+H (gomme automatique) inchangé. | « Mêmes raccourcis ». |
| R9 | Thème clair seul. | L'app n'a pas de thème sombre (aucune règle `prefers-color-scheme`). |

## 3. Hors champ

Comportement des réglages (`engine/settings.ts`, `device-settings.ts`), Wasm (aucun octet changé), autres panneaux.

## 4. Carte d'impact

`SettingsPanel.tsx` (rendu), `settings.css` (nouveau), `rb.css` (2 règles retirées), `SettingsPanel.test.tsx` (8 tests
ajoutés), `scripts/essais/reglages-design-navigateur.mjs` (nouveau, dans `verifier.sh --e2e`),
`scripts/essais/gomme-paume-navigateur.mjs` (S8 : « panneau sans icône » devient « icônes au viewBox calé »).

## 5. Scénarios d'acceptation (essai `reglages-design-navigateur.mjs`, Chromium 2x)

- S1 : trois sections titrées.
- S2 : 7 rangées de 44 px au moins ; aucun défilement horizontal.
- S3 : netteté § 10 du cadrage design : 5 icônes calées sur la grille de pixels, 24 × 24 ; 0 frange colorée sur une
  icône de section et sur un nom de rangée.
- S4 : interrupteur de la gomme automatique au toucher, texte des essais inchangé.
- S5 : clavier, Entrée et Tab.
